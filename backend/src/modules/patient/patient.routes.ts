import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware.js";
import { uploadPatientPharmacyExemptionEvidence } from "../../middleware/exemption-upload.middleware.js";
import { uploadPatientRefillEvidence } from "../../middleware/refill-evidence-upload.middleware.js";
import { uploadSinglePatientReport } from "../../middleware/report-upload.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";

import { consultationController } from "./consultation.controller.js";
import { dashboardController } from "./dashboard.controller.js";
import { doctorAssignmentController } from "./doctor-assignment.controller.js";
import { medicineController } from "./medicine.controller.js";
import { medicinePackReferenceController } from "./medicine-pack-reference.controller.js";
import { medicineReferenceController } from "./medicine-reference.controller.js";
import { patientCaregiverController } from "./patient-caregiver.controller.js";
import { patientOrdersController } from "./patient-orders.controller.js";
import { patientPaymentController } from "./patient-payment.controller.js";
import { patientPrescriptionChargeController } from "./patient-prescription-charge.controller.js";
import { pharmacyLinkController } from "./pharmacy-link.controller.js";
import { pharmacyRefillController } from "./pharmacy-refill.controller.js";
import { profileController } from "./profile.controller.js";
import { reportController } from "./report.controller.js";
import { safetyController } from "./safety.controller.js";
import { settingsController } from "./settings.controller.js";
import { vitalsController } from "./vitals.controller.js";

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles("PATIENT"));

router.get("/dashboard", dashboardController.getDashboard);

router.get("/profile", profileController.getProfile);
router.patch("/profile", profileController.updateProfile);

router.get("/caregiver-links", patientCaregiverController.listRelationships);
router.patch("/caregiver-links/:relationshipId/approve", patientCaregiverController.approveRelationship);
router.patch("/caregiver-links/:relationshipId/reject", patientCaregiverController.rejectRelationship);
router.patch("/caregiver-links/:relationshipId/revoke", patientCaregiverController.revokeRelationship);

router.get("/prescription-charge", patientPrescriptionChargeController.getProfile);
router.patch("/prescription-charge", patientPrescriptionChargeController.updatePreference);
router.post("/prescription-charge/evidence", uploadPatientPharmacyExemptionEvidence, patientPrescriptionChargeController.submitEvidence);

router.get("/settings/notifications", settingsController.getNotificationPreferences);
router.patch("/settings/notifications", settingsController.updateNotificationPreferences);
router.get("/settings/reminders", settingsController.getReminderSettings);
router.patch("/settings/reminders", settingsController.updateReminderSettings);
router.get("/settings/safety", settingsController.getSafetySettings);
router.patch("/settings/safety", settingsController.updateSafetySettings);
router.get("/settings/accessibility", settingsController.getAccessibilitySettings);
router.patch("/settings/accessibility", settingsController.updateAccessibilitySettings);
router.get("/settings/privacy", settingsController.getPrivacySettings);
router.patch("/settings/privacy", settingsController.updatePrivacySettings);

router.get("/doctors/specialties", doctorAssignmentController.listDoctorSpecialties);
router.get("/doctors/:doctorId/availability/slots", consultationController.getDoctorAvailableSlots);
router.get("/doctors/:doctorId/availability", consultationController.getDoctorMonthlyAvailability);
router.get("/doctors", doctorAssignmentController.listApprovedDoctors);

router.get("/doctor-assignments", doctorAssignmentController.listAssignedDoctors);
router.post("/doctor-assignment", doctorAssignmentController.assignDoctor);
router.post("/doctor-assignments", doctorAssignmentController.assignDoctor);
router.patch("/doctor-assignments/:doctorId/primary", doctorAssignmentController.setPrimaryDoctor);
router.delete("/doctor-assignments/:doctorId", doctorAssignmentController.removeDoctor);

router.get("/pharmacies/saved", pharmacyLinkController.listSavedPharmacies);
router.get("/pharmacies", pharmacyLinkController.listApprovedPharmacies);
router.post("/pharmacies/:pharmacyId/save", pharmacyLinkController.savePharmacy);
router.patch("/pharmacies/:pharmacyId/primary", pharmacyLinkController.setPrimaryPharmacy);
router.delete("/pharmacies/:pharmacyId", pharmacyLinkController.removePharmacy);

router.get("/pharmacy-refills/active", pharmacyRefillController.listActiveRefillRequests);
router.post("/pharmacy-refills", uploadPatientRefillEvidence, pharmacyRefillController.createRefillRequest);

router.get("/pharmacy-orders", patientOrdersController.listOrders);
router.post("/pharmacy-orders/:orderId/payment-intent", patientPaymentController.createPaymentIntent);
router.post("/pharmacy-orders/:orderId/payment-confirm", patientPaymentController.confirmPayment);

router.post("/reports", uploadSinglePatientReport, reportController.createReport);
router.get("/reports", reportController.listReports);
router.get("/reports/:reportId/file", reportController.getReportFile);
router.post("/reports/:reportId/seen", reportController.markReportReviewsSeen);
router.get("/reports/:reportId", reportController.getReportDetail);

router.post("/vitals/readings", vitalsController.createReading);
router.get("/vitals/latest", vitalsController.getLatestReading);
router.get("/vitals/history", vitalsController.getReadingHistory);

router.post("/safety-alerts", safetyController.createSafetyAlert);
router.get("/safety-alerts/active", safetyController.getActiveSafetyAlert);
router.post("/safety-alerts/:alertId/cancel", safetyController.cancelSafetyAlert);
router.post("/safety-alerts/:alertId/escalate", safetyController.escalateSafetyAlert);

router.post("/consultations/manual", consultationController.createManualConsultation);
router.get("/consultations", consultationController.listConsultations);
router.post("/consultations/:consultationId/cancel", consultationController.cancelConsultation);
router.patch("/consultations/:consultationId/reschedule", consultationController.rescheduleConsultation);
router.get("/consultations/:consultationId/join", consultationController.getPatientJoinConfig);
router.get("/consultations/:consultationId", consultationController.getConsultationById);

router.post("/medicines", medicineController.createMedicine);
router.get("/medicines", medicineController.listMedicines);
router.get("/medicines/today", medicineController.getTodayMedicines);
router.get("/medicines/:medicineId", medicineController.getMedicineById);
router.patch("/medicines/:medicineId", medicineController.updateMedicine);
router.post("/medicines/:medicineId/deletion-review", medicineController.requestMedicineDeletion);

router.get("/medicine-reviews", medicineController.listMedicineReviews);
router.post("/medicine-reviews/:requestId/seen", medicineController.markMedicineReviewSeen);
router.post("/medicine-reviews/:requestId/apply", medicineController.applyApprovedMedicineReview);
router.post("/medicine-reviews/:requestId/resubmit", medicineController.resubmitMedicineReview);

router.post("/medicine-reminders/:reminderId/taken", medicineController.markReminderTaken);
router.post("/medicine-reminders/:reminderId/snooze", medicineController.snoozeReminder);

router.get("/medicine-pack-reference", medicinePackReferenceController.getPackReference);
router.get("/medicine-references/search", medicineReferenceController.searchMedicineReferences);
router.post("/medicine-scan/parse", medicineReferenceController.parseMedicineScan);
router.post("/medicine-scan/prescription/parse", medicineReferenceController.parsePrescriptionScan);

export default router;