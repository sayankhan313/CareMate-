import type { Request, Response, NextFunction } from "express";

import { AppError } from "../../utils/AppError.js";
import { doctorConsultationsService } from "./doctor-consultations.service.js";
import {
  doctorConsultationActionBodySchema,
  doctorConsultationParamsSchema,
  doctorConsultationsQuerySchema,
} from "./doctor-consultations.validation.js";

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

  if (!authReq.user) {
    throw new AppError("Authentication required", 401);
  }

  if (authReq.user.role !== "DOCTOR") {
    throw new AppError("Only doctors can access this resource", 403);
  }

  return authReq.user.id;
};

const getValidationMessage = (error: unknown) => {
  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray((error as { issues?: unknown[] }).issues)
  ) {
    const firstIssue = (error as { issues: { message?: string }[] }).issues[0];

    if (firstIssue?.message) {
      return firstIssue.message;
    }
  }

  return "Invalid request data";
};

export const doctorConsultationsController = {
  async listConsultations(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);

      const parsedQuery = doctorConsultationsQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        throw new AppError(getValidationMessage(parsedQuery.error), 400);
      }

      const result = await doctorConsultationsService.listConsultations(
        doctorId,
        parsedQuery.data
      );

      return res.status(200).json({
        success: true,
        message: "Doctor consultations fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getConsultationDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);

      const parsedParams = doctorConsultationParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        throw new AppError(getValidationMessage(parsedParams.error), 400);
      }

      const result = await doctorConsultationsService.getConsultationDetail(
        doctorId,
        parsedParams.data.consultationId
      );

      return res.status(200).json({
        success: true,
        message: "Doctor consultation detail fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async acceptConsultation(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);

      const parsedParams = doctorConsultationParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        throw new AppError(getValidationMessage(parsedParams.error), 400);
      }

      const parsedBody = doctorConsultationActionBodySchema.safeParse(req.body);

      if (!parsedBody.success) {
        throw new AppError(getValidationMessage(parsedBody.error), 400);
      }

      const result = await doctorConsultationsService.acceptConsultation(
        doctorId,
        parsedParams.data.consultationId,
        parsedBody.data
      );

      return res.status(200).json({
        success: true,
        message: "Consultation accepted successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async rejectConsultation(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);

      const parsedParams = doctorConsultationParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        throw new AppError(getValidationMessage(parsedParams.error), 400);
      }

      const parsedBody = doctorConsultationActionBodySchema.safeParse(req.body);

      if (!parsedBody.success) {
        throw new AppError(getValidationMessage(parsedBody.error), 400);
      }

      const result = await doctorConsultationsService.rejectConsultation(
        doctorId,
        parsedParams.data.consultationId,
        parsedBody.data
      );

      return res.status(200).json({
        success: true,
        message: "Consultation rejected successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async completeConsultation(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);

      const parsedParams = doctorConsultationParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        throw new AppError(getValidationMessage(parsedParams.error), 400);
      }

      const parsedBody = doctorConsultationActionBodySchema.safeParse(req.body);

      if (!parsedBody.success) {
        throw new AppError(getValidationMessage(parsedBody.error), 400);
      }

      const result = await doctorConsultationsService.completeConsultation(
        doctorId,
        parsedParams.data.consultationId,
        parsedBody.data
      );

      return res.status(200).json({
        success: true,
        message: "Consultation completed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getDoctorJoinConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);

      const parsedParams = doctorConsultationParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        throw new AppError(getValidationMessage(parsedParams.error), 400);
      }

      const result = await doctorConsultationsService.getDoctorJoinConfig(
        doctorId,
        parsedParams.data.consultationId
      );

      return res.status(200).json({
        success: true,
        message: "Doctor meeting config generated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};