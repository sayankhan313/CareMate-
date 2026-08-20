import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

const caregiverSelect = { id: true, fullName: true, email: true, role: true, accountStatus: true, isEmailVerified: true } as const;

const getRelationship = async (patientId: string, relationshipId: string) => {
  const relationship = await prisma.patientCaregiverRelationship.findFirst({
    where: { id: relationshipId, patientId },
    include: { caregiver: { select: caregiverSelect } },
  });

  if (!relationship) throw new AppError("Caregiver relationship not found", 404);
  return relationship;
};

const formatRelationship = (relationship: Awaited<ReturnType<typeof getRelationship>>) => ({
  id: relationship.id,
  patientId: relationship.patientId,
  caregiverId: relationship.caregiverId,
  status: relationship.status,
  requestedAt: relationship.requestedAt,
  approvedAt: relationship.approvedAt,
  rejectedAt: relationship.rejectedAt,
  revokedAt: relationship.revokedAt,
  createdAt: relationship.createdAt,
  updatedAt: relationship.updatedAt,
  caregiver: { id: relationship.caregiver.id, fullName: relationship.caregiver.fullName, email: relationship.caregiver.email },
});

export const patientCaregiverService = {
  async listRelationships(patientId: string) {
    const relationships = await prisma.patientCaregiverRelationship.findMany({
      where: { patientId },
      include: { caregiver: { select: caregiverSelect } },
      orderBy: { requestedAt: "desc" },
    });

    const formatted = relationships.map(relationship => ({
      id: relationship.id,
      patientId: relationship.patientId,
      caregiverId: relationship.caregiverId,
      status: relationship.status,
      requestedAt: relationship.requestedAt,
      approvedAt: relationship.approvedAt,
      rejectedAt: relationship.rejectedAt,
      revokedAt: relationship.revokedAt,
      createdAt: relationship.createdAt,
      updatedAt: relationship.updatedAt,
      caregiver: { id: relationship.caregiver.id, fullName: relationship.caregiver.fullName, email: relationship.caregiver.email },
    }));

    return {
      pendingRequests: formatted.filter(item => item.status === "PENDING"),
      activeCaregivers: formatted.filter(item => item.status === "ACTIVE"),
      history: formatted.filter(item => item.status === "REJECTED" || item.status === "REVOKED"),
    };
  },

  async approveRelationship(patientId: string, relationshipId: string) {
    const relationship = await getRelationship(patientId, relationshipId);

    if (relationship.status !== "PENDING") throw new AppError("Only pending caregiver requests can be approved", 409);
    if (relationship.caregiver.role !== "CAREGIVER") throw new AppError("This account is not a caregiver", 409);
    if (!relationship.caregiver.isEmailVerified) throw new AppError("Caregiver email is not verified", 409);
    if (relationship.caregiver.accountStatus !== "ACTIVE" && relationship.caregiver.accountStatus !== "APPROVED") {
      throw new AppError("Caregiver account is not active", 409);
    }

    const changed = await prisma.patientCaregiverRelationship.updateMany({
      where: { id: relationship.id, patientId, status: "PENDING" },
      data: { status: "ACTIVE", approvedAt: new Date(), rejectedAt: null, revokedAt: null },
    });

    if (changed.count === 0) throw new AppError("Caregiver request status changed. Please refresh and try again", 409);

    return formatRelationship(await getRelationship(patientId, relationshipId));
  },

  async rejectRelationship(patientId: string, relationshipId: string) {
    const relationship = await getRelationship(patientId, relationshipId);
    if (relationship.status !== "PENDING") throw new AppError("Only pending caregiver requests can be rejected", 409);

    const changed = await prisma.patientCaregiverRelationship.updateMany({
      where: { id: relationship.id, patientId, status: "PENDING" },
      data: { status: "REJECTED", rejectedAt: new Date(), approvedAt: null, revokedAt: null },
    });

    if (changed.count === 0) throw new AppError("Caregiver request status changed. Please refresh and try again", 409);

    return formatRelationship(await getRelationship(patientId, relationshipId));
  },

  async revokeRelationship(patientId: string, relationshipId: string) {
    const relationship = await getRelationship(patientId, relationshipId);
    if (relationship.status !== "ACTIVE") throw new AppError("Only active caregiver access can be revoked", 409);

    const changed = await prisma.patientCaregiverRelationship.updateMany({
      where: { id: relationship.id, patientId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    if (changed.count === 0) throw new AppError("Caregiver relationship status changed. Please refresh and try again", 409);

    return formatRelationship(await getRelationship(patientId, relationshipId));
  },
};