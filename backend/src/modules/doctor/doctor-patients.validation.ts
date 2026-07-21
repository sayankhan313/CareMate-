import { z } from "zod";

export const doctorPatientParamsSchema = z.object({
  patientId: z.string().uuid("Valid patient ID is required"),
});

export type DoctorPatientParamsInput = z.infer<
  typeof doctorPatientParamsSchema
>;