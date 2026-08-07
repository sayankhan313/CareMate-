import type { BatchResponse } from "firebase-admin/messaging";
import type { Prisma } from "../../generated/prisma/client.js";

import { firebaseMessaging } from "../../config/firebase.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  DeactivateDeviceTokenInput,
  NotificationListInput,
  RegisterDeviceTokenInput,
  SendNotificationInput,
  SendTestNotificationInput,
  UpdatePatientNotificationPreferencesInput,
  UpdatePatientReminderPreferencesInput,
} from "./notification.types.js";

const INVALID_TOKEN_ERROR_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  priority: true,
  entityType: true,
  entityId: true,
  targetScreen: true,
  data: true,
  isRead: true,
  readAt: true,
  pushStatus: true,
  sentAt: true,
  failureReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

const deviceTokenSelect = {
  id: true,
  platform: true,
  deviceId: true,
  deviceName: true,
  appVersion: true,
  isActive: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const sanitizeJson = (value?: Record<string, unknown>): Prisma.InputJsonValue | undefined => {
  if (!value) return undefined;

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return { serializationError: "Notification data could not be serialized." };
  }
};

const toFcmData = (notificationId: string, input: SendNotificationInput) => {
  const result: Record<string, string> = {
    notificationId,
    type: input.type,
    priority: input.priority ?? "NORMAL",
  };

  if (input.entityType) result.entityType = input.entityType;
  if (input.entityId) result.entityId = input.entityId;
  if (input.targetScreen) result.targetScreen = input.targetScreen;

  for (const [key, value] of Object.entries(input.data ?? {})) {
    if (value === undefined) continue;

    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[key] = String(value);
      continue;
    }

    try {
      result[key] = JSON.stringify(value);
    } catch {
      result[key] = "";
    }
  }

  return result;
};

const getPushPermission = async (input: SendNotificationInput) => {
  if (input.forcePush) return { allowed: true, reason: null };

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { role: true },
  });

  if (!user) throw new AppError("Notification recipient was not found.", 404);
  if (user.role !== "PATIENT") return { allowed: true, reason: null };

  const preferences = await prisma.patientNotificationPreference.upsert({
    where: { patientId: input.userId },
    create: { patientId: input.userId },
    update: {},
  });

  if (!preferences.pushNotifications) {
    return { allowed: false, reason: "PUSH_NOTIFICATIONS_DISABLED" };
  }

  if (input.patientPreferenceKey && !preferences[input.patientPreferenceKey]) {
    return { allowed: false, reason: `PREFERENCE_DISABLED:${input.patientPreferenceKey}` };
  }

  return { allowed: true, reason: null };
};


const REMINDER_NOTIFICATION_TYPES = new Set([
  "MEDICINE_REMINDER_DUE",
  "MEDICINE_REMINDER_SNOOZED",
  "MISSED_DOSE_ALERT",
  "REPEATED_MISSED_DOSE",
]);

const getNotificationPresentation = async (input: SendNotificationInput) => {
  if (!REMINDER_NOTIFICATION_TYPES.has(input.type)) return { soundEnabled: true, vibrationEnabled: true };

  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { role: true } });
  if (user?.role !== "PATIENT") return { soundEnabled: true, vibrationEnabled: true };

  const preferences = await prisma.patientReminderPreference.upsert({
    where: { patientId: input.userId },
    create: { patientId: input.userId },
    update: {},
    select: { soundEnabled: true, vibrationEnabled: true },
  });

  return preferences;
};

const updateFailedBatch = async (notificationId: string, reason: string) => {
  await prisma.$transaction([
    prisma.notificationDelivery.updateMany({
      where: { notificationId, status: "PENDING" },
      data: { status: "FAILED", failureReason: reason },
    }),
    prisma.userNotification.update({
      where: { id: notificationId },
      data: { pushStatus: "FAILED", failureReason: reason },
    }),
  ]);
};

