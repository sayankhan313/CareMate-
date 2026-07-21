import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { doctorController } from "./doctor.controller.js";
import { doctorPatientsController } from "./doctor-patients.controller.js";

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles("DOCTOR"));

router.get("/dashboard", doctorController.getDashboard);

router.get("/patients", doctorPatientsController.listAssignedPatients);
router.get("/patients/:patientId", doctorPatientsController.getPatientDetail);

export default router;