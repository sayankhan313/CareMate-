import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { caregiverReminderPromptService } from "./caregiver-reminder-prompt.service.js";
import { caregiverReminderPromptParamsSchema } from "./caregiver-reminder-prompt.validation.js";

const getCaregiver = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "CAREGIVER") throw new AppError("Only caregivers can access this resource", 403);
  return { id: req.user.id, fullName: req.user.fullName };
};

export const caregiverReminderPromptController = {
  async sendReminderPrompt(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = caregiverReminderPromptParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid request parameters", 400);

      const caregiver = getCaregiver(req);
      const data = await caregiverReminderPromptService.sendReminderPrompt(caregiver.id, caregiver.fullName, parsed.data.patientId, parsed.data.doseLogId);
      return res.status(200).json({ success: true, message: "Medicine reminder sent to patient successfully", data });
    } catch (error) {
      next(error);
    }
  },
};