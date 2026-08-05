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
  const entityId = getText(notification.entityId) || getDataText(notification, "entityId");
  const patientId = getDataText(notification, "patientId");
  const patientName = getDataText(notification, "patientName") || "Patient";
  const reportId = getDataText(notification, "reportId") || (notification.entityType === "PATIENT_REPORT" ? entityId : undefined);
  const auditLogId = getDataText(notification, "auditLogId") || (notification.entityType === "AUDIT_LOG" ? entityId : undefined);
  const doctorId = getDataText(notification, "doctorId") || (notification.entityType === "DOCTOR_VERIFICATION" ? entityId : undefined);
  const pharmacyId = getDataText(notification, "pharmacyId") || (notification.entityType === "PHARMACY_VERIFICATION" ? entityId : undefined);

  if (targetScreen === "Notifications") return fallbackToNotifications ? navigation.navigate("Notifications") : undefined;
  if (targetScreen === "MedicineUpdates") return navigation.navigate("MedicineUpdates");
  if (targetScreen === "PatientReports") return navigation.navigate("PatientReports");
  if (targetScreen === "PatientActiveCalls") return navigation.navigate("PatientActiveCalls");
  if (targetScreen === "PatientProfile") return navigation.navigate("PatientProfile");
  if (targetScreen === "DoctorReportReviews") return navigation.navigate("DoctorReportReviews");
  if (targetScreen === "DoctorPatientReports" && patientId) return navigation.navigate("DoctorPatientReports", { patientId, patientName });
  if (targetScreen === "DoctorReportReview" && patientId && reportId) return navigation.navigate("DoctorReportReview", { patientId, patientName, reportId });
  if (targetScreen === "DoctorPatientDetail" && patientId) return navigation.navigate("DoctorPatientDetail", { patientId, patientName });
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
  if (targetScreen === "PatientOrders") return navigation.navigate("PatientTabs", { screen: "PatientOrders" });
  if (targetScreen === "AdminDoctors") return navigation.navigate("AdminTabs", { screen: "Doctors", params: { status: "PENDING_VERIFICATION" } });
  if (targetScreen === "AdminPharmacies") return navigation.navigate("AdminTabs", { screen: "Pharmacies", params: { status: "PENDING_VERIFICATION" } });
  if (targetScreen === "AdminUsers") return navigation.navigate("AdminTabs", { screen: "Users", params: { status: "ALL" } });

  if (["SAFETY_ALERT_CREATED", "SAFETY_ALERT_ESCALATED", "SAFETY_ALERT_RESOLVED"].includes(type)) return navigation.navigate("DoctorTabs", { screen: "Alerts" });
  if (type === "CRITICAL_VITAL_DETECTED") return navigation.navigate("PatientTabs", { screen: "Vitals" });
  if (["EMERGENCY_CONSULTATION_REQUESTED", "MANUAL_CONSULTATION_REQUESTED", "PATIENT_JOINED_CALL"].includes(type)) return navigation.navigate("DoctorTabs", { screen: "Consultations" });
  if (["CONSULTATION_ACCEPTED", "CONSULTATION_REJECTED", "CONSULTATION_COMPLETED", "CONSULTATION_CANCELLED"].includes(type)) return navigation.navigate("PatientTabs", { screen: "Consultations" });
  if (type === "MEDICINE_REVIEW_REQUESTED") return navigation.navigate("DoctorTabs", { screen: "Reviews" });
  if (["MEDICINE_REVIEW_APPROVED", "MEDICINE_REVIEW_REJECTED"].includes(type)) return navigation.navigate("MedicineUpdates");
  if (["NEW_PRESCRIPTION", "MEDICINE_REMINDER_DUE", "MEDICINE_REMINDER_SNOOZED", "MISSED_DOSE_ALERT", "REPEATED_MISSED_DOSE"].includes(type)) return navigation.navigate("PatientTabs", { screen: "Medicines" });
  if (type === "PATIENT_REPORT_UPLOADED") return navigation.navigate("DoctorReportReviews");
  if (type === "REPORT_REVIEWED") return navigation.navigate("PatientReports");
  if (["PATIENT_ASSIGNED", "PATIENT_UNASSIGNED"].includes(type)) return navigation.navigate("DoctorTabs", { screen: "Patients" });
  if (type === "PRIMARY_DOCTOR_CHANGED") return navigation.navigate("PatientProfile");
  if (["NEW_MEDICINE_ORDER", "ORDER_RECEIVED", "ORDER_PREPARING", "ORDER_READY", "ORDER_DELIVERED", "ORDER_CANCELLED"].includes(type)) return navigation.navigate("PatientTabs", { screen: "PatientOrders" });
  if (type === "DOCTOR_VERIFICATION_REQUESTED") return navigation.navigate("AdminTabs", { screen: "Doctors", params: { status: "PENDING_VERIFICATION" } });
  if (type === "PHARMACY_VERIFICATION_REQUESTED") return navigation.navigate("AdminTabs", { screen: "Pharmacies", params: { status: "PENDING_VERIFICATION" } });

  return fallbackToNotifications ? navigation.navigate("Notifications") : undefined;
};