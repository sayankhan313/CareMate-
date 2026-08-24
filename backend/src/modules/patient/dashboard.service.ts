import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

const getStartOfDay = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const getScheduledDateTimeForDate = (date: Date, timeOfDay: string) => {
  const [hourText, minuteText] = timeOfDay.split(":");
  const scheduledFor = new Date(date);
  scheduledFor.setHours(Number(hourText), Number(minuteText), 0, 0);
  return scheduledFor;
};

const isReminderActiveOnDate = (reminder: any, date: Date) => {
  const reminderStartDate = getStartOfDay(reminder.startDate);
  const reminderEndDate = reminder.endDate ? getStartOfDay(reminder.endDate) : null;
  const targetDate = getStartOfDay(date);
  if (reminderStartDate > targetDate) return false;
  if (reminderEndDate && reminderEndDate < targetDate) return false;
  return true;
};

const getFirstName = (fullName: string) => fullName.trim().split(" ")[0] || fullName;

const getStatusLabel = (status?: string | null) => {
  if (status === "STABLE") return "Stable";
  if (status === "WARNING") return "Warning";
  if (status === "CRITICAL") return "Critical";
  return "No Data";
};

const hasBloodPressure = (reading: any) => reading?.bpSystolic !== null && reading?.bpDiastolic !== null;

const formatHealthStatus = (reading: any) => {
  if (!reading) {
    return {
      status: "NO_DATA",
      label: "No Data",
      heartRate: null,
      spo2: null,
      bloodPressure: null,
      bpSystolic: null,
      bpDiastolic: null,
      glucose: null,
      temperature: null,
      source: null,
      deviceSource: null,
      recordedAt: null,
    };
  }

  return {
    status: reading.status,
    label: getStatusLabel(reading.status),
    heartRate: reading.heartRate,
    spo2: reading.spo2,
    bloodPressure: hasBloodPressure(reading) ? `${reading.bpSystolic}/${reading.bpDiastolic}` : null,
    bpSystolic: reading.bpSystolic,
    bpDiastolic: reading.bpDiastolic,
    glucose: reading.glucose,
    temperature: reading.temperature,
    source: reading.source,
    deviceSource: reading.deviceSource,
    recordedAt: reading.recordedAt,
  };
};

const getNextMedicineGroup = async (patientId: string) => {
  const todayStart = getStartOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const now = new Date();

  const medicines = await prisma.medicine.findMany({
    where: { patientId, isActive: true },
    include: {
      reminders: {
        where: {
          isActive: true,
          startDate: { lt: tomorrowStart },
          OR: [{ endDate: null }, { endDate: { gte: todayStart } }],
        },
        include: {
          doseLogs: {
            where: {
              patientId,
              scheduledFor: { gte: todayStart, lt: tomorrowStart },
            },
          },
        },
        orderBy: { timeOfDay: "asc" },
      },
    },
  });

  const upcomingItems = medicines.flatMap(medicine =>
    medicine.reminders.flatMap(reminder => {
      if (!isReminderActiveOnDate(reminder, todayStart)) return [];

      const scheduledFor = getScheduledDateTimeForDate(todayStart, reminder.timeOfDay);
      const doseLog = reminder.doseLogs.find(log => log.scheduledFor.getTime() === scheduledFor.getTime());

      if (doseLog?.status === "TAKEN") return [];

      const effectiveScheduledFor =
        doseLog?.status === "SNOOZED" && doseLog.snoozedUntil
          ? doseLog.snoozedUntil
          : scheduledFor;

      if (effectiveScheduledFor < now) return [];

      return [{
        medicineId: medicine.id,
        reminderId: reminder.id,
        name: medicine.name,
        dose: medicine.dose,
        instructions: medicine.instructions,
        timeOfDay: reminder.timeOfDay,
        scheduledFor: effectiveScheduledFor,
        originalScheduledFor: scheduledFor,
        status: doseLog?.status || "PENDING",
        takenAt: doseLog?.takenAt || null,
        snoozedUntil: doseLog?.snoozedUntil || null,
      }];
    })
  );

  const sortedUpcomingItems = upcomingItems.sort((first, second) => first.scheduledFor.getTime() - second.scheduledFor.getTime());
  const firstUpcomingItem = sortedUpcomingItems[0];
  if (!firstUpcomingItem) return null;

  const nextScheduledTime = firstUpcomingItem.scheduledFor.getTime();
  const medicinesAtNextTime = sortedUpcomingItems.filter(item => item.scheduledFor.getTime() === nextScheduledTime);

  return {
    timeOfDay: firstUpcomingItem.timeOfDay,
    scheduledFor: firstUpcomingItem.scheduledFor,
    count: medicinesAtNextTime.length,
    medicines: medicinesAtNextTime.map(item => ({
      medicineId: item.medicineId,
      reminderId: item.reminderId,
      name: item.name,
      dose: item.dose,
      instructions: item.instructions,
      timeOfDay: item.timeOfDay,
      scheduledFor: item.scheduledFor,
      originalScheduledFor: item.originalScheduledFor,
      status: item.status,
      takenAt: item.takenAt,
      snoozedUntil: item.snoozedUntil,
    })),
  };
};

const getOrderSteps = (status: string) => ({
  received: ["RECEIVED", "PREPARING", "READY", "DELIVERED"].includes(status),
  preparing: ["PREPARING", "READY", "DELIVERED"].includes(status),
  ready: ["READY", "DELIVERED"].includes(status),
});

export const dashboardService = {
  async getDashboard(patientId: string) {
    const user = await prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, fullName: true, email: true },
    });

    if (!user) throw new AppError("Patient not found", 404);

    const [latestVitalReading, nextMedicineGroup, latestDoctorNote, latestOrder] = await Promise.all([
      prisma.patientVitalReading.findFirst({
        where: { patientId },
        orderBy: { recordedAt: "desc" },
      }),
      getNextMedicineGroup(patientId),
      prisma.patientDoctorNote.findFirst({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.medicineOrder.findFirst({
        where: { patientId },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return {
      patient: {
        id: user.id,
        fullName: user.fullName,
        firstName: getFirstName(user.fullName),
        email: user.email,
      },
      healthStatus: formatHealthStatus(latestVitalReading),
      nextMedicineGroup,
      latestDoctorNote: latestDoctorNote
        ? { id: latestDoctorNote.id, note: latestDoctorNote.note, createdAt: latestDoctorNote.createdAt }
        : null,
      medicineOrder: latestOrder
        ? { id: latestOrder.id, status: latestOrder.status, steps: getOrderSteps(latestOrder.status), updatedAt: latestOrder.updatedAt }
        : null,
    };
  },
};