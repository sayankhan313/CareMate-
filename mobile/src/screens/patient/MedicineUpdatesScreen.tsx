 import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FilePenLine,
  Info,
  Pill,
  PlusCircle,
  RefreshCw,
  Stethoscope,
  Trash2,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedAlert as Alert } from "../../utils/localizedAlert";

import {
  patientMedicineReviewsApi,
  type PatientMedicineReviewRequest,
  type PatientMedicineReviewStatus,
} from "../../services/patientMedicineReviewsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "MedicineUpdates"
>;

type ReviewFilter =
  | "ALL"
  | PatientMedicineReviewStatus;

type AddMedicineRouteParams = NonNullable<
  RootStackParamList["AddMedicine"]
>;

type MedicineDraftParam = NonNullable<
  AddMedicineRouteParams["medicineDraft"]
>;

type SupportedMedicineFrequency =
  | "ONCE_DAILY"
  | "TWICE_DAILY"
  | "THREE_TIMES_DAILY"
  | "FOUR_TIMES_DAILY"
  | "AS_NEEDED"
  | "CUSTOM";

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
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
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const FILTERS: {
  label: string;
  value: ReviewFilter;
}[] = [
  {
    label: "All",
    value: "ALL",
  },
  {
    label: "Pending",
    value: "PENDING",
  },
  {
    label: "Approved",
    value: "APPROVED",
  },
  {
    label: "Rejected",
    value: "REJECTED",
  },
  {
    label: "Applied",
    value: "APPLIED",
  },
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

const formatStatus = (value: string) => {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => {
      return (
        part.charAt(0).toUpperCase() +
        part.slice(1)
      );
    })
    .join(" ");
};

const formatDate = (
  value?: string | null
) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatInputDate = (
  value?: string | null
) => {
  if (!value) {
    return undefined;
  }

  const trimmedValue = value.trim();

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      trimmedValue
    )
  ) {
    return trimmedValue;
  }

  const isoDateMatch =
    /^(\d{4})-(\d{2})-(\d{2})/.exec(
      trimmedValue
    );

  if (isoDateMatch) {
    const year = isoDateMatch[1];
    const month = isoDateMatch[2];
    const day = isoDateMatch[3];

    return `${day}/${month}/${year}`;
  }

  const date = new Date(trimmedValue);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

const getTodayInputDate = () => {
  const today = new Date();

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const year = today.getFullYear();

  return `${day}/${month}/${year}`;
};

const formatTime = (
  value?: string | null
) => {
  if (!value) {
    return "Not set";
  }

  const [hourText, minuteText] =
    value.split(":");

  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return value;
  }

  const date = new Date();

  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusTone = (
  status: PatientMedicineReviewStatus
) => {
  if (status === "APPROVED") {
    return {
      background: SUCCESS_LIGHT,
      text: SUCCESS_DARK,
      solid: SUCCESS,
    };
  }

  if (status === "REJECTED") {
    return {
      background: DANGER_LIGHT,
      text: DANGER_DARK,
      solid: DANGER,
    };
  }

  if (status === "APPLIED") {
    return {
      background: PRIMARY_LIGHT,
      text: PRIMARY_DARK,
      solid: PRIMARY,
    };
  }

  return {
    background: WARNING_LIGHT,
    text: WARNING_DARK,
    solid: WARNING,
  };
};

