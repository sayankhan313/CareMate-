import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  AlertTriangle,
  ChevronRight,
  HeartPulse,
  Mail,
  Phone,
  Pill,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound,
} from "lucide-react-native";

import {
  doctorPatientsApi,
  type DoctorAssignedPatient,
  type DoctorVitalReading,
} from "../../services/doctor/doctorPatientsApi";
import type { DoctorTabParamList } from "../../types/navigation";

type DoctorPatientsScreenProps = BottomTabScreenProps<
  DoctorTabParamList,
  "Patients"
>;

type PatientFilter = "ALL" | "ALERTS" | "CRITICAL" | "WARNING" | "STABLE";

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";

const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_SECONDARY = "#14B8A6";
const DOCTOR_DARK = "#134E4A";
const DOCTOR_LIGHT = "#E6FFFA";

const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#F6A545";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const elevate = (level: 1 | 2 | 3 = 2) => {
  const elevation = level === 1 ? 2 : level === 2 ? 4 : 7;

  return {
    elevation,
    shadowColor: "#172033",
    shadowOffset: {
      width: 0,
      height: level === 1 ? 2 : 4,
    },
    shadowOpacity: level === 1 ? 0.06 : 0.1,
    shadowRadius: level === 1 ? 4 : 9,
  };
};

const getInitials = (name?: string | null) => {
  if (!name) {
    return "P";
  }

  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) {
    return "P";
  }

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "No recent update";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Updated recently";
  }

  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  const timeText = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) {
    return `Today · ${timeText}`;
  }

  const dateText = date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });

  return `${dateText} · ${timeText}`;
};

const formatPatientMeta = (patient: DoctorAssignedPatient) => {
  const gender = patient.patient.gender || "Gender not set";
  const dateOfBirth = patient.patient.dateOfBirth || "DOB not set";

  return `${gender} • ${dateOfBirth}`;
};

const getVitalTone = (status?: string | null) => {
  if (status === "CRITICAL") {
    return {
      background: DANGER_LIGHT,
      text: "#B42318",
      label: "Critical",
      iconColor: DANGER,
      accent: DANGER,
    };
  }

  if (status === "WARNING") {
    return {
      background: WARNING_LIGHT,
      text: "#A85A13",
      label: "Warning",
      iconColor: WARNING,
      accent: WARNING,
    };
  }

  if (status === "STABLE") {
    return {
      background: SUCCESS_LIGHT,
      text: "#167A58",
      label: "Stable",
      iconColor: SUCCESS,
      accent: SUCCESS,
    };
  }

  return {
    background: DOCTOR_LIGHT,
    text: DOCTOR_DARK,
    label: "No vitals",
    iconColor: DOCTOR_PRIMARY,
    accent: DOCTOR_PRIMARY,
  };
};

const getPrimaryVital = (vital: DoctorVitalReading | null) => {
  if (!vital) {
    return {
      label: "No recent vitals",
      value: "--",
      unit: "",
    };
  }

  if (vital.spo2 !== null && vital.spo2 !== undefined) {
    return {
      label: "SpO2",
      value: `${vital.spo2}`,
      unit: "%",
    };
  }

  if (vital.heartRate !== null && vital.heartRate !== undefined) {
    return {
      label: "Heart rate",
      value: `${vital.heartRate}`,
      unit: "bpm",
    };
  }

  if (
    vital.bpSystolic !== null &&
    vital.bpSystolic !== undefined &&
    vital.bpDiastolic !== null &&
    vital.bpDiastolic !== undefined
  ) {
    return {
      label: "Blood pressure",
      value: `${vital.bpSystolic}/${vital.bpDiastolic}`,
      unit: "mmHg",
    };
  }

  if (vital.glucose !== null && vital.glucose !== undefined) {
    return {
      label: "Glucose",
      value: `${vital.glucose}`,
      unit: "mmol/L",
    };
  }

  if (vital.temperature !== null && vital.temperature !== undefined) {
    return {
      label: "Temperature",
      value: `${vital.temperature}`,
      unit: "°C",
    };
  }

  return {
    label: "Vitals",
    value: vital.status,
    unit: "",
  };
};

