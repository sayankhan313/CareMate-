import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { CaregiverLinkRequestInput } from "./caregiver-relationship.validation.js";

const ensureCaregiver = async (caregiverId: string) => {
  const caregiver = await prisma.user.findUnique({
    where: { id: caregiverId },
    select: { id: true, role: true, accountStatus: true, isEmailVerified: true },
  });

  if (!caregiver) throw new AppError("Caregiver account not found", 404);
  if (caregiver.role !== "CAREGIVER") throw new AppError("Only caregivers can access this resource", 403);
  if (!caregiver.isEmailVerified) throw new AppError("Please verify your email first", 403);
  if (caregiver.accountStatus !== "ACTIVE" && caregiver.accountStatus !== "APPROVED") throw new AppError("Caregiver account is not active", 403);

  return caregiver;
};

const getAvailablePatient = async (email: string) => {
  const patient = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase(), role: "PATIENT", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } },
    select: { id: true, fullName: true, email: true },
  });

  if (!patient) throw new AppError("Patient account not found or unavailable", 404);
  return patient;
};

const isPrismaErrorCode = (error: unknown, code: string) =>
  Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === code);

export const caregiverRelationshipService = {
  async requestLink(caregiverId: string, input: CaregiverLinkRequestInput) {
    await ensureCaregiver(caregiverId);
    const patient = await getAvailablePatient(input.patientEmail);

    const existing = await prisma.patientCaregiverRelationship.findUnique({
      where: { patientId_caregiverId: { patientId: patient.id, caregiverId } },
      select: { id: true, status: true },
    });

    if (existing?.status === "ACTIVE") throw new AppError("You are already linked to this patient", 409);
    if (existing?.status === "PENDING") throw new AppError("A caregiver link request is already pending for this patient", 409);

    let relationship;

    if (existing) {
      const changed = await prisma.patientCaregiverRelationship.updateMany({
        where: { id: existing.id, patientId: patient.id, caregiverId, status: { in: ["REJECTED", "REVOKED"] } },
        data: { status: "PENDING", requestedAt: new Date(), approvedAt: null, rejectedAt: null, revokedAt: null },
      });

      if (changed.count === 0) throw new AppError("Caregiver relationship status changed. Please refresh and try again", 409);

      relationship = await prisma.patientCaregiverRelationship.findUniqueOrThrow({
        where: { id: existing.id },
        select: { id: true, patientId: true, caregiverId: true, status: true, requestedAt: true, createdAt: true, updatedAt: true },
      });
    } else {
      try {
        relationship = await prisma.patientCaregiverRelationship.create({
          data: { patientId: patient.id, caregiverId },
          select: { id: true, patientId: true, caregiverId: true, status: true, requestedAt: true, createdAt: true, updatedAt: true },
        });
      } catch (error) {
        if (isPrismaErrorCode(error, "P2002")) throw new AppError("A caregiver link request already exists for this patient", 409);
        throw error;
      }
    }

    return { relationship, patient: { id: patient.id, fullName: patient.fullName, email: patient.email } };
  },
};