const saveBatchResult = async (
  notificationId: string,
  tokens: { id: string; token: string }[],
  response: BatchResponse,
) => {
  const now = new Date();
  const invalidTokenIds: string[] = [];

  await Promise.all(
    response.responses.map(async (item, index) => {
      const deviceToken = tokens[index];
      if (!deviceToken) return;

      if (item.success) {
        await prisma.notificationDelivery.update({
          where: {
            notificationId_deviceTokenId: {
              notificationId,
              deviceTokenId: deviceToken.id,
            },
          },
          data: {
            status: "SENT",
            firebaseMessageId: item.messageId,
            sentAt: now,
          },
        });
        return;
      }

      const failureCode = item.error?.code ?? "messaging/unknown-error";
      const failureReason = item.error?.message ?? "Firebase did not deliver the notification.";

      if (INVALID_TOKEN_ERROR_CODES.has(failureCode)) invalidTokenIds.push(deviceToken.id);

      await prisma.notificationDelivery.update({
        where: {
          notificationId_deviceTokenId: {
            notificationId,
            deviceTokenId: deviceToken.id,
          },
        },
        data: {
          status: "FAILED",
          failureCode,
          failureReason,
        },
      });
    }),
  );

  if (invalidTokenIds.length > 0) {
    await prisma.deviceToken.updateMany({
      where: { id: { in: invalidTokenIds } },
      data: { isActive: false },
    });
  }

  const pushStatus = response.successCount === tokens.length ? "SENT" : response.successCount > 0 ? "PARTIAL" : "FAILED";
  const failureReason = response.failureCount > 0 ? `${response.failureCount} of ${tokens.length} device deliveries failed.` : null;

  return prisma.userNotification.update({
    where: { id: notificationId },
    data: {
      pushStatus,
      sentAt: response.successCount > 0 ? now : null,
      failureReason,
    },
    select: notificationSelect,
  });
};


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
  updatedAt: true,
} as const;

const reminderPreferenceSelect = {
  defaultSnoozeMinutes: true,
  missedDoseReminder: true,
  repeatMissedDoseAlert: true,
  repeatIntervalMinutes: true,
  vibrationEnabled: true,
  soundEnabled: true,
  updatedAt: true,
} as const;

const ensurePatient = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) throw new AppError("Patient account was not found.", 404);
  if (user.role !== "PATIENT") throw new AppError("Only patients can manage notification preferences.", 403);
  return user;
};

const getOrCreatePatientPreferences = async (patientId: string) => {
  await ensurePatient(patientId);

  const [notifications, reminders] = await prisma.$transaction([
    prisma.patientNotificationPreference.upsert({
      where: { patientId },
      create: { patientId },
      update: {},
      select: notificationPreferenceSelect,
    }),
    prisma.patientReminderPreference.upsert({
      where: { patientId },
      create: { patientId },
      update: {},
      select: reminderPreferenceSelect,
    }),
  ]);

  return { notifications, reminders };
};

