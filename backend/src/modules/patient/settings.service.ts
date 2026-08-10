import { prisma } from "../../config/prisma.js";
import type { AccessibilitySettingsInput, NotificationPreferencesInput, PrivacySettingsInput, ReminderSettingsInput, SafetySettingsInput } from "./settings.validation.js";

const notificationPreferenceSelect = {
  medicineReminders: true,
  missedDoseAlerts: true,
  consultationUpdates: true,
  medicineReviewUpdates: true,
  reportReviewUpdates: true,
  criticalVitalAlerts: true,
  safetyResponseAlerts: true,
  careTeamUpdates: true,
  emailNotifications: true,
  pushNotifications: true,
} as const;

const reminderSettingsSelect = {
  defaultSnoozeMinutes: true,
  missedDoseReminder: true,
  repeatMissedDoseAlert: true,
  repeatIntervalMinutes: true,
  vibrationEnabled: true,
  soundEnabled: true,
} as const;

const safetySettingsSelect = {
  countdownSeconds: true,
  notifyAssignedDoctors: true,
  shareLatestVitalsOnEscalation: true,
  notifyEmergencyContact: true,
} as const;

const accessibilitySettingsSelect = {
  language: true,
  textSize: true,
  highContrastEnabled: true,
  reduceMotionEnabled: true,
  screenReaderHintsEnabled: true,
  hapticFeedbackEnabled: true,
} as const;

const privacySettingsSelect = {
  shareVitalsWithAssignedDoctors: true,
  shareMedicinesWithAssignedDoctors: true,
  shareReportsWithAssignedDoctors: true,
  hideSensitiveNotificationContent: true,
  loginAlertsEnabled: true,
  sessionTimeoutMinutes: true,
  confirmBeforeReportSharing: true,
} as const;

export const settingsService = {
  async getNotificationPreferences(patientId: string) {
    return prisma.patientNotificationPreference.upsert({
      where: { patientId },
      create: { patientId },
      update: {},
      select: notificationPreferenceSelect,
    });
  },

  async updateNotificationPreferences(patientId: string, input: NotificationPreferencesInput) {
    return prisma.patientNotificationPreference.upsert({
      where: { patientId },
      create: { patientId, ...input },
      update: input,
      select: notificationPreferenceSelect,
    });
  },

  async getReminderSettings(patientId: string) {
    return prisma.patientReminderPreference.upsert({
      where: { patientId },
      create: { patientId },
      update: {},
      select: reminderSettingsSelect,
    });
  },

  async updateReminderSettings(patientId: string, input: ReminderSettingsInput) {
    return prisma.patientReminderPreference.upsert({
      where: { patientId },
      create: { patientId, ...input },
      update: input,
      select: reminderSettingsSelect,
    });
  },

  async getSafetySettings(patientId: string) {
    return prisma.patientSafetyPreference.upsert({
      where: { patientId },
      create: { patientId },
      update: {},
      select: safetySettingsSelect,
    });
  },

  async updateSafetySettings(patientId: string, input: SafetySettingsInput) {
    return prisma.patientSafetyPreference.upsert({
      where: { patientId },
      create: { patientId, ...input },
      update: input,
      select: safetySettingsSelect,
    });
  },

  async getAccessibilitySettings(patientId: string) {
    return prisma.patientAccessibilityPreference.upsert({
      where: { patientId },
      create: { patientId },
      update: {},
      select: accessibilitySettingsSelect,
    });
  },

  async updateAccessibilitySettings(patientId: string, input: AccessibilitySettingsInput) {
    return prisma.patientAccessibilityPreference.upsert({
      where: { patientId },
      create: { patientId, ...input },
      update: input,
      select: accessibilitySettingsSelect,
    });
  },

  async getPrivacySettings(patientId: string) {
    return prisma.patientPrivacyPreference.upsert({
      where: { patientId },
      create: { patientId },
      update: {},
      select: privacySettingsSelect,
    });
  },

  async updatePrivacySettings(patientId: string, input: PrivacySettingsInput) {
    return prisma.patientPrivacyPreference.upsert({
      where: { patientId },
      create: { patientId, ...input },
      update: input,
      select: privacySettingsSelect,
    });
  },
};