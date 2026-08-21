import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = { success: boolean; message: string; data: T };

export type CaregiverConsultationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type CaregiverConsultation = {
  id: string;
  patientId: string;
  doctorId: string | null;
  type: "EMERGENCY" | "MANUAL" | string;
  status: CaregiverConsultationStatus;
  preferredAt: string | null;
  doctor: {
    id: string | null;
    fullName: string;
    specialization: string | null;
    clinicName: string | null;
  } | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  safetyAlert: {
    id: string;
    status: string;
    escalatedAt: string | null;
    resolvedAt: string | null;
    createdAt: string;
  } | null;
};

export type CaregiverConsultationListData = {
  patient: { id: string; fullName: string };
  summary: {
    total: number;
    pending: number;
    accepted: number;
    inProgress: number;
    completed: number;
    rejected: number;
    cancelled: number;
    upcoming: number;
  };
  consultations: CaregiverConsultation[];
};

export type CaregiverConsultationDetailData = {
  patient: { id: string; fullName: string };
  consultation: CaregiverConsultation;
};

const BASE_PATH = `${API_BASE_URL}/caregiver/patients`;

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

  if (!response.ok || !result.success) throw new Error(typeof result?.message === "string" ? result.message : "Request failed.");
  return result.data as T;
};

export const caregiverConsultationApi = {
  async listPatientConsultations(patientId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/consultations`, { method: "GET", headers: await getHeaders() });
    return parseResponse<CaregiverConsultationListData>(response);
  },

  async getPatientConsultation(patientId: string, consultationId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/consultations/${encodeURIComponent(consultationId)}`, { method: "GET", headers: await getHeaders() });
    return parseResponse<CaregiverConsultationDetailData>(response);
  },
};