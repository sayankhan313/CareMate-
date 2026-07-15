import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle } from "react-native-svg";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Moon,
  Pill,
  Plus,
  Sunrise,
  Sun,
} from "lucide-react-native";

import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../../services/tokenStorage";
import type {
  PatientTabParamList,
  RootStackParamList,
} from "../../types/navigation";

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
  date?: string | null;
  status: MedicineStatus;
  takenAt?: string | null;
  snoozedUntil?: string | null;
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

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#3F6FD0";
const PRIMARY_LIGHT = "#EEF4FF";

const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#F6A545";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const BLUE = "#3E7BFA";
const BLUE_LIGHT = "#EAF0FF";

const PROGRESS_RING_SIZE = 108;
const PROGRESS_RING_STROKE = 10;
const PROGRESS_RING_RADIUS = 43;
const PROGRESS_RING_CENTER = PROGRESS_RING_SIZE / 2;
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS;

const getDateKeyFromOffset = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const normalizeDateKey = (dateValue?: string | null) => {
  if (!dateValue) {
    return "";
  }

  const trimmedValue = String(dateValue).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmedValue)) {
    return trimmedValue.slice(0, 10);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmedValue)) {
    const [day, month, year] = trimmedValue.split("/");
    return `${year}-${month}-${day}`;
  }

  const parsedDate = new Date(trimmedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMedicineDateKey = (medicine: TodayMedicine) => {
  return (
    normalizeDateKey(medicine.scheduledFor) ||
    normalizeDateKey(medicine.scheduledDate) ||
    normalizeDateKey(medicine.reminderDate) ||
    normalizeDateKey(medicine.date) ||
    normalizeDateKey(medicine.startDate)
  );
};

const getAllowedDateKeys = (selectedTab: DateTab) => {
  if (selectedTab === "TODAY") {
    return [getDateKeyFromOffset(0)];
  }

  if (selectedTab === "TOMORROW") {
    return [getDateKeyFromOffset(1)];
  }

  return [
    getDateKeyFromOffset(0),
    getDateKeyFromOffset(1),
    getDateKeyFromOffset(2),
    getDateKeyFromOffset(3),
    getDateKeyFromOffset(4),
    getDateKeyFromOffset(5),
    getDateKeyFromOffset(6),
  ];
};

const getTimeMinutes = (timeValue?: string | null) => {
  if (!timeValue) {
    return Number.MAX_SAFE_INTEGER;
  }

  const match = /^(\d{1,2}):(\d{2})/.exec(timeValue.trim());

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  return hour * 60 + minute;
};

const getDateSortValue = (medicine: TodayMedicine) => {
  const dateKey = getMedicineDateKey(medicine);

  if (!dateKey) {
    return 0;
  }

  const parsedDate = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return 0;
  }

  return parsedDate.getTime();
};

const sortMedicinesBySchedule = (medicines: TodayMedicine[]) => {
  return medicines
    .map((medicine, index) => ({
      medicine,
      index,
    }))
    .sort((first, second) => {
      const dateDifference =
        getDateSortValue(first.medicine) - getDateSortValue(second.medicine);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      const timeDifference =
        getTimeMinutes(first.medicine.timeOfDay) -
        getTimeMinutes(second.medicine.timeOfDay);

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return first.index - second.index;
    })
    .map((item) => item.medicine);
};

const buildSummaryFromMedicines = (
  medicines: TodayMedicine[]
): TodayMedicineSummary => {
  const totalCount = medicines.length;

  const takenCount = medicines.filter((medicine) => {
    return medicine.status === "TAKEN";
  }).length;

  const pendingCount = medicines.filter((medicine) => {
    return medicine.status === "PENDING";
  }).length;

  const missedCount = medicines.filter((medicine) => {
    return medicine.status === "MISSED";
  }).length;

  const snoozedCount = medicines.filter((medicine) => {
    return medicine.status === "SNOOZED";
  }).length;

  const progressPercentage =
    totalCount === 0 ? 0 : Math.round((takenCount / totalCount) * 100);

  return {
    totalCount,
    takenCount,
    pendingCount,
    missedCount,
    snoozedCount,
    progressPercentage,
  };
};

