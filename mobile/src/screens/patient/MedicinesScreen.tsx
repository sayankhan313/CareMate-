import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, type CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle } from "react-native-svg";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, FileCheck2, Moon, Package, Pill, Plus, ShoppingBag, Sunrise, Sun, Trash2, X } from "lucide-react-native";

import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedTextInput as TextInput } from "../../components/common/LocalizedTextInput";
import { API_BASE_URL } from "../../constants/api";
import { useLanguage } from "../../context/LanguageContext";
import { patientMedicineReviewsApi } from "../../services/patientMedicineReviewsApi";
import { patientSettingsApi, type ReminderSettings } from "../../services/patientSettingsApi";
import { tokenStorage } from "../../services/tokenStorage";
import type { PatientTabParamList, RootStackParamList } from "../../types/navigation";

type Props = CompositeScreenProps<BottomTabScreenProps<PatientTabParamList, "Medicines">, NativeStackScreenProps<RootStackParamList, "PatientTabs">>;

type MedicineStatus = "PENDING" | "TAKEN" | "MISSED" | "SNOOZED";
type DateTab = "TODAY" | "TOMORROW" | "WEEK";
type MedicinePeriod = "Morning" | "Afternoon" | "Evening";
type ActionLoadingType = "TAKEN" | "SNOOZE";

type TodayMedicine = {
  medicineId: string;
  reminderId: string;
  name: string;
  dose: string;
  doseQuantity?: number | null;
  doseUnit?: string | null;
  instructions?: string | null;
  source: string;
  frequency: string;
  customFrequency?: string | null;
  timeOfDay: string;
  period: MedicinePeriod;
  scheduledFor?: string | null;
  scheduledDate?: string | null;
  reminderDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  date?: string | null;
  status: MedicineStatus;
  takenAt?: string | null;
  snoozedUntil?: string | null;
  deletionReviewPending?: boolean;
  pendingDeletionRequestId?: string | null;
  hasMedicineOnHand?: boolean | null;
  currentStock?: number | null;
  stockUnit?: string | null;
  lowStockThreshold?: number | null;
  isLowStock?: boolean;
};

type TrackedMedicine = {
  id: string;
  name: string;
  dose: string;
  doseQuantity?: number | null;
  doseUnit?: string | null;
  instructions?: string | null;
  source: string;
  isActive: boolean;
  hasMedicineOnHand?: boolean | null;
  currentStock?: number | null;
  stockUnit?: string | null;
  lowStockThreshold?: number | null;
  isLowStock?: boolean;
  deletionReviewPending?: boolean;
  reminders: { id: string; frequency: string; timeOfDay: string; isActive: boolean }[];
};

type TodayMedicineSummary = { totalCount: number; takenCount: number; pendingCount: number; missedCount: number; snoozedCount: number; progressPercentage: number };
type RemovalModalState = { medicineId: string; medicineName: string } | null;

const BACKGROUND = "#F2F3F8";
const SURFACE = "#FFFFFF";
const SURFACE_VARIANT = "#E7E9F2";
const SOFT_PANEL = "#F3F4FA";
const TEXT = "#1B1D2A";
const MUTED = "#5F6270";
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
const SECONDARY = "#6B59B5";
const SECONDARY_CONTAINER = "#E9E4F8";
const SNOOZED_RING = "#A9B8F3";

const RING_SIZE = 108;
const RING_STROKE = 10;
const RING_RADIUS = 43;
const RING_CENTER = RING_SIZE / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: TEXT,
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level * 1.5,
  shadowOffset: { width: 0, height: level },
});

