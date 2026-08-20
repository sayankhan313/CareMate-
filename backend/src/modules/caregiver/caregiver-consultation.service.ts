import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ensureLinkedPatient } from "./caregiver-patients.service.js";

const consultationSelect = {
  id: true,
  patientId: true,
  doctorId: true,
  safetyAlertId: true,
  type: true,
  status: true,
  preferredAt: true,
  doctorName: true,
  acceptedAt: true,
  rejectedAt: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  doctor: {
    select: {
      id: true,
      fullName: true,
      doctorProfile: { select: { specialization: true, clinicName: true } },
    },
  },
  safetyAlert: {
    select: {
      id: true,
      status: true,
      escalatedAt: true,
      resolvedAt: true,
      createdAt: true,
    },
  },
} as const;

const formatConsultation = (consultation: any) => ({
  id: consultation.id,
  patientId: consultation.patientId,
  doctorId: consultation.doctorId,
  type: consultation.type,
  status: consultation.status,
  preferredAt: consultation.preferredAt,
  doctor: consultation.doctor
    ? {
        id: consultation.doctor.id,
        fullName: consultation.doctor.fullName,
        specialization: consultation.doctor.doctorProfile?.specialization || null,
        clinicName: consultation.doctor.doctorProfile?.clinicName || null,
      }
    : consultation.doctorName
      ? { id: consultation.doctorId || null, fullName: consultation.doctorName, specialization: null, clinicName: null }
      : null,
  acceptedAt: consultation.acceptedAt,
  rejectedAt: consultation.rejectedAt,
  startedAt: consultation.startedAt,
  completedAt: consultation.completedAt,
  cancelledAt: consultation.cancelledAt,
  createdAt: consultation.createdAt,
  updatedAt: consultation.updatedAt,
  safetyAlert: consultation.safetyAlert
    ? {
        id: consultation.safetyAlert.id,
        status: consultation.safetyAlert.status,
        escalatedAt: consultation.safetyAlert.escalatedAt,
        resolvedAt: consultation.safetyAlert.resolvedAt,
        createdAt: consultation.safetyAlert.createdAt,
      }
    : null,
});

export const caregiverConsultationService = {
  async listPatientConsultations(caregiverId: string, patientId: string) {
    const relationship = await ensureLinkedPatient(caregiverId, patientId);

    const consultations = await prisma.consultation.findMany({
      where: { patientId },
      select: consultationSelect,
      orderBy: [{ preferredAt: "desc" }, { createdAt: "desc" }],
    });

    const now = Date.now();
    const formatted = consultations.map(formatConsultation);

    const summary = {
      total: formatted.length,
      pending: formatted.filter(item => item.status === "PENDING").length,
      accepted: formatted.filter(item => item.status === "ACCEPTED").length,
      inProgress: formatted.filter(item => item.status === "IN_PROGRESS").length,
      completed: formatted.filter(item => item.status === "COMPLETED").length,
      rejected: formatted.filter(item => item.status === "REJECTED").length,
      cancelled: formatted.filter(item => item.status === "CANCELLED").length,
      upcoming: formatted.filter(item => item.preferredAt && new Date(item.preferredAt).getTime() > now && ["PENDING", "ACCEPTED"].includes(item.status)).length,
    };

    return {
      patient: {
        id: relationship.patient.id,
        fullName: relationship.patient.fullName,
      },
      summary,
      consultations: formatted,
    };
  },

  async getPatientConsultation(caregiverId: string, patientId: string, consultationId: string) {
    const relationship = await ensureLinkedPatient(caregiverId, patientId);

    const consultation = await prisma.consultation.findFirst({
      where: { id: consultationId, patientId },
      select: consultationSelect,
    });

    if (!consultation) throw new AppError("Consultation not found for this linked patient.", 404);

    return {
      patient: {
        id: relationship.patient.id,
        fullName: relationship.patient.fullName,
      },
      consultation: formatConsultation(consultation),
    };
  },
};