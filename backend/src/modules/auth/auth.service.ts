import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { hashPassword, comparePassword } from "../../utils/password.util.js";
import { createJwtToken } from "../../utils/jwt.util.js";
import {
  createEmailVerificationToken,
  createVerificationLink,
} from "../../utils/emailToken.util.js";

import type {
  LoginInput,
  RegisterInput,
  ResendVerificationEmailInput,
  VerifyEmailInput,
} from "./auth.types.js";

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

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        passwordHash,
        role: data.role,
        accountStatus,
        emailVerificationToken: token,
        emailVerificationTokenExpiresAt: expiresAt,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        accountStatus: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    const verificationLink = createVerificationLink(token);

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

    if (env.NODE_ENV === "development") {
      console.log("New email verification link:", verificationLink);
    }

    return {
      verificationLink:
        env.NODE_ENV === "development" ? verificationLink : undefined,
    };
  },
};