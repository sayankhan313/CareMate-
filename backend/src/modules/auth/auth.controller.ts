import type { Request, Response, NextFunction } from "express";

import { authService } from "./auth.service.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationEmailSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validation.js";

const formatZodErrors = (issues: { path: PropertyKey[]; message: string }[]) => {
  return issues.map((issue) => {
    return {
      field: issue.path.join("."),
      message: issue.message,
    };
  });
};

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = registerSchema.safeParse(req.body);

      if (validation.success) {
        const result = await authService.register(validation.data);

        return res.status(201).json({
          success: true,
          message: "Registration successful. Please verify your email.",
          data: result,
        });
      }

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodErrors(validation.error.issues),
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = loginSchema.safeParse(req.body);

      if (validation.success) {
        const result = await authService.login(validation.data);

        return res.status(200).json({
          success: true,
          message: "Login successful",
          data: result,
        });
      }

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodErrors(validation.error.issues),
      });
    } catch (error) {
      next(error);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = verifyEmailSchema.safeParse(req.query);

      if (validation.success) {
        const result = await authService.verifyEmail(validation.data);

        return res.status(200).json({
          success: true,
          message: result.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodErrors(validation.error.issues),
      });
    } catch (error) {
      next(error);
    }
  },

  async resendVerificationEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const validation = resendVerificationEmailSchema.safeParse(req.body);

      if (validation.success) {
        const result = await authService.resendVerificationEmail(
          validation.data
        );

        return res.status(200).json({
          success: true,
          message: "Verification email sent successfully",
          data: result,
        });
      }

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodErrors(validation.error.issues),
      });
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = forgotPasswordSchema.safeParse(req.body);

      if (validation.success) {
        const result = await authService.forgotPassword(validation.data);

        return res.status(200).json({
          success: true,
          message: result.message,
          data: {
            resetLink: result.resetLink,
          },
        });
      }

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodErrors(validation.error.issues),
      });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = resetPasswordSchema.safeParse(req.body);

      if (validation.success) {
        const result = await authService.resetPassword(validation.data);

        return res.status(200).json({
          success: true,
          message: result.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodErrors(validation.error.issues),
      });
    } catch (error) {
      next(error);
    }
  },
};