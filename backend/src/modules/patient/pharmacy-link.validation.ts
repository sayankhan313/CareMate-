import { z } from "zod";

export const prescriptionChargePreferenceSchema = z.enum([
  "CHARGEABLE",
  "EXEMPT",
  "PPC",
]);

export const listPharmaciesQuerySchema = z.object({
  search: z.string().trim().optional(),
  city: z.string().trim().optional(),
  postcode: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const savePharmacySchema = z.object({
  chargePreference: prescriptionChargePreferenceSchema,
  makePrimary: z.boolean().optional().default(false),
});

export const updatePharmacyChargePreferenceSchema = z.object({
  chargePreference: prescriptionChargePreferenceSchema,
});