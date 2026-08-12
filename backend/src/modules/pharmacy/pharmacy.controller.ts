import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { pharmacyService } from "./pharmacy.service.js";
import { pharmacyOrderParamsSchema, pharmacyOrdersQuerySchema } from "./pharmacy.validation.js";

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

export const pharmacyController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pharmacyService.getDashboard(getPharmacyId(req));
      return res.status(200).json({ success: true, message: "Pharmacy dashboard fetched successfully", data });
    } catch (error) { next(error); }
  },

  async listOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyOrdersQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);
      const data = await pharmacyService.listOrders(getPharmacyId(req), parsed.data);
      return res.status(200).json({ success: true, message: "Pharmacy orders fetched successfully", data });
    } catch (error) { next(error); }
  },

  async getOrderDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyOrderParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);
      const data = await pharmacyService.getOrderDetail(getPharmacyId(req), parsed.data.orderId);
      return res.status(200).json({ success: true, message: "Pharmacy order fetched successfully", data });
    } catch (error) { next(error); }
  },
};