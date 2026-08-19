import fs from "node:fs";
import path from "node:path";

import type { NextFunction, Request, Response } from "express";

import { patientPharmacyExemptionUploadDir } from "../../middleware/exemption-upload.middleware.js";
import { AppError } from "../../utils/AppError.js";
import { pharmacyExemptionService } from "./pharmacy-exemption.service.js";
import {
  pharmacyExemptionDocumentParamsSchema,
  pharmacyExemptionEvidenceParamsSchema,
  pharmacyExemptionReviewsQuerySchema,
  rejectPharmacyExemptionEvidenceSchema,
} from "./pharmacy-exemption.validation.js";

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

const getSafeEvidencePath = async (storedPath: string) => {
  const uploadRoot = path.resolve(patientPharmacyExemptionUploadDir);
  const absolutePath = path.isAbsolute(storedPath)
    ? path.resolve(storedPath)
    : path.resolve(process.cwd(), storedPath);

  if (absolutePath !== uploadRoot && !absolutePath.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new AppError("Invalid exemption evidence path", 403);
  }

  try {
    const stats = await fs.promises.stat(absolutePath);
    if (!stats.isFile()) throw new AppError("Evidence document was not found", 404);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Evidence document was not found", 404);
  }

  return absolutePath;
};

export const pharmacyExemptionController = {
  async listReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyExemptionReviewsQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const data = await pharmacyExemptionService.listReviews(getPharmacyId(req), parsed.data);
      return res.status(200).json({ success: true, message: "Exemption reviews fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async getReview(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyExemptionEvidenceParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const data = await pharmacyExemptionService.getReview(getPharmacyId(req), parsed.data.evidenceId);
      return res.status(200).json({ success: true, message: "Exemption review fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async getDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyExemptionDocumentParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const document = await pharmacyExemptionService.getDocument(
        getPharmacyId(req),
        parsed.data.evidenceId,
        parsed.data.documentIndex,
      );

      const absolutePath = await getSafeEvidencePath(document.storedPath);

      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", `inline; filename="${document.fileName.replace(/"/g, "")}"`);
      res.type(document.fileName);

      return res.sendFile(absolutePath);
    } catch (error) {
      next(error);
    }
  },

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyExemptionEvidenceParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const data = await pharmacyExemptionService.verify(getPharmacyId(req), parsed.data.evidenceId);

      return res.status(200).json({
        success: true,
        message: "Patient exemption evidence verified successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const params = pharmacyExemptionEvidenceParamsSchema.safeParse(req.params);
      if (!params.success) throw new AppError(getValidationMessage(params.error), 400);

      const body = rejectPharmacyExemptionEvidenceSchema.safeParse(req.body);
      if (!body.success) throw new AppError(getValidationMessage(body.error), 400);

      const data = await pharmacyExemptionService.reject(
        getPharmacyId(req),
        params.data.evidenceId,
        body.data.reason,
      );

      return res.status(200).json({
        success: true,
        message: "Patient exemption evidence rejected",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};