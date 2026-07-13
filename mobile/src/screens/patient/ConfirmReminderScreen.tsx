import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../../services/tokenStorage";
import type { MedicineDraft, RootStackParamList } from "../../types/navigation";

type ConfirmReminderScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ConfirmReminder"
>;

const HEADER_BLUE = "#2563EB";
const BODY_BACKGROUND = "#F5F7FB";

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

const formatDateForBackend = (date: string) => {
  const trimmedDate = date.trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmedDate)) {
    return trimmedDate;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    const parts = trimmedDate.split("-");

    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    return `${day}/${month}/${year}`;
  }

  return trimmedDate;
};

const getDateForBackendFromDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

const getTodayDateForBackend = () => {
  return getDateForBackendFromDate(new Date());
};

const getTomorrowDateForBackend = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getDateForBackendFromDate(tomorrow);
};

const isTodayDate = (dateText: string) => {
  return formatDateForBackend(dateText) === getTodayDateForBackend();
};

const hasTimeAlreadyPassedToday = (timeOfDay: string) => {
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeOfDay.trim());

  if (!timeMatch) {
    return false;
  }

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return false;
  }

  const now = new Date();
  const scheduledToday = new Date();

  scheduledToday.setHours(hour, minute, 0, 0);

  return scheduledToday <= now;
};

const getAdjustedStartDateForTime = (startDate: string, timeOfDay: string) => {
  const backendStartDate = formatDateForBackend(startDate);

  if (!isTodayDate(startDate)) {
    return backendStartDate;
  }

  if (hasTimeAlreadyPassedToday(timeOfDay)) {
    return getTomorrowDateForBackend();
  }

  return backendStartDate;
};

const getSchedulePreviewText = (startDate: string, selectedTimes: string[]) => {
  const adjustedDates = selectedTimes.map((time) =>
    getAdjustedStartDateForTime(startDate, time)
  );

  const uniqueAdjustedDates = Array.from(new Set(adjustedDates));

  if (uniqueAdjustedDates.length === 1) {
    return uniqueAdjustedDates[0];
  }

  return selectedTimes
    .map((time) => `${time} starts ${getAdjustedStartDateForTime(startDate, time)}`)
    .join("\n");
};

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") {
    return result.message;
  }

  if (Array.isArray(result?.message)) {
    return result.message[0]?.message || "Please check the reminder details.";
  }

  if (Array.isArray(result?.errors)) {
    return result.errors[0]?.message || "Please check the reminder details.";
  }

  return "Please check the reminder details.";
};

