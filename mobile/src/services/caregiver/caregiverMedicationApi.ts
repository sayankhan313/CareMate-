import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type CaregiverDoseStatus = "TAKEN" | "MISSED" | "PENDING" | "SNOOZED";

export type CaregiverMedicationReminder = {
  id: string;
  frequency: string;
  customFrequency: string | null;
  timeOfDay: string;
  startDate: string;
  endDate: string | null;
  scheduledToday: string | null;
  todayStatus: CaregiverDoseStatus | null;
  doseLogId: string | null;
  takenAt: string | null;
  snoozedUntil: string | null;
  nextDose: string | null;
};

export type CaregiverMedication = {
  id: string;
  name: string;
  dose: string;
  doseQuantity: number | null;
  doseUnit: string | null;
  instructions: string | null;
  stock: {
    currentStock: number | null;
    stockUnit: string | null;
    lowStockThreshold: number | null;
    lowStock: boolean;
  };
  reminders: CaregiverMedicationReminder[];
};

export type CaregiverMedicationSchedule = {
  summary: {
    activeMedicines: number;
    scheduledToday: number;
    taken: number;
    missed: number;
    pending: number;
    snoozed: number;
    lowStockMedicines: number;
  };
  medicines: CaregiverMedication[];
};

export type CaregiverReminderPromptResult = {
  sent: boolean;
  dose: {
    id: string;
    status: string;
    scheduledFor: string;
    medicineName: string;
    medicineDose: string;
  };
  notification: {
    id: string;
    createdAt: string;
  };
  cooldownSeconds: number;
};

export type CaregiverLowStockPromptResult = {
  sent: boolean;
  medicine: {
    id: string;
    name: string;
    dose: string;
    currentStock: number;
    stockUnit: string | null;
    lowStockThreshold: number;
  };
  notification: {
    id: string;
    createdAt: string;
  };
  cooldownSeconds: number;
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

const parseResponse = async <T>(response: Response) => {
  let result: ApiResponse<T> | any = {};

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok || !result.success) throw new Error(getErrorMessage(result));
  return result.data as T;
};

export const caregiverMedicationApi = {
  async getSchedule(patientId: string) {
    const response = await fetch(`${API_BASE_URL}/caregiver/patients/${encodeURIComponent(patientId)}/medications`, {
      method: "GET",
      headers: await getAuthHeaders(),
    });

    return parseResponse<CaregiverMedicationSchedule>(response);
  },

  async sendReminder(patientId: string, doseLogId: string) {
    const response = await fetch(`${API_BASE_URL}/caregiver/patients/${encodeURIComponent(patientId)}/doses/${encodeURIComponent(doseLogId)}/remind`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });

    return parseResponse<CaregiverReminderPromptResult>(response);
  },

  async sendLowStockPrompt(patientId: string, medicineId: string) {
    const response = await fetch(`${API_BASE_URL}/caregiver/patients/${encodeURIComponent(patientId)}/medicines/${encodeURIComponent(medicineId)}/low-stock-prompt`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });

    return parseResponse<CaregiverLowStockPromptResult>(response);
  },
};