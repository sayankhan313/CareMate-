import path from "node:path";

import type { Prisma } from "../../generated/prisma/client.js";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

type PrescriptionChargePreference = "CHARGEABLE" | "EXEMPT" | "PPC";
type PatientChargeSelection = "CHARGEABLE" | "EXEMPT";
type PrescriptionExemptionType =
  | "AGE_BASED"
  | "MEDICAL_EXEMPTION"
  | "MATERNITY_EXEMPTION"
  | "LOW_INCOME_HC2"
  | "UNIVERSAL_CREDIT"
  | "PPC"
  | "OTHER";

type ExemptionVerificationState = "NOT_REQUIRED" | "MISSING" | "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";

type SubmitEvidenceInput = {
  exemptionType: PrescriptionExemptionType;
  referenceNumber?: string;
  expiresAt?: string;
  evidenceDocumentUrls: string[];
};

const evidenceSelect = {
  id: true,
  pharmacyId: true,
  verifiedByPharmacyId: true,
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
  pharmacy: {
    select: {
      id: true,
      fullName: true,
      pharmacyProfile: { select: { pharmacyName: true } },
    },
  },
} as const;

const normalizeOptionalText = (value?: string) => value?.trim() || undefined;

const ensurePatient = async (patientId: string) => {
  const patient = await prisma.user.findFirst({ where: { id: patientId, role: "PATIENT" }, select: { id: true } });
  if (!patient) throw new AppError("Patient account not found", 404);
};

const ensureChargeProfile = async (patientId: string) => {
  const existing = await prisma.patientPrescriptionChargeProfile.findUnique({
    where: { patientId },
    select: { id: true, patientId: true, chargePreference: true, createdAt: true, updatedAt: true },
  });

  if (existing) return existing;

  const primaryLink = await prisma.patientPharmacyLink.findFirst({
    where: { patientId, isPrimary: true },
    select: { chargePreference: true },
  });

  return prisma.patientPrescriptionChargeProfile.upsert({
    where: { patientId },
    update: {},
    create: { patientId, chargePreference: primaryLink?.chargePreference || "CHARGEABLE" },
    select: { id: true, patientId: true, chargePreference: true, createdAt: true, updatedAt: true },
  });
};

const getLatestEvidence = async (
  patientId: string,
  chargePreference: "EXEMPT" | "PPC",
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) =>
  tx.patientPharmacyExemptionEvidence.findFirst({
    where: { patientId, chargePreference },
    select: evidenceSelect,
    orderBy: { createdAt: "desc" },
  });

const getLatestAnyExemptionEvidence = async (patientId: string, tx: Prisma.TransactionClient | typeof prisma = prisma) =>
  tx.patientPharmacyExemptionEvidence.findFirst({
    where: { patientId, chargePreference: { in: ["EXEMPT", "PPC"] } },
    select: evidenceSelect,
    orderBy: { createdAt: "desc" },
  });

const getEvidenceState = (evidence: Awaited<ReturnType<typeof getLatestEvidence>>): ExemptionVerificationState => {
  if (!evidence) return "MISSING";
  if (evidence.status === "VERIFIED" && evidence.expiresAt && evidence.expiresAt.getTime() < Date.now()) return "EXPIRED";
  if (evidence.status === "VERIFIED") return "VERIFIED";
  if (evidence.status === "REJECTED") return "REJECTED";
  return "PENDING";
};

const formatEvidence = (evidence: Awaited<ReturnType<typeof getLatestEvidence>>) => {
  if (!evidence) return null;

  return {
    id: evidence.id,
    pharmacyId: evidence.pharmacyId,
    pharmacyName: evidence.pharmacy.pharmacyProfile?.pharmacyName || evidence.pharmacy.fullName,
    chargePreference: evidence.chargePreference,
    exemptionType: evidence.exemptionType,
    referenceNumber: evidence.referenceNumber,
    expiresAt: evidence.expiresAt,
    status: evidence.status,
    verifiedAt: evidence.verifiedAt,
    rejectedAt: evidence.rejectedAt,
    rejectionReason: evidence.rejectionReason,
    documentCount: evidence.evidenceDocumentUrls.length,
    documents: evidence.evidenceDocumentUrls.map((storedPath, index) => ({ index, fileName: path.basename(storedPath) })),
    submittedAt: evidence.createdAt,
    updatedAt: evidence.updatedAt,
  };
};

const getPrimaryPharmacy = async (patientId: string) => {
  const link = await prisma.patientPharmacyLink.findFirst({
    where: { patientId, isPrimary: true },
    select: {
      id: true,
      pharmacyId: true,
      pharmacy: {
        select: {
          id: true,
          fullName: true,
          role: true,
          accountStatus: true,
          isEmailVerified: true,
          pharmacyProfile: { select: { pharmacyName: true } },
        },
      },
    },
  });

  if (!link) return null;

  const available =
    link.pharmacy.role === "PHARMACY" &&
    link.pharmacy.isEmailVerified &&
    (link.pharmacy.accountStatus === "ACTIVE" || link.pharmacy.accountStatus === "APPROVED") &&
    Boolean(link.pharmacy.pharmacyProfile);

  if (!available) return null;

  return {
    linkId: link.id,
    pharmacyId: link.pharmacyId,
    pharmacyName: link.pharmacy.pharmacyProfile?.pharmacyName || link.pharmacy.fullName,
  };
};

