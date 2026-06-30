import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { hashPassword, comparePassword } from "../../utils/password.util.js";
import { createJwtToken } from "../../utils/jwt.util.js";
import { emailUtil } from "../../utils/email.util.js";
import {
  createEmailVerificationToken,
  createVerificationLink,
} from "../../utils/emailToken.util.js";
import {
  createPasswordResetToken,
  createPasswordResetLink,
} from "../../utils/passwordResetToken.util.js";

import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationEmailInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.types.js";

const parseDateOfBirth = (dateOfBirth: string) => {
  const parts = dateOfBirth.split("/");

  if (parts.length !== 3) {
    throw new AppError("Date of birth must be in DD/MM/YYYY format", 400);
  }

  const dayText = parts[0];
  const monthText = parts[1];
  const yearText = parts[2];

  if (!dayText || !monthText || !yearText) {
    throw new AppError("Date of birth must be in DD/MM/YYYY format", 400);
  }

  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year)
  ) {
    throw new AppError("Date of birth must contain valid numbers", 400);
  }

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  const isInvalidDate =
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day;

  if (isInvalidDate) {
    throw new AppError("Please enter a valid date of birth", 400);
  }

  return parsedDate;
};

const getPatientProfileData = (data: RegisterInput) => {
  if (data.role !== "PATIENT") {
    return undefined;
  }

  if (!data.phoneNumber) {
    throw new AppError("Phone number is required for patient registration", 400);
  }

  if (!data.dateOfBirth) {
    throw new AppError("Date of birth is required for patient registration", 400);
  }

  if (!data.emergencyContact) {
    throw new AppError(
      "Emergency contact is required for patient registration",
      400
    );
  }

  return {
    phoneNumber: data.phoneNumber.trim(),
    dateOfBirth: parseDateOfBirth(data.dateOfBirth.trim()),
    medicalConditions: data.medicalConditions?.trim() || null,
    emergencyContact: data.emergencyContact.trim(),
  };
};

export const authService = {
  async register(data: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (existingUser) {
      throw new AppError("Email is already registered", 409);
    }

    const passwordHash = await hashPassword(data.password);

    const accountStatus =
      data.role === "DOCTOR" || data.role === "PHARMACY"
        ? "PENDING_VERIFICATION"
        : "ACTIVE";

    const { token, expiresAt } = createEmailVerificationToken();

    const patientProfileData = getPatientProfileData(data);

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        passwordHash,
        role: data.role,
        accountStatus,
        emailVerificationToken: token,
        emailVerificationTokenExpiresAt: expiresAt,

        ...(patientProfileData
          ? {
              patientProfile: {
                create: patientProfileData,
              },
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        accountStatus: true,
        isEmailVerified: true,
        createdAt: true,
        patientProfile: true,
      },
    });

    const verificationLink = createVerificationLink(token);

    await emailUtil.sendEmailVerificationEmail(user.email, verificationLink);

    if (env.NODE_ENV === "development") {
      console.log("Email verification link:", verificationLink);
    }

    return {
      user,
      verificationLink:
        env.NODE_ENV === "development" ? verificationLink : undefined,
    };
  },

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const isPasswordCorrect = await comparePassword(
      data.password,
      user.passwordHash
    );

    if (!isPasswordCorrect) {
      throw new AppError("Invalid email or password", 401);
    }

    if (!user.isEmailVerified) {
      throw new AppError("Please verify your email before logging in", 403);
    }

    if (user.accountStatus === "DISABLED") {
      throw new AppError("Your account has been disabled", 403);
    }

    if (user.accountStatus === "REJECTED") {
      throw new AppError("Your account verification was rejected", 403);
    }

    const token = createJwtToken({
      userId: user.id,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        isEmailVerified: user.isEmailVerified,
      },
    };
  },

  async verifyEmail(data: VerifyEmailInput) {
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: data.token,
      },
    });

    if (!user || !user.emailVerificationTokenExpiresAt) {
      throw new AppError("Invalid verification token", 400);
    }

    const now = new Date();

    if (user.emailVerificationTokenExpiresAt < now) {
      throw new AppError("Verification token has expired", 400);
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      },
    });

    return {
      message: "Email verified successfully",
    };
  },

  async resendVerificationEmail(data: ResendVerificationEmailInput) {
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.isEmailVerified) {
      throw new AppError("Email is already verified", 400);
    }

    const { token, expiresAt } = createEmailVerificationToken();

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerificationToken: token,
        emailVerificationTokenExpiresAt: expiresAt,
      },
    });

    const verificationLink = createVerificationLink(token);

    await emailUtil.sendEmailVerificationEmail(user.email, verificationLink);

    if (env.NODE_ENV === "development") {
      console.log("New email verification link:", verificationLink);
    }

    return {
      verificationLink:
        env.NODE_ENV === "development" ? verificationLink : undefined,
    };
  },

  async forgotPassword(data: ForgotPasswordInput) {
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    const genericMessage =
      "If an account exists with this email, a password reset link has been sent.";

    if (!user) {
      return {
        message: genericMessage,
        resetLink: undefined,
      };
    }

    const { token, expiresAt } = createPasswordResetToken();

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordResetToken: token,
        passwordResetTokenExpiresAt: expiresAt,
      },
    });

    const resetLink = createPasswordResetLink(token);

    await emailUtil.sendPasswordResetEmail(user.email, resetLink);

    if (env.NODE_ENV === "development") {
      console.log("Password reset link:", resetLink);
    }

    return {
      message: genericMessage,
      resetLink: env.NODE_ENV === "development" ? resetLink : undefined,
    };
  },

  async resetPassword(data: ResetPasswordInput) {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: data.token,
      },
    });

    if (!user || !user.passwordResetTokenExpiresAt) {
      throw new AppError("Invalid password reset token", 400);
    }

    const now = new Date();

    if (user.passwordResetTokenExpiresAt < now) {
      throw new AppError("Password reset token has expired", 400);
    }

    const passwordHash = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    return {
      message: "Password reset successfully",
    };
  },
};