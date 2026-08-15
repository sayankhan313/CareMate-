import { z } from "zod";

export const pharmacyOrderParamsSchema = z.object({
  orderId: z.string().uuid("Valid order ID is required."),
});

export const pharmacyOrdersQuerySchema = z.object({
  source: z.enum(["DOCTOR_PRESCRIPTION", "PATIENT_SUBMISSION", "REFILL_REQUEST", "MANUAL_REQUEST"]).optional(),
  status: z.enum([
    "RECEIVED",
    "ACCEPTED",
    "REJECTED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "COLLECTED",
    "DELAYED",
    "OUT_OF_STOCK",
    "CANCELLED",
  ]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const pharmacyOrderStatusTargetSchema = z.enum([
  "ACCEPTED",
  "REJECTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COLLECTED",
  "DELAYED",
  "OUT_OF_STOCK",
  "CANCELLED",
]);

const reasonRequiredStatuses = new Set(["REJECTED", "DELAYED", "OUT_OF_STOCK", "CANCELLED"]);

export const updatePharmacyOrderStatusSchema = z
  .object({
    status: pharmacyOrderStatusTargetSchema,
    reason: z.string().trim().max(500, "Status reason cannot exceed 500 characters.").optional(),
  })
  .superRefine((data, ctx) => {
    if (reasonRequiredStatuses.has(data.status) && (!data.reason || data.reason.trim().length < 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Please provide a clear reason of at least 5 characters for this status.",
      });
    }
  });