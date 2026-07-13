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

    phoneNumber: z.string().trim().optional(),

    dateOfBirth: z.string().trim().optional(),

    gender: patientGenderSchema.optional(),

    medicalConditions: z.string().trim().optional(),

    emergencyContact: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== "PATIENT") {
      return;
    }

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