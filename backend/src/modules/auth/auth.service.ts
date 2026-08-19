import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { hashPassword, comparePassword } from "../../utils/password.util.js";
import { createJwtToken } from "../../utils/jwt.util.js";
import { emailUtil } from "../../utils/email.util.js";
import { createEmailVerificationToken, createVerificationLink } from "../../utils/emailToken.util.js";
import { createPasswordResetToken, createPasswordResetLink } from "../../utils/passwordResetToken.util.js";
import { notificationService } from "../notification/notification.service.js";

import type { ForgotPasswordInput, LoginInput, RegisterInput, ResendVerificationEmailInput, ResetPasswordInput, VerifyEmailInput } from "./auth.types.js";

const parseDateOfBirth = (dateOfBirth: string) => {
  const parts = dateOfBirth.split("/");
  if (parts.length !== 3) throw new AppError("Date of birth must be in DD/MM/YYYY format", 400);

  const [dayText, monthText, yearText] = parts;
  if (!dayText || !monthText || !yearText) throw new AppError("Date of birth must be in DD/MM/YYYY format", 400);

  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) throw new AppError("Date of birth must contain valid numbers", 400);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  const isInvalidDate = parsedDate.getUTCFullYear() !== year || parsedDate.getUTCMonth() !== month - 1 || parsedDate.getUTCDate() !== day;
  if (isInvalidDate) throw new AppError("Please enter a valid date of birth", 400);

  return parsedDate;
};

const getPatientProfileData = (data: RegisterInput) => {
  if (data.role !== "PATIENT") return undefined;
  if (!data.phoneNumber) throw new AppError("Phone number is required for patient registration", 400);
  if (!data.dateOfBirth) throw new AppError("Date of birth is required for patient registration", 400);
  if (!data.emergencyContact) throw new AppError("Emergency contact is required for patient registration", 400);

  return {
    phoneNumber: data.phoneNumber.trim(),
    dateOfBirth: parseDateOfBirth(data.dateOfBirth.trim()),
    gender: data.gender || "PREFER_NOT_TO_SAY",
    medicalConditions: data.medicalConditions?.trim() || null,
    emergencyContact: data.emergencyContact.trim(),
  };
};

const getDoctorProfileData = (data: RegisterInput) => {
  if (data.role !== "DOCTOR") return undefined;
  if (!data.phoneNumber) throw new AppError("Phone number is required for doctor registration", 400);
  if (!data.gmcNumber) throw new AppError("GMC number is required for doctor registration", 400);
  if (!data.specialization) throw new AppError("Specialisation is required for doctor registration", 400);
  if (!data.clinicName) throw new AppError("Clinic or hospital name is required for doctor registration", 400);
  if (!data.gmcDocumentUrl) throw new AppError("GMC registration proof is required", 400);
  if (!data.photoIdDocumentUrl) throw new AppError("Photo ID proof is required", 400);
  if (!data.qualificationDocumentUrl) throw new AppError("Qualification or employment proof is required", 400);

  return {
    phoneNumber: data.phoneNumber.trim(),
    gmcNumber: data.gmcNumber.trim().toUpperCase(),
    specialization: data.specialization.trim(),
    clinicName: data.clinicName.trim(),
    clinicAddress: data.clinicAddress?.trim() || null,
    yearsExperience: data.yearsExperience ?? null,
    bio: data.bio?.trim() || null,
    gmcDocumentUrl: data.gmcDocumentUrl,
    photoIdDocumentUrl: data.photoIdDocumentUrl,
    qualificationDocumentUrl: data.qualificationDocumentUrl,
  };
};

const getPharmacyProfileData = (data: RegisterInput) => {
  if (data.role !== "PHARMACY") return undefined;
  if (!data.pharmacyName) throw new AppError("Pharmacy name is required", 400);
  if (!data.staffName) throw new AppError("Staff name is required", 400);
  if (!data.phoneNumber) throw new AppError("Phone number is required for pharmacy registration", 400);
  if (!data.registrationNumber) throw new AppError("Pharmacy registration number is required", 400);
  if (!data.licenseNumber) throw new AppError("Pharmacy licence number is required", 400);
  if (!data.address) throw new AppError("Pharmacy address is required", 400);
  if (!data.city) throw new AppError("City is required", 400);
  if (!data.postcode) throw new AppError("Postcode is required", 400);
  if (!data.licenseDocumentUrl) throw new AppError("Pharmacy licence document is required", 400);
  if (!data.addressProofDocumentUrl) throw new AppError("Address proof document is required", 400);

  return {
    pharmacyName: data.pharmacyName.trim(),
    staffName: data.staffName.trim(),
    phoneNumber: data.phoneNumber.trim(),
    email: data.email.trim().toLowerCase(),
    registrationNumber: data.registrationNumber.trim().toUpperCase(),
    licenseNumber: data.licenseNumber.trim().toUpperCase(),
    address: data.address.trim(),
    city: data.city.trim(),
    postcode: data.postcode.trim().toUpperCase(),
    openingHours: data.openingHours?.trim() || null,
    serviceType: data.serviceType?.trim() || null,
    licenseDocumentUrl: data.licenseDocumentUrl,
    addressProofDocumentUrl: data.addressProofDocumentUrl,
  };
};

