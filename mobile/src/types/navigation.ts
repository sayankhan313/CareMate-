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
  Patients: undefined;
  Profile: undefined;
};

export type MedicineDraft = {
  name: string;
  dose: string;
  instructions?: string;
  frequency: "ONCE_DAILY" | "TWICE_DAILY" | "THREE_TIMES_DAILY" | "AS_NEEDED";
  timeOfDay: string;
  selectedTimes?: string[];
  startDate: string;
  endDate?: string;
  prescriptionPattern?: string | null;
  sendToDoctorForReview: boolean;
};

export type ScanMedicineSource = "DEMO" | "CAMERA" | "GALLERY";

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  RoleSelection: undefined;
  PatientSignup: undefined;
  DoctorSignup: undefined;

  DoctorPendingApproval:
    | {
        user?: any;
        email?: string;
      }
    | undefined;

  EmailVerification: {
    email?: string;
  };

  ForgotPassword: undefined;

  PatientTabs:
    | (NavigatorScreenParams<PatientTabParamList> & { user?: any })
    | undefined;

  DoctorTabs:
    | (NavigatorScreenParams<DoctorTabParamList> & { user?: any })
    | undefined;

  PatientProfile:
    | {
        user?: any;
      }
    | undefined;

  AddMedicine:
    | {
        medicineDraft?: MedicineDraft;
        mode?: "CREATE" | "EDIT_DRAFT";
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
  };
};