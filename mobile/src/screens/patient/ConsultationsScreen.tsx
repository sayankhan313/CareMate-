import React, {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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
  ChevronRight,
  Clock3,
  History,
  MessageSquareText,
  RefreshCw,
  Send,
  Stethoscope,
  UserPlus,
  Video,
  X,
} from "lucide-react-native";

import {
  consultationsApi,
  type CreateManualConsultationPayload,
} from "../../services/consultationsApi";
import {
  doctorAssignmentApi,
  type AssignedDoctor,
} from "../../services/doctorAssignmentApi";
import type { Consultation } from "../../services/safetyApi";
import type { PatientTabParamList } from "../../types/navigation";

type Props = BottomTabScreenProps<
  PatientTabParamList,
  "Consultations"
>;

type DropdownType =
  | "doctor"
  | "reason"
  | "date"
  | "time";

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

const DATE_OPTIONS = [
  "Today",
  "Tomorrow",
  "Next available date",
  "This week",
];

const TIME_OPTIONS = [
  "As soon as possible",
  "Morning",
  "Afternoon",
  "Evening",
];

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity:
    Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: {
    width: 0,
    height: level === 1 ? 2 : 4,
  },
});

const formatDoctorName = (
  fullName: string
) => {
  if (/^dr\.?\s/i.test(fullName.trim())) {
    return fullName.trim();
  }

  return `Dr. ${fullName.trim()}`;
};

const padDateValue = (value: number) =>
  String(value).padStart(2, "0");

const formatDateForBackend = (
  date: Date
) => {
  return `${padDateValue(
    date.getDate()
  )}/${padDateValue(
    date.getMonth() + 1
  )}/${date.getFullYear()}`;
};

const getDateFromOption = (
  option: string
) => {
  const date = new Date();

  if (option === "Tomorrow") {
    date.setDate(date.getDate() + 1);
  }

  if (option === "Next available date") {
    date.setDate(date.getDate() + 2);
  }

  if (option === "This week") {
    date.setDate(date.getDate() + 3);
  }

  return date;
};

const getTimeForBackend = (
  option: string
) => {
  if (option === "Morning") {
    return "09:00";
  }

  if (option === "Afternoon") {
    return "14:00";
  }

  if (option === "Evening") {
    return "18:00";
  }

  return null;
};

