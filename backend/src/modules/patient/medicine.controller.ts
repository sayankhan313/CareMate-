import type { Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { medicineService } from "./medicine.service.js";
import {
  createMedicineSchema,
  medicineIdParamsSchema,
  medicineReviewRequestIdParamsSchema,
  reminderIdParamsSchema,
  requestMedicineDeletionSchema,
  resubmitMedicineReviewSchema,
  snoozeMedicineSchema,
  updateMedicineSchema,
} from "./medicine.validation.js";

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: "PATIENT" | "DOCTOR" | "CAREGIVER" | "PHARMACY" | "ADMIN";
    accountStatus: string;
    isEmailVerified: boolean;
  };
};

const getPatientId = (req: Request) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) throw new AppError("Authentication required", 401);
  if (authReq.user.role !== "PATIENT") throw new AppError("Only patients can access this resource", 403);
  return authReq.user.id;
};

export const medicineController = {
  async createMedicine(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const validatedData = createMedicineSchema.parse(req.body);
    const result = await medicineService.createMedicine(patientId, validatedData);

    return res.status(201).json({
      success: true,
      message: validatedData.sendToDoctorForReview
        ? "Medicine sent for doctor review"
        : validatedData.hasMedicineOnHand === false
          ? "Medicine saved. Reminder will remain inactive until medicine stock is available."
          : "Medicine reminder created successfully",
      data: result,
    });
  },

  async listMedicines(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const result = await medicineService.listMedicines(patientId);
    return res.status(200).json({ success: true, message: "Medicines fetched successfully", data: result });
  },

  async getTodayMedicines(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const result = await medicineService.getTodayMedicines(patientId);
    return res.status(200).json({ success: true, message: "Today's medicines fetched successfully", data: result });
  },

  async getMedicineById(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = medicineIdParamsSchema.parse(req.params);
    const result = await medicineService.getMedicineById(patientId, params.medicineId);
    return res.status(200).json({ success: true, message: "Medicine fetched successfully", data: result });
  },

  async updateMedicine(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = medicineIdParamsSchema.parse(req.params);
    const validatedData = updateMedicineSchema.parse(req.body);
    const result = await medicineService.updateMedicine(patientId, params.medicineId, validatedData);
    return res.status(200).json({ success: true, message: "Medicine updated successfully", data: result });
  },

  async deleteMedicine(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = medicineIdParamsSchema.parse(req.params);
    const result = await medicineService.deleteMedicine(patientId, params.medicineId);
    return res.status(200).json({ success: true, message: result.message });
  },

  async requestMedicineDeletion(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = medicineIdParamsSchema.parse(req.params);
    const validatedData = requestMedicineDeletionSchema.parse(req.body);
    const result = await medicineService.requestMedicineDeletion(patientId, params.medicineId, validatedData);
    return res.status(201).json({ success: true, message: result.message, data: result });
  },

  async listMedicineReviews(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const result = await medicineService.listMedicineReviewRequests(patientId);
    return res.status(200).json({ success: true, message: "Medicine review updates fetched successfully", data: result });
  },

  async markMedicineReviewSeen(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = medicineReviewRequestIdParamsSchema.parse(req.params);
    const result = await medicineService.markMedicineReviewSeen(patientId, params.requestId);
    return res.status(200).json({ success: true, message: "Medicine review marked as seen", data: result });
  },

  async applyApprovedMedicineReview(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = medicineReviewRequestIdParamsSchema.parse(req.params);
    const result = await medicineService.applyApprovedMedicineReview(patientId, params.requestId);
    return res.status(200).json({ success: true, message: result.message, data: result });
  },

  async resubmitMedicineReview(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = medicineReviewRequestIdParamsSchema.parse(req.params);
    const validatedData = resubmitMedicineReviewSchema.parse(req.body);
    const result = await medicineService.resubmitMedicineReview(patientId, params.requestId, validatedData);
    return res.status(201).json({ success: true, message: result.message, data: result });
  },

  async markReminderTaken(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = reminderIdParamsSchema.parse(req.params);
    const result = await medicineService.markReminderTaken(patientId, params.reminderId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        doseLog: result.doseLog,
        stock: result.stock,
      },
    });
  },

  async snoozeReminder(req: Request, res: Response) {
    const patientId = getPatientId(req);
    const params = reminderIdParamsSchema.parse(req.params);
    const validatedData = snoozeMedicineSchema.parse(req.body);
    const result = await medicineService.snoozeReminder(patientId, params.reminderId, validatedData);
    return res.status(200).json({ success: true, message: result.message, data: result.doseLog });
  },

};