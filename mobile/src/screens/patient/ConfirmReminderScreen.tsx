import {
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
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
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FilePenLine,
  Pill,
  Send,
  ShieldCheck,
  Stethoscope,
} from "lucide-react-native";

import {
  API_BASE_URL,
} from "../../constants/api";
import {
  patientMedicineReviewsApi,
} from "../../services/patientMedicineReviewsApi";
import {
  tokenStorage,
} from "../../services/tokenStorage";
import type {
  MedicineDraft,
  RootStackParamList,
} from "../../types/navigation";

type ConfirmReminderScreenProps =
  NativeStackScreenProps<
    RootStackParamList,
    "ConfirmReminder"
  >;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#2144A5";
const PRIMARY_LIGHT = "#E8EDFF";

const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#F6A545";
const WARNING_DARK = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const elevate = (
  level: 1 | 2 = 1
) => ({
  elevation:
    level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity:
    Platform.OS === "android"
      ? 0
      : 0.08,
  shadowRadius:
    level === 1 ? 4 : 8,
  shadowOffset: {
    width: 0,
    height:
      level === 1 ? 2 : 4,
  },
});

const getFrequencyLabel = (
  frequency: string,
  customFrequency?: string
) => {
  switch (frequency) {
    case "ONCE_DAILY":
      return "Once daily";

    case "TWICE_DAILY":
      return "Twice daily";

    case "THREE_TIMES_DAILY":
      return "Three times daily";

    case "FOUR_TIMES_DAILY":
      return "Four times daily";

    case "AS_NEEDED":
      return "As needed";

    case "CUSTOM":
      return (
        customFrequency ||
        "Custom schedule"
      );

    default:
      return frequency;
  }
};

const formatDateForBackend = (
  date: string
) => {
  const trimmedDate =
    date.trim();

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      trimmedDate
    )
  ) {
    return trimmedDate;
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      trimmedDate
    )
  ) {
    const [
      year,
      month,
      day,
    ] =
      trimmedDate.split("-");

    return `${day}/${month}/${year}`;
  }

  return trimmedDate;
};

const getDateForBackendFromDate = (
  date: Date
) => {
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const year =
    date.getFullYear();

  return `${day}/${month}/${year}`;
};

const getTodayDateForBackend =
  () => {
    return getDateForBackendFromDate(
      new Date()
    );
  };

const getTomorrowDateForBackend =
  () => {
    const tomorrow =
      new Date();

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    return getDateForBackendFromDate(
      tomorrow
    );
  };

const isTodayDate = (
  dateText: string
) => {
  return (
    formatDateForBackend(
      dateText
    ) ===
    getTodayDateForBackend()
  );
};

const hasTimeAlreadyPassedToday =
  (timeOfDay: string) => {
    const match =
      /^(\d{1,2}):(\d{2})$/.exec(
        timeOfDay.trim()
      );

    if (!match) {
      return false;
    }

    const hour = Number(
      match[1]
    );

    const minute = Number(
      match[2]
    );

    if (
      !Number.isInteger(
        hour
      ) ||
      !Number.isInteger(
        minute
      ) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return false;
    }

    const now =
      new Date();

    const scheduledToday =
      new Date();

    scheduledToday.setHours(
      hour,
      minute,
      0,
      0
    );

    return (
      scheduledToday <= now
    );
  };

const getAdjustedStartDateForTime =
  (
    startDate: string,
    timeOfDay: string
  ) => {
    const backendStartDate =
      formatDateForBackend(
        startDate
      );

    if (
      !isTodayDate(startDate)
    ) {
      return backendStartDate;
    }

    if (
      hasTimeAlreadyPassedToday(
        timeOfDay
      )
    ) {
      return getTomorrowDateForBackend();
    }

    return backendStartDate;
  };

const getSchedulePreviewText = (
  startDate: string,
  selectedTimes: string[]
) => {
  const adjustedDates =
    selectedTimes.map(
      (time) =>
        getAdjustedStartDateForTime(
          startDate,
          time
        )
    );

  const uniqueDates =
    Array.from(
      new Set(adjustedDates)
    );

  if (
    uniqueDates.length === 1
  ) {
    return uniqueDates[0];
  }

  return selectedTimes
    .map((time) => {
      return `${time} starts ${getAdjustedStartDateForTime(
        startDate,
        time
      )}`;
    })
    .join("\n");
};

