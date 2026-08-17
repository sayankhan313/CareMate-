import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type DoctorRefillVerificationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED";

export type DoctorRefillSubmissionStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "VERIFICATION_REQUIRED"
  | "VERIFIED"
  | "ACCEPTED"
  | "REJECTED";

export type DoctorRefillVerificationItem = {
  id?: string;
  medicineId: string | null;
  name: string;
  dose: string | null;
  quantity: string | null;
  instructions: string | null;
};

export type DoctorRefillVerificationRequest = {
  id: string;
  status: DoctorRefillSubmissionStatus;
  doctorVerificationStatus: DoctorRefillVerificationStatus;
  doctorVerificationRequestedAt: string | null;
  doctorVerificationNote?: string | null;
  doctorVerifiedAt?: string | null;
  createdAt: string;

  patient: {
    id: string;
    fullName: string;
  };

  pharmacy?: {
    id: string;
    pharmacyProfile: {
      pharmacyName: string;
    } | null;
  };

  items: DoctorRefillVerificationItem[];

  medicineOrder: {
    id: string;
    orderNumber: string | null;
    status: string;
    fulfilmentAllowed: boolean;
    prescriptionConfirmed?: boolean;
    doctorId?: string | null;
  } | null;
};

export type DoctorRefillVerificationListData = {
  count: number;
  requests: DoctorRefillVerificationRequest[];
};

export type DoctorRefillVerificationActionData = {
  message: string;

  submission: {
    id: string;
    status: string;
    doctorVerificationStatus: DoctorRefillVerificationStatus;
    doctorVerificationNote: string | null;
    doctorVerifiedAt: string | null;
  };

  order: {
    id: string;
    orderNumber: string | null;
    status: string;
    prescriptionConfirmed: boolean;
    fulfilmentAllowed: boolean;
    doctorId?: string | null;
  };
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

export const doctorRefillVerificationsApi = {
  async listPending() {
    const response = await fetch(
      `${API_BASE_URL}/doctor/refill-verifications`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      },
    );

    return readResponse<DoctorRefillVerificationListData>(
      response,
    );
  },

  async getDetail(submissionId: string) {
    const response = await fetch(
      `${API_BASE_URL}/doctor/refill-verifications/${encodeURIComponent(
        submissionId,
      )}`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      },
    );

    return readResponse<DoctorRefillVerificationRequest>(
      response,
    );
  },

  async confirm(
    submissionId: string,
    note?: string,
  ) {
    const response = await fetch(
      `${API_BASE_URL}/doctor/refill-verifications/${encodeURIComponent(
        submissionId,
      )}/confirm`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          note: note?.trim() || undefined,
        }),
      },
    );

    return readResponse<DoctorRefillVerificationActionData>(
      response,
    );
  },

  async reject(
    submissionId: string,
    note?: string,
  ) {
    const response = await fetch(
      `${API_BASE_URL}/doctor/refill-verifications/${encodeURIComponent(
        submissionId,
      )}/reject`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          note: note?.trim() || undefined,
        }),
      },
    );

    return readResponse<DoctorRefillVerificationActionData>(
      response,
    );
  },
};