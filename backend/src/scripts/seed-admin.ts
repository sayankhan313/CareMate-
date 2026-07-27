import { prisma } from "../config/prisma.js";
import { hashPassword } from "../utils/password.util.js";

const ADMIN_EMAIL = "admin.demo@caremate.com";
const ADMIN_PASSWORD = "123456789";

const seedAdmin = async () => {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  const admin = await prisma.user.upsert({
    where: {
      email: ADMIN_EMAIL,
    },
    update: {
      fullName: "CareMate Admin",
      passwordHash,
      role: "ADMIN",
      accountStatus: "ACTIVE",
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
    },
    create: {
      fullName: "CareMate Admin",
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      accountStatus: "ACTIVE",
      isEmailVerified: true,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      accountStatus: true,
      isEmailVerified: true,
    },
  });

  console.log("Admin account ready:");
  console.log(admin);
  console.log("");
  console.log("Login credentials:");
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
};

seedAdmin()
  .catch((error) => {
    console.error("Failed to seed admin account:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });