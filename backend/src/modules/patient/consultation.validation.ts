import { z } from "zod";

export const consultationIdParamsSchema = z.object({
  consultationId: z.string().uuid("Invalid consultation id."),
});

export const doctorAvailabilityParamsSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor id."),
});

export const doctorAvailabilityMonthQuerySchema = z.object({
  month: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must use YYYY-MM format."),
});

export const doctorAvailabilitySlotsQuerySchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format."),
});

export const createManualConsultationSchema = z
  .object({
    doctorId: z.string().uuid("Please select a valid assigned doctor."),

    reason: z
      .string()
      .trim()
      .min(3, "Reason must be at least 3 characters.")
      .max(250, "Reason must be less than 250 characters."),

    preferredDate: z
      .string()
      .trim()
      .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Date must be DD/MM/YYYY.")
      .optional(),

    preferredTime: z
      .string()
      .trim()
      .regex(/^\d{2}:\d{2}$/, "Time must be HH:mm.")
      .optional(),

    notes: z
      .string()
      .trim()
      .max(1000, "Notes must be less than 1000 characters.")
      .optional(),
  })
  .refine(
    (data) =>
      (!data.preferredDate && !data.preferredTime) ||
      (Boolean(data.preferredDate) && Boolean(data.preferredTime)),
    {
      message: "Preferred date and time must be provided together.",
      path: ["preferredTime"],
    }
  );

export const rescheduleConsultationSchema = z.object({
  preferredDate: z
    .string()
    .trim()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Date must be DD/MM/YYYY."),

  preferredTime: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, "Time must be HH:mm."),
});