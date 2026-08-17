import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock3, FileCheck2, PackageCheck, Pill, RefreshCcw, ShieldCheck, ShoppingBag, Stethoscope, XCircle } from "lucide-react-native";

import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { patientOrdersApi, type PatientOrder, type PatientOrderStatus, type PatientOrdersResponse } from "../../services/patientOrdersApi";

type OrderFilter = "ACTIVE" | "COMPLETED" | "ATTENTION" | "ALL";

type StatusTone = {
  background: string;
  soft: string;
  text: string;
};

const BACKGROUND = "#F4F6FB";
const SURFACE = "#FFFFFF";
const TEXT = "#111827";
const MUTED = "#788195";
const BORDER = "#E5E9F2";
const SOFT = "#F7F8FC";

const PRIMARY = "#4F6FE8";
const PRIMARY_DARK = "#2847B8";
const PRIMARY_LIGHT = "#E9EDFF";

const SUCCESS = "#279A70";
const SUCCESS_DARK = "#146A4D";
const SUCCESS_LIGHT = "#E5F6EF";

const WARNING = "#D48825";
const WARNING_DARK = "#925510";
const WARNING_LIGHT = "#FFF0D9";

const DANGER = "#D64C58";
const DANGER_DARK = "#9F2832";
const DANGER_LIGHT = "#FDE8EA";

const EMPTY_SUMMARY: PatientOrdersResponse["summary"] = { total: 0, active: 0, completed: 0, needsAttention: 0 };

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#111827",
  shadowOffset: { width: 0, height: level === 1 ? 1 : 2 },
  shadowOpacity: Platform.OS === "android" ? 0 : level === 1 ? 0.05 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
});

const ACTIVE_STATUSES: PatientOrderStatus[] = ["RECEIVED", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];
const COMPLETED_STATUSES: PatientOrderStatus[] = ["DELIVERED", "COLLECTED"];
const ATTENTION_STATUSES: PatientOrderStatus[] = ["REJECTED", "CANCELLED", "DELAYED", "OUT_OF_STOCK"];

const formatStatus = (status: PatientOrderStatus) => {
  const labels: Record<PatientOrderStatus, string> = {
    RECEIVED: "Received",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    PREPARING: "Preparing",
    READY: "Ready",
    OUT_FOR_DELIVERY: "Out for delivery",
    DELIVERED: "Delivered",
    COLLECTED: "Collected",
    CANCELLED: "Cancelled",
    DELAYED: "Delayed",
    OUT_OF_STOCK: "Out of stock",
  };
  return labels[status];
};

