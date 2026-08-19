import { z } from "zod";

export const prescriptionChargePreferenceSchema = z.enum([
  "CHARGEABLE",
  "EXEMPT",
  "PPC",
]);

export const prescriptionExemptionTypeSchema = z.enum([
  "AGE_BASED",
  "MEDICAL_EXEMPTION",
  "MATERNITY_EXEMPTION",
  "LOW_INCOME_HC2",
  "UNIVERSAL_CREDIT",
  "PPC",
  "OTHER",
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

const optionalText = (maxLength: number) =>
  z.preprocess(
    value => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();

      return trimmed || undefined;
    },
    z.string().trim().max(maxLength).optional()
  );

const optionalDate = z.preprocess(
  value => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();

    return trimmed || undefined;
  },
  z
    .string()
    .trim()
    .max(40)
    .refine(value => !Number.isNaN(Date.parse(value)), {
      message: "expiresAt must be a valid date",
    })
    .optional()
);

export const submitPharmacyExemptionEvidenceSchema = z
  .object({
    chargePreference: z.enum([
      "EXEMPT",
      "PPC",
    ]),

    exemptionType: prescriptionExemptionTypeSchema,

    referenceNumber: optionalText(120),

    expiresAt: optionalDate,
  })
  .superRefine((data, context) => {
    if (
      data.chargePreference === "PPC" &&
      data.exemptionType !== "PPC"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["exemptionType"],
        message: "PPC evidence must use exemption type PPC",
      });
    }

    if (
      data.chargePreference === "EXEMPT" &&
      data.exemptionType === "PPC"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["exemptionType"],
        message:
          "PPC must be submitted using chargePreference PPC",
      });
    }
  });