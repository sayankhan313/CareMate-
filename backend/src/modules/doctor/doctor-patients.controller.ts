import type { Request, Response, NextFunction } from "express";

import { AppError } from "../../utils/AppError.js";
import { doctorPatientsService } from "./doctor-patients.service.js";
import { doctorPatientParamsSchema } from "./doctor-patients.validation.js";

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

const getDoctorId = (req: Request) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) throw new AppError("Authentication required", 401);
  if (authReq.user.role !== "DOCTOR") throw new AppError("Only doctors can access this resource", 403);

  return authReq.user.id;
};

const getValidationMessage = (error: unknown) => {
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues?: unknown[] }).issues)) {
    const firstIssue = (error as { issues: { message?: string }[] }).issues[0];
    if (firstIssue?.message) return firstIssue.message;
  }

  return "Invalid request data";
};

export const doctorPatientsController = {
  async listAssignedPatients(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const result = await doctorPatientsService.listAssignedPatients(doctorId);

      return res.status(200).json({
        success: true,
        message: "Assigned patients fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPatientDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const parsedParams = doctorPatientParamsSchema.safeParse(req.params);

      if (!parsedParams.success) throw new AppError(getValidationMessage(parsedParams.error), 400);

      const result = await doctorPatientsService.getPatientDetail(doctorId, parsedParams.data.patientId);

      return res.status(200).json({
        success: true,
        message: "Patient detail fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPatientCareDiary(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const parsedParams = doctorPatientParamsSchema.safeParse(req.params);

      if (!parsedParams.success) throw new AppError(getValidationMessage(parsedParams.error), 400);

      const result = await doctorPatientsService.getPatientCareDiary(doctorId, parsedParams.data.patientId);

      return res.status(200).json({
        success: true,
        message: "Patient care diary fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};