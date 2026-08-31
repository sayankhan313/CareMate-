import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),

  medicineReminderFindFirst: vi.fn(),
  medicineDoseLogUpsert: vi.fn(),

  txMedicineCreate: vi.fn(),
  txMedicineFindUnique: vi.fn(),
  txMedicineUpdateMany: vi.fn(),
  txMedicineUpdate: vi.fn(),

  txReminderUpdateMany: vi.fn(),

  txDoseLogFindUnique: vi.fn(),
  txDoseLogUpsert: vi.fn(),

  notificationCreateAndSend: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    $transaction: mocks.transaction,

    medicineReminder: {
      findFirst: mocks.medicineReminderFindFirst,
    },

    medicineDoseLog: {
      upsert: mocks.medicineDoseLogUpsert,
    },
  },
}));

vi.mock("../src/modules/notification/notification.service.js", () => ({
  notificationService: {
    createAndSend: mocks.notificationCreateAndSend,
  },
}));

import { medicineService } from "../src/modules/patient/medicine.service.js";

const patientId = "11111111-1111-4111-8111-111111111111";
const medicineId = "22222222-2222-4222-8222-222222222222";
const reminderId = "33333333-3333-4333-8333-333333333333";

const tx = {
  medicine: {
    create: mocks.txMedicineCreate,
    findUnique: mocks.txMedicineFindUnique,
    updateMany: mocks.txMedicineUpdateMany,
    update: mocks.txMedicineUpdate,
  },

  medicineReminder: {
    updateMany: mocks.txReminderUpdateMany,
  },

  medicineDoseLog: {
    findUnique: mocks.txDoseLogFindUnique,
    upsert: mocks.txDoseLogUpsert,
  },
};

const createInput = {
  name: "Paracetamol",
  dose: "500 mg",
  doseQuantity: 1,
  doseUnit: "tablet",
  frequency: "TWICE_DAILY" as const,
  timeOfDay: "08:00",
  selectedTimes: ["20:00", "08:00", "20:00"],
  startDate: "01/01/2026",
  sendToDoctorForReview: false,
  hasMedicineOnHand: true,
  currentStock: 20,
  stockUnit: "tablets",
  lowStockThreshold: 3,
};

const makeReminder = () => ({
  id: reminderId,
  medicineId,
  frequency: "TWICE_DAILY",
  customFrequency: null,
  timeOfDay: "08:00",
  startDate: new Date("2026-01-01T00:00:00.000Z"),
  endDate: null,
  isActive: true,
  medicine: {
    id: medicineId,
    patientId,
    name: "Paracetamol",
    dose: "500 mg",
    isActive: true,
  },
});

const makeCreatedMedicine = ({
  isActive = true,
  hasMedicineOnHand = true,
  currentStock = 20,
  reminderActive = true,
}: {
  isActive?: boolean;
  hasMedicineOnHand?: boolean;
  currentStock?: number;
  reminderActive?: boolean;
} = {}) => ({
  id: medicineId,
  patientId,
  name: "Paracetamol",
  dose: "500 mg",
  doseQuantity: 1,
  doseUnit: "tablet",
  instructions: null,
  source: "MANUAL",
  isActive,
  hasMedicineOnHand,
  currentStock,
  stockUnit: "tablets",
  lowStockThreshold: 3,
  createdAt: new Date("2026-08-31T10:00:00.000Z"),
  updatedAt: new Date("2026-08-31T10:00:00.000Z"),

  reminders: [
    {
      id: reminderId,
      frequency: "TWICE_DAILY",
      customFrequency: null,
      timeOfDay: "08:00",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: null,
      sendToDoctorForReview: false,
      reviewStatus: "NOT_REQUESTED",
      reviewDoctorId: null,
      reviewedByDoctorId: null,
      reviewedAt: null,
      reviewNote: null,
      reviewDoctor: null,
      reviewedByDoctor: null,
      isActive: reminderActive,
    },
  ],

  reviewRequests: [],
});

