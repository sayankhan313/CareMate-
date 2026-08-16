import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { pharmacyOrdersService } from "./pharmacy-orders.service.js";
import {
  pharmacyOrderParamsSchema,
  pharmacyOrdersQuerySchema,
  updatePharmacyOrderStatusSchema,
  verifyPatientRefillSchema,
} from "./pharmacy-orders.validation.js";

const getPharmacyId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "PHARMACY") throw new AppError("Only pharmacies can access this resource", 403);
  return req.user.id;
};

const getValidationMessage = (error: unknown) => {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues?: { message?: string }[] }).issues;
    if (Array.isArray(issues) && issues[0]?.message) return issues[0].message;
  }

  return "Invalid request data";
};

export const pharmacyOrdersController = {
  async listOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyOrdersQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const data = await pharmacyOrdersService.listOrders(getPharmacyId(req), parsed.data);
      return res.status(200).json({ success: true, message: "Pharmacy orders fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async getOrderDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyOrderParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const data = await pharmacyOrdersService.getOrderDetail(getPharmacyId(req), parsed.data.orderId);
      return res.status(200).json({ success: true, message: "Pharmacy order fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async verifyPatientRefill(req: Request, res: Response, next: NextFunction) {
    try {
      const params = pharmacyOrderParamsSchema.safeParse(req.params);
      if (!params.success) throw new AppError(getValidationMessage(params.error), 400);

      const body = verifyPatientRefillSchema.safeParse(req.body);
      if (!body.success) throw new AppError(getValidationMessage(body.error), 400);

      const data = await pharmacyOrdersService.verifyPatientRefillRequest(
        getPharmacyId(req),
        params.data.orderId,
        body.data.note,
      );

      return res.status(200).json({
        success: true,
        message: "Patient medicine request verified for pharmacy fulfilment",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const params = pharmacyOrderParamsSchema.safeParse(req.params);
      if (!params.success) throw new AppError(getValidationMessage(params.error), 400);

      const body = updatePharmacyOrderStatusSchema.safeParse(req.body);
      if (!body.success) throw new AppError(getValidationMessage(body.error), 400);

      const data = await pharmacyOrdersService.updateOrderStatus(
        getPharmacyId(req),
        params.data.orderId,
        body.data,
      );

      return res.status(200).json({
        success: true,
        message: "Pharmacy order status updated successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};