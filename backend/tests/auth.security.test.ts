import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  comparePassword: vi.fn(),
  createJwtToken: vi.fn(),
  verifyJwtToken: vi.fn(),
  patientPrivacyUpsert: vi.fn(),
  notificationCreateAndSend: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
    },
    patientPrivacyPreference: {
      upsert: mocks.patientPrivacyUpsert,
    },
  },
}));

vi.mock("../src/utils/password.util.js", () => ({
  hashPassword: vi.fn(),
  comparePassword: mocks.comparePassword,
}));

vi.mock("../src/utils/jwt.util.js", () => ({
  createJwtToken: mocks.createJwtToken,
  verifyJwtToken: mocks.verifyJwtToken,
}));

vi.mock("../src/modules/notification/notification.service.js", () => ({
  notificationService: {
    createAndSend: mocks.notificationCreateAndSend,
  },
}));

import { authMiddleware } from "../src/middleware/auth.middleware.js";
import { authService } from "../src/modules/auth/auth.service.js";

const activeUser = {
  id: "user-001",
  fullName: "Automated Test User",
  email: "test@caremate.local",
  passwordHash: "hashed-password",
  role: "CAREGIVER",
  accountStatus: "ACTIVE",
  isEmailVerified: true,
};

const loginInput = {
  email: "test@caremate.local",
  password: "ValidPassword123!",
};

const runMiddleware = async (authorization?: string) => {
  const request = {
    headers: authorization ? { authorization } : {},
  } as Request;

  const response = {} as Response;
  const next = vi.fn();

  await authMiddleware(request, response, next as NextFunction);

  return { request, next };
};

describe("CareMate+ authentication service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createJwtToken.mockReturnValue("caremate-test-jwt");
  });

  it("AUT-AUTH-01: authenticates a verified active user and returns a JWT", async () => {
    mocks.userFindUnique.mockResolvedValue(activeUser);
    mocks.comparePassword.mockResolvedValue(true);

    const result = await authService.login({
      email: "  TEST@CAREMATE.LOCAL ",
      password: loginInput.password,
    });

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { email: "test@caremate.local" },
    });
    expect(mocks.comparePassword).toHaveBeenCalledWith(
      loginInput.password,
      activeUser.passwordHash,
    );
    expect(mocks.createJwtToken).toHaveBeenCalledWith({
      userId: activeUser.id,
      role: activeUser.role,
    });
    expect(result.token).toBe("caremate-test-jwt");
    expect(result.user).toMatchObject({
      id: activeUser.id,
      email: activeUser.email,
      role: activeUser.role,
      accountStatus: "ACTIVE",
      isEmailVerified: true,
    });
  });

  it("AUT-AUTH-02: rejects an unknown email with 401", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    await expect(authService.login(loginInput)).rejects.toMatchObject({
      message: "Invalid email or password",
      statusCode: 401,
    });

    expect(mocks.comparePassword).not.toHaveBeenCalled();
    expect(mocks.createJwtToken).not.toHaveBeenCalled();
  });

  it("AUT-AUTH-03: rejects an incorrect password with 401", async () => {
    mocks.userFindUnique.mockResolvedValue(activeUser);
    mocks.comparePassword.mockResolvedValue(false);

    await expect(authService.login(loginInput)).rejects.toMatchObject({
      message: "Invalid email or password",
      statusCode: 401,
    });

    expect(mocks.createJwtToken).not.toHaveBeenCalled();
  });

  it("AUT-AUTH-04: rejects an unverified account with 403", async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...activeUser,
      isEmailVerified: false,
    });
    mocks.comparePassword.mockResolvedValue(true);

    await expect(authService.login(loginInput)).rejects.toMatchObject({
      message: "Please verify your email before logging in",
      statusCode: 403,
    });

    expect(mocks.createJwtToken).not.toHaveBeenCalled();
  });

  it("AUT-AUTH-05: rejects a disabled account with 403", async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...activeUser,
      accountStatus: "DISABLED",
    });
    mocks.comparePassword.mockResolvedValue(true);

    await expect(authService.login(loginInput)).rejects.toMatchObject({
      message: "Your account has been disabled",
      statusCode: 403,
    });

    expect(mocks.createJwtToken).not.toHaveBeenCalled();
  });

  it("AUT-AUTH-06: rejects a rejected professional account with 403", async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...activeUser,
      role: "DOCTOR",
      accountStatus: "REJECTED",
    });
    mocks.comparePassword.mockResolvedValue(true);

    await expect(authService.login(loginInput)).rejects.toMatchObject({
      message: "Your account verification was rejected",
      statusCode: 403,
    });

    expect(mocks.createJwtToken).not.toHaveBeenCalled();
  });

  it("AUT-AUTH-07: allows a verified pending professional account to authenticate while preserving pending status", async () => {
    const pendingDoctor = {
      ...activeUser,
      role: "DOCTOR",
      accountStatus: "PENDING_VERIFICATION",
    };

    mocks.userFindUnique.mockResolvedValue(pendingDoctor);
    mocks.comparePassword.mockResolvedValue(true);

    const result = await authService.login(loginInput);

    expect(result.token).toBe("caremate-test-jwt");
    expect(result.user.accountStatus).toBe("PENDING_VERIFICATION");
    expect(result.user.role).toBe("DOCTOR");
  });
});

