import type { Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { vitalsService } from "./vitals.service.js";
import {
  createVitalReadingSchema,
  vitalHistoryQuerySchema,
} from "./vitals.validation.js";

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

  if (!authReq.user) {
    throw new AppError("Authentication required", 401);
  }

  if (authReq.user.role !== "PATIENT") {
    throw new AppError("Only patients can access this resource", 403);
  }

  return authReq.user.id;
};

export const vitalsController = {
  async createReading(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const validatedData = createVitalReadingSchema.parse(req.body);

    const result = await vitalsService.createReading(patientId, validatedData);

    return res.status(201).json({
      success: true,
      message: "Vital reading saved successfully",
      data: result,
    });
  },

  async getLatestReading(req: Request, res: Response) {
    const patientId = getPatientId(req);

    const result = await vitalsService.getLatestReading(patientId);

    return res.status(200).json({
      success: true,
      message: "Latest vital reading fetched successfully",
      data: result,
    });
  },

  async getReadingHistory(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const query = vitalHistoryQuerySchema.parse(req.query);

    const result = await vitalsService.getReadingHistory(patientId, query);

    return res.status(200).json({
      success: true,
      message: "Vital reading history fetched successfully",
      data: result,
    });
  },
};