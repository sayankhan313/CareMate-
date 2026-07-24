import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

import type {
  CreateMedicineInput,
  SnoozeMedicineInput,
  UpdateMedicineInput,
} from "./medicine.types.js";

type ReviewStatus =
  | "PENDING"
  | "NOT_REQUESTED";

const reminderRelations = {
  reviewDoctor: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  reviewedByDoctor: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const;

const parseDate = (dateText: string) => {
  const parts = dateText.split("/");

  if (parts.length !== 3) {
    throw new AppError(
      "Date must be in DD/MM/YYYY format",
      400
    );
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  const parsedDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  const isInvalidDate =
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day;

  if (isInvalidDate) {
    throw new AppError(
      "Please enter a valid date",
      400
    );
  }

  return parsedDate;
};

const parseDateTime = (
  dateTimeText: string
) => {
  const parsedDate = new Date(dateTimeText);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError(
      "Please enter a valid date/time",
      400
    );
  }

  return parsedDate;
};

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

const addDays = (
  date: Date,
  days: number
) => {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
};

const getUpcomingRange = () => {
  const start = getStartOfDay(new Date());
  const end = addDays(start, 7);

  return {
    start,
    end,
  };
};

const getScheduledDateTimeForDate = (
  date: Date,
  timeOfDay: string
) => {
  const [hourText, minuteText] =
    timeOfDay.split(":");

  const scheduledFor = new Date(date);

  scheduledFor.setHours(
    Number(hourText),
    Number(minuteText),
    0,
    0
  );

  return scheduledFor;
};

const getDateKey = (date: Date) => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const isSameScheduledDateTime = (
  firstDate: Date,
  secondDate: Date
) => {
  return (
    firstDate.getTime() ===
    secondDate.getTime()
  );
};

const isReminderActiveOnDate = (
  reminder: any,
  date: Date
) => {
  const reminderStartDate =
    getStartOfDay(reminder.startDate);

  const reminderEndDate =
    reminder.endDate
      ? getStartOfDay(reminder.endDate)
      : null;

  const targetDate = getStartOfDay(date);

  if (reminderStartDate > targetDate) {
    return false;
  }

  if (
    reminderEndDate &&
    reminderEndDate < targetDate
  ) {
    return false;
  }

  return true;
};

const getPeriodFromTime = (
  timeOfDay: string
) => {
  const hour = Number(
    timeOfDay.split(":")[0]
  );

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
  return sendToDoctorForReview
    ? "PENDING"
    : "NOT_REQUESTED";
};

const getPrimaryReviewDoctor = async (
  patientId: string
) => {
  const assignment =
    await prisma.patientDoctorAssignment.findFirst({
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
      select: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

  if (!assignment) {
    throw new AppError(
      "Please assign an active primary doctor before requesting a medicine review.",
      400
    );
  }

  return assignment.doctor;
};

const getReviewRequestData = async (
  patientId: string,
  sendToDoctorForReview: boolean
) => {
  if (!sendToDoctorForReview) {
    return {
      sendToDoctorForReview: false,
      reviewStatus: "NOT_REQUESTED" as const,
      reviewDoctorId: null,
      reviewedByDoctorId: null,
      reviewedAt: null,
      reviewNote: null,
    };
  }

  const doctor =
    await getPrimaryReviewDoctor(patientId);

  return {
    sendToDoctorForReview: true,
    reviewStatus: "PENDING" as const,
    reviewDoctorId: doctor.id,
    reviewedByDoctorId: null,
    reviewedAt: null,
    reviewNote: null,
  };
};

const formatReminder = (
  reminder: any
) => {
  return {
    id: reminder.id,
    frequency: reminder.frequency,
    customFrequency:
      reminder.customFrequency,
    timeOfDay: reminder.timeOfDay,
    startDate: reminder.startDate,
    endDate: reminder.endDate,
    sendToDoctorForReview:
      reminder.sendToDoctorForReview,
    reviewStatus:
      reminder.reviewStatus,
    reviewDoctorId:
      reminder.reviewDoctorId,
    reviewedByDoctorId:
      reminder.reviewedByDoctorId,
    reviewedAt: reminder.reviewedAt,
    reviewNote: reminder.reviewNote,
    reviewDoctor:
      reminder.reviewDoctor || null,
    reviewedByDoctor:
      reminder.reviewedByDoctor || null,
    isActive: reminder.isActive,
  };
};

const formatMedicine = (
  medicine: any
) => {
  return {
    id: medicine.id,
    name: medicine.name,
    dose: medicine.dose,
    instructions:
      medicine.instructions,
    source: medicine.source,
    isActive: medicine.isActive,
    createdAt: medicine.createdAt,
    updatedAt: medicine.updatedAt,
    reminders:
      medicine.reminders.map(
        formatReminder
      ),
  };
};

const buildSummary = (items: any[]) => {
  const takenCount = items.filter(
    (item) => item.status === "TAKEN"
  ).length;

  const pendingCount = items.filter(
    (item) => item.status === "PENDING"
  ).length;

  const missedCount = items.filter(
    (item) => item.status === "MISSED"
  ).length;

  const snoozedCount = items.filter(
    (item) => item.status === "SNOOZED"
  ).length;

  const totalCount = items.length;

  const progressPercentage =
    totalCount === 0
      ? 0
      : Math.round(
          (takenCount / totalCount) * 100
        );

  return {
    totalCount,
    takenCount,
    pendingCount,
    missedCount,
    snoozedCount,
    progressPercentage,
  };
};

const getReminderForPatient = async (
  reminderId: string,
  patientId: string
) => {
  const reminder =
    await prisma.medicineReminder.findFirst({
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
    throw new AppError(
      "Medicine reminder not found",
      404
    );
  }

  return reminder;
};

export const medicineService = {
  async createMedicine(
    patientId: string,
    data: CreateMedicineInput
  ) {
    const startDate =
      parseDate(data.startDate);

    const endDate = data.endDate
      ? parseDate(data.endDate)
      : null;

    if (
      endDate &&
      endDate < startDate
    ) {
      throw new AppError(
        "End date cannot be before start date",
        400
      );
    }

    const reviewData =
      await getReviewRequestData(
        patientId,
        data.sendToDoctorForReview ||
          false
      );

    const medicine =
      await prisma.medicine.create({
        data: {
          patientId,
          name: data.name.trim(),
          dose: data.dose.trim(),
          instructions:
            data.instructions?.trim() ||
            null,
          source:
            data.source || "MANUAL",
          reminders: {
            create: {
              frequency: data.frequency,
              customFrequency:
                data.customFrequency?.trim() ||
                null,
              timeOfDay: data.timeOfDay,
              startDate,
              endDate,
              ...reviewData,
            },
          },
        },
        include: {
          reminders: {
            include: reminderRelations,
            orderBy: {
              timeOfDay: "asc",
            },
          },
        },
      });

    return formatMedicine(medicine);
  },

  async listMedicines(
    patientId: string
  ) {
    const medicines =
      await prisma.medicine.findMany({
        where: {
          patientId,
          isActive: true,
        },
        include: {
          reminders: {
            where: {
              isActive: true,
            },
            include: reminderRelations,
            orderBy: {
              timeOfDay: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return medicines.map(
      formatMedicine
    );
  },

  async getTodayMedicines(
    patientId: string
  ) {
    const { start, end } =
      getUpcomingRange();

    const now = new Date();

    const medicines =
      await prisma.medicine.findMany({
        where: {
          patientId,
          isActive: true,
        },
        include: {
          reminders: {
            where: {
              isActive: true,
              startDate: {
                lt: end,
              },
              OR: [
                {
                  endDate: null,
                },
                {
                  endDate: {
                    gte: start,
                  },
                },
              ],
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

    const upcomingItems =
      medicines.flatMap((medicine) => {
        return medicine.reminders.flatMap(
          (reminder) => {
            const items = [];

            for (
              let dayOffset = 0;
              dayOffset < 7;
              dayOffset += 1
            ) {
              const targetDate = addDays(
                start,
                dayOffset
              );

              if (
                !isReminderActiveOnDate(
                  reminder,
                  targetDate
                )
              ) {
                continue;
              }

              const scheduledFor =
                getScheduledDateTimeForDate(
                  targetDate,
                  reminder.timeOfDay
                );

              const doseLog =
                reminder.doseLogs.find(
                  (log) => {
                    return isSameScheduledDateTime(
                      log.scheduledFor,
                      scheduledFor
                    );
                  }
                );

              const status =
                doseLog?.status ||
                (scheduledFor < now
                  ? "MISSED"
                  : "PENDING");

              items.push({
                medicineId: medicine.id,
                reminderId: reminder.id,
                name: medicine.name,
                dose: medicine.dose,
                instructions:
                  medicine.instructions,
                source: medicine.source,
                frequency:
                  reminder.frequency,
                customFrequency:
                  reminder.customFrequency,
                timeOfDay:
                  reminder.timeOfDay,
                period:
                  getPeriodFromTime(
                    reminder.timeOfDay
                  ),
                scheduledFor,
                scheduledDate:
                  getDateKey(
                    scheduledFor
                  ),
                startDate:
                  reminder.startDate,
                endDate:
                  reminder.endDate,
                status,
                takenAt:
                  doseLog?.takenAt ||
                  null,
                snoozedUntil:
                  doseLog?.snoozedUntil ||
                  null,
              });
            }

            return items;
          }
        );
      });

    return {
      summary:
        buildSummary(upcomingItems),
      medicines: upcomingItems,
    };
  },

  async getMedicineById(
    patientId: string,
    medicineId: string
  ) {
    const medicine =
      await prisma.medicine.findFirst({
        where: {
          id: medicineId,
          patientId,
        },
        include: {
          reminders: {
            include: reminderRelations,
            orderBy: {
              timeOfDay: "asc",
            },
          },
        },
      });

    if (!medicine) {
      throw new AppError(
        "Medicine not found",
        404
      );
    }

    return formatMedicine(medicine);
  },

  async updateMedicine(
    patientId: string,
    medicineId: string,
    data: UpdateMedicineInput
  ) {
    const medicine =
      await prisma.medicine.findFirst({
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
      throw new AppError(
        "Medicine not found",
        404
      );
    }

    const reminder =
      medicine.reminders[0] || null;

    const medicineUpdateData = {
      ...(data.name !== undefined
        ? {
            name: data.name.trim(),
          }
        : {}),
      ...(data.dose !== undefined
        ? {
            dose: data.dose.trim(),
          }
        : {}),
      ...(data.instructions !== undefined
        ? {
            instructions:
              data.instructions.trim() ||
              null,
          }
        : {}),
      ...(data.isActive !== undefined
        ? {
            isActive: data.isActive,
          }
        : {}),
    };

    const clinicalFieldsChanged =
      data.name !== undefined ||
      data.dose !== undefined ||
      data.instructions !== undefined ||
      data.frequency !== undefined ||
      data.customFrequency !== undefined ||
      data.timeOfDay !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined;

    const reminderFieldsChanged =
      data.frequency !== undefined ||
      data.customFrequency !== undefined ||
      data.timeOfDay !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.sendToDoctorForReview !==
        undefined;

    const nextSendToDoctorForReview =
      data.sendToDoctorForReview ??
      reminder?.sendToDoctorForReview ??
      false;

    const shouldResetReview =
      nextSendToDoctorForReview &&
      (data.sendToDoctorForReview ===
        true ||
        clinicalFieldsChanged ||
        !reminder ||
        !reminder.reviewDoctorId);

    const shouldUpdateReminder =
      reminderFieldsChanged ||
      shouldResetReview;

    let reviewUpdateData: any = {};

    if (!nextSendToDoctorForReview) {
      if (
        data.sendToDoctorForReview !==
          undefined ||
        reminder?.sendToDoctorForReview
      ) {
        reviewUpdateData =
          await getReviewRequestData(
            patientId,
            false
          );
      }
    } else if (shouldResetReview) {
      reviewUpdateData =
        await getReviewRequestData(
          patientId,
          true
        );
    }

    const parsedStartDate =
      data.startDate !== undefined
        ? parseDate(data.startDate)
        : undefined;

    const parsedEndDate =
      data.endDate !== undefined
        ? data.endDate
          ? parseDate(data.endDate)
          : null
        : undefined;

    const effectiveStartDate =
      parsedStartDate ||
      reminder?.startDate ||
      null;

    const effectiveEndDate =
      parsedEndDate !== undefined
        ? parsedEndDate
        : reminder?.endDate || null;

    if (
      effectiveStartDate &&
      effectiveEndDate &&
      effectiveEndDate <
        effectiveStartDate
    ) {
      throw new AppError(
        "End date cannot be before start date",
        400
      );
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.medicine.update({
          where: {
            id: medicineId,
          },
          data: medicineUpdateData,
        });

        if (!shouldUpdateReminder) {
          return;
        }

        const reminderData = {
          ...(data.frequency !== undefined
            ? {
                frequency:
                  data.frequency,
              }
            : {}),
          ...(data.customFrequency !==
          undefined
            ? {
                customFrequency:
                  data.customFrequency.trim() ||
                  null,
              }
            : {}),
          ...(data.timeOfDay !== undefined
            ? {
                timeOfDay:
                  data.timeOfDay,
              }
            : {}),
          ...(parsedStartDate !== undefined
            ? {
                startDate:
                  parsedStartDate,
              }
            : {}),
          ...(parsedEndDate !== undefined
            ? {
                endDate:
                  parsedEndDate,
              }
            : {}),
          ...reviewUpdateData,
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

        const fallbackReviewData =
          Object.keys(
            reviewUpdateData
          ).length > 0
            ? reviewUpdateData
            : await getReviewRequestData(
                patientId,
                nextSendToDoctorForReview
              );

        await tx.medicineReminder.create({
          data: {
            medicineId,
            frequency:
              data.frequency ||
              "ONCE_DAILY",
            customFrequency:
              data.customFrequency?.trim() ||
              null,
            timeOfDay:
              data.timeOfDay ||
              "08:00",
            startDate: data.startDate
              ? parseDate(
                  data.startDate
                )
              : new Date(),
            endDate: data.endDate
              ? parseDate(data.endDate)
              : null,
            ...fallbackReviewData,
          },
        });
      }
    );

    return medicineService.getMedicineById(
      patientId,
      medicineId
    );
  },

  async deleteMedicine(
    patientId: string,
    medicineId: string
  ) {
    const medicine =
      await prisma.medicine.findFirst({
        where: {
          id: medicineId,
          patientId,
        },
      });

    if (!medicine) {
      throw new AppError(
        "Medicine not found",
        404
      );
    }

    await prisma.$transaction(
      async (tx) => {
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
      }
    );

    return {
      message:
        "Medicine removed successfully",
    };
  },

  async markReminderTaken(
    patientId: string,
    reminderId: string
  ) {
    const reminder =
      await getReminderForPatient(
        reminderId,
        patientId
      );

    const today =
      getStartOfDay(new Date());

    if (
      !isReminderActiveOnDate(
        reminder,
        today
      )
    ) {
      throw new AppError(
        "This reminder is not scheduled for today",
        400
      );
    }

    const scheduledFor =
      getScheduledDateTimeForDate(
        today,
        reminder.timeOfDay
      );

    const doseLog =
      await prisma.medicineDoseLog.upsert({
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
      message:
        "Medicine marked as taken",
      doseLog,
    };
  },

  async snoozeReminder(
    patientId: string,
    reminderId: string,
    data: SnoozeMedicineInput
  ) {
    const reminder =
      await getReminderForPatient(
        reminderId,
        patientId
      );

    const today =
      getStartOfDay(new Date());

    if (
      !isReminderActiveOnDate(
        reminder,
        today
      )
    ) {
      throw new AppError(
        "This reminder is not scheduled for today",
        400
      );
    }

    const scheduledFor =
      getScheduledDateTimeForDate(
        today,
        reminder.timeOfDay
      );

    const snoozedUntil =
      parseDateTime(
        data.snoozedUntil
      );

    const doseLog =
      await prisma.medicineDoseLog.upsert({
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
      message:
        "Medicine reminder snoozed",
      doseLog,
    };
  },
};