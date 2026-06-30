import type { NextFunction, Request, Response } from "express";

import { authService } from "./auth.service.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationEmailSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validation.js";

const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const getVerificationSuccessHtml = (message: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>CareMate+ Email Verified</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: linear-gradient(180deg, #ECF7FF 0%, #D6EDFC 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 22px;
            color: #0F172A;
          }

          .card {
            background: #FFFFFF;
            width: 100%;
            max-width: 420px;
            padding: 32px 24px;
            border-radius: 22px;
            text-align: center;
            box-shadow: 0 12px 35px rgba(15, 23, 42, 0.14);
          }

          .brand {
            color: #2563EB;
            font-size: 21px;
            font-weight: 900;
            margin-bottom: 18px;
          }

          .icon {
            width: 78px;
            height: 78px;
            border-radius: 39px;
            background: #DCFCE7;
            color: #16A34A;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            font-weight: 900;
            margin: 0 auto 18px;
          }

          h1 {
            margin: 0 0 10px;
            font-size: 26px;
            color: #0F172A;
          }

          p {
            margin: 0 0 22px;
            color: #64748B;
            font-size: 15px;
            line-height: 22px;
          }

          .note {
            background: #EFF6FF;
            border: 1px solid #DBEAFE;
            color: #1D4ED8;
            border-radius: 14px;
            padding: 14px;
            font-size: 14px;
            font-weight: 700;
          }
        </style>
      </head>

      <body>
        <div class="card">
          <div class="brand">CareMate+</div>
          <div class="icon">✓</div>
          <h1>Email verified</h1>
          <p>${escapeHtml(
            message
          )}. You can now return to the CareMate+ app and login.</p>
          <div class="note">Please go back to the app and sign in.</div>
        </div>
      </body>
    </html>
  `;
};

const getVerificationErrorHtml = (title: string, message: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>CareMate+ Verification Failed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: linear-gradient(180deg, #ECF7FF 0%, #D6EDFC 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 22px;
            color: #0F172A;
          }

          .card {
            background: #FFFFFF;
            width: 100%;
            max-width: 420px;
            padding: 30px 24px;
            border-radius: 22px;
            text-align: center;
            box-shadow: 0 12px 35px rgba(15, 23, 42, 0.14);
          }

          .brand {
            color: #2563EB;
            font-size: 21px;
            font-weight: 900;
            margin-bottom: 18px;
          }

          .icon {
            width: 76px;
            height: 76px;
            border-radius: 38px;
            background: #FEE2E2;
            color: #DC2626;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 38px;
            font-weight: 900;
            margin: 0 auto 18px;
          }

          h1 {
            margin: 0 0 10px;
            font-size: 25px;
            color: #0F172A;
          }

          p {
            margin: 0;
            color: #64748B;
            font-size: 15px;
            line-height: 22px;
          }
        </style>
      </head>

      <body>
        <div class="card">
          <div class="brand">CareMate+</div>
          <div class="icon">!</div>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(message)}</p>
        </div>
      </body>
    </html>
  `;
};

const getResetPasswordSuccessHtml = (message: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Password Reset Successful</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>

      <body style="font-family: Arial, sans-serif; background: linear-gradient(180deg, #ECF7FF 0%, #D6EDFC 100%); display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px;">
        <div style="background: white; max-width: 420px; width: 100%; padding: 32px 24px; border-radius: 22px; text-align: center; box-shadow: 0 12px 35px rgba(15, 23, 42, 0.14);">
          <div style="color: #2563EB; font-size: 21px; font-weight: 900; margin-bottom: 18px;">
            CareMate+
          </div>

          <div style="width: 78px; height: 78px; border-radius: 39px; background: #DCFCE7; color: #16A34A; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 900; margin: 0 auto 18px;">
            ✓
          </div>

          <h2 style="color: #0F172A; margin-bottom: 10px;">
            Password reset successful
          </h2>

          <p style="color: #64748B; line-height: 1.5;">
            ${escapeHtml(
              message
            )}. You can now return to the CareMate+ app and login with your new password.
          </p>
        </div>
      </body>
    </html>
  `;
};

const getResetPasswordErrorHtml = (message: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Password Reset Failed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>

      <body style="font-family: Arial, sans-serif; background: linear-gradient(180deg, #ECF7FF 0%, #D6EDFC 100%); display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px;">
        <div style="background: white; max-width: 420px; width: 100%; padding: 32px 24px; border-radius: 22px; text-align: center; box-shadow: 0 12px 35px rgba(15, 23, 42, 0.14);">
          <div style="color: #2563EB; font-size: 21px; font-weight: 900; margin-bottom: 18px;">
            CareMate+
          </div>

          <div style="width: 78px; height: 78px; border-radius: 39px; background: #FEE2E2; color: #DC2626; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 900; margin: 0 auto 18px;">
            !
          </div>

          <h2 style="color: #0F172A; margin-bottom: 10px;">
            Password reset failed
          </h2>

          <p style="color: #64748B; line-height: 1.5;">
            ${escapeHtml(message)}
          </p>
        </div>
      </body>
    </html>
  `;
};

