import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  doctorReportsApi,
  type DoctorPatientReport,
  type DoctorPatientReportsData,
  type DoctorReportQueueStatus,
} from "../../services/doctor/doctorReportsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "DoctorReportReviews">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";

const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_SECONDARY = "#14B8A6";
const DOCTOR_DARK = "#115E59";
const DOCTOR_LIGHT = "#DDF4F0";

const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#F6A545";
const WARNING_DARK = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const FILTERS: Array<{
  label: string;
  value: DoctorReportQueueStatus;
}> = [
  { label: "Pending", value: "PENDING" },
  { label: "Reviewed", value: "REVIEWED" },
  { label: "All", value: "ALL" },
];

const EMPTY_SUMMARY: DoctorPatientReportsData["summary"] = {
  total: 0,
  pending: 0,
  reviewed: 0,
  blocked: 0,
};

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const getSafeString = (value: unknown) => {
  return typeof value === "string" ? value.trim() : "";
};

const formatLabel = (value?: string | null) => {
  const safeValue = getSafeString(value);

  if (!safeValue) {
    return "Medical Report";
  }

  return safeValue
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatFileSize = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "Unknown size";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const getInitials = (name?: string | null) => {
  const safeName = getSafeString(name);

  if (!safeName) {
    return "PT";
  }

  const parts = safeName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const getReviewTone = (report: DoctorPatientReport) => {
  if (report.review?.status === "REVIEWED") {
    return {
      background: SUCCESS_LIGHT,
      text: SUCCESS_DARK,
      accent: SUCCESS,
      label: "Reviewed",
      Icon: CheckCircle2,
    };
  }

  return {
    background: WARNING_LIGHT,
    text: WARNING_DARK,
    accent: WARNING,
    label: "Pending",
    Icon: Clock3,
  };
};

const getSafetyTone = (status: DoctorPatientReport["contentSafetyStatus"]) => {
  if (status === "BLOCKED") {
    return {
      background: DANGER_LIGHT,
      text: DANGER_DARK,
      label: "Blocked",
      Icon: ShieldAlert,
    };
  }

  if (status === "CLEAR") {
    return {
      background: SUCCESS_LIGHT,
      text: SUCCESS_DARK,
      label: "File checked",
      Icon: ShieldCheck,
    };
  }

  return {
    background: WARNING_LIGHT,
    text: WARNING_DARK,
    label: "Manual review",
    Icon: AlertTriangle,
  };
};

const getEmptyTitle = (filter: DoctorReportQueueStatus) => {
  if (filter === "PENDING") {
    return "No pending reports";
  }

  if (filter === "REVIEWED") {
    return "No reviewed reports";
  }

  return "No reports found";
};

const getEmptyText = (filter: DoctorReportQueueStatus) => {
  if (filter === "PENDING") {
    return "New medical reports uploaded by assigned patients will appear here.";
  }

  if (filter === "REVIEWED") {
    return "Reports will appear here after you complete their clinical review.";
  }

  return "Reports uploaded by assigned patients will appear here.";
};

const DoctorReportReviewsScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();

  const [reports, setReports] = useState<DoctorPatientReport[]>([]);
  const [summary, setSummary] =
    useState<DoctorPatientReportsData["summary"]>(EMPTY_SUMMARY);
  const [selectedFilter, setSelectedFilter] =
    useState<DoctorReportQueueStatus>("PENDING");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReports = useCallback(
    async (
      mode: "initial" | "refresh" = "initial",
      filter: DoctorReportQueueStatus = selectedFilter
    ) => {
      try {
        mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
        setErrorMessage("");

        const result = await doctorReportsApi.listReportQueue(filter);
        const nextReports = Array.isArray(result?.reports) ? result.reports : [];

        setReports(nextReports);
        setSummary(result?.summary || EMPTY_SUMMARY);
      } catch (error) {
        setReports([]);
        setSummary(EMPTY_SUMMARY);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load report reviews."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedFilter]
  );

  useFocusEffect(
    useCallback(() => {
      void loadReports("initial", selectedFilter);
    }, [loadReports, selectedFilter])
  );

  const selectFilter = (filter: DoctorReportQueueStatus) => {
    if (filter !== selectedFilter) {
      setSelectedFilter(filter);
    }
  };

  const openReport = (report: DoctorPatientReport) => {
    const reportId = getSafeString(report.id);
    const patientId =
      getSafeString(report.patientId) || getSafeString(report.patient?.id);
    const patientName =
      getSafeString(report.patient?.fullName) || "Patient";

    if (!reportId) {
      Alert.alert(
        "Unable to open report",
        "The backend did not return the report ID."
      );
      return;
    }

    if (!patientId) {
      Alert.alert(
        "Unable to open report",
        "The backend did not return the patient ID."
      );
      return;
    }

    navigation.push("DoctorReportReview", {
      patientId,
      patientName,
      reportId,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.84}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={21} color={TEXT} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Report Reviews</Text>
            <Text style={styles.headerSubtitle}>
              Reports from assigned patients
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.84}
            onPress={() => void loadReports("refresh", selectedFilter)}
          >
            <RefreshCw size={20} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(32, insets.bottom + 24) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadReports("refresh", selectedFilter)}
              tintColor={DOCTOR_PRIMARY}
              colors={[DOCTOR_PRIMARY]}
            />
          }
        >
          <LinearGradient
            colors={[DOCTOR_PRIMARY, DOCTOR_SECONDARY]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroHeader}>
              <View style={styles.heroIcon}>
                <FileText
                  size={27}
                  color={DOCTOR_PRIMARY}
                  strokeWidth={2.6}
                />
              </View>

              <View style={styles.heroTextBlock}>
                <Text style={styles.heroTitle}>Central report queue</Text>
                <Text style={styles.heroText}>
                  Review medical reports uploaded by all patients currently
                  assigned to you.
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <SummaryItem value={summary.total} label="Total" />

              <View style={styles.summaryDivider} />

              <SummaryItem
                value={summary.pending}
                label="Pending"
                valueTone="warning"
              />

              <View style={styles.summaryDivider} />

              <SummaryItem
                value={summary.reviewed}
                label="Reviewed"
                valueTone="success"
              />

              <View style={styles.summaryDivider} />

              <SummaryItem
                value={summary.blocked}
                label="Blocked"
                valueTone="danger"
              />
            </View>
          </LinearGradient>

          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {FILTERS.map((filter) => {
              const selected = selectedFilter === filter.value;
              const count =
                filter.value === "PENDING"
                  ? summary.pending
                  : filter.value === "REVIEWED"
                  ? summary.reviewed
                  : summary.total;

              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    selected ? styles.filterChipSelected : undefined,
                  ]}
                  activeOpacity={0.84}
                  onPress={() => selectFilter(filter.value)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected ? styles.filterTextSelected : undefined,
                    ]}
                  >
                    {filter.label}
                  </Text>

                  <View
                    style={[
                      styles.filterCount,
                      selected ? styles.filterCountSelected : undefined,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        selected ? styles.filterCountTextSelected : undefined,
                      ]}
                    >
                      {count > 99 ? "99+" : count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIcon}>
                <AlertTriangle
                  size={24}
                  color={DANGER_DARK}
                  strokeWidth={2.6}
                />
              </View>

              <View style={styles.errorTextBlock}>
                <Text style={styles.errorTitle}>
                  Unable to load report queue
                </Text>

                <Text style={styles.errorText}>{errorMessage}</Text>

                <TouchableOpacity
                  style={styles.retryButton}
                  activeOpacity={0.84}
                  onPress={() =>
                    void loadReports("initial", selectedFilter)
                  }
                >
                  <RefreshCw
                    size={16}
                    color={SURFACE}
                    strokeWidth={2.6}
                  />
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="large" color={DOCTOR_PRIMARY} />
              <Text style={styles.stateTitle}>Loading report reviews</Text>
              <Text style={styles.stateText}>
                Fetching reports from your assigned patients.
              </Text>
            </View>
          ) : !errorMessage && reports.length === 0 ? (
            <View style={styles.stateCard}>
              <View style={styles.emptyIcon}>
                {selectedFilter === "PENDING" ? (
                  <CheckCircle2
                    size={30}
                    color={SUCCESS}
                    strokeWidth={2.6}
                  />
                ) : (
                  <FileText
                    size={30}
                    color={DOCTOR_PRIMARY}
                    strokeWidth={2.6}
                  />
                )}
              </View>

              <Text style={styles.stateTitle}>
                {getEmptyTitle(selectedFilter)}
              </Text>

              <Text style={styles.stateText}>
                {getEmptyText(selectedFilter)}
              </Text>
            </View>
          ) : (
            reports.map((report) => (
              <ReportQueueCard
                key={report.id}
                report={report}
                onPress={() => openReport(report)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const SummaryItem = ({
  value,
  label,
  valueTone,
}: {
  value: number;
  label: string;
  valueTone?: "warning" | "success" | "danger";
}) => {
  const valueStyle =
    valueTone === "warning"
      ? styles.summaryValueWarning
      : valueTone === "success"
      ? styles.summaryValueSuccess
      : valueTone === "danger"
      ? styles.summaryValueDanger
      : undefined;

  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, valueStyle]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
};

const ReportQueueCard = ({
  report,
  onPress,
}: {
  report: DoctorPatientReport;
  onPress: () => void;
}) => {
  const reviewTone = getReviewTone(report);
  const safetyTone = getSafetyTone(report.contentSafetyStatus);
  const ReviewIcon = reviewTone.Icon;
  const SafetyIcon = safetyTone.Icon;

  const patientName =
    getSafeString(report.patient?.fullName) || "Assigned patient";
  const patientEmail =
    getSafeString(report.patient?.email) || "Email unavailable";

  return (
    <TouchableOpacity
      style={styles.reportCard}
      activeOpacity={0.84}
      onPress={onPress}
    >
      <View
        style={[
          styles.reportAccent,
          { backgroundColor: reviewTone.accent },
        ]}
      />

      <View style={styles.patientRow}>
        <View style={styles.patientAvatar}>
          <Text style={styles.patientAvatarText}>
            {getInitials(patientName)}
          </Text>
        </View>

        <View style={styles.patientTextBlock}>
          <Text style={styles.patientName} numberOfLines={1}>
            {patientName}
          </Text>

          <Text style={styles.patientEmail} numberOfLines={1}>
            {patientEmail}
          </Text>
        </View>

        <View
          style={[
            styles.reviewBadge,
            { backgroundColor: reviewTone.background },
          ]}
        >
          <ReviewIcon
            size={14}
            color={reviewTone.text}
            strokeWidth={2.7}
          />

          <Text
            style={[
              styles.reviewBadgeText,
              { color: reviewTone.text },
            ]}
          >
            {reviewTone.label}
          </Text>
        </View>
      </View>

      <View style={styles.reportDivider} />

      <View style={styles.reportMainRow}>
        <View
          style={[
            styles.reportIcon,
            { backgroundColor: reviewTone.background },
          ]}
        >
          <FileText
            size={24}
            color={reviewTone.text}
            strokeWidth={2.6}
          />
        </View>

        <View style={styles.reportTextBlock}>
          <Text style={styles.reportTitle} numberOfLines={1}>
            {getSafeString(report.title) || "Medical Report"}
          </Text>

          <Text style={styles.reportCategory}>
            {formatLabel(report.category)}
          </Text>
        </View>

        <ChevronRight
          size={20}
          color={DOCTOR_PRIMARY}
          strokeWidth={2.6}
        />
      </View>

      <View style={styles.detailsPanel}>
        <DetailRow
          label="Report date"
          value={formatDate(report.reportDate)}
        />

        <DetailRow
          label="Uploaded"
          value={formatDateTime(report.createdAt)}
        />

        <DetailRow
          label="File"
          value={`${formatFileSize(report.fileSize)} · ${
            getSafeString(report.originalFileName) || "Medical report"
          }`}
          isLast
        />
      </View>

      {getSafeString(report.description) ? (
        <View style={styles.descriptionPanel}>
          <Stethoscope
            size={17}
            color={DOCTOR_PRIMARY}
            strokeWidth={2.5}
          />

          <Text style={styles.descriptionText} numberOfLines={2}>
            {report.description}
          </Text>
        </View>
      ) : null}

      <View style={styles.reportFooter}>
        <View
          style={[
            styles.safetyBadge,
            { backgroundColor: safetyTone.background },
          ]}
        >
          <SafetyIcon
            size={15}
            color={safetyTone.text}
            strokeWidth={2.5}
          />

          <Text
            style={[
              styles.safetyBadgeText,
              { color: safetyTone.text },
            ]}
          >
            {safetyTone.label}
          </Text>
        </View>

        <View style={styles.openAction}>
          <Text style={styles.openActionText}>
            {report.review?.status === "REVIEWED"
              ? "View review"
              : "Review report"}
          </Text>

          <ChevronRight
            size={17}
            color={DOCTOR_PRIMARY}
            strokeWidth={2.6}
          />
        </View>
      </View>

      {report.review?.reviewNote ? (
        <View style={styles.reviewNotePanel}>
          <CheckCircle2
            size={17}
            color={SUCCESS_DARK}
            strokeWidth={2.6}
          />

          <Text style={styles.reviewNoteText} numberOfLines={2}>
            {report.review.reviewNote}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const DetailRow = ({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) => {
  return (
    <View
      style={[
        styles.detailRow,
        isLast ? styles.detailRowLast : undefined,
      ]}
    >
      <Text style={styles.detailLabel}>{label}</Text>

      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

export default DoctorReportReviewsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  header: {
    minHeight: 70,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...elevate(1),
  },

  headerTextBlock: {
    flex: 1,
    paddingHorizontal: 12,
  },

  headerTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "700",
  },

  headerSubtitle: {
    color: MUTED,
    fontSize: 12,
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

  heroCard: {
    borderRadius: 16,
    padding: 17,
    overflow: "hidden",
    ...elevate(2),
  },

  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  heroTextBlock: {
    flex: 1,
  },

  heroTitle: {
    color: SURFACE,
    fontSize: 18,
    fontWeight: "700",
  },

  heroText: {
    color: "#D7FFFA",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },

  summaryRow: {
    backgroundColor: "rgba(255,255,255,0.16)",
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

  summaryValue: {
    color: SURFACE,
    fontSize: 19,
    fontWeight: "700",
  },

  summaryValueWarning: {
    color: "#FFE0B2",
  },

  summaryValueSuccess: {
    color: "#D1FAE5",
  },

  summaryValueDanger: {
    color: "#FFD6DA",
  },

  summaryLabel: {
    color: "#D7FFFA",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },

  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    backgroundColor: "rgba(255,255,255,0.28)",
  },

  filtersRow: {
    paddingVertical: 16,
  },

  filterChip: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: SURFACE,
    paddingHorizontal: 14,
    marginRight: 9,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...elevate(1),
  },

  filterChipSelected: {
    backgroundColor: DOCTOR_PRIMARY,
  },

  filterText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  filterTextSelected: {
    color: SURFACE,
  },

  filterCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginLeft: 8,
  },

  filterCountSelected: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  filterCountText: {
    color: DOCTOR_DARK,
    fontSize: 10,
    fontWeight: "700",
  },

  filterCountTextSelected: {
    color: SURFACE,
  },

  errorCard: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
    marginBottom: 14,
  },

  errorIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  errorTextBlock: {
    flex: 1,
  },

  errorTitle: {
    color: DANGER_DARK,
    fontSize: 15,
    fontWeight: "700",
  },

  errorText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },

  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: DANGER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    overflow: "hidden",
  },

  retryText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 32,
    alignItems: "center",
    ...elevate(1),
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 17,
    backgroundColor: SUCCESS_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  stateTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 13,
  },

  stateText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
  },

  reportCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    overflow: "hidden",
    ...elevate(1),
  },

  reportAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },

  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 3,
  },

  patientAvatar: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  patientAvatarText: {
    color: DOCTOR_PRIMARY,
    fontSize: 14,
    fontWeight: "800",
  },

  patientTextBlock: {
    flex: 1,
  },

  patientName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },

  patientEmail: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },

  reviewBadge: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },

  reviewBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 5,
  },

  reportDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E4E8F2",
    marginVertical: 13,
  },

  reportMainRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 3,
  },

  reportIcon: {
    width: 47,
    height: 47,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  reportTextBlock: {
    flex: 1,
  },

  reportTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },

  reportCategory: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },

  detailsPanel: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 13,
  },

  detailRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0E5EE",
  },

  detailRowLast: {
    borderBottomWidth: 0,
  },

  detailLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    width: 83,
  },

  detailValue: {
    flex: 1,
    color: TEXT,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
  },

  descriptionPanel: {
    backgroundColor: DOCTOR_LIGHT,
    borderRadius: 11,
    padding: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 11,
  },

  descriptionText: {
    flex: 1,
    color: DOCTOR_DARK,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginLeft: 8,
  },

  reportFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
    paddingLeft: 3,
  },

  safetyBadge: {
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  safetyBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 5,
  },

  openAction: {
    flexDirection: "row",
    alignItems: "center",
  },

  openActionText: {
    color: DOCTOR_PRIMARY,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 3,
  },

  reviewNotePanel: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 11,
    padding: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 11,
  },

  reviewNoteText: {
    flex: 1,
    color: SUCCESS_DARK,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginLeft: 8,
  },
});