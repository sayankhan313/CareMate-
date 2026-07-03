import { useCallback, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  type CompositeScreenProps,
} from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import {
  Activity,
  AlertCircle,
  Bell,
  Camera,
  Droplet,
  HeartPulse,
  Package,
  Pill,
  Plus,
  RefreshCw,
  ShieldAlert,
  UserRound,
  Video,
} from "lucide-react-native";

import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../../services/tokenStorage";
import type {
  PatientTabParamList,
  RootStackParamList,
} from "../../types/navigation";

type PatientDashboardScreenProps = CompositeScreenProps<
  BottomTabScreenProps<PatientTabParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;

type DashboardStatus = "STABLE" | "WARNING" | "CRITICAL" | "NO_DATA";

type MedicineStatus = "PENDING" | "TAKEN" | "MISSED" | "SNOOZED";

type DashboardMedicine = {
  medicineId: string;
  reminderId: string;
  name: string;
  dose: string;
  instructions: string | null;
  timeOfDay: string;
  scheduledFor: string;
  originalScheduledFor: string;
  status: MedicineStatus;
  takenAt: string | null;
  snoozedUntil: string | null;
};

type NextMedicineGroup = {
  timeOfDay: string;
  scheduledFor: string;
  count: number;
  medicines: DashboardMedicine[];
};

type DashboardData = {
  patient: {
    id: string;
    fullName: string;
    firstName: string;
    email: string;
  };
  healthStatus: {
    status: DashboardStatus;
    label: string;
    heartRate: number | null;
    spo2: number | null;
    bloodPressure: string | null;
    bpSystolic: number | null;
    bpDiastolic: number | null;
    glucose: number | null;
    temperature: number | null;
    source: "HEALTH_CONNECT" | "SIMULATED" | "MANUAL" | null;
    deviceSource: string | null;
    recordedAt: string | null;
  };
  nextMedicineGroup: NextMedicineGroup | null;
  latestDoctorNote: {
    id: string;
    note: string;
    createdAt: string;
  } | null;
  medicineOrder: {
    id: string;
    status: string;
    steps: {
      received: boolean;
      preparing: boolean;
      ready: boolean;
    };
    updatedAt: string;
  } | null;
};

type DashboardApiResponse = {
  success: boolean;
  message: string;
  data: DashboardData;
};

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") {
    return result.message;
  }

  if (Array.isArray(result?.message)) {
    return result.message[0]?.message || "Unable to load dashboard.";
  }

  if (Array.isArray(result?.errors)) {
    return result.errors[0]?.message || "Unable to load dashboard.";
  }

  return "Unable to load dashboard.";
};

