import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";
import type { Consultation, MeetingConfig } from "./safetyApi";

type ApiResponse<T> = { success: boolean; message: string; data: T };

export type CreateManualConsultationPayload = {
  doctorId: string;
  reason: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
};

export type CreateConsultationResult = { consultation: Consultation; patientMeeting: MeetingConfig; doctorMeeting: MeetingConfig };
export type PatientJoinConfigResult = { consultation: Consultation; patientMeeting: MeetingConfig };

export type PatientAppointmentSlot = {
  time: string;
  startsAt: string;
  durationMinutes: number;
};

export type PatientCalendarDate = {
  date: string;
  isAvailable: boolean;
  availableSlotCount: number;
};

export type PatientDoctorAvailability = {
  month: string;
  doctor: {
    id: string;
    fullName: string;
    specialization: string | null;
    clinicName: string | null;
  };
  dates: PatientCalendarDate[];
};

export type PatientDoctorSlots = {
  date: string;
  isAvailable: boolean;
  doctor: {
    id: string;
    fullName: string;
    specialization: string | null;
    clinicName: string | null;
  };
  slots: PatientAppointmentSlot[];
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
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
};

const requestPatientApi = async <T>(path: string, options: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...(await getAuthHeaders()), ...(options.headers || {}) } });
  const result: ApiResponse<T> | any = await response.json();
  if (!response.ok || !result.success) throw new Error(getErrorMessage(result));
  return result.data as T;
};

export const consultationsApi = {
  async getDoctorMonthlyAvailability(doctorId: string, month: string): Promise<PatientDoctorAvailability> {
    return requestPatientApi<PatientDoctorAvailability>(`/patient/doctors/${doctorId}/availability?month=${encodeURIComponent(month)}`, { method: "GET" });
  },

  async getDoctorAvailableSlots(doctorId: string, date: string): Promise<PatientDoctorSlots> {
    return requestPatientApi<PatientDoctorSlots>(`/patient/doctors/${doctorId}/availability/slots?date=${encodeURIComponent(date)}`, { method: "GET" });
  },

  async createManualConsultation(payload: CreateManualConsultationPayload): Promise<CreateConsultationResult> {
    return requestPatientApi<CreateConsultationResult>("/patient/consultations/manual", { method: "POST", body: JSON.stringify(payload) });
  },

  async listConsultations(): Promise<Consultation[]> {
    return requestPatientApi<Consultation[]>("/patient/consultations", { method: "GET" });
  },

  async getConsultationById(consultationId: string): Promise<Consultation> {
    return requestPatientApi<Consultation>(`/patient/consultations/${consultationId}`, { method: "GET" });
  },

  async getPatientJoinConfig(consultationId: string): Promise<PatientJoinConfigResult> {
    return requestPatientApi<PatientJoinConfigResult>(`/patient/consultations/${consultationId}/join`, { method: "GET" });
  },
};