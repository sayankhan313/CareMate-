import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  Pill,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UserRound,
  Video,
  X,
  XCircle,
} from "lucide-react-native";

import {
  adminApi,
  type AdminAuditActorRole,
  type AdminAuditLog,
  type AdminAuditOutcome,
  type AdminAuditPagination,
} from "../../services/adminApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "AdminAuditLogs"
>;

type DateRange =
  | "ALL"
  | "TODAY"
  | "7_DAYS"
  | "30_DAYS";

const BACKGROUND = "#F3F1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#1D1B2F";
const MUTED = "#6D687B";
const SOFT = "#F8F6FC";

const ADMIN = "#6750D8";
const ADMIN_DARK = "#4E3BB2";
const ADMIN_CONTAINER = "#EADDFF";
const ON_ADMIN_CONTAINER = "#21005D";

const SUCCESS_CONTAINER = "#DBF3E7";
const SUCCESS_TEXT = "#0F5C3C";

const DANGER_CONTAINER = "#FBDADC";
const DANGER_TEXT = "#8C1D24";

const WARNING_CONTAINER = "#FBE7CD";
const WARNING_TEXT = "#7A4708";

const DOCTOR_CONTAINER = "#E7E8FF";
const DOCTOR_TEXT = "#3539A5";

const PATIENT_CONTAINER = "#E0ECFF";
const PATIENT_TEXT = "#215AA8";

const PHARMACY_CONTAINER = "#DFF5EE";
const PHARMACY_TEXT = "#08624F";

const SYSTEM_CONTAINER = "#E8E9EF";
const SYSTEM_TEXT = "#454755";

const ROLE_OPTIONS: {
  label: string;
  value?: AdminAuditActorRole;
}[] = [
  {
    label: "All",
  },
  {
    label: "Patient",
    value: "PATIENT",
  },
  {
    label: "Doctor",
    value: "DOCTOR",
  },
  {
    label: "Caregiver",
    value: "CAREGIVER",
  },
  {
    label: "Pharmacy",
    value: "PHARMACY",
  },
  {
    label: "Admin",
    value: "ADMIN",
  },
  {
    label: "System",
    value: "SYSTEM",
  },
];

const OUTCOME_OPTIONS: {
  label: string;
  value?: AdminAuditOutcome;
}[] = [
  {
    label: "All",
  },
  {
    label: "Success",
    value: "SUCCESS",
  },
  {
    label: "Failure",
    value: "FAILURE",
  },
];

const DATE_OPTIONS: {
  label: string;
  value: DateRange;
}[] = [
  {
    label: "All time",
    value: "ALL",
  },
  {
    label: "Today",
    value: "TODAY",
  },
  {
    label: "7 days",
    value: "7_DAYS",
  },
  {
    label: "30 days",
    value: "30_DAYS",
  },
];

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: "#1B1D2A",
  shadowOpacity:
    Platform.OS === "android"
      ? 0
      : 0.08 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: {
    width: 0,
    height: level * 0.8,
  },
});

const getErrorMessage = (
  error: unknown
) => {
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
};

const formatAction = (
  value: string
) => {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
};