const formatConsultationDate = (
  value?: string | null
) => {
  if (!value) {
    return "No preferred time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No preferred time";
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

const getStatusLabel = (
  status: string
) => {
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

const getStatusHint = (
  status: string
) => {
  if (status === "PENDING") {
    return "Waiting for doctor response";
  }

  if (status === "ACCEPTED") {
    return "Doctor accepted. You can join now.";
  }

  if (status === "IN_PROGRESS") {
    return "Consultation is in progress.";
  }

  if (status === "COMPLETED") {
    return "Consultation completed.";
  }

  if (status === "REJECTED") {
    return "Doctor rejected this request.";
  }

  if (status === "CANCELLED") {
    return "Consultation cancelled.";
  }

  return "Consultation updated.";
};

const getStatusTone = (
  status: string
) => {
  if (status === "COMPLETED") {
    return {
      background: SUCCESS_LIGHT,
      text: "#167A58",
      dot: SUCCESS,
      icon: "✓",
    };
  }

  if (
    status === "CANCELLED" ||
    status === "REJECTED"
  ) {
    return {
      background: DANGER_LIGHT,
      text: "#B42318",
      dot: DANGER,
      icon: "×",
    };
  }

  if (
    status === "ACCEPTED" ||
    status === "IN_PROGRESS"
  ) {
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

const getConsultationTypeLabel = (
  type: string
) => {
  if (type === "EMERGENCY") {
    return "Emergency consultation";
  }

  return "Manual consultation";
};

const canJoinConsultation = (
  status: string
) => {
  return (
    status === "ACCEPTED" ||
    status === "IN_PROGRESS"
  );
};

const getDropdownTitle = (
  activeDropdown: DropdownType | null
) => {
  if (activeDropdown === "doctor") {
    return "Select assigned doctor";
  }

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
};

const getDropdownIcon = (
  activeDropdown: DropdownType | null
) => {
  if (activeDropdown === "doctor") {
    return (
      <Stethoscope
        size={20}
        color={PRIMARY}
        strokeWidth={2.6}
      />
    );
  }

  if (activeDropdown === "reason") {
    return (
      <MessageSquareText
        size={20}
        color={PRIMARY}
        strokeWidth={2.6}
      />
    );
  }

  if (activeDropdown === "date") {
    return (
      <CalendarDays
        size={20}
        color={PRIMARY}
        strokeWidth={2.6}
      />
    );
  }

  if (activeDropdown === "time") {
    return (
      <Clock3
        size={20}
        color={PRIMARY}
        strokeWidth={2.6}
      />
    );
  }

  return (
    <CheckCircle2
      size={20}
      color={PRIMARY}
      strokeWidth={2.6}
    />
  );
};

const ConsultationsScreen = ({
  navigation,
}: Props) => {
  const insets = useSafeAreaInsets();
  const rootNavigation =
    navigation.getParent<any>();

  const [consultations, setConsultations] =
    useState<Consultation[]>([]);

  const [assignedDoctors, setAssignedDoctors] =
    useState<AssignedDoctor[]>([]);

  const [
    selectedDoctorId,
    setSelectedDoctorId,
  ] = useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [
    isSendingRequest,
    setIsSendingRequest,
  ] = useState(false);

  const [screenError, setScreenError] =
    useState("");

  const [
    selectedReason,
    setSelectedReason,
  ] = useState(REASON_OPTIONS[0]);

  const [
    preferredDate,
    setPreferredDate,
  ] = useState(DATE_OPTIONS[0]);

  const [
    preferredTime,
    setPreferredTime,
  ] = useState(TIME_OPTIONS[0]);

  const [notes, setNotes] = useState("");

  const [
    activeDropdown,
    setActiveDropdown,
  ] = useState<DropdownType | null>(
    null
  );

  const selectedDoctor = useMemo(() => {
    return assignedDoctors.find(
      (assignment) =>
        assignment.doctor.id ===
        selectedDoctorId
    );
  }, [
    assignedDoctors,
    selectedDoctorId,
  ]);

  const activeConsultations =
    useMemo(() => {
      return consultations.filter(
        (consultation) =>
          consultation.status ===
            "PENDING" ||
          consultation.status ===
            "ACCEPTED" ||
          consultation.status ===
            "IN_PROGRESS"
      );
    }, [consultations]);

  const pastConsultations =
    useMemo(() => {
      return consultations.filter(
        (consultation) =>
          consultation.status ===
            "COMPLETED" ||
          consultation.status ===
            "CANCELLED" ||
          consultation.status ===
            "REJECTED"
      );
    }, [consultations]);

  const dropdownOptions =
    useMemo(() => {
      if (
        activeDropdown === "reason"
      ) {
        return REASON_OPTIONS;
      }

      if (
        activeDropdown === "date"
      ) {
        return DATE_OPTIONS;
      }

      if (
        activeDropdown === "time"
      ) {
        return TIME_OPTIONS;
      }

      return [];
    }, [activeDropdown]);

  const dropdownTitle = useMemo(
    () =>
      getDropdownTitle(
        activeDropdown
      ),
    [activeDropdown]
  );

  const loadScreenData = useCallback(
    async (
      mode: "initial" | "refresh" =
        "initial"
    ) => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        setScreenError("");

        const [
          consultationResult,
          doctorResult,
        ] = await Promise.all([
          consultationsApi.listConsultations(),
          doctorAssignmentApi.getAssignedDoctors(),
        ]);

        setConsultations(
          consultationResult
        );

        setAssignedDoctors(
          doctorResult.doctors
        );

        setSelectedDoctorId(
          (currentDoctorId) => {
            const currentExists =
              doctorResult.doctors.some(
                (assignment) =>
                  assignment.doctor.id ===
                  currentDoctorId
              );

            if (currentExists) {
              return currentDoctorId;
            }

            const primaryDoctor =
              doctorResult.doctors.find(
                (assignment) =>
                  assignment.assignmentType ===
                  "PRIMARY"
              );

            return (
              primaryDoctor?.doctor.id ||
              doctorResult.doctors[0]
                ?.doctor.id ||
              null
            );
          }
        );
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
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadScreenData(
        "initial"
      );
    }, [loadScreenData])
  );

  const refreshScreen =
    useCallback(() => {
      void loadScreenData(
        "refresh"
      );
    }, [loadScreenData]);

  const selectDropdownOption =
    useCallback(
      (option: string) => {
        if (
          activeDropdown ===
          "reason"
        ) {
          setSelectedReason(option);
        }

        if (
          activeDropdown === "date"
        ) {
          setPreferredDate(option);
        }

        if (
          activeDropdown === "time"
        ) {
          setPreferredTime(option);
        }

        setActiveDropdown(null);
      },
      [activeDropdown]
    );

  const buildPreferredPayload =
    useCallback(() => {
      const selectedTime =
        getTimeForBackend(
          preferredTime
        );

      if (!selectedTime) {
        return {};
      }

      const selectedDate =
        getDateFromOption(
          preferredDate
        );

      const [hour, minute] =
        selectedTime
          .split(":")
          .map(Number);

      selectedDate.setHours(
        hour,
        minute,
        0,
        0
      );

      if (
        selectedDate.getTime() <
        Date.now() + 60 * 1000
      ) {
        selectedDate.setDate(
          selectedDate.getDate() + 1
        );
      }

      return {
        preferredDate:
          formatDateForBackend(
            selectedDate
          ),
        preferredTime:
          selectedTime,
      };
    }, [
      preferredDate,
      preferredTime,
    ]);

  const buildRequestNotes =
    useCallback(() => {
      const parts = [
        `Preferred: ${preferredDate}, ${preferredTime}`,
      ];

      if (notes.trim()) {
        parts.push(notes.trim());
      }

      return parts.join("\n");
    }, [
      notes,
      preferredDate,
      preferredTime,
    ]);

  const sendConsultationRequest =
    useCallback(async () => {
      if (isSendingRequest) {
        return;
      }

      if (!selectedDoctorId) {
        Alert.alert(
          "Select a doctor",
          "Please assign and select a doctor before sending a consultation request."
        );
        return;
      }

      try {
        setIsSendingRequest(true);
        setScreenError("");

        const payload:
          CreateManualConsultationPayload =
          {
            doctorId:
              selectedDoctorId,
            reason: selectedReason,
            ...buildPreferredPayload(),
            notes:
              buildRequestNotes(),
          };

        const result =
          await consultationsApi.createManualConsultation(
            payload
          );

        setConsultations(
          (
            currentConsultations
          ) => [
            result.consultation,
            ...currentConsultations.filter(
              (consultation) =>
                consultation.id !==
                result.consultation.id
            ),
          ]
        );

        setNotes("");
        setPreferredDate(
          DATE_OPTIONS[0]
        );
        setPreferredTime(
          TIME_OPTIONS[0]
        );

        Alert.alert(
          "Request sent",
          selectedDoctor
            ? `Your consultation request has been sent to ${formatDoctorName(
                selectedDoctor.doctor
                  .fullName
              )}.`
            : "Your consultation request has been sent."
        );

        await loadScreenData(
          "refresh"
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to send consultation request.";

        setScreenError(message);

        Alert.alert(
          "Request failed",
          message
        );
      } finally {
        setIsSendingRequest(false);
      }
    }, [
      buildPreferredPayload,
      buildRequestNotes,
      isSendingRequest,
      loadScreenData,
      selectedDoctor,
      selectedDoctorId,
      selectedReason,
    ]);

  const openActiveCallsScreen = useCallback(() => {
    if (!rootNavigation) {
      Alert.alert(
        "Unable to open calls",
        "Active Calls screen is not available right now."
      );
      return;
    }

    rootNavigation.navigate("PatientActiveCalls");
  }, [rootNavigation]);

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <StatusBar
        backgroundColor={
          BACKGROUND
        }
        barStyle="dark-content"
      />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <View>
            <Text
              style={
                styles.appBarTitle
              }
            >
              Consultations
            </Text>

            <Text
              style={
                styles.appBarSubtitle
              }
            >
              Request and manage
              doctor calls
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                Math.max(
                  36,
                  insets.bottom + 112
                ),
            },
          ]}
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={
                isRefreshing
              }
              onRefresh={
                refreshScreen
              }
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        >
          <View
            style={
              styles.summaryPanel
            }
          >
            <View
              style={
                styles.summaryHeader
              }
            >
              <View
                style={
                  styles.summaryIconCircle
                }
              >
                <Video
                  size={24}
                  color={PRIMARY}
                  strokeWidth={2.7}
                />
              </View>

              <View
                style={
                  styles.summaryTextBlock
                }
              >
                <Text
                  style={
                    styles.summaryTitle
                  }
                >
                  Doctor consultation
                </Text>

                <Text
                  style={
                    styles.summarySubtitle
                  }
                >
                  Select an assigned
                  doctor and send a
                  consultation request.
                </Text>
              </View>
            </View>

            <View
              style={
                styles.summaryStatsRow
              }
            >
              <SummaryStat
                label="Active"
                value={`${activeConsultations.length}`}
              />

              <SummaryStat
                label="Past"
                value={`${pastConsultations.length}`}
              />

              <SummaryStat
                label="Doctors"
                value={`${assignedDoctors.length}`}
              />
            </View>
          </View>

          <View
            style={styles.formPanel}
          >
            <SectionHeader
              icon={
                <Stethoscope
                  size={21}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              }
              title="Request consultation"
              subtitle="Choose an assigned doctor and describe what help you need"
            />

            {assignedDoctors.length ===
            0 ? (
              <View
                style={
                  styles.noDoctorPanel
                }
              >
                <View
                  style={
                    styles.noDoctorIcon
                  }
                >
                  <Stethoscope
                    size={25}
                    color={PRIMARY}
                    strokeWidth={2.5}
                  />
                </View>

                <View
                  style={
                    styles.noDoctorTextBlock
                  }
                >
                  <Text
                    style={
                      styles.noDoctorTitle
                    }
                  >
                    No assigned doctors
                  </Text>

                  <Text
                    style={
                      styles.noDoctorText
                    }
                  >
                    Add an approved doctor
                    before requesting a
                    consultation.
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.manageDoctorButton
                  }
                  activeOpacity={0.85}
                  onPress={() =>
                    rootNavigation?.navigate(
                      "SelectDoctor"
                    )
                  }
                >
                  <UserPlus
                    size={17}
                    color={SURFACE}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <SelectField
                label="Assigned doctor"
                value={
                  selectedDoctor
                    ? formatDoctorName(
                        selectedDoctor
                          .doctor
                          .fullName
                      )
                    : "Select doctor"
                }
                helperText={
                  selectedDoctor
                    ?.doctor
                    .specialization ||
                  undefined
                }
                icon={
                  <Stethoscope
                    size={19}
                    color={PRIMARY}
                    strokeWidth={2.6}
                  />
                }
                placeholder={
                  !selectedDoctor
                }
                onPress={() =>
                  setActiveDropdown(
                    "doctor"
                  )
                }
              />
            )}

            <SelectField
              label="Reason"
              value={
                selectedReason
              }
              icon={
                <MessageSquareText
                  size={19}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              }
              placeholder={false}
              onPress={() =>
                setActiveDropdown(
                  "reason"
                )
              }
            />

            <SelectField
              label="Preferred date"
              value={
                preferredDate
              }
              icon={
                <CalendarDays
                  size={19}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              }
              placeholder={false}
              onPress={() =>
                setActiveDropdown(
                  "date"
                )
              }
            />

            <SelectField
              label="Preferred time"
              value={
                preferredTime
              }
              icon={
                <Clock3
                  size={19}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              }
              placeholder={false}
              onPress={() =>
                setActiveDropdown(
                  "time"
                )
              }
            />

            <Text
              style={
                styles.inputLabel
              }
            >
              Notes optional
            </Text>

            <TextInput
              style={
                styles.notesInput
              }
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
                isSendingRequest ||
                !selectedDoctorId
                  ? styles.disabledButton
                  : undefined,
              ]}
              activeOpacity={0.85}
              onPress={
                sendConsultationRequest
              }
              disabled={
                isSendingRequest ||
                !selectedDoctorId
              }
            >
              {isSendingRequest ? (
                <ActivityIndicator
                  size="small"
                  color={SURFACE}
                />
              ) : (
                <>
                  <Send
                    size={19}
                    color={SURFACE}
                    strokeWidth={2.6}
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Send Request
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {screenError ? (
            <View
              style={
                styles.errorPanel
              }
            >
              <AlertCircle
                size={22}
                color={DANGER}
                strokeWidth={2.6}
              />

              <Text
                style={
                  styles.errorText
                }
              >
                {screenError}
              </Text>
            </View>
          ) : null}

          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Active requests
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                {activeConsultations.length >
                0
                  ? `${activeConsultations.length} active consultation${
                      activeConsultations.length ===
                      1
                        ? ""
                        : "s"
                    }`
                  : "No active consultation right now"}
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.refreshButton
              }
              activeOpacity={0.85}
              onPress={
                refreshScreen
              }
            >
              <RefreshCw
                size={19}
                color={PRIMARY}
                strokeWidth={2.6}
              />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <LoadingRow title="Loading consultations..." />
          ) : activeConsultations.length ===
            0 ? (
            <EmptyRow
              icon={
                <Video
                  size={22}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              }
              title="No active requests"
              subtitle="Send a request to start a doctor consultation."
            />
          ) : (
            <View
              style={
                styles.listPanel
              }
            >
              {activeConsultations.map(
                (
                  consultation,
                  index
                ) => (
                  <ConsultationRow
                    key={
                      consultation.id
                    }
                    consultation={
                      consultation
                    }
                    isLast={
                      index ===
                      activeConsultations.length -
                        1
                    }
                    onOpenActiveCalls={
                      openActiveCallsScreen
                    }
                  />
                )
              )}
            </View>
          )}

          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Past consultations
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Completed, cancelled and
                rejected requests
              </Text>
            </View>

            <View
              style={
                styles.historyIcon
              }
            >
              <History
                size={20}
                color={PRIMARY}
                strokeWidth={2.6}
              />
            </View>
          </View>

          {isLoading ? (
            <LoadingRow title="Loading history..." />
          ) : pastConsultations.length ===
            0 ? (
            <EmptyRow
              icon={
                <History
                  size={22}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              }
              title="No past consultations"
              subtitle="Completed consultations will appear here."
            />
          ) : (
            <View
              style={
                styles.listPanel
              }
            >
              {pastConsultations.map(
                (
                  consultation,
                  index
                ) => (
                  <ConsultationRow
                    key={
                      consultation.id
                    }
                    consultation={
                      consultation
                    }
                    isLast={
                      index ===
                      pastConsultations.length -
                        1
                    }
                    onOpenActiveCalls={() =>
                      undefined
                    }
                  />
                )
              )}
            </View>
          )}
        </ScrollView>

        <Modal
          visible={
            activeDropdown !== null
          }
          transparent
          animationType="fade"
          onRequestClose={() =>
            setActiveDropdown(null)
          }
        >
          <View
            style={
              styles.modalBackdrop
            }
          >
            <TouchableOpacity
              style={
                styles.modalDismissArea
              }
              activeOpacity={1}
              onPress={() =>
                setActiveDropdown(
                  null
                )
              }
            />

            <View
              style={[
                styles.modalCard,
                {
                  paddingBottom:
                    Math.max(
                      18,
                      insets.bottom + 12
                    ),
                },
              ]}
            >
              <View
                style={
                  styles.modalHandle
                }
              />

              <View
                style={
                  styles.modalHeader
                }
              >
                <View
                  style={
                    styles.modalTitleRow
                  }
                >
                  <View
                    style={
                      styles.modalIconCircle
                    }
                  >
                    {getDropdownIcon(
                      activeDropdown
                    )}
                  </View>

                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    {dropdownTitle}
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.modalCloseButton
                  }
                  activeOpacity={0.85}
                  onPress={() =>
                    setActiveDropdown(
                      null
                    )
                  }
                >
                  <X
                    size={20}
                    color={TEXT}
                    strokeWidth={2.6}
                  />
                </TouchableOpacity>
              </View>

              {activeDropdown ===
              "doctor"
                ? assignedDoctors.map(
                    (
                      assignment,
                      index
                    ) => {
                      const isSelected =
                        assignment
                          .doctor.id ===
                        selectedDoctorId;

                      return (
                        <TouchableOpacity
                          key={
                            assignment.assignmentId
                          }
                          style={[
                            styles.modalDoctorOption,
                            index ===
                            assignedDoctors.length -
                              1
                              ? styles.modalOptionLast
                              : undefined,
                            isSelected
                              ? styles.modalOptionSelected
                              : undefined,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => {
                            setSelectedDoctorId(
                              assignment
                                .doctor.id
                            );

                            setActiveDropdown(
                              null
                            );
                          }}
                        >
                          <View
                            style={
                              styles.modalDoctorIcon
                            }
                          >
                            <Stethoscope
                              size={19}
                              color={
                                PRIMARY
                              }
                              strokeWidth={
                                2.5
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.modalDoctorText
                            }
                          >
                            <Text
                              style={[
                                styles.modalOptionText,
                                isSelected
                                  ? styles.modalOptionTextSelected
                                  : undefined,
                              ]}
                            >
                              {formatDoctorName(
                                assignment
                                  .doctor
                                  .fullName
                              )}
                            </Text>

                            <Text
                              style={
                                styles.modalDoctorSpecialization
                              }
                            >
                              {assignment
                                .doctor
                                .specialization ||
                                (assignment.assignmentType ===
                                "PRIMARY"
                                  ? "Primary doctor"
                                  : "Specialist doctor")}
                            </Text>
                          </View>

                          {isSelected ? (
                            <CheckCircle2
                              size={19}
                              color={
                                PRIMARY
                              }
                              strokeWidth={
                                2.7
                              }
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    }
                  )
                : dropdownOptions.map(
                    (
                      option,
                      index
                    ) => {
                      const isSelected =
                        option ===
                          selectedReason ||
                        option ===
                          preferredDate ||
                        option ===
                          preferredTime;

                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.modalOption,
                            index ===
                            dropdownOptions.length -
                              1
                              ? styles.modalOptionLast
                              : undefined,
                            isSelected
                              ? styles.modalOptionSelected
                              : undefined,
                          ]}
                          activeOpacity={0.85}
                          onPress={() =>
                            selectDropdownOption(
                              option
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.modalOptionText,
                              isSelected
                                ? styles.modalOptionTextSelected
                                : undefined,
                            ]}
                          >
                            {option}
                          </Text>

                          {isSelected ? (
                            <CheckCircle2
                              size={19}
                              color={
                                PRIMARY
                              }
                              strokeWidth={
                                2.7
                              }
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    }
                  )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const SummaryStat = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  return (
    <View style={styles.summaryStat}>
      <Text
        style={
          styles.summaryStatValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.summaryStatLabel
        }
      >
        {label}
      </Text>
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
      <View style={styles.formIcon}>
        {icon}
      </View>

      <View
        style={
          styles.formHeaderText
        }
      >
        <Text
          style={styles.formTitle}
        >
          {title}
        </Text>

        <Text
          style={
            styles.formSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
};

const SelectField = ({
  label,
  value,
  helperText,
  icon,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  helperText?: string;
  icon: ReactNode;
  placeholder: boolean;
  onPress: () => void;
}) => {
  return (
    <View
      style={
        styles.selectFieldBlock
      }
    >
      <Text style={styles.inputLabel}>
        {label}
      </Text>

      <TouchableOpacity
        style={styles.selectBox}
        activeOpacity={0.85}
        onPress={onPress}
      >
        <View
          style={styles.selectLeft}
        >
          <View
            style={
              styles.selectIcon
            }
          >
            {icon}
          </View>

          <View
            style={
              styles.selectTextBlock
            }
          >
            <Text
              style={[
                styles.selectText,
                placeholder
                  ? styles.placeholderText
                  : undefined,
              ]}
              numberOfLines={1}
            >
              {value}
            </Text>

            {helperText ? (
              <Text
                style={
                  styles.selectHelperText
                }
                numberOfLines={1}
              >
                {helperText}
              </Text>
            ) : null}
          </View>
        </View>

        <ChevronDown
          size={21}
          color={MUTED}
          strokeWidth={2.7}
        />
      </TouchableOpacity>
    </View>
  );
};

const ConsultationRow = ({
  consultation,
  isLast,
  onOpenActiveCalls,
}: {
  consultation: Consultation;
  isLast: boolean;
  onOpenActiveCalls: () => void;
}) => {
  const tone = getStatusTone(
    consultation.status
  );

  const canOpenActiveCall =
    canJoinConsultation(
      consultation.status
    );

  const doctorName =
    consultation.doctorName;

  return (
    <TouchableOpacity
      style={[
        styles.consultationRow,
        isLast
          ? styles.rowLast
          : undefined,
      ]}
      activeOpacity={
        canOpenActiveCall
          ? 0.84
          : 1
      }
      onPress={
        canOpenActiveCall
          ? onOpenActiveCalls
          : undefined
      }
      disabled={
        !canOpenActiveCall
      }
    >
      <View
        style={[
          styles.statusIconCircle,
          {
            backgroundColor:
              tone.background,
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

      <View
        style={
          styles.consultationInfo
        }
      >
        <Text
          style={
            styles.consultationTitle
          }
          numberOfLines={1}
        >
          {getConsultationTypeLabel(
            consultation.type
          )}
        </Text>

        {doctorName ? (
          <Text
            style={
              styles.consultationDoctor
            }
            numberOfLines={1}
          >
            {formatDoctorName(
              doctorName
            )}
          </Text>
        ) : null}

        <Text
          style={
            styles.consultationSubtitle
          }
          numberOfLines={1}
        >
          {formatConsultationDate(
            consultation.preferredAt ||
              consultation.createdAt
          )}
        </Text>

        <Text
          style={
            styles.consultationHint
          }
          numberOfLines={2}
        >
          {canOpenActiveCall
            ? "Tap to open the active call screen."
            : getStatusHint(
                consultation.status
              )}
        </Text>

        {consultation.reason ? (
          <Text
            style={
              styles.consultationReason
            }
            numberOfLines={2}
          >
            {consultation.reason}
          </Text>
        ) : null}
      </View>

      <View
        style={
          styles.consultationActionColumn
        }
      >
        <View
          style={[
            styles.consultationBadge,
            {
              backgroundColor:
                tone.background,
            },
          ]}
        >
          <View
            style={[
              styles.consultationBadgeDot,
              {
                backgroundColor:
                  tone.dot,
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
            {getStatusLabel(
              consultation.status
            )}
          </Text>
        </View>

        {canOpenActiveCall ? (
          <View
            style={
              styles.openCallIndicator
            }
          >
            <Text
              style={
                styles.openCallText
              }
            >
              Open
            </Text>

            <ChevronRight
              size={17}
              color={PRIMARY}
              strokeWidth={2.7}
            />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const LoadingRow = ({
  title,
}: {
  title: string;
}) => {
  return (
    <View
      style={styles.emptyPanel}
    >
      <ActivityIndicator
        size="small"
        color={PRIMARY}
      />

      <Text
        style={styles.emptyTitle}
      >
        {title}
      </Text>

      <Text
        style={styles.emptyText}
      >
        Please wait a moment.
      </Text>
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
    <View
      style={styles.emptyPanel}
    >
      <View
        style={
          styles.emptyIconCircle
        }
      >
        {icon}
      </View>

      <Text
        style={styles.emptyTitle}
      >
        {title}
      </Text>

      <Text
        style={styles.emptyText}
      >
        {subtitle}
      </Text>
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
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    ...elevate(1),
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
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
    fontWeight: "700",
  },
  summarySubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 4,
  },
  summaryStatsRow: {
    flexDirection: "row",
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    padding: 10,
    marginTop: 14,
  },
  summaryStat: {
    flex: 1,
    alignItems: "center",
  },
  summaryStatValue: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },
  summaryStatLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  formPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    ...elevate(1),
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  formIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
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
    fontWeight: "700",
  },
  formSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 2,
  },
  noDoctorPanel: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },
  noDoctorIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  noDoctorTextBlock: {
    flex: 1,
  },
  noDoctorTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },
  noDoctorText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 3,
  },
  manageDoctorButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 9,
  },
  selectFieldBlock: {
    marginTop: 13,
  },
  inputLabel: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  selectBox: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
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
  },
  selectTextBlock: {
    flex: 1,
  },
  selectText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },
  selectHelperText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  placeholderText: {
    color: "#A8B0C2",
  },
  notesInput: {
    minHeight: 108,
    borderRadius: 13,
    backgroundColor: SOFT_PANEL,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 13,
    color: TEXT,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 16,
    ...elevate(1),
  },
  primaryButtonText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 9,
  },
  disabledButton: {
    opacity: 0.55,
  },
  errorPanel: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    ...elevate(1),
  },
  errorText: {
    flex: 1,
    color: "#B42318",
    fontSize: 13,
    fontWeight: "700",
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
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    ...elevate(1),
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    ...elevate(1),
  },
  listPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
    ...elevate(1),
  },
  consultationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  statusIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  statusIconText: {
    fontSize: 18,
    fontWeight: "700",
  },
  consultationInfo: {
    flex: 1,
    paddingRight: 10,
  },
  consultationTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },
  consultationDoctor: {
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  consultationSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 3,
  },
  consultationHint: {
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 4,
  },
  consultationReason: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 4,
  },
  consultationActionColumn: {
    alignItems: "flex-end",
    minWidth: 82,
  },
  consultationBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
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
    fontWeight: "700",
  },
  openCallIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 3,
  },
  openCallText: {
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "700",
    marginRight: 2,
  },
  emptyPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    marginBottom: 14,
    ...elevate(1),
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  emptyText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  modalTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 13,
  },
  modalDoctorOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 13,
  },
  modalDoctorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  modalDoctorText: {
    flex: 1,
  },
  modalDoctorSpecialization: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
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
    fontWeight: "700",
  },
  modalOptionTextSelected: {
    color: PRIMARY_DARK,
  },
});