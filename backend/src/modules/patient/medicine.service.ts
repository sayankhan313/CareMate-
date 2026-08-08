import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";
import type { CreateMedicineInput, RequestMedicineDeletionInput, ResubmitMedicineReviewInput, SnoozeMedicineInput, UpdateMedicineInput } from "./medicine.types.js";

const reminderRelations = {
  reviewDoctor: { select: { id: true, fullName: true, email: true } },
  reviewedByDoctor: { select: { id: true, fullName: true, email: true } },
} as const;

const reviewRequestRelations = {
  doctor: { select: { id: true, fullName: true, email: true, doctorProfile: { select: { specialization: true } } } },
  reviewedByDoctor: { select: { id: true, fullName: true, email: true } },
  medicine: { include: { reminders: { orderBy: { timeOfDay: "asc" as const } } } },
} as const;

const parseDate = (dateText: string) => {
  const parts = dateText.split("/");
  if (parts.length !== 3) throw new AppError("Date must be in DD/MM/YYYY format", 400);

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  const invalidDate = parsedDate.getUTCFullYear() !== year || parsedDate.getUTCMonth() !== month - 1 || parsedDate.getUTCDate() !== day;
  if (invalidDate) throw new AppError("Please enter a valid date", 400);

  return parsedDate;
};

const parseDateTime = (dateTimeText: string) => {
  const parsedDate = new Date(dateTimeText);
  if (Number.isNaN(parsedDate.getTime())) throw new AppError("Please enter a valid date/time", 400);
  return parsedDate;
};

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

const getUpcomingRange = () => {
  const start = getStartOfDay(new Date());
  return { start, end: addDays(start, 7) };
};

const getScheduledDateTimeForDate = (date: Date, timeOfDay: string) => {
  const [hourText, minuteText] = timeOfDay.split(":");
  const scheduledFor = new Date(date);
  scheduledFor.setHours(Number(hourText), Number(minuteText), 0, 0);
  return scheduledFor;
};

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isSameScheduledDateTime = (firstDate: Date, secondDate: Date) => firstDate.getTime() === secondDate.getTime();

const isReminderActiveOnDate = (reminder: any, date: Date) => {
  const reminderStartDate = getStartOfDay(reminder.startDate);
  const reminderEndDate = reminder.endDate ? getStartOfDay(reminder.endDate) : null;
  const targetDate = getStartOfDay(date);

  if (reminderStartDate > targetDate) return false;
  if (reminderEndDate && reminderEndDate < targetDate) return false;
  return true;
};

const getPeriodFromTime = (timeOfDay: string) => {
  const hour = Number(timeOfDay.split(":")[0]);
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
};

const buildSummary = (items: any[]) => {
  const takenCount = items.filter(item => item.status === "TAKEN").length;
  const pendingCount = items.filter(item => item.status === "PENDING").length;
  const missedCount = items.filter(item => item.status === "MISSED").length;
  const snoozedCount = items.filter(item => item.status === "SNOOZED").length;
  const totalCount = items.length;
  const progressPercentage = totalCount === 0 ? 0 : Math.round((takenCount / totalCount) * 100);

  return { totalCount, takenCount, pendingCount, missedCount, snoozedCount, progressPercentage };
};

const getTodayAvailabilityDate = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

