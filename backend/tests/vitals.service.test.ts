import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  vitalCreate: vi.fn(),
  vitalFindFirst: vi.fn(),
  vitalFindMany: vi.fn(),
  notificationFindFirst: vi.fn(),
  notificationCreateAndSend: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    patientVitalReading: {
      create: mocks.vitalCreate,
      findFirst: mocks.vitalFindFirst,
      findMany: mocks.vitalFindMany,
    },
    userNotification: {
      findFirst: mocks.notificationFindFirst,
    },
  },
}));

vi.mock("../src/modules/notification/notification.service.js", () => ({
  notificationService: {
    createAndSend: mocks.notificationCreateAndSend,
  },
}));

import { vitalsService } from "../src/modules/patient/vitals.service.js";

const patientId = "11111111-1111-4111-8111-111111111111";
const readingId = "22222222-2222-4222-8222-222222222222";

describe("CareMate+ vital classification and Patient ownership rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.vitalCreate.mockImplementation(async ({ data }) => ({
      id: readingId,
      ...data,
      createdAt: new Date("2026-08-31T17:00:00.000Z"),
    }));

    mocks.notificationFindFirst.mockResolvedValue(null);
    mocks.notificationCreateAndSend.mockResolvedValue(undefined);
  });

  it("AUT-VITAL-01: classifies normal vital measurements as STABLE", async () => {
    const result = await vitalsService.createReading(patientId, {
      heartRate: 72,
      spo2: 98,
      bpSystolic: 120,
      bpDiastolic: 80,
      glucose: 100,
      temperature: 36.8,
      source: "MANUAL",
    } as any);

    expect(result.status).toBe("STABLE");

    expect(mocks.vitalCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        patientId,
        heartRate: 72,
        spo2: 98,
        bpSystolic: 120,
        bpDiastolic: 80,
        glucose: 100,
        temperature: 36.8,
        status: "STABLE",
        source: "MANUAL",
      }),
    });

    expect(mocks.notificationCreateAndSend).not.toHaveBeenCalled();
  });

  it("AUT-VITAL-02: classifies a borderline abnormal measurement as WARNING", async () => {
    const result = await vitalsService.createReading(patientId, {
      heartRate: 115,
      spo2: 98,
      source: "MANUAL",
    } as any);

    expect(result.status).toBe("WARNING");

    expect(mocks.vitalCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        patientId,
        heartRate: 115,
        spo2: 98,
        status: "WARNING",
      }),
    });

    expect(mocks.notificationCreateAndSend).not.toHaveBeenCalled();
  });

  it("AUT-VITAL-03: classifies a dangerous measurement as CRITICAL and triggers the Patient alert notification", async () => {
    const result = await vitalsService.createReading(patientId, {
      heartRate: 72,
      spo2: 88,
      source: "MANUAL",
      recordedAt: "2026-08-31T16:30:00.000Z",
    } as any);

    expect(result.status).toBe("CRITICAL");

    expect(mocks.notificationFindFirst).toHaveBeenCalledWith({
      where: {
        userId: patientId,
        type: "CRITICAL_VITAL_DETECTED",
        entityType: "PATIENT_VITAL_READING",
        entityId: readingId,
      },
      select: {
        id: true,
      },
    });

    expect(mocks.notificationCreateAndSend).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: patientId,
        type: "CRITICAL_VITAL_DETECTED",
        priority: "CRITICAL",
        entityType: "PATIENT_VITAL_READING",
        entityId: readingId,
        targetScreen: "PatientVitals",
        data: expect.objectContaining({
          vitalReadingId: readingId,
          patientId,
          status: "CRITICAL",
          spo2: 88,
        }),
      }),
    );
  });

  it("AUT-VITAL-04: CRITICAL classification takes precedence when a reading also satisfies WARNING thresholds", async () => {
    const result = await vitalsService.createReading(patientId, {
      heartRate: 115,
      temperature: 39.2,
      source: "MANUAL",
    } as any);

    expect(result.status).toBe("CRITICAL");

    expect(mocks.vitalCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        heartRate: 115,
        temperature: 39.2,
        status: "CRITICAL",
      }),
    });
  });

  it("AUT-VITAL-05: rejects an invalid recordedAt value before persisting the reading", async () => {
    await expect(
      vitalsService.createReading(patientId, {
        heartRate: 72,
        source: "MANUAL",
        recordedAt: "not-a-valid-date",
      } as any),
    ).rejects.toMatchObject({
      message: "Please provide a valid recordedAt date/time.",
      statusCode: 400,
    });

    expect(mocks.vitalCreate).not.toHaveBeenCalled();
  });

  it("AUT-VITAL-06: preserves Patient ownership and reading source while normalising deviceSource", async () => {
    const result = await vitalsService.createReading(patientId, {
      heartRate: 70,
      spo2: 97,
      source: "HEALTH_CONNECT",
      deviceSource: " Samsung Health ",
      recordedAt: "2026-08-31T15:00:00.000Z",
    } as any);

    expect(mocks.vitalCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        patientId,
        source: "HEALTH_CONNECT",
        deviceSource: "Samsung Health",
        recordedAt: new Date("2026-08-31T15:00:00.000Z"),
      }),
    });

    expect(result.source).toBe("HEALTH_CONNECT");
    expect(result.deviceSource).toBe("Samsung Health");
  });

  it("AUT-VITAL-07: scopes latest-reading and history queries to the authenticated Patient ID", async () => {
    const firstReading = {
      id: readingId,
      patientId,
      heartRate: 72,
      spo2: 98,
      bpSystolic: null,
      bpDiastolic: null,
      glucose: null,
      temperature: null,
      status: "STABLE",
      source: "MANUAL",
      deviceSource: null,
      recordedAt: new Date(),
      createdAt: new Date(),
    };

    mocks.vitalFindFirst.mockResolvedValue(firstReading);
    mocks.vitalFindMany.mockResolvedValue([firstReading]);

    const latest = await vitalsService.getLatestReading(patientId);
    const history = await vitalsService.getReadingHistory(
      patientId,
      { limit: 20 } as any,
    );

    expect(mocks.vitalFindFirst).toHaveBeenCalledWith({
      where: {
        patientId,
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    expect(mocks.vitalFindMany).toHaveBeenCalledWith({
      where: {
        patientId,
      },
      orderBy: {
        recordedAt: "desc",
      },
      take: 20,
    });

    expect(latest?.id).toBe(readingId);
    expect(history).toHaveLength(1);
  });
});
