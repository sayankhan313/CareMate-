import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = { success: boolean; message: string; data: T };

export type CaregiverDoctorOperationalStatus = "AVAILABLE" | "OUT_OF_OFFICE" | "UNAVAILABLE";

export type CaregiverAppointmentDoctor = {
  id: string;
  fullName: string;
  assignmentType: string;
  specialization: string | null;
  clinicName: string | null;
  operationalStatus: CaregiverDoctorOperationalStatus;
  acceptingAppointments: boolean;
};

export type CaregiverAppointmentSlot = {
  time: string;
  startsAt: string;
  durationMinutes: number;
};

export type CaregiverCalendarDate = {
  date: string;
  isAvailable: boolean;
  availableSlotCount: number;
};

export type CaregiverDoctorMonthlyAvailability = {
  month: string;
  doctor: {
    id: string;
    fullName: string;
    specialization: string | null;
    clinicName: string | null;
  };
  dates: CaregiverCalendarDate[];
};

export type CaregiverDoctorAvailableSlots = {
  date: string;
  isAvailable: boolean;
  doctor: {
    id: string;
    fullName: string;
    specialization: string | null;
    clinicName: string | null;
  };
  slots: CaregiverAppointmentSlot[];
};

export type CaregiverCreateAppointmentInput = {
  doctorId: string;
  reason: string;
  preferredDate: string;
  preferredTime: string;
};

export type CaregiverAppointmentRequestResult = {
  consultation: {
    id: string;
    patientId: string;
    doctorId: string;
    type: string;
    status: string;
    preferredAt: string;
    initiatorType: string;
    initiatedByUserId: string;
    doctor: {
      id: string;
      fullName: string;
      specialization: string | null;
      clinicName: string | null;
    };
    createdAt: string;
  };
  message: string;
};

const BASE_PATH = `${API_BASE_URL}/caregiver/patients`;

const getHeaders = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Please login again.");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
};

const parseResponse = async <T>(response: Response) => {
  let result: ApiResponse<T> | any = {};
  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok || !result.success) throw new Error(typeof result?.message === "string" ? result.message : "Request failed.");
  return result.data as T;
};

export const caregiverAppointmentApi = {
  async listAssignedDoctors(patientId: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/appointment-doctors`, { method: "GET", headers: await getHeaders() });
    return parseResponse<CaregiverAppointmentDoctor[]>(response);
  },

  async getMonthlyAvailability(patientId: string, doctorId: string, month: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/appointment-doctors/${encodeURIComponent(doctorId)}/availability?month=${encodeURIComponent(month)}`, { method: "GET", headers: await getHeaders() });
    return parseResponse<CaregiverDoctorMonthlyAvailability>(response);
  },

  async getAvailableSlots(patientId: string, doctorId: string, date: string) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/appointment-doctors/${encodeURIComponent(doctorId)}/slots?date=${encodeURIComponent(date)}`, { method: "GET", headers: await getHeaders() });
    return parseResponse<CaregiverDoctorAvailableSlots>(response);
  },

  async createAppointmentRequest(patientId: string, input: CaregiverCreateAppointmentInput) {
    const response = await fetch(`${BASE_PATH}/${encodeURIComponent(patientId)}/appointment-requests`, { method: "POST", headers: await getHeaders(), body: JSON.stringify(input) });
    return parseResponse<CaregiverAppointmentRequestResult>(response);
  },
};