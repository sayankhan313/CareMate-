import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";
import { ensureLinkedPatient } from "./caregiver-patients.service.js";

const LOW_STOCK_PROMPT_COOLDOWN_MS = 12 * 60 * 60_000;

const getEffectiveLowStockThreshold = (lowStockThreshold?: number | null, doseQuantity?: number | null) => lowStockThreshold ?? Math.max((doseQuantity || 1) * 3, 1);

export const caregiverLowStockPromptService = {
  async sendLowStockPrompt(caregiverId: string, patientId: string, medicineId: string) {
    await ensureLinkedPatient(caregiverId, patientId);

    const [caregiver, medicine] = await Promise.all([
      prisma.user.findUnique({ where: { id: caregiverId }, select: { id: true, fullName: true } }),
      prisma.medicine.findFirst({
        where: { id: medicineId, patientId, isActive: true },
        select: { id: true, name: true, dose: true, doseQuantity: true, currentStock: true, stockUnit: true, lowStockThreshold: true },
      }),
    ]);

    if (!caregiver) throw new AppError("Caregiver account not found", 404);
    if (!medicine) throw new AppError("Medicine not found for this patient", 404);
    if (medicine.currentStock === null) throw new AppError("Stock monitoring is not configured for this medicine", 409);

    const lowStockThreshold = getEffectiveLowStockThreshold(medicine.lowStockThreshold, medicine.doseQuantity);
    if (medicine.currentStock > lowStockThreshold) throw new AppError("This medicine is not currently low in stock", 409);

    const now = new Date();

    const recentPrompt = await prisma.userNotification.findFirst({
      where: {
        userId: patientId,
        type: "MEDICINE_REMINDER_DUE",
        entityType: "CAREGIVER_LOW_STOCK_PROMPT",
        entityId: medicine.id,
        createdAt: { gte: new Date(now.getTime() - LOW_STOCK_PROMPT_COOLDOWN_MS) },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (recentPrompt) {
      const retryAfterSeconds = Math.max(1, Math.ceil((recentPrompt.createdAt.getTime() + LOW_STOCK_PROMPT_COOLDOWN_MS - now.getTime()) / 1000));
      throw new AppError(`A low-stock reminder was recently sent for this medicine. Try again in ${retryAfterSeconds} seconds.`, 429);
    }

    const senderName = caregiver.fullName.trim() || "Your caregiver";

    const notification = await notificationService.createAndSend({
      userId: patientId,
      type: "MEDICINE_REMINDER_DUE",
      title: `Stock reminder from ${senderName}`,
      body: `${senderName} sent you a reminder that your ${medicine.name} stock is running low.`,
      priority: "HIGH",
      entityType: "CAREGIVER_LOW_STOCK_PROMPT",
      entityId: medicine.id,
      targetScreen: "PatientMedicines",
      patientPreferenceKey: "medicineReminders",
      data: {
        source: "CAREGIVER_LOW_STOCK_PROMPT",
        recipientRole: "PATIENT",
        senderRole: "CAREGIVER",
        senderId: caregiver.id,
        senderName,
        caregiverId: caregiver.id,
        caregiverName: senderName,
        patientId,
        medicineId: medicine.id,
        medicineName: medicine.name,
        medicineDose: medicine.dose,
        currentStock: medicine.currentStock,
        stockUnit: medicine.stockUnit,
        lowStockThreshold,
      },
    });

    return {
      sent: true,
      medicine: { id: medicine.id, name: medicine.name, dose: medicine.dose, currentStock: medicine.currentStock, stockUnit: medicine.stockUnit, lowStockThreshold: medicine.lowStockThreshold },
      notification: { id: notification.id, createdAt: notification.createdAt },
      cooldownSeconds: LOW_STOCK_PROMPT_COOLDOWN_MS / 1000,
    };
  },
};