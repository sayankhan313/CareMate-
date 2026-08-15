import path from "node:path";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  PharmacyDashboardResponse,
  PharmacyExemptionReviewDetail,
  PharmacyExemptionReviewListItem,
  PharmacyExemptionReviewsResponse,
  PharmacyExemptionStatus,
  PharmacyOrderListItem,
  PharmacyOrdersResponse,
  PharmacyOrderSource,
  PharmacyOrderStatus,
} from "./pharmacy.types.js";

const ensureApprovedPharmacy = async (pharmacyId: string) => {
  const pharmacy = await prisma.user.findUnique({
    where: { id: pharmacyId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      accountStatus: true,
      isEmailVerified: true,
      pharmacyProfile: {
        select: {
          pharmacyName: true,
          registrationNumber: true,
          city: true,
          postcode: true,
        },
      },
    },
  });

  if (!pharmacy) throw new AppError("Pharmacy account not found", 404);
  if (pharmacy.role !== "PHARMACY") throw new AppError("Only pharmacies can access this resource", 403);
  if (!pharmacy.isEmailVerified) throw new AppError("Please verify your email first", 403);
  if (pharmacy.accountStatus !== "ACTIVE" && pharmacy.accountStatus !== "APPROVED") throw new AppError("Pharmacy account is not approved yet", 403);
  if (!pharmacy.pharmacyProfile) throw new AppError("Pharmacy profile is unavailable", 404);

  return { ...pharmacy, pharmacyProfile: pharmacy.pharmacyProfile };
};

const orderListInclude = {
  patient: { select: { id: true, fullName: true } },
  doctor: { select: { id: true, fullName: true } },
  payment: { select: { chargePreference: true, status: true, amountPence: true, currency: true } },
  _count: { select: { items: true } },
} as const;

const formatOrderListItem = (order: any): PharmacyOrderListItem => ({
  id: order.id,
  orderNumber: order.orderNumber,
  source: order.orderSource,
  status: order.status,
  medicineName: order.medicineName,
  itemCount: order._count?.items || 0,
  prescriptionConfirmed: order.prescriptionConfirmed,
  fulfilmentAllowed: order.fulfilmentAllowed,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  patient: { id: order.patient.id, fullName: order.patient.fullName },
  doctor: order.doctor ? { id: order.doctor.id, fullName: order.doctor.fullName } : null,
  payment: order.payment
    ? {
        chargePreference: order.payment.chargePreference,
        status: order.payment.status,
        amountPence: order.payment.amountPence,
        currency: order.payment.currency,
      }
    : null,
});

const exemptionListSelect = {
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
      patientProfile: {
        select: {
          phoneNumber: true,
          addressLine: true,
          postcode: true,
        },
      },
    },
  },
} as const;

const getDocumentFileName = (storedPath: string) => path.basename(storedPath);

const formatExemptionListItem = (evidence: any): PharmacyExemptionReviewListItem => ({
  id: evidence.id,
  chargePreference: evidence.chargePreference,
  exemptionType: evidence.exemptionType,
  referenceNumber: evidence.referenceNumber,
  expiresAt: evidence.expiresAt,
  status: evidence.status,
  documentCount: evidence.evidenceDocumentUrls.length,
  createdAt: evidence.createdAt,
  updatedAt: evidence.updatedAt,
  patient: {
    id: evidence.patient.id,
    fullName: evidence.patient.fullName,
    email: evidence.patient.email,
  },
});

const formatExemptionDetail = (evidence: any): PharmacyExemptionReviewDetail => ({
  ...formatExemptionListItem(evidence),
  verifiedAt: evidence.verifiedAt,
  rejectedAt: evidence.rejectedAt,
  rejectionReason: evidence.rejectionReason,
  documents: evidence.evidenceDocumentUrls.map((storedPath: string, index: number) => ({
    index,
    fileName: getDocumentFileName(storedPath),
  })),
  patient: {
    id: evidence.patient.id,
    fullName: evidence.patient.fullName,
    email: evidence.patient.email,
    phoneNumber: evidence.patient.patientProfile?.phoneNumber ?? null,
    addressLine: evidence.patient.patientProfile?.addressLine ?? null,
    postcode: evidence.patient.patientProfile?.postcode ?? null,
  },
});