describe("CareMate+ JWT authentication middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AUT-JWT-01: rejects a protected request without a Bearer token", async () => {
    const { next } = await runMiddleware();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      message: "Authentication token is required",
      statusCode: 401,
    });
  });

  it("AUT-JWT-02: rejects an invalid JWT with 401", async () => {
    mocks.verifyJwtToken.mockImplementation(() => {
      throw new Error("invalid token");
    });

    const { next } = await runMiddleware("Bearer invalid-token");

    expect(next.mock.calls[0]?.[0]).toMatchObject({
      message: "Invalid or expired authentication token",
      statusCode: 401,
    });
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("AUT-JWT-03: rejects a valid JWT when the referenced user no longer exists", async () => {
    mocks.verifyJwtToken.mockReturnValue({
      userId: "missing-user",
      role: "PATIENT",
    });
    mocks.userFindUnique.mockResolvedValue(null);

    const { next } = await runMiddleware("Bearer valid-token");

    expect(next.mock.calls[0]?.[0]).toMatchObject({
      message: "User not found",
      statusCode: 401,
    });
  });

  it("AUT-JWT-04: rejects an unverified user even when the JWT is valid", async () => {
    mocks.verifyJwtToken.mockReturnValue({
      userId: activeUser.id,
      role: activeUser.role,
    });
    mocks.userFindUnique.mockResolvedValue({
      ...activeUser,
      isEmailVerified: false,
    });

    const { next } = await runMiddleware("Bearer valid-token");

    expect(next.mock.calls[0]?.[0]).toMatchObject({
      message: "Please verify your email before continuing",
      statusCode: 403,
    });
  });

  it("AUT-JWT-05: rejects a disabled user even when the JWT is valid", async () => {
    mocks.verifyJwtToken.mockReturnValue({
      userId: activeUser.id,
      role: activeUser.role,
    });
    mocks.userFindUnique.mockResolvedValue({
      ...activeUser,
      accountStatus: "DISABLED",
    });

    const { next } = await runMiddleware("Bearer valid-token");

    expect(next.mock.calls[0]?.[0]).toMatchObject({
      message: "Your account has been disabled",
      statusCode: 403,
    });
  });

  it("AUT-JWT-06: rejects a rejected user even when the JWT is valid", async () => {
    mocks.verifyJwtToken.mockReturnValue({
      userId: activeUser.id,
      role: "DOCTOR",
    });
    mocks.userFindUnique.mockResolvedValue({
      ...activeUser,
      role: "DOCTOR",
      accountStatus: "REJECTED",
    });

    const { next } = await runMiddleware("Bearer valid-token");

    expect(next.mock.calls[0]?.[0]).toMatchObject({
      message: "Your account verification was rejected",
      statusCode: 403,
    });
  });

  it("AUT-JWT-07: authenticates a valid active user and attaches the user to the request", async () => {
    mocks.verifyJwtToken.mockReturnValue({
      userId: activeUser.id,
      role: activeUser.role,
    });
    mocks.userFindUnique.mockResolvedValue(activeUser);

    const { request, next } = await runMiddleware("Bearer valid-token");

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: activeUser.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        accountStatus: true,
        isEmailVerified: true,
      },
    });

expect((request as Request & { user: unknown }).user).toEqual(activeUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]).toEqual([]);
  });
});
