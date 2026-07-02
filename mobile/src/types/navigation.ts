import type { NavigatorScreenParams } from "@react-navigation/native";

export type User = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  accountStatus: string;
  isEmailVerified: boolean;
};

export type MedicineDraft = {
  name: string;
  dose: string;
  instructions?: string;
  frequency: string;
  timeOfDay: string;
  selectedTimes: string[];
  startDate: string;
  endDate?: string;
  sendToDoctorForReview: boolean;
};

export type PatientTabParamList = {
  Home: { user?: User } | undefined;
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
  EmailVerification: { email: string };
  ForgotPassword: undefined;

  PatientTabs:
    | (NavigatorScreenParams<PatientTabParamList> & {
        user?: User;
      })
    | undefined;

  AddMedicine: undefined;
  ConfirmReminder: {
    medicineDraft: MedicineDraft;
  };
};