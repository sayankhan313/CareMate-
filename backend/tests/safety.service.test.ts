import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assignmentFindFirst: vi.fn(),
  safetyPreferenceUpsert: vi.fn(),
  safetyAlertFindFirst: vi.fn(),
  safetyAlertCreate: vi.fn(),
  safetyAlertUpdate: vi.fn(),
  vitalFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
  notificationFindFirst: vi.fn(),
  caregiverRelationshipFindMany: vi.fn(),
  notificationCreateAndSend: vi.fn(),
  createEmergencyConsultation: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    patientDoctorAssignment: {
      findFirst: mocks.assignmentFindFirst,
    },
    patientSafetyPreference: {
      upsert: mocks.safetyPreferenceUpsert,
    },
    safetyAlert: {
      findFirst: mocks.safetyAlertFindFirst,
      create: mocks.safetyAlertCreate,
      update: mocks.safetyAlertUpdate,
    },
    patientVitalReading: {
      findFirst: mocks.vitalFindFirst,
    },
    user: {
      findFirst: mocks.userFindFirst,
    },
    userNotification: {
      findFirst: mocks.notificationFindFirst,
    },
    patientCaregiverRelationship: {
      findMany: mocks.caregiverRelationshipFindMany,
    },
  },
}));

vi.mock("../src/modules/notification/notification.service.js", () => ({
  notificationService: {
    createAndSend: mocks.notificationCreateAndSend,
  },
}));

vi.mock("../src/modules/patient/consultation.service.js", () => ({
  consultationService: {
    createEmergencyConsultationFromAlert:
      mocks.createEmergencyConsultation,
  },
}));

import { safetyService } from "../src/modules/patient/safety.service.js";

const patientId = "11111111-1111-4111-8111-111111111111";
const doctorId = "22222222-2222-4222-8222-222222222222";
const alertId = "33333333-3333-4333-8333-333333333333";
const vitalId = "44444444-4444-4444-8444-444444444444";

const primaryDoctor = {
  id: doctorId,
  fullName: "Dr Safety Test",
  email: "doctor@caremate.local",
};

const preferences = {
  countdownSeconds: 30,
  notifyAssignedDoctors: false,
  shareLatestVitalsOnEscalation: true,
  notifyEmergencyContact: true,
};

const criticalVital = {
  id: vitalId,
  patientId,
  status: "CRITICAL",
  heartRate: 145,
  spo2: 85,
  bpSystolic: null,
  bpDiastolic: null,
  glucose: null,
  temperature: null,
  source: "SIMULATED",
  deviceSource: null,
  recordedAt: new Date(),
};

const makeAlert = (
  status = "ACTIVE",
  overrides: Record<string, unknown> = {},
) => ({
  id: alertId,
  patientId,
  doctorId,
  vitalReadingId: vitalId,
  status,
  reason: "Critical vital reading detected.",
  timerEndsAt: new Date(Date.now() + 30_000),
  cancelledAt: null,
  escalatedAt: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  doctor: primaryDoctor,
  vitalReading: criticalVital,
  consultation: null,
  ...overrides,
});

