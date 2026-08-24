import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { caregiverDashboardService } from "./caregiver-dashboard.service.js";

const getCaregiverId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "CAREGIVER") throw new AppError("Only caregivers can access this resource", 403);
  return req.user.id;
};

export const caregiverDashboardController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await caregiverDashboardService.getDashboard(getCaregiverId(req));
      return res.status(200).json({ success: true, message: "Caregiver dashboard fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },
};