const getDateKeyFromOffset = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeDateKey = (value?: string | null) => {
  if (!value) return "";
  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split("/");
    return `${year}-${month}-${day}`;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMedicineDateKey = (medicine: TodayMedicine) =>
  normalizeDateKey(medicine.scheduledFor) ||
  normalizeDateKey(medicine.scheduledDate) ||
  normalizeDateKey(medicine.reminderDate) ||
  normalizeDateKey(medicine.date) ||
  normalizeDateKey(medicine.startDate);

const getAllowedDates = (tab: DateTab) => {
  if (tab === "TODAY") return [getDateKeyFromOffset(0)];
  if (tab === "TOMORROW") return [getDateKeyFromOffset(1)];
  return Array.from({ length: 7 }, (_, index) => getDateKeyFromOffset(index));
};

const getTimeMinutes = (time?: string | null) => {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
};

const sortMedicines = (medicines: TodayMedicine[]) =>
  [...medicines].sort((a, b) => {
    const dateDifference = getMedicineDateKey(a).localeCompare(getMedicineDateKey(b));
    if (dateDifference !== 0) return dateDifference;
    return getTimeMinutes(a.timeOfDay) - getTimeMinutes(b.timeOfDay);
  });

const buildSummary = (medicines: TodayMedicine[]): TodayMedicineSummary => {
  const totalCount = medicines.length;
  const takenCount = medicines.filter(item => item.status === "TAKEN").length;
  const pendingCount = medicines.filter(item => item.status === "PENDING").length;
  const missedCount = medicines.filter(item => item.status === "MISSED").length;
  const snoozedCount = medicines.filter(item => item.status === "SNOOZED").length;

  return {
    totalCount,
    takenCount,
    pendingCount,
    missedCount,
    snoozedCount,
    progressPercentage: totalCount === 0 ? 0 : Math.round((takenCount / totalCount) * 100),
  };
};

const getStatusTone = (status: MedicineStatus) => {
  if (status === "TAKEN") return { background: SUCCESS_CONTAINER, text: ON_SUCCESS_CONTAINER, color: SUCCESS };
  if (status === "MISSED") return { background: DANGER_CONTAINER, text: ON_DANGER_CONTAINER, color: DANGER };
  if (status === "SNOOZED") return { background: PRIMARY_CONTAINER, text: ON_PRIMARY_CONTAINER, color: PRIMARY };
  return { background: WARNING_CONTAINER, text: ON_WARNING_CONTAINER, color: WARNING };
};

const getPeriodTone = (period: MedicinePeriod) => {
  if (period === "Morning") return { background: WARNING_CONTAINER, color: WARNING };
  if (period === "Afternoon") return { background: PRIMARY_CONTAINER, color: PRIMARY };
  return { background: SECONDARY_CONTAINER, color: SECONDARY };
};

const getPeriodIcon = (period: MedicinePeriod) => {
  const tone = getPeriodTone(period);
  if (period === "Morning") return <Sunrise size={19} color={tone.color} strokeWidth={2.2} />;
  if (period === "Afternoon") return <Sun size={19} color={tone.color} strokeWidth={2.2} />;
  return <Moon size={19} color={tone.color} strokeWidth={2.2} />;
};

const singularUnit = (unit?: string | null) => {
  const value = unit?.trim().toLowerCase() || "dose";
  const map: Record<string, string> = {
    tablets: "tablet",
    capsules: "capsule",
    puffs: "puff",
    doses: "dose",
    sprays: "spray",
    sachets: "sachet",
    inhalers: "inhaler",
    bottles: "bottle",
    packs: "pack",
  };
  return map[value] || value;
};

const displayUnit = (unit: string, quantity: number) => {
  const value = singularUnit(unit);
  if (quantity === 1 || ["ml", "g", "mg", "mcg"].includes(value)) return value;
  return value.endsWith("s") ? value : `${value}s`;
};

const getDoseAmountText = (medicine: Pick<TodayMedicine, "doseQuantity" | "doseUnit" | "stockUnit">) => {
  const quantity = medicine.doseQuantity ?? 1;
  const unit = singularUnit(medicine.doseUnit || medicine.stockUnit);
  return `${quantity} ${displayUnit(unit, quantity)}`;
};

const ProgressRing = ({ summary }: { summary: TodayMedicineSummary }) => {
  const segments = [
    { key: "taken", count: summary.takenCount, color: SUCCESS },
    { key: "pending", count: summary.pendingCount, color: WARNING },
    { key: "missed", count: summary.missedCount, color: DANGER },
    { key: "snoozed", count: summary.snoozedCount, color: SNOOZED_RING },
  ].filter(item => item.count > 0);

  let accumulated = 0;

  return (
    <View style={styles.progressRing}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS} stroke="rgba(255,255,255,0.25)" strokeWidth={RING_STROKE} fill="none" />

        {summary.totalCount > 0
          ? segments.map(segment => {
              const length = (segment.count / summary.totalCount) * RING_CIRCUMFERENCE;
              const offset = -accumulated;
              accumulated += length;

              return (
                <Circle
                  key={segment.key}
                  cx={RING_CENTER}
                  cy={RING_CENTER}
                  r={RING_RADIUS}
                  stroke={segment.color}
                  strokeWidth={RING_STROKE}
                  fill="none"
                  strokeDasharray={`${length} ${RING_CIRCUMFERENCE - length}`}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  rotation="-90"
                  originX={RING_CENTER}
                  originY={RING_CENTER}
                />
              );
            })
          : null}
      </Svg>

      <View style={styles.progressCenter}>
        <Text style={styles.progressPercentage}>{summary.progressPercentage}%</Text>
        <Text style={styles.progressDone}>Done</Text>
      </View>
    </View>
  );
};

