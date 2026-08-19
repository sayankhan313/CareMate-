import { z } from "zod";

export const pharmacyExemptionReviewsQuerySchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional().default("PENDING"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const pharmacyExemptionEvidenceParamsSchema = z.object({
  evidenceId: z.string().uuid("Valid exemption evidence ID is required."),
});

export const pharmacyExemptionDocumentParamsSchema = z.object({
  evidenceId: z.string().uuid("Valid exemption evidence ID is required."),
  documentIndex: z.coerce.number().int().min(0).max(2),
});

export const rejectPharmacyExemptionEvidenceSchema = z.object({
  reason: z.string().trim().min(5, "Please provide a clear rejection reason.").max(500, "Rejection reason cannot exceed 500 characters."),
});