import { Router, urlencoded } from "express";

import { authController } from "./auth.controller.js";

const router = Router();

router.post("/register", authController.register);

router.post("/login", authController.login);

router.get("/verify-email", authController.verifyEmail);

router.post(
  "/resend-verification-email",
  authController.resendVerificationEmail
);

router.post("/forgot-password", authController.forgotPassword);

router.get("/reset-password", authController.renderResetPasswordPage);

router.post(
  "/reset-password",
  urlencoded({ extended: false }),
  authController.resetPassword
);

export default router;