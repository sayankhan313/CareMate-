import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";

export const notFoundMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};