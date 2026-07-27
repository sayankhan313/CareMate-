import type { Request, Response, NextFunction } from "express";

import { AppError } from "../../utils/AppError.js";
import { doctorService } from "./doctor.service.js";

const getDoctorId = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role !== "DOCTOR") {
    throw new AppError("Only doctors can access this resource", 403);
  }

  return req.user.id;
};

export const doctorController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const result = await doctorService.getDashboard(doctorId);

      return res.status(200).json({
        success: true,
        message: "Doctor dashboard fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listAssignedPatients(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const result = await doctorService.listAssignedPatients(doctorId);

      return res.status(200).json({
        success: true,
        message: "Assigned patients fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};