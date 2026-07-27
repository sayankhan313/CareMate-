import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  History,
  MessageSquareText,
  Plus,
  RefreshCw,
  Send,
  Stethoscope,
  Video,
  X,
} from "lucide-react-native";

import { consultationsApi } from "../../services/consultationsApi";
import type { Consultation } from "../../services/safetyApi";
import type { PatientTabParamList } from "../../types/navigation";

type Props = BottomTabScreenProps<PatientTabParamList, "Consultations">;

type DropdownType = "reason" | "date" | "time";

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
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusLabel = (status: string) => {
  if (status === "PENDING") return "Requested";
  if (status === "ACCEPTED") return "Accepted";
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "REJECTED") return "Rejected";

  return status;
};

const getStatusTone = (status: string) => {
  if (status === "COMPLETED") {
    return {
      background: SUCCESS_LIGHT,
      text: "#167A58",
      dot: SUCCESS,
      icon: "✓",
    };
  }

  if (status === "CANCELLED" || status === "REJECTED") {
    return {
      background: DANGER_LIGHT,
      text: "#B42318",
      dot: DANGER,
      icon: "×",
    };
  }

  if (status === "ACCEPTED" || status === "IN_PROGRESS") {
    return {
      background: PRIMARY_LIGHT,
      text: PRIMARY_DARK,
      dot: PRIMARY,
      icon: "•",
    };
  }

  return {
    background: WARNING_LIGHT,
    text: "#A85A13",
    dot: WARNING,
    icon: "•",
  };
};

const getConsultationTypeLabel = (type: string) => {
  if (type === "EMERGENCY") {
    return "Emergency consultation";
  }

  return "Manual consultation";
};

const getDropdownTitle = (activeDropdown: DropdownType | null) => {
  if (activeDropdown === "reason") return "Select reason";
  if (activeDropdown === "date") return "Select preferred date";
  if (activeDropdown === "time") return "Select preferred time";

  return "";
};