const getExemptionEvidenceOrThrow = async (pharmacyId: string, evidenceId: string) => {
  const evidence = await prisma.patientPharmacyExemptionEvidence.findFirst({
    where: { id: evidenceId, pharmacyId },
    select: exemptionListSelect,
  });

  if (!evidence) throw new AppError("Exemption evidence was not found for this pharmacy", 404);
  return evidence;
};

export const pharmacyService = {
  async getDashboard(pharmacyId: string): Promise<PharmacyDashboardResponse> {
    const pharmacy = await ensureApprovedPharmacy(pharmacyId);

    const [
      newOrders,
      preparing,
      ready,
      completed,
      doctorPrescriptions,
      patientSubmissions,
      paymentPending,
      exemptionPending,
      recentOrders,
    ] = await Promise.all([
      prisma.medicineOrder.count({ where: { pharmacyId, status: "RECEIVED" } }),
      prisma.medicineOrder.count({ where: { pharmacyId, status: "PREPARING" } }),
      prisma.medicineOrder.count({ where: { pharmacyId, status: "READY" } }),
      prisma.medicineOrder.count({ where: { pharmacyId, status: { in: ["COLLECTED", "DELIVERED"] } } }),
      prisma.medicineOrder.count({ where: { pharmacyId, orderSource: "DOCTOR_PRESCRIPTION" } }),
      prisma.medicineOrder.count({ where: { pharmacyId, orderSource: "PATIENT_SUBMISSION" } }),
      prisma.prescriptionPayment.count({ where: { order: { pharmacyId }, status: "PENDING" } }),
      prisma.patientPharmacyExemptionEvidence.count({ where: { pharmacyId, status: "PENDING" } }),
      prisma.medicineOrder.findMany({
        where: { pharmacyId },
        include: orderListInclude,
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      pharmacy: {
        id: pharmacy.id,
        fullName: pharmacy.fullName,
        pharmacyName: pharmacy.pharmacyProfile.pharmacyName,
        registrationNumber: pharmacy.pharmacyProfile.registrationNumber,
        city: pharmacy.pharmacyProfile.city,
        postcode: pharmacy.pharmacyProfile.postcode,
      },
      counts: {
        newOrders,
        preparing,
        ready,
        completed,
        doctorPrescriptions,
        patientSubmissions,
        paymentPending,
        exemptionPending,
      },
      recentOrders: recentOrders.map(formatOrderListItem),
    };
  },

  async listOrders(
    pharmacyId: string,
    options: { source?: PharmacyOrderSource; status?: PharmacyOrderStatus; limit: number },
  ): Promise<PharmacyOrdersResponse> {
    await ensureApprovedPharmacy(pharmacyId);

    const where = {
      pharmacyId,
      ...(options.source ? { orderSource: options.source } : {}),
      ...(options.status ? { status: options.status } : {}),
    };

    const [total, orders] = await Promise.all([
      prisma.medicineOrder.count({ where }),
      prisma.medicineOrder.findMany({
        where,
        include: orderListInclude,
        orderBy: { createdAt: "desc" },
        take: options.limit,
      }),
    ]);

    return { total, orders: orders.map(formatOrderListItem) };
  },

  async getOrderDetail(pharmacyId: string, orderId: string) {
    await ensureApprovedPharmacy(pharmacyId);

    const order = await prisma.medicineOrder.findFirst({
      where: { id: orderId, pharmacyId },
      select: {
        id: true,
        orderNumber: true,
        orderSource: true,
        status: true,
        statusReason: true,
        medicineName: true,
        dose: true,
        quantity: true,
        instructions: true,
        requestedByRole: true,
        requestedByName: true,
        requestNote: true,
        prescriptionConfirmed: true,
        prescriptionConfirmedAt: true,
        fulfilmentAllowed: true,
        createdAt: true,
        updatedAt: true,

        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            patientProfile: {
              select: {
                phoneNumber: true,
                addressLine: true,
                postcode: true,
              },
            },
          },
        },

        doctor: {
          select: {
            id: true,
            fullName: true,
            doctorProfile: { select: { specialization: true } },
          },
        },

        prescription: {
          select: {
            id: true,
            source: true,
            prescribedAt: true,
            notes: true,
          },
        },

        patientSubmission: {
          select: {
            id: true,
            requestType: true,
            status: true,
            imageUrl: true,
            notes: true,
            createdAt: true,
          },
        },

        items: {
          select: {
            id: true,
            medicineId: true,
            prescriptionItemId: true,
            submissionItemId: true,
            name: true,
            dose: true,
            quantity: true,
            instructions: true,
            dispensedQuantity: true,
            quantityUnit: true,
          },
          orderBy: { createdAt: "asc" },
        },

        payment: {
          select: {
            id: true,
            chargePreference: true,
            chargeableItemCount: true,
            unitChargePence: true,
            amountPence: true,
            currency: true,
            provider: true,
            testMode: true,
            status: true,
            paidAt: true,
            failedAt: true,
            refundedAt: true,
          },
        },

        exemptionClaim: {
          select: {
            id: true,
            exemptionType: true,
            referenceNumber: true,
            evidenceDocumentUrl: true,
            expiresAt: true,
            status: true,
            verifiedAt: true,
            rejectedAt: true,
            rejectionReason: true,
          },
        },

        statusHistory: {
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order) throw new AppError("Order not found for this pharmacy", 404);
    return { order };
  },

  async listExemptionReviews(
    pharmacyId: string,
    options: { status: PharmacyExemptionStatus; limit: number },
  ): Promise<PharmacyExemptionReviewsResponse> {
    await ensureApprovedPharmacy(pharmacyId);

    const where = { pharmacyId, status: options.status };

    const [total, reviews] = await Promise.all([
      prisma.patientPharmacyExemptionEvidence.count({ where }),
      prisma.patientPharmacyExemptionEvidence.findMany({
        where,
        select: exemptionListSelect,
        orderBy: { createdAt: "desc" },
        take: options.limit,
      }),
    ]);

    return { total, reviews: reviews.map(formatExemptionListItem) };
  },

  async getExemptionReview(pharmacyId: string, evidenceId: string) {
    await ensureApprovedPharmacy(pharmacyId);
    const evidence = await getExemptionEvidenceOrThrow(pharmacyId, evidenceId);
    return { review: formatExemptionDetail(evidence) };
  },

  async getExemptionEvidenceDocument(pharmacyId: string, evidenceId: string, documentIndex: number) {
    await ensureApprovedPharmacy(pharmacyId);
    const evidence = await getExemptionEvidenceOrThrow(pharmacyId, evidenceId);

    const storedPath = evidence.evidenceDocumentUrls[documentIndex];
    if (!storedPath) throw new AppError("Evidence document was not found", 404);

    return {
      storedPath,
      fileName: getDocumentFileName(storedPath),
    };
  },

  async verifyExemptionEvidence(pharmacyId: string, evidenceId: string) {
    await ensureApprovedPharmacy(pharmacyId);
    const current = await getExemptionEvidenceOrThrow(pharmacyId, evidenceId);

    if (current.status !== "PENDING") throw new AppError("Only pending exemption evidence can be verified", 409);

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

      if (result.count === 0) throw new AppError("This exemption evidence has already been reviewed", 409);

      return tx.patientPharmacyExemptionEvidence.findFirstOrThrow({
        where: { id: evidenceId, pharmacyId },
        select: exemptionListSelect,
      });
    });

    return { review: formatExemptionDetail(updated) };
  },

  async rejectExemptionEvidence(pharmacyId: string, evidenceId: string, reason: string) {
    await ensureApprovedPharmacy(pharmacyId);
    const current = await getExemptionEvidenceOrThrow(pharmacyId, evidenceId);

    if (current.status !== "PENDING") throw new AppError("Only pending exemption evidence can be rejected", 409);

    const rejectionReason = reason.trim();
    const now = new Date();

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.patientPharmacyExemptionEvidence.updateMany({
        where: { id: evidenceId, pharmacyId, status: "PENDING" },
        data: {
          status: "REJECTED",
          verifiedByPharmacyId: pharmacyId,
          verifiedAt: null,
          rejectedAt: now,
          rejectionReason,
        },
      });

      if (result.count === 0) throw new AppError("This exemption evidence has already been reviewed", 409);

      return tx.patientPharmacyExemptionEvidence.findFirstOrThrow({
        where: { id: evidenceId, pharmacyId },
        select: exemptionListSelect,
      });
    });

    return { review: formatExemptionDetail(updated) };
  },
};