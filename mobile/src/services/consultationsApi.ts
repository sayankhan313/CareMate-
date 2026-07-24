import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

import type {
  Consultation,
  MeetingConfig,
} from "./safetyApi";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type CreateManualConsultationPayload = {
  doctorId: string;
  reason: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
};

export type CreateConsultationResult = {
  consultation: Consultation;
  patientMeeting: MeetingConfig;
  doctorMeeting: MeetingConfig;
};

export type PatientJoinConfigResult = {
  consultation: Consultation;
  patientMeeting: MeetingConfig;
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

export const consultationsApi = {
  async createManualConsultation(
    payload: CreateManualConsultationPayload
  ) {
    const response = await fetch(
      `${API_BASE_URL}/patient/consultations/manual`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );

    const result:
      | ApiResponse<CreateConsultationResult>
      | any = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        getErrorMessage(result)
      );
    }

    return result.data as CreateConsultationResult;
  },

  async listConsultations() {
    const response = await fetch(
      `${API_BASE_URL}/patient/consultations`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    const result:
      | ApiResponse<Consultation[]>
      | any = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        getErrorMessage(result)
      );
    }

    return result.data as Consultation[];
  },

  async getConsultationById(
    consultationId: string
  ) {
    const response = await fetch(
      `${API_BASE_URL}/patient/consultations/${consultationId}`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    const result:
      | ApiResponse<Consultation>
      | any = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        getErrorMessage(result)
      );
    }

    return result.data as Consultation;
  },

  async getPatientJoinConfig(
    consultationId: string
  ) {
    const response = await fetch(
      `${API_BASE_URL}/patient/consultations/${consultationId}/join`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    const result:
      | ApiResponse<PatientJoinConfigResult>
      | any = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        getErrorMessage(result)
      );
    }

    return result.data as PatientJoinConfigResult;
  },
};