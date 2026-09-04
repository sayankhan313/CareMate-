import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  assignmentFindFirst: vi.fn(),
  consultationFindFirst: vi.fn(),
  consultationUpdate: vi.fn(),
  consultationFindMany: vi.fn(),
  notificationFindFirst: vi.fn(),
  caregiverRelationshipFindMany: vi.fn(),
  notificationCreateAndSend: vi.fn(),
  jitsiCreateMeetingConfig: vi.fn(),
  transaction: vi.fn(),
  txConsultationUpdate: vi.fn(),
  txSafetyAlertUpdateMany: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    patientDoctorAssignment: { findFirst: mocks.assignmentFindFirst },
    consultation: {
      findFirst: mocks.consultationFindFirst,
      update: mocks.consultationUpdate,
      findMany: mocks.consultationFindMany,
    },
    userNotification: { findFirst: mocks.notificationFindFirst },
    patientCaregiverRelationship: {
      findMany: mocks.caregiverRelationshipFindMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("../src/modules/notification/notification.service.js", () => ({
  notificationService: {
    createAndSend: mocks.notificationCreateAndSend,
  },
}));

vi.mock("../src/modules/patient/jitsi.service.js", () => ({
  jitsiService: {
    createMeetingConfig: mocks.jitsiCreateMeetingConfig,
  },
}));

import { doctorConsultationsService } from "../src/modules/doctor/doctor-consultations.service.js";

const doctorId = "11111111-1111-4111-8111-111111111111";
const patientId = "22222222-2222-4222-8222-222222222222";
const consultationId = "33333333-3333-4333-8333-333333333333";
const safetyAlertId = "44444444-4444-4444-8444-444444444444";

const doctor = {
  id: doctorId,
  fullName: "Consultation Test Doctor",
  email: "doctor@caremate.local",
  role: "DOCTOR",
  accountStatus: "APPROVED",
  isEmailVerified: true,
};

const patient = {
  id: patientId,
  fullName: "Consultation Test Patient",
  email: "patient@caremate.local",
};

const assignment = {
  id: "55555555-5555-4555-8555-555555555555",
  assignmentType: "PRIMARY",
};

const makeConsultation = ({
  status = "PENDING",
  type = "MANUAL",
  safetyAlertIdValue = null,
  notes = null,
}: {
  status?: string;
  type?: string;
  safetyAlertIdValue?: string | null;
  notes?: string | null;
} = {}) => ({
  id: consultationId,
  patientId,
  doctorId,
  safetyAlertId: safetyAlertIdValue,
  type,
  status,
  reason: "Need medical advice",
  preferredAt: new Date("2026-08-31T18:00:00.000Z"),
  notes,
  doctorName: doctor.fullName,
  jaasRoomName: "caremate-consultation-room",
  acceptedAt: status === "ACCEPTED" ? new Date() : null,
  rejectedAt: status === "REJECTED" ? new Date() : null,
  rejectionNote: null,
  startedAt: status === "IN_PROGRESS" ? new Date() : null,
  completedAt: status === "COMPLETED" ? new Date() : null,
  initiatorType: "PATIENT",
  initiatedByUserId: patientId,
  createdAt: new Date(),
  updatedAt: new Date(),
  patient,
  doctor,
});

const tx = {
  consultation: {
    update: mocks.txConsultationUpdate,
  },
  safetyAlert: {
    updateMany: mocks.txSafetyAlertUpdateMany,
  },
};

describe("CareMate+ Doctor consultation lifecycle and access rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.userFindUnique.mockResolvedValue(doctor);
    mocks.assignmentFindFirst.mockResolvedValue(assignment);

    mocks.notificationFindFirst.mockResolvedValue({
      id: "existing-notification",
    });

    mocks.caregiverRelationshipFindMany.mockResolvedValue([]);

    mocks.transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    mocks.jitsiCreateMeetingConfig.mockReturnValue({
      domain: "8x8.vc",
      roomName: "caremate-consultation-room",
      jwt: "test-jaas-token",
    });
  });

  it("AUT-CON-01: rejects an unapproved Doctor with 403", async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...doctor,
      accountStatus: "PENDING_VERIFICATION",
    });

    await expect(
      doctorConsultationsService.getConsultationDetail(
        doctorId,
        consultationId,
      ),
    ).rejects.toMatchObject({
      message: "Doctor account is not approved yet",
      statusCode: 403,
    });

    expect(mocks.consultationFindFirst).not.toHaveBeenCalled();
  });

  it("AUT-CON-02: prevents a Doctor accessing a consultation not assigned to them", async () => {
    mocks.consultationFindFirst.mockResolvedValue(null);

    await expect(
      doctorConsultationsService.getConsultationDetail(
        doctorId,
        consultationId,
      ),
    ).rejects.toMatchObject({
      message: "Consultation not found",
      statusCode: 404,
    });

    expect(mocks.consultationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: consultationId,
          doctorId,
        },
      }),
    );
  });

  it("AUT-CON-03: blocks consultation access if the Doctor-Patient assignment is no longer ACTIVE", async () => {
    mocks.consultationFindFirst.mockResolvedValue(
      makeConsultation(),
    );

    mocks.assignmentFindFirst.mockResolvedValue(null);

    await expect(
      doctorConsultationsService.getConsultationDetail(
        doctorId,
        consultationId,
      ),
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
      },
    });
  });

  it("AUT-CON-04: accepts a PENDING consultation and enables call joining", async () => {
    mocks.consultationFindFirst.mockResolvedValue(
      makeConsultation({
        status: "PENDING",
      }),
    );

    mocks.consultationUpdate.mockResolvedValue(
      makeConsultation({
        status: "ACCEPTED",
        notes: "Patient ready for consultation.",
      }),
    );

    const result =
      await doctorConsultationsService.acceptConsultation(
        doctorId,
        consultationId,
        {
          notes: " Patient ready for consultation. ",
        },
      );

    expect(mocks.consultationUpdate).toHaveBeenCalledWith({
      where: {
        id: consultationId,
      },
      data: expect.objectContaining({
        status: "ACCEPTED",
        doctorId,
        doctorName: doctor.fullName,
        notes: "Patient ready for consultation.",
        acceptedAt: expect.any(Date),
      }),
      include: expect.any(Object),
    });

    expect(result.consultation.status).toBe("ACCEPTED");
    expect(result.consultation.canJoinCall).toBe(true);
  });

  it("AUT-CON-05: prevents an already accepted consultation from being accepted again", async () => {
    mocks.consultationFindFirst.mockResolvedValue(
      makeConsultation({
        status: "ACCEPTED",
      }),
    );

    await expect(
      doctorConsultationsService.acceptConsultation(
        doctorId,
        consultationId,
        {},
      ),
    ).rejects.toMatchObject({
      message: "Only pending consultations can be accepted",
      statusCode: 400,
    });

    expect(mocks.consultationUpdate).not.toHaveBeenCalled();
  });

  it("AUT-CON-06: allows an ACCEPTED consultation to be rejected", async () => {
    mocks.consultationFindFirst.mockResolvedValue(
      makeConsultation({
        status: "ACCEPTED",
      }),
    );

    mocks.consultationUpdate.mockResolvedValue(
      makeConsultation({
        status: "REJECTED",
        notes: "Unable to continue.",
      }),
    );

    const result =
      await doctorConsultationsService.rejectConsultation(
        doctorId,
        consultationId,
        {
          notes: " Unable to continue. ",
        },
      );

    expect(mocks.consultationUpdate).toHaveBeenCalledWith({
      where: {
        id: consultationId,
      },
      data: expect.objectContaining({
        status: "REJECTED",
        doctorId,
        doctorName: doctor.fullName,
        rejectedAt: expect.any(Date),
        rejectionNote: "Unable to continue.",
        notes: "Unable to continue.",
      }),
      include: expect.any(Object),
    });

    expect(result.consultation.status).toBe("REJECTED");
    expect(result.consultation.canJoinCall).toBe(false);
  });

  it("AUT-CON-07: prevents a PENDING consultation from being marked COMPLETED", async () => {
    mocks.consultationFindFirst.mockResolvedValue(
      makeConsultation({
        status: "PENDING",
      }),
    );

    await expect(
      doctorConsultationsService.completeConsultation(
        doctorId,
        consultationId,
        {},
      ),
    ).rejects.toMatchObject({
      message:
        "Only accepted or in-progress consultations can be completed",
      statusCode: 400,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("AUT-CON-08: completing an EMERGENCY consultation resolves its active Safety Alert transactionally", async () => {
    mocks.consultationFindFirst.mockResolvedValue(
      makeConsultation({
        status: "ACCEPTED",
        type: "EMERGENCY",
        safetyAlertIdValue: safetyAlertId,
      }),
    );

    mocks.txConsultationUpdate.mockResolvedValue(
      makeConsultation({
        status: "COMPLETED",
        type: "EMERGENCY",
        safetyAlertIdValue: safetyAlertId,
        notes: "Emergency consultation completed.",
      }),
    );

    mocks.txSafetyAlertUpdateMany.mockResolvedValue({
      count: 1,
    });

    const result =
      await doctorConsultationsService.completeConsultation(
        doctorId,
        consultationId,
        {
          notes: " Emergency consultation completed. ",
        },
      );

    expect(mocks.txConsultationUpdate).toHaveBeenCalledWith({
      where: {
        id: consultationId,
      },
      data: expect.objectContaining({
        status: "COMPLETED",
        completedAt: expect.any(Date),
        notes: "Emergency consultation completed.",
      }),
      include: expect.any(Object),
    });

    expect(mocks.txSafetyAlertUpdateMany).toHaveBeenCalledWith({
      where: {
        id: safetyAlertId,
        status: {
          in: ["ACTIVE", "ESCALATED"],
        },
      },
      data: {
        status: "RESOLVED",
        resolvedAt: expect.any(Date),
      },
    });

    expect(result.consultation.status).toBe("COMPLETED");
    expect(result.consultation.canJoinCall).toBe(false);
  });

  it("AUT-CON-09: prevents joining a PENDING consultation before Doctor acceptance", async () => {
    mocks.consultationFindFirst.mockResolvedValue(
      makeConsultation({
        status: "PENDING",
      }),
    );

    await expect(
      doctorConsultationsService.getDoctorJoinConfig(
        doctorId,
        consultationId,
      ),
    ).rejects.toMatchObject({
      message: "Accept this consultation before joining the call",
      statusCode: 400,
    });

    expect(mocks.consultationUpdate).not.toHaveBeenCalled();
    expect(
      mocks.jitsiCreateMeetingConfig,
    ).not.toHaveBeenCalled();
  });

  it("AUT-CON-10: joining an ACCEPTED consultation moves it to IN_PROGRESS and generates Doctor Jitsi config", async () => {
    const acceptedConsultation = makeConsultation({
      status: "ACCEPTED",
    });

    const inProgressConsultation = makeConsultation({
      status: "IN_PROGRESS",
    });

    mocks.consultationFindFirst.mockResolvedValue(
      acceptedConsultation,
    );

    mocks.consultationUpdate.mockResolvedValue(
      inProgressConsultation,
    );

    const result =
      await doctorConsultationsService.getDoctorJoinConfig(
        doctorId,
        consultationId,
      );

    expect(mocks.consultationUpdate).toHaveBeenCalledWith({
      where: {
        id: consultationId,
      },
      data: {
        status: "IN_PROGRESS",
        startedAt: expect.any(Date),
      },
      include: expect.any(Object),
    });

    expect(
      mocks.jitsiCreateMeetingConfig,
    ).toHaveBeenCalledWith({
      roomName: "caremate-consultation-room",
      user: {
        id: doctorId,
        name: doctor.fullName,
        email: doctor.email,
        role: "DOCTOR",
        moderator: true,
      },
    });

    expect(result.consultation.status).toBe("IN_PROGRESS");
    expect(result.consultation.canJoinCall).toBe(true);

    expect(result.doctorMeeting).toEqual({
      domain: "8x8.vc",
      roomName: "caremate-consultation-room",
      jwt: "test-jaas-token",
    });
  });

  it("AUT-CON-11: prevents joining REJECTED, CANCELLED and COMPLETED consultations", async () => {
    const blockedStatuses = [
      {
        status: "REJECTED",
        message: "Rejected consultation cannot be joined",
      },
      {
        status: "CANCELLED",
        message: "Cancelled consultation cannot be joined",
      },
      {
        status: "COMPLETED",
        message: "Completed consultation cannot be joined",
      },
    ];

    for (const blocked of blockedStatuses) {
      mocks.consultationFindFirst.mockResolvedValue(
        makeConsultation({
          status: blocked.status,
        }),
      );

      await expect(
        doctorConsultationsService.getDoctorJoinConfig(
          doctorId,
          consultationId,
        ),
      ).rejects.toMatchObject({
        message: blocked.message,
        statusCode: 400,
      });
    }

    expect(
      mocks.jitsiCreateMeetingConfig,
    ).not.toHaveBeenCalled();
  });
});
