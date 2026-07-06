import { useCallback, useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  type CompositeScreenProps,
} from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle } from "react-native-svg";

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

const PROGRESS_RING_SIZE = 104;
const PROGRESS_RING_STROKE = 10;
const PROGRESS_RING_RADIUS = 42;
const PROGRESS_RING_CENTER = PROGRESS_RING_SIZE / 2;
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS;

const emptySummary: TodayMedicineSummary = {
  totalCount: 0,
  takenCount: 0,
  pendingCount: 0,
  missedCount: 0,
  snoozedCount: 0,
  progressPercentage: 0,
};

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
      return "✓ Taken";
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
    return "Today's Progress";
  }

  if (selectedTab === "TOMORROW") {
    return "Tomorrow's Progress";
  }

  return "This Week";
};

const getEmptyTitle = (selectedTab: DateTab) => {
  if (selectedTab === "TODAY") {
    return "No medicines for today";
  }

  if (selectedTab === "TOMORROW") {
    return "No medicines for tomorrow";
  }

  return "No medicines for this week";
};

const getHeaderSubtitle = (selectedTab: DateTab) => {
  if (selectedTab === "TODAY") {
    return "Track today's doses";
  }

  if (selectedTab === "TOMORROW") {
    return "Plan tomorrow's doses";
  }

  return "View this week's reminders";
};

const getCardKey = (medicine: TodayMedicine, index: number) => {
  const dateKey = getMedicineDateKey(medicine);

  return `${medicine.medicineId}-${medicine.reminderId}-${dateKey}-${medicine.timeOfDay}-${index}`;
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
      color: "#22C55E",
    },
    {
      key: "pending",
      count: summary.pendingCount,
      color: "#3B82F6",
    },
    {
      key: "missed",
      count: summary.missedCount,
      color: "#EF4444",
    },
    {
      key: "snoozed",
      count: summary.snoozedCount,
      color: "#6366F1",
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
          stroke="#E5E7EB"
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
      </View>
    </View>
  );
};

