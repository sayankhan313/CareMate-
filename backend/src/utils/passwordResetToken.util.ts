import crypto from "crypto";

import { env } from "../config/env.js";

export const createPasswordResetToken = () => {
  const token = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  return {
    token,
    expiresAt,
  };
};

export const createPasswordResetLink = (token: string) => {
  return `http://localhost:${env.PORT}/api/v1/auth/reset-password?token=${token}`;
};