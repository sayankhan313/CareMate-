import { z } from "zod";

export const doctorNotesParamsSchema = z.object({
  patientId: z.string().uuid("Valid patient ID is required"),
});

export const createDoctorNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .min(2, "Note must be at least 2 characters")
    .max(2000, "Note must be less than 2000 characters"),
});

export type DoctorNotesParamsInput = z.infer<typeof doctorNotesParamsSchema>;

export type CreateDoctorNoteBodyInput = z.infer<typeof createDoctorNoteSchema>;