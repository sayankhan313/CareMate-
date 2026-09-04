import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertCircle, ArrowLeft, BadgeCheck, CheckCircle2, ChevronDown, ChevronUp, Clock3, CreditCard, Eye, FileCheck2, FileText, History, MapPin, PackageCheck, PackageSearch, Phone, Pill, RefreshCw, ShieldCheck, Stethoscope, Truck, UserRound, X, XCircle } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { pharmacyOrdersApi, type PharmacyOrderDetail, type PharmacyOrderStatus } from "../../services/pharmacy/pharmacy-orders.api";
import { notificationApi } from "../../services/notificationApi";
import type { RootStackParamList } from "../../types/navigation";
import PharmacyInventoryMatchModal from "./PharmacyInventoryMatchModal";

type Props = NativeStackScreenProps<RootStackParamList, "PharmacyOrderDetail">;
type PharmacyMedicineItem = PharmacyOrderDetail["items"][number];
type BannerTone = "danger" | "warning" | "success" | "info";
type ConfirmAction = { type: "STATUS"; status: PharmacyOrderStatus } | { type: "EVIDENCE" } | null;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#747C91";
const BORDER = "#E1E6EF";
const RIPPLE = "rgba(17,25,54,0.08)";
const PHARMACY = "#15803D";
const PHARMACY_DARK = "#14532D";
const PHARMACY_LIGHT = "#E9F8EF";
const BLUE = "#5B86E5";
const BLUE_DARK = "#315FBA";
const BLUE_LIGHT = "#EEF4FF";
const WARNING_DARK = "#9A570D";
const WARNING_LIGHT = "#FFF3E2";
const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const exceptionStatuses = new Set<PharmacyOrderStatus>(["REJECTED", "DELAYED", "OUT_OF_STOCK", "CANCELLED"]);
const primaryStatuses = new Set<PharmacyOrderStatus>(["ACCEPTED", "PREPARING", "READY", "COLLECTED", "OUT_FOR_DELIVERY", "DELIVERED"]);
const verificationBlockedStatuses = new Set<PharmacyOrderStatus>(["REJECTED", "CANCELLED", "DELIVERED", "COLLECTED"]);
const inventoryReservationRequiredStatuses = new Set<PharmacyOrderStatus>(["PREPARING", "READY", "OUT_FOR_DELIVERY"]);
const inventoryLockedStatuses = new Set<PharmacyOrderStatus>(["READY", "OUT_FOR_DELIVERY", "DELIVERED", "COLLECTED", "REJECTED", "CANCELLED"]);

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatStatus = (value: string) => value.toLowerCase().split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

const formatMoney = (amountPence: number, currency = "GBP") => {
  const safePence = Number.isFinite(Number(amountPence)) ? Math.max(0, Number(amountPence)) : 0;
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency || "GBP" }).format(safePence / 100);
  } catch {
    return `£${(safePence / 100).toFixed(2)}`;
  }
};

const normalizeUnit = (value?: string | null) => {
  if (!value) return "";
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = { packs: "pack", pack: "pack", tablets: "tablet", tablet: "tablet", tabs: "tablet", tab: "tablet", capsules: "capsule", capsule: "capsule", caps: "capsule", cap: "capsule", bottles: "bottle", bottle: "bottle", boxes: "box", box: "box", inhalers: "inhaler", inhaler: "inhaler", units: "unit", unit: "unit" };
  return aliases[normalized] || normalized.replace(/s$/, "");
};

const pluralize = (unit: string, quantity: number) => quantity === 1 || unit === "ml" || unit === "g" ? unit : `${unit}s`;

const getSourceLabel = (source: PharmacyOrderDetail["orderSource"]) => {
  if (source === "DOCTOR_PRESCRIPTION") return "Doctor prescription";
  if (source === "REFILL_REQUEST") return "Refill request";
  if (source === "PATIENT_SUBMISSION") return "Patient request";
  return "Manual request";
};

const getStatusTone = (status: PharmacyOrderStatus) => {
  if (status === "READY" || status === "COLLECTED" || status === "DELIVERED") return { background: PHARMACY_LIGHT, color: PHARMACY_DARK };
  if (status === "RECEIVED" || status === "ACCEPTED" || status === "PREPARING" || status === "DELAYED") return { background: WARNING_LIGHT, color: WARNING_DARK };
  if (status === "REJECTED" || status === "CANCELLED" || status === "OUT_OF_STOCK") return { background: DANGER_LIGHT, color: DANGER_DARK };
  return { background: BLUE_LIGHT, color: BLUE_DARK };
};

const getActionLabel = (status: PharmacyOrderStatus) => {
  const labels: Partial<Record<PharmacyOrderStatus, string>> = { ACCEPTED: "Accept order", PREPARING: "Start preparing", READY: "Mark ready", COLLECTED: "Mark collected", OUT_FOR_DELIVERY: "Out for delivery", DELIVERED: "Mark delivered", REJECTED: "Reject order", DELAYED: "Mark delayed", OUT_OF_STOCK: "Out of stock", CANCELLED: "Cancel order" };
  return labels[status] || formatStatus(status);
};

const getActionConfirmation = (status: PharmacyOrderStatus) => {
  const messages: Partial<Record<PharmacyOrderStatus, string>> = {
    ACCEPTED: "Accept this order?",
    PREPARING: "Start preparing this order?",
    READY: "Mark this order ready?",
    COLLECTED: "Confirm this order was collected?",
    OUT_FOR_DELIVERY: "Confirm this order is out for delivery?",
    DELIVERED: "Confirm this order was delivered?",
  };
  return messages[status] || `Change order to ${formatStatus(status)}?`;
};

