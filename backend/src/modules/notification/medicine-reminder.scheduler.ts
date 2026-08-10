import { prisma } from "../../config/prisma.js";
import { notificationService } from "./notification.service.js";

type ReminderNotificationType = "MEDICINE_REMINDER_DUE" | "MEDICINE_REMINDER_SNOOZED" | "MISSED_DOSE_ALERT" | "REPEATED_MISSED_DOSE";
type ReminderNotificationPreferenceKey = "medicineReminders" | "missedDoseAlerts";

type UniqueNotificationInput = {
  userId: string;
  type: ReminderNotificationType;
  title: string;
  body: string;
  priority: "NORMAL" | "HIGH" | "CRITICAL";
  entityType: string;
  entityId: string;
  patientPreferenceKey: ReminderNotificationPreferenceKey;
  data: Record<string, unknown>;
};

const SCHEDULER_INTERVAL_MS = 30_000;
const DUE_NOTIFICATION_LOOKBACK_MS = 10 * 60_000;
const MISSED_DOSE_GRACE_MS = 30 * 60_000;
const DOSE_LOG_LOOKBACK_MS = 48 * 60 * 60_000;
const REPEATED_MISSED_LOOKBACK_MS = 24 * 60 * 60_000;
const MAX_REPEATED_MISSED_ALERTS = 3;
const MAX_BATCH_SIZE = 1000;

let schedulerTimer: NodeJS.Timeout | null = null;
let schedulerRunning = false;

const getStartOfDay = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getEndOfDay = (date: Date) => {
  const end = getStartOfDay(date);
  end.setDate(end.getDate() + 1);
  return end;
};

const getScheduledDateTime = (date: Date, timeOfDay: string) => {
  const [hourText, minuteText] = timeOfDay.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const scheduledFor = new Date(date);
  scheduledFor.setHours(hour, minute, 0, 0);
  return scheduledFor;
};

const isReminderActiveOnDate = (reminder: { startDate: Date; endDate: Date | null }, date: Date) => {
  const targetDate = getStartOfDay(date);
  const startDate = getStartOfDay(reminder.startDate);
  const endDate = reminder.endDate ? getStartOfDay(reminder.endDate) : null;

  if (startDate > targetDate) return false;
  if (endDate && endDate < targetDate) return false;
  return true;
};

const isEligiblePatient = (patient: any) => {
  return patient?.role === "PATIENT" && patient.isEmailVerified === true && (patient.accountStatus === "ACTIVE" || patient.accountStatus === "APPROVED");
};

const getReminderPreferences = async (patientId: string, cache: Map<string, any>) => {
  const cached = cache.get(patientId);
  if (cached) return cached;

  const preferences = await prisma.patientReminderPreference.upsert({
    where: { patientId },
    create: { patientId },
    update: {},
  });

  cache.set(patientId, preferences);
  return preferences;
};

const sendUniqueNotification = async (input: UniqueNotificationInput) => {
  try {
    const existingNotification = await prisma.userNotification.findFirst({
      where: { userId: input.userId, type: input.type, entityType: input.entityType, entityId: input.entityId },
      select: { id: true },
    });

    if (existingNotification) return existingNotification;

    return notificationService.createAndSend({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      priority: input.priority,
      entityType: input.entityType,
      entityId: input.entityId,
      targetScreen: "PatientMedicines",
      patientPreferenceKey: input.patientPreferenceKey,
      data: input.data,
    });
  } catch (error) {
    console.warn(`Unable to process ${input.type} notification for ${input.entityId}:`, error instanceof Error ? error.message : error);
    return null;
  }
};

const getDoseLogInclude = {
  reminder: {
    include: {
      medicine: {
        include: {
          patient: {
            select: { id: true, fullName: true, role: true, accountStatus: true, isEmailVerified: true },
          },
        },
      },
    },
  },
} as const;

const buildNotificationData = (doseLog: any, source: string) => ({
  doseLogId: doseLog.id,
  reminderId: doseLog.reminderId,
  medicineId: doseLog.reminder.medicine.id,
  medicineName: doseLog.reminder.medicine.name,
  medicineDose: doseLog.reminder.medicine.dose,
  patientId: doseLog.patientId,
  patientName: doseLog.reminder.medicine.patient.fullName,
  scheduledFor: doseLog.scheduledFor.toISOString(),
  snoozedUntil: doseLog.snoozedUntil?.toISOString() || null,
  doseStatus: doseLog.status,
  source,
});

