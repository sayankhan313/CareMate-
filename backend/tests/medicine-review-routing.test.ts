import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assignmentFindMany: vi.fn(),
  availabilityFindMany: vi.fn(),
  reviewFindUnique: vi.fn(),
  transaction: vi.fn(),
  txMedicineCreate: vi.fn(),
  txReviewCreate: vi.fn(),
  txMedicineFindUnique: vi.fn(),
  notificationCreateAndSend: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    patientDoctorAssignment: {
      findMany: mocks.assignmentFindMany,
    },
    doctorAvailability: {
      findMany: mocks.availabilityFindMany,
    },
    medicineReviewRequest: {
      findUnique: mocks.reviewFindUnique,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("../src/modules/notification/notification.service.js", () => ({
  notificationService: {
    createAndSend: mocks.notificationCreateAndSend,
  },
}));

import { medicineService } from "../src/modules/patient/medicine.service.js";

const patientId = "11111111-1111-4111-8111-111111111111";
const primaryDoctorId = "22222222-2222-4222-8222-222222222222";
const alternateDoctorId = "33333333-3333-4333-8333-333333333333";
const medicineId = "44444444-4444-4444-8444-444444444444";
const reviewRequestId = "55555555-5555-4555-8555-555555555555";

const primaryDoctor = {
  id: primaryDoctorId,
  fullName: "Dr Primary",
  email: "primary@caremate.local",
};

const alternateDoctor = {
  id: alternateDoctorId,
  fullName: "Dr Alternate",
  email: "alternate@caremate.local",
};

const primaryAssignment = {
  assignmentType: "PRIMARY",
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
  doctor: primaryDoctor,
};

const alternateAssignment = {
  assignmentType: "SECONDARY",
  createdAt: new Date("2026-08-02T10:00:00.000Z"),
  doctor: alternateDoctor,
};

const createInput = {
  name: "Amoxicillin",
  dose: "500 mg",
  doseQuantity: 1,
  doseUnit: "capsule",
  frequency: "THREE_TIMES_DAILY" as const,
  timeOfDay: "08:00",
  selectedTimes: ["08:00", "13:00", "20:00"],
  startDate: "31/08/2026",
  sendToDoctorForReview: true,
  hasMedicineOnHand: true,
  currentStock: 21,
  stockUnit: "capsules",
  lowStockThreshold: 3,
};

const tx = {
  medicine: {
    create: mocks.txMedicineCreate,
    findUnique: mocks.txMedicineFindUnique,
  },
  medicineReviewRequest: {
    create: mocks.txReviewCreate,
  },
};

const makeMedicineResult = (reviewDoctorId: string | null) => ({
  id: medicineId,
  patientId,
  name: "Amoxicillin",
  dose: "500 mg",
  doseQuantity: 1,
  doseUnit: "capsule",
  instructions: null,
  source: "MANUAL",
  isActive: false,
  hasMedicineOnHand: true,
  currentStock: 21,
  stockUnit: "capsules",
  lowStockThreshold: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
  reminders: [
    {
      id: "66666666-6666-4666-8666-666666666666",
      frequency: "THREE_TIMES_DAILY",
      customFrequency: null,
      timeOfDay: "08:00",
      startDate: new Date("2026-08-31T00:00:00.000Z"),
      endDate: null,
      sendToDoctorForReview: true,
      reviewStatus: "PENDING",
      reviewDoctorId,
      reviewedByDoctorId: null,
      reviewedAt: null,
      reviewNote: null,
      reviewDoctor: null,
      reviewedByDoctor: null,
      isActive: false,
    },
  ],
  reviewRequests: [],
});

describe("CareMate+ availability-aware medicine review routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    mocks.txMedicineCreate.mockResolvedValue({
      id: medicineId,
    });

    mocks.txReviewCreate.mockResolvedValue({
      id: reviewRequestId,
    });

    // Prevent notification side effects from affecting routing tests.
    mocks.reviewFindUnique.mockResolvedValue(null);
  });

  it("AUT-ROUTE-01: assigns the PRIMARY Doctor when they are not OUT_OF_OFFICE", async () => {
    mocks.assignmentFindMany.mockResolvedValue([
      alternateAssignment,
      primaryAssignment,
    ]);

    mocks.availabilityFindMany.mockResolvedValue([
      {
        doctorId: primaryDoctorId,
        status: "AVAILABLE",
      },
      {
        doctorId: alternateDoctorId,
        status: "AVAILABLE",
      },
    ]);

    mocks.txMedicineFindUnique.mockResolvedValue(
      makeMedicineResult(primaryDoctorId),
    );

    await medicineService.createMedicine(
      patientId,
      createInput,
    );

    expect(mocks.txReviewCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        patientId,
        doctorId: primaryDoctorId,
        medicineId,
        requestType: "ADD",
        status: "PENDING",
        routingStatus: "ASSIGNED",
        attemptedDoctorIds: [],
        escalatedAt: null,
      }),
      select: {
        id: true,
      },
    });
  });

  it("AUT-ROUTE-02: skips an OUT_OF_OFFICE PRIMARY Doctor and assigns an eligible alternate Doctor", async () => {
    mocks.assignmentFindMany.mockResolvedValue([
      primaryAssignment,
      alternateAssignment,
    ]);

    mocks.availabilityFindMany.mockResolvedValue([
      {
        doctorId: primaryDoctorId,
        status: "OUT_OF_OFFICE",
      },
      {
        doctorId: alternateDoctorId,
        status: "AVAILABLE",
      },
    ]);

    mocks.txMedicineFindUnique.mockResolvedValue(
      makeMedicineResult(alternateDoctorId),
    );

    await medicineService.createMedicine(
      patientId,
      createInput,
    );

    expect(mocks.txReviewCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        doctorId: alternateDoctorId,
        routingStatus: "ASSIGNED",
        attemptedDoctorIds: [primaryDoctorId],
        escalatedAt: null,
      }),
      select: {
        id: true,
      },
    });
  });

  it("AUT-ROUTE-03: routes to ADMIN_REVIEW_REQUIRED when all assigned Doctors are OUT_OF_OFFICE", async () => {
    mocks.assignmentFindMany.mockResolvedValue([
      primaryAssignment,
      alternateAssignment,
    ]);

    mocks.availabilityFindMany.mockResolvedValue([
      {
        doctorId: primaryDoctorId,
        status: "OUT_OF_OFFICE",
      },
      {
        doctorId: alternateDoctorId,
        status: "OUT_OF_OFFICE",
      },
    ]);

    mocks.txMedicineFindUnique.mockResolvedValue(
      makeMedicineResult(null),
    );

    await medicineService.createMedicine(
      patientId,
      createInput,
    );

    const reviewCall =
      mocks.txReviewCreate.mock.calls[0]?.[0];

    expect(reviewCall.data.doctorId).toBeNull();
    expect(reviewCall.data.routingStatus).toBe(
      "ADMIN_REVIEW_REQUIRED",
    );

    expect(reviewCall.data.attemptedDoctorIds).toEqual([
      primaryDoctorId,
      alternateDoctorId,
    ]);

    expect(reviewCall.data.escalatedAt).toBeInstanceOf(Date);
  });

  it("AUT-ROUTE-04: routes directly to ADMIN_REVIEW_REQUIRED when the Patient has no eligible Doctor assignment", async () => {
    mocks.assignmentFindMany.mockResolvedValue([]);

    mocks.txMedicineFindUnique.mockResolvedValue(
      makeMedicineResult(null),
    );

    await medicineService.createMedicine(
      patientId,
      createInput,
    );

    const reviewCall =
      mocks.txReviewCreate.mock.calls[0]?.[0];

    expect(reviewCall.data.doctorId).toBeNull();
    expect(reviewCall.data.routingStatus).toBe(
      "ADMIN_REVIEW_REQUIRED",
    );
    expect(reviewCall.data.attemptedDoctorIds).toEqual([]);
    expect(reviewCall.data.escalatedAt).toBeInstanceOf(Date);

    expect(mocks.availabilityFindMany).not.toHaveBeenCalled();
  });

  it("AUT-ROUTE-05: treats a Doctor without an explicit OUT_OF_OFFICE record as eligible", async () => {
    mocks.assignmentFindMany.mockResolvedValue([
      primaryAssignment,
      alternateAssignment,
    ]);

    mocks.availabilityFindMany.mockResolvedValue([]);

    mocks.txMedicineFindUnique.mockResolvedValue(
      makeMedicineResult(primaryDoctorId),
    );

    await medicineService.createMedicine(
      patientId,
      createInput,
    );

    const reviewCall =
      mocks.txReviewCreate.mock.calls[0]?.[0];

    expect(reviewCall.data.doctorId).toBe(primaryDoctorId);
    expect(reviewCall.data.routingStatus).toBe("ASSIGNED");
    expect(reviewCall.data.attemptedDoctorIds).toEqual([]);
  });
});
