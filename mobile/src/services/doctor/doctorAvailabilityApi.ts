import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type DoctorOperationalStatus = "AVAILABLE" | "OUT_OF_OFFICE" | "UNAVAILABLE";
export type DoctorAvailabilityStatus = "AVAILABLE" | "OUT_OF_OFFICE" | "UNAVAILABLE";

export type DoctorOperationalStatusData = {
  configuredStatus: DoctorOperationalStatus;
  effectiveStatus: DoctorOperationalStatus;
  statusFrom: string | null;
  statusUntil: string | null;
  statusNote: string | null;
};

export type DoctorAvailabilityItem = {
  id: string;
  doctorId: string;
  date: string;
  status: DoctorAvailabilityStatus;
  startTime: string | null;
  endTime: string | null;
  slotDurationMinutes: number | null;
  createdAt: string;
  updatedAt: string;
};

export type DoctorAvailabilityData = {
  month: string;
  doctor: {
    id: string;
    fullName: string;
    specialization: string | null;
    clinicName: string | null;
  };
  operationalStatus?: DoctorOperationalStatusData;
  availabilities: DoctorAvailabilityItem[];
};

export type SaveDoctorAvailabilityInput = {
  month: string;
  availabilities: {
    date: string;
    status: DoctorAvailabilityStatus;
    startTime: string | null;
    endTime: string | null;
    slotDurationMinutes: number | null;
  }[];
};

export type SaveDoctorAvailabilityResult = {
  month: string;
  availabilityCount: number;
  availabilities: DoctorAvailabilityItem[];
};

export type UpdateDoctorStatusInput = {
  status: DoctorOperationalStatus;
  statusFrom?: string | null;
  statusUntil?: string | null;
  statusNote?: string | null;
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

export const doctorAvailabilityApi = {
  async getAvailability(month: string) {
    const response = await fetch(`${API_BASE_URL}/doctor/availability?month=${encodeURIComponent(month)}`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    const result: ApiResponse<DoctorAvailabilityData> | any = await response.json();

    if (!response.ok || !result.success) throw new Error(getErrorMessage(result));

    return result.data as DoctorAvailabilityData;
  },

  async saveMonthlyAvailability(input: SaveDoctorAvailabilityInput) {
    const response = await fetch(`${API_BASE_URL}/doctor/availability/month`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify(input),
    });

    const result: ApiResponse<SaveDoctorAvailabilityResult> | any = await response.json();

    if (!response.ok || !result.success) throw new Error(getErrorMessage(result));

    return result.data as SaveDoctorAvailabilityResult;
  },

  async updateOperationalStatus(input: UpdateDoctorStatusInput) {
    const response = await fetch(`${API_BASE_URL}/doctor/availability/status`, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify(input),
    });

    const result: ApiResponse<DoctorOperationalStatusData> | any = await response.json();

    if (!response.ok || !result.success) throw new Error(getErrorMessage(result));

    return result.data as DoctorOperationalStatusData;
  },

  async deleteAvailability(availabilityId: string) {
    const response = await fetch(`${API_BASE_URL}/doctor/availability/${availabilityId}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });

    const result: ApiResponse<{ id: string; deleted: boolean }> | any = await response.json();

    if (!response.ok || !result.success) throw new Error(getErrorMessage(result));

    return result.data;
  },
};