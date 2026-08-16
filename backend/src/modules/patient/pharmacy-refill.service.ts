import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";
import type { CreatePharmacyRefillInput, PharmacyRefillResponse } from "./pharmacy-refill.types.js";

const TERMINAL_ORDER_STATUSES = ["REJECTED", "DELIVERED", "COLLECTED", "CANCELLED"] as const;

const getPatientMedicine = async (patientId: string, medicineId: string) => {
  const medicine = await prisma.medicine.findFirst({
    where: { id: medicineId, patientId, isActive: true },
    select: {
      id: true,
      name: true,
      dose: true,
      instructions: true,
      source: true,
      prescribedByDoctorId: true,
      prescriptionItem: { select: { id: true, prescriptionId: true } },
    },
  });

  if (!medicine) throw new AppError("Medicine not found in your active medicines", 404);
  return medicine;
};

const getPatient = async (patientId: string) => {
  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: "PATIENT" },
    select: { id: true, fullName: true },
  });

  if (!patient) throw new AppError("Patient account not found", 404);
  return patient;
};

const getPrimaryPharmacy = async (patientId: string) => {
  const link = await prisma.patientPharmacyLink.findFirst({
    where: { patientId, isPrimary: true },
    select: {
      id: true,
      pharmacyId: true,
      chargePreference: true,
      pharmacy: {
        select: {
          id: true,
          role: true,
          accountStatus: true,
          isEmailVerified: true,
          pharmacyProfile: { select: { pharmacyName: true } },
        },
      },
    },
  });

  if (!link) {
    throw new AppError("Please select a primary pharmacy before requesting medicine", 400);
  }

  const pharmacyAvailable =
    link.pharmacy.role === "PHARMACY" &&
    link.pharmacy.isEmailVerified &&
    (link.pharmacy.accountStatus === "ACTIVE" || link.pharmacy.accountStatus === "APPROVED") &&
    Boolean(link.pharmacy.pharmacyProfile);

  if (!pharmacyAvailable) {
    throw new AppError("Your primary pharmacy is currently unavailable. Please select another approved pharmacy.", 409);
  }

  return link;
};

