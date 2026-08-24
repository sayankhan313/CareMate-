import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ensureLinkedPatient } from "./caregiver-patients.service.js";

const safetyAlertSelect = {
  id: true,
  patientId: true,
  doctorId: true,
  vitalReadingId: true,
  status: true,
  reason: true,
  timerEndsAt: true,
  cancelledAt: true,
  escalatedAt: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  doctor: { select: { id: true, fullName: true } },
  vitalReading: { select: { id: true, heartRate: true, spo2: true, bpSystolic: true, bpDiastolic: true, glucose: true, temperature: true, status: true, source: true, recordedAt: true } },
  consultation: { select: { id: true, type: true, status: true, preferredAt: true, doctorName: true, acceptedAt: true, startedAt: true, completedAt: true, cancelledAt: true, createdAt: true, updatedAt: true } },
} as const;

export const caregiverSafetyService = {
  async listPatientSafetyAlerts(caregiverId: string, patientId: string) {
    await ensureLinkedPatient(caregiverId, patientId);

    const alerts = await prisma.safetyAlert.findMany({ where: { patientId }, select: safetyAlertSelect, orderBy: { createdAt: "desc" }, take: 20 });
    const activeAlert = alerts.find(alert => alert.status === "ACTIVE" || alert.status === "ESCALATED") || null;

    return {
      activeAlert,
      recentAlerts: alerts,
      summary: {
        totalReturned: alerts.length,
        active: alerts.filter(alert => alert.status === "ACTIVE").length,
        escalated: alerts.filter(alert => alert.status === "ESCALATED").length,
        resolved: alerts.filter(alert => alert.status === "RESOLVED").length,
        cancelled: alerts.filter(alert => alert.status === "CANCELLED").length,
      },
    };
  },

  async getPatientSafetyAlert(caregiverId: string, patientId: string, alertId: string) {
    await ensureLinkedPatient(caregiverId, patientId);

    const alert = await prisma.safetyAlert.findFirst({ where: { id: alertId, patientId }, select: safetyAlertSelect });
    if (!alert) throw new AppError("Safety alert not found for this patient", 404);

    return alert;
  },
};