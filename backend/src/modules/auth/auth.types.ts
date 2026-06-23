export type PublicRegisterRole = "PATIENT" | "DOCTOR" | "CAREGIVER" | "PHARMACY";

export type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  role: PublicRegisterRole;
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