import type { Request, Response } from "express";

import { authService } from "./auth.service.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationEmailSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validation.js";

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

  async verifyEmail(req: Request, res: Response) {
    const validatedData = verifyEmailSchema.parse(req.query);

    const result = await authService.verifyEmail(validatedData);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
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

          <body style="font-family: Arial, sans-serif; background: #F4F8FF; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px;">
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
              background: #F4F8FF;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }

            .card {
              background: #FFFFFF;
              width: 100%;
              max-width: 420px;
              padding: 28px;
              border-radius: 18px;
              box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
            }

            .logo {
              width: 70px;
              height: 70px;
              border-radius: 35px;
              background: #2563EB;
              color: #FFFFFF;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 26px;
              font-weight: 800;
              margin: 0 auto 18px;
            }

            h2 {
              color: #0F172A;
              text-align: center;
              margin-bottom: 8px;
            }

            p {
              color: #64748B;
              text-align: center;
              line-height: 1.5;
            }

            label {
              display: block;
              margin-top: 14px;
              color: #0F172A;
              font-weight: 700;
              font-size: 14px;
            }

            input {
              width: 100%;
              padding: 13px;
              margin-top: 8px;
              border-radius: 12px;
              border: 1px solid #DDE7F3;
              font-size: 15px;
              box-sizing: border-box;
            }

            button {
              width: 100%;
              margin-top: 20px;
              padding: 14px;
              border: none;
              border-radius: 12px;
              background: #2563EB;
              color: #FFFFFF;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
            }

            button:disabled {
              opacity: 0.7;
              cursor: not-allowed;
            }

            .message {
              margin-top: 16px;
              font-weight: bold;
              text-align: center;
            }
          </style>
        </head>

        <body>
          <div class="card">
            <div class="logo">C+</div>

            <h2>Reset your CareMate+ password</h2>

            <p>Please enter your new password below.</p>

            <label for="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
            />

            <label for="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
            />

            <button id="resetButton" onclick="resetPassword()">
              Reset Password
            </button>

            <p id="message" class="message"></p>
          </div>

          <script>
            async function resetPassword() {
              const newPassword = document.getElementById("newPassword").value;
              const confirmPassword = document.getElementById("confirmPassword").value;
              const message = document.getElementById("message");
              const resetButton = document.getElementById("resetButton");

              message.innerText = "";

              if (!newPassword || !confirmPassword) {
                message.style.color = "#DC2626";
                message.innerText = "Please enter and confirm your new password.";
                return;
              }

              if (newPassword.length < 8) {
                message.style.color = "#DC2626";
                message.innerText = "Password must be at least 8 characters.";
                return;
              }

              if (newPassword !== confirmPassword) {
                message.style.color = "#DC2626";
                message.innerText = "Passwords do not match.";
                return;
              }

              try {
                resetButton.disabled = true;
                resetButton.innerText = "Resetting...";

                const response = await fetch("/api/v1/auth/reset-password", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    token: "${token}",
                    newPassword: newPassword,
                    confirmPassword: confirmPassword
                  })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                  throw new Error(data.message || "Password reset failed.");
                }

                message.style.color = "#16A34A";
                message.innerText =
                  "Password reset successfully. You can now login in the CareMate+ app.";

                document.getElementById("newPassword").value = "";
                document.getElementById("confirmPassword").value = "";
              } catch (error) {
                message.style.color = "#DC2626";
                message.innerText = error.message || "Something went wrong.";
              } finally {
                resetButton.disabled = false;
                resetButton.innerText = "Reset Password";
              }
            }
          </script>
        </body>
      </html>
    `);
  },

  async resetPassword(req: Request, res: Response) {
    const validatedData = resetPasswordSchema.parse(req.body);

    const result = await authService.resetPassword(validatedData);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  },
};