const ensureNoActiveRefillRequest = async (patientId: string, medicineId: string) => {
  const existing = await prisma.medicineOrder.findFirst({
    where: {
      patientId,
      orderSource: "REFILL_REQUEST",
      status: { notIn: [...TERMINAL_ORDER_STATUSES] },
      items: { some: { medicineId } },
    },
    select: { id: true, orderNumber: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    throw new AppError(
      `A pharmacy request for this medicine is already active${existing.orderNumber ? ` (${existing.orderNumber})` : ""}.`,
      409,
    );
  }
};

const notifyPharmacy = async ({
  pharmacyId,
  patientId,
  patientName,
  medicineName,
  orderId,
  orderNumber,
  prescriptionConfirmed,
}: {
  pharmacyId: string;
  patientId: string;
  patientName: string;
  medicineName: string;
  orderId: string;
  orderNumber: string | null;
  prescriptionConfirmed: boolean;
}) => {
  try {
    const existing = await prisma.userNotification.findFirst({
      where: {
        userId: pharmacyId,
        type: "NEW_MEDICINE_ORDER",
        entityType: "MEDICINE_ORDER",
        entityId: orderId,
      },
      select: { id: true },
    });

    if (existing) return;

    await notificationService.createAndSend({
      userId: pharmacyId,
      type: "NEW_MEDICINE_ORDER",
      title: "New patient medicine request",
      body: `${patientName} requested ${medicineName} from your pharmacy.`,
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
        prescriptionConfirmed,
        status: "RECEIVED",
      },
    });
  } catch (error) {
    console.warn(
      `Unable to notify pharmacy about refill order ${orderId}:`,
      error instanceof Error ? error.message : error,
    );
  }
};

export const pharmacyRefillService = {
  async createRefillRequest(patientId: string, input: CreatePharmacyRefillInput): Promise<PharmacyRefillResponse> {
    const [patient, medicine, primaryPharmacy] = await Promise.all([
      getPatient(patientId),
      getPatientMedicine(patientId, input.medicineId),
      getPrimaryPharmacy(patientId),
    ]);

    await ensureNoActiveRefillRequest(patientId, medicine.id);

    const quantityUnit = input.quantityUnit.trim();
    const quantityText = `${input.requestedQuantity} ${quantityUnit}`;
    const note = input.note?.trim() || null;

    const linkedDoctorPrescription =
      medicine.source === "DOCTOR_PRESCRIBED" &&
      Boolean(medicine.prescribedByDoctorId) &&
      Boolean(medicine.prescriptionItem?.prescriptionId);

    const prescriptionId = linkedDoctorPrescription ? medicine.prescriptionItem!.prescriptionId : null;
    const prescriptionItemId = linkedDoctorPrescription ? medicine.prescriptionItem!.id : null;
    const doctorId = linkedDoctorPrescription ? medicine.prescribedByDoctorId : null;
    const prescriptionConfirmed = linkedDoctorPrescription;
    const fulfilmentAllowed = linkedDoctorPrescription;

    const created = await prisma.$transaction(async tx => {
      const duplicate = await tx.medicineOrder.findFirst({
        where: {
          patientId,
          orderSource: "REFILL_REQUEST",
          status: { notIn: [...TERMINAL_ORDER_STATUSES] },
          items: { some: { medicineId: medicine.id } },
        },
        select: { id: true },
      });

      if (duplicate) throw new AppError("A pharmacy request for this medicine is already active.", 409);

      const submission = await tx.patientPrescriptionSubmission.create({
        data: {
          patientId,
          pharmacyId: primaryPharmacy.pharmacyId,
          requestType: "REFILL_REQUEST",
          notes: note,
          status: prescriptionConfirmed ? "VERIFIED" : "VERIFICATION_REQUIRED",
        },
        select: { id: true, requestType: true, status: true },
      });

      const submissionItem = await tx.patientPrescriptionSubmissionItem.create({
        data: {
          submissionId: submission.id,
          medicineId: medicine.id,
          name: medicine.name,
          dose: medicine.dose,
          quantity: quantityText,
          instructions: medicine.instructions,
        },
        select: { id: true },
      });

      const order = await tx.medicineOrder.create({
        data: {
          orderNumber: `CMRF-${submission.id}`,
          patientId,
          pharmacyId: primaryPharmacy.pharmacyId,
          doctorId,
          prescriptionId,
          patientSubmissionId: submission.id,
          orderSource: "REFILL_REQUEST",
          medicineName: medicine.name,
          dose: medicine.dose,
          quantity: quantityText,
          instructions: medicine.instructions,
          requestedByRole: "PATIENT",
          requestedByName: patient.fullName,
          requestNote: note,
          prescriptionConfirmed,
          prescriptionConfirmedAt: prescriptionConfirmed ? new Date() : null,
          fulfilmentAllowed,
          status: "RECEIVED",
          items: {
            create: {
              medicineId: medicine.id,
              prescriptionItemId,
              submissionItemId: submissionItem.id,
              name: medicine.name,
              dose: medicine.dose,
              quantity: quantityText,
              instructions: medicine.instructions,
              quantityUnit,
            },
          },
          payment: {
            create: {
              chargePreference: primaryPharmacy.chargePreference,
              chargeableItemCount: 1,
              unitChargePence: 0,
              amountPence: 0,
              currency: "GBP",
              provider: "STRIPE",
              testMode: true,
              status: "PENDING",
            },
          },
          statusHistory: {
            create: {
              changedById: patientId,
              fromStatus: null,
              toStatus: "RECEIVED",
              note: prescriptionConfirmed
                ? "Patient explicitly requested a refill for a CareMate+ doctor-prescribed medicine."
                : "Patient explicitly requested medicine from their medication list. Pharmacist verification is required before fulfilment.",
            },
          },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          orderSource: true,
          prescriptionConfirmed: true,
          fulfilmentAllowed: true,
        },
      });

      return { submission, order };
    });

    await notifyPharmacy({
      pharmacyId: primaryPharmacy.pharmacyId,
      patientId,
      patientName: patient.fullName,
      medicineName: medicine.name,
      orderId: created.order.id,
      orderNumber: created.order.orderNumber,
      prescriptionConfirmed: created.order.prescriptionConfirmed,
    });

    return {
      submission: {
        id: created.submission.id,
        requestType: "REFILL_REQUEST",
        status: created.submission.status,
        medicineId: medicine.id,
      },
      order: {
        id: created.order.id,
        orderNumber: created.order.orderNumber,
        status: created.order.status,
        orderSource: "REFILL_REQUEST",
        prescriptionConfirmed: created.order.prescriptionConfirmed,
        fulfilmentAllowed: created.order.fulfilmentAllowed,
      },
      pharmacy: {
        id: primaryPharmacy.pharmacyId,
        pharmacyName: primaryPharmacy.pharmacy.pharmacyProfile?.pharmacyName || "Primary pharmacy",
      },
      medicine: {
        id: medicine.id,
        name: medicine.name,
        dose: medicine.dose,
        source: medicine.source,
      },
      requiresPharmacyVerification: !created.order.prescriptionConfirmed,
    };
  },
};