import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = process.env.SMTP_SECURE === "true";
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM;

if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
  console.warn("SMTP email settings are missing. Emails will not be sent.");
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export const emailUtil = {
  async sendEmailVerificationEmail(email: string, verificationLink: string) {
    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
      return;
    }

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: "Verify your CareMate+ email",
      html: `
        <h2>Welcome to CareMate+</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <p>
          <a href="${verificationLink}">Verify Email</a>
        </p>
        <p>If the button does not work, copy this link:</p>
        <p>${verificationLink}</p>
      `,
    });
  },

  async sendPasswordResetEmail(email: string, resetLink: string) {
    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
      return;
    }

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: "Reset your CareMate+ password",
      html: `
        <h2>CareMate+ Password Reset</h2>
        <p>You requested to reset your password.</p>
        <p>
          <a href="${resetLink}">Reset Password</a>
        </p>
        <p>If the button does not work, copy this link:</p>
        <p>${resetLink}</p>
      `,
    });
  },
};