export const authController = {
  async register(req: Request, res: Response) {
    const validatedData = registerSchema.parse(req.body);

    const result = await authService.register(validatedData);

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email to verify your account.",
      data: result,
    });
  },

  async login(req: Request, res: Response) {
    const validatedData = loginSchema.parse(req.body);

    const result = await authService.login(validatedData);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    const acceptsHtml = req.headers.accept?.includes("text/html");

    try {
      const validation = verifyEmailSchema.safeParse(req.query);

      if (!validation.success) {
        if (acceptsHtml) {
          return res
            .status(400)
            .send(
              getVerificationErrorHtml(
                "Invalid verification link",
                "Please request a new verification email from the CareMate+ app."
              )
            );
        }

        return res.status(400).json({
          success: false,
          message: "Verification token is required.",
        });
      }

      const result = await authService.verifyEmail(validation.data);

      if (acceptsHtml) {
        return res
          .status(200)
          .send(getVerificationSuccessHtml(result.message));
      }

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (acceptsHtml) {
        const message =
          error instanceof Error
            ? error.message
            : "Email verification failed.";

        return res
          .status(400)
          .send(getVerificationErrorHtml("Verification failed", message));
      }

      return next(error);
    }
  },

  async resendVerificationEmail(req: Request, res: Response) {
    const validatedData = resendVerificationEmailSchema.parse(req.body);

    const result = await authService.resendVerificationEmail(validatedData);

    return res.status(200).json({
      success: true,
      message: "Verification email has been sent.",
      data: result,
    });
  },

  async forgotPassword(req: Request, res: Response) {
    const validatedData = forgotPasswordSchema.parse(req.body);

    const result = await authService.forgotPassword(validatedData);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        resetLink: result.resetLink,
      },
    });
  },

  async renderResetPasswordPage(req: Request, res: Response) {
    const token = typeof req.query.token === "string" ? req.query.token : "";

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Reset Link</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>

          <body style="font-family: Arial, sans-serif; background: linear-gradient(180deg, #ECF7FF 0%, #D6EDFC 100%); display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px;">
            <div style="background: white; max-width: 420px; width: 100%; padding: 28px; border-radius: 18px; text-align: center; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);">
              <h2 style="color: #0F172A;">Invalid Reset Link</h2>
              <p style="color: #64748B;">Password reset token is missing.</p>
            </div>
          </body>
        </html>
      `);
    }

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reset CareMate+ Password</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />

          <style>
            body {
              font-family: Arial, sans-serif;
              background: linear-gradient(180deg, #ECF7FF 0%, #D6EDFC 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }

            .card {
              background: #FFFFFF;
              width: 100%;
              max-width: 430px;
              padding: 30px;
              border-radius: 22px;
              box-shadow: 0 12px 35px rgba(15, 23, 42, 0.14);
            }

            .logo {
              width: 76px;
              height: 76px;
              border-radius: 38px;
              background: #2563EB;
              color: #FFFFFF;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 28px;
              font-weight: 900;
              margin: 0 auto 18px;
            }

            h2 {
              color: #0F172A;
              text-align: center;
              margin: 0 0 10px;
              font-size: 26px;
            }

            p {
              color: #64748B;
              text-align: center;
              line-height: 1.5;
              margin: 0 0 22px;
              font-size: 15px;
            }

            label {
              display: block;
              margin-top: 14px;
              color: #0F172A;
              font-weight: 800;
              font-size: 14px;
            }

            input {
              width: 100%;
              padding: 14px;
              margin-top: 8px;
              border-radius: 14px;
              border: 1px solid #DDE7F3;
              font-size: 15px;
              box-sizing: border-box;
              outline: none;
            }

            input:focus {
              border-color: #2563EB;
            }

            button {
              width: 100%;
              margin-top: 22px;
              padding: 15px;
              border: none;
              border-radius: 14px;
              background: #2563EB;
              color: #FFFFFF;
              font-size: 16px;
              font-weight: 900;
              cursor: pointer;
            }
          </style>
        </head>

        <body>
          <div class="card">
            <div class="logo">C+</div>

            <h2>Reset your CareMate+ password</h2>

            <p>Please enter and confirm your new password below.</p>

            <form method="POST" action="/api/v1/auth/reset-password">
              <input type="hidden" name="token" value="${escapeHtml(token)}" />

              <label for="newPassword">New Password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="Enter new password"
                autocomplete="new-password"
                required
              />

              <label for="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                autocomplete="new-password"
                required
              />

              <button type="submit">Reset Password</button>
            </form>
          </div>
        </body>
      </html>
    `);
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    const acceptsHtml =
      req.headers.accept?.includes("text/html") ||
      req.headers["content-type"]?.includes("application/x-www-form-urlencoded");

    try {
      const validatedData = resetPasswordSchema.parse(req.body);

      const result = await authService.resetPassword(validatedData);

      if (acceptsHtml) {
        return res
          .status(200)
          .send(getResetPasswordSuccessHtml(result.message));
      }

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (acceptsHtml) {
        const message =
          error instanceof Error ? error.message : "Password reset failed.";

        return res.status(400).send(getResetPasswordErrorHtml(message));
      }

      return next(error);
    }
  },
};