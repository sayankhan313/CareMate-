import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { pharmacyLinkService } from "./pharmacy-link.service.js";

const getPatientId = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role !== "PATIENT") {
    throw new AppError("Only patients can access this resource", 403);
  }

  return req.user.id;
};

const getPharmacyIdFromParams = (req: Request) => {
  const pharmacyId = req.params.pharmacyId;

  if (typeof pharmacyId !== "string" || !pharmacyId.trim()) {
    throw new AppError("Pharmacy ID is required", 400);
  }

  return pharmacyId.trim();
};

const getOptionalQueryText = (req: Request, key: string) => {
  const rawValue = req.query[key];

  if (typeof rawValue !== "string") {
    return undefined;
  }

  return rawValue.trim() || undefined;
};

const getLimitFromQuery = (req: Request) => {
  const rawLimit = req.query.limit;

  if (rawLimit === undefined) {
    return 30;
  }

  if (typeof rawLimit !== "string") {
    throw new AppError("Limit must be a number", 400);
  }

  const parsedLimit = Number(rawLimit);

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
    throw new AppError("Limit must be between 1 and 50", 400);
  }

  return parsedLimit;
};

export const pharmacyLinkController = {
  async listApprovedPharmacies(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pharmacyLinkService.listApprovedPharmacies(getPatientId(req), {
        search: getOptionalQueryText(req, "search"),
        city: getOptionalQueryText(req, "city"),
        postcode: getOptionalQueryText(req, "postcode"),
        limit: getLimitFromQuery(req),
      });

      return res.status(200).json({
        success: true,
        message: "Approved pharmacies fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async listSavedPharmacies(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pharmacyLinkService.listSavedPharmacies(getPatientId(req));

      return res.status(200).json({
        success: true,
        message: "Saved pharmacies fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async savePharmacy(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pharmacyLinkService.savePharmacy(
        getPatientId(req),
        getPharmacyIdFromParams(req),
      );

      return res.status(200).json({
        success: true,
        message: data.link.isPrimary
          ? "Pharmacy saved and set as your primary pharmacy"
          : "Pharmacy saved successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async setPrimaryPharmacy(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pharmacyLinkService.setPrimaryPharmacy(
        getPatientId(req),
        getPharmacyIdFromParams(req),
      );

      return res.status(200).json({
        success: true,
        message: "Primary pharmacy updated successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async removePharmacy(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pharmacyLinkService.removePharmacy(
        getPatientId(req),
        getPharmacyIdFromParams(req),
      );

      return res.status(200).json({
        success: true,
        message: data.primaryPharmacyId
          ? "Pharmacy removed successfully"
          : "Pharmacy removed. No primary pharmacy is currently selected.",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};