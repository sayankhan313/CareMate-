import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import {
  doctorReportsService,
  type DoctorReportQueueStatus,
} from "./doctor-reports.service.js";

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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

const getRequiredId = (value: unknown, fieldName: string) => {
  const resolvedValue = Array.isArray(value) ? value[0] : value;

  if (typeof resolvedValue !== "string" || !resolvedValue.trim()) {
    throw new AppError(`${fieldName} is required`, 400);
  }

  const id = resolvedValue.trim();

  if (!UUID_PATTERN.test(id)) {
    throw new AppError(`${fieldName} must be a valid UUID`, 400);
  }

  return id;
};

const getQueueStatus = (value: unknown): DoctorReportQueueStatus => {
  const resolvedValue = Array.isArray(value) ? value[0] : value;

  if (resolvedValue === undefined || resolvedValue === null || resolvedValue === "") {
    return "PENDING";
  }

  if (typeof resolvedValue !== "string") {
    throw new AppError("Invalid report review status", 400);
  }

  const status = resolvedValue.trim().toUpperCase();

  if (status !== "ALL" && status !== "PENDING" && status !== "REVIEWED") {
    throw new AppError("Status must be ALL, PENDING or REVIEWED", 400);
  }

  return status;
};

const getReviewNote = (body: unknown) => {
  if (!body || typeof body !== "object") {
    throw new AppError("Review note is required", 400);
  }

  const reviewNote = (body as { reviewNote?: unknown }).reviewNote;

  if (typeof reviewNote !== "string") {
    throw new AppError("Review note is required", 400);
  }

  const cleanedNote = reviewNote.trim();

  if (cleanedNote.length < 2) {
    throw new AppError("Review note must contain at least 2 characters", 400);
  }

  if (cleanedNote.length > 2000) {
    throw new AppError("Review note cannot exceed 2000 characters", 400);
  }

  return cleanedNote;
};

const getSafeDownloadFileName = (fileName: string) => {
  const cleanedFileName = fileName.replace(/["\\\r\n]/g, "_").trim();

  return cleanedFileName || "medical-report";
};

export const doctorReportsController = {
  async listReportQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const status = getQueueStatus(req.query.status);

      const result = await doctorReportsService.listReportQueue(doctorId, {
        status,
      });

      return res.status(200).json({
        success: true,
        message: "Doctor report review queue fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listPatientReports(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const patientId = getRequiredId(req.params.patientId, "Patient ID");

      const result = await doctorReportsService.listPatientReports(
        doctorId,
        patientId
      );

      return res.status(200).json({
        success: true,
        message: "Patient medical reports fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getReportDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const patientId = getRequiredId(req.params.patientId, "Patient ID");
      const reportId = getRequiredId(req.params.reportId, "Report ID");

      const result = await doctorReportsService.getReportDetail(
        doctorId,
        patientId,
        reportId
      );

      return res.status(200).json({
        success: true,
        message: "Medical report detail fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getReportFile(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const patientId = getRequiredId(req.params.patientId, "Patient ID");
      const reportId = getRequiredId(req.params.reportId, "Report ID");

      const file = await doctorReportsService.getReportFile(
        doctorId,
        patientId,
        reportId
      );

      const safeFileName = getSafeDownloadFileName(file.originalFileName);

      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Length", String(file.fileSize));
      res.setHeader("Content-Disposition", `inline; filename="${safeFileName}"`);
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.setHeader("X-Content-Type-Options", "nosniff");

      return res.sendFile(file.absolutePath, (error) => {
        if (error) {
          next(error);
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async reviewReport(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const patientId = getRequiredId(req.params.patientId, "Patient ID");
      const reportId = getRequiredId(req.params.reportId, "Report ID");
      const reviewNote = getReviewNote(req.body);

      const result = await doctorReportsService.reviewReport(
        doctorId,
        patientId,
        reportId,
        reviewNote
      );

      return res.status(200).json({
        success: true,
        message: "Medical report reviewed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};