const createTodayDoseLogsAndSendDueNotifications = async (now: Date) => {
  const dayStart = getStartOfDay(now);
  const dayEnd = getEndOfDay(now);

  const reminders = await prisma.medicineReminder.findMany({
    where: {
      isActive: true,
      startDate: { lt: dayEnd },
      OR: [{ endDate: null }, { endDate: { gte: dayStart } }],
    },
    include: {
      medicine: {
        include: {
          patient: {
            select: { id: true, fullName: true, role: true, accountStatus: true, isEmailVerified: true },
          },
        },
      },
    },
    take: MAX_BATCH_SIZE,
  });

  for (const reminder of reminders) {
    try {
      if (!reminder.medicine.isActive || !isEligiblePatient(reminder.medicine.patient) || !isReminderActiveOnDate(reminder, dayStart)) continue;

      const scheduledFor = getScheduledDateTime(dayStart, reminder.timeOfDay);
      if (!scheduledFor || scheduledFor > now) continue;

      const doseLog = await prisma.medicineDoseLog.upsert({
        where: { reminderId_scheduledFor: { reminderId: reminder.id, scheduledFor } },
        create: { reminderId: reminder.id, patientId: reminder.medicine.patientId, scheduledFor, status: "PENDING" },
        update: {},
        include: getDoseLogInclude,
      });

      if (doseLog.status !== "PENDING") continue;

      const elapsedMs = now.getTime() - scheduledFor.getTime();
      if (elapsedMs < 0 || elapsedMs > DUE_NOTIFICATION_LOOKBACK_MS) continue;

      await sendUniqueNotification({
        userId: doseLog.patientId,
        type: "MEDICINE_REMINDER_DUE",
        title: "Medicine reminder",
        body: `It is time to take ${doseLog.reminder.medicine.name} (${doseLog.reminder.medicine.dose}).`,
        priority: "HIGH",
        entityType: "MEDICINE_DOSE_LOG",
        entityId: doseLog.id,
        patientPreferenceKey: "medicineReminders",
        data: buildNotificationData(doseLog, "MEDICINE_REMINDER_SCHEDULER"),
      });
    } catch (error) {
      console.warn(`Unable to process medicine reminder ${reminder.id}:`, error instanceof Error ? error.message : error);
    }
  }
};

const markOverdueDoseLogsMissed = async (now: Date, preferenceCache: Map<string, any>) => {
  const doseLogs = await prisma.medicineDoseLog.findMany({
    where: {
      status: { in: ["PENDING", "SNOOZED"] },
      scheduledFor: { gte: new Date(now.getTime() - DOSE_LOG_LOOKBACK_MS), lte: now },
    },
    include: getDoseLogInclude,
    orderBy: { scheduledFor: "asc" },
    take: MAX_BATCH_SIZE,
  });

  for (const doseLog of doseLogs) {
    try {
      if (!doseLog.reminder.isActive || !doseLog.reminder.medicine.isActive || !isEligiblePatient(doseLog.reminder.medicine.patient)) continue;

      const effectiveDueAt = doseLog.status === "SNOOZED" && doseLog.snoozedUntil ? doseLog.snoozedUntil : doseLog.scheduledFor;
      const missedAt = new Date(effectiveDueAt.getTime() + MISSED_DOSE_GRACE_MS);

      if (now < missedAt) continue;

      const updateResult = await prisma.medicineDoseLog.updateMany({
        where: { id: doseLog.id, status: doseLog.status },
        data: { status: "MISSED" },
      });

      if (updateResult.count === 0) continue;

      const updatedDoseLog = { ...doseLog, status: "MISSED" };
      const reminderPreferences = await getReminderPreferences(doseLog.patientId, preferenceCache);

      if (!reminderPreferences.missedDoseReminder) continue;

      await sendUniqueNotification({
        userId: doseLog.patientId,
        type: "MISSED_DOSE_ALERT",
        title: "Missed medicine reminder",
        body: `Your scheduled reminder for ${doseLog.reminder.medicine.name} was not marked as taken.`,
        priority: "HIGH",
        entityType: "MEDICINE_DOSE_LOG",
        entityId: doseLog.id,
        patientPreferenceKey: "missedDoseAlerts",
        data: { ...buildNotificationData(updatedDoseLog, "MISSED_DOSE_SCHEDULER"), missedAt: missedAt.toISOString() },
      });
    } catch (error) {
      console.warn(`Unable to process missed dose log ${doseLog.id}:`, error instanceof Error ? error.message : error);
    }
  }
};

