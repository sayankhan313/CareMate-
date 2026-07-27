import type { NavigatorScreenParams } from "@react-navigation/native";

import type { VitalReading } from "./vitals";
import type { MeetingConfig } from "../services/safetyApi";

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

export type AdminAccountStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "APPROVED"
  | "REJECTED"
  | "DISABLED";

export type AdminUserStatusFilter = AdminAccountStatus | "ALL";

export type AdminTabParamList = {
  Dashboard:
    | {
        user?: any;
      }
    | undefined;

  Doctors:
    | {
        status?: AdminAccountStatus;
      }
    | undefined;

  Pharmacies:
    | {
        status?: AdminAccountStatus;
      }
    | undefined;

  Users:
    | {
        status?: AdminUserStatusFilter;
      }
    | undefined;
};

export type MedicineDraft = {
  name: string;
  dose: string;
  instructions?: string;
  frequency:
    | "ONCE_DAILY"
    | "TWICE_DAILY"
    | "THREE_TIMES_DAILY"
    | "AS_NEEDED";
  timeOfDay: string;
  selectedTimes?: string[];
  startDate: string;
  endDate?: string;
  prescriptionPattern?: string | null;
  sendToDoctorForReview: boolean;
};

export type ScanMedicineSource = "DEMO" | "CAMERA" | "GALLERY";

export type ConsultationParticipantRole = "PATIENT" | "DOCTOR";

export type ConsultationEndedBy = "PATIENT" | "DOCTOR";

export type ConsultationCompletionStatus = "COMPLETED" | "LEFT";

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  RoleSelection: undefined;
  PatientSignup: undefined;
  DoctorSignup: undefined;
  PharmacySignup: undefined;

  EmailVerification: {
    email?: string;
  };

  ForgotPassword: undefined;

  DoctorPendingApproval:
    | {
        user?: any;
        email?: string;
      }
    | undefined;

  PharmacyPendingApproval:
    | {
        user?: any;
        email?: string;
      }
    | undefined;

  PatientTabs:
    | (NavigatorScreenParams<PatientTabParamList> & {
        user?: any;
      })
    | undefined;

  DoctorTabs:
    | (NavigatorScreenParams<DoctorTabParamList> & {
        user?: any;
      })
    | undefined;

  AdminTabs:
    | (NavigatorScreenParams<AdminTabParamList> & {
        user?: any;
      })
    | undefined;

  PharmacyDashboard:
    | {
        user?: any;
      }
    | undefined;

  AdminDashboard: undefined;

  AdminDoctorVerificationDetail: {
    doctorId: string;
  };

  AdminPharmacyVerificationDetail: {
    pharmacyId: string;
  };

  AdminAuditLogs: undefined;

  AdminAuditLogDetail: {
    auditLogId: string;
  };

  AdminRegisterWebView: {
    title: string;
    url: string;
    helperText?: string;
  };

  PatientProfile:
    | {
        user?: any;
      }
    | undefined;

  SelectDoctor: undefined;
  PatientActiveCalls: undefined;
  MedicineUpdates: undefined;
  PatientReports: undefined;
  PatientUploadReport: undefined;

  AddMedicine:
    | {
        medicineDraft?: MedicineDraft;
        mode?: "CREATE" | "EDIT_DRAFT" | "RESUBMIT_REVIEW";
        medicineReviewRequestId?: string;
      }
    | undefined;

  ConfirmReminder: {
    medicineDraft: MedicineDraft;
  };

  ScanMedicine: undefined;

  ScanMedicineResult: {
    detectedText: string;
    ocrConfidence?: number;
    source?: ScanMedicineSource;
    scannedImageUri?: string;
  };

  PrescriptionScanResult: {
    detectedText: string;
    ocrConfidence?: number;
    source?: ScanMedicineSource;
  };

  ConnectedDevice: undefined;
  ManualSafetyResponse: undefined;

  SafetyResponse: {
    vitalReading: VitalReading;
    triggerSource?: string;
    manualCriticalInfo?: {
      title: string;
      value: string;
      reason: string;
    };
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

  DoctorPatientDetail: {
    patientId: string;
    patientName?: string;
  };

  DoctorPatientReports: {
    patientId: string;
    patientName: string;
  };

  DoctorReportReviews: undefined;

  DoctorReportReview: {
    patientId: string;
    patientName: string;
    reportId: string;
  };

  DoctorSelectPrescriptionPatient: undefined;

  DoctorPrescription: {
    patientId: string;
    patientName: string;
  };

  DoctorSelectNotePatient: undefined;

  DoctorAddNote: {
    patientId: string;
    patientName: string;
  };
};