const getGreetingText = () => {
  const currentHour = new Date().getHours();

  if (currentHour < 12) {
    return "Good morning";
  }

  if (currentHour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
};

const getStatusTheme = (status: DashboardStatus) => {
  if (status === "STABLE") {
    return {
      cardBackground: "#ECFDF5",
      cardBorder: "#86EFAC",
      badgeBackground: "#DCFCE7",
      badgeText: "#15803D",
      sourceBackground: "#BBF7D0",
      sourceText: "#166534",
      shadowColor: "#22C55E",
    };
  }

  if (status === "WARNING") {
    return {
      cardBackground: "#FFF7ED",
      cardBorder: "#FDBA74",
      badgeBackground: "#FFEDD5",
      badgeText: "#C2410C",
      sourceBackground: "#FED7AA",
      sourceText: "#9A3412",
      shadowColor: "#F97316",
    };
  }

  if (status === "CRITICAL") {
    return {
      cardBackground: "#FEF2F2",
      cardBorder: "#FCA5A5",
      badgeBackground: "#FEE2E2",
      badgeText: "#B91C1C",
      sourceBackground: "#FECACA",
      sourceText: "#991B1B",
      shadowColor: "#EF4444",
    };
  }

  return {
    cardBackground: "#EFF6FF",
    cardBorder: "#BFDBFE",
    badgeBackground: "#DBEAFE",
    badgeText: "#1D4ED8",
    sourceBackground: "#DBEAFE",
    sourceText: "#1E40AF",
    shadowColor: "#3B82F6",
  };
};

const formatTime = (value?: string | null) => {
  if (!value) {
    return "Not scheduled";
  }

  const parsedDate = new Date(value);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const date = new Date();

  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatSourceLabel = (source: DashboardData["healthStatus"]["source"]) => {
  if (source === "HEALTH_CONNECT") {
    return "Health Connect";
  }

  if (source === "SIMULATED") {
    return "Simulator";
  }

  if (source === "MANUAL") {
    return "Manual";
  }

  return "No source";
};

const formatOrderStatus = (status?: string | null) => {
  if (!status) {
    return "No active order";
  }

  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const PatientDashboardScreen = ({
  navigation,
  route,
}: PatientDashboardScreenProps) => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resetToLogin = useCallback(async () => {
    await tokenStorage.removeToken();

    const rootNavigation =
      navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

    rootNavigation?.reset({
      index: 0,
      routes: [
        {
          name: "Login",
        },
      ],
    });
  }, [navigation]);

  const loadDashboard = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const token = await tokenStorage.getToken();

        if (!token) {
          await resetToLogin();
          return;
        }

        const response = await fetch(`${API_BASE_URL}/patient/dashboard`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        let result: DashboardApiResponse | any = {};

        try {
          result = await response.json();
        } catch (error) {
          result = {};
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(result));
        }

        setDashboard(result.data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load dashboard.";

        setErrorMessage(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [resetToLogin]
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboard("initial");
    }, [loadDashboard])
  );

  const openAddMedicineScreen = () => {
    const rootNavigation =
      navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

    rootNavigation?.navigate("AddMedicine");
  };

  const openMedicinesScreen = () => {
    navigation.navigate("Medicines");
  };

  const openVitalsScreen = () => {
    navigation.navigate("Vitals");
  };

  const openConsultationsScreen = () => {
    navigation.navigate("Consultations");
  };

  const openOrdersScreen = () => {
    navigation.navigate("PatientOrders");
  };

  const showComingSoon = (featureName: string) => {
    Alert.alert(
      "Coming soon",
      `${featureName} will be connected in the next patient module step.`
    );
  };

  const fallbackName = route.params?.user?.fullName?.split(" ")[0] || "Patient";
  const patientFirstName = dashboard?.patient.firstName || fallbackName;
  const patientInitial = patientFirstName.charAt(0).toUpperCase();

  const healthStatus = dashboard?.healthStatus;
  const status = healthStatus?.status || "NO_DATA";
  const statusTheme = getStatusTheme(status);

  const nextMedicineGroup = dashboard?.nextMedicineGroup || null;
  const firstMedicine = nextMedicineGroup?.medicines[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor="#2563EB" barStyle="light-content" />

      <View style={styles.screen}>
        <LinearGradient
          colors={["#3B82F6", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {getGreetingText()}, {patientFirstName}
            </Text>
            <Text style={styles.headerSubtitle}>
              Your health summary for today
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.bellButton}
              activeOpacity={0.8}
              onPress={() => showComingSoon("Notifications")}
            >
              <Bell size={20} color="#FFFFFF" strokeWidth={2.4} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <View style={styles.profileCircle}>
              {patientInitial ? (
                <Text style={styles.profileInitial}>{patientInitial}</Text>
              ) : (
                <UserRound size={20} color="#2563EB" />
              )}
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadDashboard("refresh")}
            />
          }
        >
          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#2563EB" />
              <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <AlertCircle size={24} color="#DC2626" />
              <Text style={styles.errorTitle}>Dashboard unavailable</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                activeOpacity={0.85}
                onPress={() => loadDashboard("initial")}
              >
                <RefreshCw size={18} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <View
                style={[
                  styles.healthCard,
                  {
                    backgroundColor: statusTheme.cardBackground,
                    borderColor: statusTheme.cardBorder,
                    shadowColor: statusTheme.shadowColor,
                  },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Health Status</Text>

                  <View
                    style={[
                      styles.sourcePill,
                      {
                        backgroundColor: statusTheme.sourceBackground,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourcePillText,
                        {
                          color: statusTheme.sourceText,
                        },
                      ]}
                    >
                      {formatSourceLabel(healthStatus?.source || null)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: statusTheme.badgeBackground,
                    },
                  ]}
                >
                  <HeartPulse
                    size={20}
                    color={statusTheme.badgeText}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color: statusTheme.badgeText,
                      },
                    ]}
                  >
                    {healthStatus?.label || "No Data"}
                  </Text>
                </View>

                <View style={styles.vitalsRow}>
                  <VitalBox
                    icon={<HeartPulse size={22} color="#DC2626" />}
                    label="Heart Rate"
                    value={
                      healthStatus?.heartRate !== null &&
                      healthStatus?.heartRate !== undefined
                        ? `${healthStatus.heartRate}`
                        : "--"
                    }
                    unit="bpm"
                  />

                  <VitalBox
                    icon={<Activity size={22} color="#2563EB" />}
                    label="SpO2"
                    value={
                      healthStatus?.spo2 !== null &&
                      healthStatus?.spo2 !== undefined
                        ? `${healthStatus.spo2}`
                        : "--"
                    }
                    unit="%"
                  />

                  <VitalBox
                    icon={<Droplet size={22} color="#9333EA" />}
                    label="BP"
                    value={healthStatus?.bloodPressure || "--/--"}
                    unit="mmHg"
                  />
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {nextMedicineGroup && nextMedicineGroup.count > 1
                    ? "Next Medicines"
                    : "Next Medicine"}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={openMedicinesScreen}
                >
                  <Text style={styles.sectionLink}>View all</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                {nextMedicineGroup && firstMedicine ? (
                  <>
                    <View style={styles.medicineRow}>
                      <View style={styles.medicineIconCircle}>
                        <Pill size={25} color="#2563EB" strokeWidth={2.5} />
                      </View>

                      <View style={styles.medicineTextBlock}>
                        <Text style={styles.medicineName}>
                          {nextMedicineGroup.count > 1
                            ? `${nextMedicineGroup.count} medicines due`
                            : `${firstMedicine.name} ${firstMedicine.dose}`}
                        </Text>

                        <Text style={styles.medicineMeta}>
                          {formatTime(nextMedicineGroup.scheduledFor)}
                          {firstMedicine.instructions
                            ? ` · ${firstMedicine.instructions}`
                            : ""}
                        </Text>
                      </View>
                    </View>

                    {nextMedicineGroup.count > 1 ? (
                      <View style={styles.groupMedicineList}>
                        {nextMedicineGroup.medicines
                          .slice(0, 3)
                          .map((medicine) => (
                            <View
                              key={`${medicine.medicineId}-${medicine.reminderId}`}
                              style={styles.groupMedicineItem}
                            >
                              <Text style={styles.groupMedicineName}>
                                {medicine.name}
                              </Text>
                              <Text style={styles.groupMedicineDose}>
                                {medicine.dose}
                              </Text>
                            </View>
                          ))}
                      </View>
                    ) : null}

                    {nextMedicineGroup.count === 1 ? (
                      <View style={styles.medicineButtonRow}>
                        <TouchableOpacity
                          style={styles.takenButton}
                          activeOpacity={0.85}
                          onPress={openMedicinesScreen}
                        >
                          <Text style={styles.takenButtonText}>Taken</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.snoozeButton}
                          activeOpacity={0.85}
                          onPress={openMedicinesScreen}
                        >
                          <Text style={styles.snoozeButtonText}>Snooze</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.viewMedicinesButton}
                        activeOpacity={0.85}
                        onPress={openMedicinesScreen}
                      >
                        <Text style={styles.viewMedicinesButtonText}>
                          View Medicines
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyMedicineBlock}>
                    <Pill size={30} color="#94A3B8" strokeWidth={2.4} />
                    <Text style={styles.emptyMedicineTitle}>
                      No upcoming medicine
                    </Text>
                    <Text style={styles.emptyMedicineText}>
                      Add a medicine reminder to see your next dose here.
                    </Text>

                    <TouchableOpacity
                      style={styles.viewMedicinesButton}
                      activeOpacity={0.85}
                      onPress={openAddMedicineScreen}
                    >
                      <Text style={styles.viewMedicinesButtonText}>
                        Add Medicine
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
              </View>

              <View style={styles.quickGrid}>
                <QuickAction
                  title="Scan Medicine"
                  icon={<Camera size={24} color="#2563EB" />}
                  iconBackground="#EFF6FF"
                  onPress={() => showComingSoon("Medicine scanner")}
                />

                <QuickAction
                  title="Add Medicine"
                  icon={<Plus size={24} color="#16A34A" />}
                  iconBackground="#F0FDF4"
                  onPress={openAddMedicineScreen}
                />

                <QuickAction
                  title="Book Consultation"
                  icon={<Video size={24} color="#9333EA" />}
                  iconBackground="#FAF5FF"
                  onPress={openConsultationsScreen}
                />

                <QuickAction
                  title="Safety Response"
                  icon={<ShieldAlert size={24} color="#DC2626" />}
                  iconBackground="#FEF2F2"
                  onPress={() => showComingSoon("Safety response")}
                />
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Latest Doctor Note</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.doctorNoteText}>
                  {dashboard?.latestDoctorNote?.note ||
                    "Your latest doctor note will appear here after a consultation."}
                </Text>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Medicine Order</Text>

                <TouchableOpacity activeOpacity={0.85} onPress={openOrdersScreen}>
                  <Text style={styles.sectionLink}>Orders</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.orderTitleBlock}>
                    <Package size={22} color="#2563EB" />
                    <Text style={styles.orderTitle}>
                      {formatOrderStatus(dashboard?.medicineOrder?.status)}
                    </Text>
                  </View>

                  <View style={styles.orderStatusPill}>
                    <Text style={styles.orderStatusText}>
                      {dashboard?.medicineOrder ? "Tracking" : "No order"}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderStepsRow}>
                  <OrderStep
                    label="Received"
                    active={Boolean(dashboard?.medicineOrder?.steps.received)}
                    color="#22C55E"
                  />

                  <OrderStep
                    label="Preparing"
                    active={Boolean(dashboard?.medicineOrder?.steps.preparing)}
                    color="#F97316"
                  />

                  <OrderStep
                    label="Ready"
                    active={Boolean(dashboard?.medicineOrder?.steps.ready)}
                    color="#2563EB"
                  />
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const VitalBox = ({
  icon,
  label,
  value,
  unit,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
}) => {
  return (
    <View style={styles.vitalBox}>
      <View style={styles.vitalIcon}>{icon}</View>

      <Text style={styles.vitalLabel} numberOfLines={1}>
        {label}
      </Text>

      <View style={styles.vitalValueRow}>
        <Text style={styles.vitalValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.vitalUnit} numberOfLines={1}>
          {unit}
        </Text>
      </View>
    </View>
  );
};

