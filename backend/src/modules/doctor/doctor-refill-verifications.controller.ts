import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../utils/AppError.js";
import { doctorRefillVerificationsService } from "./doctor-refill-verifications.service.js";
import {
  confirmRefillVerificationSchema,
  rejectRefillVerificationSchema,
} from "./doctor-refill-verifications.validation.js";

const getDoctorId = (req: Request) => {
  if (!req.user) {
    throw new AppError(
      "Authentication required",
      401,
    );
  }

  if (req.user.role !== "DOCTOR") {
    throw new AppError(
      "Only doctors can review medicine verification requests",
      403,
    );
  }

  return req.user.id;
};

const getSubmissionId = (req: Request) => {
  const submissionId =
    req.params.submissionId;

  if (
    !submissionId ||
    Array.isArray(submissionId)
  ) {
    throw new AppError(
      "Valid refill verification request ID is required",
      400,
    );
  }

  return submissionId;
};

export const doctorRefillVerificationsController = {
  async listPending(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const doctorId =
        getDoctorId(req);

      const result =
        await doctorRefillVerificationsService.listPending(
          doctorId,
        );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getDetail(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const doctorId =
        getDoctorId(req);

      const submissionId =
        getSubmissionId(req);

      const result =
        await doctorRefillVerificationsService.getDetail(
          doctorId,
          submissionId,
        );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async confirm(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const doctorId =
        getDoctorId(req);

      const submissionId =
        getSubmissionId(req);

      const input =
        confirmRefillVerificationSchema.parse(
          req.body || {},
        );

      const result =
        await doctorRefillVerificationsService.confirm(
          doctorId,
          submissionId,
          input.note,
        );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async reject(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const doctorId =
        getDoctorId(req);

      const submissionId =
        getSubmissionId(req);

      const input =
        rejectRefillVerificationSchema.parse(
          req.body || {},
        );

      const result =
        await doctorRefillVerificationsService.reject(
          doctorId,
          submissionId,
          input.note,
        );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};