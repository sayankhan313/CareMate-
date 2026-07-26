import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
  PlusCircle,
  RefreshCw,
  Stethoscope,
  Trash2,
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
  type DoctorMedicineReviewRequestType,
  type DoctorMedicineReviewTypeFilter,
} from "../../services/doctor/doctorMedicineReviewsApi";
import type { DoctorTabParamList } from "../../types/navigation";

type Props = BottomTabScreenProps<
  DoctorTabParamList,
  "Reviews"
>;

type DecisionAction =
  | "APPROVE"
  | "REJECT";

type ActiveAction = {
  requestId: string;
  action: DecisionAction;
} | null;

type DecisionModalState = {
  review: DoctorMedicineReview;
  action: DecisionAction;
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

const INFO = "#4C6FE0";
const INFO_DARK = "#2144A5";
const INFO_LIGHT = "#E8EDFF";

const STATUS_FILTERS: {
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
  {
    label: "Applied",
    value: "APPLIED",
  },
];

const TYPE_FILTERS: {
  label: string;
  value: DoctorMedicineReviewTypeFilter;
}[] = [
  {
    label: "All requests",
    value: "ALL",
  },
  {
    label: "Add medicine",
    value: "ADD",
  },
  {
    label: "Remove medicine",
    value: "DELETE",
  },
];

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: {
    width: 0,
    height: level === 1 ? 2 : 4,
  },
});

const formatStatus = (status: string) => {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
};

const formatFrequency = (review: DoctorMedicineReview) => {
  if (review.frequency === "CUSTOM") {
    return review.customFrequency || "Custom schedule";
  }

  return formatStatus(review.frequency);
};