const listOutstandingOrderPayments = async (tx: Prisma.TransactionClient, patientId: string) =>
  tx.medicineOrder.findMany({
    where: {
      patientId,
      payment: { is: { status: { notIn: ["PAID", "REFUNDED"] } } },
      status: { notIn: ["REJECTED", "CANCELLED", "DELIVERED", "COLLECTED"] },
    },
    select: {
      id: true,
      items: { select: { lineTotalPence: true } },
      payment: { select: { id: true } },
    },
  });

const setOutstandingPaymentsChargeable = async (tx: Prisma.TransactionClient, patientId: string) => {
  const orders = await listOutstandingOrderPayments(tx, patientId);

  for (const order of orders) {
    if (!order.payment) continue;

    const pricedItems = order.items.filter(item => item.lineTotalPence !== null && item.lineTotalPence > 0);
    const pricingComplete = order.items.length > 0 && pricedItems.length === order.items.length;
    const amountPence = pricingComplete ? pricedItems.reduce((total, item) => total + (item.lineTotalPence || 0), 0) : 0;

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

const setOutstandingPaymentsAwaitingEvidence = async (
  tx: Prisma.TransactionClient,
  patientId: string,
  chargePreference: "EXEMPT" | "PPC",
) => {
  const orders = await listOutstandingOrderPayments(tx, patientId);
  if (orders.length === 0) return;

  await tx.prescriptionPayment.updateMany({
    where: { orderId: { in: orders.map(order => order.id) }, status: { notIn: ["PAID", "REFUNDED"] } },
    data: { chargePreference, status: "PENDING", failedAt: null },
  });
};

const setOutstandingPaymentsNotRequired = async (
  tx: Prisma.TransactionClient,
  patientId: string,
  chargePreference: "EXEMPT" | "PPC",
) => {
  const orders = await listOutstandingOrderPayments(tx, patientId);
  if (orders.length === 0) return;

  await tx.prescriptionPayment.updateMany({
    where: { orderId: { in: orders.map(order => order.id) }, status: { notIn: ["PAID", "REFUNDED"] } },
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

const syncLegacyPharmacyLinks = async (
  tx: Prisma.TransactionClient,
  patientId: string,
  chargePreference: PrescriptionChargePreference,
) => {
  await tx.patientPharmacyLink.updateMany({ where: { patientId }, data: { chargePreference } });
};

const resolvePreferenceState = async (
  patientId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) => {
  const profile = await tx.patientPrescriptionChargeProfile.findUnique({
    where: { patientId },
    select: { chargePreference: true },
  });

  const selectedPreference: PrescriptionChargePreference = profile?.chargePreference || "CHARGEABLE";

  if (selectedPreference === "CHARGEABLE") {
    return {
      selectedPreference,
      evidence: null,
      verificationState: "NOT_REQUIRED" as const,
      orderChargePreference: "CHARGEABLE" as const,
      orderPaymentStatus: "PENDING" as const,
      paymentBehaviour: "PAYMENT_REQUIRED" as const,
    };
  }

  const evidence = await getLatestEvidence(patientId, selectedPreference, tx);
  const verificationState = getEvidenceState(evidence);

  if (verificationState === "VERIFIED") {
    return {
      selectedPreference,
      evidence,
      verificationState,
      orderChargePreference: selectedPreference,
      orderPaymentStatus: "NOT_REQUIRED" as const,
      paymentBehaviour: "NO_PAYMENT_REQUIRED" as const,
    };
  }

  if (verificationState === "REJECTED" || verificationState === "EXPIRED") {
    return {
      selectedPreference,
      evidence,
      verificationState,
      orderChargePreference: "CHARGEABLE" as const,
      orderPaymentStatus: "PENDING" as const,
      paymentBehaviour: "PAYMENT_REQUIRED" as const,
    };
  }

  return {
    selectedPreference,
    evidence,
    verificationState,
    orderChargePreference: selectedPreference,
    orderPaymentStatus: "PENDING" as const,
    paymentBehaviour: "EXEMPTION_REVIEW_REQUIRED" as const,
  };
};

const getProfileData = async (patientId: string) => {
  await ensurePatient(patientId);

  const profile = await ensureChargeProfile(patientId);
  const state = await resolvePreferenceState(patientId);
  const primaryPharmacy = await getPrimaryPharmacy(patientId);

  return {
    profile: {
      id: profile.id,
      selectedPreference: state.selectedPreference,
      verificationState: state.verificationState,
      paymentBehaviour: state.paymentBehaviour,
      effectiveOrderChargePreference: state.orderChargePreference,
      effectiveOrderPaymentStatus: state.orderPaymentStatus,
      latestEvidence: formatEvidence(state.evidence),
      primaryPharmacy,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
  };
};

export const patientPrescriptionChargeService = {
  getProfile: getProfileData,

  async updatePreference(patientId: string, selection: PatientChargeSelection) {
    await ensurePatient(patientId);

    await prisma.$transaction(async tx => {
      if (selection === "CHARGEABLE") {
        await tx.patientPrescriptionChargeProfile.upsert({
          where: { patientId },
          update: { chargePreference: "CHARGEABLE" },
          create: { patientId, chargePreference: "CHARGEABLE" },
        });

        await syncLegacyPharmacyLinks(tx, patientId, "CHARGEABLE");
        await setOutstandingPaymentsChargeable(tx, patientId);
        return;
      }

      const evidence = await getLatestAnyExemptionEvidence(patientId, tx);
      const evidencePreference: "EXEMPT" | "PPC" = evidence?.chargePreference === "PPC" ? "PPC" : "EXEMPT";
      const verificationState = getEvidenceState(evidence);

      await tx.patientPrescriptionChargeProfile.upsert({
        where: { patientId },
        update: { chargePreference: evidencePreference },
        create: { patientId, chargePreference: evidencePreference },
      });

      if (verificationState === "VERIFIED") {
        await syncLegacyPharmacyLinks(tx, patientId, evidencePreference);
        await setOutstandingPaymentsNotRequired(tx, patientId, evidencePreference);
        return;
      }

      if (verificationState === "REJECTED" || verificationState === "EXPIRED") {
        await syncLegacyPharmacyLinks(tx, patientId, "CHARGEABLE");
        await setOutstandingPaymentsChargeable(tx, patientId);
        return;
      }

      await syncLegacyPharmacyLinks(tx, patientId, evidencePreference);
      await setOutstandingPaymentsAwaitingEvidence(tx, patientId, evidencePreference);
    });

    return getProfileData(patientId);
  },

  async submitEvidence(patientId: string, input: SubmitEvidenceInput) {
    await ensurePatient(patientId);

    if (input.evidenceDocumentUrls.length < 1 || input.evidenceDocumentUrls.length > 3) {
      throw new AppError("Between one and three exemption evidence documents are required", 400);
    }

    const primaryPharmacy = await getPrimaryPharmacy(patientId);
    if (!primaryPharmacy) {
      throw new AppError("Please save and select a primary pharmacy before submitting exemption evidence", 409);
    }

    const currentProfile = await ensureChargeProfile(patientId);
    if (currentProfile.chargePreference === "CHARGEABLE") {
      throw new AppError("Select exemption in your prescription payment settings before uploading evidence", 409);
    }

    const evidencePreference: "EXEMPT" | "PPC" = input.exemptionType === "PPC" ? "PPC" : "EXEMPT";

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new AppError("Invalid exemption expiry date", 400);

    const now = new Date();

    await prisma.$transaction(async tx => {
      await tx.patientPharmacyExemptionEvidence.updateMany({
        where: { patientId, status: "PENDING" },
        data: {
          status: "REJECTED",
          verifiedByPharmacyId: null,
          verifiedAt: null,
          rejectedAt: now,
          rejectionReason: "Replaced by patient before pharmacy review",
        },
      });

      await tx.patientPrescriptionChargeProfile.upsert({
        where: { patientId },
        update: { chargePreference: evidencePreference },
        create: { patientId, chargePreference: evidencePreference },
      });

      await syncLegacyPharmacyLinks(tx, patientId, evidencePreference);
      await setOutstandingPaymentsAwaitingEvidence(tx, patientId, evidencePreference);

      await tx.patientPharmacyExemptionEvidence.create({
        data: {
          linkId: primaryPharmacy.linkId,
          patientId,
          pharmacyId: primaryPharmacy.pharmacyId,
          chargePreference: evidencePreference,
          exemptionType: input.exemptionType,
          referenceNumber: normalizeOptionalText(input.referenceNumber) || null,
          evidenceDocumentUrls: input.evidenceDocumentUrls,
          expiresAt,
          status: "PENDING",
        },
      });
    }, { isolationLevel: "Serializable" });

    return getProfileData(patientId);
  },

  async resolveOrderPayment(tx: Prisma.TransactionClient, patientId: string) {
    const state = await resolvePreferenceState(patientId, tx);
    return { chargePreference: state.orderChargePreference, status: state.orderPaymentStatus };
  },

  async getSelectedPreference(patientId: string): Promise<PrescriptionChargePreference> {
    await ensurePatient(patientId);
    const profile = await ensureChargeProfile(patientId);
    return profile.chargePreference;
  },
};