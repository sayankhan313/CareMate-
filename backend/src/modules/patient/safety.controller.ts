import type { Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";

import { safetyService } from "./safety.service.js";
import {
  createSafetyAlertSchema,
  safetyAlertIdParamsSchema,
} from "./safety.validation.js";

const getPatientId = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role !== "PATIENT") {
    throw new AppError("Only patients can access this resource", 403);
  }

  return req.user.id;
};

export const safetyController = {
  async createSafetyAlert(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const validatedData = createSafetyAlertSchema.parse(req.body);

    const result = await safetyService.createSafetyAlert(
      patientId,
      validatedData
    );

    return res.status(201).json({
      success: true,
      message: "Safety response started successfully",
      data: result,
    });
  },

  async getActiveSafetyAlert(req: Request, res: Response) {
    const patientId = getPatientId(req);

    const result = await safetyService.getActiveSafetyAlert(patientId);

    return res.status(200).json({
      success: true,
      message: "Active safety alert fetched successfully",
      data: result,
    });
  },

  async cancelSafetyAlert(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = safetyAlertIdParamsSchema.parse(req.params);

    const result = await safetyService.cancelSafetyAlert(
      patientId,
      params.alertId
    );

    return res.status(200).json({
      success: true,
      message: "Safety alert cancelled successfully",
      data: result,
    });
  },

  async escalateSafetyAlert(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = safetyAlertIdParamsSchema.parse(req.params);

    const result = await safetyService.escalateSafetyAlert(
      patientId,
      params.alertId
    );

    return res.status(200).json({
      success: true,
      message: "Safety response escalated successfully",
      data: result,
    });
  },
};