import { z } from "zod";

const optionalTrimmedText = (
  maximumLength: number
) => {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const cleanedValue = value.trim();

      return cleanedValue
        ? cleanedValue
        : undefined;
    },

    z
      .string()
      .max(
        maximumLength,
        `Text cannot exceed ${maximumLength} characters`
      )
      .optional()
  );
};

const reportDateSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const cleanedValue = value.trim();

    return cleanedValue
      ? cleanedValue
      : undefined;
  },

  z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Report date must use YYYY-MM-DD"
    )
    .refine(
      (value) => {
        const parsedDate = new Date(
          `${value}T00:00:00.000Z`
        );

        return !Number.isNaN(
          parsedDate.getTime()
        );
      },
      {
        message: "Report date is invalid",
      }
    )
    .refine(
      (value) => {
        const parsedDate = new Date(
          `${value}T23:59:59.999Z`
        );

        return (
          parsedDate.getTime() <=
          Date.now()
        );
      },
      {
        message:
          "Report date cannot be in the future",
      }
    )
    .optional()
);

const confirmationSchema = z.preprocess(
  (value) => {
    if (
      value === true ||
      value === "true"
    ) {
      return true;
    }

    if (
      value === false ||
      value === "false"
    ) {
      return false;
    }

    return value;
  },

  z
    .boolean({
      message:
        "Sample report confirmation is required.",
    })
    .refine(
      (value) => value === true,
      {
        message:
          "You must confirm that this is a fictional or sample medical report without real personal information.",
      }
    )
);

export const createPatientReportSchema =
  z.object({
    title: z
      .string()
      .trim()
      .min(
        2,
        "Report title must contain at least 2 characters"
      )
      .max(
        120,
        "Report title cannot exceed 120 characters"
      ),

    category: z.enum([
      "BLOOD_TEST",
      "SCAN_XRAY",
      "PRESCRIPTION",
      "DISCHARGE_SUMMARY",
      "MEDICAL_LETTER",
      "OTHER_MEDICAL_REPORT",
    ]),

    description:
      optionalTrimmedText(1000),

    reportDate:
      reportDateSchema,

    confirmSampleData:
      confirmationSchema,
  });

export const patientReportParamsSchema =
  z.object({
    reportId: z
      .string()
      .uuid(
        "Valid report ID is required"
      ),
  });

export type CreatePatientReportInput =
  z.infer<
    typeof createPatientReportSchema
  >;

export type PatientReportParamsInput =
  z.infer<
    typeof patientReportParamsSchema
  >;