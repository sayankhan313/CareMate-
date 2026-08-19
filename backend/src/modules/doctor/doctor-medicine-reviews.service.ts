import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { medicineReviewPharmacySyncService } from "../medicine/medicine-review-pharmacy-sync.service.js";
import { notificationService } from "../notification/notification.service.js";
import type {
  DoctorMedicineReviewActionResponse,
  DoctorMedicineReviewDetailResponse,
  DoctorMedicineReviewResponse,
  DoctorMedicineReviewsResponse,
  DoctorPoolMedicineReviewActionResponse,
  DoctorPoolMedicineReviewDetailResponse,
  DoctorPoolMedicineReviewResponse,
  DoctorPoolMedicineReviewsResponse,
} from "./doctor-medicine-reviews.types.js";
import type { ApproveMedicineReviewInput, DoctorMedicineReviewsQueryInput, RejectMedicineReviewInput } from "./doctor-medicine-reviews.validation.js";

const reviewInclude = {
  patient: { select: { id: true, fullName: true, email: true } },
  medicine: { include: { reminders: { orderBy: { timeOfDay: "asc" as const } } } },
  reviewedByDoctor: { select: { id: true, fullName: true, email: true } },
} as const;

const poolReviewInclude = {
  patient: {
    select: {
      id: true,
      patientProfile: { select: { dateOfBirth: true, gender: true, medicalConditions: true, allergies: true } },
      medicines: { where: { isActive: true }, select: { id: true, name: true, dose: true, instructions: true, source: true }, orderBy: { createdAt: "desc" as const } },
      vitalReadings: {
        select: { heartRate: true, spo2: true, bpSystolic: true, bpDiastolic: true, glucose: true, temperature: true, status: true, recordedAt: true },
        orderBy: { recordedAt: "desc" as const },
        take: 1,
      },
    },
  },
  medicine: { include: { reminders: { orderBy: { timeOfDay: "asc" as const } } } },
} as const;

const ensureApprovedDoctor = async (doctorId: string) => {
  const doctor = await prisma.user.findUnique({
    where: { id: doctorId },
    select: { id: true, fullName: true, email: true, role: true, accountStatus: true, isEmailVerified: true },
  });

  if (!doctor) throw new AppError("Doctor not found", 404);
  if (doctor.role !== "DOCTOR") throw new AppError("Only doctors can access medicine reviews", 403);
  if (!doctor.isEmailVerified) throw new AppError("Please verify your email first", 403);
  if (doctor.accountStatus !== "ACTIVE" && doctor.accountStatus !== "APPROVED") throw new AppError("Doctor account is not approved yet", 403);
  return doctor;
};

const getAssignedPatientIds = async (doctorId: string) => {
  const assignments = await prisma.patientDoctorAssignment.findMany({ where: { doctorId, status: "ACTIVE" }, select: { patientId: true } });
  return assignments.map(assignment => assignment.patientId);
};

const ensureActiveAssignment = async (doctorId: string, patientId: string) => {
  const assignment = await prisma.patientDoctorAssignment.findFirst({ where: { doctorId, patientId, status: "ACTIVE" }, select: { id: true } });
  if (!assignment) throw new AppError("You are no longer assigned to this patient", 403);
  return assignment;
};

const calculateAge = (dateOfBirth?: Date | null) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const birthdayPassed = today.getUTCMonth() > dateOfBirth.getUTCMonth() || (today.getUTCMonth() === dateOfBirth.getUTCMonth() && today.getUTCDate() >= dateOfBirth.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return age >= 0 ? age : null;
};

