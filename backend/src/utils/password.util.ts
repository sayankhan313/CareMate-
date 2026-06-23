import bcrypt from "bcryptjs";

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (
  password: string,
  passwordHash: string
) => {
  return bcrypt.compare(password, passwordHash);
};