const getFilterCount = (
  patients: DoctorAssignedPatient[],
  filter: PatientFilter
) => {
  if (filter === "ALL") {
    return patients.length;
  }

  if (filter === "ALERTS") {
    return patients.filter((patient) => patient.activeAlert).length;
  }

  return patients.filter((patient) => {
    return patient.latestVital?.status === filter;
  }).length;
};

export const DoctorPatientsScreen = ({
  navigation,
}: DoctorPatientsScreenProps) => {
  const insets = useSafeAreaInsets();

  const [patients, setPatients] = useState<DoctorAssignedPatient[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<PatientFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPatients = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const result = await doctorPatientsApi.getAssignedPatients();
        setPatients(result.patients);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load assigned patients.";

        setErrorMessage(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadPatients("initial");
    }, [loadPatients])
  );

  const visiblePatients = useMemo(() => {
    if (selectedFilter === "ALL") {
      return patients;
    }

    if (selectedFilter === "ALERTS") {
      return patients.filter((patient) => patient.activeAlert);
    }

    return patients.filter((patient) => {
      return patient.latestVital?.status === selectedFilter;
    });
  }, [patients, selectedFilter]);

  const activeAlertCount = useMemo(() => {
    return patients.filter((patient) => patient.activeAlert).length;
  }, [patients]);

  const criticalPatientCount = useMemo(() => {
    return patients.filter((patient) => {
      return patient.latestVital?.status === "CRITICAL";
    }).length;
  }, [patients]);

  const openPatientDetail = (patient: DoctorAssignedPatient) => {
    const rootNavigation = navigation.getParent();

    if (!rootNavigation) {
      Alert.alert(
        "Unable to open",
        "Patient detail screen is not available right now."
      );
      return;
    }

    rootNavigation.dispatch(
      CommonActions.navigate({
        name: "DoctorPatientDetail",
        params: {
          patientId: patient.patient.id,
          patientName: patient.patient.fullName,
        },
      })
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerIconBox}>
            <UsersRound size={24} color={DOCTOR_PRIMARY} strokeWidth={2.7} />
          </View>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Assigned Patients</Text>
            <Text style={styles.headerSubtitle}>
              Review linked patient records
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom + 108, 132),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadPatients("refresh")}
              tintColor={DOCTOR_PRIMARY}
              colors={[DOCTOR_PRIMARY]}
            />
          }
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={DOCTOR_PRIMARY} />
              <Text style={styles.stateText}>Loading assigned patients...</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIcon}>
                <RefreshCw size={26} color={DANGER} strokeWidth={2.7} />
              </View>

              <Text style={styles.errorTitle}>Unable to load patients</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                activeOpacity={0.86}
                onPress={() => loadPatients("initial")}
              >
                <RefreshCw size={17} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryTopRow}>
                  <View style={styles.summaryIconBox}>
                    <Stethoscope
                      size={25}
                      color={DOCTOR_PRIMARY}
                      strokeWidth={2.7}
                    />
                  </View>

                  <View style={styles.summaryBadge}>
                    <ShieldCheck
                      size={14}
                      color={DOCTOR_PRIMARY}
                      strokeWidth={2.5}
                    />
                    <Text style={styles.summaryBadgeText}>Doctor Access</Text>
                  </View>
                </View>

                <Text style={styles.summaryTitle}>Patient Care List</Text>
                <Text style={styles.summaryText}>
                  Only patients assigned to your account are shown here.
                </Text>

                <View style={styles.summaryStatsRow}>
                  <SummaryStat
                    value={patients.length}
                    label="Patients"
                    icon={
                      <UsersRound
                        size={17}
                        color="#FFFFFF"
                        strokeWidth={2.5}
                      />
                    }
                  />

                  <View style={styles.summaryDivider} />

                  <SummaryStat
                    value={activeAlertCount}
                    label="Alerts"
                    icon={
                      <AlertTriangle
                        size={17}
                        color="#FFFFFF"
                        strokeWidth={2.5}
                      />
                    }
                  />

                  <View style={styles.summaryDivider} />

                  <SummaryStat
                    value={criticalPatientCount}
                    label="Critical"
                    icon={
                      <HeartPulse
                        size={17}
                        color="#FFFFFF"
                        strokeWidth={2.5}
                      />
                    }
                  />
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContent}
              >
                <FilterChip
                  label="All"
                  count={getFilterCount(patients, "ALL")}
                  isActive={selectedFilter === "ALL"}
                  onPress={() => setSelectedFilter("ALL")}
                />

                <FilterChip
                  label="Alerts"
                  count={getFilterCount(patients, "ALERTS")}
                  isActive={selectedFilter === "ALERTS"}
                  onPress={() => setSelectedFilter("ALERTS")}
                />

                <FilterChip
                  label="Critical"
                  count={getFilterCount(patients, "CRITICAL")}
                  isActive={selectedFilter === "CRITICAL"}
                  onPress={() => setSelectedFilter("CRITICAL")}
                />

                <FilterChip
                  label="Warning"
                  count={getFilterCount(patients, "WARNING")}
                  isActive={selectedFilter === "WARNING"}
                  onPress={() => setSelectedFilter("WARNING")}
                />

                <FilterChip
                  label="Stable"
                  count={getFilterCount(patients, "STABLE")}
                  isActive={selectedFilter === "STABLE"}
                  onPress={() => setSelectedFilter("STABLE")}
                />
              </ScrollView>

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Patient Records</Text>
                  <Text style={styles.sectionSubtitle}>
                    {visiblePatients.length} patient
                    {visiblePatients.length === 1 ? "" : "s"} shown
                  </Text>
                </View>
              </View>

              {visiblePatients.length > 0 ? (
                <View style={styles.cardStack}>
                  {visiblePatients.map((patient) => (
                    <PatientCard
                      key={patient.assignmentId}
                      patient={patient}
                      onPress={() => openPatientDetail(patient)}
                    />
                  ))}
                </View>
              ) : (
                <EmptyCard
                  icon={
                    <UserRound
                      size={25}
                      color={DOCTOR_PRIMARY}
                      strokeWidth={2.6}
                    />
                  }
                  title={
                    patients.length === 0
                      ? "No assigned patients"
                      : "No matching patients"
                  }
                  text={
                    patients.length === 0
                      ? "Patients will appear here after they select you as their doctor."
                      : "Try changing the filter to view more patients."
                  }
                />
              )}
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const SummaryStat = ({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: ReactNode;
}) => {
  return (
    <View style={styles.summaryStatBox}>
      <View style={styles.summaryStatIcon}>{icon}</View>
      <Text style={styles.summaryStatValue}>{value}</Text>
      <Text style={styles.summaryStatLabel}>{label}</Text>
    </View>
  );
};

