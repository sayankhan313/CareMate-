import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../utils/AppError.js";
import { patientOrdersService } from "./patient-orders.service.js";

const getPatientId = (req: Request) => {
  if (!req.user) {
    throw new AppError(
      "Authentication required",
      401,
    );
  }

  if (req.user.role !== "PATIENT") {
    throw new AppError(
      "Only patients can access pharmacy orders",
      403,
    );
  }

  return req.user.id;
};

export const patientOrdersController = {
  async listOrders(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const patientId = getPatientId(req);

      const data =
        await patientOrdersService.listOrders(
          patientId,
        );

      return res.status(200).json({
        success: true,
        message:
          "Patient pharmacy orders fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};