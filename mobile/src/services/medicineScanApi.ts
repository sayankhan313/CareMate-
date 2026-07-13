import { API_BASE_URL } from "../constants/api";
import type { MedicineDraft } from "../types/navigation";
import { tokenStorage } from "./tokenStorage";

export type MedicineSafetyLevel =
  | "STANDARD"
  | "DOCTOR_REVIEW_RECOMMENDED";

export type MedicineReferenceFrequency =
  | "ONCE_DAILY"
  | "TWICE_DAILY"
  | "THREE_TIMES_DAILY"
  | "FOUR_TIMES_DAILY"
  | "AS_NEEDED"
  | "CUSTOM";

export type MedicineMatchStatus =
  | "MATCHED"
  | "POSSIBLE_MATCH"
  | "NOT_FOUND";

export type PrescriptionSchedule = {
  pattern: string;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  frequency: "ONCE_DAILY" | "TWICE_DAILY" | "THREE_TIMES_DAILY";
  selectedTimes: string[];
  instructionText: string;
};

export type MedicineDraftWithPrescription = MedicineDraft & {
  prescriptionPattern?: string | null;
};

export type MedicineReference = {
  id: string;
  slug: string;
  brandName: string;
  genericName: string;
  aliases: string[];
  commonStrengths: string[];
  form: string;
  category: string;
  usedFor: string;
  commonSideEffects: string[];
  defaultInstructions: string;
  defaultFrequency: MedicineReferenceFrequency;
  defaultTimeOfDay: string;
  safetyLevel: MedicineSafetyLevel;
  safetyNote: string;
  imageUrl: string | null;
  imageAltText: string | null;
};

export type MedicineSuggestion = MedicineReference & {
  matchConfidence: number;
  matchReason?: string;
};

export type ParsedMedicineScan = {
  rawText: string;
  lineText?: string;
  ocrConfidence: number;

  matched: boolean;
  matchStatus?: MedicineMatchStatus;
  matchConfidence: number;
  matchReason?: string;

  detectedName: string;
  brandName: string;
  genericName: string;
  dose: string;
  form: string;
  category: string;
  usedFor: string;
  commonSideEffects: string[];
  instructions: string;

  prescriptionSchedule: PrescriptionSchedule | null;

  safetyLevel: MedicineSafetyLevel;
  safetyNote: string;

  imageUrl: string | null;
  imageAltText: string | null;

  medicineReference: MedicineReference | null;
  suggestedMatches?: MedicineSuggestion[];

  medicineDraft: MedicineDraftWithPrescription;
};

export type ParsedPrescriptionMedicine = {
  rawText?: string;
  lineText: string;
  ocrConfidence: number;

  matched: boolean;
  matchStatus?: MedicineMatchStatus;
  matchConfidence: number;
  matchReason?: string;

  detectedName: string;
  brandName: string;
  genericName: string;
  dose: string;
  form: string;
  category: string;
  usedFor: string;
  commonSideEffects: string[];
  instructions: string;

  prescriptionSchedule: PrescriptionSchedule | null;

  safetyLevel: MedicineSafetyLevel;
  safetyNote: string;

  imageUrl: string | null;
  imageAltText: string | null;

  medicineReference: MedicineReference | null;
  suggestedMatches?: MedicineSuggestion[];

  medicineDraft: MedicineDraftWithPrescription;
};

export type ParsedPrescriptionScan = {
  rawText: string;
  ocrConfidence: number;
  medicines: ParsedPrescriptionMedicine[];
};

export type SearchMedicineReferenceResult = MedicineReference & {
  matchConfidence?: number;
  matchReason?: string;
};

const getBackendBaseUrl = () => {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, "");
};

export const getMedicineImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) {
    return null;
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${getBackendBaseUrl()}${imageUrl}`;
};

const getAuthHeaders = async () => {
  const token = await tokenStorage.getToken();

  if (!token) {
    throw new Error("Session expired. Please login again.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const getErrorMessage = async (response: Response) => {
  try {
    const result = await response.json();

    if (typeof result?.message === "string") {
      return result.message;
    }

    if (Array.isArray(result?.message)) {
      return result.message[0]?.message || "Unable to complete request.";
    }

    if (Array.isArray(result?.errors)) {
      return result.errors[0]?.message || "Unable to complete request.";
    }
  } catch (error) {
    return "Unable to complete request.";
  }

  return "Unable to complete request.";
};

const getResponseData = async <T>(response: Response): Promise<T> => {
  const result = await response.json();

  if (!response.ok) {
    const message =
      typeof result?.message === "string"
        ? result.message
        : "Unable to complete request.";

    throw new Error(message);
  }

  if (result?.data !== undefined) {
    return result.data as T;
  }

  return result as T;
};

export const medicineScanApi = {
  async searchMedicineReferences(
    query: string
  ): Promise<SearchMedicineReferenceResult[]> {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/patient/medicine-references/search?query=${encodeURIComponent(
        query
      )}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    return getResponseData<SearchMedicineReferenceResult[]>(response);
  },

  async parseMedicineScan({
    detectedText,
    ocrConfidence = 80,
  }: {
    detectedText: string;
    ocrConfidence?: number;
  }): Promise<ParsedMedicineScan> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/patient/medicine-scan/parse`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        detectedText,
        ocrConfidence,
      }),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    return getResponseData<ParsedMedicineScan>(response);
  },

  async parsePrescriptionScan({
    detectedText,
    ocrConfidence = 80,
  }: {
    detectedText: string;
    ocrConfidence?: number;
  }): Promise<ParsedPrescriptionScan> {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/patient/medicine-scan/prescription/parse`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          detectedText,
          ocrConfidence,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    return getResponseData<ParsedPrescriptionScan>(response);
  },
};