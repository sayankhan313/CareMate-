import { API_BASE_URL } from "../../constants/api";
import type { MeetingConfig } from "../safetyApi";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type DoctorConsultationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type DoctorConsultationType =
  | "EMERGENCY"
  | "MANUAL";

export type DoctorConsultationPatient = {
  id: string;
  fullName: string;
  email: string;
};

export type DoctorConsultation = {
  id: string;
  patientId: string;
  doctorId: string | null;
  safetyAlertId: string | null;
  type: DoctorConsultationType;
  status: DoctorConsultationStatus;
  reason: string;
  preferredAt: string | null;
  notes: string | null;
  doctorName: string | null;
  createdAt: string;
  updatedAt: string;
  patient: DoctorConsultationPatient | null;
  canJoinCall: boolean;
};

export type DoctorConsultationsData = {
  consultations: DoctorConsultation[];
};

export type DoctorConsultationDetailData = {
  consultation: DoctorConsultation;
};

export type DoctorConsultationActionData = {
  consultation: DoctorConsultation;
};

export type DoctorJoinConfigData = {
  consultation: DoctorConsultation;
  doctorMeeting: MeetingConfig;
};

export type DoctorConsultationFilterStatus =
  | "ALL"
  | DoctorConsultationStatus;

export type DoctorConsultationFilterType =
  | "ALL"
  | DoctorConsultationType;

type DoctorConsultationActionPayload = {
  notes?: string;
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
  const token =
    await tokenStorage.getToken();

  if (!token) {
    throw new Error(
      "Please login again."
    );
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const buildQuery = (
  status: DoctorConsultationFilterStatus,
  type: DoctorConsultationFilterType
) => {
  const params =
    new URLSearchParams();

  params.append(
    "status",
    status
  );

  params.append(
    "type",
    type
  );

  return params.toString();
};

const requestDoctorApi = async <T>(
  path: string,
  options: RequestInit
): Promise<T> => {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        ...(await getAuthHeaders()),
        ...(options.headers || {}),
      },
    }
  );

  const result:
    | ApiResponse<T>
    | any = await response.json();

  if (
    !response.ok ||
    !result.success
  ) {
    throw new Error(
      getErrorMessage(result)
    );
  }

  return result.data as T;
};

const buildActionBody = (
  notes?: string
): DoctorConsultationActionPayload => {
  const cleanedNotes =
    notes?.trim();

  if (!cleanedNotes) {
    return {};
  }

  return {
    notes: cleanedNotes,
  };
};

export const doctorConsultationsApi = {
  async listConsultations(
    status: DoctorConsultationFilterStatus = "ALL",
    type: DoctorConsultationFilterType = "ALL"
  ): Promise<DoctorConsultationsData> {
    const query =
      buildQuery(status, type);

    return requestDoctorApi<DoctorConsultationsData>(
      `/doctor/consultations?${query}`,
      {
        method: "GET",
      }
    );
  },

  async getConsultationDetail(
    consultationId: string
  ): Promise<DoctorConsultationDetailData> {
    return requestDoctorApi<DoctorConsultationDetailData>(
      `/doctor/consultations/${consultationId}`,
      {
        method: "GET",
      }
    );
  },

  async getDoctorJoinConfig(
    consultationId: string
  ): Promise<DoctorJoinConfigData> {
    return requestDoctorApi<DoctorJoinConfigData>(
      `/doctor/consultations/${consultationId}/join`,
      {
        method: "GET",
      }
    );
  },

  async acceptConsultation(
    consultationId: string,
    notes?: string
  ): Promise<DoctorConsultationActionData> {
    return requestDoctorApi<DoctorConsultationActionData>(
      `/doctor/consultations/${consultationId}/accept`,
      {
        method: "POST",
        body: JSON.stringify(
          buildActionBody(notes)
        ),
      }
    );
  },

  async rejectConsultation(
    consultationId: string,
    notes?: string
  ): Promise<DoctorConsultationActionData> {
    return requestDoctorApi<DoctorConsultationActionData>(
      `/doctor/consultations/${consultationId}/reject`,
      {
        method: "POST",
        body: JSON.stringify(
          buildActionBody(notes)
        ),
      }
    );
  },

  async completeConsultation(
    consultationId: string,
    notes?: string
  ): Promise<DoctorConsultationActionData> {
    return requestDoctorApi<DoctorConsultationActionData>(
      `/doctor/consultations/${consultationId}/complete`,
      {
        method: "POST",
        body: JSON.stringify(
          buildActionBody(notes)
        ),
      }
    );
  },
};