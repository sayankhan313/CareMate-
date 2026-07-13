import type { Request, Response, NextFunction } from "express";

import { AppError } from "../../utils/AppError.js";
import { profileService } from "./profile.service.js";

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

export const profileController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);

      const result = await profileService.getPatientProfile(patientId);

      return res.status(200).json({
        success: true,
        message: "Patient profile fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};