import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type PatientMedicineReviewRequestType =
  | "ADD"
  | "DELETE";

export type PatientMedicineReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "APPLIED";

export type PatientMedicineReviewDoctor = {
  id: string;
  fullName: string;
  email: string;
  doctorProfile?: {
    specialization: string;
  } | null;
};

export type PatientMedicineReviewMedicine = {
  id: string;
  name: string;
  dose: string;
  instructions: string | null;
  source: string;
  isActive: boolean;
  frequency: string | null;
  customFrequency: string | null;
  timeOfDay: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type PatientMedicineReviewRequest = {
  id: string;
  patientId: string;
  doctorId: string;
  reviewedByDoctorId: string | null;
  medicineId: string;

  requestType: PatientMedicineReviewRequestType;
  status: PatientMedicineReviewStatus;

  patientReason: string | null;
  doctorNote: string | null;

  reviewedAt: string | null;
  patientSeenAt: string | null;
  appliedAt: string | null;

  createdAt: string;
  updatedAt: string;

  isUnread: boolean;
  canApply: boolean;
  canResubmit: boolean;

  doctor: PatientMedicineReviewDoctor | null;
  reviewedByDoctor: {
    id: string;
    fullName: string;
    email: string;
  } | null;

  medicine: PatientMedicineReviewMedicine | null;
};

export type PatientMedicineReviewsData = {
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    applied: number;
    unread: number;
  };

  requests: PatientMedicineReviewRequest[];
};

export type PatientMedicineReviewActionData = {
  message?: string;
  request: PatientMedicineReviewRequest;
};

export type ResubmitMedicineReviewInput = {
  name: string;
  dose: string;
  instructions?: string;
  frequency:
    | "ONCE_DAILY"
    | "TWICE_DAILY"
    | "THREE_TIMES_DAILY"
    | "FOUR_TIMES_DAILY"
    | "AS_NEEDED"
    | "CUSTOM";
  customFrequency?: string;
  timeOfDay: string;
  startDate: string;
  endDate?: string;
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

  if (Array.isArray(result?.issues)) {
    return result.issues[0]?.message || "Request failed.";
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

const readResponse = async <T>(response: Response) => {
  let result: ApiResponse<T> | any = {};

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !result.success) {
    throw new Error(getErrorMessage(result));
  }

  return result.data as T;
};

export const patientMedicineReviewsApi = {
  async listReviews() {
    const response = await fetch(
      `${API_BASE_URL}/patient/medicine-reviews`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    return readResponse<PatientMedicineReviewsData>(response);
  },

  async markSeen(requestId: string) {
    const response = await fetch(
      `${API_BASE_URL}/patient/medicine-reviews/${encodeURIComponent(
        requestId
      )}/seen`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
      }
    );

    return readResponse<PatientMedicineReviewActionData>(response);
  },

  async applyApprovedReview(requestId: string) {
    const response = await fetch(
      `${API_BASE_URL}/patient/medicine-reviews/${encodeURIComponent(
        requestId
      )}/apply`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
      }
    );

    return readResponse<PatientMedicineReviewActionData>(response);
  },

  async resubmitReview(
    requestId: string,
    input: ResubmitMedicineReviewInput
  ) {
    const response = await fetch(
      `${API_BASE_URL}/patient/medicine-reviews/${encodeURIComponent(
        requestId
      )}/resubmit`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(input),
      }
    );

    return readResponse<PatientMedicineReviewActionData>(response);
  },

  async requestDeletion(medicineId: string, reason: string) {
    const response = await fetch(
      `${API_BASE_URL}/patient/medicines/${encodeURIComponent(
        medicineId
      )}/deletion-review`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          reason: reason.trim(),
        }),
      }
    );

    return readResponse<PatientMedicineReviewActionData>(response);
  },
};