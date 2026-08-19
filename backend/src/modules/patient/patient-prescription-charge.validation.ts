import { z } from "zod";

export const updatePatientPrescriptionChargeSchema = z.object({
  selection: z.enum(["CHARGEABLE", "EXEMPT"]),
});

const optionalText = (maxLength: number) =>
  z.preprocess(value => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed || undefined;
  }, z.string().trim().max(maxLength).optional());

const optionalDate = z.preprocess(value => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed || undefined;
}, z.string().trim().max(40).refine(value => !Number.isNaN(Date.parse(value)), { message: "expiresAt must be a valid date" }).optional());

export const submitPatientPrescriptionChargeEvidenceSchema = z.object({
  exemptionType: z.enum([
    "AGE_BASED",
    "MEDICAL_EXEMPTION",
    "MATERNITY_EXEMPTION",
    "LOW_INCOME_HC2",
    "UNIVERSAL_CREDIT",
    "PPC",
    "OTHER",
  ]),
  referenceNumber: optionalText(120),
  expiresAt: optionalDate,
});