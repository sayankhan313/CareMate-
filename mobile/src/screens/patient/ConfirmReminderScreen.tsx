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
import type { RootStackParamList } from "../../types/navigation";

type ConfirmReminderScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ConfirmReminder"
>;

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
            startDate: formatDateForBackend(medicineDraft.startDate),
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
      <StatusBar backgroundColor="#1E40AF" barStyle="light-content" />

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
            <Text style={styles.cardTitle}>Reminder Details</Text>

            <DetailRow label="Frequency" value={frequencyLabel} />

            <DetailRow label="Time" value={selectedTimes.join(", ")} />

            <DetailRow
              label="Start Date"
              value={formatDateForBackend(medicineDraft.startDate)}
            />

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
              thumbColor={doctorReviewEnabled ? "#2563EB" : "#F9FAFB"}
            />
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 22),
            },
          ]}
        >
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

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.goBack()}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            <Text style={styles.editButtonText}>Edit Details</Text>
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
    backgroundColor: "#1E40AF",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  header: {
    backgroundColor: "#1E40AF",
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
    paddingBottom: 150,
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
  cardTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12,
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
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: "center",
    shadowColor: "#2563EB",
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
  editButton: {
    alignItems: "center",
    paddingTop: 14,
  },
  editButtonText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "900",
  },
});