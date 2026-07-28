import type { Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { auditService } from "../audit/audit.service.js";
import { getAuditRequestContext } from "../audit/audit-request.util.js";

import { consultationService } from "./consultation.service.js";
import {
  consultationIdParamsSchema,
  createManualConsultationSchema,
} from "./consultation.validation.js";

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    fullName: string;
    email: string;
    role:
      | "PATIENT"
      | "DOCTOR"
      | "CAREGIVER"
      | "PHARMACY"
      | "ADMIN";
    accountStatus: string;
    isEmailVerified: boolean;
  };
};

type UnknownRecord = Record<string, unknown>;

const getPatientId = (req: Request) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    throw new AppError("Authentication required", 401);
  }

  if (authReq.user.role !== "PATIENT") {
    throw new AppError("Only patients can access this resource", 403);
  }

  return authReq.user.id;
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

const getConsultationAuditData = (result: unknown) => {
  const resultRecord = getRecord(result);

  const consultationRecord =
    getRecord(resultRecord?.consultation) ||
    resultRecord;

  const doctorRecord = getRecord(consultationRecord?.doctor);

  return {
    consultationId:
      getStringValue(consultationRecord?.id) ||
      getStringValue(resultRecord?.consultationId),
    doctorId:
      getStringValue(consultationRecord?.doctorId) ||
      getStringValue(doctorRecord?.id),
    status:
      getStringValue(consultationRecord?.status) ||
      getStringValue(resultRecord?.status),
    consultationType:
      getStringValue(consultationRecord?.type) ||
      getStringValue(consultationRecord?.consultationType),
    priority:
      getStringValue(consultationRecord?.priority) ||
      getStringValue(consultationRecord?.urgency),
    source:
      getStringValue(consultationRecord?.source) ||
      getStringValue(consultationRecord?.createdFrom) ||
      "MANUAL",
  };
};

export const consultationController = {
  async createManualConsultation(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const validatedData = createManualConsultationSchema.parse(req.body);

    const result = await consultationService.createManualConsultation(
      patientId,
      validatedData
    );

    const auditData = getConsultationAuditData(result);

    await auditService.safeRecord({
      actorId: patientId,
      actorRole: "PATIENT",
      action: "CONSULTATION_REQUESTED",
      entityType: "CONSULTATION",
      entityId: auditData.consultationId,
      patientId,
      outcome: "SUCCESS",
      description: "Patient created a manual consultation request.",
      metadata: {
        doctorId: auditData.doctorId,
        status: auditData.status,
        consultationType: auditData.consultationType,
        priority: auditData.priority,
        source: auditData.source,
      },
      requestContext: getAuditRequestContext(req),
    });

    return res.status(201).json({
      success: true,
      message: "Manual consultation requested successfully",
      data: result,
    });
  },

  async listConsultations(req: Request, res: Response) {
    const patientId = getPatientId(req);

    const result =
      await consultationService.listPatientConsultations(patientId);

    return res.status(200).json({
      success: true,
      message: "Consultations fetched successfully",
      data: result,
    });
  },

  async getConsultationById(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = consultationIdParamsSchema.parse(req.params);

    const result =
      await consultationService.getPatientConsultationById(
        patientId,
        params.consultationId
      );

    return res.status(200).json({
      success: true,
      message: "Consultation fetched successfully",
      data: result,
    });
  },

  async getPatientJoinConfig(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = consultationIdParamsSchema.parse(req.params);

    const result = await consultationService.getPatientJoinConfig(
      patientId,
      params.consultationId
    );

    return res.status(200).json({
      success: true,
      message: "Patient meeting config generated successfully",
      data: result,
    });
  },
};