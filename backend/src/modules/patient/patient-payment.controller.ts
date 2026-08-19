import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../utils/AppError.js";
import { patientPaymentService } from "./patient-payment.service.js";
import { patientPaymentOrderParamsSchema } from "./patient-payment.validation.js";

const getPatientId = (
  req: Request,
) => {
  if (!req.user) {
    throw new AppError(
      "Authentication required",
      401,
    );
  }

  if (
    req.user.role !== "PATIENT"
  ) {
    throw new AppError(
      "Only patients can access pharmacy payment.",
      403,
    );
  }

  return req.user.id;
};

const getValidationMessage = (
  error: unknown,
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

export const patientPaymentController = {
  async createPaymentIntent(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const params =
        patientPaymentOrderParamsSchema.safeParse(
          req.params,
        );

      if (!params.success) {
        throw new AppError(
          getValidationMessage(
            params.error,
          ),
          400,
        );
      }

      const data =
        await patientPaymentService.createPaymentIntent(
          getPatientId(req),
          params.data.orderId,
        );

      return res.status(200).json({
        success: true,
        message:
          data.alreadyPaid
            ? "Payment is already complete"
            : "Stripe test payment created successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async confirmPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const params =
        patientPaymentOrderParamsSchema.safeParse(
          req.params,
        );

      if (!params.success) {
        throw new AppError(
          getValidationMessage(
            params.error,
          ),
          400,
        );
      }

      const data =
        await patientPaymentService.confirmPayment(
          getPatientId(req),
          params.data.orderId,
        );

      return res.status(200).json({
        success: true,
        message: data.paid
          ? "Stripe payment verified successfully"
          : "Stripe payment has not completed yet",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};