const QuickAction = ({
  title,
  icon,
  iconBackground,
  onPress,
}: {
  title: string;
  icon: ReactNode;
  iconBackground: string;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      style={styles.quickActionCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.quickIconCircle, { backgroundColor: iconBackground }]}>
        {icon}
      </View>

      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );
};

const OrderStep = ({
  label,
  active,
  color,
}: {
  label: string;
  active: boolean;
  color: string;
}) => {
  return (
    <View style={styles.orderStep}>
      <View
        style={[
          styles.orderStepCircle,
          {
            backgroundColor: active ? color : "#E5E7EB",
          },
        ]}
      >
        <View style={styles.orderStepInnerDot} />
      </View>

      <Text
        style={[
          styles.orderStepLabel,
          active ? styles.orderStepLabelActive : undefined,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#2563EB",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 30,
    marginBottom: 3,
  },
  headerSubtitle: {
    color: "#DBEAFE",
    fontSize: 13,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  profileCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "900",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  loadingText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTitle: {
    color: "#991B1B",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 6,
  },
  errorText: {
    color: "#7F1D1D",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  healthCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
  },
  sourcePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sourcePillText: {
    fontSize: 12,
    fontWeight: "900",
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 16,
    marginBottom: 18,
  },
  statusBadgeText: {
    fontSize: 17,
    fontWeight: "900",
    marginLeft: 8,
  },
  vitalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  vitalBox: {
    width: "31.5%",
    backgroundColor: "rgba(255,255,255,0.74)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.88)",
  },
  vitalIcon: {
    marginBottom: 10,
  },
  vitalLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  vitalValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  vitalValue: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
    marginRight: 3,
  },
  vitalUnit: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "900",
  },
  sectionLink: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "900",
  },
  medicineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  medicineIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  medicineTextBlock: {
    flex: 1,
  },
  medicineName: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 6,
  },
  medicineMeta: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  groupMedicineList: {
    marginBottom: 14,
  },
  groupMedicineItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  groupMedicineName: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
  },
  groupMedicineDose: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "800",
  },
  medicineButtonRow: {
    flexDirection: "row",
  },
  takenButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginRight: 12,
  },
  takenButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  snoozeButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  snoozeButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "900",
  },
  viewMedicinesButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  viewMedicinesButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  emptyMedicineBlock: {
    alignItems: "center",
    paddingVertical: 4,
  },
  emptyMedicineTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 6,
  },
  emptyMedicineText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 14,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  quickActionCard: {
    width: "48%",
    aspectRatio: 1.18,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  quickIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickActionText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  doctorNoteText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22,
  },
  orderTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  orderTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 8,
  },
  orderStatusPill: {
    borderRadius: 999,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  orderStatusText: {
    color: "#C2410C",
    fontSize: 12,
    fontWeight: "900",
  },
  orderStepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  orderStep: {
    flex: 1,
    alignItems: "center",
  },
  orderStepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  orderStepInnerDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  orderStepLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  orderStepLabelActive: {
    color: "#4B5563",
  },
});