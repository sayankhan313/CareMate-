import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";
import { ensureLinkedPatient } from "./caregiver-patients.service.js";

const PROMPT_COOLDOWN_MS = 5 * 60_000;
const UPCOMING_WINDOW_MS = 2 * 60 * 60_000;

export const caregiverReminderPromptService = {
  async sendReminderPrompt(caregiverId: string, caregiverName: string, patientId: string, doseLogId: string) {
    await ensureLinkedPatient(caregiverId, patientId);

    const doseLog = await prisma.medicineDoseLog.findFirst({
      where: { id: doseLogId, patientId },
      include: { reminder: { include: { medicine: { select: { id: true, patientId: true, name: true, dose: true, isActive: true } } } } },
    });

    if (!doseLog || doseLog.reminder.medicine.patientId !== patientId) throw new AppError("Medicine dose was not found for this patient", 404);
    if (!doseLog.reminder.isActive || !doseLog.reminder.medicine.isActive) throw new AppError("This medicine reminder is no longer active", 409);
    if (doseLog.status === "TAKEN") throw new AppError("This dose has already been marked as taken", 409);

    const now = new Date();
    const effectiveDueAt = doseLog.status === "SNOOZED" && doseLog.snoozedUntil ? doseLog.snoozedUntil : doseLog.scheduledFor;
    if (doseLog.status === "PENDING" || doseLog.status === "SNOOZED") {
      const timeUntilDue = effectiveDueAt.getTime() - now.getTime();
      if (timeUntilDue > UPCOMING_WINDOW_MS) throw new AppError("A reminder prompt can only be sent when the dose is due within 2 hours", 409);
    }

    const recentPrompt = await prisma.userNotification.findFirst({
      where: {
        userId: patientId,
        type: "MEDICINE_REMINDER_DUE",
        entityType: "CAREGIVER_MEDICINE_PROMPT",
        entityId: doseLog.id,
        createdAt: { gte: new Date(now.getTime() - PROMPT_COOLDOWN_MS) },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (recentPrompt) {
      const retryAfterSeconds = Math.max(1, Math.ceil((recentPrompt.createdAt.getTime() + PROMPT_COOLDOWN_MS - now.getTime()) / 1000));
      throw new AppError(`A reminder was recently sent for this dose. Try again in ${retryAfterSeconds} seconds.`, 429);
    }

    const notification = await notificationService.createAndSend({
      userId: patientId,
      type: "MEDICINE_REMINDER_DUE",
      title: "Caregiver reminder",
      body: `${caregiverName} has reminded you that your ${doseLog.reminder.medicine.name} (${doseLog.reminder.medicine.dose}) dose is due.`,
      priority: "HIGH",
      entityType: "CAREGIVER_MEDICINE_PROMPT",
      entityId: doseLog.id,
      targetScreen: "PatientMedicines",
      patientPreferenceKey: "medicineReminders",
      data: {
        source: "CAREGIVER_MEDICINE_REMINDER",
        caregiverId,
        caregiverName,
        patientId,
        doseLogId: doseLog.id,
        reminderId: doseLog.reminderId,
        medicineId: doseLog.reminder.medicine.id,
        medicineName: doseLog.reminder.medicine.name,
        medicineDose: doseLog.reminder.medicine.dose,
        scheduledFor: doseLog.scheduledFor.toISOString(),
        snoozedUntil: doseLog.snoozedUntil?.toISOString() || null,
        doseStatus: doseLog.status,
      },
    });

    return {
      sent: true,
      dose: { id: doseLog.id, status: doseLog.status, scheduledFor: doseLog.scheduledFor, medicineName: doseLog.reminder.medicine.name, medicineDose: doseLog.reminder.medicine.dose },
      notification: { id: notification.id, createdAt: notification.createdAt },
      cooldownSeconds: PROMPT_COOLDOWN_MS / 1000,
    };
  },
};