export const notificationService = {

  async getPatientPreferences(patientId: string) {
    return getOrCreatePatientPreferences(patientId);
  },

  async updatePatientNotificationPreferences(patientId: string, input: UpdatePatientNotificationPreferencesInput) {
    await ensurePatient(patientId);

    const notifications = await prisma.patientNotificationPreference.upsert({
      where: { patientId },
      create: { patientId, ...input },
      update: input,
      select: notificationPreferenceSelect,
    });

    const reminders = await prisma.patientReminderPreference.upsert({
      where: { patientId },
      create: { patientId },
      update: {},
      select: reminderPreferenceSelect,
    });

    return { notifications, reminders };
  },

  async updatePatientReminderPreferences(patientId: string, input: UpdatePatientReminderPreferencesInput) {
    await ensurePatient(patientId);

    const reminders = await prisma.patientReminderPreference.upsert({
      where: { patientId },
      create: { patientId, ...input },
      update: input,
      select: reminderPreferenceSelect,
    });

    const notifications = await prisma.patientNotificationPreference.upsert({
      where: { patientId },
      create: { patientId },
      update: {},
      select: notificationPreferenceSelect,
    });

    return { notifications, reminders };
  },

  async registerDeviceToken(userId: string, input: RegisterDeviceTokenInput) {
    return prisma.deviceToken.upsert({
      where: { token: input.token },
      create: {
        userId,
        token: input.token,
        platform: input.platform,
        deviceId: input.deviceId,
        deviceName: input.deviceName,
        appVersion: input.appVersion,
        isActive: true,
        lastSeenAt: new Date(),
      },
      update: {
        userId,
        platform: input.platform,
        deviceId: input.deviceId,
        deviceName: input.deviceName,
        appVersion: input.appVersion,
        isActive: true,
        lastSeenAt: new Date(),
      },
      select: deviceTokenSelect,
    });
  },

  async deactivateDeviceToken(userId: string, input: DeactivateDeviceTokenInput) {
    const result = await prisma.deviceToken.updateMany({
      where: { userId, token: input.token, isActive: true },
      data: { isActive: false, lastSeenAt: new Date() },
    });

    return { deactivated: result.count > 0 };
  },

  async listNotifications(userId: string, input: NotificationListInput) {
    const where = {
      userId,
      ...(input.unreadOnly ? { isRead: false } : {}),
    };
    const skip = (input.page - 1) * input.limit;

    const [notifications, total, unreadCount] = await prisma.$transaction([
      prisma.userNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: input.limit,
        select: notificationSelect,
      }),
      prisma.userNotification.count({ where }),
      prisma.userNotification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / input.limit)),
      },
    };
  },

  async getUnreadCount(userId: string) {
    const unreadCount = await prisma.userNotification.count({ where: { userId, isRead: false } });
    return { unreadCount };
  },

  async markNotificationRead(userId: string, notificationId: string) {
    const result = await prisma.userNotification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });

    if (result.count === 0) throw new AppError("Notification was not found.", 404);

    return prisma.userNotification.findUniqueOrThrow({
      where: { id: notificationId },
      select: notificationSelect,
    });
  },

  async markAllNotificationsRead(userId: string) {
    const result = await prisma.userNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { updatedCount: result.count };
  },

  async createAndSend(input: SendNotificationInput) {
    const permission = await getPushPermission(input);
    const notification = await prisma.userNotification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        priority: input.priority ?? "NORMAL",
        entityType: input.entityType,
        entityId: input.entityId,
        targetScreen: input.targetScreen,
        data: sanitizeJson(input.data),
        pushStatus: permission.allowed ? "PENDING" : "SKIPPED",
        failureReason: permission.reason,
      },
      select: notificationSelect,
    });

    if (!permission.allowed) return notification;

    const tokens = await prisma.deviceToken.findMany({
      where: { userId: input.userId, isActive: true },
      orderBy: { lastSeenAt: "desc" },
      take: 100,
      select: { id: true, token: true },
    });

    if (tokens.length === 0) {
      return prisma.userNotification.update({
        where: { id: notification.id },
        data: { pushStatus: "SKIPPED", failureReason: "NO_ACTIVE_DEVICE_TOKENS" },
        select: notificationSelect,
      });
    }

    await prisma.notificationDelivery.createMany({
      data: tokens.map(token => ({
        notificationId: notification.id,
        deviceTokenId: token.id,
      })),
    });

    try {
      const presentation = await getNotificationPresentation(input);

      const response = await firebaseMessaging.sendEachForMulticast({
        tokens: tokens.map(token => token.token),
        notification: {
          title: input.title,
          body: input.body,
        },
        data: toFcmData(notification.id, input),
        android: {
          priority: input.priority === "NORMAL" || !input.priority ? "normal" : "high",
          notification: {
            sound: presentation.soundEnabled ? "default" : undefined,
            defaultVibrateTimings: presentation.vibrationEnabled,
            visibility: "private",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: presentation.soundEnabled ? "default" : undefined,
            },
          },
        },
      });

      return saveBatchResult(notification.id, tokens, response);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Firebase notification delivery failed.";
      await updateFailedBatch(notification.id, reason);

      return prisma.userNotification.findUniqueOrThrow({
        where: { id: notification.id },
        select: notificationSelect,
      });
    }
  },

  async sendTestNotification(userId: string, input: SendTestNotificationInput) {
    return this.createAndSend({
      userId,
      type: "SYSTEM_TEST",
      title: input.title ?? "CareMate+ notification test",
      body: input.body ?? "Your CareMate+ backend can now send Firebase notifications.",
      priority: "HIGH",
      targetScreen: "Notifications",
      data: { source: "BACKEND_TEST" },
    });
  },
};