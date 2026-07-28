import type { Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { auditService } from "../audit/audit.service.js";
import { getAuditRequestContext } from "../audit/audit-request.util.js";

import { safetyService } from "./safety.service.js";
import {
  createSafetyAlertSchema,
  safetyAlertIdParamsSchema,
} from "./safety.validation.js";

type UnknownRecord = Record<string, unknown>;

const getPatientId = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role !== "PATIENT") {
    throw new AppError("Only patients can access this resource", 403);
  }

  return req.user.id;
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

const getSafetyAlertAuditData = (result: unknown) => {
  const resultRecord = getRecord(result);

  const alertRecord =
    getRecord(resultRecord?.alert) ||
    getRecord(resultRecord?.safetyAlert) ||
    resultRecord;

  const consultationRecord =
    getRecord(resultRecord?.consultation) ||
    getRecord(alertRecord?.consultation);

  return {
    alertId:
      getStringValue(alertRecord?.id) ||
      getStringValue(resultRecord?.alertId),
    status:
      getStringValue(alertRecord?.status) ||
      getStringValue(resultRecord?.status),
    triggerType:
      getStringValue(alertRecord?.triggerType) ||
      getStringValue(alertRecord?.source),
    severity:
      getStringValue(alertRecord?.severity) ||
      getStringValue(resultRecord?.severity),
    consultationId:
      getStringValue(consultationRecord?.id) ||
      getStringValue(resultRecord?.consultationId),
  };
};

export const safetyController = {
  async createSafetyAlert(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const validatedData = createSafetyAlertSchema.parse(req.body);

    const result = await safetyService.createSafetyAlert(
      patientId,
      validatedData
    );

    const auditData = getSafetyAlertAuditData(result);

    await auditService.safeRecord({
      actorId: patientId,
      actorRole: "PATIENT",
      action: "SAFETY_ALERT_CREATED",
      entityType: "SAFETY_ALERT",
      entityId: auditData.alertId,
      patientId,
      outcome: "SUCCESS",
      description: "Patient safety response was started.",
      metadata: {
        status: auditData.status,
        triggerType: auditData.triggerType,
        severity: auditData.severity,
      },
      requestContext: getAuditRequestContext(req),
    });

    return res.status(201).json({
      success: true,
      message: "Safety response started successfully",
      data: result,
    });
  },

  async getActiveSafetyAlert(req: Request, res: Response) {
    const patientId = getPatientId(req);

    const result = await safetyService.getActiveSafetyAlert(patientId);

    return res.status(200).json({
      success: true,
      message: "Active safety alert fetched successfully",
      data: result,
    });
  },

  async cancelSafetyAlert(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = safetyAlertIdParamsSchema.parse(req.params);

    const result = await safetyService.cancelSafetyAlert(
      patientId,
      params.alertId
    );

    const auditData = getSafetyAlertAuditData(result);

    await auditService.safeRecord({
      actorId: patientId,
      actorRole: "PATIENT",
      action: "SAFETY_ALERT_CANCELLED",
      entityType: "SAFETY_ALERT",
      entityId: params.alertId,
      patientId,
      outcome: "SUCCESS",
      description: "Patient cancelled an active safety response.",
      metadata: {
        status: auditData.status,
        triggerType: auditData.triggerType,
        severity: auditData.severity,
      },
      requestContext: getAuditRequestContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Safety alert cancelled successfully",
      data: result,
    });
  },

  async escalateSafetyAlert(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = safetyAlertIdParamsSchema.parse(req.params);

    const result = await safetyService.escalateSafetyAlert(
      patientId,
      params.alertId
    );

    const auditData = getSafetyAlertAuditData(result);

    await auditService.safeRecord({
      actorId: patientId,
      actorRole: "PATIENT",
      action: "SAFETY_ALERT_ESCALATED",
      entityType: "SAFETY_ALERT",
      entityId: params.alertId,
      patientId,
      outcome: "SUCCESS",
      description:
        "Patient safety response was escalated to the assigned care pathway.",
      metadata: {
        status: auditData.status,
        triggerType: auditData.triggerType,
        severity: auditData.severity,
        consultationCreated: Boolean(auditData.consultationId),
        consultationId: auditData.consultationId,
      },
      requestContext: getAuditRequestContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Safety response escalated successfully",
      data: result,
    });
  },
};