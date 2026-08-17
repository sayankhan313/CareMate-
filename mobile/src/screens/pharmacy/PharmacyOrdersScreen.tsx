import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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
  Repeat2,
  UserRound,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  pharmacyOrdersApi,
  type PharmacyOrderListItem,
  type PharmacyOrderSource,
} from "../../services/pharmacy/pharmacy-orders.api";
import type { RootStackParamList } from "../../types/navigation";

type QueueFilter = "ALL" | "NEW" | "DOCTOR_PRESCRIPTION" | "REFILL_REQUEST" | "PAYMENT_PENDING";

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
const BORDER = "#E4E8F2";
const RIPPLE = "rgba(17,25,54,0.08)";

const PHARMACY = "#15803D";
const PHARMACY_DARK = "#14532D";
const PHARMACY_LIGHT = "#ECFDF3";

const BLUE = "#5B86E5";
const BLUE_DARK = "#315FBA";
const BLUE_LIGHT = "#EEF4FF";

const PURPLE = "#7659D8";
const PURPLE_DARK = "#5636B5";
const PURPLE_LIGHT = "#F1EDFF";

const WARNING = "#F6A545";
const WARNING_DARK = "#9A570D";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : level === 1 ? 0.06 : 0.09,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatus = (status: string) =>
  status
    .toLowerCase()
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getSourceLabel = (source: PharmacyOrderSource) => {
  if (source === "DOCTOR_PRESCRIPTION") return "Doctor prescription";
  if (source === "REFILL_REQUEST") return "Refill request";
  if (source === "PATIENT_SUBMISSION") return "Patient submission";
  return "Manual request";
};

