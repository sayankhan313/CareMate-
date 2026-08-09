import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { doctorProfileService } from "./doctor-profile.service.js";

const getDoctorId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "DOCTOR") throw new AppError("Only doctors can access this resource", 403);
  return req.user.id;
};

export const doctorProfileController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const result = await doctorProfileService.getProfile(doctorId);
      return res.status(200).json({ success: true, message: "Doctor profile fetched successfully", data: result });
    } catch (error) {
      next(error);
    }
  },
};