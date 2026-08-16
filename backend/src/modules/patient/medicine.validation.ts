import { z } from "zod";

const medicineSourceSchema = z.enum(["MANUAL", "SCANNER", "DOCTOR_PRESCRIBED"]);

const medicineFrequencySchema = z.enum([
  "ONCE_DAILY",
  "TWICE_DAILY",
  "THREE_TIMES_DAILY",
  "FOUR_TIMES_DAILY",
  "AS_NEEDED",
  "CUSTOM",
]);

const timeOfDaySchema = z.string().trim().regex(
  /^([01]\d|2[0-3]):([0-5]\d)$/,
  "Time must be in HH:mm format, for example 08:00.",
);

const dateSchema = z.string().trim().regex(
  /^\d{2}\/\d{2}\/\d{4}$/,
  "Date must be in DD/MM/YYYY format.",
);

const getRequiredTimeCount = (frequency: z.infer<typeof medicineFrequencySchema>) => {
  if (frequency === "TWICE_DAILY") return 2;
  if (frequency === "THREE_TIMES_DAILY") return 3;
  if (frequency === "FOUR_TIMES_DAILY") return 4;
  return 1;
};

const reviewMedicineFieldsSchema = z
  .object({
    name: z.string().trim().min(2, "Medicine name must be at least 2 characters."),
    dose: z.string().trim().min(1, "Dose is required."),
    instructions: z.string().trim().optional(),
    frequency: medicineFrequencySchema,
    customFrequency: z.string().trim().optional(),
    timeOfDay: timeOfDaySchema,
    startDate: dateSchema,
    endDate: dateSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === "CUSTOM" && !data.customFrequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customFrequency"],
        message: "Custom frequency is required when frequency is CUSTOM.",
      });
    }
  });

export const createMedicineSchema = z
  .object({
    name: z.string().trim().min(2, "Medicine name must be at least 2 characters."),
    dose: z.string().trim().min(1, "Dose is required."),
    instructions: z.string().trim().optional(),
    source: medicineSourceSchema.optional().default("MANUAL"),
    frequency: medicineFrequencySchema,
    customFrequency: z.string().trim().optional(),
    timeOfDay: timeOfDaySchema.optional(),
    selectedTimes: z.array(timeOfDaySchema).min(1).max(4).optional(),
    startDate: dateSchema,
    endDate: dateSchema.optional(),
    sendToDoctorForReview: z.boolean().optional().default(false),
    hasMedicineOnHand: z.boolean().optional(),
    currentStock: z.coerce.number().int().min(0).max(1_000_000).optional(),
    stockUnit: z.string().trim().min(1).max(30).optional(),
    lowStockThreshold: z.coerce.number().int().min(0).max(1_000_000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === "CUSTOM" && !data.customFrequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customFrequency"],
        message: "Custom frequency is required when frequency is CUSTOM.",
      });
    }

    const times = data.selectedTimes?.length ? data.selectedTimes : data.timeOfDay ? [data.timeOfDay] : [];

    if (times.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedTimes"],
        message: "At least one reminder time is required.",
      });
    }

    if (data.selectedTimes?.length) {
      const requiredCount = getRequiredTimeCount(data.frequency);

      if (data.selectedTimes.length !== requiredCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selectedTimes"],
          message: `Please provide exactly ${requiredCount} reminder time${requiredCount === 1 ? "" : "s"} for this frequency.`,
        });
      }

      if (new Set(data.selectedTimes).size !== data.selectedTimes.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selectedTimes"],
          message: "Reminder times must be unique.",
        });
      }
    }

    if (data.hasMedicineOnHand === true && (!data.currentStock || data.currentStock < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentStock"],
        message: "Enter how much medicine you currently have.",
      });
    }

    if (data.hasMedicineOnHand === false && data.currentStock !== undefined && data.currentStock !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentStock"],
        message: "Current stock must be 0 when you do not have this medicine.",
      });
    }
  });

export const updateMedicineSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    dose: z.string().trim().min(1).optional(),
    instructions: z.string().trim().optional(),
    isActive: z.boolean().optional(),
    frequency: medicineFrequencySchema.optional(),
    customFrequency: z.string().trim().optional(),
    timeOfDay: timeOfDaySchema.optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    sendToDoctorForReview: z.boolean().optional(),
    hasMedicineOnHand: z.boolean().optional(),
    currentStock: z.coerce.number().int().min(0).max(1_000_000).optional(),
    stockUnit: z.string().trim().min(1).max(30).nullable().optional(),
    lowStockThreshold: z.coerce.number().int().min(0).max(1_000_000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === "CUSTOM" && !data.customFrequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customFrequency"],
        message: "Custom frequency is required when frequency is CUSTOM.",
      });
    }

    if (data.hasMedicineOnHand === true && data.currentStock !== undefined && data.currentStock < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentStock"],
        message: "Current stock must be at least 1 when the medicine is available.",
      });
    }

    if (data.hasMedicineOnHand === false && data.currentStock !== undefined && data.currentStock !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentStock"],
        message: "Current stock must be 0 when you do not have this medicine.",
      });
    }
  });

export const resubmitMedicineReviewSchema = reviewMedicineFieldsSchema;

export const requestMedicineDeletionSchema = z.object({
  reason: z.string().trim().min(3, "Please provide a clear deletion reason.").max(500, "Deletion reason cannot exceed 500 characters."),
});

export const medicineIdParamsSchema = z.object({
  medicineId: z.string().uuid("Invalid medicine id."),
});

export const reminderIdParamsSchema = z.object({
  reminderId: z.string().uuid("Invalid reminder id."),
});

export const medicineReviewRequestIdParamsSchema = z.object({
  requestId: z.string().uuid("Invalid medicine review request id."),
});

export const snoozeMedicineSchema = z.object({
  snoozedUntil: z.string().trim().min(1, "Snoozed until date/time is required."),
});