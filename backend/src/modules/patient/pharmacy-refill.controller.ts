import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { pharmacyRefillService } from "./pharmacy-refill.service.js";
import { createPharmacyRefillSchema } from "./pharmacy-refill.validation.js";

const getPatientId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "PATIENT") throw new AppError("Only patients can request medicine from a pharmacy", 403);
  return req.user.id;
};

export const pharmacyRefillController = {
  async createRefillRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = getPatientId(req);
      const input = createPharmacyRefillSchema.parse(req.body);
      const result = await pharmacyRefillService.createRefillRequest(patientId, input);

      return res.status(201).json({
        success: true,
        message: result.requiresPharmacyVerification
          ? "Medicine request sent to your primary pharmacy for pharmacist verification."
          : "Medicine request sent to your primary pharmacy successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};