const FilterChip = ({
  label,
  count,
  isActive,
  onPress,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      style={[styles.filterChip, isActive ? styles.activeFilterChip : undefined]}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          isActive ? styles.activeFilterChipText : undefined,
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.filterCountBox,
          isActive ? styles.activeFilterCountBox : undefined,
        ]}
      >
        <Text
          style={[
            styles.filterCountText,
            isActive ? styles.activeFilterCountText : undefined,
          ]}
        >
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ---- Redesigned patient card ----
// Left accent bar for at-a-glance triage color, a status-ring avatar with a
// live indicator dot, decorative tone-tinted blobs in the corners, and a
// "hero" vital spotlight instead of a plain label/value row.
const PatientCard = ({
  patient,
  onPress,
}: {
  patient: DoctorAssignedPatient;
  onPress: () => void;
}) => {
  const tone = getVitalTone(patient.latestVital?.status);
  const primaryVital = getPrimaryVital(patient.latestVital);

  return (
    <TouchableOpacity
      style={styles.patientCard}
      activeOpacity={0.88}
      onPress={onPress}
    >
      <View style={[styles.cardAccentBar, { backgroundColor: tone.accent }]} />

      <View
        style={[
          styles.decorBlobLarge,
          { backgroundColor: tone.background },
        ]}
      />
      <View
        style={[styles.decorBlobSmall, { backgroundColor: tone.accent }]}
      />

      <View style={styles.patientCardInner}>
        <View style={styles.patientTopRow}>
          <View style={styles.avatarRing}>
            <View
              style={[
                styles.avatarRingBorder,
                { borderColor: tone.accent },
              ]}
            >
              <View style={styles.patientAvatar}>
                <Text style={styles.patientAvatarText}>
                  {getInitials(patient.patient.fullName)}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.avatarStatusDot,
                { backgroundColor: tone.accent },
              ]}
            />
          </View>

          <View style={styles.patientTitleBlock}>
            <Text style={styles.patientName} numberOfLines={1}>
              {patient.patient.fullName}
            </Text>
            <Text style={styles.patientMeta} numberOfLines={1}>
              {formatPatientMeta(patient)}
            </Text>
          </View>

          <View style={[styles.vitalChip, { backgroundColor: tone.background }]}>
            <View style={[styles.vitalChipDot, { backgroundColor: tone.accent }]} />
            <Text style={[styles.vitalChipText, { color: tone.text }]}>
              {tone.label}
            </Text>
          </View>
        </View>

        <View style={styles.contactRow}>
          <View style={styles.contactItem}>
            <Mail size={14} color={MUTED} strokeWidth={2.3} />
            <Text style={styles.contactText} numberOfLines={1}>
              {patient.patient.email}
            </Text>
          </View>

          {patient.patient.phoneNumber ? (
            <View style={styles.contactItem}>
              <Phone size={14} color={MUTED} strokeWidth={2.3} />
              <Text style={styles.contactText} numberOfLines={1}>
                {patient.patient.phoneNumber}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.vitalSpotlight, { backgroundColor: tone.background }]}>
          <View style={styles.vitalSpotlightIcon}>
            <HeartPulse size={22} color={tone.iconColor} strokeWidth={2.6} />
          </View>

          <View style={styles.vitalSpotlightTextBlock}>
            <Text style={[styles.vitalSpotlightLabel, { color: tone.text }]}>
              {primaryVital.label}
            </Text>

            <View style={styles.vitalSpotlightValueRow}>
              <Text style={[styles.vitalSpotlightValue, { color: tone.text }]}>
                {primaryVital.value}
              </Text>

              {primaryVital.unit ? (
                <Text
                  style={[styles.vitalSpotlightUnit, { color: tone.text }]}
                >
                  {primaryVital.unit}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.medicineMiniBox}>
            <Pill size={16} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
            <Text style={styles.medicineMiniValue}>
              {patient.activeMedicineCount}
            </Text>
            <Text style={styles.medicineMiniLabel}>meds</Text>
          </View>
        </View>

        {patient.activeAlert ? (
          <View style={styles.alertStrip}>
            <View style={styles.alertIconBadge}>
              <AlertTriangle size={16} color="#FFFFFF" strokeWidth={2.8} />
            </View>
            <View style={styles.alertTextBlock}>
              <Text style={styles.alertStripTitle}>Active safety alert</Text>
              <Text style={styles.alertStripText} numberOfLines={1}>
                {patient.activeAlert.reason}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.updatedText}>
            Assigned {formatDateTime(patient.assignedAt)}
          </Text>

          <View style={styles.viewPill}>
            <Text style={styles.viewPillText}>View record</Text>
            <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.8} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const EmptyCard = ({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) => {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
};

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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: TEXT,
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    marginTop: 12,
    ...elevate(1),
  },
  stateText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
  },
  errorCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    marginTop: 12,
    ...elevate(1),
  },
  errorIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  errorTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: DOCTOR_PRIMARY,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: DOCTOR_PRIMARY,
    borderRadius: 16,
    padding: 18,
    overflow: "hidden",
    ...elevate(2),
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryIconBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  summaryBadgeText: {
    color: DOCTOR_PRIMARY,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 18,
  },
  summaryText: {
    color: "#D7FFFA",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 6,
  },
  summaryStatsRow: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 13,
  },
  summaryStatBox: {
    flex: 1,
    alignItems: "center",
  },
  summaryStatIcon: {
    marginBottom: 5,
  },
  summaryStatValue: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "700",
  },
  summaryStatLabel: {
    color: "#D7FFFA",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  summaryDivider: {
    width: 1,
    height: 42,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  filtersContent: {
    paddingTop: 16,
    paddingBottom: 3,
    gap: 9,
  },
  filterChip: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(1),
  },
  activeFilterChip: {
    backgroundColor: DOCTOR_PRIMARY,
  },
  filterChipText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },
  activeFilterChipText: {
    color: "#FFFFFF",
  },
  filterCountBox: {
    minWidth: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  activeFilterCountBox: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  filterCountText: {
    color: DOCTOR_PRIMARY,
    fontSize: 11,
    fontWeight: "800",
  },
  activeFilterCountText: {
    color: "#FFFFFF",
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  cardStack: {
    gap: 14,
  },

  // ---- Patient card (redesigned) ----
  patientCard: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    overflow: "hidden",
    ...elevate(2),
  },
  cardAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  decorBlobLarge: {
    position: "absolute",
    top: -46,
    right: -46,
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.9,
  },
  decorBlobSmall: {
    position: "absolute",
    bottom: -30,
    right: 46,
    width: 46,
    height: 46,
    borderRadius: 23,
    opacity: 0.08,
  },
  patientCardInner: {
    padding: 16,
    paddingLeft: 19,
  },
  patientTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarRing: {
    marginRight: 13,
  },
  avatarRingBorder: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  patientAvatarText: {
    color: DOCTOR_PRIMARY,
    fontSize: 15,
    fontWeight: "800",
  },
  avatarStatusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: SURFACE,
  },
  patientTitleBlock: {
    flex: 1,
  },
  patientName: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
  },
  patientMeta: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  vitalChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  vitalChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  vitalChipText: {
    fontSize: 10,
    fontWeight: "800",
  },
  contactRow: {
    marginTop: 13,
    gap: 6,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  contactText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 7,
    flex: 1,
  },
  vitalSpotlight: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
  },
  vitalSpotlightIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vitalSpotlightTextBlock: {
    flex: 1,
  },
  vitalSpotlightLabel: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.85,
  },
  vitalSpotlightValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 2,
  },
  vitalSpotlightValue: {
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  vitalSpotlightUnit: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
    marginBottom: 3,
    opacity: 0.85,
  },
  medicineMiniBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 13,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  medicineMiniValue: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 3,
  },
  medicineMiniLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 1,
  },
  alertStrip: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  alertIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: DANGER,
    alignItems: "center",
    justifyContent: "center",
  },
  alertTextBlock: {
    flex: 1,
    marginLeft: 10,
  },
  alertStripTitle: {
    color: "#B42318",
    fontSize: 12,
    fontWeight: "800",
  },
  alertStripText: {
    color: "#B42318",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  updatedText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
  },
  viewPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DOCTOR_PRIMARY,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    ...elevate(1),
  },
  viewPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    marginRight: 5,
  },

  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 24,
    alignItems: "center",
    ...elevate(1),
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
  },
});
