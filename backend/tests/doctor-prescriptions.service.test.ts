import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  assignmentFindFirst: vi.fn(),
  prescriptionFindUnique: vi.fn(),
  notificationFindFirst: vi.fn(),
  transaction: vi.fn(),

  txPrescriptionCreate: vi.fn(),
  txMedicineCreate: vi.fn(),
  txPrescriptionItemCreate: vi.fn(),
  txPrescriptionItemFindMany: vi.fn(),
  txReminderCreateMany: vi.fn(),
  txPharmacyLinkFindFirst: vi.fn(),
  txUserFindUnique: vi.fn(),
  txMedicineOrderFindFirst: vi.fn(),
  txMedicineOrderCreate: vi.fn(),

  resolveOrderPayment: vi.fn(),
  notificationCreateAndSend: vi.fn(),
  parsePrescriptionScan: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    patientDoctorAssignment: { findFirst: mocks.assignmentFindFirst },
    prescription: { findUnique: mocks.prescriptionFindUnique },
    userNotification: { findFirst: mocks.notificationFindFirst },
    $transaction: mocks.transaction,
  },
}));

vi.mock("../src/modules/notification/notification.service.js", () => ({
  notificationService: { createAndSend: mocks.notificationCreateAndSend },
}));

vi.mock("../src/modules/patient/medicine-reference.service.js", () => ({
  medicineReferenceService: { parsePrescriptionScan: mocks.parsePrescriptionScan },
}));

vi.mock("../src/modules/patient/patient-prescription-charge.service.js", () => ({
  patientPrescriptionChargeService: { resolveOrderPayment: mocks.resolveOrderPayment },
}));

import { doctorPrescriptionsService } from "../src/modules/doctor/doctor-prescriptions.service.js";

const doctorId = "11111111-1111-4111-8111-111111111111";
const patientId = "22222222-2222-4222-8222-222222222222";
const prescriptionId = "33333333-3333-4333-8333-333333333333";
const medicineId = "44444444-4444-4444-8444-444444444444";
const secondMedicineId = "55555555-5555-4555-8555-555555555555";
const pharmacyId = "66666666-6666-4666-8666-666666666666";
const orderId = "77777777-7777-4777-8777-777777777777";

const doctor = {
  id: doctorId,
  fullName: "Prescription Test Doctor",
  email: "doctor@caremate.local",
  role: "DOCTOR",
  accountStatus: "APPROVED",
  isEmailVerified: true,
};

const assignment = {
  id: "88888888-8888-4888-8888-888888888888",
  assignmentType: "PRIMARY",
  patient: {
    id: patientId,
    fullName: "Prescription Test Patient",
    email: "patient@caremate.local",
  },
  doctor: {
    id: doctorId,
    fullName: "Prescription Test Doctor",
    email: "doctor@caremate.local",
  },
};

const baseInput = {
  source: "MANUAL" as const,
  notes: " Test prescription ",
  items: [
    {
      name: "Paracetamol",
      dose: "500 mg",
      quantity: "2",
      instructions: " Take with water ",
      frequency: "TWICE_DAILY" as const,
      selectedTimes: ["08:00", "20:00"],
      startDate: "31/08/2026",
    },
  ],
};

