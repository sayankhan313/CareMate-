import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type PatientGenderInput = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export type PatientProfileData = {
  id?: string;
  fullName?: string;
  firstName?: string;
  email?: string;
  phoneNumber?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  healthRecordNumber?: string | null;
  emergencyContact?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalConditions?: string | string[] | null;
  allergies?: string | null;
  bloodGroup?: string | null;
  addressLine?: string | null;
  postcode?: string | null;
  accountStatus?: string;
  isEmailVerified?: boolean;
  createdAt?: string;
};

export type LinkedCaregiver = {
  id: string;
  fullName: string;
  relationship?: string | null;
};

export type PatientProfileResponseData = {
  patient: PatientProfileData;
  linkedUsers: {
    doctor?: unknown;
    caregiver?: LinkedCaregiver | null;
  };
};

export type UpdatePatientProfilePayload = {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: PatientGenderInput | null;
  healthRecordNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalConditions: string | null;
  allergies: string | null;
  bloodGroup: string | null;
  addressLine: string | null;
  postcode: string | null;
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

const readResponse = async <T>(response: Response): Promise<T> => {
  let result: ApiResponse<T> | any;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !result?.success) throw new Error(getErrorMessage(result));
  if (result.data === undefined || result.data === null) throw new Error("The server returned empty profile data.");

  return result.data as T;
};

export const patientProfileApi = {
  async getProfile(): Promise<PatientProfileResponseData> {
    const response = await fetch(`${API_BASE_URL}/patient/profile`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return readResponse<PatientProfileResponseData>(response);
  },

  async updateProfile(payload: UpdatePatientProfilePayload): Promise<PatientProfileResponseData> {
    const response = await fetch(`${API_BASE_URL}/patient/profile`, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    return readResponse<PatientProfileResponseData>(response);
  },
};