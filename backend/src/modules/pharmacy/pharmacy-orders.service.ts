import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ensureApprovedPharmacy } from "./pharmacy-access.service.js";
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

export const getAllowedPharmacyOrderStatuses = (status: PharmacyOrderStatus) => {
  return allowedStatusTransitions[status] || [];
};

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

    return {
      order,
      allowedNextStatuses: getAllowedPharmacyOrderStatuses(order.status),
    };
  },

  async updateOrderStatus(pharmacyId: string, orderId: string, input: PharmacyOrderStatusUpdateInput) {
    await ensureApprovedPharmacy(pharmacyId);

    const order = await prisma.medicineOrder.findFirst({
      where: { id: orderId, pharmacyId },
      select: {
        id: true,
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
    });

    return {
      order: updatedOrder,
      allowedNextStatuses: getAllowedPharmacyOrderStatuses(updatedOrder.status),
    };
  },
};