describe("CareMate+ medicine and reminder business rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );
  });

  it("AUT-MED-01: creates an active medicine and removes duplicate reminder times", async () => {
    mocks.txMedicineCreate.mockResolvedValue({
      id: medicineId,
    });

    mocks.txMedicineFindUnique.mockResolvedValue(
      makeCreatedMedicine(),
    );

    const result = await medicineService.createMedicine(
      patientId,
      createInput,
    );

    expect(result.id).toBe(medicineId);
    expect(result.isActive).toBe(true);

    expect(mocks.txMedicineCreate).toHaveBeenCalledTimes(1);

    const createCall =
      mocks.txMedicineCreate.mock.calls[0]?.[0];

    expect(createCall.data.patientId).toBe(patientId);
    expect(createCall.data.name).toBe("Paracetamol");
    expect(createCall.data.isActive).toBe(true);

    expect(createCall.data.reminders.create).toHaveLength(2);

    expect(
      createCall.data.reminders.create.map(
        (reminder: { timeOfDay: string }) => reminder.timeOfDay,
      ),
    ).toEqual(["08:00", "20:00"]);

    expect(
      createCall.data.reminders.create.every(
        (reminder: { isActive: boolean }) => reminder.isActive === true,
      ),
    ).toBe(true);
  });

  it("AUT-MED-02: keeps medicine and reminders inactive when the Patient has no medicine stock", async () => {
    mocks.txMedicineCreate.mockResolvedValue({
      id: medicineId,
    });

    mocks.txMedicineFindUnique.mockResolvedValue(
      makeCreatedMedicine({
        isActive: false,
        hasMedicineOnHand: false,
        currentStock: 0,
        reminderActive: false,
      }),
    );

    const result = await medicineService.createMedicine(
      patientId,
      {
        ...createInput,
        selectedTimes: ["08:00"],
        hasMedicineOnHand: false,
        currentStock: 0,
      },
    );

    const createCall =
      mocks.txMedicineCreate.mock.calls[0]?.[0];

    expect(createCall.data.isActive).toBe(false);
    expect(createCall.data.hasMedicineOnHand).toBe(false);
    expect(createCall.data.currentStock).toBe(0);

    expect(createCall.data.reminders.create[0].isActive).toBe(false);

    expect(result.isActive).toBe(false);
  });

  it("AUT-MED-03: rejects an end date before the medicine start date", async () => {
    await expect(
      medicineService.createMedicine(patientId, {
        ...createInput,
        startDate: "10/09/2026",
        endDate: "09/09/2026",
      }),
    ).rejects.toMatchObject({
      message: "End date cannot be before start date",
      statusCode: 400,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("AUT-MED-04: marking a reminder TAKEN records the dose and decrements stock once", async () => {
    mocks.medicineReminderFindFirst.mockResolvedValue(
      makeReminder(),
    );

    mocks.txDoseLogFindUnique.mockResolvedValue(null);

    mocks.txMedicineFindUnique
      .mockResolvedValueOnce({
        id: medicineId,
        hasMedicineOnHand: true,
        currentStock: 10,
        stockUnit: "tablets",
        lowStockThreshold: 3,
        doseQuantity: 1,
        doseUnit: "tablet",
      })
      .mockResolvedValueOnce({
        id: medicineId,
        hasMedicineOnHand: true,
        currentStock: 9,
        stockUnit: "tablets",
        lowStockThreshold: 3,
        doseQuantity: 1,
        doseUnit: "tablet",
      });

    mocks.txDoseLogUpsert.mockResolvedValue({
      id: "dose-log-001",
      patientId,
      reminderId,
      status: "TAKEN",
      takenAt: new Date(),
    });

    mocks.txMedicineUpdateMany.mockResolvedValue({
      count: 1,
    });

    const result = await medicineService.markReminderTaken(
      patientId,
      reminderId,
    );

    expect(result.doseLog.status).toBe("TAKEN");
    expect(result.stock.currentStock).toBe(9);

    expect(mocks.txMedicineUpdateMany).toHaveBeenCalledTimes(1);

    expect(mocks.txMedicineUpdateMany).toHaveBeenCalledWith({
      where: {
        id: medicineId,
        currentStock: {
          gte: 1,
        },
      },
      data: {
        currentStock: {
          decrement: 1,
        },
      },
    });
  });

  it("AUT-MED-05: repeated TAKEN action does not decrement medicine stock a second time", async () => {
    mocks.medicineReminderFindFirst.mockResolvedValue(
      makeReminder(),
    );

    mocks.txDoseLogFindUnique.mockResolvedValue({
      id: "dose-log-existing",
      status: "TAKEN",
    });

    mocks.txMedicineFindUnique.mockResolvedValue({
      id: medicineId,
      hasMedicineOnHand: true,
      currentStock: 9,
      stockUnit: "tablets",
      lowStockThreshold: 3,
      doseQuantity: 1,
      doseUnit: "tablet",
    });

    mocks.txDoseLogUpsert.mockResolvedValue({
      id: "dose-log-existing",
      patientId,
      reminderId,
      status: "TAKEN",
      takenAt: new Date(),
    });

    const result = await medicineService.markReminderTaken(
      patientId,
      reminderId,
    );

    expect(result.doseLog.status).toBe("TAKEN");
    expect(result.stock.currentStock).toBe(9);

    expect(mocks.txMedicineUpdateMany).not.toHaveBeenCalled();
  });

  it("AUT-MED-06: rejects TAKEN when there is insufficient medicine stock for the dose", async () => {
    mocks.medicineReminderFindFirst.mockResolvedValue(
      makeReminder(),
    );

    mocks.txDoseLogFindUnique.mockResolvedValue(null);

    mocks.txMedicineFindUnique.mockResolvedValue({
      id: medicineId,
      hasMedicineOnHand: true,
      currentStock: 1,
      stockUnit: "tablets",
      lowStockThreshold: 3,
      doseQuantity: 2,
      doseUnit: "tablets",
    });

    await expect(
      medicineService.markReminderTaken(patientId, reminderId),
    ).rejects.toMatchObject({
      message:
        "Not enough medicine stock is available for this dose. This reminder requires 2 tablets.",
      statusCode: 400,
    });

    expect(mocks.txDoseLogUpsert).not.toHaveBeenCalled();
    expect(mocks.txMedicineUpdateMany).not.toHaveBeenCalled();
  });

  it("AUT-MED-07: stock reaching zero marks medicine unavailable and disables its reminders", async () => {
    mocks.medicineReminderFindFirst.mockResolvedValue(
      makeReminder(),
    );

    mocks.txDoseLogFindUnique.mockResolvedValue(null);

    mocks.txMedicineFindUnique
      .mockResolvedValueOnce({
        id: medicineId,
        hasMedicineOnHand: true,
        currentStock: 1,
        stockUnit: "tablets",
        lowStockThreshold: 3,
        doseQuantity: 1,
        doseUnit: "tablet",
      })
      .mockResolvedValueOnce({
        id: medicineId,
        hasMedicineOnHand: true,
        currentStock: 0,
        stockUnit: "tablets",
        lowStockThreshold: 3,
        doseQuantity: 1,
        doseUnit: "tablet",
      });

    mocks.txDoseLogUpsert.mockResolvedValue({
      id: "dose-log-final",
      patientId,
      reminderId,
      status: "TAKEN",
      takenAt: new Date(),
    });

    mocks.txMedicineUpdateMany.mockResolvedValue({
      count: 1,
    });

    mocks.txMedicineUpdate.mockResolvedValue({
      id: medicineId,
    });

    mocks.txReminderUpdateMany.mockResolvedValue({
      count: 1,
    });

    const result = await medicineService.markReminderTaken(
      patientId,
      reminderId,
    );

    expect(result.stock.currentStock).toBe(0);
    expect(result.stock.hasMedicineOnHand).toBe(false);

    expect(result.message).toBe(
      "Medicine marked as taken. Your recorded stock is now empty.",
    );

    expect(mocks.txMedicineUpdate).toHaveBeenCalledWith({
      where: {
        id: medicineId,
      },
      data: {
        hasMedicineOnHand: false,
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
  });

  it("AUT-MED-08: snoozing a reminder persists SNOOZED state and snooze time", async () => {
    mocks.medicineReminderFindFirst.mockResolvedValue(
      makeReminder(),
    );

    const snoozedUntil =
      "2026-08-31T20:30:00.000Z";

    mocks.medicineDoseLogUpsert.mockResolvedValue({
      id: "dose-log-snoozed",
      patientId,
      reminderId,
      status: "SNOOZED",
      snoozedUntil: new Date(snoozedUntil),
    });

    const result = await medicineService.snoozeReminder(
      patientId,
      reminderId,
      {
        snoozedUntil,
      },
    );

    expect(result.message).toBe(
      "Medicine reminder snoozed",
    );

    expect(result.doseLog.status).toBe("SNOOZED");

    expect(mocks.medicineDoseLogUpsert).toHaveBeenCalledTimes(1);

    const upsertCall =
      mocks.medicineDoseLogUpsert.mock.calls[0]?.[0];

    expect(upsertCall.update.status).toBe("SNOOZED");
    expect(upsertCall.update.snoozedUntil).toEqual(
      new Date(snoozedUntil),
    );

    expect(upsertCall.create.patientId).toBe(patientId);
    expect(upsertCall.create.reminderId).toBe(reminderId);
    expect(upsertCall.create.status).toBe("SNOOZED");
  });
});
