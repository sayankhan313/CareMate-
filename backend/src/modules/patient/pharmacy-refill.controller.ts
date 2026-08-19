import type { NextFunction, Request, Response } from "express";

import { removeUploadedRefillEvidence } from "../../middleware/refill-evidence-upload.middleware.js";
import { AppError } from "../../utils/AppError.js";
import { pharmacyRefillService } from "./pharmacy-refill.service.js";
import { createPharmacyRefillSchema } from "./pharmacy-refill.validation.js";

const getPatientId = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role !== "PATIENT") {
    throw new AppError(
      "Only patients can request medicine from a pharmacy",
      403,
    );
  }

  return req.user.id;
};

const getResultMessage = (result: {
  requiresDoctorVerification: boolean;
  requiresPharmacyVerification: boolean;
}) => {
  if (result.requiresDoctorVerification) {
    return "Medicine request sent to your selected doctor for verification.";
  }

  if (result.requiresPharmacyVerification) {
    return "Medicine request and supporting evidence sent to your primary pharmacy for review.";
  }

  return "Medicine request sent to your primary pharmacy successfully.";
};

export const pharmacyRefillController = {
  async createRefillRequest(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    let uploadedFilePath: string | null = req.file?.path || null;

    try {
      const patientId = getPatientId(req);

      const input = createPharmacyRefillSchema.parse(req.body);

      if (
        input.verificationPath === "ASSIGNED_DOCTOR" &&
        uploadedFilePath
      ) {
        await removeUploadedRefillEvidence(uploadedFilePath);

        uploadedFilePath = null;

        throw new AppError(
          "Evidence must not be uploaded when an assigned doctor is selected.",
          400,
        );
      }

      const result = await pharmacyRefillService.createRefillRequest(
        patientId,
        {
          ...input,
          evidenceFilePath: uploadedFilePath || undefined,
        },
      );

      uploadedFilePath = null;

      return res.status(201).json({
        success: true,
        message: getResultMessage(result),
        data: result,
      });
    } catch (error) {
      if (uploadedFilePath) {
        await removeUploadedRefillEvidence(
          uploadedFilePath,
        ).catch(() => undefined);
      }

      next(error);
    }
  },

  async listActiveRefillRequests(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const patientId = getPatientId(req);

      const result =
        await pharmacyRefillService.listActiveRefillRequests(
          patientId,
        );

      return res.status(200).json({
        success: true,
        message:
          "Active pharmacy medicine requests fetched successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};