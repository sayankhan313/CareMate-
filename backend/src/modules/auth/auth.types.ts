export type PublicRegisterRole =
  | "PATIENT"
  | "DOCTOR"
  | "CAREGIVER"
  | "PHARMACY";

export type PatientGender =
  | "MALE"
  | "FEMALE"
  | "OTHER"
  | "PREFER_NOT_TO_SAY";

export type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  role: PublicRegisterRole;

  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: PatientGender;
  medicalConditions?: string;
  emergencyContact?: string;

  gmcNumber?: string;
  specialization?: string;
  clinicName?: string;
  clinicAddress?: string;
  yearsExperience?: number;
  bio?: string;

  gmcDocumentUrl?: string;
  photoIdDocumentUrl?: string;
  qualificationDocumentUrl?: string;
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