const makePrescription = (items: any[] = [
  {
    id: "item-001",
    prescriptionId,
    medicineId,
    name: "Paracetamol",
    dose: "500 mg",
    quantity: "2",
    instructions: "Take with water",
    frequency: "TWICE_DAILY",
    customFrequency: null,
    selectedTimes: ["08:00", "20:00"],
    startDate: new Date("2026-08-31T00:00:00.000Z"),
    endDate: null,
    prescriptionPattern: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]) => ({
  id: prescriptionId,
  patientId,
  prescribedByDoctorId: doctorId,
  source: "MANUAL",
  imageUrl: null,
  rawDetectedText: null,
  ocrConfidence: null,
  notes: "Test prescription",
  prescribedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  patient: {
    id: patientId,
    fullName: "Prescription Test Patient",
    email: "patient@caremate.local",
  },
  prescribedByDoctor: {
    id: doctorId,
    fullName: "Prescription Test Doctor",
    email: "doctor@caremate.local",
    doctorProfile: {
      specialization: "General Medicine",
    },
  },
  items,
});

const tx = {
  prescription: {
    create: mocks.txPrescriptionCreate,
  },
  medicine: {
    create: mocks.txMedicineCreate,
  },
  prescriptionItem: {
    create: mocks.txPrescriptionItemCreate,
    findMany: mocks.txPrescriptionItemFindMany,
  },
  medicineReminder: {
    createMany: mocks.txReminderCreateMany,
  },
  patientPharmacyLink: {
    findFirst: mocks.txPharmacyLinkFindFirst,
  },
  user: {
    findUnique: mocks.txUserFindUnique,
  },
  medicineOrder: {
    findFirst: mocks.txMedicineOrderFindFirst,
    create: mocks.txMedicineOrderCreate,
  },
};

describe("CareMate+ Doctor prescription business rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.userFindUnique.mockResolvedValue(doctor);
    mocks.assignmentFindFirst.mockResolvedValue(assignment);
    mocks.txPrescriptionCreate.mockResolvedValue({ id: prescriptionId });
    mocks.txMedicineCreate.mockResolvedValue({ id: medicineId });
    mocks.txPrescriptionItemCreate.mockResolvedValue({ id: "item-001" });
    mocks.txReminderCreateMany.mockResolvedValue({ count: 2 });
    mocks.txPharmacyLinkFindFirst.mockResolvedValue(null);
    mocks.prescriptionFindUnique.mockResolvedValue(makePrescription());

    mocks.notificationFindFirst.mockResolvedValue({
      id: "existing-notification",
    });

    mocks.transaction.mockImplementation(async callback => callback(tx));
  });

  it("AUT-RX-01: rejects a Doctor whose account is not approved", async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...doctor,
      accountStatus: "PENDING_VERIFICATION",
    });

    await expect(
      doctorPrescriptionsService.createPrescription({
        doctorId,
        patientId,
        input: baseInput,
        imageFile: null,
      }),
    ).rejects.toMatchObject({
      message: "Doctor account is not approved yet",
      statusCode: 403,
    });

    expect(mocks.assignmentFindFirst).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("AUT-RX-02: rejects prescribing for a Patient without an ACTIVE Doctor assignment", async () => {
    mocks.assignmentFindFirst.mockResolvedValue(null);

    await expect(
      doctorPrescriptionsService.createPrescription({
        doctorId,
        patientId,
        input: baseInput,
        imageFile: null,
      }),
    ).rejects.toMatchObject({
      message: "You are not actively assigned to this patient",
      statusCode: 403,
    });

    expect(mocks.assignmentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          doctorId,
          patientId,
          status: "ACTIVE",
        }),
      }),
    );

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("AUT-RX-03: rejects an invalid calendar date before starting the database transaction", async () => {
    await expect(
      doctorPrescriptionsService.createPrescription({
        doctorId,
        patientId,
        input: {
          ...baseInput,
          items: [
            {
              ...baseInput.items[0],
              startDate: "31/02/2026",
            },
          ],
        },
        imageFile: null,
      }),
    ).rejects.toMatchObject({
      message: "Please enter a valid prescription date",
      statusCode: 400,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("AUT-RX-04: rejects an end date before the prescription start date", async () => {
    await expect(
      doctorPrescriptionsService.createPrescription({
        doctorId,
        patientId,
        input: {
          ...baseInput,
          items: [
            {
              ...baseInput.items[0],
              startDate: "31/08/2026",
              endDate: "30/08/2026",
            },
          ],
        },
        imageFile: null,
      }),
    ).rejects.toMatchObject({
      message: "End date cannot be before start date for Paracetamol",
      statusCode: 400,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("AUT-RX-05: creates prescription, Doctor-prescribed medicine and reminders in one transaction", async () => {
    const result = await doctorPrescriptionsService.createPrescription({
      doctorId,
      patientId,
      input: baseInput,
      imageFile: null,
    });

    expect(mocks.txPrescriptionCreate).toHaveBeenCalledWith({
      data: {
        patientId,
        prescribedByDoctorId: doctorId,
        source: "MANUAL",
        imageUrl: null,
        rawDetectedText: null,
        ocrConfidence: null,
        notes: "Test prescription",
      },
      select: {
        id: true,
      },
    });

    expect(mocks.txMedicineCreate).toHaveBeenCalledWith({
      data: {
        patientId,
        prescribedByDoctorId: doctorId,
        name: "Paracetamol",
        dose: "500 mg",
        instructions: "Take with water",
        source: "DOCTOR_PRESCRIBED",
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    expect(mocks.txPrescriptionItemCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        prescriptionId,
        medicineId,
        name: "Paracetamol",
        dose: "500 mg",
        quantity: "2",
        frequency: "TWICE_DAILY",
        selectedTimes: ["08:00", "20:00"],
      }),
    });

    expect(mocks.txReminderCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          medicineId,
          timeOfDay: "08:00",
          reviewStatus: "NOT_REQUESTED",
          sendToDoctorForReview: false,
          isActive: true,
        }),
        expect.objectContaining({
          medicineId,
          timeOfDay: "20:00",
          reviewStatus: "NOT_REQUESTED",
          sendToDoctorForReview: false,
          isActive: true,
        }),
      ],
    });

    expect(result.prescription.id).toBe(prescriptionId);
    expect(result.prescription.items).toHaveLength(1);
  });

  it("AUT-RX-06: normalises duplicate reminder times when service is called directly", async () => {
    await doctorPrescriptionsService.createPrescription({
      doctorId,
      patientId,
      input: {
        ...baseInput,
        items: [
          {
            ...baseInput.items[0],
            selectedTimes: ["20:00", "08:00", "20:00"],
          },
        ],
      },
      imageFile: null,
    });

    expect(mocks.txReminderCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          timeOfDay: "20:00",
        }),
        expect.objectContaining({
          timeOfDay: "08:00",
        }),
      ],
    });

    expect(
      mocks.txReminderCreateMany.mock.calls[0]?.[0].data,
    ).toHaveLength(2);
  });

  it("AUT-RX-07: persists multiple prescribed medicines and their reminder schedules", async () => {
    mocks.txMedicineCreate
      .mockResolvedValueOnce({ id: medicineId })
      .mockResolvedValueOnce({ id: secondMedicineId });

    const secondItem = {
      id: "item-002",
      prescriptionId,
      medicineId: secondMedicineId,
      name: "Amoxicillin",
      dose: "250 mg",
      quantity: "1",
      instructions: "Complete the course",
      frequency: "THREE_TIMES_DAILY",
      customFrequency: null,
      selectedTimes: ["08:00", "13:00", "20:00"],
      startDate: new Date("2026-08-31T00:00:00.000Z"),
      endDate: null,
      prescriptionPattern: "1-1-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mocks.prescriptionFindUnique.mockResolvedValue(
      makePrescription([
        makePrescription().items[0],
        secondItem,
      ]),
    );

    const result = await doctorPrescriptionsService.createPrescription({
      doctorId,
      patientId,
      input: {
        source: "MANUAL",
        items: [
          baseInput.items[0],
          {
            name: "Amoxicillin",
            dose: "250 mg",
            quantity: "1",
            instructions: "Complete the course",
            frequency: "THREE_TIMES_DAILY",
            selectedTimes: ["08:00", "13:00", "20:00"],
            startDate: "2026-08-31",
            prescriptionPattern: "1-1-1",
          },
        ],
      },
      imageFile: null,
    });

    expect(mocks.txMedicineCreate).toHaveBeenCalledTimes(2);
    expect(mocks.txPrescriptionItemCreate).toHaveBeenCalledTimes(2);
    expect(mocks.txReminderCreateMany).toHaveBeenCalledTimes(2);

    expect(
      mocks.txReminderCreateMany.mock.calls[1]?.[0].data,
    ).toHaveLength(3);

    expect(result.prescription.items).toHaveLength(2);
  });

  it("AUT-RX-08: automatically routes the prescription to a valid primary Pharmacy", async () => {
    mocks.txPharmacyLinkFindFirst.mockResolvedValue({
      pharmacyId,
    });

    mocks.txUserFindUnique.mockResolvedValue({
      id: pharmacyId,
      role: "PHARMACY",
      accountStatus: "APPROVED",
      isEmailVerified: true,
      pharmacyProfile: {
        id: "pharmacy-profile-001",
        pharmacyName: "CareMate Test Pharmacy",
      },
    });

    mocks.txMedicineOrderFindFirst.mockResolvedValue(null);

    mocks.txPrescriptionItemFindMany.mockResolvedValue([
      {
        id: "item-001",
        medicineId,
        name: "Paracetamol",
        dose: "500 mg",
        quantity: "2",
        instructions: "Take with water",
      },
    ]);

    mocks.resolveOrderPayment.mockResolvedValue({
      chargePreference: "CHARGEABLE",
      status: "PENDING",
    });

    mocks.txMedicineOrderCreate.mockResolvedValue({
      id: orderId,
      pharmacyId,
      orderNumber: `CMRX-${prescriptionId}`,
    });

    await doctorPrescriptionsService.createPrescription({
      doctorId,
      patientId,
      input: baseInput,
      imageFile: null,
    });

    expect(mocks.resolveOrderPayment).toHaveBeenCalledWith(
      tx,
      patientId,
    );

    expect(mocks.txMedicineOrderCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderNumber: `CMRX-${prescriptionId}`,
        patientId,
        pharmacyId,
        doctorId,
        prescriptionId,
        orderSource: "DOCTOR_PRESCRIPTION",
        medicineName: "Paracetamol",
        dose: "500 mg",
        quantity: "2 packs",
        requestedByRole: "DOCTOR",
        requestedByName: "Prescription Test Doctor",
        prescriptionConfirmed: true,
        fulfilmentAllowed: true,
        status: "RECEIVED",
        items: {
          create: [
            expect.objectContaining({
              medicineId,
              name: "Paracetamol",
              quantity: "2",
              quantityUnit: "pack",
            }),
          ],
        },
        payment: {
          create: expect.objectContaining({
            chargePreference: "CHARGEABLE",
            chargeableItemCount: 1,
            currency: "GBP",
            provider: "STRIPE",
            testMode: true,
            status: "PENDING",
          }),
        },
        statusHistory: {
          create: expect.objectContaining({
            changedById: doctorId,
            fromStatus: null,
            toStatus: "RECEIVED",
          }),
        },
      }),
      select: {
        id: true,
        pharmacyId: true,
        orderNumber: true,
      },
    });
  });

  it("AUT-RX-09: does not create a Pharmacy order when the primary Pharmacy is not approved", async () => {
    mocks.txPharmacyLinkFindFirst.mockResolvedValue({
      pharmacyId,
    });

    mocks.txUserFindUnique.mockResolvedValue({
      id: pharmacyId,
      role: "PHARMACY",
      accountStatus: "PENDING_VERIFICATION",
      isEmailVerified: true,
      pharmacyProfile: {
        id: "pharmacy-profile-001",
        pharmacyName: "Unavailable Pharmacy",
      },
    });

    await doctorPrescriptionsService.createPrescription({
      doctorId,
      patientId,
      input: baseInput,
      imageFile: null,
    });

    expect(mocks.txMedicineOrderCreate).not.toHaveBeenCalled();
    expect(mocks.resolveOrderPayment).not.toHaveBeenCalled();
  });

  it("AUT-RX-10: aborts prescription creation when a transactional persistence step fails", async () => {
    mocks.txPrescriptionItemCreate.mockRejectedValue(
      new Error("Simulated prescription item persistence failure"),
    );

    await expect(
      doctorPrescriptionsService.createPrescription({
        doctorId,
        patientId,
        input: baseInput,
        imageFile: null,
      }),
    ).rejects.toThrow(
      "Simulated prescription item persistence failure",
    );

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.prescriptionFindUnique).not.toHaveBeenCalled();
    expect(mocks.notificationCreateAndSend).not.toHaveBeenCalled();
  });
});