const getErrorMessage = (
  result: any
) => {
  if (
    typeof result?.message ===
    "string"
  ) {
    return result.message;
  }

  if (
    Array.isArray(
      result?.message
    )
  ) {
    return (
      result.message[0]
        ?.message ||
      "Please check the medicine details."
    );
  }

  if (
    Array.isArray(
      result?.errors
    )
  ) {
    return (
      result.errors[0]
        ?.message ||
      "Please check the medicine details."
    );
  }

  if (
    Array.isArray(
      result?.issues
    )
  ) {
    return (
      result.issues[0]
        ?.message ||
      "Please check the medicine details."
    );
  }

  return "Please check the medicine details.";
};

export const ConfirmReminderScreen =
  ({
    navigation,
    route,
  }: ConfirmReminderScreenProps) => {
    const insets =
      useSafeAreaInsets();

    const {
      medicineDraft,
      mode = "CREATE",
      medicineReviewRequestId,
    } = route.params;

    const isResubmitMode =
      mode ===
      "RESUBMIT_REVIEW";

    const selectedTimes =
      medicineDraft
        .selectedTimes &&
      medicineDraft
        .selectedTimes.length >
        0
        ? isResubmitMode
          ? [
              medicineDraft
                .selectedTimes[0],
            ]
          : medicineDraft
              .selectedTimes
        : [
            medicineDraft
              .timeOfDay,
          ];

    const [
      doctorReviewEnabled,
      setDoctorReviewEnabled,
    ] = useState(
      isResubmitMode
        ? true
        : medicineDraft
            .sendToDoctorForReview
    );

    const [
      isSaving,
      setIsSaving,
    ] = useState(false);

    const frequencyLabel =
      useMemo(() => {
        return getFrequencyLabel(
          medicineDraft.frequency,
          medicineDraft.customFrequency
        );
      }, [
        medicineDraft.frequency,
        medicineDraft.customFrequency,
      ]);

    const scheduleStartPreview =
      useMemo(() => {
        return getSchedulePreviewText(
          medicineDraft.startDate,
          selectedTimes
        );
      }, [
        medicineDraft.startDate,
        selectedTimes,
      ]);

    const hasAutoAdjustedStartDate =
      useMemo(() => {
        const originalDate =
          formatDateForBackend(
            medicineDraft.startDate
          );

        return selectedTimes.some(
          (time) => {
            return (
              getAdjustedStartDateForTime(
                medicineDraft.startDate,
                time
              ) !== originalDate
            );
          }
        );
      }, [
        medicineDraft.startDate,
        selectedTimes,
      ]);

    const getEditableDraft =
      (): MedicineDraft => {
        return {
          ...medicineDraft,
          timeOfDay:
            selectedTimes[0],
          selectedTimes,
          sendToDoctorForReview:
            isResubmitMode
              ? true
              : doctorReviewEnabled,
        };
      };

    const handleEditDetails =
      () => {
        navigation.replace(
          "AddMedicine",
          {
            medicineDraft:
              getEditableDraft(),
            mode: isResubmitMode
              ? "RESUBMIT_REVIEW"
              : "EDIT_DRAFT",
            medicineReviewRequestId:
              isResubmitMode
                ? medicineReviewRequestId
                : undefined,
          }
        );
      };

    const saveNewMedicine =
      async () => {
        const token =
          await tokenStorage.getToken();

        if (!token) {
          throw new Error(
            "Please login again."
          );
        }

        for (
          const time of
          selectedTimes
        ) {
          const response =
            await fetch(
              `${API_BASE_URL}/patient/medicines`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  Authorization:
                    `Bearer ${token}`,
                },
                body: JSON.stringify(
                  {
                    name:
                      medicineDraft.name,
                    dose:
                      medicineDraft.dose,
                    instructions:
                      medicineDraft.instructions ||
                      undefined,
                    frequency:
                      medicineDraft.frequency,
                    customFrequency:
                      medicineDraft.frequency ===
                      "CUSTOM"
                        ? medicineDraft.customFrequency
                        : undefined,
                    timeOfDay:
                      time,
                    startDate:
                      getAdjustedStartDateForTime(
                        medicineDraft.startDate,
                        time
                      ),
                    endDate:
                      medicineDraft.endDate
                        ? formatDateForBackend(
                            medicineDraft.endDate
                          )
                        : undefined,
                    sendToDoctorForReview:
                      doctorReviewEnabled,
                  }
                ),
              }
            );

          let result: any =
            {};

          try {
            result =
              await response.json();
          } catch {
            result = {};
          }

          if (!response.ok) {
            throw new Error(
              getErrorMessage(
                result
              )
            );
          }
        }
      };

    const resubmitMedicine =
      async () => {
        if (
          !medicineReviewRequestId
        ) {
          throw new Error(
            "Medicine review request ID is missing."
          );
        }

        const time =
          selectedTimes[0];

        await patientMedicineReviewsApi.resubmitReview(
          medicineReviewRequestId,
          {
            name:
              medicineDraft.name,
            dose:
              medicineDraft.dose,
            instructions:
              medicineDraft.instructions ||
              undefined,
            frequency:
              medicineDraft.frequency,
            customFrequency:
              medicineDraft.frequency ===
              "CUSTOM"
                ? medicineDraft.customFrequency
                : undefined,
            timeOfDay: time,
            startDate:
              getAdjustedStartDateForTime(
                medicineDraft.startDate,
                time
              ),
            endDate:
              medicineDraft.endDate
                ? formatDateForBackend(
                    medicineDraft.endDate
                  )
                : undefined,
          }
        );
      };

    const handleSaveReminder =
      async () => {
        if (isSaving) {
          return;
        }

        try {
          setIsSaving(true);

          if (isResubmitMode) {
            await resubmitMedicine();

            Alert.alert(
              "Medicine resubmitted",
              "Your corrected medicine has been sent back to your primary doctor for review.",
              [
                {
                  text: "View Updates",
                  onPress: () => {
                    navigation.reset(
                      {
                        index: 0,
                        routes: [
                          {
                            name: "MedicineUpdates",
                          },
                        ],
                      }
                    );
                  },
                },
              ]
            );

            return;
          }

          await saveNewMedicine();

          if (
            doctorReviewEnabled
          ) {
            Alert.alert(
              "Sent for doctor review",
              "The medicine will remain inactive until your doctor approves it and you apply the approval.",
              [
                {
                  text: "View Updates",
                  onPress: () => {
                    navigation.reset(
                      {
                        index: 0,
                        routes: [
                          {
                            name: "MedicineUpdates",
                          },
                        ],
                      }
                    );
                  },
                },
                {
                  text: "Done",
                  onPress: () => {
                    navigation.reset(
                      {
                        index: 0,
                        routes: [
                          {
                            name: "PatientTabs",
                            params: {
                              screen:
                                "Medicines",
                            },
                          },
                        ],
                      }
                    );
                  },
                },
              ]
            );

            return;
          }

          Alert.alert(
            "Reminder saved",
            "Your medicine reminder has been added successfully.",
            [
              {
                text: "OK",
                onPress: () => {
                  navigation.reset(
                    {
                      index: 0,
                      routes: [
                        {
                          name: "PatientTabs",
                          params: {
                            screen:
                              "Medicines",
                          },
                        },
                      ],
                    }
                  );
                },
              },
            ]
          );
        } catch (error) {
          Alert.alert(
            isResubmitMode
              ? "Unable to resubmit"
              : "Unable to save reminder",
            error instanceof Error
              ? error.message
              : "The medicine request could not be saved."
          );
        } finally {
          setIsSaving(false);
        }
      };

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

        <View
          style={styles.screen}
        >
          <View
            style={styles.appBar}
          >
            <TouchableOpacity
              style={
                styles.backButton
              }
              onPress={() =>
                navigation.goBack()
              }
              disabled={isSaving}
              activeOpacity={0.85}
            >
              <ArrowLeft
                size={22}
                color={TEXT}
                strokeWidth={2.6}
              />
            </TouchableOpacity>

            <View
              style={
                styles.appBarTextBlock
              }
            >
              <Text
                style={
                  styles.appBarTitle
                }
              >
                {isResubmitMode
                  ? "Confirm Resubmission"
                  : "Confirm Reminder"}
              </Text>

              <Text
                style={
                  styles.appBarSubtitle
                }
              >
                {isResubmitMode
                  ? "Review corrected medicine details"
                  : "Review your medicine schedule"}
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom:
                  Math.max(
                    190,
                    insets.bottom +
                      175
                  ),
              },
            ]}
            showsVerticalScrollIndicator={
              false
            }
          >
            {isResubmitMode ? (
              <View
                style={
                  styles.resubmitNotice
                }
              >
                <FilePenLine
                  size={20}
                  color={
                    WARNING_DARK
                  }
                  strokeWidth={2.6}
                />

                <View
                  style={
                    styles.resubmitNoticeTextBlock
                  }
                >
                  <Text
                    style={
                      styles.resubmitNoticeTitle
                    }
                  >
                    Doctor review required
                  </Text>

                  <Text
                    style={
                      styles.resubmitNoticeText
                    }
                  >
                    This corrected medicine will create a new pending review request.
                  </Text>
                </View>
              </View>
            ) : null}

            <View
              style={styles.mainCard}
            >
              <View
                style={
                  styles.medicineIcon
                }
              >
                <Pill
                  size={34}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              </View>

              <Text
                style={
                  styles.medicineName
                }
              >
                {
                  medicineDraft.name
                }
              </Text>

              <Text
                style={
                  styles.doseText
                }
              >
                {
                  medicineDraft.dose
                }
              </Text>

              {medicineDraft.instructions ? (
                <Text
                  style={
                    styles.instructionsText
                  }
                >
                  {
                    medicineDraft.instructions
                  }
                </Text>
              ) : null}
            </View>

            <View
              style={
                styles.detailsCard
              }
            >
              <View
                style={
                  styles.cardHeaderRow
                }
              >
                <View>
                  <Text
                    style={
                      styles.cardTitle
                    }
                  >
                    Reminder details
                  </Text>

                  <Text
                    style={
                      styles.cardSubtitle
                    }
                  >
                    Check the schedule before submitting
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.smallEditButton
                  }
                  onPress={
                    handleEditDetails
                  }
                  disabled={
                    isSaving
                  }
                  activeOpacity={
                    0.85
                  }
                >
                  <FilePenLine
                    size={15}
                    color={
                      PRIMARY_DARK
                    }
                    strokeWidth={
                      2.5
                    }
                  />

                  <Text
                    style={
                      styles.smallEditButtonText
                    }
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              <DetailRow
                icon={
                  <Clock3
                    size={17}
                    color={
                      WARNING
                    }
                    strokeWidth={
                      2.5
                    }
                  />
                }
                label="Frequency"
                value={
                  frequencyLabel
                }
              />

              <DetailRow
                icon={
                  <Clock3
                    size={17}
                    color={
                      PRIMARY
                    }
                    strokeWidth={
                      2.5
                    }
                  />
                }
                label="Reminder time"
                value={selectedTimes.join(
                  ", "
                )}
              />

              <DetailRow
                icon={
                  <CalendarDays
                    size={17}
                    color={
                      SUCCESS
                    }
                    strokeWidth={
                      2.5
                    }
                  />
                }
                label="Start date"
                value={
                  scheduleStartPreview
                }
              />

              <DetailRow
                icon={
                  <CalendarDays
                    size={17}
                    color={MUTED}
                    strokeWidth={
                      2.5
                    }
                  />
                }
                label="End date"
                value={
                  medicineDraft.endDate
                    ? formatDateForBackend(
                        medicineDraft.endDate
                      )
                    : "Not set"
                }
                removeBorder
              />

              {hasAutoAdjustedStartDate ? (
                <View
                  style={
                    styles.scheduleNotice
                  }
                >
                  <Clock3
                    size={17}
                    color={
                      WARNING_DARK
                    }
                    strokeWidth={
                      2.5
                    }
                  />

                  <Text
                    style={
                      styles.scheduleNoticeText
                    }
                  >
                    A selected time has already passed today, so that reminder will start tomorrow.
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              style={
                styles.reviewCard
              }
            >
              <View
                style={
                  styles.reviewIcon
                }
              >
                <Stethoscope
                  size={22}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              </View>

              <View
                style={
                  styles.reviewTextBlock
                }
              >
                <Text
                  style={
                    styles.reviewTitle
                  }
                >
                  {isResubmitMode
                    ? "Send back to doctor"
                    : "Send to doctor for review"}
                </Text>

                <Text
                  style={
                    styles.reviewSubtitle
                  }
                >
                  {isResubmitMode
                    ? "Required for resubmitting a rejected medicine."
                    : doctorReviewEnabled
                      ? "Medicine stays inactive until it is approved."
                      : "Medicine will be added directly to your schedule."}
                </Text>
              </View>

              <Switch
                value={
                  isResubmitMode
                    ? true
                    : doctorReviewEnabled
                }
                onValueChange={
                  setDoctorReviewEnabled
                }
                disabled={
                  isSaving ||
                  isResubmitMode
                }
                trackColor={{
                  false:
                    "#DDE3EF",
                  true:
                    PRIMARY_LIGHT,
                }}
                thumbColor={
                  isResubmitMode ||
                  doctorReviewEnabled
                    ? PRIMARY
                    : SURFACE
                }
              />
            </View>

            {doctorReviewEnabled ||
            isResubmitMode ? (
              <View
                style={
                  styles.reviewInfoPanel
                }
              >
                <ShieldCheck
                  size={19}
                  color={
                    PRIMARY_DARK
                  }
                  strokeWidth={2.6}
                />

                <Text
                  style={
                    styles.reviewInfoText
                  }
                >
                  Your primary doctor will receive this request. After approval, open Medicine Updates and select Add to My Medicines.
                </Text>
              </View>
            ) : (
              <View
                style={
                  styles.directInfoPanel
                }
              >
                <CheckCircle2
                  size={19}
                  color={
                    SUCCESS_DARK
                  }
                  strokeWidth={2.6}
                />

                <Text
                  style={
                    styles.directInfoText
                  }
                >
                  This medicine will become active immediately after saving.
                </Text>
              </View>
            )}
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom:
                  Math.max(
                    insets.bottom +
                      12,
                    28
                  ),
              },
            ]}
          >
            <TouchableOpacity
              style={
                styles.editDetailsButton
              }
              onPress={
                handleEditDetails
              }
              disabled={isSaving}
              activeOpacity={0.85}
            >
              <FilePenLine
                size={18}
                color={PRIMARY_DARK}
                strokeWidth={2.5}
              />

              <Text
                style={
                  styles.editDetailsButtonText
                }
              >
                Edit Details
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                isSaving
                  ? styles.disabledButton
                  : undefined,
              ]}
              onPress={() =>
                void handleSaveReminder()
              }
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator
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
                    {isResubmitMode
                      ? "Resubmit to Doctor"
                      : doctorReviewEnabled
                        ? "Send for Review"
                        : "Save Medicine"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  };

