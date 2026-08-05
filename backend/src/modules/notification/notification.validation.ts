import { z } from "zod";

export const registerDeviceTokenSchema = z.object({
  token: z.string().trim().min(20, "FCM token is invalid.").max(4096, "FCM token is too long."),
  platform: z.enum(["ANDROID", "IOS"]),
  deviceId: z.string().trim().min(1).max(200).optional(),
  deviceName: z.string().trim().min(1).max(100).optional(),
  appVersion: z.string().trim().min(1).max(50).optional(),
});

export const deactivateDeviceTokenSchema = z.object({
  token: z.string().trim().min(20, "FCM token is invalid.").max(4096, "FCM token is too long."),
});

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z
    .enum(["true", "false"])
    .default("false")
    .transform(value => value === "true"),
});

export const notificationIdParamsSchema = z.object({
  notificationId: z.string().uuid("Notification ID is invalid."),
});

export const testNotificationSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  body: z.string().trim().min(1).max(240).optional(),
});
