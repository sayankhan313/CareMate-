import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  });
};