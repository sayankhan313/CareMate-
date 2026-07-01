import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

import type {
  CreateMedicineInput,
  SnoozeMedicineInput,
  UpdateMedicineInput,
} from "./medicine.types.js";

type ReviewStatus = "PENDING" | "NOT_REQUESTED";

const parseDate = (dateText: string) => {
  const parts = dateText.split("/");

  if (parts.length !== 3) {
    throw new AppError("Date must be in DD/MM/YYYY format", 400);
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  const isInvalidDate =
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day;

  if (isInvalidDate) {
    throw new AppError("Please enter a valid date", 400);
  }

  return parsedDate;
};

const parseDateTime = (dateTimeText: string) => {
  const parsedDate = new Date(dateTimeText);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError("Please enter a valid date/time", 400);
  }

  return parsedDate;
};

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start,
    end,
  };
};

const getScheduledDateTimeForToday = (timeOfDay: string) => {
  const [hourText, minuteText] = timeOfDay.split(":");

  const scheduledFor = new Date();
  scheduledFor.setHours(Number(hourText), Number(minuteText), 0, 0);

  return scheduledFor;
};

const getPeriodFromTime = (timeOfDay: string) => {
  const hour = Number(timeOfDay.split(":")[0]);

  if (hour < 12) {
    return "Morning";
  }

  if (hour < 17) {
    return "Afternoon";
  }

  return "Evening";
};

const getReviewStatus = (
  sendToDoctorForReview?: boolean
): ReviewStatus => {
  return sendToDoctorForReview ? "PENDING" : "NOT_REQUESTED";
};

const formatReminder = (reminder: any) => {
  return {
    id: reminder.id,
    frequency: reminder.frequency,
    customFrequency: reminder.customFrequency,
    timeOfDay: reminder.timeOfDay,
    startDate: reminder.startDate,
    endDate: reminder.endDate,
    sendToDoctorForReview: reminder.sendToDoctorForReview,
    reviewStatus: reminder.reviewStatus,
    isActive: reminder.isActive,
  };
};

const formatMedicine = (medicine: any) => {
  return {
    id: medicine.id,
    name: medicine.name,
    dose: medicine.dose,
    instructions: medicine.instructions,
    source: medicine.source,
    isActive: medicine.isActive,
    createdAt: medicine.createdAt,
    updatedAt: medicine.updatedAt,
    reminders: medicine.reminders.map(formatReminder),
  };
};

const getReminderForPatient = async (reminderId: string, patientId: string) => {
  const reminder = await prisma.medicineReminder.findFirst({
    where: {
      id: reminderId,
      isActive: true,
      medicine: {
        patientId,
        isActive: true,
      },
    },
    include: {
      medicine: true,
    },
  });

  if (!reminder) {
    throw new AppError("Medicine reminder not found", 404);
  }

  return reminder;
};

