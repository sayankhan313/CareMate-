import path from "node:path";

import type { Request, Response, NextFunction } from "express";

import { removePatientPharmacyExemptionFiles } from "../../middleware/exemption-upload.middleware.js";
import { AppError } from "../../utils/AppError.js";
import { pharmacyLinkService } from "./pharmacy-link.service.js";
import { submitPharmacyExemptionEvidenceSchema } from "./pharmacy-link.validation.js";

type PrescriptionChargePreference =
  | "CHARGEABLE"
  | "EXEMPT"
  | "PPC";

const CHARGE_PREFERENCES =
  new Set<PrescriptionChargePreference>([
    "CHARGEABLE",
    "EXEMPT",
    "PPC",
  ]);

const getPatientId = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role !== "PATIENT") {
    throw new AppError(
      "Only patients can access this resource",
      403
    );
  }

  return req.user.id;
};

const getPharmacyIdFromParams = (req: Request) => {
  const pharmacyId = req.params.pharmacyId;

  if (
    typeof pharmacyId !== "string" ||
    !pharmacyId.trim()
  ) {
    throw new AppError(
      "Pharmacy ID is required",
      400
    );
  }

  return pharmacyId.trim();
};

const getChargePreferenceFromBody = (
  req: Request
): PrescriptionChargePreference => {
  const value = req.body?.chargePreference;

  if (
    typeof value !== "string" ||
    !CHARGE_PREFERENCES.has(
      value as PrescriptionChargePreference
    )
  ) {
    throw new AppError(
      "chargePreference must be CHARGEABLE, EXEMPT, or PPC",
      400
    );
  }

  return value as PrescriptionChargePreference;
};

const getOptionalQueryText = (
  req: Request,
  key: string
) => {
  const rawValue = req.query[key];

  if (typeof rawValue !== "string") {
    return undefined;
  }

  const value = rawValue.trim();
  return value || undefined;
};

const getLimitFromQuery = (req: Request) => {
  const rawLimit = req.query.limit;

  if (rawLimit === undefined) {
    return 30;
  }

  if (typeof rawLimit !== "string") {
    throw new AppError(
      "Limit must be a number",
      400
    );
  }

  const parsedLimit = Number(rawLimit);

  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > 50
  ) {
    throw new AppError(
      "Limit must be between 1 and 50",
      400
    );
  }

  return parsedLimit;
};

const getUploadedEvidenceFiles = (req: Request) =>
  Array.isArray(req.files)
    ? (req.files as Express.Multer.File[])
    : [];

export const pharmacyLinkController = {
  async listApprovedPharmacies(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId = getPatientId(req);
      const search = getOptionalQueryText(req, "search");
      const city = getOptionalQueryText(req, "city");
      const postcode = getOptionalQueryText(req, "postcode");
      const limit = getLimitFromQuery(req);

      const result =
        await pharmacyLinkService.listApprovedPharmacies(
          patientId,
          {
            search,
            city,
            postcode,
            limit,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Approved pharmacies fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listSavedPharmacies(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId = getPatientId(req);

      const result =
        await pharmacyLinkService.listSavedPharmacies(
          patientId
        );

      return res.status(200).json({
        success: true,
        message:
          "Saved pharmacies fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async savePharmacy(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId = getPatientId(req);
      const pharmacyId =
        getPharmacyIdFromParams(req);
      const chargePreference =
        getChargePreferenceFromBody(req);

      const result =
        await pharmacyLinkService.savePharmacy(
          patientId,
          pharmacyId,
          {
            chargePreference,
          }
        );

      return res.status(200).json({
        success: true,
        message: result.link.isPrimary
          ? "Pharmacy saved and set as your primary pharmacy"
          : "Pharmacy saved successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async setPrimaryPharmacy(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId = getPatientId(req);
      const pharmacyId =
        getPharmacyIdFromParams(req);

      const result =
        await pharmacyLinkService.setPrimaryPharmacy(
          patientId,
          pharmacyId
        );

      return res.status(200).json({
        success: true,
        message:
          "Primary pharmacy updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateChargePreference(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId = getPatientId(req);
      const pharmacyId =
        getPharmacyIdFromParams(req);
      const chargePreference =
        getChargePreferenceFromBody(req);

      const result =
        await pharmacyLinkService.updateChargePreference(
          patientId,
          pharmacyId,
          chargePreference
        );

      return res.status(200).json({
        success: true,
        message:
          "Prescription charge preference updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async submitExemptionEvidence(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const files = getUploadedEvidenceFiles(req);

    try {
      const patientId = getPatientId(req);
      const pharmacyId =
        getPharmacyIdFromParams(req);

      if (files.length === 0) {
        throw new AppError(
          "At least one exemption evidence document is required",
          400
        );
      }

      const parsed =
        submitPharmacyExemptionEvidenceSchema.safeParse(
          req.body
        );

      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues[0]?.message ||
            "Invalid exemption evidence details",
          400
        );
      }

      const storedPaths = files.map(file =>
        path
          .relative(process.cwd(), file.path)
          .split(path.sep)
          .join("/")
      );

      const result =
        await pharmacyLinkService.submitExemptionEvidence(
          patientId,
          pharmacyId,
          {
            ...parsed.data,
            evidenceDocumentUrls: storedPaths,
          }
        );

      return res.status(201).json({
        success: true,
        message:
          "Exemption evidence submitted and is awaiting pharmacy verification",
        data: result,
      });
    } catch (error) {
      await removePatientPharmacyExemptionFiles(
        files.map(file => file.path)
      );

      next(error);
    }
  },

  async listExemptionEvidence(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId = getPatientId(req);
      const pharmacyId =
        getPharmacyIdFromParams(req);

      const result =
        await pharmacyLinkService.listExemptionEvidence(
          patientId,
          pharmacyId
        );

      return res.status(200).json({
        success: true,
        message:
          "Exemption evidence history fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async removePharmacy(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId = getPatientId(req);
      const pharmacyId =
        getPharmacyIdFromParams(req);

      const result =
        await pharmacyLinkService.removePharmacy(
          patientId,
          pharmacyId
        );

      return res.status(200).json({
        success: true,
        message: result.primaryPharmacyId
          ? "Pharmacy removed successfully"
          : "Pharmacy removed. No primary pharmacy is currently selected.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};