import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  assignmentFindFirst: vi.fn(),
  privacyFindUnique: vi.fn(),
  vitalFindFirst: vi.fn(),
  vitalFindMany: vi.fn(),
  medicineFindMany: vi.fn(),
  doseLogFindMany: vi.fn(),
  noteFindMany: vi.fn(),
  safetyAlertFindFirst: vi.fn(),
  consultationFindMany: vi.fn(),
  medicineReviewCount: vi.fn(),
  verifyJwtToken: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
    },
    patientDoctorAssignment: {
      findFirst: mocks.assignmentFindFirst,
    },
    patientPrivacyPreference: {
      findUnique: mocks.privacyFindUnique,
    },
    patientVitalReading: {
      findFirst: mocks.vitalFindFirst,
      findMany: mocks.vitalFindMany,
    },
    medicine: {
      findMany: mocks.medicineFindMany,
    },
    medicineDoseLog: {
      findMany: mocks.doseLogFindMany,
    },
    patientDoctorNote: {
      findMany: mocks.noteFindMany,
    },
    safetyAlert: {
      findFirst: mocks.safetyAlertFindFirst,
    },
    consultation: {
      findMany: mocks.consultationFindMany,
    },
    medicineReviewRequest: {
      count: mocks.medicineReviewCount,
    },
  },
}));

vi.mock("../src/utils/jwt.util.js", () => ({
  createJwtToken: vi.fn(),
  verifyJwtToken: mocks.verifyJwtToken,
}));

import { authMiddleware } from "../src/middleware/auth.middleware.js";
import { authorizeRoles } from "../src/middleware/role.middleware.js";
import { errorMiddleware } from "../src/middleware/error.middleware.js";
import { doctorPatientsController } from "../src/modules/doctor/doctor-patients.controller.js";

const app = express();
app.use(express.json());

app.get(
  "/api/v1/doctor/patients/:patientId",
  authMiddleware,
  authorizeRoles("DOCTOR"),
  doctorPatientsController.getPatientDetail,
);

app.use(errorMiddleware);

const doctorId = "11111111-1111-4111-8111-111111111111";
const patientId = "22222222-2222-4222-8222-222222222222";
const assignmentId = "33333333-3333-4333-8333-333333333333";

const authenticatedDoctor = {
  id: doctorId,
  fullName: "Dr Automated Test",
  email: "doctor@caremate.local",
  role: "DOCTOR",
  accountStatus: "APPROVED",
  isEmailVerified: true,
};

const approvedDoctor = {
  id: doctorId,
  role: "DOCTOR",
  accountStatus: "APPROVED",
  isEmailVerified: true,
};

const patientUser = {
  id: patientId,
  fullName: "API Relationship Patient",
  email: "patient@caremate.local",
  patientProfile: null,
};

const bearer = "Bearer doctor-test-token";

describe("CareMate+ Doctor-Patient API relationship security", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.verifyJwtToken.mockReturnValue({
      userId: doctorId,
      role: "DOCTOR",
    });
  });

  it("AUT-API-REL-01: rejects Patient detail access without JWT with 401", async () => {
    const response = await request(app)
      .get(`/api/v1/doctor/patients/${patientId}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication token is required",
    });

    expect(mocks.assignmentFindFirst).not.toHaveBeenCalled();
  });

  it("AUT-API-REL-02: rejects a valid authenticated non-Doctor role with 403", async () => {
    mocks.verifyJwtToken.mockReturnValue({
      userId: "44444444-4444-4444-8444-444444444444",
      role: "PATIENT",
    });

    mocks.userFindUnique.mockResolvedValueOnce({
      id: "44444444-4444-4444-8444-444444444444",
      fullName: "Wrong Role User",
      email: "wrongrole@caremate.local",
      role: "PATIENT",
      accountStatus: "ACTIVE",
      isEmailVerified: true,
    });

    const response = await request(app)
      .get(`/api/v1/doctor/patients/${patientId}`)
      .set("Authorization", bearer);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "You are not allowed to access this resource",
    });

    expect(mocks.assignmentFindFirst).not.toHaveBeenCalled();
  });

  it("AUT-API-REL-03: rejects an approved Doctor who is not assigned to the Patient with 403", async () => {
    mocks.userFindUnique
      .mockResolvedValueOnce(authenticatedDoctor)
      .mockResolvedValueOnce(approvedDoctor);

    mocks.assignmentFindFirst.mockResolvedValue(null);

    const response = await request(app)
      .get(`/api/v1/doctor/patients/${patientId}`)
      .set("Authorization", bearer);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "You are not assigned to this patient",
    });

    expect(mocks.assignmentFindFirst).toHaveBeenCalledWith({
      where: {
        doctorId,
        patientId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        assignmentType: true,
        createdAt: true,
      },
    });
  });

  it("AUT-API-REL-04: allows an approved Doctor with an ACTIVE Patient assignment", async () => {
    const assignedAt = new Date("2026-08-01T10:00:00.000Z");

    mocks.userFindUnique
      .mockResolvedValueOnce(authenticatedDoctor)
      .mockResolvedValueOnce(approvedDoctor)
      .mockResolvedValueOnce(patientUser);

    mocks.assignmentFindFirst.mockResolvedValue({
      id: assignmentId,
      assignmentType: "PRIMARY",
      createdAt: assignedAt,
    });

    mocks.privacyFindUnique.mockResolvedValue(null);
    mocks.vitalFindFirst.mockResolvedValue(null);
    mocks.vitalFindMany.mockResolvedValue([]);
    mocks.medicineFindMany.mockResolvedValue([]);
    mocks.doseLogFindMany.mockResolvedValue([]);
    mocks.noteFindMany.mockResolvedValue([]);
    mocks.safetyAlertFindFirst.mockResolvedValue(null);
    mocks.consultationFindMany.mockResolvedValue([]);
    mocks.medicineReviewCount.mockResolvedValue(0);

    const response = await request(app)
      .get(`/api/v1/doctor/patients/${patientId}`)
      .set("Authorization", bearer);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Patient detail fetched successfully",
    );

    expect(response.body.data.assignment).toMatchObject({
      id: assignmentId,
      assignmentType: "PRIMARY",
    });

    expect(response.body.data.patient).toMatchObject({
      id: patientId,
      fullName: "API Relationship Patient",
      email: "patient@caremate.local",
    });
  });

  it("AUT-API-REL-05: rejects an invalid Patient UUID with 400", async () => {
    mocks.userFindUnique.mockResolvedValueOnce(authenticatedDoctor);

    const response = await request(app)
      .get("/api/v1/doctor/patients/not-a-valid-uuid")
      .set("Authorization", bearer);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Valid patient ID is required",
    });

    expect(mocks.assignmentFindFirst).not.toHaveBeenCalled();
  });
});