const getStatusTone = (status: PharmacyOrderListItem["status"]) => {
  if (status === "READY" || status === "COLLECTED" || status === "DELIVERED") {
    return { background: PHARMACY_LIGHT, color: PHARMACY_DARK };
  }

  if (status === "RECEIVED" || status === "ACCEPTED" || status === "PREPARING") {
    return { background: WARNING_LIGHT, color: WARNING_DARK };
  }

  if (status === "REJECTED" || status === "CANCELLED" || status === "OUT_OF_STOCK") {
    return { background: DANGER_LIGHT, color: DANGER_DARK };
  }

  return { background: BLUE_LIGHT, color: BLUE_DARK };
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
      background: PHARMACY_LIGHT,
      color: PHARMACY_DARK,
    };
  }

  if (order.payment.status === "NOT_REQUIRED") {
    return {
      label: "Not required",
      background: PHARMACY_LIGHT,
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

const isPaymentAttention = (order: PharmacyOrderListItem) => {
  if (!order.payment) return false;

  return order.payment.status !== "PAID" && order.payment.status !== "NOT_REQUIRED";
};

export const PharmacyOrdersScreen = () => {
  const navigation = useNavigation<PharmacyNavigation>();
  const route = useRoute<RouteProp<PharmacyOrdersRouteList, "PharmacyOrders">>();
  const insets = useSafeAreaInsets();

  const resolveInitialFilter = (): QueueFilter => {
    const title = route.params?.title;

    if (title === "New orders") return "NEW";
    if (title === "Payment pending" || title === "Payments") return "PAYMENT_PENDING";
    if (title === "Pharmacy orders" || title === "Prescription orders") return "ALL";
    if (route.params?.source === "DOCTOR_PRESCRIPTION") return "DOCTOR_PRESCRIPTION";
    if (route.params?.source === "REFILL_REQUEST") return "REFILL_REQUEST";

    return "ALL";
  };

  const [filter, setFilter] = useState<QueueFilter>(resolveInitialFilter);
  const [orders, setOrders] = useState<PharmacyOrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrders = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);

      setErrorMessage("");

      const result = await pharmacyOrdersApi.getOrders({
        limit: 100,
      });

      setOrders(result.orders || []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load pharmacy orders.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFilter(resolveInitialFilter());
      void loadOrders("initial");
    }, [loadOrders, route.params?.source, route.params?.title]),
  );

  const counts = useMemo(
    () => ({
      all: orders.length,
      new: orders.filter(order => order.status === "RECEIVED").length,
      doctor: orders.filter(order => order.source === "DOCTOR_PRESCRIPTION").length,
      refills: orders.filter(order => order.source === "REFILL_REQUEST").length,
      payments: orders.filter(isPaymentAttention).length,
    }),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    if (filter === "ALL") return orders;

    if (filter === "NEW") {
      return orders.filter(order => order.status === "RECEIVED");
    }

    if (filter === "DOCTOR_PRESCRIPTION") {
      return orders.filter(order => order.source === "DOCTOR_PRESCRIPTION");
    }

    if (filter === "REFILL_REQUEST") {
      return orders.filter(order => order.source === "REFILL_REQUEST");
    }

    return orders.filter(isPaymentAttention);
  }, [filter, orders]);

  const changeFilter = (nextFilter: QueueFilter) => {
    setFilter(nextFilter);
  };

  const openOrder = (order: PharmacyOrderListItem) => {
    navigation.navigate("PharmacyOrderDetail", {
      orderId: order.id,
    });
  };

  const screenTitle = route.params?.title || "Pharmacy orders";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <Pressable
            android_ripple={{ color: RIPPLE }}
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.6} />
          </Pressable>

          <View style={styles.appBarText}>
            <Text style={styles.title}>{screenTitle}</Text>
            <Text style={styles.subtitle}>Review, verify and fulfil medicine orders</Text>
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
              <ClipboardList size={24} color={PHARMACY} strokeWidth={2.6} />
            </View>

            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>Current pharmacy queue</Text>

              <Text style={styles.summaryValue}>
                {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
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
              count={counts.all}
              selected={filter === "ALL"}
              onPress={() => changeFilter("ALL")}
            />

            <FilterChip
              label="New"
              count={counts.new}
              selected={filter === "NEW"}
              onPress={() => changeFilter("NEW")}
            />

            <FilterChip
              label="Doctor Rx"
              count={counts.doctor}
              selected={filter === "DOCTOR_PRESCRIPTION"}
              onPress={() => changeFilter("DOCTOR_PRESCRIPTION")}
            />

            <FilterChip
              label="Refills"
              count={counts.refills}
              selected={filter === "REFILL_REQUEST"}
              onPress={() => changeFilter("REFILL_REQUEST")}
            />

            <FilterChip
              label="Payments"
              count={counts.payments}
              selected={filter === "PAYMENT_PENDING"}
              onPress={() => changeFilter("PAYMENT_PENDING")}
            />
          </ScrollView>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={PHARMACY} />

              <Text style={styles.stateTitle}>Loading pharmacy orders</Text>

              <Text style={styles.stateText}>
                Checking prescriptions and refill requests assigned to this pharmacy.
              </Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIcon}>
                <AlertCircle size={23} color={DANGER} strokeWidth={2.6} />
              </View>

              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>Orders unavailable</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>

                <Pressable
                  android_ripple={{ color: RIPPLE }}
                  style={styles.retryButton}
                  onPress={() => void loadOrders("initial")}
                >
                  <RefreshCw size={16} color={SURFACE} strokeWidth={2.5} />
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {!isLoading && !errorMessage && filteredOrders.length === 0 ? (
            <EmptyState filter={filter} />
          ) : null}

          {!isLoading && !errorMessage && filteredOrders.length > 0 ? (
            <View style={styles.orderList}>
              {filteredOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
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
  count,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    android_ripple={{ color: RIPPLE }}
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

    <View
      style={[
        styles.filterCount,
        selected ? styles.filterCountSelected : undefined,
      ]}
    >
      <Text
        style={[
          styles.filterCountText,
          selected ? styles.filterCountTextSelected : undefined,
        ]}
      >
        {count}
      </Text>
    </View>
  </Pressable>
);

const OrderCard = ({
  order,
  onPress,
}: {
  order: PharmacyOrderListItem;
  onPress: () => void;
}) => {
  const statusTone = getStatusTone(order.status);
  const paymentTone = getPaymentTone(order);

  const isDoctorPrescription = order.source === "DOCTOR_PRESCRIPTION";
  const isRefill = order.source === "REFILL_REQUEST";

  const sourceTone = isDoctorPrescription
    ? {
        background: PHARMACY_LIGHT,
        color: PHARMACY_DARK,
      }
    : isRefill
      ? {
          background: PURPLE_LIGHT,
          color: PURPLE_DARK,
        }
      : {
          background: BLUE_LIGHT,
          color: BLUE_DARK,
        };

  return (
    <Pressable
      android_ripple={{ color: RIPPLE }}
      style={styles.orderCard}
      onPress={onPress}
    >
      <View
        style={[
          styles.cardAccent,
          {
            backgroundColor: sourceTone.color,
          },
        ]}
      />

      <View style={styles.cardBody}>
        <View style={styles.orderHeader}>
          <View
            style={[
              styles.sourceIcon,
              {
                backgroundColor: sourceTone.background,
              },
            ]}
          >
            {isDoctorPrescription ? (
              <BadgeCheck size={22} color={sourceTone.color} strokeWidth={2.6} />
            ) : isRefill ? (
              <Repeat2 size={22} color={sourceTone.color} strokeWidth={2.6} />
            ) : (
              <UserRound size={22} color={sourceTone.color} strokeWidth={2.6} />
            )}
          </View>

          <View style={styles.orderHeaderText}>
            <Text style={styles.patientName} numberOfLines={1}>
              {order.patient.fullName}
            </Text>

            <Text
              style={[
                styles.sourceLabel,
                {
                  color: sourceTone.color,
                },
              ]}
            >
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
            <Pill size={20} color={PHARMACY} strokeWidth={2.6} />
          </View>

          <View style={styles.medicineText}>
            <Text style={styles.medicineName} numberOfLines={1}>
              {order.medicineName}
            </Text>

            <Text style={styles.itemCount}>
              {order.itemCount} {order.itemCount === 1 ? "medicine" : "medicines"}
            </Text>
          </View>

          <ChevronRight size={20} color={MUTED} strokeWidth={2.5} />
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
            <CreditCard size={14} color={paymentTone.color} strokeWidth={2.5} />

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
          <View style={styles.doctorRow}>
            <BadgeCheck size={14} color={PHARMACY} strokeWidth={2.5} />

            <Text style={styles.doctorText} numberOfLines={1}>
              {isDoctorPrescription ? "Prescribed by " : "Doctor: "}
              {order.doctor.fullName}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};

const EmptyState = ({
  filter,
}: {
  filter: QueueFilter;
}) => {
  const content =
    filter === "NEW"
      ? {
          title: "No new orders",
          text: "New prescriptions and refill requests will appear here.",
        }
      : filter === "DOCTOR_PRESCRIPTION"
        ? {
            title: "No doctor prescriptions",
            text: "CareMate+ doctor prescriptions routed to this pharmacy will appear here.",
          }
        : filter === "REFILL_REQUEST"
          ? {
              title: "No refill requests",
              text: "Patient medicine refill requests will appear here after they are submitted.",
            }
          : filter === "PAYMENT_PENDING"
            ? {
                title: "No payments need attention",
                text: "Orders requiring payment action will appear here.",
              }
            : {
                title: "No pharmacy orders",
                text: "Doctor prescriptions and patient refill requests will appear here.",
              };

  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <FileText size={27} color={PHARMACY} strokeWidth={2.6} />
      </View>

      <Text style={styles.emptyTitle}>{content.title}</Text>
      <Text style={styles.emptyText}>{content.text}</Text>
    </View>
  );
};

export default PharmacyOrdersScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 13,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 5,
    overflow: "hidden",
  },

  appBarText: {
    flex: 1,
  },

  title: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  subtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
  },

  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
    ...elevate(1),
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: PHARMACY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  summaryText: {
    flex: 1,
  },

  summaryLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
  },

  summaryValue: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },

  liveChip: {
    backgroundColor: PHARMACY_LIGHT,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: PHARMACY,
    marginRight: 5,
  },

  liveText: {
    color: PHARMACY_DARK,
    fontSize: 8,
    fontWeight: "800",
  },

  filterContent: {
    paddingBottom: 14,
  },

  filterChip: {
    minHeight: 39,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    paddingLeft: 13,
    paddingRight: 7,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },

  filterChipSelected: {
    backgroundColor: PHARMACY,
    borderColor: PHARMACY,
  },

  filterText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },

  filterTextSelected: {
    color: SURFACE,
  },

  filterCount: {
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginLeft: 7,
  },

  filterCountSelected: {
    backgroundColor: "rgba(255,255,255,0.20)",
  },

  filterCountText: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "800",
  },

  filterCountTextSelected: {
    color: SURFACE,
  },

  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    ...elevate(1),
  },

  stateTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 11,
  },

  stateText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    textAlign: "center",
    marginTop: 4,
  },

  errorCard: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
  },

  errorIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: DANGER_DARK,
    fontSize: 15,
    fontWeight: "800",
  },

  errorText: {
    color: DANGER_DARK,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 4,
  },

  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: DANGER,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
  },

  retryText: {
    color: SURFACE,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },

  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 26,
    alignItems: "center",
    ...elevate(1),
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor: PHARMACY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5,
  },

  orderList: {
    paddingBottom: 2,
  },

  orderCard: {
    backgroundColor: SURFACE,
    borderRadius: 17,
    marginBottom: 12,
    overflow: "hidden",
    flexDirection: "row",
    ...elevate(1),
  },

  cardAccent: {
    width: 4,
  },

  cardBody: {
    flex: 1,
    padding: 14,
  },

  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  sourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  orderHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  patientName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "800",
  },

  sourceLabel: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 3,
  },

  statusChip: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 8,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "800",
  },

  medicinePanel: {
    backgroundColor: BACKGROUND,
    borderRadius: 13,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  medicineIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: PHARMACY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  medicineText: {
    flex: 1,
    minWidth: 0,
  },

  medicineName: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
  },

  itemCount: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 3,
  },

  orderFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 11,
  },

  paymentChip: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
  },

  paymentText: {
    fontSize: 8,
    fontWeight: "800",
    marginLeft: 5,
  },

  orderDate: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "600",
  },

  doctorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  doctorText: {
    flex: 1,
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginLeft: 6,
  },
});