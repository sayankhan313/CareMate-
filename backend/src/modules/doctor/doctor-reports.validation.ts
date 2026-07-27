import { z } from "zod";

const requiredIdSchema = (
  message: string
) => {
  return z
    .string()
    .trim()
    .min(1, message)
    .max(100, message);
};

export const doctorPatientReportsParamsSchema =
  z.object({
    patientId: requiredIdSchema(
      "Valid patient ID is required"
    ),
  });

export const doctorPatientReportParamsSchema =
  z.object({
    patientId: requiredIdSchema(
      "Valid patient ID is required"
    ),

    reportId: requiredIdSchema(
      "Valid report ID is required"
    ),
  });

export const reviewPatientReportSchema =
  z.object({
    reviewNote: z
      .string()
      .trim()
      .min(
        2,
        "Review note must contain at least 2 characters"
      )
      .max(
        2000,
        "Review note cannot exceed 2000 characters"
      ),
  });

export type DoctorPatientReportsParamsInput =
  z.infer<
    typeof doctorPatientReportsParamsSchema
  >;

export type DoctorPatientReportParamsInput =
  z.infer<
    typeof doctorPatientReportParamsSchema
  >;

export type ReviewPatientReportInput =
  z.infer<
    typeof reviewPatientReportSchema
  >;