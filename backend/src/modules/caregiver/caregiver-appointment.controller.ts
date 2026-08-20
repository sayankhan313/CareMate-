import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { auditService } from "../audit/audit.service.js";
import { getAuditRequestContext } from "../audit/audit-request.util.js";
import { caregiverAppointmentService } from "./caregiver-appointment.service.js";
import {
  caregiverAppointmentDoctorParamsSchema,
  caregiverAppointmentMonthQuerySchema,
  caregiverAppointmentPatientParamsSchema,
  caregiverAppointmentSlotsQuerySchema,
  caregiverCreateAppointmentSchema,
} from "./caregiver-appointment.validation.js";

const getCaregiverId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "CAREGIVER") throw new AppError("Only caregivers can access this resource", 403);
  return req.user.id;
};

export const caregiverAppointmentController = {
  async listAssignedDoctors(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId } = caregiverAppointmentPatientParamsSchema.parse(req.params);
      const data = await caregiverAppointmentService.listAssignedDoctors(getCaregiverId(req), patientId);
      return res.status(200).json({ success: true, message: "Assigned doctors fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async getMonthlyAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId, doctorId } = caregiverAppointmentDoctorParamsSchema.parse(req.params);
      const { month } = caregiverAppointmentMonthQuerySchema.parse(req.query);
      const data = await caregiverAppointmentService.getMonthlyAvailability(getCaregiverId(req), patientId, doctorId, month);
      return res.status(200).json({ success: true, message: "Doctor monthly availability fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async getAvailableSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId, doctorId } = caregiverAppointmentDoctorParamsSchema.parse(req.params);
      const { date } = caregiverAppointmentSlotsQuerySchema.parse(req.query);
      const data = await caregiverAppointmentService.getAvailableSlots(getCaregiverId(req), patientId, doctorId, date);
      return res.status(200).json({ success: true, message: "Doctor appointment slots fetched successfully", data });
    } catch (error) {
      next(error);
    }
  },

  async createAppointmentRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const caregiverId = getCaregiverId(req);
      const { patientId } = caregiverAppointmentPatientParamsSchema.parse(req.params);
      const input = caregiverCreateAppointmentSchema.parse(req.body);
      const data = await caregiverAppointmentService.createAppointmentRequest(caregiverId, patientId, input);

      await auditService.safeRecord({
        actorId: caregiverId,
        actorRole: "CAREGIVER",
        action: "CONSULTATION_REQUESTED",
        entityType: "CONSULTATION",
        entityId: data.consultation.id,
        patientId,
        outcome: "SUCCESS",
        description: "Caregiver requested an appointment for a linked patient.",
        metadata: {
          doctorId: data.consultation.doctorId,
          status: data.consultation.status,
          consultationType: data.consultation.type,
          initiatorType: data.consultation.initiatorType,
          preferredAt: data.consultation.preferredAt,
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(201).json({ success: true, message: data.message, data });
    } catch (error) {
      next(error);
    }
  },
};