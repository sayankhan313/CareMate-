import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ensureLinkedPatient } from "./caregiver-patients.service.js";

const ACTIVE_STATUSES = new Set(["RECEIVED", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"]);
const COMPLETED_STATUSES = new Set(["DELIVERED", "COLLECTED"]);
const ATTENTION_STATUSES = new Set(["REJECTED", "DELAYED", "OUT_OF_STOCK", "CANCELLED"]);

const orderSelect = {
  id: true,
  orderNumber: true,
  orderSource: true,
  status: true,
  statusReason: true,
  medicineName: true,
  dose: true,
  quantity: true,
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
  pharmacy: {
    select: {
      id: true,
      fullName: true,
      pharmacyProfile: { select: { pharmacyName: true, city: true, postcode: true } },
    },
  },
  doctor: {
    select: {
      id: true,
      fullName: true,
      doctorProfile: { select: { specialization: true } },
    },
  },
  patientSubmission: {
    select: {
      requestType: true,
      status: true,
      verificationPath: true,
      doctorVerificationStatus: true,
      doctorVerificationRequestedAt: true,
      doctorVerifiedAt: true,
      reviewedAt: true,
    },
  },
  items: {
    select: {
      id: true,
      medicineId: true,
      name: true,
      dose: true,
      quantity: true,
      quantityUnit: true,
      dispensedQuantity: true,
    },
    orderBy: { createdAt: "asc" },
  },
  payment: {
    select: {
      chargePreference: true,
      amountPence: true,
      currency: true,
      status: true,
      paidAt: true,
    },
  },
  statusHistory: {
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
} as const;

const formatOrder = (order: any) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  source: order.orderSource,
  status: order.status,
  statusReason: order.statusReason,
  medicine: {
    name: order.medicineName,
    dose: order.dose,
    quantity: order.quantity,
  },
  items: order.items.map((item: any) => ({
    id: item.id,
    medicineId: item.medicineId,
    name: item.name,
    dose: item.dose,
    quantity: item.quantity,
    quantityUnit: item.quantityUnit,
    dispensedQuantity: item.dispensedQuantity,
  })),
  pharmacy: order.pharmacy
    ? {
        id: order.pharmacy.id,
        pharmacyName: order.pharmacy.pharmacyProfile?.pharmacyName || order.pharmacy.fullName,
        city: order.pharmacy.pharmacyProfile?.city || null,
        postcode: order.pharmacy.pharmacyProfile?.postcode || null,
      }
    : null,
  doctor: order.doctor
    ? {
        id: order.doctor.id,
        fullName: order.doctor.fullName,
        specialization: order.doctor.doctorProfile?.specialization || null,
      }
    : null,
  verification: order.patientSubmission
    ? {
        requestType: order.patientSubmission.requestType,
        status: order.patientSubmission.status,
        verificationPath: order.patientSubmission.verificationPath,
        doctorVerificationStatus: order.patientSubmission.doctorVerificationStatus,
        doctorVerificationRequestedAt: order.patientSubmission.doctorVerificationRequestedAt,
        doctorVerifiedAt: order.patientSubmission.doctorVerifiedAt,
        pharmacyReviewed: Boolean(order.patientSubmission.reviewedAt),
      }
    : null,
  prescriptionConfirmed: order.prescriptionConfirmed,
  prescriptionConfirmedAt: order.prescriptionConfirmedAt,
  fulfilmentAllowed: order.fulfilmentAllowed,
  payment: order.payment
    ? {
        chargePreference: order.payment.chargePreference,
        amountPence: order.payment.amountPence,
        currency: order.payment.currency,
        status: order.payment.status,
        paidAt: order.payment.paidAt,
      }
    : null,
  timeline: order.statusHistory.map((history: any) => ({
    id: history.id,
    fromStatus: history.fromStatus,
    toStatus: history.toStatus,
    createdAt: history.createdAt,
  })),
  acceptedAt: order.acceptedAt,
  rejectedAt: order.rejectedAt,
  preparingAt: order.preparingAt,
  readyAt: order.readyAt,
  outForDeliveryAt: order.outForDeliveryAt,
  deliveredAt: order.deliveredAt,
  collectedAt: order.collectedAt,
  cancelledAt: order.cancelledAt,
  delayedAt: order.delayedAt,
  outOfStockAt: order.outOfStockAt,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

export const caregiverPharmacyOrderService = {
  async listPatientOrders(caregiverId: string, patientId: string) {
    const relationship = await ensureLinkedPatient(caregiverId, patientId);

    const orders = await prisma.medicineOrder.findMany({
      where: { patientId },
      select: orderSelect,
      orderBy: { createdAt: "desc" },
    });

    const formattedOrders = orders.map(formatOrder);

    return {
      patient: {
        id: relationship.patient.id,
        fullName: relationship.patient.fullName,
      },
      summary: {
        total: formattedOrders.length,
        active: formattedOrders.filter(order => ACTIVE_STATUSES.has(order.status)).length,
        completed: formattedOrders.filter(order => COMPLETED_STATUSES.has(order.status)).length,
        needsAttention: formattedOrders.filter(order => ATTENTION_STATUSES.has(order.status)).length,
      },
      orders: formattedOrders,
    };
  },

  async getPatientOrder(caregiverId: string, patientId: string, orderId: string) {
    const relationship = await ensureLinkedPatient(caregiverId, patientId);

    const order = await prisma.medicineOrder.findFirst({
      where: { id: orderId, patientId },
      select: orderSelect,
    });

    if (!order) throw new AppError("Pharmacy order not found for this linked patient.", 404);

    return {
      patient: {
        id: relationship.patient.id,
        fullName: relationship.patient.fullName,
      },
      order: formatOrder(order),
    };
  },
};