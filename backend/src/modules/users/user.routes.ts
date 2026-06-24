import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware.js";
import { userController } from "./user.controller.js";

const router = Router();

router.get("/me", authMiddleware, userController.getCurrentUser);

export default router;