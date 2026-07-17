import type { Request, Response, NextFunction } from "express";

import { adminService } from "./admin.service.js";
import { AppError } from "../../utils/AppError.js";

const getAuthenticatedAdminId = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authenticated admin not found", 401);
  }

  return req.user.id;
};

const getParamAsString = (req: Request, paramName: string) => {
  const value = req.params[paramName];

  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`Invalid ${paramName}`, 400);
  }

  return value;
};

const getRequestNotes = (req: Request) => {
  if (typeof req.body?.notes !== "string") {
    return undefined;
  }

  return req.body.notes;
};

export const adminController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getDashboard();

      return res.status(200).json({
        success: true,
        message: "Admin dashboard fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listUsers();

      return res.status(200).json({
        success: true,
        message: "Users fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async suspendUser(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = getAuthenticatedAdminId(req);
      const userId = getParamAsString(req, "userId");

      const result = await adminService.suspendUser(userId, adminId);

      return res.status(200).json({
        success: true,
        message: "User suspended successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listDoctorVerifications(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;

      const result = await adminService.listDoctorVerifications(status);

      return res.status(200).json({
        success: true,
        message: "Doctor verification requests fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getDoctorVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = getParamAsString(req, "userId");

      const result = await adminService.getDoctorVerification(userId);

      return res.status(200).json({
        success: true,
        message: "Doctor verification request fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async approveDoctorVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const adminId = getAuthenticatedAdminId(req);
      const userId = getParamAsString(req, "userId");

      const result = await adminService.approveDoctorVerification(userId, {
        adminId,
        notes: getRequestNotes(req),
      });

      return res.status(200).json({
        success: true,
        message: "Doctor account approved successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async rejectDoctorVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const adminId = getAuthenticatedAdminId(req);
      const userId = getParamAsString(req, "userId");

      const result = await adminService.rejectDoctorVerification(userId, {
        adminId,
        notes: getRequestNotes(req),
      });

      return res.status(200).json({
        success: true,
        message: "Doctor account rejected successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listPharmacyVerifications(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;

      const result = await adminService.listPharmacyVerifications(status);

      return res.status(200).json({
        success: true,
        message: "Pharmacy verification requests fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPharmacyVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = getParamAsString(req, "userId");

      const result = await adminService.getPharmacyVerification(userId);

      return res.status(200).json({
        success: true,
        message: "Pharmacy verification request fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async approvePharmacyVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const adminId = getAuthenticatedAdminId(req);
      const userId = getParamAsString(req, "userId");

      const result = await adminService.approvePharmacyVerification(userId, {
        adminId,
        notes: getRequestNotes(req),
      });

      return res.status(200).json({
        success: true,
        message: "Pharmacy account approved successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async rejectPharmacyVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const adminId = getAuthenticatedAdminId(req);
      const userId = getParamAsString(req, "userId");

      const result = await adminService.rejectPharmacyVerification(userId, {
        adminId,
        notes: getRequestNotes(req),
      });

      return res.status(200).json({
        success: true,
        message: "Pharmacy account rejected successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};