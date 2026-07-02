import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { medicineController } from "./medicine.controller.js";
import { vitalsController } from "./vitals.controller.js";

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles("PATIENT"));

router.post("/vitals/readings", vitalsController.createReading);

router.get("/vitals/latest", vitalsController.getLatestReading);

router.get("/vitals/history", vitalsController.getReadingHistory);

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

export default router;