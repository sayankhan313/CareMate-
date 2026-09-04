import { z } from "zod";

const optionalText = (maxLength: number) =>
  z.preprocess(value => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed || undefined;
  }, z.string().trim().max(maxLength).optional());

const optionalUuid = (message: string) =>
  z.preprocess(value => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed || undefined;
  }, z.string().uuid(message).optional());

export const patientRefillVerificationPathSchema = z.enum(["ASSIGNED_DOCTOR", "EXTERNAL_EVIDENCE"]);

export const patientMedicineEvidenceTypeSchema = z.enum([
  "NHS_APP_SCREENSHOT",
  "EPS_TOKEN",
  "GP_REPEAT_MEDICATION_RECORD",
  "HOSPITAL_OR_CLINIC_LETTER",
  "PHARMACY_LABELLED_MEDICINE",
  "OTHER",
]);

export const createPharmacyRefillSchema = z
  .object({
    medicineId: z.string().uuid("Valid medicine ID is required."),
    pharmacyId: optionalUuid("Valid pharmacy ID is required."),
    requestedQuantity: z.coerce.number().int().min(1, "Requested quantity must be at least 1.").max(1000).optional().default(1),
    quantityUnit: z.string().trim().min(1, "Quantity unit is required.").max(30).optional().default("pack"),
    note: optionalText(500),
    verificationPath: patientRefillVerificationPathSchema.optional(),
    verificationDoctorId: optionalUuid("Valid doctor ID is required."),
    evidenceType: patientMedicineEvidenceTypeSchema.optional(),
  })
  .superRefine((data, context) => {
    if (data.verificationPath === "ASSIGNED_DOCTOR") {
      if (!data.verificationDoctorId) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["verificationDoctorId"], message: "Please select one of your assigned doctors." });
      }

      if (data.evidenceType) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["evidenceType"], message: "Evidence is not required when an assigned doctor is selected." });
      }
    }

    if (data.verificationPath === "EXTERNAL_EVIDENCE") {
      if (data.verificationDoctorId) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["verificationDoctorId"], message: "A CareMate+ doctor cannot be selected for the external evidence route." });
      }

      if (!data.evidenceType) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["evidenceType"], message: "Please select the type of prescription or medicine evidence." });
      }
    }
  });