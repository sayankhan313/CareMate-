const brevoApiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL;
const senderName = process.env.BREVO_SENDER_NAME || "CareMate+";

if (!brevoApiKey || !senderEmail) {
  console.warn("Brevo email settings are missing. Emails will not be sent.");
}

async function sendBrevoEmail(to: string, subject: string, htmlContent: string) {
  if (!brevoApiKey || !senderEmail) return;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": brevoApiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo email failed (${response.status}): ${errorBody}`);
  }
}

export const emailUtil = {
  async sendEmailVerificationEmail(email: string, verificationLink: string) {
    await sendBrevoEmail(
      email,
      "Verify your CareMate+ email",
      `
        <h2>Welcome to CareMate+</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationLink}">Verify Email</a></p>
        <p>If the button does not work, copy this link:</p>
        <p>${verificationLink}</p>
      `,
    );
  },

  async sendPasswordResetEmail(email: string, resetLink: string) {
    await sendBrevoEmail(
      email,
      "Reset your CareMate+ password",
      `
        <h2>CareMate+ Password Reset</h2>
        <p>You requested to reset your password.</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>If the button does not work, copy this link:</p>
        <p>${resetLink}</p>
      `,
    );
  },
};