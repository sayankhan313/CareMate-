import { useCallback, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  Clock3,
  CreditCard,
  FileCheck2,
  FileText,
  PackageCheck,
  Pill,
  RefreshCw,
  Repeat2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  pharmacyDashboardApi,
  type PharmacyDashboardData,
} from "../../services/pharmacy/pharmacy-dashboard.api";
import type { PharmacyOrderListItem } from "../../services/pharmacy/pharmacy-orders.api";
import type { PharmacyTabParamList, RootStackParamList } from "../../types/navigation";

type Props = BottomTabScreenProps<PharmacyTabParamList, "Home">;

type PharmacyQuickAction = {
  key: string;
  title: string;
  icon: ReactNode;
  badgeCount?: number;
  onPress: () => void;
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const RIPPLE = "rgba(17,25,54,0.08)";

const PHARMACY = "#15803D";
const PHARMACY_SECONDARY = "#22C55E";
const PHARMACY_DARK = "#14532D";
const PHARMACY_LIGHT = "#ECFDF3";

const BLUE = "#5B86E5";
const BLUE_DARK = "#315FBA";
const BLUE_LIGHT = "#EEF4FF";

const WARNING = "#F6A545";
const WARNING_DARK = "#9A570D";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";
const SUCCESS_LIGHT = "#EAF8F2";

const elevate = (level: 1 | 2 | 3 = 2) => ({
  elevation: level === 1 ? 2 : level === 2 ? 4 : 7,
  shadowColor: "#172033",
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
  shadowOpacity: Platform.OS === "android" ? 0 : level === 1 ? 0.06 : 0.1,
  shadowRadius: level === 1 ? 4 : 9,
});

const getGreetingText = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase()).join("");
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatus = (status: PharmacyOrderListItem["status"]) =>
  status
    .toLowerCase()
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getSourceLabel = (source: PharmacyOrderListItem["source"]) => {
  if (source === "DOCTOR_PRESCRIPTION") return "Doctor prescription";
  if (source === "REFILL_REQUEST") return "Refill request";
  if (source === "PATIENT_SUBMISSION") return "Patient submission";
  return "Manual request";
};

const getStatusTone = (status: PharmacyOrderListItem["status"]) => {
  if (status === "READY" || status === "COLLECTED" || status === "DELIVERED") {
    return { background: SUCCESS_LIGHT, text: "#167A58" };
  }

  if (status === "RECEIVED" || status === "ACCEPTED" || status === "PREPARING") {
    return { background: WARNING_LIGHT, text: WARNING_DARK };
  }

  if (status === "REJECTED" || status === "CANCELLED" || status === "OUT_OF_STOCK") {
    return { background: DANGER_LIGHT, text: "#B42318" };
  }

  return { background: BLUE_LIGHT, text: BLUE_DARK };
};

