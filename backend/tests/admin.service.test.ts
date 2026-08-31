import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userFindMany: vi.fn(),
  userUpdate: vi.fn(),

  reviewFindFirst: vi.fn(),
  reviewFindUnique: vi.fn(),
  doctorAvailabilityFindFirst: vi.fn(),

  transaction: vi.fn(),
  txReviewUpdateMany: vi.fn(),
  txReminderUpdateMany: vi.fn(),
  txMedicineUpdate: vi.fn(),

  userNotificationFindFirst: vi.fn(),
  notificationCreateAndSend: vi.fn(),
  syncDecision: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      findFirst: mocks.userFindFirst,
      findMany: mocks.userFindMany,
      update: mocks.userUpdate,
    },
    medicineReviewRequest: {
      findFirst: mocks.reviewFindFirst,
      findUnique: mocks.reviewFindUnique,
    },
    doctorAvailability: {
      findFirst: mocks.doctorAvailabilityFindFirst,
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
    syncDecision: mocks.syncDecision,
  },
}));

import { adminService } from "../src/modules/admin/admin.service.js";

const adminId = "11111111-1111-4111-8111-111111111111";
const doctorId = "22222222-2222-4222-8222-222222222222";
const pharmacyId = "33333333-3333-4333-8333-333333333333";
const patientId = "44444444-4444-4444-8444-444444444444";
const requestId = "55555555-5555-4555-8555-555555555555";
const medicineId = "66666666-6666-4666-8666-666666666666";

