import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

const patientSelect = { id: true, fullName: true, email: true, accountStatus: true, isEmailVerified: true } as const;

const ensureLinkedPatient = async (caregiverId: string, patientId: string) => {
  const relationship = await prisma.patientCaregiverRelationship.findFirst({
    where: {
      caregiverId,
      patientId,
      status: "ACTIVE",
      caregiver: { is: { role: "CAREGIVER", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
      patient: { is: { role: "PATIENT", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
    },
    include: { patient: { select: patientSelect } },
  });

  if (!relationship) throw new AppError("You are not authorised to access this patient", 403);
  return relationship;
};

export const caregiverPatientsService = {
  async listLinkedPatients(caregiverId: string) {
    const relationships = await prisma.patientCaregiverRelationship.findMany({
      where: {
        caregiverId,
        status: "ACTIVE",
        caregiver: { is: { role: "CAREGIVER", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
        patient: { is: { role: "PATIENT", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
      },
      include: { patient: { select: patientSelect } },
      orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
    });

    return {
      patients: relationships.map(relationship => ({
        relationshipId: relationship.id,
        linkedAt: relationship.approvedAt,
        patient: { id: relationship.patient.id, fullName: relationship.patient.fullName, email: relationship.patient.email },
      })),
    };
  },

  async getLinkedPatient(caregiverId: string, patientId: string) {
    const relationship = await ensureLinkedPatient(caregiverId, patientId);

    return {
      relationship: { id: relationship.id, status: relationship.status, linkedAt: relationship.approvedAt },
      patient: { id: relationship.patient.id, fullName: relationship.patient.fullName, email: relationship.patient.email },
    };
  },
};

export { ensureLinkedPatient };