export const PharmacyDashboardScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();

  const [dashboard, setDashboard] = useState<PharmacyDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);

      setErrorMessage("");
      const result = await pharmacyDashboardApi.getDashboard();
      setDashboard(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load pharmacy dashboard.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard("initial");
    }, [loadDashboard]),
  );

  const getRootNavigation = () =>
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  const openNotifications = () => {
    const rootNavigation = getRootNavigation();
    if (!rootNavigation) return;

    rootNavigation.navigate("Notifications");
  };

  const openProfile = () => {
    const rootNavigation = getRootNavigation();
    if (!rootNavigation) return;

    rootNavigation.navigate("PharmacyProfile");
  };

  const openNewOrders = () => {
    navigation.navigate("Orders", { title: "New orders" });
  };

  const openDoctorPrescriptions = () => {
    navigation.navigate("Orders", {
      source: "DOCTOR_PRESCRIPTION",
      title: "Doctor prescriptions",
    });
  };

  const openRefillRequests = () => {
    navigation.navigate("Orders", {
      source: "REFILL_REQUEST",
      title: "Medicine refill requests",
    });
  };

  const openPayments = () => {
    navigation.navigate("Orders", { title: "Payment pending" });
  };

  const openReviews = () => {
    navigation.navigate("Reviews", { status: "PENDING" });
  };

  const openInventory = () => {
    navigation.navigate("Inventory");
  };

  const openAllOrders = () => {
    navigation.navigate("Orders", { title: "Pharmacy orders" });
  };

  const openOrderDetail = (order: PharmacyOrderListItem) => {
    const rootNavigation = getRootNavigation();
    if (!rootNavigation) return;

    rootNavigation.navigate("PharmacyOrderDetail", { orderId: order.id });
  };

  const pharmacyName =
    dashboard?.pharmacy.pharmacyName ||
    route.params?.user?.fullName ||
    "Pharmacy";

  const pharmacyLocation =
    dashboard?.pharmacy.city ||
    "Pharmacy workspace";

  const initials = getInitials(pharmacyName);

  const counts =
    dashboard?.counts || {
      newOrders: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      doctorPrescriptions: 0,
      refillRequests: 0,
      patientSubmissions: 0,
      paymentPending: 0,
      exemptionPending: 0,
    };

  const quickActions: PharmacyQuickAction[] = [
    {
      key: "new-orders",
      title: "New Orders",
      icon: <ShoppingBag size={23} color={PHARMACY} strokeWidth={2.6} />,
      badgeCount: counts.newOrders,
      onPress: openNewOrders,
    },
    {
      key: "doctor-rx",
      title: "Doctor Rx",
      icon: <BadgeCheck size={23} color={PHARMACY} strokeWidth={2.6} />,
      badgeCount: counts.doctorPrescriptions,
      onPress: openDoctorPrescriptions,
    },
    {
      key: "refills",
      title: "Refills",
      icon: <Repeat2 size={23} color={PHARMACY} strokeWidth={2.6} />,
      badgeCount: counts.refillRequests,
      onPress: openRefillRequests,
    },
    {
      key: "payments",
      title: "Payments",
      icon: <CreditCard size={23} color={WARNING} strokeWidth={2.6} />,
      badgeCount: counts.paymentPending,
      onPress: openPayments,
    },
    {
      key: "exemptions",
      title: "Exemptions",
      icon: <FileCheck2 size={23} color={PHARMACY} strokeWidth={2.6} />,
      badgeCount: counts.exemptionPending,
      onPress: openReviews,
    },
    {
      key: "inventory",
      title: "Inventory",
      icon: <Pill size={23} color={PHARMACY} strokeWidth={2.6} />,
      onPress: openInventory,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreetingText()}</Text>

            <Text style={styles.pharmacyName} numberOfLines={1}>
              {pharmacyName}
            </Text>

            <Text style={styles.headerSubtitle}>
              {pharmacyLocation}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              android_ripple={{ color: RIPPLE }}
              style={styles.notificationButton}
              onPress={openNotifications}
            >
              <Bell size={21} color={TEXT} strokeWidth={2.6} />
            </Pressable>

            <Pressable
              android_ripple={{ color: RIPPLE }}
              style={styles.profileButton}
              onPress={openProfile}
            >
              <Text style={styles.profileInitials}>{initials}</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 24, 38) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadDashboard("refresh")}
              tintColor={PHARMACY}
              colors={[PHARMACY]}
            />
          }
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={PHARMACY} />
              <Text style={styles.stateText}>
                Loading pharmacy dashboard...
              </Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIcon}>
                <RefreshCw size={25} color={DANGER} strokeWidth={2.6} />
              </View>

              <Text style={styles.errorTitle}>
                Unable to load dashboard
              </Text>

              <Text style={styles.errorText}>{errorMessage}</Text>

              <Pressable
                android_ripple={{ color: RIPPLE }}
                style={styles.retryButton}
                onPress={() => void loadDashboard("initial")}
              >
                <RefreshCw size={17} color={SURFACE} strokeWidth={2.5} />
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {!isLoading && !errorMessage && dashboard ? (
            <>
              <LinearGradient
                colors={[PHARMACY, PHARMACY_SECONDARY]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroTopRow}>
                  <View style={styles.heroIcon}>
                    <Store size={26} color={PHARMACY} strokeWidth={2.7} />
                  </View>

                  <View style={styles.heroBadge}>
                    <ShieldCheck size={14} color={SURFACE} strokeWidth={2.5} />
                    <Text style={styles.heroBadgeText}>
                      Verified Workspace
                    </Text>
                  </View>
                </View>

                <Text style={styles.heroTitle}>
                  Pharmacy Dashboard
                </Text>

                <Text style={styles.heroDescription}>
                  Review prescriptions, verify requests and manage medicine fulfilment.
                </Text>

                <View style={styles.heroStats}>
                  <HeroStat value={counts.newOrders} label="New orders" />

                  <View style={styles.heroDivider} />

                  <HeroStat value={counts.preparing} label="Preparing" />

                  <View style={styles.heroDivider} />

                  <HeroStat value={counts.ready} label="Ready" />
                </View>
              </LinearGradient>

              <FlatList
                horizontal
                data={quickActions}
                keyExtractor={item => item.key}
                renderItem={({ item }) => (
                  <QuickAction
                    title={item.title}
                    icon={item.icon}
                    badgeCount={item.badgeCount}
                    onPress={item.onPress}
                  />
                )}
                ItemSeparatorComponent={() => (
                  <View style={styles.quickActionSeparator} />
                )}
                contentContainerStyle={styles.quickActionsContent}
                style={styles.quickActionsList}
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
              />

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Recent Orders
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    Latest prescriptions and refill requests
                  </Text>
                </View>

                <Pressable
                  android_ripple={{ color: RIPPLE }}
                  onPress={openAllOrders}
                >
                  <Text style={styles.sectionLink}>View all</Text>
                </Pressable>
              </View>

              {dashboard.recentOrders.length > 0 ? (
                <View style={styles.orderStack}>
                  {dashboard.recentOrders.map((order, index) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      isLast={index === dashboard.recentOrders.length - 1}
                      onPress={() => openOrderDetail(order)}
                    />
                  ))}
                </View>
              ) : (
                <EmptyOrders onPress={openAllOrders} />
              )}

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Fulfilment
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    Current pharmacy order progress
                  </Text>
                </View>
              </View>

              <View style={styles.fulfilmentPanel}>
                <FulfilmentRow
                  icon={
                    <Clock3
                      size={20}
                      color={WARNING_DARK}
                      strokeWidth={2.5}
                    />
                  }
                  iconBackground={WARNING_LIGHT}
                  title="Preparing"
                  subtitle="Orders currently being prepared"
                  value={counts.preparing}
                  onPress={openAllOrders}
                />

                <View style={styles.rowDivider} />

                <FulfilmentRow
                  icon={
                    <Truck
                      size={20}
                      color={BLUE_DARK}
                      strokeWidth={2.5}
                    />
                  }
                  iconBackground={BLUE_LIGHT}
                  title="Ready"
                  subtitle="Ready for collection or delivery"
                  value={counts.ready}
                  onPress={openAllOrders}
                />

                <View style={styles.rowDivider} />

                <FulfilmentRow
                  icon={
                    <PackageCheck
                      size={20}
                      color="#167A58"
                      strokeWidth={2.5}
                    />
                  }
                  iconBackground={SUCCESS_LIGHT}
                  title="Completed"
                  subtitle="Collected or delivered orders"
                  value={counts.completed}
                  onPress={openAllOrders}
                />
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const HeroStat = ({ value, label }: { value: number; label: string }) => (
  <View style={styles.heroStat}>
    <Text style={styles.heroStatValue}>{value}</Text>
    <Text style={styles.heroStatLabel}>{label}</Text>
  </View>
);

const QuickAction = ({
  title,
  icon,
  badgeCount,
  onPress,
}: {
  title: string;
  icon: ReactNode;
  badgeCount?: number;
  onPress: () => void;
}) => (
  <Pressable
    android_ripple={{ color: RIPPLE }}
    style={styles.quickAction}
    onPress={onPress}
  >
    <View style={styles.quickActionIcon}>
      {icon}

      {badgeCount !== undefined && badgeCount > 0 ? (
        <View style={styles.quickActionBadge}>
          <Text style={styles.quickActionBadgeText}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </Text>
        </View>
      ) : null}
    </View>

    <Text style={styles.quickActionText} numberOfLines={1}>
      {title}
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
  const isDoctorPrescription =
    order.source === "DOCTOR_PRESCRIPTION";

  return (
    <Pressable
      android_ripple={{ color: RIPPLE }}
      style={[
        styles.orderCard,
        isLast ? styles.orderCardLast : undefined,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.orderIcon,
          isDoctorPrescription
            ? styles.doctorOrderIcon
            : styles.patientOrderIcon,
        ]}
      >
        {isDoctorPrescription ? (
          <BadgeCheck
            size={22}
            color={PHARMACY}
            strokeWidth={2.6}
          />
        ) : (
          <FileText
            size={22}
            color={BLUE}
            strokeWidth={2.6}
          />
        )}
      </View>

      <View style={styles.orderContent}>
        <Text style={styles.orderPatient} numberOfLines={1}>
          {order.patient.fullName}
        </Text>

        <Text style={styles.orderMedicine} numberOfLines={1}>
          {order.medicineName}
        </Text>

        <Text style={styles.orderMeta} numberOfLines={1}>
          {getSourceLabel(order.source)} · {formatDateTime(order.createdAt)}
        </Text>
      </View>

      <View style={styles.orderRight}>
        <View
          style={[
            styles.statusChip,
            { backgroundColor: statusTone.background },
          ]}
        >
          <Text
            style={[
              styles.statusChipText,
              { color: statusTone.text },
            ]}
          >
            {formatStatus(order.status)}
          </Text>
        </View>

        <ChevronRight
          size={18}
          color={MUTED}
          strokeWidth={2.5}
        />
      </View>
    </Pressable>
  );
};

const FulfilmentRow = ({
  icon,
  iconBackground,
  title,
  subtitle,
  value,
  onPress,
}: {
  icon: ReactNode;
  iconBackground: string;
  title: string;
  subtitle: string;
  value: number;
  onPress: () => void;
}) => (
  <Pressable
    android_ripple={{ color: RIPPLE }}
    style={styles.fulfilmentRow}
    onPress={onPress}
  >
    <View
      style={[
        styles.fulfilmentIcon,
        { backgroundColor: iconBackground },
      ]}
    >
      {icon}
    </View>

    <View style={styles.fulfilmentText}>
      <Text style={styles.fulfilmentTitle}>{title}</Text>
      <Text style={styles.fulfilmentSubtitle}>{subtitle}</Text>
    </View>

    <View style={styles.fulfilmentValue}>
      <Text style={styles.fulfilmentValueText}>{value}</Text>
    </View>

    <ChevronRight
      size={18}
      color={MUTED}
      strokeWidth={2.5}
    />
  </Pressable>
);

const EmptyOrders = ({ onPress }: { onPress: () => void }) => (
  <Pressable
    android_ripple={{ color: RIPPLE }}
    style={styles.emptyCard}
    onPress={onPress}
  >
    <View style={styles.emptyIcon}>
      <PackageCheck
        size={25}
        color={PHARMACY}
        strokeWidth={2.5}
      />
    </View>

    <Text style={styles.emptyTitle}>
      No pharmacy orders yet
    </Text>

    <Text style={styles.emptyText}>
      Doctor prescriptions and patient refill requests routed to this pharmacy will appear here.
    </Text>
  </Pressable>
);

export default PharmacyDashboardScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },

  greeting: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },

  pharmacyName: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginTop: 2,
  },

  headerSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    overflow: "hidden",
    ...elevate(1),
  },

  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PHARMACY,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...elevate(1),
  },

  profileInitials: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "800",
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    marginTop: 12,
    ...elevate(1),
  },

  stateText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
  },

  errorCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    marginTop: 12,
    ...elevate(1),
  },

  errorIcon: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  errorTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },

  errorText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },

  retryButton: {
    backgroundColor: PHARMACY,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },

  retryText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },

  heroCard: {
    borderRadius: 16,
    padding: 18,
    overflow: "hidden",
    ...elevate(2),
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },

  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  heroBadgeText: {
    color: SURFACE,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },

  heroTitle: {
    color: SURFACE,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 18,
  },

  heroDescription: {
    color: "#E5FFEC",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 6,
  },

  heroStats: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 13,
  },

  heroStat: {
    flex: 1,
    alignItems: "center",
  },

  heroStatValue: {
    color: SURFACE,
    fontSize: 21,
    fontWeight: "700",
  },

  heroStatLabel: {
    color: "#E5FFEC",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },

  heroDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  quickActionsList: {
    marginTop: 12,
    marginHorizontal: -16,
    overflow: "visible",
  },

  quickActionsContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },

  quickActionSeparator: {
    width: 10,
  },

  quickAction: {
    width: 76,
    alignItems: "center",
    paddingTop: 2,
    overflow: "visible",
  },

  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: PHARMACY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "visible",
  },

  quickActionBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: DANGER,
    borderWidth: 2,
    borderColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    zIndex: 20,
    elevation: 20,
  },

  quickActionBadgeText: {
    color: SURFACE,
    fontSize: 9,
    fontWeight: "800",
  },

  quickActionText: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 10,
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },

  sectionLink: {
    color: PHARMACY,
    fontSize: 13,
    fontWeight: "700",
  },

  orderStack: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    overflow: "hidden",
    ...elevate(1),
  },

  orderCard: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },

  orderCardLast: {
    borderBottomWidth: 0,
  },

  orderIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  doctorOrderIcon: {
    backgroundColor: PHARMACY_LIGHT,
  },

  patientOrderIcon: {
    backgroundColor: BLUE_LIGHT,
  },

  orderContent: {
    flex: 1,
    minWidth: 0,
  },

  orderPatient: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },

  orderMedicine: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },

  orderMeta: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },

  orderRight: {
    alignItems: "flex-end",
    marginLeft: 8,
  },

  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 7,
  },

  statusChipText: {
    fontSize: 9,
    fontWeight: "700",
  },

  fulfilmentPanel: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingHorizontal: 14,
    ...elevate(1),
  },

  fulfilmentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
  },

  fulfilmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  fulfilmentText: {
    flex: 1,
  },

  fulfilmentTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },

  fulfilmentSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },

  fulfilmentValue: {
    minWidth: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: PHARMACY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  fulfilmentValueText: {
    color: PHARMACY_DARK,
    fontSize: 11,
    fontWeight: "700",
  },

  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginLeft: 56,
  },

  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 24,
    alignItems: "center",
    ...elevate(1),
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: PHARMACY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  emptyText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
  },
});