const formatDate = (value?: string | null) => {
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

const formatTime = (value?: string | null) => {
  if (!value) {
    return "Not set";
  }

  const [hourText, minuteText] = value.split(":");

  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
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

  if (status === "APPLIED") {
    return {
      background: INFO_LIGHT,
      text: INFO_DARK,
      solid: INFO,
    };
  }

  return {
    background: WARNING_LIGHT,
    text: WARNING_DARK,
    solid: WARNING,
  };
};

const getRequestTypeTone = (
  requestType: DoctorMedicineReviewRequestType
) => {
  if (requestType === "DELETE") {
    return {
      label: "Remove medicine",
      background: DANGER_LIGHT,
      text: DANGER_DARK,
      icon: DANGER,
    };
  }

  return {
    label: "Add medicine",
    background: DOCTOR_LIGHT,
    text: DOCTOR_DARK,
    icon: DOCTOR_PRIMARY,
  };
};

export const DoctorMedicineReviewsScreen = ({
  navigation,
}: Props) => {
  const insets = useSafeAreaInsets();
  const rootNavigation = navigation.getParent<any>();

  const [reviews, setReviews] = useState<DoctorMedicineReview[]>([]);

  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    applied: 0,
    additions: 0,
    deletions: 0,
  });

  const [selectedStatus, setSelectedStatus] =
    useState<DoctorMedicineReviewFilter>("ALL");

  const [selectedType, setSelectedType] =
    useState<DoctorMedicineReviewTypeFilter>("ALL");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [activeAction, setActiveAction] =
    useState<ActiveAction>(null);

  const [decisionModal, setDecisionModal] =
    useState<DecisionModalState>(null);

  const [decisionNote, setDecisionNote] = useState("");

  const visibleReviews = useMemo(() => {
    return reviews.filter((review) => {
      const statusMatches =
        selectedStatus === "ALL" ||
        review.reviewStatus === selectedStatus;

      const typeMatches =
        selectedType === "ALL" ||
        review.requestType === selectedType;

      return statusMatches && typeMatches;
    });
  }, [reviews, selectedStatus, selectedType]);

  const loadReviews = useCallback(
    async (
      mode: "initial" | "refresh" = "initial"
    ) => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const result = await doctorMedicineReviewsApi.listReviews(
          "ALL",
          "ALL"
        );

        setReviews(result.reviews || []);

        setSummary(
          result.summary || {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            applied: 0,
            additions: 0,
            deletions: 0,
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
      void loadReviews("initial");
    }, [loadReviews])
  );

  const openPatient = (review: DoctorMedicineReview) => {
    if (!rootNavigation) {
      return;
    }

    rootNavigation.navigate("DoctorPatientDetail", {
      patientId: review.patient.id,
      patientName: review.patient.fullName,
    });
  };

  const openDecisionModal = (
    review: DoctorMedicineReview,
    action: DecisionAction
  ) => {
    if (activeAction) {
      return;
    }

    setDecisionModal({
      review,
      action,
    });

    setDecisionNote("");
  };

  const closeDecisionModal = () => {
    if (activeAction) {
      return;
    }

    setDecisionModal(null);
    setDecisionNote("");
  };

  const submitDecision = async () => {
    if (!decisionModal || activeAction) {
      return;
    }

    const note = decisionNote.trim();

    if (
      decisionModal.action === "REJECT" &&
      note.length < 3
    ) {
      Alert.alert(
        "Reason required",
        "Please enter a clear rejection reason."
      );

      return;
    }

    const review = decisionModal.review;

    try {
      setActiveAction({
        requestId: review.id,
        action: decisionModal.action,
      });

      if (decisionModal.action === "APPROVE") {
        await doctorMedicineReviewsApi.approveReview(
          review.id,
          note || undefined
        );
      } else {
        await doctorMedicineReviewsApi.rejectReview(
          review.id,
          note
        );
      }

      setDecisionModal(null);
      setDecisionNote("");

      await loadReviews("refresh");

      const actionLabel =
        decisionModal.action === "APPROVE"
          ? "approved"
          : "rejected";

      const requestLabel =
        review.requestType === "DELETE"
          ? "medicine removal"
          : "medicine addition";

      const resultMessage =
        review.requestType === "ADD" &&
        decisionModal.action === "APPROVE"
          ? "The patient can now add this medicine to their active schedule."
          : review.requestType === "DELETE" &&
              decisionModal.action === "APPROVE"
            ? "The medicine and its future reminders have been deactivated."
            : "The patient can now review your decision note.";

      Alert.alert(
        `${formatStatus(requestLabel)} ${actionLabel}`,
        resultMessage
      );
    } catch (error) {
      Alert.alert(
        "Unable to save decision",
        error instanceof Error
          ? error.message
          : "Medicine review could not be updated."
      );
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <View style={styles.appBarTextBlock}>
            <Text style={styles.appBarTitle}>Medicine Reviews</Text>

            <Text style={styles.appBarSubtitle}>
              Review medicine additions and removal requests
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            activeOpacity={0.85}
            onPress={() => void loadReviews("refresh")}
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
              paddingBottom: Math.max(
                36,
                insets.bottom + 112
              ),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadReviews("refresh")}
              tintColor={DOCTOR_PRIMARY}
              colors={[DOCTOR_PRIMARY]}
            />
          }
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryIcon}>
                <FileCheck2
                  size={27}
                  color={DOCTOR_PRIMARY}
                  strokeWidth={2.7}
                />
              </View>

              <View style={styles.summaryTextBlock}>
                <Text style={styles.summaryTitle}>
                  Clinical medicine review
                </Text>

                <Text style={styles.summaryText}>
                  {summary.additions} addition request
                  {summary.additions === 1 ? "" : "s"} and{" "}
                  {summary.deletions} removal request
                  {summary.deletions === 1 ? "" : "s"}.
                </Text>
              </View>
            </View>

            <View style={styles.summaryStats}>
              <SummaryItem
                value={summary.pending}
                label="Pending"
                tone={WARNING}
              />

              <View style={styles.summaryDivider} />

              <SummaryItem
                value={summary.approved}
                label="Approved"
                tone={SUCCESS}
              />

              <View style={styles.summaryDivider} />

              <SummaryItem
                value={summary.rejected}
                label="Rejected"
                tone={DANGER}
              />

              <View style={styles.summaryDivider} />

              <SummaryItem
                value={summary.applied}
                label="Applied"
                tone={INFO}
              />
            </View>
          </View>

          <Text style={styles.filterLabel}>Request type</Text>

          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {TYPE_FILTERS.map((filter) => {
              const selected = selectedType === filter.value;

              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    selected
                      ? styles.filterChipSelected
                      : undefined,
                  ]}
                  activeOpacity={0.84}
                  onPress={() => setSelectedType(filter.value)}
                >
                  {filter.value === "ADD" ? (
                    <PlusCircle
                      size={14}
                      color={
                        selected
                          ? DOCTOR_DARK
                          : MUTED
                      }
                      strokeWidth={2.5}
                    />
                  ) : null}

                  {filter.value === "DELETE" ? (
                    <Trash2
                      size={14}
                      color={
                        selected
                          ? DOCTOR_DARK
                          : MUTED
                      }
                      strokeWidth={2.5}
                    />
                  ) : null}

                  <Text
                    style={[
                      styles.filterText,
                      selected
                        ? styles.filterTextSelected
                        : undefined,
                      filter.value !== "ALL"
                        ? styles.filterTextWithIcon
                        : undefined,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.filterLabel}>Decision status</Text>

          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {STATUS_FILTERS.map((filter) => {
              const selected = selectedStatus === filter.value;

              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    selected
                      ? styles.filterChipSelected
                      : undefined,
                  ]}
                  activeOpacity={0.84}
                  onPress={() => setSelectedStatus(filter.value)}
                >
                  {selected ? (
                    <CheckCircle2
                      size={14}
                      color={DOCTOR_DARK}
                      strokeWidth={2.5}
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
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <AlertCircle
                size={22}
                color={DANGER}
                strokeWidth={2.6}
              />

              <View style={styles.errorTextBlock}>
                <Text style={styles.errorTitle}>
                  Unable to load reviews
                </Text>

                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Review requests
              </Text>

              <Text style={styles.sectionSubtitle}>
                {visibleReviews.length === 1
                  ? "1 request"
                  : `${visibleReviews.length} requests`}
              </Text>
            </View>

            <View style={styles.sectionIcon}>
              <Pill
                size={20}
                color={DOCTOR_PRIMARY}
                strokeWidth={2.6}
              />
            </View>
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={DOCTOR_PRIMARY} />

              <Text style={styles.stateTitle}>
                Loading medicine reviews...
              </Text>
            </View>
          ) : visibleReviews.length === 0 ? (
            <View style={styles.stateCard}>
              <View style={styles.emptyIcon}>
                <FileCheck2
                  size={29}
                  color={DOCTOR_PRIMARY}
                  strokeWidth={2.6}
                />
              </View>

              <Text style={styles.stateTitle}>
                No medicine reviews
              </Text>

              <Text style={styles.stateText}>
                Patient medicine requests matching these filters
                will appear here.
              </Text>
            </View>
          ) : (
            visibleReviews.map((review) => (
              <MedicineReviewCard
                key={review.id}
                review={review}
                activeAction={activeAction}
                onPatient={() => openPatient(review)}
                onApprove={() =>
                  openDecisionModal(review, "APPROVE")
                }
                onReject={() =>
                  openDecisionModal(review, "REJECT")
                }
              />
            ))
          )}
        </ScrollView>
      </View>

      <Modal
        visible={Boolean(decisionModal)}
        transparent
        animationType="fade"
        onRequestClose={closeDecisionModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>
                  {decisionModal?.action === "APPROVE"
                    ? "Approve request"
                    : "Reject request"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {decisionModal?.review.medicine.name || ""}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                activeOpacity={0.84}
                onPress={closeDecisionModal}
                disabled={Boolean(activeAction)}
              >
                <X size={20} color={TEXT} strokeWidth={2.6} />
              </TouchableOpacity>
            </View>

            {decisionModal?.review.requestType === "DELETE" ? (
              <View style={styles.modalWarningPanel}>
                <Trash2
                  size={18}
                  color={DANGER_DARK}
                  strokeWidth={2.6}
                />

                <Text style={styles.modalWarningText}>
                  Approval will deactivate this medicine and all
                  future reminders. Existing history will remain.
                </Text>
              </View>
            ) : (
              <View style={styles.modalInfoPanel}>
                <PlusCircle
                  size={18}
                  color={DOCTOR_DARK}
                  strokeWidth={2.6}
                />

                <Text style={styles.modalInfoText}>
                  Approval allows the patient to add this medicine
                  to their active schedule.
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>
              {decisionModal?.action === "REJECT"
                ? "Rejection reason"
                : "Decision note (optional)"}
            </Text>

            <TextInput
              style={styles.noteInput}
              placeholder={
                decisionModal?.action === "REJECT"
                  ? "Explain why this request is being rejected..."
                  : "Add instructions or advice for the patient..."
              }
              placeholderTextColor={MUTED}
              multiline
              value={decisionNote}
              onChangeText={setDecisionNote}
              maxLength={500}
              textAlignVertical="top"
              editable={!activeAction}
            />

            <Text style={styles.characterCount}>
              {decisionNote.length}/500
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                activeOpacity={0.84}
                onPress={closeDecisionModal}
                disabled={Boolean(activeAction)}
              >
                <Text style={styles.modalCancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  decisionModal?.action === "REJECT"
                    ? styles.modalRejectButton
                    : styles.modalApproveButton,
                  activeAction
                    ? styles.disabledButton
                    : undefined,
                ]}
                activeOpacity={0.84}
                onPress={() => void submitDecision()}
                disabled={Boolean(activeAction)}
              >
                {activeAction ? (
                  <ActivityIndicator
                    size="small"
                    color={SURFACE}
                  />
                ) : decisionModal?.action === "REJECT" ? (
                  <>
                    <XCircle
                      size={17}
                      color={SURFACE}
                      strokeWidth={2.6}
                    />

                    <Text style={styles.modalActionText}>
                      Reject
                    </Text>
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={17}
                      color={SURFACE}
                      strokeWidth={2.6}
                    />

                    <Text style={styles.modalActionText}>
                      Approve
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    <View style={styles.summaryItem}>
      <View
        style={[
          styles.summaryDot,
          {
            backgroundColor: tone,
          },
        ]}
      />

      <Text style={styles.summaryValue}>{value}</Text>

      <Text style={styles.summaryLabel}>{label}</Text>
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
  const statusTone = getStatusTone(review.reviewStatus);
  const requestTone = getRequestTypeTone(review.requestType);

  const approving =
    activeAction?.requestId === review.id &&
    activeAction.action === "APPROVE";

  const rejecting =
    activeAction?.requestId === review.id &&
    activeAction.action === "REJECT";

  const busy = Boolean(activeAction);

  return (
    <View style={styles.reviewCard}>
      <View
        style={[
          styles.reviewAccent,
          {
            backgroundColor:
              review.requestType === "DELETE"
                ? DANGER
                : statusTone.solid,
          },
        ]}
      />

      <View style={styles.requestTypeRow}>
        <View
          style={[
            styles.requestTypeBadge,
            {
              backgroundColor: requestTone.background,
            },
          ]}
        >
          {review.requestType === "DELETE" ? (
            <Trash2
              size={14}
              color={requestTone.icon}
              strokeWidth={2.6}
            />
          ) : (
            <PlusCircle
              size={14}
              color={requestTone.icon}
              strokeWidth={2.6}
            />
          )}

          <Text
            style={[
              styles.requestTypeText,
              {
                color: requestTone.text,
              },
            ]}
          >
            {requestTone.label}
          </Text>
        </View>

        <Text style={styles.requestDate}>
          {formatDate(review.createdAt)}
        </Text>
      </View>

      <View style={styles.reviewHeader}>
        <View
          style={[
            styles.medicineIcon,
            {
              backgroundColor:
                review.requestType === "DELETE"
                  ? DANGER_LIGHT
                  : statusTone.background,
            },
          ]}
        >
          <Pill
            size={23}
            color={
              review.requestType === "DELETE"
                ? DANGER
                : statusTone.text
            }
            strokeWidth={2.6}
          />
        </View>

        <View style={styles.reviewHeading}>
          <Text style={styles.medicineName} numberOfLines={1}>
            {review.medicine.name}
          </Text>

          <Text style={styles.medicineDose}>
            {review.medicine.dose}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusTone.background,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: statusTone.solid,
              },
            ]}
          />

          <Text
            style={[
              styles.statusText,
              {
                color: statusTone.text,
              },
            ]}
          >
            {formatStatus(review.reviewStatus)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.patientPanel}
        activeOpacity={0.84}
        onPress={onPatient}
        disabled={busy}
      >
        <View style={styles.patientIcon}>
          <UserRound
            size={18}
            color={DOCTOR_PRIMARY}
            strokeWidth={2.5}
          />
        </View>

        <View style={styles.patientTextBlock}>
          <Text style={styles.patientLabel}>Patient</Text>

          <Text style={styles.patientName} numberOfLines={1}>
            {review.patient.fullName}
          </Text>
        </View>

        <Stethoscope
          size={18}
          color={MUTED}
          strokeWidth={2.5}
        />
      </TouchableOpacity>

      {review.requestType === "ADD" ? (
        <View style={styles.detailsPanel}>
          <DetailRow
            icon={
              <Clock3
                size={17}
                color={WARNING_DARK}
                strokeWidth={2.5}
              />
            }
            label="Schedule"
            value={`${formatFrequency(review)} · ${formatTime(
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
            value={formatDate(review.startDate)}
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
            value={formatStatus(review.medicine.source)}
          />
        </View>
      ) : (
        <View style={styles.deletionStatePanel}>
          <Trash2
            size={18}
            color={DANGER_DARK}
            strokeWidth={2.6}
          />

          <View style={styles.deletionStateTextBlock}>
            <Text style={styles.deletionStateTitle}>
              Removal review
            </Text>

            <Text style={styles.deletionStateText}>
              {review.medicine.isActive
                ? "Medicine remains active while this request is pending."
                : "Medicine is no longer active in the patient schedule."}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.instructionsPanel}>
        <Text style={styles.instructionsLabel}>
          Instructions
        </Text>

        <Text style={styles.instructionsText}>
          {review.medicine.instructions ||
            "No instructions provided."}
        </Text>
      </View>

      {review.patientReason ? (
        <View style={styles.patientReasonPanel}>
          <Text style={styles.patientReasonLabel}>
            Patient removal reason
          </Text>

          <Text style={styles.patientReasonText}>
            {review.patientReason}
          </Text>
        </View>
      ) : null}

      {review.reviewNote ? (
        <View
          style={[
            styles.decisionPanel,
            {
              backgroundColor: statusTone.background,
            },
          ]}
        >
          <Text
            style={[
              styles.decisionLabel,
              {
                color: statusTone.text,
              },
            ]}
          >
            Doctor decision note
          </Text>

          <Text
            style={[
              styles.decisionText,
              {
                color: statusTone.text,
              },
            ]}
          >
            {review.reviewNote}
          </Text>
        </View>
      ) : null}

      {review.reviewStatus === "PENDING" ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.rejectButton,
              busy ? styles.disabledButton : undefined,
            ]}
            activeOpacity={0.84}
            onPress={onReject}
            disabled={busy}
          >
            {rejecting ? (
              <ActivityIndicator
                size="small"
                color={DANGER_DARK}
              />
            ) : (
              <>
                <XCircle
                  size={17}
                  color={DANGER_DARK}
                  strokeWidth={2.6}
                />

                <Text style={styles.rejectButtonText}>
                  Reject
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.approveButton,
              busy ? styles.disabledButton : undefined,
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

                <Text style={styles.approveButtonText}>
                  Approve
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.reviewMeta}>
          <CheckCircle2
            size={16}
            color={statusTone.text}
            strokeWidth={2.5}
          />

          <Text
            style={[
              styles.reviewMetaText,
              {
                color: statusTone.text,
              },
            ]}
          >
            {review.reviewStatus === "APPLIED"
              ? `Applied ${formatDate(review.appliedAt)}`
              : `Reviewed ${formatDate(review.reviewedAt)}`}
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
      <View style={styles.detailIcon}>{icon}</View>

      <View style={styles.detailTextBlock}>
        <Text style={styles.detailLabel}>{label}</Text>

        <Text style={styles.detailValue} numberOfLines={1}>
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
  appBarTextBlock: {
    flex: 1,
    paddingRight: 12,
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
    fontSize: 18,
    fontWeight: "700",
  },
  summaryLabel: {
    color: "#D7FFFA",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 35,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  filterLabel: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
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
  requestTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  requestTypeBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  requestTypeText: {
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
  deletionStatePanel: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 13,
    padding: 12,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  deletionStateTextBlock: {
    flex: 1,
    marginLeft: 9,
  },
  deletionStateTitle: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "700",
  },
  deletionStateText: {
    color: DANGER_DARK,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 3,
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
  modalHeaderText: {
    flex: 1,
    paddingRight: 12,
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
  modalWarningPanel: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 12,
    padding: 11,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  modalWarningText: {
    flex: 1,
    color: DANGER_DARK,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginLeft: 8,
  },
  modalInfoPanel: {
    backgroundColor: DOCTOR_LIGHT,
    borderRadius: 12,
    padding: 11,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  modalInfoText: {
    flex: 1,
    color: DOCTOR_DARK,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginLeft: 8,
  },
  inputLabel: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 17,
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
  modalApproveButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: SUCCESS,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },
  modalActionText: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
});