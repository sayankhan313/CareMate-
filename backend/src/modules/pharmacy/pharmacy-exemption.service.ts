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

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type ExemptionPreference = "EXEMPT" | "PPC";

const exemptionSelect = {
  id: true,
  pharmacyId: true,
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

const getOrCreateChargeProfile = async (tx: TransactionClient, patientId: string, fallbackPreference: ExemptionPreference) => {
  const existing = await tx.patientPrescriptionChargeProfile.findUnique({
    where: { patientId },
    select: { id: true, chargePreference: true },
  });

  if (existing) return existing;

  return tx.patientPrescriptionChargeProfile.create({
    data: { patientId, chargePreference: fallbackPreference },
    select: { id: true, chargePreference: true },
  });
};

const getEligibleOutstandingOrders = async (tx: TransactionClient, patientId: string) => {
  return tx.medicineOrder.findMany({
    where: {
      patientId,
      orderSource: { in: ["DOCTOR_PRESCRIPTION", "REFILL_REQUEST"] },
      status: { notIn: ["REJECTED", "CANCELLED", "DELIVERED", "COLLECTED"] },
    },
    select: {
      id: true,
      items: { select: { id: true, unitPricePence: true, lineTotalPence: true } },
      payment: {
        select: {
          id: true,
          status: true,
          chargePreference: true,
          amountPence: true,
        },
      },
    },
  });
};

const markEligiblePaymentsNotRequired = async (tx: TransactionClient, patientId: string, chargePreference: ExemptionPreference) => {
  const orders = await getEligibleOutstandingOrders(tx, patientId);

  const orderIds = orders
    .filter(order => order.payment && order.payment.status !== "PAID" && order.payment.status !== "REFUNDED")
    .map(order => order.id);

  if (orderIds.length === 0) return;

  await tx.prescriptionPayment.updateMany({
    where: {
      orderId: { in: orderIds },
      status: { notIn: ["PAID", "REFUNDED"] },
    },
    data: {
      chargePreference,
      chargeableItemCount: 0,
      unitChargePence: 0,
      amountPence: 0,
      status: "NOT_REQUIRED",
      failedAt: null,
    },
  });
};

const markEligiblePaymentsChargeable = async (tx: TransactionClient, patientId: string) => {
  const orders = await getEligibleOutstandingOrders(tx, patientId);

  for (const order of orders) {
    if (!order.payment || order.payment.status === "PAID" || order.payment.status === "REFUNDED") continue;

    const pricingComplete =
      order.items.length > 0 &&
      order.items.every(item =>
        item.unitPricePence !== null &&
        item.unitPricePence > 0 &&
        item.lineTotalPence !== null &&
        item.lineTotalPence > 0
      );

    const amountPence = pricingComplete
      ? order.items.reduce((total, item) => total + (item.lineTotalPence || 0), 0)
      : 0;

    await tx.prescriptionPayment.update({
      where: { id: order.payment.id },
      data: {
        chargePreference: "CHARGEABLE",
        chargeableItemCount: pricingComplete ? order.items.length : 0,
        unitChargePence: 0,
        amountPence,
        status: "PENDING",
        failedAt: null,
      },
    });
  }
};

const syncLegacyPharmacyLinks = async (
  tx: TransactionClient,
  patientId: string,
  chargePreference: "CHARGEABLE" | ExemptionPreference,
) => {
  await tx.patientPharmacyLink.updateMany({
    where: { patientId },
    data: { chargePreference },
  });
};

const sendExemptionNotification = async (
  patientId: string,
  evidenceId: string,
  status: "VERIFIED" | "REJECTED",
) => {
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

    if (current.status !== "PENDING") throw new AppError("Only pending exemption evidence can be verified", 409);

    if (current.expiresAt && current.expiresAt.getTime() < Date.now()) {
      throw new AppError("This exemption evidence has expired and cannot be verified", 409);
    }

    if (current.chargePreference !== "EXEMPT" && current.chargePreference !== "PPC") {
      throw new AppError("Only exemption or PPC evidence can be verified here", 409);
    }

    const chargePreference: ExemptionPreference = current.chargePreference;
    const now = new Date();

    const updated = await prisma.$transaction(async tx => {
      const changed = await tx.patientPharmacyExemptionEvidence.updateMany({
        where: { id: evidenceId, pharmacyId, status: "PENDING" },
        data: {
          status: "VERIFIED",
          verifiedByPharmacyId: pharmacyId,
          verifiedAt: now,
          rejectedAt: null,
          rejectionReason: null,
        },
      });

      if (changed.count === 0) throw new AppError("This exemption evidence has already been reviewed", 409);

      const profile = await getOrCreateChargeProfile(tx, current.patient.id, chargePreference);

      if (profile.chargePreference === chargePreference) {
        await syncLegacyPharmacyLinks(tx, current.patient.id, chargePreference);
        await markEligiblePaymentsNotRequired(tx, current.patient.id, chargePreference);
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

    if (current.status !== "PENDING") throw new AppError("Only pending exemption evidence can be rejected", 409);

    if (current.chargePreference !== "EXEMPT" && current.chargePreference !== "PPC") {
      throw new AppError("Only exemption or PPC evidence can be rejected here", 409);
    }

    const cleanReason = reason.trim();
    if (cleanReason.length < 5) throw new AppError("Please provide a clear rejection reason", 400);

    const chargePreference: ExemptionPreference = current.chargePreference;
    const now = new Date();

    const updated = await prisma.$transaction(async tx => {
      const changed = await tx.patientPharmacyExemptionEvidence.updateMany({
        where: { id: evidenceId, pharmacyId, status: "PENDING" },
        data: {
          status: "REJECTED",
          verifiedByPharmacyId: pharmacyId,
          verifiedAt: null,
          rejectedAt: now,
          rejectionReason: cleanReason,
        },
      });

      if (changed.count === 0) throw new AppError("This exemption evidence has already been reviewed", 409);

      const profile = await getOrCreateChargeProfile(tx, current.patient.id, chargePreference);

      if (profile.chargePreference === chargePreference) {
        await syncLegacyPharmacyLinks(tx, current.patient.id, "CHARGEABLE");
        await markEligiblePaymentsChargeable(tx, current.patient.id);
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