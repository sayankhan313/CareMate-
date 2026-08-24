import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { caregiverSafetyService } from "./caregiver-safety.service.js";
import { caregiverSafetyAlertParamsSchema, caregiverSafetyPatientParamsSchema } from "./caregiver-safety.validation.js";

const getCaregiverId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "CAREGIVER") throw new AppError("Only caregivers can access this resource", 403);
  return req.user.id;
};

export const caregiverSafetyController = {
  async listPatientSafetyAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = caregiverSafetyPatientParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid patient ID", 400);
      const data = await caregiverSafetyService.listPatientSafetyAlerts(getCaregiverId(req), parsed.data.patientId);
      return res.status(200).json({ success: true, message: "Patient safety alerts fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async getPatientSafetyAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = caregiverSafetyAlertParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid safety alert parameters", 400);
      const data = await caregiverSafetyService.getPatientSafetyAlert(getCaregiverId(req), parsed.data.patientId, parsed.data.alertId);
      return res.status(200).json({ success: true, message: "Safety alert fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },
};