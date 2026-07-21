import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

const getFirstName = (fullName: string) => {
  return fullName.trim().split(" ")[0] || fullName;
};

const formatDateOfBirth = (value?: Date | null) => {
  if (!value) return null;

  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const year = value.getUTCFullYear();

  return `${day}/${month}/${year}`;
};

const formatGender = (value?: string | null) => {
  if (!value) return null;

  if (value === "MALE") return "Male";
  if (value === "FEMALE") return "Female";
  if (value === "OTHER") return "Other";
  if (value === "PREFER_NOT_TO_SAY") return "Prefer not to say";

  return value;
};

export const profileService = {
  async getPatientProfile(patientId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: patientId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        accountStatus: true,
        isEmailVerified: true,
        createdAt: true,
        patientProfile: {
          select: {
            phoneNumber: true,
            dateOfBirth: true,
            gender: true,
            medicalConditions: true,
            emergencyContact: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError("Patient not found", 404);
    }

    if (user.role !== "PATIENT") {
      throw new AppError("Only patients can access this profile", 403);
    }

    return {
      patient: {
        id: user.id,
        fullName: user.fullName,
        firstName: getFirstName(user.fullName),
        email: user.email,
        phoneNumber: user.patientProfile?.phoneNumber || null,
        dateOfBirth: formatDateOfBirth(user.patientProfile?.dateOfBirth),
        gender: formatGender(user.patientProfile?.gender),
        medicalConditions: user.patientProfile?.medicalConditions || null,
        emergencyContact: user.patientProfile?.emergencyContact || null,
        accountStatus: user.accountStatus,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },

      linkedUsers: {
        doctor: null,
        caregiver: null,
      },
    };
  },
};