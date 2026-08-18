import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

export type PrescriptionChargePreference = "CHARGEABLE" | "EXEMPT" | "PPC";
export type PatientChargeSelection = "CHARGEABLE" | "EXEMPT";
export type PrescriptionExemptionType = "AGE_BASED" | "MEDICAL_EXEMPTION" | "MATERNITY_EXEMPTION" | "LOW_INCOME_HC2" | "UNIVERSAL_CREDIT" | "PPC" | "OTHER";
export type PrescriptionChargeVerificationState = "NOT_REQUIRED" | "MISSING" | "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
export type PrescriptionChargePaymentBehaviour = "PAYMENT_REQUIRED" | "EXEMPTION_REVIEW_REQUIRED" | "NO_PAYMENT_REQUIRED";

export type PrescriptionChargeEvidence = {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  chargePreference: "EXEMPT" | "PPC";
  exemptionType: PrescriptionExemptionType;
  referenceNumber: string | null;
  expiresAt: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  verifiedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  documentCount: number;
  documents: { index: number; fileName: string }[];
  submittedAt: string;
  updatedAt: string;
};

export type PatientPrescriptionChargeProfile = {
  id: string;
  selectedPreference: PrescriptionChargePreference;
  verificationState: PrescriptionChargeVerificationState;
  paymentBehaviour: PrescriptionChargePaymentBehaviour;
  effectiveOrderChargePreference: PrescriptionChargePreference;
  effectiveOrderPaymentStatus: "PENDING" | "NOT_REQUIRED";
  latestEvidence: PrescriptionChargeEvidence | null;
  primaryPharmacy: { linkId: string; pharmacyId: string; pharmacyName: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type PrescriptionChargeEvidenceFile = { uri: string; name: string; type: string };

export type SubmitPrescriptionChargeEvidencePayload = {
  exemptionType: PrescriptionExemptionType;
  referenceNumber?: string;
  expiresAt?: string;
  files: PrescriptionChargeEvidenceFile[];
};

type ProfileResponse = { profile: PatientPrescriptionChargeProfile };
type ApiResponse<T> = { success: boolean; message?: string; data?: T };

const getToken = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  return token;
};

const readResponse = async <T>(response: Response): Promise<T> => {
  let result: ApiResponse<T>;

  try {
    result = await response.json() as ApiResponse<T>;
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !result.success) throw new Error(result.message || "Request failed. Please try again.");
  if (!result.data) throw new Error("The server response did not contain data.");

  return result.data;
};

export const patientPrescriptionChargeApi = {
  async getProfile() {
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}/patient/prescription-charge`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    return readResponse<ProfileResponse>(response);
  },

  async updatePreference(selection: PatientChargeSelection) {
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}/patient/prescription-charge`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ selection }),
    });

    return readResponse<ProfileResponse>(response);
  },

  async submitEvidence(payload: SubmitPrescriptionChargeEvidencePayload) {
    const token = await getToken();
    const formData = new FormData();

    formData.append("exemptionType", payload.exemptionType);

    if (payload.referenceNumber?.trim()) formData.append("referenceNumber", payload.referenceNumber.trim());
    if (payload.expiresAt?.trim()) formData.append("expiresAt", payload.expiresAt.trim());

    payload.files.forEach((file, index) => {
      formData.append("evidenceDocuments", {
        uri: file.uri,
        name: file.name || `exemption-evidence-${index + 1}`,
        type: file.type || "application/pdf",
      } as any);
    });

    const response = await fetch(`${API_BASE_URL}/patient/prescription-charge/evidence`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    return readResponse<ProfileResponse>(response);
  },
};