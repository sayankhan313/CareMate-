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

router.get("/exemption-reviews", pharmacyController.listExemptionReviews);
router.get("/exemption-reviews/:evidenceId", pharmacyController.getExemptionReview);
router.get("/exemption-reviews/:evidenceId/documents/:documentIndex", pharmacyController.getExemptionDocument);
router.patch("/exemption-reviews/:evidenceId/verify", pharmacyController.verifyExemptionEvidence);
router.patch("/exemption-reviews/:evidenceId/reject", pharmacyController.rejectExemptionEvidence);

export default router;