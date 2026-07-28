import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { auditService } from "../audit/audit.service.js";
import { getAuditRequestContext } from "../audit/audit-request.util.js";
import { doctorPrescriptionsService } from "./doctor-prescriptions.service.js";
import {
  createDoctorPrescriptionSchema,
  doctorPrescriptionParamsSchema,
  doctorPrescriptionPatientParamsSchema,
  doctorPrescriptionScanSchema,
} from "./doctor-prescriptions.validation.js";

type UnknownRecord = Record<string, unknown>;

const getDoctorId = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role !== "DOCTOR") {
    throw new AppError("Only doctors can access prescriptions", 403);
  }

  return req.user.id;
};

const getValidationMessage = (error: unknown) => {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (
      error as {
        issues?: {
          message?: string;
        }[];
      }
    ).issues;

    if (Array.isArray(issues) && issues[0]?.message) {
      return issues[0].message;
    }
  }

  return "Invalid request data";
};

const getRecord = (value: unknown): UnknownRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
};

const getStringValue = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const getArrayLength = (value: unknown) => {
  return Array.isArray(value) ? value.length : null;
};

const getPrescriptionAuditData = (result: unknown) => {
  const resultRecord = getRecord(result);
  const prescriptionRecord =
    getRecord(resultRecord?.prescription) || resultRecord;

  return {
    prescriptionId:
      getStringValue(prescriptionRecord?.id) ||
      getStringValue(resultRecord?.prescriptionId),
    status: getStringValue(prescriptionRecord?.status),
    medicineCount:
      getArrayLength(prescriptionRecord?.items) ??
      getArrayLength(prescriptionRecord?.medicines),
  };
};

export const doctorPrescriptionsController = {
  async parsePrescriptionScan(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const doctorId = getDoctorId(req);

      const parsed = doctorPrescriptionScanSchema.safeParse(req.body);

      if (!parsed.success) {
        throw new AppError(getValidationMessage(parsed.error), 400);
      }

      const result =
        await doctorPrescriptionsService.parsePrescriptionScan({
          doctorId,
          detectedText: parsed.data.detectedText,
          ocrConfidence: parsed.data.ocrConfidence,
        });

      return res.status(200).json({
        success: true,
        message: "Prescription scan parsed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async createPrescription(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const doctorId = getDoctorId(req);

      const parsedParams =
        doctorPrescriptionPatientParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        throw new AppError(getValidationMessage(parsedParams.error), 400);
      }

      const parsedBody = createDoctorPrescriptionSchema.safeParse(req.body);

      if (!parsedBody.success) {
        throw new AppError(getValidationMessage(parsedBody.error), 400);
      }

      const patientId = parsedParams.data.patientId;

      const result =
        await doctorPrescriptionsService.createPrescription({
          doctorId,
          patientId,
          input: parsedBody.data,
          imageFile: req.file
            ? {
                filename: req.file.filename,
              }
            : null,
        });

      const auditData = getPrescriptionAuditData(result);

      await auditService.safeRecord({
        actorId: doctorId,
        actorRole: "DOCTOR",
        action: "PRESCRIPTION_CREATED",
        entityType: "PRESCRIPTION",
        entityId: auditData.prescriptionId,
        patientId,
        outcome: "SUCCESS",
        description: "Doctor created a prescription for an assigned patient.",
        metadata: {
          status: auditData.status,
          medicineCount: auditData.medicineCount,
          hasPrescriptionImage: Boolean(req.file),
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(201).json({
        success: true,
        message: "Prescription created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listPatientPrescriptions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const doctorId = getDoctorId(req);

      const parsedParams =
        doctorPrescriptionPatientParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        throw new AppError(getValidationMessage(parsedParams.error), 400);
      }

      const result =
        await doctorPrescriptionsService.listPatientPrescriptions(
          doctorId,
          parsedParams.data.patientId
        );

      return res.status(200).json({
        success: true,
        message: "Patient prescriptions fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPrescriptionDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const doctorId = getDoctorId(req);

      const parsedParams =
        doctorPrescriptionParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        throw new AppError(getValidationMessage(parsedParams.error), 400);
      }

      const result =
        await doctorPrescriptionsService.getPrescriptionDetail(
          doctorId,
          parsedParams.data.prescriptionId
        );

      return res.status(200).json({
        success: true,
        message: "Prescription fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};