export const MedicinesScreen = ({ navigation }: MedicinesScreenProps) => {
  const [selectedTab, setSelectedTab] = useState<DateTab>("TODAY");
  const [allMedicines, setAllMedicines] = useState<TodayMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const filteredMedicines = useMemo(() => {
    const allowedDateKeys = getAllowedDateKeys(selectedTab);

    const dateFilteredMedicines = allMedicines.filter((medicine) => {
      const medicineDateKey = getMedicineDateKey(medicine);
      return allowedDateKeys.includes(medicineDateKey);
    });

    if (selectedTab !== "WEEK") {
      return dateFilteredMedicines;
    }

    const uniqueReminderMap = new Map<string, TodayMedicine>();

    dateFilteredMedicines.forEach((medicine) => {
      const uniqueKey = `${medicine.reminderId}-${medicine.timeOfDay}`;

      if (!uniqueReminderMap.has(uniqueKey)) {
        uniqueReminderMap.set(uniqueKey, medicine);
      }
    });

    return Array.from(uniqueReminderMap.values());
  }, [allMedicines, selectedTab]);

  const summary = useMemo(() => {
    return buildSummaryFromMedicines(filteredMedicines);
  }, [filteredMedicines]);

  const fetchMedicines = useCallback(async () => {
    try {
      setIsLoading(true);

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

      const result = await response.json();

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
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMedicines();
    }, [fetchMedicines])
  );

  const markTaken = async (reminderId: string) => {
    try {
      setIsActionLoading(true);

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

      const result = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Unable to update medicine",
          result.message || "Please try again."
        );
        return;
      }

      await fetchMedicines();
    } catch (error) {
      Alert.alert("Network error", "Unable to connect to server.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const snoozeReminder = async (reminderId: string) => {
    try {
      setIsActionLoading(true);

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

      const result = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Unable to snooze medicine",
          result.message || "Please try again."
        );
        return;
      }

      await fetchMedicines();
    } catch (error) {
      Alert.alert("Network error", "Unable to connect to server.");
    } finally {
      setIsActionLoading(false);
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
        <Text style={styles.progressTitle}>{getProgressTitle(selectedTab)}</Text>

        <View style={styles.progressContent}>
          <ProgressRing summary={summary} progress={progress} />

          <View style={styles.legendContainer}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.greenDot]} />
              <Text style={styles.legendText}>{summary.takenCount} taken</Text>
            </View>

            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.blueDot]} />
              <Text style={styles.legendText}>
                {summary.pendingCount} pending
              </Text>
            </View>

            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.redDot]} />
              <Text style={styles.legendText}>{summary.missedCount} missed</Text>
            </View>

            {summary.snoozedCount > 0 ? (
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, styles.purpleDot]} />
                <Text style={styles.legendText}>
                  {summary.snoozedCount} snoozed
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const renderStatusBadge = (status: MedicineStatus) => {
    return (
      <View
        style={[
          styles.statusBadge,
          status === "TAKEN" ? styles.statusTaken : undefined,
          status === "PENDING" ? styles.statusPending : undefined,
          status === "MISSED" ? styles.statusMissed : undefined,
          status === "SNOOZED" ? styles.statusSnoozed : undefined,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            status === "TAKEN" ? styles.statusTakenText : undefined,
            status === "PENDING" ? styles.statusPendingText : undefined,
            status === "MISSED" ? styles.statusMissedText : undefined,
            status === "SNOOZED" ? styles.statusSnoozedText : undefined,
          ]}
        >
          {getStatusLabel(status)}
        </Text>
      </View>
    );
  };

  const renderMedicineCard = (medicine: TodayMedicine, index: number) => {
    const isTaken = medicine.status === "TAKEN";
    const isPending = medicine.status === "PENDING";
    const isMissed = medicine.status === "MISSED";
    const isSnoozed = medicine.status === "SNOOZED";

    const shouldShowActions =
      selectedTab === "TODAY" &&
      (medicine.status === "PENDING" ||
        medicine.status === "SNOOZED" ||
        medicine.status === "MISSED");

    const isTakenButtonDisabled = isActionLoading || isMissed;
    const isSnoozeButtonDisabled = isActionLoading || isMissed || isSnoozed;

    return (
      <View key={getCardKey(medicine, index)} style={styles.medicineCard}>
        <View style={styles.medicineCardRow}>
          <View
            style={[
              styles.iconCircle,
              isTaken ? styles.iconCircleTaken : undefined,
              isPending ? styles.iconCirclePending : undefined,
              isMissed ? styles.iconCircleMissed : undefined,
              isSnoozed ? styles.iconCircleSnoozed : undefined,
            ]}
          >
            <Text style={styles.iconText}>💊</Text>
          </View>

          <View style={styles.medicineContent}>
            <View style={styles.medicineTopRow}>
              <View style={styles.medicineNameBlock}>
                <Text style={styles.medicineName}>
                  {medicine.name} {medicine.dose}
                </Text>

                <Text style={styles.medicineMeta}>
                  {getMedicineMetaText(medicine)}
                </Text>
              </View>

              {renderStatusBadge(medicine.status)}
            </View>

            {shouldShowActions ? (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.takenActionButton,
                    isTakenButtonDisabled ? styles.disabledButton : undefined,
                    isMissed ? styles.missedDisabledActionButton : undefined,
                  ]}
                  disabled={isTakenButtonDisabled}
                  onPress={() => markTaken(medicine.reminderId)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.takenActionText,
                      isMissed ? styles.missedDisabledActionText : undefined,
                    ]}
                  >
                    Taken
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.snoozeActionButton,
                    isSnoozeButtonDisabled ? styles.disabledButton : undefined,
                    isMissed || isSnoozed
                      ? styles.missedDisabledActionButton
                      : undefined,
                  ]}
                  disabled={isSnoozeButtonDisabled}
                  onPress={() => snoozeReminder(medicine.reminderId)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.snoozeActionText,
                      isMissed || isSnoozed
                        ? styles.missedDisabledActionText
                        : undefined,
                    ]}
                  >
                    Snooze
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
        <Text style={styles.periodTitle}>{period}</Text>

        {periodMedicines.map((medicine, index) => {
          return renderMedicineCard(medicine, index);
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor="#2563EB" barStyle="light-content" />
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading medicines...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor="#2563EB" barStyle="light-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Medicines</Text>
            <Text style={styles.subtitle}>{getHeaderSubtitle(selectedTab)}</Text>
          </View>

          <TouchableOpacity
            style={styles.addIconButton}
            onPress={() => navigation.navigate("AddMedicine")}
            activeOpacity={0.85}
          >
            <Text style={styles.addIconText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateTabs}>
          {renderDateTab("TODAY", "Today")}
          {renderDateTab("TOMORROW", "Tomorrow")}
          {renderDateTab("WEEK", "Week")}
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderProgressCard()}

          {filteredMedicines.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>💊</Text>
              </View>

              <Text style={styles.emptyTitle}>{getEmptyTitle(selectedTab)}</Text>

              <Text style={styles.emptyText}>
                Add a medicine reminder to start tracking your medication.
              </Text>

              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate("AddMedicine")}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyButtonText}>Add Medicine</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#2563EB",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7FB",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 6,
  },
  subtitle: {
    color: "#DBEAFE",
    fontSize: 16,
    fontWeight: "600",
  },
  addIconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  addIconText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "300",
    marginTop: -2,
  },
  dateTabs: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  dateTab: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    marginRight: 10,
  },
  activeDateTab: {
    backgroundColor: "#2563EB",
  },
  dateTabText: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "800",
  },
  activeDateTabText: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 36,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#EAECEF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  progressTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 18,
  },
  progressContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressRingContainer: {
    width: PROGRESS_RING_SIZE,
    height: PROGRESS_RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 26,
    position: "relative",
  },
  progressRingCenter: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  progressPercentage: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
  },
  legendContainer: {
    flex: 1,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },
  legendDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    marginRight: 11,
  },
  greenDot: {
    backgroundColor: "#22C55E",
  },
  blueDot: {
    backgroundColor: "#3B82F6",
  },
  redDot: {
    backgroundColor: "#EF4444",
  },
  purpleDot: {
    backgroundColor: "#6366F1",
  },
  legendText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "700",
  },
  periodSection: {
    marginBottom: 18,
  },
  periodTitle: {
    color: "#64748B",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
    marginLeft: 6,
  },
  medicineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EAECEF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  medicineCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconCircleTaken: {
    backgroundColor: "#ECFDF3",
  },
  iconCirclePending: {
    backgroundColor: "#FFF7ED",
  },
  iconCircleMissed: {
    backgroundColor: "#FEF2F2",
  },
  iconCircleSnoozed: {
    backgroundColor: "#EEF2FF",
  },
  iconText: {
    fontSize: 24,
  },
  medicineContent: {
    flex: 1,
  },
  medicineTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  medicineNameBlock: {
    flex: 1,
    paddingRight: 10,
  },
  medicineName: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 5,
  },
  medicineMeta: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  statusTaken: {
    backgroundColor: "#DCFCE7",
  },
  statusPending: {
    backgroundColor: "#FFEDD5",
  },
  statusMissed: {
    backgroundColor: "#FEE2E2",
  },
  statusSnoozed: {
    backgroundColor: "#E0E7FF",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "900",
  },
  statusTakenText: {
    color: "#15803D",
  },
  statusPendingText: {
    color: "#EA580C",
  },
  statusMissedText: {
    color: "#DC2626",
  },
  statusSnoozedText: {
    color: "#4F46E5",
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  takenActionButton: {
    backgroundColor: "#22C55E",
    marginRight: 10,
  },
  takenActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  snoozeActionButton: {
    backgroundColor: "#F1F5F9",
  },
  snoozeActionText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.55,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAECEF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 34,
  },
  emptyTitle: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 18,
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  missedDisabledActionButton: {
    backgroundColor: "#E5E7EB",
  },
  missedDisabledActionText: {
    color: "#9CA3AF",
  },
  missedHelpText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
  },
  snoozedHelpText: {
    color: "#4F46E5",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
  },
});