export const PharmacyOrderDetailScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<PharmacyOrderDetail | null>(null);
  const [allowedNextStatuses, setAllowedNextStatuses] = useState<PharmacyOrderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isVerificationLoading, setIsVerificationLoading] = useState(false);
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [inventoryMatchItem, setInventoryMatchItem] = useState<PharmacyMedicineItem | null>(null);
  const [evidenceVisible, setEvidenceVisible] = useState(false);
  const [evidenceSource, setEvidenceSource] = useState<{ uri: string; headers: Record<string, string> } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [reasonModalVisible, setReasonModalVisible] = useState(false);
  const [selectedExceptionStatus, setSelectedExceptionStatus] = useState<PharmacyOrderStatus | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const loadOrder = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      setErrorMessage("");

      const result = await pharmacyOrdersApi.getOrderDetail(route.params.orderId);
      setOrder(result.order);
      setAllowedNextStatuses(result.allowedNextStatuses || []);

      await notificationApi.markPharmacyOrderNotificationRead(route.params.orderId).catch(() => undefined);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load pharmacy order.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [route.params.orderId]);

  useFocusEffect(useCallback(() => { void loadOrder("initial"); }, [loadOrder]));

  const refreshOrder = async () => {
    const result = await pharmacyOrdersApi.getOrderDetail(route.params.orderId);
    setOrder(result.order);
    setAllowedNextStatuses(result.allowedNextStatuses || []);
  };

  const updateStatus = async (status: PharmacyOrderStatus, reason?: string) => {
    try {
      setIsActionLoading(true);
      await pharmacyOrdersApi.updateOrderStatus(route.params.orderId, status, reason);
      await refreshOrder();
      setReasonModalVisible(false);
      setSelectedExceptionStatus(null);
      setStatusReason("");
    } catch (error) {
      Alert.alert("Unable to update order", error instanceof Error ? error.message : "Unable to update order status.");
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
    setConfirmAction({ type: "STATUS", status });
  };

  const verifyExternalEvidence = async () => {
    try {
      setIsVerificationLoading(true);
      const result = await pharmacyOrdersApi.verifyPatientRefillRequest(route.params.orderId);
      setOrder(result.order);
      setAllowedNextStatuses(result.allowedNextStatuses || []);
    } catch (error) {
      Alert.alert("Unable to verify evidence", error instanceof Error ? error.message : "The supporting evidence could not be verified.");
    } finally {
      setIsVerificationLoading(false);
    }
  };

  const submitConfirmAction = async () => {
    const action = confirmAction;
    if (!action) return;
    setConfirmAction(null);
    if (action.type === "EVIDENCE") await verifyExternalEvidence();
    else await updateStatus(action.status);
  };

  const submitExceptionStatus = () => {
    const reason = statusReason.trim();
    if (!selectedExceptionStatus || reason.length < 5) return;
    void updateStatus(selectedExceptionStatus, reason);
  };

  const openPatientRefillEvidence = async () => {
    if (!order?.patientSubmission?.imageUrl || isEvidenceLoading) return;
    try {
      setIsEvidenceLoading(true);
      const source = await pharmacyOrdersApi.getPatientRefillEvidenceSource(route.params.orderId);
      setEvidenceSource(source);
      setEvidenceVisible(true);
    } catch (error) {
      Alert.alert("Unable to open evidence", error instanceof Error ? error.message : "The supporting evidence could not be opened.");
    } finally {
      setIsEvidenceLoading(false);
    }
  };

  const address = order ? [order.patient.patientProfile?.addressLine, order.patient.patientProfile?.postcode].filter(Boolean).join(", ") : "";
  const statusTone = order ? getStatusTone(order.status) : null;
  const primaryActions = allowedNextStatuses.filter(status => primaryStatuses.has(status));
  const exceptionActions = allowedNextStatuses.filter(status => exceptionStatuses.has(status));
  const refillSubmission = order?.orderSource === "REFILL_REQUEST" ? order.patientSubmission : null;
  const isAssignedDoctorRefill = refillSubmission?.verificationPath === "ASSIGNED_DOCTOR";
  const isExternalEvidenceRefill = refillSubmission?.verificationPath === "EXTERNAL_EVIDENCE";
  const isCareMatePrescriptionRefill = refillSubmission?.verificationPath === "CAREMATE_PRESCRIPTION";

  const awaitingDoctorConfirmation = Boolean(order && isAssignedDoctorRefill && refillSubmission?.doctorVerificationStatus === "PENDING" && !order.fulfilmentAllowed);
  const doctorRejectedRefill = Boolean(isAssignedDoctorRefill && refillSubmission?.doctorVerificationStatus === "REJECTED");
  const canVerifyExternalEvidence = Boolean(order && isExternalEvidenceRefill && refillSubmission?.status === "VERIFICATION_REQUIRED" && refillSubmission?.imageUrl && !order.prescriptionConfirmed && !order.fulfilmentAllowed && !verificationBlockedStatuses.has(order.status));
  const inventoryEditable = Boolean(order && order.fulfilmentAllowed && order.status !== "RECEIVED" && !inventoryLockedStatuses.has(order.status));

  const itemReady = useCallback((item: PharmacyMedicineItem) => Boolean(
    item.inventoryItemId && item.inventoryItem && item.inventoryItem.isActive && item.inventoryReservedQuantity > 0 && item.inventoryReservedAt &&
    !item.inventoryConsumedAt && !item.inventoryReleasedAt && item.unitPricePence && item.unitPricePence > 0 && item.lineTotalPence && item.lineTotalPence > 0 &&
    item.dispensedQuantity && item.dispensedQuantity > 0 && item.dispensedUnit
  ), []);

  const allInventoryReady = order ? order.items.length > 0 && order.items.every(itemReady) : false;
  const inventoryReadyCount = order ? order.items.filter(itemReady).length : 0;
  const pricingComplete = Boolean(order && order.items.length > 0 && order.items.every(item => item.unitPricePence !== null && item.unitPricePence > 0 && item.lineTotalPence !== null && item.lineTotalPence > 0));
  const medicineReleaseTerminal = Boolean(order && ["DELIVERED", "COLLECTED", "REJECTED", "CANCELLED"].includes(order.status));
  const medicineReleaseAllowed = Boolean(order?.payment && (order.payment.status === "PAID" || order.payment.status === "NOT_REQUIRED"));
  const medicineReleaseTitle = (() => {
    if (!order?.payment) return "Medicine release locked";
    if (order.payment.status === "FAILED") return "Payment failed";
    if (order.payment.status === "REFUNDED") return "Payment refunded";
    if (order.payment.chargePreference === "EXEMPT" || order.payment.chargePreference === "PPC") return "Exemption verification required";
    return "Payment required before release";
  })();

  const activeBanner = useMemo((): { title: string; tone: BannerTone } | null => {
    if (!order) return null;
    if (doctorRejectedRefill || order.status === "REJECTED") return { title: "Order rejected", tone: "danger" };
    if (order.status === "CANCELLED") return { title: "Order cancelled", tone: "danger" };
    if (order.status === "OUT_OF_STOCK") return { title: "Out of stock", tone: "danger" };
    if (awaitingDoctorConfirmation) return { title: "Waiting for doctor review", tone: "warning" };
    if (canVerifyExternalEvidence) return { title: "Review supporting evidence", tone: "warning" };
    if (!order.fulfilmentAllowed) return { title: "Authorisation required", tone: "warning" };
    if (order.status === "RECEIVED") return { title: "Next: accept order", tone: "info" };
    if (!allInventoryReady && !inventoryLockedStatuses.has(order.status)) return { title: "Next: match stock and price", tone: "warning" };
    if (order.status === "ACCEPTED") return { title: "Next: start preparing", tone: "info" };
    if (order.status === "PREPARING") return { title: "Next: mark ready", tone: "info" };
    if (order.status === "READY" && !medicineReleaseAllowed) return { title: medicineReleaseTitle, tone: "warning" };
    if (order.status === "READY" && medicineReleaseAllowed) return { title: "Ready for final fulfilment", tone: "success" };
    if (order.status === "OUT_FOR_DELIVERY") return { title: "Delivery in progress", tone: "info" };
    if (order.status === "DELIVERED" || order.status === "COLLECTED") return { title: "Order complete", tone: "success" };
    if (order.status === "DELAYED") return { title: "Order delayed", tone: "warning" };
    return { title: formatStatus(order.status), tone: "info" };
  }, [allInventoryReady, awaitingDoctorConfirmation, canVerifyExternalEvidence, doctorRejectedRefill, medicineReleaseAllowed, medicineReleaseTitle, order]);

  const stickyActions = primaryActions.filter(status => !inventoryReservationRequiredStatuses.has(status) || allInventoryReady);
  const showStickyBar = Boolean(order && !medicineReleaseTerminal && (canVerifyExternalEvidence || (order.fulfilmentAllowed && stickyActions.length > 0)));
  const reasonValid = statusReason.trim().length >= 5;
  const hasNotes = Boolean(order?.prescription?.notes || order?.requestNote || order?.statusReason);

  const confirmTitle = confirmAction?.type === "EVIDENCE" ? "Verify evidence" : confirmAction?.type === "STATUS" ? getActionLabel(confirmAction.status) : "";
  const confirmMessage = confirmAction?.type === "EVIDENCE" ? "Confirm the supporting evidence has been reviewed?" : confirmAction?.type === "STATUS" ? getActionConfirmation(confirmAction.status) : "";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />
      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: showStickyBar ? Math.max(insets.bottom + 112, 128) : Math.max(insets.bottom + 36, 48) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadOrder("refresh")} tintColor={PHARMACY} colors={[PHARMACY]} />}
        >
          <View style={styles.appBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" android_ripple={{ color: RIPPLE }} style={styles.iconButton} onPress={() => navigation.goBack()}>
              <ArrowLeft size={22} color={TEXT} strokeWidth={2.5} />
            </Pressable>
            <View style={styles.appBarText}>
              <Text style={styles.appBarTitle}>Medicine order</Text>
              <Text style={styles.appBarSubtitle}>Pharmacy fulfilment</Text>
            </View>
          </View>

          {isLoading ? (
            <StateView loading title="Loading order" text="Retrieving order details" />
          ) : errorMessage ? (
            <StateView title="Order unavailable" text={errorMessage} onRetry={() => void loadOrder("initial")} />
          ) : order && statusTone ? (
            <>
              <View style={styles.heroCard}>
                <View style={styles.heroTop}>
                  <View style={styles.heroSource}>
                    {order.orderSource === "DOCTOR_PRESCRIPTION" ? <BadgeCheck size={18} color={PHARMACY_DARK} strokeWidth={2.6} /> : <FileText size={18} color={BLUE_DARK} strokeWidth={2.6} />}
                    <Text style={styles.heroSourceText}>{getSourceLabel(order.orderSource)}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: statusTone.background }]}><Text style={[styles.statusText, { color: statusTone.color }]}>{formatStatus(order.status)}</Text></View>
                </View>
                <Text style={styles.orderNumber}>{order.orderNumber || `Order ${order.id.slice(0, 8)}`}</Text>
                <View style={styles.heroMeta}><Clock3 size={14} color="#D9F5E2" strokeWidth={2.3} /><Text style={styles.heroMetaText}>{formatDateTime(order.createdAt)}</Text></View>
                <View style={styles.verificationBar}>
                  <VerificationStatus active={order.prescriptionConfirmed} label="Doctor linked" />
                  <View style={styles.headerDivider} />
                  <VerificationStatus active={order.fulfilmentAllowed} label="Fulfilment allowed" />
                </View>
              </View>

              <View style={styles.quickInfoRow}>
                <QuickInfo background={BLUE_LIGHT} icon={<UserRound size={19} color={BLUE} strokeWidth={2.5} />} label="Patient" value={order.patient.fullName} />
                <QuickInfo background={PHARMACY_LIGHT} icon={<Pill size={19} color={PHARMACY} strokeWidth={2.5} />} label="Medicines" value={String(order.items.length)} />
                <QuickInfo background={WARNING_LIGHT} icon={<CreditCard size={19} color={WARNING_DARK} strokeWidth={2.5} />} label="Payment" value={order.payment ? formatStatus(order.payment.status) : "None"} />
              </View>

              {activeBanner ? <OrderStatusBanner title={activeBanner.title} tone={activeBanner.tone} /> : null}

              {exceptionActions.length > 0 ? (
                <View style={styles.exceptionRow}>
                  {exceptionActions.map(status => (
                    <Pressable key={status} accessibilityRole="button" accessibilityLabel={getActionLabel(status)} android_ripple={{ color: RIPPLE }} style={styles.exceptionButton} disabled={isActionLoading} onPress={() => handleAction(status)}>
                      <XCircle size={15} color={DANGER_DARK} strokeWidth={2.4} /><Text style={styles.exceptionText}>{getActionLabel(status)}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <SectionHeader title="Patient" icon={<UserRound size={18} color={BLUE} strokeWidth={2.5} />} />
              <View style={styles.card}>
                <View style={styles.profileRow}>
                  <View style={styles.avatar}><UserRound size={23} color={BLUE_DARK} strokeWidth={2.4} /></View>
                  <View style={styles.flex}><Text style={styles.primaryText}>{order.patient.fullName}</Text><Text style={styles.secondaryText}>{order.patient.email}</Text></View>
                </View>
                <InfoLine icon={<Phone size={16} color={BLUE_DARK} strokeWidth={2.3} />} text={order.patient.patientProfile?.phoneNumber || "No phone"} />
                <InfoLine icon={<MapPin size={16} color={BLUE_DARK} strokeWidth={2.3} />} text={address || "No address"} />
              </View>

              {order.doctor ? (
                <>
                  <SectionHeader title="Prescriber" icon={<Stethoscope size={18} color={PHARMACY} strokeWidth={2.5} />} />
                  <View style={styles.card}>
                    <View style={styles.profileRow}>
                      <View style={[styles.avatar, { backgroundColor: PHARMACY_LIGHT }]}><Stethoscope size={22} color={PHARMACY_DARK} strokeWidth={2.4} /></View>
                      <View style={styles.flex}>
                        <Text style={styles.primaryText}>{order.doctor.fullName}</Text>
                        <Text style={styles.secondaryText}>{order.doctor.doctorProfile?.specialization || "Doctor"}</Text>
                        {order.prescription ? <Text style={styles.metaText}>{formatDateTime(order.prescription.prescribedAt)}</Text> : null}
                      </View>
                      <BadgeCheck size={19} color={PHARMACY} strokeWidth={2.5} />
                    </View>
                  </View>
                </>
              ) : null}

              <SectionHeader title="Medicines & inventory" subtitle={`${inventoryReadyCount}/${order.items.length} ready`} icon={<Pill size={18} color={PHARMACY} strokeWidth={2.5} />} />
              <View style={styles.card}>
                {order.items.length > 0 ? order.items.map((item, index) => (
                  <MedicineItem key={item.id} item={item} last={index === order.items.length - 1} inventoryEditable={inventoryEditable} orderStatus={order.status} currency={order.payment?.currency || "GBP"} onManageStock={() => setInventoryMatchItem(item)} />
                )) : <EmptyRow text="No medicines attached" />}
              </View>

              {hasNotes ? (
                <>
                  <CollapsibleHeader title="Notes" open={showNotes} onPress={() => setShowNotes(value => !value)} icon={<FileText size={18} color={WARNING_DARK} strokeWidth={2.4} />} />
                  {showNotes ? (
                    <View style={styles.card}>
                      {order.prescription?.notes ? <NoteRow label="Doctor" text={order.prescription.notes} /> : null}
                      {order.requestNote ? <NoteRow label="Request" text={order.requestNote} /> : null}
                      {order.statusReason ? <NoteRow label="Status" text={order.statusReason} /> : null}
                    </View>
                  ) : null}
                </>
              ) : null}

              <SectionHeader title="Payment" icon={<CreditCard size={18} color={WARNING_DARK} strokeWidth={2.4} />} />
              <View style={styles.card}>
                {order.payment ? (
                  <>
                    <View style={styles.paymentSummary}>
                      <View style={[styles.avatar, { backgroundColor: WARNING_LIGHT }]}><CreditCard size={21} color={WARNING_DARK} strokeWidth={2.5} /></View>
                      <View style={styles.flex}><Text style={styles.primaryText}>{formatStatus(order.payment.chargePreference)}</Text><Text style={styles.secondaryText}>{formatStatus(order.payment.status)}</Text></View>
                      <Text style={styles.amountText}>{pricingComplete ? formatMoney(order.payment.amountPence, order.payment.currency) : "Pending"}</Text>
                    </View>
                    {order.items.some(item => item.lineTotalPence !== null) ? (
                      <>
                        <Pressable accessibilityRole="button" accessibilityLabel={showPaymentDetails ? "Hide payment breakdown" : "Show payment breakdown"} style={styles.compactToggle} onPress={() => setShowPaymentDetails(value => !value)}>
                          <Text style={styles.compactToggleText}>{showPaymentDetails ? "Hide breakdown" : "View breakdown"}</Text>
                          {showPaymentDetails ? <ChevronUp size={18} color={MUTED} /> : <ChevronDown size={18} color={MUTED} />}
                        </Pressable>
                        {showPaymentDetails ? (
                          <View style={styles.breakdown}>
                            {order.items.map(item => (
                              <View key={item.id} style={styles.breakdownRow}>
                                <View style={styles.flex}><Text style={styles.breakdownName} numberOfLines={1}>{item.name}</Text><Text style={styles.metaText}>{item.unitPricePence !== null ? `${formatMoney(item.unitPricePence, order.payment?.currency || "GBP")} per ${item.inventoryItem?.stockUnit || item.quantityUnit || "unit"}` : "Price pending"}</Text></View>
                                <Text style={styles.breakdownValue}>{item.lineTotalPence !== null ? formatMoney(item.lineTotalPence, order.payment?.currency || "GBP") : "—"}</Text>
                              </View>
                            ))}
                            <View style={styles.totalRow}><Text style={styles.totalLabel}>Order total</Text><Text style={styles.totalValue}>{pricingComplete ? formatMoney(order.payment.amountPence, order.payment.currency) : "Pending"}</Text></View>
                          </View>
                        ) : null}
                      </>
                    ) : null}
                  </>
                ) : <EmptyRow text="No payment information" />}
              </View>

              {order.exemptionClaim ? (
                <>
                  <SectionHeader title="Exemption" icon={<ShieldCheck size={18} color={BLUE} strokeWidth={2.4} />} />
                  <View style={styles.card}>
                    <View style={styles.simpleRow}>
                      <ShieldCheck size={20} color={BLUE_DARK} strokeWidth={2.5} />
                      <View style={styles.flex}><Text style={styles.primaryText}>{formatStatus(order.exemptionClaim.exemptionType)}</Text><Text style={styles.secondaryText}>{order.exemptionClaim.referenceNumber || "No reference"}</Text></View>
                      <Text style={styles.statusInline}>{formatStatus(order.exemptionClaim.status)}</Text>
                    </View>
                    {order.exemptionClaim.rejectionReason ? <Text style={styles.noteText}>{order.exemptionClaim.rejectionReason}</Text> : null}
                  </View>
                </>
              ) : null}

              {order.patientSubmission ? (
                <>
                  <SectionHeader title="Request verification" icon={<FileCheck2 size={18} color={BLUE} strokeWidth={2.4} />} />
                  <View style={styles.card}>
                    <View style={styles.simpleRow}>
                      <FileCheck2 size={20} color={BLUE_DARK} strokeWidth={2.5} />
                      <View style={styles.flex}>
                        <Text style={styles.primaryText}>{order.patientSubmission.verificationPath ? formatStatus(order.patientSubmission.verificationPath) : formatStatus(order.patientSubmission.requestType)}</Text>
                        <Text style={styles.secondaryText}>
                          {order.patientSubmission.verificationPath === "ASSIGNED_DOCTOR" ? formatStatus(order.patientSubmission.doctorVerificationStatus) : formatStatus(order.patientSubmission.status)}
                        </Text>
                      </View>
                      {order.patientSubmission.imageUrl ? (
                        <Pressable accessibilityRole="button" accessibilityLabel="View supporting evidence" android_ripple={{ color: RIPPLE }} style={styles.evidenceButton} disabled={isEvidenceLoading} onPress={() => void openPatientRefillEvidence()}>
                          {isEvidenceLoading ? <ActivityIndicator size="small" color={BLUE_DARK} /> : <Eye size={18} color={BLUE_DARK} strokeWidth={2.5} />}
                        </Pressable>
                      ) : null}
                    </View>
                    {isAssignedDoctorRefill && refillSubmission?.verificationDoctor?.fullName ? <Text style={styles.metaText}>Doctor: {refillSubmission.verificationDoctor.fullName}</Text> : null}
                    {isCareMatePrescriptionRefill ? <Text style={styles.metaText}>CareMate+ prescription linked</Text> : null}
                  </View>
                </>
              ) : null}

              <CollapsibleHeader title="Order history" open={showHistory} onPress={() => setShowHistory(value => !value)} icon={<History size={18} color={PHARMACY} strokeWidth={2.4} />} />
              {showHistory ? (
                <View style={styles.card}>
                  {order.statusHistory.length > 0 ? order.statusHistory.map((item, index) => (
                    <HistoryRow key={item.id} status={formatStatus(item.toStatus)} date={formatDateTime(item.createdAt)} note={item.note} current={index === order.statusHistory.length - 1} />
                  )) : <HistoryRow status={formatStatus(order.status)} date={formatDateTime(order.createdAt)} note="Order received" current />}
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        {showStickyBar && order ? (
          <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            {canVerifyExternalEvidence ? (
              <>
                <Pressable accessibilityRole="button" accessibilityLabel="View supporting evidence" style={styles.stickySecondary} disabled={isEvidenceLoading || isVerificationLoading} onPress={() => void openPatientRefillEvidence()}>
                  {isEvidenceLoading ? <ActivityIndicator size="small" color={BLUE_DARK} /> : <><Eye size={18} color={BLUE_DARK} strokeWidth={2.5} /><Text style={styles.stickySecondaryText}>View evidence</Text></>}
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Verify supporting evidence" style={styles.stickyPrimary} disabled={isVerificationLoading} onPress={() => setConfirmAction({ type: "EVIDENCE" })}>
                  {isVerificationLoading ? <ActivityIndicator color={SURFACE} /> : <><ShieldCheck size={18} color={SURFACE} strokeWidth={2.5} /><Text style={styles.stickyPrimaryText}>Verify evidence</Text></>}
                </Pressable>
              </>
            ) : stickyActions.map(status => (
              <Pressable key={status} accessibilityRole="button" accessibilityLabel={getActionLabel(status)} style={styles.stickyPrimary} disabled={isActionLoading} onPress={() => handleAction(status)}>
                {status === "OUT_FOR_DELIVERY" ? <Truck size={18} color={SURFACE} strokeWidth={2.5} /> : <CheckCircle2 size={18} color={SURFACE} strokeWidth={2.5} />}
                <Text style={styles.stickyPrimaryText}>{getActionLabel(status)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <PharmacyInventoryMatchModal visible={Boolean(inventoryMatchItem)} orderId={route.params.orderId} item={inventoryMatchItem} canEdit={inventoryEditable} onClose={() => setInventoryMatchItem(null)} onChanged={refreshOrder} onOpenInventory={() => { setInventoryMatchItem(null); navigation.navigate("PharmacyInventory"); }} />

      <Modal visible={Boolean(confirmAction)} transparent animationType="fade" onRequestClose={() => setConfirmAction(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModal}>
            <Text style={styles.modalTitle}>{confirmTitle}</Text>
            <Text style={styles.modalText}>{confirmMessage}</Text>
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel" style={styles.modalSecondaryButton} onPress={() => setConfirmAction(null)}><Text style={styles.modalSecondaryText}>Cancel</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={confirmTitle} style={styles.modalPrimaryButton} onPress={() => void submitConfirmAction()}><Text style={styles.modalPrimaryText}>Confirm</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={reasonModalVisible} transparent animationType="fade" onRequestClose={() => setReasonModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.reasonModal}>
            <View style={styles.modalHeader}>
              <View style={styles.flex}><Text style={styles.modalTitle}>{selectedExceptionStatus ? getActionLabel(selectedExceptionStatus) : "Update order"}</Text><Text style={styles.modalText}>Reason required</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close reason dialog" style={styles.modalClose} onPress={() => setReasonModalVisible(false)}><X size={20} color={TEXT} strokeWidth={2.5} /></Pressable>
            </View>
            <TextInput style={styles.reasonInput} value={statusReason} onChangeText={setStatusReason} placeholder="Enter reason..." placeholderTextColor="#9AA0AF" multiline maxLength={500} textAlignVertical="top" />
            <View style={styles.reasonMeta}><Text style={[styles.reasonHint, reasonValid && styles.reasonHintValid]}>{reasonValid ? "Reason ready" : "Minimum 5 characters"}</Text><Text style={styles.characterCount}>{statusReason.length}/500</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={selectedExceptionStatus ? getActionLabel(selectedExceptionStatus) : "Confirm"} style={[styles.modalPrimaryButton, (!reasonValid || isActionLoading) && styles.disabled]} disabled={!reasonValid || isActionLoading} onPress={submitExceptionStatus}>
              {isActionLoading ? <ActivityIndicator color={SURFACE} /> : <Text style={styles.modalPrimaryText}>{selectedExceptionStatus ? getActionLabel(selectedExceptionStatus) : "Confirm"}</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={evidenceVisible} animationType="slide" onRequestClose={() => setEvidenceVisible(false)}>
        <SafeAreaView style={styles.viewerSafeArea} edges={["top", "bottom"]}>
          <View style={styles.viewerHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close evidence viewer" android_ripple={{ color: RIPPLE }} style={styles.iconButton} onPress={() => setEvidenceVisible(false)}><X size={21} color={TEXT} strokeWidth={2.6} /></Pressable>
            <View style={styles.flex}><Text style={styles.viewerTitle}>Medicine evidence</Text><Text style={styles.viewerSubtitle} numberOfLines={1}>{refillSubmission?.evidenceType ? formatStatus(refillSubmission.evidenceType) : "Protected patient evidence"}</Text></View>
            <ShieldCheck size={21} color={PHARMACY} strokeWidth={2.5} />
          </View>
          {evidenceSource ? <WebView source={evidenceSource} startInLoadingState javaScriptEnabled domStorageEnabled incognito cacheEnabled={false} style={styles.webView} renderLoading={() => <StateView loading title="Opening evidence" text="Loading protected document" />} /> : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const VerificationStatus = ({ active, label }: { active: boolean; label: string }) => (
  <View style={styles.verificationItem}>
    {active ? <CheckCircle2 size={15} color={SURFACE} strokeWidth={2.5} /> : <AlertCircle size={15} color="#FFE7E7" strokeWidth={2.5} />}
    <Text style={styles.verificationText}>{label}</Text>
  </View>
);

const QuickInfo = ({ background, icon, label, value }: { background: string; icon: ReactNode; label: string; value: string }) => (
  <View style={[styles.quickInfo, { backgroundColor: background }]}>{icon}<Text style={styles.quickInfoValue} numberOfLines={1}>{value}</Text><Text style={styles.quickInfoLabel}>{label}</Text></View>
);

const SectionHeader = ({ title, subtitle, icon }: { title: string; subtitle?: string; icon: ReactNode }) => (
  <View style={styles.sectionHeader}>{icon}<Text style={styles.sectionTitle}>{title}</Text>{subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}</View>
);

const CollapsibleHeader = ({ title, icon, open, onPress }: { title: string; icon: ReactNode; open: boolean; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={`${open ? "Collapse" : "Expand"} ${title}`} style={styles.collapsibleHeader} onPress={onPress}>
    <View style={styles.collapsibleTitle}>{icon}<Text style={styles.sectionTitle}>{title}</Text></View>
    {open ? <ChevronUp size={19} color={MUTED} /> : <ChevronDown size={19} color={MUTED} />}
  </Pressable>
);

const OrderStatusBanner = ({ title, tone }: { title: string; tone: BannerTone }) => {
  const palette = tone === "danger" ? { background: DANGER_LIGHT, color: DANGER_DARK } : tone === "warning" ? { background: WARNING_LIGHT, color: WARNING_DARK } : tone === "success" ? { background: PHARMACY_LIGHT, color: PHARMACY_DARK } : { background: BLUE_LIGHT, color: BLUE_DARK };
  const icon = tone === "danger" ? <XCircle size={20} color={palette.color} strokeWidth={2.6} /> : tone === "warning" ? <AlertCircle size={20} color={palette.color} strokeWidth={2.6} /> : tone === "success" ? <CheckCircle2 size={20} color={palette.color} strokeWidth={2.6} /> : <PackageCheck size={20} color={palette.color} strokeWidth={2.6} />;
  return <View style={[styles.statusBanner, { backgroundColor: palette.background }]}>{icon}<Text style={[styles.statusBannerText, { color: palette.color }]}>{title}</Text></View>;
};

const InfoLine = ({ icon, text }: { icon: ReactNode; text: string }) => <View style={styles.infoLine}>{icon}<Text style={styles.infoText} numberOfLines={2}>{text}</Text></View>;
const NoteRow = ({ label, text }: { label: string; text: string }) => <View style={styles.noteRow}><Text style={styles.noteLabel}>{label}</Text><Text style={styles.noteText}>{text}</Text></View>;
const EmptyRow = ({ text }: { text: string }) => <View style={styles.emptyRow}><Text style={styles.secondaryText}>{text}</Text></View>;

const HistoryRow = ({ status, date, note, current }: { status: string; date: string; note?: string | null; current: boolean }) => (
  <View style={styles.historyRow}>
    <View style={[styles.historyDot, current && styles.historyDotCurrent]} />
    <View style={styles.flex}><View style={styles.historyTitleRow}><Text style={styles.primaryText}>{status}</Text>{current ? <Text style={styles.currentText}>Current</Text> : null}</View><Text style={styles.metaText}>{date}</Text>{note ? <Text style={styles.noteText}>{note}</Text> : null}</View>
  </View>
);

const MedicineItem = ({ item, last, inventoryEditable, orderStatus, currency, onManageStock }: { item: PharmacyMedicineItem; last: boolean; inventoryEditable: boolean; orderStatus: PharmacyOrderStatus; currency: string; onManageStock: () => void }) => {
  const rawQuantity = item.quantity?.trim() || "";
  const unitAlreadyIncluded = item.quantityUnit ? rawQuantity.toLowerCase().includes(item.quantityUnit.toLowerCase()) : true;
  const quantityText = rawQuantity ? `${rawQuantity}${item.quantityUnit && !unitAlreadyIncluded ? ` ${item.quantityUnit}` : ""}` : "Not specified";
  const dispensed = Number.isFinite(Number(item.dispensedQuantity)) ? Math.max(0, Number(item.dispensedQuantity)) : 0;
  const dispensedUnit = normalizeUnit(item.dispensedUnit);
  const dispensedText = dispensed > 0 ? `${dispensed}${dispensedUnit ? ` ${pluralize(dispensedUnit, dispensed)}` : ""}` : "Not allocated";
  const allocationActive = Boolean(item.inventoryItemId && item.inventoryReservedQuantity > 0 && item.inventoryReservedAt && !item.inventoryReleasedAt && !item.inventoryConsumedAt);
  const stockConsumed = Boolean(item.inventoryConsumedAt);
  const matched = allocationActive || stockConsumed;
  const priceReady = item.unitPricePence !== null && item.unitPricePence > 0 && item.lineTotalPence !== null && item.lineTotalPence > 0;

  return (
    <View style={[styles.medicineItem, !last && styles.medicineDivider]}>
      <View style={styles.medicineTop}>
        <View style={styles.medicineIcon}><Pill size={19} color={PHARMACY} strokeWidth={2.5} /></View>
        <View style={styles.flex}><Text style={styles.medicineName}>{item.name}</Text><Text style={styles.secondaryText}>{item.dose || "Dose not specified"} • {quantityText}</Text></View>
        <View style={[styles.matchChip, matched ? styles.matchChipReady : styles.matchChipPending]}><Text style={[styles.matchChipText, { color: matched ? PHARMACY_DARK : WARNING_DARK }]}>{stockConsumed ? "Completed" : matched ? "Matched" : "Unmatched"}</Text></View>
      </View>
      {item.instructions ? <Text style={styles.instructions} numberOfLines={2}>{item.instructions}</Text> : null}
      <View style={styles.medicineFacts}>
        <View style={styles.fact}><Text style={styles.factLabel}>Prepared</Text><Text style={styles.factValue}>{dispensedText}</Text></View>
        <View style={styles.fact}><Text style={styles.factLabel}>Price</Text><Text style={styles.factValue}>{priceReady ? formatMoney(item.lineTotalPence!, currency) : "Pending"}</Text></View>
      </View>
      {matched && item.inventoryItem ? <Text style={styles.inventoryMeta} numberOfLines={1}>{item.inventoryItem.medicineName}{item.inventoryItem.strength ? ` • ${item.inventoryItem.strength}` : ""}{item.inventoryItem.form ? ` • ${item.inventoryItem.form}` : ""}</Text> : null}
      {!stockConsumed ? (
        <Pressable accessibilityRole="button" accessibilityLabel={matched ? `Review stock for ${item.name}` : `Match stock for ${item.name}`} android_ripple={{ color: RIPPLE }} style={[styles.stockButton, !inventoryEditable && styles.disabledStockButton]} disabled={!inventoryEditable} onPress={onManageStock}>
          <PackageSearch size={16} color={inventoryEditable ? SURFACE : MUTED} strokeWidth={2.5} />
          <Text style={[styles.stockButtonText, !inventoryEditable && { color: MUTED }]}>{matched ? "Review stock" : orderStatus === "RECEIVED" ? "Accept order first" : "Match stock & price"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const StateView = ({ loading, title, text, onRetry }: { loading?: boolean; title: string; text: string; onRetry?: () => void }) => (
  <View style={styles.stateArea}>
    {loading ? <ActivityIndicator color={PHARMACY} /> : <AlertCircle size={28} color={DANGER} strokeWidth={2.5} />}
    <Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateText}>{text}</Text>
    {onRetry ? <Pressable accessibilityRole="button" accessibilityLabel="Retry loading order" style={styles.retryButton} onPress={onRetry}><RefreshCw size={16} color={SURFACE} strokeWidth={2.5} /><Text style={styles.retryText}>Try again</Text></Pressable> : null}
  </View>
);

export default PharmacyOrderDetailScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  flex: { flex: 1 },
  appBar: { minHeight: 58, flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  appBarText: { flex: 1, marginLeft: 4 },
  appBarTitle: { color: TEXT, fontSize: 20, fontWeight: "800" },
  appBarSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 1 },
  iconButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  heroCard: { backgroundColor: PHARMACY, borderRadius: 17, padding: 14, marginBottom: 12 },
  heroTop: { flexDirection: "row", alignItems: "center" },
  heroSource: { flex: 1, flexDirection: "row", alignItems: "center" },
  heroSourceText: { color: "#E9FFF0", fontSize: 11, fontWeight: "700", marginLeft: 7 },
  orderNumber: { color: SURFACE, fontSize: 20, fontWeight: "800", marginTop: 10 },
  heroMeta: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  heroMetaText: { color: "#D9F5E2", fontSize: 11, fontWeight: "600", marginLeft: 6 },
  statusChip: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: "800" },
  verificationBar: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 10, marginTop: 11, minHeight: 40 },
  verificationItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 7 },
  verificationText: { color: SURFACE, fontSize: 11, fontWeight: "700", marginLeft: 5 },
  headerDivider: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: "rgba(255,255,255,0.3)" },
  quickInfoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  quickInfo: { width: "31.5%", minHeight: 84, borderRadius: 14, padding: 10, justifyContent: "center" },
  quickInfoValue: { color: TEXT, fontSize: 13, fontWeight: "800", marginTop: 7 },
  quickInfoLabel: { color: MUTED, fontSize: 11, fontWeight: "700", marginTop: 2 },
  statusBanner: { minHeight: 54, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", marginBottom: 14 },
  statusBannerText: { flex: 1, fontSize: 13, fontWeight: "800", marginLeft: 10 },
  exceptionRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  exceptionButton: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: "#F6C8CC", backgroundColor: SURFACE, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
  exceptionText: { color: DANGER_DARK, fontSize: 11, fontWeight: "700", marginLeft: 6 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 8 },
  sectionTitle: { flex: 1, color: TEXT, fontSize: 15, fontWeight: "800", marginLeft: 8 },
  sectionSubtitle: { color: MUTED, fontSize: 11, fontWeight: "700" },
  collapsibleHeader: { minHeight: 48, flexDirection: "row", alignItems: "center", marginTop: 8 },
  collapsibleTitle: { flex: 1, flexDirection: "row", alignItems: "center" },
  card: { backgroundColor: SURFACE, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: BORDER },
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: BLUE_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  primaryText: { color: TEXT, fontSize: 14, fontWeight: "800" },
  secondaryText: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 2 },
  metaText: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 4 },
  infoLine: { flexDirection: "row", alignItems: "center", marginTop: 11 },
  infoText: { flex: 1, color: TEXT, fontSize: 12, fontWeight: "600", marginLeft: 8 },
  simpleRow: { flexDirection: "row", alignItems: "center" },
  statusInline: { color: BLUE_DARK, fontSize: 11, fontWeight: "800" },
  paymentSummary: { flexDirection: "row", alignItems: "center" },
  amountText: { color: TEXT, fontSize: 16, fontWeight: "900" },
  compactToggle: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER, paddingTop: 10 },
  compactToggleText: { color: BLUE_DARK, fontSize: 12, fontWeight: "800" },
  breakdown: { marginTop: 4 },
  breakdownRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  breakdownName: { color: TEXT, fontSize: 12, fontWeight: "700" },
  breakdownValue: { color: TEXT, fontSize: 12, fontWeight: "800", marginLeft: 10 },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10 },
  totalLabel: { color: TEXT, fontSize: 13, fontWeight: "800" },
  totalValue: { color: PHARMACY_DARK, fontSize: 15, fontWeight: "900" },
  evidenceButton: { width: 48, height: 48, borderRadius: 14, backgroundColor: BLUE_LIGHT, alignItems: "center", justifyContent: "center", marginLeft: 10 },
  noteRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  noteLabel: { color: MUTED, fontSize: 11, fontWeight: "800", marginBottom: 3 },
  noteText: { color: TEXT, fontSize: 12, fontWeight: "600", lineHeight: 18 },
  emptyRow: { alignItems: "center", paddingVertical: 18 },
  medicineItem: { paddingVertical: 12 },
  medicineDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  medicineTop: { flexDirection: "row", alignItems: "center" },
  medicineIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: PHARMACY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 10 },
  medicineName: { color: TEXT, fontSize: 14, fontWeight: "800" },
  matchChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginLeft: 8 },
  matchChipReady: { backgroundColor: PHARMACY_LIGHT },
  matchChipPending: { backgroundColor: WARNING_LIGHT },
  matchChipText: { fontSize: 11, fontWeight: "800" },
  instructions: { color: TEXT, fontSize: 11, fontWeight: "600", lineHeight: 17, marginTop: 9 },
  medicineFacts: { flexDirection: "row", marginTop: 10 },
  fact: { flex: 1 },
  factLabel: { color: MUTED, fontSize: 11, fontWeight: "700" },
  factValue: { color: TEXT, fontSize: 12, fontWeight: "800", marginTop: 2 },
  inventoryMeta: { color: PHARMACY_DARK, fontSize: 11, fontWeight: "700", marginTop: 9 },
  stockButton: { minHeight: 46, borderRadius: 11, backgroundColor: PHARMACY, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 10, paddingHorizontal: 12, overflow: "hidden" },
  disabledStockButton: { backgroundColor: "#E4E7ED" },
  stockButtonText: { color: SURFACE, fontSize: 12, fontWeight: "800", marginLeft: 7 },
  disabled: { opacity: 0.45 },
  historyRow: { flexDirection: "row", paddingVertical: 9 },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#C9CED8", marginTop: 4, marginRight: 11 },
  historyDotCurrent: { backgroundColor: PHARMACY },
  historyTitleRow: { flexDirection: "row", alignItems: "center" },
  currentText: { color: PHARMACY_DARK, fontSize: 11, fontWeight: "800", marginLeft: 8 },
  stickyBar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 14, paddingTop: 10, flexDirection: "row", gap: 8 },
  stickyPrimary: { flex: 1, minHeight: 52, borderRadius: 13, backgroundColor: PHARMACY, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  stickyPrimaryText: { color: SURFACE, fontSize: 13, fontWeight: "800", marginLeft: 7, textAlign: "center" },
  stickySecondary: { flex: 1, minHeight: 52, borderRadius: 13, borderWidth: 1, borderColor: "#C9D8FA", backgroundColor: BLUE_LIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  stickySecondaryText: { color: BLUE_DARK, fontSize: 12, fontWeight: "800", marginLeft: 7 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(16,22,38,0.42)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  confirmModal: { width: "100%", maxWidth: 420, backgroundColor: SURFACE, borderRadius: 18, padding: 18 },
  reasonModal: { width: "100%", maxWidth: 440, backgroundColor: SURFACE, borderRadius: 18, padding: 18 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start" },
  modalTitle: { color: TEXT, fontSize: 17, fontWeight: "800" },
  modalText: { color: MUTED, fontSize: 12, fontWeight: "600", lineHeight: 18, marginTop: 6 },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 18 },
  modalSecondaryButton: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: BACKGROUND, alignItems: "center", justifyContent: "center" },
  modalSecondaryText: { color: TEXT, fontSize: 12, fontWeight: "800" },
  modalPrimaryButton: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: PHARMACY, alignItems: "center", justifyContent: "center", marginTop: 14 },
  modalPrimaryText: { color: SURFACE, fontSize: 12, fontWeight: "800" },
  modalClose: { width: 48, height: 48, borderRadius: 14, backgroundColor: BACKGROUND, alignItems: "center", justifyContent: "center", marginLeft: 10 },
  reasonInput: { minHeight: 116, borderWidth: 1, borderColor: BORDER, borderRadius: 12, backgroundColor: "#F8F9FC", color: TEXT, fontSize: 13, fontWeight: "600", padding: 12, marginTop: 14 },
  reasonMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7 },
  reasonHint: { color: DANGER_DARK, fontSize: 11, fontWeight: "700" },
  reasonHintValid: { color: PHARMACY_DARK },
  characterCount: { color: MUTED, fontSize: 11, fontWeight: "600" },
  viewerSafeArea: { flex: 1, backgroundColor: SURFACE },
  viewerHeader: { minHeight: 62, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  viewerTitle: { color: TEXT, fontSize: 17, fontWeight: "800" },
  viewerSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 2 },
  webView: { flex: 1, backgroundColor: SURFACE },
  stateArea: { paddingVertical: 48, paddingHorizontal: 24, alignItems: "center" },
  stateTitle: { color: TEXT, fontSize: 16, fontWeight: "800", marginTop: 10 },
  stateText: { color: MUTED, fontSize: 12, lineHeight: 18, textAlign: "center", fontWeight: "600", marginTop: 4 },
  retryButton: { minHeight: 46, borderRadius: 11, backgroundColor: PHARMACY, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginTop: 14 },
  retryText: { color: SURFACE, fontSize: 12, fontWeight: "800", marginLeft: 7 },
});