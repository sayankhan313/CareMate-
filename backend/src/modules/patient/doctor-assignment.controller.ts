import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { AppError } from "../../utils/AppError.js";
import { doctorAssignmentService } from "./doctor-assignment.service.js";

const getPatientId = (req: Request) => {
  if (!req.user) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  if (req.user.role !== "PATIENT") {
    throw new AppError(
      "Only patients can access this resource",
      403
    );
  }

  return req.user.id;
};

const getDoctorIdFromBody = (req: Request) => {
  const doctorId = req.body?.doctorId;

  if (
    typeof doctorId !== "string" ||
    !doctorId.trim()
  ) {
    throw new AppError(
      "Doctor ID is required",
      400
    );
  }

  return doctorId.trim();
};

const getDoctorIdFromParams = (req: Request) => {
  const doctorId = req.params.doctorId;

  if (
    typeof doctorId !== "string" ||
    !doctorId.trim()
  ) {
    throw new AppError(
      "Doctor ID is required",
      400
    );
  }

  return doctorId.trim();
};

const getMakePrimaryFromBody = (req: Request) => {
  const makePrimary = req.body?.makePrimary;

  if (makePrimary === undefined) {
    return false;
  }

  if (typeof makePrimary !== "boolean") {
    throw new AppError(
      "makePrimary must be true or false",
      400
    );
  }

  return makePrimary;
};

const getOptionalQueryText = (
  req: Request,
  key: string
) => {
  const rawValue = req.query[key];

  if (typeof rawValue !== "string") {
    return undefined;
  }

  const value = rawValue.trim();

  return value || undefined;
};

const getLimitFromQuery = (req: Request) => {
  const rawLimit = req.query.limit;

  if (rawLimit === undefined) {
    return 30;
  }

  if (typeof rawLimit !== "string") {
    throw new AppError(
      "Limit must be a number",
      400
    );
  }

  const parsedLimit = Number(rawLimit);

  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > 50
  ) {
    throw new AppError(
      "Limit must be between 1 and 50",
      400
    );
  }

  return parsedLimit;
};

export const doctorAssignmentController = {
  async listDoctorSpecialties(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId = getPatientId(req);

      const result =
        await doctorAssignmentService.listDoctorSpecialties(
          patientId
        );

      return res.status(200).json({
        success: true,
        message:
          "Doctor specialties fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listApprovedDoctors(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId = getPatientId(req);

      const specialization =
        getOptionalQueryText(
          req,
          "specialization"
        );

      const search = getOptionalQueryText(
        req,
        "search"
      );

      const limit = getLimitFromQuery(req);

      const result =
        await doctorAssignmentService.listApprovedDoctors(
          patientId,
          {
            specialization,
            search,
            limit,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Approved doctors fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listAssignedDoctors(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId = getPatientId(req);

      const result =
        await doctorAssignmentService.listAssignedDoctors(
          patientId
        );

      return res.status(200).json({
        success: true,
        message:
          "Assigned doctors fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async assignDoctor(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId = getPatientId(req);
      const doctorId =
        getDoctorIdFromBody(req);

      const makePrimary =
        getMakePrimaryFromBody(req);

      const result =
        await doctorAssignmentService.assignDoctor(
          patientId,
          doctorId,
          {
            makePrimary,
          }
        );

      const isPrimary =
        result.assignment.assignmentType ===
        "PRIMARY";

      return res.status(200).json({
        success: true,
        message: isPrimary
          ? "Primary doctor assigned successfully"
          : "Specialist doctor assigned successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async setPrimaryDoctor(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId = getPatientId(req);
      const doctorId =
        getDoctorIdFromParams(req);

      const result =
        await doctorAssignmentService.setPrimaryDoctor(
          patientId,
          doctorId
        );

      return res.status(200).json({
        success: true,
        message:
          "Primary doctor updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async removeDoctor(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patientId = getPatientId(req);
      const doctorId =
        getDoctorIdFromParams(req);

      const result =
        await doctorAssignmentService.removeDoctor(
          patientId,
          doctorId
        );

      return res.status(200).json({
        success: true,
        message: result.primaryDoctorId
          ? "Doctor removed successfully"
          : "Doctor removed. No primary doctor is currently assigned.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};