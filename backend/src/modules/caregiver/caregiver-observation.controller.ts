import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { caregiverObservationService } from "./caregiver-observation.service.js";
import { caregiverObservationParamsSchema, caregiverObservationPatientParamsSchema, createCaregiverObservationSchema } from "./caregiver-observation.validation.js";

const getCaregiverId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "CAREGIVER") throw new AppError("Only caregivers can access this resource", 403);
  return req.user.id;
};

export const caregiverObservationController = {
  async createObservation(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId } = caregiverObservationPatientParamsSchema.parse(req.params);
      const input = createCaregiverObservationSchema.parse(req.body);
      const data = await caregiverObservationService.createObservation(getCaregiverId(req), patientId, input);
      return res.status(201).json({ success: true, message: "Care observation added successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async listPatientObservations(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId } = caregiverObservationPatientParamsSchema.parse(req.params);
      const data = await caregiverObservationService.listPatientObservations(getCaregiverId(req), patientId);
      return res.status(200).json({ success: true, message: "Care observations fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async getObservation(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId, observationId } = caregiverObservationParamsSchema.parse(req.params);
      const data = await caregiverObservationService.getObservation(getCaregiverId(req), patientId, observationId);
      return res.status(200).json({ success: true, message: "Care observation fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },
};