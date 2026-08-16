import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, type CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle } from "react-native-svg";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Moon,
  Package,
  Pill,
  Plus,
  RefreshCw,
  Send,
  ShoppingBag,
  Sunrise,
  Sun,
  Trash2,
  X,
} from "lucide-react-native";

import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedTextInput as TextInput } from "../../components/common/LocalizedTextInput";
import { API_BASE_URL } from "../../constants/api";
import { useLanguage } from "../../context/LanguageContext";
import { patientMedicineReviewsApi } from "../../services/patientMedicineReviewsApi";
import { patientPharmacyRefillApi } from "../../services/patientPharmacyRefillApi";
import { patientSettingsApi, type ReminderSettings } from "../../services/patientSettingsApi";
import { tokenStorage } from "../../services/tokenStorage";
import type { PatientTabParamList, RootStackParamList } from "../../types/navigation";

type MedicinesScreenProps = CompositeScreenProps<
  BottomTabScreenProps<PatientTabParamList, "Medicines">,
  NativeStackScreenProps<RootStackParamList>
>;

type MedicineStatus = "PENDING" | "TAKEN" | "MISSED" | "SNOOZED";
type DateTab = "TODAY" | "TOMORROW" | "WEEK";
type MedicinePeriod = "Morning" | "Afternoon" | "Evening";
type ActionLoadingType = "TAKEN" | "SNOOZE";

type TodayMedicine = {
  medicineId: string;
  reminderId: string;
  name: string;
  dose: string;
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

type TodayMedicineSummary = {
  totalCount: number;
  takenCount: number;
  pendingCount: number;
  missedCount: number;
  snoozedCount: number;
  progressPercentage: number;
};

type TodayMedicineResponse = {
  summary: TodayMedicineSummary;
  medicines: TodayMedicine[];
};

type TrackedMedicine = {
  id: string;
  name: string;
  dose: string;
  instructions?: string | null;
  source: string;
  isActive: boolean;
  hasMedicineOnHand?: boolean | null;
  currentStock?: number | null;
  stockUnit?: string | null;
  lowStockThreshold?: number | null;
  isLowStock?: boolean;
  deletionReviewPending?: boolean;
  pendingDeletionRequestId?: string | null;
  reminders: {
    id: string;
    frequency: string;
    customFrequency?: string | null;
    timeOfDay: string;
    isActive: boolean;
  }[];
};

type RemovalModalState = {
  medicineId: string;
  medicineName: string;
} | null;

type RefillModalState = {
  medicineId: string;
  medicineName: string;
  dose: string;
  source: string;
  currentStock?: number | null;
  stockUnit?: string | null;
} | null;

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
const DISABLED_CONTAINER = "#E5E7EC";
const DISABLED_TEXT = "#969AA5";
const SNOOZED_RING = "#A9B8F3";

const PROGRESS_RING_SIZE = 108;
const PROGRESS_RING_STROKE = 10;
const PROGRESS_RING_RADIUS = 43;
const PROGRESS_RING_CENTER = PROGRESS_RING_SIZE / 2;
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS;

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: TEXT,
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: { width: 0, height: level * 0.8 },
});

const getDateKeyFromOffset = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeDateKey = (dateValue?: string | null) => {
  if (!dateValue) return "";
  const value = String(dateValue).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMedicineDateKey = (medicine: TodayMedicine) =>
  normalizeDateKey(medicine.scheduledFor) ||
  normalizeDateKey(medicine.scheduledDate) ||
  normalizeDateKey(medicine.reminderDate) ||
  normalizeDateKey(medicine.date) ||
  normalizeDateKey(medicine.startDate);

const getAllowedDateKeys = (tab: DateTab) => {
  if (tab === "TODAY") return [getDateKeyFromOffset(0)];
  if (tab === "TOMORROW") return [getDateKeyFromOffset(1)];
  return Array.from({ length: 7 }, (_, index) => getDateKeyFromOffset(index));
};

const getTimeMinutes = (time?: string | null) => {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return Number.MAX_SAFE_INTEGER;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return Number.MAX_SAFE_INTEGER;
  }

  return hour * 60 + minute;
};

