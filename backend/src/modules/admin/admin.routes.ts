import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { adminAuditController } from "../audit/admin-audit.controller.js";
import { adminController } from "./admin.controller.js";

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles("ADMIN"));

router.get("/dashboard", adminController.getDashboard);

router.get("/medicine-review-escalations", adminController.listMedicineReviewEscalations);
router.get("/medicine-review-escalations/:requestId", adminController.getMedicineReviewEscalation);
router.patch("/medicine-review-escalations/:requestId/assign", adminController.assignMedicineReviewEscalation);

router.get("/medicine-review-pool/assigned", adminController.listMedicineReviewPoolAssignments);
router.get("/medicine-review-pool/completed", adminController.listCompletedMedicineReviewPoolReviews);
router.patch("/medicine-review-pool/:requestId/release", adminController.releaseMedicineReviewPoolResult);

router.get("/audit-logs", adminAuditController.listAuditLogs);
router.get("/audit-logs/:auditLogId", adminAuditController.getAuditLogDetail);

router.get("/users", adminController.listUsers);
router.patch("/users/:userId/suspend", adminController.suspendUser);
router.patch("/users/:userId/reactivate", adminController.reactivateUser);

router.get("/verifications/doctors", adminController.listDoctorVerifications);
router.get("/verifications/doctors/:userId", adminController.getDoctorVerification);
router.patch("/verifications/doctors/:userId/approve", adminController.approveDoctorVerification);
router.patch("/verifications/doctors/:userId/reject", adminController.rejectDoctorVerification);

router.get("/verifications/pharmacies", adminController.listPharmacyVerifications);
router.get("/verifications/pharmacies/:userId", adminController.getPharmacyVerification);
router.patch("/verifications/pharmacies/:userId/approve", adminController.approvePharmacyVerification);
router.patch("/verifications/pharmacies/:userId/reject", adminController.rejectPharmacyVerification);

export default router;