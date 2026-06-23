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
  return `http://localhost:${env.PORT}/api/v1/auth/verify-email?token=${token}`;
};