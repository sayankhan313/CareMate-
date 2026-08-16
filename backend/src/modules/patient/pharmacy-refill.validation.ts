import { z } from "zod";

const optionalText = (maxLength: number) =>
  z.preprocess(
    value => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed || undefined;
    },
    z.string().trim().max(maxLength).optional(),
  );

export const createPharmacyRefillSchema = z.object({
  medicineId: z.string().uuid("Valid medicine ID is required."),
  requestedQuantity: z.coerce.number().int().min(1, "Requested quantity must be at least 1.").max(1000).optional().default(1),
  quantityUnit: z.string().trim().min(1, "Quantity unit is required.").max(30).optional().default("pack"),
  note: optionalText(500),
});