import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";
import { jitsiService } from "./jitsi.service.js";
import type { CreateManualConsultationInput, PatientAppointmentSlot, PatientDoctorAvailableSlots, PatientDoctorMonthlyAvailability } from "./consultation.types.js";

const consultationInclude = { patient: true, doctor: true, safetyAlert: { include: { vitalReading: true } } } as const;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

  const isInvalidDate = Number.isNaN(preferredAt.getTime()) || preferredAt.getFullYear() !== year || preferredAt.getMonth() !== month - 1 || preferredAt.getDate() !== day || preferredAt.getHours() !== hour || preferredAt.getMinutes() !== minute;

  if (isInvalidDate) throw new AppError("Preferred date or time is invalid.", 400);
  if (preferredAt.getTime() < Date.now() - 60 * 1000) throw new AppError("Preferred consultation time cannot be in the past.", 400);

  return preferredAt;
};

const parseMonth = (month: string) => {
  if (!MONTH_PATTERN.test(month)) throw new AppError("Month must use YYYY-MM format.", 400);
  const [year, monthNumber] = month.split("-").map(Number);

  return {
    year,
    monthNumber,
    availabilityStart: new Date(Date.UTC(year, monthNumber - 1, 1)),
    availabilityEnd: new Date(Date.UTC(year, monthNumber, 1)),
    consultationStart: new Date(year, monthNumber - 1, 1, 0, 0, 0, 0),
    consultationEnd: new Date(year, monthNumber, 1, 0, 0, 0, 0),
  };
};

const parseCalendarDate = (value: string) => {
  if (!CALENDAR_DATE_PATTERN.test(value)) throw new AppError("Date must use YYYY-MM-DD format.", 400);

  const [year, month, day] = value.split("-").map(Number);
  const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (Number.isNaN(localDate.getTime()) || localDate.getFullYear() !== year || localDate.getMonth() !== month - 1 || localDate.getDate() !== day) throw new AppError("Invalid appointment date.", 400);

  return {
    year,
    month,
    day,
    databaseDate: new Date(Date.UTC(year, month - 1, day)),
    dayStart: new Date(year, month - 1, day, 0, 0, 0, 0),
    dayEnd: new Date(year, month - 1, day + 1, 0, 0, 0, 0),
  };
};