const createPatientReference = (patientId: string) => `CM-${patientId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

const formatReview = (request: any): DoctorMedicineReviewResponse => {
  const reminder = request.medicine.reminders[0] || null;

  return {
    id: request.id,
    medicineId: request.medicineId,
    patientId: request.patientId,
    reviewDoctorId: request.doctorId,
    reviewedByDoctorId: request.reviewedByDoctorId,
    requestType: request.requestType,
    reviewStatus: request.status,
    patientReason: request.patientReason,
    reviewNote: request.doctorNote,
    reviewedAt: request.reviewedAt,
    patientSeenAt: request.patientSeenAt,
    appliedAt: request.appliedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    frequency: reminder?.frequency || "ONCE_DAILY",
    customFrequency: reminder?.customFrequency || null,
    timeOfDay: reminder?.timeOfDay || "08:00",
    startDate: reminder?.startDate || null,
    endDate: reminder?.endDate || null,
    patient: { id: request.patient.id, fullName: request.patient.fullName, email: request.patient.email },
    medicine: {
      id: request.medicine.id,
      name: request.medicine.name,
      dose: request.medicine.dose,
      instructions: request.medicine.instructions,
      source: request.medicine.source,
      isActive: request.medicine.isActive,
    },
    reviewedByDoctor: request.reviewedByDoctor || null,
    canApprove: request.status === "PENDING" && request.routingStatus === "ASSIGNED" && Boolean(request.doctorId),
    canReject: request.status === "PENDING" && request.routingStatus === "ASSIGNED" && Boolean(request.doctorId),
  };
};

const formatPoolReview = (request: any): DoctorPoolMedicineReviewResponse => {
  const reminder = request.medicine.reminders[0] || null;
  const profile = request.patient.patientProfile || null;
  const latestVitals = request.patient.vitalReadings?.[0] || null;

  const otherActiveMedicines = (request.patient.medicines || [])
    .filter((medicine: any) => medicine.id !== request.medicineId)
    .map((medicine: any) => ({ id: medicine.id, name: medicine.name, dose: medicine.dose, instructions: medicine.instructions, source: medicine.source }));

  return {
    id: request.id,
    medicineId: request.medicineId,
    requestType: request.requestType,
    routingStatus: request.routingStatus,
    patientReason: request.patientReason,
    poolDecision: request.poolDecision,
    poolDoctorNote: request.poolDoctorNote,
    poolAssignedAt: request.poolAssignedAt,
    poolReviewedAt: request.poolReviewedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    medicine: {
      id: request.medicine.id,
      name: request.medicine.name,
      dose: request.medicine.dose,
      instructions: request.medicine.instructions,
      source: request.medicine.source,
      frequency: reminder?.frequency || "ONCE_DAILY",
      customFrequency: reminder?.customFrequency || null,
      timeOfDay: reminder?.timeOfDay || "08:00",
      startDate: reminder?.startDate || null,
      endDate: reminder?.endDate || null,
    },
    clinicalContext: {
      patientReference: createPatientReference(request.patient.id),
      age: calculateAge(profile?.dateOfBirth),
      gender: profile?.gender || null,
      medicalConditions: profile?.medicalConditions || null,
      allergies: profile?.allergies || null,
      otherActiveMedicines,
      latestVitals: latestVitals
        ? {
            heartRate: latestVitals.heartRate,
            spo2: latestVitals.spo2,
            bpSystolic: latestVitals.bpSystolic,
            bpDiastolic: latestVitals.bpDiastolic,
            glucose: latestVitals.glucose,
            temperature: latestVitals.temperature,
            status: latestVitals.status,
            recordedAt: latestVitals.recordedAt,
          }
        : null,
    },
    canApprove: request.status === "PENDING" && request.routingStatus === "POOL_ASSIGNED" && !request.poolDecision,
    canReject: request.status === "PENDING" && request.routingStatus === "POOL_ASSIGNED" && !request.poolDecision,
  };
};

const getReviewForDoctor = async (doctorId: string, requestId: string) => {
  await ensureApprovedDoctor(doctorId);

  const request = await prisma.medicineReviewRequest.findFirst({ where: { id: requestId, doctorId, routingStatus: "ASSIGNED" }, include: reviewInclude });
  if (!request) throw new AppError("Medicine review not found", 404);

  await ensureActiveAssignment(doctorId, request.patientId);
  return request;
};

const getPoolReviewForDoctor = async (doctorId: string, requestId: string) => {
  await ensureApprovedDoctor(doctorId);

  const request = await prisma.medicineReviewRequest.findFirst({
    where: { id: requestId, poolDoctorId: doctorId, status: "PENDING", routingStatus: { in: ["POOL_ASSIGNED", "POOL_REVIEW_COMPLETED"] } },
    include: poolReviewInclude,
  });

  if (!request) throw new AppError("Medicine Review Doctor Pool request not found", 404);
  return request;
};

const getDoctorDisplayName = (name?: string | null) => {
  const cleanName = name?.trim() || "Your doctor";
  return /^dr\.?\s/i.test(cleanName) ? cleanName : `Dr. ${cleanName}`;
};

const notifyPatientAboutMedicineReviewDecision = async (request: any) => {
  try {
    const approved = request.status === "APPROVED";
    const notificationType = approved ? "MEDICINE_REVIEW_APPROVED" : "MEDICINE_REVIEW_REJECTED";

    const existingNotification = await prisma.userNotification.findFirst({
      where: { userId: request.patientId, type: notificationType, entityType: "MEDICINE_REVIEW_REQUEST", entityId: request.id },
      select: { id: true },
    });

    if (existingNotification) return;

    const doctorName = getDoctorDisplayName(request.reviewedByDoctor?.fullName);
    const medicineName = request.medicine.name;
    const isDeletion = request.requestType === "DELETE";
    const title = approved ? "Medicine review approved" : "Medicine review declined";

    const body = approved
      ? isDeletion
        ? `${doctorName} approved the removal of ${medicineName}.`
        : `${doctorName} approved ${medicineName}. Open Medicine Updates to apply it.`
      : isDeletion
        ? `${doctorName} did not approve the removal of ${medicineName}.`
        : `${doctorName} did not approve ${medicineName}. Open Medicine Updates to view the review note.`;

    await notificationService.createAndSend({
      userId: request.patientId,
      type: notificationType,
      title,
      body,
      priority: "HIGH",
      entityType: "MEDICINE_REVIEW_REQUEST",
      entityId: request.id,
      targetScreen: "MedicineUpdates",
      patientPreferenceKey: "medicineReviewUpdates",
      data: {
        requestId: request.id,
        patientId: request.patientId,
        doctorId: request.reviewedByDoctorId || request.doctorId,
        doctorName,
        medicineId: request.medicineId,
        medicineName,
        medicineDose: request.medicine.dose,
        requestType: request.requestType,
        reviewStatus: request.status,
        doctorNote: request.doctorNote,
        reviewedAt: request.reviewedAt?.toISOString() || null,
        source: "DOCTOR_MEDICINE_REVIEW",
      },
    });
  } catch (error) {
    console.warn(`Unable to notify patient about medicine review ${request.id}:`, error instanceof Error ? error.message : error);
  }
};

export const doctorMedicineReviewsService = {
  async listReviews(doctorId: string, query: DoctorMedicineReviewsQueryInput): Promise<DoctorMedicineReviewsResponse> {
    await ensureApprovedDoctor(doctorId);

    const assignedPatientIds = await getAssignedPatientIds(doctorId);

    if (assignedPatientIds.length === 0) {
      return {
        summary: { total: 0, pending: 0, approved: 0, rejected: 0, applied: 0, additions: 0, deletions: 0 },
        reviews: [],
      };
    }

    const baseWhere = { doctorId, patientId: { in: assignedPatientIds }, routingStatus: "ASSIGNED" as const };
    const filteredWhere = {
      ...baseWhere,
      ...(query.status !== "ALL" ? { status: query.status } : {}),
      ...(query.requestType !== "ALL" ? { requestType: query.requestType } : {}),
    };

    const [reviews, total, pending, approved, rejected, applied, additions, deletions] = await Promise.all([
      prisma.medicineReviewRequest.findMany({ where: filteredWhere, include: reviewInclude, orderBy: { updatedAt: "desc" }, take: 100 }),
      prisma.medicineReviewRequest.count({ where: baseWhere }),
      prisma.medicineReviewRequest.count({ where: { ...baseWhere, status: "PENDING" } }),
      prisma.medicineReviewRequest.count({ where: { ...baseWhere, status: "APPROVED" } }),
      prisma.medicineReviewRequest.count({ where: { ...baseWhere, status: "REJECTED" } }),
      prisma.medicineReviewRequest.count({ where: { ...baseWhere, status: "APPLIED" } }),
      prisma.medicineReviewRequest.count({ where: { ...baseWhere, requestType: "ADD" } }),
      prisma.medicineReviewRequest.count({ where: { ...baseWhere, requestType: "DELETE" } }),
    ]);

    return { summary: { total, pending, approved, rejected, applied, additions, deletions }, reviews: reviews.map(formatReview) };
  },

  async getReviewDetail(doctorId: string, requestId: string): Promise<DoctorMedicineReviewDetailResponse> {
    const request = await getReviewForDoctor(doctorId, requestId);
    return { review: formatReview(request) };
  },

  async approveReview(doctorId: string, requestId: string, input: ApproveMedicineReviewInput): Promise<DoctorMedicineReviewActionResponse> {
    const doctor = await ensureApprovedDoctor(doctorId);
    const request = await getReviewForDoctor(doctorId, requestId);

    if (request.status !== "PENDING") throw new AppError("Only pending medicine reviews can be approved", 400);

    const reviewedAt = new Date();
    const doctorNote = input.note?.trim() || null;

    await prisma.$transaction(async tx => {
      const updated = await tx.medicineReviewRequest.updateMany({
        where: { id: request.id, doctorId: doctor.id, status: "PENDING", routingStatus: "ASSIGNED" },
        data: { status: "APPROVED", reviewedByDoctorId: doctor.id, reviewedAt, doctorNote },
      });

      if (updated.count === 0) throw new AppError("This medicine review has already been reassigned or processed", 409);

      if (request.requestType === "ADD") {
        await tx.medicineReminder.updateMany({
          where: { medicineId: request.medicineId },
          data: { reviewStatus: "APPROVED", reviewedByDoctorId: doctor.id, reviewedAt, reviewNote: doctorNote },
        });

        await medicineReviewPharmacySyncService.syncDecision(tx, {
          patientId: request.patientId,
          medicineId: request.medicineId,
          reviewerId: doctor.id,
          decision: "APPROVED",
          note: doctorNote,
          reviewedAt,
        });
      }

      if (request.requestType === "DELETE") {
        await tx.medicine.update({ where: { id: request.medicineId }, data: { isActive: false } });
        await tx.medicineReminder.updateMany({ where: { medicineId: request.medicineId }, data: { isActive: false } });
      }
    });

    const updatedRequest = await getReviewForDoctor(doctorId, requestId);
    await notifyPatientAboutMedicineReviewDecision(updatedRequest);

    return { review: formatReview(updatedRequest) };
  },

  async rejectReview(doctorId: string, requestId: string, input: RejectMedicineReviewInput): Promise<DoctorMedicineReviewActionResponse> {
    const doctor = await ensureApprovedDoctor(doctorId);
    const request = await getReviewForDoctor(doctorId, requestId);

    if (request.status !== "PENDING") throw new AppError("Only pending medicine reviews can be rejected", 400);

    const reviewedAt = new Date();
    const doctorNote = input.note.trim();

    await prisma.$transaction(async tx => {
      const updated = await tx.medicineReviewRequest.updateMany({
        where: { id: request.id, doctorId: doctor.id, status: "PENDING", routingStatus: "ASSIGNED" },
        data: { status: "REJECTED", reviewedByDoctorId: doctor.id, reviewedAt, doctorNote },
      });

      if (updated.count === 0) throw new AppError("This medicine review has already been reassigned or processed", 409);

      if (request.requestType === "ADD") {
        await tx.medicineReminder.updateMany({
          where: { medicineId: request.medicineId },
          data: { isActive: false, reviewStatus: "REJECTED", reviewedByDoctorId: doctor.id, reviewedAt, reviewNote: doctorNote },
        });

        await tx.medicine.update({ where: { id: request.medicineId }, data: { isActive: false } });

        await medicineReviewPharmacySyncService.syncDecision(tx, {
          patientId: request.patientId,
          medicineId: request.medicineId,
          reviewerId: doctor.id,
          decision: "REJECTED",
          note: doctorNote,
          reviewedAt,
        });
      }
    });

    const updatedRequest = await getReviewForDoctor(doctorId, requestId);
    await notifyPatientAboutMedicineReviewDecision(updatedRequest);

    return { review: formatReview(updatedRequest) };
  },

  async listPoolReviews(doctorId: string): Promise<DoctorPoolMedicineReviewsResponse> {
    await ensureApprovedDoctor(doctorId);

    const [reviews, awaitingReview, completed] = await Promise.all([
      prisma.medicineReviewRequest.findMany({
        where: { poolDoctorId: doctorId, status: "PENDING", routingStatus: { in: ["POOL_ASSIGNED", "POOL_REVIEW_COMPLETED"] } },
        include: poolReviewInclude,
        orderBy: [{ poolAssignedAt: "asc" }, { createdAt: "asc" }],
        take: 100,
      }),
      prisma.medicineReviewRequest.count({ where: { poolDoctorId: doctorId, status: "PENDING", routingStatus: "POOL_ASSIGNED" } }),
      prisma.medicineReviewRequest.count({ where: { poolDoctorId: doctorId, status: "PENDING", routingStatus: "POOL_REVIEW_COMPLETED" } }),
    ]);

    return { summary: { total: reviews.length, awaitingReview, completed }, reviews: reviews.map(formatPoolReview) };
  },

  async getPoolReviewDetail(doctorId: string, requestId: string): Promise<DoctorPoolMedicineReviewDetailResponse> {
    const request = await getPoolReviewForDoctor(doctorId, requestId);
    return { review: formatPoolReview(request) };
  },

  async approvePoolReview(doctorId: string, requestId: string, input: ApproveMedicineReviewInput): Promise<DoctorPoolMedicineReviewActionResponse> {
    await ensureApprovedDoctor(doctorId);
    const request = await getPoolReviewForDoctor(doctorId, requestId);

    if (request.routingStatus !== "POOL_ASSIGNED" || request.poolDecision) throw new AppError("This Medicine Review Doctor Pool request has already been completed", 409);

    const reviewedAt = new Date();
    const note = input.note?.trim() || null;

    const updated = await prisma.medicineReviewRequest.updateMany({
      where: { id: request.id, poolDoctorId: doctorId, status: "PENDING", routingStatus: "POOL_ASSIGNED", poolDecision: null },
      data: { poolDecision: "APPROVED", poolDoctorNote: note, poolReviewedAt: reviewedAt, routingStatus: "POOL_REVIEW_COMPLETED" },
    });

    if (updated.count === 0) throw new AppError("This Medicine Review Doctor Pool request has already been completed or reassigned", 409);

    const updatedRequest = await getPoolReviewForDoctor(doctorId, requestId);

    return {
      message: "Medicine review completed and returned to the administrator for release.",
      review: formatPoolReview(updatedRequest),
    };
  },

  async rejectPoolReview(doctorId: string, requestId: string, input: RejectMedicineReviewInput): Promise<DoctorPoolMedicineReviewActionResponse> {
    await ensureApprovedDoctor(doctorId);
    const request = await getPoolReviewForDoctor(doctorId, requestId);

    if (request.routingStatus !== "POOL_ASSIGNED" || request.poolDecision) throw new AppError("This Medicine Review Doctor Pool request has already been completed", 409);

    const reviewedAt = new Date();
    const note = input.note.trim();

    const updated = await prisma.medicineReviewRequest.updateMany({
      where: { id: request.id, poolDoctorId: doctorId, status: "PENDING", routingStatus: "POOL_ASSIGNED", poolDecision: null },
      data: { poolDecision: "REJECTED", poolDoctorNote: note, poolReviewedAt: reviewedAt, routingStatus: "POOL_REVIEW_COMPLETED" },
    });

    if (updated.count === 0) throw new AppError("This Medicine Review Doctor Pool request has already been completed or reassigned", 409);

    const updatedRequest = await getPoolReviewForDoctor(doctorId, requestId);

    return {
      message: "Medicine review completed and returned to the administrator for release.",
      review: formatPoolReview(updatedRequest),
    };
  },
};