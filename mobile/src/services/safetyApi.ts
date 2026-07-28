import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

import type { VitalReading } from "../types/vitals";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type SafetyAlertStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "ESCALATED"
  | "RESOLVED";

export type ConsultationType = "EMERGENCY" | "MANUAL";

export type ConsultationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type MeetingConfig = {
  domain: string;
  appId: string;
  roomName: string;
  jwt: string;
  webUrl: string;
  userRole: "PATIENT" | "DOCTOR";
  moderator: boolean;
};

export type Consultation = {
  id: string;
  patientId: string;
  doctorId: string | null;
  safetyAlertId: string | null;
  type: ConsultationType;
  status: ConsultationStatus;
  reason: string;
  preferredAt: string | null;
  notes: string | null;
  doctorName: string | null;
  rejectionNote: string | null;
  jaasRoomName: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SafetyAlert = {
  id: string;
  patientId: string;
  doctorId: string | null;
  vitalReadingId: string | null;
  status: SafetyAlertStatus;
  reason: string;
  timerEndsAt: string;
  cancelledAt: string | null;
  escalatedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  vitalReading: VitalReading | null;
  consultation: Consultation | null;
};

export type CreateSafetyAlertPayload = {
  vitalReadingId?: string;
  reason?: string;
};

export type EscalateSafetyAlertResult = {
  alert: SafetyAlert;
  consultation: Consultation;
  patientMeeting: MeetingConfig;
  doctorMeeting: MeetingConfig;
};

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") {
    return result.message;
  }

  if (Array.isArray(result?.message)) {
    return result.message[0]?.message || "Request failed.";
  }

  if (Array.isArray(result?.errors)) {
    return result.errors[0]?.message || "Request failed.";
  }

  return "Request failed.";
};

const getAuthHeaders = async () => {
  const token = await tokenStorage.getToken();

  if (!token) {
    throw new Error("Please login again.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const safetyApi = {
  async createSafetyAlert(payload: CreateSafetyAlertPayload) {
    const response = await fetch(`${API_BASE_URL}/patient/safety-alerts`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const result: ApiResponse<SafetyAlert> | any = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as SafetyAlert;
  },

  async getActiveSafetyAlert() {
    const response = await fetch(`${API_BASE_URL}/patient/safety-alerts/active`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    const result: ApiResponse<SafetyAlert | null> | any = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as SafetyAlert | null;
  },

  async cancelSafetyAlert(alertId: string) {
    const response = await fetch(
      `${API_BASE_URL}/patient/safety-alerts/${alertId}/cancel`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
      }
    );

    const result: ApiResponse<SafetyAlert> | any = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as SafetyAlert;
  },

  async escalateSafetyAlert(alertId: string) {
    const response = await fetch(
      `${API_BASE_URL}/patient/safety-alerts/${alertId}/escalate`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
      }
    );

    const result: ApiResponse<EscalateSafetyAlertResult> | any =
      await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as EscalateSafetyAlertResult;
  },
};