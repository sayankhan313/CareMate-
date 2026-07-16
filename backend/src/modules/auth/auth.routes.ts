import { Router, urlencoded } from "express";

import { authController } from "./auth.controller.js";
import { doctorAuthController } from "./doctor-auth.controller.js";
import { doctorVerificationUpload } from "../../middleware/upload.middleware.js";

const router = Router();

router.post("/register", authController.register);

router.post(
  "/register/doctor",
  doctorVerificationUpload.fields([
    {
      name: "gmcDocument",
      maxCount: 1,
    },
    {
      name: "photoIdDocument",
      maxCount: 1,
    },
    {
      name: "qualificationDocument",
      maxCount: 1,
    },
  ]),
  doctorAuthController.registerDoctor
);

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