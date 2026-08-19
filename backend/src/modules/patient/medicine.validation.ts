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
    "Time must be in HH:mm format, for example 08:00.",
  );

const dateSchema = z
  .string()
  .trim()
  .regex(
    /^\d{2}\/\d{2}\/\d{4}$/,
    "Date must be in DD/MM/YYYY format.",
  );

const doseQuantitySchema = z
  .number()
  .int()
  .min(
    1,
    "Dose quantity must be at least 1.",
  )
  .max(
    20,
    "Dose quantity cannot exceed 20.",
  );

const doseUnitSchema = z
  .string()
  .trim()
  .min(
    1,
    "Dose unit is required.",
  )
  .max(
    30,
    "Dose unit cannot exceed 30 characters.",
  );

const stockUnitSchema = z
  .string()
  .trim()
  .min(
    1,
    "Stock unit is required.",
  )
  .max(
    30,
    "Stock unit cannot exceed 30 characters.",
  );

const reviewMedicineFieldsSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Medicine name must be at least 2 characters.",
      ),

    dose: z
      .string()
      .trim()
      .min(
        1,
        "Strength is required.",
      ),

    doseQuantity:
      doseQuantitySchema
        .optional()
        .default(1),

    doseUnit:
      doseUnitSchema.optional(),

    instructions: z
      .string()
      .trim()
      .max(
        500,
        "Instructions cannot exceed 500 characters.",
      )
      .optional(),

    frequency:
      medicineFrequencySchema,

    customFrequency: z
      .string()
      .trim()
      .max(
        120,
        "Custom frequency cannot exceed 120 characters.",
      )
      .optional(),

    timeOfDay:
      timeOfDaySchema,

    startDate:
      dateSchema,

    endDate:
      dateSchema.optional(),
  })
  .superRefine(
    (data, ctx) => {
      if (
        data.frequency ===
        "CUSTOM" &&
        !data.customFrequency
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode
              .custom,
          path: [
            "customFrequency",
          ],
          message:
            "Custom frequency is required when frequency is CUSTOM.",
        });
      }
    },
  );

export const createMedicineSchema =
  reviewMedicineFieldsSchema
    .extend({
      source:
        medicineSourceSchema
          .optional()
          .default("MANUAL"),

      selectedTimes: z
        .array(
          timeOfDaySchema,
        )
        .min(
          1,
          "At least one reminder time is required.",
        )
        .max(
          4,
          "A maximum of four reminder times is allowed.",
        )
        .optional(),

      sendToDoctorForReview:
        z
          .boolean()
          .optional()
          .default(false),

      hasMedicineOnHand: z
        .boolean()
        .optional(),

      currentStock: z
        .number()
        .int()
        .min(
          0,
          "Current stock cannot be negative.",
        )
        .optional(),

      stockUnit:
        stockUnitSchema.optional(),

      lowStockThreshold: z
        .number()
        .int()
        .min(
          0,
          "Low-stock threshold cannot be negative.",
        )
        .optional(),
    })
    .superRefine(
      (data, ctx) => {
        if (
          data.hasMedicineOnHand ===
          true &&
          (
            data.currentStock ===
            undefined ||
            data.currentStock < 1
          )
        ) {
          ctx.addIssue({
            code:
              z.ZodIssueCode
                .custom,
            path: [
              "currentStock",
            ],
            message:
              "Current stock must be at least 1 when medicine is available.",
          });
        }

        if (
          data.hasMedicineOnHand ===
          true &&
          !data.stockUnit
        ) {
          ctx.addIssue({
            code:
              z.ZodIssueCode
                .custom,
            path: [
              "stockUnit",
            ],
            message:
              "Stock unit is required when medicine is available.",
          });
        }

        if (
          data.hasMedicineOnHand ===
          false &&
          data.currentStock !==
          undefined &&
          data.currentStock !== 0
        ) {
          ctx.addIssue({
            code:
              z.ZodIssueCode
                .custom,
            path: [
              "currentStock",
            ],
            message:
              "Current stock must be 0 when medicine is unavailable.",
          });
        }
      },
    );

export const updateMedicineSchema =
  z
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

      doseQuantity:
        doseQuantitySchema.optional(),

      doseUnit:
        doseUnitSchema.optional(),

      instructions: z
        .string()
        .trim()
        .max(
          500,
          "Instructions cannot exceed 500 characters.",
        )
        .optional(),

      isActive: z
        .boolean()
        .optional(),

      frequency:
        medicineFrequencySchema.optional(),

      customFrequency: z
        .string()
        .trim()
        .max(
          120,
          "Custom frequency cannot exceed 120 characters.",
        )
        .optional(),

      timeOfDay:
        timeOfDaySchema.optional(),

      startDate:
        dateSchema.optional(),

      endDate:
        dateSchema.optional(),

      sendToDoctorForReview:
        z
          .boolean()
          .optional(),

      hasMedicineOnHand: z
        .boolean()
        .optional(),

      currentStock: z
        .number()
        .int()
        .min(
          0,
          "Current stock cannot be negative.",
        )
        .optional(),

      stockUnit:
        stockUnitSchema.optional(),

      lowStockThreshold: z
        .number()
        .int()
        .min(
          0,
          "Low-stock threshold cannot be negative.",
        )
        .optional(),
    })
    .superRefine(
      (data, ctx) => {
        if (
          data.frequency ===
          "CUSTOM" &&
          !data.customFrequency
        ) {
          ctx.addIssue({
            code:
              z.ZodIssueCode
                .custom,
            path: [
              "customFrequency",
            ],
            message:
              "Custom frequency is required when frequency is CUSTOM.",
          });
        }

        if (
          data.hasMedicineOnHand ===
          true &&
          data.currentStock !==
          undefined &&
          data.currentStock < 1
        ) {
          ctx.addIssue({
            code:
              z.ZodIssueCode
                .custom,
            path: [
              "currentStock",
            ],
            message:
              "Current stock must be at least 1 when medicine is available.",
          });
        }

        if (
          data.hasMedicineOnHand ===
          false &&
          data.currentStock !==
          undefined &&
          data.currentStock !== 0
        ) {
          ctx.addIssue({
            code:
              z.ZodIssueCode
                .custom,
            path: [
              "currentStock",
            ],
            message:
              "Current stock must be 0 when medicine is unavailable.",
          });
        }
      },
    );

export const resubmitMedicineReviewSchema =
  reviewMedicineFieldsSchema;

export const requestMedicineDeletionSchema =
  z.object({
    reason: z
      .string()
      .trim()
      .min(
        3,
        "Please provide a clear deletion reason.",
      )
      .max(
        500,
        "Deletion reason cannot exceed 500 characters.",
      ),
  });

export const medicineIdParamsSchema =
  z.object({
    medicineId: z
      .string()
      .uuid(
        "Invalid medicine id.",
      ),
  });

export const reminderIdParamsSchema =
  z.object({
    reminderId: z
      .string()
      .uuid(
        "Invalid reminder id.",
      ),
  });

export const medicineReviewRequestIdParamsSchema =
  z.object({
    requestId: z
      .string()
      .uuid(
        "Invalid medicine review request id.",
      ),
  });

export const snoozeMedicineSchema =
  z.object({
    snoozedUntil: z
      .string()
      .trim()
      .min(
        1,
        "Snoozed until date/time is required.",
      ),
  });