import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { caregiverLowStockPromptService } from "./caregiver-low-stock-prompt.service.js";
import { caregiverLowStockPromptParamsSchema } from "./caregiver-low-stock-prompt.validation.js";

const getCaregiverId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "CAREGIVER") throw new AppError("Only caregivers can access this resource", 403);
  return req.user.id;
};

export const caregiverLowStockPromptController = {
  async sendLowStockPrompt(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = caregiverLowStockPromptParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid request parameters", 400);

      const data = await caregiverLowStockPromptService.sendLowStockPrompt(getCaregiverId(req), parsed.data.patientId, parsed.data.medicineId);
      return res.status(200).json({ success: true, message: "Low-stock reminder sent to patient successfully", data });
    } catch (error) {
      next(error);
    }
  },
};