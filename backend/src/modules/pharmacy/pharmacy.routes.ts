import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { pharmacyController } from "./pharmacy.controller.js";

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles("PHARMACY"));

router.get("/dashboard", pharmacyController.getDashboard);
router.get("/orders", pharmacyController.listOrders);
router.get("/orders/:orderId", pharmacyController.getOrderDetail);

export default router;