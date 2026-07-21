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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Droplets,
  Gauge,
  HeartPulse,
  Mail,
  NotebookPen,
  Phone,
  Pill,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  Video,
} from "lucide-react-native";

import {
  doctorPatientsApi,
  type DoctorPatientDetailData,
  type DoctorPatientDoseLog,
  type DoctorPatientMedicine,
  type DoctorPatientNote,
  type DoctorUpcomingConsultation,
  type DoctorUrgentAlert,
  type DoctorVitalReading,
} from "../../services/doctor/doctorPatientsApi";
import type { RootStackParamList } from "../../types/navigation";

type DoctorPatientDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "DoctorPatientDetail"
>;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";
const DIVIDER = "#E4E8F2";

const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_SECONDARY = "#14B8A6";
const DOCTOR_DARK = "#134E4A";
const DOCTOR_LIGHT = "#E6FFFA";

const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";
const SUCCESS_DARK = "#167A58";

const WARNING = "#F6A545";
const WARNING_LIGHT = "#FFF3E2";
const WARNING_DARK = "#A85A13";

const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";
const DANGER_DARK = "#B42318";

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

const getAgeText = (dateOfBirth?: string | null) => {
  if (!dateOfBirth) {
    return "Age not set";
  }

  const dateMatch = dateOfBirth.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  const birthDate = dateMatch
    ? new Date(
        Number(dateMatch[3]),
        Number(dateMatch[2]) - 1,
        Number(dateMatch[1])
      )
    : new Date(dateOfBirth);

  if (Number.isNaN(birthDate.getTime())) {
    return dateOfBirth;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? `${age} yrs` : dateOfBirth;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatShortTime = (value?: string | null) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatus = (value?: string | null) => {
  if (!value) {
    return "Unknown";
  }

  return value.replace(/_/g, " ").toLowerCase();
};

const getVitalTone = (status?: string | null) => {
  if (status === "CRITICAL") {
    return {
      background: DANGER_LIGHT,
      text: DANGER_DARK,
      icon: DANGER,
      label: "Critical",
    };
  }

  if (status === "WARNING") {
    return {
      background: WARNING_LIGHT,
      text: WARNING_DARK,
      icon: WARNING,
      label: "Warning",
    };
  }

  if (status === "STABLE") {
    return {
      background: SUCCESS_LIGHT,
      text: SUCCESS_DARK,
      icon: SUCCESS,
      label: "Stable",
    };
  }

  return {
    background: DOCTOR_LIGHT,
    text: DOCTOR_DARK,
    icon: DOCTOR_PRIMARY,
    label: "No vitals",
  };
};

const getHeroGradient = (status?: string | null): [string, string] => {
  if (status === "CRITICAL") {
    return [DANGER_DARK, DANGER];
  }

  if (status === "WARNING") {
    return [WARNING_DARK, WARNING];
  }

  if (status === "STABLE") {
    return [SUCCESS_DARK, SUCCESS];
  }

  return [DOCTOR_PRIMARY, DOCTOR_SECONDARY];
};

const getVitalsCardBackground = (status?: string | null) => {
  if (status === "CRITICAL") {
    return DANGER_LIGHT;
  }

  if (status === "WARNING") {
    return WARNING_LIGHT;
  }

  if (status === "STABLE") {
    return SUCCESS_LIGHT;
  }

  return DOCTOR_LIGHT;
};

const getDoseTone = (status?: string | null) => {
  if (status === "TAKEN") {
    return {
      background: SUCCESS_LIGHT,
      text: SUCCESS_DARK,
      label: "Taken",
    };
  }

  if (status === "MISSED") {
    return {
      background: DANGER_LIGHT,
      text: DANGER_DARK,
      label: "Missed",
    };
  }

  if (status === "SNOOZED") {
    return {
      background: WARNING_LIGHT,
      text: WARNING_DARK,
      label: "Snoozed",
    };
  }

  return {
    background: DOCTOR_LIGHT,
    text: DOCTOR_DARK,
    label: "Pending",
  };
};

const getPrimaryVital = (vital: DoctorVitalReading | null) => {
  if (!vital) {
    return {
      label: "No recent vitals",
      value: "--",
    };
  }

  if (vital.spo2 !== null && vital.spo2 !== undefined) {
    return {
      label: "SpO2",
      value: `${vital.spo2}%`,
    };
  }

  if (vital.heartRate !== null && vital.heartRate !== undefined) {
    return {
      label: "Heart rate",
      value: `${vital.heartRate} bpm`,
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
    };
  }

  if (vital.glucose !== null && vital.glucose !== undefined) {
    return {
      label: "Glucose",
      value: `${vital.glucose} mmol/L`,
    };
  }

  if (vital.temperature !== null && vital.temperature !== undefined) {
    return {
      label: "Temperature",
      value: `${vital.temperature}°C`,
    };
  }

  return {
    label: "Vitals",
    value: vital.status,
  };
};

export const DoctorPatientDetailScreen = ({
  navigation,
  route,
}: DoctorPatientDetailScreenProps) => {
  const insets = useSafeAreaInsets();

  const patientId = route.params.patientId;
  const fallbackPatientName = route.params.patientName || "Patient";

  const [patientDetail, setPatientDetail] =
    useState<DoctorPatientDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const patientName = patientDetail?.patient.fullName || fallbackPatientName;

  const latestVitalStatus = patientDetail?.latestVital?.status;

  const latestVitalTone = useMemo(() => {
    return getVitalTone(latestVitalStatus);
  }, [latestVitalStatus]);

  const heroGradient = useMemo(() => {
    return getHeroGradient(latestVitalStatus);
  }, [latestVitalStatus]);

  const primaryVital = useMemo(() => {
    return getPrimaryVital(patientDetail?.latestVital || null);
  }, [patientDetail?.latestVital]);

  const loadPatientDetail = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const result = await doctorPatientsApi.getPatientDetail(patientId);
        setPatientDetail(result);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load patient detail.";

        setErrorMessage(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [patientId]
  );

  useFocusEffect(
    useCallback(() => {
      loadPatientDetail("initial");
    }, [loadPatientDetail])
  );

  const showComingNext = (title: string) => {
    Alert.alert(title, "This doctor workflow will be connected next.");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.86}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color={DOCTOR_PRIMARY} strokeWidth={2.7} />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {patientName}
            </Text>
            <Text style={styles.headerSubtitle}>Patient clinical record</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom + 28, 50),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadPatientDetail("refresh")}
              tintColor={DOCTOR_PRIMARY}
              colors={[DOCTOR_PRIMARY]}
            />
          }
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={DOCTOR_PRIMARY} />
              <Text style={styles.stateText}>Loading patient record...</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIcon}>
                <RefreshCw size={26} color={DANGER} strokeWidth={2.7} />
              </View>

              <Text style={styles.errorTitle}>Unable to load record</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                activeOpacity={0.86}
                onPress={() => loadPatientDetail("initial")}
              >
                <RefreshCw size={17} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage && patientDetail ? (
            <>
              <LinearGradient
                colors={heroGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroTopRow}>
                  <View style={styles.heroAvatar}>
                    <Text style={styles.heroAvatarText}>
                      {getInitials(patientDetail.patient.fullName)}
                    </Text>
                  </View>

                  <View style={styles.heroTitleBlock}>
                    <Text style={styles.heroName} numberOfLines={1}>
                      {patientDetail.patient.fullName}
                    </Text>
                    <Text style={styles.heroMeta}>
                      {getAgeText(patientDetail.patient.dateOfBirth)} •{" "}
                      {patientDetail.patient.gender || "Gender not set"}
                    </Text>
                  </View>

                  <View style={styles.heroStatusChip}>
                    <Text style={styles.heroStatusText}>
                      {latestVitalTone.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroDivider} />

                <View style={styles.heroVitalsRow}>
                  <View>
                    <Text style={styles.heroVitalLabel}>
                      {primaryVital.label}
                    </Text>
                    <Text style={styles.heroVitalValue}>
                      {primaryVital.value}
                    </Text>
                  </View>

                  <View style={styles.heroUpdatedBlock}>
                    <Text style={styles.heroUpdatedLabel}>Last updated</Text>
                    <Text style={styles.heroUpdatedValue}>
                      {patientDetail.latestVital
                        ? formatDateTime(patientDetail.latestVital.recordedAt)
                        : "No vitals yet"}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.overviewCard}>
                <View style={styles.overviewHeader}>
                  <View>
                    <Text style={styles.overviewTitle}>Clinical Overview</Text>
                    <Text style={styles.overviewSubtitle}>
                      Today’s patient activity
                    </Text>
                  </View>

                  <View style={styles.overviewIconBox}>
                    <Stethoscope
                      size={22}
                      color={DOCTOR_PRIMARY}
                      strokeWidth={2.6}
                    />
                  </View>
                </View>

                <View style={styles.overviewGrid}>
                  <OverviewStat
                    label="Medicines"
                    value={`${patientDetail.summary.activeMedicineCount}`}
                    tone="default"
                  />

                  <OverviewStat
                    label="Today doses"
                    value={`${patientDetail.summary.todayDoseCount}`}
                    tone="default"
                  />

                  <OverviewStat
                    label="Missed"
                    value={`${patientDetail.summary.missedDoseCount}`}
                    tone={
                      patientDetail.summary.missedDoseCount > 0
                        ? "danger"
                        : "success"
                    }
                  />

                  <OverviewStat
                    label="Reviews"
                    value={`${patientDetail.summary.pendingMedicineReviews}`}
                    tone={
                      patientDetail.summary.pendingMedicineReviews > 0
                        ? "warning"
                        : "success"
                    }
                  />
                </View>
              </View>

              <View style={styles.profilePanel}>
                <View style={styles.profilePanelRow}>
                  <InfoLine
                    icon={<Mail size={15} color={MUTED} strokeWidth={2.4} />}
                    text={patientDetail.patient.email}
                  />

                  <InfoLine
                    icon={<Phone size={15} color={MUTED} strokeWidth={2.4} />}
                    text={patientDetail.patient.phoneNumber || "Phone not set"}
                  />
                </View>

                <View style={styles.profileDivider} />

                <Text style={styles.profileLabel}>Medical conditions</Text>
                <Text style={styles.profileText}>
                  {patientDetail.patient.medicalConditions ||
                    "No medical conditions recorded."}
                </Text>

                <View style={styles.profileDivider} />

                <Text style={styles.profileLabel}>Emergency contact</Text>
                <Text style={styles.profileText}>
                  {patientDetail.patient.emergencyContact ||
                    "No emergency contact recorded."}
                </Text>
              </View>

              {patientDetail.activeAlert ? (
                <SafetyAlertPanel
                  alert={patientDetail.activeAlert}
                  onView={() => showComingNext("Safety alert details")}
                  onJoin={() => showComingNext("Doctor video call")}
                />
              ) : (
                <View style={styles.safePanel}>
                  <View style={styles.safePanelIcon}>
                    <ShieldCheck
                      size={23}
                      color={SUCCESS}
                      strokeWidth={2.6}
                    />
                  </View>

                  <View style={styles.safePanelTextBlock}>
                    <Text style={styles.safePanelTitle}>No active alert</Text>
                    <Text style={styles.safePanelText}>
                      This patient has no active Safety Response escalation.
                    </Text>
                  </View>
                </View>
              )}

              <SectionHeader
                title="Latest Vitals"
                subtitle="Most recent saved Health Connect or manual reading"
              />

              {patientDetail.latestVital ? (
                <VitalsCard
                  vital={patientDetail.latestVital}
                  history={patientDetail.vitalsHistory}
                />
              ) : (
                <EmptyCard
                  icon={
                    <HeartPulse
                      size={25}
                      color={DOCTOR_PRIMARY}
                      strokeWidth={2.6}
                    />
                  }
                  title="No vitals yet"
                  text="Latest readings will appear here when the patient syncs vitals."
                />
              )}

              <SectionHeader
                title="Today’s Dose Activity"
                subtitle="Taken, missed and snoozed reminders"
              />

              {patientDetail.todayDoseLogs.length > 0 ? (
                <View style={styles.cardStack}>
                  {patientDetail.todayDoseLogs.map((doseLog) => (
                    <DoseLogCard key={doseLog.id} doseLog={doseLog} />
                  ))}
                </View>
              ) : (
                <EmptyCard
                  icon={
                    <Pill
                      size={25}
                      color={DOCTOR_PRIMARY}
                      strokeWidth={2.6}
                    />
                  }
                  title="No dose activity today"
                  text="Medicine reminder activity will appear here."
                />
              )}

              <SectionHeader
                title="Active Medicines"
                subtitle="Current medicine plan and review status"
              />

              {patientDetail.activeMedicines.length > 0 ? (
                <View style={styles.cardStack}>
                  {patientDetail.activeMedicines.map((medicine) => (
                    <MedicineCard key={medicine.id} medicine={medicine} />
                  ))}
                </View>
              ) : (
                <EmptyCard
                  icon={
                    <Pill
                      size={25}
                      color={DOCTOR_PRIMARY}
                      strokeWidth={2.6}
                    />
                  }
                  title="No active medicines"
                  text="Medicines will appear here after they are added."
                />
              )}

              <SectionHeader
                title="Doctor Notes"
                subtitle="Your latest notes for this patient"
              />

              {patientDetail.latestNotes.length > 0 ? (
                <View style={styles.cardStack}>
                  {patientDetail.latestNotes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </View>
              ) : (
                <EmptyCard
                  icon={
                    <NotebookPen
                      size={25}
                      color={DOCTOR_PRIMARY}
                      strokeWidth={2.6}
                    />
                  }
                  title="No notes yet"
                  text="Doctor-specific notes will appear here after you add them."
                />
              )}

              <SectionHeader
                title="Consultations"
                subtitle="Recent manual and emergency consultations"
              />

              {patientDetail.recentConsultations.length > 0 ? (
                <View style={styles.cardStack}>
                  {patientDetail.recentConsultations.map((consultation) => (
                    <ConsultationCard
                      key={consultation.id}
                      consultation={consultation}
                    />
                  ))}
                </View>
              ) : (
                <EmptyCard
                  icon={
                    <Video
                      size={25}
                      color={DOCTOR_PRIMARY}
                      strokeWidth={2.6}
                    />
                  }
                  title="No consultations yet"
                  text="Consultation history will appear here."
                />
              )}
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const OverviewStat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "success" | "warning" | "danger";
}) => {
  const background =
    tone === "danger"
      ? DANGER_LIGHT
      : tone === "warning"
        ? WARNING_LIGHT
        : tone === "success"
          ? SUCCESS_LIGHT
          : DOCTOR_LIGHT;

  const color =
    tone === "danger"
      ? DANGER_DARK
      : tone === "warning"
        ? WARNING_DARK
        : tone === "success"
          ? SUCCESS_DARK
          : DOCTOR_DARK;

  return (
    <View style={[styles.overviewStatBox, { backgroundColor: background }]}>
      <Text style={[styles.overviewStatValue, { color }]}>{value}</Text>
      <Text style={[styles.overviewStatLabel, { color }]}>{label}</Text>
    </View>
  );
};

const SectionHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleBlock}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const InfoLine = ({ icon, text }: { icon: ReactNode; text: string }) => {
  return (
    <View style={styles.infoLine}>
      {icon}
      <Text style={styles.infoLineText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
};

const SafetyAlertPanel = ({
  alert,
  onView,
  onJoin,
}: {
  alert: DoctorUrgentAlert;
  onView: () => void;
  onJoin: () => void;
}) => {
  return (
    <View style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <View style={styles.alertIconBox}>
          <AlertTriangle size={24} color={DANGER} strokeWidth={2.7} />
        </View>

        <View style={styles.alertTitleBlock}>
          <Text style={styles.alertTitle}>Active Safety Alert</Text>
          <Text style={styles.alertSubtitle}>
            {alert.vitalSummary
              ? `${alert.vitalSummary.label}: ${alert.vitalSummary.value}`
              : "Critical reading needs review"}
          </Text>
        </View>

        <View style={styles.alertBadge}>
          <Text style={styles.alertBadgeText}>{alert.status}</Text>
        </View>
      </View>

      <Text style={styles.alertReason}>{alert.reason}</Text>

      <View style={styles.alertFooter}>
        <Text style={styles.alertTime}>{formatDateTime(alert.createdAt)}</Text>

        <View style={styles.alertActions}>
          <TouchableOpacity
            style={styles.alertSecondaryButton}
            activeOpacity={0.86}
            onPress={onView}
          >
            <Text style={styles.alertSecondaryText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.alertPrimaryButton,
              !alert.canJoinCall ? styles.alertDisabledButton : undefined,
            ]}
            activeOpacity={0.86}
            onPress={onJoin}
            disabled={!alert.canJoinCall}
          >
            <Text style={styles.alertPrimaryText}>
              {alert.canJoinCall ? "Join" : "No call"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const VitalsCard = ({
  vital,
  history,
}: {
  vital: DoctorVitalReading;
  history: DoctorVitalReading[];
}) => {
  const tone = getVitalTone(vital.status);
  const cardBackground = getVitalsCardBackground(vital.status);

  return (
    <View style={[styles.vitalsCard, { backgroundColor: cardBackground }]}>
      <View style={styles.vitalsTopRow}>
        <View style={[styles.vitalsIconBox, { backgroundColor: SURFACE }]}>
          <HeartPulse size={24} color={tone.icon} strokeWidth={2.7} />
        </View>

        <View style={styles.vitalsTitleBlock}>
          <Text style={styles.vitalsTitle}>Latest Reading</Text>
          <Text style={styles.vitalsSubtitle}>
            {formatDateTime(vital.recordedAt)}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: SURFACE }]}>
          <Text style={[styles.statusBadgeText, { color: tone.text }]}>
            {tone.label}
          </Text>
        </View>
      </View>

      <View style={styles.vitalsGrid}>
        <VitalMetric
          icon={<HeartPulse size={19} color={tone.icon} strokeWidth={2.6} />}
          label="Heart rate"
          value={vital.heartRate !== null ? `${vital.heartRate} bpm` : "--"}
        />

        <VitalMetric
          icon={<Droplets size={19} color={tone.icon} strokeWidth={2.6} />}
          label="SpO2"
          value={vital.spo2 !== null ? `${vital.spo2}%` : "--"}
        />

        <VitalMetric
          icon={<Gauge size={19} color={tone.icon} strokeWidth={2.6} />}
          label="Blood pressure"
          value={
            vital.bpSystolic !== null && vital.bpDiastolic !== null
              ? `${vital.bpSystolic}/${vital.bpDiastolic}`
              : "--"
          }
        />

        <VitalMetric
          icon={<Activity size={19} color={tone.icon} strokeWidth={2.6} />}
          label="Glucose"
          value={vital.glucose !== null ? `${vital.glucose} mmol/L` : "--"}
        />

        <VitalMetric
          icon={
            <Thermometer size={19} color={tone.icon} strokeWidth={2.6} />
          }
          label="Temperature"
          value={vital.temperature !== null ? `${vital.temperature}°C` : "--"}
        />

        <VitalMetric
          icon={<Stethoscope size={19} color={tone.icon} strokeWidth={2.6} />}
          label="Source"
          value={vital.deviceSource || vital.source}
        />
      </View>

      {history.length > 1 ? (
        <View style={styles.historyPanel}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Recent readings</Text>
            <Text style={styles.historySubtitle}>Last {history.length}</Text>
          </View>

          {history.slice(0, 3).map((item) => (
            <VitalHistoryRow key={item.id} vital={item} />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const VitalMetric = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => {
  return (
    <View style={styles.vitalMetricBox}>
      <View style={styles.vitalMetricIcon}>{icon}</View>
      <View style={styles.vitalMetricTextBlock}>
        <Text style={styles.vitalMetricLabel}>{label}</Text>
        <Text style={styles.vitalMetricValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
};

const VitalHistoryRow = ({ vital }: { vital: DoctorVitalReading }) => {
  const tone = getVitalTone(vital.status);
  const primary = getPrimaryVital(vital);

  return (
    <View style={styles.historyRow}>
      <View style={[styles.historyDot, { backgroundColor: tone.icon }]} />

      <View style={styles.historyTextBlock}>
        <Text style={styles.historyMain}>
          {primary.label}: {primary.value}
        </Text>
        <Text style={styles.historyTime}>{formatDateTime(vital.recordedAt)}</Text>
      </View>

      <View style={[styles.historyChip, { backgroundColor: tone.background }]}>
        <Text style={[styles.historyChipText, { color: tone.text }]}>
          {tone.label}
        </Text>
      </View>
    </View>
  );
};

const DoseLogCard = ({ doseLog }: { doseLog: DoctorPatientDoseLog }) => {
  const tone = getDoseTone(doseLog.status);

  return (
    <View style={styles.listCard}>
      <View style={styles.listIconBox}>
        <Pill size={21} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
      </View>

      <View style={styles.listTextBlock}>
        <Text style={styles.listTitle}>{doseLog.medicine.name}</Text>
        <Text style={styles.listSubtitle}>
          {doseLog.medicine.dose} • {formatShortTime(doseLog.scheduledFor)}
        </Text>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: tone.background }]}>
        <Text style={[styles.statusBadgeText, { color: tone.text }]}>
          {tone.label}
        </Text>
      </View>
    </View>
  );
};

const MedicineCard = ({ medicine }: { medicine: DoctorPatientMedicine }) => {
  const pendingReviewCount = medicine.reminders.filter((reminder) => {
    return reminder.sendToDoctorForReview && reminder.reviewStatus === "PENDING";
  }).length;

  return (
    <View style={styles.medicineCard}>
      <View style={styles.medicineTopRow}>
        <View style={styles.listIconBox}>
          <Pill size={21} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
        </View>

        <View style={styles.listTextBlock}>
          <Text style={styles.listTitle}>{medicine.name}</Text>
          <Text style={styles.listSubtitle}>{medicine.dose}</Text>
        </View>

        <View
          style={[
            styles.sourceBadge,
            pendingReviewCount > 0 ? styles.reviewSourceBadge : undefined,
          ]}
        >
          <Text
            style={[
              styles.sourceBadgeText,
              pendingReviewCount > 0 ? styles.reviewSourceBadgeText : undefined,
            ]}
          >
            {pendingReviewCount > 0
              ? "Review"
              : formatStatus(medicine.source)}
          </Text>
        </View>
      </View>

      {medicine.instructions ? (
        <Text style={styles.medicineInstructions}>{medicine.instructions}</Text>
      ) : null}

      <View style={styles.reminderStack}>
        {medicine.reminders.length > 0 ? (
          medicine.reminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderRow}>
              <Clock3 size={15} color={DOCTOR_PRIMARY} strokeWidth={2.4} />
              <Text style={styles.reminderText}>
                {reminder.timeOfDay} • {formatStatus(reminder.frequency)}
              </Text>

              {reminder.sendToDoctorForReview ? (
                <View style={styles.reviewBadge}>
                  <Text style={styles.reviewBadgeText}>
                    {formatStatus(reminder.reviewStatus)}
                  </Text>
                </View>
              ) : (
                <CheckCircle2 size={16} color={SUCCESS} strokeWidth={2.5} />
              )}
            </View>
          ))
        ) : (
          <Text style={styles.noReminderText}>No active reminders</Text>
        )}
      </View>
    </View>
  );
};

const NoteCard = ({ note }: { note: DoctorPatientNote }) => {
  return (
    <View style={styles.noteCard}>
      <View style={styles.noteTopRow}>
        <View style={styles.noteIconBox}>
          <NotebookPen size={21} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
        </View>

        <View style={styles.listTextBlock}>
          <Text style={styles.listTitle}>Doctor note</Text>
          <Text style={styles.listSubtitle}>{formatDateTime(note.createdAt)}</Text>
        </View>
      </View>

      <Text style={styles.noteText}>{note.note}</Text>
    </View>
  );
};

const ConsultationCard = ({
  consultation,
}: {
  consultation: DoctorUpcomingConsultation;
}) => {
  const isEmergency = consultation.type === "EMERGENCY";

  return (
    <View style={styles.listCard}>
      <View
        style={[
          styles.listIconBox,
          isEmergency ? styles.listIconDanger : undefined,
        ]}
      >
        {isEmergency ? (
          <AlertTriangle size={21} color={DANGER} strokeWidth={2.6} />
        ) : (
          <CalendarClock
            size={21}
            color={DOCTOR_PRIMARY}
            strokeWidth={2.6}
          />
        )}
      </View>

      <View style={styles.listTextBlock}>
        <Text style={styles.listTitle}>
          {isEmergency ? "Emergency Consultation" : "Manual Consultation"}
        </Text>
        <Text style={styles.listSubtitle}>
          {formatDateTime(consultation.preferredAt || consultation.createdAt)}
        </Text>
      </View>

      <ChevronRight size={18} color={MUTED} strokeWidth={2.5} />
    </View>
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
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    ...elevate(1),
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
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
  heroCard: {
    borderRadius: 18,
    padding: 18,
    overflow: "hidden",
    ...elevate(2),
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroAvatar: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  heroAvatarText: {
    color: DOCTOR_PRIMARY,
    fontSize: 18,
    fontWeight: "800",
  },
  heroTitleBlock: {
    flex: 1,
  },
  heroName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  heroMeta: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
    opacity: 0.88,
  },
  heroStatusChip: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 8,
  },
  heroStatusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.24)",
    marginVertical: 16,
  },
  heroVitalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  heroVitalLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.86,
  },
  heroVitalValue: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    marginTop: 3,
  },
  heroUpdatedBlock: {
    alignItems: "flex-end",
    maxWidth: "48%",
  },
  heroUpdatedLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.82,
  },
  heroUpdatedValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "right",
  },
  overviewCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    marginTop: 18,
    ...elevate(1),
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overviewTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },
  overviewSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  overviewIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  overviewStatBox: {
    width: "48%",
    borderRadius: 13,
    padding: 13,
  },
  overviewStatValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  overviewStatLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  profilePanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    marginTop: 14,
    ...elevate(1),
  },
  profilePanelRow: {
    gap: 8,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoLineText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 7,
    flex: 1,
  },
  profileDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 12,
  },
  profileLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  profileText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    marginTop: 14,
    ...elevate(2),
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  alertTitleBlock: {
    flex: 1,
  },
  alertTitle: {
    color: DANGER_DARK,
    fontSize: 15,
    fontWeight: "700",
  },
  alertSubtitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  alertBadge: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  alertBadgeText: {
    color: DANGER_DARK,
    fontSize: 10,
    fontWeight: "700",
  },
  alertReason: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 10,
  },
  alertFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
  },
  alertTime: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  alertActions: {
    flexDirection: "row",
    gap: 8,
  },
  alertSecondaryButton: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  alertSecondaryText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "700",
  },
  alertPrimaryButton: {
    backgroundColor: DANGER,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  alertDisabledButton: {
    opacity: 0.55,
  },
  alertPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  safePanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    ...elevate(1),
  },
  safePanelIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: SUCCESS_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  safePanelTextBlock: {
    flex: 1,
  },
  safePanelTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },
  safePanelText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitleBlock: {
    flex: 1,
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
  vitalsCard: {
    borderRadius: 16,
    padding: 15,
    ...elevate(1),
  },
  vitalsTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  vitalsIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vitalsTitleBlock: {
    flex: 1,
  },
  vitalsTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },
  vitalsSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  vitalMetricBox: {
    width: "48%",
    backgroundColor: SURFACE,
    borderRadius: 13,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
  },
  vitalMetricIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  vitalMetricTextBlock: {
    flex: 1,
  },
  vitalMetricLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },
  vitalMetricValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  historyPanel: {
    backgroundColor: "rgba(255,255,255,0.68)",
    borderRadius: 13,
    padding: 12,
    marginTop: 14,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  historyTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },
  historySubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
  },
  historyDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 9,
  },
  historyTextBlock: {
    flex: 1,
  },
  historyMain: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },
  historyTime: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  historyChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  historyChipText: {
    fontSize: 9,
    fontWeight: "800",
  },
  cardStack: {
    gap: 10,
  },
  listCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(1),
  },
  listIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  listIconDanger: {
    backgroundColor: DANGER_LIGHT,
  },
  listTextBlock: {
    flex: 1,
  },
  listTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },
  listSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  medicineCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    ...elevate(1),
  },
  medicineTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sourceBadge: {
    backgroundColor: DOCTOR_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 8,
  },
  sourceBadgeText: {
    color: DOCTOR_DARK,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  reviewSourceBadge: {
    backgroundColor: WARNING_LIGHT,
  },
  reviewSourceBadgeText: {
    color: WARNING_DARK,
  },
  medicineInstructions: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 10,
  },
  reminderStack: {
    marginTop: 11,
    gap: 7,
  },
  reminderRow: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  reminderText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
    flex: 1,
  },
  reviewBadge: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  reviewBadgeText: {
    color: WARNING_DARK,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  noReminderText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },
  noteCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    ...elevate(1),
  },
  noteTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  noteIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  noteText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 10,
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