const notifyPatientAboutSuccessfulLogin = async (user: { id: string; role: string }) => {
  if (user.role !== "PATIENT") return;

  try {
    const privacy = await prisma.patientPrivacyPreference.upsert({
      where: { patientId: user.id },
      create: { patientId: user.id },
      update: {},
      select: { loginAlertsEnabled: true },
    });

    if (!privacy.loginAlertsEnabled) return;

    const loggedInAt = new Date();

    await notificationService.createAndSend({
      userId: user.id,
      type: "LOGIN_ALERT",
      title: "New login to CareMate+",
      body: "A successful login to your CareMate+ patient account was detected.",
      priority: "HIGH",
      entityType: "ACCOUNT_SECURITY",
      entityId: `${user.id}:${loggedInAt.getTime()}`,
      targetScreen: "Notifications",
      data: { source: "AUTH_LOGIN", loggedInAt: loggedInAt.toISOString() },
    });
  } catch (error) {
    console.warn("Unable to create patient login alert:", error instanceof Error ? error.message : error);
  }
};

const notifyAdminsAboutVerificationRequest = async (user: { id: string; fullName: string; role: string; createdAt: Date }) => {
  if (user.role !== "DOCTOR" && user.role !== "PHARMACY") return;

  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } },
      select: { id: true },
    });

    const isDoctor = user.role === "DOCTOR";
    const type = isDoctor ? "DOCTOR_VERIFICATION_REQUESTED" : "PHARMACY_VERIFICATION_REQUESTED";
    const entityType = isDoctor ? "DOCTOR_VERIFICATION" : "PHARMACY_VERIFICATION";
    const targetScreen = isDoctor ? "AdminDoctorVerificationDetail" : "AdminPharmacyVerificationDetail";
    const roleLabel = isDoctor ? "doctor" : "pharmacy";

    const results = await Promise.allSettled(admins.map(async admin => {
      const existingNotification = await prisma.userNotification.findFirst({
        where: { userId: admin.id, type, entityType, entityId: user.id },
        select: { id: true },
      });

      if (existingNotification) return existingNotification;

      return notificationService.createAndSend({
        userId: admin.id,
        type,
        title: `New ${roleLabel} verification`,
        body: `${user.fullName} completed email verification and is ready for admin review.`,
        priority: "HIGH",
        entityType,
        entityId: user.id,
        targetScreen,
        data: {
          userId: user.id,
          applicantName: user.fullName,
          applicantRole: user.role,
          doctorId: isDoctor ? user.id : null,
          pharmacyId: isDoctor ? null : user.id,
          submittedAt: user.createdAt.toISOString(),
          source: "ACCOUNT_VERIFICATION_REQUEST",
        },
      });
    }));

    const failedCount = results.filter(result => result.status === "rejected").length;
    if (failedCount > 0) console.warn(`${failedCount} admin verification notification(s) could not be processed.`);
  } catch (error) {
    console.warn("Unable to notify administrators about verification request:", error instanceof Error ? error.message : error);
  }
};

