import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { caregiverPharmacyOrderService } from "./caregiver-pharmacy-order.service.js";
import { caregiverPharmacyOrderParamsSchema, caregiverPharmacyOrdersPatientParamsSchema } from "./caregiver-pharmacy-order.validation.js";

const getCaregiverId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "CAREGIVER") throw new AppError("Only caregivers can access this resource", 403);
  return req.user.id;
};

export const caregiverPharmacyOrderController = {
  async listPatientOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId } = caregiverPharmacyOrdersPatientParamsSchema.parse(req.params);
      const data = await caregiverPharmacyOrderService.listPatientOrders(getCaregiverId(req), patientId);
      return res.status(200).json({ success: true, message: "Patient pharmacy orders fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async getPatientOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId, orderId } = caregiverPharmacyOrderParamsSchema.parse(req.params);
      const data = await caregiverPharmacyOrderService.getPatientOrder(getCaregiverId(req), patientId, orderId);
      return res.status(200).json({ success: true, message: "Patient pharmacy order fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },
};