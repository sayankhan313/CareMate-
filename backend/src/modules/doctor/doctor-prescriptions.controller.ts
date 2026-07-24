import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../utils/AppError.js";
import { doctorPrescriptionsService } from "./doctor-prescriptions.service.js";
import {
  createDoctorPrescriptionSchema,
  doctorPrescriptionParamsSchema,
  doctorPrescriptionPatientParamsSchema,
  doctorPrescriptionScanSchema,
} from "./doctor-prescriptions.validation.js";

const getDoctorId = (
  req: Request
) => {
  if (!req.user) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  if (req.user.role !== "DOCTOR") {
    throw new AppError(
      "Only doctors can access prescriptions",
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

export const doctorPrescriptionsController =
  {
    async parsePrescriptionScan(
      req: Request,
      res: Response,
      next: NextFunction
    ) {
      try {
        const doctorId =
          getDoctorId(req);

        const parsed =
          doctorPrescriptionScanSchema.safeParse(
            req.body
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
          await doctorPrescriptionsService.parsePrescriptionScan(
            {
              doctorId,
              detectedText:
                parsed.data
                  .detectedText,
              ocrConfidence:
                parsed.data
                  .ocrConfidence,
            }
          );

        return res.status(200).json({
          success: true,
          message:
            "Prescription scan parsed successfully",
          data: result,
        });
      } catch (error) {
        next(error);
      }
    },

    async createPrescription(
      req: Request,
      res: Response,
      next: NextFunction
    ) {
      try {
        const doctorId =
          getDoctorId(req);

        const parsedParams =
          doctorPrescriptionPatientParamsSchema.safeParse(
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

        const parsedBody =
          createDoctorPrescriptionSchema.safeParse(
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
          await doctorPrescriptionsService.createPrescription(
            {
              doctorId,
              patientId:
                parsedParams.data
                  .patientId,
              input:
                parsedBody.data,
              imageFile: req.file
                ? {
                    filename:
                      req.file
                        .filename,
                  }
                : null,
            }
          );

        return res.status(201).json({
          success: true,
          message:
            "Prescription created successfully",
          data: result,
        });
      } catch (error) {
        next(error);
      }
    },

    async listPatientPrescriptions(
      req: Request,
      res: Response,
      next: NextFunction
    ) {
      try {
        const doctorId =
          getDoctorId(req);

        const parsedParams =
          doctorPrescriptionPatientParamsSchema.safeParse(
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
          await doctorPrescriptionsService.listPatientPrescriptions(
            doctorId,
            parsedParams.data
              .patientId
          );

        return res.status(200).json({
          success: true,
          message:
            "Patient prescriptions fetched successfully",
          data: result,
        });
      } catch (error) {
        next(error);
      }
    },

    async getPrescriptionDetail(
      req: Request,
      res: Response,
      next: NextFunction
    ) {
      try {
        const doctorId =
          getDoctorId(req);

        const parsedParams =
          doctorPrescriptionParamsSchema.safeParse(
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
          await doctorPrescriptionsService.getPrescriptionDetail(
            doctorId,
            parsedParams.data
              .prescriptionId
          );

        return res.status(200).json({
          success: true,
          message:
            "Prescription fetched successfully",
          data: result,
        });
      } catch (error) {
        next(error);
      }
    },
  };