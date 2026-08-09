import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type DoctorMedicineReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "APPLIED";
export type DoctorMedicineReviewRequestType = "ADD" | "DELETE";
export type DoctorMedicineReviewFilter = "ALL" | DoctorMedicineReviewStatus;
export type DoctorMedicineReviewTypeFilter = "ALL" | DoctorMedicineReviewRequestType;
export type DoctorPoolMedicineReviewDecision = "APPROVED" | "REJECTED";
export type DoctorPoolMedicineReviewRoutingStatus = "POOL_ASSIGNED" | "POOL_REVIEW_COMPLETED";

export type DoctorMedicineReview = {
  id: string;
  medicineId: string;
  patientId: string;
  reviewDoctorId: string | null;
  reviewedByDoctorId: string | null;
  requestType: DoctorMedicineReviewRequestType;
  reviewStatus: DoctorMedicineReviewStatus;
  patientReason: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  patientSeenAt: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  frequency: string;
  customFrequency: string | null;
  timeOfDay: string;
  startDate: string | null;
  endDate: string | null;

  patient: {
    id: string;
    fullName: string;
    email: string;
  };

  medicine: {
    id: string;
    name: string;
    dose: string;
    instructions: string | null;
    source: string;
    isActive: boolean;
  };

  reviewedByDoctor: {
    id: string;
    fullName: string;
    email: string;
  } | null;

  canApprove: boolean;
  canReject: boolean;
};

export type DoctorMedicineReviewsData = {
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    applied: number;
    additions: number;
    deletions: number;
  };
  reviews: DoctorMedicineReview[];
};

export type DoctorMedicineReviewDetailData = {
  review: DoctorMedicineReview;
};

export type DoctorMedicineReviewActionData = {
  review: DoctorMedicineReview;
};

export type DoctorPoolMedicineReview = {
  id: string;
  medicineId: string;
  requestType: DoctorMedicineReviewRequestType;
  routingStatus: DoctorPoolMedicineReviewRoutingStatus;
  patientReason: string | null;
  poolDecision: DoctorPoolMedicineReviewDecision | null;
  poolDoctorNote: string | null;
  poolAssignedAt: string | null;
  poolReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;

  medicine: {
    id: string;
    name: string;
    dose: string;
    instructions: string | null;
    source: string;
    frequency: string;
    customFrequency: string | null;
    timeOfDay: string;
    startDate: string | null;
    endDate: string | null;
  };

  clinicalContext: {
    patientReference: string;
    age: number | null;
    gender: string | null;
    medicalConditions: string | null;
    allergies: string | null;

    otherActiveMedicines: {
      id: string;
      name: string;
      dose: string;
      instructions: string | null;
      source: string;
    }[];

    latestVitals: {
      heartRate: number | null;
      spo2: number | null;
      bpSystolic: number | null;
      bpDiastolic: number | null;
      glucose: number | null;
      temperature: number | null;
      status: string;
      recordedAt: string;
    } | null;
  };

  canApprove: boolean;
  canReject: boolean;
};

export type DoctorPoolMedicineReviewsData = {
  summary: {
    total: number;
    awaitingReview: number;
    completed: number;
  };
  reviews: DoctorPoolMedicineReview[];
};

export type DoctorPoolMedicineReviewDetailData = {
  review: DoctorPoolMedicineReview;
};

export type DoctorPoolMedicineReviewActionData = {
  message: string;
  review: DoctorPoolMedicineReview;
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

  if (!response.ok || !result.success) throw new Error(getErrorMessage(result));
  return result.data as T;
};

export const doctorMedicineReviewsApi = {
  async listReviews(
    status: DoctorMedicineReviewFilter = "ALL",
    requestType: DoctorMedicineReviewTypeFilter = "ALL"
  ) {
    const query = new URLSearchParams({ status, requestType });

    const response = await fetch(`${API_BASE_URL}/doctor/medicine-reviews?${query.toString()}`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return readResponse<DoctorMedicineReviewsData>(response);
  },

  async getReviewDetail(requestId: string) {
    const response = await fetch(`${API_BASE_URL}/doctor/medicine-reviews/${encodeURIComponent(requestId)}`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return readResponse<DoctorMedicineReviewDetailData>(response);
  },

  async approveReview(requestId: string, note?: string) {
    const response = await fetch(`${API_BASE_URL}/doctor/medicine-reviews/${encodeURIComponent(requestId)}/approve`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ note: note?.trim() || undefined }),
    });

    return readResponse<DoctorMedicineReviewActionData>(response);
  },

  async rejectReview(requestId: string, note: string) {
    const response = await fetch(`${API_BASE_URL}/doctor/medicine-reviews/${encodeURIComponent(requestId)}/reject`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ note: note.trim() }),
    });

    return readResponse<DoctorMedicineReviewActionData>(response);
  },

  async listPoolReviews() {
    const response = await fetch(`${API_BASE_URL}/doctor/medicine-review-pool`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return readResponse<DoctorPoolMedicineReviewsData>(response);
  },

  async getPoolReviewDetail(requestId: string) {
    const response = await fetch(`${API_BASE_URL}/doctor/medicine-review-pool/${encodeURIComponent(requestId)}`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return readResponse<DoctorPoolMedicineReviewDetailData>(response);
  },

  async approvePoolReview(requestId: string, note?: string) {
    const response = await fetch(`${API_BASE_URL}/doctor/medicine-review-pool/${encodeURIComponent(requestId)}/approve`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ note: note?.trim() || undefined }),
    });

    return readResponse<DoctorPoolMedicineReviewActionData>(response);
  },

  async rejectPoolReview(requestId: string, note: string) {
    const response = await fetch(`${API_BASE_URL}/doctor/medicine-review-pool/${encodeURIComponent(requestId)}/reject`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ note: note.trim() }),
    });

    return readResponse<DoctorPoolMedicineReviewActionData>(response);
  },
};