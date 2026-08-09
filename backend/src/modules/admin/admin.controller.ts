import type { Request, Response, NextFunction } from "express";

import { AppError } from "../../utils/AppError.js";
import { auditService } from "../audit/audit.service.js";
import { getAuditRequestContext } from "../audit/audit-request.util.js";
import { adminService } from "./admin.service.js";

type UnknownRecord = Record<string, unknown>;

const getAuthenticatedAdminId = (req: Request) => {
  if (!req.user) throw new AppError("Authenticated admin not found", 401);
  return req.user.id;
};

const getParamAsString = (req: Request, paramName: string) => {
  const value = req.params[paramName];
  if (typeof value !== "string" || !value.trim()) throw new AppError(`Invalid ${paramName}`, 400);
  return value.trim();
};

const getBodyString = (req: Request, fieldName: string) => {
  const value = req.body?.[fieldName];
  if (typeof value !== "string" || !value.trim()) throw new AppError(`${fieldName} is required`, 400);
  return value.trim();
};

const getRequestNotes = (req: Request) => {
  if (typeof req.body?.notes !== "string") return undefined;
  return req.body.notes;
};

const getStatusQuery = (req: Request) => typeof req.query.status === "string" ? req.query.status : undefined;

const getRecord = (value: unknown): UnknownRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
};

const getStringValue = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;

const getUserAuditData = (result: unknown) => {
  const resultRecord = getRecord(result);
  const userRecord =
    getRecord(resultRecord?.user) ||
    getRecord(resultRecord?.doctor) ||
    getRecord(resultRecord?.pharmacy) ||
    resultRecord;

  return {
    role: getStringValue(userRecord?.role) || getStringValue(resultRecord?.role),
    accountStatus: getStringValue(userRecord?.accountStatus) || getStringValue(resultRecord?.accountStatus),
    verificationStatus: getStringValue(userRecord?.verificationStatus) || getStringValue(resultRecord?.verificationStatus),
  };
};