const sendSnoozedReminderNotifications = async (now: Date) => {
  const doseLogs = await prisma.medicineDoseLog.findMany({
    where: {
      status: "SNOOZED",
      snoozedUntil: { gte: new Date(now.getTime() - DOSE_LOG_LOOKBACK_MS), lte: now },
    },
    include: getDoseLogInclude,
    orderBy: { snoozedUntil: "asc" },
    take: MAX_BATCH_SIZE,
  });

  for (const doseLog of doseLogs) {
    try {
      if (!doseLog.snoozedUntil || !doseLog.reminder.isActive || !doseLog.reminder.medicine.isActive || !isEligiblePatient(doseLog.reminder.medicine.patient)) continue;

      await sendUniqueNotification({
        userId: doseLog.patientId,
        type: "MEDICINE_REMINDER_SNOOZED",
        title: "Snoozed medicine reminder",
        body: `Your snoozed reminder for ${doseLog.reminder.medicine.name} is due now.`,
        priority: "HIGH",
        entityType: "MEDICINE_DOSE_LOG_SNOOZE",
        entityId: `${doseLog.id}:${doseLog.snoozedUntil.toISOString()}`,
        patientPreferenceKey: "medicineReminders",
        data: buildNotificationData(doseLog, "SNOOZED_REMINDER_SCHEDULER"),
      });
    } catch (error) {
      console.warn(`Unable to process snoozed dose log ${doseLog.id}:`, error instanceof Error ? error.message : error);
    }
  }
};

const sendRepeatedMissedDoseNotifications = async (now: Date, preferenceCache: Map<string, any>) => {
  const doseLogs = await prisma.medicineDoseLog.findMany({
    where: {
      status: "MISSED",
      scheduledFor: { gte: new Date(now.getTime() - REPEATED_MISSED_LOOKBACK_MS), lte: now },
    },
    include: getDoseLogInclude,
    orderBy: { scheduledFor: "asc" },
    take: MAX_BATCH_SIZE,
  });

  for (const doseLog of doseLogs) {
    try {
      if (!doseLog.reminder.isActive || !doseLog.reminder.medicine.isActive || !isEligiblePatient(doseLog.reminder.medicine.patient)) continue;

      const reminderPreferences = await getReminderPreferences(doseLog.patientId, preferenceCache);

      if (!reminderPreferences.missedDoseReminder || !reminderPreferences.repeatMissedDoseAlert) continue;

      const repeatIntervalMinutes = Math.min(Math.max(reminderPreferences.repeatIntervalMinutes || 30, 5), 1440);
      const effectiveDueAt = doseLog.snoozedUntil || doseLog.scheduledFor;
      const missedAt = new Date(effectiveDueAt.getTime() + MISSED_DOSE_GRACE_MS);
      const elapsedAfterMissedMs = now.getTime() - missedAt.getTime();
      const repeatNumber = Math.min(Math.floor(elapsedAfterMissedMs / (repeatIntervalMinutes * 60_000)), MAX_REPEATED_MISSED_ALERTS);

      if (repeatNumber < 1) continue;

      await sendUniqueNotification({
        userId: doseLog.patientId,
        type: "REPEATED_MISSED_DOSE",
        title: "Medicine reminder still pending",
        body: `${doseLog.reminder.medicine.name} is still recorded as a missed dose.`,
        priority: "HIGH",
        entityType: "MEDICINE_DOSE_LOG_REPEAT",
        entityId: `${doseLog.id}:repeat:${repeatNumber}`,
        patientPreferenceKey: "missedDoseAlerts",
        data: {
          ...buildNotificationData(doseLog, "REPEATED_MISSED_DOSE_SCHEDULER"),
          missedAt: missedAt.toISOString(),
          repeatNumber,
          repeatIntervalMinutes,
        },
      });
    } catch (error) {
      console.warn(`Unable to process repeated missed dose log ${doseLog.id}:`, error instanceof Error ? error.message : error);
    }
  }
};

export const runMedicineReminderSchedulerNow = async () => {
  if (schedulerRunning) return;

  schedulerRunning = true;
  const now = new Date();
  const preferenceCache = new Map<string, any>();

  try {
    await createTodayDoseLogsAndSendDueNotifications(now);
    await markOverdueDoseLogsMissed(now, preferenceCache);
    await sendSnoozedReminderNotifications(now);
    await sendRepeatedMissedDoseNotifications(now, preferenceCache);
  } catch (error) {
    console.error("Medicine reminder scheduler run failed:", error instanceof Error ? error.message : error);
  } finally {
    schedulerRunning = false;
  }
};

export const startMedicineReminderScheduler = () => {
  if (schedulerTimer) return;

  console.log("Medicine reminder scheduler started.");
  void runMedicineReminderSchedulerNow();

  schedulerTimer = setInterval(() => void runMedicineReminderSchedulerNow(), SCHEDULER_INTERVAL_MS);
  schedulerTimer.unref();
};

export const stopMedicineReminderScheduler = () => {
  if (!schedulerTimer) return;

  clearInterval(schedulerTimer);
  schedulerTimer = null;
  console.log("Medicine reminder scheduler stopped.");
};