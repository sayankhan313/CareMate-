import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  comparePassword: vi.fn(),
  createJwtToken: vi.fn(),
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
  verifyJwtToken: vi.fn(),
}));

vi.mock("../src/modules/notification/notification.service.js", () => ({
  notificationService: {
    createAndSend: mocks.notificationCreateAndSend,
  },
}));

import authRoutes from "../src/modules/auth/auth.routes.js";
import { errorMiddleware } from "../src/middleware/error.middleware.js";

const app = express();
app.use(express.json());
app.use("/api/v1/auth", authRoutes);
app.use(errorMiddleware);

const activeUser = {
  id: "user-api-001",
  fullName: "API Test User",
  email: "api@caremate.local",
  passwordHash: "stored-hashed-password",
  role: "CAREGIVER",
  accountStatus: "ACTIVE",
  isEmailVerified: true,
};

const loginPayload = {
  email: "api@caremate.local",
  password: "ValidPassword123!",
};

describe("CareMate+ authentication API regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createJwtToken.mockReturnValue("api-test-jwt-token");
  });

  it("AUT-API-AUTH-01: POST /login returns 200 and JWT for valid credentials", async () => {
    mocks.userFindUnique.mockResolvedValue(activeUser);
    mocks.comparePassword.mockResolvedValue(true);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(loginPayload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Login successful",
      data: {
        token: "api-test-jwt-token",
        user: {
          id: activeUser.id,
          fullName: activeUser.fullName,
          email: activeUser.email,
          role: activeUser.role,
          accountStatus: activeUser.accountStatus,
          isEmailVerified: true,
        },
      },
    });

    expect(mocks.createJwtToken).toHaveBeenCalledWith({
      userId: activeUser.id,
      role: activeUser.role,
    });
  });

  it("AUT-API-AUTH-02: normalizes email before authentication", async () => {
    mocks.userFindUnique.mockResolvedValue(activeUser);
    mocks.comparePassword.mockResolvedValue(true);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "  API@CAREMATE.LOCAL  ",
        password: loginPayload.password,
      });

    expect(response.status).toBe(200);
    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { email: "api@caremate.local" },
    });
  });

  it("AUT-API-AUTH-03: returns 401 for an unknown email", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(loginPayload);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid email or password",
    });
    expect(mocks.createJwtToken).not.toHaveBeenCalled();
  });

  it("AUT-API-AUTH-04: returns 401 for an incorrect password", async () => {
    mocks.userFindUnique.mockResolvedValue(activeUser);
    mocks.comparePassword.mockResolvedValue(false);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(loginPayload);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid email or password",
    });
    expect(mocks.createJwtToken).not.toHaveBeenCalled();
  });

  it("AUT-API-AUTH-05: returns 403 for an unverified account", async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...activeUser,
      isEmailVerified: false,
    });
    mocks.comparePassword.mockResolvedValue(true);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(loginPayload);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Please verify your email before logging in",
    });
    expect(mocks.createJwtToken).not.toHaveBeenCalled();
  });

  it("AUT-API-AUTH-06: returns 403 for a disabled account", async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...activeUser,
      accountStatus: "DISABLED",
    });
    mocks.comparePassword.mockResolvedValue(true);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(loginPayload);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Your account has been disabled",
    });
    expect(mocks.createJwtToken).not.toHaveBeenCalled();
  });

  it("AUT-API-AUTH-07: returns 403 for a rejected professional account", async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...activeUser,
      role: "DOCTOR",
      accountStatus: "REJECTED",
    });
    mocks.comparePassword.mockResolvedValue(true);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(loginPayload);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Your account verification was rejected",
    });
    expect(mocks.createJwtToken).not.toHaveBeenCalled();
  });

  it("AUT-API-AUTH-08: allows a verified pending professional to login while preserving pending status", async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...activeUser,
      role: "DOCTOR",
      accountStatus: "PENDING_VERIFICATION",
    });
    mocks.comparePassword.mockResolvedValue(true);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(loginPayload);

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBe("api-test-jwt-token");
    expect(response.body.data.user.role).toBe("DOCTOR");
    expect(response.body.data.user.accountStatus).toBe("PENDING_VERIFICATION");
  });
});
