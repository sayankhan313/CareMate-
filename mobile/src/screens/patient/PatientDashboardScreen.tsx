import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
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


const BACKGROUND = "#F2F3F8";
const SURFACE = "#FFFFFF"; 
const SURFACE_VARIANT = "#E7E9F2"; 
const TEXT = "#1B1D2A"; 
const MUTED = "#5F6270"; 
const SOFT_PANEL = "#F3F4FA";

const PRIMARY = "#4C6FE0";
const PRIMARY_CONTAINER = "#E1E7FF"; 
const ON_PRIMARY_CONTAINER = "#0C2A8C";

const SUCCESS = "#3A9D75";
const SUCCESS_CONTAINER = "#DBF3E7";
const ON_SUCCESS_CONTAINER = "#0F5C3C";

const WARNING = "#C77A1F";
const WARNING_CONTAINER = "#FBE7CD";
const ON_WARNING_CONTAINER = "#7A4708";

const DANGER = "#C6404A";
const DANGER_CONTAINER = "#FBDADC";
const ON_DANGER_CONTAINER = "#8C1D24";

const DASHBOARD_AUTO_REFRESH_MS = 30_000;


const rippleFor = (color: string) => ({ color, borderless: false });

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
      background: SUCCESS_CONTAINER,
      text: ON_SUCCESS_CONTAINER,
      dot: SUCCESS,
      label: "On track",
    };
  }

  if (status === "WARNING") {
    return {
      background: WARNING_CONTAINER,
      text: ON_WARNING_CONTAINER,
      dot: WARNING,
      label: "Needs attention",
    };
  }

  if (status === "CRITICAL") {
    return {
      background: DANGER_CONTAINER,
      text: ON_DANGER_CONTAINER,
      dot: DANGER,
      label: "Critical",
    };
  }

  return {
    background: PRIMARY_CONTAINER,
    text: ON_PRIMARY_CONTAINER,
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
            <Pressable
              style={styles.iconButton}
              android_ripple={rippleFor(SURFACE_VARIANT)}
              onPress={() => showComingSoon("Search")}
            >
              <Search size={22} color={TEXT} strokeWidth={2} />
            </Pressable>

            <Pressable
              style={styles.iconButton}
              android_ripple={rippleFor(SURFACE_VARIANT)}
              onPress={() => showComingSoon("Notifications")}
            >
              <Bell size={22} color={TEXT} strokeWidth={2} />
              <View style={styles.notificationDot} />
            </Pressable>

            <Pressable
              style={styles.avatar}
              android_ripple={rippleFor("#3457C6")}
              onPress={openPatientProfileScreen}
            >
              {patientInitial ? (
                <Text style={styles.avatarText}>{patientInitial}</Text>
              ) : (
                <UserRound size={19} color={SURFACE} />
              )}
            </Pressable>
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
                <AlertCircle size={24} color={DANGER} strokeWidth={2} />
              </View>

              <Text style={styles.errorTitle}>Dashboard unavailable</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <Pressable
                style={styles.retryButton}
                android_ripple={rippleFor("#3457C6")}
                onPress={() => loadDashboard("initial")}
              >
                <RefreshCw size={17} color={SURFACE} strokeWidth={2.2} />
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <Pressable
                style={styles.healthCard}
                android_ripple={rippleFor("#3457C6")}
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
                    <HeartPulse size={28} color={PRIMARY} strokeWidth={2.2} />
                  </View>
                </View>

                <View style={styles.healthStatsRow}>
                  <HealthStat
                    label="Heart"
                    value={displayMetric(healthStatus?.heartRate)}
                    unit="bpm"
                  />

                  <View style={styles.healthStatDivider} />

                  <HealthStat
                    label="SpO₂"
                    value={displayMetric(healthStatus?.spo2)}
                    unit="%"
                  />

                  <View style={styles.healthStatDivider} />

                  <HealthStat
                    label="BP"
                    value={healthStatus?.bloodPressure || "--/--"}
                    unit="mmHg"
                  />
                </View>
              </Pressable>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryContent}
              >
                <CategoryShortcut
                  label="Scan"
                  icon={<Camera size={23} color={ON_PRIMARY_CONTAINER} strokeWidth={2} />}
                  onPress={openScanMedicineScreen}
                />

                <CategoryShortcut
                  label="Add Med"
                  icon={<Plus size={23} color={ON_PRIMARY_CONTAINER} strokeWidth={2} />}
                  onPress={openAddMedicineScreen}
                />

                <CategoryShortcut
                  label="Vitals"
                  icon={<HeartPulse size={23} color={ON_PRIMARY_CONTAINER} strokeWidth={2} />}
                  onPress={openVitalsScreen}
                />

                <CategoryShortcut
                  label="Safety"
                  icon={
                    <ShieldAlert size={23} color={ON_PRIMARY_CONTAINER} strokeWidth={2} />
                  }
                  onPress={openEmergencyResponseScreen}
                />
              </ScrollView>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My plan</Text>

                <Pressable
                  android_ripple={rippleFor(SURFACE_VARIANT)}
                  hitSlop={8}
                  onPress={openMedicinesScreen}
                >
                  <Text style={styles.sectionAction}>View meds</Text>
                </Pressable>
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
                      size={21}
                      color={PRIMARY}
                      strokeWidth={2}
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

        {!isLoading && !errorMessage ? (
          <Pressable
            style={[
              styles.fab,
              {
                bottom: Math.max(24, insets.bottom + 20),
              },
            ]}
            android_ripple={rippleFor("#3457C6")}
            onPress={openAddMedicineScreen}
          >
            <Plus size={24} color={SURFACE} strokeWidth={2.4} />
          </Pressable>
        ) : null}
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
    <Pressable
      style={styles.categoryItem}
      android_ripple={rippleFor(SURFACE_VARIANT)}
      onPress={onPress}
    >
      <View style={styles.categoryIconCircle}>{icon}</View>
      <Text style={styles.categoryLabel}>{label}</Text>
    </Pressable>
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
    <Pressable
      style={styles.orderMiniCard}
      android_ripple={rippleFor(SURFACE_VARIANT)}
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
    </Pressable>
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
  const activeLineColor = tone === "success" ? "#B7E4D0" : "#F3CD97";

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
            <CheckCircle2 size={11} color={SURFACE} strokeWidth={2.6} />
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
                color: tone === "success" ? ON_SUCCESS_CONTAINER : ON_WARNING_CONTAINER,
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
        <View style={[styles.rowIconBox, { backgroundColor: SUCCESS_CONTAINER }]}>
          <Pill size={21} color={SUCCESS} strokeWidth={2.2} />
        </View>

        <View style={styles.rowTextBlock}>
          <Text style={styles.rowTitle}>No upcoming dose</Text>
          <Text style={styles.rowSubtitle}>
            Add a medicine reminder to build your daily plan.
          </Text>
        </View>

        <Pressable
          style={styles.smallPrimaryButton}
          android_ripple={rippleFor("#3457C6")}
          onPress={onAddMedicine}
        >
          <Text style={styles.smallPrimaryButtonText}>Add</Text>
        </Pressable>
      </View>
    );
  }

  const hasMultipleMedicines = nextMedicineGroup.count > 1;

  return (
    <View>
      <Pressable
        style={styles.medicineTopRow}
        android_ripple={rippleFor(SURFACE_VARIANT)}
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
          <ChevronRight size={20} color={MUTED} strokeWidth={2.2} />
        ) : null}
      </Pressable>

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
          <Pressable
            style={[
              styles.takenButton,
              isTakingNextMedicine ? styles.disabledButton : undefined,
            ]}
            android_ripple={rippleFor("#2C8F68")}
            disabled={isMedicineActionDisabled}
            onPress={() => onMarkTaken(firstMedicine.reminderId)}
          >
            <CheckCircle2 size={17} color={SURFACE} strokeWidth={2.2} />
            <Text style={styles.takenButtonText}>
              {isTakingNextMedicine ? "Saving..." : "Taken"}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.snoozeButton,
              isSnoozingNextMedicine ? styles.disabledButton : undefined,
            ]}
            android_ripple={rippleFor("#C7D3FA")}
            disabled={isMedicineActionDisabled}
            onPress={() => onSnooze(firstMedicine.reminderId)}
          >
            <Clock3 size={17} color={PRIMARY} strokeWidth={2.2} />
            <Text style={styles.snoozeButtonText}>
              {isSnoozingNextMedicine ? "Snoozing..." : "Snooze"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};


