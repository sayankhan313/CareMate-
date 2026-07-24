import {
  useCallback,
  useMemo,
  useState,
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
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Pill,
  RefreshCw,
  Stethoscope,
  UserRound,
  X,
  XCircle,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  doctorMedicineReviewsApi,
  type DoctorMedicineReview,
  type DoctorMedicineReviewFilter,
} from "../../services/doctor/doctorMedicineReviewsApi";
import type { DoctorTabParamList } from "../../types/navigation";

type Props = BottomTabScreenProps<
  DoctorTabParamList,
  "Reviews"
>;

type ActiveAction = {
  reminderId: string;
  action: "APPROVE" | "REJECT";
} | null;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_DARK = "#134E4A";
const DOCTOR_LIGHT = "#E6FFFA";

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
  value: DoctorMedicineReviewFilter;
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
];

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
    height: level === 1 ? 2 : 4,
  },
});

const formatStatus = (
  status: string
) => {
  return status
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
};

const formatFrequency = (
  review: DoctorMedicineReview
) => {
  if (
    review.frequency === "CUSTOM"
  ) {
    return (
      review.customFrequency ||
      "Custom schedule"
    );
  }

  return formatStatus(
    review.frequency
  );
};

const formatDate = (
  value?: string | null
) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Not available";
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const formatTime = (
  value: string
) => {
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

  date.setHours(
    hour,
    minute,
    0,
    0
  );

  return date.toLocaleTimeString(
    undefined,
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

const getStatusTone = (
  status: DoctorMedicineReview["reviewStatus"]
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

  return {
    background: WARNING_LIGHT,
    text: WARNING_DARK,
    solid: WARNING,
  };
};

export const DoctorMedicineReviewsScreen =
  ({ navigation }: Props) => {
    const insets =
      useSafeAreaInsets();

    const rootNavigation =
      navigation.getParent<any>();

    const [reviews, setReviews] =
      useState<
        DoctorMedicineReview[]
      >([]);

    const [summary, setSummary] =
      useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      });

    const [
      selectedFilter,
      setSelectedFilter,
    ] =
      useState<DoctorMedicineReviewFilter>(
        "ALL"
      );

    const [
      isLoading,
      setIsLoading,
    ] = useState(true);

    const [
      isRefreshing,
      setIsRefreshing,
    ] = useState(false);

    const [
      errorMessage,
      setErrorMessage,
    ] = useState("");

    const [
      activeAction,
      setActiveAction,
    ] =
      useState<ActiveAction>(null);

    const [
      rejectReview,
      setRejectReview,
    ] =
      useState<DoctorMedicineReview | null>(
        null
      );

    const [
      rejectionNote,
      setRejectionNote,
    ] = useState("");

    const visibleReviews =
      useMemo(() => {
        if (
          selectedFilter === "ALL"
        ) {
          return reviews;
        }

        return reviews.filter(
          (review) =>
            review.reviewStatus ===
            selectedFilter
        );
      }, [
        reviews,
        selectedFilter,
      ]);

    const loadReviews = useCallback(
      async (
        mode:
          | "initial"
          | "refresh" = "initial"
      ) => {
        try {
          if (mode === "initial") {
            setIsLoading(true);
          } else {
            setIsRefreshing(true);
          }

          setErrorMessage("");

          const result =
            await doctorMedicineReviewsApi.listReviews(
              "ALL"
            );

          setReviews(
            result.reviews || []
          );

          setSummary(
            result.summary || {
              total: 0,
              pending: 0,
              approved: 0,
              rejected: 0,
            }
          );
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load medicine reviews."
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
        void loadReviews(
          "initial"
        );
      }, [loadReviews])
    );

    const openPatient = (
      review: DoctorMedicineReview
    ) => {
      if (!rootNavigation) {
        return;
      }

      rootNavigation.navigate(
        "DoctorPatientDetail",
        {
          patientId:
            review.patient.id,
          patientName:
            review.patient.fullName,
        }
      );
    };

    const approveMedicineReview =
      async (
        review: DoctorMedicineReview
      ) => {
        if (activeAction) {
          return;
        }

        try {
          setActiveAction({
            reminderId: review.id,
            action: "APPROVE",
          });

          await doctorMedicineReviewsApi.approveReview(
            review.id
          );

          await loadReviews(
            "refresh"
          );

          Alert.alert(
            "Medicine approved",
            `${review.medicine.name} has been approved.`
          );
        } catch (error) {
          Alert.alert(
            "Unable to approve",
            error instanceof Error
              ? error.message
              : "Medicine review could not be approved."
          );
        } finally {
          setActiveAction(null);
        }
      };

    const confirmApprove = (
      review: DoctorMedicineReview
    ) => {
      Alert.alert(
        "Approve medicine",
        `Approve ${review.medicine.name} for ${review.patient.fullName}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Approve",
            onPress: () => {
              void approveMedicineReview(
                review
              );
            },
          },
        ]
      );
    };

    const openRejectModal = (
      review: DoctorMedicineReview
    ) => {
      setRejectReview(review);
      setRejectionNote("");
    };

    const closeRejectModal = () => {
      if (activeAction) {
        return;
      }

      setRejectReview(null);
      setRejectionNote("");
    };

    const submitRejection =
      async () => {
        if (
          !rejectReview ||
          activeAction
        ) {
          return;
        }

        const note =
          rejectionNote.trim();

        if (note.length < 3) {
          Alert.alert(
            "Reason required",
            "Please enter a clear rejection reason."
          );
          return;
        }

        try {
          setActiveAction({
            reminderId:
              rejectReview.id,
            action: "REJECT",
          });

          await doctorMedicineReviewsApi.rejectReview(
            rejectReview.id,
            note
          );

          setRejectReview(null);
          setRejectionNote("");

          await loadReviews(
            "refresh"
          );

          Alert.alert(
            "Medicine rejected",
            "The patient can now review the doctor's decision note."
          );
        } catch (error) {
          Alert.alert(
            "Unable to reject",
            error instanceof Error
              ? error.message
              : "Medicine review could not be rejected."
          );
        } finally {
          setActiveAction(null);
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

        <View style={styles.screen}>
          <View style={styles.appBar}>
            <View>
              <Text
                style={styles.appBarTitle}
              >
                Medicine Reviews
              </Text>

              <Text
                style={
                  styles.appBarSubtitle
                }
              >
                Review patient medicine requests
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.refreshButton
              }
              activeOpacity={0.85}
              onPress={() =>
                void loadReviews(
                  "refresh"
                )
              }
            >
              <RefreshCw
                size={20}
                color={DOCTOR_PRIMARY}
                strokeWidth={2.6}
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
                    36,
                    insets.bottom +
                      112
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
                tintColor={
                  DOCTOR_PRIMARY
                }
                colors={[
                  DOCTOR_PRIMARY,
                ]}
              />
            }
          >
            <View
              style={styles.summaryCard}
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
                  <FileCheck2
                    size={27}
                    color={
                      DOCTOR_PRIMARY
                    }
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
                    Clinical medicine review
                  </Text>

                  <Text
                    style={
                      styles.summaryText
                    }
                  >
                    Verify medicines submitted by your assigned patients.
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
              </View>
            </View>

            <ScrollView
              horizontal
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
                            DOCTOR_DARK
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
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </ScrollView>

            {errorMessage ? (
              <View
                style={styles.errorCard}
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
                    Unable to load reviews
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
                  Review requests
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  {visibleReviews.length ===
                  1
                    ? "1 request"
                    : `${visibleReviews.length} requests`}
                </Text>
              </View>

              <View
                style={
                  styles.sectionIcon
                }
              >
                <Pill
                  size={20}
                  color={
                    DOCTOR_PRIMARY
                  }
                  strokeWidth={2.6}
                />
              </View>
            </View>

            {isLoading ? (
              <View
                style={styles.stateCard}
              >
                <ActivityIndicator
                  color={
                    DOCTOR_PRIMARY
                  }
                />

                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  Loading medicine reviews...
                </Text>
              </View>
            ) : visibleReviews.length ===
              0 ? (
              <View
                style={styles.stateCard}
              >
                <View
                  style={
                    styles.emptyIcon
                  }
                >
                  <FileCheck2
                    size={29}
                    color={
                      DOCTOR_PRIMARY
                    }
                    strokeWidth={2.6}
                  />
                </View>

                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  No medicine reviews
                </Text>

                <Text
                  style={
                    styles.stateText
                  }
                >
                  Patient medicine requests assigned to you will appear here.
                </Text>
              </View>
            ) : (
              visibleReviews.map(
                (review) => (
                  <MedicineReviewCard
                    key={review.id}
                    review={review}
                    activeAction={
                      activeAction
                    }
                    onPatient={() =>
                      openPatient(
                        review
                      )
                    }
                    onApprove={() =>
                      confirmApprove(
                        review
                      )
                    }
                    onReject={() =>
                      openRejectModal(
                        review
                      )
                    }
                  />
                )
              )
            )}
          </ScrollView>
        </View>

        <Modal
          visible={Boolean(
            rejectReview
          )}
          transparent
          animationType="fade"
          onRequestClose={
            closeRejectModal
          }
        >
          <View
            style={
              styles.modalBackdrop
            }
          >
            <View
              style={styles.modalCard}
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    Reject medicine
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    {rejectReview
                      ?.medicine.name ||
                      ""}
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.modalClose
                  }
                  activeOpacity={0.84}
                  onPress={
                    closeRejectModal
                  }
                  disabled={Boolean(
                    activeAction
                  )}
                >
                  <X
                    size={20}
                    color={TEXT}
                    strokeWidth={2.6}
                  />
                </TouchableOpacity>
              </View>

              <Text
                style={
                  styles.inputLabel
                }
              >
                Decision note
              </Text>

              <TextInput
                style={styles.noteInput}
                placeholder="Explain why this medicine request is being rejected..."
                placeholderTextColor={
                  MUTED
                }
                multiline
                value={rejectionNote}
                onChangeText={
                  setRejectionNote
                }
                maxLength={500}
                textAlignVertical="top"
                editable={
                  !activeAction
                }
              />

              <Text
                style={
                  styles.characterCount
                }
              >
                {rejectionNote.length}/500
              </Text>

              <View
                style={
                  styles.modalActions
                }
              >
                <TouchableOpacity
                  style={
                    styles.modalCancelButton
                  }
                  activeOpacity={0.84}
                  onPress={
                    closeRejectModal
                  }
                  disabled={Boolean(
                    activeAction
                  )}
                >
                  <Text
                    style={
                      styles.modalCancelText
                    }
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalRejectButton,
                    activeAction
                      ? styles.disabledButton
                      : undefined,
                  ]}
                  activeOpacity={0.84}
                  onPress={() =>
                    void submitRejection()
                  }
                  disabled={Boolean(
                    activeAction
                  )}
                >
                  {activeAction
                    ?.action ===
                  "REJECT" ? (
                    <ActivityIndicator
                      size="small"
                      color={SURFACE}
                    />
                  ) : (
                    <>
                      <XCircle
                        size={17}
                        color={SURFACE}
                        strokeWidth={2.6}
                      />

                      <Text
                        style={
                          styles.modalRejectText
                        }
                      >
                        Reject
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
      style={styles.summaryItem}
    >
      <View
        style={[
          styles.summaryDot,
          {
            backgroundColor: tone,
          },
        ]}
      />

      <Text
        style={styles.summaryValue}
      >
        {value}
      </Text>

      <Text
        style={styles.summaryLabel}
      >
        {label}
      </Text>
    </View>
  );
};

const MedicineReviewCard = ({
  review,
  activeAction,
  onPatient,
  onApprove,
  onReject,
}: {
  review: DoctorMedicineReview;
  activeAction: ActiveAction;
  onPatient: () => void;
  onApprove: () => void;
  onReject: () => void;
}) => {
  const tone = getStatusTone(
    review.reviewStatus
  );

  const approving =
    activeAction?.reminderId ===
      review.id &&
    activeAction.action ===
      "APPROVE";

  const busy =
    Boolean(activeAction);

  return (
    <View
      style={styles.reviewCard}
    >
      <View
        style={[
          styles.reviewAccent,
          {
            backgroundColor:
              tone.solid,
          },
        ]}
      />

      <View
        style={styles.reviewHeader}
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
            {review.medicine.name}
          </Text>

          <Text
            style={
              styles.medicineDose
            }
          >
            {review.medicine.dose}
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
              review.reviewStatus
            )}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={
          styles.patientPanel
        }
        activeOpacity={0.84}
        onPress={onPatient}
        disabled={busy}
      >
        <View
          style={
            styles.patientIcon
          }
        >
          <UserRound
            size={18}
            color={DOCTOR_PRIMARY}
            strokeWidth={2.5}
          />
        </View>

        <View
          style={
            styles.patientTextBlock
          }
        >
          <Text
            style={
              styles.patientLabel
            }
          >
            Patient
          </Text>

          <Text
            style={
              styles.patientName
            }
            numberOfLines={1}
          >
            {review.patient.fullName}
          </Text>
        </View>

        <Stethoscope
          size={18}
          color={MUTED}
          strokeWidth={2.5}
        />
      </TouchableOpacity>

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
          value={`${formatFrequency(
            review
          )} · ${formatTime(
            review.timeOfDay
          )}`}
        />

        <DetailRow
          icon={
            <CalendarDays
              size={17}
              color={DOCTOR_PRIMARY}
              strokeWidth={2.5}
            />
          }
          label="Start date"
          value={formatDate(
            review.startDate
          )}
        />

        <DetailRow
          icon={
            <FileCheck2
              size={17}
              color={DOCTOR_PRIMARY}
              strokeWidth={2.5}
            />
          }
          label="Source"
          value={formatStatus(
            review.medicine.source
          )}
        />
      </View>

      <View
        style={
          styles.instructionsPanel
        }
      >
        <Text
          style={
            styles.instructionsLabel
          }
        >
          Instructions
        </Text>

        <Text
          style={
            styles.instructionsText
          }
        >
          {review.medicine
            .instructions ||
            "No instructions provided."}
        </Text>
      </View>

      {review.reviewNote ? (
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
            {review.reviewNote}
          </Text>
        </View>
      ) : null}

      {review.reviewStatus ===
      "PENDING" ? (
        <View
          style={styles.actions}
        >
          <TouchableOpacity
            style={[
              styles.rejectButton,
              busy
                ? styles.disabledButton
                : undefined,
            ]}
            activeOpacity={0.84}
            onPress={onReject}
            disabled={busy}
          >
            <XCircle
              size={17}
              color={DANGER_DARK}
              strokeWidth={2.6}
            />

            <Text
              style={
                styles.rejectButtonText
              }
            >
              Reject
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.approveButton,
              busy
                ? styles.disabledButton
                : undefined,
            ]}
            activeOpacity={0.84}
            onPress={onApprove}
            disabled={busy}
          >
            {approving ? (
              <ActivityIndicator
                size="small"
                color={SURFACE}
              />
            ) : (
              <>
                <CheckCircle2
                  size={17}
                  color={SURFACE}
                  strokeWidth={2.6}
                />

                <Text
                  style={
                    styles.approveButtonText
                  }
                >
                  Approve
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={styles.reviewMeta}
        >
          <CheckCircle2
            size={16}
            color={tone.text}
            strokeWidth={2.5}
          />

          <Text
            style={[
              styles.reviewMetaText,
              {
                color: tone.text,
              },
            ]}
          >
            Reviewed{" "}
            {formatDate(
              review.reviewedAt
            )}
          </Text>
        </View>
      )}
    </View>
  );
};

const DetailRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => {
  return (
    <View style={styles.detailRow}>
      <View
        style={styles.detailIcon}
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
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
};

export default DoctorMedicineReviewsScreen;

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
    paddingBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 26,
    fontWeight: "700",
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
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
    backgroundColor: DOCTOR_PRIMARY,
    borderRadius: 17,
    padding: 16,
    marginBottom: 14,
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
    color: "#D7FFFA",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },
  summaryStats: {
    backgroundColor: "rgba(255,255,255,0.14)",
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
    fontSize: 19,
    fontWeight: "700",
  },
  summaryLabel: {
    color: "#D7FFFA",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 35,
    backgroundColor: "rgba(255,255,255,0.25)",
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
    backgroundColor: DOCTOR_LIGHT,
    borderColor: DOCTOR_LIGHT,
  },
  filterText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },
  filterTextSelected: {
    color: DOCTOR_DARK,
    fontWeight: "700",
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
    justifyContent: "space-between",
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
    backgroundColor: DOCTOR_LIGHT,
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
    backgroundColor: DOCTOR_LIGHT,
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
  patientPanel: {
    backgroundColor: DOCTOR_LIGHT,
    borderRadius: 13,
    padding: 11,
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  patientIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  patientTextBlock: {
    flex: 1,
  },
  patientLabel: {
    color: DOCTOR_DARK,
    fontSize: 10,
    fontWeight: "600",
  },
  patientName: {
    color: DOCTOR_DARK,
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
    marginTop: 2,
  },
  instructionsPanel: {
    borderRadius: 13,
    backgroundColor: "#FFF9EE",
    padding: 12,
    marginTop: 12,
  },
  instructionsLabel: {
    color: WARNING_DARK,
    fontSize: 11,
    fontWeight: "700",
  },
  instructionsText: {
    color: WARNING_DARK,
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
  actions: {
    flexDirection: "row",
    marginTop: 13,
  },
  rejectButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: DANGER_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  rejectButtonText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  approveButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: SUCCESS,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  approveButtonText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  reviewMeta: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: SOFT_PANEL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },
  reviewMetaText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  disabledButton: {
    opacity: 0.58,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,25,54,0.48)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 17,
    ...elevate(2),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  modalClose: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 7,
  },
  noteInput: {
    minHeight: 120,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SOFT_PANEL,
    color: TEXT,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    padding: 12,
  },
  characterCount: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 5,
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 15,
  },
  modalCancelButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  modalCancelText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },
  modalRejectButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: DANGER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },
  modalRejectText: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
});