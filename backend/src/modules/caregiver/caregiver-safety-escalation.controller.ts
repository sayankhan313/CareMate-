import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { caregiverSafetyEscalationService } from "./caregiver-safety-escalation.service.js";
import { caregiverSafetyEscalationParamsSchema } from "./caregiver-safety-escalation.validation.js";

const getCaregiverId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "CAREGIVER") throw new AppError("Only caregivers can access this resource", 403);
  return req.user.id;
};

const parseParams = (req: Request) => {
  const parsed = caregiverSafetyEscalationParamsSchema.safeParse(req.params);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid safety escalation parameters", 400);
  return parsed.data;
};

export const caregiverSafetyEscalationController = {
  async getEscalationHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const params = parseParams(req);
      const data = await caregiverSafetyEscalationService.getEscalationHistory(getCaregiverId(req), params.patientId, params.alertId);
      return res.status(200).json({ success: true, message: "Safety escalation history fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async tryAnotherDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const params = parseParams(req);
      const data = await caregiverSafetyEscalationService.tryAnotherDoctor(getCaregiverId(req), params.patientId, params.alertId);
      return res.status(200).json({ success: true, message: data.message, data });
    } catch (error) {
      next(error);
    }
  },
};