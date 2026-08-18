import path from "node:path";

import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { removePatientPharmacyExemptionFiles } from "../../middleware/exemption-upload.middleware.js";
import { AppError } from "../../utils/AppError.js";
import { patientPrescriptionChargeService } from "./patient-prescription-charge.service.js";
import {
  submitPatientPrescriptionChargeEvidenceSchema,
  updatePatientPrescriptionChargeSchema,
} from "./patient-prescription-charge.validation.js";

const getPatientId = (req: Request) => {
  if (!req.user) {
    throw new AppError(
      "Authentication required",
      401,
    );
  }

  if (req.user.role !== "PATIENT") {
    throw new AppError(
      "Only patients can access prescription payment settings",
      403,
    );
  }

  return req.user.id;
};

const getUploadedFiles = (req: Request) =>
  Array.isArray(req.files)
    ? (req.files as Express.Multer.File[])
    : [];

export const patientPrescriptionChargeController = {
  async getProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data =
        await patientPrescriptionChargeService.getProfile(
          getPatientId(req),
        );

      return res.status(200).json({
        success: true,
        message:
          "Prescription payment profile fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async updatePreference(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const parsed =
        updatePatientPrescriptionChargeSchema.safeParse(
          req.body,
        );

      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues[0]?.message ||
            "Invalid prescription payment preference",
          400,
        );
      }

      const data =
        await patientPrescriptionChargeService.updatePreference(
          getPatientId(req),
          parsed.data.selection,
        );

      return res.status(200).json({
        success: true,
        message:
          parsed.data.selection === "CHARGEABLE"
            ? "Prescription charges are now enabled for eligible orders"
            : "Exemption selected. Upload evidence for pharmacy verification.",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async submitEvidence(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const files = getUploadedFiles(req);

    try {
      if (files.length === 0) {
        throw new AppError(
          "At least one exemption evidence document is required",
          400,
        );
      }

      const parsed =
        submitPatientPrescriptionChargeEvidenceSchema.safeParse(
          req.body,
        );

      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues[0]?.message ||
            "Invalid exemption evidence details",
          400,
        );
      }

      const evidenceDocumentUrls =
        files.map(file =>
          path
            .relative(
              process.cwd(),
              file.path,
            )
            .split(path.sep)
            .join("/"),
        );

      const data =
        await patientPrescriptionChargeService.submitEvidence(
          getPatientId(req),
          {
            ...parsed.data,
            evidenceDocumentUrls,
          },
        );

      return res.status(201).json({
        success: true,
        message:
          "Exemption evidence submitted to your primary pharmacy for verification",
        data,
      });
    } catch (error) {
      await removePatientPharmacyExemptionFiles(
        files.map(file => file.path),
      );

      next(error);
    }
  },
};