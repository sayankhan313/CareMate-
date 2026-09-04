import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureLinkedPatient: vi.fn(),
  observationCreate: vi.fn(),
  observationFindMany: vi.fn(),
  observationFindFirst: vi.fn(),
  orderFindMany: vi.fn(),
  orderFindFirst: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    caregiverObservation: {
      create: mocks.observationCreate,
      findMany: mocks.observationFindMany,
      findFirst: mocks.observationFindFirst,
    },
    medicineOrder: {
      findMany: mocks.orderFindMany,
      findFirst: mocks.orderFindFirst,
    },
  },
}));

vi.mock("../src/modules/caregiver/caregiver-patients.service.js", () => ({
  ensureLinkedPatient: mocks.ensureLinkedPatient,
}));

import { caregiverObservationService } from "../src/modules/caregiver/caregiver-observation.service.js";
import { caregiverPharmacyOrderService } from "../src/modules/caregiver/caregiver-pharmacy-order.service.js";

const caregiverId = "11111111-1111-4111-8111-111111111111";
const patientId = "22222222-2222-4222-8222-222222222222";
const observationId = "33333333-3333-4333-8333-333333333333";
const orderId = "44444444-4444-4444-8444-444444444444";

const relationship = {
  id: "55555555-5555-4555-8555-555555555555",
  caregiverId,
  patientId,
  status: "ACTIVE",
  patient: {
    id: patientId,
    fullName: "Caregiver Test Patient",
  },
};

const makeObservation = ({
  id = observationId,
  category = "GENERAL",
  observation = "Patient appeared comfortable.",
}: {
  id?: string;
  category?: string;
  observation?: string;
} = {}) => ({
  id,
  patientId,
  caregiverId,
  category,
  observation,
  observedAt: new Date("2026-08-31T10:00:00.000Z"),
  createdAt: new Date("2026-08-31T10:01:00.000Z"),
  updatedAt: new Date("2026-08-31T10:01:00.000Z"),
  caregiver: {
    id: caregiverId,
    fullName: "Caregiver Test User",
  },
});

const makeOrder = ({
  id = orderId,
  status = "RECEIVED",
}: {
  id?: string;
  status?: string;
} = {}) => ({
  id,
  orderNumber: "CM-CG-001",
  orderSource: "DOCTOR_PRESCRIPTION",
  status,
  statusReason: null,
  medicineName: "Paracetamol",
  dose: "500 mg",
  quantity: "1 pack",
  prescriptionConfirmed: true,
  prescriptionConfirmedAt: new Date(),
  fulfilmentAllowed: true,
  acceptedAt: status === "ACCEPTED" ? new Date() : null,
  rejectedAt: null,
  preparingAt: status === "PREPARING" ? new Date() : null,
  readyAt: status === "READY" ? new Date() : null,
  outForDeliveryAt: status === "OUT_FOR_DELIVERY" ? new Date() : null,
  deliveredAt: status === "DELIVERED" ? new Date() : null,
  collectedAt: status === "COLLECTED" ? new Date() : null,
  cancelledAt: status === "CANCELLED" ? new Date() : null,
  delayedAt: status === "DELAYED" ? new Date() : null,
  outOfStockAt: status === "OUT_OF_STOCK" ? new Date() : null,
  createdAt: new Date(),
  updatedAt: new Date(),
  pharmacy: {
    id: "66666666-6666-4666-8666-666666666666",
    fullName: "CareMate Pharmacy",
    pharmacyProfile: {
      pharmacyName: "CareMate Test Pharmacy",
      city: "Leicester",
      postcode: "LE1 1AA",
    },
  },
  doctor: {
    id: "77777777-7777-4777-8777-777777777777",
    fullName: "Dr Test",
    doctorProfile: {
      specialization: "General Medicine",
    },
  },
  patientSubmission: null,
  items: [
    {
      id: "item-001",
      medicineId: "88888888-8888-4888-8888-888888888888",
      name: "Paracetamol",
      dose: "500 mg",
      quantity: "1",
      quantityUnit: "pack",
      dispensedQuantity: null,
    },
  ],
  payment: {
    chargePreference: "CHARGEABLE",
    amountPence: 985,
    currency: "GBP",
    status: "PAID",
    paidAt: new Date(),
  },
  statusHistory: [],
});

const unlinkedError = () =>
  Object.assign(
    new Error("You are not actively linked to this patient"),
    { statusCode: 403 },
  );

