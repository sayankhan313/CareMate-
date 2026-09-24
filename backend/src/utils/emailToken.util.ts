import crypto from "crypto";
import { env } from "../config/env.js";

export const createEmailVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return {
    token,
    expiresAt,
  };
};

export const createVerificationLink = (token: string) => {
  const baseUrl = env.PUBLIC_API_URL || `http://localhost:${env.PORT}`;
  return `${baseUrl}/api/v1/auth/verify-email?token=${token}`;
};