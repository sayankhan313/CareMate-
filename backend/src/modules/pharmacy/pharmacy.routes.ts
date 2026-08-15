import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { pharmacyDashboardController } from "./pharmacy-dashboard.controller.js";
import { pharmacyExemptionController } from "./pharmacy-exemption.controller.js";
import { pharmacyOrdersController } from "./pharmacy-orders.controller.js";

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles("PHARMACY"));

router.get("/dashboard", pharmacyDashboardController.getDashboard);

router.get("/orders", pharmacyOrdersController.listOrders);
router.get("/orders/:orderId", pharmacyOrdersController.getOrderDetail);
router.patch("/orders/:orderId/status", pharmacyOrdersController.updateOrderStatus);

router.get("/exemption-reviews", pharmacyExemptionController.listReviews);
router.get("/exemption-reviews/:evidenceId", pharmacyExemptionController.getReview);
router.get("/exemption-reviews/:evidenceId/documents/:documentIndex", pharmacyExemptionController.getDocument);
router.patch("/exemption-reviews/:evidenceId/verify", pharmacyExemptionController.verify);
router.patch("/exemption-reviews/:evidenceId/reject", pharmacyExemptionController.reject);

export default router;