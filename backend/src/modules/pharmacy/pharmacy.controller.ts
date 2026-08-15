import fs from "node:fs";
import path from "node:path";

import type { NextFunction, Request, Response } from "express";

import { patientPharmacyExemptionUploadDir } from "../../middleware/exemption-upload.middleware.js";
import { AppError } from "../../utils/AppError.js";
import { pharmacyService } from "./pharmacy.service.js";
import {
  pharmacyExemptionDocumentParamsSchema,
  pharmacyExemptionEvidenceParamsSchema,
  pharmacyExemptionReviewsQuerySchema,
  pharmacyOrderParamsSchema,
  pharmacyOrdersQuerySchema,
  rejectPharmacyExemptionEvidenceSchema,
} from "./pharmacy.validation.js";

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
  const absolutePath = path.isAbsolute(storedPath) ? path.resolve(storedPath) : path.resolve(process.cwd(), storedPath);
  const allowedPrefix = `${uploadRoot}${path.sep}`;

  if (absolutePath !== uploadRoot && !absolutePath.startsWith(allowedPrefix)) {
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

export const pharmacyController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pharmacyService.getDashboard(getPharmacyId(req));
      return res.status(200).json({ success: true, message: "Pharmacy dashboard fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async listOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyOrdersQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const data = await pharmacyService.listOrders(getPharmacyId(req), parsed.data);
      return res.status(200).json({ success: true, message: "Pharmacy orders fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async getOrderDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyOrderParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const data = await pharmacyService.getOrderDetail(getPharmacyId(req), parsed.data.orderId);
      return res.status(200).json({ success: true, message: "Pharmacy order fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async listExemptionReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyExemptionReviewsQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const data = await pharmacyService.listExemptionReviews(getPharmacyId(req), parsed.data);
      return res.status(200).json({ success: true, message: "Exemption reviews fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async getExemptionReview(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyExemptionEvidenceParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const data = await pharmacyService.getExemptionReview(getPharmacyId(req), parsed.data.evidenceId);
      return res.status(200).json({ success: true, message: "Exemption review fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async getExemptionDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyExemptionDocumentParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const document = await pharmacyService.getExemptionEvidenceDocument(
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

  async verifyExemptionEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = pharmacyExemptionEvidenceParamsSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const data = await pharmacyService.verifyExemptionEvidence(getPharmacyId(req), parsed.data.evidenceId);

      return res.status(200).json({
        success: true,
        message: "Patient exemption evidence verified successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async rejectExemptionEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const params = pharmacyExemptionEvidenceParamsSchema.safeParse(req.params);
      if (!params.success) throw new AppError(getValidationMessage(params.error), 400);

      const body = rejectPharmacyExemptionEvidenceSchema.safeParse(req.body);
      if (!body.success) throw new AppError(getValidationMessage(body.error), 400);

      const data = await pharmacyService.rejectExemptionEvidence(
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