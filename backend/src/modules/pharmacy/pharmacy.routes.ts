import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { pharmacyDashboardController } from "./pharmacy-dashboard.controller.js";
import { pharmacyExemptionController } from "./pharmacy-exemption.controller.js";
import { pharmacyInventoryController } from "./pharmacy-inventory.controller.js";
import { pharmacyInventoryMatchController } from "./pharmacy-inventory-match.controller.js";
import { pharmacyOrdersController } from "./pharmacy-orders.controller.js";

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles("PHARMACY"));

router.get("/dashboard", pharmacyDashboardController.getDashboard);

router.get("/orders", pharmacyOrdersController.listOrders);
router.get("/orders/:orderId/items/:orderItemId/inventory-candidates", pharmacyInventoryMatchController.getCandidates);
router.patch("/orders/:orderId/items/:orderItemId/inventory-match", pharmacyInventoryMatchController.confirmMatch);
router.delete("/orders/:orderId/items/:orderItemId/inventory-match", pharmacyInventoryMatchController.releaseMatch);
router.get("/orders/:orderId/refill-evidence", pharmacyOrdersController.getPatientRefillEvidence);
router.patch("/orders/:orderId/verify-patient-request", pharmacyOrdersController.verifyPatientRefill);
router.get("/orders/:orderId", pharmacyOrdersController.getOrderDetail);
router.patch("/orders/:orderId/status", pharmacyOrdersController.updateOrderStatus);

router.get("/exemption-reviews", pharmacyExemptionController.listReviews);
router.get("/exemption-reviews/:evidenceId", pharmacyExemptionController.getReview);
router.get("/exemption-reviews/:evidenceId/documents/:documentIndex", pharmacyExemptionController.getDocument);
router.patch("/exemption-reviews/:evidenceId/verify", pharmacyExemptionController.verify);
router.patch("/exemption-reviews/:evidenceId/reject", pharmacyExemptionController.reject);

router.get("/inventory/reference-price", pharmacyInventoryController.getReferencePrice);
router.get("/inventory", pharmacyInventoryController.listInventory);
router.post("/inventory", pharmacyInventoryController.createInventoryItem);
router.patch("/inventory/:itemId", pharmacyInventoryController.updateInventoryItem);
router.patch("/inventory/:itemId/archive", pharmacyInventoryController.archiveInventoryItem);
router.patch("/inventory/:itemId/restore", pharmacyInventoryController.restoreInventoryItem);

export default router;