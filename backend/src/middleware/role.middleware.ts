import type { Request, Response, NextFunction } from "express";

import { AppError } from "../utils/AppError.js";

type UserRole = "PATIENT" | "DOCTOR" | "CAREGIVER" | "PHARMACY" | "ADMIN";

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError("Authenticated user not found", 401);
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError("You are not allowed to access this resource", 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};