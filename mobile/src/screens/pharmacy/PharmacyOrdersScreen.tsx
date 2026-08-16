import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Pill,
  RefreshCw,
  UserRound,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  pharmacyOrdersApi,
  type PharmacyOrderListItem,
  type PharmacyOrderSource,
} from "../../services/pharmacy/pharmacy-orders.api";
import type { RootStackParamList } from "../../types/navigation";

type QueueFilter = "ALL" | "DOCTOR_PRESCRIPTION" | "PATIENT_SUBMISSION";

type PharmacyOrdersRouteList = {
  PharmacyOrders:
    | {
        source?: PharmacyOrderSource;
        title?: string;
      }
    | undefined;
};

type PharmacyNavigation = NativeStackNavigationProp<RootStackParamList>;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const RIPPLE = "rgba(17, 25, 54, 0.08)";
const BORDER = "#E4E8F2";

const PHARMACY = "#16A34A";
const PHARMACY_DARK = "#0F6B3A";
const PHARMACY_CONTAINER = "#ECFDF3";

const WARNING = "#F6A545";
const WARNING_DARK = "#A45A08";
const WARNING_LIGHT = "#FFF3E2";

const BLUE = "#5B86E5";
const BLUE_DARK = "#315FBA";
const BLUE_LIGHT = "#EEF4FF";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.07 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: {
    width: 0,
    height: level,
  },
});

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatus = (status: string) => {
  return status
    .toLowerCase()
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getSourceLabel = (source: PharmacyOrderSource) => {
  if (source === "DOCTOR_PRESCRIPTION") return "Doctor prescription";
  if (source === "PATIENT_SUBMISSION") return "Patient submission";
  if (source === "REFILL_REQUEST") return "Refill request";

  return "Manual request";
};

const getStatusTone = (status: PharmacyOrderListItem["status"]) => {
  if (status === "READY" || status === "COLLECTED" || status === "DELIVERED") {
    return {
      background: PHARMACY_CONTAINER,
      color: PHARMACY_DARK,
    };
  }

  if (status === "RECEIVED" || status === "PREPARING" || status === "ACCEPTED") {
    return {
      background: WARNING_LIGHT,
      color: WARNING_DARK,
    };
  }

  if (status === "REJECTED" || status === "CANCELLED" || status === "OUT_OF_STOCK") {
    return {
      background: DANGER_LIGHT,
      color: DANGER_DARK,
    };
  }

  return {
    background: BLUE_LIGHT,
    color: BLUE_DARK,
  };
};

const getPaymentTone = (order: PharmacyOrderListItem) => {
  if (!order.payment) {
    return {
      label: "No payment",
      background: BLUE_LIGHT,
      color: BLUE_DARK,
    };
  }

  if (order.payment.status === "PAID") {
    return {
      label: "Paid",
      background: PHARMACY_CONTAINER,
      color: PHARMACY_DARK,
    };
  }

  if (order.payment.status === "NOT_REQUIRED") {
    return {
      label: "Not required",
      background: PHARMACY_CONTAINER,
      color: PHARMACY_DARK,
    };
  }

  if (order.payment.status === "FAILED") {
    return {
      label: "Payment failed",
      background: DANGER_LIGHT,
      color: DANGER_DARK,
    };
  }

  return {
    label: "Payment pending",
    background: WARNING_LIGHT,
    color: WARNING_DARK,
  };
};

export const PharmacyOrdersScreen = () => {
  const navigation = useNavigation<PharmacyNavigation>();
  const route = useRoute<RouteProp<PharmacyOrdersRouteList, "PharmacyOrders">>();
  const insets = useSafeAreaInsets();

  const initialSource = route.params?.source;

  const initialFilter: QueueFilter =
    initialSource === "DOCTOR_PRESCRIPTION" || initialSource === "PATIENT_SUBMISSION"
      ? initialSource
      : "ALL";

  const [filter, setFilter] = useState<QueueFilter>(initialFilter);
  const [orders, setOrders] = useState<PharmacyOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrders = useCallback(
    async (
      mode: "initial" | "refresh" = "initial",
      selectedFilter = filter
    ) => {
      try {
        if (mode === "initial") setIsLoading(true);
        if (mode === "refresh") setIsRefreshing(true);

        setErrorMessage("");

        const source = selectedFilter === "ALL" ? undefined : selectedFilter;

        const result = await pharmacyOrdersApi.getOrders({
          source,
          limit: 100,
        });

        setOrders(result.orders || []);
        setTotal(result.total || 0);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load pharmacy orders"
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [filter]
  );

  useFocusEffect(
    useCallback(() => {
      void loadOrders("initial");
    }, [loadOrders])
  );

  const changeFilter = (nextFilter: QueueFilter) => {
    if (filter === nextFilter) return;

    setFilter(nextFilter);
    void loadOrders("initial", nextFilter);
  };

  const openOrder = (order: PharmacyOrderListItem) => {
    navigation.navigate("PharmacyOrderDetail", {
      orderId: order.id,
    });
  };

  const screenTitle = route.params?.title || "Prescription orders";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <Pressable android_ripple={{ color: RIPPLE }}
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.6} />
          </Pressable>

          <View style={styles.appBarText}>
            <Text style={styles.title}>{screenTitle}</Text>

            <Text style={styles.subtitle}>
              Review prescriptions routed to your pharmacy
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: Math.max(insets.bottom + 30, 46),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadOrders("refresh")}
              tintColor={PHARMACY}
              colors={[PHARMACY]}
            />
          }
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <ClipboardList size={24} color={PHARMACY} strokeWidth={2.5} />
            </View>

            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>
                Prescription queue
              </Text>

              <Text style={styles.summaryValue}>
                {total} {total === 1 ? "order" : "orders"}
              </Text>
            </View>

            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            <FilterChip
              label="All"
              selected={filter === "ALL"}
              onPress={() => changeFilter("ALL")}
            />

            <FilterChip
              label="Doctor prescriptions"
              selected={filter === "DOCTOR_PRESCRIPTION"}
              onPress={() => changeFilter("DOCTOR_PRESCRIPTION")}
            />

            <FilterChip
              label="Patient submissions"
              selected={filter === "PATIENT_SUBMISSION"}
              onPress={() => changeFilter("PATIENT_SUBMISSION")}
            />
          </ScrollView>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={PHARMACY} />

              <Text style={styles.stateTitle}>
                Loading prescription orders
              </Text>

              <Text style={styles.stateText}>
                Checking orders assigned to this pharmacy.
              </Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIcon}>
                <AlertCircle size={22} color={DANGER} strokeWidth={2.5} />
              </View>

              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>
                  Orders unavailable
                </Text>

                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>

                <Pressable android_ripple={{ color: RIPPLE }}
                  style={styles.retryButton}
                  onPress={() => void loadOrders("initial")}
                >
                  <RefreshCw size={16} color={SURFACE} strokeWidth={2.5} />
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {!isLoading && !errorMessage && orders.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <FileText size={26} color={PHARMACY} strokeWidth={2.5} />
              </View>

              <Text style={styles.emptyTitle}>
                No orders in this queue
              </Text>

              <Text style={styles.emptyText}>
                New doctor prescriptions or patient submissions routed to this
                pharmacy will appear here.
              </Text>
            </View>
          ) : null}

          {!isLoading && !errorMessage && orders.length > 0 ? (
            <View style={styles.orderList}>
              {orders.map((order, index) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isLast={index === orders.length - 1}
                  onPress={() => openOrder(order)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const FilterChip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable android_ripple={{ color: RIPPLE }}
    style={[
      styles.filterChip,
      selected ? styles.filterChipSelected : undefined,
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.filterText,
        selected ? styles.filterTextSelected : undefined,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const OrderCard = ({
  order,
  isLast,
  onPress,
}: {
  order: PharmacyOrderListItem;
  isLast: boolean;
  onPress: () => void;
}) => {
  const statusTone = getStatusTone(order.status);
  const paymentTone = getPaymentTone(order);

  return (
    <Pressable android_ripple={{ color: RIPPLE }}
      style={[styles.orderCard, isLast ? styles.orderCardLast : undefined]}
      onPress={onPress}
    >
      <View style={styles.orderHeader}>
        <View
          style={[
            styles.sourceIcon,
            {
              backgroundColor:
                order.source === "DOCTOR_PRESCRIPTION"
                  ? PHARMACY_CONTAINER
                  : BLUE_LIGHT,
            },
          ]}
        >
          {order.source === "DOCTOR_PRESCRIPTION" ? (
            <BadgeCheck size={21} color={PHARMACY_DARK} strokeWidth={2.5} />
          ) : (
            <UserRound size={21} color={BLUE} strokeWidth={2.5} />
          )}
        </View>

        <View style={styles.orderHeaderText}>
          <Text style={styles.patientName} numberOfLines={1}>
            {order.patient.fullName}
          </Text>

          <Text style={styles.sourceLabel}>
            {getSourceLabel(order.source)}
          </Text>
        </View>

        <View
          style={[
            styles.statusChip,
            {
              backgroundColor: statusTone.background,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: statusTone.color,
              },
            ]}
          >
            {formatStatus(order.status)}
          </Text>
        </View>
      </View>

      <View style={styles.medicinePanel}>
        <View style={styles.medicineIcon}>
          <Pill size={19} color={PHARMACY} strokeWidth={2.5} />
        </View>

        <View style={styles.medicineText}>
          <Text style={styles.medicineName} numberOfLines={1}>
            {order.medicineName}
          </Text>

          <Text style={styles.itemCount}>
            {order.itemCount} {order.itemCount === 1 ? "medicine" : "medicines"}
          </Text>
        </View>

        <ChevronRight size={19} color={MUTED} strokeWidth={2.4} />
      </View>

      <View style={styles.orderFooter}>
        <View
          style={[
            styles.paymentChip,
            {
              backgroundColor: paymentTone.background,
            },
          ]}
        >
          <CreditCard size={13} color={paymentTone.color} strokeWidth={2.4} />

          <Text
            style={[
              styles.paymentText,
              {
                color: paymentTone.color,
              },
            ]}
          >
            {paymentTone.label}
          </Text>
        </View>

        <Text style={styles.orderDate}>
          {formatDate(order.createdAt)}
        </Text>
      </View>

      {order.doctor ? (
        <Text style={styles.doctorText} numberOfLines={1}>
          Prescribed by {order.doctor.fullName}
        </Text>
      ) : null}
    </Pressable>
  );
};

export default PharmacyOrdersScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  appBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 13 },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginRight: 4, overflow: "hidden" },
  appBarText: { flex: 1 },
  title: { color: TEXT, fontSize: 22, fontWeight: "700" },
  subtitle: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 3 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16 },
  summaryCard: { backgroundColor: SURFACE, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 12, ...elevate(2) },
  summaryIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: PHARMACY_CONTAINER, alignItems: "center", justifyContent: "center", marginRight: 11 },
  summaryText: { flex: 1 },
  summaryLabel: { color: MUTED, fontSize: 10, fontWeight: "600" },
  summaryValue: { color: TEXT, fontSize: 17, fontWeight: "700", marginTop: 2 },
  liveChip: { backgroundColor: PHARMACY_CONTAINER, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, flexDirection: "row", alignItems: "center" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PHARMACY, marginRight: 5 },
  liveText: { color: PHARMACY_DARK, fontSize: 9, fontWeight: "700" },
  filterContent: { paddingBottom: 14 },
  filterChip: { minHeight: 38, borderRadius: 11, backgroundColor: SURFACE, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", marginRight: 8, borderWidth: 1, borderColor: BORDER },
  filterChipSelected: { backgroundColor: PHARMACY, borderColor: PHARMACY },
  filterText: { color: MUTED, fontSize: 11, fontWeight: "700" },
  filterTextSelected: { color: SURFACE },
  stateCard: { backgroundColor: SURFACE, borderRadius: 12, padding: 24, alignItems: "center", ...elevate(2) },
  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 11 },
  stateText: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, textAlign: "center", marginTop: 4 },
  errorCard: { backgroundColor: DANGER_LIGHT, borderRadius: 12, padding: 15, flexDirection: "row" },
  errorIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  errorContent: { flex: 1 },
  errorTitle: { color: DANGER_DARK, fontSize: 15, fontWeight: "700" },
  errorText: { color: DANGER_DARK, fontSize: 12, fontWeight: "500", lineHeight: 18, marginTop: 4 },
  retryButton: { alignSelf: "flex-start", backgroundColor: DANGER, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", marginTop: 11 },
  retryText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginLeft: 6 },
  emptyCard: { backgroundColor: SURFACE, borderRadius: 12, padding: 24, alignItems: "center", ...elevate(2) },
  emptyIcon: { width: 52, height: 52, borderRadius: 12, backgroundColor: PHARMACY_CONTAINER, alignItems: "center", justifyContent: "center", marginBottom: 11 },
  emptyTitle: { color: TEXT, fontSize: 15, fontWeight: "700" },
  emptyText: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, textAlign: "center", marginTop: 5 },
  orderList: { backgroundColor: SURFACE, borderRadius: 12, overflow: "hidden", ...elevate(1) },
  orderCard: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  orderCardLast: { borderBottomWidth: 0 },
  orderHeader: { flexDirection: "row", alignItems: "center" },
  sourceIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10 },
  orderHeaderText: { flex: 1, minWidth: 0 },
  patientName: { color: TEXT, fontSize: 14, fontWeight: "700" },
  sourceLabel: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 3 },
  statusChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginLeft: 8 },
  statusText: { fontSize: 9, fontWeight: "700" },
  medicinePanel: { backgroundColor: BACKGROUND, borderRadius: 13, padding: 11, flexDirection: "row", alignItems: "center", marginTop: 12 },
  medicineIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: PHARMACY_CONTAINER, alignItems: "center", justifyContent: "center", marginRight: 9 },
  medicineText: { flex: 1 },
  medicineName: { color: TEXT, fontSize: 13, fontWeight: "700" },
  itemCount: { color: MUTED, fontSize: 10, fontWeight: "500", marginTop: 3 },
  orderFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 11 },
  paymentChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, flexDirection: "row", alignItems: "center" },
  paymentText: { fontSize: 9, fontWeight: "700", marginLeft: 4 },
  orderDate: { color: MUTED, fontSize: 9, fontWeight: "500" },
  doctorText: { color: MUTED, fontSize: 10, fontWeight: "500", marginTop: 9 },
});