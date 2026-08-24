import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";
import type {
  CreateMedicineInput,
  RequestMedicineDeletionInput,
  ResubmitMedicineReviewInput,
  SnoozeMedicineInput,
  UpdateMedicineInput,
} from "./medicine.types.js";

type ReviewDoctor = {
  id: string;
  fullName: string;
  email: string;
};

type MedicineReviewRoutingDecision = {
  doctor: ReviewDoctor | null;
  routingStatus:
    | "ASSIGNED"
    | "ADMIN_REVIEW_REQUIRED";
  attemptedDoctorIds: string[];
  escalatedAt: Date | null;
};

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

const reviewRequestRelations = {
  doctor: {
    select: {
      id: true,
      fullName: true,
      email: true,

      doctorProfile: {
        select: {
          specialization: true,
        },
      },
    },
  },

  reviewedByDoctor: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },

  medicine: {
    include: {
      reminders: {
        orderBy: {
          timeOfDay:
            "asc" as const,
        },
      },
    },
  },
} as const;

const parseDate = (
  dateText: string,
) => {
  const parts =
    dateText.split("/");

  if (parts.length !== 3) {
    throw new AppError(
      "Date must be in DD/MM/YYYY format",
      400,
    );
  }

  const day =
    Number(parts[0]);

  const month =
    Number(parts[1]);

  const year =
    Number(parts[2]);

  const parsedDate =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  const invalidDate =
    parsedDate.getUTCFullYear() !==
      year ||
    parsedDate.getUTCMonth() !==
      month - 1 ||
    parsedDate.getUTCDate() !==
      day;

  if (invalidDate) {
    throw new AppError(
      "Please enter a valid date",
      400,
    );
  }

  return parsedDate;
};

const parseDateTime = (
  dateTimeText: string,
) => {
  const parsedDate =
    new Date(dateTimeText);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    throw new AppError(
      "Please enter a valid date/time",
      400,
    );
  }

  return parsedDate;
};

const getStartOfDay = (
  date: Date,
) => {
  const start =
    new Date(date);

  start.setHours(
    0,
    0,
    0,
    0,
  );

  return start;
};

const addDays = (
  date: Date,
  days: number,
) => {
  const nextDate =
    new Date(date);

  nextDate.setDate(
    nextDate.getDate() +
      days,
  );

  return nextDate;
};

const getUpcomingRange =
  () => {
    const start =
      getStartOfDay(
        new Date(),
      );

    return {
      start,
      end: addDays(
        start,
        7,
      ),
    };
  };

const getScheduledDateTimeForDate =
  (
    date: Date,
    timeOfDay: string,
  ) => {
    const [
      hourText,
      minuteText,
    ] =
      timeOfDay.split(":");

    const scheduledFor =
      new Date(date);

    scheduledFor.setHours(
      Number(hourText),
      Number(minuteText),
      0,
      0,
    );

    return scheduledFor;
  };

