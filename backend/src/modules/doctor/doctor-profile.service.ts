import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

type DoctorOperationalStatusValue = "AVAILABLE" | "OUT_OF_OFFICE" | "UNAVAILABLE";

const getEffectiveOperationalStatus = (profile: any): DoctorOperationalStatusValue => {
  const configuredStatus = (profile?.operationalStatus || "AVAILABLE") as DoctorOperationalStatusValue;
  if (configuredStatus === "AVAILABLE") return "AVAILABLE";

  const now = new Date();
  if (profile?.statusFrom && new Date(profile.statusFrom).getTime() > now.getTime()) return "AVAILABLE";
  if (profile?.statusUntil && new Date(profile.statusUntil).getTime() < now.getTime()) return "AVAILABLE";

  return configuredStatus;
};

export const doctorProfileService = {
  async getProfile(doctorId: string) {
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        accountStatus: true,
        isEmailVerified: true,
        doctorProfile: {
          select: {
            phoneNumber: true,
            gmcNumber: true,
            specialization: true,
            clinicName: true,
            clinicAddress: true,
            yearsExperience: true,
            bio: true,
            operationalStatus: true,
            statusFrom: true,
            statusUntil: true,
            statusNote: true,
          },
        },
      },
    });

    if (!doctor) throw new AppError("Doctor not found", 404);
    if (doctor.role !== "DOCTOR") throw new AppError("Only doctors can access this resource", 403);
    if (!doctor.isEmailVerified) throw new AppError("Please verify your email first", 403);
    if (doctor.accountStatus !== "ACTIVE" && doctor.accountStatus !== "APPROVED") throw new AppError("Doctor account is not approved yet", 403);
    if (!doctor.doctorProfile) throw new AppError("Doctor profile not found", 404);

    return {
      doctor: {
        id: doctor.id,
        fullName: doctor.fullName,
        email: doctor.email,
        accountStatus: doctor.accountStatus,
        isEmailVerified: doctor.isEmailVerified,
        phoneNumber: doctor.doctorProfile.phoneNumber,
        gmcNumber: doctor.doctorProfile.gmcNumber,
        specialization: doctor.doctorProfile.specialization,
        clinicName: doctor.doctorProfile.clinicName,
        clinicAddress: doctor.doctorProfile.clinicAddress,
        yearsExperience: doctor.doctorProfile.yearsExperience,
        bio: doctor.doctorProfile.bio,
        operationalStatus: {
          configuredStatus: doctor.doctorProfile.operationalStatus || "AVAILABLE",
          effectiveStatus: getEffectiveOperationalStatus(doctor.doctorProfile),
          statusFrom: doctor.doctorProfile.statusFrom,
          statusUntil: doctor.doctorProfile.statusUntil,
          statusNote: doctor.doctorProfile.statusNote,
        },
      },
    };
  },
};