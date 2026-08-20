import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { caregiverAppointmentController } from "./caregiver-appointment.controller.js";
import { caregiverConsultationController } from "./caregiver-consultation.controller.js";
import { caregiverDashboardController } from "./caregiver-dashboard.controller.js";
import { caregiverLowStockPromptController } from "./caregiver-low-stock-prompt.controller.js";
import { caregiverMedicationController } from "./caregiver-medication.controller.js";
import { caregiverObservationController } from "./caregiver-observation.controller.js";
import { caregiverPatientsController } from "./caregiver-patients.controller.js";
import { caregiverPharmacyOrderController } from "./caregiver-pharmacy-order.controller.js";
import { caregiverRelationshipController } from "./caregiver-relationship.controller.js";
import { caregiverReminderPromptController } from "./caregiver-reminder-prompt.controller.js";
import { caregiverSafetyEscalationController } from "./caregiver-safety-escalation.controller.js";
import { caregiverSafetyController } from "./caregiver-safety.controller.js";

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles("CAREGIVER"));

router.get("/dashboard", caregiverDashboardController.getDashboard);

router.post("/link-requests", caregiverRelationshipController.requestLink);

router.get("/patients", caregiverPatientsController.listLinkedPatients);
router.get("/patients/:patientId", caregiverPatientsController.getLinkedPatient);

router.get("/patients/:patientId/medications", caregiverMedicationController.getPatientMedicationSchedule);
router.post("/patients/:patientId/doses/:doseLogId/remind", caregiverReminderPromptController.sendReminderPrompt);
router.post("/patients/:patientId/medicines/:medicineId/low-stock-prompt", caregiverLowStockPromptController.sendLowStockPrompt);

router.get("/patients/:patientId/safety-alerts", caregiverSafetyController.listPatientSafetyAlerts);
router.get("/patients/:patientId/safety-alerts/:alertId", caregiverSafetyController.getPatientSafetyAlert);
router.get("/patients/:patientId/safety-alerts/:alertId/escalations", caregiverSafetyEscalationController.getEscalationHistory);
router.post("/patients/:patientId/safety-alerts/:alertId/try-another-doctor", caregiverSafetyEscalationController.tryAnotherDoctor);

router.get("/patients/:patientId/consultations", caregiverConsultationController.listPatientConsultations);
router.get("/patients/:patientId/consultations/:consultationId", caregiverConsultationController.getPatientConsultation);

router.get("/patients/:patientId/appointment-doctors", caregiverAppointmentController.listAssignedDoctors);
router.get("/patients/:patientId/appointment-doctors/:doctorId/availability", caregiverAppointmentController.getMonthlyAvailability);
router.get("/patients/:patientId/appointment-doctors/:doctorId/slots", caregiverAppointmentController.getAvailableSlots);
router.post("/patients/:patientId/appointment-requests", caregiverAppointmentController.createAppointmentRequest);

router.get("/patients/:patientId/pharmacy-orders", caregiverPharmacyOrderController.listPatientOrders);
router.get("/patients/:patientId/pharmacy-orders/:orderId", caregiverPharmacyOrderController.getPatientOrder);

router.get("/patients/:patientId/observations", caregiverObservationController.listPatientObservations);
router.post("/patients/:patientId/observations", caregiverObservationController.createObservation);
router.get("/patients/:patientId/observations/:observationId", caregiverObservationController.getObservation);

export default router;