export const adminController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getDashboard();
      return res.status(200).json({ success: true, message: "Admin dashboard fetched successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async listMedicineReviewEscalations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listMedicineReviewEscalations();
      return res.status(200).json({ success: true, message: "Medicine review escalations fetched successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async getMedicineReviewEscalation(req: Request, res: Response, next: NextFunction) {
    try {
      const requestId = getParamAsString(req, "requestId");
      const result = await adminService.getMedicineReviewEscalation(requestId);
      return res.status(200).json({ success: true, message: "Medicine review escalation fetched successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async assignMedicineReviewEscalation(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = getAuthenticatedAdminId(req);
      const requestId = getParamAsString(req, "requestId");
      const doctorId = getBodyString(req, "doctorId");

      const result = await adminService.assignMedicineReviewEscalation(requestId, doctorId);

      await auditService.safeRecord({
        actorId: adminId,
        actorRole: "ADMIN",
        action: "MEDICINE_REVIEW_POOL_ASSIGNED",
        entityType: "MEDICINE_REVIEW_REQUEST",
        entityId: requestId,
        patientId: result.request?.patientId || undefined,
        outcome: "SUCCESS",
        description: "Administrator assigned an escalated medicine review to the Medicine Review Doctor Pool.",
        metadata: {
          poolDoctorId: doctorId,
          patientAssignmentCreated: false,
          poolOnlyAccess: true,
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(200).json({
        success: true,
        message: "Medicine review assigned to Medicine Review Doctor Pool successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listMedicineReviewPoolAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listMedicineReviewPoolAssignments();
      return res.status(200).json({
        success: true,
        message: "Assigned Medicine Review Doctor Pool requests fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listCompletedMedicineReviewPoolReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listCompletedMedicineReviewPoolReviews();
      return res.status(200).json({
        success: true,
        message: "Completed Medicine Review Doctor Pool requests fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async releaseMedicineReviewPoolResult(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = getAuthenticatedAdminId(req);
      const requestId = getParamAsString(req, "requestId");

      const result = await adminService.releaseMedicineReviewPoolResult(requestId, adminId);

      await auditService.safeRecord({
        actorId: adminId,
        actorRole: "ADMIN",
        action: "MEDICINE_REVIEW_POOL_RESULT_RELEASED",
        entityType: "MEDICINE_REVIEW_REQUEST",
        entityId: requestId,
        patientId: result.request?.patientId || undefined,
        outcome: "SUCCESS",
        description: "Administrator released a completed Medicine Review Doctor Pool result to the patient.",
        metadata: {
          poolDoctorId: result.request?.poolDoctorId || null,
          decision: result.request?.status || null,
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(200).json({
        success: true,
        message: "Medicine review result released to patient successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listDoctorVerifications(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listDoctorVerifications(getStatusQuery(req));
      return res.status(200).json({ success: true, message: "Doctor verification requests fetched successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async getDoctorVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getParamAsString(req, "userId");
      const result = await adminService.getDoctorVerification(userId);
      return res.status(200).json({ success: true, message: "Doctor verification request fetched successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async approveDoctorVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = getAuthenticatedAdminId(req);
      const userId = getParamAsString(req, "userId");

      const result = await adminService.approveDoctorVerification(userId, {
        adminId,
        notes: getRequestNotes(req),
      });

      const auditData = getUserAuditData(result);

      await auditService.safeRecord({
        actorId: adminId,
        actorRole: "ADMIN",
        action: "DOCTOR_ACCOUNT_APPROVED",
        entityType: "USER_ACCOUNT",
        entityId: userId,
        outcome: "SUCCESS",
        description: "Administrator approved a doctor account verification.",
        metadata: {
          targetRole: auditData.role || "DOCTOR",
          accountStatus: auditData.accountStatus,
          verificationStatus: auditData.verificationStatus,
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(200).json({ success: true, message: "Doctor account approved successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async rejectDoctorVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = getAuthenticatedAdminId(req);
      const userId = getParamAsString(req, "userId");

      const result = await adminService.rejectDoctorVerification(userId, {
        adminId,
        notes: getRequestNotes(req),
      });

      const auditData = getUserAuditData(result);

      await auditService.safeRecord({
        actorId: adminId,
        actorRole: "ADMIN",
        action: "DOCTOR_ACCOUNT_REJECTED",
        entityType: "USER_ACCOUNT",
        entityId: userId,
        outcome: "SUCCESS",
        description: "Administrator rejected a doctor account verification.",
        metadata: {
          targetRole: auditData.role || "DOCTOR",
          accountStatus: auditData.accountStatus,
          verificationStatus: auditData.verificationStatus,
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(200).json({ success: true, message: "Doctor account rejected successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async listPharmacyVerifications(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listPharmacyVerifications(getStatusQuery(req));
      return res.status(200).json({ success: true, message: "Pharmacy verification requests fetched successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async getPharmacyVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getParamAsString(req, "userId");
      const result = await adminService.getPharmacyVerification(userId);
      return res.status(200).json({ success: true, message: "Pharmacy verification request fetched successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async approvePharmacyVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = getAuthenticatedAdminId(req);
      const userId = getParamAsString(req, "userId");

      const result = await adminService.approvePharmacyVerification(userId, {
        adminId,
        notes: getRequestNotes(req),
      });

      const auditData = getUserAuditData(result);

      await auditService.safeRecord({
        actorId: adminId,
        actorRole: "ADMIN",
        action: "PHARMACY_ACCOUNT_APPROVED",
        entityType: "USER_ACCOUNT",
        entityId: userId,
        outcome: "SUCCESS",
        description: "Administrator approved a pharmacy account verification.",
        metadata: {
          targetRole: auditData.role || "PHARMACY",
          accountStatus: auditData.accountStatus,
          verificationStatus: auditData.verificationStatus,
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(200).json({ success: true, message: "Pharmacy account approved successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async rejectPharmacyVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = getAuthenticatedAdminId(req);
      const userId = getParamAsString(req, "userId");

      const result = await adminService.rejectPharmacyVerification(userId, {
        adminId,
        notes: getRequestNotes(req),
      });

      const auditData = getUserAuditData(result);

      await auditService.safeRecord({
        actorId: adminId,
        actorRole: "ADMIN",
        action: "PHARMACY_ACCOUNT_REJECTED",
        entityType: "USER_ACCOUNT",
        entityId: userId,
        outcome: "SUCCESS",
        description: "Administrator rejected a pharmacy account verification.",
        metadata: {
          targetRole: auditData.role || "PHARMACY",
          accountStatus: auditData.accountStatus,
          verificationStatus: auditData.verificationStatus,
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(200).json({ success: true, message: "Pharmacy account rejected successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listUsers();
      return res.status(200).json({ success: true, message: "Users fetched successfully", data: result });
    } catch (error) {
      next(error);
    }
  },

  async suspendUser(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = getAuthenticatedAdminId(req);
      const userId = getParamAsString(req, "userId");

      const result = await adminService.suspendUser(userId, adminId);
      const auditData = getUserAuditData(result);

      await auditService.safeRecord({
        actorId: adminId,
        actorRole: "ADMIN",
        action: "USER_ACCOUNT_SUSPENDED",
        entityType: "USER_ACCOUNT",
        entityId: userId,
        outcome: "SUCCESS",
        description: "Administrator suspended a user account.",
        metadata: {
          targetRole: auditData.role,
          accountStatus: auditData.accountStatus,
        },
        requestContext: getAuditRequestContext(req),
      });

      return res.status(200).json({ success: true, message: "User suspended successfully", data: result });
    } catch (error) {
      next(error);
    }
  },
};