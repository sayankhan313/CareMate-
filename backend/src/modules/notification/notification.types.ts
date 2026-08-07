import type {
  NotificationPriority,
  NotificationType,
} from "../../generated/prisma/client.js";

export type PatientNotificationPreferenceKey =
  | "medicineReminders"
  | "missedDoseAlerts"
  | "consultationUpdates"
  | "medicineReviewUpdates"
  | "reportReviewUpdates"
  | "criticalVitalAlerts"
  | "safetyResponseAlerts"
  | "careTeamUpdates";

export type RegisterDeviceTokenInput = {
  token: string;
  platform: "ANDROID" | "IOS";
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
};

export type DeactivateDeviceTokenInput = {
  token: string;
};

export type NotificationListInput = {
  page: number;
  limit: number;
  unreadOnly: boolean;
};

export type SendNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  priority?: NotificationPriority;
  entityType?: string;
  entityId?: string;
  targetScreen?: string;
  data?: Record<string, unknown>;
  patientPreferenceKey?: PatientNotificationPreferenceKey;
  forcePush?: boolean;
};

export type SendTestNotificationInput = {
  title?: string;
  body?: string;
};

export type UpdatePatientNotificationPreferencesInput = {
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

export type UpdatePatientReminderPreferencesInput = {
  defaultSnoozeMinutes?: number;
  missedDoseReminder?: boolean;
  repeatMissedDoseAlert?: boolean;
  repeatIntervalMinutes?: number;
  vibrationEnabled?: boolean;
  soundEnabled?: boolean;
};