const getFrequencyLabel = (frequency: string) => {
  switch (frequency) {
    case "ONCE_DAILY":
      return "Once daily";
    case "TWICE_DAILY":
      return "Twice daily";
    case "THREE_TIMES_DAILY":
      return "Three times daily";
    case "AS_NEEDED":
      return "As needed";
    default:
      return frequency;
  }
};

const getStatusLabel = (status: MedicineStatus) => {
  switch (status) {
    case "TAKEN":
      return "Taken";
    case "PENDING":
      return "Pending";
    case "MISSED":
      return "Missed";
    case "SNOOZED":
      return "Snoozed";
    default:
      return status;
  }
};

const getProgressTitle = (selectedTab: DateTab) => {
  if (selectedTab === "TODAY") {
    return "Today’s progress";
  }

  if (selectedTab === "TOMORROW") {
    return "Tomorrow’s plan";
  }

  return "This week";
};

const getHeaderSubtitle = (selectedTab: DateTab) => {
  if (selectedTab === "TODAY") {
    return "Track today’s doses";
  }

  if (selectedTab === "TOMORROW") {
    return "Plan tomorrow’s schedule";
  }

  return "Review your next 7 days";
};

const getEmptyTitle = (selectedTab: DateTab) => {
  if (selectedTab === "TODAY") {
    return "No medicines for today";
  }

  if (selectedTab === "TOMORROW") {
    return "No medicines for tomorrow";
  }

  return "No medicines this week";
};

const getCardKey = (medicine: TodayMedicine, index: number) => {
  const dateKey = getMedicineDateKey(medicine);

  return `${medicine.medicineId}-${medicine.reminderId}-${dateKey}-${medicine.timeOfDay}-${index}`;
};

const getStatusTone = (status: MedicineStatus) => {
  if (status === "TAKEN") {
    return {
      background: SUCCESS_LIGHT,
      text: "#167A58",
      dot: SUCCESS,
      iconBackground: SUCCESS_LIGHT,
      iconColor: SUCCESS,
    };
  }

  if (status === "PENDING") {
    return {
      background: WARNING_LIGHT,
      text: "#A85A13",
      dot: WARNING,
      iconBackground: WARNING_LIGHT,
      iconColor: WARNING,
    };
  }

  if (status === "MISSED") {
    return {
      background: DANGER_LIGHT,
      text: "#B42318",
      dot: DANGER,
      iconBackground: DANGER_LIGHT,
      iconColor: DANGER,
    };
  }

  return {
    background: PRIMARY_LIGHT,
    text: PRIMARY_DARK,
    dot: PRIMARY,
    iconBackground: PRIMARY_LIGHT,
    iconColor: PRIMARY,
  };
};

const getPeriodIcon = (period: MedicinePeriod) => {
  if (period === "Morning") {
    return <Sunrise size={18} color={WARNING} strokeWidth={2.6} />;
  }

  if (period === "Afternoon") {
    return <Sun size={18} color={PRIMARY} strokeWidth={2.6} />;
  }

  return <Moon size={18} color={BLUE} strokeWidth={2.6} />;
};

