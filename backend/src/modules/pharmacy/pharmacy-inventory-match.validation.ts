import { z } from "zod";

export const pharmacyInventoryMatchParamsSchema = z.object({
  orderId: z.string().uuid("Valid order ID is required."),
  orderItemId: z.string().uuid("Valid order item ID is required."),
});

export const confirmPharmacyInventoryMatchSchema = z.object({
  inventoryItemId: z.string().uuid("Valid inventory item ID is required."),
  quantity: z.coerce
    .number()
    .int("Reserved quantity must be a whole number.")
    .min(1, "Reserved quantity must be at least 1.")
    .max(1_000_000, "Reserved quantity is too large."),
});