export const MedicinesScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [selectedTab, setSelectedTab] = useState<DateTab>("TODAY");
  const [allMedicines, setAllMedicines] = useState<TodayMedicine[]>([]);
  const [trackedMedicines, setTrackedMedicines] = useState<TrackedMedicine[]>([]);
  const [defaultSnoozeMinutes, setDefaultSnoozeMinutes] = useState<ReminderSettings["defaultSnoozeMinutes"]>(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingReminderId, setActionLoadingReminderId] = useState<string | null>(null);
  const [actionLoadingType, setActionLoadingType] = useState<ActionLoadingType | null>(null);
  const [medicineUpdatesUnread, setMedicineUpdatesUnread] = useState(0);
  const [removalModal, setRemovalModal] = useState<RemovalModalState>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [isSubmittingRemoval, setIsSubmittingRemoval] = useState(false);

  const filteredMedicines = useMemo(() => {
    const allowedDates = getAllowedDates(selectedTab);
    const filtered = allMedicines.filter(item => allowedDates.includes(getMedicineDateKey(item)));

    if (selectedTab !== "WEEK") return sortMedicines(filtered);

    const unique = new Map<string, TodayMedicine>();

    filtered.forEach(item => {
      const key = `${item.reminderId}-${item.timeOfDay}`;
      if (!unique.has(key)) unique.set(key, item);
    });

    return sortMedicines(Array.from(unique.values()));
  }, [allMedicines, selectedTab]);

  const summary = useMemo(() => buildSummary(filteredMedicines), [filteredMedicines]);

  const stockAttention = useMemo(
    () =>
      trackedMedicines.filter(
        medicine =>
          medicine.currentStock === 0 ||
          (medicine.currentStock !== null && medicine.currentStock !== undefined && medicine.isLowStock === true),
      ),
    [trackedMedicines],
  );

  const outOfStockCount = useMemo(() => stockAttention.filter(medicine => medicine.currentStock === 0).length, [stockAttention]);
  const lowStockCount = stockAttention.length - outOfStockCount;

  const loadReviewSummary = useCallback(async () => {
    try {
      const result = await patientMedicineReviewsApi.listReviews();
      setMedicineUpdatesUnread(result.summary?.unread || 0);
    } catch {
      setMedicineUpdatesUnread(0);
    }
  }, []);

  const loadReminderSettings = useCallback(async () => {
    try {
      const result = await patientSettingsApi.getReminderSettings();
      setDefaultSnoozeMinutes(result.settings.defaultSnoozeMinutes);
    } catch {
      return;
    }
  }, []);

  const fetchMedicines = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "initial") => {
      try {
        if (mode === "initial") setIsLoading(true);
        if (mode === "refresh") setIsRefreshing(true);

        const token = await tokenStorage.getToken();

        if (!token) {
          Alert.alert(t("common.sessionExpired"), t("common.pleaseLoginAgain"));
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [todayResponse, allResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/patient/medicines/today`, { headers }),
          fetch(`${API_BASE_URL}/patient/medicines`, { headers }),
        ]);

        const todayResult = await todayResponse.json().catch(() => ({}));
        const allResult = await allResponse.json().catch(() => ({}));

        if (!todayResponse.ok) {
          Alert.alert(t("medicines.unableFetch"), todayResult.message || t("common.pleaseTryAgain"));
          return;
        }

        if (!allResponse.ok) {
          Alert.alert(t("medicines.unableFetch"), allResult.message || t("common.pleaseTryAgain"));
          return;
        }

        setAllMedicines(Array.isArray(todayResult.data?.medicines) ? todayResult.data.medicines : []);
        setTrackedMedicines(Array.isArray(allResult.data) ? allResult.data : []);
      } catch {
        Alert.alert(t("common.networkError"), t("common.unableConnect"));
      } finally {
        if (mode === "initial") setIsLoading(false);
        if (mode === "refresh") setIsRefreshing(false);
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      void fetchMedicines();
      void loadReviewSummary();
      void loadReminderSettings();
    }, [fetchMedicines, loadReviewSummary, loadReminderSettings]),
  );

  const refreshAll = async () => {
    await Promise.all([fetchMedicines("refresh"), loadReviewSummary(), loadReminderSettings()]);
  };

  const openPharmacyRequest = (medicineId: string) => {
    const medicine = trackedMedicines.find(item => item.id === medicineId);

    if (!medicine) {
      Alert.alert("Medicine unavailable", "Unable to open the pharmacy request for this medicine.");
      return;
    }

    navigation.navigate("PharmacyRequest", {
      medicineId: medicine.id,
      medicineName: medicine.name,
      dose: medicine.dose,
      source: medicine.source,
      currentStock: medicine.currentStock,
      stockUnit: medicine.stockUnit,
    });
  };

  const markTaken = async (reminderId: string, medicineId: string) => {
    if (actionLoadingReminderId) return;

    try {
      setActionLoadingReminderId(reminderId);
      setActionLoadingType("TAKEN");

      const token = await tokenStorage.getToken();
      if (!token) throw new Error("Please login again.");

      const response = await fetch(`${API_BASE_URL}/patient/medicine-reminders/${reminderId}/taken`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        Alert.alert("Unable to update medicine", result.message || "Please try again.");
        return;
      }

      await fetchMedicines("silent");

      const updatedStock = result.data?.stock;

      if (updatedStock?.currentStock === 0) {
        Alert.alert("Medicine stock empty", "This dose was recorded as taken. Future reminders are paused until medicine is available.", [
          { text: "Request Medicine", onPress: () => openPharmacyRequest(medicineId) },
          { text: "OK" },
        ]);
      } else if (updatedStock?.isLowStock) {
        Alert.alert("Medicine stock running low", `${updatedStock.currentStock} ${updatedStock.stockUnit || "units"} remaining.`, [
          { text: "Request More", onPress: () => openPharmacyRequest(medicineId) },
          { text: "OK" },
        ]);
      }
    } catch (error) {
      Alert.alert("Unable to update medicine", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setActionLoadingReminderId(null);
      setActionLoadingType(null);
    }
  };

  const snoozeReminder = async (reminderId: string) => {
    if (actionLoadingReminderId) return;

    try {
      setActionLoadingReminderId(reminderId);
      setActionLoadingType("SNOOZE");

      const token = await tokenStorage.getToken();
      if (!token) throw new Error("Please login again.");

      const snoozedUntil = new Date(Date.now() + defaultSnoozeMinutes * 60 * 1000).toISOString();

      const response = await fetch(`${API_BASE_URL}/patient/medicine-reminders/${reminderId}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ snoozedUntil }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        Alert.alert("Unable to snooze reminder", result.message || "Please try again.");
        return;
      }

      await fetchMedicines("silent");
    } catch (error) {
      Alert.alert("Unable to snooze reminder", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setActionLoadingReminderId(null);
      setActionLoadingType(null);
    }
  };

  const openRemovalModal = (medicineId: string, medicineName: string) => {
    setRemovalModal({ medicineId, medicineName });
    setRemovalReason("");
  };

  const closeRemovalModal = () => {
    if (isSubmittingRemoval) return;
    setRemovalModal(null);
  };

  const submitRemoval = async () => {
    if (!removalModal || isSubmittingRemoval) return;

    const reason = removalReason.trim();

    if (reason.length < 3) {
      Alert.alert("Reason required", "Please provide a short reason for removing this medicine.");
      return;
    }

    try {
      setIsSubmittingRemoval(true);

      await patientMedicineReviewsApi.requestDeletion(removalModal.medicineId, reason);

      setRemovalModal(null);
      setRemovalReason("");

      await Promise.all([fetchMedicines("silent"), loadReviewSummary()]);

      Alert.alert("Removal request sent", "Your medicine removal request has been sent for review.");
    } catch (error) {
      Alert.alert("Unable to request removal", error instanceof Error ? error.message : "The request could not be sent.");
    } finally {
      setIsSubmittingRemoval(false);
    }
  };

  const renderAttentionBanner = () => {
    if (stockAttention.length === 0) return null;

    return (
      <View style={styles.attentionBanner}>
        <View style={styles.attentionIcon}>
          <AlertTriangle size={23} color={WARNING} strokeWidth={2.6} />
        </View>

        <View style={styles.attentionTextBlock}>
          <Text style={styles.attentionTitle}>
            {stockAttention.length} {stockAttention.length === 1 ? "medicine needs" : "medicines need"} stock attention
          </Text>

          <Text style={styles.attentionText}>
            {outOfStockCount > 0 ? `${outOfStockCount} out of stock` : ""}
            {outOfStockCount > 0 && lowStockCount > 0 ? "  •  " : ""}
            {lowStockCount > 0 ? `${lowStockCount} low stock` : ""}
          </Text>
        </View>
      </View>
    );
  };

  const renderProgress = () => (
    <View style={styles.progressCard}>
      <View style={styles.progressTop}>
        <View style={styles.progressTextBlock}>
          <Text style={styles.progressKicker}>MEDICATION PLAN</Text>
          <Text style={styles.progressTitle}>{selectedTab === "TODAY" ? "Today's progress" : selectedTab === "TOMORROW" ? "Tomorrow's plan" : "This week"}</Text>
          <Text style={styles.progressSubtitle}>{summary.totalCount === 0 ? "No scheduled reminders" : `${summary.takenCount} of ${summary.totalCount} doses completed`}</Text>
        </View>

        <ProgressRing summary={summary} />
      </View>

      <View style={styles.summaryPanel}>
        <Summary label="Taken" value={summary.takenCount} color={SUCCESS} />
        <SummaryDivider />
        <Summary label="Pending" value={summary.pendingCount} color={WARNING} />
        <SummaryDivider />
        <Summary label="Missed" value={summary.missedCount} color={DANGER} />
        <SummaryDivider />
        <Summary label="Snoozed" value={summary.snoozedCount} color={SNOOZED_RING} />
      </View>
    </View>
  );

  const renderMedicine = (medicine: TodayMedicine, index: number, last: boolean) => {
    const tone = getStatusTone(medicine.status);
    const noStock = medicine.currentStock === 0;
    const lowStock = !noStock && medicine.isLowStock === true;
    const actionLoading = actionLoadingReminderId === medicine.reminderId;
    const canDoseAction = selectedTab === "TODAY" && !noStock && ["PENDING", "SNOOZED", "MISSED"].includes(medicine.status);

    return (
      <View key={`${medicine.reminderId}-${medicine.timeOfDay}-${index}`} style={[styles.medicineRow, last && styles.lastMedicineRow]}>
        <View style={styles.timeBox}>
          <Text style={styles.timeText}>{medicine.timeOfDay}</Text>
          <Text style={styles.timeDue}>DUE</Text>
        </View>

        <View style={styles.medicineContent}>
          <View style={styles.medicineTop}>
            <View style={[styles.medicineIcon, { backgroundColor: tone.background }]}>
              <Pill size={20} color={tone.color} strokeWidth={2.3} />
            </View>

            <View style={styles.medicineTextBlock}>
              <Text style={styles.medicineName}>{medicine.name}</Text>
              <Text style={styles.medicineDose}>{medicine.dose} · {getDoseAmountText(medicine)} each time</Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: tone.background }]}>
              <Text style={[styles.statusText, { color: tone.text }]}>{medicine.status}</Text>
            </View>
          </View>

          <Text style={styles.medicineMeta}>{medicine.instructions?.trim() || `${medicine.frequency.replaceAll("_", " ").toLowerCase()} · ${medicine.timeOfDay}`}</Text>

          {medicine.currentStock !== null && medicine.currentStock !== undefined ? (
            <View style={[styles.stockBadge, noStock ? styles.stockBadgeEmpty : lowStock ? styles.stockBadgeLow : styles.stockBadgeHealthy]}>
              <Package size={14} color={noStock ? DANGER : lowStock ? WARNING : SUCCESS} strokeWidth={2.4} />

              <Text style={[styles.stockBadgeText, { color: noStock ? ON_DANGER_CONTAINER : lowStock ? ON_WARNING_CONTAINER : ON_SUCCESS_CONTAINER }]}>
                {noStock
                  ? "Out of stock · reminders paused"
                  : lowStock
                    ? `Low stock · ${medicine.currentStock} ${medicine.stockUnit || "units"} remaining`
                    : `${medicine.currentStock} ${medicine.stockUnit || "units"} remaining`}
              </Text>
            </View>
          ) : null}

          {noStock ? (
            <TouchableOpacity style={styles.outStockRequestButton} onPress={() => openPharmacyRequest(medicine.medicineId)} activeOpacity={0.84}>
              <ShoppingBag size={17} color={SURFACE} strokeWidth={2.5} />
              <Text style={styles.outStockRequestText}>Request from Pharmacy</Text>
            </TouchableOpacity>
          ) : (
            <>
              {canDoseAction ? (
                <View style={styles.doseActions}>
                  <TouchableOpacity
                    style={[styles.takenButton, (actionLoading || medicine.status === "MISSED") && styles.disabledButton]}
                    disabled={actionLoading || medicine.status === "MISSED"}
                    onPress={() => void markTaken(medicine.reminderId, medicine.medicineId)}
                  >
                    {actionLoading && actionLoadingType === "TAKEN" ? (
                      <ActivityIndicator size="small" color={SURFACE} />
                    ) : (
                      <>
                        <CheckCircle2 size={17} color={SURFACE} strokeWidth={2.3} />
                        <Text style={styles.takenText}>Taken</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.snoozeButton, (actionLoading || medicine.status === "MISSED" || medicine.status === "SNOOZED") && styles.disabledButton]}
                    disabled={actionLoading || medicine.status === "MISSED" || medicine.status === "SNOOZED"}
                    onPress={() => void snoozeReminder(medicine.reminderId)}
                  >
                    {actionLoading && actionLoadingType === "SNOOZE" ? (
                      <ActivityIndicator size="small" color={PRIMARY} />
                    ) : (
                      <>
                        <Clock3 size={17} color={PRIMARY} strokeWidth={2.3} />
                        <Text style={styles.snoozeText}>Snooze</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.managementActions}>
                {lowStock ? (
                  <TouchableOpacity style={styles.requestMoreButton} onPress={() => openPharmacyRequest(medicine.medicineId)} activeOpacity={0.84}>
                    <ShoppingBag size={16} color={ON_WARNING_CONTAINER} strokeWidth={2.5} />
                    <Text style={styles.requestMoreText}>Request More</Text>
                  </TouchableOpacity>
                ) : null}

                {!medicine.deletionReviewPending ? (
                  <TouchableOpacity
                    style={[styles.removeButton, lowStock && styles.flexManagementButton]}
                    onPress={() => openRemovalModal(medicine.medicineId, medicine.name)}
                    activeOpacity={0.84}
                  >
                    <Trash2 size={15} color={ON_DANGER_CONTAINER} strokeWidth={2.4} />
                    <Text style={styles.removeText}>Request Removal</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.reviewPendingButton} onPress={() => navigation.navigate("MedicineUpdates")}>
                    <FileCheck2 size={15} color={ON_WARNING_CONTAINER} strokeWidth={2.4} />
                    <Text style={styles.reviewPendingText}>Removal Pending</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderPeriod = (period: MedicinePeriod) => {
    const medicines = filteredMedicines.filter(item => item.period === period);
    if (medicines.length === 0) return null;

    const tone = getPeriodTone(period);

    return (
      <View style={styles.periodSection} key={period}>
        <View style={styles.periodHeader}>
          <View style={styles.periodHeaderLeft}>
            <View style={[styles.periodIcon, { backgroundColor: tone.background }]}>{getPeriodIcon(period)}</View>
            <Text style={styles.periodTitle}>{period}</Text>
          </View>

          <View style={styles.periodCount}>
            <Text style={styles.periodCountText}>{medicines.length}</Text>
          </View>
        </View>

        <View style={styles.periodCard}>
          {medicines.map((medicine, index) => renderMedicine(medicine, index, index === medicines.length - 1))}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingTitle}>Loading medicines</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Medicines</Text>
            <Text style={styles.headerSubtitle}>Your medication schedule</Text>
          </View>

          <TouchableOpacity style={styles.updatesButton} onPress={() => navigation.navigate("MedicineUpdates")}>
            <FileCheck2 size={21} color={PRIMARY} strokeWidth={2.4} />

            {medicineUpdatesUnread > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{medicineUpdatesUnread > 9 ? "9+" : medicineUpdatesUnread}</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("AddMedicine")}>
            <Plus size={23} color={SURFACE} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 110, 130) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refreshAll()} colors={[PRIMARY]} />}
        >
          {renderAttentionBanner()}
          {renderProgress()}

          <View style={styles.dateTabs}>
            {(["TODAY", "TOMORROW", "WEEK"] as DateTab[]).map(tab => (
              <TouchableOpacity key={tab} style={[styles.dateTab, selectedTab === tab && styles.selectedDateTab]} onPress={() => setSelectedTab(tab)}>
                <Text style={[styles.dateTabText, selectedTab === tab && styles.selectedDateTabText]}>
                  {tab === "TODAY" ? "Today" : tab === "TOMORROW" ? "Tomorrow" : "Week"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredMedicines.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Pill size={31} color={PRIMARY} strokeWidth={2.3} />
              </View>

              <Text style={styles.emptyTitle}>No scheduled medicines</Text>
              <Text style={styles.emptyText}>Medicines with no stock are paused until medicine becomes available.</Text>

              {stockAttention.length === 0 ? (
                <TouchableOpacity style={styles.stockShortcutButton} onPress={() => navigation.navigate("AddMedicine")}>
                  <Plus size={18} color={SURFACE} strokeWidth={2.4} />
                  <Text style={styles.stockShortcutText}>Add Medicine</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <>
              <View style={styles.scheduleHeader}>
                <View>
                  <Text style={styles.scheduleTitle}>Schedule</Text>
                  <Text style={styles.scheduleSubtitle}>
                    {filteredMedicines.length} {filteredMedicines.length === 1 ? "reminder" : "reminders"}
                  </Text>
                </View>

                <View style={styles.scheduleIcon}>
                  <CalendarDays size={20} color={PRIMARY} strokeWidth={2.3} />
                </View>
              </View>

              {renderPeriod("Morning")}
              {renderPeriod("Afternoon")}
              {renderPeriod("Evening")}
            </>
          )}
        </ScrollView>
      </View>

      <Modal visible={Boolean(removalModal)} transparent animationType="fade" onRequestClose={closeRemovalModal}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Request medicine removal</Text>
                <Text style={styles.modalSubtitle}>{removalModal?.medicineName || ""}</Text>
              </View>

              <TouchableOpacity style={styles.modalClose} onPress={closeRemovalModal}>
                <X size={20} color={TEXT} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Why do you want to remove this medicine?</Text>

            <TextInput style={styles.noteInput} value={removalReason} onChangeText={setRemovalReason} placeholder="Enter reason" multiline maxLength={500} textAlignVertical="top" />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeRemovalModal}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.removeConfirmButton, isSubmittingRemoval && styles.disabledButton]} disabled={isSubmittingRemoval} onPress={() => void submitRemoval()}>
                {isSubmittingRemoval ? (
                  <ActivityIndicator color={SURFACE} />
                ) : (
                  <>
                    <Trash2 size={17} color={SURFACE} strokeWidth={2.5} />
                    <Text style={styles.sendText}>Send Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const Summary = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={styles.summaryItem}>
    <View style={[styles.summaryDot, { backgroundColor: color }]} />
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const SummaryDivider = () => <View style={styles.summaryDivider} />;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  loadingContainer: { flex: 1, backgroundColor: BACKGROUND, justifyContent: "center", alignItems: "center" },
  loadingTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 12 },
  header: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center" },
  headerTextBlock: { flex: 1 },
  headerTitle: { color: TEXT, fontSize: 26, fontWeight: "700" },
  headerSubtitle: { color: MUTED, fontSize: 12, fontWeight: "500", marginTop: 3 },
  updatesButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 9, ...elevate(1) },
  unreadBadge: { position: "absolute", right: -2, top: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: DANGER, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  unreadText: { color: SURFACE, fontSize: 8, fontWeight: "700" },
  addButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", ...elevate(1) },
  attentionBanner: { backgroundColor: WARNING_CONTAINER, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", marginBottom: 13, ...elevate(1) },
  attentionIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: "#FFF3DF", alignItems: "center", justifyContent: "center", marginRight: 11 },
  attentionTextBlock: { flex: 1 },
  attentionTitle: { color: ON_WARNING_CONTAINER, fontSize: 13, fontWeight: "700" },
  attentionText: { color: ON_WARNING_CONTAINER, fontSize: 10, fontWeight: "600", marginTop: 3 },
  progressCard: { backgroundColor: PRIMARY, borderRadius: 18, padding: 17, marginBottom: 13, ...elevate(2) },
  progressTop: { flexDirection: "row", alignItems: "center" },
  progressTextBlock: { flex: 1, paddingRight: 8 },
  progressKicker: { color: "#DDE5FF", fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  progressTitle: { color: SURFACE, fontSize: 21, fontWeight: "700", marginTop: 6 },
  progressSubtitle: { color: "#E7ECFF", fontSize: 11, fontWeight: "500", marginTop: 5 },
  progressRing: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" },
  progressCenter: { position: "absolute", alignItems: "center" },
  progressPercentage: { color: SURFACE, fontSize: 20, fontWeight: "700" },
  progressDone: { color: "#DDE5FF", fontSize: 9, fontWeight: "600" },
  summaryPanel: { minHeight: 67, backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 13, flexDirection: "row", alignItems: "center", marginTop: 13 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDot: { width: 7, height: 7, borderRadius: 4, marginBottom: 4 },
  summaryValue: { color: SURFACE, fontSize: 14, fontWeight: "700" },
  summaryLabel: { color: "#E9EDFF", fontSize: 8, fontWeight: "600", marginTop: 2 },
  summaryDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: "rgba(255,255,255,0.25)" },
  dateTabs: { backgroundColor: SURFACE, borderRadius: 14, padding: 5, flexDirection: "row", marginBottom: 14, ...elevate(1) },
  dateTab: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  selectedDateTab: { backgroundColor: PRIMARY_CONTAINER },
  dateTabText: { color: MUTED, fontSize: 11, fontWeight: "700" },
  selectedDateTabText: { color: ON_PRIMARY_CONTAINER },
  emptyCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 24, alignItems: "center", ...elevate(1) },
  emptyIcon: { width: 62, height: 62, borderRadius: 18, backgroundColor: PRIMARY_CONTAINER, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptyText: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, textAlign: "center", marginTop: 5 },
  stockShortcutButton: { minHeight: 44, borderRadius: 12, backgroundColor: PRIMARY, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 15 },
  stockShortcutText: { color: SURFACE, fontSize: 11, fontWeight: "700", marginLeft: 6 },
  scheduleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  scheduleTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  scheduleSubtitle: { color: MUTED, fontSize: 10, fontWeight: "500", marginTop: 3 },
  scheduleIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: PRIMARY_CONTAINER, alignItems: "center", justifyContent: "center" },
  periodSection: { marginBottom: 14 },
  periodHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 7 },
  periodHeaderLeft: { flexDirection: "row", alignItems: "center" },
  periodIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 8 },
  periodTitle: { color: TEXT, fontSize: 13, fontWeight: "700" },
  periodCount: { minWidth: 27, height: 27, borderRadius: 14, backgroundColor: SURFACE_VARIANT, alignItems: "center", justifyContent: "center" },
  periodCountText: { color: MUTED, fontSize: 9, fontWeight: "700" },
  periodCard: { backgroundColor: SURFACE, borderRadius: 15, overflow: "hidden", ...elevate(1) },
  medicineRow: { flexDirection: "row", padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: SURFACE_VARIANT },
  lastMedicineRow: { borderBottomWidth: 0 },
  timeBox: { width: 55, borderRadius: 10, backgroundColor: SOFT_PANEL, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", paddingVertical: 8, marginRight: 9 },
  timeText: { color: TEXT, fontSize: 11, fontWeight: "700" },
  timeDue: { color: MUTED, fontSize: 7, fontWeight: "600", marginTop: 2 },
  medicineContent: { flex: 1 },
  medicineTop: { flexDirection: "row", alignItems: "center" },
  medicineIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 9 },
  medicineTextBlock: { flex: 1, minWidth: 0 },
  medicineName: { color: TEXT, fontSize: 13, fontWeight: "700" },
  medicineDose: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 2 },
  medicineMeta: { color: MUTED, fontSize: 9, fontWeight: "500", lineHeight: 14, marginTop: 8 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5, marginLeft: 6 },
  statusText: { fontSize: 7, fontWeight: "700" },
  stockBadge: { alignSelf: "flex-start", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", alignItems: "center", marginTop: 8 },
  stockBadgeHealthy: { backgroundColor: SUCCESS_CONTAINER },
  stockBadgeLow: { backgroundColor: WARNING_CONTAINER },
  stockBadgeEmpty: { backgroundColor: DANGER_CONTAINER },
  stockBadgeText: { fontSize: 9, fontWeight: "700", marginLeft: 5 },
  doseActions: { flexDirection: "row", marginTop: 10 },
  takenButton: { flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: SUCCESS, flexDirection: "row", alignItems: "center", justifyContent: "center", marginRight: 5 },
  takenText: { color: SURFACE, fontSize: 10, fontWeight: "700", marginLeft: 5 },
  snoozeButton: { flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: PRIMARY_CONTAINER, flexDirection: "row", alignItems: "center", justifyContent: "center", marginLeft: 5 },
  snoozeText: { color: PRIMARY, fontSize: 10, fontWeight: "700", marginLeft: 5 },
  disabledButton: { opacity: 0.45 },
  managementActions: { flexDirection: "row", marginTop: 9 },
  requestMoreButton: { flex: 1, minHeight: 37, borderRadius: 10, backgroundColor: WARNING_CONTAINER, flexDirection: "row", alignItems: "center", justifyContent: "center", marginRight: 5 },
  requestMoreText: { color: ON_WARNING_CONTAINER, fontSize: 9, fontWeight: "700", marginLeft: 5 },
  removeButton: { minHeight: 37, borderRadius: 10, backgroundColor: DANGER_CONTAINER, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  flexManagementButton: { flex: 1, marginLeft: 5 },
  removeText: { color: ON_DANGER_CONTAINER, fontSize: 9, fontWeight: "700", marginLeft: 5 },
  reviewPendingButton: { flex: 1, minHeight: 37, borderRadius: 10, backgroundColor: WARNING_CONTAINER, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  reviewPendingText: { color: ON_WARNING_CONTAINER, fontSize: 9, fontWeight: "700", marginLeft: 5 },
  outStockRequestButton: { minHeight: 43, borderRadius: 11, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 10 },
  outStockRequestText: { color: SURFACE, fontSize: 10, fontWeight: "700", marginLeft: 6 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(27,29,42,0.48)", justifyContent: "center", paddingHorizontal: 18 },
  modalCard: { backgroundColor: SURFACE, borderRadius: 18, padding: 17 },
  modalHeader: { flexDirection: "row", alignItems: "center" },
  modalHeaderText: { flex: 1, paddingRight: 10 },
  modalTitle: { color: TEXT, fontSize: 18, fontWeight: "700" },
  modalSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },
  modalClose: { width: 39, height: 39, borderRadius: 12, backgroundColor: SOFT_PANEL, alignItems: "center", justifyContent: "center" },
  inputLabel: { color: TEXT, fontSize: 11, fontWeight: "700", marginTop: 15, marginBottom: 6 },
  noteInput: { minHeight: 90, borderRadius: 12, borderWidth: 1, borderColor: SURFACE_VARIANT, backgroundColor: SOFT_PANEL, color: TEXT, padding: 12 },
  modalActions: { flexDirection: "row", marginTop: 14 },
  cancelButton: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: SOFT_PANEL, alignItems: "center", justifyContent: "center", marginRight: 6 },
  cancelText: { color: TEXT, fontSize: 12, fontWeight: "700" },
  removeConfirmButton: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: DANGER, flexDirection: "row", alignItems: "center", justifyContent: "center", marginLeft: 6 },
  sendText: { color: SURFACE, fontSize: 11, fontWeight: "700", marginLeft: 6 },
});

export default MedicinesScreen;