const ProgressRing = ({
  summary,
  progress,
}: {
  summary: TodayMedicineSummary;
  progress: number;
}) => {
  const total = summary.totalCount;

  const segments = [
    {
      key: "taken",
      count: summary.takenCount,
      color: SUCCESS,
    },
    {
      key: "pending",
      count: summary.pendingCount,
      color: WARNING,
    },
    {
      key: "missed",
      count: summary.missedCount,
      color: DANGER,
    },
    {
      key: "snoozed",
      count: summary.snoozedCount,
      color: "#A3B8FF",
    },
  ].filter((segment) => segment.count > 0);

  let accumulatedLength = 0;

  return (
    <View style={styles.progressRingContainer}>
      <Svg
        width={PROGRESS_RING_SIZE}
        height={PROGRESS_RING_SIZE}
        viewBox={`0 0 ${PROGRESS_RING_SIZE} ${PROGRESS_RING_SIZE}`}
      >
        <Circle
          cx={PROGRESS_RING_CENTER}
          cy={PROGRESS_RING_CENTER}
          r={PROGRESS_RING_RADIUS}
          stroke="rgba(255,255,255,0.30)"
          strokeWidth={PROGRESS_RING_STROKE}
          fill="none"
        />

        {total > 0
          ? segments.map((segment) => {
              const segmentLength =
                (segment.count / total) * PROGRESS_RING_CIRCUMFERENCE;

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
                  strokeDasharray={`${segmentLength} ${
                    PROGRESS_RING_CIRCUMFERENCE - segmentLength
                  }`}
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
        <Text style={styles.progressCenterLabel}>done</Text>
      </View>
    </View>
  );
};

export const MedicinesScreen = ({ navigation }: MedicinesScreenProps) => {
  const insets = useSafeAreaInsets();

  const [selectedTab, setSelectedTab] = useState<DateTab>("TODAY");
  const [allMedicines, setAllMedicines] = useState<TodayMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingReminderId, setActionLoadingReminderId] = useState<
    string | null
  >(null);
  const [actionLoadingType, setActionLoadingType] =
    useState<ActionLoadingType | null>(null);

  const filteredMedicines = useMemo(() => {
    const allowedDateKeys = getAllowedDateKeys(selectedTab);

    const dateFilteredMedicines = allMedicines.filter((medicine) => {
      const medicineDateKey = getMedicineDateKey(medicine);
      return allowedDateKeys.includes(medicineDateKey);
    });

    if (selectedTab !== "WEEK") {
      return sortMedicinesBySchedule(dateFilteredMedicines);
    }

    const uniqueReminderMap = new Map<string, TodayMedicine>();

    dateFilteredMedicines.forEach((medicine) => {
      const uniqueKey = `${medicine.reminderId}-${medicine.timeOfDay}`;

      if (!uniqueReminderMap.has(uniqueKey)) {
        uniqueReminderMap.set(uniqueKey, medicine);
      }
    });

    return sortMedicinesBySchedule(Array.from(uniqueReminderMap.values()));
  }, [allMedicines, selectedTab]);

  const summary = useMemo(() => {
    return buildSummaryFromMedicines(filteredMedicines);
  }, [filteredMedicines]);

  const fetchMedicines = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        }

        const token = await tokenStorage.getToken();

        if (!token) {
          Alert.alert("Session expired", "Please login again.");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/patient/medicines/today`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        let result: any = {};

        try {
          result = await response.json();
        } catch (error) {
          result = {};
        }

        if (!response.ok) {
          Alert.alert(
            "Unable to fetch medicines",
            result.message || "Please try again."
          );
          return;
        }

        const data: TodayMedicineResponse = result.data;

        setAllMedicines(Array.isArray(data.medicines) ? data.medicines : []);
      } catch (error) {
        Alert.alert("Network error", "Unable to connect to server.");
      } finally {
        if (mode === "initial") {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      fetchMedicines("initial");
    }, [fetchMedicines])
  );

  const markTaken = async (reminderId: string) => {
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

      setAllMedicines((currentMedicines) =>
        currentMedicines.map((medicine) =>
          medicine.reminderId === reminderId
            ? {
                ...medicine,
                status: "TAKEN",
                takenAt: new Date().toISOString(),
                snoozedUntil: null,
              }
            : medicine
        )
      );

      await fetchMedicines("silent");
    } catch (error) {
      Alert.alert("Network error", "Unable to connect to server.");
    } finally {
      setActionLoadingReminderId(null);
      setActionLoadingType(null);
    }
  };

  const snoozeReminder = async (reminderId: string) => {
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

      setAllMedicines((currentMedicines) =>
        currentMedicines.map((medicine) =>
          medicine.reminderId === reminderId
            ? {
                ...medicine,
                status: "SNOOZED",
                snoozedUntil,
              }
            : medicine
        )
      );

      await fetchMedicines("silent");
    } catch (error) {
      Alert.alert("Network error", "Unable to connect to server.");
    } finally {
      setActionLoadingReminderId(null);
      setActionLoadingType(null);
    }
  };

  const getMedicinesByPeriod = (period: MedicinePeriod) => {
    return filteredMedicines.filter((medicine) => medicine.period === period);
  };

  const getMedicineMetaText = (medicine: TodayMedicine) => {
    const instructionOrFrequency =
      medicine.instructions?.trim() || getFrequencyLabel(medicine.frequency);

    const dateKey = getMedicineDateKey(medicine);

    if (selectedTab === "WEEK" && dateKey) {
      return `${dateKey} · ${medicine.timeOfDay} · ${instructionOrFrequency}`;
    }

    return `${medicine.timeOfDay} · ${instructionOrFrequency}`;
  };

  const renderDateTab = (tab: DateTab, label: string) => {
    const isSelected = selectedTab === tab;

    return (
      <TouchableOpacity
        key={tab}
        style={[styles.dateTab, isSelected ? styles.activeDateTab : undefined]}
        onPress={() => setSelectedTab(tab)}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.dateTabText,
            isSelected ? styles.activeDateTabText : undefined,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProgressCard = () => {
    const progress = Number.isFinite(summary.progressPercentage)
      ? summary.progressPercentage
      : 0;

    return (
      <View style={styles.progressCard}>
        <View style={styles.progressTopRow}>
          <View style={styles.progressTextBlock}>
            <Text style={styles.progressKicker}>Medication plan</Text>
            <Text style={styles.progressTitle}>{getProgressTitle(selectedTab)}</Text>
            <Text style={styles.progressSubtitle}>
              {summary.totalCount === 0
                ? "No reminders scheduled"
                : `${summary.takenCount} of ${summary.totalCount} doses completed`}
            </Text>
          </View>

          <ProgressRing summary={summary} progress={progress} />
        </View>

        <View style={styles.summaryPills}>
          <SummaryPill label="Taken" value={summary.takenCount} color={SUCCESS} />
          <SummaryPill label="Pending" value={summary.pendingCount} color={WARNING} />
          <SummaryPill label="Missed" value={summary.missedCount} color={DANGER} />
          <SummaryPill
            label="Snoozed"
            value={summary.snoozedCount}
            color="#A3B8FF"
          />
        </View>
      </View>
    );
  };

  const renderStatusBadge = (status: MedicineStatus) => {
    const tone = getStatusTone(status);

    return (
      <View style={[styles.statusBadge, { backgroundColor: tone.background }]}>
        <View style={[styles.statusBadgeDot, { backgroundColor: tone.dot }]} />
        <Text style={[styles.statusBadgeText, { color: tone.text }]}>
          {getStatusLabel(status)}
        </Text>
      </View>
    );
  };

  const renderMedicineRow = (medicine: TodayMedicine, index: number) => {
    const isMissed = medicine.status === "MISSED";
    const isSnoozed = medicine.status === "SNOOZED";
    const tone = getStatusTone(medicine.status);

    const shouldShowActions =
      selectedTab === "TODAY" &&
      (medicine.status === "PENDING" ||
        medicine.status === "SNOOZED" ||
        medicine.status === "MISSED");

    const isCurrentMedicineActionLoading =
      actionLoadingReminderId === medicine.reminderId;

    const isTakingThisMedicine =
      isCurrentMedicineActionLoading && actionLoadingType === "TAKEN";

    const isSnoozingThisMedicine =
      isCurrentMedicineActionLoading && actionLoadingType === "SNOOZE";

    const isTakenButtonDisabled = isCurrentMedicineActionLoading || isMissed;
    const isSnoozeButtonDisabled =
      isCurrentMedicineActionLoading || isMissed || isSnoozed;

    return (
      <View key={getCardKey(medicine, index)} style={styles.medicineRow}>
        <View style={styles.timeColumn}>
          <Text style={styles.medicineTime}>{medicine.timeOfDay}</Text>
        </View>

        <View style={styles.medicineContent}>
          <View style={styles.medicineTopRow}>
            <View
              style={[
                styles.medicineIconCircle,
                { backgroundColor: tone.iconBackground },
              ]}
            >
              <Pill size={20} color={tone.iconColor} strokeWidth={2.6} />
            </View>

            <View style={styles.medicineTextBlock}>
              <Text style={styles.medicineName} numberOfLines={1}>
                {medicine.name}
              </Text>

              <Text style={styles.medicineDose} numberOfLines={1}>
                {medicine.dose}
              </Text>
            </View>

            {renderStatusBadge(medicine.status)}
          </View>

          <Text style={styles.medicineMeta} numberOfLines={2}>
            {getMedicineMetaText(medicine)}
          </Text>

          {shouldShowActions ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.takenButton,
                  isTakingThisMedicine ? styles.disabledButton : undefined,
                  isMissed ? styles.disabledActionButton : undefined,
                ]}
                disabled={isTakenButtonDisabled}
                onPress={() => markTaken(medicine.reminderId)}
                activeOpacity={0.85}
              >
                <CheckCircle2
                  size={17}
                  color={isMissed ? "#9CA3AF" : SURFACE}
                  strokeWidth={2.7}
                />

                <Text
                  style={[
                    styles.takenButtonText,
                    isMissed ? styles.disabledActionText : undefined,
                  ]}
                >
                  {isTakingThisMedicine ? "Saving..." : "Taken"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.snoozeButton,
                  isSnoozingThisMedicine ? styles.disabledButton : undefined,
                  isMissed || isSnoozed ? styles.disabledActionButton : undefined,
                ]}
                disabled={isSnoozeButtonDisabled}
                onPress={() => snoozeReminder(medicine.reminderId)}
                activeOpacity={0.85}
              >
                <Clock3
                  size={17}
                  color={isMissed || isSnoozed ? "#9CA3AF" : PRIMARY}
                  strokeWidth={2.7}
                />

                <Text
                  style={[
                    styles.snoozeButtonText,
                    isMissed || isSnoozed
                      ? styles.disabledActionText
                      : undefined,
                  ]}
                >
                  {isSnoozingThisMedicine ? "Snoozing..." : "Snooze"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isMissed ? (
            <Text style={styles.missedHelpText}>
              This dose was missed, so actions are disabled.
            </Text>
          ) : null}

          {isSnoozed ? (
            <Text style={styles.snoozedHelpText}>
              Snoozed reminder. You can still mark it as taken.
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const renderPeriodSection = (period: MedicinePeriod) => {
    const periodMedicines = getMedicinesByPeriod(period);

    if (periodMedicines.length === 0) {
      return null;
    }

    return (
      <View key={period} style={styles.periodSection}>
        <View style={styles.periodHeader}>
          <View style={styles.periodHeaderLeft}>
            <View style={styles.periodIconCircle}>{getPeriodIcon(period)}</View>
            <Text style={styles.periodTitle}>{period}</Text>
          </View>

          <View style={styles.periodCountBadge}>
            <Text style={styles.periodCountText}>{periodMedicines.length}</Text>
          </View>
        </View>

        <View style={styles.periodPanel}>
          {periodMedicines.map((medicine, index) => {
            return renderMedicineRow(medicine, index);
          })}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingTitle}>Loading medicines...</Text>
        <Text style={styles.loadingText}>
          Preparing your medication schedule.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Medicines</Text>
            <Text style={styles.headerSubtitle}>
              {getHeaderSubtitle(selectedTab)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddMedicine")}
            activeOpacity={0.85}
          >
            <Plus size={23} color={SURFACE} strokeWidth={2.7} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(36, insets.bottom + 112),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {renderProgressCard()}

          <View style={styles.dateTabs}>
            {renderDateTab("TODAY", "Today")}
            {renderDateTab("TOMORROW", "Tomorrow")}
            {renderDateTab("WEEK", "Week")}
          </View>

          {filteredMedicines.length === 0 ? (
            <View style={styles.emptyPanel}>
              <View style={styles.emptyIconCircle}>
                <Pill size={34} color={PRIMARY} strokeWidth={2.6} />
              </View>

              <Text style={styles.emptyTitle}>{getEmptyTitle(selectedTab)}</Text>

              <Text style={styles.emptyText}>
                Add a medicine reminder to start building your medication plan.
              </Text>

              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate("AddMedicine")}
                activeOpacity={0.85}
              >
                <Plus size={18} color={SURFACE} strokeWidth={2.6} />
                <Text style={styles.emptyButtonText}>Add Medicine</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.scheduleHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Schedule</Text>
                  <Text style={styles.sectionSubtitle}>
                    {filteredMedicines.length} reminder
                    {filteredMedicines.length === 1 ? "" : "s"} found
                  </Text>
                </View>

                <View style={styles.scheduleIcon}>
                  <CalendarDays size={21} color={PRIMARY} strokeWidth={2.6} />
                </View>
              </View>

              {renderPeriodSection("Morning")}
              {renderPeriodSection("Afternoon")}
              {renderPeriodSection("Evening")}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const SummaryPill = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => {
  return (
    <View style={styles.summaryPill}>
      <View style={[styles.summaryDot, { backgroundColor: color }]} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BACKGROUND,
    paddingHorizontal: 28,
  },
  loadingTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 14,
  },
  loadingText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
    textAlign: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: TEXT,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  progressCard: {
    backgroundColor: PRIMARY,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    overflow: "hidden",
  },
  progressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressTextBlock: {
    flex: 1,
    paddingRight: 14,
  },
  progressKicker: {
    color: "#EAF1FF",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  progressTitle: {
    color: SURFACE,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  progressSubtitle: {
    color: "#EAF1FF",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 7,
  },
  progressRingContainer: {
    width: PROGRESS_RING_SIZE,
    height: PROGRESS_RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  progressRingCenter: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressPercentage: {
    color: SURFACE,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  progressCenterLabel: {
    color: "#EAF1FF",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 1,
  },
  summaryPills: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 18,
    padding: 8,
  },
  summaryPill: {
    flex: 1,
    alignItems: "center",
  },
  summaryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginBottom: 5,
  },
  summaryValue: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#EAF1FF",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
  },
  dateTabs: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderRadius: 999,
    padding: 5,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  dateTab: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  activeDateTab: {
    backgroundColor: PRIMARY,
  },
  dateTabText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "900",
  },
  activeDateTabText: {
    color: SURFACE,
  },
  emptyPanel: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
  },
  emptyButton: {
    marginTop: 18,
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingHorizontal: 17,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  emptyButtonText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 7,
  },
  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  scheduleIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  periodSection: {
    marginBottom: 16,
  },
  periodHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  periodHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  periodIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    borderWidth: 1,
    borderColor: BORDER,
  },
  periodTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
  },
  periodCountBadge: {
    backgroundColor: SURFACE,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: BORDER,
  },
  periodCountText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "900",
  },
  periodPanel: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  medicineRow: {
    flexDirection: "row",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  timeColumn: {
    width: 58,
    paddingTop: 3,
  },
  medicineTime: {
    color: PRIMARY_DARK,
    fontSize: 13,
    fontWeight: "900",
  },
  medicineContent: {
    flex: 1,
  },
  medicineTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  medicineIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  medicineTextBlock: {
    flex: 1,
    paddingRight: 8,
  },
  medicineName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 2,
  },
  medicineDose: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
  },
  medicineMeta: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  actionsRow: {
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
    marginRight: 9,
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
    backgroundColor: PRIMARY_LIGHT,
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
  disabledActionButton: {
    backgroundColor: "#E5E7EB",
  },
  disabledActionText: {
    color: "#9CA3AF",
  },
  missedHelpText: {
    color: "#B42318",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 9,
  },
  snoozedHelpText: {
    color: PRIMARY_DARK,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 9,
  },
});