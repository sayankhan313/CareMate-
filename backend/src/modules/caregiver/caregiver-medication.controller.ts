import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { caregiverMedicationService } from "./caregiver-medication.service.js";
import { caregiverPatientParamsSchema } from "./caregiver-patients.validation.js";

const getCaregiverId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "CAREGIVER") throw new AppError("Only caregivers can access this resource", 403);
  return req.user.id;
};

export const caregiverMedicationController = {
  async getPatientMedicationSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = caregiverPatientParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || "Invalid patient ID", 400);
      const data = await caregiverMedicationService.getPatientMedicationSchedule(getCaregiverId(req), parsed.data.patientId);
      return res.status(200).json({ success: true, message: "Patient medication schedule fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },
};