const DetailRow = ({
  icon,
  label,
  value,
  removeBorder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  removeBorder?: boolean;
}) => {
  return (
    <View
      style={[
        styles.detailRow,
        removeBorder
          ? styles.detailRowWithoutBorder
          : undefined,
      ]}
    >
      <View
        style={
          styles.detailIcon
        }
      >
        {icon}
      </View>

      <View
        style={
          styles.detailTextBlock
        }
      >
        <Text
          style={
            styles.detailLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.detailValue
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
};

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },
    screen: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },
    appBar: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 13,
      flexDirection: "row",
      alignItems: "center",
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        SURFACE,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 13,
      ...elevate(1),
    },
    appBarTextBlock: {
      flex: 1,
    },
    appBarTitle: {
      color: TEXT,
      fontSize: 25,
      fontWeight: "700",
    },
    appBarSubtitle: {
      color: MUTED,
      fontSize: 13,
      fontWeight: "500",
      marginTop: 3,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 4,
    },
    resubmitNotice: {
      backgroundColor:
        WARNING_LIGHT,
      borderRadius: 15,
      padding: 13,
      flexDirection: "row",
      alignItems:
        "flex-start",
      marginBottom: 13,
    },
    resubmitNoticeTextBlock: {
      flex: 1,
      marginLeft: 9,
    },
    resubmitNoticeTitle: {
      color: WARNING_DARK,
      fontSize: 13,
      fontWeight: "700",
    },
    resubmitNoticeText: {
      color: WARNING_DARK,
      fontSize: 11,
      fontWeight: "500",
      lineHeight: 17,
      marginTop: 3,
    },
    mainCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      padding: 22,
      alignItems: "center",
      marginBottom: 13,
      ...elevate(1),
    },
    medicineIcon: {
      width: 72,
      height: 72,
      borderRadius: 18,
      backgroundColor:
        PRIMARY_LIGHT,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 14,
    },
    medicineName: {
      color: TEXT,
      fontSize: 22,
      fontWeight: "700",
      textAlign: "center",
    },
    doseText: {
      color: MUTED,
      fontSize: 14,
      fontWeight: "600",
      marginTop: 5,
    },
    instructionsText: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "500",
      lineHeight: 18,
      textAlign: "center",
      marginTop: 10,
    },
    detailsCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      padding: 15,
      marginBottom: 13,
      ...elevate(1),
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 7,
    },
    cardTitle: {
      color: TEXT,
      fontSize: 17,
      fontWeight: "700",
    },
    cardSubtitle: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "500",
      marginTop: 3,
    },
    smallEditButton: {
      minHeight: 36,
      borderRadius: 10,
      backgroundColor:
        PRIMARY_LIGHT,
      paddingHorizontal: 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
    },
    smallEditButtonText: {
      color: PRIMARY_DARK,
      fontSize: 11,
      fontWeight: "700",
      marginLeft: 5,
    },
    detailRow: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        BORDER,
    },
    detailRowWithoutBorder: {
      borderBottomWidth: 0,
    },
    detailIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor:
        SOFT_PANEL,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 10,
    },
    detailTextBlock: {
      flex: 1,
    },
    detailLabel: {
      color: MUTED,
      fontSize: 10,
      fontWeight: "600",
    },
    detailValue: {
      color: TEXT,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 18,
      marginTop: 2,
    },
    scheduleNotice: {
      backgroundColor:
        WARNING_LIGHT,
      borderRadius: 11,
      padding: 10,
      flexDirection: "row",
      alignItems:
        "flex-start",
      marginTop: 8,
    },
    scheduleNoticeText: {
      flex: 1,
      color: WARNING_DARK,
      fontSize: 11,
      fontWeight: "500",
      lineHeight: 17,
      marginLeft: 8,
    },
    reviewCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      padding: 15,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 13,
      ...elevate(1),
    },
    reviewIcon: {
      width: 45,
      height: 45,
      borderRadius: 13,
      backgroundColor:
        PRIMARY_LIGHT,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
    },
    reviewTextBlock: {
      flex: 1,
      paddingRight: 8,
    },
    reviewTitle: {
      color: TEXT,
      fontSize: 14,
      fontWeight: "700",
    },
    reviewSubtitle: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "500",
      lineHeight: 16,
      marginTop: 3,
    },
    reviewInfoPanel: {
      backgroundColor:
        PRIMARY_LIGHT,
      borderRadius: 13,
      padding: 12,
      flexDirection: "row",
      alignItems:
        "flex-start",
      marginBottom: 13,
    },
    reviewInfoText: {
      flex: 1,
      color: PRIMARY_DARK,
      fontSize: 11,
      fontWeight: "600",
      lineHeight: 17,
      marginLeft: 8,
    },
    directInfoPanel: {
      backgroundColor:
        SUCCESS_LIGHT,
      borderRadius: 13,
      padding: 12,
      flexDirection: "row",
      alignItems:
        "flex-start",
      marginBottom: 13,
    },
    directInfoText: {
      flex: 1,
      color: SUCCESS_DARK,
      fontSize: 11,
      fontWeight: "600",
      lineHeight: 17,
      marginLeft: 8,
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor:
        SURFACE,
      paddingHorizontal: 16,
      paddingTop: 12,
      ...elevate(2),
    },
    editDetailsButton: {
      minHeight: 45,
      borderRadius: 12,
      backgroundColor:
        PRIMARY_LIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 9,
    },
    editDetailsButtonText: {
      color: PRIMARY_DARK,
      fontSize: 13,
      fontWeight: "700",
      marginLeft: 6,
    },
    primaryButton: {
      minHeight: 50,
      borderRadius: 13,
      backgroundColor:
        PRIMARY,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      overflow: "hidden",
    },
    primaryButtonText: {
      color: SURFACE,
      fontSize: 14,
      fontWeight: "700",
      marginLeft: 7,
    },
    disabledButton: {
      opacity: 0.58,
    },
  });

export default ConfirmReminderScreen;