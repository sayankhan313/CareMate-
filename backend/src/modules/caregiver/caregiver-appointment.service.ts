import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";
import { consultationService } from "../patient/consultation.service.js";
import { jitsiService } from "../patient/jitsi.service.js";
import { ensureLinkedPatient } from "./caregiver-patients.service.js";
import type { CaregiverCreateAppointmentInput } from "./caregiver-appointment.validation.js";

type OperationalStatus = "AVAILABLE" | "OUT_OF_OFFICE" | "UNAVAILABLE";

const getEffectiveOperationalStatus = (profile: any): OperationalStatus => {
  const status = (profile?.operationalStatus || "AVAILABLE") as OperationalStatus;
  if (status === "AVAILABLE") return "AVAILABLE";

  const now = Date.now();
  if (profile?.statusFrom && new Date(profile.statusFrom).getTime() > now) return "AVAILABLE";
  if (profile?.statusUntil && new Date(profile.statusUntil).getTime() < now) return "AVAILABLE";

  return status;
};

const timeToMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

const parsePreferredDateTime = (date: string, time: string) => {
  const [day, month, year] = date.split("/").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const preferredAt = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    Number.isNaN(preferredAt.getTime()) ||
    preferredAt.getFullYear() !== year ||
    preferredAt.getMonth() !== month - 1 ||
    preferredAt.getDate() !== day ||
    preferredAt.getHours() !== hour ||
    preferredAt.getMinutes() !== minute
  ) {
    throw new AppError("Preferred appointment date or time is invalid.", 400);
  }

  if (preferredAt.getTime() <= Date.now() + 60 * 1000) throw new AppError("Appointment time must be in the future.", 409);

  return {
    preferredAt,
    databaseDate: new Date(Date.UTC(year, month - 1, day)),
  };
};

const formatPreferredTime = (value: Date) =>
  value.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const sendAppointmentNotifications = async (consultation: any, caregiver: any) => {
  const preferredTime = formatPreferredTime(consultation.preferredAt);

  try {
    await notificationService.createAndSend({
      userId: consultation.doctorId,
      type: "MANUAL_CONSULTATION_REQUESTED",
      title: "New caregiver appointment request",
      body: `${caregiver.fullName} requested an appointment for ${consultation.patient.fullName} at ${preferredTime}.`,
      priority: "HIGH",
      entityType: "CONSULTATION",
      entityId: consultation.id,
      targetScreen: "DoctorConsultations",
      data: {
        consultationId: consultation.id,
        patientId: consultation.patientId,
        patientName: consultation.patient.fullName,
        doctorId: consultation.doctorId,
        caregiverId: caregiver.id,
        caregiverName: caregiver.fullName,
        consultationStatus: consultation.status,
        consultationType: consultation.type,
        preferredAt: consultation.preferredAt.toISOString(),
        initiatorType: "CAREGIVER",
        source: "CAREGIVER_APPOINTMENT_REQUEST",
      },
    });
  } catch (error) {
    console.warn("Unable to notify doctor about caregiver appointment request:", error instanceof Error ? error.message : error);
  }

  try {
    await notificationService.createAndSend({
      userId: consultation.patientId,
      type: "MANUAL_CONSULTATION_REQUESTED",
      title: "Appointment requested by your caregiver",
      body: `${caregiver.fullName} requested an appointment with ${consultation.doctor.fullName} for ${preferredTime}.`,
      priority: "HIGH",
      entityType: "CONSULTATION",
      entityId: consultation.id,
      targetScreen: "Consultations",
      patientPreferenceKey: "consultationUpdates",
      data: {
        consultationId: consultation.id,
        patientId: consultation.patientId,
        doctorId: consultation.doctorId,
        doctorName: consultation.doctor.fullName,
        caregiverId: caregiver.id,
        caregiverName: caregiver.fullName,
        consultationStatus: consultation.status,
        preferredAt: consultation.preferredAt.toISOString(),
        initiatorType: "CAREGIVER",
        source: "CAREGIVER_APPOINTMENT_REQUEST",
      },
    });
  } catch (error) {
    console.warn("Unable to notify patient about caregiver appointment request:", error instanceof Error ? error.message : error);
  }
};

