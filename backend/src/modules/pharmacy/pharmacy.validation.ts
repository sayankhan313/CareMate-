import { z } from "zod";

export const pharmacyOrderParamsSchema = z.object({ orderId: z.string().uuid("Valid order ID is required.") });

export const pharmacyOrdersQuerySchema = z.object({
  source: z.enum(["DOCTOR_PRESCRIPTION", "PATIENT_SUBMISSION", "REFILL_REQUEST", "MANUAL_REQUEST"]).optional(),
  status: z.enum(["RECEIVED", "ACCEPTED", "REJECTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "COLLECTED", "DELAYED", "OUT_OF_STOCK", "CANCELLED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});