import Stripe from "stripe";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

const PAYMENT_BLOCKED_ORDER_STATUSES = new Set(["REJECTED", "CANCELLED", "DELIVERED", "COLLECTED"]);
const EDITABLE_STRIPE_STATUSES = new Set<Stripe.PaymentIntent.Status>(["requires_payment_method", "requires_confirmation"]);

const paymentSelect = {
  id: true,
  orderId: true,
  chargePreference: true,
  chargeableItemCount: true,
  unitChargePence: true,
  amountPence: true,
  currency: true,
  provider: true,
  providerPaymentIntentId: true,
  testMode: true,
  status: true,
  paidAt: true,
  failedAt: true,
  refundedAt: true,
  updatedAt: true,
} as const;

let stripeClient: Stripe | null = null;

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) throw new AppError("Stripe test payment is not configured on the server.", 503);
  if (!secretKey.startsWith("sk_test_")) throw new AppError("CareMate+ prototype payments require a Stripe test secret key.", 503);

  if (!stripeClient) stripeClient = new Stripe(secretKey);
  return stripeClient;
};

const getPatientOrderForPayment = async (patientId: string, orderId: string) => {
  const order = await prisma.medicineOrder.findFirst({
    where: { id: orderId, patientId },
    select: {
      id: true,
      orderNumber: true,
      patientId: true,
      pharmacyId: true,
      status: true,
      items: { select: { id: true, name: true, unitPricePence: true, lineTotalPence: true } },
      payment: { select: paymentSelect },
    },
  });

  if (!order) throw new AppError("Pharmacy order not found for this patient.", 404);
  return order;
};

const assertPaymentState = (
  order: Awaited<ReturnType<typeof getPatientOrderForPayment>>,
  options: { allowPaid?: boolean } = {},
) => {
  const payment = order.payment;

  if (!payment) throw new AppError("Payment information is not available for this order.", 404);

  if (options.allowPaid && payment.status === "PAID") return payment;

  if (PAYMENT_BLOCKED_ORDER_STATUSES.has(order.status)) {
    throw new AppError(`Payment cannot be started while this order is ${order.status.toLowerCase().replace(/_/g, " ")}.`, 409);
  }

  if (payment.status === "NOT_REQUIRED") {
    throw new AppError("No patient payment is required for this order.", 409);
  }

  if (payment.chargePreference === "EXEMPT" || payment.chargePreference === "PPC") {
    throw new AppError("This order is waiting for exemption verification and cannot be paid through Stripe.", 409);
  }

  if (payment.chargePreference !== "CHARGEABLE") {
    throw new AppError("Stripe payment is only available for chargeable pharmacy orders.", 409);
  }

  if (payment.provider !== "STRIPE") throw new AppError("This order is not configured for Stripe payment.", 409);
  if (!payment.testMode) throw new AppError("Live payments are disabled for the CareMate+ prototype.", 409);
  if (payment.status === "PAID") throw new AppError("This order has already been paid.", 409);
  if (payment.status === "REFUNDED") throw new AppError("A refunded payment cannot be paid again from this order.", 409);

  return payment;
};

const validatePayableOrder = async (patientId: string, orderId: string) => {
  const order = await getPatientOrderForPayment(patientId, orderId);
  const currentPayment = assertPaymentState(order);

  if (order.items.length === 0) throw new AppError("This order has no medicine items to price.", 409);

  const unpricedItems = order.items.filter(
    item => item.unitPricePence === null || item.unitPricePence <= 0 || item.lineTotalPence === null || item.lineTotalPence <= 0,
  );

  if (unpricedItems.length > 0) {
    throw new AppError(`Pharmacy pricing is not complete for ${unpricedItems.length} medicine${unpricedItems.length === 1 ? "" : "s"}.`, 409);
  }

  const calculatedAmountPence = order.items.reduce((total, item) => total + (item.lineTotalPence || 0), 0);

  if (calculatedAmountPence <= 0) throw new AppError("The calculated order total must be greater than £0.00.", 409);

  const payment =
    currentPayment.amountPence === calculatedAmountPence &&
    currentPayment.chargeableItemCount === order.items.length &&
    currentPayment.status !== "FAILED"
      ? currentPayment
      : await prisma.prescriptionPayment.update({
          where: { id: currentPayment.id },
          data: {
            chargeableItemCount: order.items.length,
            unitChargePence: 0,
            amountPence: calculatedAmountPence,
            status: "PENDING",
            failedAt: null,
          },
          select: paymentSelect,
        });

  return { order, payment };
};

