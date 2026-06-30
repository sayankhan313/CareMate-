export type User = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  accountStatus: string;
  isEmailVerified: boolean;
};

export type RootStackParamList = {
  Splash: undefined;
    Welcome: undefined;

  Login: undefined;

  RoleSelection: undefined;

  PatientSignup: undefined;

  EmailVerification: {
    email: string;
    verificationLink?: string;
  };

  ForgotPassword: undefined;

  ResetPassword: {
    resetLink?: string;
  };

  PatientDashboard: {
    user: User;
  };
};