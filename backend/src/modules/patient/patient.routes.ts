import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";

import { consultationController } from "./consultation.controller.js";
import { dashboardController } from "./dashboard.controller.js";
import { medicineController } from "./medicine.controller.js";
import { safetyController } from "./safety.controller.js";
import { vitalsController } from "./vitals.controller.js";
import { medicineReferenceController } from "./medicine-reference.controller.js";
import { profileController } from "./profile.controller.js";
const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles("PATIENT"));

router.get("/dashboard", dashboardController.getDashboard);

router.get("/profile", profileController.getProfile);

router.post("/vitals/readings", vitalsController.createReading);

router.get("/vitals/latest", vitalsController.getLatestReading);

router.get("/vitals/history", vitalsController.getReadingHistory);

router.post("/safety-alerts", safetyController.createSafetyAlert);

router.get("/safety-alerts/active", safetyController.getActiveSafetyAlert);

router.post("/safety-alerts/:alertId/cancel", safetyController.cancelSafetyAlert);

router.post(
  "/safety-alerts/:alertId/escalate",
  safetyController.escalateSafetyAlert
);

router.post(
  "/consultations/manual",
  consultationController.createManualConsultation
);

router.get("/consultations", consultationController.listConsultations);

router.get(
  "/consultations/:consultationId",
  consultationController.getConsultationById
);

router.get(
  "/consultations/:consultationId/join",
  consultationController.getPatientJoinConfig
);

router.post("/medicines", medicineController.createMedicine);

router.get("/medicines", medicineController.listMedicines);

router.get("/medicines/today", medicineController.getTodayMedicines);

router.get("/medicines/:medicineId", medicineController.getMedicineById);

router.patch("/medicines/:medicineId", medicineController.updateMedicine);

router.delete("/medicines/:medicineId", medicineController.deleteMedicine);

router.post(
  "/medicine-reminders/:reminderId/taken",
  medicineController.markReminderTaken
);

router.post(
  "/medicine-reminders/:reminderId/snooze",
  medicineController.snoozeReminder
);
router.get(
  "/medicine-references/search",
  medicineReferenceController.searchMedicineReferences
);

router.post(
  "/medicine-scan/parse",
  medicineReferenceController.parseMedicineScan
);

router.post(
  "/medicine-scan/prescription/parse",
  medicineReferenceController.parsePrescriptionScan
);
export default router;