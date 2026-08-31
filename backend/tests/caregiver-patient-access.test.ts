import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  relationshipFindFirst: vi.fn(),
  relationshipFindMany: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    patientCaregiverRelationship: {
      findFirst: mocks.relationshipFindFirst,
      findMany: mocks.relationshipFindMany,
    },
  },
}));

import {
  caregiverPatientsService,
  ensureLinkedPatient,
} from "../src/modules/caregiver/caregiver-patients.service.js";

const caregiverId = "11111111-1111-4111-8111-111111111111";
const patientId = "22222222-2222-4222-8222-222222222222";

const relationship = {
  id: "33333333-3333-4333-8333-333333333333",
  caregiverId,
  patientId,
  status: "ACTIVE",
  approvedAt: new Date("2026-08-20T10:00:00.000Z"),
  createdAt: new Date("2026-08-19T10:00:00.000Z"),
  patient: {
    id: patientId,
    fullName: "Caregiver Access Test Patient",
    email: "patient@caremate.local",
    accountStatus: "ACTIVE",
    isEmailVerified: true,
  },
};

describe("CareMate+ Caregiver-Patient relationship authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AUT-CG-REL-01: allows access when an ACTIVE Caregiver-Patient relationship satisfies both account boundaries", async () => {
    mocks.relationshipFindFirst.mockResolvedValue(relationship);

    const result = await ensureLinkedPatient(
      caregiverId,
      patientId,
    );

    expect(mocks.relationshipFindFirst).toHaveBeenCalledWith({
      where: {
        caregiverId,
        patientId,
        status: "ACTIVE",
        caregiver: {
          is: {
            role: "CAREGIVER",
            isEmailVerified: true,
            accountStatus: {
              in: ["ACTIVE", "APPROVED"],
            },
          },
        },
        patient: {
          is: {
            role: "PATIENT",
            isEmailVerified: true,
            accountStatus: {
              in: ["ACTIVE", "APPROVED"],
            },
          },
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            accountStatus: true,
            isEmailVerified: true,
          },
        },
      },
    });

    expect(result.id).toBe(relationship.id);
    expect(result.patient.id).toBe(patientId);
  });

  it("AUT-CG-REL-02: denies access when no authorised ACTIVE relationship exists", async () => {
    mocks.relationshipFindFirst.mockResolvedValue(null);

    await expect(
      ensureLinkedPatient(caregiverId, patientId),
    ).rejects.toMatchObject({
      message:
        "You are not authorised to access this patient",
      statusCode: 403,
    });
  });

  it("AUT-CG-REL-03: scopes relationship lookup to both the current Caregiver and requested Patient", async () => {
    mocks.relationshipFindFirst.mockResolvedValue(null);

    await expect(
      ensureLinkedPatient(
        caregiverId,
        patientId,
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
    });

    const call =
      mocks.relationshipFindFirst.mock.calls[0]?.[0];

    expect(call.where.caregiverId).toBe(caregiverId);
    expect(call.where.patientId).toBe(patientId);
    expect(call.where.status).toBe("ACTIVE");
  });

  it("AUT-CG-REL-04: requires verified and ACTIVE or APPROVED accounts for both Caregiver and Patient", async () => {
    mocks.relationshipFindFirst.mockResolvedValue(relationship);

    await ensureLinkedPatient(
      caregiverId,
      patientId,
    );

    const where =
      mocks.relationshipFindFirst.mock.calls[0]?.[0].where;

    expect(where.caregiver.is).toEqual({
      role: "CAREGIVER",
      isEmailVerified: true,
      accountStatus: {
        in: ["ACTIVE", "APPROVED"],
      },
    });

    expect(where.patient.is).toEqual({
      role: "PATIENT",
      isEmailVerified: true,
      accountStatus: {
        in: ["ACTIVE", "APPROVED"],
      },
    });
  });

  it("AUT-CG-REL-05: lists only linked Patients through the same strict relationship constraints", async () => {
    mocks.relationshipFindMany.mockResolvedValue([
      relationship,
    ]);

    const result =
      await caregiverPatientsService.listLinkedPatients(
        caregiverId,
      );

    expect(mocks.relationshipFindMany).toHaveBeenCalledWith({
      where: {
        caregiverId,
        status: "ACTIVE",
        caregiver: {
          is: {
            role: "CAREGIVER",
            isEmailVerified: true,
            accountStatus: {
              in: ["ACTIVE", "APPROVED"],
            },
          },
        },
        patient: {
          is: {
            role: "PATIENT",
            isEmailVerified: true,
            accountStatus: {
              in: ["ACTIVE", "APPROVED"],
            },
          },
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            accountStatus: true,
            isEmailVerified: true,
          },
        },
      },
      orderBy: [
        {
          approvedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    expect(result.patients).toEqual([
      {
        relationshipId: relationship.id,
        linkedAt: relationship.approvedAt,
        patient: {
          id: patientId,
          fullName:
            "Caregiver Access Test Patient",
          email: "patient@caremate.local",
        },
      },
    ]);
  });

  it("AUT-CG-REL-06: getLinkedPatient returns only the authorised relationship and Patient identity", async () => {
    mocks.relationshipFindFirst.mockResolvedValue(relationship);

    const result =
      await caregiverPatientsService.getLinkedPatient(
        caregiverId,
        patientId,
      );

    expect(result).toEqual({
      relationship: {
        id: relationship.id,
        status: "ACTIVE",
        linkedAt: relationship.approvedAt,
      },
      patient: {
        id: patientId,
        fullName:
          "Caregiver Access Test Patient",
        email: "patient@caremate.local",
      },
    });
  });

  it("AUT-CG-REL-07: prevents getLinkedPatient from returning Patient data after relationship authorization fails", async () => {
    mocks.relationshipFindFirst.mockResolvedValue(null);

    await expect(
      caregiverPatientsService.getLinkedPatient(
        caregiverId,
        patientId,
      ),
    ).rejects.toMatchObject({
      message:
        "You are not authorised to access this patient",
      statusCode: 403,
    });
  });
});