const formatDatabaseDate = (value: Date) => value.toISOString().slice(0, 10);
const formatLocalDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const formatTime = (totalMinutes: number) => `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;

const timeToMinutes = (value: string) => {
  if (!TIME_PATTERN.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

const combineCalendarDateAndTime = (date: string, time: string) => {
  const parsedDate = parseCalendarDate(date);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(parsedDate.year, parsedDate.month - 1, parsedDate.day, hour, minute, 0, 0);
};

const formatDoctor = (doctor: any) => ({
  id: doctor.id,
  fullName: doctor.fullName,
  specialization: doctor.doctorProfile?.specialization || null,
  clinicName: doctor.doctorProfile?.clinicName || null,
});

const buildPatientMeeting = (consultation: any) => {
  if (!consultation.patient) throw new AppError("Patient meeting information is unavailable.", 500);

  return jitsiService.createMeetingConfig({
    roomName: consultation.jaasRoomName,
    user: { id: consultation.patient.id, name: consultation.patient.fullName, email: consultation.patient.email, role: "PATIENT", moderator: false },
  });
};

const buildDoctorMeeting = (consultation: any) => {
  if (!consultation.doctor) throw new AppError("Doctor meeting information is unavailable.", 500);

  return jitsiService.createMeetingConfig({
    roomName: consultation.jaasRoomName,
    user: { id: consultation.doctor.id, name: consultation.doctor.fullName, email: consultation.doctor.email, role: "DOCTOR", moderator: true },
  });
};

const getPatientConsultation = async (patientId: string, consultationId: string) => {
  const consultation = await prisma.consultation.findFirst({ where: { id: consultationId, patientId }, include: consultationInclude });
  if (!consultation) throw new AppError("Consultation not found.", 404);
  return consultation;
};

const getAssignedApprovedDoctor = async (patientId: string, doctorId: string, requiredAssignmentType?: "PRIMARY" | "SPECIALIST") => {
  const assignment = await prisma.patientDoctorAssignment.findFirst({
    where: {
      patientId,
      doctorId,
      status: "ACTIVE",
      ...(requiredAssignmentType ? { assignmentType: requiredAssignmentType } : {}),
      doctor: { is: { role: "DOCTOR", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
    },
    include: { doctor: { include: { doctorProfile: { select: { specialization: true, clinicName: true } } } } },
  });

  if (!assignment) {
    if (requiredAssignmentType === "PRIMARY") throw new AppError("The selected doctor is not the patient's active primary doctor.", 403);
    throw new AppError("You can only request a consultation with an assigned approved doctor.", 403);
  }

  return assignment.doctor;
};

const getBookedConsultationsForPeriod = async (doctorId: string, start: Date, end: Date) => prisma.consultation.findMany({
  where: { doctorId, preferredAt: { gte: start, lt: end }, status: { notIn: ["CANCELLED", "REJECTED"] } },
  select: { id: true, preferredAt: true, status: true },
});

const generateFreeSlots = (date: string, availability: { startTime: string | null; endTime: string | null; slotDurationMinutes: number | null }, bookedTimes: Set<number>): PatientAppointmentSlot[] => {
  if (!availability.startTime || !availability.endTime || !availability.slotDurationMinutes) return [];

  const startMinutes = timeToMinutes(availability.startTime);
  const endMinutes = timeToMinutes(availability.endTime);
  const duration = availability.slotDurationMinutes;

  if (startMinutes === null || endMinutes === null || duration <= 0 || startMinutes >= endMinutes) return [];

  const slots: PatientAppointmentSlot[] = [];

  for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += duration) {
    const time = formatTime(minutes);
    const startsAt = combineCalendarDateAndTime(date, time);

    if (startsAt.getTime() <= Date.now() + 60 * 1000) continue;
    if (bookedTimes.has(startsAt.getTime())) continue;

    slots.push({ time, startsAt: startsAt.toISOString(), durationMinutes: duration });
  }

  return slots;
};

const validateAppointmentSlot = async (doctorId: string, preferredAt: Date, preferredDate: string, preferredTime: string) => {
  const [day, month, year] = preferredDate.split("/").map(Number);
  const calendarDate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsedDate = parseCalendarDate(calendarDate);

  const availability = await prisma.doctorAvailability.findFirst({ where: { doctorId, date: parsedDate.databaseDate } });

  if (!availability || availability.status !== "AVAILABLE" || !availability.startTime || !availability.endTime || !availability.slotDurationMinutes) {
    throw new AppError("The selected doctor is not available for appointments on this date.", 409);
  }

  const startMinutes = timeToMinutes(availability.startTime);
  const endMinutes = timeToMinutes(availability.endTime);
  const selectedMinutes = timeToMinutes(preferredTime);

  if (startMinutes === null || endMinutes === null || selectedMinutes === null) throw new AppError("The selected appointment slot is invalid.", 409);

  const duration = availability.slotDurationMinutes;
  const isAlignedSlot = selectedMinutes >= startMinutes && selectedMinutes + duration <= endMinutes && (selectedMinutes - startMinutes) % duration === 0;

  if (!isAlignedSlot) throw new AppError("The selected appointment time is not part of the doctor's available schedule.", 409);
  if (preferredAt.getTime() <= Date.now() + 60 * 1000) throw new AppError("This appointment slot is no longer available.", 409);

  const existingConsultation = await prisma.consultation.findFirst({
    where: { doctorId, preferredAt, status: { notIn: ["CANCELLED", "REJECTED"] } },
    select: { id: true },
  });

  if (existingConsultation) throw new AppError("This appointment slot has already been booked. Please choose another time.", 409);
};

const formatPreferredTime = (preferredAt: Date | null) => {
  if (!preferredAt) return null;
  return preferredAt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
};

const notifyDoctorAboutManualConsultation = async (consultation: any) => {
  try {
    if (!consultation.doctorId || !consultation.patient) return;

    const existingNotification = await prisma.userNotification.findFirst({
      where: { userId: consultation.doctorId, type: "MANUAL_CONSULTATION_REQUESTED", entityType: "CONSULTATION", entityId: consultation.id },
      select: { id: true },
    });

    if (existingNotification) return;

    const preferredTime = formatPreferredTime(consultation.preferredAt);

    await notificationService.createAndSend({
      userId: consultation.doctorId,
      type: "MANUAL_CONSULTATION_REQUESTED",
      title: "New consultation request",
      body: preferredTime ? `${consultation.patient.fullName} requested a consultation for ${preferredTime}.` : `${consultation.patient.fullName} requested a consultation. Open CareMate+ to review it.`,
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
    console.warn(`Unable to notify doctor about manual consultation ${consultation.id}:`, error instanceof Error ? error.message : error);
  }
};

export const consultationService = {
  async getPatientDoctorMonthlyAvailability(patientId: string, doctorId: string, month: string): Promise<PatientDoctorMonthlyAvailability> {
    const doctor = await getAssignedApprovedDoctor(patientId, doctorId);
    const range = parseMonth(month);

    const [availabilities, bookedConsultations] = await Promise.all([
      prisma.doctorAvailability.findMany({
        where: { doctorId, date: { gte: range.availabilityStart, lt: range.availabilityEnd }, status: "AVAILABLE" },
        orderBy: { date: "asc" },
      }),
      getBookedConsultationsForPeriod(doctorId, range.consultationStart, range.consultationEnd),
    ]);

    const bookedByDate = new Map<string, Set<number>>();

    bookedConsultations.forEach((consultation) => {
      if (!consultation.preferredAt) return;

      const key = formatLocalDate(consultation.preferredAt);
      const existing = bookedByDate.get(key) || new Set<number>();
      existing.add(consultation.preferredAt.getTime());
      bookedByDate.set(key, existing);
    });

    const dates = availabilities.map((availability) => {
      const date = formatDatabaseDate(availability.date);
      const bookedTimes = bookedByDate.get(date) || new Set<number>();
      const slots = generateFreeSlots(date, availability, bookedTimes);

      return { date, isAvailable: slots.length > 0, availableSlotCount: slots.length };
    });

    return { month, doctor: formatDoctor(doctor), dates };
  },

  async getPatientDoctorAvailableSlots(patientId: string, doctorId: string, date: string): Promise<PatientDoctorAvailableSlots> {
    const doctor = await getAssignedApprovedDoctor(patientId, doctorId);
    const parsedDate = parseCalendarDate(date);

    const availability = await prisma.doctorAvailability.findFirst({ where: { doctorId, date: parsedDate.databaseDate } });

    if (!availability || availability.status !== "AVAILABLE" || !availability.startTime || !availability.endTime || !availability.slotDurationMinutes) {
      return { date, isAvailable: false, doctor: formatDoctor(doctor), slots: [] };
    }

    const bookedConsultations = await getBookedConsultationsForPeriod(doctorId, parsedDate.dayStart, parsedDate.dayEnd);
    const bookedTimes = new Set<number>();

    bookedConsultations.forEach((consultation) => {
      if (consultation.preferredAt) bookedTimes.add(consultation.preferredAt.getTime());
    });

    const slots = generateFreeSlots(date, availability, bookedTimes);
    return { date, isAvailable: slots.length > 0, doctor: formatDoctor(doctor), slots };
  },

  async createEmergencyConsultationFromAlert(patientId: string, safetyAlertId: string, doctorId: string) {
    const doctor = await getAssignedApprovedDoctor(patientId, doctorId, "PRIMARY");

    const existingConsultation = await prisma.consultation.findFirst({ where: { patientId, safetyAlertId }, include: consultationInclude });

    if (existingConsultation) {
      if (existingConsultation.doctorId && existingConsultation.doctorId !== doctor.id) throw new AppError("This emergency consultation is already assigned to another doctor.", 409);

      const resolvedConsultation = existingConsultation.doctorId ? existingConsultation : await prisma.consultation.update({
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

    return { consultation: formatConsultation(consultation), patientMeeting: buildPatientMeeting(consultation), doctorMeeting: buildDoctorMeeting(consultation) };
  },

  async createManualConsultation(patientId: string, data: CreateManualConsultationInput) {
    const doctor = await getAssignedApprovedDoctor(patientId, data.doctorId);
    const preferredAt = parsePreferredDateTime(data.preferredDate, data.preferredTime);

    if (preferredAt && data.preferredDate && data.preferredTime) await validateAppointmentSlot(doctor.id, preferredAt, data.preferredDate, data.preferredTime);

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

    return { consultation: formatConsultation(consultation), patientMeeting: buildPatientMeeting(consultation), doctorMeeting: buildDoctorMeeting(consultation) };
  },

  async listPatientConsultations(patientId: string) {
    const consultations = await prisma.consultation.findMany({ where: { patientId }, include: { doctor: true }, orderBy: { createdAt: "desc" } });
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

    const updatedConsultation = consultation.status === "ACCEPTED" ? await prisma.consultation.update({
      where: { id: consultation.id },
      data: { status: "IN_PROGRESS", startedAt: consultation.startedAt || new Date() },
      include: consultationInclude,
    }) : consultation;

    return { consultation: formatConsultation(updatedConsultation), patientMeeting: buildPatientMeeting(updatedConsultation) };
  },
};