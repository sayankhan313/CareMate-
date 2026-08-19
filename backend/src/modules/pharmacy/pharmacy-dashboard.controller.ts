import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { pharmacyDashboardService } from "./pharmacy-dashboard.service.js";

const getPharmacyId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "PHARMACY") throw new AppError("Only pharmacies can access this resource", 403);
  return req.user.id;
};

export const pharmacyDashboardController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pharmacyDashboardService.getDashboard(getPharmacyId(req));

      return res.status(200).json({
        success: true,
        message: "Pharmacy dashboard fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};