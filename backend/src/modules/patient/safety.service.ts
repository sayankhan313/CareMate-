import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";

import { consultationService } from "./consultation.service.js";
import type { CreateSafetyAlertInput } from "./safety.types.js";

const DEFAULT_SAFETY_RESPONSE_TIMER_SECONDS = 30;

const safetyAlertInclude = {
  doctor: { select: { id: true, fullName: true, email: true, doctorProfile: { select: { specialization: true, clinicName: true } } } },
  vitalReading: true,
  consultation: true,
} as const;

const formatSafetyAlert = (alert: any) => ({
  id: alert.id,
  patientId: alert.patientId,
  doctorId: alert.doctorId,
  vitalReadingId: alert.vitalReadingId,
  status: alert.status,
  reason: alert.reason,
  timerEndsAt: alert.timerEndsAt,
  cancelledAt: alert.cancelledAt,
  escalatedAt: alert.escalatedAt,
  resolvedAt: alert.resolvedAt,
  createdAt: alert.createdAt,
  updatedAt: alert.updatedAt,
  doctor: alert.doctor || null,
  vitalReading: alert.vitalReading || null,
  consultation: alert.consultation || null,
});

const getActivePrimaryDoctor = async (patientId: string) => {
  const assignment = await prisma.patientDoctorAssignment.findFirst({
    where: {
      patientId,
      status: "ACTIVE",
      assignmentType: "PRIMARY",
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

  return assignment?.doctor || null;
};

const getSafetyPreferences = async (patientId: string) => prisma.patientSafetyPreference.upsert({
  where: { patientId },
  create: { patientId },
  update: {},
  select: {
    countdownSeconds: true,
    notifyAssignedDoctors: true,
    shareLatestVitalsOnEscalation: true,
    notifyEmergencyContact: true,
  },
});

const getSafetyAlertForPatient = async (patientId: string, alertId: string) => {
  const alert = await prisma.safetyAlert.findFirst({
    where: { id: alertId, patientId },
    include: safetyAlertInclude,
  });

  if (!alert) throw new AppError("Safety alert not found.", 404);

  return alert;
};

const buildVitalData = (vitalReading: any) => {
  if (!vitalReading) return null;

  return {
    id: vitalReading.id,
    status: vitalReading.status,
    heartRate: vitalReading.heartRate,
    spo2: vitalReading.spo2,
    bpSystolic: vitalReading.bpSystolic,
    bpDiastolic: vitalReading.bpDiastolic,
    glucose: vitalReading.glucose,
    temperature: vitalReading.temperature,
    source: vitalReading.source,
    deviceSource: vitalReading.deviceSource,
    recordedAt: vitalReading.recordedAt,
  };
};

const notifyPrimaryDoctorOfEscalation = async ({
  patientId,
  primaryDoctor,
  alert,
  consultationId,
  shareLatestVitals,
}: {
  patientId: string;
  primaryDoctor: { id: string; fullName: string; email: string };
  alert: any;
  consultationId?: string | null;
  shareLatestVitals: boolean;
}) => {
  try {
    const patient = await prisma.user.findFirst({
      where: { id: patientId, role: "PATIENT" },
      select: { id: true, fullName: true },
    });

    if (!patient) return;

    const existingNotification = await prisma.userNotification.findFirst({
      where: {
        userId: primaryDoctor.id,
        type: "SAFETY_ALERT_ESCALATED",
        entityType: "SAFETY_ALERT",
        entityId: alert.id,
      },
      select: { id: true },
    });

    if (existingNotification) return;

    const vitalData = shareLatestVitals ? buildVitalData(alert.vitalReading) : null;

    await notificationService.createAndSend({
      userId: primaryDoctor.id,
      type: "SAFETY_ALERT_ESCALATED",
      title: "Critical Safety Alert",
      body: `${patient.fullName} has escalated a Safety Response. Immediate review is required.`,
      priority: "CRITICAL",
      entityType: "SAFETY_ALERT",
      entityId: alert.id,
      targetScreen: "DoctorAlerts",
      data: {
        alertId: alert.id,
        patientId: patient.id,
        patientName: patient.fullName,
        doctorId: primaryDoctor.id,
        consultationId: consultationId || null,
        vitalReadingId: alert.vitalReadingId || null,
        vitalReading: vitalData,
        reason: alert.reason,
        escalatedAt: alert.escalatedAt,
        source: "SAFETY_RESPONSE",
      },
    });
  } catch (error) {
    console.warn(
      "Unable to notify primary doctor about Safety Response escalation:",
      error instanceof Error ? error.message : error,
    );
  }
};

export const safetyService = {
  async createSafetyAlert(patientId: string, data: CreateSafetyAlertInput) {
    const [primaryDoctor, safetyPreferences] = await Promise.all([
      getActivePrimaryDoctor(patientId),
      getSafetyPreferences(patientId),
    ]);

    const existingActiveAlert = await prisma.safetyAlert.findFirst({
      where: { patientId, status: "ACTIVE" },
      include: safetyAlertInclude,
      orderBy: { createdAt: "desc" },
    });

    if (existingActiveAlert) {
      if (existingActiveAlert.doctorId !== (primaryDoctor?.id || null)) {
        const updatedExistingAlert = await prisma.safetyAlert.update({
          where: { id: existingActiveAlert.id },
          data: { doctorId: primaryDoctor?.id || null },
          include: safetyAlertInclude,
        });

        return formatSafetyAlert(updatedExistingAlert);
      }

      return formatSafetyAlert(existingActiveAlert);
    }

    let vitalReading = null;

    if (data.vitalReadingId) {
      vitalReading = await prisma.patientVitalReading.findFirst({
        where: { id: data.vitalReadingId, patientId },
      });

      if (!vitalReading) throw new AppError("Vital reading not found.", 404);

      if (vitalReading.status !== "CRITICAL") {
        throw new AppError("Safety response can only be started for critical vitals.", 400);
      }
    }

    const configuredCountdown = safetyPreferences.countdownSeconds || DEFAULT_SAFETY_RESPONSE_TIMER_SECONDS;
    const timerEndsAt = new Date(Date.now() + configuredCountdown * 1000);

    const alert = await prisma.safetyAlert.create({
      data: {
        patientId,
        doctorId: primaryDoctor?.id || null,
        vitalReadingId: vitalReading?.id || null,
        status: "ACTIVE",
        reason: data.reason?.trim() || "Critical vital reading detected. Safety response timer started.",
        timerEndsAt,
      },
      include: safetyAlertInclude,
    });

    return formatSafetyAlert(alert);
  },

  async getActiveSafetyAlert(patientId: string) {
    const alert = await prisma.safetyAlert.findFirst({
      where: { patientId, status: "ACTIVE" },
      include: safetyAlertInclude,
      orderBy: { createdAt: "desc" },
    });

    return alert ? formatSafetyAlert(alert) : null;
  },

  async cancelSafetyAlert(patientId: string, alertId: string) {
    const alert = await getSafetyAlertForPatient(patientId, alertId);

    if (alert.status !== "ACTIVE") {
      throw new AppError("Only active safety alerts can be cancelled.", 400);
    }

    const updatedAlert = await prisma.safetyAlert.update({
      where: { id: alert.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
      include: safetyAlertInclude,
    });

    return formatSafetyAlert(updatedAlert);
  },

  async escalateSafetyAlert(patientId: string, alertId: string) {
    const alert = await getSafetyAlertForPatient(patientId, alertId);

    if (alert.status === "CANCELLED") {
      throw new AppError("Cancelled safety alerts cannot be escalated.", 400);
    }

    if (alert.status === "RESOLVED") {
      throw new AppError("Resolved safety alerts cannot be escalated.", 400);
    }

    const [primaryDoctor, safetyPreferences] = await Promise.all([
      getActivePrimaryDoctor(patientId),
      getSafetyPreferences(patientId),
    ]);

    if (!primaryDoctor) {
      throw new AppError(
        "No active primary doctor is assigned. Please assign a primary doctor before escalation.",
        400,
      );
    }

    const updatedAlert = await prisma.safetyAlert.update({
      where: { id: alert.id },
      data: {
        doctorId: primaryDoctor.id,
        status: "ESCALATED",
        escalatedAt: alert.escalatedAt || new Date(),
      },
      include: safetyAlertInclude,
    });

    const consultationResult = await consultationService.createEmergencyConsultationFromAlert(
      patientId,
      updatedAlert.id,
      primaryDoctor.id,
    );

    if (safetyPreferences.notifyAssignedDoctors) {
      await notifyPrimaryDoctorOfEscalation({
        patientId,
        primaryDoctor,
        alert: updatedAlert,
        consultationId: consultationResult.consultation?.id || null,
        shareLatestVitals: safetyPreferences.shareLatestVitalsOnEscalation,
      });
    }

    return {
      alert: formatSafetyAlert(updatedAlert),
      ...consultationResult,
    };
  },
};