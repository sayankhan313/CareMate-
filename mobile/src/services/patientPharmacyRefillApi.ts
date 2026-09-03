import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

export type PatientRefillVerificationPath = "ASSIGNED_DOCTOR" | "EXTERNAL_EVIDENCE";

export type PatientMedicineEvidenceType =
  | "NHS_APP_SCREENSHOT"
  | "EPS_TOKEN"
  | "GP_REPEAT_MEDICATION_RECORD"
  | "HOSPITAL_OR_CLINIC_LETTER"
  | "PHARMACY_LABELLED_MEDICINE"
  | "OTHER";

export type PatientRefillDoctorVerificationStatus = "NOT_REQUIRED" | "PENDING" | "CONFIRMED" | "REJECTED";

export type RefillEvidenceFile = {
  uri: string;
  name: string;
  type: string;
};

export type CreatePharmacyRefillInput = {
  medicineId: string;
  pharmacyId: string;
  requestedQuantity: number;
  quantityUnit: string;
  note?: string;
  verificationPath?: PatientRefillVerificationPath;
  verificationDoctorId?: string;
  evidenceType?: PatientMedicineEvidenceType;
  evidenceFile?: RefillEvidenceFile;
};

export type PharmacyRefillResponse = {
  submission: {
    id: string;
    requestType: "REFILL_REQUEST";
    status: string;
    medicineId: string;
    verificationPath?: "CAREMATE_PRESCRIPTION" | PatientRefillVerificationPath | null;
    doctorVerificationStatus?: PatientRefillDoctorVerificationStatus;
    verificationDoctor?: { id: string; fullName: string } | null;
    evidenceType?: PatientMedicineEvidenceType | null;
    hasEvidence?: boolean;
  };
  order: {
    id: string;
    orderNumber: string | null;
    status: string;
    orderSource: "REFILL_REQUEST";
    prescriptionConfirmed: boolean;
    fulfilmentAllowed: boolean;
  };
  pharmacy: { id: string; pharmacyName: string };
  medicine: { id: string; name: string; dose: string; source: string };
  requiresDoctorVerification: boolean;
  requiresPharmacyVerification: boolean;
};

export type ActivePharmacyRefillRequest = {
  medicineId: string;
  medicineName: string;
  medicineDose: string;
  orderId: string;
  orderNumber: string | null;
  orderStatus: string;
  pharmacyId: string;
  pharmacyName: string;
  requestedQuantity: string | number;
  quantityUnit?: string | null;
  prescriptionConfirmed: boolean;
  fulfilmentAllowed: boolean;
  requestedAt: string;
  verificationPath?: "CAREMATE_PRESCRIPTION" | PatientRefillVerificationPath | null;
  doctorVerificationStatus?: PatientRefillDoctorVerificationStatus;
  verificationDoctor?: { id: string; fullName: string } | null;
  evidenceType?: PatientMedicineEvidenceType | null;
};

export type ActivePharmacyRefillsResponse = {
  count: number;
  activeRequests: ActivePharmacyRefillRequest[];
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const getErrorMessage = (result: ApiEnvelope<unknown> | any, fallback: string) => {
  if (typeof result?.message === "string") return result.message;
  if (Array.isArray(result?.message)) return result.message[0]?.message || fallback;
  if (Array.isArray(result?.issues)) return result.issues[0]?.message || fallback;
  if (Array.isArray(result?.errors)) return result.errors[0]?.message || fallback;
  return fallback;
};

const readResponse = async <T>(response: Response, fallbackMessage: string): Promise<T> => {
  let result: ApiEnvelope<T> | any = {};

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || result.success === false) throw new Error(getErrorMessage(result, fallbackMessage));
  return result.data as T;
};

const getToken = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Please login again.");
  return token;
};

const appendIfPresent = (formData: FormData, key: string, value: string | number | undefined | null) => {
  if (value === undefined || value === null) return;
  const text = String(value).trim();
  if (!text) return;
  formData.append(key, text);
};

export const patientPharmacyRefillApi = {
  async createRefill(input: CreatePharmacyRefillInput) {
    const token = await getToken();
    const formData = new FormData();

    appendIfPresent(formData, "medicineId", input.medicineId);
    appendIfPresent(formData, "pharmacyId", input.pharmacyId);
    appendIfPresent(formData, "requestedQuantity", input.requestedQuantity);
    appendIfPresent(formData, "quantityUnit", input.quantityUnit);
    appendIfPresent(formData, "note", input.note);
    appendIfPresent(formData, "verificationPath", input.verificationPath);
    appendIfPresent(formData, "verificationDoctorId", input.verificationDoctorId);
    appendIfPresent(formData, "evidenceType", input.evidenceType);

    if (input.evidenceFile) {
      formData.append("evidenceFile", {
        uri: input.evidenceFile.uri,
        name: input.evidenceFile.name,
        type: input.evidenceFile.type,
      } as any);
    }

    const response = await fetch(`${API_BASE_URL}/patient/pharmacy-refills`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    return readResponse<PharmacyRefillResponse>(response, "Unable to send medicine request.");
  },

  async listActiveRefills() {
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}/patient/pharmacy-refills/active`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    return readResponse<ActivePharmacyRefillsResponse>(response, "Unable to load active pharmacy requests.");
  },
};