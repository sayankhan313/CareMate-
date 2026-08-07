import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware.js";
import { prescriptionImageUpload } from "../../middleware/prescription-upload.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { doctorAlertsController } from "./doctor-alerts.controller.js";
import { doctorConsultationsController } from "./doctor-consultations.controller.js";
import { doctorController } from "./doctor.controller.js";
import { doctorMedicineReviewsController } from "./doctor-medicine-reviews.controller.js";
import { doctorNotesController } from "./doctor-notes.controller.js";
import { doctorPatientsController } from "./doctor-patients.controller.js";
import { doctorPrescriptionsController } from "./doctor-prescriptions.controller.js";
import { doctorReportsController } from "./doctor-reports.controller.js";

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles("DOCTOR"));

router.get("/dashboard", doctorController.getDashboard);

router.get("/availability", doctorController.getAvailability);
router.put("/availability/month", doctorController.saveMonthlyAvailability);
router.patch("/availability/status", doctorController.updateOperationalStatus);
router.delete("/availability/:availabilityId", doctorController.deleteAvailability);

router.get("/alerts", doctorAlertsController.listAlerts);
router.get("/alerts/:alertId", doctorAlertsController.getAlertDetail);
router.post("/alerts/:alertId/resolve", doctorAlertsController.resolveAlert);

router.get("/medicine-reviews", doctorMedicineReviewsController.listReviews);
router.get("/medicine-reviews/:requestId", doctorMedicineReviewsController.getReviewDetail);
router.post("/medicine-reviews/:requestId/approve", doctorMedicineReviewsController.approveReview);
router.post("/medicine-reviews/:requestId/reject", doctorMedicineReviewsController.rejectReview);

router.get("/reports", doctorReportsController.listReportQueue);

router.post("/prescription-scan/parse", doctorPrescriptionsController.parsePrescriptionScan);

router.post(
  "/patients/:patientId/prescriptions",
  prescriptionImageUpload.single("prescriptionImage"),
  doctorPrescriptionsController.createPrescription,
);

router.get("/patients/:patientId/prescriptions", doctorPrescriptionsController.listPatientPrescriptions);
router.get("/prescriptions/:prescriptionId", doctorPrescriptionsController.getPrescriptionDetail);

router.get("/consultations", doctorConsultationsController.listConsultations);
router.get("/consultations/:consultationId", doctorConsultationsController.getConsultationDetail);
router.post("/consultations/:consultationId/accept", doctorConsultationsController.acceptConsultation);
router.post("/consultations/:consultationId/reject", doctorConsultationsController.rejectConsultation);
router.post("/consultations/:consultationId/complete", doctorConsultationsController.completeConsultation);
router.get("/consultations/:consultationId/join", doctorConsultationsController.getDoctorJoinConfig);

router.get("/patients", doctorPatientsController.listAssignedPatients);

router.get("/patients/:patientId/reports", doctorReportsController.listPatientReports);
router.get("/patients/:patientId/reports/:reportId/file", doctorReportsController.getReportFile);
router.get("/patients/:patientId/reports/:reportId", doctorReportsController.getReportDetail);
router.post("/patients/:patientId/reports/:reportId/review", doctorReportsController.reviewReport);

router.get("/patients/:patientId/notes", doctorNotesController.listNotes);
router.post("/patients/:patientId/notes", doctorNotesController.createNote);

router.get("/patients/:patientId", doctorPatientsController.getPatientDetail);

export default router;