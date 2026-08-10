import { API_BASE_URL } from "../constants/api";
import { tokenStorage } from "./tokenStorage";

type ApiResponse<T> = { success: boolean; message: string; data: T };

export type NotificationPreferences = {
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
};

export type ReminderSettings = {
  defaultSnoozeMinutes: 5 | 10 | 15 | 30;
  missedDoseReminder: boolean;
  repeatMissedDoseAlert: boolean;
  repeatIntervalMinutes: 10 | 15 | 30 | 60;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
};

export type SafetySettings = {
  countdownSeconds: 15 | 30 | 45 | 60;
  notifyAssignedDoctors: boolean;
  shareLatestVitalsOnEscalation: boolean;
  notifyEmergencyContact: boolean;
};

export type SupportedLanguage = "ENGLISH" | "HINDI" | "GREEK" | "HAUSA" | "GERMAN";
export type AppTextSize = "SMALL" | "NORMAL" | "LARGE" | "EXTRA_LARGE";

export type AccessibilitySettings = {
  language: SupportedLanguage;
  textSize: AppTextSize;
  highContrastEnabled: boolean;
  reduceMotionEnabled: boolean;
  screenReaderHintsEnabled: boolean;
  hapticFeedbackEnabled: boolean;
};

export type PrivacySettings = {
  shareVitalsWithAssignedDoctors: boolean;
  shareMedicinesWithAssignedDoctors: boolean;
  shareReportsWithAssignedDoctors: boolean;
  hideSensitiveNotificationContent: boolean;
  loginAlertsEnabled: boolean;
  sessionTimeoutMinutes: 15 | 30 | 60 | 120;
  confirmBeforeReportSharing: boolean;
};

export type NotificationPreferencesResponse = { preferences: NotificationPreferences };
export type ReminderSettingsResponse = { settings: ReminderSettings };
export type SafetySettingsResponse = { settings: SafetySettings };
export type AccessibilitySettingsResponse = { settings: AccessibilitySettings };
export type PrivacySettingsResponse = { settings: PrivacySettings };

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

const readResponse = async <T>(response: Response): Promise<T> => {
  let result: ApiResponse<T> | any;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !result?.success) throw new Error(getErrorMessage(result));
  if (result.data === undefined || result.data === null) throw new Error("The server returned empty settings data.");

  return result.data as T;
};

const request = async <T>(path: string, method: "GET" | "PATCH", payload?: object): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: await getAuthHeaders(),
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

  return readResponse<T>(response);
};

const sanitizeNotificationPreferences = (value: NotificationPreferences): NotificationPreferences => ({
  medicineReminders: Boolean(value.medicineReminders),
  missedDoseAlerts: Boolean(value.missedDoseAlerts),
  consultationUpdates: Boolean(value.consultationUpdates),
  medicineReviewUpdates: Boolean(value.medicineReviewUpdates),
  reportReviewUpdates: Boolean(value.reportReviewUpdates),
  criticalVitalAlerts: Boolean(value.criticalVitalAlerts),
  safetyResponseAlerts: Boolean(value.safetyResponseAlerts),
  careTeamUpdates: Boolean(value.careTeamUpdates),
  emailNotifications: Boolean(value.emailNotifications),
  pushNotifications: Boolean(value.pushNotifications),
});

const sanitizeReminderSettings = (value: ReminderSettings): ReminderSettings => ({
  defaultSnoozeMinutes: value.defaultSnoozeMinutes,
  missedDoseReminder: Boolean(value.missedDoseReminder),
  repeatMissedDoseAlert: Boolean(value.repeatMissedDoseAlert),
  repeatIntervalMinutes: value.repeatIntervalMinutes,
  vibrationEnabled: Boolean(value.vibrationEnabled),
  soundEnabled: Boolean(value.soundEnabled),
});

const sanitizeSafetySettings = (value: SafetySettings): SafetySettings => ({
  countdownSeconds: value.countdownSeconds,
  notifyAssignedDoctors: Boolean(value.notifyAssignedDoctors),
  shareLatestVitalsOnEscalation: Boolean(value.shareLatestVitalsOnEscalation),
  notifyEmergencyContact: Boolean(value.notifyEmergencyContact),
});

