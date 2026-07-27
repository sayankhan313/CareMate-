import { useCallback, useMemo, useState, type ReactNode } from "react";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
  AlertCircle,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HeartPulse,
  MessageSquareText,
  Pill,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
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

type DashboardMedicineActionType = "TAKEN" | "SNOOZE";

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

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#3F6FD0";
const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";
const WARNING = "#F6A545";
const WARNING_LIGHT = "#FFF3E2";
const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const DASHBOARD_AUTO_REFRESH_MS = 30_000;

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

const getStatusTone = (status: DashboardStatus) => {
  if (status === "STABLE") {
    return {
      background: SUCCESS_LIGHT,
      text: "#167A58",
      dot: SUCCESS,
      label: "On track",
    };
  }

  if (status === "WARNING") {
    return {
      background: WARNING_LIGHT,
      text: "#A85A13",
      dot: WARNING,
      label: "Needs attention",
    };
  }

  if (status === "CRITICAL") {
    return {
      background: DANGER_LIGHT,
      text: "#B42318",
      dot: DANGER,
      label: "Critical",
    };
  }

  return {
    background: "#EEF4FF",
    text: PRIMARY_DARK,
    dot: PRIMARY,
    label: "No data",
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
    return "Manual entry";
  }

  return "No source";
};

const formatRecordedAt = (value?: string | null) => {
  if (!value) {
    return "No recent reading";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Updated recently";
  }

  return `Updated ${parsedDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const formatDoctorNoteTime = (value?: string | null) => {
  if (!value) {
    return "Recently added";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently added";
  }

  const timeText = parsedDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const today = new Date();
  const isToday = parsedDate.toDateString() === today.toDateString();

  if (isToday) {
    return `Today · ${timeText}`;
  }

  const dateText = parsedDate.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });

  return `${dateText} · ${timeText}`;
};

const formatOrderStatus = (status?: string | null) => {
  if (!status) {
    return "Preparing";
  }

  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const displayMetric = (value?: number | null) => {
  if (value === null || value === undefined) {
    return "--";
  }

  return String(value);
};

export const PatientDashboardScreen = ({
  navigation,
  route,
}: PatientDashboardScreenProps) => {
  const insets = useSafeAreaInsets();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionLoadingReminderId, setActionLoadingReminderId] = useState<
    string | null
  >(null);
  const [actionLoadingType, setActionLoadingType] =
    useState<DashboardMedicineActionType | null>(null);

  const resetToLogin = useCallback(async () => {
    await tokenStorage.removeToken();

    const rootNavigation =
      navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

    rootNavigation?.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  }, [navigation]);

  const loadDashboard = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        }

        if (mode === "refresh") {
          setIsRefreshing(true);
        }

        if (mode !== "silent") {
          setErrorMessage("");
        }

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

        if (mode !== "silent") {
          setErrorMessage(message);
        }
      } finally {
        if (mode === "initial") {
          setIsLoading(false);
        }

        if (mode === "refresh") {
          setIsRefreshing(false);
        }
      }
    },
    [resetToLogin]
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboard("initial");

      const intervalId = setInterval(() => {
        loadDashboard("silent");
      }, DASHBOARD_AUTO_REFRESH_MS);

      return () => {
        clearInterval(intervalId);
      };
    }, [loadDashboard])
  );

  const removeMedicineFromDashboardCard = (reminderId: string) => {
    setDashboard((currentDashboard) => {
      if (!currentDashboard?.nextMedicineGroup) {
        return currentDashboard;
      }

      const updatedMedicines =
        currentDashboard.nextMedicineGroup.medicines.filter(
          (medicine) => medicine.reminderId !== reminderId
        );

      if (updatedMedicines.length === 0) {
        return {
          ...currentDashboard,
          nextMedicineGroup: null,
        };
      }

      return {
        ...currentDashboard,
        nextMedicineGroup: {
          ...currentDashboard.nextMedicineGroup,
          count: updatedMedicines.length,
          medicines: updatedMedicines,
        },
      };
    });
  };

  const markDashboardMedicineTaken = async (reminderId: string) => {
    if (actionLoadingReminderId) {
      return;
    }

    try {
      setActionLoadingReminderId(reminderId);
      setActionLoadingType("TAKEN");

      const token = await tokenStorage.getToken();

      if (!token) {
        Alert.alert("Session expired", "Please login again.");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/patient/medicine-reminders/${reminderId}/taken`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let result: any = {};

      try {
        result = await response.json();
      } catch (error) {
        result = {};
      }

      if (!response.ok) {
        Alert.alert(
          "Unable to update medicine",
          result.message || "Please try again."
        );
        return;
      }

      removeMedicineFromDashboardCard(reminderId);
      await loadDashboard("silent");
    } catch (error) {
      Alert.alert("Network error", "Unable to connect to server.");
    } finally {
      setActionLoadingReminderId(null);
      setActionLoadingType(null);
    }
  };

  const snoozeDashboardMedicine = async (reminderId: string) => {
    if (actionLoadingReminderId) {
      return;
    }

    try {
      setActionLoadingReminderId(reminderId);
      setActionLoadingType("SNOOZE");

      const token = await tokenStorage.getToken();

      if (!token) {
        Alert.alert("Session expired", "Please login again.");
        return;
      }

      const snoozedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const response = await fetch(
        `${API_BASE_URL}/patient/medicine-reminders/${reminderId}/snooze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            snoozedUntil,
          }),
        }
      );

      let result: any = {};

      try {
        result = await response.json();
      } catch (error) {
        result = {};
      }

      if (!response.ok) {
        Alert.alert(
          "Unable to snooze medicine",
          result.message || "Please try again."
        );
        return;
      }

      removeMedicineFromDashboardCard(reminderId);
      await loadDashboard("silent");
    } catch (error) {
      Alert.alert("Network error", "Unable to connect to server.");
    } finally {
      setActionLoadingReminderId(null);
      setActionLoadingType(null);
    }
  };

  const getRootNavigation = () => {
    return navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  };

  const openAddMedicineScreen = () => {
    const rootNavigation = getRootNavigation();

    rootNavigation?.navigate("AddMedicine");
  };

  const openPatientProfileScreen = () => {
    const rootNavigation = getRootNavigation();

    if (!rootNavigation) {
      Alert.alert("Unable to open", "Profile screen is not available right now.");
      return;
    }

    rootNavigation.navigate("PatientProfile", {
      user: dashboard?.patient || route.params?.user,
    });
  };

  const openScanMedicineScreen = () => {
    const rootNavigation = getRootNavigation();

    if (!rootNavigation) {
      Alert.alert(
        "Unable to open",
        "Medicine scanner is not available right now."
      );
      return;
    }

    rootNavigation.navigate("ScanMedicine");
  };

  const openEmergencyResponseScreen = () => {
    const rootNavigation = getRootNavigation();

    if (!rootNavigation) {
      Alert.alert(
        "Unable to open",
        "Safety Response screen is not available right now."
      );
      return;
    }

    rootNavigation.navigate("ManualSafetyResponse");
  };

  const openMedicinesScreen = () => {
    navigation.navigate("Medicines");
  };

  const openVitalsScreen = () => {
    navigation.navigate("Vitals");
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
  const statusTone = getStatusTone(status);

  const nextMedicineGroup = dashboard?.nextMedicineGroup || null;
  const firstMedicine = nextMedicineGroup?.medicines[0];

  const isNextMedicineActionLoading =
    firstMedicine?.reminderId === actionLoadingReminderId;

  const isTakingNextMedicine =
    isNextMedicineActionLoading && actionLoadingType === "TAKEN";

  const isSnoozingNextMedicine =
    isNextMedicineActionLoading && actionLoadingType === "SNOOZE";

  const isMedicineActionDisabled = Boolean(actionLoadingReminderId);

  const healthMeta = useMemo(() => {
    return `${formatSourceLabel(healthStatus?.source || null)} · ${formatRecordedAt(
      healthStatus?.recordedAt
    )}`;
  }, [healthStatus?.recordedAt, healthStatus?.source]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.greetingBlock}>
            <Text style={styles.helloText}>Hello {patientFirstName} 👋</Text>
            <Text style={styles.subHelloText}>{getGreetingText()}</Text>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.roundButton}
              activeOpacity={0.85}
              onPress={() => showComingSoon("Search")}
            >
              <Search size={19} color={TEXT} strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roundButton}
              activeOpacity={0.85}
              onPress={() => showComingSoon("Notifications")}
            >
              <Bell size={19} color={TEXT} strokeWidth={2.5} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatar}
              activeOpacity={0.85}
              onPress={openPatientProfileScreen}
            >
              {patientInitial ? (
                <Text style={styles.avatarText}>{patientInitial}</Text>
              ) : (
                <UserRound size={19} color={PRIMARY} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(34, insets.bottom + 112),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadDashboard("refresh")}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        >
          {isLoading ? (
            <View style={styles.statePanel}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading your plan...</Text>
              <Text style={styles.stateText}>
                Getting your medicines, vitals and care updates.
              </Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.statePanel}>
              <View style={styles.errorIconCircle}>
                <AlertCircle size={24} color={DANGER} strokeWidth={2.5} />
              </View>

              <Text style={styles.errorTitle}>Dashboard unavailable</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                activeOpacity={0.85}
                onPress={() => loadDashboard("initial")}
              >
                <RefreshCw size={17} color={SURFACE} strokeWidth={2.5} />
                <Text style={styles.retryButtonText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <TouchableOpacity
                style={styles.healthCard}
                activeOpacity={0.9}
                onPress={openVitalsScreen}
              >
                <View style={styles.healthCardTop}>
                  <View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: statusTone.background,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: statusTone.dot,
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: statusTone.text,
                          },
                        ]}
                      >
                        {healthStatus?.label || "No Data"}
                      </Text>
                    </View>

                    <Text style={styles.healthCardTitle}>{statusTone.label}</Text>
                    <Text style={styles.healthCardMeta}>{healthMeta}</Text>
                  </View>

                  <View style={styles.healthIconBox}>
                    <HeartPulse size={30} color={PRIMARY} strokeWidth={2.7} />
                  </View>
                </View>

                <View style={styles.healthStatsRow}>
                  <HealthStat
                    label="Heart"
                    value={displayMetric(healthStatus?.heartRate)}
                    unit="bpm"
                  />

                  <HealthStat
                    label="SpO₂"
                    value={displayMetric(healthStatus?.spo2)}
                    unit="%"
                  />

                  <HealthStat
                    label="BP"
                    value={healthStatus?.bloodPressure || "--/--"}
                    unit="mmHg"
                  />
                </View>
              </TouchableOpacity>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryContent}
              >
                <CategoryShortcut
                  label="Scan"
                  icon={<Camera size={24} color={TEXT} strokeWidth={2.4} />}
                  onPress={openScanMedicineScreen}
                />

                <CategoryShortcut
                  label="Add Med"
                  icon={<Plus size={24} color={TEXT} strokeWidth={2.4} />}
                  onPress={openAddMedicineScreen}
                />

                <CategoryShortcut
                  label="Vitals"
                  icon={<HeartPulse size={24} color={TEXT} strokeWidth={2.4} />}
                  onPress={openVitalsScreen}
                />

                <CategoryShortcut
                  label="Safety"
                  icon={
                    <ShieldAlert size={24} color={TEXT} strokeWidth={2.4} />
                  }
                  onPress={openEmergencyResponseScreen}
                />
              </ScrollView>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My plan</Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={openMedicinesScreen}
                >
                  <Text style={styles.sectionAction}>View meds</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.whitePanel}>
                <MedicinePlanBlock
                  nextMedicineGroup={nextMedicineGroup}
                  firstMedicine={firstMedicine}
                  isTakingNextMedicine={isTakingNextMedicine}
                  isSnoozingNextMedicine={isSnoozingNextMedicine}
                  isMedicineActionDisabled={isMedicineActionDisabled}
                  onAddMedicine={openAddMedicineScreen}
                  onOpenMedicines={openMedicinesScreen}
                  onMarkTaken={markDashboardMedicineTaken}
                  onSnooze={snoozeDashboardMedicine}
                />
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Latest doctor note</Text>
              </View>

              <View style={styles.doctorNotePanel}>
                <View style={styles.doctorNoteHeader}>
                  <View style={styles.doctorNoteIconBox}>
                    <MessageSquareText
                      size={22}
                      color={PRIMARY}
                      strokeWidth={2.5}
                    />
                  </View>

                  <View style={styles.doctorNoteHeaderText}>
                    <Text style={styles.doctorNoteTitle}>
                      {dashboard?.latestDoctorNote
                        ? "Note from your doctor"
                        : "No doctor note yet"}
                    </Text>

                    <Text style={styles.doctorNoteDate}>
                      {dashboard?.latestDoctorNote
                        ? formatDoctorNoteTime(
                            dashboard.latestDoctorNote.createdAt
                          )
                        : "A new note will automatically appear here after your doctor creates it."}
                    </Text>
                  </View>
                </View>

                {dashboard?.latestDoctorNote ? (
                  <Text style={styles.doctorNoteBody}>
                    {dashboard.latestDoctorNote.note}
                  </Text>
                ) : null}
              </View>

              <MedicineOrderMiniBar
                order={dashboard?.medicineOrder || null}
                onPress={openOrdersScreen}
              />
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const CategoryShortcut = ({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      style={styles.categoryItem}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.categoryIconCircle}>{icon}</View>
      <Text style={styles.categoryLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const HealthStat = ({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) => {
  return (
    <View style={styles.healthStat}>
      <Text style={styles.healthStatLabel}>{label}</Text>
      <View style={styles.healthStatValueRow}>
        <Text style={styles.healthStatValue}>{value}</Text>
        <Text style={styles.healthStatUnit}>{unit}</Text>
      </View>
    </View>
  );
};

const MedicineOrderMiniBar = ({
  order,
  onPress,
}: {
  order: DashboardData["medicineOrder"];
  onPress: () => void;
}) => {
  const steps = order?.steps || {
    received: true,
    preparing: true,
    ready: false,
  };

  const statusText = formatOrderStatus(order?.status || "PREPARING");

  return (
    <TouchableOpacity
      style={styles.orderMiniCard}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.orderMiniHeader}>
        <Text style={styles.orderMiniTitle}>Medicine Order</Text>

        <View style={styles.orderStatusPill}>
          <Text style={styles.orderStatusText}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.orderStepRow}>
        <OrderMiniStep
          label="Received"
          active={Boolean(steps.received)}
          tone="success"
        />

        <OrderMiniStep
          label="Preparing"
          active={Boolean(steps.preparing)}
          tone="warning"
        />

        <OrderMiniStep
          label="Ready"
          active={Boolean(steps.ready)}
          tone="success"
          isLast
        />
      </View>
    </TouchableOpacity>
  );
};

const OrderMiniStep = ({
  label,
  active,
  tone,
  isLast,
}: {
  label: string;
  active: boolean;
  tone: "success" | "warning";
  isLast?: boolean;
}) => {
  const activeColor = tone === "success" ? SUCCESS : WARNING;
  const activeLineColor = tone === "success" ? "#BCE9D7" : "#FED7AA";

  return (
    <View style={styles.orderStep}>
      <View style={styles.orderStepTop}>
        <View
          style={[
            styles.orderStepCircle,
            active
              ? {
                  backgroundColor: activeColor,
                  borderColor: activeColor,
                }
              : undefined,
          ]}
        >
          {active && tone === "success" ? (
            <CheckCircle2 size={11} color={SURFACE} strokeWidth={3} />
          ) : active ? (
            <View style={styles.orderStepInnerDot} />
          ) : null}
        </View>

        {!isLast ? (
          <View
            style={[
              styles.orderStepLine,
              active
                ? {
                    backgroundColor: activeLineColor,
                  }
                : undefined,
            ]}
          />
        ) : null}
      </View>

      <Text
        style={[
          styles.orderStepLabel,
          active
            ? {
                color: tone === "success" ? "#167A58" : "#A85A13",
              }
            : undefined,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const MedicinePlanBlock = ({
  nextMedicineGroup,
  firstMedicine,
  isTakingNextMedicine,
  isSnoozingNextMedicine,
  isMedicineActionDisabled,
  onAddMedicine,
  onOpenMedicines,
  onMarkTaken,
  onSnooze,
}: {
  nextMedicineGroup: NextMedicineGroup | null;
  firstMedicine?: DashboardMedicine;
  isTakingNextMedicine: boolean;
  isSnoozingNextMedicine: boolean;
  isMedicineActionDisabled: boolean;
  onAddMedicine: () => void;
  onOpenMedicines: () => void;
  onMarkTaken: (reminderId: string) => void;
  onSnooze: (reminderId: string) => void;
}) => {
  if (!nextMedicineGroup || !firstMedicine) {
    return (
      <View style={styles.emptyMedicineRow}>
        <View style={[styles.rowIconBox, { backgroundColor: SUCCESS_LIGHT }]}>
          <Pill size={22} color={SUCCESS} strokeWidth={2.5} />
        </View>

        <View style={styles.rowTextBlock}>
          <Text style={styles.rowTitle}>No upcoming dose</Text>
          <Text style={styles.rowSubtitle}>
            Add a medicine reminder to build your daily plan.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.smallPrimaryButton}
          activeOpacity={0.85}
          onPress={onAddMedicine}
        >
          <Text style={styles.smallPrimaryButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasMultipleMedicines = nextMedicineGroup.count > 1;

  return (
    <View>
      <TouchableOpacity
        style={styles.medicineTopRow}
        activeOpacity={0.85}
        onPress={onOpenMedicines}
      >
        <View style={styles.timeBox}>
          <Text style={styles.timeBoxText}>
            {formatTime(nextMedicineGroup.scheduledFor)}
          </Text>
          <Text style={styles.timeBoxLabel}>Due</Text>
        </View>

        <View style={styles.rowTextBlock}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {hasMultipleMedicines
              ? `${nextMedicineGroup.count} medicines due`
              : firstMedicine.name}
          </Text>

          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {hasMultipleMedicines
              ? "Open schedule to manage all medicines at this time."
              : `${firstMedicine.dose}${
                  firstMedicine.instructions
                    ? ` · ${firstMedicine.instructions}`
                    : ""
                }`}
          </Text>
        </View>

        {hasMultipleMedicines ? (
          <ChevronRight size={21} color={MUTED} strokeWidth={2.5} />
        ) : null}
      </TouchableOpacity>

      {hasMultipleMedicines ? (
        <View style={styles.previewList}>
          {nextMedicineGroup.medicines.slice(0, 3).map((medicine) => (
            <View
              key={`${medicine.medicineId}-${medicine.reminderId}`}
              style={styles.previewRow}
            >
              <View style={styles.previewDot} />
              <Text style={styles.previewName} numberOfLines={1}>
                {medicine.name}
              </Text>
              <Text style={styles.previewDose} numberOfLines={1}>
                {medicine.dose}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.medicineActions}>
          <TouchableOpacity
            style={[
              styles.takenButton,
              isTakingNextMedicine ? styles.disabledButton : undefined,
            ]}
            activeOpacity={0.85}
            disabled={isMedicineActionDisabled}
            onPress={() => onMarkTaken(firstMedicine.reminderId)}
          >
            <CheckCircle2 size={17} color={SURFACE} strokeWidth={2.7} />
            <Text style={styles.takenButtonText}>
              {isTakingNextMedicine ? "Saving..." : "Taken"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.snoozeButton,
              isSnoozingNextMedicine ? styles.disabledButton : undefined,
            ]}
            activeOpacity={0.85}
            disabled={isMedicineActionDisabled}
            onPress={() => onSnooze(firstMedicine.reminderId)}
          >
            <Clock3 size={17} color={PRIMARY} strokeWidth={2.7} />
            <Text style={styles.snoozeButtonText}>
              {isSnoozingNextMedicine ? "Snoozing..." : "Snooze"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greetingBlock: {
    flex: 1,
    paddingRight: 12,
  },
  helloText: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subHelloText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    borderWidth: 1,
    borderColor: BORDER,
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
    borderWidth: 1,
    borderColor: SURFACE,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: SURFACE,
    fontSize: 16,
    fontWeight: "900",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  statePanel: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    marginTop: 24,
    borderWidth: 1,
    borderColor: BORDER,
  },
  stateTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 12,
  },
  stateText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 5,
  },
  errorIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    color: "#9F1D1D",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 6,
  },
  errorText: {
    color: "#7A2E2E",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
  },
  retryButtonText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  categoryContent: {
    paddingBottom: 14,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 18,
    width: 76,
  },
  categoryIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryLabel: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center",
  },
  healthCard: {
    backgroundColor: PRIMARY,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    overflow: "hidden",
  },
  healthCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 7,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  healthCardTitle: {
    color: SURFACE,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -0.7,
    marginTop: 14,
  },
  healthCardMeta: {
    color: "#EAF1FF",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  healthIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  healthStatsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 18,
    padding: 10,
    marginTop: 18,
  },
  healthStat: {
    flex: 1,
    paddingHorizontal: 6,
  },
  healthStatLabel: {
    color: "#EAF1FF",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },
  healthStatValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  healthStatValue: {
    color: SURFACE,
    fontSize: 17,
    fontWeight: "900",
    marginRight: 3,
  },
  healthStatUnit: {
    color: "#EAF1FF",
    fontSize: 9,
    fontWeight: "900",
    marginBottom: 3,
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  sectionAction: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "900",
  },
  whitePanel: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyMedicineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  medicineTopRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  rowIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  timeBox: {
    width: 68,
    height: 56,
    borderRadius: 16,
    backgroundColor: WARNING_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  timeBoxText: {
    color: "#A85A13",
    fontSize: 14,
    fontWeight: "900",
  },
  timeBoxLabel: {
    color: "#A85A13",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
    textTransform: "uppercase",
  },
  rowTextBlock: {
    flex: 1,
  },
  rowTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  rowSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  smallPrimaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 10,
  },
  smallPrimaryButtonText: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "900",
  },
  previewList: {
    paddingBottom: 4,
    paddingTop: 8,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 7,
  },
  previewDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: PRIMARY,
    marginRight: 8,
  },
  previewName: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  previewDose: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 8,
  },
  medicineActions: {
    flexDirection: "row",
    marginTop: 12,
  },
  takenButton: {
    flex: 1,
    backgroundColor: SUCCESS,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexDirection: "row",
  },
  takenButtonText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 6,
  },
  snoozeButton: {
    flex: 1,
    backgroundColor: "#EEF4FF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  snoozeButtonText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 6,
  },
  disabledButton: {
    opacity: 0.55,
  },
  doctorNotePanel: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  doctorNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorNoteIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  doctorNoteHeaderText: {
    flex: 1,
  },
  doctorNoteTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  doctorNoteDate: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 4,
  },
  doctorNoteBody: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    backgroundColor: SOFT_PANEL,
    borderRadius: 14,
    padding: 13,
    marginTop: 14,
  },
  orderMiniCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 15,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  orderMiniHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  orderMiniTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  orderStatusPill: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  orderStatusText: {
    color: "#A85A13",
    fontSize: 9,
    fontWeight: "900",
  },
  orderStepRow: {
    flexDirection: "row",
  },
  orderStep: {
    flex: 1,
  },
  orderStepTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderStepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F1F4FA",
    borderWidth: 1,
    borderColor: "#DDE3EF",
    alignItems: "center",
    justifyContent: "center",
  },
  orderStepInnerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: SURFACE,
  },
  orderStepLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#E4E8F2",
    borderRadius: 2,
    marginHorizontal: 5,
  },
  orderStepLabel: {
    color: "#A7B0C2",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 7,
    paddingRight: 6,
  },
});