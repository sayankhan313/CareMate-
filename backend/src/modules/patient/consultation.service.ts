import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";

import { jitsiService } from "./jitsi.service.js";
import type { CreateManualConsultationInput } from "./consultation.types.js";

const consultationInclude = {
  patient: true,
  doctor: true,
  safetyAlert: { include: { vitalReading: true } },
} as const;

const formatConsultation = (consultation: any) => ({
  id: consultation.id,
  patientId: consultation.patientId,
  doctorId: consultation.doctorId,
  safetyAlertId: consultation.safetyAlertId,
  type: consultation.type,
  status: consultation.status,
  reason: consultation.reason,
  preferredAt: consultation.preferredAt,
  notes: consultation.notes,
  doctorName: consultation.doctor?.fullName || consultation.doctorName || null,
  rejectionNote: consultation.rejectionNote,
  jaasRoomName: consultation.jaasRoomName,
  acceptedAt: consultation.acceptedAt,
  rejectedAt: consultation.rejectedAt,
  startedAt: consultation.startedAt,
  completedAt: consultation.completedAt,
  cancelledAt: consultation.cancelledAt,
  createdAt: consultation.createdAt,
  updatedAt: consultation.updatedAt,
});

const parsePreferredDateTime = (date?: string, time?: string) => {
  if (!date && !time) return null;

  if (!date || !time) throw new AppError("Preferred date and time must be provided together.", 400);

  const [day, month, year] = date.split("/").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const preferredAt = new Date(year, month - 1, day, hour, minute, 0, 0);

  const isInvalidDate =
    Number.isNaN(preferredAt.getTime()) ||
    preferredAt.getFullYear() !== year ||
    preferredAt.getMonth() !== month - 1 ||
    preferredAt.getDate() !== day ||
    preferredAt.getHours() !== hour ||
    preferredAt.getMinutes() !== minute;

  if (isInvalidDate) throw new AppError("Preferred date or time is invalid.", 400);
  if (preferredAt.getTime() < Date.now() - 60 * 1000) throw new AppError("Preferred consultation time cannot be in the past.", 400);

  return preferredAt;
};

const buildPatientMeeting = (consultation: any) => {
  if (!consultation.patient) throw new AppError("Patient meeting information is unavailable.", 500);

  return jitsiService.createMeetingConfig({
    roomName: consultation.jaasRoomName,
    user: {
      id: consultation.patient.id,
      name: consultation.patient.fullName,
      email: consultation.patient.email,
      role: "PATIENT",
      moderator: false,
    },
  });
};

const buildDoctorMeeting = (consultation: any) => {
  if (!consultation.doctor) throw new AppError("Doctor meeting information is unavailable.", 500);

  return jitsiService.createMeetingConfig({
    roomName: consultation.jaasRoomName,
    user: {
      id: consultation.doctor.id,
      name: consultation.doctor.fullName,
      email: consultation.doctor.email,
      role: "DOCTOR",
      moderator: true,
    },
  });
};

const getPatientConsultation = async (patientId: string, consultationId: string) => {
  const consultation = await prisma.consultation.findFirst({
    where: { id: consultationId, patientId },
    include: consultationInclude,
  });

  if (!consultation) throw new AppError("Consultation not found.", 404);

  return consultation;
};

const getAssignedApprovedDoctor = async (
  patientId: string,
  doctorId: string,
  requiredAssignmentType?: "PRIMARY" | "SPECIALIST"
) => {
  const assignment = await prisma.patientDoctorAssignment.findFirst({
    where: {
      patientId,
      doctorId,
      status: "ACTIVE",
      ...(requiredAssignmentType ? { assignmentType: requiredAssignmentType } : {}),
      doctor: {
        is: {
          role: "DOCTOR",
          isEmailVerified: true,
          accountStatus: { in: ["ACTIVE", "APPROVED"] },
        },
      },
    },
    include: { doctor: true },
  });

  if (!assignment) {
    if (requiredAssignmentType === "PRIMARY") {
      throw new AppError("The selected doctor is not the patient's active primary doctor.", 403);
    }

    throw new AppError("You can only request a consultation with an assigned approved doctor.", 403);
  }

  return assignment.doctor;
};

