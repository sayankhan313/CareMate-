import type { Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";

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
    role: "PATIENT" | "DOCTOR" | "CAREGIVER" | "PHARMACY" | "ADMIN";
    accountStatus: string;
    isEmailVerified: boolean;
  };
};

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

export const consultationController = {
  async createManualConsultation(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const validatedData = createManualConsultationSchema.parse(req.body);

    const result = await consultationService.createManualConsultation(
      patientId,
      validatedData
    );

    return res.status(201).json({
      success: true,
      message: "Manual consultation requested successfully",
      data: result,
    });
  },

  async listConsultations(req: Request, res: Response) {
    const patientId = getPatientId(req);

    const result = await consultationService.listPatientConsultations(patientId);

    return res.status(200).json({
      success: true,
      message: "Consultations fetched successfully",
      data: result,
    });
  },

  async getConsultationById(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = consultationIdParamsSchema.parse(req.params);

    const result = await consultationService.getPatientConsultationById(
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