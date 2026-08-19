import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { CreditCard, CheckCircle2, ShieldCheck } from "lucide-react-native";
import { PaymentSheetError, StripeProvider, useStripe } from "@stripe/stripe-react-native";

import { LocalizedText as Text } from "../common/LocalizedText";
import { STRIPE_PUBLISHABLE_KEY } from "../../constants/stripe";
import { patientPaymentApi, type StripePaymentStatus as PatientPaymentStatus } from "../../services/patientPaymentApi";

type Props = {
  orderId: string;
  amountPence: number;
  currency: string;
  paymentStatus: PatientPaymentStatus;
  chargePreference: "CHARGEABLE" | "EXEMPT" | "PPC";
  pricingReady: boolean;
  onPaid?: () => void | Promise<void>;
};

type InnerProps = Props;

const PRIMARY = "#4F6FE8";
const PRIMARY_DARK = "#2847B8";
const PRIMARY_LIGHT = "#E9EDFF";
const SUCCESS = "#279A70";
const SUCCESS_DARK = "#146A4D";
const SUCCESS_LIGHT = "#E5F6EF";
const SURFACE = "#FFFFFF";
const TEXT = "#111827";
const MUTED = "#788195";
const BORDER = "#E5E9F2";

const formatMoney = (amountPence: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
    }).format(amountPence / 100);
  } catch {
    return `£${(amountPence / 100).toFixed(2)}`;
  }
};

const PatientStripePaymentButtonInner = ({
  orderId,
  amountPence,
  currency,
  paymentStatus,
  chargePreference,
  pricingReady,
  onPaid,
}: InnerProps) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isPaying, setIsPaying] = useState(false);

  if (chargePreference !== "CHARGEABLE") return null;

  if (paymentStatus === "PAID") {
    return (
      <View style={styles.paidCard}>
        <View style={styles.paidIcon}>
          <CheckCircle2 size={20} color={SUCCESS_DARK} strokeWidth={2.7} />
        </View>

        <View style={styles.textArea}>
          <Text style={styles.paidTitle}>Payment complete</Text>
          <Text style={styles.paidText}>{formatMoney(amountPence, currency)} paid securely</Text>
        </View>
      </View>
    );
  }

  const handlePayment = async () => {
    if (isPaying) return;

    if (!STRIPE_PUBLISHABLE_KEY.startsWith("pk_test_")) {
      Alert.alert("Stripe setup required", "Add your Stripe test publishable key before making a test payment.");
      return;
    }

    if (!pricingReady || amountPence <= 0) {
      Alert.alert("Pricing pending", "Your pharmacy needs to finish pricing this order before payment.");
      return;
    }

    try {
      setIsPaying(true);

      const intent = await patientPaymentApi.createPaymentIntent(orderId);

      if (intent.alreadyPaid) {
        await onPaid?.();
        Alert.alert("Payment complete", "This order has already been paid.");
        return;
      }

      if (!intent.clientSecret) throw new Error("Stripe payment details are unavailable.");

      const { error: sheetInitialisationError } = await initPaymentSheet({
        merchantDisplayName: "CareMate+",
        paymentIntentClientSecret: intent.clientSecret,
        allowsDelayedPaymentMethods: false,
        appearance: {
          shapes: {
            borderRadius: 12,
          },
        },
      });

      if (sheetInitialisationError) throw new Error(sheetInitialisationError.message);

      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code === PaymentSheetError.Canceled) return;
        throw new Error(paymentError.message);
      }

      const confirmation = await patientPaymentApi.confirmPayment(orderId);

      if (!confirmation.paid || confirmation.payment.status !== "PAID") {
        throw new Error("Stripe has not confirmed this payment yet. Refresh the order and try again.");
      }

      await onPaid?.();

      Alert.alert(
        "Payment complete",
        `${formatMoney(confirmation.payment.amountPence, confirmation.payment.currency)} test payment confirmed successfully.`,
      );
    } catch (error) {
      Alert.alert(
        "Payment unsuccessful",
        error instanceof Error ? error.message : "Unable to complete the payment.",
      );
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentIcon}>
          <CreditCard size={20} color={PRIMARY_DARK} strokeWidth={2.6} />
        </View>

        <View style={styles.textArea}>
          <Text style={styles.paymentTitle}>Card payment</Text>
          <Text style={styles.paymentAmount}>
            {pricingReady && amountPence > 0 ? formatMoney(amountPence, currency) : "Pricing pending"}
          </Text>
        </View>
      </View>

      <View style={styles.secureRow}>
        <ShieldCheck size={14} color={MUTED} strokeWidth={2.4} />
        <Text style={styles.secureText}>Secure Stripe test payment</Text>
      </View>

      <TouchableOpacity
        style={[styles.payButton, (!pricingReady || amountPence <= 0 || isPaying) && styles.payButtonDisabled]}
        onPress={() => void handlePayment()}
        disabled={!pricingReady || amountPence <= 0 || isPaying}
        activeOpacity={0.86}
      >
        {isPaying ? (
          <ActivityIndicator size="small" color={SURFACE} />
        ) : (
          <>
            <CreditCard size={17} color={SURFACE} strokeWidth={2.6} />
            <Text style={styles.payButtonText}>Pay {formatMoney(amountPence, currency)}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

export const PatientStripePaymentButton = (props: Props) => {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <PatientStripePaymentButtonInner {...props} />
    </StripeProvider>
  );
};

const styles = StyleSheet.create({
  paymentCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 13,
    marginTop: 12,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textArea: {
    flex: 1,
  },
  paymentTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
  },
  paymentAmount: {
    color: PRIMARY_DARK,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  secureText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginLeft: 5,
  },
  payButton: {
    height: 46,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  payButtonDisabled: {
    opacity: 0.45,
  },
  payButtonText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 7,
  },
  paidCard: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#CBEBDD",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  paidIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  paidTitle: {
    color: SUCCESS_DARK,
    fontSize: 12,
    fontWeight: "800",
  },
  paidText: {
    color: SUCCESS,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
});