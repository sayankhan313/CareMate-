import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

export type CaregiverObservationCategory = "GENERAL" | "ROUTINE" | "APPETITE" | "SLEEP" | "MOBILITY" | "MOOD" | "MEDICATION_SUPPORT";

export type CaregiverObservation = {
  id: string;
  patientId: string;
  caregiverId: string;
  caregiverName: string | null;
  category: CaregiverObservationCategory;
  observation: string;
  observedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CaregiverObservationList = {
  patient: { id: string; fullName: string };
  summary: { total: number; general: number; routine: number; appetite: number; sleep: number; mobility: number; mood: number; medicationSupport: number };
  observations: CaregiverObservation[];
};

export type CaregiverObservationDetail = {
  patient: { id: string; fullName: string };
  observation: CaregiverObservation;
};

export type CreateCaregiverObservationInput = {
  category: CaregiverObservationCategory;
  observation: string;
  observedAt?: string;
};

type ApiResponse<T> = { success: boolean; message: string; data: T };

const BASE_PATH = `${API_BASE_URL}/caregiver/patients`;

const getHeaders = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Your session has expired. Please log in again.");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
};

const readResponse = async <T>(response: Response): Promise<T> => {
  let result: ApiResponse<T> | any;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !result?.success) throw new Error(typeof result?.message === "string" ? result.message : "Request failed.");
  if (result.data === undefined || result.data === null) throw new Error("The server returned empty data.");
  return result.data as T;
};

export const caregiverObservationApi = {
  async listPatientObservations(patientId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/observations`, { method: "GET", headers: await getHeaders() });
    return readResponse<CaregiverObservationList>(response);
  },

  async createObservation(patientId: string, input: CreateCaregiverObservationInput) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/observations`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(input),
    });

    return readResponse<CaregiverObservationDetail>(response);
  },

  async getObservation(patientId: string, observationId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/observations/${encodeURIComponent(observationId)}`, { method: "GET", headers: await getHeaders() });
    return readResponse<CaregiverObservationDetail>(response);
  },
};