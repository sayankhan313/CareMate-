import type { Request, Response, NextFunction } from "express";

import { AppError } from "../../utils/AppError.js";
import { doctorService } from "./doctor.service.js";

const getDoctorId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "DOCTOR") throw new AppError("Only doctors can access this resource", 403);
  return req.user.id;
};

export const doctorController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const result = await doctorService.getDashboard(doctorId);
      return res.status(200).json({ success: true, message: "Doctor dashboard fetched successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async listAssignedPatients(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const result = await doctorService.listAssignedPatients(doctorId);
      return res.status(200).json({ success: true, message: "Assigned patients fetched successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const month = typeof req.query.month === "string" ? req.query.month : undefined;
      const result = await doctorService.getAvailability(doctorId, month);
      return res.status(200).json({ success: true, message: "Doctor availability fetched successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async saveMonthlyAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const result = await doctorService.saveMonthlyAvailability(doctorId, req.body);
      return res.status(200).json({ success: true, message: "Monthly availability saved successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async updateOperationalStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const result = await doctorService.updateOperationalStatus(doctorId, req.body);
      return res.status(200).json({ success: true, message: "Doctor operational status updated successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

 async deleteAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const doctorId = getDoctorId(req);
    const availabilityId = Array.isArray(req.params.availabilityId) ? req.params.availabilityId[0] : req.params.availabilityId;

    if (!availabilityId) throw new AppError("Availability ID is required", 400);

    const result = await doctorService.deleteAvailability(doctorId, availabilityId);

    return res.status(200).json({
      success: true,
      message: "Availability removed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
},
};