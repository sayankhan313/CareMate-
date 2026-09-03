import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";

const TERMINAL_ORDER_STATUSES = ["REJECTED", "DELIVERED", "COLLECTED", "CANCELLED"] as const;

const getVerificationRequest = async (doctorId: string, submissionId: string) => {
  const request = await prisma.patientPrescriptionSubmission.findFirst({
    where: { id: submissionId, requestType: "REFILL_REQUEST", verificationPath: "ASSIGNED_DOCTOR", verificationDoctorId: doctorId },
    select: {
      id: true,
      patientId: true,
      pharmacyId: true,
      status: true,
      doctorVerificationStatus: true,
      doctorVerificationRequestedAt: true,
      doctorVerificationNote: true,
      doctorVerifiedAt: true,
      createdAt: true,
      patient: { select: { id: true, fullName: true } },
      pharmacy: { select: { id: true, pharmacyProfile: { select: { pharmacyName: true } } } },
      items: { select: { id: true, medicineId: true, name: true, dose: true, quantity: true, instructions: true } },
      medicineOrder: { select: { id: true, orderNumber: true, status: true, prescriptionConfirmed: true, fulfilmentAllowed: true, doctorId: true } },
    },
  });

  if (!request) throw new AppError("Medicine verification request not found or it is not assigned to you.", 404);
  return request;
};

const notifyPharmacyAfterConfirmation = async ({
  pharmacyId,
  patientId,
  patientName,
  medicineName,
  orderId,
  orderNumber,
}: {
  pharmacyId: string;
  patientId: string;
  patientName: string;
  medicineName: string;
  orderId: string;
  orderNumber: string | null;
}) => {
  try {
    const existing = await prisma.userNotification.findFirst({
      where: { userId: pharmacyId, type: "NEW_MEDICINE_ORDER", entityType: "MEDICINE_ORDER", entityId: orderId },
      select: { id: true },
    });

    if (existing) return;

    await notificationService.createAndSend({
      userId: pharmacyId,
      type: "NEW_MEDICINE_ORDER",
      title: "Doctor-verified medicine request",
      body: `${patientName}'s request for ${medicineName} has been confirmed by the selected doctor.`,
      priority: "HIGH",
      entityType: "MEDICINE_ORDER",
      entityId: orderId,
      targetScreen: "PharmacyDashboard",
      data: {
        orderId,
        orderNumber,
        patientId,
        patientName,
        medicineName,
        orderSource: "REFILL_REQUEST",
        prescriptionConfirmed: true,
        fulfilmentAllowed: true,
      },
    });
  } catch (error) {
    console.warn(`Unable to notify pharmacy about doctor-confirmed refill order ${orderId}:`, error instanceof Error ? error.message : error);
  }
};

const notifyPatient = async ({
  patientId,
  submissionId,
  orderId,
  medicineName,
  confirmed,
}: {
  patientId: string;
  submissionId: string;
  orderId: string;
  medicineName: string;
  confirmed: boolean;
}) => {
  try {
    await notificationService.createAndSend({
      userId: patientId,
      type: confirmed ? "REFILL_DOCTOR_VERIFICATION_CONFIRMED" : "REFILL_DOCTOR_VERIFICATION_REJECTED",
      title: confirmed ? "Medicine request confirmed" : "Medicine request not confirmed",
      body: confirmed
        ? `Your doctor confirmed the request for ${medicineName}. It can now continue to your pharmacy.`
        : `Your doctor did not confirm the request for ${medicineName}. The pharmacy request has been rejected.`,
      priority: confirmed ? "NORMAL" : "HIGH",
      entityType: "PATIENT_PRESCRIPTION_SUBMISSION",
      entityId: submissionId,
      targetScreen: "PatientOrders",
      data: {
        recipientRole: "PATIENT",
        submissionId,
        orderId,
        medicineName,
        doctorVerificationStatus: confirmed ? "CONFIRMED" : "REJECTED",
      },
    });
  } catch (error) {
    console.warn(`Unable to notify patient about refill verification ${submissionId}:`, error instanceof Error ? error.message : error);
  }
};

