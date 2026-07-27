import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { auditService } from "../audit/audit.service.js";
import { getAuditRequestContext } from "../audit/audit-request.util.js";
import { doctorAlertsService } from "./doctor-alerts.service.js";
import {
  doctorAlertParamsSchema,
  doctorAlertsQuerySchema,
} from "./doctor-alerts.validation.js";

type UnknownRecord = Record<string, unknown>;

const getDoctorId = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role !== "DOCTOR") {
    throw new AppError("Only doctors can access this resource", 403);
  }

  return req.user.id;
};

const getValidationMessage = (error: unknown) => {
  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray((error as { issues?: unknown[] }).issues)
  ) {
    const firstIssue = (
      error as {
        issues: {
          message?: string;
        }[];
      }
    ).issues[0];

    if (firstIssue?.message) {
      return firstIssue.message;
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
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
};

const getAlertAuditData = (result: unknown) => {
  const resultRecord = getRecord(result);
  const alertRecord = getRecord(resultRecord?.alert) || resultRecord;
  const patientRecord = getRecord(alertRecord?.patient);

  return {
    patientId:
      getStringValue(alertRecord?.patientId) ||
      getStringValue(resultRecord?.patientId) ||
      getStringValue(patientRecord?.id),
    status:
      getStringValue(alertRecord?.status) ||
      getStringValue(resultRecord?.status),
    severity:
      getStringValue(alertRecord?.severity) ||
      getStringValue(resultRecord?.severity),
    triggerType:
      getStringValue(alertRecord?.triggerType) ||
      getStringValue(alertRecord?.source),
  };
};

export const doctorAlertsController = {
  async listAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);

      const parsedQuery = doctorAlertsQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        throw new AppError(
          getValidationMessage(parsedQuery.error),
          400
        );
      }

      const result = await doctorAlertsService.listAlerts(
        doctorId,
        parsedQuery.data
      );

      return res.status(200).json({
        success: true,
        message: "Doctor safety alerts fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAlertDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const doctorId = getDoctorId(req);

      const parsedParams = doctorAlertParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        throw new AppError(
          getValidationMessage(parsedParams.error),
          400
        );
      }

      const result = await doctorAlertsService.getAlertDetail(
        doctorId,
        parsedParams.data.alertId
      );

      return res.status(200).json({
        success: true,
        message: "Safety alert detail fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async resolveAlert(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const doctorId = getDoctorId(req);

      const parsedParams = doctorAlertParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        throw new AppError(
          getValidationMessage(parsedParams.error),
          400
        );
      }

      const result = await doctorAlertsService.resolveAlert(
        doctorId,
        parsedParams.data.alertId
      );

      const auditData = getAlertAuditData(result);

      await auditService.safeRecord({
        actorId: doctorId,
        actorRole: "DOCTOR",
        action: "SAFETY_ALERT_RESOLVED",
        entityType: "SAFETY_ALERT",
        entityId: parsedParams.data.alertId,
        patientId: auditData.patientId,
        outcome: "SUCCESS",
        description:
          "Doctor resolved an active patient safety alert.",
        metadata: {
          status: auditData.status,
          severity: auditData.severity,
          triggerType: auditData.triggerType,
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(200).json({
        success: true,
        message: "Safety alert resolved successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};