import type { Request, Response, NextFunction } from "express";

import { AppError } from "../../utils/AppError.js";
import { doctorNotesService } from "./doctor-notes.service.js";
import {
  createDoctorNoteSchema,
  doctorNotesParamsSchema,
} from "./doctor-notes.validation.js";

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

export const doctorNotesController = {
  async listNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);

      const parsedParams = doctorNotesParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        throw new AppError(getValidationMessage(parsedParams.error), 400);
      }

      const result = await doctorNotesService.listNotes(
        doctorId,
        parsedParams.data.patientId
      );

      return res.status(200).json({
        success: true,
        message: "Doctor notes fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async createNote(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);

      const parsedParams = doctorNotesParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        throw new AppError(getValidationMessage(parsedParams.error), 400);
      }

      const parsedBody = createDoctorNoteSchema.safeParse(req.body);

      if (!parsedBody.success) {
        throw new AppError(getValidationMessage(parsedBody.error), 400);
      }

      const result = await doctorNotesService.createNote(
        doctorId,
        parsedParams.data.patientId,
        parsedBody.data
      );

      return res.status(201).json({
        success: true,
        message: "Doctor note created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};