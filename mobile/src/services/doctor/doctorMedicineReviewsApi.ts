import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type DoctorMedicineReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type DoctorMedicineReviewFilter =
  | "ALL"
  | DoctorMedicineReviewStatus;

export type DoctorMedicineReview = {
  id: string;
  medicineId: string;
  patientId: string;
  reviewDoctorId: string | null;
  reviewedByDoctorId: string | null;
  frequency: string;
  customFrequency: string | null;
  timeOfDay: string;
  startDate: string;
  endDate: string | null;
  reviewStatus: DoctorMedicineReviewStatus;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
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
  };
  reviews: DoctorMedicineReview[];
};

export type DoctorMedicineReviewActionData = {
  review: DoctorMedicineReview;
};

const getErrorMessage = (result: any) => {
  if (
    typeof result?.message ===
    "string"
  ) {
    return result.message;
  }

  if (
    Array.isArray(result?.message)
  ) {
    return (
      result.message[0]?.message ||
      "Request failed."
    );
  }

  if (
    Array.isArray(result?.errors)
  ) {
    return (
      result.errors[0]?.message ||
      "Request failed."
    );
  }

  if (
    Array.isArray(result?.issues)
  ) {
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

const readResponse = async <T>(
  response: Response
) => {
  let result:
    | ApiResponse<T>
    | any = {};

  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      "The server returned an invalid response."
    );
  }

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

export const doctorMedicineReviewsApi =
  {
    async listReviews(
      status: DoctorMedicineReviewFilter =
        "ALL"
    ) {
      const response = await fetch(
        `${API_BASE_URL}/doctor/medicine-reviews?status=${encodeURIComponent(
          status
        )}`,
        {
          method: "GET",
          headers:
            await getAuthHeaders(),
        }
      );

      return readResponse<DoctorMedicineReviewsData>(
        response
      );
    },

    async approveReview(
      reminderId: string,
      note?: string
    ) {
      const response = await fetch(
        `${API_BASE_URL}/doctor/medicine-reviews/${encodeURIComponent(
          reminderId
        )}/approve`,
        {
          method: "POST",
          headers:
            await getAuthHeaders(),
          body: JSON.stringify({
            note:
              note?.trim() ||
              undefined,
          }),
        }
      );

      return readResponse<DoctorMedicineReviewActionData>(
        response
      );
    },

    async rejectReview(
      reminderId: string,
      note: string
    ) {
      const response = await fetch(
        `${API_BASE_URL}/doctor/medicine-reviews/${encodeURIComponent(
          reminderId
        )}/reject`,
        {
          method: "POST",
          headers:
            await getAuthHeaders(),
          body: JSON.stringify({
            note: note.trim(),
          }),
        }
      );

      return readResponse<DoctorMedicineReviewActionData>(
        response
      );
    },
  };