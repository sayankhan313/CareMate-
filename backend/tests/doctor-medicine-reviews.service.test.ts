import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  assignmentFindFirst: vi.fn(),
  assignmentFindMany: vi.fn(),

  reviewFindFirst: vi.fn(),
  reviewFindMany: vi.fn(),
  reviewCount: vi.fn(),
  reviewUpdateMany: vi.fn(),

  userNotificationFindFirst: vi.fn(),
  notificationCreateAndSend: vi.fn(),

  txReviewUpdateMany: vi.fn(),
  txReminderUpdateMany: vi.fn(),
  txMedicineUpdate: vi.fn(),

  pharmacySyncDecision: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
    },
    patientDoctorAssignment: {
      findFirst: mocks.assignmentFindFirst,
      findMany: mocks.assignmentFindMany,
    },
    medicineReviewRequest: {
      findFirst: mocks.reviewFindFirst,
      findMany: mocks.reviewFindMany,
      count: mocks.reviewCount,
      updateMany: mocks.reviewUpdateMany,
    },
    userNotification: {
      findFirst: mocks.userNotificationFindFirst,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("../src/modules/notification/notification.service.js", () => ({
  notificationService: {
    createAndSend: mocks.notificationCreateAndSend,
  },
}));

vi.mock("../src/modules/medicine/medicine-review-pharmacy-sync.service.js", () => ({
  medicineReviewPharmacySyncService: {
    syncDecision: mocks.pharmacySyncDecision,
  },
}));

import { doctorMedicineReviewsService } from "../src/modules/doctor/doctor-medicine-reviews.service.js";

const doctorId = "11111111-1111-4111-8111-111111111111";
const patientId = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";
const medicineId = "44444444-4444-4444-8444-444444444444";

const doctor = {
  id: doctorId,
  fullName: "Automated Review Doctor",
  email: "reviewdoctor@caremate.local",
  role: "DOCTOR",
  accountStatus: "APPROVED",
  isEmailVerified: true,
};

const assignment = {
  id: "55555555-5555-4555-8555-555555555555",
};

const reminder = {
  id: "66666666-6666-4666-8666-666666666666",
  frequency: "ONCE_DAILY",
  customFrequency: null,
  timeOfDay: "08:00",
  startDate: new Date("2026-08-01T00:00:00.000Z"),
  endDate: null,
};

const makeReview = ({
  status = "PENDING",
  requestType = "ADD",
  routingStatus = "ASSIGNED",
  doctorIdValue = doctorId,
  reviewedByDoctorId = null,
  reviewedByDoctor = null,
  doctorNote = null,
}: {
  status?: string;
  requestType?: string;
  routingStatus?: string;
  doctorIdValue?: string | null;
  reviewedByDoctorId?: string | null;
  reviewedByDoctor?: unknown;
  doctorNote?: string | null;
} = {}) => ({
  id: requestId,
  medicineId,
  patientId,
  doctorId: doctorIdValue,
  reviewedByDoctorId,
  requestType,
  status,
  routingStatus,
  patientReason: null,
  doctorNote,
  reviewedAt: status === "PENDING" ? null : new Date(),
  patientSeenAt: null,
  appliedAt: null,
  createdAt: new Date("2026-08-20T10:00:00.000Z"),
  updatedAt: new Date("2026-08-20T10:00:00.000Z"),
  patient: {
    id: patientId,
    fullName: "Review Test Patient",
    email: "patient@caremate.local",
  },
  medicine: {
    id: medicineId,
    name: "Paracetamol",
    dose: "500 mg",
    instructions: "Take as directed",
    source: "SCANNER",
    isActive: false,
    reminders: [reminder],
  },
  reviewedByDoctor,
});

const makePoolReview = ({
  routingStatus = "POOL_ASSIGNED",
  poolDecision = null,
}: {
  routingStatus?: string;
  poolDecision?: string | null;
} = {}) => ({
  id: requestId,
  medicineId,
  patientId,
  requestType: "ADD",
  status: "PENDING",
  routingStatus,
  patientReason: null,
  poolDoctorId: doctorId,
  poolDecision,
  poolDoctorNote: null,
  poolAssignedAt: new Date(),
  poolReviewedAt: routingStatus === "POOL_REVIEW_COMPLETED" ? new Date() : null,
  createdAt: new Date(),
  updatedAt: new Date(),
  patient: {
    id: patientId,
    patientProfile: {
      dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
      gender: "MALE",
      medicalConditions: null,
      allergies: null,
    },
    medicines: [],
    vitalReadings: [],
  },
  medicine: {
    id: medicineId,
    name: "Amoxicillin",
    dose: "500 mg",
    instructions: "Take as prescribed",
    source: "SCANNER",
    reminders: [reminder],
  },
});

const tx = {
  medicineReviewRequest: {
    updateMany: mocks.txReviewUpdateMany,
  },
  medicineReminder: {
    updateMany: mocks.txReminderUpdateMany,
  },
  medicine: {
    update: mocks.txMedicineUpdate,
  },
};

describe("CareMate+ Doctor medicine review business rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.userFindUnique.mockResolvedValue(doctor);
    mocks.assignmentFindFirst.mockResolvedValue(assignment);
    mocks.userNotificationFindFirst.mockResolvedValue({
      id: "existing-notification",
    });

    mocks.transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    mocks.txReviewUpdateMany.mockResolvedValue({ count: 1 });
    mocks.reviewUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txReminderUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txMedicineUpdate.mockResolvedValue({ id: medicineId });
    mocks.pharmacySyncDecision.mockResolvedValue(undefined);
  });

  it("AUT-DOC-REV-01: rejects an unapproved Doctor with 403", async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...doctor,
      accountStatus: "PENDING_VERIFICATION",
    });

    await expect(
      doctorMedicineReviewsService.getReviewDetail(
        doctorId,
        requestId,
      ),
    ).rejects.toMatchObject({
      message: "Doctor account is not approved yet",
      statusCode: 403,
    });

    expect(mocks.reviewFindFirst).not.toHaveBeenCalled();
  });

  it("AUT-DOC-REV-02: prevents a Doctor accessing a review not assigned to them", async () => {
    mocks.reviewFindFirst.mockResolvedValue(null);

    await expect(
      doctorMedicineReviewsService.getReviewDetail(
        doctorId,
        requestId,
      ),
    ).rejects.toMatchObject({
      message: "Medicine review not found",
      statusCode: 404,
    });

    expect(mocks.reviewFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: requestId,
          doctorId,
          routingStatus: "ASSIGNED",
        },
      }),
    );
  });

  it("AUT-DOC-REV-03: blocks review access when Doctor-Patient assignment is no longer ACTIVE", async () => {
    mocks.reviewFindFirst.mockResolvedValue(makeReview());
    mocks.assignmentFindFirst.mockResolvedValue(null);

    await expect(
      doctorMedicineReviewsService.getReviewDetail(
        doctorId,
        requestId,
      ),
    ).rejects.toMatchObject({
      message: "You are no longer assigned to this patient",
      statusCode: 403,
    });
  });

  it("AUT-DOC-REV-04: rejects approval of an already processed review", async () => {
    mocks.reviewFindFirst.mockResolvedValue(
      makeReview({
        status: "APPROVED",
        reviewedByDoctorId: doctorId,
        reviewedByDoctor: doctor,
      }),
    );

    await expect(
      doctorMedicineReviewsService.approveReview(
        doctorId,
        requestId,
        {},
      ),
    ).rejects.toMatchObject({
      message: "Only pending medicine reviews can be approved",
      statusCode: 400,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("AUT-DOC-REV-05: approves a pending ADD review and synchronises the decision", async () => {
    const pendingReview = makeReview();

    const approvedReview = makeReview({
      status: "APPROVED",
      reviewedByDoctorId: doctorId,
      reviewedByDoctor: doctor,
      doctorNote: "Suitable to add.",
    });

    mocks.reviewFindFirst
      .mockResolvedValueOnce(pendingReview)
      .mockResolvedValueOnce(approvedReview);

    const result =
      await doctorMedicineReviewsService.approveReview(
        doctorId,
        requestId,
        {
          note: " Suitable to add. ",
        },
      );

    expect(mocks.txReviewUpdateMany).toHaveBeenCalledWith({
      where: {
        id: requestId,
        doctorId,
        status: "PENDING",
        routingStatus: "ASSIGNED",
      },
      data: expect.objectContaining({
        status: "APPROVED",
        reviewedByDoctorId: doctorId,
        doctorNote: "Suitable to add.",
      }),
    });

    expect(mocks.txReminderUpdateMany).toHaveBeenCalledWith({
      where: {
        medicineId,
      },
      data: expect.objectContaining({
        reviewStatus: "APPROVED",
        reviewedByDoctorId: doctorId,
        reviewNote: "Suitable to add.",
      }),
    });

    expect(mocks.pharmacySyncDecision).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        patientId,
        medicineId,
        reviewerId: doctorId,
        decision: "APPROVED",
        note: "Suitable to add.",
      }),
    );

    expect(result.review.reviewStatus).toBe("APPROVED");
    expect(result.review.reviewDoctorId).toBe(doctorId);
  });

  it("AUT-DOC-REV-06: rejects a stale or concurrently reassigned approval with 409", async () => {
    mocks.reviewFindFirst.mockResolvedValue(makeReview());
    mocks.txReviewUpdateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      doctorMedicineReviewsService.approveReview(
        doctorId,
        requestId,
        {},
      ),
    ).rejects.toMatchObject({
      message:
        "This medicine review has already been reassigned or processed",
      statusCode: 409,
    });

    expect(mocks.pharmacySyncDecision).not.toHaveBeenCalled();
  });

  it("AUT-DOC-REV-07: rejecting an ADD review deactivates the medicine and reminder", async () => {
    const pendingReview = makeReview();

    const rejectedReview = makeReview({
      status: "REJECTED",
      reviewedByDoctorId: doctorId,
      reviewedByDoctor: doctor,
      doctorNote: "Dose requires clarification.",
    });

    mocks.reviewFindFirst
      .mockResolvedValueOnce(pendingReview)
      .mockResolvedValueOnce(rejectedReview);

    const result =
      await doctorMedicineReviewsService.rejectReview(
        doctorId,
        requestId,
        {
          note: " Dose requires clarification. ",
        },
      );

    expect(mocks.txReviewUpdateMany).toHaveBeenCalledWith({
      where: {
        id: requestId,
        doctorId,
        status: "PENDING",
        routingStatus: "ASSIGNED",
      },
      data: expect.objectContaining({
        status: "REJECTED",
        reviewedByDoctorId: doctorId,
        doctorNote: "Dose requires clarification.",
      }),
    });

    expect(mocks.txReminderUpdateMany).toHaveBeenCalledWith({
      where: {
        medicineId,
      },
      data: expect.objectContaining({
        isActive: false,
        reviewStatus: "REJECTED",
        reviewedByDoctorId: doctorId,
      }),
    });

    expect(mocks.txMedicineUpdate).toHaveBeenCalledWith({
      where: {
        id: medicineId,
      },
      data: {
        isActive: false,
      },
    });

    expect(mocks.pharmacySyncDecision).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        patientId,
        medicineId,
        reviewerId: doctorId,
        decision: "REJECTED",
        note: "Dose requires clarification.",
      }),
    );

    expect(result.review.reviewStatus).toBe("REJECTED");
  });

  it("AUT-DOC-REV-08: approving a DELETE review deactivates medicine and reminders", async () => {
    const pendingDelete = makeReview({
      requestType: "DELETE",
    });

    const approvedDelete = makeReview({
      requestType: "DELETE",
      status: "APPROVED",
      reviewedByDoctorId: doctorId,
      reviewedByDoctor: doctor,
    });

    mocks.reviewFindFirst
      .mockResolvedValueOnce(pendingDelete)
      .mockResolvedValueOnce(approvedDelete);

    const result =
      await doctorMedicineReviewsService.approveReview(
        doctorId,
        requestId,
        {},
      );

    expect(mocks.txMedicineUpdate).toHaveBeenCalledWith({
      where: {
        id: medicineId,
      },
      data: {
        isActive: false,
      },
    });

    expect(mocks.txReminderUpdateMany).toHaveBeenCalledWith({
      where: {
        medicineId,
      },
      data: {
        isActive: false,
      },
    });

    expect(mocks.pharmacySyncDecision).not.toHaveBeenCalled();

    expect(result.review.requestType).toBe("DELETE");
    expect(result.review.reviewStatus).toBe("APPROVED");
  });

  it("AUT-DOC-REV-09: Pool Doctor can complete an assigned Pool review", async () => {
    const pendingPool = makePoolReview();

    const completedPool = makePoolReview({
      routingStatus: "POOL_REVIEW_COMPLETED",
      poolDecision: "APPROVED",
    });

    mocks.reviewFindFirst
      .mockResolvedValueOnce(pendingPool)
      .mockResolvedValueOnce(completedPool);

    mocks.reviewUpdateMany.mockResolvedValue({
      count: 1,
    });

    const result =
      await doctorMedicineReviewsService.approvePoolReview(
        doctorId,
        requestId,
        {
          note: "Clinically appropriate.",
        },
      );

    expect(mocks.reviewUpdateMany).toHaveBeenCalledWith({
      where: {
        id: requestId,
        poolDoctorId: doctorId,
        status: "PENDING",
        routingStatus: "POOL_ASSIGNED",
        poolDecision: null,
      },
      data: expect.objectContaining({
        poolDecision: "APPROVED",
        poolDoctorNote: "Clinically appropriate.",
        routingStatus: "POOL_REVIEW_COMPLETED",
      }),
    });

    expect(result.message).toBe(
      "Medicine review completed and returned to the administrator for release.",
    );

    expect(result.review.poolDecision).toBe("APPROVED");
    expect(result.review.routingStatus).toBe(
      "POOL_REVIEW_COMPLETED",
    );
  });

  it("AUT-DOC-REV-10: prevents a Pool review from being completed twice", async () => {
    mocks.reviewFindFirst.mockResolvedValue(
      makePoolReview({
        routingStatus: "POOL_REVIEW_COMPLETED",
        poolDecision: "APPROVED",
      }),
    );

    await expect(
      doctorMedicineReviewsService.approvePoolReview(
        doctorId,
        requestId,
        {},
      ),
    ).rejects.toMatchObject({
      message:
        "This Medicine Review Doctor Pool request has already been completed",
      statusCode: 409,
    });

    expect(mocks.reviewUpdateMany).not.toHaveBeenCalled();
  });
});
