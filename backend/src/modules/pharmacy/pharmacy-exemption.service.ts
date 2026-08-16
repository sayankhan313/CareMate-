import path from "node:path";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";
import { ensureApprovedPharmacy } from "./pharmacy-access.service.js";
import type {
  PharmacyExemptionReviewDetail,
  PharmacyExemptionReviewListItem,
  PharmacyExemptionReviewsResponse,
  PharmacyExemptionStatus,
} from "./pharmacy-exemption.types.js";

const exemptionSelect = {
  id: true,
  chargePreference: true,
  exemptionType: true,
  referenceNumber: true,
  evidenceDocumentUrls: true,
  expiresAt: true,
  status: true,
  verifiedAt: true,
  rejectedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      fullName: true,
      email: true,
      patientProfile: { select: { phoneNumber: true, addressLine: true, postcode: true } },
    },
  },
} as const;

const getFileName = (storedPath: string) => path.basename(storedPath);

const formatListItem = (evidence: any): PharmacyExemptionReviewListItem => ({
  id: evidence.id,
  chargePreference: evidence.chargePreference,
  exemptionType: evidence.exemptionType,
  referenceNumber: evidence.referenceNumber,
  expiresAt: evidence.expiresAt,
  status: evidence.status,
  documentCount: evidence.evidenceDocumentUrls.length,
  createdAt: evidence.createdAt,
  updatedAt: evidence.updatedAt,
  patient: { id: evidence.patient.id, fullName: evidence.patient.fullName, email: evidence.patient.email },
});

const formatDetail = (evidence: any): PharmacyExemptionReviewDetail => ({
  ...formatListItem(evidence),
  verifiedAt: evidence.verifiedAt,
  rejectedAt: evidence.rejectedAt,
  rejectionReason: evidence.rejectionReason,
  documents: evidence.evidenceDocumentUrls.map((storedPath: string, index: number) => ({ index, fileName: getFileName(storedPath) })),
  patient: {
    id: evidence.patient.id,
    fullName: evidence.patient.fullName,
    email: evidence.patient.email,
    phoneNumber: evidence.patient.patientProfile?.phoneNumber ?? null,
    addressLine: evidence.patient.patientProfile?.addressLine ?? null,
    postcode: evidence.patient.patientProfile?.postcode ?? null,
  },
});

const getEvidenceOrThrow = async (pharmacyId: string, evidenceId: string) => {
  const evidence = await prisma.patientPharmacyExemptionEvidence.findFirst({
    where: { id: evidenceId, pharmacyId },
    select: exemptionSelect,
  });

  if (!evidence) throw new AppError("Exemption evidence was not found for this pharmacy", 404);
  return evidence;
};

const sendExemptionNotification = async (patientId: string, evidenceId: string, status: "VERIFIED" | "REJECTED") => {
  try {
    if (status === "VERIFIED") {
      await notificationService.createAndSend({
        userId: patientId,
        type: "PHARMACY_EXEMPTION_VERIFIED",
        title: "Exemption evidence verified",
        body: "Your pharmacy has verified your prescription exemption evidence.",
        priority: "NORMAL",
        entityType: "PHARMACY_EXEMPTION_EVIDENCE",
        entityId: evidenceId,
        targetScreen: "Notifications",
        data: { source: "PHARMACY_EXEMPTION_REVIEW", evidenceId, status },
      });

      return;
    }

    await notificationService.createAndSend({
      userId: patientId,
      type: "PHARMACY_EXEMPTION_REJECTED",
      title: "Exemption evidence needs attention",
      body: "Your pharmacy could not verify your exemption evidence. Open CareMate+ to review the decision.",
      priority: "HIGH",
      entityType: "PHARMACY_EXEMPTION_EVIDENCE",
      entityId: evidenceId,
      targetScreen: "Notifications",
      data: { source: "PHARMACY_EXEMPTION_REVIEW", evidenceId, status },
    });
  } catch (error) {
    console.error("Pharmacy exemption notification failed:", error);
  }
};