export const caregiverAppointmentService = {
  async listAssignedDoctors(caregiverId: string, patientId: string) {
    await ensureLinkedPatient(caregiverId, patientId);

    const assignments = await prisma.patientDoctorAssignment.findMany({
      where: {
        patientId,
        status: "ACTIVE",
        doctor: { is: { role: "DOCTOR", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
      },
      select: {
        assignmentType: true,
        doctor: {
          select: {
            id: true,
            fullName: true,
            doctorProfile: {
              select: {
                specialization: true,
                clinicName: true,
                operationalStatus: true,
                statusFrom: true,
                statusUntil: true,
              },
            },
          },
        },
      },
      orderBy: [{ assignmentType: "asc" }, { createdAt: "asc" }],
    });

    return assignments.map(item => ({
      id: item.doctor.id,
      fullName: item.doctor.fullName,
      assignmentType: item.assignmentType,
      specialization: item.doctor.doctorProfile?.specialization || null,
      clinicName: item.doctor.doctorProfile?.clinicName || null,
      operationalStatus: getEffectiveOperationalStatus(item.doctor.doctorProfile),
      acceptingAppointments: getEffectiveOperationalStatus(item.doctor.doctorProfile) === "AVAILABLE",
    }));
  },

  async getMonthlyAvailability(caregiverId: string, patientId: string, doctorId: string, month: string) {
    await ensureLinkedPatient(caregiverId, patientId);
    return consultationService.getPatientDoctorMonthlyAvailability(patientId, doctorId, month);
  },

  async getAvailableSlots(caregiverId: string, patientId: string, doctorId: string, date: string) {
    await ensureLinkedPatient(caregiverId, patientId);
    return consultationService.getPatientDoctorAvailableSlots(patientId, doctorId, date);
  },

  async createAppointmentRequest(caregiverId: string, patientId: string, data: CaregiverCreateAppointmentInput) {
    const parsed = parsePreferredDateTime(data.preferredDate, data.preferredTime);

    let result;

    try {
      result = await prisma.$transaction(async tx => {
        const relationship = await tx.patientCaregiverRelationship.findFirst({
          where: {
            caregiverId,
            patientId,
            status: "ACTIVE",
            caregiver: { is: { role: "CAREGIVER", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
            patient: { is: { role: "PATIENT", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
          },
          select: {
            id: true,
            caregiver: { select: { id: true, fullName: true } },
            patient: { select: { id: true, fullName: true } },
          },
        });

        if (!relationship) throw new AppError("You are not authorised to request appointments for this patient.", 403);

        const assignment = await tx.patientDoctorAssignment.findFirst({
          where: {
            patientId,
            doctorId: data.doctorId,
            status: "ACTIVE",
            doctor: { is: { role: "DOCTOR", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
          },
          select: {
            doctor: {
              select: {
                id: true,
                fullName: true,
                doctorProfile: {
                  select: {
                    specialization: true,
                    clinicName: true,
                    operationalStatus: true,
                    statusFrom: true,
                    statusUntil: true,
                  },
                },
              },
            },
          },
        });

        if (!assignment) throw new AppError("Appointments can only be requested with an active doctor assigned to this patient.", 403);

        if (getEffectiveOperationalStatus(assignment.doctor.doctorProfile) !== "AVAILABLE") {
          throw new AppError("The selected doctor is currently unavailable for new appointments.", 409);
        }

        const availability = await tx.doctorAvailability.findFirst({
          where: { doctorId: assignment.doctor.id, date: parsed.databaseDate },
          select: { status: true, startTime: true, endTime: true, slotDurationMinutes: true },
        });

        if (!availability || availability.status !== "AVAILABLE" || !availability.startTime || !availability.endTime || !availability.slotDurationMinutes) {
          throw new AppError("The selected doctor is not available for appointments on this date.", 409);
        }

        const selectedMinutes = timeToMinutes(data.preferredTime);
        const startMinutes = timeToMinutes(availability.startTime);
        const endMinutes = timeToMinutes(availability.endTime);
        const duration = availability.slotDurationMinutes;

        const validSlot =
          selectedMinutes >= startMinutes &&
          selectedMinutes + duration <= endMinutes &&
          (selectedMinutes - startMinutes) % duration === 0;

        if (!validSlot) throw new AppError("The selected appointment time is not part of the doctor's available schedule.", 409);

        const occupiedSlot = await tx.consultation.findFirst({
          where: {
            doctorId: assignment.doctor.id,
            preferredAt: parsed.preferredAt,
            status: { notIn: ["CANCELLED", "REJECTED"] },
          },
          select: { id: true },
        });

        if (occupiedSlot) throw new AppError("This appointment slot has already been booked. Please choose another time.", 409);

        const consultation = await tx.consultation.create({
          data: {
            patientId,
            doctorId: assignment.doctor.id,
            doctorName: assignment.doctor.fullName,
            initiatedByUserId: caregiverId,
            initiatorType: "CAREGIVER",
            type: "MANUAL",
            status: "PENDING",
            reason: data.reason.trim(),
            preferredAt: parsed.preferredAt,
            jaasRoomName: jitsiService.createRoomName("manual"),
          },
          select: {
            id: true,
            patientId: true,
            doctorId: true,
            initiatorType: true,
            type: true,
            status: true,
            preferredAt: true,
            createdAt: true,
            patient: { select: { id: true, fullName: true } },
            doctor: {
              select: {
                id: true,
                fullName: true,
                doctorProfile: { select: { specialization: true, clinicName: true } },
              },
            },
          },
        });

        return {
          consultation,
          caregiver: relationship.caregiver,
        };
      }, { isolationLevel: "Serializable" });
    } catch (error: any) {
      if (error?.code === "P2034") throw new AppError("This appointment slot changed while your request was being processed. Please try again.", 409);
      throw error;
    }

    const doctor = result.consultation.doctor;
    if (!doctor) throw new AppError("Assigned doctor information is unavailable for this appointment.", 500);

    await sendAppointmentNotifications(result.consultation, result.caregiver);

    return {
      consultation: {
        id: result.consultation.id,
        patientId: result.consultation.patientId,
        doctorId: result.consultation.doctorId,
        type: result.consultation.type,
        status: result.consultation.status,
        preferredAt: result.consultation.preferredAt,
        initiatorType: result.consultation.initiatorType,
        initiatedByUserId: caregiverId,
        doctor: {
          id: doctor.id,
          fullName: doctor.fullName,
          specialization: doctor.doctorProfile?.specialization || null,
          clinicName: doctor.doctorProfile?.clinicName || null,
        },
        createdAt: result.consultation.createdAt,
      },
      message: "Appointment request sent to the doctor for approval.",
    };
  },
};