const getActiveReviewDoctorAssignments = async (patientId: string) => {
  return prisma.patientDoctorAssignment.findMany({
    where: {
      patientId,
      status: "ACTIVE",
      doctor: { is: { role: "DOCTOR", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
    },
    select: {
      assignmentType: true,
      createdAt: true,
      doctor: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
};

const findPrimaryReviewDoctor = async (patientId: string) => {
  const assignments = await getActiveReviewDoctorAssignments(patientId);
  return assignments.find(assignment => assignment.assignmentType === "PRIMARY")?.doctor || null;
};

const getMedicineReviewDoctor = async (patientId: string) => {
  const assignments = await getActiveReviewDoctorAssignments(patientId);

  if (assignments.length === 0) {
    throw new AppError("Please assign an active doctor before requesting a medicine review.", 400);
  }

  const primaryAssignment = assignments.find(assignment => assignment.assignmentType === "PRIMARY") || null;

  const orderedAssignments = [
    ...(primaryAssignment ? [primaryAssignment] : []),
    ...assignments.filter(assignment => assignment.doctor.id !== primaryAssignment?.doctor.id),
  ];

  const todayAvailability = await prisma.doctorAvailability.findMany({
    where: {
      doctorId: { in: orderedAssignments.map(assignment => assignment.doctor.id) },
      date: getTodayAvailabilityDate(),
    },
    select: { doctorId: true, status: true },
  });

  const statusByDoctorId = new Map(todayAvailability.map(availability => [availability.doctorId, availability.status]));

  const selectedAssignment = orderedAssignments.find(
    assignment => statusByDoctorId.get(assignment.doctor.id) !== "OUT_OF_OFFICE"
  );

  if (!selectedAssignment) {
    throw new AppError("All assigned doctors are currently out of office. This medicine review cannot be routed automatically.", 409);
  }

  return selectedAssignment.doctor;
};

const ensureNoPendingRequest = async (patientId: string, medicineId: string) => {
  const pendingRequest = await prisma.medicineReviewRequest.findFirst({
    where: { patientId, medicineId, status: "PENDING" },
    select: { id: true, requestType: true },
  });

  if (pendingRequest) {
    const requestLabel = pendingRequest.requestType === "DELETE" ? "deletion" : "medicine";
    throw new AppError(`A ${requestLabel} review is already pending for this medicine.`, 400);
  }
};

const getMedicineForPatient = async (patientId: string, medicineId: string, includeInactive = true) => {
  const medicine = await prisma.medicine.findFirst({
    where: { id: medicineId, patientId, ...(includeInactive ? {} : { isActive: true }) },
    include: {
      reminders: { include: reminderRelations, orderBy: { timeOfDay: "asc" } },
      reviewRequests: {
        include: {
          doctor: { select: { id: true, fullName: true, email: true } },
          reviewedByDoctor: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!medicine) throw new AppError("Medicine not found", 404);
  return medicine;
};

const getReviewRequestForPatient = async (patientId: string, requestId: string) => {
  const request = await prisma.medicineReviewRequest.findFirst({
    where: { id: requestId, patientId },
    include: reviewRequestRelations,
  });

  if (!request) throw new AppError("Medicine review request not found", 404);
  return request;
};

const formatReminder = (reminder: any) => ({
  id: reminder.id,
  frequency: reminder.frequency,
  customFrequency: reminder.customFrequency,
  timeOfDay: reminder.timeOfDay,
  startDate: reminder.startDate,
  endDate: reminder.endDate,
  sendToDoctorForReview: reminder.sendToDoctorForReview,
  reviewStatus: reminder.reviewStatus,
  reviewDoctorId: reminder.reviewDoctorId,
  reviewedByDoctorId: reminder.reviewedByDoctorId,
  reviewedAt: reminder.reviewedAt,
  reviewNote: reminder.reviewNote,
  reviewDoctor: reminder.reviewDoctor || null,
  reviewedByDoctor: reminder.reviewedByDoctor || null,
  isActive: reminder.isActive,
});

const formatReviewRequest = (request: any) => {
  const reminder = request.medicine?.reminders?.[0] || null;

  return {
    id: request.id,
    patientId: request.patientId,
    doctorId: request.doctorId,
    reviewedByDoctorId: request.reviewedByDoctorId,
    medicineId: request.medicineId,
    requestType: request.requestType,
    status: request.status,
    patientReason: request.patientReason,
    doctorNote: request.doctorNote,
    reviewedAt: request.reviewedAt,
    patientSeenAt: request.patientSeenAt,
    appliedAt: request.appliedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    isUnread: request.status !== "PENDING" && !request.patientSeenAt,
    canApply: request.requestType === "ADD" && request.status === "APPROVED",
    canResubmit: request.requestType === "ADD" && request.status === "REJECTED",
    doctor: request.doctor || null,
    reviewedByDoctor: request.reviewedByDoctor || null,
    medicine: request.medicine
      ? {
          id: request.medicine.id,
          name: request.medicine.name,
          dose: request.medicine.dose,
          instructions: request.medicine.instructions,
          source: request.medicine.source,
          isActive: request.medicine.isActive,
          frequency: reminder?.frequency || null,
          customFrequency: reminder?.customFrequency || null,
          timeOfDay: reminder?.timeOfDay || null,
          startDate: reminder?.startDate || null,
          endDate: reminder?.endDate || null,
        }
      : null,
  };
};

const formatMedicine = (medicine: any) => {
  const pendingDeletionRequest =
    medicine.reviewRequests?.find((request: any) => request.requestType === "DELETE" && request.status === "PENDING") || null;

  const latestReviewRequest = medicine.reviewRequests?.[0] || null;

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
    deletionReviewPending: Boolean(pendingDeletionRequest),
    pendingDeletionRequestId: pendingDeletionRequest?.id || null,
    latestReviewRequest: latestReviewRequest
      ? {
          id: latestReviewRequest.id,
          requestType: latestReviewRequest.requestType,
          status: latestReviewRequest.status,
          patientReason: latestReviewRequest.patientReason,
          doctorNote: latestReviewRequest.doctorNote,
          reviewedAt: latestReviewRequest.reviewedAt,
          patientSeenAt: latestReviewRequest.patientSeenAt,
          appliedAt: latestReviewRequest.appliedAt,
          doctor: latestReviewRequest.doctor || null,
          reviewedByDoctor: latestReviewRequest.reviewedByDoctor || null,
        }
      : null,
  };
};

const getReminderForPatient = async (reminderId: string, patientId: string) => {
  const reminder = await prisma.medicineReminder.findFirst({
    where: {
      id: reminderId,
      isActive: true,
      medicine: { patientId, isActive: true },
    },
    include: { medicine: true },
  });

  if (!reminder) throw new AppError("Medicine reminder not found", 404);
  return reminder;
};

const validateDateRange = (startDate: Date, endDate: Date | null) => {
  if (endDate && endDate < startDate) throw new AppError("End date cannot be before start date", 400);
};

const notifyDoctorAboutMedicineReview = async (requestId: string) => {
  try {
    const request = await prisma.medicineReviewRequest.findUnique({
      where: { id: requestId },
      include: {
        patient: { select: { id: true, fullName: true } },
        medicine: { select: { id: true, name: true, dose: true } },
      },
    });

    if (!request) return;

    const existingNotification = await prisma.userNotification.findFirst({
      where: {
        userId: request.doctorId,
        type: "MEDICINE_REVIEW_REQUESTED",
        entityType: "MEDICINE_REVIEW_REQUEST",
        entityId: request.id,
      },
      select: { id: true },
    });

    if (existingNotification) return;

    const isDeletion = request.requestType === "DELETE";

    await notificationService.createAndSend({
      userId: request.doctorId,
      type: "MEDICINE_REVIEW_REQUESTED",
      title: isDeletion ? "Medicine removal review requested" : "New medicine review requested",
      body: isDeletion
        ? `${request.patient.fullName} requested approval to remove ${request.medicine.name}.`
        : `${request.patient.fullName} sent ${request.medicine.name} for your review.`,
      priority: "HIGH",
      entityType: "MEDICINE_REVIEW_REQUEST",
      entityId: request.id,
      targetScreen: "DoctorMedicineReviews",
      data: {
        requestId: request.id,
        patientId: request.patientId,
        patientName: request.patient.fullName,
        doctorId: request.doctorId,
        medicineId: request.medicineId,
        medicineName: request.medicine.name,
        medicineDose: request.medicine.dose,
        requestType: request.requestType,
        patientReason: request.patientReason,
        reviewStatus: request.status,
        source: "PATIENT_MEDICINE_REVIEW",
      },
    });
  } catch (error) {
    console.warn(`Unable to notify doctor about medicine review ${requestId}:`, error instanceof Error ? error.message : error);
  }
};

export const medicineService = {
  async createMedicine(patientId: string, data: CreateMedicineInput) {
    const startDate = parseDate(data.startDate);
    const endDate = data.endDate ? parseDate(data.endDate) : null;
    validateDateRange(startDate, endDate);

    const requestingReview = data.sendToDoctorForReview === true;
    const reviewDoctor = requestingReview ? await getMedicineReviewDoctor(patientId) : null;

    const result = await prisma.$transaction(async tx => {
      const createdMedicine = await tx.medicine.create({
        data: {
          patientId,
          name: data.name.trim(),
          dose: data.dose.trim(),
          instructions: data.instructions?.trim() || null,
          source: data.source || "MANUAL",
          isActive: !requestingReview,
          reminders: {
            create: {
              frequency: data.frequency,
              customFrequency: data.customFrequency?.trim() || null,
              timeOfDay: data.timeOfDay,
              startDate,
              endDate,
              isActive: !requestingReview,
              sendToDoctorForReview: requestingReview,
              reviewStatus: requestingReview ? "PENDING" : "NOT_REQUESTED",
              reviewDoctorId: reviewDoctor?.id || null,
              reviewedByDoctorId: null,
              reviewedAt: null,
              reviewNote: null,
            },
          },
        },
      });

      let reviewRequestId: string | null = null;

      if (requestingReview && reviewDoctor) {
        const reviewRequest = await tx.medicineReviewRequest.create({
          data: {
            patientId,
            doctorId: reviewDoctor.id,
            medicineId: createdMedicine.id,
            requestType: "ADD",
            status: "PENDING",
          },
          select: { id: true },
        });

        reviewRequestId = reviewRequest.id;
      }

      const medicine = await tx.medicine.findUnique({
        where: { id: createdMedicine.id },
        include: {
          reminders: { include: reminderRelations, orderBy: { timeOfDay: "asc" } },
          reviewRequests: {
            include: {
              doctor: { select: { id: true, fullName: true, email: true } },
              reviewedByDoctor: { select: { id: true, fullName: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      return { medicine, reviewRequestId };
    });

    if (!result.medicine) throw new AppError("Medicine could not be created", 500);
    if (result.reviewRequestId) await notifyDoctorAboutMedicineReview(result.reviewRequestId);

    return formatMedicine(result.medicine);
  },

  async listMedicines(patientId: string) {
    const medicines = await prisma.medicine.findMany({
      where: { patientId, isActive: true },
      include: {
        reminders: {
          where: { isActive: true },
          include: reminderRelations,
          orderBy: { timeOfDay: "asc" },
        },
        reviewRequests: {
          include: {
            doctor: { select: { id: true, fullName: true, email: true } },
            reviewedByDoctor: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return medicines.map(formatMedicine);
  },

  async getTodayMedicines(patientId: string) {
    const { start, end } = getUpcomingRange();
    const now = new Date();

    const medicines = await prisma.medicine.findMany({
      where: { patientId, isActive: true },
      include: {
        reviewRequests: {
          where: { requestType: "DELETE", status: "PENDING" },
          select: { id: true },
        },
        reminders: {
          where: {
            isActive: true,
            startDate: { lt: end },
            OR: [{ endDate: null }, { endDate: { gte: start } }],
          },
          include: {
            doseLogs: {
              where: {
                patientId,
                scheduledFor: { gte: start, lt: end },
              },
            },
          },
          orderBy: { timeOfDay: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const upcomingItems = medicines.flatMap(medicine => {
      const deletionRequest = medicine.reviewRequests[0] || null;

      return medicine.reminders.flatMap(reminder => {
        const items = [];

        for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
          const targetDate = addDays(start, dayOffset);
          if (!isReminderActiveOnDate(reminder, targetDate)) continue;

          const scheduledFor = getScheduledDateTimeForDate(targetDate, reminder.timeOfDay);
          const doseLog = reminder.doseLogs.find(log => isSameScheduledDateTime(log.scheduledFor, scheduledFor));
          const status = doseLog?.status || (scheduledFor < now ? "MISSED" : "PENDING");

          items.push({
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
            scheduledDate: getDateKey(scheduledFor),
            startDate: reminder.startDate,
            endDate: reminder.endDate,
            status,
            takenAt: doseLog?.takenAt || null,
            snoozedUntil: doseLog?.snoozedUntil || null,
            deletionReviewPending: Boolean(deletionRequest),
            pendingDeletionRequestId: deletionRequest?.id || null,
          });
        }

        return items;
      });
    });

    return { summary: buildSummary(upcomingItems), medicines: upcomingItems };
  },

  async getMedicineById(patientId: string, medicineId: string) {
    const medicine = await getMedicineForPatient(patientId, medicineId);
    return formatMedicine(medicine);
  },

  async updateMedicine(patientId: string, medicineId: string, data: UpdateMedicineInput) {
    const medicine = await getMedicineForPatient(patientId, medicineId);
    const reminder = medicine.reminders.find((item: any) => item.isActive) || medicine.reminders[0] || null;

    const startDate = data.startDate !== undefined ? parseDate(data.startDate) : reminder?.startDate || new Date();
    const endDate = data.endDate !== undefined ? (data.endDate ? parseDate(data.endDate) : null) : reminder?.endDate || null;
    validateDateRange(startDate, endDate);

    const requestingReview = data.sendToDoctorForReview === true;
    const reviewDoctor = requestingReview ? await getMedicineReviewDoctor(patientId) : null;

    if (requestingReview) await ensureNoPendingRequest(patientId, medicineId);

    const reviewRequestId = await prisma.$transaction(async tx => {
      await tx.medicine.update({
        where: { id: medicineId },
        data: {
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.dose !== undefined ? { dose: data.dose.trim() } : {}),
          ...(data.instructions !== undefined ? { instructions: data.instructions.trim() || null } : {}),
          ...(requestingReview
            ? { isActive: false }
            : data.isActive !== undefined
              ? { isActive: data.isActive }
              : {}),
        },
      });

      const reminderData = {
        frequency: data.frequency || reminder?.frequency || "ONCE_DAILY",
        customFrequency:
          data.customFrequency !== undefined
            ? data.customFrequency.trim() || null
            : reminder?.customFrequency || null,
        timeOfDay: data.timeOfDay || reminder?.timeOfDay || "08:00",
        startDate,
        endDate,
        ...(requestingReview
          ? {
              isActive: false,
              sendToDoctorForReview: true,
              reviewStatus: "PENDING" as const,
              reviewDoctorId: reviewDoctor?.id || null,
              reviewedByDoctorId: null,
              reviewedAt: null,
              reviewNote: null,
            }
          : {}),
      };

      if (reminder) {
        await tx.medicineReminder.update({ where: { id: reminder.id }, data: reminderData });
      } else {
        await tx.medicineReminder.create({ data: { medicineId, ...reminderData } });
      }

      if (!requestingReview || !reviewDoctor) return null;

      const reviewRequest = await tx.medicineReviewRequest.create({
        data: {
          patientId,
          doctorId: reviewDoctor.id,
          medicineId,
          requestType: "ADD",
          status: "PENDING",
        },
        select: { id: true },
      });

      return reviewRequest.id;
    });

    if (reviewRequestId) await notifyDoctorAboutMedicineReview(reviewRequestId);
    return medicineService.getMedicineById(patientId, medicineId);
  },

  async deleteMedicine(patientId: string, medicineId: string) {
    const medicine = await getMedicineForPatient(patientId, medicineId);
    await ensureNoPendingRequest(patientId, medicineId);

    const primaryDoctor = await findPrimaryReviewDoctor(patientId);

    if (medicine.isActive && primaryDoctor) {
      throw new AppError("This medicine must be sent to your doctor for deletion review.", 400);
    }

    await prisma.$transaction(async tx => {
      await tx.medicine.update({ where: { id: medicineId }, data: { isActive: false } });
      await tx.medicineReminder.updateMany({ where: { medicineId }, data: { isActive: false } });
    });

    return { message: "Medicine removed successfully" };
  },

  async requestMedicineDeletion(patientId: string, medicineId: string, data: RequestMedicineDeletionInput) {
    const medicine = await getMedicineForPatient(patientId, medicineId, false);
    await ensureNoPendingRequest(patientId, medicineId);

    const doctor = await getMedicineReviewDoctor(patientId);

    const request = await prisma.medicineReviewRequest.create({
      data: {
        patientId,
        doctorId: doctor.id,
        medicineId: medicine.id,
        requestType: "DELETE",
        status: "PENDING",
        patientReason: data.reason.trim(),
      },
      include: reviewRequestRelations,
    });

    await notifyDoctorAboutMedicineReview(request.id);

    return {
      message: "Medicine deletion request sent for doctor review.",
      request: formatReviewRequest(request),
    };
  },

  async listMedicineReviewRequests(patientId: string) {
    const requests = await prisma.medicineReviewRequest.findMany({
      where: { patientId },
      include: reviewRequestRelations,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const pending = requests.filter(request => request.status === "PENDING").length;
    const approved = requests.filter(request => request.status === "APPROVED").length;
    const rejected = requests.filter(request => request.status === "REJECTED").length;
    const applied = requests.filter(request => request.status === "APPLIED").length;
    const unread = requests.filter(request => request.status !== "PENDING" && !request.patientSeenAt).length;

    return {
      summary: { total: requests.length, pending, approved, rejected, applied, unread },
      requests: requests.map(formatReviewRequest),
    };
  },

  async markMedicineReviewSeen(patientId: string, requestId: string) {
    await getReviewRequestForPatient(patientId, requestId);

    const updatedRequest = await prisma.medicineReviewRequest.update({
      where: { id: requestId },
      data: { patientSeenAt: new Date() },
      include: reviewRequestRelations,
    });

    return { request: formatReviewRequest(updatedRequest) };
  },

  async applyApprovedMedicineReview(patientId: string, requestId: string) {
    const request = await getReviewRequestForPatient(patientId, requestId);

    if (request.requestType !== "ADD") {
      throw new AppError("Only approved medicine additions can be applied.", 400);
    }

    if (request.status !== "APPROVED") {
      throw new AppError("Only approved medicine reviews can be applied.", 400);
    }

    await prisma.$transaction(async tx => {
      await tx.medicine.update({
        where: { id: request.medicineId },
        data: { isActive: true },
      });

      await tx.medicineReminder.updateMany({
        where: { medicineId: request.medicineId },
        data: { isActive: true },
      });

      await tx.medicineReviewRequest.update({
        where: { id: request.id },
        data: {
          status: "APPLIED",
          appliedAt: new Date(),
          patientSeenAt: new Date(),
        },
      });
    });

    const updatedRequest = await getReviewRequestForPatient(patientId, requestId);

    return {
      message: "Medicine added to your active medication schedule.",
      request: formatReviewRequest(updatedRequest),
    };
  },

  async resubmitMedicineReview(patientId: string, requestId: string, data: ResubmitMedicineReviewInput) {
    const request = await getReviewRequestForPatient(patientId, requestId);

    if (request.requestType !== "ADD") {
      throw new AppError("Only rejected medicine additions can be resubmitted.", 400);
    }

    if (request.status !== "REJECTED") {
      throw new AppError("Only rejected medicine reviews can be resubmitted.", 400);
    }

    await ensureNoPendingRequest(patientId, request.medicineId);

    const doctor = await getMedicineReviewDoctor(patientId);
    const startDate = parseDate(data.startDate);
    const endDate = data.endDate ? parseDate(data.endDate) : null;
    validateDateRange(startDate, endDate);

    const reminder = request.medicine.reminders[0] || null;

    const newRequest = await prisma.$transaction(async tx => {
      await tx.medicine.update({
        where: { id: request.medicineId },
        data: {
          name: data.name.trim(),
          dose: data.dose.trim(),
          instructions: data.instructions?.trim() || null,
          isActive: false,
        },
      });

      const reminderData = {
        frequency: data.frequency,
        customFrequency: data.customFrequency?.trim() || null,
        timeOfDay: data.timeOfDay,
        startDate,
        endDate,
        isActive: false,
        sendToDoctorForReview: true,
        reviewStatus: "PENDING" as const,
        reviewDoctorId: doctor.id,
        reviewedByDoctorId: null,
        reviewedAt: null,
        reviewNote: null,
      };

      if (reminder) {
        await tx.medicineReminder.update({ where: { id: reminder.id }, data: reminderData });
      } else {
        await tx.medicineReminder.create({
          data: { medicineId: request.medicineId, ...reminderData },
        });
      }

      await tx.medicineReviewRequest.update({
        where: { id: request.id },
        data: { patientSeenAt: new Date() },
      });

      return tx.medicineReviewRequest.create({
        data: {
          patientId,
          doctorId: doctor.id,
          medicineId: request.medicineId,
          requestType: "ADD",
          status: "PENDING",
        },
        include: reviewRequestRelations,
      });
    });

    await notifyDoctorAboutMedicineReview(newRequest.id);

    return {
      message: "Updated medicine sent for doctor review.",
      request: formatReviewRequest(newRequest),
    };
  },

  async markReminderTaken(patientId: string, reminderId: string) {
    const reminder = await getReminderForPatient(reminderId, patientId);
    const today = getStartOfDay(new Date());

    if (!isReminderActiveOnDate(reminder, today)) {
      throw new AppError("This reminder is not scheduled for today", 400);
    }

    const scheduledFor = getScheduledDateTimeForDate(today, reminder.timeOfDay);

    const doseLog = await prisma.medicineDoseLog.upsert({
      where: { reminderId_scheduledFor: { reminderId, scheduledFor } },
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

    return { message: "Medicine marked as taken", doseLog };
  },

  async snoozeReminder(patientId: string, reminderId: string, data: SnoozeMedicineInput) {
    const reminder = await getReminderForPatient(reminderId, patientId);
    const today = getStartOfDay(new Date());

    if (!isReminderActiveOnDate(reminder, today)) {
      throw new AppError("This reminder is not scheduled for today", 400);
    }

    const scheduledFor = getScheduledDateTimeForDate(today, reminder.timeOfDay);
    const snoozedUntil = parseDateTime(data.snoozedUntil);

    const doseLog = await prisma.medicineDoseLog.upsert({
      where: { reminderId_scheduledFor: { reminderId, scheduledFor } },
      update: { status: "SNOOZED", snoozedUntil },
      create: {
        reminderId,
        patientId,
        scheduledFor,
        status: "SNOOZED",
        snoozedUntil,
      },
    });

    return { message: "Medicine reminder snoozed", doseLog };
  },
};