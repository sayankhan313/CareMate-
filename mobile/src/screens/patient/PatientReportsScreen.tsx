import {
  useCallback,
  useMemo,
  useState,
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
import {
  useFocusEffect,
} from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  Plus,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LocalizedText as Text } from "../../components/common/LocalizedText";

import {
  patientReportsApi,
  type PatientReport,
  type PatientReportStatus,
} from "../../services/patientReportsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "PatientReports"
>;

type ReportFilter =
  | "ALL"
  | PatientReportStatus;

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

const FILTERS: {
  label: string;
  value: ReportFilter;
}[] = [
  {
    label: "All",
    value: "ALL",
  },
  {
    label: "Pending",
    value: "PENDING_REVIEW",
  },
  {
    label: "Part Reviewed",
    value:
      "PARTIALLY_REVIEWED",
  },
  {
    label: "Reviewed",
    value: "REVIEWED",
  },
];

const formatStatus = (
  value: string
) => {
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
    return "Not set";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not set";
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

const formatFileSize = (
  value: number
) => {
  if (
    value <
    1024 * 1024
  ) {
    return `${(
      value / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(1)} MB`;
};

const getStatusTone = (
  status: PatientReportStatus
) => {
  if (
    status === "REVIEWED"
  ) {
    return {
      background: SUCCESS_LIGHT,
      text: SUCCESS_DARK,
      solid: SUCCESS,
    };
  }

  if (
    status ===
    "PARTIALLY_REVIEWED"
  ) {
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

export const PatientReportsScreen = ({
  navigation,
}: Props) => {
  const insets =
    useSafeAreaInsets();

  const [
    reports,
    setReports,
  ] = useState<
    PatientReport[]
  >([]);

  const [summary, setSummary] =
    useState({
      total: 0,
      pending: 0,
      partiallyReviewed: 0,
      reviewed: 0,
      unreadReviews: 0,
    });

  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<ReportFilter>(
      "ALL"
    );

  const [
    expandedReportId,
    setExpandedReportId,
  ] =
    useState<string | null>(
      null
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

  const visibleReports =
    useMemo(() => {
      if (
        selectedFilter ===
        "ALL"
      ) {
        return reports;
      }

      return reports.filter(
        (report) => {
          return (
            report.status ===
            selectedFilter
          );
        }
      );
    }, [
      reports,
      selectedFilter,
    ]);

  const loadReports =
    useCallback(
      async (
        mode:
          | "initial"
          | "refresh" = "initial"
      ) => {
        try {
          if (
            mode === "initial"
          ) {
            setIsLoading(true);
          } else {
            setIsRefreshing(
              true
            );
          }

          setErrorMessage("");

          const result =
            await patientReportsApi.listReports();

          setReports(
            result.reports || []
          );

          setSummary(
            result.summary || {
              total: 0,
              pending: 0,
              partiallyReviewed: 0,
              reviewed: 0,
              unreadReviews: 0,
            }
          );
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load medical reports."
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(
            false
          );
        }
      },
      []
    );

  useFocusEffect(
    useCallback(() => {
      void loadReports(
        "initial"
      );
    }, [loadReports])
  );

  const toggleReport =
    async (
      report: PatientReport
    ) => {
      const isOpening =
        expandedReportId !==
        report.id;

      setExpandedReportId(
        isOpening
          ? report.id
          : null
      );

      if (
        !isOpening ||
        !report.isUnread
      ) {
        return;
      }

      try {
        const updatedReport =
          await patientReportsApi.markReportSeen(
            report.id
          );

        setReports(
          (currentReports) => {
            return currentReports.map(
              (currentReport) => {
                return currentReport.id ===
                  report.id
                  ? updatedReport
                  : currentReport;
              }
            );
          }
        );

        setSummary(
          (currentSummary) => {
            return {
              ...currentSummary,
              unreadReviews:
                Math.max(
                  0,
                  currentSummary.unreadReviews -
                    report
                      .reviewSummary
                      .unread
                ),
            };
          }
        );
      } catch {
        return;
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
        <View style={styles.header}>
          <TouchableOpacity
            style={
              styles.backButton
            }
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
              styles.headerTextBlock
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Medical Reports
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Uploads and doctor reviews
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.refreshButton
            }
            activeOpacity={0.84}
            onPress={() =>
              void loadReports(
                "refresh"
              )
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
                void loadReports(
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
                  styles.summaryIconBox
                }
              >
                <FileText
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
                  Your reports
                </Text>

                <Text
                  style={
                    styles.summaryText
                  }
                >
                  Track report reviews from your assigned doctors.
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
              />

              <SummaryItem
                value={
                  summary.partiallyReviewed
                }
                label="Partial"
              />

              <SummaryItem
                value={
                  summary.reviewed
                }
                label="Reviewed"
              />

              <SummaryItem
                value={
                  summary.unreadReviews
                }
                label="New"
              />
            </View>
          </View>

          <TouchableOpacity
            style={
              styles.uploadAction
            }
            activeOpacity={0.84}
            onPress={() =>
              navigation.navigate(
                "PatientUploadReport"
              )
            }
          >
            <View
              style={
                styles.uploadActionIcon
              }
            >
              <Plus
                size={22}
                color={PRIMARY}
                strokeWidth={2.7}
              />
            </View>

            <View
              style={
                styles.uploadActionTextBlock
              }
            >
              <Text
                style={
                  styles.uploadActionTitle
                }
              >
                Upload a report
              </Text>

              <Text
                style={
                  styles.uploadActionText
                }
              >
                Add a protected sample PDF or image for doctor review.
              </Text>
            </View>
          </TouchableOpacity>

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
                    <Text
                      style={[
                        styles.filterText,
                        selected
                          ? styles.filterTextSelected
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
              <Text
                style={
                  styles.errorTitle
                }
              >
                Unable to load reports
              </Text>

              <Text
                style={
                  styles.errorText
                }
              >
                {errorMessage}
              </Text>
            </View>
          ) : null}

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
                Loading reports...
              </Text>
            </View>
          ) : visibleReports.length ===
            0 ? (
            <View
              style={
                styles.stateCard
              }
            >
              <View
                style={
                  styles.emptyIconBox
                }
              >
                <FileText
                  size={28}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              </View>

              <Text
                style={
                  styles.stateTitle
                }
              >
                No reports found
              </Text>

              <Text
                style={
                  styles.stateText
                }
              >
                Uploaded reports and doctor review notes will appear here.
              </Text>
            </View>
          ) : (
            visibleReports.map(
              (report) => {
                const expanded =
                  expandedReportId ===
                  report.id;

                return (
                  <ReportCard
                    key={
                      report.id
                    }
                    report={
                      report
                    }
                    expanded={
                      expanded
                    }
                    onToggle={() =>
                      void toggleReport(
                        report
                      )
                    }
                  />
                );
              }
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
}: {
  value: number;
  label: string;
}) => {
  return (
    <View
      style={
        styles.summaryItem
      }
    >
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

const ReportCard = ({
  report,
  expanded,
  onToggle,
}: {
  report: PatientReport;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const tone =
    getStatusTone(
      report.status
    );

  return (
    <View
      style={
        styles.reportCard
      }
    >
      <View
        style={[
          styles.reportAccent,
          {
            backgroundColor:
              tone.solid,
          },
        ]}
      />

      <View
        style={
          styles.reportTopRow
        }
      >
        <View
          style={[
            styles.reportIconBox,
            {
              backgroundColor:
                tone.background,
            },
          ]}
        >
          <FileText
            size={23}
            color={tone.text}
            strokeWidth={2.6}
          />
        </View>

        <View
          style={
            styles.reportTextBlock
          }
        >
          <View
            style={
              styles.reportTitleRow
            }
          >
            <Text
              style={
                styles.reportTitle
              }
              numberOfLines={1}
            >
              {report.title}
            </Text>

            {report.isUnread ? (
              <View
                style={
                  styles.newBadge
                }
              >
                <Text
                  style={
                    styles.newBadgeText
                  }
                >
                  NEW
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={
              styles.reportCategory
            }
          >
            {formatStatus(
              report.category
            )}
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
          <Text
            style={[
              styles.statusText,
              {
                color: tone.text,
              },
            ]}
          >
            {formatStatus(
              report.status
            )}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.reportMetaPanel
        }
      >
        <Text
          style={
            styles.reportMetaText
          }
        >
          Report date:{" "}
          {formatDate(
            report.reportDate
          )}
        </Text>

        <Text
          style={
            styles.reportMetaText
          }
        >
          {formatFileSize(
            report.fileSize
          )}{" "}
          ·{" "}
          {
            report.originalFileName
          }
        </Text>
      </View>

      <View
        style={
          styles.reviewSummaryRow
        }
      >
        <Stethoscope
          size={17}
          color={PRIMARY}
          strokeWidth={2.5}
        />

        <Text
          style={
            styles.reviewSummaryText
          }
        >
          {
            report.reviewSummary
              .reviewed
          }{" "}
          reviewed ·{" "}
          {
            report.reviewSummary
              .pending
          }{" "}
          pending
        </Text>

        <TouchableOpacity
          style={
            styles.expandButton
          }
          activeOpacity={0.84}
          onPress={onToggle}
        >
          {expanded ? (
            <ChevronUp
              size={19}
              color={PRIMARY}
              strokeWidth={2.6}
            />
          ) : (
            <ChevronDown
              size={19}
              color={PRIMARY}
              strokeWidth={2.6}
            />
          )}
        </TouchableOpacity>
      </View>

      {expanded ? (
        <View
          style={
            styles.expandedPanel
          }
        >
          {report.description ? (
            <>
              <Text
                style={
                  styles.detailLabel
                }
              >
                Description
              </Text>

              <Text
                style={
                  styles.detailText
                }
              >
                {
                  report.description
                }
              </Text>
            </>
          ) : null}

          <View
            style={
              styles.securityRow
            }
          >
            <ShieldCheck
              size={17}
              color={SUCCESS_DARK}
              strokeWidth={2.5}
            />

            <Text
              style={
                styles.securityRowText
              }
            >
              Protected file checks completed
            </Text>
          </View>

          {report.reviews.map(
            (review) => (
              <View
                key={review.id}
                style={
                  styles.reviewCard
                }
              >
                <View
                  style={
                    styles.reviewHeader
                  }
                >
                  <Stethoscope
                    size={18}
                    color={PRIMARY}
                    strokeWidth={2.5}
                  />

                  <View
                    style={
                      styles.reviewDoctorBlock
                    }
                  >
                    <Text
                      style={
                        styles.reviewDoctorName
                      }
                    >
                      {
                        review.doctor
                          .fullName
                      }
                    </Text>

                    <Text
                      style={
                        styles.reviewDoctorMeta
                      }
                    >
                      {review.doctor
                        .specialization ||
                        "Assigned doctor"}
                    </Text>
                  </View>

                  {review.status ===
                  "REVIEWED" ? (
                    <CheckCircle2
                      size={19}
                      color={SUCCESS}
                      strokeWidth={2.6}
                    />
                  ) : (
                    <Clock3
                      size={19}
                      color={WARNING}
                      strokeWidth={2.6}
                    />
                  )}
                </View>

                {review.reviewNote ? (
                  <Text
                    style={
                      styles.reviewNote
                    }
                  >
                    {
                      review.reviewNote
                    }
                  </Text>
                ) : (
                  <Text
                    style={
                      styles.pendingReviewText
                    }
                  >
                    Waiting for this doctor to review the report.
                  </Text>
                )}

                {review.reviewedAt ? (
                  <Text
                    style={
                      styles.reviewDate
                    }
                  >
                    Reviewed{" "}
                    {formatDate(
                      review.reviewedAt
                    )}
                  </Text>
                ) : null}
              </View>
            )
          )}
        </View>
      ) : null}
    </View>
  );
};

export default PatientReportsScreen;

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
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "700",
  },
  headerSubtitle: {
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
    ...elevate(2),
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryIconBox: {
    width: 54,
    height: 54,
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
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 13,
    flexDirection: "row",
    marginTop: 15,
    paddingVertical: 11,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
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
  uploadAction: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    ...elevate(1),
  },
  uploadActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  uploadActionTextBlock: {
    flex: 1,
  },
  uploadActionTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },
  uploadActionText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 3,
  },
  filtersRow: {
    paddingTop: 15,
    paddingBottom: 14,
    paddingRight: 12,
  },
  filterChip: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C7CCDA",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: PRIMARY_LIGHT,
  },
  filterText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
  },
  filterTextSelected: {
    color: PRIMARY_DARK,
    fontWeight: "700",
  },
  errorCard: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  errorTitle: {
    color: WARNING_DARK,
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    color: WARNING_DARK,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 4,
  },
  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    ...elevate(1),
  },
  emptyIconBox: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },
  stateText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5,
  },
  reportCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    paddingLeft: 18,
    overflow: "hidden",
    marginBottom: 12,
    ...elevate(1),
  },
  reportAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  reportTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reportIconBox: {
    width: 47,
    height: 47,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  reportTextBlock: {
    flex: 1,
  },
  reportTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reportTitle: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },
  reportCategory: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  newBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 6,
  },
  newBadgeText: {
    color: SURFACE,
    fontSize: 8,
    fontWeight: "700",
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
  },
  reportMetaPanel: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  reportMetaText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 16,
  },
  reviewSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  reviewSummaryText: {
    flex: 1,
    color: TEXT,
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 7,
  },
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  expandedPanel: {
    marginTop: 12,
  },
  detailLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },
  detailText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },
  securityRow: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 11,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  securityRowText: {
    color: SUCCESS_DARK,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 7,
  },
  reviewCard: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    padding: 11,
    marginTop: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewDoctorBlock: {
    flex: 1,
    marginLeft: 8,
  },
  reviewDoctorName: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },
  reviewDoctorMeta: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  reviewNote: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 9,
  },
  pendingReviewText: {
    color: WARNING_DARK,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 9,
  },
  reviewDate: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 7,
  },
});