const getDateSortValue = (medicine: TodayMedicine) => {
  const dateKey = getMedicineDateKey(medicine);
  if (!dateKey) return 0;
  const parsed = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const sortMedicinesBySchedule = (medicines: TodayMedicine[]) =>
  medicines
    .map((medicine, index) => ({ medicine, index }))
    .sort((first, second) => {
      const dateDifference = getDateSortValue(first.medicine) - getDateSortValue(second.medicine);
      if (dateDifference !== 0) return dateDifference;

      const timeDifference = getTimeMinutes(first.medicine.timeOfDay) - getTimeMinutes(second.medicine.timeOfDay);
      return timeDifference !== 0 ? timeDifference : first.index - second.index;
    })
    .map(item => item.medicine);

const buildSummaryFromMedicines = (medicines: TodayMedicine[]): TodayMedicineSummary => {
  const totalCount = medicines.length;
  const takenCount = medicines.filter(medicine => medicine.status === "TAKEN").length;
  const pendingCount = medicines.filter(medicine => medicine.status === "PENDING").length;
  const missedCount = medicines.filter(medicine => medicine.status === "MISSED").length;
  const snoozedCount = medicines.filter(medicine => medicine.status === "SNOOZED").length;

  return {
    totalCount,
    takenCount,
    pendingCount,
    missedCount,
    snoozedCount,
    progressPercentage: totalCount === 0 ? 0 : Math.round((takenCount / totalCount) * 100),
  };
};

type Translate = ReturnType<typeof useLanguage>["t"];

const getFrequencyLabel = (frequency: string, t: Translate) => {
  if (frequency === "ONCE_DAILY") return t("medicines.onceDaily");
  if (frequency === "TWICE_DAILY") return t("medicines.twiceDaily");
  if (frequency === "THREE_TIMES_DAILY") return t("medicines.threeDaily");
  if (frequency === "FOUR_TIMES_DAILY") return t("medicines.fourDaily");
  if (frequency === "AS_NEEDED") return t("medicines.asNeeded");
  if (frequency === "CUSTOM") return t("medicines.customSchedule");
  return frequency;
};

const getStatusLabel = (status: MedicineStatus, t: Translate) => {
  if (status === "TAKEN") return t("common.taken");
  if (status === "PENDING") return t("common.pending");
  if (status === "MISSED") return t("common.missed");
  if (status === "SNOOZED") return t("common.snoozed");
  return status;
};

const getProgressTitle = (tab: DateTab, t: Translate) => {
  if (tab === "TODAY") return t("medicines.todayProgress");
  if (tab === "TOMORROW") return t("medicines.tomorrowPlan");
  return t("medicines.thisWeek");
};

const getHeaderSubtitle = (tab: DateTab, t: Translate) => {
  if (tab === "TODAY") return t("medicines.trackToday");
  if (tab === "TOMORROW") return t("medicines.planTomorrow");
  return t("medicines.reviewWeek");
};

const getEmptyTitle = (tab: DateTab, t: Translate) => {
  if (tab === "TODAY") return t("medicines.noToday");
  if (tab === "TOMORROW") return t("medicines.noTomorrow");
  return t("medicines.noWeek");
};

const getPeriodLabel = (period: MedicinePeriod, t: Translate) => {
  if (period === "Morning") return t("common.morning");
  if (period === "Afternoon") return t("common.afternoon");
  return t("common.evening");
};

const getCardKey = (medicine: TodayMedicine, index: number) =>
  `${medicine.medicineId}-${medicine.reminderId}-${getMedicineDateKey(medicine)}-${medicine.timeOfDay}-${index}`;

const getStatusTone = (status: MedicineStatus) => {
  if (status === "TAKEN") return { background: SUCCESS_CONTAINER, text: ON_SUCCESS_CONTAINER, dot: SUCCESS, iconColor: SUCCESS };
  if (status === "PENDING") return { background: WARNING_CONTAINER, text: ON_WARNING_CONTAINER, dot: WARNING, iconColor: WARNING };
  if (status === "MISSED") return { background: DANGER_CONTAINER, text: ON_DANGER_CONTAINER, dot: DANGER, iconColor: DANGER };
  return { background: PRIMARY_CONTAINER, text: ON_PRIMARY_CONTAINER, dot: PRIMARY, iconColor: PRIMARY };
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

const getStockText = (medicine: Pick<TrackedMedicine, "currentStock" | "stockUnit">) => {
  if (medicine.currentStock === null || medicine.currentStock === undefined) return "Stock not recorded";

  const unit = medicine.stockUnit?.trim() || "units";
  if (medicine.currentStock === 0) return "No medicine available";

  return `${medicine.currentStock} ${unit} remaining`;
};

const ProgressRing = ({ summary, progress }: { summary: TodayMedicineSummary; progress: number }) => {
  const { t } = useLanguage();
  const total = summary.totalCount;

  const segments = [
    { key: "taken", count: summary.takenCount, color: SUCCESS },
    { key: "pending", count: summary.pendingCount, color: WARNING },
    { key: "missed", count: summary.missedCount, color: DANGER },
    { key: "snoozed", count: summary.snoozedCount, color: SNOOZED_RING },
  ].filter(segment => segment.count > 0);

  let accumulatedLength = 0;

  return (
    <View style={styles.progressRingContainer}>
      <Svg width={PROGRESS_RING_SIZE} height={PROGRESS_RING_SIZE} viewBox={`0 0 ${PROGRESS_RING_SIZE} ${PROGRESS_RING_SIZE}`}>
        <Circle
          cx={PROGRESS_RING_CENTER}
          cy={PROGRESS_RING_CENTER}
          r={PROGRESS_RING_RADIUS}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={PROGRESS_RING_STROKE}
          fill="none"
        />

        {total > 0
          ? segments.map(segment => {
              const segmentLength = (segment.count / total) * PROGRESS_RING_CIRCUMFERENCE;
              const strokeDashoffset = -accumulatedLength;
              accumulatedLength += segmentLength;

              return (
                <Circle
                  key={segment.key}
                  cx={PROGRESS_RING_CENTER}
                  cy={PROGRESS_RING_CENTER}
                  r={PROGRESS_RING_RADIUS}
                  stroke={segment.color}
                  strokeWidth={PROGRESS_RING_STROKE}
                  fill="none"
                  strokeDasharray={`${segmentLength} ${PROGRESS_RING_CIRCUMFERENCE - segmentLength}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  originX={PROGRESS_RING_CENTER}
                  originY={PROGRESS_RING_CENTER}
                />
              );
            })
          : null}
      </Svg>

      <View style={styles.progressRingCenter}>
        <Text style={styles.progressPercentage}>{progress}%</Text>
        <Text style={styles.progressCenterLabel}>{t("medicines.done")}</Text>
      </View>
    </View>
  );
};

export const MedicinesScreen = ({ navigation }: MedicinesScreenProps) => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [defaultSnoozeMinutes, setDefaultSnoozeMinutes] = useState<ReminderSettings["defaultSnoozeMinutes"]>(10);
  const [selectedTab, setSelectedTab] = useState<DateTab>("TODAY");
  const [allMedicines, setAllMedicines] = useState<TodayMedicine[]>([]);
  const [trackedMedicines, setTrackedMedicines] = useState<TrackedMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingReminderId, setActionLoadingReminderId] = useState<string | null>(null);
  const [actionLoadingType, setActionLoadingType] = useState<ActionLoadingType | null>(null);
  const [medicineUpdatesUnread, setMedicineUpdatesUnread] = useState(0);

  const [removalModal, setRemovalModal] = useState<RemovalModalState>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [isSubmittingRemoval, setIsSubmittingRemoval] = useState(false);

  const [refillModal, setRefillModal] = useState<RefillModalState>(null);
  const [refillQuantity, setRefillQuantity] = useState("1");
  const [refillUnit, setRefillUnit] = useState("pack");
  const [refillNote, setRefillNote] = useState("");
  const [isSubmittingRefill, setIsSubmittingRefill] = useState(false);

  const filteredMedicines = useMemo(() => {
    const allowedDateKeys = getAllowedDateKeys(selectedTab);

    const dateFiltered = allMedicines.filter(medicine => allowedDateKeys.includes(getMedicineDateKey(medicine)));

    if (selectedTab !== "WEEK") return sortMedicinesBySchedule(dateFiltered);

    const uniqueReminderMap = new Map<string, TodayMedicine>();

    dateFiltered.forEach(medicine => {
      const key = `${medicine.reminderId}-${medicine.timeOfDay}`;
      if (!uniqueReminderMap.has(key)) uniqueReminderMap.set(key, medicine);
    });

    return sortMedicinesBySchedule(Array.from(uniqueReminderMap.values()));
  }, [allMedicines, selectedTab]);

  const summary = useMemo(() => buildSummaryFromMedicines(filteredMedicines), [filteredMedicines]);

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

        const [todayResponse, medicinesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/patient/medicines/today`, { method: "GET", headers }),
          fetch(`${API_BASE_URL}/patient/medicines`, { method: "GET", headers }),
        ]);

        let todayResult: any = {};
        let medicinesResult: any = {};

        try {
          todayResult = await todayResponse.json();
        } catch {
          todayResult = {};
        }

        try {
          medicinesResult = await medicinesResponse.json();
        } catch {
          medicinesResult = {};
        }

        if (!todayResponse.ok) {
          Alert.alert(t("medicines.unableFetch"), todayResult.message || t("common.pleaseTryAgain"));
          return;
        }

        if (!medicinesResponse.ok) {
          Alert.alert(t("medicines.unableFetch"), medicinesResult.message || t("common.pleaseTryAgain"));
          return;
        }

        const todayData: TodayMedicineResponse = todayResult.data;

        setAllMedicines(Array.isArray(todayData?.medicines) ? todayData.medicines : []);
        setTrackedMedicines(Array.isArray(medicinesResult.data) ? medicinesResult.data : []);
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
      void fetchMedicines("initial");
      void loadReviewSummary();
      void loadReminderSettings();
    }, [fetchMedicines, loadReviewSummary, loadReminderSettings]),
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchMedicines("refresh"), loadReviewSummary(), loadReminderSettings()]);
  }, [fetchMedicines, loadReviewSummary, loadReminderSettings]);

  const markTaken = async (reminderId: string) => {
    if (actionLoadingReminderId) return;

    try {
      setActionLoadingReminderId(reminderId);
      setActionLoadingType("TAKEN");

      const token = await tokenStorage.getToken();

      if (!token) {
        Alert.alert(t("common.sessionExpired"), t("common.pleaseLoginAgain"));
        return;
      }

      const response = await fetch(`${API_BASE_URL}/patient/medicine-reminders/${reminderId}/taken`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      let result: any = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        Alert.alert(t("medicines.unableUpdate"), result.message || t("common.pleaseTryAgain"));
        return;
      }

      setAllMedicines(current =>
        current.map(medicine =>
          medicine.reminderId === reminderId
            ? { ...medicine, status: "TAKEN", takenAt: new Date().toISOString(), snoozedUntil: null }
            : medicine,
        ),
      );

      await fetchMedicines("silent");

      if (result.data?.stock?.currentStock === 0) {
        Alert.alert(
          "Medicine stock empty",
          "This dose was recorded as taken. Your recorded stock is now empty and future reminders are paused until medicine is available.",
        );
      }
    } catch {
      Alert.alert(t("common.networkError"), t("common.unableConnect"));
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

      if (!token) {
        Alert.alert(t("common.sessionExpired"), t("common.pleaseLoginAgain"));
        return;
      }

      const snoozedUntil = new Date(Date.now() + defaultSnoozeMinutes * 60 * 1000).toISOString();

      const response = await fetch(`${API_BASE_URL}/patient/medicine-reminders/${reminderId}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ snoozedUntil }),
      });

      let result: any = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        Alert.alert(t("medicines.unableSnooze"), result.message || t("common.pleaseTryAgain"));
        return;
      }

      setAllMedicines(current =>
        current.map(medicine =>
          medicine.reminderId === reminderId ? { ...medicine, status: "SNOOZED", snoozedUntil } : medicine,
        ),
      );

      await fetchMedicines("silent");
    } catch {
      Alert.alert(t("common.networkError"), t("common.unableConnect"));
    } finally {
      setActionLoadingReminderId(null);
      setActionLoadingType(null);
    }
  };

  const openRemovalModal = (medicineId: string, medicineName: string, deletionReviewPending?: boolean) => {
    if (deletionReviewPending) {
      navigation.navigate("MedicineUpdates");
      return;
    }

    setRemovalModal({ medicineId, medicineName });
    setRemovalReason("");
  };

  const closeRemovalModal = () => {
    if (isSubmittingRemoval) return;
    setRemovalModal(null);
    setRemovalReason("");
  };

  const submitRemovalRequest = async () => {
    if (!removalModal || isSubmittingRemoval) return;

    const reason = removalReason.trim();

    if (reason.length < 3) {
      Alert.alert(t("medicines.reasonRequired"), t("medicines.reasonRequiredText"));
      return;
    }

    try {
      setIsSubmittingRemoval(true);

      await patientMedicineReviewsApi.requestDeletion(removalModal.medicineId, reason);
      const medicineName = removalModal.medicineName;

      setRemovalModal(null);
      setRemovalReason("");

      await Promise.all([fetchMedicines("silent"), loadReviewSummary()]);

      Alert.alert(
        t("medicines.removalSentTitle"),
        t("medicines.removalSentText", { medicine: medicineName }),
        [
          { text: t("medicines.viewUpdates"), onPress: () => navigation.navigate("MedicineUpdates") },
          { text: t("common.ok") },
        ],
      );
    } catch (error) {
      Alert.alert(
        t("medicines.unableRequestRemoval"),
        error instanceof Error ? error.message : t("medicines.removalRequestFailed"),
      );
    } finally {
      setIsSubmittingRemoval(false);
    }
  };

  const openRefillModal = (medicine: TrackedMedicine) => {
    setRefillModal({
      medicineId: medicine.id,
      medicineName: medicine.name,
      dose: medicine.dose,
      source: medicine.source,
      currentStock: medicine.currentStock,
      stockUnit: medicine.stockUnit,
    });

    setRefillQuantity("1");
    setRefillUnit(medicine.stockUnit?.trim() || "pack");
    setRefillNote("");
  };

  const closeRefillModal = () => {
    if (isSubmittingRefill) return;
    setRefillModal(null);
    setRefillQuantity("1");
    setRefillUnit("pack");
    setRefillNote("");
  };

  const submitRefillRequest = async () => {
    if (!refillModal || isSubmittingRefill) return;

    const quantity = Number.parseInt(refillQuantity.trim(), 10);
    const unit = refillUnit.trim();

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      Alert.alert("Invalid quantity", "Enter a quantity between 1 and 1000.");
      return;
    }

    if (!unit) {
      Alert.alert("Unit required", "Enter a unit, for example pack, tablets, capsules or doses.");
      return;
    }

    try {
      setIsSubmittingRefill(true);

      const result = await patientPharmacyRefillApi.createRefill({
        medicineId: refillModal.medicineId,
        requestedQuantity: quantity,
        quantityUnit: unit,
        note: refillNote.trim() || undefined,
      });

      setRefillModal(null);
      setRefillQuantity("1");
      setRefillUnit("pack");
      setRefillNote("");

      Alert.alert(
        "Request sent",
        result.requiresPharmacyVerification
          ? `${refillModal.medicineName} was sent to ${result.pharmacy.pharmacyName}. Pharmacy staff must verify this patient-requested medicine before fulfilment.`
          : `${refillModal.medicineName} was sent to ${result.pharmacy.pharmacyName}.`,
        [
          { text: "View Orders", onPress: () => navigation.navigate("PatientOrders") },
          { text: t("common.ok") },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Unable to request medicine",
        error instanceof Error ? error.message : "The pharmacy request could not be sent.",
      );
    } finally {
      setIsSubmittingRefill(false);
    }
  };

  const getMedicineMetaText = (medicine: TodayMedicine) => {
    const frequency =
      medicine.instructions?.trim() ||
      (medicine.frequency === "CUSTOM"
        ? medicine.customFrequency || t("medicines.customSchedule")
        : getFrequencyLabel(medicine.frequency, t));

    const dateKey = getMedicineDateKey(medicine);
    return selectedTab === "WEEK" && dateKey
      ? `${dateKey} · ${medicine.timeOfDay} · ${frequency}`
      : `${medicine.timeOfDay} · ${frequency}`;
  };

  const renderDateTab = (tab: DateTab, label: string) => {
    const selected = selectedTab === tab;

    return (
      <TouchableOpacity
        key={tab}
        style={[styles.dateTab, selected && styles.activeDateTab]}
        onPress={() => setSelectedTab(tab)}
        activeOpacity={0.82}
      >
        <Text style={[styles.dateTabText, selected && styles.activeDateTabText]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderProgressCard = () => (
    <View style={styles.progressCard}>
      <View style={styles.progressTopRow}>
        <View style={styles.progressTextBlock}>
          <Text style={styles.progressKicker}>{t("medicines.medicationPlan")}</Text>
          <Text style={styles.progressTitle}>{getProgressTitle(selectedTab, t)}</Text>
          <Text style={styles.progressSubtitle}>
            {summary.totalCount === 0
              ? t("medicines.noReminders")
              : t("medicines.dosesCompleted", { taken: summary.takenCount, total: summary.totalCount })}
          </Text>
        </View>

        <ProgressRing summary={summary} progress={Number.isFinite(summary.progressPercentage) ? summary.progressPercentage : 0} />
      </View>

      <View style={styles.summaryPanel}>
        <SummaryMetric label={t("common.taken")} value={summary.takenCount} color={SUCCESS} />
        <View style={styles.summaryDivider} />
        <SummaryMetric label={t("common.pending")} value={summary.pendingCount} color={WARNING} />
        <View style={styles.summaryDivider} />
        <SummaryMetric label={t("common.missed")} value={summary.missedCount} color={DANGER} />
        <View style={styles.summaryDivider} />
        <SummaryMetric label={t("common.snoozed")} value={summary.snoozedCount} color={SNOOZED_RING} />
      </View>
    </View>
  );

  const renderStatusBadge = (status: MedicineStatus) => {
    const tone = getStatusTone(status);

    return (
      <View style={[styles.statusBadge, { backgroundColor: tone.background }]}>
        <View style={[styles.statusBadgeDot, { backgroundColor: tone.dot }]} />
        <Text style={[styles.statusBadgeText, { color: tone.text }]}>{getStatusLabel(status, t)}</Text>
      </View>
    );
  };

  const renderMedicineRow = (medicine: TodayMedicine, index: number, isLast: boolean) => {
    const isMissed = medicine.status === "MISSED";
    const isSnoozed = medicine.status === "SNOOZED";
    const tone = getStatusTone(medicine.status);

    const shouldShowDoseActions =
      selectedTab === "TODAY" &&
      (medicine.status === "PENDING" || medicine.status === "SNOOZED" || medicine.status === "MISSED");

    const actionLoading = actionLoadingReminderId === medicine.reminderId;
    const taking = actionLoading && actionLoadingType === "TAKEN";
    const snoozing = actionLoading && actionLoadingType === "SNOOZE";

    return (
      <View key={getCardKey(medicine, index)} style={[styles.medicineRow, isLast && styles.lastMedicineRow]}>
        <View style={styles.timeColumn}>
          <View style={styles.timeBox}>
            <Text style={styles.medicineTime}>{medicine.timeOfDay}</Text>
            <Text style={styles.timeLabel}>{t("common.due")}</Text>
          </View>
        </View>

        <View style={styles.medicineContent}>
          <View style={styles.medicineTopRow}>
            <View style={[styles.medicineIconBox, { backgroundColor: tone.background }]}>
              <Pill size={20} color={tone.iconColor} strokeWidth={2.2} />
            </View>

            <View style={styles.medicineTextBlock}>
              <Text style={styles.medicineName} numberOfLines={1}>{medicine.name}</Text>
              <Text style={styles.medicineDose} numberOfLines={1}>{medicine.dose}</Text>
            </View>

            {renderStatusBadge(medicine.status)}
          </View>

          <Text style={styles.medicineMeta} numberOfLines={2}>{getMedicineMetaText(medicine)}</Text>

          {medicine.currentStock !== null && medicine.currentStock !== undefined ? (
            <View
              style={[
                styles.inlineStockBadge,
                medicine.currentStock === 0
                  ? styles.inlineStockEmpty
                  : medicine.isLowStock
                    ? styles.inlineStockLow
                    : styles.inlineStockAvailable,
              ]}
            >
              <Package
                size={14}
                color={medicine.currentStock === 0 ? DANGER : medicine.isLowStock ? WARNING : SUCCESS}
                strokeWidth={2.4}
              />

              <Text
                style={[
                  styles.inlineStockText,
                  {
                    color:
                      medicine.currentStock === 0
                        ? ON_DANGER_CONTAINER
                        : medicine.isLowStock
                          ? ON_WARNING_CONTAINER
                          : ON_SUCCESS_CONTAINER,
                  },
                ]}
              >
                {medicine.currentStock === 0
                  ? "No medicine available"
                  : `${medicine.currentStock} ${medicine.stockUnit || "units"} remaining`}
              </Text>
            </View>
          ) : null}

          {medicine.deletionReviewPending ? (
            <TouchableOpacity style={styles.removalPendingPanel} onPress={() => navigation.navigate("MedicineUpdates")} activeOpacity={0.84}>
              <Clock3 size={17} color={ON_WARNING_CONTAINER} strokeWidth={2.5} />

              <View style={styles.removalPendingTextBlock}>
                <Text style={styles.removalPendingTitle}>{t("medicines.removalPendingTitle")}</Text>
                <Text style={styles.removalPendingText}>{t("medicines.removalPendingText")}</Text>
              </View>

              <FileCheck2 size={18} color={ON_WARNING_CONTAINER} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : null}

          {shouldShowDoseActions ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.takenButton, (actionLoading || isMissed) && styles.disabledButton]}
                disabled={actionLoading || isMissed}
                onPress={() => void markTaken(medicine.reminderId)}
                activeOpacity={0.82}
              >
                {taking ? (
                  <ActivityIndicator size="small" color={SURFACE} />
                ) : (
                  <>
                    <CheckCircle2 size={17} color={isMissed ? DISABLED_TEXT : SURFACE} strokeWidth={2.2} />
                    <Text style={[styles.takenButtonText, isMissed && styles.disabledActionText]}>{t("common.taken")}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.snoozeButton, (actionLoading || isMissed || isSnoozed) && styles.disabledButton]}
                disabled={actionLoading || isMissed || isSnoozed}
                onPress={() => void snoozeReminder(medicine.reminderId)}
                activeOpacity={0.82}
              >
                {snoozing ? (
                  <ActivityIndicator size="small" color={ON_PRIMARY_CONTAINER} />
                ) : (
                  <>
                    <Clock3 size={17} color={isMissed || isSnoozed ? DISABLED_TEXT : ON_PRIMARY_CONTAINER} strokeWidth={2.2} />
                    <Text style={[styles.snoozeButtonText, (isMissed || isSnoozed) && styles.disabledActionText]}>
                      {t("common.snooze")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {!medicine.deletionReviewPending ? (
            <TouchableOpacity
              style={styles.removeMedicineButton}
              activeOpacity={0.84}
              onPress={() => openRemovalModal(medicine.medicineId, medicine.name, medicine.deletionReviewPending)}
              disabled={actionLoading}
            >
              <Trash2 size={16} color={ON_DANGER_CONTAINER} strokeWidth={2.4} />
              <Text style={styles.removeMedicineButtonText}>{t("medicines.requestRemoval")}</Text>
            </TouchableOpacity>
          ) : null}

          {isMissed ? (
            <View style={styles.missedHelpPanel}>
              <Text style={styles.missedHelpText}>{t("medicines.missedHelp")}</Text>
            </View>
          ) : null}

          {isSnoozed ? (
            <View style={styles.snoozedHelpPanel}>
              <Text style={styles.snoozedHelpText}>{t("medicines.snoozedHelp")}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderPeriodSection = (period: MedicinePeriod) => {
    const periodMedicines = filteredMedicines.filter(medicine => medicine.period === period);
    if (periodMedicines.length === 0) return null;

    const tone = getPeriodTone(period);

    return (
      <View key={period} style={styles.periodSection}>
        <View style={styles.periodHeader}>
          <View style={styles.periodHeaderLeft}>
            <View style={[styles.periodIconBox, { backgroundColor: tone.background }]}>{getPeriodIcon(period)}</View>
            <Text style={styles.periodTitle}>{getPeriodLabel(period, t)}</Text>
          </View>

          <View style={styles.periodCountBadge}>
            <Text style={styles.periodCountText}>{periodMedicines.length}</Text>
          </View>
        </View>

        <View style={styles.periodPanel}>
          {periodMedicines.map((medicine, index) =>
            renderMedicineRow(medicine, index, index === periodMedicines.length - 1),
          )}
        </View>
      </View>
    );
  };

  const renderStockSection = () => (
    <View style={styles.stockSection}>
      <View style={styles.stockSectionHeader}>
        <View style={styles.stockSectionIcon}>
          <Package size={21} color={SUCCESS} strokeWidth={2.5} />
        </View>

        <View style={styles.stockSectionText}>
          <Text style={styles.stockSectionTitle}>Medicine stock & pharmacy</Text>
          <Text style={styles.stockSectionSubtitle}>Track availability and request medicine only when you choose.</Text>
        </View>
      </View>

      {trackedMedicines.length === 0 ? (
        <View style={styles.stockEmptyPanel}>
          <Package size={24} color={MUTED} strokeWidth={2.3} />
          <Text style={styles.stockEmptyTitle}>No medicines to track</Text>
          <Text style={styles.stockEmptyText}>Add a medicine to start tracking your available stock.</Text>
        </View>
      ) : (
        trackedMedicines.map(medicine => {
          const stockUnknown = medicine.currentStock === null || medicine.currentStock === undefined;
          const noStock = !stockUnknown && medicine.currentStock === 0;
          const lowStock = !noStock && medicine.isLowStock === true;
          const activeReminders = medicine.reminders.filter(reminder => reminder.isActive).length;

          return (
            <View key={medicine.id} style={styles.stockCard}>
              <View style={styles.stockCardTop}>
                <View
                  style={[
                    styles.stockMedicineIcon,
                    noStock ? styles.stockMedicineIconEmpty : lowStock ? styles.stockMedicineIconLow : styles.stockMedicineIconAvailable,
                  ]}
                >
                  <Pill
                    size={21}
                    color={noStock ? DANGER : lowStock ? WARNING : SUCCESS}
                    strokeWidth={2.4}
                  />
                </View>

                <View style={styles.stockMedicineText}>
                  <Text style={styles.stockMedicineName} numberOfLines={1}>{medicine.name}</Text>
                  <Text style={styles.stockMedicineDose}>{medicine.dose}</Text>
                </View>

                <View
                  style={[
                    styles.stockStateBadge,
                    noStock ? styles.stockStateEmpty : lowStock ? styles.stockStateLow : styles.stockStateAvailable,
                  ]}
                >
                  <Text
                    style={[
                      styles.stockStateText,
                      { color: noStock ? ON_DANGER_CONTAINER : lowStock ? ON_WARNING_CONTAINER : ON_SUCCESS_CONTAINER },
                    ]}
                  >
                    {stockUnknown ? "Not recorded" : noStock ? "No stock" : lowStock ? "Low stock" : "Available"}
                  </Text>
                </View>
              </View>

              <View style={styles.stockDetailsRow}>
                <View style={styles.stockDetail}>
                  <Text style={styles.stockDetailLabel}>CURRENT STOCK</Text>
                  <Text style={styles.stockDetailValue}>{getStockText(medicine)}</Text>
                </View>

                <View style={styles.stockDetailDivider} />

                <View style={styles.stockDetail}>
                  <Text style={styles.stockDetailLabel}>REMINDERS</Text>
                  <Text style={styles.stockDetailValue}>
                    {activeReminders > 0 ? `${activeReminders} active` : noStock ? "Waiting for medicine" : "Inactive"}
                  </Text>
                </View>
              </View>

              {medicine.lowStockThreshold !== null && medicine.lowStockThreshold !== undefined ? (
                <Text style={styles.thresholdText}>
                  Low-stock warning: {medicine.lowStockThreshold} {medicine.stockUnit || "units"}
                </Text>
              ) : null}

              {noStock ? (
                <View style={styles.waitingStockPanel}>
                  <AlertTriangle size={17} color={WARNING} strokeWidth={2.5} />
                  <Text style={styles.waitingStockText}>
                    Reminders are paused because recorded stock is empty. No pharmacy request is sent automatically.
                  </Text>
                </View>
              ) : null}

              <View style={styles.stockActions}>
                <TouchableOpacity
                  style={styles.requestPharmacyButton}
                  onPress={() => openRefillModal(medicine)}
                  activeOpacity={0.84}
                >
                  <ShoppingBag size={17} color={SURFACE} strokeWidth={2.5} />
                  <Text style={styles.requestPharmacyButtonText}>
                    {noStock ? "Request from Pharmacy" : "Request More"}
                  </Text>
                </TouchableOpacity>

                {!medicine.deletionReviewPending ? (
                  <TouchableOpacity
                    style={styles.stockRemoveButton}
                    onPress={() => openRemovalModal(medicine.id, medicine.name, medicine.deletionReviewPending)}
                    activeOpacity={0.84}
                  >
                    <Trash2 size={16} color={ON_DANGER_CONTAINER} strokeWidth={2.4} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.stockUpdatesButton}
                    onPress={() => navigation.navigate("MedicineUpdates")}
                    activeOpacity={0.84}
                  >
                    <FileCheck2 size={16} color={ON_WARNING_CONTAINER} strokeWidth={2.4} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top", "bottom"]}>
        <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

        <View style={styles.loadingPanel}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingTitle}>{t("medicines.loadingTitle")}</Text>
          <Text style={styles.loadingText}>{t("medicines.loadingText")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>{t("medicines.title")}</Text>
            <Text style={styles.headerSubtitle}>{getHeaderSubtitle(selectedTab, t)}</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.updatesButton} onPress={() => navigation.navigate("MedicineUpdates")} activeOpacity={0.82}>
              <FileCheck2 size={21} color={PRIMARY} strokeWidth={2.4} />

              {medicineUpdatesUnread > 0 ? (
                <View style={styles.updatesBadge}>
                  <Text style={styles.updatesBadgeText}>{medicineUpdatesUnread > 9 ? "9+" : medicineUpdatesUnread}</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("AddMedicine")} activeOpacity={0.82}>
              <Plus size={23} color={SURFACE} strokeWidth={2.3} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(36, insets.bottom + 112) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refreshAll()}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        >
          {renderProgressCard()}

          <TouchableOpacity style={styles.updatesPanel} activeOpacity={0.84} onPress={() => navigation.navigate("MedicineUpdates")}>
            <View style={styles.updatesPanelIcon}>
              <FileCheck2 size={22} color={PRIMARY} strokeWidth={2.5} />
            </View>

            <View style={styles.updatesPanelTextBlock}>
              <Text style={styles.updatesPanelTitle}>{t("medicines.updatesTitle")}</Text>
              <Text style={styles.updatesPanelText}>{t("medicines.updatesText")}</Text>
            </View>

            {medicineUpdatesUnread > 0 ? (
              <View style={styles.unreadCountBadge}>
                <Text style={styles.unreadCountText}>{medicineUpdatesUnread}</Text>
              </View>
            ) : (
              <RefreshCw size={18} color={MUTED} strokeWidth={2.3} />
            )}
          </TouchableOpacity>

          {renderStockSection()}

          <View style={styles.dateTabs}>
            {renderDateTab("TODAY", t("common.today"))}
            {renderDateTab("TOMORROW", t("common.tomorrow"))}
            {renderDateTab("WEEK", t("common.week"))}
          </View>

          {filteredMedicines.length === 0 ? (
            <View style={styles.emptyPanel}>
              <View style={styles.emptyIconBox}>
                <Pill size={32} color={PRIMARY} strokeWidth={2.2} />
              </View>

              <Text style={styles.emptyTitle}>{getEmptyTitle(selectedTab, t)}</Text>
              <Text style={styles.emptyText}>{t("medicines.addReminderText")}</Text>

              <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate("AddMedicine")} activeOpacity={0.82}>
                <Plus size={18} color={SURFACE} strokeWidth={2.2} />
                <Text style={styles.emptyButtonText}>{t("medicines.addMedicine")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.scheduleHeader}>
                <View>
                  <Text style={styles.sectionTitle}>{t("medicines.schedule")}</Text>

                  <Text style={styles.sectionSubtitle}>
                    {filteredMedicines.length === 1
                      ? t("medicines.oneReminderFound")
                      : t("medicines.manyRemindersFound", { count: filteredMedicines.length })}
                  </Text>
                </View>

                <View style={styles.scheduleIconBox}>
                  <CalendarDays size={21} color={PRIMARY} strokeWidth={2.2} />
                </View>
              </View>

              {renderPeriodSection("Morning")}
              {renderPeriodSection("Afternoon")}
              {renderPeriodSection("Evening")}
            </>
          )}
        </ScrollView>
      </View>

      <Modal visible={Boolean(refillModal)} transparent animationType="fade" onRequestClose={closeRefillModal}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Request from Pharmacy</Text>
                <Text style={styles.modalSubtitle}>
                  {refillModal ? `${refillModal.medicineName} · ${refillModal.dose}` : ""}
                </Text>
              </View>

              <TouchableOpacity style={styles.modalCloseButton} onPress={closeRefillModal} disabled={isSubmittingRefill}>
                <X size={20} color={TEXT} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <View style={styles.pharmacyRequestInfo}>
              <AlertCircle size={19} color={ON_PRIMARY_CONTAINER} strokeWidth={2.5} />

              <Text style={styles.pharmacyRequestInfoText}>
                This request is only sent after you confirm it. Adding or scanning a medicine never sends a pharmacy request automatically.
              </Text>
            </View>

            {refillModal?.source !== "DOCTOR_PRESCRIBED" ? (
              <View style={styles.pharmacyVerificationInfo}>
                <AlertTriangle size={19} color={ON_WARNING_CONTAINER} strokeWidth={2.5} />

                <Text style={styles.pharmacyVerificationInfoText}>
                  This medicine was not linked to a CareMate+ doctor prescription. Pharmacy staff must verify the request before fulfilment.
                </Text>
              </View>
            ) : null}

            <Text style={styles.modalInputLabel}>Requested quantity</Text>

            <TextInput
              style={styles.smallModalInput}
              value={refillQuantity}
              onChangeText={value => setRefillQuantity(value.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              placeholder="e.g., 1"
              editable={!isSubmittingRefill}
            />

            <Text style={styles.modalInputLabel}>Quantity unit</Text>

            <TextInput
              style={styles.smallModalInput}
              value={refillUnit}
              onChangeText={setRefillUnit}
              placeholder="e.g., pack, tablets, capsules"
              maxLength={30}
              editable={!isSubmittingRefill}
            />

            <Text style={styles.modalInputLabel}>Note optional</Text>

            <TextInput
              style={styles.refillNoteInput}
              value={refillNote}
              onChangeText={setRefillNote}
              placeholder="Optional message for the pharmacy"
              multiline
              textAlignVertical="top"
              maxLength={500}
              editable={!isSubmittingRefill}
            />

            <Text style={styles.characterCount}>{refillNote.length}/500</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={closeRefillModal} disabled={isSubmittingRefill}>
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.refillSubmitButton, isSubmittingRefill && styles.disabledButton]}
                onPress={() => void submitRefillRequest()}
                disabled={isSubmittingRefill}
              >
                {isSubmittingRefill ? (
                  <ActivityIndicator size="small" color={SURFACE} />
                ) : (
                  <>
                    <Send size={17} color={SURFACE} strokeWidth={2.5} />
                    <Text style={styles.modalSubmitText}>Send Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={Boolean(removalModal)} transparent animationType="fade" onRequestClose={closeRemovalModal}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{t("medicines.modalTitle")}</Text>
                <Text style={styles.modalSubtitle}>{removalModal?.medicineName || ""}</Text>
              </View>

              <TouchableOpacity style={styles.modalCloseButton} onPress={closeRemovalModal} disabled={isSubmittingRemoval}>
                <X size={20} color={TEXT} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalWarningPanel}>
              <AlertCircle size={20} color={ON_WARNING_CONTAINER} strokeWidth={2.5} />
              <Text style={styles.modalWarningText}>{t("medicines.modalWarning")}</Text>
            </View>

            <Text style={styles.modalInputLabel}>{t("medicines.modalQuestion")}</Text>

            <TextInput
              style={styles.removalReasonInput}
              value={removalReason}
              onChangeText={setRemovalReason}
              placeholder={t("medicines.modalPlaceholder")}
              multiline
              textAlignVertical="top"
              maxLength={500}
              editable={!isSubmittingRemoval}
            />

            <Text style={styles.characterCount}>{removalReason.length}/500</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={closeRemovalModal} disabled={isSubmittingRemoval}>
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitButton, isSubmittingRemoval && styles.disabledButton]}
                onPress={() => void submitRemovalRequest()}
                disabled={isSubmittingRemoval}
              >
                {isSubmittingRemoval ? (
                  <ActivityIndicator size="small" color={SURFACE} />
                ) : (
                  <>
                    <Trash2 size={17} color={SURFACE} strokeWidth={2.5} />
                    <Text style={styles.modalSubmitText}>{t("common.sendRequest")}</Text>
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

const SummaryMetric = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={styles.summaryMetric}>
    <View style={[styles.summaryDot, { backgroundColor: color }]} />
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  loadingContainer: { flex: 1, backgroundColor: BACKGROUND, alignItems: "center", justifyContent: "center" },
  loadingPanel: { alignItems: "center", paddingHorizontal: 28 },
  loadingTitle: { color: TEXT, fontSize: 17, fontWeight: "700", marginTop: 14 },
  loadingText: { color: MUTED, fontSize: 12, fontWeight: "500", textAlign: "center", marginTop: 5 },

  header: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center" },
  headerTextBlock: { flex: 1 },
  headerTitle: { color: TEXT, fontSize: 26, fontWeight: "700" },
  headerSubtitle: { color: MUTED, fontSize: 12, fontWeight: "500", marginTop: 3 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  updatesButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 9, ...elevate(2) },
  updatesBadge: { position: "absolute", right: -2, top: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: DANGER, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  updatesBadgeText: { color: SURFACE, fontSize: 8, fontWeight: "700" },
  addButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", ...elevate(2) },

  progressCard: { backgroundColor: PRIMARY, borderRadius: 18, padding: 17, marginBottom: 13, ...elevate(2) },
  progressTopRow: { flexDirection: "row", alignItems: "center" },
  progressTextBlock: { flex: 1, paddingRight: 10 },
  progressKicker: { color: "#DDE5FF", fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  progressTitle: { color: SURFACE, fontSize: 21, fontWeight: "700", marginTop: 6 },
  progressSubtitle: { color: "#E7ECFF", fontSize: 11, fontWeight: "500", lineHeight: 16, marginTop: 5 },
  progressRingContainer: { width: PROGRESS_RING_SIZE, height: PROGRESS_RING_SIZE, alignItems: "center", justifyContent: "center" },
  progressRingCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  progressPercentage: { color: SURFACE, fontSize: 20, fontWeight: "700" },
  progressCenterLabel: { color: "#DFE6FF", fontSize: 9, fontWeight: "600", marginTop: 1 },
  summaryPanel: { minHeight: 68, backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 13, flexDirection: "row", alignItems: "center", marginTop: 13 },
  summaryMetric: { flex: 1, alignItems: "center", justifyContent: "center" },
  summaryDot: { width: 7, height: 7, borderRadius: 4, marginBottom: 4 },
  summaryValue: { color: SURFACE, fontSize: 14, fontWeight: "700" },
  summaryLabel: { color: "#E9EDFF", fontSize: 8, fontWeight: "600", marginTop: 2 },
  summaryDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: "rgba(255,255,255,0.25)" },

  updatesPanel: { minHeight: 72, backgroundColor: SURFACE, borderRadius: 15, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 13, ...elevate(1) },
  updatesPanelIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: PRIMARY_CONTAINER, alignItems: "center", justifyContent: "center", marginRight: 11 },
  updatesPanelTextBlock: { flex: 1 },
  updatesPanelTitle: { color: TEXT, fontSize: 13, fontWeight: "700" },
  updatesPanelText: { color: MUTED, fontSize: 10, fontWeight: "500", lineHeight: 15, marginTop: 3 },
  unreadCountBadge: { minWidth: 27, height: 27, borderRadius: 14, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  unreadCountText: { color: SURFACE, fontSize: 10, fontWeight: "700" },

  stockSection: { backgroundColor: SURFACE, borderRadius: 17, padding: 14, marginBottom: 14, ...elevate(1) },
  stockSectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  stockSectionIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: SUCCESS_CONTAINER, alignItems: "center", justifyContent: "center", marginRight: 10 },
  stockSectionText: { flex: 1 },
  stockSectionTitle: { color: TEXT, fontSize: 15, fontWeight: "700" },
  stockSectionSubtitle: { color: MUTED, fontSize: 10, fontWeight: "500", lineHeight: 15, marginTop: 3 },
  stockEmptyPanel: { backgroundColor: SOFT_PANEL, borderRadius: 13, alignItems: "center", padding: 18 },
  stockEmptyTitle: { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 8 },
  stockEmptyText: { color: MUTED, fontSize: 10, fontWeight: "500", textAlign: "center", marginTop: 4 },

  stockCard: { backgroundColor: SOFT_PANEL, borderRadius: 14, padding: 12, marginBottom: 9 },
  stockCardTop: { flexDirection: "row", alignItems: "center" },
  stockMedicineIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 10 },
  stockMedicineIconAvailable: { backgroundColor: SUCCESS_CONTAINER },
  stockMedicineIconLow: { backgroundColor: WARNING_CONTAINER },
  stockMedicineIconEmpty: { backgroundColor: DANGER_CONTAINER },
  stockMedicineText: { flex: 1, minWidth: 0 },
  stockMedicineName: { color: TEXT, fontSize: 13, fontWeight: "700" },
  stockMedicineDose: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 3 },
  stockStateBadge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6, marginLeft: 7 },
  stockStateAvailable: { backgroundColor: SUCCESS_CONTAINER },
  stockStateLow: { backgroundColor: WARNING_CONTAINER },
  stockStateEmpty: { backgroundColor: DANGER_CONTAINER },
  stockStateText: { fontSize: 8, fontWeight: "700" },

  stockDetailsRow: { flexDirection: "row", alignItems: "center", marginTop: 12, backgroundColor: SURFACE, borderRadius: 11, padding: 10 },
  stockDetail: { flex: 1 },
  stockDetailDivider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: SURFACE_VARIANT, marginHorizontal: 11 },
  stockDetailLabel: { color: MUTED, fontSize: 7, fontWeight: "700", letterSpacing: 0.4 },
  stockDetailValue: { color: TEXT, fontSize: 10, fontWeight: "700", marginTop: 4 },
  thresholdText: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 8 },
  waitingStockPanel: { backgroundColor: WARNING_CONTAINER, borderRadius: 10, padding: 9, flexDirection: "row", alignItems: "flex-start", marginTop: 9 },
  waitingStockText: { flex: 1, color: ON_WARNING_CONTAINER, fontSize: 9, fontWeight: "600", lineHeight: 14, marginLeft: 7 },
  stockActions: { flexDirection: "row", marginTop: 10 },
  requestPharmacyButton: { flex: 1, minHeight: 43, borderRadius: 11, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  requestPharmacyButtonText: { color: SURFACE, fontSize: 10, fontWeight: "700", marginLeft: 6 },
  stockRemoveButton: { width: 43, height: 43, borderRadius: 11, backgroundColor: DANGER_CONTAINER, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  stockUpdatesButton: { width: 43, height: 43, borderRadius: 11, backgroundColor: WARNING_CONTAINER, alignItems: "center", justifyContent: "center", marginLeft: 8 },

  inlineStockBadge: { alignSelf: "flex-start", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", alignItems: "center", marginTop: 9 },
  inlineStockAvailable: { backgroundColor: SUCCESS_CONTAINER },
  inlineStockLow: { backgroundColor: WARNING_CONTAINER },
  inlineStockEmpty: { backgroundColor: DANGER_CONTAINER },
  inlineStockText: { fontSize: 9, fontWeight: "700", marginLeft: 5 },

  dateTabs: { backgroundColor: SURFACE, borderRadius: 14, padding: 5, flexDirection: "row", marginBottom: 14, ...elevate(1) },
  dateTab: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  activeDateTab: { backgroundColor: PRIMARY_CONTAINER },
  dateTabText: { color: MUTED, fontSize: 11, fontWeight: "700" },
  activeDateTabText: { color: ON_PRIMARY_CONTAINER },

  emptyPanel: { backgroundColor: SURFACE, borderRadius: 16, padding: 24, alignItems: "center", ...elevate(1) },
  emptyIconBox: { width: 64, height: 64, borderRadius: 18, backgroundColor: PRIMARY_CONTAINER, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 13 },
  emptyText: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, textAlign: "center", marginTop: 5 },
  emptyButton: { minHeight: 44, borderRadius: 12, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 15, marginTop: 15 },
  emptyButtonText: { color: SURFACE, fontSize: 11, fontWeight: "700", marginLeft: 6 },

  scheduleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  sectionSubtitle: { color: MUTED, fontSize: 10, fontWeight: "500", marginTop: 3 },
  scheduleIconBox: { width: 42, height: 42, borderRadius: 13, backgroundColor: PRIMARY_CONTAINER, alignItems: "center", justifyContent: "center" },

  periodSection: { marginBottom: 14 },
  periodHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 7 },
  periodHeaderLeft: { flexDirection: "row", alignItems: "center" },
  periodIconBox: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 8 },
  periodTitle: { color: TEXT, fontSize: 13, fontWeight: "700" },
  periodCountBadge: { minWidth: 27, height: 27, borderRadius: 14, backgroundColor: SURFACE_VARIANT, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  periodCountText: { color: MUTED, fontSize: 9, fontWeight: "700" },
  periodPanel: { backgroundColor: SURFACE, borderRadius: 15, overflow: "hidden", ...elevate(1) },

  medicineRow: { flexDirection: "row", padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: SURFACE_VARIANT },
  lastMedicineRow: { borderBottomWidth: 0 },
  timeColumn: { width: 55, marginRight: 9 },
  timeBox: { backgroundColor: SOFT_PANEL, borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  medicineTime: { color: TEXT, fontSize: 11, fontWeight: "700" },
  timeLabel: { color: MUTED, fontSize: 7, fontWeight: "600", marginTop: 2 },
  medicineContent: { flex: 1 },
  medicineTopRow: { flexDirection: "row", alignItems: "center" },
  medicineIconBox: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 9 },
  medicineTextBlock: { flex: 1, minWidth: 0 },
  medicineName: { color: TEXT, fontSize: 13, fontWeight: "700" },
  medicineDose: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 2 },
  medicineMeta: { color: MUTED, fontSize: 9, fontWeight: "500", lineHeight: 14, marginTop: 8 },

  statusBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5, flexDirection: "row", alignItems: "center", marginLeft: 6 },
  statusBadgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusBadgeText: { fontSize: 8, fontWeight: "700" },

  actionsRow: { flexDirection: "row", marginTop: 10 },
  takenButton: { flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: SUCCESS, flexDirection: "row", alignItems: "center", justifyContent: "center", marginRight: 5 },
  takenButtonText: { color: SURFACE, fontSize: 10, fontWeight: "700", marginLeft: 5 },
  snoozeButton: { flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: PRIMARY_CONTAINER, flexDirection: "row", alignItems: "center", justifyContent: "center", marginLeft: 5 },
  snoozeButtonText: { color: ON_PRIMARY_CONTAINER, fontSize: 10, fontWeight: "700", marginLeft: 5 },
  disabledButton: { opacity: 0.48 },
  disabledActionText: { color: DISABLED_TEXT },

  removeMedicineButton: { alignSelf: "flex-start", minHeight: 34, borderRadius: 9, backgroundColor: DANGER_CONTAINER, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", marginTop: 9 },
  removeMedicineButtonText: { color: ON_DANGER_CONTAINER, fontSize: 9, fontWeight: "700", marginLeft: 5 },

  removalPendingPanel: { backgroundColor: WARNING_CONTAINER, borderRadius: 10, padding: 9, flexDirection: "row", alignItems: "center", marginTop: 9 },
  removalPendingTextBlock: { flex: 1, marginHorizontal: 8 },
  removalPendingTitle: { color: ON_WARNING_CONTAINER, fontSize: 9, fontWeight: "700" },
  removalPendingText: { color: ON_WARNING_CONTAINER, fontSize: 8, fontWeight: "500", lineHeight: 13, marginTop: 2 },
  missedHelpPanel: { backgroundColor: DANGER_CONTAINER, borderRadius: 9, padding: 8, marginTop: 8 },
  missedHelpText: { color: ON_DANGER_CONTAINER, fontSize: 8, fontWeight: "600", lineHeight: 13 },
  snoozedHelpPanel: { backgroundColor: PRIMARY_CONTAINER, borderRadius: 9, padding: 8, marginTop: 8 },
  snoozedHelpText: { color: ON_PRIMARY_CONTAINER, fontSize: 8, fontWeight: "600", lineHeight: 13 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(27,29,42,0.48)", justifyContent: "center", paddingHorizontal: 18 },
  modalCard: { backgroundColor: SURFACE, borderRadius: 18, padding: 17, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalHeaderText: { flex: 1, paddingRight: 12 },
  modalTitle: { color: TEXT, fontSize: 19, fontWeight: "700" },
  modalSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },
  modalCloseButton: { width: 39, height: 39, borderRadius: 12, backgroundColor: SOFT_PANEL, alignItems: "center", justifyContent: "center" },

  modalWarningPanel: { backgroundColor: WARNING_CONTAINER, borderRadius: 12, padding: 11, marginTop: 15, flexDirection: "row", alignItems: "flex-start" },
  modalWarningText: { flex: 1, color: ON_WARNING_CONTAINER, fontSize: 11, fontWeight: "500", lineHeight: 17, marginLeft: 8 },
  pharmacyRequestInfo: { backgroundColor: PRIMARY_CONTAINER, borderRadius: 12, padding: 11, marginTop: 15, flexDirection: "row", alignItems: "flex-start" },
  pharmacyRequestInfoText: { flex: 1, color: ON_PRIMARY_CONTAINER, fontSize: 10, fontWeight: "600", lineHeight: 16, marginLeft: 8 },
  pharmacyVerificationInfo: { backgroundColor: WARNING_CONTAINER, borderRadius: 12, padding: 11, marginTop: 9, flexDirection: "row", alignItems: "flex-start" },
  pharmacyVerificationInfoText: { flex: 1, color: ON_WARNING_CONTAINER, fontSize: 10, fontWeight: "600", lineHeight: 16, marginLeft: 8 },

  modalInputLabel: { color: TEXT, fontSize: 11, fontWeight: "700", marginTop: 15, marginBottom: 6 },
  smallModalInput: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: SURFACE_VARIANT, backgroundColor: SOFT_PANEL, color: TEXT, fontSize: 12, fontWeight: "500", paddingHorizontal: 12 },
  refillNoteInput: { minHeight: 85, borderRadius: 12, borderWidth: 1, borderColor: SURFACE_VARIANT, backgroundColor: SOFT_PANEL, color: TEXT, fontSize: 12, fontWeight: "500", lineHeight: 18, padding: 12 },
  removalReasonInput: { minHeight: 125, borderRadius: 13, borderWidth: 1, borderColor: SURFACE_VARIANT, backgroundColor: SOFT_PANEL, color: TEXT, fontSize: 13, fontWeight: "500", lineHeight: 19, padding: 12 },
  characterCount: { color: MUTED, fontSize: 9, fontWeight: "600", textAlign: "right", marginTop: 5 },

  modalActions: { flexDirection: "row", marginTop: 14 },
  modalCancelButton: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: SOFT_PANEL, alignItems: "center", justifyContent: "center", marginRight: 6 },
  modalCancelText: { color: TEXT, fontSize: 12, fontWeight: "700" },
  modalSubmitButton: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: DANGER, flexDirection: "row", alignItems: "center", justifyContent: "center", marginLeft: 6 },
  refillSubmitButton: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", marginLeft: 6 },
  modalSubmitText: { color: SURFACE, fontSize: 11, fontWeight: "700", marginLeft: 6 },
});

export default MedicinesScreen;