const getDropdownIcon = (activeDropdown: DropdownType | null) => {
  if (activeDropdown === "reason") {
    return <MessageSquareText size={20} color={PRIMARY} strokeWidth={2.6} />;
  }

  if (activeDropdown === "date") {
    return <CalendarDays size={20} color={PRIMARY} strokeWidth={2.6} />;
  }

  if (activeDropdown === "time") {
    return <Clock3 size={20} color={PRIMARY} strokeWidth={2.6} />;
  }

  return <CheckCircle2 size={20} color={PRIMARY} strokeWidth={2.6} />;
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

  const activeConsultations = useMemo(() => {
    return consultations.filter(
      (consultation) =>
        consultation.status === "PENDING" ||
        consultation.status === "ACCEPTED" ||
        consultation.status === "IN_PROGRESS"
    );
  }, [consultations]);

  const pastConsultations = useMemo(() => {
    return consultations.filter(
      (consultation) =>
        consultation.status === "COMPLETED" ||
        consultation.status === "CANCELLED" ||
        consultation.status === "REJECTED"
    );
  }, [consultations]);

  const dropdownOptions = useMemo(() => {
    if (activeDropdown === "reason") return REASON_OPTIONS;
    if (activeDropdown === "date") return DATE_OPTIONS;
    if (activeDropdown === "time") return TIME_OPTIONS;

    return [];
  }, [activeDropdown]);

  const dropdownTitle = useMemo(() => {
    return getDropdownTitle(activeDropdown);
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
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <View>
            <Text style={styles.appBarTitle}>Consultations</Text>
            <Text style={styles.appBarSubtitle}>
              Book and manage doctor calls
            </Text>
          </View>

          
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(36, insets.bottom + 112),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshConsultations}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        >
          <View style={styles.summaryPanel}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIconCircle}>
                <Video size={24} color={PRIMARY} strokeWidth={2.7} />
              </View>

              <View style={styles.summaryTextBlock}>
                <Text style={styles.summaryTitle}>Doctor consultation</Text>
                <Text style={styles.summarySubtitle}>
                  Request a video call and manage your consultation history.
                </Text>
              </View>
            </View>

            <View style={styles.summaryStatsRow}>
              <SummaryStat label="Active" value={`${activeConsultations.length}`} />
              <SummaryStat label="Past" value={`${pastConsultations.length}`} />
              <SummaryStat label="Mode" value="Video" />
            </View>
          </View>

          <View style={styles.formPanel}>
            <SectionHeader
              icon={<Stethoscope size={21} color={PRIMARY} strokeWidth={2.6} />}
              title="Request consultation"
              subtitle="Tell the doctor what help you need"
            />

            <SelectField
              label="Reason"
              value={selectedReason}
              icon={
                <MessageSquareText
                  size={19}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              }
              placeholder={false}
              onPress={() => setActiveDropdown("reason")}
            />

            <SelectField
              label="Preferred date"
              value={preferredDate}
              icon={
                <CalendarDays size={19} color={PRIMARY} strokeWidth={2.6} />
              }
              placeholder={preferredDate === "Select date"}
              onPress={() => setActiveDropdown("date")}
            />

            <SelectField
              label="Preferred time"
              value={preferredTime}
              icon={<Clock3 size={19} color={PRIMARY} strokeWidth={2.6} />}
              placeholder={preferredTime === "Select time"}
              onPress={() => setActiveDropdown("time")}
            />

            <Text style={styles.inputLabel}>Notes optional</Text>

            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add symptoms, questions, or medicine concerns..."
              placeholderTextColor="#A8B0C2"
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.primaryButton,
                isSendingRequest ? styles.disabledButton : undefined,
              ]}
              activeOpacity={0.85}
              onPress={sendConsultationRequest}
              disabled={isSendingRequest}
            >
              {isSendingRequest ? (
                <ActivityIndicator size="small" color={SURFACE} />
              ) : (
                <>
                  <Send size={19} color={SURFACE} strokeWidth={2.6} />
                  <Text style={styles.primaryButtonText}>Send Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {screenError ? (
            <View style={styles.errorPanel}>
              <AlertCircle size={22} color={DANGER} strokeWidth={2.6} />
              <Text style={styles.errorText}>{screenError}</Text>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Active requests</Text>
              <Text style={styles.sectionSubtitle}>
                {activeConsultations.length > 0
                  ? `${activeConsultations.length} active consultation${
                      activeConsultations.length === 1 ? "" : "s"
                    }`
                  : "No active consultation right now"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              activeOpacity={0.85}
              onPress={refreshConsultations}
            >
              <RefreshCw size={19} color={PRIMARY} strokeWidth={2.6} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <LoadingRow title="Loading consultations..." />
          ) : activeConsultations.length === 0 ? (
            <EmptyRow
              icon={<Video size={22} color={PRIMARY} strokeWidth={2.6} />}
              title="No active requests"
              subtitle="Send a request to start a doctor consultation."
            />
          ) : (
            <View style={styles.listPanel}>
              {activeConsultations.map((consultation, index) => (
                <ConsultationRow
                  key={consultation.id}
                  consultation={consultation}
                  isLast={index === activeConsultations.length - 1}
                />
              ))}
            </View>
          )}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Past consultations</Text>
              <Text style={styles.sectionSubtitle}>
                Completed, cancelled and rejected requests
              </Text>
            </View>

            <View style={styles.historyIcon}>
              <History size={20} color={PRIMARY} strokeWidth={2.6} />
            </View>
          </View>

          {isLoading ? (
            <LoadingRow title="Loading history..." />
          ) : pastConsultations.length === 0 ? (
            <EmptyRow
              icon={<History size={22} color={PRIMARY} strokeWidth={2.6} />}
              title="No past consultations"
              subtitle="Completed consultations will appear here."
            />
          ) : (
            <View style={styles.listPanel}>
              {pastConsultations.map((consultation, index) => (
                <ConsultationRow
                  key={consultation.id}
                  consultation={consultation}
                  isLast={index === pastConsultations.length - 1}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <Modal
          visible={activeDropdown !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveDropdown(null)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalDismissArea}
              activeOpacity={1}
              onPress={() => setActiveDropdown(null)}
            />

            <View
              style={[
                styles.modalCard,
                {
                  paddingBottom: Math.max(18, insets.bottom + 12),
                },
              ]}
            >
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <View style={styles.modalIconCircle}>
                    {getDropdownIcon(activeDropdown)}
                  </View>

                  <Text style={styles.modalTitle}>{dropdownTitle}</Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  activeOpacity={0.85}
                  onPress={() => setActiveDropdown(null)}
                >
                  <X size={20} color={TEXT} strokeWidth={2.6} />
                </TouchableOpacity>
              </View>

              {dropdownOptions.map((option, index) => {
                const isSelected =
                  option === selectedReason ||
                  option === preferredDate ||
                  option === preferredTime;

                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.modalOption,
                      index === dropdownOptions.length - 1
                        ? styles.modalOptionLast
                        : undefined,
                      isSelected ? styles.modalOptionSelected : undefined,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => selectDropdownOption(option)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected ? styles.modalOptionTextSelected : undefined,
                      ]}
                    >
                      {option}
                    </Text>

                    {isSelected ? (
                      <CheckCircle2
                        size={19}
                        color={PRIMARY}
                        strokeWidth={2.7}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const SummaryStat = ({ label, value }: { label: string; value: string }) => {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryStatValue}>{value}</Text>
      <Text style={styles.summaryStatLabel}>{label}</Text>
    </View>
  );
};

const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) => {
  return (
    <View style={styles.formHeader}>
      <View style={styles.formIcon}>{icon}</View>

      <View style={styles.formHeaderText}>
        <Text style={styles.formTitle}>{title}</Text>
        <Text style={styles.formSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const SelectField = ({
  label,
  value,
  icon,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  placeholder: boolean;
  onPress: () => void;
}) => {
  return (
    <View style={styles.selectFieldBlock}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TouchableOpacity
        style={styles.selectBox}
        activeOpacity={0.85}
        onPress={onPress}
      >
        <View style={styles.selectLeft}>
          <View style={styles.selectIcon}>{icon}</View>

          <Text
            style={[
              styles.selectText,
              placeholder ? styles.placeholderText : undefined,
            ]}
            numberOfLines={1}
          >
            {value}
          </Text>
        </View>

        <ChevronDown size={21} color={MUTED} strokeWidth={2.7} />
      </TouchableOpacity>
    </View>
  );
};

const ConsultationRow = ({
  consultation,
  isLast,
}: {
  consultation: Consultation;
  isLast: boolean;
}) => {
  const tone = getStatusTone(consultation.status);

  return (
    <View style={[styles.consultationRow, isLast ? styles.rowLast : undefined]}>
      <View
        style={[
          styles.statusIconCircle,
          {
            backgroundColor: tone.background,
          },
        ]}
      >
        <Text
          style={[
            styles.statusIconText,
            {
              color: tone.text,
            },
          ]}
        >
          {tone.icon}
        </Text>
      </View>

      <View style={styles.consultationInfo}>
        <Text style={styles.consultationTitle} numberOfLines={1}>
          {getConsultationTypeLabel(consultation.type)}
        </Text>

        <Text style={styles.consultationSubtitle} numberOfLines={2}>
          {formatConsultationDate(consultation.createdAt)}
        </Text>
      </View>

      <View
        style={[
          styles.consultationBadge,
          {
            backgroundColor: tone.background,
          },
        ]}
      >
        <View
          style={[
            styles.consultationBadgeDot,
            {
              backgroundColor: tone.dot,
            },
          ]}
        />
        <Text
          style={[
            styles.consultationBadgeText,
            {
              color: tone.text,
            },
          ]}
        >
          {getStatusLabel(consultation.status)}
        </Text>
      </View>
    </View>
  );
};

const LoadingRow = ({ title }: { title: string }) => {
  return (
    <View style={styles.emptyPanel}>
      <ActivityIndicator size="small" color={PRIMARY} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>Please wait a moment.</Text>
    </View>
  );
};

const EmptyRow = ({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) => {
  return (
    <View style={styles.emptyPanel}>
      <View style={styles.emptyIconCircle}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{subtitle}</Text>
    </View>
  );
};

export default ConsultationsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  appBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  appBarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  summaryPanel: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  summaryTextBlock: {
    flex: 1,
  },
  summaryTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.25,
  },
  summarySubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 4,
  },
  summaryStatsRow: {
    flexDirection: "row",
    backgroundColor: SOFT_PANEL,
    borderRadius: 16,
    padding: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  summaryStat: {
    flex: 1,
    alignItems: "center",
  },
  summaryStatValue: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
  },
  summaryStatLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3,
  },
  formPanel: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  formIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  formHeaderText: {
    flex: 1,
  },
  formTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.25,
  },
  formSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 2,
  },
  selectFieldBlock: {
    marginTop: 13,
  },
  inputLabel: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
  },
  selectBox: {
    backgroundColor: SOFT_PANEL,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },
  selectIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  selectText: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
  },
  placeholderText: {
    color: "#A8B0C2",
  },
  notesInput: {
    minHeight: 108,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SOFT_PANEL,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 13,
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 16,
  },
  primaryButtonText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 9,
  },
  disabledButton: {
    opacity: 0.65,
  },
  errorPanel: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  errorText: {
    flex: 1,
    color: "#B42318",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginLeft: 10,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  listPanel: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  consultationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  statusIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  statusIconText: {
    fontSize: 18,
    fontWeight: "900",
  },
  consultationInfo: {
    flex: 1,
    paddingRight: 10,
  },
  consultationTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  consultationSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3,
  },
  consultationBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  consultationBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  consultationBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  emptyPanel: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  emptyText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.38)",
    justifyContent: "flex-end",
  },
  modalDismissArea: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D4DAE6",
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  modalTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  modalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  modalTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
  },
  modalOptionLast: {
    borderBottomWidth: 0,
  },
  modalOptionSelected: {
    backgroundColor: PRIMARY_LIGHT,
    borderBottomColor: "transparent",
    marginBottom: 5,
  },
  modalOptionText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
  },
  modalOptionTextSelected: {
    color: PRIMARY_DARK,
    fontWeight: "900",
  },
});