import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { pharmacyInventoryMatchService } from "./pharmacy-inventory-match.service.js";
import {
  confirmPharmacyInventoryMatchSchema,
  pharmacyInventoryMatchParamsSchema,
} from "./pharmacy-inventory-match.validation.js";

const getPharmacyId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  if (req.user.role !== "PHARMACY") {
    throw new AppError("Only pharmacies can access this resource", 403);
  }

  return req.user.id;
};

const validationMessage = (error: unknown) => {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues?: { message?: string }[] }).issues;

    if (Array.isArray(issues) && issues[0]?.message) {
      return issues[0].message;
    }
  }

  return "Invalid request data";
};

export const pharmacyInventoryMatchController = {
  async getCandidates(req: Request, res: Response, next: NextFunction) {
    try {
      const params = pharmacyInventoryMatchParamsSchema.safeParse(req.params);

      if (!params.success) {
        throw new AppError(validationMessage(params.error), 400);
      }

      const data = await pharmacyInventoryMatchService.getCandidates(
        getPharmacyId(req),
        params.data.orderId,
        params.data.orderItemId,
      );

      return res.status(200).json({
        success: true,
        message: "Inventory candidates fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async confirmMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const params = pharmacyInventoryMatchParamsSchema.safeParse(req.params);
      const body = confirmPharmacyInventoryMatchSchema.safeParse(req.body);

      if (!params.success) {
        throw new AppError(validationMessage(params.error), 400);
      }

      if (!body.success) {
        throw new AppError(validationMessage(body.error), 400);
      }

      const data = await pharmacyInventoryMatchService.confirmMatchAndReserve(
        getPharmacyId(req),
        params.data.orderId,
        params.data.orderItemId,
        body.data,
      );

      return res.status(200).json({
        success: true,
        message: "Inventory matched and stock reserved successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async releaseMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const params = pharmacyInventoryMatchParamsSchema.safeParse(req.params);

      if (!params.success) {
        throw new AppError(validationMessage(params.error), 400);
      }

      const data = await pharmacyInventoryMatchService.releaseMatch(
        getPharmacyId(req),
        params.data.orderId,
        params.data.orderItemId,
      );

      return res.status(200).json({
        success: true,
        message: "Inventory reservation released successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};