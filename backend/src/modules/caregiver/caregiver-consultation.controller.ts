import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { caregiverConsultationService } from "./caregiver-consultation.service.js";
import { caregiverConsultationParamsSchema, caregiverConsultationPatientParamsSchema } from "./caregiver-consultation.validation.js";

const getCaregiverId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "CAREGIVER") throw new AppError("Only caregivers can access this resource", 403);
  return req.user.id;
};

export const caregiverConsultationController = {
  async listPatientConsultations(req: Request, res: Response, next: NextFunction) {
    try {
      const params = caregiverConsultationPatientParamsSchema.parse(req.params);
      const data = await caregiverConsultationService.listPatientConsultations(getCaregiverId(req), params.patientId);
      return res.status(200).json({ success: true, message: "Patient consultations fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async getPatientConsultation(req: Request, res: Response, next: NextFunction) {
    try {
      const params = caregiverConsultationParamsSchema.parse(req.params);
      const data = await caregiverConsultationService.getPatientConsultation(getCaregiverId(req), params.patientId, params.consultationId);
      return res.status(200).json({ success: true, message: "Patient consultation fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },
};