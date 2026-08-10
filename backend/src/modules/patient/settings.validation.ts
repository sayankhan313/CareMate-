export type NotificationPreferencesInput = {
  medicineReminders?: boolean;
  missedDoseAlerts?: boolean;
  consultationUpdates?: boolean;
  medicineReviewUpdates?: boolean;
  reportReviewUpdates?: boolean;
  criticalVitalAlerts?: boolean;
  safetyResponseAlerts?: boolean;
  careTeamUpdates?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
};

export type ReminderSettingsInput = {
  defaultSnoozeMinutes?: 5 | 10 | 15 | 30;
  missedDoseReminder?: boolean;
  repeatMissedDoseAlert?: boolean;
  repeatIntervalMinutes?: 10 | 15 | 30 | 60;
  vibrationEnabled?: boolean;
  soundEnabled?: boolean;
};

export type SafetySettingsInput = {
  countdownSeconds?: 15 | 30 | 45 | 60;
  notifyAssignedDoctors?: boolean;
  shareLatestVitalsOnEscalation?: boolean;
  notifyEmergencyContact?: boolean;
};

export type SupportedLanguageInput =
  | "ENGLISH"
  | "HINDI"
  | "GREEK"
  | "HAUSA"
  | "GERMAN";

export type AppTextSizeInput =
  | "SMALL"
  | "NORMAL"
  | "LARGE"
  | "EXTRA_LARGE";

export type AccessibilitySettingsInput = {
  language?: SupportedLanguageInput;
  textSize?: AppTextSizeInput;
  highContrastEnabled?: boolean;
  reduceMotionEnabled?: boolean;
  screenReaderHintsEnabled?: boolean;
  hapticFeedbackEnabled?: boolean;
};

export type PrivacySettingsInput = {
  shareVitalsWithAssignedDoctors?: boolean;
  shareMedicinesWithAssignedDoctors?: boolean;
  shareReportsWithAssignedDoctors?: boolean;
  hideSensitiveNotificationContent?: boolean;
  loginAlertsEnabled?: boolean;
  sessionTimeoutMinutes?: 15 | 30 | 60 | 120;
  confirmBeforeReportSharing?: boolean;
};

const NOTIFICATION_FIELDS: Array<keyof NotificationPreferencesInput> = [
  "medicineReminders",
  "missedDoseAlerts",
  "consultationUpdates",
  "medicineReviewUpdates",
  "reportReviewUpdates",
  "criticalVitalAlerts",
  "safetyResponseAlerts",
  "careTeamUpdates",
  "emailNotifications",
  "pushNotifications",
];

const REMINDER_FIELDS: Array<keyof ReminderSettingsInput> = [
  "defaultSnoozeMinutes",
  "missedDoseReminder",
  "repeatMissedDoseAlert",
  "repeatIntervalMinutes",
  "vibrationEnabled",
  "soundEnabled",
];

const SAFETY_FIELDS: Array<keyof SafetySettingsInput> = [
  "countdownSeconds",
  "notifyAssignedDoctors",
  "shareLatestVitalsOnEscalation",
  "notifyEmergencyContact",
];

const ACCESSIBILITY_FIELDS: Array<keyof AccessibilitySettingsInput> = [
  "language",
  "textSize",
  "highContrastEnabled",
  "reduceMotionEnabled",
  "screenReaderHintsEnabled",
  "hapticFeedbackEnabled",
];

const PRIVACY_FIELDS: Array<keyof PrivacySettingsInput> = [
  "shareVitalsWithAssignedDoctors",
  "shareMedicinesWithAssignedDoctors",
  "shareReportsWithAssignedDoctors",
  "hideSensitiveNotificationContent",
  "loginAlertsEnabled",
  "sessionTimeoutMinutes",
  "confirmBeforeReportSharing",
];

const SUPPORTED_LANGUAGES: readonly SupportedLanguageInput[] = [
  "ENGLISH",
  "HINDI",
  "GREEK",
  "HAUSA",
  "GERMAN",
];

const SUPPORTED_TEXT_SIZES: readonly AppTextSizeInput[] = [
  "SMALL",
  "NORMAL",
  "LARGE",
  "EXTRA_LARGE",
];

const ensureObject = (
  body: unknown,
  message: string,
): Record<string, unknown> => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error(message);
  }

  return body as Record<string, unknown>;
};

const rejectUnknownFields = (
  input: Record<string, unknown>,
  allowedFields: readonly string[],
  messagePrefix: string,
) => {
  const unknownField = Object.keys(input).find(
    key => !allowedFields.includes(key),
  );

  if (unknownField) {
    throw new Error(`${messagePrefix}: ${unknownField}.`);
  }
};

