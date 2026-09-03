import type { NavigatorScreenParams } from "@react-navigation/native";

import type { MeetingConfig } from "../services/safetyApi";
import type { VitalReading } from "./vitals";

export type PatientTabParamList = {
  Home: { user?: any } | undefined;
  Medicines: undefined;
  Vitals: undefined;
  Consultations: undefined;
  PatientOrders: undefined;
};

export type DoctorTabParamList = {
  Home: { user?: any } | undefined;
  Consultations: undefined;
  Alerts: undefined;
  Patients: undefined;
  Reviews: undefined;
};

export type CaregiverTabParamList = {
  Home: { user?: any } | undefined;
  Patients: undefined;
  Safety: undefined;
  Appointments: undefined;
};

export type AdminAccountStatus = "PENDING_VERIFICATION" | "ACTIVE" | "APPROVED" | "REJECTED" | "DISABLED";
export type AdminUserStatusFilter = AdminAccountStatus | "ALL";

export type AdminTabParamList = {
  Dashboard: { user?: any } | undefined;
  Doctors: { status?: AdminAccountStatus } | undefined;
  Pharmacies: { status?: AdminAccountStatus } | undefined;
  Users: { status?: AdminUserStatusFilter } | undefined;
};

export type MedicineFrequency = "ONCE_DAILY" | "TWICE_DAILY" | "THREE_TIMES_DAILY" | "FOUR_TIMES_DAILY" | "AS_NEEDED" | "CUSTOM";
export type MedicineFlowMode = "CREATE" | "EDIT_DRAFT" | "RESUBMIT_REVIEW";

export type MedicineDraft = {
  name: string;
  dose: string;
  doseQuantity?: number;
  doseUnit?: string;
  instructions?: string;
  frequency: MedicineFrequency;
  customFrequency?: string;
  timeOfDay: string;
  selectedTimes?: string[];
  startDate: string;
  endDate?: string;
  prescriptionPattern?: string | null;
  sendToDoctorForReview: boolean;
  hasMedicineOnHand?: boolean;
  currentStock?: number;
  stockUnit?: string;
  lowStockThreshold?: number;
  packageQuantity?: number;
  packSize?: number;
  packageUnit?: string;
};

export type ScanMedicineSource = "DEMO" | "CAMERA" | "GALLERY";
export type ConsultationParticipantRole = "PATIENT" | "DOCTOR";
export type ConsultationEndedBy = "PATIENT" | "DOCTOR";
export type ConsultationCompletionStatus = "COMPLETED" | "LEFT";

