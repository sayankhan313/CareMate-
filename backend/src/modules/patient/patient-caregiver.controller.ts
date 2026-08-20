import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { patientCaregiverService } from "./patient-caregiver.service.js";
import { patientCaregiverRelationshipParamsSchema } from "./patient-caregiver.validation.js";

const getPatientId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "PATIENT") throw new AppError("Only patients can access this resource", 403);
  return req.user.id;
};

const getRelationshipId = (req: Request) => {
  const parsed = patientCaregiverRelationshipParamsSchema.safeParse(req.params);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid caregiver relationship ID", 400);
  return parsed.data.relationshipId;
};

export const patientCaregiverController = {
  async listRelationships(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await patientCaregiverService.listRelationships(getPatientId(req));
      return res.status(200).json({ success: true, message: "Caregiver relationships fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async approveRelationship(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await patientCaregiverService.approveRelationship(getPatientId(req), getRelationshipId(req));
      return res.status(200).json({ success: true, message: "Caregiver access approved successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async rejectRelationship(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await patientCaregiverService.rejectRelationship(getPatientId(req), getRelationshipId(req));
      return res.status(200).json({ success: true, message: "Caregiver request rejected", data });
    } catch (error) {
      next(error);
    }
  },

  async revokeRelationship(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await patientCaregiverService.revokeRelationship(getPatientId(req), getRelationshipId(req));
      return res.status(200).json({ success: true, message: "Caregiver access revoked successfully", data });
    } catch (error) {
      next(error);
    }
  },
};