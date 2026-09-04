import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform(value => value || undefined);

const packSizeSchema = z.coerce.number().int("Pack size must be a whole number.").min(1, "Pack size must be at least 1.").max(1_000_000, "Pack size is too large.");

const priceSchema = z.coerce.number().int("Medicine price must be a whole number of pence.").min(1, "Medicine price must be greater than £0.00.").max(1_000_000, "Medicine price is too high.");

export const pharmacyInventoryQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  lowStock: z.enum(["true", "false"]).optional().transform(value => value === undefined ? undefined : value === "true"),
  active: z.enum(["true", "false"]).optional().default("true").transform(value => value === "true"),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

export const pharmacyInventoryReferencePriceQuerySchema = z.object({
  medicineName: z.string().trim().min(2, "Medicine name is required.").max(120),
  strength: optionalText(60),
});

export const pharmacyInventoryItemParamsSchema = z.object({
  itemId: z.string().uuid("Valid inventory item ID is required."),
});

export const createPharmacyInventoryItemSchema = z.object({
  medicineName: z.string().trim().min(2, "Medicine name is required.").max(120),
  strength: optionalText(60),
  form: optionalText(60),
  stockUnit: z.string().trim().min(1).max(30).optional(),
  packSize: packSizeSchema.optional(),
  contentUnit: optionalText(30),
  unitPricePence: priceSchema.optional(),
  quantityInStock: z.coerce.number().int().min(0).max(1_000_000).optional().default(0),
  lowStockThreshold: z.coerce.number().int().min(0).max(1_000_000).optional().default(5),
});

export const updatePharmacyInventoryItemSchema = z.object({
  medicineName: z.string().trim().min(2).max(120).optional(),
  strength: z.string().trim().max(60).nullable().optional(),
  form: z.string().trim().max(60).nullable().optional(),
  stockUnit: z.string().trim().min(1).max(30).optional(),
  packSize: packSizeSchema.optional(),
  contentUnit: z.string().trim().max(30).nullable().optional(),
  unitPricePence: priceSchema.optional(),
  quantityInStock: z.coerce.number().int().min(0).max(1_000_000).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).max(1_000_000).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one inventory field must be updated." });