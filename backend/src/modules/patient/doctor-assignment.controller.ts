import type { Request, Response, NextFunction } from "express";

import { AppError } from "../../utils/AppError.js";
import { doctorAssignmentService } from "./doctor-assignment.service.js";

const getPatientId = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role !== "PATIENT") {
    throw new AppError("Only patients can access this resource", 403);
  }

  return req.user.id;
};

const getDoctorIdFromBody = (req: Request) => {
  const doctorId = req.body?.doctorId;

  if (typeof doctorId !== "string" || !doctorId.trim()) {
    throw new AppError("Doctor ID is required", 400);
  }

  return doctorId.trim();
};

export const doctorAssignmentController = {
  async listApprovedDoctors(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);

      const result = await doctorAssignmentService.listApprovedDoctors(
        patientId
      );

      return res.status(200).json({
        success: true,
        message: "Approved doctors fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async assignDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      const doctorId = getDoctorIdFromBody(req);

      const result = await doctorAssignmentService.assignDoctor(
        patientId,
        doctorId
      );

      return res.status(200).json({
        success: true,
        message: "Doctor assigned successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};