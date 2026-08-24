import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = { success: boolean; message: string; data: T };

export type CaregiverSafetyAlertStatus = "ACTIVE" | "CANCELLED" | "ESCALATED" | "RESOLVED";
export type CaregiverVitalStatus = "STABLE" | "WARNING" | "CRITICAL";

export type CaregiverSafetyVital = {
  id: string;
  heartRate: number | null;
  spo2: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  glucose: number | null;
  temperature: number | null;
  status: CaregiverVitalStatus;
  source: string;
  recordedAt: string;
};

export type CaregiverSafetyConsultation = {
  id: string;
  type: string;
  status: string;
  preferredAt: string | null;
  doctorName: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaregiverSafetyAlert = {
  id: string;
  patientId: string;
  doctorId: string | null;
  vitalReadingId: string | null;
  status: CaregiverSafetyAlertStatus;
  reason: string;
  timerEndsAt: string | null;
  cancelledAt: string | null;
  escalatedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  doctor: { id: string; fullName: string } | null;
  vitalReading: CaregiverSafetyVital | null;
  consultation: CaregiverSafetyConsultation | null;
};

export type CaregiverSafetyList = {
  activeAlert: CaregiverSafetyAlert | null;
  recentAlerts: CaregiverSafetyAlert[];
  summary: {
    totalReturned: number;
    active: number;
    escalated: number;
    resolved: number;
    cancelled: number;
  };
};

export type CaregiverSafetyEscalation = {
  id: string;
  source: string;
  sequenceNumber: number;
  notifiedAt: string | null;
  createdAt: string;
  doctor: {
    id: string;
    fullName: string;
    doctorProfile: { specialization: string | null; clinicName: string | null } | null;
  };
  triggeredBy: { id: string; fullName: string; role: string };
};

export type CaregiverSafetyEscalationHistory = {
  alertId: string;
  currentDoctor: { id: string; fullName: string } | null;
  escalations: CaregiverSafetyEscalation[];
};

export type CaregiverSafetyRetryResult = {
  alertId: string;
  currentDoctor: {
    id: string;
    fullName: string;
    email: string;
    specialization: string | null;
    clinicName: string | null;
  };
  escalation: {
    id: string;
    safetyAlertId: string;
    doctorId: string;
    source: string;
    sequenceNumber: number;
    notifiedAt: string | null;
    createdAt: string;
  };
  consultationId: string | null;
  notification: { id: string; pushStatus: string };
  message: string;
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

export const caregiverSafetyApi = {
  async listPatientAlerts(patientId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/safety-alerts`, { method: "GET", headers: await getHeaders() });
    return parseResponse<CaregiverSafetyList>(response);
  },

  async getPatientAlert(patientId: string, alertId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/safety-alerts/${encodeURIComponent(alertId)}`, { method: "GET", headers: await getHeaders() });
    return parseResponse<CaregiverSafetyAlert>(response);
  },

  async getEscalationHistory(patientId: string, alertId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/safety-alerts/${encodeURIComponent(alertId)}/escalations`, { method: "GET", headers: await getHeaders() });
    return parseResponse<CaregiverSafetyEscalationHistory>(response);
  },

  async tryAnotherDoctor(patientId: string, alertId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/safety-alerts/${encodeURIComponent(alertId)}/try-another-doctor`, { method: "POST", headers: await getHeaders() });
    return parseResponse<CaregiverSafetyRetryResult>(response);
  },
};