const doctorProfile = {
  id: "doctor-profile-001",
  phoneNumber: null,
  gmcNumber: "TEST-GMC",
  specialization: "General Medicine",
  clinicName: "Test Clinic",
  clinicAddress: null,
  yearsExperience: 5,
  bio: null,
  gmcDocumentUrl: "/test/gmc.pdf",
  photoIdDocumentUrl: "/test/id.pdf",
  qualificationDocumentUrl: "/test/qualification.pdf",
  verificationCheckedAt: null,
  verificationNotes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const pharmacyProfile = {
  id: "pharmacy-profile-001",
  pharmacyName: "CareMate Test Pharmacy",
  staffName: "Test Pharmacist",
  phoneNumber: null,
  email: "pharmacy@caremate.local",
  registrationNumber: "TEST-REG",
  licenseNumber: "TEST-LIC",
  address: "1 Test Street",
  city: "Leicester",
  postcode: "LE1 1AA",
  openingHours: null,
  serviceType: null,
  licenseDocumentUrl: "/test/licence.pdf",
  addressProofDocumentUrl: "/test/address.pdf",
  notifyNewOrders: true,
  notifyStatusReminders: true,
  notifyDelayedOrders: true,
  verificationCheckedAt: null,
  verificationNotes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeDoctor = (accountStatus = "PENDING_VERIFICATION") => ({
  id: doctorId,
  fullName: "Admin Test Doctor",
  email: "doctor@caremate.local",
  role: "DOCTOR",
  accountStatus,
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  doctorProfile,
});

const makePharmacy = (accountStatus = "PENDING_VERIFICATION") => ({
  id: pharmacyId,
  fullName: "Admin Test Pharmacy User",
  email: "pharmacy@caremate.local",
  role: "PHARMACY",
  accountStatus,
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  pharmacyProfile,
});

const makeReview = ({
  routingStatus = "ADMIN_REVIEW_REQUIRED",
  poolDoctorId = null,
  poolDecision = null,
  attemptedDoctorIds = [],
  requestType = "ADD",
}: {
  routingStatus?: string;
  poolDoctorId?: string | null;
  poolDecision?: string | null;
  attemptedDoctorIds?: string[];
  requestType?: string;
} = {}) => ({
  id: requestId,
  patientId,
  doctorId: null,
  reviewedByDoctorId: null,
  poolDoctorId,
  releasedByAdminId: null,
  medicineId,
  requestType,
  status: "PENDING",
  routingStatus,
  patientReason: "Patient medicine review",
  doctorNote: null,
  assignedAt: null,
  escalatedAt: new Date(),
  attemptedDoctorIds,
  poolAssignedAt: poolDoctorId ? new Date() : null,
  poolDecision,
  poolDoctorNote: poolDecision ? "Pool review completed" : null,
  poolReviewedAt: poolDecision ? new Date() : null,
  adminReleasedAt: null,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  patient: {
    id: patientId,
    fullName: "Admin Test Patient",
    email: "patient@caremate.local",
  },
  doctor: null,
  reviewedByDoctor: null,
  poolDoctor: poolDoctorId
    ? {
        id: poolDoctorId,
        fullName: "Pool Doctor",
        email: "pool@caremate.local",
        doctorProfile: {
          specialization: "General Medicine",
          clinicName: "Pool Clinic",
        },
      }
    : null,
  releasedByAdmin: null,
  medicine: {
    id: medicineId,
    name: "Paracetamol",
    dose: "500 mg",
    instructions: null,
    source: "PATIENT_ADDED",
    isActive: false,
    reminders: [
      {
        frequency: "TWICE_DAILY",
        customFrequency: null,
        timeOfDay: "08:00",
        startDate: new Date(),
        endDate: null,
      },
    ],
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

describe("CareMate+ Administrator governance business rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.userNotificationFindFirst.mockResolvedValue({
      id: "existing-notification",
    });

    mocks.transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    mocks.txReviewUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txReminderUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txMedicineUpdate.mockResolvedValue({ id: medicineId });
    mocks.syncDecision.mockResolvedValue(undefined);
  });

  it("AUT-ADMIN-01: approves a pending Doctor verification and activates the account", async () => {
    mocks.userFindUnique.mockResolvedValue(makeDoctor());

    mocks.userUpdate.mockResolvedValue({
      ...makeDoctor("ACTIVE"),
      doctorProfile: {
        ...doctorProfile,
        verificationNotes: "Documents verified",
        verificationCheckedAt: new Date(),
      },
    });

    const result = await adminService.approveDoctorVerification(
      doctorId,
      {
        adminId,
        notes: " Documents verified ",
      },
    );

    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: doctorId },
      data: {
        accountStatus: "ACTIVE",
        doctorProfile: {
          update: {
            verificationCheckedAt: expect.any(Date),
            verificationNotes: "Documents verified",
          },
        },
      },
      select: expect.any(Object),
    });

    expect(result.doctor.accountStatus).toBe("ACTIVE");
    expect(result.decision.action).toBe("APPROVED");
    expect(result.decision.reviewedByAdminId).toBe(adminId);
  });

  it("AUT-ADMIN-02: prevents an already ACTIVE Doctor from being approved again", async () => {
    mocks.userFindUnique.mockResolvedValue(
      makeDoctor("ACTIVE"),
    );

    await expect(
      adminService.approveDoctorVerification(doctorId, {
        adminId,
      }),
    ).rejects.toMatchObject({
      message: "Doctor account is already active",
      statusCode: 400,
    });

    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("AUT-ADMIN-03: rejects a pending Pharmacy verification", async () => {
    mocks.userFindUnique.mockResolvedValue(makePharmacy());

    mocks.userUpdate.mockResolvedValue({
      ...makePharmacy("REJECTED"),
      pharmacyProfile: {
        ...pharmacyProfile,
        verificationNotes: "Evidence could not be verified",
        verificationCheckedAt: new Date(),
      },
    });

    const result =
      await adminService.rejectPharmacyVerification(
        pharmacyId,
        {
          adminId,
          notes: " Evidence could not be verified ",
        },
      );

    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: pharmacyId },
      data: {
        accountStatus: "REJECTED",
        pharmacyProfile: {
          update: {
            verificationCheckedAt: expect.any(Date),
            verificationNotes:
              "Evidence could not be verified",
          },
        },
      },
      select: expect.any(Object),
    });

    expect(result.pharmacy.accountStatus).toBe("REJECTED");
    expect(result.decision.action).toBe("REJECTED");
  });

  it("AUT-ADMIN-04: prevents a DISABLED Pharmacy account from being approved", async () => {
    mocks.userFindUnique.mockResolvedValue(
      makePharmacy("DISABLED"),
    );

    await expect(
      adminService.approvePharmacyVerification(pharmacyId, {
        adminId,
      }),
    ).rejects.toMatchObject({
      message:
        "Disabled pharmacy accounts cannot be approved",
      statusCode: 400,
    });

    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("AUT-ADMIN-05: prevents assigning a medicine review to a Doctor already attempted", async () => {
    mocks.reviewFindFirst.mockResolvedValue(
      makeReview({
        attemptedDoctorIds: [doctorId],
      }),
    );

    await expect(
      adminService.assignMedicineReviewEscalation(
        requestId,
        doctorId,
      ),
    ).rejects.toMatchObject({
      message:
        "This doctor has already been attempted for this medicine review.",
      statusCode: 400,
    });

    expect(mocks.userFindFirst).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("AUT-ADMIN-06: prevents assigning an OUT_OF_OFFICE Doctor to the review pool", async () => {
    mocks.reviewFindFirst.mockResolvedValue(makeReview());

    mocks.userFindFirst.mockResolvedValue({
      id: doctorId,
      fullName: "Pool Test Doctor",
      email: "pool@caremate.local",
      doctorProfile: {
        specialization: "General Medicine",
        clinicName: "Pool Clinic",
      },
    });

    mocks.doctorAvailabilityFindFirst.mockResolvedValue({
      status: "OUT_OF_OFFICE",
    });

    await expect(
      adminService.assignMedicineReviewEscalation(
        requestId,
        doctorId,
      ),
    ).rejects.toMatchObject({
      message:
        "Selected doctor is currently out of office.",
      statusCode: 400,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("AUT-ADMIN-07: assigns an eligible Doctor to the Medicine Review Doctor Pool without creating a Patient assignment", async () => {
    mocks.reviewFindFirst.mockResolvedValue(makeReview());

    mocks.userFindFirst.mockResolvedValue({
      id: doctorId,
      fullName: "Pool Test Doctor",
      email: "pool@caremate.local",
      doctorProfile: {
        specialization: "General Medicine",
        clinicName: "Pool Clinic",
      },
    });

    mocks.doctorAvailabilityFindFirst.mockResolvedValue({
      status: "AVAILABLE",
    });

    mocks.reviewFindUnique.mockResolvedValue(
      makeReview({
        routingStatus: "POOL_ASSIGNED",
        poolDoctorId: doctorId,
      }),
    );

    const result =
      await adminService.assignMedicineReviewEscalation(
        requestId,
        doctorId,
      );

    expect(mocks.txReviewUpdateMany).toHaveBeenCalledWith({
      where: {
        id: requestId,
        status: "PENDING",
        routingStatus: "ADMIN_REVIEW_REQUIRED",
        doctorId: null,
        poolDoctorId: null,
      },
      data: {
        poolDoctorId: doctorId,
        routingStatus: "POOL_ASSIGNED",
        poolAssignedAt: expect.any(Date),
      },
    });

    expect(mocks.txReminderUpdateMany).toHaveBeenCalledWith({
      where: {
        medicineId,
        reviewStatus: "PENDING",
      },
      data: {
        reviewDoctorId: null,
      },
    });

    expect(result.assignedDoctor.id).toBe(doctorId);
    expect(result.assignedDoctor.isPatientAssigned).toBe(false);
    expect(result.assignedDoctor.poolOnlyAccess).toBe(true);
  });

  it("AUT-ADMIN-08: detects a stale or concurrently assigned medicine review", async () => {
    mocks.reviewFindFirst.mockResolvedValue(makeReview());

    mocks.userFindFirst.mockResolvedValue({
      id: doctorId,
      fullName: "Pool Test Doctor",
      email: "pool@caremate.local",
      doctorProfile: {
        specialization: "General Medicine",
        clinicName: "Pool Clinic",
      },
    });

    mocks.doctorAvailabilityFindFirst.mockResolvedValue(null);

    mocks.txReviewUpdateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      adminService.assignMedicineReviewEscalation(
        requestId,
        doctorId,
      ),
    ).rejects.toMatchObject({
      message:
        "Medicine review has already been assigned.",
      statusCode: 409,
    });

    expect(mocks.txReminderUpdateMany).not.toHaveBeenCalled();
  });

  it("AUT-ADMIN-09: releases an APPROVED ADD pool review and synchronises the clinical decision", async () => {
    const completedReview = makeReview({
      routingStatus: "POOL_REVIEW_COMPLETED",
      poolDoctorId: doctorId,
      poolDecision: "APPROVED",
    });

    mocks.reviewFindFirst.mockResolvedValue(completedReview);

    mocks.reviewFindUnique
      .mockResolvedValueOnce({
        ...completedReview,
        status: "APPROVED",
        reviewedByDoctorId: doctorId,
        reviewedAt: new Date(),
        doctorNote: "Pool review completed",
        medicine: {
          name: "Paracetamol",
          dose: "500 mg",
        },
        reviewedByDoctor: {
          fullName: "Pool Test Doctor",
        },
      })
      .mockResolvedValueOnce({
        ...completedReview,
        status: "APPROVED",
        routingStatus: "RELEASED",
        reviewedByDoctorId: doctorId,
      });

    const result =
      await adminService.releaseMedicineReviewPoolResult(
        requestId,
        adminId,
      );

    expect(mocks.txReviewUpdateMany).toHaveBeenCalledWith({
      where: {
        id: requestId,
        status: "PENDING",
        routingStatus: "POOL_REVIEW_COMPLETED",
        poolDoctorId: doctorId,
      },
      data: expect.objectContaining({
        status: "APPROVED",
        routingStatus: "RELEASED",
        reviewedByDoctorId: doctorId,
        releasedByAdminId: adminId,
        adminReleasedAt: expect.any(Date),
      }),
    });

    expect(mocks.txReminderUpdateMany).toHaveBeenCalledWith({
      where: {
        medicineId,
      },
      data: expect.objectContaining({
        reviewStatus: "APPROVED",
        reviewDoctorId: null,
        reviewedByDoctorId: doctorId,
      }),
    });

    expect(mocks.syncDecision).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        patientId,
        medicineId,
        reviewerId: doctorId,
        decision: "APPROVED",
      }),
    );

    expect(result.message).toBe(
      "Medicine review result released to patient successfully.",
    );
  });

  it("AUT-ADMIN-10: prevents an Administrator suspending their own account", async () => {
    await expect(
      adminService.suspendUser(adminId, adminId),
    ).rejects.toMatchObject({
      message: "You cannot suspend your own admin account",
      statusCode: 400,
    });

    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("AUT-ADMIN-11: prevents the user-management workflow from suspending another ADMIN", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "77777777-7777-4777-8777-777777777777",
      fullName: "Other Admin",
      email: "admin2@caremate.local",
      role: "ADMIN",
      accountStatus: "ACTIVE",
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      adminService.suspendUser(
        "77777777-7777-4777-8777-777777777777",
        adminId,
      ),
    ).rejects.toMatchObject({
      message:
        "Admin accounts cannot be suspended using this workflow",
      statusCode: 400,
    });

    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("AUT-ADMIN-12: suspends an ACTIVE non-Admin account and reactivates a DISABLED account", async () => {
    const userId =
      "88888888-8888-4888-8888-888888888888";

    const activeUser = {
      id: userId,
      fullName: "Test Patient",
      email: "patient@caremate.local",
      role: "PATIENT",
      accountStatus: "ACTIVE",
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const disabledUser = {
      ...activeUser,
      accountStatus: "DISABLED",
    };

    mocks.userFindUnique
      .mockResolvedValueOnce(activeUser)
      .mockResolvedValueOnce(disabledUser);

    mocks.userUpdate
      .mockResolvedValueOnce(disabledUser)
      .mockResolvedValueOnce({
        ...activeUser,
        accountStatus: "ACTIVE",
      });

    const suspended = await adminService.suspendUser(
      userId,
      adminId,
    );

    expect(mocks.userUpdate).toHaveBeenNthCalledWith(
      1,
      {
        where: { id: userId },
        data: {
          accountStatus: "DISABLED",
        },
        select: expect.any(Object),
      },
    );

    expect(suspended.user.accountStatus).toBe("DISABLED");

    const reactivated = await adminService.reactivateUser(
      userId,
      adminId,
    );

    expect(mocks.userUpdate).toHaveBeenNthCalledWith(
      2,
      {
        where: { id: userId },
        data: {
          accountStatus: "ACTIVE",
        },
        select: expect.any(Object),
      },
    );

    expect(reactivated.user.accountStatus).toBe("ACTIVE");
  });
});
