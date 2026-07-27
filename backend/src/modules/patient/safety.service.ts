import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

import { consultationService } from "./consultation.service.js";

import type { CreateSafetyAlertInput } from "./safety.types.js";

const SAFETY_RESPONSE_TIMER_SECONDS = 30;

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
    vitalReading: alert.vitalReading || null,
    consultation: alert.consultation || null,
  };
};

const getSafetyAlertForPatient = async (patientId: string, alertId: string) => {
  const alert = await prisma.safetyAlert.findFirst({
    where: {
      id: alertId,
      patientId,
    },
    include: {
      vitalReading: true,
      consultation: true,
    },
  });

  if (!alert) {
    throw new AppError("Safety alert not found.", 404);
  }

  return alert;
};

export const safetyService = {
  async createSafetyAlert(patientId: string, data: CreateSafetyAlertInput) {
    const existingActiveAlert = await prisma.safetyAlert.findFirst({
      where: {
        patientId,
        status: "ACTIVE",
      },
      include: {
        vitalReading: true,
        consultation: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingActiveAlert) {
      return formatSafetyAlert(existingActiveAlert);
    }

    let vitalReading = null;

    if (data.vitalReadingId) {
      vitalReading = await prisma.patientVitalReading.findFirst({
        where: {
          id: data.vitalReadingId,
          patientId,
        },
      });

      if (!vitalReading) {
        throw new AppError("Vital reading not found.", 404);
      }

      if (vitalReading.status !== "CRITICAL") {
        throw new AppError(
          "Safety response can only be started for critical vitals.",
          400
        );
      }
    }

    const timerEndsAt = new Date(
      Date.now() + SAFETY_RESPONSE_TIMER_SECONDS * 1000
    );

    const alert = await prisma.safetyAlert.create({
      data: {
        patientId,
        vitalReadingId: vitalReading?.id || null,
        status: "ACTIVE",
        reason:
          data.reason?.trim() ||
          "Critical vital reading detected. Safety response timer started.",
        timerEndsAt,
      },
      include: {
        vitalReading: true,
        consultation: true,
      },
    });

    return formatSafetyAlert(alert);
  },

  async getActiveSafetyAlert(patientId: string) {
    const alert = await prisma.safetyAlert.findFirst({
      where: {
        patientId,
        status: "ACTIVE",
      },
      include: {
        vitalReading: true,
        consultation: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!alert) {
      return null;
    }

    return formatSafetyAlert(alert);
  },

  async cancelSafetyAlert(patientId: string, alertId: string) {
    const alert = await getSafetyAlertForPatient(patientId, alertId);

    if (alert.status !== "ACTIVE") {
      throw new AppError("Only active safety alerts can be cancelled.", 400);
    }

    const updatedAlert = await prisma.safetyAlert.update({
      where: {
        id: alert.id,
      },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
      include: {
        vitalReading: true,
        consultation: true,
      },
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

    const updatedAlert =
      alert.status === "ESCALATED"
        ? alert
        : await prisma.safetyAlert.update({
            where: {
              id: alert.id,
            },
            data: {
              status: "ESCALATED",
              escalatedAt: new Date(),
            },
            include: {
              vitalReading: true,
              consultation: true,
            },
          });

    const consultationResult =
      await consultationService.createEmergencyConsultationFromAlert(
        patientId,
        updatedAlert.id
      );

    return {
      alert: formatSafetyAlert(updatedAlert),
      ...consultationResult,
    };
  },
};