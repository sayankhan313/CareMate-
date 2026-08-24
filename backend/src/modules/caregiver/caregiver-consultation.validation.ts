import { z } from "zod";

export const caregiverConsultationPatientParamsSchema = z.object({
  patientId: z.string().uuid("Invalid patient id."),
});

export const caregiverConsultationParamsSchema = z.object({
  patientId: z.string().uuid("Invalid patient id."),
  consultationId: z.string().uuid("Invalid consultation id."),
});