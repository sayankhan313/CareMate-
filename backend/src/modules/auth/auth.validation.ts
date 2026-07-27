import { z } from "zod";

const userRoleSchema = z.enum([
  "PATIENT",
  "DOCTOR",
  "CAREGIVER",
  "PHARMACY",
]);

const patientGenderSchema = z.enum([
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
]);

const requiredText = (message: string) =>
  z.string().trim().min(1, message);

const optionalText = z.string().trim().optional();

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters."),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Please enter a valid email address."),

    password: z.string().min(8, "Password must be at least 8 characters."),

    role: userRoleSchema,

    phoneNumber: optionalText,

    dateOfBirth: optionalText,

    gender: patientGenderSchema.optional(),

    medicalConditions: optionalText,

    emergencyContact: optionalText,

    gmcNumber: optionalText,

    specialization: optionalText,

    clinicName: optionalText,

    clinicAddress: optionalText,

    yearsExperience: z.coerce.number().int().min(0).max(80).optional(),

    bio: optionalText,

    gmcDocumentUrl: optionalText,

    photoIdDocumentUrl: optionalText,

    qualificationDocumentUrl: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.role === "PATIENT") {
      if (!data.phoneNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phoneNumber"],
          message: "Phone number is required for patient registration.",
        });
      }

      if (!data.dateOfBirth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dateOfBirth"],
          message: "Date of birth is required for patient registration.",
        });
      }

      if (!data.emergencyContact) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["emergencyContact"],
          message: "Emergency contact is required for patient registration.",
        });
      }
    }

    if (data.role === "DOCTOR") {
      if (!data.phoneNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phoneNumber"],
          message: "Phone number is required for doctor registration.",
        });
      }

      if (!data.gmcNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gmcNumber"],
          message: "GMC number is required for doctor registration.",
        });
      }

      if (!data.specialization) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["specialization"],
          message: "Specialisation is required for doctor registration.",
        });
      }

      if (!data.clinicName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["clinicName"],
          message: "Clinic or hospital name is required for doctor registration.",
        });
      }

      if (!data.gmcDocumentUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gmcDocumentUrl"],
          message: "GMC registration proof is required.",
        });
      }

      if (!data.photoIdDocumentUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["photoIdDocumentUrl"],
          message: "Photo ID proof is required.",
        });
      }

      if (!data.qualificationDocumentUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["qualificationDocumentUrl"],
          message: "Qualification or employment proof is required.",
        });
      }
    }
  });

export const doctorMultipartRegisterSchema = z.object({
  fullName: requiredText("Full name is required."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  phoneNumber: requiredText("Phone number is required."),
  gmcNumber: requiredText("GMC number is required."),
  specialization: requiredText("Specialisation is required."),
  clinicName: requiredText("Clinic or hospital name is required."),
  clinicAddress: optionalText,
  yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
  bio: optionalText,
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),

  password: z.string().min(1, "Password is required."),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required."),
});

export const resendVerificationEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Password reset token is required."),

    newPassword: z.string().min(8, "Password must be at least 8 characters."),

    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });