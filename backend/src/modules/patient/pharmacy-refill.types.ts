export type PatientRefillVerificationPath = "ASSIGNED_DOCTOR" | "EXTERNAL_EVIDENCE";

export type PatientMedicineEvidenceType =
  | "NHS_APP_SCREENSHOT"
  | "EPS_TOKEN"
  | "GP_REPEAT_MEDICATION_RECORD"
  | "HOSPITAL_OR_CLINIC_LETTER"
  | "PHARMACY_LABELLED_MEDICINE"
  | "OTHER";

export type PatientRefillDoctorVerificationStatus = "NOT_REQUIRED" | "PENDING" | "CONFIRMED" | "REJECTED";

export type CreatePharmacyRefillInput = {
  medicineId: string;
  pharmacyId?: string;
  requestedQuantity: number;
  quantityUnit: string;
  note?: string;
  verificationPath?: PatientRefillVerificationPath;
  verificationDoctorId?: string;
  evidenceType?: PatientMedicineEvidenceType;
  evidenceFilePath?: string;
};

export type PharmacyRefillResponse = {
  submission: {
    id: string;
    requestType: "REFILL_REQUEST";
    status: string;
    medicineId: string;
    verificationPath: "CAREMATE_PRESCRIPTION" | PatientRefillVerificationPath;
    doctorVerificationStatus: PatientRefillDoctorVerificationStatus;
    verificationDoctor: { id: string; fullName: string } | null;
    evidenceType: PatientMedicineEvidenceType | null;
    hasEvidence: boolean;
  };
  order: {
    id: string;
    orderNumber: string | null;
    status: string;
    orderSource: "REFILL_REQUEST";
    prescriptionConfirmed: boolean;
    fulfilmentAllowed: boolean;
  };
  pharmacy: {
    id: string;
    pharmacyName: string;
  };
  medicine: {
    id: string;
    name: string;
    dose: string;
    source: string;
  };
  requiresDoctorVerification: boolean;
  requiresPharmacyVerification: boolean;
};