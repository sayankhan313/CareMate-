import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { notificationService } from "./notification.service.js";
import {
  deactivateDeviceTokenSchema,
  notificationIdParamsSchema,
  notificationListQuerySchema,
  registerDeviceTokenSchema,
  testNotificationSchema,
  updatePatientNotificationPreferencesSchema,
  updatePatientReminderPreferencesSchema,
} from "./notification.validation.js";

const getUserId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required.", 401);
  return req.user.id;
};

const getValidationMessage = (error: unknown) => {
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues?: unknown[] }).issues)) {
    const firstIssue = (error as { issues: { message?: string }[] }).issues[0];
    if (firstIssue?.message) return firstIssue.message;
  }

  return "Invalid notification request data.";
};

export const notificationController = {

  async getPatientPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const result = await notificationService.getPatientPreferences(userId);

      return res.status(200).json({
        success: true,
        message: "Notification preferences fetched successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async updatePatientNotificationPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const parsed = updatePatientNotificationPreferencesSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const result = await notificationService.updatePatientNotificationPreferences(userId, parsed.data);

      return res.status(200).json({
        success: true,
        message: "Notification preferences updated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async updatePatientReminderPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const parsed = updatePatientReminderPreferencesSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const result = await notificationService.updatePatientReminderPreferences(userId, parsed.data);

      return res.status(200).json({
        success: true,
        message: "Reminder preferences updated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async registerDeviceToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const parsed = registerDeviceTokenSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const device = await notificationService.registerDeviceToken(userId, parsed.data);

      return res.status(200).json({
        success: true,
        message: "Notification device registered successfully.",
        data: { device },
      });
    } catch (error) {
      next(error);
    }
  },

  async deactivateDeviceToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const parsed = deactivateDeviceTokenSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const result = await notificationService.deactivateDeviceToken(userId, parsed.data);

      return res.status(200).json({
        success: true,
        message: "Notification device deactivated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const parsed = notificationListQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const result = await notificationService.listNotifications(userId, parsed.data);

      return res.status(200).json({
        success: true,
        message: "Notifications fetched successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const result = await notificationService.getUnreadCount(userId);

      return res.status(200).json({
        success: true,
        message: "Unread notification count fetched successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async markNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const parsed = notificationIdParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const notification = await notificationService.markNotificationRead(userId, parsed.data.notificationId);

      return res.status(200).json({
        success: true,
        message: "Notification marked as read.",
        data: { notification },
      });
    } catch (error) {
      next(error);
    }
  },

  async markAllNotificationsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const result = await notificationService.markAllNotificationsRead(userId);

      return res.status(200).json({
        success: true,
        message: "All notifications marked as read.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async sendTestNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const parsed = testNotificationSchema.safeParse(req.body ?? {});
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const notification = await notificationService.sendTestNotification(userId, parsed.data);

      return res.status(201).json({
        success: true,
        message: "Test notification processed successfully.",
        data: { notification },
      });
    } catch (error) {
      next(error);
    }
  },
};