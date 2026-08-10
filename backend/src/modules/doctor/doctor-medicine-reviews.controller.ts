import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { auditService } from "../audit/audit.service.js";
import { getAuditRequestContext } from "../audit/audit-request.util.js";
import { doctorMedicineReviewsService } from "./doctor-medicine-reviews.service.js";
import {
  approveMedicineReviewSchema,
  doctorMedicineReviewParamsSchema,
  doctorMedicineReviewsQuerySchema,
  rejectMedicineReviewSchema,
} from "./doctor-medicine-reviews.validation.js";

type UnknownRecord = Record<string, unknown>;

const getDoctorId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "DOCTOR") throw new AppError("Only doctors can access medicine reviews", 403);
  return req.user.id;
};

const getValidationMessage = (error: unknown) => {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues?: { message?: string }[] }).issues;
    if (Array.isArray(issues) && issues[0]?.message) return issues[0].message;
  }

  return "Invalid request data";
};

const getRecord = (value: unknown): UnknownRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
};

const getStringValue = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;

const getReviewPatientId = (result: unknown) => {
  const resultRecord = getRecord(result);
  const reviewRecord = getRecord(resultRecord?.review);

  return getStringValue(reviewRecord?.patientId) || getStringValue(resultRecord?.patientId);
};

