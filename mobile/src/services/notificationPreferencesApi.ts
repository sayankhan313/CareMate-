import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

export type PatientNotificationPreferences = {
  medicineReminders: boolean;
  missedDoseAlerts: boolean;
  consultationUpdates: boolean;
  medicineReviewUpdates: boolean;
  reportReviewUpdates: boolean;
  criticalVitalAlerts: boolean;
  safetyResponseAlerts: boolean;
  careTeamUpdates: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  updatedAt: string;
};

export type PatientReminderPreferences = {
  defaultSnoozeMinutes: number;
  missedDoseReminder: boolean;
  repeatMissedDoseAlert: boolean;
  repeatIntervalMinutes: number;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  updatedAt: string;
};

export type PatientPreferencesData = {
  notifications: PatientNotificationPreferences;
  reminders: PatientReminderPreferences;
};

export type UpdatePatientNotificationPreferencesInput = Partial<Omit<PatientNotificationPreferences, "updatedAt">>;
export type UpdatePatientReminderPreferencesInput = Partial<Omit<PatientReminderPreferences, "updatedAt">>;

const getAuthHeaders = async () => {
  const token = await tokenStorage.getToken();
  if (!token) throw new Error("Session expired. Please login again.");

  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  let result: any = {};

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok || result?.success === false) {
    const message = typeof result?.message === "string" ? result.message : "Unable to update notification preferences.";
    throw new Error(message);
  }

  return (result?.data ?? result) as T;
};

export const notificationPreferencesApi = {
  async getPreferences(): Promise<PatientPreferencesData> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notifications/preferences`, { method: "GET", headers });
    return parseResponse<PatientPreferencesData>(response);
  },

  async updateNotificationPreferences(input: UpdatePatientNotificationPreferencesInput): Promise<PatientPreferencesData> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notifications/preferences`, { method: "PATCH", headers, body: JSON.stringify(input) });
    return parseResponse<PatientPreferencesData>(response);
  },

  async updateReminderPreferences(input: UpdatePatientReminderPreferencesInput): Promise<PatientPreferencesData> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notifications/reminder-preferences`, { method: "PATCH", headers, body: JSON.stringify(input) });
    return parseResponse<PatientPreferencesData>(response);
  },
};