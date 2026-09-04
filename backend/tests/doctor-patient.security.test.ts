import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  assignmentFindFirst: vi.fn(),
  assignmentFindMany: vi.fn(),
  privacyFindUnique: vi.fn(),
  vitalFindFirst: vi.fn(),
  vitalFindMany: vi.fn(),
  medicineFindMany: vi.fn(),
  doseLogFindMany: vi.fn(),
  noteFindMany: vi.fn(),
  safetyAlertFindFirst: vi.fn(),
  consultationFindMany: vi.fn(),
  medicineReviewCount: vi.fn(),
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

import { doctorPatientsService } from "../src/modules/doctor/doctor-patients.service.js";

const doctorId = "11111111-1111-4111-8111-111111111111";
const patientId = "22222222-2222-4222-8222-222222222222";

const approvedDoctor = {
  id: doctorId,
  role: "DOCTOR",
  accountStatus: "APPROVED",
  isEmailVerified: true,
};

const activeDoctor = {
  ...approvedDoctor,
  accountStatus: "ACTIVE",
};

const assignment = {
  id: "33333333-3333-4333-8333-333333333333",
  assignmentType: "PRIMARY",
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
};

const patient = {
  id: patientId,
  fullName: "Relationship Test Patient",
  email: "patient@caremate.local",
  patientProfile: null,
};

describe("CareMate+ Doctor-Patient relationship security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AUT-REL-DOC-01: rejects access when the Doctor account does not exist", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    await expect(
      doctorPatientsService.getPatientDetail(doctorId, patientId),
    ).rejects.toMatchObject({
      message: "Doctor not found",
      statusCode: 404,
    });

    expect(mocks.assignmentFindFirst).not.toHaveBeenCalled();
  });

  it("AUT-REL-DOC-02: rejects a non-Doctor role with 403", async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...approvedDoctor,
      role: "PATIENT",
    });

    await expect(
      doctorPatientsService.getPatientDetail(doctorId, patientId),
    ).rejects.toMatchObject({
      message: "Only doctors can access this resource",
      statusCode: 403,
    });

    expect(mocks.assignmentFindFirst).not.toHaveBeenCalled();
  });

  it("AUT-REL-DOC-03: rejects an unverified Doctor with 403", async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...approvedDoctor,
      isEmailVerified: false,
    });

    await expect(
      doctorPatientsService.getPatientDetail(doctorId, patientId),
    ).rejects.toMatchObject({
      message: "Please verify your email first",
      statusCode: 403,
    });

    expect(mocks.assignmentFindFirst).not.toHaveBeenCalled();
  });

  it("AUT-REL-DOC-04: rejects a Doctor whose professional account is still pending", async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...approvedDoctor,
      accountStatus: "PENDING_VERIFICATION",
    });

    await expect(
      doctorPatientsService.getPatientDetail(doctorId, patientId),
    ).rejects.toMatchObject({
      message: "Doctor account is not approved yet",
      statusCode: 403,
    });

    expect(mocks.assignmentFindFirst).not.toHaveBeenCalled();
  });

  it("AUT-REL-DOC-05: rejects an approved Doctor who is not actively assigned to the Patient", async () => {
    mocks.userFindUnique.mockResolvedValue(approvedDoctor);
    mocks.assignmentFindFirst.mockResolvedValue(null);

    await expect(
      doctorPatientsService.getPatientDetail(doctorId, patientId),
    ).rejects.toMatchObject({
      message: "You are not assigned to this patient",
      statusCode: 403,
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

  it("AUT-REL-DOC-06: allows an approved Doctor with an ACTIVE Patient assignment", async () => {
    mocks.userFindUnique
      .mockResolvedValueOnce(approvedDoctor)
      .mockResolvedValueOnce(patient);

    mocks.assignmentFindFirst.mockResolvedValue(assignment);
    mocks.privacyFindUnique.mockResolvedValue(null);
    mocks.vitalFindFirst.mockResolvedValue(null);
    mocks.vitalFindMany.mockResolvedValue([]);
    mocks.medicineFindMany.mockResolvedValue([]);
    mocks.doseLogFindMany.mockResolvedValue([]);
    mocks.noteFindMany.mockResolvedValue([]);
    mocks.safetyAlertFindFirst.mockResolvedValue(null);
    mocks.consultationFindMany.mockResolvedValue([]);
    mocks.medicineReviewCount.mockResolvedValue(0);

    const result = await doctorPatientsService.getPatientDetail(
      doctorId,
      patientId,
    );

    expect(result.assignment).toEqual({
      id: assignment.id,
      assignmentType: assignment.assignmentType,
      assignedAt: assignment.createdAt,
    });

    expect(result.patient).toMatchObject({
      id: patientId,
      fullName: "Relationship Test Patient",
      email: "patient@caremate.local",
    });

    expect(result.summary).toMatchObject({
      activeMedicineCount: 0,
      todayDoseCount: 0,
      missedDoseCount: 0,
      snoozedDoseCount: 0,
      pendingMedicineReviews: 0,
      hasActiveAlert: false,
    });
  });

  it("AUT-REL-DOC-07: treats an ACTIVE verified Doctor as eligible to access assigned-patient listing", async () => {
    mocks.userFindUnique.mockResolvedValue(activeDoctor);
    mocks.assignmentFindMany.mockResolvedValue([]);

    const result = await doctorPatientsService.listAssignedPatients(doctorId);

    expect(result).toEqual({
      patients: [],
    });

    expect(mocks.assignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          doctorId,
          status: "ACTIVE",
        },
      }),
    );
  });
});
