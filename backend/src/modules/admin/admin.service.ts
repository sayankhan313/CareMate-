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

const getStatusFilter = (status?: string) => {
  if (status && allowedStatusFilters.has(status as VerificationStatusFilter)) {
    return status as VerificationStatusFilter;
  }

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

const cleanNotes = (notes?: string) => {
  const trimmedNotes = notes?.trim();

  if (!trimmedNotes) {
    return null;
  }

  return trimmedNotes;
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
          verificationCheckedAt: doctor.doctorProfile.verificationCheckedAt,
          verificationNotes: doctor.doctorProfile.verificationNotes,
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

const formatPharmacyVerification = (pharmacy: any) => {
  return {
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
          notifyStatusReminders:
            pharmacy.pharmacyProfile.notifyStatusReminders,
          notifyDelayedOrders: pharmacy.pharmacyProfile.notifyDelayedOrders,
          verificationCheckedAt:
            pharmacy.pharmacyProfile.verificationCheckedAt,
          verificationNotes: pharmacy.pharmacyProfile.verificationNotes,
        }
      : null,

    documents: pharmacy.pharmacyProfile
      ? {
          licenseDocumentUrl: pharmacy.pharmacyProfile.licenseDocumentUrl,
          addressProofDocumentUrl:
            pharmacy.pharmacyProfile.addressProofDocumentUrl,
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

  if (!doctor.doctorProfile) {
    throw new AppError("Doctor verification profile not found", 404);
  }

  return doctor;
};

const getPharmacyOrThrow = async (userId: string) => {
  const pharmacy = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: pharmacyVerificationSelect,
  });

  if (!pharmacy) {
    throw new AppError("Pharmacy verification request not found", 404);
  }

  if (pharmacy.role !== "PHARMACY") {
    throw new AppError("This user is not a pharmacy", 400);
  }

  if (!pharmacy.pharmacyProfile) {
    throw new AppError("Pharmacy verification profile not found", 404);
  }

  return pharmacy;
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
          role: "PHARMACY",
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
          role: "PHARMACY",
          accountStatus: "ACTIVE",
        },
      }),
      prisma.user.count({
        where: {
          role: "PHARMACY",
          accountStatus: "REJECTED",
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
      prisma.user.findMany({
        where: {
          role: "PHARMACY",
          accountStatus: "PENDING_VERIFICATION",
        },
        select: pharmacyVerificationSelect,
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
        totalPharmacies,
        pendingDoctors,
        approvedDoctors,
        rejectedDoctors,
        pendingPharmacies,
        approvedPharmacies,
        rejectedPharmacies,
        disabledUsers,
      },
      recentDoctorVerifications: recentDoctorVerifications.map(
        formatDoctorVerification
      ),
      recentPharmacyVerifications: recentPharmacyVerifications.map(
        formatPharmacyVerification
      ),
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

  async listDoctorVerifications(status?: string) {
    const statusFilter = getStatusFilter(status);

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

    const notes = cleanNotes(input.notes);

    const updatedDoctor = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        accountStatus: "ACTIVE",
        doctorProfile: {
          update: {
            verificationCheckedAt: new Date(),
            verificationNotes: notes,
          },
        },
      },
      select: doctorVerificationSelect,
    });

    return {
      doctor: formatDoctorVerification(updatedDoctor),
      decision: {
        action: "APPROVED",
        reviewedByAdminId: input.adminId,
        notes,
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

    const notes = cleanNotes(input.notes);

    const updatedDoctor = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        accountStatus: "REJECTED",
        doctorProfile: {
          update: {
            verificationCheckedAt: new Date(),
            verificationNotes: notes,
          },
        },
      },
      select: doctorVerificationSelect,
    });

    return {
      doctor: formatDoctorVerification(updatedDoctor),
      decision: {
        action: "REJECTED",
        reviewedByAdminId: input.adminId,
        notes,
        reviewedAt: new Date().toISOString(),
      },
    };
  },

  async listPharmacyVerifications(status?: string) {
    const statusFilter = getStatusFilter(status);

    const pharmacies = await prisma.user.findMany({
      where: {
        role: "PHARMACY",
        accountStatus: statusFilter,
      },
      select: pharmacyVerificationSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      status: statusFilter,
      pharmacies: pharmacies.map(formatPharmacyVerification),
    };
  },

  async getPharmacyVerification(userId: string) {
    const pharmacy = await getPharmacyOrThrow(userId);

    return {
      pharmacy: formatPharmacyVerification(pharmacy),
    };
  },

  async approvePharmacyVerification(
    userId: string,
    input: AdminDecisionInput
  ) {
    const pharmacy = await getPharmacyOrThrow(userId);

    if (pharmacy.accountStatus === "ACTIVE") {
      throw new AppError("Pharmacy account is already active", 400);
    }

    if (pharmacy.accountStatus === "DISABLED") {
      throw new AppError("Disabled pharmacy accounts cannot be approved", 400);
    }

    const notes = cleanNotes(input.notes);

    const updatedPharmacy = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        accountStatus: "ACTIVE",
        pharmacyProfile: {
          update: {
            verificationCheckedAt: new Date(),
            verificationNotes: notes,
          },
        },
      },
      select: pharmacyVerificationSelect,
    });

    return {
      pharmacy: formatPharmacyVerification(updatedPharmacy),
      decision: {
        action: "APPROVED",
        reviewedByAdminId: input.adminId,
        notes,
        reviewedAt: new Date().toISOString(),
      },
    };
  },

  async rejectPharmacyVerification(userId: string, input: AdminDecisionInput) {
    const pharmacy = await getPharmacyOrThrow(userId);

    if (pharmacy.accountStatus === "ACTIVE") {
      throw new AppError("Active pharmacy accounts cannot be rejected", 400);
    }

    if (pharmacy.accountStatus === "DISABLED") {
      throw new AppError("Disabled pharmacy accounts cannot be rejected", 400);
    }

    const notes = cleanNotes(input.notes);

    const updatedPharmacy = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        accountStatus: "REJECTED",
        pharmacyProfile: {
          update: {
            verificationCheckedAt: new Date(),
            verificationNotes: notes,
          },
        },
      },
      select: pharmacyVerificationSelect,
    });

    return {
      pharmacy: formatPharmacyVerification(updatedPharmacy),
      decision: {
        action: "REJECTED",
        reviewedByAdminId: input.adminId,
        notes,
        reviewedAt: new Date().toISOString(),
      },
    };
  },
};