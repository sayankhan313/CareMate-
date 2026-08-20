import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ensureLinkedPatient } from "./caregiver-patients.service.js";
import type { CreateCaregiverObservationInput } from "./caregiver-observation.validation.js";

const observationSelect = {
  id: true,
  patientId: true,
  caregiverId: true,
  category: true,
  observation: true,
  observedAt: true,
  createdAt: true,
  updatedAt: true,
  caregiver: { select: { id: true, fullName: true } },
} as const;

const formatObservation = (observation: any) => ({
  id: observation.id,
  patientId: observation.patientId,
  caregiverId: observation.caregiverId,
  caregiverName: observation.caregiver?.fullName || null,
  category: observation.category,
  observation: observation.observation,
  observedAt: observation.observedAt,
  createdAt: observation.createdAt,
  updatedAt: observation.updatedAt,
});

const resolveObservedAt = (value?: string) => {
  if (!value) return new Date();

  const observedAt = new Date(value);
  if (Number.isNaN(observedAt.getTime())) throw new AppError("Observation date is invalid.", 400);
  if (observedAt.getTime() > Date.now() + 5 * 60 * 1000) throw new AppError("Observation time cannot be in the future.", 400);

  return observedAt;
};

export const caregiverObservationService = {
  async createObservation(caregiverId: string, patientId: string, input: CreateCaregiverObservationInput) {
    const relationship = await ensureLinkedPatient(caregiverId, patientId);
    const observedAt = resolveObservedAt(input.observedAt);

    const observation = await prisma.caregiverObservation.create({
      data: {
        patientId,
        caregiverId,
        category: input.category,
        observation: input.observation.trim(),
        observedAt,
      },
      select: observationSelect,
    });

    return {
      patient: { id: relationship.patient.id, fullName: relationship.patient.fullName },
      observation: formatObservation(observation),
    };
  },

  async listPatientObservations(caregiverId: string, patientId: string) {
    const relationship = await ensureLinkedPatient(caregiverId, patientId);

    const observations = await prisma.caregiverObservation.findMany({
      where: { patientId, caregiverId },
      select: observationSelect,
      orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }],
    });

    const formatted = observations.map(formatObservation);

    return {
      patient: { id: relationship.patient.id, fullName: relationship.patient.fullName },
      summary: {
        total: formatted.length,
        general: formatted.filter(item => item.category === "GENERAL").length,
        routine: formatted.filter(item => item.category === "ROUTINE").length,
        appetite: formatted.filter(item => item.category === "APPETITE").length,
        sleep: formatted.filter(item => item.category === "SLEEP").length,
        mobility: formatted.filter(item => item.category === "MOBILITY").length,
        mood: formatted.filter(item => item.category === "MOOD").length,
        medicationSupport: formatted.filter(item => item.category === "MEDICATION_SUPPORT").length,
      },
      observations: formatted,
    };
  },

  async getObservation(caregiverId: string, patientId: string, observationId: string) {
    const relationship = await ensureLinkedPatient(caregiverId, patientId);

    const observation = await prisma.caregiverObservation.findFirst({
      where: { id: observationId, patientId, caregiverId },
      select: observationSelect,
    });

    if (!observation) throw new AppError("Care observation not found for this linked patient.", 404);

    return {
      patient: { id: relationship.patient.id, fullName: relationship.patient.fullName },
      observation: formatObservation(observation),
    };
  },
};