const formatDateTime = (
  value: string
) => {
  const parsedDate = new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "Unknown time";
  }

  return parsedDate.toLocaleString(
    [],
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

const getFromDate = (
  range: DateRange
) => {
  if (range === "ALL") {
    return undefined;
  }

  const date = new Date();

  if (range === "TODAY") {
    date.setHours(0, 0, 0, 0);
  }

  if (range === "7_DAYS") {
    date.setDate(
      date.getDate() - 6
    );
    date.setHours(0, 0, 0, 0);
  }

  if (range === "30_DAYS") {
    date.setDate(
      date.getDate() - 29
    );
    date.setHours(0, 0, 0, 0);
  }

  return date.toISOString();
};

const getRoleTone = (
  role: AdminAuditActorRole
) => {
  switch (role) {
    case "DOCTOR":
      return {
        backgroundColor:
          DOCTOR_CONTAINER,
        textColor: DOCTOR_TEXT,
      };

    case "PATIENT":
      return {
        backgroundColor:
          PATIENT_CONTAINER,
        textColor: PATIENT_TEXT,
      };

    case "PHARMACY":
      return {
        backgroundColor:
          PHARMACY_CONTAINER,
        textColor: PHARMACY_TEXT,
      };

    case "ADMIN":
      return {
        backgroundColor:
          ADMIN_CONTAINER,
        textColor: ADMIN_DARK,
      };

    case "SYSTEM":
      return {
        backgroundColor:
          SYSTEM_CONTAINER,
        textColor: SYSTEM_TEXT,
      };

    case "CAREGIVER":
      return {
        backgroundColor:
          WARNING_CONTAINER,
        textColor: WARNING_TEXT,
      };

    default:
      return {
        backgroundColor: SOFT,
        textColor: MUTED,
      };
  }
};

const getActionTone = (
  action: string
) => {
  if (
    action.includes(
      "SAFETY_ALERT"
    )
  ) {
    return {
      backgroundColor:
        DANGER_CONTAINER,
      color: DANGER_TEXT,
    };
  }

  if (
    action.includes(
      "CONSULTATION"
    )
  ) {
    return {
      backgroundColor:
        DOCTOR_CONTAINER,
      color: DOCTOR_TEXT,
    };
  }

  if (
    action.includes(
      "PRESCRIPTION"
    ) ||
    action.includes(
      "MEDICINE"
    )
  ) {
    return {
      backgroundColor:
        PHARMACY_CONTAINER,
      color: PHARMACY_TEXT,
    };
  }

  if (
    action.includes("REPORT")
  ) {
    return {
      backgroundColor:
        PATIENT_CONTAINER,
      color: PATIENT_TEXT,
    };
  }

  if (
    action.includes(
      "ACCOUNT"
    ) ||
    action.includes(
      "VERIFICATION"
    )
  ) {
    return {
      backgroundColor:
        ADMIN_CONTAINER,
      color: ADMIN_DARK,
    };
  }

  return {
    backgroundColor:
      SYSTEM_CONTAINER,
    color: SYSTEM_TEXT,
  };
};

const renderActionIcon = (
  action: string,
  color: string
) => {
  if (
    action.includes(
      "SAFETY_ALERT"
    )
  ) {
    return (
      <ShieldAlert
        size={21}
        color={color}
        strokeWidth={2.5}
      />
    );
  }

  if (
    action.includes(
      "CONSULTATION"
    )
  ) {
    return (
      <Video
        size={21}
        color={color}
        strokeWidth={2.5}
      />
    );
  }

  if (
    action.includes(
      "PRESCRIPTION"
    )
  ) {
    return (
      <Pill
        size={21}
        color={color}
        strokeWidth={2.5}
      />
    );
  }

  if (
    action.includes(
      "MEDICINE"
    )
  ) {
    return (
      <Stethoscope
        size={21}
        color={color}
        strokeWidth={2.5}
      />
    );
  }

  if (
    action.includes("REPORT")
  ) {
    return (
      <FileCheck2
        size={21}
        color={color}
        strokeWidth={2.5}
      />
    );
  }

  if (
    action.includes(
      "PHARMACY"
    )
  ) {
    return (
      <Building2
        size={21}
        color={color}
        strokeWidth={2.5}
      />
    );
  }

  if (
    action.includes(
      "ACCOUNT"
    ) ||
    action.includes(
      "VERIFICATION"
    )
  ) {
    return (
      <UserCheck
        size={21}
        color={color}
        strokeWidth={2.5}
      />
    );
  }

  return (
    <ShieldCheck
      size={21}
      color={color}
      strokeWidth={2.5}
    />
  );
};

const mergeUniqueLogs = (
  currentLogs: AdminAuditLog[],
  incomingLogs: AdminAuditLog[]
) => {
  const logMap = new Map<
    string,
    AdminAuditLog
  >();

  [
    ...currentLogs,
    ...incomingLogs,
  ].forEach((log) => {
    logMap.set(log.id, log);
  });

  return Array.from(
    logMap.values()
  );
};

export const AdminAuditLogsScreen = ({
  navigation,
}: Props) => {
  const insets =
    useSafeAreaInsets();

  const [logs, setLogs] =
    useState<AdminAuditLog[]>([]);

  const [
    pagination,
    setPagination,
  ] =
    useState<AdminAuditPagination | null>(
      null
    );

  const [role, setRole] =
    useState<
      AdminAuditActorRole | undefined
    >();

  const [outcome, setOutcome] =
    useState<
      AdminAuditOutcome | undefined
    >();

  const [
    dateRange,
    setDateRange,
  ] =
    useState<DateRange>("ALL");

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    appliedSearch,
    setAppliedSearch,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    isLoadingMore,
    setIsLoadingMore,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadedSuccessCount =
    useMemo(() => {
      return logs.filter(
        (log) =>
          log.outcome ===
          "SUCCESS"
      ).length;
    }, [logs]);

  const loadedFailureCount =
    logs.length -
    loadedSuccessCount;

  const activeFilterCount =
    [
      Boolean(role),
      Boolean(outcome),
      dateRange !== "ALL",
      Boolean(appliedSearch),
    ].filter(Boolean).length;

  const loadLogs = useCallback(
    async (
      targetPage = 1,
      mode:
        | "initial"
        | "refresh"
        | "more" = "initial"
    ) => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        }

        if (mode === "refresh") {
          setIsRefreshing(true);
        }

        if (mode === "more") {
          setIsLoadingMore(true);
        }

        setErrorMessage("");

        const result =
          await adminApi.listAuditLogs(
            {
              actorRole: role,
              outcome,
              fromDate:
                getFromDate(
                  dateRange
                ),
              search:
                appliedSearch ||
                undefined,
              page: targetPage,
              limit: 20,
            }
          );

        setLogs(
          (currentLogs) => {
            if (
              mode !== "more"
            ) {
              return result.items;
            }

            return mergeUniqueLogs(
              currentLogs,
              result.items
            );
          }
        );

        setPagination(
          result.pagination
        );
      } catch (error) {
        setErrorMessage(
          getErrorMessage(error)
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [
      appliedSearch,
      dateRange,
      outcome,
      role,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      loadLogs(1, "initial");
    }, [loadLogs])
  );

  const applySearch = () => {
    setAppliedSearch(
      searchText.trim()
    );
  };

  const clearSearch = () => {
    setSearchText("");
    setAppliedSearch("");
  };

  const clearAllFilters = () => {
    setRole(undefined);
    setOutcome(undefined);
    setDateRange("ALL");
    setSearchText("");
    setAppliedSearch("");
  };

  const loadMore = () => {
    if (
      isLoading ||
      isRefreshing ||
      isLoadingMore ||
      !pagination?.hasNextPage
    ) {
      return;
    }

    loadLogs(
      pagination.page + 1,
      "more"
    );
  };

  const renderRoleChip = ({
    label,
    value,
  }: {
    label: string;
    value?: AdminAuditActorRole;
  }) => {
    const selected =
      role === value;

    return (
      <TouchableOpacity
        key={`role-${label}`}
        style={[
          styles.filterChip,
          selected &&
            styles.selectedFilterChip,
        ]}
        activeOpacity={0.84}
        onPress={() =>
          setRole(value)
        }
      >
        <Text
          style={[
            styles.filterChipText,
            selected &&
              styles.selectedFilterChipText,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderOutcomeChip = ({
    label,
    value,
  }: {
    label: string;
    value?: AdminAuditOutcome;
  }) => {
    const selected =
      outcome === value;

    return (
      <TouchableOpacity
        key={`outcome-${label}`}
        style={[
          styles.filterChip,
          selected &&
            styles.selectedFilterChip,
        ]}
        activeOpacity={0.84}
        onPress={() =>
          setOutcome(value)
        }
      >
        <Text
          style={[
            styles.filterChipText,
            selected &&
              styles.selectedFilterChipText,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDateChip = ({
    label,
    value,
  }: {
    label: string;
    value: DateRange;
  }) => {
    const selected =
      dateRange === value;

    return (
      <TouchableOpacity
        key={`date-${value}`}
        style={[
          styles.filterChip,
          selected &&
            styles.selectedFilterChip,
        ]}
        activeOpacity={0.84}
        onPress={() =>
          setDateRange(value)
        }
      >
        <Text
          style={[
            styles.filterChipText,
            selected &&
              styles.selectedFilterChipText,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderLog = ({
    item,
  }: {
    item: AdminAuditLog;
  }) => {
    const isSuccess =
      item.outcome === "SUCCESS";

    const actorName =
      item.actor?.fullName ||
      (item.actorRole ===
      "SYSTEM"
        ? "CareMate+ System"
        : "Unknown actor");

    const roleTone =
      getRoleTone(
        item.actorRole
      );

    const actionTone =
      getActionTone(
        item.action
      );

    return (
      <TouchableOpacity
        style={styles.logCard}
        activeOpacity={0.86}
        onPress={() =>
          navigation.navigate(
            "AdminAuditLogDetail",
            {
              auditLogId:
                item.id,
            }
          )
        }
      >
        <View
          style={[
            styles.logAccent,
            {
              backgroundColor:
                isSuccess
                  ? SUCCESS_TEXT
                  : DANGER_TEXT,
            },
          ]}
        />

        <View
          style={[
            styles.actionIcon,
            {
              backgroundColor:
                actionTone.backgroundColor,
            },
          ]}
        >
          {renderActionIcon(
            item.action,
            actionTone.color
          )}
        </View>

        <View
          style={styles.logContent}
        >
          <View
            style={
              styles.logTopRow
            }
          >
            <Text
              style={styles.logTitle}
              numberOfLines={2}
            >
              {formatAction(
                item.action
              )}
            </Text>

            <View
              style={[
                styles.outcomeBadge,
                {
                  backgroundColor:
                    isSuccess
                      ? SUCCESS_CONTAINER
                      : DANGER_CONTAINER,
                },
              ]}
            >
              {isSuccess ? (
                <CheckCircle2
                  size={11}
                  color={
                    SUCCESS_TEXT
                  }
                  strokeWidth={2.7}
                />
              ) : (
                <XCircle
                  size={11}
                  color={
                    DANGER_TEXT
                  }
                  strokeWidth={2.7}
                />
              )}

              <Text
                style={[
                  styles.outcomeBadgeText,
                  {
                    color:
                      isSuccess
                        ? SUCCESS_TEXT
                        : DANGER_TEXT,
                  },
                ]}
              >
                {isSuccess
                  ? "Success"
                  : "Failure"}
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.logDescription
            }
            numberOfLines={2}
          >
            {item.description}
          </Text>

          <View
            style={
              styles.logMetaTopRow
            }
          >
            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor:
                    roleTone.backgroundColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  {
                    color:
                      roleTone.textColor,
                  },
                ]}
              >
                {item.actorRole}
              </Text>
            </View>

            <Text
              style={
                styles.entityText
              }
              numberOfLines={1}
            >
              {formatAction(
                item.entityType
              )}
            </Text>
          </View>

          <View
            style={styles.metaRow}
          >
            <UserRound
              size={13}
              color={MUTED}
              strokeWidth={2.3}
            />

            <Text
              style={styles.metaText}
              numberOfLines={1}
            >
              {actorName}
            </Text>
          </View>

          <View
            style={styles.metaRow}
          >
            <Clock3
              size={13}
              color={MUTED}
              strokeWidth={2.3}
            />

            <Text
              style={styles.metaText}
            >
              {formatDateTime(
                item.createdAt
              )}
            </Text>
          </View>
        </View>

        <View
          style={styles.chevronBox}
        >
          <ChevronRight
            size={18}
            color={ADMIN}
            strokeWidth={2.5}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const header = (
    <View>
      <View
        style={styles.heroCard}
      >
        <View
          style={styles.heroTopRow}
        >
          <View
            style={styles.heroIcon}
          >
            <ShieldCheck
              size={27}
              color="#FFFFFF"
              strokeWidth={2.5}
            />
          </View>

          <View
            style={
              styles.totalBadge
            }
          >
            <Text
              style={
                styles.totalBadgeValue
              }
            >
              {pagination?.total ||
                0}
            </Text>

            <Text
              style={
                styles.totalBadgeLabel
              }
            >
              Total records
            </Text>
          </View>
        </View>

        <Text
          style={styles.heroTitle}
        >
          Security activity centre
        </Text>

        <Text
          style={styles.heroText}
        >
          Track important clinical,
          account and verification
          changes across CareMate+.
        </Text>

        <View
          style={styles.summaryRow}
        >
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
              {logs.length}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Loaded
            </Text>
          </View>

          <View
            style={
              styles.summaryDivider
            }
          />

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
              {loadedSuccessCount}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Success
            </Text>
          </View>

          <View
            style={
              styles.summaryDivider
            }
          />

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
              {loadedFailureCount}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Failure
            </Text>
          </View>
        </View>
      </View>

      <View
        style={styles.filterCard}
      >
        <View
          style={
            styles.filterCardHeader
          }
        >
          <View>
            <Text
              style={
                styles.filterCardTitle
              }
            >
              Find activity
            </Text>

            <Text
              style={
                styles.filterCardSubtitle
              }
            >
              Search and narrow the
              audit trail.
            </Text>
          </View>

          {activeFilterCount >
          0 ? (
            <TouchableOpacity
              style={
                styles.clearAllButton
              }
              activeOpacity={0.82}
              onPress={
                clearAllFilters
              }
            >
              <X
                size={14}
                color={ADMIN}
                strokeWidth={2.5}
              />

              <Text
                style={
                  styles.clearAllText
                }
              >
                Clear all
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View
          style={styles.searchRow}
        >
          <View
            style={styles.searchBox}
          >
            <Search
              size={18}
              color={MUTED}
              strokeWidth={2.4}
            />

            <TextInput
              style={
                styles.searchInput
              }
              value={searchText}
              onChangeText={
                setSearchText
              }
              placeholder="Search action, actor or description"
              placeholderTextColor="#9691A2"
              returnKeyType="search"
              onSubmitEditing={
                applySearch
              }
            />

            {searchText ? (
              <TouchableOpacity
                style={
                  styles.clearSearchButton
                }
                onPress={
                  clearSearch
                }
                activeOpacity={0.8}
              >
                <X
                  size={17}
                  color={MUTED}
                  strokeWidth={2.4}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={
              styles.searchButton
            }
            activeOpacity={0.84}
            onPress={applySearch}
          >
            <Search
              size={18}
              color="#FFFFFF"
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        </View>

        <View
          style={
            styles.filterHeadingRow
          }
        >
          <UserRound
            size={16}
            color={ADMIN}
            strokeWidth={2.4}
          />

          <Text
            style={
              styles.filterHeading
            }
          >
            Actor role
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterScroll
          }
        >
          {ROLE_OPTIONS.map(
            renderRoleChip
          )}
        </ScrollView>

        <View
          style={
            styles.filterHeadingRow
          }
        >
          <AlertCircle
            size={16}
            color={ADMIN}
            strokeWidth={2.4}
          />

          <Text
            style={
              styles.filterHeading
            }
          >
            Outcome
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterScroll
          }
        >
          {OUTCOME_OPTIONS.map(
            renderOutcomeChip
          )}
        </ScrollView>

        <View
          style={
            styles.filterHeadingRow
          }
        >
          <CalendarDays
            size={16}
            color={ADMIN}
            strokeWidth={2.4}
          />

          <Text
            style={
              styles.filterHeading
            }
          >
            Date range
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.lastFilterScroll
          }
        >
          {DATE_OPTIONS.map(
            renderDateChip
          )}
        </ScrollView>
      </View>

      <View
        style={styles.resultsHeader}
      >
        <View>
          <Text
            style={styles.resultsTitle}
          >
            Activity records
          </Text>

          <Text
            style={styles.resultsHint}
          >
            Newest activity appears
            first
          </Text>
        </View>

        <View
          style={
            styles.resultsCountBadge
          }
        >
          <Text
            style={
              styles.resultsCountText
            }
          >
            {pagination?.total || 0}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <StatusBar
        backgroundColor={BACKGROUND}
        barStyle="dark-content"
      />

      <View
        style={styles.topBar}
      >
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.82}
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
          style={styles.headerText}
        >
          <Text
            style={styles.kicker}
          >
            Admin security
          </Text>

          <Text style={styles.title}>
            Audit logs
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.refreshButton
          }
          activeOpacity={0.82}
          onPress={() =>
            loadLogs(1, "refresh")
          }
        >
          <RefreshCw
            size={19}
            color={ADMIN}
            strokeWidth={2.4}
          />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View
          style={
            styles.centredState
          }
        >
          <View
            style={
              styles.loadingIconBox
            }
          >
            <ActivityIndicator
              size="large"
              color={ADMIN}
            />
          </View>

          <Text
            style={styles.stateTitle}
          >
            Loading audit activity
          </Text>

          <Text
            style={styles.stateText}
          >
            Preparing the latest
            security records.
          </Text>
        </View>
      ) : errorMessage &&
        logs.length === 0 ? (
        <View
          style={
            styles.centredState
          }
        >
          <View
            style={styles.errorIcon}
          >
            <AlertCircle
              size={28}
              color={DANGER_TEXT}
              strokeWidth={2.5}
            />
          </View>

          <Text
            style={styles.stateTitle}
          >
            Unable to load audit logs
          </Text>

          <Text
            style={styles.stateText}
          >
            {errorMessage}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.84}
            onPress={() =>
              loadLogs(
                1,
                "initial"
              )
            }
          >
            <RefreshCw
              size={17}
              color="#FFFFFF"
              strokeWidth={2.5}
            />

            <Text
              style={styles.retryText}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) =>
            item.id
          }
          renderItem={renderLog}
          ListHeaderComponent={
            header
          }
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom:
                Math.max(
                  insets.bottom +
                    30,
                  48
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
                loadLogs(
                  1,
                  "refresh"
                )
              }
              tintColor={ADMIN}
              colors={[ADMIN]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={
            0.35
          }
          ListEmptyComponent={
            <View
              style={
                styles.emptyCard
              }
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <ShieldCheck
                  size={28}
                  color={
                    WARNING_TEXT
                  }
                  strokeWidth={2.5}
                />
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No audit records found
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Change the filters or
                perform a new monitored
                action.
              </Text>

              {activeFilterCount >
              0 ? (
                <TouchableOpacity
                  style={
                    styles.emptyClearButton
                  }
                  activeOpacity={0.84}
                  onPress={
                    clearAllFilters
                  }
                >
                  <Text
                    style={
                      styles.emptyClearText
                    }
                  >
                    Clear filters
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View
                style={
                  styles.loadingMore
                }
              >
                <ActivityIndicator
                  color={ADMIN}
                />

                <Text
                  style={
                    styles.loadingMoreText
                  }
                >
                  Loading more...
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 14,
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
      ...elevate(2),
    },
    headerText: {
      flex: 1,
      marginHorizontal: 12,
    },
    kicker: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 2,
    },
    title: {
      color: TEXT,
      fontSize: 21,
      fontWeight: "700",
    },
    refreshButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        ADMIN_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
    },
    listContent: {
      paddingHorizontal: 18,
    },
    heroCard: {
      backgroundColor: ADMIN,
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      overflow: "hidden",
      ...elevate(3),
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 16,
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 15,
      backgroundColor:
        "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent:
        "center",
    },
    totalBadge: {
      backgroundColor:
        "rgba(255,255,255,0.18)",
      borderRadius: 13,
      paddingHorizontal: 13,
      paddingVertical: 9,
      alignItems: "flex-end",
    },
    totalBadgeValue: {
      color: "#FFFFFF",
      fontSize: 19,
      fontWeight: "700",
    },
    totalBadgeLabel: {
      color: "#EDE9FE",
      fontSize: 10,
      fontWeight: "600",
      marginTop: 1,
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: 21,
      fontWeight: "700",
      marginBottom: 6,
    },
    heroText: {
      color: "#EDE9FE",
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 19,
      marginBottom: 16,
    },
    summaryRow: {
      backgroundColor:
        "rgba(255,255,255,0.15)",
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 11,
    },
    summaryItem: {
      flex: 1,
      alignItems: "center",
    },
    summaryValue: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 2,
    },
    summaryLabel: {
      color: "#EDE9FE",
      fontSize: 10,
      fontWeight: "600",
    },
    summaryDivider: {
      width:
        StyleSheet.hairlineWidth,
      height: 28,
      backgroundColor:
        "rgba(255,255,255,0.25)",
    },
    filterCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 18,
      padding: 15,
      marginBottom: 18,
      ...elevate(2),
    },
    filterCardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent:
        "space-between",
      marginBottom: 14,
    },
    filterCardTitle: {
      color: TEXT,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 3,
    },
    filterCardSubtitle: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "500",
    },
    clearAllButton: {
      backgroundColor:
        ADMIN_CONTAINER,
      borderRadius: 9,
      paddingHorizontal: 9,
      paddingVertical: 7,
      flexDirection: "row",
      alignItems: "center",
    },
    clearAllText: {
      color: ADMIN,
      fontSize: 10,
      fontWeight: "700",
      marginLeft: 4,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 15,
    },
    searchBox: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor: SOFT,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 13,
    },
    searchInput: {
      flex: 1,
      color: TEXT,
      fontSize: 13,
      fontWeight: "500",
      marginLeft: 9,
      paddingVertical: 0,
    },
    clearSearchButton: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent:
        "center",
    },
    searchButton: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: ADMIN,
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 9,
    },
    filterHeadingRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    filterHeading: {
      color: TEXT,
      fontSize: 12,
      fontWeight: "700",
      marginLeft: 7,
    },
    filterScroll: {
      paddingBottom: 14,
    },
    lastFilterScroll: {
      paddingBottom: 2,
    },
    filterChip: {
      backgroundColor: SOFT,
      borderRadius: 9,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 8,
    },
    selectedFilterChip: {
      backgroundColor:
        ADMIN_CONTAINER,
    },
    filterChipText: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "600",
    },
    selectedFilterChipText: {
      color: ADMIN,
      fontWeight: "700",
    },
    resultsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 11,
    },
    resultsTitle: {
      color: TEXT,
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 3,
    },
    resultsHint: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "500",
    },
    resultsCountBadge: {
      minWidth: 40,
      height: 32,
      borderRadius: 10,
      backgroundColor:
        ADMIN_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 9,
    },
    resultsCountText: {
      color: ADMIN,
      fontSize: 13,
      fontWeight: "700",
    },
    logCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 17,
      padding: 14,
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 11,
      overflow: "hidden",
      ...elevate(2),
    },
    logAccent: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    },
    actionIcon: {
      width: 44,
      height: 44,
      borderRadius: 13,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
      marginLeft: 2,
    },
    logContent: {
      flex: 1,
    },
    logTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 5,
    },
    logTitle: {
      flex: 1,
      color: TEXT,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 19,
      marginRight: 8,
    },
    outcomeBadge: {
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 4,
      flexDirection: "row",
      alignItems: "center",
    },
    outcomeBadgeText: {
      fontSize: 9,
      fontWeight: "700",
      marginLeft: 3,
    },
    logDescription: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "500",
      lineHeight: 17,
      marginBottom: 8,
    },
    logMetaTopRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 5,
    },
    roleBadge: {
      borderRadius: 7,
      paddingHorizontal: 7,
      paddingVertical: 4,
      marginRight: 7,
    },
    roleBadgeText: {
      fontSize: 9,
      fontWeight: "700",
    },
    entityText: {
      flex: 1,
      color: MUTED,
      fontSize: 10,
      fontWeight: "600",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 3,
    },
    metaText: {
      flex: 1,
      color: MUTED,
      fontSize: 10,
      fontWeight: "600",
      marginLeft: 6,
    },
    chevronBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor:
        ADMIN_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 9,
      marginTop: 6,
    },
    centredState: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 28,
    },
    loadingIconBox: {
      width: 68,
      height: 68,
      borderRadius: 20,
      backgroundColor:
        ADMIN_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 15,
    },
    errorIcon: {
      width: 60,
      height: 60,
      borderRadius: 18,
      backgroundColor:
        DANGER_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 14,
    },
    stateTitle: {
      color: TEXT,
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 6,
    },
    stateText: {
      color: MUTED,
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 19,
      textAlign: "center",
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: ADMIN,
      borderRadius: 12,
      paddingHorizontal: 15,
      paddingVertical: 11,
      marginTop: 16,
    },
    retryText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
      marginLeft: 7,
    },
    emptyCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 17,
      alignItems: "center",
      padding: 24,
      ...elevate(2),
    },
    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 17,
      backgroundColor:
        WARNING_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 13,
    },
    emptyTitle: {
      color: TEXT,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 6,
    },
    emptyText: {
      color: MUTED,
      fontSize: 13,
      fontWeight: "500",
      textAlign: "center",
      lineHeight: 19,
    },
    emptyClearButton: {
      backgroundColor:
        ADMIN_CONTAINER,
      borderRadius: 10,
      paddingHorizontal: 13,
      paddingVertical: 9,
      marginTop: 13,
    },
    emptyClearText: {
      color: ADMIN,
      fontSize: 12,
      fontWeight: "700",
    },
    loadingMore: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      paddingVertical: 18,
    },
    loadingMoreText: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "600",
      marginLeft: 8,
    },
  });