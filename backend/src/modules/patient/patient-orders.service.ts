import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

const ACTIVE_STATUSES = new Set([
  "RECEIVED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
]);

const COMPLETED_STATUSES = new Set([
  "DELIVERED",
  "COLLECTED",
]);

const ATTENTION_STATUSES = new Set([
  "REJECTED",
  "DELAYED",
  "OUT_OF_STOCK",
  "CANCELLED",
]);

const ensurePatient = async (patientId: string) => {
  const patient = await prisma.user.findFirst({
    where: {
      id: patientId,
      role: "PATIENT",
    },
    select: {
      id: true,
    },
  });

  if (!patient) {
    throw new AppError("Patient account not found", 404);
  }
};

export const patientOrdersService = {
  async listOrders(patientId: string) {
    await ensurePatient(patientId);

    const orders = await prisma.medicineOrder.findMany({
      where: {
        patientId,
      },

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

        pharmacy: {
          select: {
            id: true,
            fullName: true,

            pharmacyProfile: {
              select: {
                pharmacyName: true,
                address: true,
                city: true,
                postcode: true,
              },
            },
          },
        },

        doctor: {
          select: {
            id: true,
            fullName: true,

            doctorProfile: {
              select: {
                specialization: true,
              },
            },
          },
        },

        patientSubmission: {
          select: {
            id: true,
            requestType: true,
            status: true,

            verificationPath: true,
            doctorVerificationStatus: true,
            doctorVerificationNote: true,
            doctorVerificationRequestedAt: true,
            doctorVerifiedAt: true,

            evidenceType: true,
            imageUrl: true,

            reviewNote: true,
            reviewedAt: true,

            verificationDoctor: {
              select: {
                id: true,
                fullName: true,
              },
            },
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
            instructions: true,
            dispensedQuantity: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },

        payment: {
          select: {
            id: true,
            chargePreference: true,
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

        statusHistory: {
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      source: order.orderSource,
      status: order.status,
      statusReason: order.statusReason,

      medicineName: order.medicineName,
      dose: order.dose,
      quantity: order.quantity,
      instructions: order.instructions,

      requestedByRole: order.requestedByRole,
      requestedByName: order.requestedByName,
      requestNote: order.requestNote,

      prescriptionConfirmed: order.prescriptionConfirmed,
      prescriptionConfirmedAt: order.prescriptionConfirmedAt,
      fulfilmentAllowed: order.fulfilmentAllowed,

      pharmacy: order.pharmacy
        ? {
            id: order.pharmacy.id,
            pharmacyName:
              order.pharmacy.pharmacyProfile?.pharmacyName ||
              order.pharmacy.fullName,
            address:
              order.pharmacy.pharmacyProfile?.address ||
              null,
            city:
              order.pharmacy.pharmacyProfile?.city ||
              null,
            postcode:
              order.pharmacy.pharmacyProfile?.postcode ||
              null,
          }
        : null,

      doctor: order.doctor
        ? {
            id: order.doctor.id,
            fullName: order.doctor.fullName,
            specialization:
              order.doctor.doctorProfile?.specialization ||
              null,
          }
        : null,

      verification: order.patientSubmission
        ? {
            submissionId:
              order.patientSubmission.id,

            requestType:
              order.patientSubmission.requestType,

            submissionStatus:
              order.patientSubmission.status,

            verificationPath:
              order.patientSubmission.verificationPath,

            doctorVerificationStatus:
              order.patientSubmission.doctorVerificationStatus,

            doctorVerificationNote:
              order.patientSubmission.doctorVerificationNote,

            doctorVerificationRequestedAt:
              order.patientSubmission.doctorVerificationRequestedAt,

            doctorVerifiedAt:
              order.patientSubmission.doctorVerifiedAt,

            verificationDoctor:
              order.patientSubmission.verificationDoctor
                ? {
                    id:
                      order.patientSubmission.verificationDoctor.id,
                    fullName:
                      order.patientSubmission.verificationDoctor.fullName,
                  }
                : null,

            evidenceType:
              order.patientSubmission.evidenceType,

            hasEvidence:
              Boolean(order.patientSubmission.imageUrl),

            pharmacyReviewNote:
              order.patientSubmission.reviewNote,

            pharmacyReviewedAt:
              order.patientSubmission.reviewedAt,
          }
        : null,

      items: order.items.map(item => ({
        id: item.id,
        medicineId: item.medicineId,
        name: item.name,
        dose: item.dose,
        quantity: item.quantity,
        quantityUnit: item.quantityUnit,
        instructions: item.instructions,
        dispensedQuantity:
          item.dispensedQuantity,
      })),

      payment: order.payment
        ? {
            id: order.payment.id,
            chargePreference:
              order.payment.chargePreference,
            amountPence:
              order.payment.amountPence,
            currency:
              order.payment.currency,
            provider:
              order.payment.provider,
            testMode:
              order.payment.testMode,
            status:
              order.payment.status,
            paidAt:
              order.payment.paidAt,
            failedAt:
              order.payment.failedAt,
            refundedAt:
              order.payment.refundedAt,
          }
        : null,

      timeline: order.statusHistory.map(history => ({
        id: history.id,
        fromStatus: history.fromStatus,
        toStatus: history.toStatus,
        note: history.note,
        createdAt: history.createdAt,
      })),

      acceptedAt: order.acceptedAt,
      rejectedAt: order.rejectedAt,
      preparingAt: order.preparingAt,
      readyAt: order.readyAt,
      outForDeliveryAt:
        order.outForDeliveryAt,
      deliveredAt: order.deliveredAt,
      collectedAt: order.collectedAt,
      cancelledAt: order.cancelledAt,
      delayedAt: order.delayedAt,
      outOfStockAt: order.outOfStockAt,

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    return {
      summary: {
        total: formattedOrders.length,

        active: formattedOrders.filter(order =>
          ACTIVE_STATUSES.has(order.status),
        ).length,

        completed: formattedOrders.filter(order =>
          COMPLETED_STATUSES.has(order.status),
        ).length,

        needsAttention: formattedOrders.filter(order =>
          ATTENTION_STATUSES.has(order.status),
        ).length,
      },

      orders: formattedOrders,
    };
  },
};