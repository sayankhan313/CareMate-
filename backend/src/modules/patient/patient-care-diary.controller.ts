import type { Request, Response, NextFunction } from "express";

import { AppError } from "../../utils/AppError.js";
import { patientCareDiaryService } from "./patient-care-diary.service.js";
import { createPatientCareDiarySchema, updatePatientCareDiarySchema } from "./patient-care-diary.validation.js";

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

const getPatientId = (req: Request) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) throw new AppError("Authentication required", 401);
  if (authReq.user.role !== "PATIENT") throw new AppError("Only patients can access this resource", 403);

  return authReq.user.id;
};

const getEntryId = (req: Request) => {
  const value = req.params.entryId;
  const entryId = Array.isArray(value) ? value[0] : value;

  if (!entryId) throw new AppError("Care diary entry ID is required", 400);
  return entryId;
};

export const patientCareDiaryController = {
  async createEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      const parsed = createPatientCareDiarySchema.safeParse(req.body);

      if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid care diary entry", 400);

      const result = await patientCareDiaryService.createEntry(patientId, parsed.data);

      return res.status(201).json({
        success: true,
        message: "Care diary entry created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      const result = await patientCareDiaryService.listEntries(patientId);

      return res.status(200).json({
        success: true,
        message: "Care diary entries fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      const entryId = getEntryId(req);
      const result = await patientCareDiaryService.getEntry(patientId, entryId);

      return res.status(200).json({
        success: true,
        message: "Care diary entry fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      const entryId = getEntryId(req);
      const parsed = updatePatientCareDiarySchema.safeParse(req.body);

      if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid care diary entry", 400);

      const result = await patientCareDiaryService.updateEntry(patientId, entryId, parsed.data);

      return res.status(200).json({
        success: true,
        message: "Care diary entry updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      const entryId = getEntryId(req);
      const result = await patientCareDiaryService.deleteEntry(patientId, entryId);

      return res.status(200).json({
        success: true,
        message: "Care diary entry deleted successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};