const sanitizeAccessibilitySettings = (value: AccessibilitySettings): AccessibilitySettings => ({
  language: value.language,
  textSize: value.textSize,
  highContrastEnabled: false,
  reduceMotionEnabled: Boolean(value.reduceMotionEnabled),
  screenReaderHintsEnabled: Boolean(value.screenReaderHintsEnabled),
  hapticFeedbackEnabled: Boolean(value.hapticFeedbackEnabled),
});

const sanitizePrivacySettings = (value: PrivacySettings): PrivacySettings => ({
  shareVitalsWithAssignedDoctors: Boolean(value.shareVitalsWithAssignedDoctors),
  shareMedicinesWithAssignedDoctors: Boolean(value.shareMedicinesWithAssignedDoctors),
  shareReportsWithAssignedDoctors: Boolean(value.shareReportsWithAssignedDoctors),
  hideSensitiveNotificationContent: Boolean(value.hideSensitiveNotificationContent),
  loginAlertsEnabled: Boolean(value.loginAlertsEnabled),
  sessionTimeoutMinutes: value.sessionTimeoutMinutes,
  confirmBeforeReportSharing: Boolean(value.confirmBeforeReportSharing),
});

export const patientSettingsApi = {
  async getNotificationPreferences(): Promise<NotificationPreferencesResponse> {
    const result = await request<NotificationPreferencesResponse>("/patient/settings/notifications", "GET");
    return { preferences: sanitizeNotificationPreferences(result.preferences) };
  },

  async updateNotificationPreferences(payload: NotificationPreferences): Promise<NotificationPreferencesResponse> {
    const result = await request<NotificationPreferencesResponse>("/patient/settings/notifications", "PATCH", sanitizeNotificationPreferences(payload));
    return { preferences: sanitizeNotificationPreferences(result.preferences) };
  },

  async getReminderSettings(): Promise<ReminderSettingsResponse> {
    const result = await request<ReminderSettingsResponse>("/patient/settings/reminders", "GET");
    return { settings: sanitizeReminderSettings(result.settings) };
  },

  async updateReminderSettings(payload: ReminderSettings): Promise<ReminderSettingsResponse> {
    const result = await request<ReminderSettingsResponse>("/patient/settings/reminders", "PATCH", sanitizeReminderSettings(payload));
    return { settings: sanitizeReminderSettings(result.settings) };
  },

  async getSafetySettings(): Promise<SafetySettingsResponse> {
    const result = await request<SafetySettingsResponse>("/patient/settings/safety", "GET");
    return { settings: sanitizeSafetySettings(result.settings) };
  },

  async updateSafetySettings(payload: SafetySettings): Promise<SafetySettingsResponse> {
    const result = await request<SafetySettingsResponse>("/patient/settings/safety", "PATCH", sanitizeSafetySettings(payload));
    return { settings: sanitizeSafetySettings(result.settings) };
  },

  async getAccessibilitySettings(): Promise<AccessibilitySettingsResponse> {
    const result = await request<AccessibilitySettingsResponse>("/patient/settings/accessibility", "GET");
    return { settings: sanitizeAccessibilitySettings(result.settings) };
  },

  async updateAccessibilitySettings(payload: AccessibilitySettings): Promise<AccessibilitySettingsResponse> {
    const result = await request<AccessibilitySettingsResponse>("/patient/settings/accessibility", "PATCH", sanitizeAccessibilitySettings(payload));
    return { settings: sanitizeAccessibilitySettings(result.settings) };
  },

  async getPrivacySettings(): Promise<PrivacySettingsResponse> {
    const result = await request<PrivacySettingsResponse>("/patient/settings/privacy", "GET");
    return { settings: sanitizePrivacySettings(result.settings) };
  },

  async updatePrivacySettings(payload: PrivacySettings): Promise<PrivacySettingsResponse> {
    const result = await request<PrivacySettingsResponse>("/patient/settings/privacy", "PATCH", sanitizePrivacySettings(payload));
    return { settings: sanitizePrivacySettings(result.settings) };
  },
};