import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { medicineReviewPharmacySyncService } from "../medicine/medicine-review-pharmacy-sync.service.js";
import { notificationService } from "../notification/notification.service.js";

type VerificationStatusFilter = "PENDING_VERIFICATION" | "ACTIVE" | "APPROVED" | "REJECTED" | "DISABLED";
type AdminDecisionInput = { adminId: string; notes?: string };

const allowedStatusFilters = new Set<VerificationStatusFilter>(["PENDING_VERIFICATION", "ACTIVE", "APPROVED", "REJECTED", "DISABLED"]);

const getStatusFilter = (status?: string): VerificationStatusFilter => {
  if (status && allowedStatusFilters.has(status as VerificationStatusFilter)) return status as VerificationStatusFilter;
  return "PENDING_VERIFICATION";
};

const userListSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  accountStatus: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
};

const doctorVerificationSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  accountStatus: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
  doctorProfile: {
    select: {
      id: true,
      phoneNumber: true,
      gmcNumber: true,
      specialization: true,
      clinicName: true,
      clinicAddress: true,
      yearsExperience: true,
      bio: true,
      gmcDocumentUrl: true,
      photoIdDocumentUrl: true,
      qualificationDocumentUrl: true,
      verificationCheckedAt: true,
      verificationNotes: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

const pharmacyVerificationSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  accountStatus: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
  pharmacyProfile: {
    select: {
      id: true,
      pharmacyName: true,
      staffName: true,
      phoneNumber: true,
      email: true,
      registrationNumber: true,
      licenseNumber: true,
      address: true,
      city: true,
      postcode: true,
      openingHours: true,
      serviceType: true,
      licenseDocumentUrl: true,
      addressProofDocumentUrl: true,
      notifyNewOrders: true,
      notifyStatusReminders: true,
      notifyDelayedOrders: true,
      verificationCheckedAt: true,
      verificationNotes: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

const cleanNotes = (notes?: string) => notes?.trim() || null;

const medicineReviewInclude = {
  patient: { select: { id: true, fullName: true, email: true } },
  medicine: { include: { reminders: { orderBy: { timeOfDay: "asc" as const } } } },
  doctor: { select: { id: true, fullName: true, email: true } },
  reviewedByDoctor: { select: { id: true, fullName: true, email: true } },
  poolDoctor: {
    select: {
      id: true,
      fullName: true,
      email: true,
      doctorProfile: { select: { specialization: true, clinicName: true } },
    },
  },
  releasedByAdmin: { select: { id: true, fullName: true, email: true } },
} as const;

const formatDoctorVerification = (doctor: any) => ({
  id: doctor.id,
  fullName: doctor.fullName,
  email: doctor.email,
  role: doctor.role,
  accountStatus: doctor.accountStatus,
  isEmailVerified: doctor.isEmailVerified,
  submittedAt: doctor.createdAt,
  updatedAt: doctor.updatedAt,
  profile: doctor.doctorProfile
    ? {
        id: doctor.doctorProfile.id,
        phoneNumber: doctor.doctorProfile.phoneNumber,
        gmcNumber: doctor.doctorProfile.gmcNumber,
        specialization: doctor.doctorProfile.specialization,
        clinicName: doctor.doctorProfile.clinicName,
        clinicAddress: doctor.doctorProfile.clinicAddress,
        yearsExperience: doctor.doctorProfile.yearsExperience,
        bio: doctor.doctorProfile.bio,
        verificationCheckedAt: doctor.doctorProfile.verificationCheckedAt,
        verificationNotes: doctor.doctorProfile.verificationNotes,
      }
    : null,
  documents: doctor.doctorProfile
    ? {
        gmcDocumentUrl: doctor.doctorProfile.gmcDocumentUrl,
        photoIdDocumentUrl: doctor.doctorProfile.photoIdDocumentUrl,
        qualificationDocumentUrl: doctor.doctorProfile.qualificationDocumentUrl,
      }
    : null,
});

const formatPharmacyVerification = (pharmacy: any) => ({
  id: pharmacy.id,
  fullName: pharmacy.fullName,
  email: pharmacy.email,
  role: pharmacy.role,
  accountStatus: pharmacy.accountStatus,
  isEmailVerified: pharmacy.isEmailVerified,
  submittedAt: pharmacy.createdAt,
  updatedAt: pharmacy.updatedAt,
  profile: pharmacy.pharmacyProfile
    ? {
        id: pharmacy.pharmacyProfile.id,
        pharmacyName: pharmacy.pharmacyProfile.pharmacyName,
        staffName: pharmacy.pharmacyProfile.staffName,
        phoneNumber: pharmacy.pharmacyProfile.phoneNumber,
        email: pharmacy.pharmacyProfile.email,
        registrationNumber: pharmacy.pharmacyProfile.registrationNumber,
        licenseNumber: pharmacy.pharmacyProfile.licenseNumber,
        address: pharmacy.pharmacyProfile.address,
        city: pharmacy.pharmacyProfile.city,
        postcode: pharmacy.pharmacyProfile.postcode,
        openingHours: pharmacy.pharmacyProfile.openingHours,
        serviceType: pharmacy.pharmacyProfile.serviceType,
        notifyNewOrders: pharmacy.pharmacyProfile.notifyNewOrders,
        notifyStatusReminders: pharmacy.pharmacyProfile.notifyStatusReminders,
        notifyDelayedOrders: pharmacy.pharmacyProfile.notifyDelayedOrders,
        verificationCheckedAt: pharmacy.pharmacyProfile.verificationCheckedAt,
        verificationNotes: pharmacy.pharmacyProfile.verificationNotes,
      }
    : null,
  documents: pharmacy.pharmacyProfile
    ? {
        licenseDocumentUrl: pharmacy.pharmacyProfile.licenseDocumentUrl,
        addressProofDocumentUrl: pharmacy.pharmacyProfile.addressProofDocumentUrl,
      }
    : null,
});

const formatMedicineReview = (request: any) => {
  const reminder = request.medicine?.reminders?.[0] || null;

  return {
    id: request.id,
    patientId: request.patientId,
    doctorId: request.doctorId,
    reviewedByDoctorId: request.reviewedByDoctorId,
    poolDoctorId: request.poolDoctorId,
    releasedByAdminId: request.releasedByAdminId,
    medicineId: request.medicineId,
    requestType: request.requestType,
    status: request.status,
    routingStatus: request.routingStatus,
    patientReason: request.patientReason,
    doctorNote: request.doctorNote,
    assignedAt: request.assignedAt,
    escalatedAt: request.escalatedAt,
    attemptedDoctorIds: request.attemptedDoctorIds || [],
    poolAssignedAt: request.poolAssignedAt,
    poolDecision: request.poolDecision,
    poolDoctorNote: request.poolDoctorNote,
    poolReviewedAt: request.poolReviewedAt,
    adminReleasedAt: request.adminReleasedAt,
    reviewedAt: request.reviewedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    patient: request.patient,
    doctor: request.doctor || null,
    reviewedByDoctor: request.reviewedByDoctor || null,
    poolDoctor: request.poolDoctor || null,
    releasedByAdmin: request.releasedByAdmin || null,
    medicine: {
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
    },
  };
};

const getDoctorOrThrow = async (userId: string) => {
  const doctor = await prisma.user.findUnique({ where: { id: userId }, select: doctorVerificationSelect });
  if (!doctor) throw new AppError("Doctor verification request not found", 404);
  if (doctor.role !== "DOCTOR") throw new AppError("This user is not a doctor", 400);
  if (!doctor.doctorProfile) throw new AppError("Doctor verification profile not found", 404);
  return doctor;
};

const getPharmacyOrThrow = async (userId: string) => {
  const pharmacy = await prisma.user.findUnique({ where: { id: userId }, select: pharmacyVerificationSelect });
  if (!pharmacy) throw new AppError("Pharmacy verification request not found", 404);
  if (pharmacy.role !== "PHARMACY") throw new AppError("This user is not a pharmacy account", 400);
  if (!pharmacy.pharmacyProfile) throw new AppError("Pharmacy verification profile not found", 404);
  return pharmacy;
};

const getEscalatedMedicineReviewOrThrow = async (requestId: string) => {
  const request = await prisma.medicineReviewRequest.findFirst({
    where: { id: requestId, status: "PENDING", routingStatus: "ADMIN_REVIEW_REQUIRED", doctorId: null, poolDoctorId: null },
    include: medicineReviewInclude,
  });

  if (!request) throw new AppError("Admin medicine review escalation not found", 404);
  return request;
};

const getCompletedPoolReviewOrThrow = async (requestId: string) => {
  const request = await prisma.medicineReviewRequest.findFirst({
    where: {
      id: requestId,
      status: "PENDING",
      routingStatus: "POOL_REVIEW_COMPLETED",
      doctorId: null,
      poolDoctorId: { not: null },
      poolDecision: { not: null },
    },
    include: medicineReviewInclude,
  });

  if (!request) throw new AppError("Completed Medicine Review Doctor Pool request not found", 404);
  return request;
};

const getTodayAvailabilityDate = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

const getEligibleMedicineReviewDoctors = async (request: any) => {
  const excludedDoctorIds = request.attemptedDoctorIds || [];

  const doctors = await prisma.user.findMany({
    where: {
      role: "DOCTOR",
      isEmailVerified: true,
      accountStatus: { in: ["ACTIVE", "APPROVED"] },
      ...(excludedDoctorIds.length > 0 ? { id: { notIn: excludedDoctorIds } } : {}),
      doctorProfile: { isNot: null },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      doctorProfile: { select: { specialization: true, clinicName: true } },
    },
    orderBy: { fullName: "asc" },
  });

  if (doctors.length === 0) return [];

  const doctorIds = doctors.map(doctor => doctor.id);

  const [availabilityRows, assignments, normalWorkloads, poolWorkloads] = await Promise.all([
    prisma.doctorAvailability.findMany({
      where: { doctorId: { in: doctorIds }, date: getTodayAvailabilityDate() },
      select: { doctorId: true, status: true },
    }),
    prisma.patientDoctorAssignment.findMany({
      where: { patientId: request.patientId, doctorId: { in: doctorIds }, status: "ACTIVE" },
      select: { doctorId: true, assignmentType: true },
    }),
    prisma.medicineReviewRequest.groupBy({
      by: ["doctorId"],
      where: { doctorId: { in: doctorIds }, status: "PENDING", routingStatus: "ASSIGNED" },
      _count: { _all: true },
    }),
    prisma.medicineReviewRequest.groupBy({
      by: ["poolDoctorId"],
      where: { poolDoctorId: { in: doctorIds }, status: "PENDING", routingStatus: "POOL_ASSIGNED" },
      _count: { _all: true },
    }),
  ]);

  const availabilityMap = new Map(availabilityRows.map(row => [row.doctorId, row.status]));
  const assignmentMap = new Map(assignments.map(assignment => [assignment.doctorId, assignment.assignmentType]));

  const normalWorkloadMap = new Map(
    normalWorkloads.filter(item => item.doctorId).map(item => [item.doctorId as string, item._count._all]),
  );

  const poolWorkloadMap = new Map(
    poolWorkloads.filter(item => item.poolDoctorId).map(item => [item.poolDoctorId as string, item._count._all]),
  );

  return doctors
    .filter(doctor => availabilityMap.get(doctor.id) !== "OUT_OF_OFFICE")
    .map(doctor => {
      const normalReviews = normalWorkloadMap.get(doctor.id) || 0;
      const poolReviews = poolWorkloadMap.get(doctor.id) || 0;

      return {
        id: doctor.id,
        fullName: doctor.fullName,
        email: doctor.email,
        specialization: doctor.doctorProfile?.specialization || null,
        clinicName: doctor.doctorProfile?.clinicName || null,
        availabilityStatus: availabilityMap.get(doctor.id) || "NO_CALENDAR_ENTRY",
        isAlreadyAssigned: assignmentMap.has(doctor.id),
        assignmentType: assignmentMap.get(doctor.id) || null,
        pendingAssignedReviews: normalReviews,
        pendingPoolReviews: poolReviews,
        pendingMedicineReviews: normalReviews + poolReviews,
      };
    })
    .sort((first, second) => {
      if (first.pendingMedicineReviews !== second.pendingMedicineReviews) return first.pendingMedicineReviews - second.pendingMedicineReviews;
      return first.fullName.localeCompare(second.fullName);
    });
};

const notifyAccountDecision = async ({
  user,
  approved,
  adminId,
  notes,
  reviewedAt,
}: {
  user: { id: string; fullName: string; role: string; accountStatus: string };
  approved: boolean;
  adminId: string;
  notes: string | null;
  reviewedAt: string;
}) => {
  try {
    const type = approved ? "ACCOUNT_APPROVED" : "ACCOUNT_REJECTED";
    const roleLabel = user.role === "DOCTOR" ? "Doctor" : user.role === "PHARMACY" ? "Pharmacy" : "Account";

    const existingNotification = await prisma.userNotification.findFirst({
      where: { userId: user.id, type, entityType: "USER_ACCOUNT", entityId: user.id },
      select: { id: true },
    });

    if (existingNotification) return;

    await notificationService.createAndSend({
      userId: user.id,
      type,
      title: approved ? `${roleLabel} account approved` : `${roleLabel} verification declined`,
      body: approved
        ? `Your CareMate+ ${roleLabel.toLowerCase()} account has been approved. You can now sign in and continue.`
        : `Your CareMate+ ${roleLabel.toLowerCase()} verification was not approved. Open the app to review the update.`,
      priority: "HIGH",
      entityType: "USER_ACCOUNT",
      entityId: user.id,
      targetScreen: "Notifications",
      forcePush: true,
      data: {
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        accountStatus: user.accountStatus,
        decision: approved ? "APPROVED" : "REJECTED",
        decisionNotes: notes,
        reviewedByAdminId: adminId,
        reviewedAt,
        source: "ADMIN_VERIFICATION_DECISION",
      },
    });
  } catch (error) {
    console.warn(`Unable to send account decision notification for user ${user.id}:`, error instanceof Error ? error.message : error);
  }
};

const notifyPoolDoctorAboutMedicineReview = async (requestId: string) => {
  try {
    const request = await prisma.medicineReviewRequest.findUnique({
      where: { id: requestId },
      select: { id: true, poolDoctorId: true },
    });

    if (!request?.poolDoctorId) return;

    const existingNotification = await prisma.userNotification.findFirst({
      where: {
        userId: request.poolDoctorId,
        type: "MEDICINE_REVIEW_POOL_ASSIGNED",
        entityType: "MEDICINE_REVIEW_REQUEST",
        entityId: request.id,
      },
      select: { id: true },
    });

    if (existingNotification) return;

    await notificationService.createAndSend({
      userId: request.poolDoctorId,
      type: "MEDICINE_REVIEW_POOL_ASSIGNED",
      title: "Medicine review assigned",
      body: "A new medicine review has been assigned to you.",
      priority: "HIGH",
      entityType: "MEDICINE_REVIEW_REQUEST",
      entityId: request.id,
      targetScreen: "DoctorMedicineReviewPoolDetail",
      forcePush: true,
      data: {
        requestId: request.id,
        poolOnlyAccess: true,
        source: "ADMIN_MEDICINE_REVIEW_POOL",
      },
    });
  } catch (error) {
    console.warn(
      `Unable to notify Medicine Review Doctor Pool doctor for request ${requestId}:`,
      error instanceof Error ? error.message : error,
    );
  }
};

const getDoctorDisplayName = (name?: string | null) => {
  const cleanName = name?.trim() || "Review doctor";
  return /^dr\.?\s/i.test(cleanName) ? cleanName : `Dr. ${cleanName}`;
};

const notifyPatientAboutReleasedPoolReview = async (requestId: string) => {
  try {
    const request = await prisma.medicineReviewRequest.findUnique({
      where: { id: requestId },
      include: {
        medicine: { select: { name: true, dose: true } },
        reviewedByDoctor: { select: { fullName: true } },
      },
    });

    if (!request || (request.status !== "APPROVED" && request.status !== "REJECTED")) return;

    const approved = request.status === "APPROVED";
    const notificationType = approved ? "MEDICINE_REVIEW_APPROVED" : "MEDICINE_REVIEW_REJECTED";

    const existingNotification = await prisma.userNotification.findFirst({
      where: {
        userId: request.patientId,
        type: notificationType,
        entityType: "MEDICINE_REVIEW_REQUEST",
        entityId: request.id,
      },
      select: { id: true },
    });

    if (existingNotification) return;

    const doctorName = getDoctorDisplayName(request.reviewedByDoctor?.fullName);
    const isDeletion = request.requestType === "DELETE";

    const body = approved
      ? isDeletion
        ? `${doctorName} approved the removal of ${request.medicine.name}.`
        : `${doctorName} approved ${request.medicine.name}. Open Medicine Updates to apply it.`
      : isDeletion
        ? `${doctorName} did not approve the removal of ${request.medicine.name}.`
        : `${doctorName} did not approve ${request.medicine.name}. Open Medicine Updates to view the review note.`;

    await notificationService.createAndSend({
      userId: request.patientId,
      type: notificationType,
      title: approved ? "Medicine review approved" : "Medicine review declined",
      body,
      priority: "HIGH",
      entityType: "MEDICINE_REVIEW_REQUEST",
      entityId: request.id,
      targetScreen: "MedicineUpdates",
      patientPreferenceKey: "medicineReviewUpdates",
      data: {
        requestId: request.id,
        patientId: request.patientId,
        doctorId: request.reviewedByDoctorId,
        doctorName,
        medicineId: request.medicineId,
        medicineName: request.medicine.name,
        medicineDose: request.medicine.dose,
        requestType: request.requestType,
        reviewStatus: request.status,
        doctorNote: request.doctorNote,
        reviewedAt: request.reviewedAt?.toISOString() || null,
        source: "ADMIN_RELEASED_POOL_MEDICINE_REVIEW",
      },
    });
  } catch (error) {
    console.warn(
      `Unable to notify patient about released pool review ${requestId}:`,
      error instanceof Error ? error.message : error,
    );
  }
};

export const adminService = {
  async getDashboard() {
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      totalPharmacies,
      pendingDoctors,
      approvedDoctors,
      rejectedDoctors,
      pendingPharmacies,
      approvedPharmacies,
      rejectedPharmacies,
      disabledUsers,
      pendingMedicineReviewEscalations,
      poolAssignedMedicineReviews,
      completedMedicineReviewPoolReviews,
      recentDoctorVerifications,
      recentPharmacyVerifications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "PATIENT" } }),
      prisma.user.count({ where: { role: "DOCTOR" } }),
      prisma.user.count({ where: { role: "PHARMACY" } }),
      prisma.user.count({ where: { role: "DOCTOR", accountStatus: "PENDING_VERIFICATION" } }),
      prisma.user.count({ where: { role: "DOCTOR", accountStatus: "ACTIVE" } }),
      prisma.user.count({ where: { role: "DOCTOR", accountStatus: "REJECTED" } }),
      prisma.user.count({ where: { role: "PHARMACY", accountStatus: "PENDING_VERIFICATION" } }),
      prisma.user.count({ where: { role: "PHARMACY", accountStatus: "ACTIVE" } }),
      prisma.user.count({ where: { role: "PHARMACY", accountStatus: "REJECTED" } }),
      prisma.user.count({ where: { accountStatus: "DISABLED" } }),
      prisma.medicineReviewRequest.count({
        where: { status: "PENDING", routingStatus: "ADMIN_REVIEW_REQUIRED", doctorId: null, poolDoctorId: null },
      }),
      prisma.medicineReviewRequest.count({
        where: { status: "PENDING", routingStatus: "POOL_ASSIGNED", poolDoctorId: { not: null } },
      }),
      prisma.medicineReviewRequest.count({
        where: { status: "PENDING", routingStatus: "POOL_REVIEW_COMPLETED", poolDoctorId: { not: null } },
      }),
      prisma.user.findMany({
        where: { role: "DOCTOR", accountStatus: "PENDING_VERIFICATION" },
        select: doctorVerificationSelect,
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.user.findMany({
        where: { role: "PHARMACY", accountStatus: "PENDING_VERIFICATION" },
        select: pharmacyVerificationSelect,
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      stats: {
        totalUsers,
        totalPatients,
        totalDoctors,
        totalPharmacies,
        pendingDoctors,
        approvedDoctors,
        rejectedDoctors,
        pendingPharmacies,
        approvedPharmacies,
        rejectedPharmacies,
        disabledUsers,
        pendingMedicineReviewEscalations,
        poolAssignedMedicineReviews,
        completedMedicineReviewPoolReviews,
      },
      recentDoctorVerifications: recentDoctorVerifications.map(formatDoctorVerification),
      recentPharmacyVerifications: recentPharmacyVerifications.map(formatPharmacyVerification),
    };
  },

  async listMedicineReviewEscalations() {
    const requests = await prisma.medicineReviewRequest.findMany({
      where: {
        status: "PENDING",
        routingStatus: "ADMIN_REVIEW_REQUIRED",
        doctorId: null,
        poolDoctorId: null,
      },
      include: medicineReviewInclude,
      orderBy: [{ escalatedAt: "asc" }, { createdAt: "asc" }],
      take: 100,
    });

    return { total: requests.length, requests: requests.map(formatMedicineReview) };
  },

  async getMedicineReviewEscalation(requestId: string) {
    const request = await getEscalatedMedicineReviewOrThrow(requestId);
    const doctors = await getEligibleMedicineReviewDoctors(request);

    return {
      request: formatMedicineReview(request),
      eligibleDoctors: doctors,
    };
  },

  async assignMedicineReviewEscalation(requestId: string, doctorId: string) {
    const request = await getEscalatedMedicineReviewOrThrow(requestId);

    if (request.attemptedDoctorIds.includes(doctorId)) {
      throw new AppError("This doctor has already been attempted for this medicine review.", 400);
    }

    const doctor = await prisma.user.findFirst({
      where: {
        id: doctorId,
        role: "DOCTOR",
        isEmailVerified: true,
        accountStatus: { in: ["ACTIVE", "APPROVED"] },
        doctorProfile: { isNot: null },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        doctorProfile: { select: { specialization: true, clinicName: true } },
      },
    });

    if (!doctor) throw new AppError("Selected doctor is not active and approved.", 404);

    const availability = await prisma.doctorAvailability.findFirst({
      where: { doctorId, date: getTodayAvailabilityDate() },
      select: { status: true },
    });

    if (availability?.status === "OUT_OF_OFFICE") {
      throw new AppError("Selected doctor is currently out of office.", 400);
    }

    const assigned = await prisma.$transaction(async tx => {
      const updated = await tx.medicineReviewRequest.updateMany({
        where: {
          id: request.id,
          status: "PENDING",
          routingStatus: "ADMIN_REVIEW_REQUIRED",
          doctorId: null,
          poolDoctorId: null,
        },
        data: {
          poolDoctorId: doctor.id,
          routingStatus: "POOL_ASSIGNED",
          poolAssignedAt: new Date(),
        },
      });

      if (updated.count === 0) throw new AppError("Medicine review has already been assigned.", 409);

      await tx.medicineReminder.updateMany({
        where: { medicineId: request.medicineId, reviewStatus: "PENDING" },
        data: { reviewDoctorId: null },
      });

      return true;
    });

    if (!assigned) throw new AppError("Medicine review could not be assigned.", 500);

    await notifyPoolDoctorAboutMedicineReview(request.id);

    const updatedRequest = await prisma.medicineReviewRequest.findUnique({
      where: { id: request.id },
      include: medicineReviewInclude,
    });

    return {
      request: updatedRequest ? formatMedicineReview(updatedRequest) : null,
      assignedDoctor: {
        id: doctor.id,
        fullName: doctor.fullName,
        email: doctor.email,
        specialization: doctor.doctorProfile?.specialization || null,
        clinicName: doctor.doctorProfile?.clinicName || null,
        assignmentType: null,
        isPatientAssigned: false,
        poolOnlyAccess: true,
      },
    };
  },

  async listMedicineReviewPoolAssignments() {
    const requests = await prisma.medicineReviewRequest.findMany({
      where: {
        status: "PENDING",
        routingStatus: "POOL_ASSIGNED",
        poolDoctorId: { not: null },
      },
      include: medicineReviewInclude,
      orderBy: [{ poolAssignedAt: "asc" }, { createdAt: "asc" }],
      take: 100,
    });

    return { total: requests.length, requests: requests.map(formatMedicineReview) };
  },

  async listCompletedMedicineReviewPoolReviews() {
    const requests = await prisma.medicineReviewRequest.findMany({
      where: {
        status: "PENDING",
        routingStatus: "POOL_REVIEW_COMPLETED",
        poolDoctorId: { not: null },
        poolDecision: { not: null },
      },
      include: medicineReviewInclude,
      orderBy: [{ poolReviewedAt: "asc" }, { createdAt: "asc" }],
      take: 100,
    });

    return { total: requests.length, requests: requests.map(formatMedicineReview) };
  },

  async releaseMedicineReviewPoolResult(requestId: string, adminId: string) {
    const request = await getCompletedPoolReviewOrThrow(requestId);
    
const poolDoctorId = request.poolDoctorId;
const decision = request.poolDecision;

if (!poolDoctorId || !decision) {
  throw new AppError("Medicine Review Doctor Pool result is incomplete.", 400);
}

const reviewedAt = request.poolReviewedAt || new Date();
const doctorNote = request.poolDoctorNote?.trim() || null;
 
  
    await prisma.$transaction(async tx => {
      const updated = await tx.medicineReviewRequest.updateMany({
        where: {
          id: request.id,
          status: "PENDING",
          routingStatus: "POOL_REVIEW_COMPLETED",
          poolDoctorId: request.poolDoctorId,
        },
        data: {
          status: decision,
          routingStatus: "RELEASED",
          reviewedByDoctorId: request.poolDoctorId,
          doctorNote,
          reviewedAt,
          releasedByAdminId: adminId,
          adminReleasedAt: new Date(),
          patientSeenAt: null,
        },
      });

      if (updated.count === 0) {
        throw new AppError("Medicine review result has already been released.", 409);
      }

      if (request.requestType === "ADD" && decision === "APPROVED") {
        await tx.medicineReminder.updateMany({
          where: { medicineId: request.medicineId },
          data: {
            reviewStatus: "APPROVED",
            reviewDoctorId: null,
            reviewedByDoctorId: request.poolDoctorId,
            reviewedAt,
            reviewNote: doctorNote,
          },
        });
      }

      if (request.requestType === "ADD" && decision === "REJECTED") {
        await tx.medicine.update({
          where: { id: request.medicineId },
          data: { isActive: false },
        });

        await tx.medicineReminder.updateMany({
          where: { medicineId: request.medicineId },
          data: {
            isActive: false,
            reviewStatus: "REJECTED",
            reviewDoctorId: null,
            reviewedByDoctorId: request.poolDoctorId,
            reviewedAt,
            reviewNote: doctorNote,
          },
        });
      }

      if (request.requestType === "DELETE" && decision === "APPROVED") {
        await tx.medicine.update({
          where: { id: request.medicineId },
          data: { isActive: false },
        });

        await tx.medicineReminder.updateMany({
          where: { medicineId: request.medicineId },
          data: { isActive: false },
        });
      }

      if (request.requestType === "ADD") {
        await medicineReviewPharmacySyncService.syncDecision(tx, {
          patientId: request.patientId,
          medicineId: request.medicineId,
          reviewerId: poolDoctorId,
          decision,
          note: doctorNote,
          reviewedAt,
        });
      }
    });

    await notifyPatientAboutReleasedPoolReview(request.id);

    const updatedRequest = await prisma.medicineReviewRequest.findUnique({
      where: { id: request.id },
      include: medicineReviewInclude,
    });

    return {
      message: "Medicine review result released to patient successfully.",
      request: updatedRequest ? formatMedicineReview(updatedRequest) : null,
    };
  },

  async listDoctorVerifications(status?: string) {
    const statusFilter = getStatusFilter(status);

    const doctors = await prisma.user.findMany({
      where: { role: "DOCTOR", accountStatus: statusFilter },
      select: doctorVerificationSelect,
      orderBy: { createdAt: "desc" },
    });

    return { status: statusFilter, doctors: doctors.map(formatDoctorVerification) };
  },

  async getDoctorVerification(userId: string) {
    const doctor = await getDoctorOrThrow(userId);
    return { doctor: formatDoctorVerification(doctor) };
  },

  async approveDoctorVerification(userId: string, input: AdminDecisionInput) {
    const doctor = await getDoctorOrThrow(userId);

    if (doctor.accountStatus === "ACTIVE") throw new AppError("Doctor account is already active", 400);
    if (doctor.accountStatus === "DISABLED") throw new AppError("Disabled doctor accounts cannot be approved", 400);

    const notes = cleanNotes(input.notes);
    const reviewedAtDate = new Date();
    const reviewedAt = reviewedAtDate.toISOString();

    const updatedDoctor = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: "ACTIVE",
        doctorProfile: {
          update: {
            verificationCheckedAt: reviewedAtDate,
            verificationNotes: notes,
          },
        },
      },
      select: doctorVerificationSelect,
    });

    await notifyAccountDecision({
      user: updatedDoctor,
      approved: true,
      adminId: input.adminId,
      notes,
      reviewedAt,
    });

    return {
      doctor: formatDoctorVerification(updatedDoctor),
      decision: {
        action: "APPROVED",
        reviewedByAdminId: input.adminId,
        notes,
        reviewedAt,
      },
    };
  },

  async rejectDoctorVerification(userId: string, input: AdminDecisionInput) {
    const doctor = await getDoctorOrThrow(userId);

    if (doctor.accountStatus === "ACTIVE") throw new AppError("Active doctor accounts cannot be rejected", 400);
    if (doctor.accountStatus === "DISABLED") throw new AppError("Disabled doctor accounts cannot be rejected", 400);

    const notes = cleanNotes(input.notes);
    const reviewedAtDate = new Date();
    const reviewedAt = reviewedAtDate.toISOString();

    const updatedDoctor = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: "REJECTED",
        doctorProfile: {
          update: {
            verificationCheckedAt: reviewedAtDate,
            verificationNotes: notes,
          },
        },
      },
      select: doctorVerificationSelect,
    });

    await notifyAccountDecision({
      user: updatedDoctor,
      approved: false,
      adminId: input.adminId,
      notes,
      reviewedAt,
    });

    return {
      doctor: formatDoctorVerification(updatedDoctor),
      decision: {
        action: "REJECTED",
        reviewedByAdminId: input.adminId,
        notes,
        reviewedAt,
      },
    };
  },

  async listPharmacyVerifications(status?: string) {
    const statusFilter = getStatusFilter(status);

    const pharmacies = await prisma.user.findMany({
      where: { role: "PHARMACY", accountStatus: statusFilter },
      select: pharmacyVerificationSelect,
      orderBy: { createdAt: "desc" },
    });

    return {
      status: statusFilter,
      pharmacies: pharmacies.map(formatPharmacyVerification),
    };
  },

  async getPharmacyVerification(userId: string) {
    const pharmacy = await getPharmacyOrThrow(userId);
    return { pharmacy: formatPharmacyVerification(pharmacy) };
  },

  async approvePharmacyVerification(userId: string, input: AdminDecisionInput) {
    const pharmacy = await getPharmacyOrThrow(userId);

    if (pharmacy.accountStatus === "ACTIVE") throw new AppError("Pharmacy account is already active", 400);
    if (pharmacy.accountStatus === "DISABLED") throw new AppError("Disabled pharmacy accounts cannot be approved", 400);

    const notes = cleanNotes(input.notes);
    const reviewedAtDate = new Date();
    const reviewedAt = reviewedAtDate.toISOString();

    const updatedPharmacy = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: "ACTIVE",
        pharmacyProfile: {
          update: {
            verificationCheckedAt: reviewedAtDate,
            verificationNotes: notes,
          },
        },
      },
      select: pharmacyVerificationSelect,
    });

    await notifyAccountDecision({
      user: updatedPharmacy,
      approved: true,
      adminId: input.adminId,
      notes,
      reviewedAt,
    });

    return {
      pharmacy: formatPharmacyVerification(updatedPharmacy),
      decision: {
        action: "APPROVED",
        reviewedByAdminId: input.adminId,
        notes,
        reviewedAt,
      },
    };
  },

  async rejectPharmacyVerification(userId: string, input: AdminDecisionInput) {
    const pharmacy = await getPharmacyOrThrow(userId);

    if (pharmacy.accountStatus === "ACTIVE") throw new AppError("Active pharmacy accounts cannot be rejected", 400);
    if (pharmacy.accountStatus === "DISABLED") throw new AppError("Disabled pharmacy accounts cannot be rejected", 400);

    const notes = cleanNotes(input.notes);
    const reviewedAtDate = new Date();
    const reviewedAt = reviewedAtDate.toISOString();

    const updatedPharmacy = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: "REJECTED",
        pharmacyProfile: {
          update: {
            verificationCheckedAt: reviewedAtDate,
            verificationNotes: notes,
          },
        },
      },
      select: pharmacyVerificationSelect,
    });

    await notifyAccountDecision({
      user: updatedPharmacy,
      approved: false,
      adminId: input.adminId,
      notes,
      reviewedAt,
    });

    return {
      pharmacy: formatPharmacyVerification(updatedPharmacy),
      decision: {
        action: "REJECTED",
        reviewedByAdminId: input.adminId,
        notes,
        reviewedAt,
      },
    };
  },

  async listUsers() {
    const users = await prisma.user.findMany({
      select: userListSelect,
      orderBy: { createdAt: "desc" },
    });

    return { users };
  },

  async suspendUser(userId: string, adminId: string) {
    if (userId === adminId) throw new AppError("You cannot suspend your own admin account", 400);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userListSelect,
    });

    if (!user) throw new AppError("User not found", 404);
    if (user.role === "ADMIN") throw new AppError("Admin accounts cannot be suspended using this workflow", 400);
    if (user.accountStatus === "DISABLED") throw new AppError("User is already disabled", 400);

    if (user.accountStatus !== "ACTIVE" && user.accountStatus !== "APPROVED") {
      throw new AppError("Only active accounts can be suspended", 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { accountStatus: "DISABLED" },
      select: userListSelect,
    });

    return { user: updatedUser };
  },

  async reactivateUser(userId: string, adminId: string) {
    if (userId === adminId) throw new AppError("Your admin account is already active", 400);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userListSelect,
    });

    if (!user) throw new AppError("User not found", 404);
    if (user.role === "ADMIN") throw new AppError("Admin accounts cannot be reactivated using this workflow", 400);
    if (user.accountStatus !== "DISABLED") throw new AppError("Only disabled accounts can be reactivated", 400);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { accountStatus: "ACTIVE" },
      select: userListSelect,
    });

    return { user: updatedUser };
  },
};