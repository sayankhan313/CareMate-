import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type CaregiverLinkedPatient = {
  relationshipId: string;
  linkedAt: string | null;
  patient: {
    id: string;
    fullName: string;
    email: string;
  };
};

export type CaregiverLinkedPatientDetail = {
  relationship: {
    id: string;
    status: string;
    linkedAt: string | null;
  };
  patient: {
    id: string;
    fullName: string;
    email: string;
  };
};

export type CaregiverLinkRequestResult = {
  relationship: {
    id: string;
    patientId: string;
    caregiverId: string;
    status: string;
    requestedAt: string;
    createdAt: string;
    updatedAt: string;
  };
  patient: {
    id: string;
    fullName: string;
    email: string;
  };
};

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") return result.message;
  if (Array.isArray(result?.message)) return result.message[0]?.message || "Request failed.";
  if (Array.isArray(result?.errors)) return result.errors[0]?.message || "Request failed.";
  if (Array.isArray(result?.issues)) return result.issues[0]?.message || "Request failed.";
  return "Request failed.";
};

const getAuthHeaders = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Please login again.");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
};

const parseResponse = async <T>(response: Response) => {
  let result: ApiResponse<T> | any = {};

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok || !result.success) throw new Error(getErrorMessage(result));
  return result.data as T;
};

export const caregiverPatientsApi = {
  async getLinkedPatients() {
    const response = await fetch(`${API_BASE_URL}/caregiver/patients`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return parseResponse<{ patients: CaregiverLinkedPatient[] }>(response);
  },

  async getLinkedPatient(patientId: string) {
    const response = await fetch(`${API_BASE_URL}/caregiver/patients/${encodeURIComponent(patientId)}`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return parseResponse<CaregiverLinkedPatientDetail>(response);
  },

  async requestLink(patientEmail: string) {
    const response = await fetch(`${API_BASE_URL}/caregiver/link-requests`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ patientEmail: patientEmail.trim().toLowerCase() }),
    });

    return parseResponse<CaregiverLinkRequestResult>(response);
  },
};