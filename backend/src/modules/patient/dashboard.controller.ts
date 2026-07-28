import type { Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { dashboardService } from "./dashboard.service.js";

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

export const dashboardController = {
  async getDashboard(req: Request, res: Response) {
    const patientId = getPatientId(req);

    const result = await dashboardService.getDashboard(patientId);

    return res.status(200).json({
      success: true,
      message: "Patient dashboard fetched successfully",
      data: result,
    });
  },
};