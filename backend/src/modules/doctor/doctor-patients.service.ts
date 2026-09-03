import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

import type {
  DoctorAlertResponse,
  DoctorAssignedPatientsResponse,
  DoctorConsultationResponse,
  DoctorPatientDetailResponse,
  DoctorPatientPrivacyAccess,
  DoctorVitalReadingResponse,
  DoctorVitalSummary,
} from "./doctor-patients.types.js";

const formatDateOfBirth = (value?: Date | null) => {
  if (!value) return null;
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const year = value.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const formatGender = (value?: string | null) => {
  if (!value) return null;
  if (value === "MALE") return "Male";
  if (value === "FEMALE") return "Female";
  if (value === "OTHER") return "Other";
  if (value === "PREFER_NOT_TO_SAY") return "Prefer not to say";
  return value;
};

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfToday = () => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

const ensureApprovedDoctor = async (doctorId: string) => {
  const doctor = await prisma.user.findUnique({
    where: { id: doctorId },
    select: { id: true, role: true, accountStatus: true, isEmailVerified: true },
  });

  if (!doctor) throw new AppError("Doctor not found", 404);
  if (doctor.role !== "DOCTOR") throw new AppError("Only doctors can access this resource", 403);
  if (!doctor.isEmailVerified) throw new AppError("Please verify your email first", 403);
  if (doctor.accountStatus !== "ACTIVE" && doctor.accountStatus !== "APPROVED") throw new AppError("Doctor account is not approved yet", 403);

  return doctor;
};

const ensureAssignedPatient = async (doctorId: string, patientId: string) => {
  await ensureApprovedDoctor(doctorId);

  const assignment = await prisma.patientDoctorAssignment.findFirst({
    where: { doctorId, patientId, status: "ACTIVE" },
    select: { id: true, assignmentType: true, createdAt: true },
  });

  if (!assignment) throw new AppError("You are not assigned to this patient", 403);

  return assignment;
};

const DEFAULT_PRIVACY_ACCESS: DoctorPatientPrivacyAccess = {
  shareVitalsWithAssignedDoctors: true,
  shareMedicinesWithAssignedDoctors: true,
  shareReportsWithAssignedDoctors: true,
};

const formatPrivacyAccess = (preferences?: any | null): DoctorPatientPrivacyAccess => ({
  shareVitalsWithAssignedDoctors: preferences?.shareVitalsWithAssignedDoctors ?? true,
  shareMedicinesWithAssignedDoctors: preferences?.shareMedicinesWithAssignedDoctors ?? true,
  shareReportsWithAssignedDoctors: preferences?.shareReportsWithAssignedDoctors ?? true,
});

const getPatientPrivacyAccess = async (patientId: string): Promise<DoctorPatientPrivacyAccess> => {
  const preferences = await prisma.patientPrivacyPreference.findUnique({
    where: { patientId },
    select: {
      shareVitalsWithAssignedDoctors: true,
      shareMedicinesWithAssignedDoctors: true,
      shareReportsWithAssignedDoctors: true,
    },
  });

  return preferences ? formatPrivacyAccess(preferences) : DEFAULT_PRIVACY_ACCESS;
};

const formatPatientProfile = (patient: any) => ({
  id: patient.id,
  fullName: patient.fullName,
  email: patient.email,
  phoneNumber: patient.patientProfile?.phoneNumber || null,
  dateOfBirth: formatDateOfBirth(patient.patientProfile?.dateOfBirth),
  gender: formatGender(patient.patientProfile?.gender),
  healthRecordNumber: patient.patientProfile?.healthRecordNumber || null,
  bloodGroup: patient.patientProfile?.bloodGroup || null,
  medicalConditions: patient.patientProfile?.medicalConditions || null,
  allergies: patient.patientProfile?.allergies || null,
  emergencyContact: patient.patientProfile?.emergencyContact || null,
  emergencyContactName: patient.patientProfile?.emergencyContactName || null,
  emergencyContactPhone: patient.patientProfile?.emergencyContactPhone || null,
  addressLine: patient.patientProfile?.addressLine || null,
  postcode: patient.patientProfile?.postcode || null,
});

const formatVitalReading = (vitalReading: any): DoctorVitalReadingResponse | null => {
  if (!vitalReading) return null;

  return {
    id: vitalReading.id,
    heartRate: vitalReading.heartRate,
    spo2: vitalReading.spo2,
    bpSystolic: vitalReading.bpSystolic,
    bpDiastolic: vitalReading.bpDiastolic,
    glucose: vitalReading.glucose,
    temperature: vitalReading.temperature,
    status: vitalReading.status,
    source: vitalReading.source,
    deviceSource: vitalReading.deviceSource,
    recordedAt: vitalReading.recordedAt,
  };
};

const formatPatient = (assignment: any) => {
  const patient = assignment.patient;
  const privacy = formatPrivacyAccess(patient.privacyPreferences);
  const latestVital = privacy.shareVitalsWithAssignedDoctors ? patient.vitalReadings[0] || null : null;
  const activeAlert = patient.patientSafetyAlerts[0] || null;

  return {
    assignmentId: assignment.id,
    assignmentType: assignment.assignmentType,
    assignedAt: assignment.createdAt,
    patient: formatPatientProfile(patient),
    privacy,
    latestVital: formatVitalReading(latestVital),
    activeMedicineCount: privacy.shareMedicinesWithAssignedDoctors ? patient.medicines.length : 0,
    activeAlert: activeAlert
      ? {
          id: activeAlert.id,
          status: activeAlert.status,
          reason: activeAlert.reason,
          timerEndsAt: activeAlert.timerEndsAt,
          createdAt: activeAlert.createdAt,
        }
      : null,
  };
};

const formatVitalSummary = (vitalReading: any): DoctorVitalSummary | null => {
  if (!vitalReading) return null;

  if (vitalReading.spo2 !== null && vitalReading.spo2 !== undefined) return { label: "SpO2", value: `${vitalReading.spo2}%`, status: vitalReading.status };
  if (vitalReading.heartRate !== null && vitalReading.heartRate !== undefined) return { label: "Heart rate", value: `${vitalReading.heartRate} bpm`, status: vitalReading.status };

  if (vitalReading.bpSystolic !== null && vitalReading.bpSystolic !== undefined && vitalReading.bpDiastolic !== null && vitalReading.bpDiastolic !== undefined) {
    return { label: "Blood pressure", value: `${vitalReading.bpSystolic}/${vitalReading.bpDiastolic}`, status: vitalReading.status };
  }

  if (vitalReading.glucose !== null && vitalReading.glucose !== undefined) return { label: "Glucose", value: `${vitalReading.glucose} mmol/L`, status: vitalReading.status };
  if (vitalReading.temperature !== null && vitalReading.temperature !== undefined) return { label: "Temperature", value: `${vitalReading.temperature}°C`, status: vitalReading.status };

  return { label: "Critical reading", value: "Needs review", status: vitalReading.status };
};

const canJoinConsultation = (status?: string) => status === "ACCEPTED" || status === "IN_PROGRESS";

const formatAlert = (alert: any): DoctorAlertResponse => ({
  id: alert.id,
  patientId: alert.patientId,
  doctorId: alert.doctorId,
  status: alert.status,
  reason: alert.reason,
  timerEndsAt: alert.timerEndsAt,
  escalatedAt: alert.escalatedAt,
  createdAt: alert.createdAt,
  patient: alert.patient
    ? { id: alert.patient.id, fullName: alert.patient.fullName, email: alert.patient.email }
    : null,
  vitalSummary: formatVitalSummary(alert.vitalReading),
  consultation: alert.consultation
    ? {
        id: alert.consultation.id,
        type: alert.consultation.type,
        status: alert.consultation.status,
        reason: alert.consultation.reason,
        createdAt: alert.consultation.createdAt,
      }
    : null,
  canJoinCall: canJoinConsultation(alert.consultation?.status),
});

const formatConsultation = (consultation: any): DoctorConsultationResponse => ({
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
  createdAt: consultation.createdAt,
  updatedAt: consultation.updatedAt,
  patient: consultation.patient
    ? { id: consultation.patient.id, fullName: consultation.patient.fullName, email: consultation.patient.email }
    : null,
});

const formatMedicine = (medicine: any) => ({
  id: medicine.id,
  name: medicine.name,
  dose: medicine.dose,
  instructions: medicine.instructions,
  source: medicine.source,
  isActive: medicine.isActive,
  createdAt: medicine.createdAt,
  reminders: medicine.reminders.map((reminder: any) => ({
    id: reminder.id,
    frequency: reminder.frequency,
    customFrequency: reminder.customFrequency,
    timeOfDay: reminder.timeOfDay,
    startDate: reminder.startDate,
    endDate: reminder.endDate,
    sendToDoctorForReview: reminder.sendToDoctorForReview,
    reviewStatus: reminder.reviewStatus,
    isActive: reminder.isActive,
  })),
});

const formatDoseLog = (doseLog: any) => ({
  id: doseLog.id,
  scheduledFor: doseLog.scheduledFor,
  status: doseLog.status,
  takenAt: doseLog.takenAt,
  snoozedUntil: doseLog.snoozedUntil,
  medicine: {
    id: doseLog.reminder.medicine.id,
    name: doseLog.reminder.medicine.name,
    dose: doseLog.reminder.medicine.dose,
  },
  reminder: {
    id: doseLog.reminder.id,
    timeOfDay: doseLog.reminder.timeOfDay,
    frequency: doseLog.reminder.frequency,
  },
});

const formatNote = (note: any) => ({
  id: note.id,
  note: note.note,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

const patientProfileSelect = {
  phoneNumber: true,
  dateOfBirth: true,
  gender: true,
  healthRecordNumber: true,
  bloodGroup: true,
  medicalConditions: true,
  allergies: true,
  emergencyContact: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  addressLine: true,
  postcode: true,
} as const;

export const doctorPatientsService = {
  async listAssignedPatients(doctorId: string): Promise<DoctorAssignedPatientsResponse> {
    await ensureApprovedDoctor(doctorId);

    const assignments = await prisma.patientDoctorAssignment.findMany({
      where: { doctorId, status: "ACTIVE" },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            patientProfile: { select: patientProfileSelect },
            privacyPreferences: {
              select: {
                shareVitalsWithAssignedDoctors: true,
                shareMedicinesWithAssignedDoctors: true,
                shareReportsWithAssignedDoctors: true,
              },
            },
            vitalReadings: { orderBy: { recordedAt: "desc" }, take: 1 },
            medicines: { where: { isActive: true }, select: { id: true } },
            patientSafetyAlerts: {
              where: { doctorId, status: { in: ["ACTIVE", "ESCALATED"] } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { id: true, status: true, reason: true, timerEndsAt: true, createdAt: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { patients: assignments.map(formatPatient) };
  },

  async getPatientDetail(doctorId: string, patientId: string): Promise<DoctorPatientDetailResponse> {
    const assignment = await ensureAssignedPatient(doctorId, patientId);
    const privacy = await getPatientPrivacyAccess(patientId);

    const todayStart = startOfToday();
    const todayEnd = endOfToday();

    const [
      patient,
      latestVital,
      vitalsHistory,
      activeMedicines,
      todayDoseLogs,
      latestNotes,
      activeAlert,
      recentConsultations,
      pendingMedicineReviewsCount,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          fullName: true,
          email: true,
          patientProfile: { select: patientProfileSelect },
        },
      }),

      privacy.shareVitalsWithAssignedDoctors
        ? prisma.patientVitalReading.findFirst({
            where: { patientId },
            orderBy: { recordedAt: "desc" },
          })
        : Promise.resolve(null),

      privacy.shareVitalsWithAssignedDoctors
        ? prisma.patientVitalReading.findMany({
            where: { patientId },
            orderBy: { recordedAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),

      privacy.shareMedicinesWithAssignedDoctors
        ? prisma.medicine.findMany({
            where: { patientId, isActive: true },
            include: {
              reminders: {
                where: { isActive: true },
                orderBy: { timeOfDay: "asc" },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 8,
          })
        : Promise.resolve([]),

      privacy.shareMedicinesWithAssignedDoctors
        ? prisma.medicineDoseLog.findMany({
            where: {
              patientId,
              scheduledFor: { gte: todayStart, lte: todayEnd },
            },
            include: {
              reminder: {
                include: { medicine: true },
              },
            },
            orderBy: { scheduledFor: "asc" },
          })
        : Promise.resolve([]),

      prisma.patientDoctorNote.findMany({
        where: { patientId, doctorId },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),

      prisma.safetyAlert.findFirst({
        where: {
          patientId,
          doctorId,
          status: { in: ["ACTIVE", "ESCALATED"] },
        },
        include: {
          patient: {
            select: { id: true, fullName: true, email: true },
          },
          vitalReading: true,
          consultation: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.consultation.findMany({
        where: { patientId, doctorId },
        include: {
          patient: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      privacy.shareMedicinesWithAssignedDoctors
        ? prisma.medicineReviewRequest.count({
            where: { patientId, doctorId, status: "PENDING" },
          })
        : Promise.resolve(0),
    ]);

    if (!patient) throw new AppError("Patient not found", 404);

    return {
      assignment: {
        id: assignment.id,
        assignmentType: assignment.assignmentType,
        assignedAt: assignment.createdAt,
      },

      patient: formatPatientProfile(patient),
      privacy,

      summary: {
        activeMedicineCount: activeMedicines.length,
        todayDoseCount: todayDoseLogs.length,
        missedDoseCount: todayDoseLogs.filter(doseLog => doseLog.status === "MISSED").length,
        snoozedDoseCount: todayDoseLogs.filter(doseLog => doseLog.status === "SNOOZED").length,
        pendingMedicineReviews: pendingMedicineReviewsCount,
        hasActiveAlert: Boolean(activeAlert),
      },

      latestVital: formatVitalReading(latestVital),

      vitalsHistory: vitalsHistory
        .map(formatVitalReading)
        .filter((vitalReading): vitalReading is DoctorVitalReadingResponse => vitalReading !== null),

      activeMedicines: activeMedicines.map(formatMedicine),
      todayDoseLogs: todayDoseLogs.map(formatDoseLog),
      latestNotes: latestNotes.map(formatNote),
      activeAlert: activeAlert ? formatAlert(activeAlert) : null,
      recentConsultations: recentConsultations.map(formatConsultation),
    };
  },

  async getPatientCareDiary(doctorId: string, patientId: string) {
    await ensureAssignedPatient(doctorId, patientId);

    const entries = await prisma.patientCareDiaryEntry.findMany({
      where: { patientId },
      select: {
        id: true,
        title: true,
        note: true,
        mood: true,
        symptoms: true,
        entryDate: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    });

    return {
      count: entries.length,
      entries,
    };
  },
};