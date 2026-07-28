import { z } from "zod";

const medicineSourceSchema = z.enum([
  "MANUAL",
  "SCANNER",
  "DOCTOR_PRESCRIBED",
]);

const medicineFrequencySchema = z.enum([
  "ONCE_DAILY",
  "TWICE_DAILY",
  "THREE_TIMES_DAILY",
  "FOUR_TIMES_DAILY",
  "AS_NEEDED",
  "CUSTOM",
]);

const timeOfDaySchema = z
  .string()
  .trim()
  .regex(
    /^([01]\d|2[0-3]):([0-5]\d)$/,
    "Time must be in HH:mm format, for example 08:00."
  );

const dateSchema = z
  .string()
  .trim()
  .regex(
    /^\d{2}\/\d{2}\/\d{4}$/,
    "Date must be in DD/MM/YYYY format."
  );

const reviewMedicineFieldsSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Medicine name must be at least 2 characters."
      ),

    dose: z
      .string()
      .trim()
      .min(1, "Dose is required."),

    instructions: z
      .string()
      .trim()
      .optional(),

    frequency: medicineFrequencySchema,

    customFrequency: z
      .string()
      .trim()
      .optional(),

    timeOfDay: timeOfDaySchema,

    startDate: dateSchema,

    endDate: dateSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.frequency === "CUSTOM" &&
      !data.customFrequency
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customFrequency"],
        message:
          "Custom frequency is required when frequency is CUSTOM.",
      });
    }
  });

export const createMedicineSchema =
  reviewMedicineFieldsSchema.extend({
    source:
      medicineSourceSchema
        .optional()
        .default("MANUAL"),

    sendToDoctorForReview: z
      .boolean()
      .optional()
      .default(false),
  });

export const updateMedicineSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .optional(),

    dose: z
      .string()
      .trim()
      .min(1)
      .optional(),

    instructions: z
      .string()
      .trim()
      .optional(),

    isActive: z
      .boolean()
      .optional(),

    frequency:
      medicineFrequencySchema.optional(),

    customFrequency: z
      .string()
      .trim()
      .optional(),

    timeOfDay:
      timeOfDaySchema.optional(),

    startDate:
      dateSchema.optional(),

    endDate:
      dateSchema.optional(),

    sendToDoctorForReview: z
      .boolean()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.frequency === "CUSTOM" &&
      !data.customFrequency
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customFrequency"],
        message:
          "Custom frequency is required when frequency is CUSTOM.",
      });
    }
  });

export const resubmitMedicineReviewSchema =
  reviewMedicineFieldsSchema;

export const requestMedicineDeletionSchema =
  z.object({
    reason: z
      .string()
      .trim()
      .min(
        3,
        "Please provide a clear deletion reason."
      )
      .max(
        500,
        "Deletion reason cannot exceed 500 characters."
      ),
  });

export const medicineIdParamsSchema =
  z.object({
    medicineId: z
      .string()
      .uuid("Invalid medicine id."),
  });

export const reminderIdParamsSchema =
  z.object({
    reminderId: z
      .string()
      .uuid("Invalid reminder id."),
  });

export const medicineReviewRequestIdParamsSchema =
  z.object({
    requestId: z
      .string()
      .uuid(
        "Invalid medicine review request id."
      ),
  });

export const snoozeMedicineSchema =
  z.object({
    snoozedUntil: z
      .string()
      .trim()
      .min(
        1,
        "Snoozed until date/time is required."
      ),
  });