const verifyStripeIntentOwnership = (
  intent: Stripe.PaymentIntent,
  payment: { id: string; orderId: string },
  patientId: string,
) => {
  if (intent.metadata.paymentId !== payment.id || intent.metadata.orderId !== payment.orderId || intent.metadata.patientId !== patientId) {
    throw new AppError("Stripe payment metadata does not match this CareMate+ order.", 409);
  }
};

const verifyStripeAmount = (intent: Stripe.PaymentIntent, amountPence: number, currency: string) => {
  if (intent.amount !== amountPence || intent.currency.toLowerCase() !== currency.toLowerCase()) {
    throw new AppError("Stripe payment amount does not match the current CareMate+ order total.", 409);
  }
};

const cancelStripeIntentSafely = async (stripe: Stripe, intent: Stripe.PaymentIntent) => {
  if (intent.status === "succeeded" || intent.status === "canceled") return;

  try {
    await stripe.paymentIntents.cancel(intent.id);
  } catch {
    return;
  }
};

const ensurePaymentStillPayable = async (
  patientId: string,
  orderId: string,
  expectedPaymentId: string,
  expectedAmountPence: number,
) => {
  const currentOrder = await getPatientOrderForPayment(patientId, orderId);
  const currentPayment = assertPaymentState(currentOrder);

  if (currentPayment.id !== expectedPaymentId) throw new AppError("Order payment information changed. Refresh the order and try again.", 409);
  if (currentPayment.amountPence !== expectedAmountPence) throw new AppError("The pharmacy order total changed. Refresh the order before paying.", 409);

  return currentPayment;
};

