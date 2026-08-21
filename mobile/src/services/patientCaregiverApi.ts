import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type PatientCaregiverRelationshipStatus = "PENDING" | "ACTIVE" | "REJECTED" | "REVOKED";

export type PatientCaregiverRelationship = {
  id: string;
  patientId: string;
  caregiverId: string;
  status: PatientCaregiverRelationshipStatus;
  requestedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  caregiver: {
    id: string;
    fullName: string;
    email: string;
  };
};

export type PatientCaregiverRelationships = {
  pendingRequests: PatientCaregiverRelationship[];
  activeCaregivers: PatientCaregiverRelationship[];
  history: PatientCaregiverRelationship[];
};

const BASE_PATH = `${API_BASE_URL}/patient/caregiver-links`;

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") return result.message;
  if (Array.isArray(result?.message)) return result.message[0]?.message || "Request failed.";
  if (Array.isArray(result?.errors)) return result.errors[0]?.message || "Request failed.";
  if (Array.isArray(result?.issues)) return result.issues[0]?.message || "Request failed.";
  return "Request failed.";
};

const getHeaders = async () => {
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

export const patientCaregiverApi = {
  async getRelationships() {
    const response = await fetch(BASE_PATH, { method: "GET", headers: await getHeaders() });
    return parseResponse<PatientCaregiverRelationships>(response);
  },

  async approve(relationshipId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(relationshipId)}/approve`, { method: "PATCH", headers: await getHeaders() });
    return parseResponse<PatientCaregiverRelationship>(response);
  },

  async reject(relationshipId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(relationshipId)}/reject`, { method: "PATCH", headers: await getHeaders() });
    return parseResponse<PatientCaregiverRelationship>(response);
  },

  async revoke(relationshipId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(relationshipId)}/revoke`, { method: "PATCH", headers: await getHeaders() });
    return parseResponse<PatientCaregiverRelationship>(response);
  },
};