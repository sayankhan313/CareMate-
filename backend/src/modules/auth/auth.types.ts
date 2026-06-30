export type PublicRegisterRole =
  | "PATIENT"
  | "DOCTOR"
  | "CAREGIVER"
  | "PHARMACY";

export type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  role: PublicRegisterRole;

  phoneNumber?: string;
  dateOfBirth?: string;
  medicalConditions?: string;
  emergencyContact?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type ResendVerificationEmailInput = {
  email: string;
};

export type VerifyEmailInput = {
  token: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ResetPasswordInput = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};