describe("CareMate+ Safety Response business rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.assignmentFindFirst.mockResolvedValue({
      doctor: primaryDoctor,
    });

    mocks.safetyPreferenceUpsert.mockResolvedValue(preferences);
    mocks.caregiverRelationshipFindMany.mockResolvedValue([]);
    mocks.userFindFirst.mockResolvedValue({
      id: patientId,
      fullName: "Safety Test Patient",
    });
  });

  it("AUT-SAF-01: creates an ACTIVE Safety Response from the Patient's CRITICAL vital", async () => {
    mocks.safetyAlertFindFirst.mockResolvedValue(null);
    mocks.vitalFindFirst.mockResolvedValue(criticalVital);
    mocks.safetyAlertCreate.mockImplementation(async ({ data }) =>
      makeAlert("ACTIVE", {
        doctorId: data.doctorId,
        vitalReadingId: data.vitalReadingId,
        reason: data.reason,
        timerEndsAt: data.timerEndsAt,
      }),
    );

    const result = await safetyService.createSafetyAlert(patientId, {
      vitalReadingId: vitalId,
      reason: "Critical SpO2 detected",
    });

    expect(mocks.vitalFindFirst).toHaveBeenCalledWith({
      where: {
        id: vitalId,
        patientId,
      },
    });

    expect(result.status).toBe("ACTIVE");
    expect(result.patientId).toBe(patientId);
    expect(result.doctorId).toBe(doctorId);
    expect(result.vitalReadingId).toBe(vitalId);

    expect(mocks.safetyAlertCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId,
          doctorId,
          vitalReadingId: vitalId,
          status: "ACTIVE",
          reason: "Critical SpO2 detected",
        }),
      }),
    );
  });

  it("AUT-SAF-02: rejects a non-critical vital reading with 400", async () => {
    mocks.safetyAlertFindFirst.mockResolvedValue(null);

    mocks.vitalFindFirst.mockResolvedValue({
      ...criticalVital,
      status: "STABLE",
    });

    await expect(
      safetyService.createSafetyAlert(patientId, {
        vitalReadingId: vitalId,
      }),
    ).rejects.toMatchObject({
      message:
        "Safety response can only be started for critical vitals.",
      statusCode: 400,
    });

    expect(mocks.safetyAlertCreate).not.toHaveBeenCalled();
  });

  it("AUT-SAF-03: rejects a vital reading that does not belong to the Patient", async () => {
    mocks.safetyAlertFindFirst.mockResolvedValue(null);
    mocks.vitalFindFirst.mockResolvedValue(null);

    await expect(
      safetyService.createSafetyAlert(patientId, {
        vitalReadingId: vitalId,
      }),
    ).rejects.toMatchObject({
      message: "Vital reading not found.",
      statusCode: 404,
    });

    expect(mocks.vitalFindFirst).toHaveBeenCalledWith({
      where: {
        id: vitalId,
        patientId,
      },
    });

    expect(mocks.safetyAlertCreate).not.toHaveBeenCalled();
  });

  it("AUT-SAF-04: reuses an existing ACTIVE alert instead of creating a duplicate", async () => {
    const existingAlert = makeAlert("ACTIVE");

    mocks.safetyAlertFindFirst.mockResolvedValue(existingAlert);

    const result = await safetyService.createSafetyAlert(patientId, {
      vitalReadingId: vitalId,
    });

    expect(result.id).toBe(alertId);
    expect(result.status).toBe("ACTIVE");

    expect(mocks.vitalFindFirst).not.toHaveBeenCalled();
    expect(mocks.safetyAlertCreate).not.toHaveBeenCalled();
  });

  it("AUT-SAF-05: cancels an ACTIVE Safety Response", async () => {
    mocks.safetyAlertFindFirst.mockResolvedValue(
      makeAlert("ACTIVE"),
    );

    mocks.safetyAlertUpdate.mockImplementation(async ({ data }) =>
      makeAlert("CANCELLED", {
        status: data.status,
        cancelledAt: data.cancelledAt,
      }),
    );

    const result = await safetyService.cancelSafetyAlert(
      patientId,
      alertId,
    );

    expect(result.status).toBe("CANCELLED");
    expect(result.cancelledAt).toBeInstanceOf(Date);

    expect(mocks.safetyAlertUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: alertId,
        },
        data: expect.objectContaining({
          status: "CANCELLED",
        }),
      }),
    );
  });

  it("AUT-SAF-06: rejects cancellation when the Safety Response is no longer ACTIVE", async () => {
    mocks.safetyAlertFindFirst.mockResolvedValue(
      makeAlert("ESCALATED"),
    );

    await expect(
      safetyService.cancelSafetyAlert(patientId, alertId),
    ).rejects.toMatchObject({
      message: "Only active safety alerts can be cancelled.",
      statusCode: 400,
    });

    expect(mocks.safetyAlertUpdate).not.toHaveBeenCalled();
  });

  it("AUT-SAF-07: rejects escalation of a CANCELLED Safety Response", async () => {
    mocks.safetyAlertFindFirst.mockResolvedValue(
      makeAlert("CANCELLED"),
    );

    await expect(
      safetyService.escalateSafetyAlert(patientId, alertId),
    ).rejects.toMatchObject({
      message: "Cancelled safety alerts cannot be escalated.",
      statusCode: 400,
    });

    expect(
      mocks.createEmergencyConsultation,
    ).not.toHaveBeenCalled();
  });

  it("AUT-SAF-08: rejects escalation of a RESOLVED Safety Response", async () => {
    mocks.safetyAlertFindFirst.mockResolvedValue(
      makeAlert("RESOLVED"),
    );

    await expect(
      safetyService.escalateSafetyAlert(patientId, alertId),
    ).rejects.toMatchObject({
      message: "Resolved safety alerts cannot be escalated.",
      statusCode: 400,
    });

    expect(
      mocks.createEmergencyConsultation,
    ).not.toHaveBeenCalled();
  });

  it("AUT-SAF-09: blocks escalation when no active primary Doctor is assigned", async () => {
    mocks.safetyAlertFindFirst.mockResolvedValue(
      makeAlert("ACTIVE"),
    );

    mocks.assignmentFindFirst.mockResolvedValue(null);

    await expect(
      safetyService.escalateSafetyAlert(patientId, alertId),
    ).rejects.toMatchObject({
      message:
        "No active primary doctor is assigned. Please assign a primary doctor before escalation.",
      statusCode: 400,
    });

    expect(mocks.safetyAlertUpdate).not.toHaveBeenCalled();
    expect(
      mocks.createEmergencyConsultation,
    ).not.toHaveBeenCalled();
  });

  it("AUT-SAF-10: escalates an active Safety Response and creates an emergency consultation", async () => {
    const activeAlert = makeAlert("ACTIVE");

    mocks.safetyAlertFindFirst.mockResolvedValue(activeAlert);

    mocks.safetyAlertUpdate.mockImplementation(async ({ data }) =>
      makeAlert("ESCALATED", {
        doctorId: data.doctorId,
        status: data.status,
        escalatedAt: data.escalatedAt,
      }),
    );

    mocks.createEmergencyConsultation.mockResolvedValue({
      consultation: {
        id: "55555555-5555-4555-8555-555555555555",
        patientId,
        doctorId,
        safetyAlertId: alertId,
        type: "EMERGENCY",
        status: "PENDING",
      },
    });

    const result = await safetyService.escalateSafetyAlert(
      patientId,
      alertId,
    );

    expect(result.alert.status).toBe("ESCALATED");
    expect(result.alert.doctorId).toBe(doctorId);

    expect(mocks.safetyAlertUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: alertId,
        },
        data: expect.objectContaining({
          doctorId,
          status: "ESCALATED",
        }),
      }),
    );

    expect(
      mocks.createEmergencyConsultation,
    ).toHaveBeenCalledWith(
      patientId,
      alertId,
      doctorId,
    );

    expect(result.consultation).toMatchObject({
      patientId,
      doctorId,
      safetyAlertId: alertId,
      type: "EMERGENCY",
    });
  });
});