const getDateKey = (
  date: Date,
) => {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1,
    ).padStart(2, "0");

  const day =
    String(
      date.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const isSameScheduledDateTime =
  (
    firstDate: Date,
    secondDate: Date,
  ) =>
    firstDate.getTime() ===
    secondDate.getTime();

const isReminderActiveOnDate =
  (
    reminder: any,
    date: Date,
  ) => {
    const reminderStartDate =
      getStartOfDay(
        reminder.startDate,
      );

    const reminderEndDate =
      reminder.endDate
        ? getStartOfDay(
            reminder.endDate,
          )
        : null;

    const targetDate =
      getStartOfDay(date);

    if (
      reminderStartDate >
      targetDate
    ) {
      return false;
    }

    if (
      reminderEndDate &&
      reminderEndDate <
        targetDate
    ) {
      return false;
    }

    return true;
  };

const getPeriodFromTime = (
  timeOfDay: string,
) => {
  const hour =
    Number(
      timeOfDay.split(
        ":",
      )[0],
    );

  if (hour < 12) {
    return "Morning";
  }

  if (hour < 17) {
    return "Afternoon";
  }

  return "Evening";
};

const buildSummary = (
  items: any[],
) => {
  const takenCount =
    items.filter(
      item =>
        item.status ===
        "TAKEN",
    ).length;

  const pendingCount =
    items.filter(
      item =>
        item.status ===
        "PENDING",
    ).length;

  const missedCount =
    items.filter(
      item =>
        item.status ===
        "MISSED",
    ).length;

  const snoozedCount =
    items.filter(
      item =>
        item.status ===
        "SNOOZED",
    ).length;

  const totalCount =
    items.length;

  const progressPercentage =
    totalCount === 0
      ? 0
      : Math.round(
          (takenCount /
            totalCount) *
            100,
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

const getTodayAvailabilityDate =
  () => {
    const now =
      new Date();

    return new Date(
      Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ),
    );
  };

const getSelectedTimes = (
  data: CreateMedicineInput,
) => {
  const times =
    data.selectedTimes
      ?.length
      ? data.selectedTimes
      : data.timeOfDay
        ? [
            data.timeOfDay,
          ]
        : [];

  return [
    ...new Set(times),
  ].sort();
};

const getDefaultLowStockThreshold = (
  doseQuantity?: number | null,
) => Math.max((doseQuantity || 1) * 3, 1);

const getEffectiveLowStockThreshold = (
  lowStockThreshold?: number | null,
  doseQuantity?: number | null,
) => lowStockThreshold ?? getDefaultLowStockThreshold(doseQuantity);

const isLowStockLevel = (
  currentStock?: number | null,
  lowStockThreshold?: number | null,
  doseQuantity?: number | null,
) =>
  currentStock !== null &&
  currentStock !== undefined &&
  currentStock <= getEffectiveLowStockThreshold(lowStockThreshold, doseQuantity);

const notifyMedicineLowStock = async (
  patientId: string,
  medicine: {
    id: string;
    name: string;
    dose: string;
    currentStock: number;
    stockUnit: string | null;
    lowStockThreshold: number;
  },
) => {
  try {
    const [patient, relationships] = await Promise.all([
      prisma.user.findUnique({
        where: { id: patientId },
        select: { id: true, fullName: true },
      }),
      prisma.patientCaregiverRelationship.findMany({
        where: { patientId, status: "ACTIVE" },
        select: { caregiverId: true },
      }),
    ]);

    if (!patient) return;

    const isOutOfStock = medicine.currentStock === 0;
    const stockText = `${medicine.currentStock} ${medicine.stockUnit || "units"} remaining`;

    await notificationService.createAndSend({
      userId: patientId,
      type: "MEDICINE_LOW_STOCK",
      title: isOutOfStock ? "Medicine stock empty" : "Medicine stock running low",
      body: isOutOfStock
        ? `${medicine.name} is out of stock. Request more medicine when needed.`
        : `${medicine.name} is running low · ${stockText}.`,
      priority: "HIGH",
      entityType: "MEDICINE_LOW_STOCK",
      entityId: medicine.id,
      targetScreen: "PatientMedicines",
      patientPreferenceKey: "medicineReminders",
      data: {
        source: "MEDICINE_LOW_STOCK",
        recipientRole: "PATIENT",
        patientId,
        medicineId: medicine.id,
        medicineName: medicine.name,
        medicineDose: medicine.dose,
        currentStock: medicine.currentStock,
        stockUnit: medicine.stockUnit,
        lowStockThreshold: medicine.lowStockThreshold,
      },
    });

    await Promise.all(
      relationships.map(({ caregiverId }) =>
        notificationService.createAndSend({
          userId: caregiverId,
          type: "MEDICINE_LOW_STOCK",
          title: isOutOfStock ? `${patient.fullName}'s medicine is out of stock` : `${patient.fullName}'s medicine stock is low`,
          body: isOutOfStock ? `${medicine.name} is out of stock.` : `${medicine.name} is running low · ${stockText}.`,
          priority: "HIGH",
          entityType: "MEDICINE_LOW_STOCK",
          entityId: medicine.id,
          targetScreen: "CaregiverPatientDetail",
          data: {
            source: "MEDICINE_LOW_STOCK",
            recipientRole: "CAREGIVER",
            patientId,
            patientName: patient.fullName,
            medicineId: medicine.id,
            medicineName: medicine.name,
            medicineDose: medicine.dose,
            currentStock: medicine.currentStock,
            stockUnit: medicine.stockUnit,
            lowStockThreshold: medicine.lowStockThreshold,
          },
        }),
      ),
    );
  } catch (error) {
    console.warn(
      `Unable to send low-stock notification for medicine ${medicine.id}:`,
      error instanceof Error ? error.message : error,
    );
  }
};

const getCreateStockData = (
  data: CreateMedicineInput,
) => {
  if (
    data.hasMedicineOnHand ===
    false
  ) {
    return {
      hasMedicineOnHand:
        false,

      currentStock: 0,

      stockUnit:
        data.stockUnit?.trim() ||
        null,

      lowStockThreshold:
        getEffectiveLowStockThreshold(
          data.lowStockThreshold,
          data.doseQuantity,
        ),
    };
  }

  if (
    data.hasMedicineOnHand ===
    true
  ) {
    return {
      hasMedicineOnHand:
        true,

      currentStock:
        data.currentStock ??
        0,

      stockUnit:
        data.stockUnit?.trim() ||
        null,

      lowStockThreshold:
        getEffectiveLowStockThreshold(
          data.lowStockThreshold,
          data.doseQuantity,
        ),
    };
  }

  return {
    hasMedicineOnHand:
      null,

    currentStock:
      null,

    stockUnit:
      data.stockUnit?.trim() ||
      null,

    lowStockThreshold:
      data.lowStockThreshold ??
      null,
  };
};

const shouldActivateReminderForStock =
  (
    hasMedicineOnHand:
      | boolean
      | null
      | undefined,

    currentStock:
      | number
      | null
      | undefined,
  ) => {
    if (hasMedicineOnHand !== true) {
      return false;
    }

    if (
      currentStock === null ||
      currentStock === undefined ||
      currentStock <= 0
    ) {
      return false;
    }

    return true;
  };

const getActiveReviewDoctorAssignments =
  async (
    patientId: string,
  ) => {
    return prisma.patientDoctorAssignment.findMany(
      {
        where: {
          patientId,
          status: "ACTIVE",

          doctor: {
            is: {
              role: "DOCTOR",

              isEmailVerified:
                true,

              accountStatus: {
                in: [
                  "ACTIVE",
                  "APPROVED",
                ],
              },
            },
          },
        },

        select: {
          assignmentType:
            true,

          createdAt: true,

          doctor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },

        orderBy: {
          createdAt:
            "asc",
        },
      },
    );
  };

const findPrimaryReviewDoctor =
  async (
    patientId: string,
  ) => {
    const assignments =
      await getActiveReviewDoctorAssignments(
        patientId,
      );

    return (
      assignments.find(
        assignment =>
          assignment.assignmentType ===
          "PRIMARY",
      )?.doctor || null
    );
  };

const getMedicineReviewRouting =
  async (
    patientId: string,
  ): Promise<MedicineReviewRoutingDecision> => {
    const assignments =
      await getActiveReviewDoctorAssignments(
        patientId,
      );

    if (
      assignments.length ===
      0
    ) {
      return {
        doctor: null,
        routingStatus:
          "ADMIN_REVIEW_REQUIRED",
        attemptedDoctorIds:
          [],
        escalatedAt:
          new Date(),
      };
    }

    const primaryAssignment =
      assignments.find(
        assignment =>
          assignment.assignmentType ===
          "PRIMARY",
      ) || null;

    const orderedAssignments =
      [
        ...(primaryAssignment
          ? [
              primaryAssignment,
            ]
          : []),

        ...assignments.filter(
          assignment =>
            assignment.doctor
              .id !==
            primaryAssignment
              ?.doctor.id,
        ),
      ];

    const todayAvailability =
      await prisma.doctorAvailability.findMany(
        {
          where: {
            doctorId: {
              in: orderedAssignments.map(
                assignment =>
                  assignment.doctor
                    .id,
              ),
            },

            date:
              getTodayAvailabilityDate(),
          },

          select: {
            doctorId: true,
            status: true,
          },
        },
      );

    const statusByDoctorId =
      new Map(
        todayAvailability.map(
          availability => [
            availability.doctorId,
            availability.status,
          ],
        ),
      );

    const attemptedDoctorIds:
      string[] = [];

    for (
      const assignment of
      orderedAssignments
    ) {
      const availabilityStatus =
        statusByDoctorId.get(
          assignment.doctor
            .id,
        );

      if (
        availabilityStatus ===
        "OUT_OF_OFFICE"
      ) {
        attemptedDoctorIds.push(
          assignment.doctor
            .id,
        );

        continue;
      }

      return {
        doctor:
          assignment.doctor,

        routingStatus:
          "ASSIGNED",

        attemptedDoctorIds,

        escalatedAt: null,
      };
    }

    return {
      doctor: null,

      routingStatus:
        "ADMIN_REVIEW_REQUIRED",

      attemptedDoctorIds,

      escalatedAt:
        new Date(),
    };
  };

const ensureNoPendingRequest =
  async (
    patientId: string,
    medicineId: string,
  ) => {
    const pendingRequest =
      await prisma.medicineReviewRequest.findFirst(
        {
          where: {
            patientId,
            medicineId,
            status:
              "PENDING",
          },

          select: {
            id: true,
            requestType:
              true,
          },
        },
      );

    if (pendingRequest) {
      const requestLabel =
        pendingRequest.requestType ===
        "DELETE"
          ? "deletion"
          : "medicine";

      throw new AppError(
        `A ${requestLabel} review is already pending for this medicine.`,
        400,
      );
    }
  };

const getMedicineForPatient =
  async (
    patientId: string,
    medicineId: string,
    includeInactive = true,
  ) => {
    const medicine =
      await prisma.medicine.findFirst(
        {
          where: {
            id: medicineId,
            patientId,

            ...(includeInactive
              ? {}
              : {
                  isActive:
                    true,
                }),
          },

          include: {
            reminders: {
              include:
                reminderRelations,

              orderBy: {
                timeOfDay:
                  "asc",
              },
            },

            reviewRequests: {
              include: {
                doctor: {
                  select: {
                    id: true,
                    fullName:
                      true,
                    email: true,
                  },
                },

                reviewedByDoctor:
                  {
                    select: {
                      id: true,
                      fullName:
                        true,
                      email:
                        true,
                    },
                  },
              },

              orderBy: {
                createdAt:
                  "desc",
              },
            },
          },
        },
      );

    if (!medicine) {
      throw new AppError(
        "Medicine not found",
        404,
      );
    }

    return medicine;
  };

const getReviewRequestForPatient =
  async (
    patientId: string,
    requestId: string,
  ) => {
    const request =
      await prisma.medicineReviewRequest.findFirst(
        {
          where: {
            id: requestId,
            patientId,
          },

          include:
            reviewRequestRelations,
        },
      );

    if (!request) {
      throw new AppError(
        "Medicine review request not found",
        404,
      );
    }

    return request;
  };

const formatReminder = (
  reminder: any,
) => ({
  id: reminder.id,
  frequency:
    reminder.frequency,
  customFrequency:
    reminder.customFrequency,
  timeOfDay:
    reminder.timeOfDay,
  startDate:
    reminder.startDate,
  endDate:
    reminder.endDate,
  sendToDoctorForReview:
    reminder.sendToDoctorForReview,
  reviewStatus:
    reminder.reviewStatus,
  reviewDoctorId:
    reminder.reviewDoctorId,
  reviewedByDoctorId:
    reminder.reviewedByDoctorId,
  reviewedAt:
    reminder.reviewedAt,
  reviewNote:
    reminder.reviewNote,
  reviewDoctor:
    reminder.reviewDoctor ||
    null,
  reviewedByDoctor:
    reminder.reviewedByDoctor ||
    null,
  isActive:
    reminder.isActive,
});

const formatReviewRequest = (
  request: any,
) => {
  const reminder =
    request.medicine
      ?.reminders?.[0] ||
    null;

  return {
    id: request.id,
    patientId:
      request.patientId,
    doctorId:
      request.doctorId,
    reviewedByDoctorId:
      request.reviewedByDoctorId,
    medicineId:
      request.medicineId,
    requestType:
      request.requestType,
    status:
      request.status,
    routingStatus:
      request.routingStatus,

    attemptedDoctorIds:
      request.attemptedDoctorIds ||
      [],

    assignedAt:
      request.assignedAt,
    escalatedAt:
      request.escalatedAt,
    patientReason:
      request.patientReason,
    doctorNote:
      request.doctorNote,
    reviewedAt:
      request.reviewedAt,
    patientSeenAt:
      request.patientSeenAt,
    appliedAt:
      request.appliedAt,
    createdAt:
      request.createdAt,
    updatedAt:
      request.updatedAt,

    isUnread:
      request.status !==
        "PENDING" &&
      !request.patientSeenAt,

    canApply:
      request.requestType ===
        "ADD" &&
      request.status ===
        "APPROVED" &&
      request.medicine?.hasMedicineOnHand !== false &&
      request.medicine?.currentStock !== 0,

    canResubmit:
      request.requestType ===
        "ADD" &&
      request.status ===
        "REJECTED",

    doctor:
      request.doctor ||
      null,

    reviewedByDoctor:
      request.reviewedByDoctor ||
      null,

    medicine:
      request.medicine
        ? {
            id:
              request.medicine
                .id,

            name:
              request.medicine
                .name,

            dose:
              request.medicine
                .dose,

            doseQuantity:
              request.medicine
                .doseQuantity,

            doseUnit:
              request.medicine
                .doseUnit,

            instructions:
              request.medicine
                .instructions,

            source:
              request.medicine
                .source,

            isActive:
              request.medicine
                .isActive,

            hasMedicineOnHand:
              request.medicine
                .hasMedicineOnHand,

            currentStock:
              request.medicine
                .currentStock,

            stockUnit:
              request.medicine
                .stockUnit,

            lowStockThreshold:
              getEffectiveLowStockThreshold(
                request.medicine.lowStockThreshold,
                request.medicine.doseQuantity,
              ),

            frequency:
              reminder?.frequency ||
              null,

            customFrequency:
              reminder?.customFrequency ||
              null,

            timeOfDay:
              reminder?.timeOfDay ||
              null,

            startDate:
              reminder?.startDate ||
              null,

            endDate:
              reminder?.endDate ||
              null,
          }
        : null,
  };
};

const formatMedicine = (
  medicine: any,
) => {
  const pendingDeletionRequest =
    medicine.reviewRequests?.find(
      (request: any) =>
        request.requestType ===
          "DELETE" &&
        request.status ===
          "PENDING",
    ) || null;

  const latestReviewRequest =
    medicine.reviewRequests?.[0] ||
    null;

  return {
    id: medicine.id,
    name: medicine.name,
    dose: medicine.dose,

    doseQuantity:
      medicine.doseQuantity,

    doseUnit:
      medicine.doseUnit,

    instructions:
      medicine.instructions,

    source:
      medicine.source,

    isActive:
      medicine.isActive,

    hasMedicineOnHand:
      medicine.hasMedicineOnHand,

    currentStock:
      medicine.currentStock,

    stockUnit:
      medicine.stockUnit,

    lowStockThreshold:
      getEffectiveLowStockThreshold(
        medicine.lowStockThreshold,
        medicine.doseQuantity,
      ),

    isLowStock:
      isLowStockLevel(
        medicine.currentStock,
        medicine.lowStockThreshold,
        medicine.doseQuantity,
      ),

    createdAt:
      medicine.createdAt,

    updatedAt:
      medicine.updatedAt,

    reminders:
      medicine.reminders.map(
        formatReminder,
      ),

    deletionReviewPending:
      Boolean(
        pendingDeletionRequest,
      ),

    pendingDeletionRequestId:
      pendingDeletionRequest?.id ||
      null,

    latestReviewRequest:
      latestReviewRequest
        ? {
            id:
              latestReviewRequest
                .id,

            requestType:
              latestReviewRequest
                .requestType,

            status:
              latestReviewRequest
                .status,

            routingStatus:
              latestReviewRequest
                .routingStatus,

            assignedAt:
              latestReviewRequest
                .assignedAt,

            escalatedAt:
              latestReviewRequest
                .escalatedAt,

            patientReason:
              latestReviewRequest
                .patientReason,

            doctorNote:
              latestReviewRequest
                .doctorNote,

            reviewedAt:
              latestReviewRequest
                .reviewedAt,

            patientSeenAt:
              latestReviewRequest
                .patientSeenAt,

            appliedAt:
              latestReviewRequest
                .appliedAt,

            doctor:
              latestReviewRequest
                .doctor ||
              null,

            reviewedByDoctor:
              latestReviewRequest
                .reviewedByDoctor ||
              null,
          }
        : null,
  };
};

const getReminderForPatient =
  async (
    reminderId: string,
    patientId: string,
  ) => {
    const reminder =
      await prisma.medicineReminder.findFirst(
        {
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
        },
      );

    if (!reminder) {
      throw new AppError(
        "Medicine reminder not found",
        404,
      );
    }

    return reminder;
  };

const validateDateRange = (
  startDate: Date,
  endDate: Date | null,
) => {
  if (
    endDate &&
    endDate < startDate
  ) {
    throw new AppError(
      "End date cannot be before start date",
      400,
    );
  }
};

const notifyDoctorAboutMedicineReview =
  async (
    requestId: string,
  ) => {
    try {
      const request =
        await prisma.medicineReviewRequest.findUnique(
          {
            where: {
              id: requestId,
            },

            include: {
              patient: {
                select: {
                  id: true,
                  fullName:
                    true,
                },
              },

              medicine: {
                select: {
                  id: true,
                  name: true,
                  dose: true,
                },
              },
            },
          },
        );

      if (
        !request ||
        !request.doctorId
      ) {
        return;
      }

      const existingNotification =
        await prisma.userNotification.findFirst(
          {
            where: {
              userId:
                request.doctorId,

              type:
                "MEDICINE_REVIEW_REQUESTED",

              entityType:
                "MEDICINE_REVIEW_REQUEST",

              entityId:
                request.id,
            },

            select: {
              id: true,
            },
          },
        );

      if (
        existingNotification
      ) {
        return;
      }

      const isDeletion =
        request.requestType ===
        "DELETE";

      await notificationService.createAndSend(
        {
          userId:
            request.doctorId,

          type:
            "MEDICINE_REVIEW_REQUESTED",

          title: isDeletion
            ? "Medicine removal review requested"
            : "New medicine review requested",

          body: isDeletion
            ? `${request.patient.fullName} requested approval to remove ${request.medicine.name}.`
            : `${request.patient.fullName} sent ${request.medicine.name} for your review.`,

          priority:
            "HIGH",

          entityType:
            "MEDICINE_REVIEW_REQUEST",

          entityId:
            request.id,

          targetScreen:
            "DoctorMedicineReviews",

          data: {
            requestId:
              request.id,

            patientId:
              request.patientId,

            patientName:
              request.patient
                .fullName,

            doctorId:
              request.doctorId,

            medicineId:
              request.medicineId,

            medicineName:
              request.medicine
                .name,

            medicineDose:
              request.medicine
                .dose,

            requestType:
              request.requestType,

            patientReason:
              request.patientReason,

            reviewStatus:
              request.status,

            source:
              "PATIENT_MEDICINE_REVIEW",
          },
        },
      );
    } catch (error) {
      console.warn(
        `Unable to notify doctor about medicine review ${requestId}:`,
        error instanceof Error
          ? error.message
          : error,
      );
    }
  };

export const medicineService =
  {
    async createMedicine(
      patientId: string,
      data: CreateMedicineInput,
    ) {
      const startDate =
        parseDate(
          data.startDate,
        );

      const endDate =
        data.endDate
          ? parseDate(
              data.endDate,
            )
          : null;

      validateDateRange(
        startDate,
        endDate,
      );

      const selectedTimes =
        getSelectedTimes(data);

      if (
        selectedTimes.length ===
        0
      ) {
        throw new AppError(
          "At least one reminder time is required",
          400,
        );
      }

      const requestingReview =
        data.sendToDoctorForReview ===
        true;

      const routing =
        requestingReview
          ? await getMedicineReviewRouting(
              patientId,
            )
          : null;

      const reviewDoctor =
        routing?.doctor ||
        null;

      const stockData =
        getCreateStockData(
          data,
        );

      const medicineCanBeActive =
        !requestingReview &&
        shouldActivateReminderForStock(
          stockData.hasMedicineOnHand,
          stockData.currentStock,
        );

      const remindersActive =
        medicineCanBeActive;

      const result =
        await prisma.$transaction(
          async tx => {
            const createdMedicine =
              await tx.medicine.create(
                {
                  data: {
                    patientId,

                    name:
                      data.name.trim(),

                    dose:
                      data.dose.trim(),

                    doseQuantity:
                      data.doseQuantity ??
                      1,

                    doseUnit:
                      data.doseUnit?.trim() ||
                      null,

                    instructions:
                      data.instructions?.trim() ||
                      null,

                    source:
                      data.source ||
                      "MANUAL",

                    isActive:
                      medicineCanBeActive,

                    ...stockData,

                    reminders: {
                      create:
                        selectedTimes.map(
                          time => ({
                            frequency:
                              data.frequency,

                            customFrequency:
                              data.customFrequency?.trim() ||
                              null,

                            timeOfDay:
                              time,

                            startDate,

                            endDate,

                            isActive:
                              remindersActive,

                            sendToDoctorForReview:
                              requestingReview,

                            reviewStatus:
                              requestingReview
                                ? "PENDING"
                                : "NOT_REQUESTED",

                            reviewDoctorId:
                              reviewDoctor?.id ||
                              null,

                            reviewedByDoctorId:
                              null,

                            reviewedAt:
                              null,

                            reviewNote:
                              null,
                          }),
                        ),
                    },
                  },
                },
              );

            let reviewRequestId:
              | string
              | null = null;

            if (
              requestingReview &&
              routing
            ) {
              const reviewRequest =
                await tx.medicineReviewRequest.create(
                  {
                    data: {
                      patientId,

                      doctorId:
                        reviewDoctor?.id ||
                        null,

                      medicineId:
                        createdMedicine.id,

                      requestType:
                        "ADD",

                      status:
                        "PENDING",

                      routingStatus:
                        routing.routingStatus,

                      attemptedDoctorIds:
                        routing.attemptedDoctorIds,

                      assignedAt:
                        new Date(),

                      escalatedAt:
                        routing.escalatedAt,
                    },

                    select: {
                      id: true,
                    },
                  },
                );

              reviewRequestId =
                reviewRequest.id;
            }

            const medicine =
              await tx.medicine.findUnique(
                {
                  where: {
                    id:
                      createdMedicine.id,
                  },

                  include: {
                    reminders: {
                      include:
                        reminderRelations,

                      orderBy: {
                        timeOfDay:
                          "asc",
                      },
                    },

                    reviewRequests: {
                      include: {
                        doctor: {
                          select: {
                            id: true,
                            fullName:
                              true,
                            email:
                              true,
                          },
                        },

                        reviewedByDoctor:
                          {
                            select:
                              {
                                id: true,
                                fullName:
                                  true,
                                email:
                                  true,
                              },
                          },
                      },

                      orderBy: {
                        createdAt:
                          "desc",
                      },
                    },
                  },
                },
              );

            return {
              medicine,
              reviewRequestId,
            };
          },
        );

      if (!result.medicine) {
        throw new AppError(
          "Medicine could not be created",
          500,
        );
      }

      if (
        result.reviewRequestId
      ) {
        await notifyDoctorAboutMedicineReview(
          result.reviewRequestId,
        );
      }

      const formattedMedicine =
        formatMedicine(
          result.medicine,
        );

      if (
        formattedMedicine.isActive &&
        formattedMedicine.currentStock !== null &&
        formattedMedicine.currentStock !== undefined &&
        formattedMedicine.isLowStock
      ) {
        await notifyMedicineLowStock(
          patientId,
          {
            id: formattedMedicine.id,
            name: formattedMedicine.name,
            dose: formattedMedicine.dose,
            currentStock: formattedMedicine.currentStock,
            stockUnit: formattedMedicine.stockUnit,
            lowStockThreshold: formattedMedicine.lowStockThreshold,
          },
        );
      }

      return formattedMedicine;
    },

    async listMedicines(
      patientId: string,
    ) {
      const medicines =
        await prisma.medicine.findMany(
          {
            where: {
              patientId,
              isActive: true,
            },

            include: {
              reminders: {
                include:
                  reminderRelations,

                orderBy: {
                  timeOfDay:
                    "asc",
                },
              },

              reviewRequests: {
                include: {
                  doctor: {
                    select: {
                      id: true,
                      fullName:
                        true,
                      email:
                        true,
                    },
                  },

                  reviewedByDoctor:
                    {
                      select: {
                        id: true,
                        fullName:
                          true,
                        email:
                          true,
                      },
                    },
                },

                orderBy: {
                  createdAt:
                    "desc",
                },
              },
            },

            orderBy: {
              createdAt:
                "desc",
            },
          },
        );

      return medicines.map(
        formatMedicine,
      );
    },

    async getTodayMedicines(
      patientId: string,
    ) {
      const {
        start,
        end,
      } =
        getUpcomingRange();

      const now =
        new Date();

      const medicines =
        await prisma.medicine.findMany(
          {
            where: {
              patientId,
              isActive: true,
            },

            include: {
              reviewRequests: {
                where: {
                  requestType:
                    "DELETE",

                  status:
                    "PENDING",
                },

                select: {
                  id: true,
                },
              },

              reminders: {
                where: {
                  isActive:
                    true,

                  startDate: {
                    lt: end,
                  },

                  OR: [
                    {
                      endDate:
                        null,
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

                      scheduledFor:
                        {
                          gte: start,
                          lt: end,
                        },
                    },
                  },
                },

                orderBy: {
                  timeOfDay:
                    "asc",
                },
              },
            },

            orderBy: {
              createdAt:
                "desc",
            },
          },
        );

      const upcomingItems =
        medicines.flatMap(
          medicine => {
            const deletionRequest =
              medicine
                .reviewRequests[0] ||
              null;

            return medicine.reminders.flatMap(
              reminder => {
                const items = [];

                for (
                  let dayOffset = 0;
                  dayOffset < 7;
                  dayOffset += 1
                ) {
                  const targetDate =
                    addDays(
                      start,
                      dayOffset,
                    );

                  if (
                    !isReminderActiveOnDate(
                      reminder,
                      targetDate,
                    )
                  ) {
                    continue;
                  }

                  const scheduledFor =
                    getScheduledDateTimeForDate(
                      targetDate,
                      reminder.timeOfDay,
                    );

                  const doseLog =
                    reminder.doseLogs.find(
                      log =>
                        isSameScheduledDateTime(
                          log.scheduledFor,
                          scheduledFor,
                        ),
                    );

                  const status =
                    doseLog?.status ||
                    (
                      scheduledFor <
                      now
                        ? "MISSED"
                        : "PENDING"
                    );

                  items.push({
                    medicineId:
                      medicine.id,

                    reminderId:
                      reminder.id,

                    name:
                      medicine.name,

                    dose:
                      medicine.dose,

                    doseQuantity:
                      medicine.doseQuantity,

                    doseUnit:
                      medicine.doseUnit,

                    instructions:
                      medicine.instructions,

                    source:
                      medicine.source,

                    frequency:
                      reminder.frequency,

                    customFrequency:
                      reminder.customFrequency,

                    timeOfDay:
                      reminder.timeOfDay,

                    period:
                      getPeriodFromTime(
                        reminder.timeOfDay,
                      ),

                    scheduledFor,

                    scheduledDate:
                      getDateKey(
                        scheduledFor,
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

                    deletionReviewPending:
                      Boolean(
                        deletionRequest,
                      ),

                    pendingDeletionRequestId:
                      deletionRequest?.id ||
                      null,

                    hasMedicineOnHand:
                      medicine.hasMedicineOnHand,

                    currentStock:
                      medicine.currentStock,

                    stockUnit:
                      medicine.stockUnit,

                    lowStockThreshold:
                      getEffectiveLowStockThreshold(
                        medicine.lowStockThreshold,
                        medicine.doseQuantity,
                      ),

                    isLowStock:
                      isLowStockLevel(
                        medicine.currentStock,
                        medicine.lowStockThreshold,
                        medicine.doseQuantity,
                      ),
                  });
                }

                return items;
              },
            );
          },
        );

      return {
        summary:
          buildSummary(
            upcomingItems,
          ),

        medicines:
          upcomingItems,
      };
    },

    async getMedicineById(
      patientId: string,
      medicineId: string,
    ) {
      const medicine =
        await getMedicineForPatient(
          patientId,
          medicineId,
        );

      return formatMedicine(
        medicine,
      );
    },

    async updateMedicine(
      patientId: string,
      medicineId: string,
      data: UpdateMedicineInput,
    ) {
      const medicine =
        await getMedicineForPatient(
          patientId,
          medicineId,
        );

      const reminder =
        medicine.reminders.find(
          (item: any) =>
            item.isActive,
        ) ||
        medicine.reminders[0] ||
        null;

      const startDate =
        data.startDate !==
        undefined
          ? parseDate(
              data.startDate,
            )
          : reminder?.startDate ||
            new Date();

      const endDate =
        data.endDate !==
        undefined
          ? data.endDate
            ? parseDate(
                data.endDate,
              )
            : null
          : reminder?.endDate ||
            null;

      validateDateRange(
        startDate,
        endDate,
      );

      const requestingReview =
        data.sendToDoctorForReview ===
        true;

      const routing =
        requestingReview
          ? await getMedicineReviewRouting(
              patientId,
            )
          : null;

      const reviewDoctor =
        routing?.doctor ||
        null;

      if (requestingReview) {
        await ensureNoPendingRequest(
          patientId,
          medicineId,
        );
      }

      const nextHasMedicineOnHand =
        data.hasMedicineOnHand !==
        undefined
          ? data.hasMedicineOnHand
          : data.currentStock !==
              undefined
            ? data.currentStock >
              0
            : medicine.hasMedicineOnHand;

      const nextCurrentStock =
        data.hasMedicineOnHand ===
        false
          ? 0
          : data.currentStock !==
              undefined
            ? data.currentStock
            : medicine.currentStock;

      const nextDoseQuantity =
        data.doseQuantity ??
        medicine.doseQuantity ??
        1;

      const nextLowStockThreshold =
        getEffectiveLowStockThreshold(
          data.lowStockThreshold !== undefined
            ? data.lowStockThreshold
            : medicine.lowStockThreshold,
          nextDoseQuantity,
        );

      const wasLowStock =
        isLowStockLevel(
          medicine.currentStock,
          medicine.lowStockThreshold,
          medicine.doseQuantity,
        );

      const stockAllowsReminder =
        shouldActivateReminderForStock(
          nextHasMedicineOnHand,
          nextCurrentStock,
        );

      const stockDataChanged =
        data.hasMedicineOnHand !==
          undefined ||
        data.currentStock !==
          undefined;

      const hasAdditionReviewHistory =
        medicine.reviewRequests.some(
          (request: any) =>
            request.requestType ===
            "ADD",
        );

      const shouldActivateMedicineFromStock =
        !medicine.isActive &&
        stockDataChanged &&
        !hasAdditionReviewHistory &&
        stockAllowsReminder;

      const requestedActiveState =
        data.isActive === true
          ? medicine.isActive ||
            (!hasAdditionReviewHistory &&
              stockAllowsReminder)
          : data.isActive;

      const reviewRequestId =
        await prisma.$transaction(
          async tx => {
            await tx.medicine.update(
              {
                where: {
                  id: medicineId,
                },

                data: {
                  ...(data.name !==
                  undefined
                    ? {
                        name:
                          data.name.trim(),
                      }
                    : {}),

                  ...(data.dose !==
                  undefined
                    ? {
                        dose:
                          data.dose.trim(),
                      }
                    : {}),

                  ...(data.doseQuantity !==
                  undefined
                    ? {
                        doseQuantity:
                          data.doseQuantity,
                      }
                    : {}),

                  ...(data.doseUnit !==
                  undefined
                    ? {
                        doseUnit:
                          data.doseUnit?.trim() ||
                          null,
                      }
                    : {}),

                  ...(data.instructions !==
                  undefined
                    ? {
                        instructions:
                          data.instructions.trim() ||
                          null,
                      }
                    : {}),

                  ...(data.hasMedicineOnHand !==
                    undefined ||
                  data.currentStock !==
                    undefined
                    ? {
                        hasMedicineOnHand:
                          nextHasMedicineOnHand,

                        currentStock:
                          nextCurrentStock,
                      }
                    : {}),

                  ...(data.stockUnit !==
                  undefined
                    ? {
                        stockUnit:
                          data.stockUnit?.trim() ||
                          null,
                      }
                    : {}),

                  ...(data.lowStockThreshold !==
                    undefined ||
                  medicine.lowStockThreshold ===
                    null
                    ? {
                        lowStockThreshold:
                          nextLowStockThreshold,
                      }
                    : {}),

                  ...(requestingReview
                    ? {
                        isActive:
                          false,
                      }
                    : data.isActive !==
                        undefined
                      ? {
                          isActive:
                            requestedActiveState,
                        }
                      : shouldActivateMedicineFromStock
                        ? {
                            isActive:
                              true,
                          }
                        : {}),
                },
              },
            );

            const reminderData =
              {
                frequency:
                  data.frequency ||
                  reminder?.frequency ||
                  "ONCE_DAILY",

                customFrequency:
                  data.customFrequency !==
                  undefined
                    ? data.customFrequency.trim() ||
                      null
                    : reminder?.customFrequency ||
                      null,

                timeOfDay:
                  data.timeOfDay ||
                  reminder?.timeOfDay ||
                  "08:00",

                startDate,

                endDate,

                ...(requestingReview
                  ? {
                      isActive:
                        false,

                      sendToDoctorForReview:
                        true,

                      reviewStatus:
                        "PENDING" as const,

                      reviewDoctorId:
                        reviewDoctor?.id ||
                        null,

                      reviewedByDoctorId:
                        null,

                      reviewedAt:
                        null,

                      reviewNote:
                        null,
                    }
                  : stockDataChanged &&
                    !hasAdditionReviewHistory
                    ? {
                        isActive:
                          stockAllowsReminder,
                      }
                    : {}),
              };

            if (reminder) {
              await tx.medicineReminder.update(
                {
                  where: {
                    id:
                      reminder.id,
                  },

                  data:
                    reminderData,
                },
              );
            } else {
              await tx.medicineReminder.create(
                {
                  data: {
                    medicineId,
                    ...reminderData,
                  },
                },
              );
            }

            if (
              !requestingReview ||
              !routing
            ) {
              return null;
            }

            const reviewRequest =
              await tx.medicineReviewRequest.create(
                {
                  data: {
                    patientId,

                    doctorId:
                      reviewDoctor?.id ||
                      null,

                    medicineId,

                    requestType:
                      "ADD",

                    status:
                      "PENDING",

                    routingStatus:
                      routing.routingStatus,

                    attemptedDoctorIds:
                      routing.attemptedDoctorIds,

                    assignedAt:
                      new Date(),

                    escalatedAt:
                      routing.escalatedAt,
                  },

                  select: {
                    id: true,
                  },
                },
              );

            return reviewRequest.id;
          },
        );

      if (reviewRequestId) {
        await notifyDoctorAboutMedicineReview(
          reviewRequestId,
        );
      }

      const updatedMedicine =
        await medicineService.getMedicineById(
          patientId,
          medicineId,
        );

      if (
        !wasLowStock &&
        updatedMedicine.isActive &&
        updatedMedicine.currentStock !== null &&
        updatedMedicine.currentStock !== undefined &&
        updatedMedicine.isLowStock
      ) {
        await notifyMedicineLowStock(
          patientId,
          {
            id: updatedMedicine.id,
            name: updatedMedicine.name,
            dose: updatedMedicine.dose,
            currentStock: updatedMedicine.currentStock,
            stockUnit: updatedMedicine.stockUnit,
            lowStockThreshold: updatedMedicine.lowStockThreshold,
          },
        );
      }

      return updatedMedicine;
    },

    async deleteMedicine(
      patientId: string,
      medicineId: string,
    ) {
      const medicine =
        await getMedicineForPatient(
          patientId,
          medicineId,
        );

      await ensureNoPendingRequest(
        patientId,
        medicineId,
      );

      const primaryDoctor =
        await findPrimaryReviewDoctor(
          patientId,
        );

      if (
        medicine.isActive &&
        primaryDoctor
      ) {
        throw new AppError(
          "This medicine must be sent to your doctor for deletion review.",
          400,
        );
      }

      await prisma.$transaction(
        async tx => {
          await tx.medicine.update(
            {
              where: {
                id: medicineId,
              },

              data: {
                isActive:
                  false,
              },
            },
          );

          await tx.medicineReminder.updateMany(
            {
              where: {
                medicineId,
              },

              data: {
                isActive:
                  false,
              },
            },
          );
        },
      );

      return {
        message:
          "Medicine removed successfully",
      };
    },

    async requestMedicineDeletion(
      patientId: string,
      medicineId: string,
      data: RequestMedicineDeletionInput,
    ) {
      const medicine =
        await getMedicineForPatient(
          patientId,
          medicineId,
          false,
        );

      await ensureNoPendingRequest(
        patientId,
        medicineId,
      );

      const routing =
        await getMedicineReviewRouting(
          patientId,
        );

      const doctor =
        routing.doctor;

      const request =
        await prisma.medicineReviewRequest.create(
          {
            data: {
              patientId,

              doctorId:
                doctor?.id ||
                null,

              medicineId:
                medicine.id,

              requestType:
                "DELETE",

              status:
                "PENDING",

              routingStatus:
                routing.routingStatus,

              attemptedDoctorIds:
                routing.attemptedDoctorIds,

              assignedAt:
                new Date(),

              escalatedAt:
                routing.escalatedAt,

              patientReason:
                data.reason.trim(),
            },

            include:
              reviewRequestRelations,
          },
        );

      await notifyDoctorAboutMedicineReview(
        request.id,
      );

      return {
        message:
          routing.routingStatus ===
          "ADMIN_REVIEW_REQUIRED"
            ? "Medicine deletion request sent for administrator-assisted review routing."
            : "Medicine deletion request sent for doctor review.",

        request:
          formatReviewRequest(
            request,
          ),
      };
    },

    async listMedicineReviewRequests(
      patientId: string,
    ) {
      const requests =
        await prisma.medicineReviewRequest.findMany(
          {
            where: {
              patientId,
            },

            include:
              reviewRequestRelations,

            orderBy: {
              createdAt:
                "desc",
            },

            take: 100,
          },
        );

      const pending =
        requests.filter(
          request =>
            request.status ===
            "PENDING",
        ).length;

      const approved =
        requests.filter(
          request =>
            request.status ===
            "APPROVED",
        ).length;

      const rejected =
        requests.filter(
          request =>
            request.status ===
            "REJECTED",
        ).length;

      const applied =
        requests.filter(
          request =>
            request.status ===
            "APPLIED",
        ).length;

      const unread =
        requests.filter(
          request =>
            request.status !==
              "PENDING" &&
            !request.patientSeenAt,
        ).length;

      return {
        summary: {
          total:
            requests.length,
          pending,
          approved,
          rejected,
          applied,
          unread,
        },

        requests:
          requests.map(
            formatReviewRequest,
          ),
      };
    },

    async markMedicineReviewSeen(
      patientId: string,
      requestId: string,
    ) {
      await getReviewRequestForPatient(
        patientId,
        requestId,
      );

      const updatedRequest =
        await prisma.medicineReviewRequest.update(
          {
            where: {
              id: requestId,
            },

            data: {
              patientSeenAt:
                new Date(),
            },

            include:
              reviewRequestRelations,
          },
        );

      return {
        request:
          formatReviewRequest(
            updatedRequest,
          ),
      };
    },

    async applyApprovedMedicineReview(
      patientId: string,
      requestId: string,
    ) {
      const request =
        await getReviewRequestForPatient(
          patientId,
          requestId,
        );

      if (
        request.requestType !==
        "ADD"
      ) {
        throw new AppError(
          "Only approved medicine additions can be applied.",
          400,
        );
      }

      if (
        request.status !==
        "APPROVED"
      ) {
        throw new AppError(
          "Only approved medicine reviews can be applied.",
          400,
        );
      }

      if (
        request.medicine
          .hasMedicineOnHand !==
          true ||
        request.medicine
          .currentStock ===
          null ||
        request.medicine
          .currentStock ===
          undefined ||
        request.medicine
          .currentStock <= 0
      ) {
        throw new AppError(
          "This medicine has been clinically approved, but it has not yet been supplied by your pharmacy. Wait until the pharmacy order is delivered or collected before adding it to your active medicines.",
          409,
        );
      }

      const reminderShouldBeActive =
        shouldActivateReminderForStock(
          request.medicine
            .hasMedicineOnHand,

          request.medicine
            .currentStock,
        );

      await prisma.$transaction(
        async tx => {
          await tx.medicine.update(
            {
              where: {
                id:
                  request.medicineId,
              },

              data: {
                isActive:
                  true,
              },
            },
          );

          await tx.medicineReminder.updateMany(
            {
              where: {
                medicineId:
                  request.medicineId,
              },

              data: {
                isActive:
                  reminderShouldBeActive,
              },
            },
          );

          await tx.medicineReviewRequest.update(
            {
              where: {
                id:
                  request.id,
              },

              data: {
                status:
                  "APPLIED",

                appliedAt:
                  new Date(),

                patientSeenAt:
                  new Date(),
              },
            },
          );
        },
      );

      const updatedRequest =
        await getReviewRequestForPatient(
          patientId,
          requestId,
        );

      return {
        message:
          reminderShouldBeActive
            ? "Medicine added to your active medication schedule."
            : "Medicine approved and saved. Reminders will remain inactive until medicine stock is available.",

        request:
          formatReviewRequest(
            updatedRequest,
          ),
      };
    },

    async resubmitMedicineReview(
      patientId: string,
      requestId: string,
      data: ResubmitMedicineReviewInput,
    ) {
      const request =
        await getReviewRequestForPatient(
          patientId,
          requestId,
        );

      if (
        request.requestType !==
        "ADD"
      ) {
        throw new AppError(
          "Only rejected medicine additions can be resubmitted.",
          400,
        );
      }

      if (
        request.status !==
        "REJECTED"
      ) {
        throw new AppError(
          "Only rejected medicine reviews can be resubmitted.",
          400,
        );
      }

      await ensureNoPendingRequest(
        patientId,
        request.medicineId,
      );

      const routing =
        await getMedicineReviewRouting(
          patientId,
        );

      const doctor =
        routing.doctor;

      const startDate =
        parseDate(
          data.startDate,
        );

      const endDate =
        data.endDate
          ? parseDate(
              data.endDate,
            )
          : null;

      validateDateRange(
        startDate,
        endDate,
      );

      const reminder =
        request.medicine
          .reminders[0] ||
        null;

      const newRequest =
        await prisma.$transaction(
          async tx => {
            await tx.medicine.update(
              {
                where: {
                  id:
                    request.medicineId,
                },

                data: {
                  name:
                    data.name.trim(),

                  dose:
                    data.dose.trim(),

                  doseQuantity:
                    data.doseQuantity ??
                    request.medicine
                      .doseQuantity ??
                    1,

                  doseUnit:
                    data.doseUnit !==
                    undefined
                      ? data.doseUnit?.trim() ||
                        null
                      : request.medicine
                          .doseUnit,

                  instructions:
                    data.instructions?.trim() ||
                    null,

                  isActive:
                    false,
                },
              },
            );

            const reminderData =
              {
                frequency:
                  data.frequency,

                customFrequency:
                  data.customFrequency?.trim() ||
                  null,

                timeOfDay:
                  data.timeOfDay,

                startDate,

                endDate,

                isActive:
                  false,

                sendToDoctorForReview:
                  true,

                reviewStatus:
                  "PENDING" as const,

                reviewDoctorId:
                  doctor?.id ||
                  null,

                reviewedByDoctorId:
                  null,

                reviewedAt:
                  null,

                reviewNote:
                  null,
              };

            if (reminder) {
              await tx.medicineReminder.update(
                {
                  where: {
                    id:
                      reminder.id,
                  },

                  data:
                    reminderData,
                },
              );
            } else {
              await tx.medicineReminder.create(
                {
                  data: {
                    medicineId:
                      request.medicineId,

                    ...reminderData,
                  },
                },
              );
            }

            await tx.medicineReviewRequest.update(
              {
                where: {
                  id:
                    request.id,
                },

                data: {
                  patientSeenAt:
                    new Date(),
                },
              },
            );

            return tx.medicineReviewRequest.create(
              {
                data: {
                  patientId,

                  doctorId:
                    doctor?.id ||
                    null,

                  medicineId:
                    request.medicineId,

                  requestType:
                    "ADD",

                  status:
                    "PENDING",

                  routingStatus:
                    routing.routingStatus,

                  attemptedDoctorIds:
                    routing.attemptedDoctorIds,

                  assignedAt:
                    new Date(),

                  escalatedAt:
                    routing.escalatedAt,
                },

                include:
                  reviewRequestRelations,
              },
            );
          },
        );

      await notifyDoctorAboutMedicineReview(
        newRequest.id,
      );

      return {
        message:
          routing.routingStatus ===
          "ADMIN_REVIEW_REQUIRED"
            ? "Updated medicine sent for administrator-assisted review routing."
            : "Updated medicine sent for doctor review.",

        request:
          formatReviewRequest(
            newRequest,
          ),
      };
    },

    async markReminderTaken(
      patientId: string,
      reminderId: string,
    ) {
      const reminder =
        await getReminderForPatient(
          reminderId,
          patientId,
        );

      const today =
        getStartOfDay(
          new Date(),
        );

      if (
        !isReminderActiveOnDate(
          reminder,
          today,
        )
      ) {
        throw new AppError(
          "This reminder is not scheduled for today",
          400,
        );
      }

      const scheduledFor =
        getScheduledDateTimeForDate(
          today,
          reminder.timeOfDay,
        );

      const result =
        await prisma.$transaction(
          async tx => {
            const existingDoseLog =
              await tx.medicineDoseLog.findUnique(
                {
                  where: {
                    reminderId_scheduledFor:
                      {
                        reminderId,
                        scheduledFor,
                      },
                  },

                  select: {
                    id: true,
                    status: true,
                  },
                },
              );

            const alreadyTaken =
              existingDoseLog?.status ===
              "TAKEN";

            const medicineStock =
              await tx.medicine.findUnique(
                {
                  where: {
                    id:
                      reminder.medicineId,
                  },

                  select: {
                    id: true,

                    hasMedicineOnHand:
                      true,

                    currentStock:
                      true,

                    stockUnit:
                      true,

                    lowStockThreshold:
                      true,

                    doseQuantity:
                      true,

                    doseUnit:
                      true,
                  },
                },
              );

            if (
              !medicineStock
            ) {
              throw new AppError(
                "Medicine not found",
                404,
              );
            }

            const stockIsTracked =
              medicineStock.currentStock !==
              null;

            const effectiveLowStockThreshold =
              getEffectiveLowStockThreshold(
                medicineStock.lowStockThreshold,
                medicineStock.doseQuantity,
              );

            const wasLowStock =
              isLowStockLevel(
                medicineStock.currentStock,
                medicineStock.lowStockThreshold,
                medicineStock.doseQuantity,
              );

            const doseQuantity =
              Math.max(
                medicineStock
                  .doseQuantity ||
                  1,
                1,
              );

            if (
              !alreadyTaken &&
              stockIsTracked &&
              medicineStock.currentStock! <
                doseQuantity
            ) {
              throw new AppError(
                `Not enough medicine stock is available for this dose. This reminder requires ${doseQuantity} ${
                  medicineStock.doseUnit ||
                  medicineStock.stockUnit ||
                  "units"
                }.`,
                400,
              );
            }

            const doseLog =
              await tx.medicineDoseLog.upsert(
                {
                  where: {
                    reminderId_scheduledFor:
                      {
                        reminderId,
                        scheduledFor,
                      },
                  },

                  update: {
                    status:
                      "TAKEN",

                    takenAt:
                      new Date(),

                    snoozedUntil:
                      null,
                  },

                  create: {
                    reminderId,
                    patientId,
                    scheduledFor,

                    status:
                      "TAKEN",

                    takenAt:
                      new Date(),
                  },
                },
              );

            let updatedStock =
              medicineStock;

            if (
              !alreadyTaken &&
              stockIsTracked
            ) {
              const stockUpdate =
                await tx.medicine.updateMany(
                  {
                    where: {
                      id:
                        reminder.medicineId,

                      currentStock:
                        {
                          gte:
                            doseQuantity,
                        },
                    },

                    data: {
                      currentStock:
                        {
                          decrement:
                            doseQuantity,
                        },
                    },
                  },
                );

              if (
                stockUpdate.count !==
                1
              ) {
                throw new AppError(
                  "Medicine stock changed before this dose could be recorded. Please refresh and try again.",
                  409,
                );
              }

              const refreshedStock =
                await tx.medicine.findUnique(
                  {
                    where: {
                      id:
                        reminder.medicineId,
                    },

                    select: {
                      id: true,

                      hasMedicineOnHand:
                        true,

                      currentStock:
                        true,

                      stockUnit:
                        true,

                      lowStockThreshold:
                        true,

                      doseQuantity:
                        true,

                      doseUnit:
                        true,
                    },
                  },
                );

              if (
                !refreshedStock
              ) {
                throw new AppError(
                  "Medicine not found",
                  404,
                );
              }

              updatedStock =
                refreshedStock;

              if (
                refreshedStock.currentStock ===
                0
              ) {
                await tx.medicine.update(
                  {
                    where: {
                      id:
                        reminder.medicineId,
                    },

                    data: {
                      hasMedicineOnHand:
                        false,
                    },
                  },
                );

                await tx.medicineReminder.updateMany(
                  {
                    where: {
                      medicineId:
                        reminder.medicineId,
                    },

                    data: {
                      isActive:
                        false,
                    },
                  },
                );

                updatedStock =
                  {
                    ...refreshedStock,

                    hasMedicineOnHand:
                      false,
                  };
              }
            }

            const currentStock =
              updatedStock.currentStock;

            const isLowStock =
              isLowStockLevel(
                currentStock,
                effectiveLowStockThreshold,
                updatedStock.doseQuantity,
              );

            return {
              doseLog,
              stock: {
                ...updatedStock,
                lowStockThreshold:
                  effectiveLowStockThreshold,
              },
              doseQuantity,
              becameLowStock:
                !alreadyTaken &&
                !wasLowStock &&
                isLowStock,
            };
          },
        );

      if (
        result.becameLowStock &&
        result.stock.currentStock !== null
      ) {
        await notifyMedicineLowStock(
          patientId,
          {
            id: reminder.medicine.id,
            name: reminder.medicine.name,
            dose: reminder.medicine.dose,
            currentStock: result.stock.currentStock,
            stockUnit: result.stock.stockUnit,
            lowStockThreshold: result.stock.lowStockThreshold,
          },
        );
      }

      return {
        message:
          result.stock
            .currentStock ===
          0
            ? "Medicine marked as taken. Your recorded stock is now empty."
            : "Medicine marked as taken",

        doseLog:
          result.doseLog,

        doseTaken: {
          quantity:
            result.doseQuantity,

          unit:
            result.stock
              .doseUnit ||
            result.stock
              .stockUnit,
        },

        stock: {
          hasMedicineOnHand:
            result.stock
              .hasMedicineOnHand,

          currentStock:
            result.stock
              .currentStock,

          stockUnit:
            result.stock
              .stockUnit,

          lowStockThreshold:
            result.stock
              .lowStockThreshold,

          isLowStock:
            isLowStockLevel(
              result.stock.currentStock,
              result.stock.lowStockThreshold,
              result.stock.doseQuantity,
            ),
        },
      };
    },

    async snoozeReminder(
      patientId: string,
      reminderId: string,
      data: SnoozeMedicineInput,
    ) {
      const reminder =
        await getReminderForPatient(
          reminderId,
          patientId,
        );

      const today =
        getStartOfDay(
          new Date(),
        );

      if (
        !isReminderActiveOnDate(
          reminder,
          today,
        )
      ) {
        throw new AppError(
          "This reminder is not scheduled for today",
          400,
        );
      }

      const scheduledFor =
        getScheduledDateTimeForDate(
          today,
          reminder.timeOfDay,
        );

      const snoozedUntil =
        parseDateTime(
          data.snoozedUntil,
        );

      const doseLog =
        await prisma.medicineDoseLog.upsert(
          {
            where: {
              reminderId_scheduledFor:
                {
                  reminderId,
                  scheduledFor,
                },
            },

            update: {
              status:
                "SNOOZED",

              snoozedUntil,
            },

            create: {
              reminderId,
              patientId,
              scheduledFor,

              status:
                "SNOOZED",

              snoozedUntil,
            },
          },
        );

      return {
        message:
          "Medicine reminder snoozed",

        doseLog,
      };
    },
  };