import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { UpdatePatientProfileInput } from "./profile.validation.js";

const getFirstName = (fullName: string) => fullName.trim().split(" ")[0] || fullName;

const formatDateOfBirth = (value?: Date | null) => {
  if (!value) return null;
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${value.getUTCFullYear()}`;
};

const formatGender = (value?: string | null) => {
  if (!value) return null;
  if (value === "MALE") return "Male";
  if (value === "FEMALE") return "Female";
  if (value === "OTHER") return "Other";
  if (value === "PREFER_NOT_TO_SAY") return "Prefer not to say";
  return value;
};

const parseDateOfBirth = (value: string) => {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const normalizeNullableValue = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value.trim() || null;
};

const getPatientProfileRecord = async (patientId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: patientId },
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
          healthRecordNumber: true,
          medicalConditions: true,
          allergies: true,
          bloodGroup: true,
          addressLine: true,
          postcode: true,
          emergencyContact: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
        },
      },
      patientCaregiverRelationships: {
        where: {
          status: "ACTIVE",
          caregiver: { is: { role: "CAREGIVER", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
        },
        select: {
          id: true,
          approvedAt: true,
          caregiver: { select: { id: true, fullName: true } },
        },
        orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
  });

  if (!user) throw new AppError("Patient not found", 404);
  if (user.role !== "PATIENT") throw new AppError("Only patients can access this profile", 403);
  return user;
};

const formatProfileResponse = (user: Awaited<ReturnType<typeof getPatientProfileRecord>>) => {
  const caregiverRelationship = user.patientCaregiverRelationships[0];

  return {
    patient: {
      id: user.id,
      fullName: user.fullName,
      firstName: getFirstName(user.fullName),
      email: user.email,
      phoneNumber: user.patientProfile?.phoneNumber || null,
      dateOfBirth: formatDateOfBirth(user.patientProfile?.dateOfBirth),
      gender: formatGender(user.patientProfile?.gender),
      healthRecordNumber: user.patientProfile?.healthRecordNumber || null,
      medicalConditions: user.patientProfile?.medicalConditions || null,
      allergies: user.patientProfile?.allergies || null,
      bloodGroup: user.patientProfile?.bloodGroup || null,
      addressLine: user.patientProfile?.addressLine || null,
      postcode: user.patientProfile?.postcode || null,
      emergencyContact: user.patientProfile?.emergencyContact || null,
      emergencyContactName: user.patientProfile?.emergencyContactName || null,
      emergencyContactPhone: user.patientProfile?.emergencyContactPhone || null,
      accountStatus: user.accountStatus,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    },
    linkedUsers: {
      doctor: null,
      caregiver: caregiverRelationship
        ? {
            id: caregiverRelationship.caregiver.id,
            fullName: caregiverRelationship.caregiver.fullName,
            relationship: "ACTIVE",
          }
        : null,
    },
  };
};

export const profileService = {
  async getPatientProfile(patientId: string) {
    const user = await getPatientProfileRecord(patientId);
    return formatProfileResponse(user);
  },

  async updatePatientProfile(patientId: string, input: UpdatePatientProfileInput) {
    const existingUser = await prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, role: true, patientProfile: { select: { id: true, emergencyContact: true } } },
    });

    if (!existingUser) throw new AppError("Patient not found", 404);
    if (existingUser.role !== "PATIENT") throw new AppError("Only patients can update this profile", 403);
    if (!existingUser.patientProfile) throw new AppError("Patient profile record was not found", 404);

    if (input.healthRecordNumber) {
      const duplicateRecord = await prisma.patientProfile.findFirst({
        where: { healthRecordNumber: input.healthRecordNumber, userId: { not: patientId } },
        select: { id: true },
      });

      if (duplicateRecord) throw new AppError("This NHS or health record number is already registered", 409);
    }

    const fallbackEmergencyContact =
      input.emergencyContactName !== undefined || input.emergencyContactPhone !== undefined
        ? [normalizeNullableValue(input.emergencyContactName), normalizeNullableValue(input.emergencyContactPhone)].filter(Boolean).join(" - ") || existingUser.patientProfile.emergencyContact
        : existingUser.patientProfile.emergencyContact;

    try {
      await prisma.$transaction(async tx => {
        if (input.fullName !== undefined) await tx.user.update({ where: { id: patientId }, data: { fullName: input.fullName } });

        await tx.patientProfile.update({
          where: { userId: patientId },
          data: {
            phoneNumber: input.phoneNumber,
            dateOfBirth: input.dateOfBirth !== undefined ? parseDateOfBirth(input.dateOfBirth) : undefined,
            gender: input.gender,
            healthRecordNumber: normalizeNullableValue(input.healthRecordNumber),
            medicalConditions: normalizeNullableValue(input.medicalConditions),
            allergies: normalizeNullableValue(input.allergies),
            bloodGroup: normalizeNullableValue(input.bloodGroup),
            addressLine: normalizeNullableValue(input.addressLine),
            postcode: normalizeNullableValue(input.postcode),
            emergencyContact: fallbackEmergencyContact,
            emergencyContactName: normalizeNullableValue(input.emergencyContactName),
            emergencyContactPhone: normalizeNullableValue(input.emergencyContactPhone),
          },
        });
      });
    } catch (error: any) {
      if (error?.code === "P2002") throw new AppError("This NHS or health record number is already registered", 409);
      throw error;
    }

    const updatedUser = await getPatientProfileRecord(patientId);
    return formatProfileResponse(updatedUser);
  },
};