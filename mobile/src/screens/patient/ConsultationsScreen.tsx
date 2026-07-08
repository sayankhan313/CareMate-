import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { consultationsApi } from "../../services/consultationsApi";
import type { Consultation } from "../../services/safetyApi";
import type { PatientTabParamList } from "../../types/navigation";

type Props = BottomTabScreenProps<PatientTabParamList, "Consultations">;

type DropdownType = "reason" | "date" | "time";

const HEADER_BLUE = "#2563EB";

const REASON_OPTIONS = [
  "High blood pressure",
  "Chest discomfort",
  "Dizziness",
  "Breathing difficulty",
  "Medication question",
  "General consultation",
];

const DATE_OPTIONS = ["Today", "Tomorrow", "Next available date", "This week"];

const TIME_OPTIONS = [
  "As soon as possible",
  "Morning",
  "Afternoon",
  "Evening",
];

const formatConsultationDate = (value?: string | null) => {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
};

const getStatusLabel = (status: string) => {
  if (status === "PENDING") {
    return "Requested";
  }

  if (status === "ACCEPTED") {
    return "Accepted";
  }

  if (status === "IN_PROGRESS") {
    return "In progress";
  }

  if (status === "COMPLETED") {
    return "Completed";
  }

  if (status === "CANCELLED") {
    return "Cancelled";
  }

  if (status === "REJECTED") {
    return "Rejected";
  }

  return status;
};

const getStatusStyles = (status: string) => {
  if (status === "COMPLETED") {
    return {
      circle: styles.completedCircle,
      icon: styles.completedIcon,
      iconText: "✓",
    };
  }

  if (status === "CANCELLED" || status === "REJECTED") {
    return {
      circle: styles.cancelledCircle,
      icon: styles.cancelledIcon,
      iconText: "×",
    };
  }

  return {
    circle: styles.requestedCircle,
    icon: styles.requestedIcon,
    iconText: "•",
  };
};

const ConsultationsScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const rootNavigation = navigation.getParent<any>();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [screenError, setScreenError] = useState("");

  const [selectedReason, setSelectedReason] = useState(REASON_OPTIONS[0]);
  const [preferredDate, setPreferredDate] = useState("Select date");
  const [preferredTime, setPreferredTime] = useState("Select time");
  const [notes, setNotes] = useState("");

  const [activeDropdown, setActiveDropdown] = useState<DropdownType | null>(
    null
  );

  const pastConsultations = useMemo(() => {
    return consultations.filter(
      (consultation) =>
        consultation.status === "COMPLETED" ||
        consultation.status === "CANCELLED" ||
        consultation.status === "REJECTED"
    );
  }, [consultations]);

  const dropdownOptions = useMemo(() => {
    if (activeDropdown === "reason") {
      return REASON_OPTIONS;
    }

    if (activeDropdown === "date") {
      return DATE_OPTIONS;
    }

    if (activeDropdown === "time") {
      return TIME_OPTIONS;
    }

    return [];
  }, [activeDropdown]);

  const dropdownTitle = useMemo(() => {
    if (activeDropdown === "reason") {
      return "Select reason";
    }

    if (activeDropdown === "date") {
      return "Select preferred date";
    }

    if (activeDropdown === "time") {
      return "Select preferred time";
    }

    return "";
  }, [activeDropdown]);

  const loadConsultations = useCallback(async () => {
    try {
      setScreenError("");

      const result = await consultationsApi.listConsultations();
      setConsultations(result);
    } catch (error) {
      setScreenError(
        error instanceof Error
          ? error.message
          : "Unable to load consultations."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConsultations();
  }, [loadConsultations]);

  const refreshConsultations = useCallback(() => {
    setIsRefreshing(true);
    loadConsultations();
  }, [loadConsultations]);

  const selectDropdownOption = useCallback(
    (option: string) => {
      if (activeDropdown === "reason") {
        setSelectedReason(option);
      }

      if (activeDropdown === "date") {
        setPreferredDate(option);
      }

      if (activeDropdown === "time") {
        setPreferredTime(option);
      }

      setActiveDropdown(null);
    },
    [activeDropdown]
  );

  const buildManualReason = useCallback(() => {
    const parts = [
      `Reason: ${selectedReason}`,
      `Preferred date: ${preferredDate}`,
      `Preferred time: ${preferredTime}`,
    ];

    if (notes.trim()) {
      parts.push(`Notes: ${notes.trim()}`);
    }

    return parts.join("\n");
  }, [notes, preferredDate, preferredTime, selectedReason]);

  const sendConsultationRequest = useCallback(async () => {
    if (isSendingRequest) {
      return;
    }

    if (preferredDate === "Select date") {
      Alert.alert("Select date", "Please select a preferred date.");
      return;
    }

    if (preferredTime === "Select time") {
      Alert.alert("Select time", "Please select a preferred time.");
      return;
    }

    try {
      setIsSendingRequest(true);
      setScreenError("");

      const result = await consultationsApi.createManualConsultation({
        reason: buildManualReason(),
      });

      setNotes("");
      setPreferredDate("Select date");
      setPreferredTime("Select time");

      rootNavigation?.navigate("VideoConsultation", {
        consultationId: result.consultation.id,
        consultationType: result.consultation.type,
        patientMeeting: result.patientMeeting,
        doctorMeeting: result.doctorMeeting,
        patientMeetingUrl: result.patientMeeting.webUrl,
        doctorMeetingUrl: result.doctorMeeting.webUrl,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to send consultation request.";

      setScreenError(message);
      Alert.alert("Request failed", message);
    } finally {
      setIsSendingRequest(false);
    }
  }, [
    buildManualReason,
    isSendingRequest,
    preferredDate,
    preferredTime,
    rootNavigation,
  ]);

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={HEADER_BLUE}
        translucent={false}
      />

      <View
        style={[
          styles.header,
          { paddingTop: Math.max(24, insets.top + 12) },
        ]}
      >
        <View>
          <Text style={styles.headerTitle}>Consultations</Text>
          <Text style={styles.headerSubtitle}>
            Book and manage doctor calls
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerAddButton}
          onPress={() => setActiveDropdown("reason")}
        >
          <Text style={styles.headerAddText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(96, insets.bottom + 84) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshConsultations}
            />
          }
        >
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Request Consultation</Text>

            <Text style={styles.inputLabel}>Reason</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setActiveDropdown("reason")}
            >
              <Text style={styles.selectText}>{selectedReason}</Text>
              <Text style={styles.selectChevron}>⌄</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Preferred Date</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setActiveDropdown("date")}
            >
              <Text
                style={[
                  styles.selectText,
                  preferredDate === "Select date" && styles.placeholderText,
                ]}
              >
                {preferredDate}
              </Text>
              <Text style={styles.selectChevron}>⌄</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Preferred Time</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setActiveDropdown("time")}
            >
              <Text
                style={[
                  styles.selectText,
                  preferredTime === "Select time" && styles.placeholderText,
                ]}
              >
                {preferredTime}
              </Text>
              <Text style={styles.selectChevron}>⌄</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Notes Optional</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any additional notes..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.sendRequestButton,
                isSendingRequest && styles.disabledButton,
              ]}
              onPress={sendConsultationRequest}
              disabled={isSendingRequest}
            >
              {isSendingRequest ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendRequestText}>Send Request</Text>
              )}
            </TouchableOpacity>
          </View>

          {screenError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{screenError}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Past Consultations</Text>

          {isLoading ? (
            <View style={styles.pastCard}>
              <ActivityIndicator size="small" color={HEADER_BLUE} />

              <View style={styles.pastInfo}>
                <Text style={styles.pastTitle}>Loading consultations...</Text>
                <Text style={styles.pastSubtitle}>Please wait</Text>
              </View>
            </View>
          ) : pastConsultations.length === 0 ? (
            <View style={styles.pastCard}>
              <View style={styles.requestedCircle}>
                <Text style={styles.requestedIcon}>•</Text>
              </View>

              <View style={styles.pastInfo}>
                <Text style={styles.pastTitle}>No past consultations</Text>
                <Text style={styles.pastSubtitle}>
                  Completed consultations will appear here
                </Text>
              </View>
            </View>
          ) : (
            pastConsultations.map((consultation) => {
              const statusStyle = getStatusStyles(consultation.status);

              return (
                <View key={consultation.id} style={styles.pastCard}>
                  <View style={statusStyle.circle}>
                    <Text style={statusStyle.icon}>
                      {statusStyle.iconText}
                    </Text>
                  </View>

                  <View style={styles.pastInfo}>
                    <Text style={styles.pastTitle}>
                      {formatConsultationDate(consultation.createdAt)} •{" "}
                      {consultation.type === "EMERGENCY"
                        ? "Emergency consultation"
                        : "Manual consultation"}
                    </Text>

                    <Text style={styles.pastSubtitle}>
                      {getStatusLabel(consultation.status)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      <Modal
        visible={activeDropdown !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setActiveDropdown(null)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{dropdownTitle}</Text>

            {dropdownOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={() => selectDropdownOption(option)}
              >
                <Text style={styles.modalOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default ConsultationsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: HEADER_BLUE,
  },
  header: {
    backgroundColor: HEADER_BLUE,
    paddingHorizontal: 20,
    paddingBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  body: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#DBEAFE",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3,
  },
  headerAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAddText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginTop: -3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 18,
  },
  cardTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
  },
  inputLabel: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 10,
  },
  selectBox: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "600",
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  selectChevron: {
    color: "#6B7280",
    fontSize: 20,
    fontWeight: "900",
    marginTop: -5,
  },
  notesInput: {
    height: 108,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    color: "#111827",
    fontSize: 15,
    lineHeight: 21,
  },
  sendRequestButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: HEADER_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  sendRequestText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.65,
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 18,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  pastCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  requestedCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  requestedIcon: {
    color: HEADER_BLUE,
    fontSize: 18,
    fontWeight: "900",
  },
  completedCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  completedIcon: {
    color: "#16A34A",
    fontSize: 16,
    fontWeight: "900",
  },
  cancelledCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cancelledIcon: {
    color: "#DC2626",
    fontSize: 18,
    fontWeight: "900",
  },
  pastInfo: {
    flex: 1,
  },
  pastTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  pastSubtitle: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.38)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
  },
  modalTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalOptionText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
});