import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

export type PatientCareDiaryEntry = {
  id: string;
  title: string;
  note: string;
  mood: string | null;
  symptoms: string | null;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
};

export type PatientCareDiaryInput = {
  title: string;
  note: string;
  mood?: string | null;
  symptoms?: string | null;
  entryDate?: string;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Please login again.");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(result.message || "Unable to complete care diary request.");
  return result as T;
};

export const patientCareDiaryApi = {
  async listEntries() {
    return request<ApiResponse<{ count: number; entries: PatientCareDiaryEntry[] }>>("/patient/care-diary");
  },

  async getEntry(entryId: string) {
    return request<ApiResponse<{ entry: PatientCareDiaryEntry }>>(`/patient/care-diary/${entryId}`);
  },

  async createEntry(input: PatientCareDiaryInput) {
    return request<ApiResponse<{ entry: PatientCareDiaryEntry }>>("/patient/care-diary", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateEntry(entryId: string, input: PatientCareDiaryInput) {
    return request<ApiResponse<{ entry: PatientCareDiaryEntry }>>(`/patient/care-diary/${entryId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async deleteEntry(entryId: string) {
    return request<ApiResponse<{ message: string }>>(`/patient/care-diary/${entryId}`, {
      method: "DELETE",
    });
  },
};