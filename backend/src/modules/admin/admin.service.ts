import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";

type VerificationStatusFilter = "PENDING_VERIFICATION" | "ACTIVE" | "APPROVED" | "REJECTED" | "DISABLED";
type AdminDecisionInput = { adminId: string; notes?: string };

const allowedStatusFilters = new Set<VerificationStatusFilter>(["PENDING_VERIFICATION", "ACTIVE", "APPROVED", "REJECTED", "DISABLED"]);

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

const getStatusFilter = (status?: string): VerificationStatusFilter => {
  if (status && allowedStatusFilters.has(status as VerificationStatusFilter)) return status as VerificationStatusFilter;
  return "PENDING_VERIFICATION";
};

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
  profile: null,
  documents: null,
});

const getDoctorOrThrow = async (userId: string) => {
  const doctor = await prisma.user.findUnique({ where: { id: userId }, select: doctorVerificationSelect });
  if (!doctor) throw new AppError("Doctor verification request not found", 404);
  if (doctor.role !== "DOCTOR") throw new AppError("This user is not a doctor", 400);
  return doctor;
};

const getPharmacyOrThrow = async (userId: string) => {
  const pharmacy = await prisma.user.findUnique({ where: { id: userId }, select: pharmacyVerificationSelect });
  if (!pharmacy) throw new AppError("Pharmacy verification request not found", 404);
  if (pharmacy.role !== "PHARMACY") throw new AppError("This user is not a pharmacy account", 400);
  return pharmacy;
};

const cleanNotes = (notes?: string) => notes?.trim() || null;

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
      },
      recentDoctorVerifications: recentDoctorVerifications.map(formatDoctorVerification),
      recentPharmacyVerifications: recentPharmacyVerifications.map(formatPharmacyVerification),
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

    const updatedDoctor = await prisma.user.update({
      where: { id: userId },
      data: { accountStatus: "ACTIVE" },
      select: doctorVerificationSelect,
    });

    const reviewedAt = new Date().toISOString();
    const notes = cleanNotes(input.notes);

    await notifyAccountDecision({ user: updatedDoctor, approved: true, adminId: input.adminId, notes, reviewedAt });

    return {
      doctor: formatDoctorVerification(updatedDoctor),
      decision: { action: "APPROVED", reviewedByAdminId: input.adminId, notes, reviewedAt },
    };
  },

  async rejectDoctorVerification(userId: string, input: AdminDecisionInput) {
    const doctor = await getDoctorOrThrow(userId);
    if (doctor.accountStatus === "ACTIVE") throw new AppError("Active doctor accounts cannot be rejected", 400);
    if (doctor.accountStatus === "DISABLED") throw new AppError("Disabled doctor accounts cannot be rejected", 400);

    const updatedDoctor = await prisma.user.update({
      where: { id: userId },
      data: { accountStatus: "REJECTED" },
      select: doctorVerificationSelect,
    });

    const reviewedAt = new Date().toISOString();
    const notes = cleanNotes(input.notes);

    await notifyAccountDecision({ user: updatedDoctor, approved: false, adminId: input.adminId, notes, reviewedAt });

    return {
      doctor: formatDoctorVerification(updatedDoctor),
      decision: { action: "REJECTED", reviewedByAdminId: input.adminId, notes, reviewedAt },
    };
  },

  async listPharmacyVerifications(status?: string) {
    const statusFilter = getStatusFilter(status);

    const pharmacies = await prisma.user.findMany({
      where: { role: "PHARMACY", accountStatus: statusFilter },
      select: pharmacyVerificationSelect,
      orderBy: { createdAt: "desc" },
    });

    return { status: statusFilter, pharmacies: pharmacies.map(formatPharmacyVerification) };
  },

  async getPharmacyVerification(userId: string) {
    const pharmacy = await getPharmacyOrThrow(userId);
    return { pharmacy: formatPharmacyVerification(pharmacy) };
  },

  async approvePharmacyVerification(userId: string, input: AdminDecisionInput) {
    const pharmacy = await getPharmacyOrThrow(userId);
    if (pharmacy.accountStatus === "ACTIVE") throw new AppError("Pharmacy account is already active", 400);
    if (pharmacy.accountStatus === "DISABLED") throw new AppError("Disabled pharmacy accounts cannot be approved", 400);

    const updatedPharmacy = await prisma.user.update({
      where: { id: userId },
      data: { accountStatus: "ACTIVE" },
      select: pharmacyVerificationSelect,
    });

    const reviewedAt = new Date().toISOString();
    const notes = cleanNotes(input.notes);

    await notifyAccountDecision({ user: updatedPharmacy, approved: true, adminId: input.adminId, notes, reviewedAt });

    return {
      pharmacy: formatPharmacyVerification(updatedPharmacy),
      decision: { action: "APPROVED", reviewedByAdminId: input.adminId, notes, reviewedAt },
    };
  },

  async rejectPharmacyVerification(userId: string, input: AdminDecisionInput) {
    const pharmacy = await getPharmacyOrThrow(userId);
    if (pharmacy.accountStatus === "ACTIVE") throw new AppError("Active pharmacy accounts cannot be rejected", 400);
    if (pharmacy.accountStatus === "DISABLED") throw new AppError("Disabled pharmacy accounts cannot be rejected", 400);

    const updatedPharmacy = await prisma.user.update({
      where: { id: userId },
      data: { accountStatus: "REJECTED" },
      select: pharmacyVerificationSelect,
    });

    const reviewedAt = new Date().toISOString();
    const notes = cleanNotes(input.notes);

    await notifyAccountDecision({ user: updatedPharmacy, approved: false, adminId: input.adminId, notes, reviewedAt });

    return {
      pharmacy: formatPharmacyVerification(updatedPharmacy),
      decision: { action: "REJECTED", reviewedByAdminId: input.adminId, notes, reviewedAt },
    };
  },

  async listUsers() {
    const users = await prisma.user.findMany({ select: userListSelect, orderBy: { createdAt: "desc" } });
    return { users };
  },

  async suspendUser(userId: string, adminId: string) {
    if (userId === adminId) throw new AppError("You cannot suspend your own admin account", 400);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: userListSelect });
    if (!user) throw new AppError("User not found", 404);
    if (user.accountStatus === "DISABLED") throw new AppError("User is already disabled", 400);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { accountStatus: "DISABLED" },
      select: userListSelect,
    });

    return { user: updatedUser };
  },
};