const elevate = (level: number) => ({
  elevation: level,
  shadowColor: "#1B1D2A",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: { width: 0, height: level * 0.8 },
});

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
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: BACKGROUND,
  },
  greetingBlock: {
    flex: 1,
    paddingRight: 12,
  },
  helloText: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0,
  },
  subHelloText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    overflow: "hidden",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DANGER,
    borderWidth: 1.5,
    borderColor: BACKGROUND,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    overflow: "hidden",
  },
  avatarText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  statePanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginTop: 24,
    ...elevate(1),
  },
  stateTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  stateText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 5,
  },
  errorIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: DANGER_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    color: ON_DANGER_CONTAINER,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  errorText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...elevate(1),
  },
  retryButtonText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  categoryContent: {
    paddingBottom: 14,
    paddingTop: 4,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 14,
    width: 74,
    borderRadius: 16,
    paddingVertical: 4,
    overflow: "hidden",
  },
  categoryIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: PRIMARY_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  healthCard: {
    backgroundColor: PRIMARY,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    overflow: "hidden",
    ...elevate(2),
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
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 7,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  healthCardTitle: {
    color: SURFACE,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 0,
    marginTop: 14,
  },
  healthCardMeta: {
    color: "#E4EAFF",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 6,
  },
  healthIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  healthStatsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    padding: 12,
    marginTop: 18,
    alignItems: "center",
  },
  healthStat: {
    flex: 1,
    paddingHorizontal: 6,
  },
  healthStatDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  healthStatLabel: {
    color: "#E4EAFF",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  healthStatValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  healthStatValue: {
    color: SURFACE,
    fontSize: 17,
    fontWeight: "700",
    marginRight: 3,
  },
  healthStatUnit: {
    color: "#E4EAFF",
    fontSize: 9,
    fontWeight: "600",
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
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0,
  },
  sectionAction: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "700",
  },
  whitePanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    ...elevate(1),
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
    borderRadius: 12,
    overflow: "hidden",
  },
  rowIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  timeBox: {
    width: 64,
    height: 54,
    borderRadius: 13,
    backgroundColor: WARNING_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  timeBoxText: {
    color: ON_WARNING_CONTAINER,
    fontSize: 13,
    fontWeight: "700",
  },
  timeBoxLabel: {
    color: ON_WARNING_CONTAINER,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
  },
  rowTextBlock: {
    flex: 1,
  },
  rowTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  rowSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
  smallPrimaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginLeft: 10,
    overflow: "hidden",
  },
  smallPrimaryButtonText: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "700",
  },
  previewList: {
    paddingBottom: 4,
    paddingTop: 8,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SOFT_PANEL,
    borderRadius: 11,
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
    fontWeight: "700",
  },
  previewDose: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
  medicineActions: {
    flexDirection: "row",
    marginTop: 12,
  },
  takenButton: {
    flex: 1,
    backgroundColor: SUCCESS,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexDirection: "row",
    overflow: "hidden",
    ...elevate(1),
  },
  takenButtonText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  snoozeButton: {
    flex: 1,
    backgroundColor: PRIMARY_CONTAINER,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    overflow: "hidden",
  },
  snoozeButtonText: {
    color: ON_PRIMARY_CONTAINER,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  disabledButton: {
    opacity: 0.55,
  },
  doctorNotePanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    ...elevate(1),
  },
  doctorNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorNoteIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: PRIMARY_CONTAINER,
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
    fontWeight: "700",
  },
  doctorNoteDate: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 4,
  },
  doctorNoteBody: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
    backgroundColor: SOFT_PANEL,
    borderRadius: 12,
    padding: 13,
    marginTop: 14,
  },
  orderMiniCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 15,
    marginBottom: 18,
    overflow: "hidden",
    ...elevate(1),
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
    fontWeight: "700",
  },
  orderStatusPill: {
    backgroundColor: WARNING_CONTAINER,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  orderStatusText: {
    color: ON_WARNING_CONTAINER,
    fontSize: 9,
    fontWeight: "700",
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
    backgroundColor: SURFACE_VARIANT,
    borderWidth: 1,
    borderColor: SURFACE_VARIANT,
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
    backgroundColor: SURFACE_VARIANT,
    borderRadius: 2,
    marginHorizontal: 5,
  },
  orderStepLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 7,
    paddingRight: 6,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...elevate(4),
  },
});
