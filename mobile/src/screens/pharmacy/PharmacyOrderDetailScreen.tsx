import { useCallback, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileCheck2,
  FileText,
  History,
  LockKeyhole,
  MapPin,
  PackageCheck,
  PackageSearch,
  Phone,
  Pill,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Truck,
  UserRound,
  X,
  XCircle,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import {
  pharmacyOrdersApi,
  type PharmacyOrderDetail,
  type PharmacyOrderStatus,
} from "../../services/pharmacy/pharmacy-orders.api";
import type { RootStackParamList } from "../../types/navigation";
import PharmacyInventoryMatchModal from "./PharmacyInventoryMatchModal";

type Props = NativeStackScreenProps<RootStackParamList, "PharmacyOrderDetail">;
type PharmacyMedicineItem = PharmacyOrderDetail["items"][number];

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#747C91";
const RIPPLE = "rgba(17,25,54,0.08)";
const BORDER = "#E1E6EF";

const PHARMACY = "#15803D";
const PHARMACY_DARK = "#14532D";
const PHARMACY_LIGHT = "#E9F8EF";
const PHARMACY_SOFT = "#F2FBF5";

const BLUE = "#5B86E5";
const BLUE_DARK = "#315FBA";
const BLUE_LIGHT = "#EEF4FF";

const WARNING_DARK = "#9A570D";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const exceptionStatuses = new Set<PharmacyOrderStatus>([
  "REJECTED",
  "DELAYED",
  "OUT_OF_STOCK",
  "CANCELLED",
]);

const primaryStatuses = new Set<PharmacyOrderStatus>([
  "ACCEPTED",
  "PREPARING",
  "READY",
  "COLLECTED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
]);

const verificationBlockedStatuses = new Set<PharmacyOrderStatus>([
  "REJECTED",
  "CANCELLED",
  "DELIVERED",
  "COLLECTED",
]);

const inventoryReservationRequiredStatuses = new Set<PharmacyOrderStatus>([
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
]);

const inventoryLockedStatuses = new Set<PharmacyOrderStatus>([
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COLLECTED",
  "REJECTED",
  "CANCELLED",
]);

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatus = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeUnit = (value?: string | null) => {
  if (!value) return "";

  const normalized = value.trim().toLowerCase();

  const aliases: Record<string, string> = {
    packs: "pack",
    pack: "pack",
    tablets: "tablet",
    tablet: "tablet",
    tabs: "tablet",
    tab: "tablet",
    capsules: "capsule",
    capsule: "capsule",
    caps: "capsule",
    cap: "capsule",
    bottles: "bottle",
    bottle: "bottle",
    boxes: "box",
    box: "box",
    inhalers: "inhaler",
    inhaler: "inhaler",
    units: "unit",
    unit: "unit",
  };

  return aliases[normalized] || normalized.replace(/s$/, "");
};

const pluralize = (value: string, quantity: number) => {
  if (quantity === 1 || value === "ml" || value === "g") return value;
  return `${value}s`;
};

const getSourceLabel = (source: PharmacyOrderDetail["orderSource"]) => {
  if (source === "DOCTOR_PRESCRIPTION") return "Doctor prescription";
  if (source === "PATIENT_SUBMISSION") return "Patient submission";
  if (source === "REFILL_REQUEST") return "Refill request";
  return "Manual request";
};

const getStatusTone = (status: PharmacyOrderStatus) => {
  if (status === "READY" || status === "COLLECTED" || status === "DELIVERED") {
    return { background: "#DDF7E6", color: PHARMACY_DARK };
  }

  if (status === "RECEIVED" || status === "ACCEPTED" || status === "PREPARING") {
    return { background: WARNING_LIGHT, color: WARNING_DARK };
  }

  if (
    status === "REJECTED" ||
    status === "CANCELLED" ||
    status === "OUT_OF_STOCK"
  ) {
    return { background: DANGER_LIGHT, color: DANGER_DARK };
  }

  return { background: BLUE_LIGHT, color: BLUE_DARK };
};

const formatMoney = (amountPence: number, currency = "GBP") => {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amountPence / 100);
  } catch {
    return `£${(amountPence / 100).toFixed(2)}`;
  }
};

const getActionLabel = (status: PharmacyOrderStatus) => {
  const labels: Partial<Record<PharmacyOrderStatus, string>> = {
    ACCEPTED: "Accept order",
    PREPARING: "Start preparing",
    READY: "Mark ready",
    COLLECTED: "Mark collected",
    OUT_FOR_DELIVERY: "Out for delivery",
    DELIVERED: "Mark delivered",
    REJECTED: "Reject order",
    DELAYED: "Mark delayed",
    OUT_OF_STOCK: "Out of stock",
    CANCELLED: "Cancel order",
  };

  return labels[status] || formatStatus(status);
};

const getActionConfirmation = (status: PharmacyOrderStatus) => {
  const messages: Partial<Record<PharmacyOrderStatus, string>> = {
    ACCEPTED: "Accept this medicine order for pharmacy fulfilment?",
    PREPARING: "Confirm that preparation of this order has started?",
    READY: "Confirm that this order is ready for collection or delivery?",
    COLLECTED: "Confirm that the patient has collected this order?",
    OUT_FOR_DELIVERY: "Confirm that this order has left the pharmacy for delivery?",
    DELIVERED: "Confirm that this order has been delivered?",
  };

  return messages[status] || `Change this order to ${formatStatus(status)}?`;
};

