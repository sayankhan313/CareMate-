import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

import { jitsiService } from "./jitsi.service.js";

import type { CreateManualConsultationInput } from "./consultation.types.js";

const formatConsultation = (consultation: any) => {
  return {
    id: consultation.id,
    patientId: consultation.patientId,
    doctorId: consultation.doctorId,
    safetyAlertId: consultation.safetyAlertId,
    type: consultation.type,
    status: consultation.status,
    reason: consultation.reason,
    preferredAt: consultation.preferredAt,
    notes: consultation.notes,
    doctorName: consultation.doctorName,
    rejectionNote: consultation.rejectionNote,
    jaasRoomName: consultation.jaasRoomName,
    acceptedAt: consultation.acceptedAt,
    rejectedAt: consultation.rejectedAt,
    startedAt: consultation.startedAt,
    completedAt: consultation.completedAt,
    cancelledAt: consultation.cancelledAt,
    createdAt: consultation.createdAt,
    updatedAt: consultation.updatedAt,
  };
};

const parsePreferredDateTime = (date?: string, time?: string) => {
  if (!date && !time) {
    return null;
  }

  if (!date || !time) {
    throw new AppError("Preferred date and time must be provided together.", 400);
  }

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

  if (isInvalidDate) {
    throw new AppError("Preferred date or time is invalid.", 400);
  }

  if (preferredAt.getTime() < Date.now() - 60 * 1000) {
    throw new AppError("Preferred consultation time cannot be in the past.", 400);
  }

  return preferredAt;
};

const buildPatientMeeting = (consultation: any) => {
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
  return jitsiService.createMeetingConfig({
    roomName: consultation.jaasRoomName,
    user: {
      id: consultation.doctor?.id || "doctor-direct-join",
      name:
        consultation.doctor?.fullName ||
        consultation.doctorName ||
        "CareMate+ Doctor",
      email: consultation.doctor?.email || "doctor@caremate.local",
      role: "DOCTOR",
      moderator: true,
    },
  });
};

const getPatientConsultation = async (
  patientId: string,
  consultationId: string
) => {
  const consultation = await prisma.consultation.findFirst({
    where: {
      id: consultationId,
      patientId,
    },
    include: {
      patient: true,
      doctor: true,
      safetyAlert: {
        include: {
          vitalReading: true,
        },
      },
    },
  });

  if (!consultation) {
    throw new AppError("Consultation not found.", 404);
  }

  return consultation;
};

export const consultationService = {
  async createEmergencyConsultationFromAlert(
    patientId: string,
    safetyAlertId: string
  ) {
    const existingConsultation = await prisma.consultation.findFirst({
      where: {
        patientId,
        safetyAlertId,
      },
      include: {
        patient: true,
        doctor: true,
        safetyAlert: {
          include: {
            vitalReading: true,
          },
        },
      },
    });

    if (existingConsultation) {
      return {
        consultation: formatConsultation(existingConsultation),
        patientMeeting: buildPatientMeeting(existingConsultation),
        doctorMeeting: buildDoctorMeeting(existingConsultation),
      };
    }

    const consultation = await prisma.consultation.create({
      data: {
        patientId,
        safetyAlertId,
        type: "EMERGENCY",
        status: "PENDING",
        reason: "Critical vital reading detected by CareMate+ Safety Response.",
        jaasRoomName: jitsiService.createRoomName("emergency"),
      },
      include: {
        patient: true,
        doctor: true,
        safetyAlert: {
          include: {
            vitalReading: true,
          },
        },
      },
    });

    return {
      consultation: formatConsultation(consultation),
      patientMeeting: buildPatientMeeting(consultation),
      doctorMeeting: buildDoctorMeeting(consultation),
    };
  },

  async createManualConsultation(
    patientId: string,
    data: CreateManualConsultationInput
  ) {
    const preferredAt = parsePreferredDateTime(
      data.preferredDate,
      data.preferredTime
    );

    const consultation = await prisma.consultation.create({
      data: {
        patientId,
        type: "MANUAL",
        status: "PENDING",
        reason: data.reason.trim(),
        preferredAt,
        notes: data.notes?.trim() || null,
        jaasRoomName: jitsiService.createRoomName("manual"),
      },
      include: {
        patient: true,
        doctor: true,
        safetyAlert: {
          include: {
            vitalReading: true,
          },
        },
      },
    });

    return {
      consultation: formatConsultation(consultation),
      patientMeeting: buildPatientMeeting(consultation),
      doctorMeeting: buildDoctorMeeting(consultation),
    };
  },

  async listPatientConsultations(patientId: string) {
    const consultations = await prisma.consultation.findMany({
      where: {
        patientId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return consultations.map(formatConsultation);
  },

  async getPatientConsultationById(patientId: string, consultationId: string) {
    const consultation = await getPatientConsultation(patientId, consultationId);

    return formatConsultation(consultation);
  },

  async getPatientJoinConfig(patientId: string, consultationId: string) {
    const consultation = await getPatientConsultation(patientId, consultationId);

    if (consultation.status === "REJECTED") {
      throw new AppError("This consultation was rejected.", 400);
    }

    if (consultation.status === "CANCELLED") {
      throw new AppError("This consultation was cancelled.", 400);
    }

    if (consultation.status === "COMPLETED") {
      throw new AppError("This consultation has already been completed.", 400);
    }

    const updatedConsultation =
      consultation.status === "PENDING" || consultation.status === "ACCEPTED"
        ? await prisma.consultation.update({
            where: {
              id: consultation.id,
            },
            data: {
              status: "IN_PROGRESS",
              startedAt: consultation.startedAt || new Date(),
            },
            include: {
              patient: true,
              doctor: true,
              safetyAlert: {
                include: {
                  vitalReading: true,
                },
              },
            },
          })
        : consultation;

    return {
      consultation: formatConsultation(updatedConsultation),
      patientMeeting: buildPatientMeeting(updatedConsultation),
    };
  },
};