export const pharmacyExemptionService = {
  async listReviews(
    pharmacyId: string,
    options: { status: PharmacyExemptionStatus; limit: number },
  ): Promise<PharmacyExemptionReviewsResponse> {
    await ensureApprovedPharmacy(pharmacyId);

    const where = { pharmacyId, status: options.status };

    const [total, reviews] = await Promise.all([
      prisma.patientPharmacyExemptionEvidence.count({ where }),
      prisma.patientPharmacyExemptionEvidence.findMany({
        where,
        select: exemptionSelect,
        orderBy: { createdAt: "desc" },
        take: options.limit,
      }),
    ]);

    return { total, reviews: reviews.map(formatListItem) };
  },

  async getReview(pharmacyId: string, evidenceId: string) {
    await ensureApprovedPharmacy(pharmacyId);
    const evidence = await getEvidenceOrThrow(pharmacyId, evidenceId);
    return { review: formatDetail(evidence) };
  },

  async getDocument(pharmacyId: string, evidenceId: string, documentIndex: number) {
    await ensureApprovedPharmacy(pharmacyId);

    const evidence = await getEvidenceOrThrow(pharmacyId, evidenceId);
    const storedPath = evidence.evidenceDocumentUrls[documentIndex];

    if (!storedPath) throw new AppError("Evidence document was not found", 404);

    return { storedPath, fileName: getFileName(storedPath) };
  },

  async verify(pharmacyId: string, evidenceId: string) {
    await ensureApprovedPharmacy(pharmacyId);

    const current = await getEvidenceOrThrow(pharmacyId, evidenceId);

    if (current.status !== "PENDING") {
      throw new AppError("Only pending exemption evidence can be verified", 409);
    }

    if (current.expiresAt && current.expiresAt.getTime() < Date.now()) {
      throw new AppError("This exemption evidence has expired and cannot be verified", 409);
    }

    const now = new Date();

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.patientPharmacyExemptionEvidence.updateMany({
        where: { id: evidenceId, pharmacyId, status: "PENDING" },
        data: {
          status: "VERIFIED",
          verifiedByPharmacyId: pharmacyId,
          verifiedAt: now,
          rejectedAt: null,
          rejectionReason: null,
        },
      });

      if (result.count === 0) {
        throw new AppError("This exemption evidence has already been reviewed", 409);
      }

      return tx.patientPharmacyExemptionEvidence.findFirstOrThrow({
        where: { id: evidenceId, pharmacyId },
        select: exemptionSelect,
      });
    });

    await sendExemptionNotification(updated.patient.id, evidenceId, "VERIFIED");

    return { review: formatDetail(updated) };
  },

  async reject(pharmacyId: string, evidenceId: string, reason: string) {
    await ensureApprovedPharmacy(pharmacyId);

    const current = await getEvidenceOrThrow(pharmacyId, evidenceId);

    if (current.status !== "PENDING") {
      throw new AppError("Only pending exemption evidence can be rejected", 409);
    }

    const now = new Date();

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.patientPharmacyExemptionEvidence.updateMany({
        where: { id: evidenceId, pharmacyId, status: "PENDING" },
        data: {
          status: "REJECTED",
          verifiedByPharmacyId: pharmacyId,
          verifiedAt: null,
          rejectedAt: now,
          rejectionReason: reason.trim(),
        },
      });

      if (result.count === 0) {
        throw new AppError("This exemption evidence has already been reviewed", 409);
      }

      return tx.patientPharmacyExemptionEvidence.findFirstOrThrow({
        where: { id: evidenceId, pharmacyId },
        select: exemptionSelect,
      });
    });

    await sendExemptionNotification(updated.patient.id, evidenceId, "REJECTED");

    return { review: formatDetail(updated) };
  },
};