export const patientPaymentService = {
  async createPaymentIntent(patientId: string, orderId: string) {
    const { order, payment } = await validatePayableOrder(patientId, orderId);
    const stripe = getStripe();
    const currency = payment.currency.toLowerCase();

    let intent: Stripe.PaymentIntent | null = null;

    if (payment.providerPaymentIntentId) {
      try {
        intent = await stripe.paymentIntents.retrieve(payment.providerPaymentIntentId);
      } catch {
        intent = null;
      }
    }

    if (intent) {
      verifyStripeIntentOwnership(intent, payment, patientId);

      if (intent.status === "succeeded") {
        verifyStripeAmount(intent, payment.amountPence, payment.currency);

        const currentPayment = await ensurePaymentStillPayable(patientId, orderId, payment.id, payment.amountPence);
        const paidAt = new Date();

        const updatedPayment = await prisma.prescriptionPayment.update({
          where: { id: currentPayment.id },
          data: { status: "PAID", paidAt, failedAt: null },
          select: { id: true, amountPence: true, currency: true, status: true, paidAt: true },
        });

        return {
          alreadyPaid: true,
          clientSecret: null,
          stripePaymentIntentId: intent.id,
          stripeStatus: intent.status,
          payment: updatedPayment,
        };
      }

      if (intent.status === "canceled") {
        intent = null;
      } else {
        const amountChanged = intent.amount !== payment.amountPence;
        const currencyChanged = intent.currency.toLowerCase() !== currency;

        if (amountChanged || currencyChanged) {
          if (!EDITABLE_STRIPE_STATUSES.has(intent.status)) {
            throw new AppError("A Stripe payment is already in progress. Refresh the order before changing its payment amount.", 409);
          }

          if (currencyChanged) {
            await cancelStripeIntentSafely(stripe, intent);
            intent = null;
          } else {
            intent = await stripe.paymentIntents.update(intent.id, {
              amount: payment.amountPence,
              metadata: {
                caremateEnvironment: "prototype-test",
                paymentId: payment.id,
                orderId: order.id,
                patientId,
                pharmacyId: order.pharmacyId,
              },
            });
          }
        }
      }
    }

    await ensurePaymentStillPayable(patientId, orderId, payment.id, payment.amountPence);

    if (!intent) {
      const previousIntentId = payment.providerPaymentIntentId || "initial";

      intent = await stripe.paymentIntents.create(
        {
          amount: payment.amountPence,
          currency,
          payment_method_types: ["card"],
          description: order.orderNumber ? `CareMate+ test pharmacy order ${order.orderNumber}` : `CareMate+ test pharmacy order ${order.id}`,
          metadata: {
            caremateEnvironment: "prototype-test",
            paymentId: payment.id,
            orderId: order.id,
            patientId,
            pharmacyId: order.pharmacyId,
          },
        },
        { idempotencyKey: `caremate-${payment.id}-${payment.amountPence}-${currency}-${previousIntentId}` },
      );

      try {
        await ensurePaymentStillPayable(patientId, orderId, payment.id, payment.amountPence);
      } catch (error) {
        await cancelStripeIntentSafely(stripe, intent);
        throw error;
      }

      const attached = await prisma.prescriptionPayment.updateMany({
        where: {
          id: payment.id,
          orderId,
          chargePreference: "CHARGEABLE",
          status: { in: ["PENDING", "FAILED"] },
          amountPence: payment.amountPence,
        },
        data: { providerPaymentIntentId: intent.id, status: "PENDING", failedAt: null },
      });

      if (attached.count === 0) {
        await cancelStripeIntentSafely(stripe, intent);
        throw new AppError("Payment eligibility changed. Refresh the order before paying.", 409);
      }
    }

    try {
      await ensurePaymentStillPayable(patientId, orderId, payment.id, payment.amountPence);
    } catch (error) {
      await cancelStripeIntentSafely(stripe, intent);
      throw error;
    }

    if (!intent.client_secret) throw new AppError("Stripe did not return a payment client secret.", 502);

    return {
      alreadyPaid: false,
      clientSecret: intent.client_secret,
      stripePaymentIntentId: intent.id,
      stripeStatus: intent.status,
      payment: {
        id: payment.id,
        amountPence: payment.amountPence,
        currency: payment.currency,
        status: "PENDING" as const,
      },
    };
  },

  async confirmPayment(patientId: string, orderId: string) {
    const order = await getPatientOrderForPayment(patientId, orderId);

    if (!order.payment) throw new AppError("Payment information is not available for this order.", 404);

    if (order.payment.status === "PAID") {
      return {
        paid: true,
        stripeStatus: "succeeded",
        payment: {
          id: order.payment.id,
          amountPence: order.payment.amountPence,
          currency: order.payment.currency,
          status: order.payment.status,
          paidAt: order.payment.paidAt,
        },
      };
    }

    const payment = assertPaymentState(order);

    if (!payment.providerPaymentIntentId) throw new AppError("Start the Stripe payment before confirming it.", 409);
    if (payment.amountPence <= 0) throw new AppError("The order does not currently have a payable amount.", 409);

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(payment.providerPaymentIntentId);

    verifyStripeIntentOwnership(intent, payment, patientId);
    verifyStripeAmount(intent, payment.amountPence, payment.currency);

    if (intent.status === "succeeded") {
      const currentPayment = await ensurePaymentStillPayable(patientId, orderId, payment.id, payment.amountPence);
      const paidAt = new Date();

      const changed = await prisma.prescriptionPayment.updateMany({
        where: {
          id: currentPayment.id,
          orderId,
          chargePreference: "CHARGEABLE",
          status: { in: ["PENDING", "FAILED"] },
          amountPence: currentPayment.amountPence,
        },
        data: { status: "PAID", paidAt, failedAt: null },
      });

      if (changed.count === 0) {
        throw new AppError("Payment eligibility changed before payment confirmation. Refresh the order.", 409);
      }

      const updatedPayment = await prisma.prescriptionPayment.findUniqueOrThrow({
        where: { id: currentPayment.id },
        select: { id: true, amountPence: true, currency: true, status: true, paidAt: true },
      });

      return { paid: true, stripeStatus: intent.status, payment: updatedPayment };
    }

    if (intent.status === "canceled") {
      const failedAt = new Date();

      const updatedPayment = await prisma.prescriptionPayment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failedAt },
        select: { id: true, amountPence: true, currency: true, status: true, paidAt: true, failedAt: true },
      });

      return { paid: false, stripeStatus: intent.status, payment: updatedPayment };
    }

    await ensurePaymentStillPayable(patientId, orderId, payment.id, payment.amountPence);

    await prisma.prescriptionPayment.update({
      where: { id: payment.id },
      data: { status: "PENDING", failedAt: null },
    });

    return {
      paid: false,
      stripeStatus: intent.status,
      payment: {
        id: payment.id,
        amountPence: payment.amountPence,
        currency: payment.currency,
        status: "PENDING" as const,
        paidAt: null,
      },
    };
  },
};