import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";
import type { SendNotificationInput } from "../notification/notification.types.js";
import { ensureApprovedPharmacy } from "./pharmacy-access.service.js";
import {
  consumeOrderInventoryReservations,
  ensureOrderInventoryReadyForFulfilment,
  releaseOrderInventoryReservations,
} from "./pharmacy-inventory-match.service.js";
import type {
  PharmacyOrderListItem,
  PharmacyOrdersResponse,
  PharmacyOrderSource,
  PharmacyOrderStatus,
  PharmacyOrderStatusUpdateInput,
  PharmacyOrderStatusUpdateTarget,
} from "./pharmacy-orders.types.js";

export const pharmacyOrderListInclude = {
  patient: { select: { id: true, fullName: true } },
  doctor: { select: { id: true, fullName: true } },
  payment: { select: { chargePreference: true, status: true, amountPence: true, currency: true } },
  _count: { select: { items: true } },
} as const;

export const formatPharmacyOrderListItem = (order: any): PharmacyOrderListItem => ({
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

const allowedStatusTransitions: Record<PharmacyOrderStatus, PharmacyOrderStatusUpdateTarget[]> = {
  RECEIVED: ["ACCEPTED", "REJECTED", "DELAYED", "OUT_OF_STOCK", "CANCELLED"],
  ACCEPTED: ["PREPARING", "DELAYED", "OUT_OF_STOCK", "CANCELLED"],
  REJECTED: [],
  PREPARING: ["READY", "DELAYED", "OUT_OF_STOCK", "CANCELLED"],
  READY: ["COLLECTED", "OUT_FOR_DELIVERY", "DELAYED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELAYED", "CANCELLED"],
  DELIVERED: [],
  COLLECTED: [],
  DELAYED: ["ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "OUT_OF_STOCK", "CANCELLED"],
  OUT_OF_STOCK: ["ACCEPTED", "PREPARING", "CANCELLED"],
  CANCELLED: [],
};

const fulfilmentStatuses = new Set<PharmacyOrderStatusUpdateTarget>([
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COLLECTED",
]);

const exceptionStatuses = new Set<PharmacyOrderStatusUpdateTarget>([
  "REJECTED",
  "DELAYED",
  "OUT_OF_STOCK",
  "CANCELLED",
]);

const inventoryReservationRequiredStatuses = new Set<PharmacyOrderStatusUpdateTarget>([
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
]);

const inventoryReleaseStatuses = new Set<PharmacyOrderStatusUpdateTarget>([
  "REJECTED",
  "OUT_OF_STOCK",
  "CANCELLED",
]);

const inventoryConsumeStatuses = new Set<PharmacyOrderStatusUpdateTarget>(["DELIVERED", "COLLECTED"]);
const verificationBlockedStatuses = new Set<PharmacyOrderStatus>(["REJECTED", "CANCELLED", "DELIVERED", "COLLECTED"]);

export const getAllowedPharmacyOrderStatuses = (status: PharmacyOrderStatus) => allowedStatusTransitions[status] || [];

const getTimestampUpdate = (
  status: PharmacyOrderStatusUpdateTarget,
  now: Date,
  current: {
    acceptedAt: Date | null;
    rejectedAt: Date | null;
    preparingAt: Date | null;
    readyAt: Date | null;
    outForDeliveryAt: Date | null;
    deliveredAt: Date | null;
    collectedAt: Date | null;
    cancelledAt: Date | null;
    delayedAt: Date | null;
    outOfStockAt: Date | null;
  },
) => {
  switch (status) {
    case "ACCEPTED":
      return { acceptedAt: current.acceptedAt ?? now };
    case "REJECTED":
      return { rejectedAt: current.rejectedAt ?? now };
    case "PREPARING":
      return { preparingAt: current.preparingAt ?? now };
    case "READY":
      return { readyAt: current.readyAt ?? now };
    case "OUT_FOR_DELIVERY":
      return { outForDeliveryAt: current.outForDeliveryAt ?? now };
    case "DELIVERED":
      return { deliveredAt: current.deliveredAt ?? now };
    case "COLLECTED":
      return { collectedAt: current.collectedAt ?? now };
    case "CANCELLED":
      return { cancelledAt: current.cancelledAt ?? now };
    case "DELAYED":
      return { delayedAt: now };
    case "OUT_OF_STOCK":
      return { outOfStockAt: now };
  }
};

const getOrderNotificationContent = (
  status: PharmacyOrderStatusUpdateTarget,
): Pick<SendNotificationInput, "type" | "title" | "body" | "priority"> => {
  switch (status) {
    case "ACCEPTED":
      return {
        type: "ORDER_ACCEPTED",
        title: "Prescription order accepted",
        body: "Your pharmacy has accepted your prescription order.",
        priority: "NORMAL",
      };

    case "REJECTED":
      return {
        type: "ORDER_REJECTED",
        title: "Prescription order not accepted",
        body: "Your pharmacy could not accept your prescription order. Open CareMate+ for details.",
        priority: "HIGH",
      };

    case "PREPARING":
      return {
        type: "ORDER_PREPARING",
        title: "Prescription being prepared",
        body: "Your pharmacy has started preparing your prescription order.",
        priority: "NORMAL",
      };

    case "READY":
      return {
        type: "ORDER_READY",
        title: "Prescription ready",
        body: "Your prescription order is ready for collection or the next fulfilment step.",
        priority: "HIGH",
      };

    case "OUT_FOR_DELIVERY":
      return {
        type: "ORDER_OUT_FOR_DELIVERY",
        title: "Prescription out for delivery",
        body: "Your prescription order has left the pharmacy for delivery.",
        priority: "NORMAL",
      };

    case "DELIVERED":
      return {
        type: "ORDER_DELIVERED",
        title: "Prescription delivered",
        body: "Your pharmacy has marked your prescription order as delivered.",
        priority: "NORMAL",
      };

    case "COLLECTED":
      return {
        type: "ORDER_COLLECTED",
        title: "Prescription collected",
        body: "Your pharmacy has marked your prescription order as collected.",
        priority: "NORMAL",
      };

    case "DELAYED":
      return {
        type: "ORDER_DELAYED",
        title: "Prescription delayed",
        body: "Your pharmacy has reported a delay with your prescription order. Open CareMate+ for details.",
        priority: "HIGH",
      };

    case "OUT_OF_STOCK":
      return {
        type: "ORDER_OUT_OF_STOCK",
        title: "Medicine currently unavailable",
        body: "Your pharmacy has reported that stock required for your order is currently unavailable.",
        priority: "HIGH",
      };

    case "CANCELLED":
      return {
        type: "ORDER_CANCELLED",
        title: "Prescription order cancelled",
        body: "Your pharmacy order has been cancelled. Open CareMate+ for details.",
        priority: "HIGH",
      };
  }
};

const sendOrderStatusNotification = async (
  patientId: string,
  orderId: string,
  orderNumber: string | null,
  status: PharmacyOrderStatusUpdateTarget,
) => {
  try {
    const content = getOrderNotificationContent(status);

    await notificationService.createAndSend({
      userId: patientId,
      ...content,
      entityType: "MEDICINE_ORDER",
      entityId: orderId,
      targetScreen: "Notifications",
      data: { source: "PHARMACY_ORDER_STATUS", orderId, orderNumber, status },
    });
  } catch (error) {
    console.error("Pharmacy order notification failed:", error);
  }
};

export const pharmacyOrdersService = {
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
        include: pharmacyOrderListInclude,
        orderBy: { createdAt: "desc" },
        take: options.limit,
      }),
    ]);

    return { total, orders: orders.map(formatPharmacyOrderListItem) };
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
        acceptedAt: true,
        rejectedAt: true,
        preparingAt: true,
        readyAt: true,
        outForDeliveryAt: true,
        deliveredAt: true,
        collectedAt: true,
        cancelledAt: true,
        delayedAt: true,
        outOfStockAt: true,
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

        doctor: {
          select: {
            id: true,
            fullName: true,
            doctorProfile: { select: { specialization: true } },
          },
        },

        prescription: { select: { id: true, source: true, prescribedAt: true, notes: true } },

        patientSubmission: {
          select: {
            id: true,
            requestType: true,
            status: true,
            imageUrl: true,
            notes: true,
            reviewedByPharmacyId: true,
            reviewNote: true,
            reviewedAt: true,
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
            inventoryItemId: true,
            inventoryReservedQuantity: true,
            inventoryReservedAt: true,
            inventoryConsumedAt: true,
            inventoryReleasedAt: true,
            inventoryItem: {
              select: {
                id: true,
                medicineName: true,
                strength: true,
                form: true,
                stockUnit: true,
                quantityInStock: true,
                reservedQuantity: true,
                lowStockThreshold: true,
                isActive: true,
              },
            },
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
          select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order) throw new AppError("Order not found for this pharmacy", 404);

    return { order, allowedNextStatuses: getAllowedPharmacyOrderStatuses(order.status) };
  },

  async verifyPatientRefillRequest(pharmacyId: string, orderId: string, note?: string) {
    await ensureApprovedPharmacy(pharmacyId);

    const order = await prisma.medicineOrder.findFirst({
      where: { id: orderId, pharmacyId },
      select: {
        id: true,
        orderSource: true,
        status: true,
        prescriptionConfirmed: true,
        fulfilmentAllowed: true,
        patientSubmissionId: true,
        patientSubmission: {
          select: {
            id: true,
            pharmacyId: true,
            requestType: true,
            status: true,
            reviewedAt: true,
          },
        },
      },
    });

    if (!order) throw new AppError("Order not found for this pharmacy", 404);

    if (order.orderSource !== "REFILL_REQUEST" || !order.patientSubmission) {
      throw new AppError("Only patient refill requests can use pharmacist verification", 400);
    }

    if (order.patientSubmission.requestType !== "REFILL_REQUEST") {
      throw new AppError("This patient submission is not a refill request", 400);
    }

    if (order.prescriptionConfirmed || order.fulfilmentAllowed) {
      throw new AppError("This medicine request is already authorised for fulfilment", 409);
    }

    if (order.patientSubmission.status !== "VERIFICATION_REQUIRED") {
      throw new AppError(
        `This request cannot be verified while its submission status is ${order.patientSubmission.status}.`,
        409,
      );
    }

    if (verificationBlockedStatuses.has(order.status)) {
      throw new AppError(`A ${order.status.toLowerCase().replace(/_/g, " ")} order cannot be verified.`, 409);
    }

    const reviewedAt = new Date();
    const reviewNote = note?.trim() || "Medicine request reviewed by pharmacy staff for prototype fulfilment.";

    await prisma.$transaction(async tx => {
      const changed = await tx.medicineOrder.updateMany({
        where: { id: orderId, pharmacyId, fulfilmentAllowed: false },
        data: { fulfilmentAllowed: true },
      });

      if (changed.count === 0) {
        throw new AppError("Order verification changed elsewhere. Please refresh and try again.", 409);
      }

      await tx.patientPrescriptionSubmission.update({
        where: { id: order.patientSubmission!.id },
        data: {
          status: "VERIFIED",
          reviewedByPharmacyId: pharmacyId,
          reviewNote,
          reviewedAt,
        },
      });
    });

    return this.getOrderDetail(pharmacyId, orderId);
  },

  async updateOrderStatus(pharmacyId: string, orderId: string, input: PharmacyOrderStatusUpdateInput) {
    await ensureApprovedPharmacy(pharmacyId);

    const order = await prisma.medicineOrder.findFirst({
      where: { id: orderId, pharmacyId },
      select: {
        id: true,
        patientId: true,
        patientSubmissionId: true,
        orderNumber: true,
        status: true,
        fulfilmentAllowed: true,
        acceptedAt: true,
        rejectedAt: true,
        preparingAt: true,
        readyAt: true,
        outForDeliveryAt: true,
        deliveredAt: true,
        collectedAt: true,
        cancelledAt: true,
        delayedAt: true,
        outOfStockAt: true,
      },
    });

    if (!order) throw new AppError("Order not found for this pharmacy", 404);

    if (order.status === input.status) {
      throw new AppError(`Order is already ${input.status.toLowerCase().replace(/_/g, " ")}`, 409);
    }

    const allowed = getAllowedPharmacyOrderStatuses(order.status);

    if (!allowed.includes(input.status)) {
      throw new AppError(`Order cannot move from ${order.status} to ${input.status}.`, 409);
    }

    if (fulfilmentStatuses.has(input.status) && !order.fulfilmentAllowed) {
      throw new AppError("This order is not yet approved for pharmacy fulfilment", 409);
    }

    const now = new Date();
    const reason = input.reason?.trim() || null;
    const timestampUpdate = getTimestampUpdate(input.status, now, order);

    const updatedOrder = await prisma.$transaction(async tx => {
      if (inventoryReservationRequiredStatuses.has(input.status)) {
        await ensureOrderInventoryReadyForFulfilment(tx, pharmacyId, orderId);
      }

      const changed = await tx.medicineOrder.updateMany({
        where: { id: orderId, pharmacyId, status: order.status },
        data: {
          status: input.status,
          statusReason: exceptionStatuses.has(input.status) ? reason : null,
          ...timestampUpdate,
        },
      });

      if (changed.count === 0) {
        throw new AppError("Order status changed elsewhere. Please refresh and try again.", 409);
      }

      if (inventoryReleaseStatuses.has(input.status)) {
        await releaseOrderInventoryReservations(tx, pharmacyId, orderId, now);
      }

      if (inventoryConsumeStatuses.has(input.status)) {
        await consumeOrderInventoryReservations(tx, pharmacyId, orderId, now);
      }

      if (order.patientSubmissionId && input.status === "ACCEPTED") {
        await tx.patientPrescriptionSubmission.update({
          where: { id: order.patientSubmissionId },
          data: { status: "ACCEPTED", reviewedByPharmacyId: pharmacyId, reviewedAt: now },
        });
      }

      if (order.patientSubmissionId && input.status === "REJECTED") {
        await tx.patientPrescriptionSubmission.update({
          where: { id: order.patientSubmissionId },
          data: {
            status: "REJECTED",
            reviewedByPharmacyId: pharmacyId,
            reviewedAt: now,
            reviewNote: reason,
          },
        });
      }

      await tx.medicineOrderStatusHistory.create({
        data: {
          orderId,
          changedById: pharmacyId,
          fromStatus: order.status,
          toStatus: input.status,
          note: reason,
        },
      });

      return tx.medicineOrder.findFirstOrThrow({
        where: { id: orderId, pharmacyId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          statusReason: true,
          fulfilmentAllowed: true,
          acceptedAt: true,
          rejectedAt: true,
          preparingAt: true,
          readyAt: true,
          outForDeliveryAt: true,
          deliveredAt: true,
          collectedAt: true,
          cancelledAt: true,
          delayedAt: true,
          outOfStockAt: true,
          updatedAt: true,
          statusHistory: {
            select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    await sendOrderStatusNotification(order.patientId, orderId, order.orderNumber, input.status);

    return { order: updatedOrder, allowedNextStatuses: getAllowedPharmacyOrderStatuses(updatedOrder.status) };
  },
};