const formatSource = (source: string) => {
  if (source === "DOCTOR_PRESCRIPTION") return "Doctor prescription";
  if (source === "REFILL_REQUEST") return "Pharmacy request";
  if (source === "PATIENT_SUBMISSION") return "Patient request";
  if (source === "MANUAL_REQUEST") return "Manual request";
  return source.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const getStatusTone = (status: PatientOrderStatus): StatusTone => {
  if (status === "DELIVERED" || status === "COLLECTED") return { background: SUCCESS, soft: SUCCESS_LIGHT, text: SUCCESS_DARK };
  if (status === "REJECTED" || status === "CANCELLED" || status === "OUT_OF_STOCK") return { background: DANGER, soft: DANGER_LIGHT, text: DANGER_DARK };
  if (status === "DELAYED") return { background: WARNING, soft: WARNING_LIGHT, text: WARNING_DARK };
  return { background: PRIMARY, soft: PRIMARY_LIGHT, text: PRIMARY_DARK };
};

const getVerificationState = (order: PatientOrder) => {
  const verification = order.verification;
  if (!verification) return null;

  if (verification.verificationPath === "ASSIGNED_DOCTOR" && verification.doctorVerificationStatus === "PENDING") {
    return {
      type: "DOCTOR" as const,
      title: "Doctor confirmation",
      subtitle: verification.verificationDoctor?.fullName || "Waiting for your doctor",
    };
  }

  if (verification.verificationPath === "ASSIGNED_DOCTOR" && verification.doctorVerificationStatus === "REJECTED") {
    return {
      type: "ATTENTION" as const,
      title: "Doctor declined",
      subtitle: verification.doctorVerificationNote || "Medicine not confirmed",
    };
  }

  if (verification.verificationPath === "EXTERNAL_EVIDENCE" && !order.fulfilmentAllowed) {
    return { type: "PHARMACY" as const, title: "Pharmacy review", subtitle: "Evidence under review" };
  }

  return null;
};

const getMainMedicine = (order: PatientOrder) => {
  if (order.items.length > 0) {
    const first = order.items[0];
    return {
      name: first.name,
      dose: first.dose,
      quantity: `${first.quantity} ${first.quantityUnit || "unit"}`,
      extraItems: Math.max(0, order.items.length - 1),
    };
  }

  return {
    name: order.medicineName || "Medicine",
    dose: order.dose || null,
    quantity: order.quantity ? String(order.quantity) : null,
    extraItems: 0,
  };
};

const getFilterCount = (filter: OrderFilter, summary: PatientOrdersResponse["summary"]) => {
  if (filter === "ACTIVE") return summary.active;
  if (filter === "COMPLETED") return summary.completed;
  if (filter === "ATTENTION") return summary.needsAttention;
  return summary.total;
};

export const PatientOrdersScreen = () => {
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState<PatientOrder[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [selectedFilter, setSelectedFilter] = useState<OrderFilter>("ACTIVE");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrders = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      setErrorMessage("");

      const result = await patientOrdersApi.listOrders();
      setOrders(result.orders);
      setSummary(result.summary);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load orders.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

  const filteredOrders = useMemo(() => {
    if (selectedFilter === "ALL") return orders;
    if (selectedFilter === "ACTIVE") return orders.filter(order => ACTIVE_STATUSES.includes(order.status));
    if (selectedFilter === "COMPLETED") return orders.filter(order => COMPLETED_STATUSES.includes(order.status));
    return orders.filter(order => ATTENTION_STATUSES.includes(order.status));
  }, [orders, selectedFilter]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Orders</Text>
              <Text style={styles.headerSubtitle}>Pharmacy requests</Text>
            </View>

            <View style={styles.headerCount}>
              <ShoppingBag size={18} color={PRIMARY_DARK} strokeWidth={2.6} />
              <Text style={styles.headerCountText}>{summary.total}</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <LoadingState />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={() => void loadOrders()} />
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(115, insets.bottom + 100) }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadOrders(true)} colors={[PRIMARY]} />}
          >
            <View style={styles.overviewCard}>
              <OverviewItem value={summary.active} label="Active" color={PRIMARY} soft={PRIMARY_LIGHT} icon={<Clock3 size={18} color={PRIMARY} strokeWidth={2.6} />} />
              <View style={styles.overviewDivider} />
              <OverviewItem value={summary.completed} label="Completed" color={SUCCESS} soft={SUCCESS_LIGHT} icon={<CheckCircle2 size={18} color={SUCCESS} strokeWidth={2.6} />} />
              <View style={styles.overviewDivider} />
              <OverviewItem value={summary.needsAttention} label="Attention" color={WARNING} soft={WARNING_LIGHT} icon={<AlertTriangle size={18} color={WARNING} strokeWidth={2.6} />} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              <FilterButton label="Active" count={getFilterCount("ACTIVE", summary)} selected={selectedFilter === "ACTIVE"} color={PRIMARY} onPress={() => setSelectedFilter("ACTIVE")} />
              <FilterButton label="Completed" count={getFilterCount("COMPLETED", summary)} selected={selectedFilter === "COMPLETED"} color={SUCCESS} onPress={() => setSelectedFilter("COMPLETED")} />
              <FilterButton label="Attention" count={getFilterCount("ATTENTION", summary)} selected={selectedFilter === "ATTENTION"} color={WARNING} onPress={() => setSelectedFilter("ATTENTION")} />
              <FilterButton label="All" count={getFilterCount("ALL", summary)} selected={selectedFilter === "ALL"} color={PRIMARY} onPress={() => setSelectedFilter("ALL")} />
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedFilter === "ACTIVE"
                  ? "Active Orders"
                  : selectedFilter === "COMPLETED"
                    ? "Completed Orders"
                    : selectedFilter === "ATTENTION"
                      ? "Needs Attention"
                      : "All Orders"}
              </Text>

              <Text style={styles.sectionCount}>{filteredOrders.length}</Text>
            </View>

            {filteredOrders.length === 0 ? (
              <EmptyState filter={selectedFilter} />
            ) : (
              filteredOrders.map(order => <OrderCard key={order.id} order={order} />)
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const LoadingState = () => (
  <View style={styles.centerState}>
    <ActivityIndicator size="large" color={PRIMARY} />
    <Text style={styles.loadingText}>Loading orders...</Text>
  </View>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <View style={styles.centerState}>
    <View style={styles.errorIcon}>
      <AlertCircle size={27} color={DANGER} strokeWidth={2.6} />
    </View>

    <Text style={styles.centerTitle}>Unable to load orders</Text>
    <Text style={styles.centerText}>{message}</Text>

    <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.85}>
      <RefreshCcw size={17} color={SURFACE} strokeWidth={2.6} />
      <Text style={styles.retryButtonText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);

const OverviewItem = ({
  value,
  label,
  icon,
  color,
  soft,
}: {
  value: number;
  label: string;
  icon: ReactNode;
  color: string;
  soft: string;
}) => (
  <View style={styles.overviewItem}>
    <View style={[styles.overviewIcon, { backgroundColor: soft }]}>{icon}</View>

    <View>
      <Text style={[styles.overviewValue, { color }]}>{value}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  </View>
);

const FilterButton = ({
  label,
  count,
  selected,
  color,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  color: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.filterButton, selected ? { backgroundColor: color, borderColor: color } : undefined]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Text style={[styles.filterText, selected ? styles.filterTextSelected : undefined]}>{label}</Text>

    <View style={[styles.filterCount, selected ? styles.filterCountSelected : undefined]}>
      <Text style={[styles.filterCountText, selected ? styles.filterCountTextSelected : undefined]}>{count}</Text>
    </View>
  </TouchableOpacity>
);

const EmptyState = ({ filter }: { filter: OrderFilter }) => {
  const title =
    filter === "ACTIVE"
      ? "No active orders"
      : filter === "COMPLETED"
        ? "No completed orders"
        : filter === "ATTENTION"
          ? "Nothing needs attention"
          : "No orders yet";

  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <PackageCheck size={28} color={PRIMARY} strokeWidth={2.6} />
      </View>

      <Text style={styles.emptyTitle}>{title}</Text>
      {filter === "ALL" ? <Text style={styles.emptyText}>Pharmacy requests will appear here.</Text> : null}
    </View>
  );
};

const OrderCard = ({ order }: { order: PatientOrder }) => {
  const tone = getStatusTone(order.status);
  const medicine = getMainMedicine(order);
  const verification = getVerificationState(order);
  const latestTimeline = order.timeline.length > 0 ? order.timeline[order.timeline.length - 1] : null;

  return (
    <View style={[styles.orderCard, { backgroundColor: tone.soft, borderColor: tone.background }]}>
      <View style={[styles.statusAccent, { backgroundColor: tone.background }]} />

      <View style={styles.orderContent}>
        <View style={[styles.headerBand, { backgroundColor: tone.background }]}>
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderText}>
              <Text style={[styles.orderNumber, styles.whiteText]}>{order.orderNumber}</Text>
              <Text style={styles.orderDateWhite}>{formatDate(order.createdAt)}</Text>
            </View>

            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: tone.background }]} />
              <Text style={[styles.statusBadgeText, { color: tone.text }]}>{formatStatus(order.status)}</Text>
            </View>
          </View>

          <Text style={styles.sourceTextWhite}>{formatSource(order.source)}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.medicinePanel}>
            <View style={[styles.medicineIcon, { backgroundColor: tone.soft }]}>
              <Pill size={23} color={tone.background} strokeWidth={2.7} />
            </View>

            <View style={styles.medicineDetails}>
              <Text style={styles.medicineName}>{medicine.name}</Text>
              {medicine.dose ? <Text style={styles.medicineDose}>{medicine.dose}</Text> : null}

              <View style={styles.medicineMetaRow}>
                {medicine.quantity ? (
                  <View style={[styles.quantityBadge, { backgroundColor: tone.soft }]}>
                    <Text style={[styles.quantityText, { color: tone.text }]}>{medicine.quantity}</Text>
                  </View>
                ) : null}

                {medicine.extraItems > 0 ? <Text style={styles.extraItems}>+{medicine.extraItems} more</Text> : null}
              </View>
            </View>
          </View>

          <View style={styles.infoRows}>
            <InfoRow
              icon={<ShoppingBag size={16} color={tone.text} strokeWidth={2.5} />}
              label="Pharmacy"
              value={order.pharmacy?.pharmacyName || "Not assigned"}
              accent={tone}
              isLast={!order.doctor}
            />

            {order.doctor ? (
              <InfoRow
                icon={<Stethoscope size={16} color={tone.text} strokeWidth={2.5} />}
                label="Doctor"
                value={order.doctor.fullName}
                accent={tone}
                isLast
              />
            ) : null}
          </View>

          {verification ? <VerificationCard verification={verification} /> : null}

          {order.statusReason ? (
            <View style={styles.reasonPanel}>
              <AlertCircle size={16} color={DANGER_DARK} strokeWidth={2.5} />
              <Text style={styles.reasonText}>{order.statusReason}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.progressFooter, { borderTopColor: tone.background }]}>
          <View style={styles.progressHeader}>
            <View style={styles.progressTitleRow}>
              <View style={[styles.progressDot, { backgroundColor: tone.background }]} />
              <Text style={[styles.progressLabel, { color: tone.text }]}>Progress</Text>
            </View>

            {latestTimeline ? <Text style={styles.progressTime}>{formatDateTime(latestTimeline.createdAt)}</Text> : null}
          </View>

          <OrderTimeline order={order} tone={tone} />
        </View>
      </View>
    </View>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
  accent,
  isLast,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent: StatusTone;
  isLast?: boolean;
}) => (
  <View style={[styles.infoRow, isLast ? styles.infoRowLast : undefined]}>
    <View style={[styles.infoIcon, { backgroundColor: accent.soft }]}>{icon}</View>

    <View style={styles.infoText}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const VerificationCard = ({
  verification,
}: {
  verification: {
    type: "DOCTOR" | "PHARMACY" | "ATTENTION";
    title: string;
    subtitle: string;
  };
}) => {
  const danger = verification.type === "ATTENTION";

  return (
    <View style={[styles.verificationCard, danger ? styles.verificationDanger : styles.verificationNormal]}>
      <View style={[styles.verificationIcon, danger ? styles.verificationIconDanger : styles.verificationIconNormal]}>
        {danger ? (
          <XCircle size={18} color={DANGER_DARK} strokeWidth={2.6} />
        ) : verification.type === "DOCTOR" ? (
          <ShieldCheck size={18} color={PRIMARY_DARK} strokeWidth={2.6} />
        ) : (
          <FileCheck2 size={18} color={PRIMARY_DARK} strokeWidth={2.6} />
        )}
      </View>

      <View style={styles.verificationText}>
        <Text style={[styles.verificationTitle, danger ? styles.dangerText : undefined]}>{verification.title}</Text>
        <Text style={[styles.verificationSubtitle, danger ? styles.dangerText : undefined]}>{verification.subtitle}</Text>
      </View>
    </View>
  );
};

const OrderTimeline = ({ order, tone }: { order: PatientOrder; tone: StatusTone }) => {
  if (order.timeline.length === 0) {
    return (
      <View style={[styles.currentStatus, { borderColor: tone.background }]}>
        <View style={[styles.currentStatusIcon, { backgroundColor: tone.soft }]}>
          <Clock3 size={16} color={tone.text} strokeWidth={2.5} />
        </View>

        <Text style={[styles.currentStatusText, { color: tone.text }]}>{formatStatus(order.status)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.timeline}>
      {order.timeline.map((step, index) => {
        const isLast = index === order.timeline.length - 1;
        const stepTone = getStatusTone(step.toStatus);

        return (
          <View key={step.id} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineCircle, { backgroundColor: isLast ? stepTone.background : SUCCESS }]}>
                {isLast ? (
                  <Clock3 size={12} color={SURFACE} strokeWidth={2.7} />
                ) : (
                  <CheckCircle2 size={13} color={SURFACE} strokeWidth={2.7} />
                )}
              </View>

              {!isLast ? <View style={styles.timelineLine} /> : null}
            </View>

            <View style={styles.timelineContent}>
              <View style={styles.timelineTitleRow}>
                <Text style={[styles.timelineTitle, isLast ? { color: stepTone.text } : undefined]}>{formatStatus(step.toStatus)}</Text>
                <Text style={styles.timelineDate}>{formatDateTime(step.createdAt)}</Text>
              </View>

              {step.note ? <Text style={styles.timelineNote}>{step.note}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },

  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: TEXT, fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  headerSubtitle: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 2 },
  headerCount: { minWidth: 54, height: 42, borderRadius: 14, backgroundColor: PRIMARY_LIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  headerCountText: { color: PRIMARY_DARK, fontSize: 14, fontWeight: "800", marginLeft: 6 },

  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 2 },

  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  loadingText: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 11 },
  errorIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  centerTitle: { color: TEXT, fontSize: 18, fontWeight: "800", marginTop: 13 },
  centerText: { color: MUTED, fontSize: 11, fontWeight: "500", textAlign: "center", marginTop: 6 },
  retryButton: { minHeight: 44, borderRadius: 13, paddingHorizontal: 18, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 17 },
  retryButtonText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginLeft: 7 },

  overviewCard: { backgroundColor: SURFACE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, flexDirection: "row", alignItems: "center", paddingVertical: 13, marginBottom: 14, ...elevate(1) },
  overviewItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  overviewIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 8 },
  overviewValue: { fontSize: 18, fontWeight: "800" },
  overviewLabel: { color: MUTED, fontSize: 8, fontWeight: "700", marginTop: 1 },
  overviewDivider: { width: StyleSheet.hairlineWidth, height: 38, backgroundColor: BORDER },

  filters: { paddingBottom: 17, paddingRight: 12 },
  filterButton: { height: 38, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", marginRight: 8 },
  filterText: { color: MUTED, fontSize: 10, fontWeight: "700" },
  filterTextSelected: { color: SURFACE },
  filterCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: SOFT, alignItems: "center", justifyContent: "center", marginLeft: 7, paddingHorizontal: 4 },
  filterCountSelected: { backgroundColor: "rgba(255,255,255,0.20)" },
  filterCountText: { color: MUTED, fontSize: 8, fontWeight: "800" },
  filterCountTextSelected: { color: SURFACE },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "800" },
  sectionCount: { color: MUTED, fontSize: 10, fontWeight: "700" },

  emptyCard: { backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, paddingVertical: 30, paddingHorizontal: 20, alignItems: "center" },
  emptyIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontSize: 15, fontWeight: "800", marginTop: 11 },
  emptyText: { color: MUTED, fontSize: 10, fontWeight: "500", marginTop: 4 },

  orderCard: { borderRadius: 20, borderWidth: 1.4, marginBottom: 16, overflow: "hidden", ...elevate(2) },
  statusAccent: { height: 4, width: "100%" },
  orderContent: { paddingHorizontal: 14 },

  headerBand: { marginHorizontal: -14, paddingHorizontal: 15, paddingTop: 14, paddingBottom: 13 },
  orderHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderHeaderText: { flex: 1, paddingRight: 9 },
  orderNumber: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  whiteText: { color: SURFACE },
  orderDateWhite: { color: "rgba(255,255,255,0.78)", fontSize: 9, fontWeight: "600", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.3 },
  statusBadge: { minHeight: 30, borderRadius: 20, paddingHorizontal: 10, backgroundColor: SURFACE, flexDirection: "row", alignItems: "center", ...elevate(1) },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.2 },
  sourceTextWhite: { color: "rgba(255,255,255,0.88)", fontSize: 9, fontWeight: "700", marginTop: 6, textTransform: "uppercase", letterSpacing: 0.4 },

  cardBody: { paddingTop: 13 },

  medicinePanel: { backgroundColor: SURFACE, borderRadius: 15, borderWidth: 1, borderColor: "rgba(17,24,39,0.06)", flexDirection: "row", alignItems: "center", padding: 12, ...elevate(1) },
  medicineIcon: { width: 47, height: 47, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 11 },
  medicineDetails: { flex: 1 },
  medicineName: { color: TEXT, fontSize: 14, fontWeight: "800" },
  medicineDose: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 2 },
  medicineMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 7 },
  quantityBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  quantityText: { fontSize: 8, fontWeight: "800" },
  extraItems: { color: MUTED, fontSize: 8, fontWeight: "700", marginLeft: 7 },

  infoRows: { marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(17,24,39,0.07)", backgroundColor: SURFACE, overflow: "hidden" },
  infoRow: { minHeight: 47, flexDirection: "row", alignItems: "center", paddingHorizontal: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  infoRowLast: { borderBottomWidth: 0 },
  infoIcon: { width: 33, height: 33, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 9 },
  infoText: { flex: 1 },
  infoLabel: { color: MUTED, fontSize: 8, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  infoValue: { color: TEXT, fontSize: 11, fontWeight: "700", marginTop: 2 },

  verificationCard: { borderRadius: 12, padding: 10, paddingLeft: 12, flexDirection: "row", alignItems: "center", marginTop: 10, borderLeftWidth: 3 },
  verificationNormal: { backgroundColor: PRIMARY_LIGHT, borderLeftColor: PRIMARY },
  verificationDanger: { backgroundColor: DANGER_LIGHT, borderLeftColor: DANGER },
  verificationIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 9 },
  verificationIconNormal: { backgroundColor: SURFACE },
  verificationIconDanger: { backgroundColor: SURFACE },
  verificationText: { flex: 1 },
  verificationTitle: { color: PRIMARY_DARK, fontSize: 10, fontWeight: "800" },
  verificationSubtitle: { color: PRIMARY_DARK, fontSize: 9, fontWeight: "500", marginTop: 2 },
  dangerText: { color: DANGER_DARK },

  reasonPanel: { backgroundColor: DANGER_LIGHT, borderRadius: 11, padding: 10, paddingLeft: 12, flexDirection: "row", alignItems: "center", marginTop: 9, borderLeftWidth: 3, borderLeftColor: DANGER },
  reasonText: { flex: 1, color: DANGER_DARK, fontSize: 9, fontWeight: "600", marginLeft: 7 },

  progressFooter: { backgroundColor: SURFACE, marginHorizontal: -14, marginTop: 13, paddingHorizontal: 15, paddingTop: 13, paddingBottom: 15, borderTopWidth: 2 },
  progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  progressTitleRow: { flexDirection: "row", alignItems: "center" },
  progressDot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  progressLabel: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  progressTime: { color: MUTED, fontSize: 8, fontWeight: "600" },

  timeline: { paddingTop: 1 },
  timelineItem: { flexDirection: "row", minHeight: 47 },
  timelineLeft: { width: 27, alignItems: "center" },
  timelineCircle: { width: 23, height: 23, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: SURFACE },
  timelineLine: { width: 2, flex: 1, backgroundColor: "#DCE3F0", marginTop: 2 },
  timelineContent: { flex: 1, paddingLeft: 7, paddingBottom: 10 },
  timelineTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timelineTitle: { color: TEXT, fontSize: 10, fontWeight: "700" },
  timelineDate: { color: MUTED, fontSize: 8, fontWeight: "500" },
  timelineNote: { color: MUTED, fontSize: 8, fontWeight: "500", marginTop: 2 },

  currentStatus: { backgroundColor: SURFACE, borderRadius: 11, borderWidth: 1, padding: 9, flexDirection: "row", alignItems: "center" },
  currentStatusIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 8 },
  currentStatusText: { fontSize: 10, fontWeight: "700" },
});

export default PatientOrdersScreen;