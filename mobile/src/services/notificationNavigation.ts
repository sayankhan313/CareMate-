export type NotificationNavigationData = {
  type?: string | null;
  targetScreen?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown> | null;
};

const getText = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
const getDataText = (notification: NotificationNavigationData, key: string) => getText(notification.data?.[key]);

export const openNotificationTarget = (navigation: any, notification: NotificationNavigationData, fallbackToNotifications = true) => {
  const targetScreen = getText(notification.targetScreen) || getDataText(notification, "targetScreen");
  const type = getText(notification.type) || getDataText(notification, "type") || "";
  const entityType = getText(notification.entityType) || getDataText(notification, "entityType");
  const entityId = getText(notification.entityId) || getDataText(notification, "entityId");
  const recipientRole = getDataText(notification, "recipientRole");

  const patientId = getDataText(notification, "patientId");
  const patientName = getDataText(notification, "patientName") || "Patient";
  const medicineId = getDataText(notification, "medicineId");
  const submissionId = getDataText(notification, "submissionId") || (entityType === "PATIENT_PRESCRIPTION_SUBMISSION" ? entityId : undefined);
  const doseLogId = getDataText(notification, "doseLogId") || (entityType === "CAREGIVER_MEDICINE_DOSE_LOG" ? entityId : undefined);
  const alertId = getDataText(notification, "alertId") || (entityType === "SAFETY_ALERT" ? entityId : undefined);
  const orderId = getDataText(notification, "orderId") || (entityType === "MEDICINE_ORDER" ? entityId : undefined);
  const evidenceId = getDataText(notification, "evidenceId") || (entityType === "PHARMACY_EXEMPTION_EVIDENCE" ? entityId : undefined);
  const reportId = getDataText(notification, "reportId") || (entityType === "PATIENT_REPORT" ? entityId : undefined);
  const auditLogId = getDataText(notification, "auditLogId") || (entityType === "AUDIT_LOG" ? entityId : undefined);
  const doctorId = getDataText(notification, "doctorId") || (entityType === "DOCTOR_VERIFICATION" ? entityId : undefined);
  const pharmacyId = getDataText(notification, "pharmacyId") || (entityType === "PHARMACY_VERIFICATION" ? entityId : undefined);
  const medicineReviewRequestId = getDataText(notification, "requestId") || (entityType === "MEDICINE_REVIEW_REQUEST" ? entityId : undefined);

  const openCaregiverMedicine = () => {
    if (!patientId) return navigation.navigate("CaregiverTabs", { screen: "Patients" });
    return navigation.navigate("CaregiverMedications", { patientId, patientName, medicineId, doseLogId });
  };

  const openCaregiverSafety = () => {
    if (patientId && alertId) return navigation.navigate("CaregiverSafetyAlertDetail", { patientId, patientName, alertId });
    return navigation.navigate("CaregiverTabs", { screen: "Safety" });
  };

  const openCaregiverPharmacyOrder = () => {
    if (patientId && orderId) return navigation.navigate("CaregiverPharmacyOrderDetail", { patientId, patientName, orderId });
    if (patientId) return navigation.navigate("CaregiverPharmacyOrders", { patientId, patientName });
    return navigation.navigate("CaregiverTabs", { screen: "Home" });
  };

  const openCaregiverPatient = () => {
    if (patientId) return navigation.navigate("CaregiverPatientDetail", { patientId, patientName });
    return navigation.navigate("CaregiverTabs", { screen: "Patients" });
  };

  const openDoctorRefillVerification = () => {
    if (submissionId) return navigation.navigate("DoctorRefillVerificationDetail", { submissionId });
    return navigation.navigate("DoctorRefillVerifications");
  };

  const openDoctorPoolReview = () => {
    if (medicineReviewRequestId) return navigation.navigate("DoctorMedicineReviewPoolDetail", { requestId: medicineReviewRequestId });
    return navigation.navigate("DoctorMedicineReviewPool");
  };

  const openAdminMedicineReviews = () => navigation.navigate("AdminMedicineReviewRequests");
  const openPatientOrders = () => navigation.navigate("PatientTabs", { screen: "PatientOrders" });

  if (targetScreen === "Notifications") return fallbackToNotifications ? navigation.navigate("Notifications") : undefined;

  if (targetScreen === "PatientCaregiverAccess") return navigation.navigate("PatientCaregiverAccess");
  if (targetScreen === "CaregiverPatientDetail") return openCaregiverPatient();
  if (targetScreen === "CaregiverMedications" || targetScreen === "CaregiverPatientMedications") return openCaregiverMedicine();
  if (targetScreen === "CaregiverPatientSafety" || targetScreen === "CaregiverSafety") return openCaregiverSafety();
  if (targetScreen === "CaregiverConsultations" || targetScreen === "CaregiverAppointments") return navigation.navigate("CaregiverTabs", { screen: "Appointments" });
  if (targetScreen === "CaregiverPatients") return navigation.navigate("CaregiverTabs", { screen: "Patients" });
  if (targetScreen === "CaregiverDashboard") return navigation.navigate("CaregiverTabs", { screen: "Home" });
  if (targetScreen === "CaregiverPharmacyOrders" || targetScreen === "CaregiverPharmacyOrderDetail") return openCaregiverPharmacyOrder();

  if (
    ["REFILL_DOCTOR_VERIFICATION_CONFIRMED", "REFILL_DOCTOR_VERIFICATION_REJECTED"].includes(type) &&
    (recipientRole === "PATIENT" || entityType === "PATIENT_PRESCRIPTION_SUBMISSION" || targetScreen === "MedicineStock" || targetScreen === "PatientOrders")
  ) {
    return openPatientOrders();
  }

  if (targetScreen === "MedicineStock") return openPatientOrders();

  if (targetScreen === "PharmacyDashboard") {
    if (orderId) return navigation.navigate("PharmacyOrderDetail", { orderId });
    return navigation.navigate("PharmacyTabs", { screen: "Home" });
  }

  if (targetScreen === "PharmacyInventory") return navigation.navigate("PharmacyTabs", { screen: "Inventory" });
  if (targetScreen === "PharmacyOrders") return navigation.navigate("PharmacyTabs", { screen: "Orders" });
  if (targetScreen === "PharmacyOrderDetail" && orderId) return navigation.navigate("PharmacyOrderDetail", { orderId });
  if (targetScreen === "PharmacyExemptionReviews") return navigation.navigate("PharmacyTabs", { screen: "Reviews" });
  if (targetScreen === "PharmacyExemptionReview" && evidenceId) return navigation.navigate("PharmacyExemptionReview", { evidenceId });

  if (targetScreen === "MedicineUpdates") return navigation.navigate("MedicineUpdates");
  if (targetScreen === "PatientReports") return navigation.navigate("PatientReports");
  if (targetScreen === "PatientActiveCalls") return navigation.navigate("PatientActiveCalls");
  if (targetScreen === "PatientProfile") return navigation.navigate("PatientProfile");

  if (targetScreen === "DoctorRefillVerifications") return navigation.navigate("DoctorRefillVerifications");
  if (targetScreen === "DoctorRefillVerificationDetail") return openDoctorRefillVerification();

  if (targetScreen === "DoctorMedicineReviewPool") return navigation.navigate("DoctorMedicineReviewPool");
  if (targetScreen === "DoctorMedicineReviewPoolDetail") return openDoctorPoolReview();

  if (targetScreen === "DoctorReportReviews") return navigation.navigate("DoctorReportReviews");
  if (targetScreen === "DoctorPatientReports" && patientId) return navigation.navigate("DoctorPatientReports", { patientId, patientName });
  if (targetScreen === "DoctorReportReview" && patientId && reportId) return navigation.navigate("DoctorReportReview", { patientId, patientName, reportId });
  if (targetScreen === "DoctorPatientDetail" && patientId) return navigation.navigate("DoctorPatientDetail", { patientId, patientName });

  if (targetScreen === "AdminMedicineReviewRequests") return openAdminMedicineReviews();
  if (targetScreen === "AdminDoctorVerificationDetail" && doctorId) return navigation.navigate("AdminDoctorVerificationDetail", { doctorId });
  if (targetScreen === "AdminPharmacyVerificationDetail" && pharmacyId) return navigation.navigate("AdminPharmacyVerificationDetail", { pharmacyId });
  if (targetScreen === "AdminAuditLogDetail" && auditLogId) return navigation.navigate("AdminAuditLogDetail", { auditLogId });

  if (targetScreen === "DoctorAlerts" || targetScreen === "Alerts") return navigation.navigate("DoctorTabs", { screen: "Alerts" });
  if (targetScreen === "DoctorConsultations") return navigation.navigate("DoctorTabs", { screen: "Consultations" });
  if (targetScreen === "DoctorMedicineReviews" || targetScreen === "Reviews") return navigation.navigate("DoctorTabs", { screen: "Reviews" });
  if (targetScreen === "DoctorPatients" || targetScreen === "Patients") return navigation.navigate("DoctorTabs", { screen: "Patients" });

  if (targetScreen === "PatientMedicines" || targetScreen === "Medicines") return navigation.navigate("PatientTabs", { screen: "Medicines" });
  if (targetScreen === "PatientConsultations" || targetScreen === "Consultations") return navigation.navigate("PatientTabs", { screen: "Consultations" });
  if (targetScreen === "PatientVitals" || targetScreen === "Vitals") return navigation.navigate("PatientTabs", { screen: "Vitals" });
  if (targetScreen === "PatientOrders") return openPatientOrders();

  if (targetScreen === "AdminDoctors") return navigation.navigate("AdminTabs", { screen: "Doctors", params: { status: "PENDING_VERIFICATION" } });
  if (targetScreen === "AdminPharmacies") return navigation.navigate("AdminTabs", { screen: "Pharmacies", params: { status: "PENDING_VERIFICATION" } });
  if (targetScreen === "AdminUsers") return navigation.navigate("AdminTabs", { screen: "Users", params: { status: "ALL" } });

  if (recipientRole === "CAREGIVER") {
    if (type === "CAREGIVER_LINK_APPROVED") return openCaregiverPatient();
    if (type === "CAREGIVER_LINK_REJECTED" || type === "CAREGIVER_LINK_REVOKED") return navigation.navigate("CaregiverTabs", { screen: "Patients" });

    if (["MEDICINE_REMINDER_DUE", "MEDICINE_REMINDER_SNOOZED", "MISSED_DOSE_ALERT", "REPEATED_MISSED_DOSE"].includes(type)) return openCaregiverMedicine();

    if (["SAFETY_ALERT_CREATED", "SAFETY_ALERT_ESCALATED", "SAFETY_ALERT_RESOLVED", "CRITICAL_VITAL_DETECTED"].includes(type)) return openCaregiverSafety();

    if (["EMERGENCY_CONSULTATION_REQUESTED", "MANUAL_CONSULTATION_REQUESTED", "CONSULTATION_ACCEPTED", "CONSULTATION_REJECTED", "CONSULTATION_COMPLETED", "CONSULTATION_CANCELLED"].includes(type)) {
      return navigation.navigate("CaregiverTabs", { screen: "Appointments" });
    }

    if (["ORDER_RECEIVED", "ORDER_ACCEPTED", "ORDER_REJECTED", "ORDER_PREPARING", "ORDER_READY", "ORDER_OUT_FOR_DELIVERY", "ORDER_DELIVERED", "ORDER_COLLECTED", "ORDER_DELAYED", "ORDER_OUT_OF_STOCK", "ORDER_CANCELLED", "PHARMACY_PAYMENT_RECEIVED"].includes(type)) {
      return openCaregiverPharmacyOrder();
    }

    return navigation.navigate("CaregiverTabs", { screen: "Home" });
  }

  if (
    recipientRole === "ADMIN" &&
    ["MEDICINE_REVIEW_ADMIN_ESCALATION", "MEDICINE_REVIEW_POOL_RESULT"].includes(entityType || "")
  ) {
    return openAdminMedicineReviews();
  }

  if (
    ["MEDICINE_REVIEW_ADMIN_ESCALATION", "MEDICINE_REVIEW_POOL_RESULT"].includes(entityType || "")
  ) {
    return openAdminMedicineReviews();
  }

  if (type === "REFILL_DOCTOR_VERIFICATION_REQUESTED") return openDoctorRefillVerification();

  if (type === "MEDICINE_REVIEW_POOL_ASSIGNED") return openDoctorPoolReview();

  if (type === "CAREGIVER_LINK_REQUESTED") return navigation.navigate("PatientCaregiverAccess");

  if (type === "NEW_MEDICINE_ORDER") {
    return orderId ? navigation.navigate("PharmacyOrderDetail", { orderId }) : navigation.navigate("PharmacyTabs", { screen: "Orders" });
  }

  if (["REFILL_DOCTOR_VERIFICATION_CONFIRMED", "REFILL_DOCTOR_VERIFICATION_REJECTED"].includes(type)) {
    if (recipientRole === "PATIENT" || entityType === "PATIENT_PRESCRIPTION_SUBMISSION") return openPatientOrders();
    return orderId ? navigation.navigate("PharmacyOrderDetail", { orderId }) : navigation.navigate("PharmacyTabs", { screen: "Orders" });
  }

  if (type === "PHARMACY_PAYMENT_RECEIVED") {
    return orderId ? navigation.navigate("PharmacyOrderDetail", { orderId }) : navigation.navigate("PharmacyTabs", { screen: "Orders" });
  }

  if (["SAFETY_ALERT_CREATED", "SAFETY_ALERT_ESCALATED", "SAFETY_ALERT_RESOLVED"].includes(type)) return navigation.navigate("DoctorTabs", { screen: "Alerts" });
  if (type === "CRITICAL_VITAL_DETECTED") return navigation.navigate("PatientTabs", { screen: "Vitals" });

  if (["EMERGENCY_CONSULTATION_REQUESTED", "MANUAL_CONSULTATION_REQUESTED", "PATIENT_JOINED_CALL"].includes(type)) {
    return navigation.navigate("DoctorTabs", { screen: "Consultations" });
  }

  if (["CONSULTATION_ACCEPTED", "CONSULTATION_REJECTED", "CONSULTATION_COMPLETED", "CONSULTATION_CANCELLED"].includes(type)) {
    return navigation.navigate("PatientTabs", { screen: "Consultations" });
  }

  if (type === "MEDICINE_REVIEW_REQUESTED") return navigation.navigate("DoctorTabs", { screen: "Reviews" });
  if (["MEDICINE_REVIEW_APPROVED", "MEDICINE_REVIEW_REJECTED"].includes(type)) return navigation.navigate("MedicineUpdates");

  if (["NEW_PRESCRIPTION", "MEDICINE_REMINDER_DUE", "MEDICINE_REMINDER_SNOOZED", "MISSED_DOSE_ALERT", "REPEATED_MISSED_DOSE"].includes(type)) {
    return navigation.navigate("PatientTabs", { screen: "Medicines" });
  }

  if (type === "PATIENT_REPORT_UPLOADED") return navigation.navigate("DoctorReportReviews");
  if (type === "REPORT_REVIEWED") return navigation.navigate("PatientReports");
  if (["PATIENT_ASSIGNED", "PATIENT_UNASSIGNED"].includes(type)) return navigation.navigate("DoctorTabs", { screen: "Patients" });
  if (type === "PRIMARY_DOCTOR_CHANGED") return navigation.navigate("PatientProfile");

  if (["ORDER_RECEIVED", "ORDER_ACCEPTED", "ORDER_REJECTED", "ORDER_PREPARING", "ORDER_READY", "ORDER_OUT_FOR_DELIVERY", "ORDER_DELIVERED", "ORDER_COLLECTED", "ORDER_DELAYED", "ORDER_OUT_OF_STOCK", "ORDER_CANCELLED"].includes(type)) {
    return openPatientOrders();
  }

  if (type === "DOCTOR_VERIFICATION_REQUESTED") return navigation.navigate("AdminTabs", { screen: "Doctors", params: { status: "PENDING_VERIFICATION" } });
  if (type === "PHARMACY_VERIFICATION_REQUESTED") return navigation.navigate("AdminTabs", { screen: "Pharmacies", params: { status: "PENDING_VERIFICATION" } });

  return fallbackToNotifications ? navigation.navigate("Notifications") : undefined;
};