export const ConfirmReminderScreen = ({
  navigation,
  route,
}: ConfirmReminderScreenProps) => {
  const insets = useSafeAreaInsets();

  const { medicineDraft } = route.params;

  const selectedTimes =
    medicineDraft.selectedTimes && medicineDraft.selectedTimes.length > 0
      ? medicineDraft.selectedTimes
      : [medicineDraft.timeOfDay];

  const [doctorReviewEnabled, setDoctorReviewEnabled] = useState(
    medicineDraft.sendToDoctorForReview
  );

  const [isSaving, setIsSaving] = useState(false);

  const frequencyLabel = useMemo(() => {
    return getFrequencyLabel(medicineDraft.frequency);
  }, [medicineDraft.frequency]);

  const scheduleStartPreview = useMemo(() => {
    return getSchedulePreviewText(medicineDraft.startDate, selectedTimes);
  }, [medicineDraft.startDate, selectedTimes]);

  const hasAutoAdjustedStartDate = useMemo(() => {
    const originalStartDate = formatDateForBackend(medicineDraft.startDate);

    return selectedTimes.some((time) => {
      return getAdjustedStartDateForTime(medicineDraft.startDate, time) !== originalStartDate;
    });
  }, [medicineDraft.startDate, selectedTimes]);

  const getEditableDraft = (): MedicineDraft => {
    return {
      ...medicineDraft,
      timeOfDay: selectedTimes[0],
      selectedTimes,
      sendToDoctorForReview: doctorReviewEnabled,
    };
  };

  const handleEditDetails = () => {
    navigation.replace("AddMedicine", {
      medicineDraft: getEditableDraft(),
      mode: "EDIT_DRAFT",
    });
  };

  const handleSaveReminder = async () => {
    try {
      setIsSaving(true);

      const token = await tokenStorage.getToken();

      if (!token) {
        Alert.alert("Session expired", "Please login again.");
        return;
      }

      for (const time of selectedTimes) {
        const response = await fetch(`${API_BASE_URL}/patient/medicines`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: medicineDraft.name,
            dose: medicineDraft.dose,
            instructions: medicineDraft.instructions || undefined,
            frequency: medicineDraft.frequency,
            timeOfDay: time,
            startDate: getAdjustedStartDateForTime(
              medicineDraft.startDate,
              time
            ),
            endDate: medicineDraft.endDate
              ? formatDateForBackend(medicineDraft.endDate)
              : undefined,
            sendToDoctorForReview: doctorReviewEnabled,
          }),
        });

        let result: any = {};

        try {
          result = await response.json();
        } catch (error) {
          result = {};
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(result));
        }
      }

      Alert.alert("Reminder saved", "Medicine reminder has been saved.", [
        {
          text: "OK",
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: "PatientTabs",
                  params: {
                    screen: "Medicines",
                  },
                },
              ],
            });
          },
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save reminder.";

      Alert.alert("Unable to save reminder", message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={HEADER_BLUE} barStyle="light-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Confirm Reminder</Text>
            <Text style={styles.headerSubtitle}>
              Review your medicine schedule
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mainCard}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>💊</Text>
            </View>

            <Text style={styles.medicineName}>{medicineDraft.name}</Text>
            <Text style={styles.doseText}>{medicineDraft.dose}</Text>

            {medicineDraft.instructions ? (
              <Text style={styles.instructionsText}>
                {medicineDraft.instructions}
              </Text>
            ) : null}
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Reminder Details</Text>

              <TouchableOpacity
                style={styles.smallEditButton}
                onPress={handleEditDetails}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                <Text style={styles.smallEditButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <DetailRow label="Frequency" value={frequencyLabel} />

            <DetailRow label="Time" value={selectedTimes.join(", ")} />

            <DetailRow label="Start Date" value={scheduleStartPreview} />

            {hasAutoAdjustedStartDate ? (
              <View style={styles.scheduleNotice}>
                <Text style={styles.scheduleNoticeText}>
                  Some selected times have already passed today, so those reminders
                  will start from tomorrow.
                </Text>
              </View>
            ) : null}

            <DetailRow
              label="End Date"
              value={
                medicineDraft.endDate
                  ? formatDateForBackend(medicineDraft.endDate)
                  : "Not set"
              }
            />

            <DetailRow
              label="Doctor Review"
              value={doctorReviewEnabled ? "Enabled" : "Disabled"}
              removeBorder
            />
          </View>

          <View style={styles.reviewCard}>
            <View style={styles.reviewTextBlock}>
              <Text style={styles.reviewTitle}>Send to doctor for review</Text>
              <Text style={styles.reviewSubtitle}>
                Your doctor can review this reminder later.
              </Text>
            </View>

            <Switch
              value={doctorReviewEnabled}
              onValueChange={setDoctorReviewEnabled}
              disabled={isSaving}
              trackColor={{
                false: "#D1D5DB",
                true: "#BFDBFE",
              }}
              thumbColor={doctorReviewEnabled ? HEADER_BLUE : "#F9FAFB"}
            />
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom + 12, 26),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.editDetailsButton}
            onPress={handleEditDetails}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            <Text style={styles.editDetailsButtonText}>Edit Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              isSaving ? styles.disabledButton : undefined,
            ]}
            onPress={handleSaveReminder}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Save Reminder</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const DetailRow = ({
  label,
  value,
  removeBorder,
}: {
  label: string;
  value: string;
  removeBorder?: boolean;
}) => {
  return (
    <View
      style={[
        styles.detailRow,
        removeBorder ? styles.detailRowWithoutBorder : undefined,
      ]}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: HEADER_BLUE,
  },
  screen: {
    flex: 1,
    backgroundColor: BODY_BACKGROUND,
  },
  header: {
    backgroundColor: HEADER_BLUE,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "300",
    marginTop: -4,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 6,
  },
  headerSubtitle: {
    color: "#DBEAFE",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 22,
    paddingBottom: 178,
  },
  mainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 18,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  iconText: {
    fontSize: 44,
  },
  medicineName: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
  },
  doseText: {
    color: "#64748B",
    fontSize: 18,
    fontWeight: "800",
  },
  instructionsText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 14,
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 18,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
  },
  smallEditButton: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  smallEditButtonText: {
    color: HEADER_BLUE,
    fontSize: 12,
    fontWeight: "900",
  },
  detailRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailRowWithoutBorder: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  detailValue: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    flex: 1,
    textAlign: "right",
  },
  scheduleNotice: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  scheduleNoticeText: {
    color: HEADER_BLUE,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewTextBlock: {
    flex: 1,
    paddingRight: 16,
  },
  reviewTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },
  reviewSubtitle: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  editDetailsButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },
  editDetailsButtonText: {
    color: HEADER_BLUE,
    fontSize: 16,
    fontWeight: "900",
  },
  primaryButton: {
    backgroundColor: HEADER_BLUE,
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: "center",
    shadowColor: HEADER_BLUE,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.65,
  },
});