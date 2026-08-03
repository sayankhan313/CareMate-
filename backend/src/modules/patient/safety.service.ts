import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

import { consultationService } from "./consultation.service.js";

import type { CreateSafetyAlertInput } from "./safety.types.js";

const DEFAULT_SAFETY_RESPONSE_TIMER_SECONDS = 30;

const safetyAlertInclude = {
  doctor: {
    select: {
      id: true,
      fullName: true,
      email: true,
      doctorProfile: {
        select: {
          specialization: true,
          clinicName: true,
        },
      },
    },
  },
  vitalReading: true,
  consultation: true,
} as const;

const formatSafetyAlert = (alert: any) => {
  return {
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
  };
};

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
          accountStatus: {
            in: ["ACTIVE", "APPROVED"],
          },
        },
      },
    },
    include: {
      doctor: true,
    },
  });

  return assignment?.doctor || null;
};

const getSafetyPreferences = async (patientId: string) => {
  return prisma.patientSafetyPreference.upsert({
    where: {
      patientId,
    },
    create: {
      patientId,
    },
    update: {},
    select: {
      countdownSeconds: true,
      notifyAssignedDoctors: true,
      shareLatestVitalsOnEscalation: true,
      notifyEmergencyContact: true,
    },
  });
};

const getSafetyAlertForPatient = async (
  patientId: string,
  alertId: string,
) => {
  const alert = await prisma.safetyAlert.findFirst({
    where: {
      id: alertId,
      patientId,
    },
    include: safetyAlertInclude,
  });

  if (!alert) {
    throw new AppError("Safety alert not found.", 404);
  }

  return alert;
};

export const safetyService = {
  async createSafetyAlert(
    patientId: string,
    data: CreateSafetyAlertInput,
  ) {
  const [primaryDoctor, safetyPreferences] = await Promise.all([
  getActivePrimaryDoctor(patientId),
  getSafetyPreferences(patientId),
]);

const existingActiveAlert = await prisma.safetyAlert.findFirst({
        where: {
          patientId,
          status: "ACTIVE",
        },
        include: safetyAlertInclude,
        orderBy: {
          createdAt: "desc",
        },
      });

    if (existingActiveAlert) {
      if (
        existingActiveAlert.doctorId !==
        (primaryDoctor?.id || null)
      ) {
        const updatedExistingAlert =
          await prisma.safetyAlert.update({
            where: {
              id: existingActiveAlert.id,
            },
            data: {
              doctorId: primaryDoctor?.id || null,
            },
            include: safetyAlertInclude,
          });

        return formatSafetyAlert(updatedExistingAlert);
      }

      return formatSafetyAlert(existingActiveAlert);
    }

    let vitalReading = null;

    if (data.vitalReadingId) {
      vitalReading =
        await prisma.patientVitalReading.findFirst({
          where: {
            id: data.vitalReadingId,
            patientId,
          },
        });

      if (!vitalReading) {
        throw new AppError(
          "Vital reading not found.",
          404,
        );
      }

      if (vitalReading.status !== "CRITICAL") {
        throw new AppError(
          "Safety response can only be started for critical vitals.",
          400,
        );
      }
    }

    const configuredCountdown =
      safetyPreferences.countdownSeconds ||
      DEFAULT_SAFETY_RESPONSE_TIMER_SECONDS;

    const timerEndsAt = new Date(
      Date.now() + configuredCountdown * 1000,
    );

    const alert = await prisma.safetyAlert.create({
      data: {
        patientId,
        doctorId: primaryDoctor?.id || null,
        vitalReadingId: vitalReading?.id || null,
        status: "ACTIVE",
        reason:
          data.reason?.trim() ||
          "Critical vital reading detected. Safety response timer started.",
        timerEndsAt,
      },
      include: safetyAlertInclude,
    });

    return formatSafetyAlert(alert);
  },

  async getActiveSafetyAlert(patientId: string) {
    const alert = await prisma.safetyAlert.findFirst({
      where: {
        patientId,
        status: "ACTIVE",
      },
      include: safetyAlertInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!alert) {
      return null;
    }

    return formatSafetyAlert(alert);
  },

  async cancelSafetyAlert(
    patientId: string,
    alertId: string,
  ) {
    const alert = await getSafetyAlertForPatient(
      patientId,
      alertId,
    );

    if (alert.status !== "ACTIVE") {
      throw new AppError(
        "Only active safety alerts can be cancelled.",
        400,
      );
    }

    const updatedAlert =
      await prisma.safetyAlert.update({
        where: {
          id: alert.id,
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
        include: safetyAlertInclude,
      });

    return formatSafetyAlert(updatedAlert);
  },

  async escalateSafetyAlert(
    patientId: string,
    alertId: string,
  ) {
    const alert = await getSafetyAlertForPatient(
      patientId,
      alertId,
    );

    if (alert.status === "CANCELLED") {
      throw new AppError(
        "Cancelled safety alerts cannot be escalated.",
        400,
      );
    }

    if (alert.status === "RESOLVED") {
      throw new AppError(
        "Resolved safety alerts cannot be escalated.",
        400,
      );
    }

    const primaryDoctor =
      await getActivePrimaryDoctor(patientId);

    if (!primaryDoctor) {
      throw new AppError(
        "No active primary doctor is assigned. Please assign a primary doctor before escalation.",
        400,
      );
    }

    const updatedAlert =
      await prisma.safetyAlert.update({
        where: {
          id: alert.id,
        },
        data: {
          doctorId: primaryDoctor.id,
          status: "ESCALATED",
          escalatedAt:
            alert.escalatedAt || new Date(),
        },
        include: safetyAlertInclude,
      });

    const consultationResult =
      await consultationService
        .createEmergencyConsultationFromAlert(
          patientId,
          updatedAlert.id,
          primaryDoctor.id,
        );

    return {
      alert: formatSafetyAlert(updatedAlert),
      ...consultationResult,
    };
  },
};