const formatPreferredTime = (preferredAt: Date | null) => {
  if (!preferredAt) return null;

  return preferredAt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const notifyDoctorAboutManualConsultation = async (consultation: any) => {
  try {
    if (!consultation.doctorId || !consultation.patient) return;

    const existingNotification = await prisma.userNotification.findFirst({
      where: {
        userId: consultation.doctorId,
        type: "MANUAL_CONSULTATION_REQUESTED",
        entityType: "CONSULTATION",
        entityId: consultation.id,
      },
      select: { id: true },
    });

    if (existingNotification) return;

    const preferredTime = formatPreferredTime(consultation.preferredAt);

    await notificationService.createAndSend({
      userId: consultation.doctorId,
      type: "MANUAL_CONSULTATION_REQUESTED",
      title: "New consultation request",
      body: preferredTime
        ? `${consultation.patient.fullName} requested a consultation for ${preferredTime}.`
        : `${consultation.patient.fullName} requested a consultation. Open CareMate+ to review it.`,
      priority: "HIGH",
      entityType: "CONSULTATION",
      entityId: consultation.id,
      targetScreen: "DoctorConsultations",
      data: {
        consultationId: consultation.id,
        patientId: consultation.patientId,
        patientName: consultation.patient.fullName,
        doctorId: consultation.doctorId,
        consultationType: consultation.type,
        consultationStatus: consultation.status,
        preferredAt: consultation.preferredAt?.toISOString() || null,
        source: "PATIENT_MANUAL_CONSULTATION",
      },
    });
  } catch (error) {
    console.warn(
      `Unable to notify doctor about manual consultation ${consultation.id}:`,
      error instanceof Error ? error.message : error
    );
  }
};

export const consultationService = {
  async createEmergencyConsultationFromAlert(patientId: string, safetyAlertId: string, doctorId: string) {
    const doctor = await getAssignedApprovedDoctor(patientId, doctorId, "PRIMARY");

    const existingConsultation = await prisma.consultation.findFirst({
      where: { patientId, safetyAlertId },
      include: consultationInclude,
    });

    if (existingConsultation) {
      if (existingConsultation.doctorId && existingConsultation.doctorId !== doctor.id) {
        throw new AppError("This emergency consultation is already assigned to another doctor.", 409);
      }

      const resolvedConsultation = existingConsultation.doctorId
        ? existingConsultation
        : await prisma.consultation.update({
            where: { id: existingConsultation.id },
            data: { doctorId: doctor.id, doctorName: doctor.fullName },
            include: consultationInclude,
          });

      return {
        consultation: formatConsultation(resolvedConsultation),
        patientMeeting: buildPatientMeeting(resolvedConsultation),
        doctorMeeting: buildDoctorMeeting(resolvedConsultation),
      };
    }

    const consultation = await prisma.consultation.create({
      data: {
        patientId,
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        safetyAlertId,
        type: "EMERGENCY",
        status: "PENDING",
        reason: "Critical vital reading detected by CareMate+ Safety Response.",
        jaasRoomName: jitsiService.createRoomName("emergency"),
      },
      include: consultationInclude,
    });

    return {
      consultation: formatConsultation(consultation),
      patientMeeting: buildPatientMeeting(consultation),
      doctorMeeting: buildDoctorMeeting(consultation),
    };
  },

  async createManualConsultation(patientId: string, data: CreateManualConsultationInput) {
    const doctor = await getAssignedApprovedDoctor(patientId, data.doctorId);
    const preferredAt = parsePreferredDateTime(data.preferredDate, data.preferredTime);

    const consultation = await prisma.consultation.create({
      data: {
        patientId,
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        type: "MANUAL",
        status: "PENDING",
        reason: data.reason.trim(),
        preferredAt,
        notes: data.notes?.trim() || null,
        jaasRoomName: jitsiService.createRoomName("manual"),
      },
      include: consultationInclude,
    });

    await notifyDoctorAboutManualConsultation(consultation);

    return {
      consultation: formatConsultation(consultation),
      patientMeeting: buildPatientMeeting(consultation),
      doctorMeeting: buildDoctorMeeting(consultation),
    };
  },

  async listPatientConsultations(patientId: string) {
    const consultations = await prisma.consultation.findMany({
      where: { patientId },
      include: { doctor: true },
      orderBy: { createdAt: "desc" },
    });

    return consultations.map(formatConsultation);
  },

  async getPatientConsultationById(patientId: string, consultationId: string) {
    const consultation = await getPatientConsultation(patientId, consultationId);
    return formatConsultation(consultation);
  },

  async getPatientJoinConfig(patientId: string, consultationId: string) {
    const consultation = await getPatientConsultation(patientId, consultationId);

    if (consultation.status === "PENDING") throw new AppError("Doctor has not accepted this consultation yet.", 400);
    if (consultation.status === "REJECTED") throw new AppError("This consultation was rejected.", 400);
    if (consultation.status === "CANCELLED") throw new AppError("This consultation was cancelled.", 400);
    if (consultation.status === "COMPLETED") throw new AppError("This consultation has already been completed.", 400);

    const updatedConsultation = consultation.status === "ACCEPTED"
      ? await prisma.consultation.update({
          where: { id: consultation.id },
          data: { status: "IN_PROGRESS", startedAt: consultation.startedAt || new Date() },
          include: consultationInclude,
        })
      : consultation;

    return {
      consultation: formatConsultation(updatedConsultation),
      patientMeeting: buildPatientMeeting(updatedConsultation),
    };
  },
};