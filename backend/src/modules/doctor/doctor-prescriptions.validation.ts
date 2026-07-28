import { z } from "zod";

const medicineFrequencySchema = z.enum([
  "ONCE_DAILY",
  "TWICE_DAILY",
  "THREE_TIMES_DAILY",
  "FOUR_TIMES_DAILY",
  "AS_NEEDED",
  "CUSTOM",
]);

const prescriptionSourceSchema = z.enum([
  "MANUAL",
  "SCANNED",
]);

const timeSchema = z
  .string()
  .trim()
  .regex(
    /^([01]\d|2[0-3]):([0-5]\d)$/,
    "Time must be in HH:mm format."
  );

const dateSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      return (
        /^\d{2}\/\d{2}\/\d{4}$/.test(value) ||
        /^\d{4}-\d{2}-\d{2}$/.test(value)
      );
    },
    {
      message:
        "Date must be in DD/MM/YYYY or YYYY-MM-DD format.",
    }
  );

const parseItems = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const parseOptionalNumber = (
  value: unknown
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  const parsedNumber = Number(value);

  return Number.isNaN(parsedNumber)
    ? value
    : parsedNumber;
};

const prescriptionItemSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Medicine name must contain at least 2 characters."
      )
      .max(
        120,
        "Medicine name is too long."
      ),

    dose: z
      .string()
      .trim()
      .min(1, "Medicine dose is required.")
      .max(100, "Medicine dose is too long."),

    instructions: z
      .string()
      .trim()
      .max(
        1000,
        "Instructions cannot exceed 1000 characters."
      )
      .optional(),

    frequency: medicineFrequencySchema,

    customFrequency: z
      .string()
      .trim()
      .max(
        150,
        "Custom frequency is too long."
      )
      .optional(),

    selectedTimes: z
      .array(timeSchema)
      .min(
        1,
        "At least one reminder time is required."
      )
      .max(
        4,
        "A maximum of four reminder times is supported."
      ),

    startDate: dateSchema,

    endDate: dateSchema.optional(),

    prescriptionPattern: z
      .string()
      .trim()
      .max(
        30,
        "Prescription pattern is too long."
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    const uniqueTimes = new Set(
      data.selectedTimes
    );

    if (
      uniqueTimes.size !==
      data.selectedTimes.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedTimes"],
        message:
          "Reminder times must be unique.",
      });
    }

    if (
      data.frequency === "CUSTOM" &&
      !data.customFrequency
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customFrequency"],
        message:
          "Custom frequency is required.",
      });
    }
  });

export const createDoctorPrescriptionSchema =
  z.object({
    source:
      prescriptionSourceSchema.default(
        "MANUAL"
      ),

    notes: z
      .string()
      .trim()
      .max(
        2000,
        "Prescription notes cannot exceed 2000 characters."
      )
      .optional(),

    rawDetectedText: z
      .string()
      .trim()
      .max(
        20000,
        "Detected prescription text is too long."
      )
      .optional(),

    ocrConfidence: z.preprocess(
      parseOptionalNumber,
      z
        .number()
        .min(
          0,
          "OCR confidence cannot be below zero."
        )
        .max(
          100,
          "OCR confidence cannot exceed 100."
        )
        .optional()
    ),

    items: z.preprocess(
      parseItems,
      z
        .array(prescriptionItemSchema)
        .min(
          1,
          "At least one medicine is required."
        )
        .max(
          20,
          "A maximum of twenty medicines is supported."
        )
    ),
  });

export const doctorPrescriptionPatientParamsSchema =
  z.object({
    patientId: z
      .string()
      .uuid(
        "Valid patient ID is required."
      ),
  });

export const doctorPrescriptionParamsSchema =
  z.object({
    prescriptionId: z
      .string()
      .uuid(
        "Valid prescription ID is required."
      ),
  });

export const doctorPrescriptionScanSchema =
  z.object({
    detectedText: z
      .string()
      .trim()
      .min(
        2,
        "Detected prescription text is required."
      )
      .max(
        20000,
        "Detected prescription text is too long."
      ),

    ocrConfidence: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .default(82),
  });

export type CreateDoctorPrescriptionValidationInput =
  z.infer<
    typeof createDoctorPrescriptionSchema
  >;

export type DoctorPrescriptionScanInput =
  z.infer<
    typeof doctorPrescriptionScanSchema
  >;