export const medicineService = {
  async createMedicine(patientId: string, data: CreateMedicineInput) {
    const startDate = parseDate(data.startDate);
    const endDate = data.endDate ? parseDate(data.endDate) : null;

    const medicine = await prisma.medicine.create({
      data: {
        patientId,
        name: data.name.trim(),
        dose: data.dose.trim(),
        instructions: data.instructions?.trim() || null,
        source: data.source || "MANUAL",
        reminders: {
          create: {
            frequency: data.frequency,
            customFrequency: data.customFrequency?.trim() || null,
            timeOfDay: data.timeOfDay,
            startDate,
            endDate,
            sendToDoctorForReview: data.sendToDoctorForReview || false,
            reviewStatus: getReviewStatus(data.sendToDoctorForReview),
          },
        },
      },
      include: {
        reminders: {
          orderBy: {
            timeOfDay: "asc",
          },
        },
      },
    });

    return formatMedicine(medicine);
  },

  async listMedicines(patientId: string) {
    const medicines = await prisma.medicine.findMany({
      where: {
        patientId,
        isActive: true,
      },
      include: {
        reminders: {
          where: {
            isActive: true,
          },
          orderBy: {
            timeOfDay: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return medicines.map(formatMedicine);
  },

  async getTodayMedicines(patientId: string) {
    const { start, end } = getTodayRange();
    const now = new Date();

    const medicines = await prisma.medicine.findMany({
      where: {
        patientId,
        isActive: true,
      },
      include: {
        reminders: {
          where: {
            isActive: true,
          },
          include: {
            doseLogs: {
              where: {
                patientId,
                scheduledFor: {
                  gte: start,
                  lt: end,
                },
              },
            },
          },
          orderBy: {
            timeOfDay: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const todayItems = medicines.flatMap((medicine) => {
      return medicine.reminders.map((reminder) => {
        const scheduledFor = getScheduledDateTimeForToday(reminder.timeOfDay);
        const doseLog = reminder.doseLogs[0];

        const status =
          doseLog?.status || (scheduledFor < now ? "MISSED" : "PENDING");

        return {
          medicineId: medicine.id,
          reminderId: reminder.id,
          name: medicine.name,
          dose: medicine.dose,
          instructions: medicine.instructions,
          source: medicine.source,
          frequency: reminder.frequency,
          customFrequency: reminder.customFrequency,
          timeOfDay: reminder.timeOfDay,
          period: getPeriodFromTime(reminder.timeOfDay),
          scheduledFor,
          status,
          takenAt: doseLog?.takenAt || null,
          snoozedUntil: doseLog?.snoozedUntil || null,
        };
      });
    });

    const takenCount = todayItems.filter((item) => item.status === "TAKEN")
      .length;

    const pendingCount = todayItems.filter((item) => item.status === "PENDING")
      .length;

    const missedCount = todayItems.filter((item) => item.status === "MISSED")
      .length;

    const snoozedCount = todayItems.filter((item) => item.status === "SNOOZED")
      .length;

    const totalCount = todayItems.length;

    const progressPercentage =
      totalCount === 0 ? 0 : Math.round((takenCount / totalCount) * 100);

    return {
      summary: {
        totalCount,
        takenCount,
        pendingCount,
        missedCount,
        snoozedCount,
        progressPercentage,
      },
      medicines: todayItems,
    };
  },

  async getMedicineById(patientId: string, medicineId: string) {
    const medicine = await prisma.medicine.findFirst({
      where: {
        id: medicineId,
        patientId,
      },
      include: {
        reminders: {
          orderBy: {
            timeOfDay: "asc",
          },
        },
      },
    });

    if (!medicine) {
      throw new AppError("Medicine not found", 404);
    }

    return formatMedicine(medicine);
  },

  async updateMedicine(
    patientId: string,
    medicineId: string,
    data: UpdateMedicineInput
  ) {
    const medicine = await prisma.medicine.findFirst({
      where: {
        id: medicineId,
        patientId,
      },
      include: {
        reminders: {
          where: {
            isActive: true,
          },
          take: 1,
        },
      },
    });

    if (!medicine) {
      throw new AppError("Medicine not found", 404);
    }

    const medicineUpdateData = {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.dose !== undefined ? { dose: data.dose.trim() } : {}),
      ...(data.instructions !== undefined
        ? { instructions: data.instructions.trim() || null }
        : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    };

    const shouldUpdateReminder =
      data.frequency !== undefined ||
      data.customFrequency !== undefined ||
      data.timeOfDay !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.sendToDoctorForReview !== undefined;

    await prisma.$transaction(async (tx) => {
      await tx.medicine.update({
        where: {
          id: medicineId,
        },
        data: medicineUpdateData,
      });

      if (!shouldUpdateReminder) {
        return;
      }

      const reminder = medicine.reminders[0];

      const reminderData = {
        ...(data.frequency !== undefined
          ? { frequency: data.frequency }
          : {}),
        ...(data.customFrequency !== undefined
          ? { customFrequency: data.customFrequency.trim() || null }
          : {}),
        ...(data.timeOfDay !== undefined ? { timeOfDay: data.timeOfDay } : {}),
        ...(data.startDate !== undefined
          ? { startDate: parseDate(data.startDate) }
          : {}),
        ...(data.endDate !== undefined
          ? { endDate: data.endDate ? parseDate(data.endDate) : null }
          : {}),
        ...(data.sendToDoctorForReview !== undefined
          ? {
              sendToDoctorForReview: data.sendToDoctorForReview,
              reviewStatus: getReviewStatus(data.sendToDoctorForReview),
            }
          : {}),
      };

      if (reminder) {
        await tx.medicineReminder.update({
          where: {
            id: reminder.id,
          },
          data: reminderData,
        });

        return;
      }

      await tx.medicineReminder.create({
        data: {
          medicineId,
          frequency: data.frequency || "ONCE_DAILY",
          customFrequency: data.customFrequency?.trim() || null,
          timeOfDay: data.timeOfDay || "08:00",
          startDate: data.startDate ? parseDate(data.startDate) : new Date(),
          endDate: data.endDate ? parseDate(data.endDate) : null,
          sendToDoctorForReview: data.sendToDoctorForReview || false,
          reviewStatus: getReviewStatus(data.sendToDoctorForReview),
        },
      });
    });

    return medicineService.getMedicineById(patientId, medicineId);
  },

  async deleteMedicine(patientId: string, medicineId: string) {
    const medicine = await prisma.medicine.findFirst({
      where: {
        id: medicineId,
        patientId,
      },
    });

    if (!medicine) {
      throw new AppError("Medicine not found", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.medicine.update({
        where: {
          id: medicineId,
        },
        data: {
          isActive: false,
        },
      });

      await tx.medicineReminder.updateMany({
        where: {
          medicineId,
        },
        data: {
          isActive: false,
        },
      });
    });

    return {
      message: "Medicine removed successfully",
    };
  },

  async markReminderTaken(patientId: string, reminderId: string) {
    const reminder = await getReminderForPatient(reminderId, patientId);

    const scheduledFor = getScheduledDateTimeForToday(reminder.timeOfDay);

    const doseLog = await prisma.medicineDoseLog.upsert({
      where: {
        reminderId_scheduledFor: {
          reminderId,
          scheduledFor,
        },
      },
      update: {
        status: "TAKEN",
        takenAt: new Date(),
        snoozedUntil: null,
      },
      create: {
        reminderId,
        patientId,
        scheduledFor,
        status: "TAKEN",
        takenAt: new Date(),
      },
    });

    return {
      message: "Medicine marked as taken",
      doseLog,
    };
  },

  async snoozeReminder(
    patientId: string,
    reminderId: string,
    data: SnoozeMedicineInput
  ) {
    const reminder = await getReminderForPatient(reminderId, patientId);

    const scheduledFor = getScheduledDateTimeForToday(reminder.timeOfDay);
    const snoozedUntil = parseDateTime(data.snoozedUntil);

    const doseLog = await prisma.medicineDoseLog.upsert({
      where: {
        reminderId_scheduledFor: {
          reminderId,
          scheduledFor,
        },
      },
      update: {
        status: "SNOOZED",
        snoozedUntil,
      },
      create: {
        reminderId,
        patientId,
        scheduledFor,
        status: "SNOOZED",
        snoozedUntil,
      },
    });

    return {
      message: "Medicine reminder snoozed",
      doseLog,
    };
  },
};