export const doctorRefillVerificationsService = {
  async listPending(doctorId: string) {
    const requests = await prisma.patientPrescriptionSubmission.findMany({
      where: { requestType: "REFILL_REQUEST", verificationPath: "ASSIGNED_DOCTOR", verificationDoctorId: doctorId, doctorVerificationStatus: "PENDING" },
      select: {
        id: true,
        status: true,
        doctorVerificationStatus: true,
        doctorVerificationRequestedAt: true,
        createdAt: true,
        patient: { select: { id: true, fullName: true } },
        items: { select: { medicineId: true, name: true, dose: true, quantity: true, instructions: true } },
        medicineOrder: { select: { id: true, orderNumber: true, status: true, fulfilmentAllowed: true } },
      },
      orderBy: { doctorVerificationRequestedAt: "asc" },
    });

    return { count: requests.length, requests };
  },

  async getDetail(doctorId: string, submissionId: string) {
    return getVerificationRequest(doctorId, submissionId);
  },

  async confirm(doctorId: string, submissionId: string, note?: string) {
    const request = await getVerificationRequest(doctorId, submissionId);

    if (request.doctorVerificationStatus !== "PENDING") {
      throw new AppError(`This medicine verification request has already been ${request.doctorVerificationStatus.toLowerCase()}.`, 409);
    }

    if (!request.medicineOrder) {
      throw new AppError("The pharmacy order linked to this verification request could not be found.", 404);
    }

    if (TERMINAL_ORDER_STATUSES.includes(request.medicineOrder.status as (typeof TERMINAL_ORDER_STATUSES)[number])) {
      throw new AppError("This pharmacy order is already closed and can no longer be confirmed.", 409);
    }

    const now = new Date();
    const verificationNote = note?.trim() || null;

    const updated = await prisma.$transaction(async tx => {
      const submission = await tx.patientPrescriptionSubmission.update({
        where: { id: submissionId },
        data: {
          doctorVerificationStatus: "CONFIRMED",
          doctorVerificationNote: verificationNote,
          doctorVerifiedAt: now,
          status: "VERIFIED",
        },
        select: { id: true, status: true, doctorVerificationStatus: true, doctorVerificationNote: true, doctorVerifiedAt: true },
      });

      const order = await tx.medicineOrder.update({
        where: { id: request.medicineOrder!.id },
        data: { doctorId, prescriptionConfirmed: true, prescriptionConfirmedAt: now, fulfilmentAllowed: true },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          prescriptionConfirmed: true,
          prescriptionConfirmedAt: true,
          fulfilmentAllowed: true,
          doctorId: true,
        },
      });

      return { submission, order };
    });

    const medicineName = request.items[0]?.name || "medicine";

    await Promise.all([
      notifyPharmacyAfterConfirmation({
        pharmacyId: request.pharmacyId,
        patientId: request.patientId,
        patientName: request.patient.fullName,
        medicineName,
        orderId: updated.order.id,
        orderNumber: updated.order.orderNumber,
      }),
      notifyPatient({
        patientId: request.patientId,
        submissionId: request.id,
        orderId: updated.order.id,
        medicineName,
        confirmed: true,
      }),
    ]);

    return { message: "Medicine request confirmed successfully.", submission: updated.submission, order: updated.order };
  },

  async reject(doctorId: string, submissionId: string, note?: string) {
    const request = await getVerificationRequest(doctorId, submissionId);

    if (request.doctorVerificationStatus !== "PENDING") {
      throw new AppError(`This medicine verification request has already been ${request.doctorVerificationStatus.toLowerCase()}.`, 409);
    }

    if (!request.medicineOrder) {
      throw new AppError("The pharmacy order linked to this verification request could not be found.", 404);
    }

    if (TERMINAL_ORDER_STATUSES.includes(request.medicineOrder.status as (typeof TERMINAL_ORDER_STATUSES)[number])) {
      throw new AppError("This pharmacy order is already closed.", 409);
    }

    const now = new Date();
    const verificationNote = note?.trim() || "Selected doctor did not confirm that they prescribed this medicine.";

    const updated = await prisma.$transaction(async tx => {
      const submission = await tx.patientPrescriptionSubmission.update({
        where: { id: submissionId },
        data: {
          doctorVerificationStatus: "REJECTED",
          doctorVerificationNote: verificationNote,
          doctorVerifiedAt: now,
          status: "REJECTED",
        },
        select: { id: true, status: true, doctorVerificationStatus: true, doctorVerificationNote: true, doctorVerifiedAt: true },
      });

      const order = await tx.medicineOrder.update({
        where: { id: request.medicineOrder!.id },
        data: {
          prescriptionConfirmed: false,
          prescriptionConfirmedAt: null,
          fulfilmentAllowed: false,
          status: "REJECTED",
          statusHistory: {
            create: {
              changedById: doctorId,
              fromStatus: request.medicineOrder!.status,
              toStatus: "REJECTED",
              note: verificationNote,
            },
          },
        },
        select: { id: true, orderNumber: true, status: true, prescriptionConfirmed: true, fulfilmentAllowed: true },
      });

      return { submission, order };
    });

    const medicineName = request.items[0]?.name || "medicine";

    await notifyPatient({
      patientId: request.patientId,
      submissionId: request.id,
      orderId: updated.order.id,
      medicineName,
      confirmed: false,
    });

    return { message: "Medicine request rejected successfully.", submission: updated.submission, order: updated.order };
  },
};