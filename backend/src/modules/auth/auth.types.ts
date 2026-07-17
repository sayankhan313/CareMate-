export type UserRole =
  | "PATIENT"
  | "DOCTOR"
  | "CAREGIVER"
  | "PHARMACY"
  | "ADMIN";

export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;

  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: Gender;
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

  pharmacyName?: string;
  staffName?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  address?: string;
  city?: string;
  postcode?: string;
  openingHours?: string;
  serviceType?: string;
  licenseDocumentUrl?: string;
  addressProofDocumentUrl?: string;
};



export type LoginInput = {
  email: string;
  password: string;
};

export type VerifyEmailInput = {
  token: string;
};

export type ResendVerificationEmailInput = {
  email: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ResetPasswordInput = {
  token: string;
  newPassword: string;
};