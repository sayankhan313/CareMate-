import { z } from "zod";

export const patientPaymentOrderParamsSchema = z.object({
  orderId: z.string().uuid("Valid order ID is required."),
});