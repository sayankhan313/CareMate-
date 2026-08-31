import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/middleware/auth.middleware.js", () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    const role = req.headers["x-test-role"];

    if (typeof role === "string" && role !== "NONE") {
      req.user = {
        id: "11111111-1111-4111-8111-111111111111",
        fullName: "API Security Test User",
        email: "security@caremate.local",
        role,
        accountStatus: "ACTIVE",
        isEmailVerified: true,
      };
    }

    next();
  },
}));

vi.mock("../src/modules/admin/admin.controller.js", () => {
  const successHandler = (_req: any, res: any) =>
    res.status(200).json({
      success: true,
      data: { access: "ADMIN_ALLOWED" },
    });

  return {
    adminController: {
      getDashboard: successHandler,
      listMedicineReviewEscalations: successHandler,
      getMedicineReviewEscalation: successHandler,
      assignMedicineReviewEscalation: successHandler,
      listMedicineReviewPoolAssignments: successHandler,
      listCompletedMedicineReviewPoolReviews: successHandler,
      releaseMedicineReviewPoolResult: successHandler,
      listDoctorVerifications: successHandler,
      getDoctorVerification: successHandler,
      approveDoctorVerification: successHandler,
      rejectDoctorVerification: successHandler,
      listPharmacyVerifications: successHandler,
      getPharmacyVerification: successHandler,
      approvePharmacyVerification: successHandler,
      rejectPharmacyVerification: successHandler,
      listUsers: successHandler,
      suspendUser: successHandler,
      reactivateUser: successHandler,
    },
  };
});

vi.mock("../src/modules/audit/admin-audit.controller.js", () => {
  const successHandler = (_req: any, res: any) =>
    res.status(200).json({
      success: true,
      data: { access: "ADMIN_ALLOWED" },
    });

  return {
    adminAuditController: {
      listAuditLogs: successHandler,
      getAuditLogDetail: successHandler,
    },
  };
});

import adminRouter from "../src/modules/admin/admin.routes.js";

const app = express();
app.use(express.json());
app.use("/admin", adminRouter);

app.use((error: any, _req: any, res: any, _next: any) => {
  return res.status(error?.statusCode || error?.status || 500).json({
    success: false,
    message: error?.message || "Internal server error",
  });
});

describe("CareMate+ Administrator API role boundary", () => {
  it("AUT-ADMIN-API-01: blocks a PATIENT from Admin routes", async () => {
    const response = await request(app).get("/admin/dashboard").set("x-test-role", "PATIENT");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("AUT-ADMIN-API-02: blocks a DOCTOR from Admin routes", async () => {
    const response = await request(app).get("/admin/dashboard").set("x-test-role", "DOCTOR");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("AUT-ADMIN-API-03: blocks a CAREGIVER from Admin routes", async () => {
    const response = await request(app).get("/admin/dashboard").set("x-test-role", "CAREGIVER");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("AUT-ADMIN-API-04: blocks a PHARMACY from Admin routes", async () => {
    const response = await request(app).get("/admin/dashboard").set("x-test-role", "PHARMACY");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("AUT-ADMIN-API-05: allows an ADMIN to access the protected dashboard route", async () => {
    const response = await request(app).get("/admin/dashboard").set("x-test-role", "ADMIN");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { access: "ADMIN_ALLOWED" },
    });
  });

  it("AUT-ADMIN-API-06: blocks a DOCTOR from an Admin medicine-review assignment mutation", async () => {
    const response = await request(app)
      .patch("/admin/medicine-review-escalations/55555555-5555-4555-8555-555555555555/assign")
      .set("x-test-role", "DOCTOR")
      .send({ doctorId: "22222222-2222-4222-8222-222222222222" });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("AUT-ADMIN-API-07: allows an ADMIN through the medicine-review assignment route boundary", async () => {
    const response = await request(app)
      .patch("/admin/medicine-review-escalations/55555555-5555-4555-8555-555555555555/assign")
      .set("x-test-role", "ADMIN")
      .send({ doctorId: "22222222-2222-4222-8222-222222222222" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