export const MedicineUpdatesScreen = ({
  navigation,
}: Props) => {
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState<
    PatientMedicineReviewRequest[]
  >([]);

  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    applied: 0,
    unread: 0,
  });

  const [
    selectedFilter,
    setSelectedFilter,
  ] = useState<ReviewFilter>("ALL");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    applyingRequestId,
    setApplyingRequestId,
  ] = useState<string | null>(null);

  const visibleRequests = useMemo(() => {
    if (selectedFilter === "ALL") {
      return requests;
    }

    return requests.filter((request) => {
      return request.status === selectedFilter;
    });
  }, [requests, selectedFilter]);

  const loadReviews = useCallback(
    async (
      mode:
        | "initial"
        | "refresh"
        | "silent" = "initial"
    ) => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        }

        if (mode === "refresh") {
          setIsRefreshing(true);
        }

        if (mode !== "silent") {
          setErrorMessage("");
        }

        const result =
          await patientMedicineReviewsApi.listReviews();

        setRequests(result.requests || []);

        setSummary(
          result.summary || {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            applied: 0,
            unread: 0,
          }
        );

        const unreadRequests = (
          result.requests || []
        ).filter((request) => {
          return request.isUnread;
        });

        if (unreadRequests.length > 0) {
          await Promise.allSettled(
            unreadRequests.map((request) => {
              return patientMedicineReviewsApi.markSeen(
                request.id
              );
            })
          );

          setRequests((currentRequests) => {
            return currentRequests.map(
              (request) => {
                if (!request.isUnread) {
                  return request;
                }

                return {
                  ...request,
                  isUnread: false,
                  patientSeenAt:
                    new Date().toISOString(),
                };
              }
            );
          });

          setSummary((currentSummary) => {
            return {
              ...currentSummary,
              unread: 0,
            };
          });
        }
      } catch (error) {
        if (mode !== "silent") {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load medicine updates."
          );
        }
      } finally {
        if (mode === "initial") {
          setIsLoading(false);
        }

        if (mode === "refresh") {
          setIsRefreshing(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadReviews("initial");
    }, [loadReviews])
  );

  const applyApprovedMedicine = async (
    request: PatientMedicineReviewRequest
  ) => {
    if (applyingRequestId) {
      return;
    }

    try {
      setApplyingRequestId(request.id);

      await patientMedicineReviewsApi.applyApprovedReview(
        request.id
      );

      await loadReviews("silent");

      Alert.alert(
        "Medicine added",
        `${
          request.medicine?.name || "Medicine"
        } is now active in your medication schedule.`,
        [
          {
            text: "View Medicines",
            onPress: () => {
              navigation.navigate(
                "PatientTabs",
                {
                  screen: "Medicines",
                }
              );
            },
          },
          {
            text: "OK",
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Unable to add medicine",
        error instanceof Error
          ? error.message
          : "The approved medicine could not be activated."
      );
    } finally {
      setApplyingRequestId(null);
    }
  };

  const confirmApply = (
    request: PatientMedicineReviewRequest
  ) => {
    Alert.alert(
      "Add to My Medicines",
      `Add ${
        request.medicine?.name ||
        "this medicine"
      } to your active schedule?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Add Medicine",
          onPress: () => {
            void applyApprovedMedicine(request);
          },
        },
      ]
    );
  };

  const openResubmit = (
    request: PatientMedicineReviewRequest
  ) => {
    const medicine = request.medicine;

    if (!medicine) {
      Alert.alert(
        "Unable to edit",
        "Medicine details are not available."
      );

      return;
    }

    const supportedFrequencies:
      SupportedMedicineFrequency[] = [
        "ONCE_DAILY",
        "TWICE_DAILY",
        "THREE_TIMES_DAILY",
        "FOUR_TIMES_DAILY",
        "AS_NEEDED",
        "CUSTOM",
      ];

    const rawFrequency =
      medicine.frequency || "ONCE_DAILY";

    const frequency = (
      supportedFrequencies.includes(
        rawFrequency as SupportedMedicineFrequency
      )
        ? rawFrequency
        : "ONCE_DAILY"
    ) as MedicineDraftParam["frequency"];

    const medicineWithCustomFrequency =
      medicine as typeof medicine & {
        customFrequency?: string | null;
      };

    const customFrequency =
      medicineWithCustomFrequency.customFrequency;

    const timeOfDay =
      medicine.timeOfDay || "08:00";

    const medicineDraft = {
      name: medicine.name,
      dose: medicine.dose,

      instructions:
        medicine.instructions || undefined,

      frequency,

      customFrequency:
        rawFrequency === "CUSTOM"
          ? customFrequency || undefined
          : undefined,

      timeOfDay,
      selectedTimes: [timeOfDay],

      startDate:
        formatInputDate(
          medicine.startDate
        ) || getTodayInputDate(),

      endDate:
        formatInputDate(
          medicine.endDate
        ),

      prescriptionPattern: null,
      sendToDoctorForReview: true,
    } as MedicineDraftParam;

    navigation.navigate("AddMedicine", {
      mode: "RESUBMIT_REVIEW",
      medicineReviewRequestId:
        request.id,
      medicineDraft,
    });
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <StatusBar
        backgroundColor={BACKGROUND}
        barStyle="dark-content"
      />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.84}
            onPress={() =>
              navigation.goBack()
            }
          >
            <ArrowLeft
              size={21}
              color={TEXT}
              strokeWidth={2.5}
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
              Medicine Updates
            </Text>

            <Text
              style={
                styles.appBarSubtitle
              }
            >
              Review decisions from your doctor
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.refreshButton
            }
            activeOpacity={0.84}
            onPress={() =>
              void loadReviews("refresh")
            }
          >
            <RefreshCw
              size={20}
              color={PRIMARY}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                Math.max(
                  32,
                  insets.bottom + 24
                ),
            },
          ]}
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                isRefreshing
              }
              onRefresh={() =>
                void loadReviews(
                  "refresh"
                )
              }
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        >
          <View
            style={
              styles.summaryCard
            }
          >
            <View
              style={
                styles.summaryTopRow
              }
            >
              <View
                style={
                  styles.summaryIcon
                }
              >
                <Stethoscope
                  size={27}
                  color={PRIMARY}
                  strokeWidth={2.6}
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
                  Doctor review updates
                </Text>

                <Text
                  style={
                    styles.summaryText
                  }
                >
                  View medicine approvals, rejection notes and removal decisions.
                </Text>
              </View>
            </View>

            <View
              style={
                styles.summaryStats
              }
            >
              <SummaryItem
                value={
                  summary.pending
                }
                label="Pending"
                tone={WARNING}
              />

              <View
                style={
                  styles.summaryDivider
                }
              />

              <SummaryItem
                value={
                  summary.approved
                }
                label="Approved"
                tone={SUCCESS}
              />

              <View
                style={
                  styles.summaryDivider
                }
              />

              <SummaryItem
                value={
                  summary.rejected
                }
                label="Rejected"
                tone={DANGER}
              />

              <View
                style={
                  styles.summaryDivider
                }
              />

              <SummaryItem
                value={
                  summary.applied
                }
                label="Applied"
                tone={PRIMARY}
              />
            </View>
          </View>

          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filtersRow
            }
          >
            {FILTERS.map(
              (filter) => {
                const selected =
                  selectedFilter ===
                  filter.value;

                return (
                  <TouchableOpacity
                    key={
                      filter.value
                    }
                    style={[
                      styles.filterChip,
                      selected
                        ? styles.filterChipSelected
                        : undefined,
                    ]}
                    activeOpacity={
                      0.84
                    }
                    onPress={() =>
                      setSelectedFilter(
                        filter.value
                      )
                    }
                  >
                    {selected ? (
                      <CheckCircle2
                        size={14}
                        color={
                          PRIMARY_DARK
                        }
                        strokeWidth={
                          2.5
                        }
                      />
                    ) : null}

                    <Text
                      style={[
                        styles.filterText,
                        selected
                          ? styles.filterTextSelected
                          : undefined,
                        selected
                          ? styles.filterTextWithIcon
                          : undefined,
                      ]}
                    >
                      {
                        filter.label
                      }
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </ScrollView>

          {errorMessage ? (
            <View
              style={
                styles.errorCard
              }
            >
              <AlertCircle
                size={22}
                color={DANGER}
                strokeWidth={2.6}
              />

              <View
                style={
                  styles.errorTextBlock
                }
              >
                <Text
                  style={
                    styles.errorTitle
                  }
                >
                  Unable to load updates
                </Text>

                <Text
                  style={
                    styles.errorText
                  }
                >
                  {errorMessage}
                </Text>
              </View>
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
                Review history
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                {visibleRequests.length ===
                1
                  ? "1 update"
                  : `${visibleRequests.length} updates`}
              </Text>
            </View>

            <View
              style={
                styles.sectionIcon
              }
            >
              <Pill
                size={20}
                color={PRIMARY}
                strokeWidth={2.5}
              />
            </View>
          </View>

          {isLoading ? (
            <View
              style={
                styles.stateCard
              }
            >
              <ActivityIndicator
                color={PRIMARY}
              />

              <Text
                style={
                  styles.stateTitle
                }
              >
                Loading medicine updates...
              </Text>
            </View>
          ) : visibleRequests.length ===
            0 ? (
            <View
              style={
                styles.stateCard
              }
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <FilePenLine
                  size={29}
                  color={PRIMARY}
                  strokeWidth={2.5}
                />
              </View>

              <Text
                style={
                  styles.stateTitle
                }
              >
                No medicine updates
              </Text>

              <Text
                style={
                  styles.stateText
                }
              >
                Doctor decisions for medicine additions and removal requests will appear here.
              </Text>
            </View>
          ) : (
            visibleRequests.map(
              (request) => (
                <MedicineUpdateCard
                  key={request.id}
                  request={request}
                  isApplying={
                    applyingRequestId ===
                    request.id
                  }
                  onApply={() =>
                    confirmApply(
                      request
                    )
                  }
                  onResubmit={() =>
                    openResubmit(
                      request
                    )
                  }
                />
              )
            )
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const SummaryItem = ({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: string;
}) => {
  return (
    <View
      style={
        styles.summaryItem
      }
    >
      <View
        style={[
          styles.summaryDot,
          {
            backgroundColor:
              tone,
          },
        ]}
      />

      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>
    </View>
  );
};

const MedicineUpdateCard = ({
  request,
  isApplying,
  onApply,
  onResubmit,
}: {
  request: PatientMedicineReviewRequest;
  isApplying: boolean;
  onApply: () => void;
  onResubmit: () => void;
}) => {
  const tone =
    getStatusTone(
      request.status
    );

  const medicineName =
    request.medicine?.name ||
    "Medicine";

  const doctorName =
    request.reviewedByDoctor
      ?.fullName ||
    request.doctor?.fullName ||
    "Assigned doctor";

  const medicineWithCustomFrequency =
    request.medicine
      ? (request.medicine as typeof request.medicine & {
          customFrequency?: string | null;
        })
      : null;

  const frequencyLabel =
    request.medicine?.frequency ===
      "CUSTOM" &&
    medicineWithCustomFrequency
      ?.customFrequency
      ? medicineWithCustomFrequency.customFrequency
      : formatStatus(
          request.medicine
            ?.frequency ||
            "ONCE_DAILY"
        );

  return (
    <View
      style={
        styles.reviewCard
      }
    >
      <View
        style={[
          styles.reviewAccent,
          {
            backgroundColor:
              request.requestType ===
              "DELETE"
                ? DANGER
                : tone.solid,
          },
        ]}
      />

      <View
        style={styles.typeRow}
      >
        <View
          style={[
            styles.typeBadge,
            request.requestType ===
            "DELETE"
              ? styles.deleteTypeBadge
              : styles.addTypeBadge,
          ]}
        >
          {request.requestType ===
          "DELETE" ? (
            <Trash2
              size={14}
              color={DANGER_DARK}
              strokeWidth={2.5}
            />
          ) : (
            <PlusCircle
              size={14}
              color={PRIMARY_DARK}
              strokeWidth={2.5}
            />
          )}

          <Text
            style={[
              styles.typeBadgeText,
              {
                color:
                  request.requestType ===
                  "DELETE"
                    ? DANGER_DARK
                    : PRIMARY_DARK,
              },
            ]}
          >
            {request.requestType ===
            "DELETE"
              ? "Removal request"
              : "Medicine addition"}
          </Text>
        </View>

        <Text
          style={
            styles.requestDate
          }
        >
          {formatDate(
            request.createdAt
          )}
        </Text>
      </View>

      <View
        style={
          styles.reviewHeader
        }
      >
        <View
          style={[
            styles.medicineIcon,
            {
              backgroundColor:
                tone.background,
            },
          ]}
        >
          <Pill
            size={23}
            color={tone.text}
            strokeWidth={2.6}
          />
        </View>

        <View
          style={
            styles.reviewHeading
          }
        >
          <Text
            style={
              styles.medicineName
            }
            numberOfLines={1}
          >
            {medicineName}
          </Text>

          <Text
            style={
              styles.medicineDose
            }
          >
            {request.medicine
              ?.dose ||
              "Dose unavailable"}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                tone.background,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  tone.solid,
              },
            ]}
          />

          <Text
            style={[
              styles.statusText,
              {
                color: tone.text,
              },
            ]}
          >
            {formatStatus(
              request.status
            )}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.doctorPanel
        }
      >
        <View
          style={
            styles.doctorIcon
          }
        >
          <Stethoscope
            size={18}
            color={PRIMARY}
            strokeWidth={2.5}
          />
        </View>

        <View
          style={
            styles.doctorTextBlock
          }
        >
          <Text
            style={
              styles.doctorLabel
            }
          >
            Reviewed by
          </Text>

          <Text
            style={
              styles.doctorName
            }
            numberOfLines={1}
          >
            {doctorName}
          </Text>
        </View>
      </View>

      {request.requestType ===
        "ADD" &&
      request.medicine ? (
        <View
          style={
            styles.detailsPanel
          }
        >
          <DetailRow
            icon={
              <Clock3
                size={17}
                color={WARNING_DARK}
                strokeWidth={2.5}
              />
            }
            label="Schedule"
            value={`${frequencyLabel} · ${formatTime(
              request.medicine
                .timeOfDay
            )}`}
          />

          <DetailRow
            icon={
              <Pill
                size={17}
                color={PRIMARY}
                strokeWidth={2.5}
              />
            }
            label="Instructions"
            value={
              request.medicine
                .instructions ||
              "No instructions provided"
            }
          />
        </View>
      ) : null}

      {request.patientReason ? (
        <View
          style={
            styles.patientReasonPanel
          }
        >
          <Text
            style={
              styles.patientReasonLabel
            }
          >
            Your removal reason
          </Text>

          <Text
            style={
              styles.patientReasonText
            }
          >
            {
              request.patientReason
            }
          </Text>
        </View>
      ) : null}

      {request.doctorNote ? (
        <View
          style={[
            styles.decisionPanel,
            {
              backgroundColor:
                tone.background,
            },
          ]}
        >
          <Text
            style={[
              styles.decisionLabel,
              {
                color: tone.text,
              },
            ]}
          >
            Doctor decision note
          </Text>

          <Text
            style={[
              styles.decisionText,
              {
                color: tone.text,
              },
            ]}
          >
            {request.doctorNote}
          </Text>
        </View>
      ) : null}

      {request.status ===
      "PENDING" ? (
        <View
          style={
            styles.pendingPanel
          }
        >
          <Clock3
            size={17}
            color={WARNING_DARK}
            strokeWidth={2.5}
          />

          <Text
            style={
              styles.pendingText
            }
          >
            Waiting for your doctor to review this request.
          </Text>
        </View>
      ) : null}

      {request.canApply ? (
        <TouchableOpacity
          style={[
            styles.primaryButton,
            isApplying
              ? styles.disabledButton
              : undefined,
          ]}
          activeOpacity={0.84}
          onPress={onApply}
          disabled={isApplying}
        >
          {isApplying ? (
            <ActivityIndicator
              size="small"
              color={SURFACE}
            />
          ) : (
            <>
              <CheckCircle2
                size={18}
                color={SURFACE}
                strokeWidth={2.6}
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Add to My Medicines
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      {request.canResubmit ? (
        <TouchableOpacity
          style={
            styles.resubmitButton
          }
          activeOpacity={0.84}
          onPress={onResubmit}
        >
          <FilePenLine
            size={18}
            color={PRIMARY_DARK}
            strokeWidth={2.5}
          />

          <Text
            style={
              styles.resubmitButtonText
            }
          >
            Edit and Resubmit
          </Text>
        </TouchableOpacity>
      ) : null}

      {request.requestType ===
        "DELETE" &&
      request.status ===
        "APPROVED" ? (
        <View
          style={
            styles.removedPanel
          }
        >
          <CheckCircle2
            size={17}
            color={SUCCESS_DARK}
            strokeWidth={2.5}
          />

          <Text
            style={
              styles.removedText
            }
          >
            Medicine and future reminders were removed. Previous history remains saved.
          </Text>
        </View>
      ) : null}

      {request.requestType ===
        "DELETE" &&
      request.status ===
        "REJECTED" ? (
        <View
          style={
            styles.keptPanel
          }
        >
          <Info
            size={17}
            color={PRIMARY_DARK}
            strokeWidth={2.5}
          />

          <Text
            style={
              styles.keptText
            }
          >
            Medicine remains active in your medication schedule.
          </Text>
        </View>
      ) : null}

      {request.status ===
      "APPLIED" ? (
        <View
          style={
            styles.appliedPanel
          }
        >
          <CheckCircle2
            size={17}
            color={PRIMARY_DARK}
            strokeWidth={2.5}
          />

          <Text
            style={
              styles.appliedText
            }
          >
            Added to your medicines on{" "}
            {formatDate(
              request.appliedAt
            )}
            .
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const DetailRow = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => {
  return (
    <View
      style={styles.detailRow}
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
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
};

export default MedicineUpdatesScreen;

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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    ...elevate(1),
  },

  appBarTextBlock: {
    flex: 1,
  },

  appBarTitle: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "700",
  },

  appBarSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 11,
    ...elevate(1),
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 3,
  },

  summaryCard: {
    backgroundColor: PRIMARY,
    borderRadius: 17,
    padding: 16,
    marginBottom: 15,
    ...elevate(2),
  },

  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryIcon: {
    width: 55,
    height: 55,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  summaryTextBlock: {
    flex: 1,
  },

  summaryTitle: {
    color: SURFACE,
    fontSize: 18,
    fontWeight: "700",
  },

  summaryText: {
    color: "#E4EAFF",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },

  summaryStats: {
    backgroundColor:
      "rgba(255,255,255,0.14)",
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingVertical: 12,
  },

  summaryItem: {
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
    fontSize: 18,
    fontWeight: "700",
  },

  summaryLabel: {
    color: "#E4EAFF",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },

  summaryDivider: {
    width: 1,
    height: 35,
    backgroundColor:
      "rgba(255,255,255,0.25)",
  },

  filtersRow: {
    paddingBottom: 14,
    paddingRight: 12,
  },

  filterChip: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C7CCDA",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },

  filterChipSelected: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: PRIMARY_LIGHT,
  },

  filterText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },

  filterTextSelected: {
    color: PRIMARY_DARK,
    fontWeight: "700",
  },

  filterTextWithIcon: {
    marginLeft: 6,
  },

  errorCard: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  errorTextBlock: {
    flex: 1,
    marginLeft: 10,
  },

  errorTitle: {
    color: DANGER_DARK,
    fontSize: 14,
    fontWeight: "700",
  },

  errorText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    ...elevate(1),
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 17,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },

  stateTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },

  stateText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },

  reviewCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    paddingLeft: 18,
    marginBottom: 12,
    overflow: "hidden",
    ...elevate(1),
  },

  reviewAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 11,
  },

  typeBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  addTypeBadge: {
    backgroundColor: PRIMARY_LIGHT,
  },

  deleteTypeBadge: {
    backgroundColor: DANGER_LIGHT,
  },

  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 5,
  },

  requestDate: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
  },

  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  medicineIcon: {
    width: 47,
    height: 47,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  reviewHeading: {
    flex: 1,
  },

  medicineName: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
  },

  medicineDose: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  doctorPanel: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 13,
    padding: 11,
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  doctorIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  doctorTextBlock: {
    flex: 1,
  },

  doctorLabel: {
    color: PRIMARY_DARK,
    fontSize: 10,
    fontWeight: "600",
  },

  doctorName: {
    color: PRIMARY_DARK,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },

  detailsPanel: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    padding: 10,
    marginTop: 12,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },

  detailIcon: {
    width: 33,
    height: 33,
    borderRadius: 10,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
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
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 2,
  },

  patientReasonPanel: {
    borderRadius: 13,
    backgroundColor: DANGER_LIGHT,
    padding: 12,
    marginTop: 12,
  },

  patientReasonLabel: {
    color: DANGER_DARK,
    fontSize: 11,
    fontWeight: "700",
  },

  patientReasonText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },

  decisionPanel: {
    borderRadius: 13,
    padding: 12,
    marginTop: 12,
  },

  decisionLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  decisionText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },

  pendingPanel: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 12,
    padding: 11,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  pendingText: {
    flex: 1,
    color: WARNING_DARK,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    marginLeft: 8,
  },

  primaryButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: SUCCESS,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },

  primaryButtonText: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 7,
  },

  resubmitButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },

  resubmitButtonText: {
    color: PRIMARY_DARK,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 7,
  },

  removedPanel: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 12,
    padding: 11,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  removedText: {
    flex: 1,
    color: SUCCESS_DARK,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    marginLeft: 8,
  },

  keptPanel: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 12,
    padding: 11,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  keptText: {
    flex: 1,
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    marginLeft: 8,
  },

  appliedPanel: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 12,
    padding: 11,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  appliedText: {
    flex: 1,
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    marginLeft: 8,
  },

  disabledButton: {
    opacity: 0.58,
  },
});