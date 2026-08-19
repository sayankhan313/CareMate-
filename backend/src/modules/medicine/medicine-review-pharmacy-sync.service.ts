import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";

const CLOSED_ORDER_STATUSES = ["REJECTED", "DELIVERED", "COLLECTED", "CANCELLED"] as const;

type MedicineReviewPharmacyDecision = "APPROVED" | "REJECTED";

type SyncMedicineReviewPharmacyInput = {
  patientId: string;
  medicineId: string;
  reviewerId: string;
  decision: MedicineReviewPharmacyDecision;
  note?: string | null;
  reviewedAt: Date;
};

const releaseOrderReservations = async (tx: Prisma.TransactionClient, pharmacyId: string | null, orderId: string, reviewedAt: Date) => {
  if (!pharmacyId) return;

  const items = await tx.medicineOrderItem.findMany({
    where: { orderId, inventoryItemId: { not: null }, inventoryReservedQuantity: { gt: 0 }, inventoryReservedAt: { not: null }, inventoryConsumedAt: null, inventoryReleasedAt: null },
    select: { id: true, inventoryItemId: true, inventoryReservedQuantity: true },
  });

  for (const item of items) {
    if (!item.inventoryItemId) continue;

    const released = await tx.pharmacyInventoryItem.updateMany({
      where: { id: item.inventoryItemId, pharmacyId, reservedQuantity: { gte: item.inventoryReservedQuantity } },
      data: { reservedQuantity: { decrement: item.inventoryReservedQuantity } },
    });

    if (released.count === 0) throw new AppError("Pharmacy stock reservation changed while the medicine review was being completed. Please refresh and try again.", 409);

    await tx.medicineOrderItem.update({
      where: { id: item.id },
      data: { inventoryItemId: null, inventoryReservedQuantity: 0, inventoryReservedAt: null, inventoryReleasedAt: reviewedAt, dispensedQuantity: null, dispensedUnit: null },
    });
  }
};

const notifyPharmacyAboutDoctorDecision = async ({
  pharmacyId,
  orderId,
  orderNumber,
  medicineName,
  reviewerId,
  decision,
  note,
}: {
  pharmacyId: string | null;
  orderId: string;
  orderNumber: string | null;
  medicineName: string;
  reviewerId: string;
  decision: MedicineReviewPharmacyDecision;
  note?: string | null;
}) => {
  if (!pharmacyId) return;

  try {
    const type = decision === "APPROVED" ? "REFILL_DOCTOR_VERIFICATION_CONFIRMED" : "REFILL_DOCTOR_VERIFICATION_REJECTED";

    const existing = await prisma.userNotification.findFirst({
      where: {
        userId: pharmacyId,
        type,
        entityType: "MEDICINE_ORDER",
        entityId: orderId,
      },
      select: { id: true },
    });

    if (existing) return;

    await notificationService.createAndSend({
      userId: pharmacyId,
      type,
      title: decision === "APPROVED" ? "Doctor review confirmed" : "Doctor review rejected",
      body:
        decision === "APPROVED"
          ? `Doctor review for ${medicineName} is complete. The linked order is clinically cleared; payment or exemption requirements still apply.`
          : `Doctor review for ${medicineName} was rejected. The linked pharmacy order has been blocked.`,
      priority: "HIGH",
      entityType: "MEDICINE_ORDER",
      entityId: orderId,
      targetScreen: "PharmacyOrderDetail",
      data: {
        source: "MEDICINE_REVIEW_PHARMACY_SYNC",
        orderId,
        orderNumber,
        medicineName,
        reviewerId,
        decision,
        note: note?.trim() || null,
      },
    });
  } catch (error) {
    console.warn(`Unable to notify pharmacy about doctor review for order ${orderId}:`, error instanceof Error ? error.message : error);
  }
};

export const medicineReviewPharmacySyncService = {
  async syncDecision(tx: Prisma.TransactionClient, input: SyncMedicineReviewPharmacyInput) {
    const linkedOrders = await tx.medicineOrder.findMany({
      where: {
        patientId: input.patientId,
        orderSource: "REFILL_REQUEST",
        status: { notIn: [...CLOSED_ORDER_STATUSES] },
        items: { some: { medicineId: input.medicineId } },
        patientSubmission: {
          is: {
            requestType: "REFILL_REQUEST",
            verificationPath: "ASSIGNED_DOCTOR",
            doctorVerificationStatus: "PENDING",
            verificationDoctorId: null,
          },
        },
      },
      select: { id: true, orderNumber: true, medicineName: true, status: true, pharmacyId: true, patientSubmissionId: true },
    });

    if (linkedOrders.length === 0) return { updatedOrders: 0 };

    const decisionNote = input.note?.trim() || (input.decision === "APPROVED" ? "Medicine review approved by doctor." : "Medicine review was not approved by doctor.");

    for (const order of linkedOrders) {
      if (!order.patientSubmissionId) continue;

      if (input.decision === "APPROVED") {
        await tx.patientPrescriptionSubmission.update({
          where: { id: order.patientSubmissionId },
          data: {
            verificationDoctorId: input.reviewerId,
            doctorVerificationStatus: "CONFIRMED",
            doctorVerificationNote: input.note?.trim() || null,
            doctorVerifiedAt: input.reviewedAt,
            status: "VERIFIED",
            reviewNote: input.note?.trim() || null,
            reviewedAt: input.reviewedAt,
          },
        });

        await tx.medicineOrder.update({
          where: { id: order.id },
          data: {
            doctorId: input.reviewerId,
            prescriptionConfirmed: true,
            prescriptionConfirmedAt: input.reviewedAt,
            fulfilmentAllowed: true,
            statusReason: null,
          },
        });

        continue;
      }

      await releaseOrderReservations(tx, order.pharmacyId, order.id, input.reviewedAt);

      await tx.patientPrescriptionSubmission.update({
        where: { id: order.patientSubmissionId },
        data: {
          verificationDoctorId: input.reviewerId,
          doctorVerificationStatus: "REJECTED",
          doctorVerificationNote: decisionNote,
          doctorVerifiedAt: input.reviewedAt,
          status: "REJECTED",
          reviewNote: decisionNote,
          reviewedAt: input.reviewedAt,
        },
      });

      await tx.medicineOrder.update({
        where: { id: order.id },
        data: {
          doctorId: input.reviewerId,
          prescriptionConfirmed: false,
          prescriptionConfirmedAt: null,
          fulfilmentAllowed: false,
          status: "REJECTED",
          statusReason: decisionNote,
          rejectedAt: input.reviewedAt,
          statusHistory: {
            create: {
              changedById: input.reviewerId,
              fromStatus: order.status,
              toStatus: "REJECTED",
              note: decisionNote,
            },
          },
        },
      });
    }
    await Promise.all(
      linkedOrders
        .filter(order => Boolean(order.patientSubmissionId))
        .map(order =>
          notifyPharmacyAboutDoctorDecision({
            pharmacyId: order.pharmacyId,
            orderId: order.id,
            orderNumber: order.orderNumber,
            medicineName: order.medicineName,
            reviewerId: input.reviewerId,
            decision: input.decision,
            note: input.note,
          }),
        ),
    );

    return { updatedOrders: linkedOrders.length };
  },
};