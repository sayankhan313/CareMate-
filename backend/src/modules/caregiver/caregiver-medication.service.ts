import { prisma } from "../../config/prisma.js";
import { ensureLinkedPatient } from "./caregiver-patients.service.js";

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const scheduledDateTime = (date: Date, timeOfDay: string) => {
  const value = startOfDay(date);
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  value.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return value;
};

const isActiveOnDate = (startDate: Date, endDate: Date | null, date: Date) => startDate <= endOfDay(date) && (!endDate || endDate >= startOfDay(date));

const getEffectiveLowStockThreshold = (lowStockThreshold?: number | null, doseQuantity?: number | null) =>
  lowStockThreshold ?? Math.max((doseQuantity || 1) * 3, 1);

const getNextDose = (frequency: string, timeOfDay: string, startDate: Date, endDate: Date | null, now: Date) => {
  if (frequency === "AS_NEEDED") return null;

  let targetDay = startOfDay(now);
  if (startDate > endOfDay(now)) targetDay = startOfDay(startDate);

  let scheduled = scheduledDateTime(targetDay, timeOfDay);
  if (scheduled <= now && startOfDay(targetDay).getTime() === startOfDay(now).getTime()) {
    targetDay.setDate(targetDay.getDate() + 1);
    scheduled = scheduledDateTime(targetDay, timeOfDay);
  }

  if (scheduled < startDate) scheduled = scheduledDateTime(startDate, timeOfDay);
  if (endDate && scheduled > endOfDay(endDate)) return null;
  return scheduled;
};

export const caregiverMedicationService = {
  async getPatientMedicationSchedule(caregiverId: string, patientId: string) {
    await ensureLinkedPatient(caregiverId, patientId);

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const medicines = await prisma.medicine.findMany({
      where: { patientId, isActive: true },
      select: {
        id: true,
        name: true,
        dose: true,
        doseQuantity: true,
        doseUnit: true,
        instructions: true,
        currentStock: true,
        stockUnit: true,
        lowStockThreshold: true,
        reminders: {
          where: { isActive: true },
          orderBy: { timeOfDay: "asc" },
          select: {
            id: true,
            frequency: true,
            customFrequency: true,
            timeOfDay: true,
            startDate: true,
            endDate: true,
            doseLogs: {
              where: { patientId, scheduledFor: { gte: todayStart, lte: todayEnd } },
              orderBy: { scheduledFor: "desc" },
              take: 1,
              select: { id: true, status: true, scheduledFor: true, takenAt: true, snoozedUntil: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = medicines.map(medicine => {
      const reminders = medicine.reminders.map(reminder => {
        const scheduledToday = isActiveOnDate(reminder.startDate, reminder.endDate, now) ? scheduledDateTime(now, reminder.timeOfDay) : null;
        const log = reminder.doseLogs[0] || null;
        const todayStatus = !scheduledToday ? null : log?.status || (scheduledToday < now ? "MISSED" : "PENDING");

        return {
          id: reminder.id,
          frequency: reminder.frequency,
          customFrequency: reminder.customFrequency,
          timeOfDay: reminder.timeOfDay,
          startDate: reminder.startDate,
          endDate: reminder.endDate,
          scheduledToday,
          todayStatus,
          doseLogId: log?.id || null,
          takenAt: log?.takenAt || null,
          snoozedUntil: log?.snoozedUntil || null,
          nextDose: getNextDose(reminder.frequency, reminder.timeOfDay, reminder.startDate, reminder.endDate, now),
        };
      });

      const lowStockThreshold = getEffectiveLowStockThreshold(medicine.lowStockThreshold, medicine.doseQuantity);
      const lowStock = medicine.currentStock !== null && medicine.currentStock <= lowStockThreshold;

      return {
        id: medicine.id,
        name: medicine.name,
        dose: medicine.dose,
        doseQuantity: medicine.doseQuantity,
        doseUnit: medicine.doseUnit,
        instructions: medicine.instructions,
        stock: { currentStock: medicine.currentStock, stockUnit: medicine.stockUnit, lowStockThreshold, lowStock },
        reminders,
      };
    });

    const statuses = items.flatMap(item => item.reminders.map(reminder => reminder.todayStatus).filter(Boolean));

    return {
      summary: {
        activeMedicines: items.length,
        scheduledToday: statuses.length,
        taken: statuses.filter(status => status === "TAKEN").length,
        missed: statuses.filter(status => status === "MISSED").length,
        pending: statuses.filter(status => status === "PENDING").length,
        snoozed: statuses.filter(status => status === "SNOOZED").length,
        lowStockMedicines: items.filter(item => item.stock.lowStock).length,
      },
      medicines: items,
    };
  },
};