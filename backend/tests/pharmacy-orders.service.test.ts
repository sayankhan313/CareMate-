import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureApprovedPharmacy: vi.fn(),

  orderFindFirst: vi.fn(),
  orderCount: vi.fn(),
  orderFindMany: vi.fn(),

  userFindFirst: vi.fn(),
  caregiverRelationshipFindMany: vi.fn(),
  userNotificationFindFirst: vi.fn(),

  transaction: vi.fn(),

  txOrderFindFirst: vi.fn(),
  txOrderUpdateMany: vi.fn(),
  txOrderFindFirstOrThrow: vi.fn(),
  txStatusHistoryCreate: vi.fn(),
  txSubmissionUpdate: vi.fn(),

  txOrderItemFindMany: vi.fn(),
  txMedicineFindFirst: vi.fn(),
  txMedicineUpdate: vi.fn(),
  txReminderUpdateMany: vi.fn(),

  ensureInventoryReady: vi.fn(),
  releaseInventory: vi.fn(),
  consumeInventory: vi.fn(),

  notificationCreateAndSend: vi.fn(),
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    medicineOrder: {
      findFirst: mocks.orderFindFirst,
      count: mocks.orderCount,
      findMany: mocks.orderFindMany,
    },
    user: {
      findFirst: mocks.userFindFirst,
    },
    patientCaregiverRelationship: {
      findMany: mocks.caregiverRelationshipFindMany,
    },
    userNotification: {
      findFirst: mocks.userNotificationFindFirst,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("../src/modules/pharmacy/pharmacy-access.service.js", () => ({
  ensureApprovedPharmacy: mocks.ensureApprovedPharmacy,
}));

vi.mock("../src/modules/pharmacy/pharmacy-inventory-match.service.js", () => ({
  ensureOrderInventoryReadyForFulfilment: mocks.ensureInventoryReady,
  releaseOrderInventoryReservations: mocks.releaseInventory,
  consumeOrderInventoryReservations: mocks.consumeInventory,
}));

vi.mock("../src/modules/notification/notification.service.js", () => ({
  notificationService: {
    createAndSend: mocks.notificationCreateAndSend,
  },
}));

import { pharmacyOrdersService } from "../src/modules/pharmacy/pharmacy-orders.service.js";

const pharmacyId = "11111111-1111-4111-8111-111111111111";
const otherPharmacyId = "22222222-2222-4222-8222-222222222222";
const patientId = "33333333-3333-4333-8333-333333333333";
const orderId = "44444444-4444-4444-8444-444444444444";

const basePayment = {
  chargePreference: "CHARGEABLE",
  status: "PAID",
};

const makeOrder = ({
  status = "READY",
  fulfilmentAllowed = true,
  payment = basePayment,
  patientSubmissionId = null,
}: {
  status?: string;
  fulfilmentAllowed?: boolean;
  payment?: { chargePreference: string; status: string } | null;
  patientSubmissionId?: string | null;
} = {}) => ({
  id: orderId,
  patientId,
  patientSubmissionId,
  orderNumber: "CM-ORDER-001",
  medicineName: "Paracetamol",
  status,
  fulfilmentAllowed,
  acceptedAt: null,
  rejectedAt: null,
  preparingAt: null,
  readyAt: status === "READY" ? new Date() : null,
  outForDeliveryAt: null,
  deliveredAt: null,
  collectedAt: null,
  cancelledAt: null,
  delayedAt: null,
  outOfStockAt: null,
  payment,
});

const tx = {
  medicineOrder: {
    findFirst: mocks.txOrderFindFirst,
    updateMany: mocks.txOrderUpdateMany,
    findFirstOrThrow: mocks.txOrderFindFirstOrThrow,
  },
  medicineOrderStatusHistory: {
    create: mocks.txStatusHistoryCreate,
  },
  patientPrescriptionSubmission: {
    update: mocks.txSubmissionUpdate,
  },
  medicineOrderItem: {
    findMany: mocks.txOrderItemFindMany,
  },
  medicine: {
    findFirst: mocks.txMedicineFindFirst,
    update: mocks.txMedicineUpdate,
  },
  medicineReminder: {
    updateMany: mocks.txReminderUpdateMany,
  },
};

describe("CareMate+ Pharmacy order, fulfilment and payment rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.ensureApprovedPharmacy.mockResolvedValue({
      id: pharmacyId,
    });

    mocks.userFindFirst.mockResolvedValue({
      id: patientId,
      fullName: "Pharmacy Test Patient",
    });

    mocks.caregiverRelationshipFindMany.mockResolvedValue([]);
    mocks.userNotificationFindFirst.mockResolvedValue(null);
    mocks.notificationCreateAndSend.mockResolvedValue(undefined);

    mocks.transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    mocks.txOrderUpdateMany.mockResolvedValue({
      count: 1,
    });

    mocks.txStatusHistoryCreate.mockResolvedValue({
      id: "history-001",
    });

    mocks.ensureInventoryReady.mockResolvedValue(undefined);
    mocks.releaseInventory.mockResolvedValue(undefined);
    mocks.consumeInventory.mockResolvedValue(undefined);
  });

  it("AUT-PHARM-01: rejects access when an order does not belong to the Pharmacy", async () => {
    mocks.orderFindFirst.mockResolvedValue(null);

    await expect(
      pharmacyOrdersService.getOrderDetail(
        otherPharmacyId,
        orderId,
      ),
    ).rejects.toMatchObject({
      message: "Order not found for this pharmacy",
      statusCode: 404,
    });

    expect(mocks.orderFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: orderId,
          pharmacyId: otherPharmacyId,
        },
      }),
    );
  });

  it("AUT-PHARM-02: rejects an invalid order status transition", async () => {
    mocks.orderFindFirst.mockResolvedValue(
      makeOrder({
        status: "RECEIVED",
      }),
    );

    await expect(
      pharmacyOrdersService.updateOrderStatus(
        pharmacyId,
        orderId,
        {
          status: "READY",
        },
      ),
    ).rejects.toMatchObject({
      message: "Order cannot move from RECEIVED to READY.",
      statusCode: 409,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("AUT-PHARM-03: prevents repeating the current order status", async () => {
    mocks.orderFindFirst.mockResolvedValue(
      makeOrder({
        status: "READY",
      }),
    );

    await expect(
      pharmacyOrdersService.updateOrderStatus(
        pharmacyId,
        orderId,
        {
          status: "READY",
        },
      ),
    ).rejects.toMatchObject({
      message: "Order is already ready",
      statusCode: 409,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("AUT-PHARM-04: blocks fulfilment when the order has not been authorised", async () => {
    mocks.orderFindFirst.mockResolvedValue(
      makeOrder({
        status: "RECEIVED",
        fulfilmentAllowed: false,
      }),
    );

    await expect(
      pharmacyOrdersService.updateOrderStatus(
        pharmacyId,
        orderId,
        {
          status: "ACCEPTED",
        },
      ),
    ).rejects.toMatchObject({
      message:
        "This order is not yet approved for pharmacy fulfilment",
      statusCode: 409,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("AUT-PHARM-05: blocks medicine release for a CHARGEABLE order with PENDING payment", async () => {
    mocks.orderFindFirst.mockResolvedValue(
      makeOrder({
        status: "READY",
        payment: {
          chargePreference: "CHARGEABLE",
          status: "PENDING",
        },
      }),
    );

    await expect(
      pharmacyOrdersService.updateOrderStatus(
        pharmacyId,
        orderId,
        {
          status: "OUT_FOR_DELIVERY",
        },
      ),
    ).rejects.toMatchObject({
      message:
        "Medicine cannot leave the pharmacy until the customer completes payment.",
      statusCode: 409,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.consumeInventory).not.toHaveBeenCalled();
  });

  it("AUT-PHARM-06: blocks medicine release when a CHARGEABLE payment has FAILED", async () => {
    mocks.orderFindFirst.mockResolvedValue(
      makeOrder({
        status: "READY",
        payment: {
          chargePreference: "CHARGEABLE",
          status: "FAILED",
        },
      }),
    );

    await expect(
      pharmacyOrdersService.updateOrderStatus(
        pharmacyId,
        orderId,
        {
          status: "OUT_FOR_DELIVERY",
        },
      ),
    ).rejects.toMatchObject({
      message:
        "Medicine cannot leave the pharmacy because the customer's payment failed. A successful payment is required before release.",
      statusCode: 409,
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("AUT-PHARM-07: allows a PAID order to move from READY to OUT_FOR_DELIVERY", async () => {
    const originalOrder = makeOrder({
      status: "READY",
      payment: {
        chargePreference: "CHARGEABLE",
        status: "PAID",
      },
    });

    mocks.orderFindFirst.mockResolvedValue(originalOrder);

    mocks.txOrderFindFirst.mockResolvedValue({
      status: "READY",
      fulfilmentAllowed: true,
      payment: {
        chargePreference: "CHARGEABLE",
        status: "PAID",
      },
    });

    mocks.txOrderFindFirstOrThrow.mockResolvedValue({
      id: orderId,
      orderNumber: "CM-ORDER-001",
      status: "OUT_FOR_DELIVERY",
      statusReason: null,
      fulfilmentAllowed: true,
      acceptedAt: null,
      rejectedAt: null,
      preparingAt: null,
      readyAt: originalOrder.readyAt,
      outForDeliveryAt: new Date(),
      deliveredAt: null,
      collectedAt: null,
      cancelledAt: null,
      delayedAt: null,
      outOfStockAt: null,
      updatedAt: new Date(),
      payment: {
        chargePreference: "CHARGEABLE",
        status: "PAID",
      },
      statusHistory: [],
    });

    const result =
      await pharmacyOrdersService.updateOrderStatus(
        pharmacyId,
        orderId,
        {
          status: "OUT_FOR_DELIVERY",
        },
      );

    expect(mocks.ensureInventoryReady).toHaveBeenCalledWith(
      tx,
      pharmacyId,
      orderId,
    );

    expect(mocks.txOrderUpdateMany).toHaveBeenCalledWith({
      where: {
        id: orderId,
        pharmacyId,
        status: "READY",
      },
      data: expect.objectContaining({
        status: "OUT_FOR_DELIVERY",
        statusReason: null,
        outForDeliveryAt: expect.any(Date),
      }),
    });

    expect(mocks.txStatusHistoryCreate).toHaveBeenCalledWith({
      data: {
        orderId,
        changedById: pharmacyId,
        fromStatus: "READY",
        toStatus: "OUT_FOR_DELIVERY",
        note: null,
      },
    });

    expect(result.order.status).toBe("OUT_FOR_DELIVERY");
    expect(result.medicineRelease.allowed).toBe(true);
    expect(result.medicineRelease.paymentStatus).toBe("PAID");
  });

  it("AUT-PHARM-08: allows medicine release when payment status is NOT_REQUIRED", async () => {
    mocks.orderFindFirst.mockResolvedValue(
      makeOrder({
        status: "READY",
        payment: {
          chargePreference: "EXEMPT",
          status: "NOT_REQUIRED",
        },
      }),
    );

    mocks.txOrderFindFirst.mockResolvedValue({
      status: "READY",
      fulfilmentAllowed: true,
      payment: {
        chargePreference: "EXEMPT",
        status: "NOT_REQUIRED",
      },
    });

    mocks.txOrderFindFirstOrThrow.mockResolvedValue({
      id: orderId,
      orderNumber: "CM-ORDER-001",
      status: "COLLECTED",
      statusReason: null,
      fulfilmentAllowed: true,
      acceptedAt: null,
      rejectedAt: null,
      preparingAt: null,
      readyAt: new Date(),
      outForDeliveryAt: null,
      deliveredAt: null,
      collectedAt: new Date(),
      cancelledAt: null,
      delayedAt: null,
      outOfStockAt: null,
      updatedAt: new Date(),
      payment: {
        chargePreference: "EXEMPT",
        status: "NOT_REQUIRED",
      },
      statusHistory: [],
    });

    mocks.txOrderItemFindMany.mockResolvedValue([]);

    const result =
      await pharmacyOrdersService.updateOrderStatus(
        pharmacyId,
        orderId,
        {
          status: "COLLECTED",
        },
      );

    expect(mocks.consumeInventory).toHaveBeenCalledWith(
      tx,
      pharmacyId,
      orderId,
      expect.any(Date),
    );

    expect(result.order.status).toBe("COLLECTED");
    expect(result.medicineRelease.allowed).toBe(true);
    expect(result.medicineRelease.paymentStatus).toBe(
      "NOT_REQUIRED",
    );
  });

  it("AUT-PHARM-09: detects a concurrent status change inside the transaction", async () => {
    mocks.orderFindFirst.mockResolvedValue(
      makeOrder({
        status: "ACCEPTED",
      }),
    );

    mocks.txOrderFindFirst.mockResolvedValue({
      status: "DELAYED",
      fulfilmentAllowed: true,
      payment: basePayment,
    });

    await expect(
      pharmacyOrdersService.updateOrderStatus(
        pharmacyId,
        orderId,
        {
          status: "PREPARING",
        },
      ),
    ).rejects.toMatchObject({
      message:
        "Order status changed elsewhere. Please refresh and try again.",
      statusCode: 409,
    });

    expect(mocks.txOrderUpdateMany).not.toHaveBeenCalled();
    expect(mocks.ensureInventoryReady).not.toHaveBeenCalled();
  });

  it("AUT-PHARM-10: returns payment-aware next statuses and hides release states while payment is pending", async () => {
    mocks.orderFindFirst.mockResolvedValue({
      ...makeOrder({
        status: "READY",
        payment: {
          chargePreference: "CHARGEABLE",
          status: "PENDING",
        },
      }),
      orderSource: "DOCTOR_PRESCRIPTION",
      statusReason: null,
      dose: "500 mg",
      quantity: "1 pack",
      instructions: null,
      requestedByRole: "DOCTOR",
      requestedByName: "Dr Test",
      requestNote: null,
      prescriptionConfirmed: true,
      prescriptionConfirmedAt: new Date(),
      acceptedAt: new Date(),
      rejectedAt: null,
      preparingAt: new Date(),
      readyAt: new Date(),
      outForDeliveryAt: null,
      deliveredAt: null,
      collectedAt: null,
      cancelledAt: null,
      delayedAt: null,
      outOfStockAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),

      patient: {
        id: patientId,
        fullName: "Pharmacy Test Patient",
        email: "patient@caremate.local",
        patientProfile: {
          phoneNumber: null,
          addressLine: null,
          postcode: null,
        },
      },

      doctor: null,
      prescription: null,
      patientSubmission: null,
      items: [],

      payment: {
        id: "payment-001",
        chargePreference: "CHARGEABLE",
        chargeableItemCount: 1,
        unitChargePence: 0,
        amountPence: 0,
        currency: "GBP",
        provider: "STRIPE",
        testMode: true,
        status: "PENDING",
        paidAt: null,
        failedAt: null,
        refundedAt: null,
      },

      exemptionClaim: null,
      statusHistory: [],
    });

    const result =
      await pharmacyOrdersService.getOrderDetail(
        pharmacyId,
        orderId,
      );

    expect(result.medicineRelease).toEqual({
      allowed: false,
      paymentStatus: "PENDING",
      chargePreference: "CHARGEABLE",
    });

    expect(result.allowedNextStatuses).not.toContain(
      "OUT_FOR_DELIVERY",
    );

    expect(result.allowedNextStatuses).not.toContain(
      "COLLECTED",
    );

    expect(result.allowedNextStatuses).toEqual(
      expect.arrayContaining([
        "DELAYED",
        "CANCELLED",
      ]),
    );
  });
});
