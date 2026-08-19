import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../utils/AppError.js";
import { medicinePackReferenceService } from "./medicine-pack-reference.service.js";

export const medicinePackReferenceController = {
  async getPackReference(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const medicineName = String(
        req.query.medicineName || "",
      ).trim();

      const strength = String(
        req.query.strength || "",
      ).trim();

      if (!medicineName) {
        throw new AppError(
          "Medicine name is required",
          400,
        );
      }

      if (!strength) {
        throw new AppError(
          "Medicine strength is required",
          400,
        );
      }

      const data =
        await medicinePackReferenceService.findPackReference(
          medicineName,
          strength,
        );

      return res.status(200).json({
        success: true,
        message:
          "Medicine pack information fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};