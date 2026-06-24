import type { Request, Response, NextFunction } from "express";

import { AppError } from "../../utils/AppError.js";

export const userController = {
  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Authenticated user not found", 401);
      }

      return res.status(200).json({
        success: true,
        message: "Current user fetched successfully",
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};