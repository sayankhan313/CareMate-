import { z } from "zod";

export const doctorConsultationsQuerySchema = z
  .object({
    status: z
      .enum([
        "ALL",
        "PENDING",
        "ACCEPTED",
        "REJECTED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
      ])
      .optional()
      .default("ALL"),

    type: z.enum(["ALL", "EMERGENCY", "MANUAL"]).optional().default("ALL"),
  })
  .passthrough();

export const doctorConsultationParamsSchema = z.object({
  consultationId: z.string().uuid("Valid consultation ID is required"),
});

export const doctorConsultationActionBodySchema = z
  .object({
    notes: z
      .string()
      .trim()
      .max(1000, "Notes must be less than 1000 characters")
      .optional(),
  })
  .passthrough();

export type DoctorConsultationsQueryInput = z.infer<
  typeof doctorConsultationsQuerySchema
>;

export type DoctorConsultationParamsInput = z.infer<
  typeof doctorConsultationParamsSchema
>;

export type DoctorConsultationActionBodyInput = z.infer<
  typeof doctorConsultationActionBodySchema
>;