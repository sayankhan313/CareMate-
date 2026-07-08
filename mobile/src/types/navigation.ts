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

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  RoleSelection: undefined;
  PatientSignup: undefined;
  EmailVerification: {
    email?: string;
  };
  ForgotPassword: undefined;

  PatientTabs:
  | (NavigatorScreenParams<PatientTabParamList> & { user?: any })
  | undefined;

  AddMedicine: undefined;
  ConfirmReminder: undefined;
  ConnectedDevice: undefined;

  SafetyResponse: {
    vitalReading: VitalReading;
    triggerSource?: string;
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