import { z } from "zod";

export const doctorMedicineReviewsQuerySchema =
  z.object({
    status: z
      .enum([
        "ALL",
        "PENDING",
        "APPROVED",
        "REJECTED",
        "APPLIED",
      ])
      .optional()
      .default("ALL"),

    requestType: z
      .enum([
        "ALL",
        "ADD",
        "DELETE",
      ])
      .optional()
      .default("ALL"),
  });

export const doctorMedicineReviewParamsSchema =
  z.object({
    requestId: z
      .string()
      .uuid(
        "Valid medicine review request ID is required"
      ),
  });

export const approveMedicineReviewSchema =
  z.object({
    note: z
      .string()
      .trim()
      .max(
        500,
        "Review note cannot exceed 500 characters"
      )
      .optional(),
  });

export const rejectMedicineReviewSchema =
  z.object({
    note: z
      .string()
      .trim()
      .min(
        3,
        "Please provide a rejection reason"
      )
      .max(
        500,
        "Rejection note cannot exceed 500 characters"
      ),
  });

export type DoctorMedicineReviewsQueryInput =
  z.infer<
    typeof doctorMedicineReviewsQuerySchema
  >;

export type ApproveMedicineReviewInput =
  z.infer<
    typeof approveMedicineReviewSchema
  >;

export type RejectMedicineReviewInput =
  z.infer<
    typeof rejectMedicineReviewSchema
  >;