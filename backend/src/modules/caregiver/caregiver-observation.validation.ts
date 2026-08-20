import { z } from "zod";

export const caregiverObservationPatientParamsSchema = z.object({
  patientId: z.string().uuid("Invalid patient id."),
});

export const caregiverObservationParamsSchema = z.object({
  patientId: z.string().uuid("Invalid patient id."),
  observationId: z.string().uuid("Invalid observation id."),
});

export const createCaregiverObservationSchema = z.object({
  category: z.enum(["GENERAL", "ROUTINE", "APPETITE", "SLEEP", "MOBILITY", "MOOD", "MEDICATION_SUPPORT"]).default("GENERAL"),
  observation: z.string().trim().min(2, "Observation must be at least 2 characters.").max(1000, "Observation must be less than 1000 characters."),
  observedAt: z.string().datetime({ offset: true }).optional(),
});

export type CreateCaregiverObservationInput = z.infer<typeof createCaregiverObservationSchema>;