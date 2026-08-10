import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type DoctorOperationalStatus = "AVAILABLE" | "OUT_OF_OFFICE" | "UNAVAILABLE";

export type DoctorProfileData = {
  id: string;
  fullName: string;
  email: string;
  accountStatus: string;
  isEmailVerified: boolean;
  phoneNumber: string | null;
  gmcNumber: string | null;
  specialization: string | null;
  clinicName: string | null;
  clinicAddress: string | null;
  yearsExperience: number | null;
  bio: string | null;
  operationalStatus: {
    configuredStatus: DoctorOperationalStatus;
    effectiveStatus: DoctorOperationalStatus;
    statusFrom: string | null;
    statusUntil: string | null;
    statusNote: string | null;
  };
};

export type DoctorProfileResponse = {
  doctor: DoctorProfileData;
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

export const doctorProfileApi = {
  async getProfile() {
    const response = await fetch(`${API_BASE_URL}/doctor/profile`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    const result: ApiResponse<DoctorProfileResponse> | any = await response.json();

    if (!response.ok || !result.success) throw new Error(getErrorMessage(result));

    return result.data as DoctorProfileResponse;
  },
};