export type PharmacyOrderSource = "DOCTOR_PRESCRIPTION" | "PATIENT_SUBMISSION" | "REFILL_REQUEST" | "MANUAL_REQUEST";
export type PharmacyExemptionStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type PharmacyTabParamList = {
  Home: { user?: any } | undefined;
  Orders: { source?: PharmacyOrderSource; title?: string } | undefined;
  Inventory: undefined;
  Reviews: { status?: PharmacyExemptionStatus } | undefined;
  Notifications: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  RoleSelection: undefined;
  PatientSignup: undefined;
  DoctorSignup: undefined;
  PharmacySignup: undefined;
  CaregiverSignup: undefined;

  EmailVerification: { email?: string };
  ForgotPassword: undefined;

  DoctorPendingApproval: { user?: any; email?: string } | undefined;
  PharmacyPendingApproval: { user?: any; email?: string } | undefined;

  PatientTabs: (NavigatorScreenParams<PatientTabParamList> & { user?: any }) | undefined;
  DoctorTabs: (NavigatorScreenParams<DoctorTabParamList> & { user?: any }) | undefined;
  CaregiverTabs: (NavigatorScreenParams<CaregiverTabParamList> & { user?: any }) | undefined;
  AdminTabs: (NavigatorScreenParams<AdminTabParamList> & { user?: any }) | undefined;
  PharmacyTabs: (NavigatorScreenParams<PharmacyTabParamList> & { user?: any }) | undefined;

  CaregiverProfile: { user?: { id?: string; fullName?: string; email?: string } } | undefined;
  CaregiverPatientDetail: { patientId: string; patientName?: string };
  CaregiverMedications: { patientId: string; patientName?: string; medicineId?: string; doseLogId?: string };
  CaregiverSafetyAlertDetail: { patientId: string; patientName?: string; alertId: string };
  CaregiverPharmacyOrders: { patientId: string; patientName?: string };
  CaregiverPharmacyOrderDetail: { patientId: string; patientName?: string; orderId: string };
  CaregiverObservations: { patientId: string; patientName?: string };

  PharmacyProfile: undefined;
  PharmacyInventory: undefined;
  PharmacyOrders: { source?: PharmacyOrderSource; title?: string } | undefined;
  PharmacyOrderDetail: { orderId: string };
  PharmacyExemptionReviews: { status?: PharmacyExemptionStatus } | undefined;
  PharmacyExemptionReview: { evidenceId: string };

  Notifications: undefined;

  DoctorProfile: undefined;
  AdminProfile: undefined;
  AdminDashboard: undefined;
  AdminMedicineReviewRequests: undefined;

  AdminDoctorVerificationDetail: { doctorId: string };
  AdminPharmacyVerificationDetail: { pharmacyId: string };
  AdminAuditLogs: undefined;
  AdminAuditLogDetail: { auditLogId: string };
  AdminRegisterWebView: { title: string; url: string; helperText?: string };

  PatientProfile: { user?: any } | undefined;
  PatientCareDiary: undefined;
  PatientCaregiverAccess: undefined;
  EditPatientProfile: undefined;
  MyPharmacies: undefined;
  PrescriptionPaymentSettings: undefined;
  NotificationPreferences: undefined;
  ReminderSettings: undefined;
  SafetyResponseSettings: undefined;
  LanguageAccessibility: undefined;
  PrivacySecurity: undefined;
  SelectDoctor: undefined;
  PatientActiveCalls: undefined;
  MedicineUpdates: undefined;

  PharmacyRequest: {
    medicineId: string;
    medicineName: string;
    dose: string;
    source: string;
    currentStock?: number | null;
    stockUnit?: string | null;
    reviewStatus?: string | null;
    reviewRoutingStatus?: string | null;
    reviewDoctorName?: string | null;
  };

  PatientReports: undefined;
  PatientUploadReport: undefined;

  AddMedicine: { medicineDraft?: MedicineDraft; mode?: MedicineFlowMode; medicineReviewRequestId?: string } | undefined;
  ConfirmReminder: { medicineDraft: MedicineDraft; mode?: MedicineFlowMode; medicineReviewRequestId?: string };

  ScanMedicine: undefined;
  ScanMedicineResult: { detectedText: string; ocrConfidence?: number; source?: ScanMedicineSource; scannedImageUri?: string };
  PrescriptionScanResult: { detectedText: string; ocrConfidence?: number; source?: ScanMedicineSource; scannedImageUri?: string };
  ConnectedDevice: undefined;
  ManualSafetyResponse: undefined;

  SafetyResponse: {
    vitalReading: VitalReading;
    triggerSource?: string;
    manualCriticalInfo?: { title: string; value: string; reason: string };
  };

  VideoConsultation: {
    consultationId: string;
    consultationType?: "EMERGENCY" | "MANUAL";
    patientMeeting?: MeetingConfig;
    doctorMeeting?: MeetingConfig;
    patientMeetingUrl?: string;
    doctorMeetingUrl?: string;
  };

  ConsultationEnded: {
    consultationId: string;
    consultationType?: "EMERGENCY" | "MANUAL";
    participantRole?: ConsultationParticipantRole;
    endedBy?: ConsultationEndedBy;
    completionStatus?: ConsultationCompletionStatus;
  };

  DoctorPatientDetail: { patientId: string; patientName?: string };
  DoctorAlertDetail: { alertId: string };
  DoctorPatientReports: { patientId: string; patientName: string };
  DoctorReportReviews: undefined;
  DoctorReportReview: { patientId: string; patientName: string; reportId: string };
  DoctorSelectPrescriptionPatient: undefined;
  DoctorPrescription: { patientId: string; patientName: string };
  DoctorSelectNotePatient: undefined;
  DoctorAddNote: { patientId: string; patientName: string };
  DoctorAvailability: undefined;
  DoctorMedicineReviewPool: undefined;
  DoctorMedicineReviewPoolDetail: { requestId: string };
  DoctorRefillVerifications: undefined;
  DoctorRefillVerificationDetail: { submissionId: string };
};