describe("CareMate+ Caregiver linked-patient workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureLinkedPatient.mockResolvedValue(relationship);
  });

  it("AUT-CG-01: allows an ACTIVE linked Caregiver to create a Patient observation", async () => {
    mocks.observationCreate.mockResolvedValue(makeObservation());

    const result = await caregiverObservationService.createObservation(
      caregiverId,
      patientId,
      {
        category: "GENERAL",
        observation: " Patient appeared comfortable. ",
        observedAt: "2026-08-31T10:00:00.000Z",
      },
    );

    expect(mocks.ensureLinkedPatient).toHaveBeenCalledWith(
      caregiverId,
      patientId,
    );

    expect(mocks.observationCreate).toHaveBeenCalledWith({
      data: {
        patientId,
        caregiverId,
        category: "GENERAL",
        observation: "Patient appeared comfortable.",
        observedAt: new Date("2026-08-31T10:00:00.000Z"),
      },
      select: expect.any(Object),
    });

    expect(result.patient.id).toBe(patientId);
    expect(result.observation.caregiverId).toBe(caregiverId);
    expect(result.observation.observation).toBe(
      "Patient appeared comfortable.",
    );
  });

  it("AUT-CG-02: blocks observation creation when the Caregiver is not actively linked", async () => {
    mocks.ensureLinkedPatient.mockRejectedValue(unlinkedError());

    await expect(
      caregiverObservationService.createObservation(
        caregiverId,
        patientId,
        {
          category: "GENERAL",
          observation: "Attempted observation",
        },
      ),
    ).rejects.toMatchObject({
      message: "You are not actively linked to this patient",
      statusCode: 403,
    });

    expect(mocks.observationCreate).not.toHaveBeenCalled();
  });

  it("AUT-CG-03: rejects an observation time more than five minutes in the future", async () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await expect(
      caregiverObservationService.createObservation(
        caregiverId,
        patientId,
        {
          category: "ROUTINE",
          observation: "Future observation",
          observedAt: future,
        },
      ),
    ).rejects.toMatchObject({
      message: "Observation time cannot be in the future.",
      statusCode: 400,
    });

    expect(mocks.observationCreate).not.toHaveBeenCalled();
  });

  it("AUT-CG-04: lists only observations belonging to the linked Patient and current Caregiver", async () => {
    mocks.observationFindMany.mockResolvedValue([
      makeObservation({
        category: "GENERAL",
      }),
      makeObservation({
        id: "99999999-9999-4999-8999-999999999999",
        category: "MEDICATION_SUPPORT",
        observation: "Supported medicine routine.",
      }),
    ]);

    const result =
      await caregiverObservationService.listPatientObservations(
        caregiverId,
        patientId,
      );

    expect(mocks.observationFindMany).toHaveBeenCalledWith({
      where: {
        patientId,
        caregiverId,
      },
      select: expect.any(Object),
      orderBy: [
        {
          observedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    expect(result.summary.total).toBe(2);
    expect(result.summary.general).toBe(1);
    expect(result.summary.medicationSupport).toBe(1);
    expect(result.observations).toHaveLength(2);
  });

  it("AUT-CG-05: prevents access to an observation outside the linked Caregiver-Patient boundary", async () => {
    mocks.observationFindFirst.mockResolvedValue(null);

    await expect(
      caregiverObservationService.getObservation(
        caregiverId,
        patientId,
        observationId,
      ),
    ).rejects.toMatchObject({
      message:
        "Care observation not found for this linked patient.",
      statusCode: 404,
    });

    expect(mocks.observationFindFirst).toHaveBeenCalledWith({
      where: {
        id: observationId,
        patientId,
        caregiverId,
      },
      select: expect.any(Object),
    });
  });

  it("AUT-CG-06: allows a linked Caregiver to view the Patient's pharmacy orders", async () => {
    mocks.orderFindMany.mockResolvedValue([
      makeOrder({
        status: "READY",
      }),
      makeOrder({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        status: "DELIVERED",
      }),
      makeOrder({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        status: "DELAYED",
      }),
    ]);

    const result =
      await caregiverPharmacyOrderService.listPatientOrders(
        caregiverId,
        patientId,
      );

    expect(mocks.ensureLinkedPatient).toHaveBeenCalledWith(
      caregiverId,
      patientId,
    );

    expect(mocks.orderFindMany).toHaveBeenCalledWith({
      where: {
        patientId,
      },
      select: expect.any(Object),
      orderBy: {
        createdAt: "desc",
      },
    });

    expect(result.summary).toEqual({
      total: 3,
      active: 1,
      completed: 1,
      needsAttention: 1,
    });
  });

  it("AUT-CG-07: blocks pharmacy-order access after the Caregiver link is unavailable or revoked", async () => {
    mocks.ensureLinkedPatient.mockRejectedValue(unlinkedError());

    await expect(
      caregiverPharmacyOrderService.listPatientOrders(
        caregiverId,
        patientId,
      ),
    ).rejects.toMatchObject({
      message: "You are not actively linked to this patient",
      statusCode: 403,
    });

    expect(mocks.orderFindMany).not.toHaveBeenCalled();
  });

  it("AUT-CG-08: scopes pharmacy-order detail lookup to the linked Patient", async () => {
    mocks.orderFindFirst.mockResolvedValue(
      makeOrder({
        status: "READY",
      }),
    );

    const result =
      await caregiverPharmacyOrderService.getPatientOrder(
        caregiverId,
        patientId,
        orderId,
      );

    expect(mocks.orderFindFirst).toHaveBeenCalledWith({
      where: {
        id: orderId,
        patientId,
      },
      select: expect.any(Object),
    });

    expect(result.patient.id).toBe(patientId);
    expect(result.order.id).toBe(orderId);
    expect(result.order.status).toBe("READY");
    expect(result.order.pharmacy?.pharmacyName).toBe(
      "CareMate Test Pharmacy",
    );
  });

  it("AUT-CG-09: returns 404 when the requested pharmacy order does not belong to the linked Patient", async () => {
    mocks.orderFindFirst.mockResolvedValue(null);

    await expect(
      caregiverPharmacyOrderService.getPatientOrder(
        caregiverId,
        patientId,
        orderId,
      ),
    ).rejects.toMatchObject({
      message:
        "Pharmacy order not found for this linked patient.",
      statusCode: 404,
    });
  });

  it("AUT-CG-10: Caregiver pharmacy-order service is read-only and does not mutate medicine or order state", async () => {
    mocks.orderFindFirst.mockResolvedValue(
      makeOrder({
        status: "DELIVERED",
      }),
    );

    const result =
      await caregiverPharmacyOrderService.getPatientOrder(
        caregiverId,
        patientId,
        orderId,
      );

    expect(result.order.status).toBe("DELIVERED");
    expect(result.order.items).toHaveLength(1);
    expect(result.order.payment?.status).toBe("PAID");

    expect(mocks.orderFindFirst).toHaveBeenCalledTimes(1);
    expect(mocks.observationCreate).not.toHaveBeenCalled();
  });
});
