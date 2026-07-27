import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  removeUploadedReportFile,
} from "../../middleware/report-upload.middleware.js";
import { AppError } from "../../utils/AppError.js";

import {
  createPatientReportSchema,
  patientReportParamsSchema,
} from "./report.validation.js";
import { reportService } from "./report.service.js";

type AuthenticatedRequest =
  Request & {
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
      isEmailVerified:
        boolean;
    };
  };

const getPatientId = (
  req: Request
) => {
  const authReq =
    req as AuthenticatedRequest;

  if (!authReq.user) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  if (
    authReq.user.role !==
    "PATIENT"
  ) {
    throw new AppError(
      "Only patients can access this resource",
      403
    );
  }

  return authReq.user.id;
};

const getValidationMessage = (
  error: unknown
) => {
  if (
    error &&
    typeof error ===
      "object" &&
    "issues" in error &&
    Array.isArray(
      (
        error as {
          issues?: unknown[];
        }
      ).issues
    )
  ) {
    const firstIssue =
      (
        error as {
          issues: {
            message?: string;
          }[];
        }
      ).issues[0];

    if (
      firstIssue?.message
    ) {
      return firstIssue.message;
    }
  }

  return "Invalid request data";
};

export const reportController = {
  async createReport(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const uploadedFile =
      req.file;

    try {
      const patientId =
        getPatientId(req);

      if (!uploadedFile) {
        throw new AppError(
          "Medical report file is required.",
          400
        );
      }

      const parsedBody =
        createPatientReportSchema.safeParse(
          req.body
        );

      if (
        !parsedBody.success
      ) {
        throw new AppError(
          getValidationMessage(
            parsedBody.error
          ),
          400
        );
      }

      const result =
        await reportService.createReport(
          patientId,
          parsedBody.data,
          uploadedFile
        );

      return res.status(
        201
      ).json({
        success: true,
        message:
          "Medical report uploaded successfully.",
        data: result,
      });
    } catch (error) {
      await removeUploadedReportFile(
        uploadedFile?.path
      );

      next(error);
    }
  },

  async listReports(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId =
        getPatientId(req);

      const result =
        await reportService.listReports(
          patientId
        );

      return res.status(
        200
      ).json({
        success: true,
        message:
          "Medical reports fetched successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getReportDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId =
        getPatientId(req);

      const parsedParams =
        patientReportParamsSchema.safeParse(
          req.params
        );

      if (
        !parsedParams.success
      ) {
        throw new AppError(
          getValidationMessage(
            parsedParams.error
          ),
          400
        );
      }

      const result =
        await reportService.getReportDetail(
          patientId,
          parsedParams.data
            .reportId
        );

      return res.status(
        200
      ).json({
        success: true,
        message:
          "Medical report fetched successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getReportFile(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId =
        getPatientId(req);

      const parsedParams =
        patientReportParamsSchema.safeParse(
          req.params
        );

      if (
        !parsedParams.success
      ) {
        throw new AppError(
          getValidationMessage(
            parsedParams.error
          ),
          400
        );
      }

      const result =
        await reportService.getReportFile(
          patientId,
          parsedParams.data
            .reportId
        );

      res.setHeader(
        "Content-Type",
        result.mimeType
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(
          result.originalFileName
        )}`
      );

      res.setHeader(
        "Cache-Control",
        "private, no-store"
      );

      res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
      );

      res.sendFile(
        result.absolutePath,
        (error) => {
          if (error) {
            next(error);
          }
        }
      );
    } catch (error) {
      next(error);
    }
  },

  async markReportReviewsSeen(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId =
        getPatientId(req);

      const parsedParams =
        patientReportParamsSchema.safeParse(
          req.params
        );

      if (
        !parsedParams.success
      ) {
        throw new AppError(
          getValidationMessage(
            parsedParams.error
          ),
          400
        );
      }

      const result =
        await reportService.markReportReviewsSeen(
          patientId,
          parsedParams.data
            .reportId
        );

      return res.status(
        200
      ).json({
        success: true,
        message:
          "Report review updates marked as seen.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};