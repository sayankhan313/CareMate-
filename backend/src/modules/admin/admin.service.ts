import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

type VerificationStatusFilter =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "APPROVED"
  | "REJECTED"
  | "DISABLED";

type AdminDecisionInput = {
  adminId: string;
  notes?: string;
};

const allowedStatusFilters = new Set<VerificationStatusFilter>([
  "PENDING_VERIFICATION",
  "ACTIVE",
  "APPROVED",
  "REJECTED",
  "DISABLED",
]);

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

const formatDoctorVerification = (doctor: any) => {
  return {
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
          qualificationDocumentUrl:
            doctor.doctorProfile.qualificationDocumentUrl,
        }
      : null,
  };
};

const getDoctorOrThrow = async (userId: string) => {
  const doctor = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: doctorVerificationSelect,
  });

  if (!doctor) {
    throw new AppError("Doctor verification request not found", 404);
  }

  if (doctor.role !== "DOCTOR") {
    throw new AppError("This user is not a doctor", 400);
  }

  return doctor;
};

const cleanNotes = (notes?: string) => {
  const trimmedNotes = notes?.trim();

  if (!trimmedNotes) {
    return null;
  }

  return trimmedNotes;
};

export const adminService = {
  async getDashboard() {
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      pendingDoctors,
      approvedDoctors,
      rejectedDoctors,
      pendingPharmacies,
      disabledUsers,
      recentDoctorVerifications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          role: "PATIENT",
        },
      }),
      prisma.user.count({
        where: {
          role: "DOCTOR",
        },
      }),
      prisma.user.count({
        where: {
          role: "DOCTOR",
          accountStatus: "PENDING_VERIFICATION",
        },
      }),
      prisma.user.count({
        where: {
          role: "DOCTOR",
          accountStatus: "ACTIVE",
        },
      }),
      prisma.user.count({
        where: {
          role: "DOCTOR",
          accountStatus: "REJECTED",
        },
      }),
      prisma.user.count({
        where: {
          role: "PHARMACY",
          accountStatus: "PENDING_VERIFICATION",
        },
      }),
      prisma.user.count({
        where: {
          accountStatus: "DISABLED",
        },
      }),
      prisma.user.findMany({
        where: {
          role: "DOCTOR",
          accountStatus: "PENDING_VERIFICATION",
        },
        select: doctorVerificationSelect,
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
    ]);

    return {
      stats: {
        totalUsers,
        totalPatients,
        totalDoctors,
        pendingDoctors,
        approvedDoctors,
        rejectedDoctors,
        pendingPharmacies,
        disabledUsers,
      },
      recentDoctorVerifications: recentDoctorVerifications.map(
        formatDoctorVerification
      ),
    };
  },

  async listDoctorVerifications(status?: string) {
    const statusFilter =
      status && allowedStatusFilters.has(status as VerificationStatusFilter)
        ? (status as VerificationStatusFilter)
        : "PENDING_VERIFICATION";

    const doctors = await prisma.user.findMany({
      where: {
        role: "DOCTOR",
        accountStatus: statusFilter,
      },
      select: doctorVerificationSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      status: statusFilter,
      doctors: doctors.map(formatDoctorVerification),
    };
  },

  async getDoctorVerification(userId: string) {
    const doctor = await getDoctorOrThrow(userId);

    return {
      doctor: formatDoctorVerification(doctor),
    };
  },

  async approveDoctorVerification(userId: string, input: AdminDecisionInput) {
    const doctor = await getDoctorOrThrow(userId);

    if (doctor.accountStatus === "ACTIVE") {
      throw new AppError("Doctor account is already active", 400);
    }

    if (doctor.accountStatus === "DISABLED") {
      throw new AppError("Disabled doctor accounts cannot be approved", 400);
    }

    const updatedDoctor = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        accountStatus: "ACTIVE",
      },
      select: doctorVerificationSelect,
    });

    return {
      doctor: formatDoctorVerification(updatedDoctor),
      decision: {
        action: "APPROVED",
        reviewedByAdminId: input.adminId,
        notes: cleanNotes(input.notes),
        reviewedAt: new Date().toISOString(),
      },
    };
  },

  async rejectDoctorVerification(userId: string, input: AdminDecisionInput) {
    const doctor = await getDoctorOrThrow(userId);

    if (doctor.accountStatus === "ACTIVE") {
      throw new AppError("Active doctor accounts cannot be rejected", 400);
    }

    if (doctor.accountStatus === "DISABLED") {
      throw new AppError("Disabled doctor accounts cannot be rejected", 400);
    }

    const updatedDoctor = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        accountStatus: "REJECTED",
      },
      select: doctorVerificationSelect,
    });

    return {
      doctor: formatDoctorVerification(updatedDoctor),
      decision: {
        action: "REJECTED",
        reviewedByAdminId: input.adminId,
        notes: cleanNotes(input.notes),
        reviewedAt: new Date().toISOString(),
      },
    };
  },

  async listUsers() {
    const users = await prisma.user.findMany({
      select: userListSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      users,
    };
  },

  async suspendUser(userId: string, adminId: string) {
    if (userId === adminId) {
      throw new AppError("You cannot suspend your own admin account", 400);
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: userListSelect,
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.accountStatus === "DISABLED") {
      throw new AppError("User is already disabled", 400);
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        accountStatus: "DISABLED",
      },
      select: userListSelect,
    });

    return {
      user: updatedUser,
    };
  },
};