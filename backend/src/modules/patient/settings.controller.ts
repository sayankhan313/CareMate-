import type { Request, Response, NextFunction } from "express";

import { AppError } from "../../utils/AppError.js";
import { settingsService } from "./settings.service.js";
import {
  validateAccessibilitySettings,
  validateNotificationPreferences,
  validatePrivacySettings,
  validateReminderSettings,
  validateSafetySettings,
  type AccessibilitySettingsInput,
  type NotificationPreferencesInput,
  type PrivacySettingsInput,
  type ReminderSettingsInput,
  type SafetySettingsInput,
} from "./settings.validation.js";

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: "PATIENT" | "DOCTOR" | "CAREGIVER" | "PHARMACY" | "ADMIN";
    accountStatus: string;
    isEmailVerified: boolean;
  };
};

const getPatientId = (req: Request) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) throw new AppError("Authentication required", 401);
  if (authReq.user.role !== "PATIENT") throw new AppError("Only patients can access this resource", 403);

  return authReq.user.id;
};

export const settingsController = {
  async getNotificationPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      const preferences = await settingsService.getNotificationPreferences(patientId);

      return res.status(200).json({
        success: true,
        message: "Notification preferences fetched successfully",
        data: { preferences },
      });
    } catch (error) {
      next(error);
    }
  },

  async updateNotificationPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      let input: NotificationPreferencesInput;

      try {
        input = validateNotificationPreferences(req.body);
      } catch (error) {
        throw new AppError(error instanceof Error ? error.message : "Invalid notification preferences", 400);
      }

      const preferences = await settingsService.updateNotificationPreferences(patientId, input);

      return res.status(200).json({
        success: true,
        message: "Notification preferences updated successfully",
        data: { preferences },
      });
    } catch (error) {
      next(error);
    }
  },

  async getReminderSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      const settings = await settingsService.getReminderSettings(patientId);

      return res.status(200).json({
        success: true,
        message: "Reminder settings fetched successfully",
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  },

  async updateReminderSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      let input: ReminderSettingsInput;

      try {
        input = validateReminderSettings(req.body);
      } catch (error) {
        throw new AppError(error instanceof Error ? error.message : "Invalid reminder settings", 400);
      }

      const settings = await settingsService.updateReminderSettings(patientId, input);

      return res.status(200).json({
        success: true,
        message: "Reminder settings updated successfully",
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  },

  async getSafetySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      const settings = await settingsService.getSafetySettings(patientId);

      return res.status(200).json({
        success: true,
        message: "Safety Response settings fetched successfully",
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  },

  async updateSafetySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      let input: SafetySettingsInput;

      try {
        input = validateSafetySettings(req.body);
      } catch (error) {
        throw new AppError(error instanceof Error ? error.message : "Invalid Safety Response settings", 400);
      }

      const settings = await settingsService.updateSafetySettings(patientId, input);

      return res.status(200).json({
        success: true,
        message: "Safety Response settings updated successfully",
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  },

  async getAccessibilitySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      const settings = await settingsService.getAccessibilitySettings(patientId);

      return res.status(200).json({
        success: true,
        message: "Language and accessibility settings fetched successfully",
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  },

  async updateAccessibilitySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      let input: AccessibilitySettingsInput;

      try {
        input = validateAccessibilitySettings(req.body);
      } catch (error) {
        throw new AppError(error instanceof Error ? error.message : "Invalid language or accessibility settings", 400);
      }

      const settings = await settingsService.updateAccessibilitySettings(patientId, input);

      return res.status(200).json({
        success: true,
        message: "Language and accessibility settings updated successfully",
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  },

  async getPrivacySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      const settings = await settingsService.getPrivacySettings(patientId);

      return res.status(200).json({
        success: true,
        message: "Privacy and security settings fetched successfully",
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  },

  async updatePrivacySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      let input: PrivacySettingsInput;

      try {
        input = validatePrivacySettings(req.body);
      } catch (error) {
        throw new AppError(error instanceof Error ? error.message : "Invalid privacy or security settings", 400);
      }

      const settings = await settingsService.updatePrivacySettings(patientId, input);

      return res.status(200).json({
        success: true,
        message: "Privacy and security settings updated successfully",
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  },
};