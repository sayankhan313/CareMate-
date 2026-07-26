import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../utils/AppError.js";
import { doctorMedicineReviewsService } from "./doctor-medicine-reviews.service.js";
import {
  approveMedicineReviewSchema,
  doctorMedicineReviewParamsSchema,
  doctorMedicineReviewsQuerySchema,
  rejectMedicineReviewSchema,
} from "./doctor-medicine-reviews.validation.js";

const getDoctorId = (req: Request) => {
  if (!req.user) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  if (req.user.role !== "DOCTOR") {
    throw new AppError(
      "Only doctors can access medicine reviews",
      403
    );
  }

  return req.user.id;
};

const getValidationMessage = (
  error: unknown
) => {
  if (
    error &&
    typeof error === "object" &&
    "issues" in error
  ) {
    const issues = (
      error as {
        issues?: {
          message?: string;
        }[];
      }
    ).issues;

    if (
      Array.isArray(issues) &&
      issues[0]?.message
    ) {
      return issues[0].message;
    }
  }

  return "Invalid request data";
};

export const doctorMedicineReviewsController = {
  async listReviews(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const doctorId =
        getDoctorId(req);

      const parsed =
        doctorMedicineReviewsQuerySchema.safeParse(
          req.query
        );

      if (!parsed.success) {
        throw new AppError(
          getValidationMessage(
            parsed.error
          ),
          400
        );
      }

      const result =
        await doctorMedicineReviewsService.listReviews(
          doctorId,
          parsed.data
        );

      return res.status(200).json({
        success: true,
        message:
          "Medicine reviews fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getReviewDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const doctorId =
        getDoctorId(req);

      const parsed =
        doctorMedicineReviewParamsSchema.safeParse(
          req.params
        );

      if (!parsed.success) {
        throw new AppError(
          getValidationMessage(
            parsed.error
          ),
          400
        );
      }

      const result =
        await doctorMedicineReviewsService.getReviewDetail(
          doctorId,
          parsed.data.requestId
        );

      return res.status(200).json({
        success: true,
        message:
          "Medicine review fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async approveReview(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const doctorId =
        getDoctorId(req);

      const parsedParams =
        doctorMedicineReviewParamsSchema.safeParse(
          req.params
        );

      if (!parsedParams.success) {
        throw new AppError(
          getValidationMessage(
            parsedParams.error
          ),
          400
        );
      }

      const parsedBody =
        approveMedicineReviewSchema.safeParse(
          req.body
        );

      if (!parsedBody.success) {
        throw new AppError(
          getValidationMessage(
            parsedBody.error
          ),
          400
        );
      }

      const result =
        await doctorMedicineReviewsService.approveReview(
          doctorId,
          parsedParams.data.requestId,
          parsedBody.data
        );

      return res.status(200).json({
        success: true,
        message:
          result.review.requestType ===
          "DELETE"
            ? "Medicine deletion approved successfully"
            : "Medicine addition approved successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async rejectReview(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const doctorId =
        getDoctorId(req);

      const parsedParams =
        doctorMedicineReviewParamsSchema.safeParse(
          req.params
        );

      if (!parsedParams.success) {
        throw new AppError(
          getValidationMessage(
            parsedParams.error
          ),
          400
        );
      }

      const parsedBody =
        rejectMedicineReviewSchema.safeParse(
          req.body
        );

      if (!parsedBody.success) {
        throw new AppError(
          getValidationMessage(
            parsedBody.error
          ),
          400
        );
      }

      const result =
        await doctorMedicineReviewsService.rejectReview(
          doctorId,
          parsedParams.data.requestId,
          parsedBody.data
        );

      return res.status(200).json({
        success: true,
        message:
          result.review.requestType ===
          "DELETE"
            ? "Medicine deletion rejected successfully"
            : "Medicine addition rejected successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};