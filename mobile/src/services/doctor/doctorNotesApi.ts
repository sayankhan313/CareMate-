import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type DoctorNote = {
  id: string;
  patientId: string;
  doctorId: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type DoctorNotesData = {
  notes: DoctorNote[];
};

export type CreateDoctorNoteData = {
  note: DoctorNote;
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

export const doctorNotesApi = {
  async getNotes(patientId: string) {
    const response = await fetch(
      `${API_BASE_URL}/doctor/patients/${patientId}/notes`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    const result: ApiResponse<DoctorNotesData> | any = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as DoctorNotesData;
  },

  async createNote(patientId: string, note: string) {
    const response = await fetch(
      `${API_BASE_URL}/doctor/patients/${patientId}/notes`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          note,
        }),
      }
    );

    const result: ApiResponse<CreateDoctorNoteData> | any =
      await response.json();

    if (!response.ok || !result.success) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as CreateDoctorNoteData;
  },
};