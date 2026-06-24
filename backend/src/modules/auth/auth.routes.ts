import { Router } from "express";
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

router.post("/reset-password", authController.resetPassword);

export default router;