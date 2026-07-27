import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";
import type { CreateVitalReadingPayload, VitalReading } from "../types/vitals";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
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

export const vitalsApi = {
  async createReading(payload: CreateVitalReadingPayload) {
    const response = await fetch(`${API_BASE_URL}/patient/vitals/readings`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const result: ApiResponse<VitalReading> | any = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as VitalReading;
  },

  async getLatestReading() {
    const response = await fetch(`${API_BASE_URL}/patient/vitals/latest`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    const result: ApiResponse<VitalReading | null> | any = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as VitalReading | null;
  },

  async getReadingHistory(limit = 10) {
    const response = await fetch(
      `${API_BASE_URL}/patient/vitals/history?limit=${limit}`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
      }
    );

    const result: ApiResponse<VitalReading[]> | any = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(result));
    }

    return result.data as VitalReading[];
  },
};