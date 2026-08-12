import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import patientRoutes from "../modules/patient/patient.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import doctorRoutes from "../modules/doctor/doctor.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import notificationRoutes from "../modules/notification/notification.routes.js";
import pharmacyRoutes from "../modules/pharmacy/pharmacy.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/patient", patientRoutes);
router.use("/users", userRoutes);
router.use("/doctor", doctorRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);
router.use("/pharmacy", pharmacyRoutes);

export default router;