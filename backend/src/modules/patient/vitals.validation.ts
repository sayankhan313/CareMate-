import { z } from "zod";

const vitalSourceSchema = z.enum(["HEALTH_CONNECT", "SIMULATED", "MANUAL"]);

export const createVitalReadingSchema = z
  .object({
    heartRate: z
      .number()
      .int("Heart rate must be a whole number.")
      .min(20, "Heart rate is too low.")
      .max(250, "Heart rate is too high.")
      .optional(),

    spo2: z
      .number()
      .int("SpO2 must be a whole number.")
      .min(50, "SpO2 is too low.")
      .max(100, "SpO2 cannot be above 100.")
      .optional(),

    bpSystolic: z
      .number()
      .int("Systolic blood pressure must be a whole number.")
      .min(50, "Systolic blood pressure is too low.")
      .max(260, "Systolic blood pressure is too high.")
      .optional(),

    bpDiastolic: z
      .number()
      .int("Diastolic blood pressure must be a whole number.")
      .min(30, "Diastolic blood pressure is too low.")
      .max(180, "Diastolic blood pressure is too high.")
      .optional(),

    glucose: z
      .number()
      .min(20, "Glucose is too low.")
      .max(600, "Glucose is too high.")
      .optional(),

    temperature: z
      .number()
      .min(30, "Temperature is too low.")
      .max(45, "Temperature is too high.")
      .optional(),

    source: vitalSourceSchema.optional().default("SIMULATED"),

    deviceSource: z.string().trim().optional(),

    recordedAt: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const hasAnyVital =
      data.heartRate !== undefined ||
      data.spo2 !== undefined ||
      data.bpSystolic !== undefined ||
      data.bpDiastolic !== undefined ||
      data.glucose !== undefined ||
      data.temperature !== undefined;

    if (!hasAnyVital) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one vital reading is required.",
      });
    }

    const hasSystolic = data.bpSystolic !== undefined;
    const hasDiastolic = data.bpDiastolic !== undefined;

    if (hasSystolic !== hasDiastolic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bpSystolic"],
        message: "Both systolic and diastolic blood pressure are required.",
      });
    }
  });

export const vitalHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});