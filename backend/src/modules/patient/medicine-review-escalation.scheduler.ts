import { prisma } from "../../config/prisma.js";
import { notificationService } from "../notification/notification.service.js";

const DEFAULT_FALLBACK_MINUTES = 1440;
const CHECK_INTERVAL_MS = 30_000;

let scheduler: NodeJS.Timeout | null = null;
let isRunning = false;

const getFallbackMinutes = () => {
  const value = Number(process.env.MEDICINE_REVIEW_FALLBACK_MINUTES || DEFAULT_FALLBACK_MINUTES);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_FALLBACK_MINUTES;
};

const getTodayAvailabilityDate = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

const notifyAssignedDoctor = async (requestId: string) => {
  try {
    const request = await prisma.medicineReviewRequest.findUnique({
      where: { id: requestId },
      include: {
        patient: { select: { fullName: true } },
        medicine: { select: { name: true, dose: true } },
      },
    });

    if (!request || !request.doctorId) return;

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
        reviewStatus: request.status,
        source: "MEDICINE_REVIEW_FALLBACK",
      },
    });
  } catch (error) {
    console.warn(
      `Unable to notify fallback doctor for medicine review ${requestId}:`,
      error instanceof Error ? error.message : error
    );
  }
};

const findNextDoctor = async (
  patientId: string,
  currentDoctorId: string,
  attemptedDoctorIds: string[]
) => {
  const excludedDoctorIds = new Set([...attemptedDoctorIds, currentDoctorId]);

  const assignments = await prisma.patientDoctorAssignment.findMany({
    where: {
      patientId,
      status: "ACTIVE",
      doctorId: { notIn: [...excludedDoctorIds] },
      doctor: {
        is: {
          role: "DOCTOR",
          isEmailVerified: true,
          accountStatus: { in: ["ACTIVE", "APPROVED"] },
        },
      },
    },
    select: {
      assignmentType: true,
      createdAt: true,
      doctor: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (assignments.length === 0) return null;

  const todayAvailability = await prisma.doctorAvailability.findMany({
    where: {
      doctorId: { in: assignments.map(assignment => assignment.doctor.id) },
      date: getTodayAvailabilityDate(),
    },
    select: { doctorId: true, status: true },
  });

  const statusByDoctorId = new Map(
    todayAvailability.map(availability => [availability.doctorId, availability.status])
  );

  const eligibleAssignments = assignments.filter(
    assignment => statusByDoctorId.get(assignment.doctor.id) !== "OUT_OF_OFFICE"
  );

  if (eligibleAssignments.length === 0) return null;

  const primary = eligibleAssignments.find(assignment => assignment.assignmentType === "PRIMARY");
  return primary?.doctor || eligibleAssignments[0].doctor;
};

const processExpiredRequest = async (request: {
  id: string;
  patientId: string;
  doctorId: string | null;
  medicineId: string;
  attemptedDoctorIds: string[];
}) => {
  if (!request.doctorId) return;

  const currentDoctorId = request.doctorId;
  const attemptedDoctorIds = Array.from(
    new Set([...request.attemptedDoctorIds, currentDoctorId])
  );

  const nextDoctor = await findNextDoctor(
    request.patientId,
    currentDoctorId,
    attemptedDoctorIds
  );

  if (nextDoctor) {
    const reassigned = await prisma.$transaction(async tx => {
      const updated = await tx.medicineReviewRequest.updateMany({
        where: {
          id: request.id,
          doctorId: currentDoctorId,
          status: "PENDING",
          routingStatus: "ASSIGNED",
        },
        data: {
          doctorId: nextDoctor.id,
          assignedAt: new Date(),
          attemptedDoctorIds,
          escalatedAt: null,
        },
      });

      if (updated.count === 0) return false;

      await tx.medicineReminder.updateMany({
        where: { medicineId: request.medicineId, reviewStatus: "PENDING" },
        data: { reviewDoctorId: nextDoctor.id },
      });

      return true;
    });

    if (!reassigned) return;

    console.log(
      `Medicine review ${request.id} reassigned from doctor ${currentDoctorId} to ${nextDoctor.id}.`
    );

    await notifyAssignedDoctor(request.id);
    return;
  }

  const escalated = await prisma.$transaction(async tx => {
    const updated = await tx.medicineReviewRequest.updateMany({
      where: {
        id: request.id,
        doctorId: currentDoctorId,
        status: "PENDING",
        routingStatus: "ASSIGNED",
      },
      data: {
        doctorId: null,
        routingStatus: "ADMIN_REVIEW_REQUIRED",
        attemptedDoctorIds,
        escalatedAt: new Date(),
      },
    });

    if (updated.count === 0) return false;

    await tx.medicineReminder.updateMany({
      where: { medicineId: request.medicineId, reviewStatus: "PENDING" },
      data: { reviewDoctorId: null },
    });

    return true;
  });

  if (escalated) {
    console.log(`Medicine review ${request.id} escalated to administrator review.`);
  }
};

const runMedicineReviewEscalationCheck = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const fallbackMinutes = getFallbackMinutes();
    const cutoff = new Date(Date.now() - fallbackMinutes * 60_000);

    const expiredRequests = await prisma.medicineReviewRequest.findMany({
      where: {
        status: "PENDING",
        routingStatus: "ASSIGNED",
        doctorId: { not: null },
        assignedAt: { lte: cutoff },
      },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        medicineId: true,
        attemptedDoctorIds: true,
      },
      orderBy: { assignedAt: "asc" },
      take: 100,
    });

    for (const request of expiredRequests) {
      await processExpiredRequest(request);
    }
  } catch (error) {
    console.error(
      "Medicine review escalation check failed:",
      error instanceof Error ? error.message : error
    );
  } finally {
    isRunning = false;
  }
};

export const startMedicineReviewEscalationScheduler = () => {
  if (scheduler) return;

  const fallbackMinutes = getFallbackMinutes();
  console.log(`Medicine review escalation scheduler started. Fallback threshold: ${fallbackMinutes} minute(s).`);

  void runMedicineReviewEscalationCheck();

  scheduler = setInterval(() => {
    void runMedicineReviewEscalationCheck();
  }, CHECK_INTERVAL_MS);

  scheduler.unref();
};

export const stopMedicineReviewEscalationScheduler = () => {
  if (!scheduler) return;

  clearInterval(scheduler);
  scheduler = null;

  console.log("Medicine review escalation scheduler stopped.");
};