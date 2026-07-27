import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type DoctorAlertStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "ESCALATED"
  | "RESOLVED";

export type DoctorAlertFilterStatus =
  | "ALL"
  | DoctorAlertStatus;

export type DoctorAlertPatient = {
  id: string;
  fullName: string;
  email: string;
};

export type DoctorAlertVitalReading = {
  id: string;
  heartRate: number | null;
  spo2: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  glucose: number | null;
  temperature: number | null;
  status: string;
  source: string;
  deviceSource: string | null;
  recordedAt: string;
};

export type DoctorAlertConsultation = {
  id: string;
  type: string;
  status: string;
  reason: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
};

export type DoctorSafetyAlert = {
  id: string;
  patientId: string;
  doctorId: string | null;
  vitalReadingId: string | null;
  status: DoctorAlertStatus;
  reason: string;
  timerEndsAt: string;
  cancelledAt: string | null;
  escalatedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient: DoctorAlertPatient | null;
  vitalReading: DoctorAlertVitalReading | null;
  consultation: DoctorAlertConsultation | null;
  canAcceptConsultation: boolean;
  canJoinCall: boolean;
  canResolveAlert: boolean;
};

export type DoctorAlertsData = {
  alerts: DoctorSafetyAlert[];
};

export type DoctorAlertDetailData = {
  alert: DoctorSafetyAlert;
};

export type ResolveDoctorAlertData = {
  alert: DoctorSafetyAlert;
};

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") {
    return result.message;
  }

  if (Array.isArray(result?.message)) {
    return (
      result.message[0]?.message ||
      "Request failed."
    );
  }

  if (Array.isArray(result?.errors)) {
    return (
      result.errors[0]?.message ||
      "Request failed."
    );
  }

  if (Array.isArray(result?.issues)) {
    return (
      result.issues[0]?.message ||
      "Request failed."
    );
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

const readResponse = async <T>(
  response: Response
) => {
  let result: ApiResponse<T> | any = {};

  try {
    result = await response.json();
  } catch {
    throw new Error(
      "The server returned an invalid response."
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(getErrorMessage(result));
  }

  return result.data as T;
};

export const doctorAlertsApi = {
  async listAlerts(
    status: DoctorAlertFilterStatus = "ALL"
  ) {
    const response = await fetch(
      `${API_BASE_URL}/doctor/alerts?status=${encodeURIComponent(
        status
      )}`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    return readResponse<DoctorAlertsData>(
      response
    );
  },

  async getAlertDetail(alertId: string) {
    const response = await fetch(
      `${API_BASE_URL}/doctor/alerts/${encodeURIComponent(
        alertId
      )}`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    return readResponse<DoctorAlertDetailData>(
      response
    );
  },

  async resolveAlert(alertId: string) {
    const response = await fetch(
      `${API_BASE_URL}/doctor/alerts/${encodeURIComponent(
        alertId
      )}/resolve`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
      }
    );

    return readResponse<ResolveDoctorAlertData>(
      response
    );
  },
};