import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { pharmacyInventoryService } from "./pharmacy-inventory.service.js";
import {
  createPharmacyInventoryItemSchema,
  pharmacyInventoryItemParamsSchema,
  pharmacyInventoryQuerySchema,
  updatePharmacyInventoryItemSchema,
} from "./pharmacy-inventory.validation.js";

const getPharmacyId = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

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

export const pharmacyInventoryController = {
  async listInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyInventoryQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        throw new AppError(validationMessage(parsed.error), 400);
      }

      const data = await pharmacyInventoryService.listInventory(
        getPharmacyId(req),
        parsed.data,
      );

      return res.status(200).json({
        success: true,
        message: "Pharmacy inventory fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async createInventoryItem(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createPharmacyInventoryItemSchema.safeParse(req.body);

      if (!parsed.success) {
        throw new AppError(validationMessage(parsed.error), 400);
      }

      const data = await pharmacyInventoryService.createInventoryItem(
        getPharmacyId(req),
        parsed.data,
      );

      return res.status(201).json({
        success: true,
        message: "Inventory item created successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateInventoryItem(req: Request, res: Response, next: NextFunction) {
    try {
      const params = pharmacyInventoryItemParamsSchema.safeParse(req.params);
      const body = updatePharmacyInventoryItemSchema.safeParse(req.body);

      if (!params.success) {
        throw new AppError(validationMessage(params.error), 400);
      }

      if (!body.success) {
        throw new AppError(validationMessage(body.error), 400);
      }

      const data = await pharmacyInventoryService.updateInventoryItem(
        getPharmacyId(req),
        params.data.itemId,
        body.data,
      );

      return res.status(200).json({
        success: true,
        message: "Inventory item updated successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async archiveInventoryItem(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyInventoryItemParamsSchema.safeParse(req.params);

      if (!parsed.success) {
        throw new AppError(validationMessage(parsed.error), 400);
      }

      const data = await pharmacyInventoryService.archiveInventoryItem(
        getPharmacyId(req),
        parsed.data.itemId,
      );

      return res.status(200).json({
        success: true,
        message: "Inventory item archived successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async restoreInventoryItem(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyInventoryItemParamsSchema.safeParse(req.params);

      if (!parsed.success) {
        throw new AppError(validationMessage(parsed.error), 400);
      }

      const data = await pharmacyInventoryService.restoreInventoryItem(
        getPharmacyId(req),
        parsed.data.itemId,
      );

      return res.status(200).json({
        success: true,
        message: "Inventory item restored successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};