export const PharmacyOrderDetailScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();

  const [order, setOrder] = useState<PharmacyOrderDetail | null>(null);
  const [allowedNextStatuses, setAllowedNextStatuses] =
    useState<PharmacyOrderStatus[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isVerificationLoading, setIsVerificationLoading] = useState(false);
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);

  const [evidenceVisible, setEvidenceVisible] = useState(false);
  const [evidenceSource, setEvidenceSource] = useState<{
    uri: string;
    headers: Record<string, string>;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [reasonModalVisible, setReasonModalVisible] = useState(false);
  const [selectedExceptionStatus, setSelectedExceptionStatus] =
    useState<PharmacyOrderStatus | null>(null);

  const [statusReason, setStatusReason] = useState("");

  const [inventoryMatchItem, setInventoryMatchItem] =
    useState<PharmacyMedicineItem | null>(null);

  const loadOrder = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") setIsLoading(true);
        if (mode === "refresh") setIsRefreshing(true);

        setErrorMessage("");

        const result =
          await pharmacyOrdersApi.getOrderDetail(
            route.params.orderId,
          );

        setOrder(result.order);

        setAllowedNextStatuses(
          result.allowedNextStatuses || [],
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load pharmacy order.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [route.params.orderId],
  );

  useFocusEffect(
    useCallback(() => {
      void loadOrder("initial");
    }, [loadOrder]),
  );

  const refreshOrder = async () => {
    const result =
      await pharmacyOrdersApi.getOrderDetail(
        route.params.orderId,
      );

    setOrder(result.order);

    setAllowedNextStatuses(
      result.allowedNextStatuses || [],
    );
  };

  const updateStatus = async (
    status: PharmacyOrderStatus,
    reason?: string,
  ) => {
    try {
      setIsActionLoading(true);

      await pharmacyOrdersApi.updateOrderStatus(
        route.params.orderId,
        status,
        reason,
      );

      await refreshOrder();

      setReasonModalVisible(false);
      setSelectedExceptionStatus(null);
      setStatusReason("");

      Alert.alert(
        "Order updated",
        `Order status changed to ${formatStatus(status)}.`,
      );
    } catch (error) {
      Alert.alert(
        "Unable to update order",
        error instanceof Error
          ? error.message
          : "Unable to update order status.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAction = (status: PharmacyOrderStatus) => {
    if (exceptionStatuses.has(status)) {
      setSelectedExceptionStatus(status);
      setStatusReason("");
      setReasonModalVisible(true);
      return;
    }

    Alert.alert(
      "Update order status",
      getActionConfirmation(status),
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: getActionLabel(status),
          onPress: () =>
            void updateStatus(status),
        },
      ],
    );
  };

  const submitExceptionStatus = () => {
    const reason = statusReason.trim();

    if (!selectedExceptionStatus) return;

    if (reason.length < 5) {
      Alert.alert(
        "Reason required",
        "Please provide a clear reason of at least 5 characters.",
      );
      return;
    }

    void updateStatus(
      selectedExceptionStatus,
      reason,
    );
  };

  const verifyExternalEvidence = async () => {
    try {
      setIsVerificationLoading(true);

      const result =
        await pharmacyOrdersApi.verifyPatientRefillRequest(
          route.params.orderId,
        );

      setOrder(result.order);

      setAllowedNextStatuses(
        result.allowedNextStatuses || [],
      );

      Alert.alert(
        "Evidence verified",
        "The supporting evidence has been reviewed. Pharmacy fulfilment is now allowed for this request.",
      );
    } catch (error) {
      Alert.alert(
        "Unable to verify evidence",
        error instanceof Error
          ? error.message
          : "The supporting evidence could not be verified.",
      );
    } finally {
      setIsVerificationLoading(false);
    }
  };

  const handleVerifyExternalEvidence = () => {
    Alert.alert(
      "Verify supporting evidence",
      "Confirm that pharmacy staff have reviewed the patient's supporting evidence and allow this medicine request to continue? This does not represent doctor prescribing.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Verify evidence",
          onPress: () =>
            void verifyExternalEvidence(),
        },
      ],
    );
  };

  const openPatientRefillEvidence = async () => {
    if (
      !order?.patientSubmission?.imageUrl ||
      isEvidenceLoading
    ) {
      return;
    }

    try {
      setIsEvidenceLoading(true);

      const source =
        await pharmacyOrdersApi.getPatientRefillEvidenceSource(
          route.params.orderId,
        );

      setEvidenceSource(source);
      setEvidenceVisible(true);
    } catch (error) {
      Alert.alert(
        "Unable to open evidence",
        error instanceof Error
          ? error.message
          : "The supporting evidence could not be opened.",
      );
    } finally {
      setIsEvidenceLoading(false);
    }
  };

  const address = order
    ? [
        order.patient.patientProfile?.addressLine,
        order.patient.patientProfile?.postcode,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const statusTone =
    order ? getStatusTone(order.status) : null;

  const primaryActions =
    allowedNextStatuses.filter(status =>
      primaryStatuses.has(status),
    );

  const exceptionActions =
    allowedNextStatuses.filter(status =>
      exceptionStatuses.has(status),
    );

  const refillSubmission =
    order?.orderSource === "REFILL_REQUEST"
      ? order.patientSubmission
      : null;

  const isAssignedDoctorRefill =
    refillSubmission?.verificationPath ===
    "ASSIGNED_DOCTOR";

  const isExternalEvidenceRefill =
    refillSubmission?.verificationPath ===
    "EXTERNAL_EVIDENCE";

  const isCareMatePrescriptionRefill =
    refillSubmission?.verificationPath ===
    "CAREMATE_PRESCRIPTION";

  const awaitingDoctorConfirmation = Boolean(
    order &&
      isAssignedDoctorRefill &&
      refillSubmission?.doctorVerificationStatus ===
        "PENDING" &&
      !order.fulfilmentAllowed,
  );

  const doctorConfirmedRefill = Boolean(
    order &&
      isAssignedDoctorRefill &&
      refillSubmission?.doctorVerificationStatus ===
        "CONFIRMED" &&
      order.fulfilmentAllowed,
  );

  const doctorRejectedRefill = Boolean(
    isAssignedDoctorRefill &&
      refillSubmission?.doctorVerificationStatus ===
        "REJECTED",
  );

  const canVerifyExternalEvidence = Boolean(
    order &&
      isExternalEvidenceRefill &&
      refillSubmission?.status ===
        "VERIFICATION_REQUIRED" &&
      refillSubmission.imageUrl &&
      !order.prescriptionConfirmed &&
      !order.fulfilmentAllowed &&
      !verificationBlockedStatuses.has(
        order.status,
      ),
  );

  const pharmacistVerifiedExternalEvidence = Boolean(
    order &&
      isExternalEvidenceRefill &&
      refillSubmission?.status ===
        "VERIFIED" &&
      order.fulfilmentAllowed,
  );

  const inventoryEditable = Boolean(
    order &&
      order.fulfilmentAllowed &&
      order.status !== "RECEIVED" &&
      !inventoryLockedStatuses.has(
        order.status,
      ),
  );

  const allInventoryReady = order
    ? order.items.length === 0 ||
      order.items.every(item =>
        Boolean(
          item.inventoryItemId &&
            item.inventoryItem &&
            item.inventoryItem.isActive &&
            item.inventoryReservedQuantity > 0 &&
            item.inventoryReservedAt &&
            !item.inventoryConsumedAt &&
            !item.inventoryReleasedAt &&
            item.unitPricePence &&
            item.unitPricePence > 0 &&
            item.lineTotalPence &&
            item.lineTotalPence > 0 &&
            item.dispensedQuantity &&
            item.dispensedQuantity > 0 &&
            item.dispensedUnit,
        ),
      )
    : true;

  const inventoryReadyCount = order
    ? order.items.filter(item =>
        Boolean(
          item.inventoryItemId &&
            item.inventoryItem &&
            item.inventoryItem.isActive &&
            item.inventoryReservedQuantity > 0 &&
            item.inventoryReservedAt &&
            !item.inventoryConsumedAt &&
            !item.inventoryReleasedAt &&
            item.unitPricePence &&
            item.unitPricePence > 0 &&
            item.lineTotalPence &&
            item.lineTotalPence > 0 &&
            item.dispensedQuantity &&
            item.dispensedQuantity > 0 &&
            item.dispensedUnit,
        ),
      ).length
    : 0;

  const pricingComplete = Boolean(
    order &&
      order.items.length > 0 &&
      order.items.every(
        item =>
          item.unitPricePence !== null &&
          item.unitPricePence > 0 &&
          item.lineTotalPence !== null &&
          item.lineTotalPence > 0,
      ),
  );

  const medicineReleaseTerminal = Boolean(
    order &&
      ["DELIVERED", "COLLECTED", "REJECTED", "CANCELLED"].includes(
        order.status,
      ),
  );

  const medicineReleaseAllowed = Boolean(
    order?.payment &&
      (order.payment.status === "PAID" ||
        order.payment.status === "NOT_REQUIRED"),
  );

  const medicineReleaseLocked = Boolean(
    order && !medicineReleaseTerminal && !medicineReleaseAllowed,
  );

  const medicineReleaseTitle = (() => {
    if (!order?.payment) return "Medicine release locked";
    if (order.payment.status === "FAILED") return "Payment failed — release locked";
    if (order.payment.status === "REFUNDED") return "Payment refunded — release locked";
    if (order.payment.chargePreference === "EXEMPT" || order.payment.chargePreference === "PPC") {
      return "Exemption verification required";
    }
    return "Payment required before release";
  })();

  const medicineReleaseDescription = (() => {
    if (!order?.payment) {
      return "Payment information is unavailable. Medicine cannot leave the pharmacy until the payment requirement is resolved.";
    }

    if (order.payment.status === "FAILED") {
      return "The patient's payment was unsuccessful. The order may remain prepared, but it cannot be collected or sent for delivery until a successful payment is confirmed.";
    }

    if (order.payment.status === "REFUNDED") {
      return "This payment has been refunded. Medicine cannot be collected or sent for delivery.";
    }

    if (order.payment.chargePreference === "EXEMPT" || order.payment.chargePreference === "PPC") {
      return "The patient's exemption is not yet verified. The order may be prepared, but medicine cannot leave the pharmacy until the exemption is approved.";
    }

  })();

  const hasInventoryBlockedAction =
    primaryActions.some(status =>
      inventoryReservationRequiredStatuses.has(
        status,
      ),
    );

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >
      <StatusBar
        backgroundColor={BACKGROUND}
        barStyle="dark-content"
      />

      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: Math.max(
                insets.bottom + 36,
                50,
              ),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() =>
                void loadOrder("refresh")
              }
              tintColor={PHARMACY}
              colors={[PHARMACY]}
            />
          }
        >
          <View style={styles.header}>
            <View style={styles.appBar}>
              <Pressable
                android_ripple={{
                  color: RIPPLE,
                }}
                style={styles.backButton}
                onPress={() =>
                  navigation.goBack()
                }
              >
                <ArrowLeft
                  size={23}
                  color={TEXT}
                  strokeWidth={2.5}
                />
              </Pressable>

              <View style={styles.appBarText}>
                <Text
                  style={styles.appBarTitle}
                >
                  Medicine order
                </Text>

                <Text
                  style={
                    styles.appBarSubtitle
                  }
                >
                  Pharmacy fulfilment
                </Text>
              </View>
            </View>

            {!isLoading &&
            !errorMessage &&
            order &&
            statusTone ? (
              <View
                style={styles.headerContent}
              >
                <View
                  style={
                    styles.orderSourceRow
                  }
                >
                  <View
                    style={
                      styles.headerSourceIcon
                    }
                  >
                    {order.orderSource ===
                    "DOCTOR_PRESCRIPTION" ? (
                      <BadgeCheck
                        size={19}
                        color={
                          PHARMACY_DARK
                        }
                        strokeWidth={2.6}
                      />
                    ) : (
                      <FileText
                        size={19}
                        color={BLUE_DARK}
                        strokeWidth={2.6}
                      />
                    )}
                  </View>

                  <Text
                    style={
                      styles.headerSourceText
                    }
                  >
                    {getSourceLabel(
                      order.orderSource,
                    )}
                  </Text>

                  <View
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor:
                          statusTone.background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            statusTone.color,
                        },
                      ]}
                    >
                      {formatStatus(
                        order.status,
                      )}
                    </Text>
                  </View>
                </View>

                <Text
                  style={
                    styles.orderNumber
                  }
                  numberOfLines={1}
                >
                  {order.orderNumber ||
                    `Order ${order.id.slice(
                      0,
                      8,
                    )}`}
                </Text>

                <View
                  style={
                    styles.receivedRow
                  }
                >
                  <Clock3
                    size={14}
                    color="#D9F5E2"
                    strokeWidth={2.3}
                  />

                  <Text
                    style={
                      styles.receivedText
                    }
                  >
                    {formatDateTime(
                      order.createdAt,
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.verificationBar
                  }
                >
                  <VerificationStatus
                    active={
                      order.prescriptionConfirmed
                    }
                    label="Doctor linked"
                  />

                  <View
                    style={
                      styles.headerDivider
                    }
                  />

                  <VerificationStatus
                    active={
                      order.fulfilmentAllowed
                    }
                    label="Fulfilment allowed"
                  />
                </View>
              </View>
            ) : null}
          </View>

          {isLoading ? (
            <View style={styles.stateArea}>
              <ActivityIndicator
                color={PHARMACY}
              />

              <Text
                style={styles.stateTitle}
              >
                Loading order
              </Text>

              <Text
                style={styles.stateText}
              >
                Retrieving medicine order
                information
              </Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.stateArea}>
              <View
                style={styles.errorIcon}
              >
                <AlertCircle
                  size={24}
                  color={DANGER}
                  strokeWidth={2.5}
                />
              </View>

              <Text
                style={styles.errorTitle}
              >
                Order unavailable
              </Text>

              <Text
                style={styles.stateText}
              >
                {errorMessage}
              </Text>

              <Pressable
                android_ripple={{
                  color: RIPPLE,
                }}
                style={styles.retryButton}
                onPress={() =>
                  void loadOrder("initial")
                }
              >
                <RefreshCw
                  size={16}
                  color={SURFACE}
                  strokeWidth={2.5}
                />

                <Text
                  style={styles.retryText}
                >
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!isLoading &&
          !errorMessage &&
          order ? (
            <View style={styles.body}>
              <View
                style={styles.quickInfoRow}
              >
                <QuickInfo
                  background={BLUE_LIGHT}
                  icon={
                    <UserRound
                      size={20}
                      color={BLUE}
                      strokeWidth={2.5}
                    />
                  }
                  label="Patient"
                  value={order.patient.fullName}
                />

                <QuickInfo
                  background={PHARMACY_LIGHT}
                  icon={
                    <Pill
                      size={20}
                      color={PHARMACY}
                      strokeWidth={2.5}
                    />
                  }
                  label="Medicines"
                  value={String(
                    order.items.length,
                  )}
                />

                <QuickInfo
                  background={WARNING_LIGHT}
                  icon={
                    <CreditCard
                      size={20}
                      color={WARNING_DARK}
                      strokeWidth={2.5}
                    />
                  }
                  label="Payment"
                  value={
                    order.payment
                      ? formatStatus(
                          order.payment.status,
                        )
                      : "None"
                  }
                />
              </View>

              <SectionHeading
                title="Order actions"
                icon={
                  <PackageCheck
                    size={18}
                    color={PHARMACY}
                    strokeWidth={2.5}
                  />
                }
              />

              <View
                style={styles.actionsPanel}
              >
                {medicineReleaseLocked ? (
                  <View style={styles.paymentReleaseLockedPanel}>
                    <View style={styles.paymentReleaseLockIcon}>
                      <LockKeyhole size={21} color={WARNING_DARK} strokeWidth={2.6} />
                    </View>

                    <View style={styles.paymentReleaseLockContent}>
                      <Text style={styles.paymentReleaseLockTitle}>
                        {medicineReleaseTitle}
                      </Text>
                      <Text style={styles.paymentReleaseLockDescription}>
                        {medicineReleaseDescription}
                      </Text>

                      <View style={styles.paymentReleaseRule}>
                        <CreditCard size={14} color={WARNING_DARK} strokeWidth={2.5} />
                        <Text style={styles.paymentReleaseRuleText}>
                          Release allowed only when payment is Paid or exemption is Not Required.
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : order?.payment && medicineReleaseAllowed && !medicineReleaseTerminal ? (
                  <View style={styles.paymentReleaseUnlockedPanel}>
                    <CheckCircle2 size={19} color={PHARMACY_DARK} strokeWidth={2.6} />

                    <View style={styles.paymentReleaseUnlockedContent}>
                      <Text style={styles.paymentReleaseUnlockedTitle}>
                        Medicine release unlocked
                      </Text>
                      <Text style={styles.paymentReleaseUnlockedDescription}>
                        {order.payment.status === "PAID"
                          ? "Customer payment has been confirmed. Collection or delivery can continue when the order is ready."
                          : "No prescription payment is required. Collection or delivery can continue when the order is ready."}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {awaitingDoctorConfirmation ? (
                  <View
                    style={
                      styles.doctorLockedPanel
                    }
                  >
                    <View
                      style={
                        styles.verificationHeader
                      }
                    >
                      <View
                        style={
                          styles.lockIcon
                        }
                      >
                        <LockKeyhole
                          size={21}
                          color={WARNING_DARK}
                          strokeWidth={2.6}
                        />
                      </View>

                      <View
                        style={
                          styles.verificationContent
                        }
                      >
                        <Text
                          style={
                            styles.warningTitle
                          }
                        >
                          Waiting for doctor
                          confirmation
                        </Text>

                        <Text
                          style={
                            styles.warningDescription
                          }
                        >
                          The patient states
                          that{" "}
                          {refillSubmission
                            ?.verificationDoctor
                            ?.fullName ||
                            "their selected CareMate+ doctor"}{" "}
                          prescribed or
                          recommended this
                          medicine. Pharmacy
                          cannot fulfil this
                          request until that
                          doctor confirms it.
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {doctorConfirmedRefill ? (
                  <View
                    style={
                      styles.successPanel
                    }
                  >
                    <CheckCircle2
                      size={19}
                      color={PHARMACY_DARK}
                      strokeWidth={2.6}
                    />

                    <View
                      style={
                        styles.successContent
                      }
                    >
                      <Text
                        style={
                          styles.successTitle
                        }
                      >
                        Doctor confirmation
                        completed
                      </Text>

                      <Text
                        style={
                          styles.successDescription
                        }
                      >
                        {refillSubmission
                          ?.verificationDoctor
                          ?.fullName ||
                          "The selected doctor"}{" "}
                        confirmed the medicine
                        request. Pharmacy
                        fulfilment is unlocked.
                      </Text>
                    </View>
                  </View>
                ) : null}

                {doctorRejectedRefill ? (
                  <View
                    style={
                      styles.rejectedPanel
                    }
                  >
                    <XCircle
                      size={19}
                      color={DANGER_DARK}
                      strokeWidth={2.6}
                    />

                    <View
                      style={
                        styles.rejectedContent
                      }
                    >
                      <Text
                        style={
                          styles.rejectedTitle
                        }
                      >
                        Doctor did not confirm
                        this request
                      </Text>

                      <Text
                        style={
                          styles.rejectedDescription
                        }
                      >
                        The selected doctor
                        rejected the patient's
                        claim. This request
                        cannot continue to
                        pharmacy fulfilment.
                      </Text>
                    </View>
                  </View>
                ) : null}

                {canVerifyExternalEvidence ? (
                  <View
                    style={
                      styles.evidenceReviewPanel
                    }
                  >
                    <View
                      style={
                        styles.verificationHeader
                      }
                    >
                      <View
                        style={
                          styles.evidenceIcon
                        }
                      >
                        <FileCheck2
                          size={21}
                          color={WARNING_DARK}
                          strokeWidth={2.6}
                        />
                      </View>

                      <View
                        style={
                          styles.verificationContent
                        }
                      >
                        <Text
                          style={
                            styles.warningTitle
                          }
                        >
                          External evidence review
                          required
                        </Text>

                        <Text
                          style={
                            styles.warningDescription
                          }
                        >
                          Review the patient's
                          protected supporting
                          evidence before allowing
                          pharmacy fulfilment.
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      android_ripple={{
                        color: RIPPLE,
                      }}
                      style={[
                        styles.viewEvidenceButton,
                        isEvidenceLoading &&
                          styles.disabledAction,
                      ]}
                      disabled={
                        isEvidenceLoading ||
                        isActionLoading
                      }
                      onPress={() =>
                        void openPatientRefillEvidence()
                      }
                    >
                      {isEvidenceLoading ? (
                        <ActivityIndicator
                          color={BLUE_DARK}
                        />
                      ) : (
                        <>
                          <Eye
                            size={18}
                            color={BLUE_DARK}
                            strokeWidth={2.6}
                          />

                          <Text
                            style={
                              styles.viewEvidenceButtonText
                            }
                          >
                            View evidence
                          </Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      android_ripple={{
                        color: RIPPLE,
                      }}
                      style={[
                        styles.verifyEvidenceButton,
                        isVerificationLoading &&
                          styles.disabledAction,
                      ]}
                      disabled={
                        isVerificationLoading ||
                        isActionLoading
                      }
                      onPress={
                        handleVerifyExternalEvidence
                      }
                    >
                      {isVerificationLoading ? (
                        <ActivityIndicator
                          color={SURFACE}
                        />
                      ) : (
                        <>
                          <ShieldCheck
                            size={18}
                            color={SURFACE}
                            strokeWidth={2.6}
                          />

                          <Text
                            style={
                              styles.verifyEvidenceButtonText
                            }
                          >
                            Verify evidence
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ) : null}

                {pharmacistVerifiedExternalEvidence ? (
                  <View
                    style={
                      styles.successPanel
                    }
                  >
                    <CheckCircle2
                      size={19}
                      color={PHARMACY_DARK}
                      strokeWidth={2.6}
                    />

                    <View
                      style={
                        styles.successContent
                      }
                    >
                      <Text
                        style={
                          styles.successTitle
                        }
                      >
                        External evidence verified
                      </Text>

                      <Text
                        style={
                          styles.successDescription
                        }
                      >
                        Pharmacy review is complete
                        and fulfilment is allowed.
                        This does not represent
                        doctor prescribing.
                      </Text>
                    </View>

                    {refillSubmission?.imageUrl ? (
                      <Pressable
                        android_ripple={{
                          color: RIPPLE,
                        }}
                        style={
                          styles.smallEvidenceButton
                        }
                        onPress={() =>
                          void openPatientRefillEvidence()
                        }
                      >
                        <Eye
                          size={16}
                          color={BLUE_DARK}
                          strokeWidth={2.5}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {isCareMatePrescriptionRefill ? (
                  <View
                    style={
                      styles.successPanel
                    }
                  >
                    <BadgeCheck
                      size={19}
                      color={PHARMACY_DARK}
                      strokeWidth={2.6}
                    />

                    <View
                      style={
                        styles.successContent
                      }
                    >
                      <Text
                        style={
                          styles.successTitle
                        }
                      >
                        CareMate+ prescription
                      </Text>

                      <Text
                        style={
                          styles.successDescription
                        }
                      >
                        This refill is linked to an
                        existing CareMate+ doctor
                        prescription.
                      </Text>
                    </View>
                  </View>
                ) : null}

                {!order.fulfilmentAllowed &&
                primaryActions.length > 0 ? (
                  <View
                    style={
                      styles.fulfilmentWarning
                    }
                  >
                    <AlertCircle
                      size={18}
                      color={WARNING_DARK}
                      strokeWidth={2.5}
                    />

                    <Text
                      style={
                        styles.fulfilmentWarningText
                      }
                    >
                      Fulfilment actions remain
                      locked until this request is
                      authorised.
                    </Text>
                  </View>
                ) : null}

                {order.status === "RECEIVED" &&
                order.fulfilmentAllowed &&
                order.items.length > 0 ? (
                  <View
                    style={
                      styles.inventoryInfoPanel
                    }
                  >
                    <PackageSearch
                      size={18}
                      color={BLUE_DARK}
                      strokeWidth={2.5}
                    />

                    <Text
                      style={
                        styles.inventoryInfoText
                      }
                    >
                      Accept this order first.
                      Stock matching will then
                      unlock for each medicine.
                    </Text>
                  </View>
                ) : null}

                {order.status !== "RECEIVED" &&
                order.items.length > 0 ? (
                  <View
                    style={[
                      styles.inventorySummary,
                      allInventoryReady
                        ? styles.inventorySummaryReady
                        : styles.inventorySummaryPending,
                    ]}
                  >
                    {allInventoryReady ? (
                      <PackageCheck
                        size={19}
                        color={PHARMACY_DARK}
                        strokeWidth={2.6}
                      />
                    ) : (
                      <PackageSearch
                        size={19}
                        color={WARNING_DARK}
                        strokeWidth={2.6}
                      />
                    )}

                    <View
                      style={
                        styles.inventorySummaryText
                      }
                    >
                      <Text
                        style={[
                          styles.inventorySummaryTitle,
                          {
                            color:
                              allInventoryReady
                                ? PHARMACY_DARK
                                : WARNING_DARK,
                          },
                        ]}
                      >
                        {allInventoryReady
                          ? "Inventory ready"
                          : "Inventory matching required"}
                      </Text>

                      <Text
                        style={
                          styles.inventorySummaryMeta
                        }
                      >
                        {inventoryReadyCount}/
                        {order.items.length} medicines
                        matched with stock and price
                      </Text>
                    </View>
                  </View>
                ) : null}

                {!allInventoryReady &&
                hasInventoryBlockedAction ? (
                  <View
                    style={
                      styles.inventoryActionWarning
                    }
                  >
                    <PackageSearch
                      size={18}
                      color={WARNING_DARK}
                      strokeWidth={2.5}
                    />

                    <Text
                      style={
                        styles.fulfilmentWarningText
                      }
                    >
                      Match pharmacy stock and
                      confirm pricing for every
                      medicine before preparation
                      can continue.
                    </Text>
                  </View>
                ) : null}

                {primaryActions.map(status => {
                  const inventoryBlocked =
                    inventoryReservationRequiredStatuses.has(
                      status,
                    ) &&
                    !allInventoryReady;

                  const actionDisabled =
                    !order.fulfilmentAllowed ||
                    isActionLoading ||
                    inventoryBlocked;

                  return (
                    <Pressable
                      android_ripple={{
                        color: RIPPLE,
                      }}
                      key={status}
                      style={[
                        styles.primaryActionButton,
                        actionDisabled &&
                          styles.disabledAction,
                      ]}
                      disabled={actionDisabled}
                      onPress={() =>
                        handleAction(status)
                      }
                    >
                      {status ===
                      "OUT_FOR_DELIVERY" ? (
                        <Truck
                          size={19}
                          color={SURFACE}
                          strokeWidth={2.6}
                        />
                      ) : (
                        <CheckCircle2
                          size={19}
                          color={SURFACE}
                          strokeWidth={2.6}
                        />
                      )}

                      <Text
                        style={
                          styles.primaryActionText
                        }
                      >
                        {getActionLabel(status)}
                      </Text>
                    </Pressable>
                  );
                })}

                {exceptionActions.length > 0 ? (
                  <View
                    style={
                      styles.exceptionActions
                    }
                  >
                    {exceptionActions.map(
                      status => (
                        <Pressable
                          android_ripple={{
                            color: RIPPLE,
                          }}
                          key={status}
                          style={
                            styles.exceptionButton
                          }
                          disabled={
                            isActionLoading
                          }
                          onPress={() =>
                            handleAction(status)
                          }
                        >
                          <XCircle
                            size={16}
                            color={DANGER_DARK}
                            strokeWidth={2.5}
                          />

                          <Text
                            style={
                              styles.exceptionButtonText
                            }
                          >
                            {getActionLabel(
                              status,
                            )}
                          </Text>
                        </Pressable>
                      ),
                    )}
                  </View>
                ) : null}

                {allowedNextStatuses.length ===
                0 ? (
                  <View
                    style={
                      styles.terminalStatus
                    }
                  >
                    <CheckCircle2
                      size={20}
                      color={PHARMACY}
                      strokeWidth={2.6}
                    />

                    <View
                      style={
                        styles.terminalText
                      }
                    >
                      <Text
                        style={
                          styles.terminalTitle
                        }
                      >
                        No further pharmacy action
                      </Text>

                      <Text
                        style={
                          styles.terminalSubtitle
                        }
                      >
                        This order is currently{" "}
                        {formatStatus(
                          order.status,
                        ).toLowerCase()}
                        .
                      </Text>
                    </View>
                  </View>
                ) : null}

                {isActionLoading ? (
                  <View
                    style={
                      styles.actionLoading
                    }
                  >
                    <ActivityIndicator
                      color={PHARMACY}
                    />

                    <Text
                      style={
                        styles.actionLoadingText
                      }
                    >
                      Updating order...
                    </Text>
                  </View>
                ) : null}
              </View>

              <SectionHeading
                title="Patient"
                icon={
                  <UserRound
                    size={18}
                    color={BLUE}
                    strokeWidth={2.5}
                  />
                }
              />

              <View
                style={styles.patientPanel}
              >
                <View
                  style={styles.profileRow}
                >
                  <View
                    style={
                      styles.patientAvatar
                    }
                  >
                    <UserRound
                      size={25}
                      color={BLUE_DARK}
                      strokeWidth={2.4}
                    />
                  </View>

                  <View
                    style={
                      styles.profileText
                    }
                  >
                    <Text
                      style={
                        styles.profileName
                      }
                    >
                      {order.patient.fullName}
                    </Text>

                    <Text
                      style={
                        styles.profileEmail
                      }
                    >
                      {order.patient.email}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.contactGrid
                  }
                >
                  <ContactItem
                    icon={
                      <Phone
                        size={16}
                        color={BLUE_DARK}
                        strokeWidth={2.3}
                      />
                    }
                    text={
                      order.patient
                        .patientProfile
                        ?.phoneNumber ||
                      "No phone"
                    }
                  />

                  <ContactItem
                    icon={
                      <MapPin
                        size={16}
                        color={BLUE_DARK}
                        strokeWidth={2.3}
                      />
                    }
                    text={
                      address ||
                      "No address"
                    }
                  />
                </View>
              </View>

              {order.doctor ? (
                <>
                  <SectionHeading
                    title="Prescriber"
                    icon={
                      <Stethoscope
                        size={18}
                        color={PHARMACY}
                        strokeWidth={2.5}
                      />
                    }
                  />

                  <View
                    style={
                      styles.prescriberPanel
                    }
                  >
                    <View
                      style={
                        styles.prescriberIcon
                      }
                    >
                      <Stethoscope
                        size={22}
                        color={PHARMACY_DARK}
                        strokeWidth={2.4}
                      />
                    </View>

                    <View
                      style={
                        styles.prescriberText
                      }
                    >
                      <Text
                        style={
                          styles.prescriberName
                        }
                      >
                        {order.doctor.fullName}
                      </Text>

                      <Text
                        style={
                          styles.prescriberSpeciality
                        }
                      >
                        {order.doctor
                          .doctorProfile
                          ?.specialization ||
                          "Doctor"}
                      </Text>

                      {order.prescription ? (
                        <Text
                          style={
                            styles.prescribedDate
                          }
                        >
                          Prescribed{" "}
                          {formatDateTime(
                            order
                              .prescription
                              .prescribedAt,
                          )}
                        </Text>
                      ) : null}
                    </View>

                    <BadgeCheck
                      size={20}
                      color={PHARMACY}
                      strokeWidth={2.5}
                    />
                  </View>
                </>
              ) : null}

              <SectionHeading
                title="Medicines & inventory"
                subtitle={`${inventoryReadyCount}/${order.items.length} ready`}
                icon={
                  <Pill
                    size={18}
                    color={PHARMACY}
                    strokeWidth={2.5}
                  />
                }
              />

              <View
                style={
                  styles.medicineContainer
                }
              >
                {order.items.length > 0 ? (
                  order.items.map(
                    (item, index) => (
                      <MedicineItem
                        key={item.id}
                        item={item}
                        index={index}
                        last={
                          index ===
                          order.items.length - 1
                        }
                        inventoryEditable={
                          inventoryEditable
                        }
                        orderStatus={
                          order.status
                        }
                        currency={
                          order.payment
                            ?.currency ||
                          "GBP"
                        }
                        onManageStock={() =>
                          setInventoryMatchItem(
                            item,
                          )
                        }
                      />
                    ),
                  )
                ) : (
                  <View
                    style={
                      styles.medicineEmpty
                    }
                  >
                    <Pill
                      size={23}
                      color={MUTED}
                      strokeWidth={2.3}
                    />

                    <Text
                      style={styles.emptyText}
                    >
                      No medicines attached to
                      this order.
                    </Text>
                  </View>
                )}
              </View>

              {order.prescription?.notes ||
              order.requestNote ||
              order.statusReason ? (
                <>
                  <SectionHeading
                    title="Notes"
                    icon={
                      <FileText
                        size={18}
                        color={WARNING_DARK}
                        strokeWidth={2.4}
                      />
                    }
                  />

                  <View
                    style={
                      styles.notesPanel
                    }
                  >
                    {order.prescription
                      ?.notes ? (
                      <NoteItem
                        title="Doctor note"
                        text={
                          order.prescription
                            .notes
                        }
                      />
                    ) : null}

                    {order.requestNote ? (
                      <NoteItem
                        title="Request"
                        text={
                          order.requestNote
                        }
                      />
                    ) : null}

                    {order.statusReason ? (
                      <NoteItem
                        title="Status"
                        text={
                          order.statusReason
                        }
                      />
                    ) : null}
                  </View>
                </>
              ) : null}

              <SectionHeading
                title="Payment"
                icon={
                  <CreditCard
                    size={18}
                    color={WARNING_DARK}
                    strokeWidth={2.4}
                  />
                }
              />

              <View
                style={styles.paymentPanel}
              >
                {order.payment ? (
                  <>
                    <View
                      style={
                        styles.paymentTop
                      }
                    >
                      <View
                        style={
                          styles.paymentIcon
                        }
                      >
                        <CreditCard
                          size={21}
                          color={WARNING_DARK}
                          strokeWidth={2.5}
                        />
                      </View>

                      <View
                        style={
                          styles.paymentText
                        }
                      >
                        <Text
                          style={
                            styles.paymentPreference
                          }
                        >
                          {formatStatus(
                            order.payment
                              .chargePreference,
                          )}
                        </Text>

                        <Text
                          style={
                            styles.paymentMode
                          }
                        >
                          {order.payment
                            .testMode
                            ? "CareMate+ test payment"
                            : "Prescription payment"}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.paymentAmount
                        }
                      >
                        <Text
                          style={
                            styles.paymentAmountText
                          }
                        >
                          {pricingComplete
                            ? formatMoney(
                                order.payment
                                  .amountPence,
                                order.payment
                                  .currency,
                              )
                            : "Pending"}
                        </Text>

                        <Text
                          style={
                            styles.paymentStatus
                          }
                        >
                          {formatStatus(
                            order.payment
                              .status,
                          )}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        pricingComplete
                          ? styles.pricingReady
                          : styles.pricingPending
                      }
                    >
                      {pricingComplete ? (
                        <CheckCircle2
                          size={16}
                          color={
                            PHARMACY_DARK
                          }
                          strokeWidth={2.5}
                        />
                      ) : (
                        <PackageSearch
                          size={16}
                          color={
                            WARNING_DARK
                          }
                          strokeWidth={2.5}
                        />
                      )}

                      <Text
                        style={[
                          styles.pricingStatusText,
                          {
                            color:
                              pricingComplete
                                ? PHARMACY_DARK
                                : WARNING_DARK,
                          },
                        ]}
                      >
                        {pricingComplete
                          ? "Medicine pricing complete"
                          : "Match all medicines to calculate the final order total"}
                      </Text>
                    </View>

                    {order.items.some(
                      item =>
                        item.lineTotalPence !==
                        null,
                    ) ? (
                      <View
                        style={
                          styles.paymentBreakdown
                        }
                      >
                        <Text
                          style={
                            styles.paymentBreakdownTitle
                          }
                        >
                          ORDER BREAKDOWN
                        </Text>

                        {order.items.map(item => (
                          <View
                            key={item.id}
                            style={
                              styles.paymentLine
                            }
                          >
                            <View
                              style={
                                styles.paymentLineText
                              }
                            >
                              <Text
                                style={
                                  styles.paymentLineName
                                }
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>

                              <Text
                                style={
                                  styles.paymentLineMeta
                                }
                              >
                                {item.unitPricePence !==
                                  null
                                  ? `${formatMoney(
                                      item.unitPricePence,
                                      order.payment
                                        ?.currency ||
                                        "GBP",
                                    )} per ${
                                      item
                                        .inventoryItem
                                        ?.stockUnit ||
                                      item.quantityUnit ||
                                      "unit"
                                    }`
                                  : "Price pending"}
                              </Text>
                            </View>

                            <Text
                              style={
                                styles.paymentLineTotal
                              }
                            >
                              {item.lineTotalPence !==
                              null
                                ? formatMoney(
                                    item.lineTotalPence,
                                    order.payment
                                      ?.currency ||
                                      "GBP",
                                  )
                                : "—"}
                            </Text>
                          </View>
                        ))}

                        <View
                          style={
                            styles.paymentTotalRow
                          }
                        >
                          <Text
                            style={
                              styles.paymentTotalLabel
                            }
                          >
                            Order total
                          </Text>

                          <Text
                            style={
                              styles.paymentTotalValue
                            }
                          >
                            {pricingComplete
                              ? formatMoney(
                                  order.payment
                                    .amountPence,
                                  order.payment
                                    .currency,
                                )
                              : "Pending"}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <Text
                    style={styles.emptyText}
                  >
                    No payment information
                    required.
                  </Text>
                )}
              </View>

              {order.exemptionClaim ? (
                <>
                  <SectionHeading
                    title="Exemption"
                    icon={
                      <ShieldCheck
                        size={18}
                        color={BLUE}
                        strokeWidth={2.4}
                      />
                    }
                  />

                  <View
                    style={
                      styles.exemptionPanel
                    }
                  >
                    <View
                      style={
                        styles.exemptionTop
                      }
                    >
                      <ShieldCheck
                        size={23}
                        color={BLUE_DARK}
                        strokeWidth={2.5}
                      />

                      <View
                        style={
                          styles.exemptionText
                        }
                      >
                        <Text
                          style={
                            styles.exemptionType
                          }
                        >
                          {formatStatus(
                            order.exemptionClaim
                              .exemptionType,
                          )}
                        </Text>

                        <Text
                          style={
                            styles.exemptionMeta
                          }
                        >
                          {order.exemptionClaim
                            .referenceNumber ||
                            "No reference"}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.exemptionStatus
                        }
                      >
                        {formatStatus(
                          order.exemptionClaim
                            .status,
                        )}
                      </Text>
                    </View>

                    {order.exemptionClaim
                      .rejectionReason ? (
                      <Text
                        style={
                          styles.exemptionReason
                        }
                      >
                        {
                          order.exemptionClaim
                            .rejectionReason
                        }
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : null}

              {order.patientSubmission ? (
                <>
                  <SectionHeading
                    title="Request verification"
                    icon={
                      <FileCheck2
                        size={18}
                        color={BLUE}
                        strokeWidth={2.4}
                      />
                    }
                  />

                  <View
                    style={
                      styles.submissionPanel
                    }
                  >
                    <View
                      style={
                        styles.submissionIcon
                      }
                    >
                      <FileText
                        size={22}
                        color={BLUE_DARK}
                        strokeWidth={2.5}
                      />
                    </View>

                    <View
                      style={
                        styles.submissionText
                      }
                    >
                      <Text
                        style={
                          styles.submissionTitle
                        }
                      >
                        {formatStatus(
                          order.patientSubmission
                            .requestType,
                        )}
                      </Text>

                      <Text
                        style={
                          styles.submissionMeta
                        }
                      >
                        {formatStatus(
                          order.patientSubmission
                            .status,
                        )}
                        {"  •  "}
                        {order.patientSubmission
                          .imageUrl
                          ? "Evidence attached"
                          : "No evidence file"}
                      </Text>

                      {order.patientSubmission
                        .verificationPath ? (
                        <View
                          style={
                            styles.verificationDetails
                          }
                        >
                          <Text
                            style={
                              styles.verificationLabel
                            }
                          >
                            VERIFICATION PATH
                          </Text>

                          <Text
                            style={
                              styles.verificationValue
                            }
                          >
                            {formatStatus(
                              order
                                .patientSubmission
                                .verificationPath,
                            )}
                          </Text>

                          {order.patientSubmission
                            .verificationPath ===
                          "ASSIGNED_DOCTOR" ? (
                            <>
                              <Text
                                style={
                                  styles.verificationDetail
                                }
                              >
                                Doctor:{" "}
                                {order
                                  .patientSubmission
                                  .verificationDoctor
                                  ?.fullName ||
                                  "Not available"}
                              </Text>

                              <Text
                                style={
                                  styles.verificationDetail
                                }
                              >
                                Status:{" "}
                                {formatStatus(
                                  order
                                    .patientSubmission
                                    .doctorVerificationStatus,
                                )}
                              </Text>

                              {order
                                .patientSubmission
                                .doctorVerificationNote ? (
                                <Text
                                  style={
                                    styles.verificationNote
                                  }
                                >
                                  {
                                    order
                                      .patientSubmission
                                      .doctorVerificationNote
                                  }
                                </Text>
                              ) : null}
                            </>
                          ) : null}

                          {order.patientSubmission
                            .verificationPath ===
                          "EXTERNAL_EVIDENCE" ? (
                            <>
                              <Text
                                style={
                                  styles.verificationDetail
                                }
                              >
                                Evidence:{" "}
                                {order
                                  .patientSubmission
                                  .evidenceType
                                  ? formatStatus(
                                      order
                                        .patientSubmission
                                        .evidenceType,
                                    )
                                  : "Not recorded"}
                              </Text>

                              {order
                                .patientSubmission
                                .imageUrl ? (
                                <Pressable
                                  android_ripple={{
                                    color:
                                      RIPPLE,
                                  }}
                                  style={
                                    styles.submissionEvidenceButton
                                  }
                                  onPress={() =>
                                    void openPatientRefillEvidence()
                                  }
                                >
                                  <Eye
                                    size={16}
                                    color={
                                      BLUE_DARK
                                    }
                                    strokeWidth={
                                      2.5
                                    }
                                  />

                                  <Text
                                    style={
                                      styles.submissionEvidenceButtonText
                                    }
                                  >
                                    View protected
                                    evidence
                                  </Text>
                                </Pressable>
                              ) : null}
                            </>
                          ) : null}
                        </View>
                      ) : null}

                      {order.patientSubmission
                        .reviewedAt ? (
                        <Text
                          style={
                            styles.submissionReviewMeta
                          }
                        >
                          Reviewed{" "}
                          {formatDateTime(
                            order
                              .patientSubmission
                              .reviewedAt,
                          )}
                        </Text>
                      ) : null}

                      {order.patientSubmission
                        .reviewNote ? (
                        <Text
                          style={
                            styles.submissionReviewNote
                          }
                        >
                          {
                            order
                              .patientSubmission
                              .reviewNote
                          }
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </>
              ) : null}

              <SectionHeading
                title="Order progress"
                icon={
                  <History
                    size={18}
                    color={PHARMACY}
                    strokeWidth={2.4}
                  />
                }
              />

              <View
                style={styles.historyPanel}
              >
                {order.statusHistory.length >
                0 ? (
                  order.statusHistory.map(
                    (historyItem, index) => (
                      <HistoryItem
                        key={historyItem.id}
                        status={formatStatus(
                          historyItem.toStatus,
                        )}
                        date={formatDateTime(
                          historyItem.createdAt,
                        )}
                        note={
                          historyItem.note
                        }
                        current={
                          index ===
                          order.statusHistory
                            .length -
                            1
                        }
                        last={
                          index ===
                          order.statusHistory
                            .length -
                            1
                        }
                      />
                    ),
                  )
                ) : (
                  <HistoryItem
                    status={formatStatus(
                      order.status,
                    )}
                    date={formatDateTime(
                      order.createdAt,
                    )}
                    note="Order received"
                    current
                    last
                  />
                )}
              </View>

              <View
                style={styles.refreshHint}
              >
                <PackageCheck
                  size={17}
                  color={PHARMACY}
                  strokeWidth={2.4}
                />

                <Text
                  style={
                    styles.refreshHintText
                  }
                >
                  Pull down to refresh
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>

      <PharmacyInventoryMatchModal
        visible={Boolean(
          inventoryMatchItem,
        )}
        orderId={route.params.orderId}
        item={inventoryMatchItem}
        canEdit={inventoryEditable}
        onClose={() =>
          setInventoryMatchItem(null)
        }
        onChanged={refreshOrder}
        onOpenInventory={() => {
          setInventoryMatchItem(null);
          navigation.navigate(
            "PharmacyInventory",
          );
        }}
      />

      <Modal
        visible={reasonModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setReasonModalVisible(false)
        }
      >
        <View style={styles.modalBackdrop}>
          <View
            style={styles.reasonModal}
          >
            <View
              style={styles.modalHeader}
            >
              <View
                style={
                  styles.modalHeaderText
                }
              >
                <Text
                  style={styles.modalTitle}
                >
                  {selectedExceptionStatus
                    ? getActionLabel(
                        selectedExceptionStatus,
                      )
                    : "Update order"}
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Add a clear reason so this
                  decision is recorded in order
                  history.
                </Text>
              </View>

              <Pressable
                android_ripple={{
                  color: RIPPLE,
                }}
                style={styles.modalClose}
                onPress={() =>
                  setReasonModalVisible(false)
                }
              >
                <X
                  size={20}
                  color={TEXT}
                  strokeWidth={2.5}
                />
              </Pressable>
            </View>

            <TextInput
              style={styles.reasonInput}
              value={statusReason}
              onChangeText={setStatusReason}
              placeholder="Enter reason..."
              placeholderTextColor="#9AA0AF"
              multiline
              maxLength={500}
              textAlignVertical="top"
            />

            <Text
              style={
                styles.characterCount
              }
            >
              {statusReason.length}/500
            </Text>

            <Pressable
              android_ripple={{
                color: RIPPLE,
              }}
              style={[
                styles.confirmExceptionButton,
                isActionLoading &&
                  styles.disabledAction,
              ]}
              disabled={isActionLoading}
              onPress={
                submitExceptionStatus
              }
            >
              {isActionLoading ? (
                <ActivityIndicator
                  color={SURFACE}
                />
              ) : (
                <Text
                  style={
                    styles.confirmExceptionText
                  }
                >
                  {selectedExceptionStatus
                    ? getActionLabel(
                        selectedExceptionStatus,
                      )
                    : "Confirm"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={evidenceVisible}
        animationType="slide"
        onRequestClose={() =>
          setEvidenceVisible(false)
        }
      >
        <SafeAreaView
          style={
            styles.viewerSafeArea
          }
          edges={["top", "bottom"]}
        >
          <View
            style={
              styles.viewerHeader
            }
          >
            <Pressable
              android_ripple={{
                color: RIPPLE,
              }}
              style={
                styles.viewerClose
              }
              onPress={() =>
                setEvidenceVisible(false)
              }
            >
              <X
                size={21}
                color={TEXT}
                strokeWidth={2.6}
              />
            </Pressable>

            <View
              style={
                styles.viewerTitleBlock
              }
            >
              <Text
                style={styles.viewerTitle}
              >
                Medicine evidence
              </Text>

              <Text
                style={
                  styles.viewerSubtitle
                }
                numberOfLines={1}
              >
                {refillSubmission?.evidenceType
                  ? formatStatus(
                      refillSubmission.evidenceType,
                    )
                  : "Protected patient evidence"}
              </Text>
            </View>

            <ShieldCheck
              size={21}
              color={PHARMACY}
              strokeWidth={2.5}
            />
          </View>

          {evidenceSource ? (
            <WebView
              source={evidenceSource}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
              incognito
              cacheEnabled={false}
              style={styles.webView}
              renderLoading={() => (
                <View
                  style={
                    styles.webViewLoading
                  }
                >
                  <ActivityIndicator
                    color={PHARMACY}
                  />

                  <Text
                    style={
                      styles.webViewLoadingText
                    }
                  >
                    Opening protected
                    evidence...
                  </Text>
                </View>
              )}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const VerificationStatus = ({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) => (
  <View
    style={styles.verificationItem}
  >
    {active ? (
      <CheckCircle2
        size={15}
        color={SURFACE}
        strokeWidth={2.5}
      />
    ) : (
      <AlertCircle
        size={15}
        color="#FFE7E7"
        strokeWidth={2.5}
      />
    )}

    <Text
      style={styles.verificationText}
    >
      {label}
    </Text>
  </View>
);

const QuickInfo = ({
  background,
  icon,
  label,
  value,
}: {
  background: string;
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <View
    style={[
      styles.quickInfo,
      {
        backgroundColor:
          background,
      },
    ]}
  >
    {icon}

    <Text
      style={styles.quickInfoValue}
      numberOfLines={1}
    >
      {value}
    </Text>

    <Text
      style={styles.quickInfoLabel}
    >
      {label}
    </Text>
  </View>
);

const SectionHeading = ({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
}) => (
  <View
    style={styles.sectionHeading}
  >
    {icon}

    <Text style={styles.sectionTitle}>
      {title}
    </Text>

    {subtitle ? (
      <Text
        style={
          styles.sectionSubtitle
        }
      >
        {subtitle}
      </Text>
    ) : null}
  </View>
);

const ContactItem = ({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) => (
  <View style={styles.contactItem}>
    {icon}

    <Text
      style={styles.contactText}
      numberOfLines={2}
    >
      {text}
    </Text>
  </View>
);

const MedicineItem = ({
  item,
  index,
  last,
  inventoryEditable,
  orderStatus,
  currency,
  onManageStock,
}: {
  item: PharmacyMedicineItem;
  index: number;
  last: boolean;
  inventoryEditable: boolean;
  orderStatus: PharmacyOrderStatus;
  currency: string;
  onManageStock: () => void;
}) => {
  const rawQuantity =
    item.quantity?.trim() || "";

  const requiredMatch =
    rawQuantity.match(
      /^(\d+(?:\.\d+)?)/,
    );

  const required = requiredMatch
    ? Number(requiredMatch[1])
    : null;

  const dispensed =
    item.dispensedQuantity || 0;

  const requiredUnit =
    normalizeUnit(item.quantityUnit);

  const dispensedUnit =
    normalizeUnit(item.dispensedUnit);

  const unitsComparable =
    Boolean(
      requiredUnit &&
        dispensedUnit,
    ) &&
    requiredUnit ===
      dispensedUnit;

  const progress =
    required &&
    required > 0 &&
    unitsComparable
      ? Math.min(
          100,
          Math.max(
            0,
            (dispensed / required) *
              100,
          ),
        )
      : 0;

  const unitAlreadyIncluded =
    item.quantityUnit
      ? rawQuantity
          .toLowerCase()
          .includes(
            item.quantityUnit.toLowerCase(),
          )
      : true;

  const quantityText =
    rawQuantity
      ? `${rawQuantity}${
          item.quantityUnit &&
          !unitAlreadyIncluded
            ? ` ${item.quantityUnit}`
            : ""
        }`
      : "Not specified";

  const dispensedText =
    dispensed > 0
      ? `${dispensed}${
          item.dispensedUnit
            ? ` ${pluralize(
                item.dispensedUnit,
                dispensed,
              )}`
            : ""
        }`
      : "Not allocated";

  const allocationActive = Boolean(
    item.inventoryItemId &&
      item.inventoryReservedQuantity >
        0 &&
      item.inventoryReservedAt &&
      !item.inventoryReleasedAt &&
      !item.inventoryConsumedAt,
  );

  const stockConsumed =
    Boolean(item.inventoryConsumedAt);

  const inventoryName =
    item.inventoryItem
      ?.medicineName ||
    "Matched inventory item";

  const inventoryDetail =
    item.inventoryItem
      ? [
          item.inventoryItem
            .strength,
          item.inventoryItem.form,
        ]
          .filter(Boolean)
          .join(" • ")
      : "";

  return (
    <View
      style={[
        styles.medicineItem,
        last
          ? styles.medicineItemLast
          : undefined,
      ]}
    >
      <View
        style={styles.medicineTopRow}
      >
        <View
          style={styles.medicineIcon}
        >
          <Pill
            size={20}
            color={PHARMACY}
            strokeWidth={2.5}
          />
        </View>

        <View
          style={styles.medicineMain}
        >
          <Text
            style={styles.medicineName}
            numberOfLines={2}
          >
            {item.name}
          </Text>

          <Text
            style={
              styles.medicineSubline
            }
          >
            {item.dose ||
              "Dose not specified"}
            {"  •  "}
            {quantityText}
          </Text>
        </View>

        <View
          style={styles.itemNumber}
        >
          <Text
            style={
              styles.itemNumberText
            }
          >
            {index + 1}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.medicineInstructionBox
        }
      >
        <Text
          style={
            styles.instructionLabel
          }
        >
          DIRECTIONS
        </Text>

        <Text
          style={
            styles.instructionText
          }
        >
          {item.instructions ||
            "No instructions provided"}
        </Text>
      </View>

      <View
        style={styles.medicineStockRow}
      >
        <View
          style={styles.quantityBlock}
        >
          <Text
            style={styles.quantityLabel}
          >
            Requested
          </Text>

          <Text
            style={styles.quantityValue}
          >
            {quantityText}
          </Text>
        </View>

        <View
          style={styles.quantityDivider}
        />

        <View
          style={styles.quantityBlock}
        >
          <Text
            style={styles.quantityLabel}
          >
            Prepared supply
          </Text>

          <Text
            style={[
              styles.quantityValue,
              dispensed > 0
                ? styles.dispensedValue
                : undefined,
            ]}
          >
            {dispensedText}
          </Text>
        </View>
      </View>

      {item.unitPricePence !== null &&
      item.lineTotalPence !== null ? (
        <View
          style={styles.medicinePriceBox}
        >
          <View>
            <Text
              style={
                styles.medicinePriceLabel
              }
            >
              PRICE
            </Text>

            <Text
              style={
                styles.medicineUnitPrice
              }
            >
              {formatMoney(
                item.unitPricePence,
                currency,
              )}{" "}
              per{" "}
              {item.inventoryItem
                ?.stockUnit ||
                item.quantityUnit ||
                "unit"}
            </Text>
          </View>

          <View
            style={
              styles.medicineLineTotal
            }
          >
            <Text
              style={
                styles.medicineLineTotalLabel
              }
            >
              Medicine total
            </Text>

            <Text
              style={
                styles.medicineLineTotalValue
              }
            >
              {formatMoney(
                item.lineTotalPence,
                currency,
              )}
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={styles.pricePendingBox}
        >
          <Text
            style={
              styles.pricePendingText
            }
          >
            Price will be calculated after
            pharmacy stock is matched.
          </Text>
        </View>
      )}

      {required !== null &&
      required > 0 &&
      unitsComparable ? (
        <View
          style={styles.progressArea}
        >
          <View
            style={styles.progressTrack}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                },
              ]}
            />
          </View>

          <Text
            style={styles.progressText}
          >
            {dispensed >= required
              ? "Complete"
              : `${Math.max(
                  required - dispensed,
                  0,
                )} remaining`}
          </Text>
        </View>
      ) : null}

      {stockConsumed ? (
        <View
          style={
            styles.inventoryMatchedCard
          }
        >
          <View
            style={
              styles.inventoryStatusRow
            }
          >
            <PackageCheck
              size={18}
              color={PHARMACY_DARK}
              strokeWidth={2.5}
            />

            <View
              style={
                styles.inventoryStatusText
              }
            >
              <Text
                style={
                  styles.inventoryMatchedTitle
                }
              >
                Stock completed
              </Text>

              <Text
                style={
                  styles.inventoryMatchedName
                }
              >
                {inventoryName}
              </Text>

              {inventoryDetail ? (
                <Text
                  style={
                    styles.inventoryMatchedMeta
                  }
                >
                  {inventoryDetail}
                </Text>
              ) : null}

              <Text
                style={
                  styles.inventoryAllocatedText
                }
              >
                Inventory deducted after
                fulfilment
              </Text>
            </View>
          </View>
        </View>
      ) : allocationActive ? (
        <View
          style={
            styles.inventoryMatchedCard
          }
        >
          <View
            style={
              styles.inventoryStatusRow
            }
          >
            <PackageCheck
              size={18}
              color={PHARMACY_DARK}
              strokeWidth={2.5}
            />

            <View
              style={
                styles.inventoryStatusText
              }
            >
              <Text
                style={
                  styles.inventoryMatchedTitle
                }
              >
                Stock allocated
              </Text>

              <Text
                style={
                  styles.inventoryMatchedName
                }
              >
                {inventoryName}
              </Text>

              {inventoryDetail ? (
                <Text
                  style={
                    styles.inventoryMatchedMeta
                  }
                >
                  {inventoryDetail}
                </Text>
              ) : null}

              <Text
                style={
                  styles.inventoryAllocatedText
                }
              >
                {
                  item.inventoryReservedQuantity
                }{" "}
                {pluralize(
                  item.inventoryItem
                    ?.stockUnit ||
                    "unit",
                  item.inventoryReservedQuantity,
                )}{" "}
                allocated to this order
              </Text>

              {dispensed > 0 &&
              item.dispensedUnit ? (
                <Text
                  style={
                    styles.inventoryDispensedText
                  }
                >
                  Supplies {dispensed}{" "}
                  {pluralize(
                    item.dispensedUnit,
                    dispensed,
                  )}
                </Text>
              ) : null}
            </View>
          </View>

          <Pressable
            android_ripple={{
              color: RIPPLE,
            }}
            style={
              styles.manageStockButton
            }
            onPress={onManageStock}
          >
            <Text
              style={
                styles.manageStockButtonText
              }
            >
              {inventoryEditable
                ? "Review / change stock"
                : "Review stock"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={
            styles.inventoryUnmatchedCard
          }
        >
          <View
            style={
              styles.inventoryStatusRow
            }
          >
            <PackageSearch
              size={18}
              color={WARNING_DARK}
              strokeWidth={2.5}
            />

            <View
              style={
                styles.inventoryStatusText
              }
            >
              <Text
                style={
                  styles.inventoryUnmatchedTitle
                }
              >
                Stock not matched
              </Text>

              <Text
                style={
                  styles.inventoryUnmatchedText
                }
              >
                {orderStatus ===
                "RECEIVED"
                  ? "Accept the order before selecting pharmacy stock."
                  : "A pharmacist must confirm suitable inventory before preparation."}
              </Text>
            </View>
          </View>

          <Pressable
            android_ripple={{
              color: RIPPLE,
            }}
            style={[
              styles.matchStockButton,
              !inventoryEditable &&
                styles.disabledStockButton,
            ]}
            disabled={
              !inventoryEditable
            }
            onPress={onManageStock}
          >
            <PackageSearch
              size={15}
              color={SURFACE}
              strokeWidth={2.5}
            />

            <Text
              style={
                styles.matchStockButtonText
              }
            >
              {orderStatus ===
              "RECEIVED"
                ? "Accept order first"
                : inventoryEditable
                  ? "Match stock & price"
                  : "Stock matching locked"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const NoteItem = ({
  title,
  text,
}: {
  title: string;
  text: string;
}) => (
  <View style={styles.noteItem}>
    <Text style={styles.noteTitle}>
      {title}
    </Text>

    <Text style={styles.noteText}>
      {text}
    </Text>
  </View>
);

const HistoryItem = ({
  status,
  date,
  note,
  current,
  last,
}: {
  status: string;
  date: string;
  note?: string | null;
  current: boolean;
  last: boolean;
}) => (
  <View style={styles.historyItem}>
    <View style={styles.timeline}>
      <View
        style={[
          styles.timelineDot,
          current
            ? styles.timelineDotCurrent
            : undefined,
        ]}
      />

      {!last ? (
        <View
          style={styles.timelineLine}
        />
      ) : null}
    </View>

    <View
      style={styles.historyContent}
    >
      <View
        style={
          styles.historyTitleRow
        }
      >
        <Text
          style={styles.historyStatus}
        >
          {status}
        </Text>

        {current ? (
          <View
            style={
              styles.currentChip
            }
          >
            <Text
              style={
                styles.currentChipText
              }
            >
              Current
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.historyDate}>
        {date}
      </Text>

      {note ? (
        <Text
          style={styles.historyNote}
        >
          {note}
        </Text>
      ) : null}
    </View>
  </View>
);

export default PharmacyOrderDetailScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  scrollView: { flex: 1 },
  content: { paddingBottom: 48 },
  header: { backgroundColor: BACKGROUND, paddingBottom: 2 },

  appBar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },

  appBarText: { flex: 1 },
  appBarTitle: { color: TEXT, fontSize: 20, fontWeight: "700" },

  appBarSubtitle: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },

  headerContent: {
    backgroundColor: PHARMACY,
    borderRadius: 17,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 12,
  },

  orderSourceRow: { flexDirection: "row", alignItems: "center" },

  headerSourceIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  headerSourceText: {
    flex: 1,
    color: "#E9FFF0",
    fontSize: 10,
    fontWeight: "600",
  },

  orderNumber: {
    color: SURFACE,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.25,
    marginTop: 10,
  },

  receivedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  receivedText: {
    color: "#D9F5E2",
    fontSize: 9,
    fontWeight: "500",
    marginLeft: 6,
  },

  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 8,
  },

  statusText: { fontSize: 8, fontWeight: "700" },

  verificationBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 10,
    marginTop: 11,
    minHeight: 38,
  },

  verificationItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },

  verificationText: {
    color: SURFACE,
    fontSize: 8,
    fontWeight: "600",
    marginLeft: 5,
  },

  headerDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  stateArea: {
    paddingVertical: 50,
    paddingHorizontal: 24,
    alignItems: "center",
  },

  stateTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 11,
  },

  stateText: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    fontWeight: "500",
    marginTop: 4,
  },

  errorIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  errorTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },

  retryButton: {
    minHeight: 42,
    backgroundColor: PHARMACY,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },

  retryText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  body: { paddingHorizontal: 16 },

  quickInfoRow: {
    flexDirection: "row",
    marginTop: 13,
    gap: 8,
  },

  quickInfo: {
    flex: 1,
    minHeight: 88,
    borderRadius: 14,
    padding: 11,
    justifyContent: "space-between",
  },

  quickInfoValue: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },

  quickInfoLabel: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "600",
    marginTop: 2,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 9,
    paddingHorizontal: 2,
  },

  sectionTitle: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 7,
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
  },

  actionsPanel: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 13,
  },

  paymentReleaseLockedPanel: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 13,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  paymentReleaseLockIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#FFE5BE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  paymentReleaseLockContent: { flex: 1 },

  paymentReleaseLockTitle: {
    color: WARNING_DARK,
    fontSize: 12,
    fontWeight: "700",
  },

  paymentReleaseLockDescription: {
    color: TEXT,
    fontSize: 9,
    fontWeight: "500",
    lineHeight: 14,
    marginTop: 3,
  },

  paymentReleaseRule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginTop: 9,
  },

  paymentReleaseRuleText: {
    flex: 1,
    color: WARNING_DARK,
    fontSize: 8,
    fontWeight: "700",
    lineHeight: 12,
    marginLeft: 6,
  },

  paymentReleaseUnlockedPanel: {
    backgroundColor: PHARMACY_LIGHT,
    borderRadius: 12,
    padding: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  paymentReleaseUnlockedContent: { flex: 1, marginLeft: 8 },

  paymentReleaseUnlockedTitle: {
    color: PHARMACY_DARK,
    fontSize: 11,
    fontWeight: "700",
  },

  paymentReleaseUnlockedDescription: {
    color: PHARMACY_DARK,
    fontSize: 9,
    fontWeight: "600",
    lineHeight: 14,
    marginTop: 3,
  },

  doctorLockedPanel: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 13,
    padding: 12,
    marginBottom: 10,
  },

  evidenceReviewPanel: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 13,
    padding: 12,
    marginBottom: 10,
  },

  verificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  lockIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#FFE5BE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  evidenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#FFE5BE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  verificationContent: { flex: 1 },

  warningTitle: {
    color: WARNING_DARK,
    fontSize: 12,
    fontWeight: "700",
  },

  warningDescription: {
    color: TEXT,
    fontSize: 9,
    fontWeight: "500",
    lineHeight: 14,
    marginTop: 3,
  },

  successPanel: {
    backgroundColor: PHARMACY_LIGHT,
    borderRadius: 12,
    padding: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  successContent: { flex: 1, marginLeft: 8 },

  successTitle: {
    color: PHARMACY_DARK,
    fontSize: 11,
    fontWeight: "700",
  },

  successDescription: {
    color: PHARMACY_DARK,
    fontSize: 9,
    fontWeight: "600",
    lineHeight: 14,
    marginTop: 3,
  },

  rejectedPanel: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 12,
    padding: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  rejectedContent: { flex: 1, marginLeft: 8 },

  rejectedTitle: {
    color: DANGER_DARK,
    fontSize: 11,
    fontWeight: "700",
  },

  rejectedDescription: {
    color: DANGER_DARK,
    fontSize: 9,
    fontWeight: "600",
    lineHeight: 14,
    marginTop: 3,
  },

  viewEvidenceButton: {
    minHeight: 43,
    borderRadius: 12,
    backgroundColor: BLUE_LIGHT,
    borderWidth: 1,
    borderColor: "#C9D9FA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 11,
  },

  viewEvidenceButtonText: {
    color: BLUE_DARK,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },

  verifyEvidenceButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: WARNING_DARK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  verifyEvidenceButtonText: {
    color: SURFACE,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },

  smallEvidenceButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: BLUE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  fulfilmentWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WARNING_LIGHT,
    borderRadius: 12,
    padding: 11,
    marginBottom: 10,
  },

  inventoryActionWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WARNING_LIGHT,
    borderRadius: 12,
    padding: 11,
    marginBottom: 10,
  },

  fulfilmentWarningText: {
    flex: 1,
    color: WARNING_DARK,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 15,
    marginLeft: 8,
  },

  inventoryInfoPanel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BLUE_LIGHT,
    borderRadius: 12,
    padding: 11,
    marginBottom: 10,
  },

  inventoryInfoText: {
    flex: 1,
    color: BLUE_DARK,
    fontSize: 9,
    fontWeight: "600",
    lineHeight: 14,
    marginLeft: 8,
  },

  inventorySummary: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 11,
    marginBottom: 10,
  },

  inventorySummaryReady: { backgroundColor: PHARMACY_LIGHT },
  inventorySummaryPending: { backgroundColor: WARNING_LIGHT },
  inventorySummaryText: { flex: 1, marginLeft: 8 },

  inventorySummaryTitle: {
    fontSize: 10,
    fontWeight: "700",
  },

  inventorySummaryMeta: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "600",
    marginTop: 3,
  },

  primaryActionButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: PHARMACY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  primaryActionText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
  },

  exceptionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 2,
  },

  exceptionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DANGER_LIGHT,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },

  exceptionButtonText: {
    color: DANGER_DARK,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 5,
  },

  disabledAction: { opacity: 0.45 },

  terminalStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PHARMACY_LIGHT,
    borderRadius: 13,
    padding: 13,
  },

  terminalText: { flex: 1, marginLeft: 9 },

  terminalTitle: {
    color: PHARMACY_DARK,
    fontSize: 12,
    fontWeight: "700",
  },

  terminalSubtitle: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 3,
  },

  actionLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  actionLoadingText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 7,
  },

  patientPanel: {
    backgroundColor: BLUE_LIGHT,
    borderRadius: 14,
    padding: 14,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#DCE8FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  profileText: { flex: 1 },

  profileName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },

  profileEmail: {
    color: BLUE_DARK,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 3,
  },

  contactGrid: {
    marginTop: 12,
    gap: 7,
  },

  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  contactText: {
    flex: 1,
    color: TEXT,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 15,
    marginLeft: 8,
  },

  prescriberPanel: {
    backgroundColor: PHARMACY_LIGHT,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  prescriberIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#D7F3E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  prescriberText: { flex: 1 },

  prescriberName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },

  prescriberSpeciality: {
    color: PHARMACY_DARK,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },

  prescribedDate: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "500",
    marginTop: 5,
  },

  medicineContainer: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    overflow: "hidden",
  },

  medicineItem: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },

  medicineItemLast: { borderBottomWidth: 0 },

  medicineTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  medicineIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: PHARMACY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  medicineMain: {
    flex: 1,
    minWidth: 0,
  },

  medicineName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },

  medicineSubline: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 4,
  },

  itemNumber: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  itemNumberText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "700",
  },

  medicineInstructionBox: {
    backgroundColor: PHARMACY_SOFT,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 11,
  },

  instructionLabel: {
    color: PHARMACY_DARK,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  instructionText: {
    color: TEXT,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "500",
    marginTop: 4,
  },

  medicineStockRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  quantityBlock: {
    flex: 1,
  },

  quantityDivider: {
    width: StyleSheet.hairlineWidth,
    height: 29,
    backgroundColor: BORDER,
    marginHorizontal: 14,
  },

  quantityLabel: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "600",
  },

  quantityValue: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  dispensedValue: {
    color: PHARMACY_DARK,
  },

  medicinePriceBox: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 11,
    padding: 10,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  medicinePriceLabel: {
    color: WARNING_DARK,
    fontSize: 7,
    fontWeight: "700",
  },

  medicineUnitPrice: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },

  medicineLineTotal: {
    flex: 1,
    alignItems: "flex-end",
    marginLeft: 10,
  },

  medicineLineTotalLabel: {
    color: MUTED,
    fontSize: 7,
    fontWeight: "600",
  },

  medicineLineTotalValue: {
    color: WARNING_DARK,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },

  pricePendingBox: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 10,
    padding: 9,
    marginTop: 10,
  },

  pricePendingText: {
    color: WARNING_DARK,
    fontSize: 8,
    lineHeight: 13,
    fontWeight: "600",
  },

  progressArea: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
  },

  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E4E8E5",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: PHARMACY,
  },

  progressText: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "600",
    marginLeft: 9,
  },

  inventoryMatchedCard: {
    backgroundColor: PHARMACY_LIGHT,
    borderRadius: 11,
    padding: 10,
    marginTop: 11,
  },

  inventoryUnmatchedCard: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 11,
    padding: 10,
    marginTop: 11,
  },

  inventoryStatusRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  inventoryStatusText: {
    flex: 1,
    marginLeft: 8,
  },

  inventoryMatchedTitle: {
    color: PHARMACY_DARK,
    fontSize: 9,
    fontWeight: "700",
  },

  inventoryMatchedName: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },

  inventoryMatchedMeta: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "600",
    marginTop: 2,
  },

  inventoryAllocatedText: {
    color: PHARMACY_DARK,
    fontSize: 8,
    fontWeight: "700",
    marginTop: 4,
  },

  inventoryDispensedText: {
    color: BLUE_DARK,
    fontSize: 8,
    fontWeight: "700",
    marginTop: 3,
  },

  inventoryUnmatchedTitle: {
    color: WARNING_DARK,
    fontSize: 9,
    fontWeight: "700",
  },

  inventoryUnmatchedText: {
    color: TEXT,
    fontSize: 8,
    lineHeight: 12,
    fontWeight: "500",
    marginTop: 3,
  },

  manageStockButton: {
    minHeight: 36,
    backgroundColor: SURFACE,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
  },

  manageStockButtonText: {
    color: PHARMACY_DARK,
    fontSize: 9,
    fontWeight: "700",
  },

  matchStockButton: {
    minHeight: 39,
    backgroundColor: PHARMACY,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
  },

  disabledStockButton: {
    opacity: 0.45,
  },

  matchStockButtonText: {
    color: SURFACE,
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 6,
  },

  medicineEmpty: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  notesPanel: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 14,
    paddingHorizontal: 13,
  },

  noteItem: {
    paddingVertical: 10,
  },

  noteTitle: {
    color: WARNING_DARK,
    fontSize: 9,
    fontWeight: "700",
  },

  noteText: {
    color: TEXT,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "500",
    marginTop: 3,
  },

  paymentPanel: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 14,
    padding: 14,
  },

  paymentTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#FFE7C2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  paymentText: {
    flex: 1,
  },

  paymentPreference: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  paymentMode: {
    color: WARNING_DARK,
    fontSize: 9,
    fontWeight: "500",
    marginTop: 3,
  },

  paymentAmount: {
    alignItems: "flex-end",
    marginLeft: 8,
  },

  paymentAmountText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },

  paymentStatus: {
    color: WARNING_DARK,
    fontSize: 8,
    fontWeight: "700",
    marginTop: 3,
  },

  pricingReady: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PHARMACY_LIGHT,
    borderRadius: 10,
    padding: 9,
    marginTop: 11,
  },

  pricingPending: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 10,
    padding: 9,
    marginTop: 11,
  },

  pricingStatusText: {
    flex: 1,
    fontSize: 8,
    lineHeight: 13,
    fontWeight: "700",
    marginLeft: 7,
  },

  paymentBreakdown: {
    backgroundColor: SURFACE,
    borderRadius: 11,
    padding: 11,
    marginTop: 10,
  },

  paymentBreakdownTitle: {
    color: MUTED,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 5,
  },

  paymentLine: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },

  paymentLineText: {
    flex: 1,
    paddingRight: 8,
  },

  paymentLineName: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
  },

  paymentLineMeta: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "600",
    marginTop: 2,
  },

  paymentLineTotal: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "800",
  },

  paymentTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 11,
  },

  paymentTotalLabel: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
  },

  paymentTotalValue: {
    color: PHARMACY_DARK,
    fontSize: 17,
    fontWeight: "800",
  },

  exemptionPanel: {
    backgroundColor: BLUE_LIGHT,
    borderRadius: 14,
    padding: 14,
  },

  exemptionTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  exemptionText: {
    flex: 1,
    marginLeft: 10,
  },

  exemptionType: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  exemptionMeta: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "500",
    marginTop: 3,
  },

  exemptionStatus: {
    color: BLUE_DARK,
    fontSize: 9,
    fontWeight: "700",
  },

  exemptionReason: {
    color: DANGER_DARK,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "500",
    marginTop: 10,
  },

  submissionPanel: {
    backgroundColor: BLUE_LIGHT,
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  submissionIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#DCE8FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  submissionText: {
    flex: 1,
  },

  submissionTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  submissionMeta: {
    color: BLUE_DARK,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 4,
  },

  verificationDetails: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 10,
    padding: 9,
    marginTop: 9,
  },

  verificationLabel: {
    color: MUTED,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  verificationValue: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },

  verificationDetail: {
    color: BLUE_DARK,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 4,
  },

  verificationNote: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "500",
    lineHeight: 14,
    marginTop: 6,
  },

  submissionEvidenceButton: {
    alignSelf: "flex-start",
    minHeight: 35,
    borderRadius: 9,
    backgroundColor: BLUE_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginTop: 8,
  },

  submissionEvidenceButtonText: {
    color: BLUE_DARK,
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 6,
  },

  submissionReviewMeta: {
    color: PHARMACY_DARK,
    fontSize: 8,
    fontWeight: "600",
    marginTop: 7,
  },

  submissionReviewNote: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "500",
    lineHeight: 14,
    marginTop: 4,
  },

  historyPanel: {
    backgroundColor: PHARMACY_SOFT,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingTop: 13,
  },

  historyItem: {
    flexDirection: "row",
  },

  timeline: {
    width: 25,
    alignItems: "center",
  },

  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#9CD3AD",
    marginTop: 4,
  },

  timelineDotCurrent: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: PHARMACY,
    borderWidth: 3,
    borderColor: "#D7F3E0",
  },

  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 42,
    backgroundColor: "#CDEAD6",
    marginTop: 3,
  },

  historyContent: {
    flex: 1,
    paddingLeft: 7,
    paddingBottom: 15,
  },

  historyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  historyStatus: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
  },

  currentChip: {
    backgroundColor: PHARMACY_LIGHT,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 7,
  },

  currentChipText: {
    color: PHARMACY_DARK,
    fontSize: 7,
    fontWeight: "700",
  },

  historyDate: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "500",
    marginTop: 3,
  },

  historyNote: {
    color: MUTED,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "500",
    marginTop: 4,
  },

  emptyText: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 18,
  },

  refreshHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  refreshHintText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "500",
    marginLeft: 6,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,25,54,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  reasonModal: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 18,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  modalHeaderText: {
    flex: 1,
    paddingRight: 10,
  },

  modalTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },

  modalSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 4,
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },

  reasonInput: {
    minHeight: 110,
    backgroundColor: BACKGROUND,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 13,
    marginTop: 16,
  },

  characterCount: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 5,
  },

  confirmExceptionButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: DANGER,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 11,
  },

  confirmExceptionText: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "700",
  },

  viewerSafeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  viewerHeader: {
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },

  viewerClose: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },

  viewerTitleBlock: {
    flex: 1,
    paddingHorizontal: 12,
  },

  viewerTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },

  viewerSubtitle: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },

  webView: {
    flex: 1,
    backgroundColor: SURFACE,
  },

  webViewLoading: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },

  webViewLoadingText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 9,
  },
});