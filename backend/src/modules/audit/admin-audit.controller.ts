import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../utils/AppError.js";
import { adminAuditService } from "./admin-audit.service.js";
import {
  adminAuditLogParamsSchema,
  adminAuditLogsQuerySchema,
} from "./admin-audit.validation.js";

const ensureAuthenticatedAdmin = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  if (req.user.role !== "ADMIN") {
    throw new AppError(
      "Only administrators can access audit logs",
      403
    );
  }

  return req.user.id;
};

const getValidationMessage = (error: unknown) => {
  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray(
      (error as { issues?: unknown[] }).issues
    )
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

export const adminAuditController = {
  async listAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      ensureAuthenticatedAdmin(req);

      const parsedQuery =
        adminAuditLogsQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        throw new AppError(
          getValidationMessage(parsedQuery.error),
          400
        );
      }

      const result =
        await adminAuditService.listAuditLogs(
          parsedQuery.data
        );

      return res.status(200).json({
        success: true,
        message: "Audit logs fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAuditLogDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      ensureAuthenticatedAdmin(req);

      const parsedParams =
        adminAuditLogParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        throw new AppError(
          getValidationMessage(parsedParams.error),
          400
        );
      }

      const result =
        await adminAuditService.getAuditLogDetail(
          parsedParams.data.auditLogId
        );

      return res.status(200).json({
        success: true,
        message: "Audit log fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};