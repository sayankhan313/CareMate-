import type { Request, Response, NextFunction } from "express";

import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { verifyJwtToken } from "../utils/jwt.util.js";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Authentication token is required", 401);
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new AppError("Authentication token is required", 401);
    }

    let payload;

    try {
      payload = verifyJwtToken(token);
    } catch {
      throw new AppError("Invalid or expired authentication token", 401);
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        accountStatus: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 401);
    }

    if (!user.isEmailVerified) {
      throw new AppError("Please verify your email before continuing", 403);
    }

    if (user.accountStatus === "DISABLED") {
      throw new AppError("Your account has been disabled", 403);
    }

    if (user.accountStatus === "REJECTED") {
      throw new AppError("Your account verification was rejected", 403);
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};