export const authService = {
  async register(data: RegisterInput) {
    const normalizedEmail = data.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) throw new AppError("Email is already registered", 409);

    if (data.role === "DOCTOR" && data.gmcNumber) {
      const existingDoctorProfile = await prisma.doctorProfile.findUnique({ where: { gmcNumber: data.gmcNumber.trim().toUpperCase() } });
      if (existingDoctorProfile) throw new AppError("GMC number is already registered", 409);
    }

    if (data.role === "PHARMACY" && data.registrationNumber) {
      const existingPharmacyRegistration = await prisma.pharmacyProfile.findUnique({
        where: { registrationNumber: data.registrationNumber.trim().toUpperCase() },
      });
      if (existingPharmacyRegistration) throw new AppError("Pharmacy registration number is already registered", 409);
    }

    if (data.role === "PHARMACY" && data.licenseNumber) {
      const existingPharmacyLicense = await prisma.pharmacyProfile.findUnique({
        where: { licenseNumber: data.licenseNumber.trim().toUpperCase() },
      });
      if (existingPharmacyLicense) throw new AppError("Pharmacy licence number is already registered", 409);
    }

    const passwordHash = await hashPassword(data.password);
    const accountStatus = data.role === "DOCTOR" || data.role === "PHARMACY" ? "PENDING_VERIFICATION" : "ACTIVE";
    const { token, expiresAt } = createEmailVerificationToken();
    const normalizedData = { ...data, email: normalizedEmail };
    const patientProfileData = getPatientProfileData(normalizedData);
    const doctorProfileData = getDoctorProfileData(normalizedData);
    const pharmacyProfileData = getPharmacyProfileData(normalizedData);

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: data.role,
        accountStatus,
        emailVerificationToken: token,
        emailVerificationTokenExpiresAt: expiresAt,
        ...(patientProfileData ? { patientProfile: { create: patientProfileData } } : {}),
        ...(doctorProfileData ? { doctorProfile: { create: doctorProfileData } } : {}),
        ...(pharmacyProfileData ? { pharmacyProfile: { create: pharmacyProfileData } } : {}),
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
        doctorProfile: true,
        pharmacyProfile: true,
      },
    });

    const verificationLink = createVerificationLink(token);
    await emailUtil.sendEmailVerificationEmail(user.email, verificationLink);

    if (env.NODE_ENV === "development") console.log("Email verification link:", verificationLink);

    return { user, verificationLink: env.NODE_ENV === "development" ? verificationLink : undefined };
  },

  async login(data: LoginInput) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) throw new AppError("Invalid email or password", 401);

    const isPasswordCorrect = await comparePassword(data.password, user.passwordHash);
    if (!isPasswordCorrect) throw new AppError("Invalid email or password", 401);
    if (!user.isEmailVerified) throw new AppError("Please verify your email before logging in", 403);
    if (user.accountStatus === "DISABLED") throw new AppError("Your account has been disabled", 403);
    if (user.accountStatus === "REJECTED") throw new AppError("Your account verification was rejected", 403);

    const token = createJwtToken({ userId: user.id, role: user.role });
    void notifyPatientAboutSuccessfulLogin(user);

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
    const user = await prisma.user.findFirst({ where: { emailVerificationToken: data.token } });
    if (!user || !user.emailVerificationTokenExpiresAt) throw new AppError("Invalid verification token", 400);
    if (user.emailVerificationTokenExpiresAt < new Date()) throw new AppError("Verification token has expired", 400);

    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerificationToken: null, emailVerificationTokenExpiresAt: null },
      select: { id: true, fullName: true, role: true, createdAt: true },
    });

    await notifyAdminsAboutVerificationRequest(verifiedUser);
    return { message: "Email verified successfully" };
  },

  async resendVerificationEmail(data: ResendVerificationEmailInput) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) throw new AppError("User not found", 404);
    if (user.isEmailVerified) throw new AppError("Email is already verified", 400);

    const { token, expiresAt } = createEmailVerificationToken();

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: token, emailVerificationTokenExpiresAt: expiresAt },
    });

    const verificationLink = createVerificationLink(token);
    await emailUtil.sendEmailVerificationEmail(user.email, verificationLink);

    if (env.NODE_ENV === "development") console.log("New email verification link:", verificationLink);

    return { verificationLink: env.NODE_ENV === "development" ? verificationLink : undefined };
  },

  async forgotPassword(data: ForgotPasswordInput) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const genericMessage = "If an account exists with this email, a password reset link has been sent.";

    if (!user) return { message: genericMessage, resetLink: undefined };

    const { token, expiresAt } = createPasswordResetToken();

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetTokenExpiresAt: expiresAt },
    });

    const resetLink = createPasswordResetLink(token);
    await emailUtil.sendPasswordResetEmail(user.email, resetLink);

    if (env.NODE_ENV === "development") console.log("Password reset link:", resetLink);

    return { message: genericMessage, resetLink: env.NODE_ENV === "development" ? resetLink : undefined };
  },

  async resetPassword(data: ResetPasswordInput) {
    const user = await prisma.user.findFirst({ where: { passwordResetToken: data.token } });
    if (!user || !user.passwordResetTokenExpiresAt) throw new AppError("Invalid password reset token", 400);
    if (user.passwordResetTokenExpiresAt < new Date()) throw new AppError("Password reset token has expired", 400);

    const passwordHash = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetTokenExpiresAt: null },
    });

    return { message: "Password reset successfully" };
  },
};