export const doctorMedicineReviewsController = {
  async listReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const parsed = doctorMedicineReviewsQuerySchema.safeParse(req.query);

      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const result = await doctorMedicineReviewsService.listReviews(doctorId, parsed.data);

      return res.status(200).json({
        success: true,
        message: "Medicine reviews fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getReviewDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const parsed = doctorMedicineReviewParamsSchema.safeParse(req.params);

      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const result = await doctorMedicineReviewsService.getReviewDetail(doctorId, parsed.data.requestId);

      return res.status(200).json({
        success: true,
        message: "Medicine review fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async approveReview(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const parsedParams = doctorMedicineReviewParamsSchema.safeParse(req.params);
      if (!parsedParams.success) throw new AppError(getValidationMessage(parsedParams.error), 400);

      const parsedBody = approveMedicineReviewSchema.safeParse(req.body);
      if (!parsedBody.success) throw new AppError(getValidationMessage(parsedBody.error), 400);

      const result = await doctorMedicineReviewsService.approveReview(
        doctorId,
        parsedParams.data.requestId,
        parsedBody.data
      );

      const requestType = result.review.requestType;
      const patientId = getReviewPatientId(result);

      await auditService.safeRecord({
        actorId: doctorId,
        actorRole: "DOCTOR",
        action: "MEDICINE_REVIEW_APPROVED",
        entityType: "MEDICINE_REVIEW_REQUEST",
        entityId: parsedParams.data.requestId,
        patientId,
        outcome: "SUCCESS",
        description:
          requestType === "DELETE"
            ? "Doctor approved a patient medicine deletion request."
            : "Doctor approved a patient medicine addition request.",
        metadata: {
          requestType,
          decision: "APPROVED",
          reviewAccess: "ASSIGNED_PATIENT",
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(200).json({
        success: true,
        message:
          requestType === "DELETE"
            ? "Medicine deletion approved successfully"
            : "Medicine addition approved successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async rejectReview(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const parsedParams = doctorMedicineReviewParamsSchema.safeParse(req.params);
      if (!parsedParams.success) throw new AppError(getValidationMessage(parsedParams.error), 400);

      const parsedBody = rejectMedicineReviewSchema.safeParse(req.body);
      if (!parsedBody.success) throw new AppError(getValidationMessage(parsedBody.error), 400);

      const result = await doctorMedicineReviewsService.rejectReview(
        doctorId,
        parsedParams.data.requestId,
        parsedBody.data
      );

      const requestType = result.review.requestType;
      const patientId = getReviewPatientId(result);

      await auditService.safeRecord({
        actorId: doctorId,
        actorRole: "DOCTOR",
        action: "MEDICINE_REVIEW_REJECTED",
        entityType: "MEDICINE_REVIEW_REQUEST",
        entityId: parsedParams.data.requestId,
        patientId,
        outcome: "SUCCESS",
        description:
          requestType === "DELETE"
            ? "Doctor rejected a patient medicine deletion request."
            : "Doctor rejected a patient medicine addition request.",
        metadata: {
          requestType,
          decision: "REJECTED",
          reviewAccess: "ASSIGNED_PATIENT",
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(200).json({
        success: true,
        message:
          requestType === "DELETE"
            ? "Medicine deletion rejected successfully"
            : "Medicine addition rejected successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listPoolReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const result = await doctorMedicineReviewsService.listPoolReviews(doctorId);

      return res.status(200).json({
        success: true,
        message: "Medicine Review Doctor Pool requests fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPoolReviewDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const parsed = doctorMedicineReviewParamsSchema.safeParse(req.params);

      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const result = await doctorMedicineReviewsService.getPoolReviewDetail(
        doctorId,
        parsed.data.requestId
      );

      await auditService.safeRecord({
        actorId: doctorId,
        actorRole: "DOCTOR",
        action: "MEDICINE_REVIEW_POOL_CONTEXT_VIEWED",
        entityType: "MEDICINE_REVIEW_REQUEST",
        entityId: parsed.data.requestId,
        outcome: "SUCCESS",
        description: "Doctor viewed restricted clinical context for an assigned Medicine Review Doctor Pool request.",
        metadata: {
          reviewAccess: "POOL_RESTRICTED",
          fullPatientProfileAccess: false,
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(200).json({
        success: true,
        message: "Medicine Review Doctor Pool request fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async approvePoolReview(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const parsedParams = doctorMedicineReviewParamsSchema.safeParse(req.params);
      if (!parsedParams.success) throw new AppError(getValidationMessage(parsedParams.error), 400);

      const parsedBody = approveMedicineReviewSchema.safeParse(req.body);
      if (!parsedBody.success) throw new AppError(getValidationMessage(parsedBody.error), 400);

      const result = await doctorMedicineReviewsService.approvePoolReview(
        doctorId,
        parsedParams.data.requestId,
        parsedBody.data
      );

      await auditService.safeRecord({
        actorId: doctorId,
        actorRole: "DOCTOR",
        action: "MEDICINE_REVIEW_POOL_APPROVED",
        entityType: "MEDICINE_REVIEW_REQUEST",
        entityId: parsedParams.data.requestId,
        outcome: "SUCCESS",
        description: "Doctor approved a Medicine Review Doctor Pool request and returned the result to the administrator.",
        metadata: {
          decision: "APPROVED",
          reviewAccess: "POOL_RESTRICTED",
          releasedToPatient: false,
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(200).json({
        success: true,
        message: "Review completed and returned to administrator",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async rejectPoolReview(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = getDoctorId(req);
      const parsedParams = doctorMedicineReviewParamsSchema.safeParse(req.params);
      if (!parsedParams.success) throw new AppError(getValidationMessage(parsedParams.error), 400);

      const parsedBody = rejectMedicineReviewSchema.safeParse(req.body);
      if (!parsedBody.success) throw new AppError(getValidationMessage(parsedBody.error), 400);

      const result = await doctorMedicineReviewsService.rejectPoolReview(
        doctorId,
        parsedParams.data.requestId,
        parsedBody.data
      );

      await auditService.safeRecord({
        actorId: doctorId,
        actorRole: "DOCTOR",
        action: "MEDICINE_REVIEW_POOL_REJECTED",
        entityType: "MEDICINE_REVIEW_REQUEST",
        entityId: parsedParams.data.requestId,
        outcome: "SUCCESS",
        description: "Doctor rejected a Medicine Review Doctor Pool request and returned the result to the administrator.",
        metadata: {
          decision: "REJECTED",
          reviewAccess: "POOL_RESTRICTED",
          releasedToPatient: false,
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(200).json({
        success: true,
        message: "Review completed and returned to administrator",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};