const getBoolean = (
  value: unknown,
  fieldName: string,
): boolean => {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be true or false.`);
  }

  return value;
};

const getAllowedNumber = <T extends number>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[],
): T => {
  if (
    typeof value !== "number" ||
    !allowedValues.includes(value as T)
  ) {
    throw new Error(
      `${fieldName} must be one of: ${allowedValues.join(", ")}.`,
    );
  }

  return value as T;
};

const getAllowedString = <T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[],
): T => {
  if (
    typeof value !== "string" ||
    !allowedValues.includes(value as T)
  ) {
    throw new Error(
      `${fieldName} must be one of: ${allowedValues.join(", ")}.`,
    );
  }

  return value as T;
};

const ensureAtLeastOneField = (
  result: object,
  message: string,
) => {
  if (Object.keys(result).length === 0) {
    throw new Error(message);
  }
};

export const validateNotificationPreferences = (
  body: unknown,
): NotificationPreferencesInput => {
  const input = ensureObject(
    body,
    "Notification preference data is required.",
  );

  rejectUnknownFields(
    input,
    NOTIFICATION_FIELDS,
    "Unsupported notification preference",
  );

  const result: NotificationPreferencesInput = {};

  if (input.medicineReminders !== undefined) {
    result.medicineReminders = getBoolean(
      input.medicineReminders,
      "Medicine reminders",
    );
  }

  if (input.missedDoseAlerts !== undefined) {
    result.missedDoseAlerts = getBoolean(
      input.missedDoseAlerts,
      "Missed dose alerts",
    );
  }

  if (input.consultationUpdates !== undefined) {
    result.consultationUpdates = getBoolean(
      input.consultationUpdates,
      "Consultation updates",
    );
  }

  if (input.medicineReviewUpdates !== undefined) {
    result.medicineReviewUpdates = getBoolean(
      input.medicineReviewUpdates,
      "Medicine review updates",
    );
  }

  if (input.reportReviewUpdates !== undefined) {
    result.reportReviewUpdates = getBoolean(
      input.reportReviewUpdates,
      "Report review updates",
    );
  }

  if (input.criticalVitalAlerts !== undefined) {
    result.criticalVitalAlerts = getBoolean(
      input.criticalVitalAlerts,
      "Critical vital alerts",
    );
  }

  if (input.safetyResponseAlerts !== undefined) {
    result.safetyResponseAlerts = getBoolean(
      input.safetyResponseAlerts,
      "Safety Response alerts",
    );
  }

  if (input.careTeamUpdates !== undefined) {
    result.careTeamUpdates = getBoolean(
      input.careTeamUpdates,
      "Care team updates",
    );
  }

  if (input.emailNotifications !== undefined) {
    result.emailNotifications = getBoolean(
      input.emailNotifications,
      "Email notifications",
    );
  }

  if (input.pushNotifications !== undefined) {
    result.pushNotifications = getBoolean(
      input.pushNotifications,
      "Push notifications",
    );
  }

  ensureAtLeastOneField(
    result,
    "Provide at least one notification preference to update.",
  );

  return result;
};

export const validateReminderSettings = (
  body: unknown,
): ReminderSettingsInput => {
  const input = ensureObject(
    body,
    "Reminder settings data is required.",
  );

  rejectUnknownFields(
    input,
    REMINDER_FIELDS,
    "Unsupported reminder setting",
  );

  const result: ReminderSettingsInput = {};

  if (input.defaultSnoozeMinutes !== undefined) {
    result.defaultSnoozeMinutes = getAllowedNumber(
      input.defaultSnoozeMinutes,
      "Default snooze duration",
      [5, 10, 15, 30] as const,
    );
  }

  if (input.missedDoseReminder !== undefined) {
    result.missedDoseReminder = getBoolean(
      input.missedDoseReminder,
      "Missed dose reminder",
    );
  }

  if (input.repeatMissedDoseAlert !== undefined) {
    result.repeatMissedDoseAlert = getBoolean(
      input.repeatMissedDoseAlert,
      "Repeat missed dose alert",
    );
  }

  if (input.repeatIntervalMinutes !== undefined) {
    result.repeatIntervalMinutes = getAllowedNumber(
      input.repeatIntervalMinutes,
      "Repeat interval",
      [10, 15, 30, 60] as const,
    );
  }

  if (input.vibrationEnabled !== undefined) {
    result.vibrationEnabled = getBoolean(
      input.vibrationEnabled,
      "Vibration",
    );
  }

  if (input.soundEnabled !== undefined) {
    result.soundEnabled = getBoolean(
      input.soundEnabled,
      "Reminder sound",
    );
  }

  ensureAtLeastOneField(
    result,
    "Provide at least one reminder setting to update.",
  );

  return result;
};

export const validateSafetySettings = (
  body: unknown,
): SafetySettingsInput => {
  const input = ensureObject(
    body,
    "Safety Response settings data is required.",
  );

  rejectUnknownFields(
    input,
    SAFETY_FIELDS,
    "Unsupported Safety Response setting",
  );

  const result: SafetySettingsInput = {};

  if (input.countdownSeconds !== undefined) {
    result.countdownSeconds = getAllowedNumber(
      input.countdownSeconds,
      "Safety Response countdown",
      [15, 30, 45, 60] as const,
    );
  }

  if (input.notifyAssignedDoctors !== undefined) {
    result.notifyAssignedDoctors = getBoolean(
      input.notifyAssignedDoctors,
      "Notify assigned doctors",
    );
  }

  if (input.shareLatestVitalsOnEscalation !== undefined) {
    result.shareLatestVitalsOnEscalation = getBoolean(
      input.shareLatestVitalsOnEscalation,
      "Share latest vitals during escalation",
    );
  }

  if (input.notifyEmergencyContact !== undefined) {
    result.notifyEmergencyContact = getBoolean(
      input.notifyEmergencyContact,
      "Notify emergency contact",
    );
  }

  ensureAtLeastOneField(
    result,
    "Provide at least one Safety Response setting to update.",
  );

  return result;
};

export const validateAccessibilitySettings = (
  body: unknown,
): AccessibilitySettingsInput => {
  const input = ensureObject(
    body,
    "Language and accessibility settings data is required.",
  );

  rejectUnknownFields(
    input,
    ACCESSIBILITY_FIELDS,
    "Unsupported language or accessibility setting",
  );

  const result: AccessibilitySettingsInput = {};

  if (input.language !== undefined) {
    result.language = getAllowedString(
      input.language,
      "Language",
      SUPPORTED_LANGUAGES,
    );
  }

  if (input.textSize !== undefined) {
    result.textSize = getAllowedString(
      input.textSize,
      "Text size",
      SUPPORTED_TEXT_SIZES,
    );
  }

  if (input.highContrastEnabled !== undefined) {
    result.highContrastEnabled = getBoolean(
      input.highContrastEnabled,
      "High contrast",
    );
  }

  if (input.reduceMotionEnabled !== undefined) {
    result.reduceMotionEnabled = getBoolean(
      input.reduceMotionEnabled,
      "Reduce motion",
    );
  }

  if (input.screenReaderHintsEnabled !== undefined) {
    result.screenReaderHintsEnabled = getBoolean(
      input.screenReaderHintsEnabled,
      "Screen-reader hints",
    );
  }

  if (input.hapticFeedbackEnabled !== undefined) {
    result.hapticFeedbackEnabled = getBoolean(
      input.hapticFeedbackEnabled,
      "Haptic feedback",
    );
  }

  ensureAtLeastOneField(
    result,
    "Provide at least one language or accessibility setting to update.",
  );

  return result;
};

export const validatePrivacySettings = (
  body: unknown,
): PrivacySettingsInput => {
  const input = ensureObject(
    body,
    "Privacy and security settings data is required.",
  );

  rejectUnknownFields(
    input,
    PRIVACY_FIELDS,
    "Unsupported privacy or security setting",
  );

  const result: PrivacySettingsInput = {};

  if (input.shareVitalsWithAssignedDoctors !== undefined) {
    result.shareVitalsWithAssignedDoctors = getBoolean(
      input.shareVitalsWithAssignedDoctors,
      "Share vitals with assigned doctors",
    );
  }

  if (input.shareMedicinesWithAssignedDoctors !== undefined) {
    result.shareMedicinesWithAssignedDoctors = getBoolean(
      input.shareMedicinesWithAssignedDoctors,
      "Share medicines with assigned doctors",
    );
  }

  if (input.shareReportsWithAssignedDoctors !== undefined) {
    result.shareReportsWithAssignedDoctors = getBoolean(
      input.shareReportsWithAssignedDoctors,
      "Share reports with assigned doctors",
    );
  }

  if (input.hideSensitiveNotificationContent !== undefined) {
    result.hideSensitiveNotificationContent = getBoolean(
      input.hideSensitiveNotificationContent,
      "Hide sensitive notification content",
    );
  }

  if (input.loginAlertsEnabled !== undefined) {
    result.loginAlertsEnabled = getBoolean(
      input.loginAlertsEnabled,
      "Login alerts",
    );
  }

  if (input.sessionTimeoutMinutes !== undefined) {
    result.sessionTimeoutMinutes = getAllowedNumber(
      input.sessionTimeoutMinutes,
      "Session timeout",
      [15, 30, 60, 120] as const,
    );
  }

  if (input.confirmBeforeReportSharing !== undefined) {
    result.confirmBeforeReportSharing = getBoolean(
      input.confirmBeforeReportSharing,
      "Confirm before report sharing",
    );
  }

  ensureAtLeastOneField(
    result,
    "Provide at least one privacy or security setting to update.",
  );

  return result;
};