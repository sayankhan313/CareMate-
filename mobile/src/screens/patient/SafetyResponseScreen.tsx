import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, HeartPulse, ShieldAlert, Stethoscope, UserRound, Video } from "lucide-react-native";
import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedAlert as Alert } from "../../utils/localizedAlert";

import type { RootStackParamList } from "../../types/navigation";
import type { VitalReading } from "../../types/vitals";
import { safetyApi, type SafetyAlert } from "../../services/safetyApi";
import { patientSettingsApi } from "../../services/patientSettingsApi";

type Props = NativeStackScreenProps<RootStackParamList, "SafetyResponse">;

const DEFAULT_TIMER_SECONDS = 30;
const BACKGROUND = "#FBF1F1";
const SURFACE = "#FFFFFF";
const TEXT = "#1B1D2A";
const MUTED = "#5F6270";
const SOFT_MUTED = "#7B7E8C";
const RED = "#D9483F";
const RED_DARK = "#A6332C";
const RED_CONTAINER = "#F9DAD7";
const ON_RED_CONTAINER = "#7A241F";
const RED_SOFT = "#FCEBE9";
const DEFAULT_SOURCE_TEXT = "CareMate+";

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: "#1B1D2A",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: { width: 0, height: level * 0.8 },
});

const formatReadingTime = (value?: string | null) => {
  if (!value) return "Just now";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Just now";

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getTimeLeftFromTimerEnd = (timerEndsAt?: string | null, fallbackSeconds = DEFAULT_TIMER_SECONDS) => {
  if (!timerEndsAt) return fallbackSeconds;

  const endTime = new Date(timerEndsAt).getTime();

  if (Number.isNaN(endTime)) return fallbackSeconds;

  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
};

const getTimerDurationFromAlert = (alert: SafetyAlert, fallbackSeconds: number) => {
  const startTime = new Date(alert.createdAt).getTime();
  const endTime = new Date(alert.timerEndsAt).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return fallbackSeconds;

  const duration = Math.round((endTime - startTime) / 1000);

  if (duration < 1 || duration > 300) return fallbackSeconds;

  return duration;
};

const getCriticalVitalInfo = (reading: VitalReading) => {
  if (reading.spo2 !== null && reading.spo2 !== undefined && reading.spo2 < 90) {
    return {
      title: "Critical SpO₂ Reading",
      value: `SpO₂ ${reading.spo2}%`,
      reason: `Critical SpO₂ ${reading.spo2}% detected`,
    };
  }

  if (reading.heartRate !== null && reading.heartRate !== undefined && (reading.heartRate < 40 || reading.heartRate >= 130)) {
    return {
      title: "Critical Heart Rate Reading",
      value: `HR ${reading.heartRate} bpm`,
      reason: `Critical heart rate ${reading.heartRate} bpm detected`,
    };
  }

  if (
    reading.bpSystolic !== null &&
    reading.bpSystolic !== undefined &&
    reading.bpDiastolic !== null &&
    reading.bpDiastolic !== undefined &&
    (reading.bpSystolic >= 180 || reading.bpDiastolic >= 120)
  ) {
    return {
      title: "Critical Blood Pressure Reading",
      value: `BP ${reading.bpSystolic}/${reading.bpDiastolic}`,
      reason: `Critical blood pressure ${reading.bpSystolic}/${reading.bpDiastolic} detected`,
    };
  }

  if (reading.glucose !== null && reading.glucose !== undefined && (reading.glucose < 54 || reading.glucose >= 250)) {
    return {
      title: "Critical Glucose Reading",
      value: `Glucose ${reading.glucose}`,
      reason: `Critical glucose ${reading.glucose} detected`,
    };
  }

  if (reading.temperature !== null && reading.temperature !== undefined && reading.temperature >= 39) {
    return {
      title: "Critical Temperature Reading",
      value: `Temp ${reading.temperature}°C`,
      reason: `Critical temperature ${reading.temperature}°C detected`,
    };
  }

  return {
    title: "Critical Vital Reading",
    value: "Critical reading detected",
    reason: "Critical vital reading detected",
  };
};

export const SafetyResponseScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const { vitalReading, triggerSource, manualCriticalInfo } = route.params;

  const [safetyAlert, setSafetyAlert] = useState<SafetyAlert | null>(null);
  const [timerDuration, setTimerDuration] = useState(DEFAULT_TIMER_SECONDS);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMER_SECONDS);
  const [isCreatingAlert, setIsCreatingAlert] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasEscalatedRef = useRef(false);

  const vitalInfo = useMemo(() => manualCriticalInfo || getCriticalVitalInfo(vitalReading), [manualCriticalInfo, vitalReading]);

  const progressWidth = useMemo<`${number}%`>(() => {
    const safeDuration = Math.max(1, timerDuration);
    const percentage = Math.max(0, Math.min(100, (timeLeft / safeDuration) * 100));

    return `${percentage}%` as `${number}%`;
  }, [timeLeft, timerDuration]);

  const sourceText = triggerSource || vitalReading.source || DEFAULT_SOURCE_TEXT;

  const goBackToVitals = () => {
    navigation.navigate("PatientTabs", { screen: "Vitals" });
  };

  const createSafetyAlert = async () => {
    try {
      setIsCreatingAlert(true);
      setErrorMessage("");

      let configuredDuration = DEFAULT_TIMER_SECONDS;

      try {
        const settingsResult = await patientSettingsApi.getSafetySettings();
        configuredDuration = settingsResult.settings.countdownSeconds;
      } catch {
        configuredDuration = DEFAULT_TIMER_SECONDS;
      }

      const createdAlert = await safetyApi.createSafetyAlert({
        vitalReadingId: vitalReading.id,
        reason: vitalInfo.reason,
      });

      const actualDuration = getTimerDurationFromAlert(createdAlert, configuredDuration);

      setSafetyAlert(createdAlert);
      setTimerDuration(actualDuration);
      setTimeLeft(getTimeLeftFromTimerEnd(createdAlert.timerEndsAt, actualDuration));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start safety response.";

      setErrorMessage(message);
      Alert.alert("Safety Response", message);
    } finally {
      setIsCreatingAlert(false);
    }
  };

  const cancelSafetyAlert = async () => {
    if (!safetyAlert || isCancelling || isEscalating) return;

    Alert.alert(
      "Cancel safety alert?",
      "Only cancel if this was a false alarm or the device was worn incorrectly.",
      [
        { text: "Keep alert active", style: "cancel" },
        {
          text: "I am okay",
          style: "destructive",
          onPress: async () => {
            try {
              setIsCancelling(true);

              await safetyApi.cancelSafetyAlert(safetyAlert.id);

              Alert.alert("Alert cancelled", "Safety response has been cancelled.", [
                { text: "OK", onPress: goBackToVitals },
              ]);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Unable to cancel safety alert.";

              Alert.alert("Safety Response", message);
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  };

  const escalateSafetyAlert = async (isAutomatic = false) => {
    if (!safetyAlert || hasEscalatedRef.current || isEscalating) return;

    try {
      hasEscalatedRef.current = true;
      setIsEscalating(true);

      const result = await safetyApi.escalateSafetyAlert(safetyAlert.id);

      navigation.replace("VideoConsultation", {
        consultationId: result.consultation.id,
        consultationType: result.consultation.type,
        patientMeeting: result.patientMeeting,
        doctorMeeting: result.doctorMeeting,
        patientMeetingUrl: result.patientMeeting.webUrl,
        doctorMeetingUrl: result.doctorMeeting.webUrl,
      });
    } catch (error) {
      hasEscalatedRef.current = false;

      const message = error instanceof Error ? error.message : "Unable to escalate safety alert.";

      Alert.alert(isAutomatic ? "Auto-escalation failed" : "Safety Response", message);
    } finally {
      setIsEscalating(false);
    }
  };

  useEffect(() => {
    void createSafetyAlert();
  }, []);

  useEffect(() => {
    if (!safetyAlert || safetyAlert.status !== "ACTIVE") return;

    const interval = setInterval(() => {
      const updatedTimeLeft = getTimeLeftFromTimerEnd(safetyAlert.timerEndsAt, timerDuration);

      setTimeLeft(updatedTimeLeft);

      if (updatedTimeLeft <= 0) {
        clearInterval(interval);
        void escalateSafetyAlert(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [safetyAlert, timerDuration]);

  const formattedTimer = timeLeft >= 60
    ? `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`
    : `00:${String(timeLeft).padStart(2, "0")}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={RED} barStyle="light-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={goBackToVitals} disabled={isEscalating}>
            <ArrowLeft size={22} color={SURFACE} strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Safety Response</Text>
            <Text style={styles.headerSubtitle}>Critical vital detected</Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(34, insets.bottom + 34) }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emergencyPanel}>
            <View style={styles.emergencyTopRow}>
              <View style={styles.emergencyIconCircle}>
                <ShieldAlert size={26} color={SURFACE} strokeWidth={2.2} />
              </View>

              <View style={styles.emergencyTextBlock}>
                <View style={styles.emergencyBadge}>
                  <View style={styles.emergencyBadgeDot} />
                  <Text style={styles.emergencyBadgeText}>Emergency alert</Text>
                </View>

                <Text style={styles.emergencyTitle}>{vitalInfo.title}</Text>
                <Text style={styles.emergencySubtitle}>Please respond before the timer ends.</Text>
              </View>
            </View>

            <View style={styles.emergencyValuePanel}>
              <View style={styles.vitalValueRow}>
                <HeartPulse size={20} color={RED} strokeWidth={2.4} />
                <Text style={styles.vitalValue}>{vitalInfo.value}</Text>
              </View>

              <View style={styles.metaRow}>
                <Clock size={15} color={MUTED} strokeWidth={2} />
                <Text style={styles.metaText}>{formatReadingTime(vitalReading.recordedAt)}</Text>
              </View>

              <Text style={styles.sourceText}>Source: {sourceText}</Text>
            </View>
          </View>

          <View style={styles.timerCard}>
            {isCreatingAlert ? (
              <>
                <ActivityIndicator size="large" color={RED} />
                <Text style={styles.timerTitle}>Starting safety response...</Text>
                <Text style={styles.timerSubtitle}>Creating safety alert on CareMate+ backend</Text>
              </>
            ) : (
              <>
                <View style={styles.timerCircle}>
                  <Text style={styles.timerText}>{formattedTimer}</Text>
                </View>

                <Text style={styles.timerTitle}>Auto-escalation timer</Text>
                <Text style={styles.timerSubtitle}>Configured for {timerDuration} seconds</Text>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: progressWidth }]} />
                </View>
              </>
            )}
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color={RED_DARK} strokeWidth={2.2} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.actionCard}>
            <Text style={styles.questionText}>Are you okay? Is your device worn correctly?</Text>

            <TouchableOpacity
              style={[styles.cancelButton, isCreatingAlert || isCancelling || isEscalating ? styles.disabledButton : undefined]}
              activeOpacity={0.85}
              onPress={cancelSafetyAlert}
              disabled={isCreatingAlert || isCancelling || isEscalating}
            >
              <Text style={styles.cancelButtonText}>{isCancelling ? "Cancelling..." : "I am okay / Cancel Alert"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.startButton, isCreatingAlert || isEscalating ? styles.disabledStartButton : undefined]}
              activeOpacity={0.85}
              onPress={() => void escalateSafetyAlert(false)}
              disabled={isCreatingAlert || isEscalating}
            >
              <Text style={styles.startButtonText}>
                {isEscalating ? "Starting emergency consultation..." : "Start Safety Response Now"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.workflowCard}>
            <Text style={styles.workflowTitle}>Safety workflow</Text>

            <WorkflowStep
              icon={<CheckCircle2 size={19} color={SURFACE} strokeWidth={2.2} />}
              circleStyle={styles.completedStepCircle}
              title="Critical reading detected"
              subtitle={vitalInfo.reason}
              titleStyle={styles.workflowStepTitle}
              subtitleStyle={styles.workflowStepSubtitle}
              showLine
            />

            <WorkflowStep
              icon={<Clock size={17} color={SURFACE} strokeWidth={2.2} />}
              circleStyle={styles.activeStepCircle}
              title="Waiting for patient response"
              subtitle={`Timer: ${timeLeft} seconds remaining`}
              titleStyle={styles.activeStepTitle}
              subtitleStyle={styles.activeStepSubtitle}
              showLine
            />

            <WorkflowStep
              icon={<UserRound size={17} color={RED} strokeWidth={2.2} />}
              circleStyle={styles.pendingStepCircle}
              title="Caregiver escalation prepared"
              subtitle="Caregiver notification can be connected here"
              titleStyle={styles.pendingStepTitle}
              subtitleStyle={styles.pendingStepSubtitle}
              showLine
            />

            <WorkflowStep
              icon={<Stethoscope size={17} color={RED} strokeWidth={2.2} />}
              circleStyle={styles.pendingStepCircle}
              title="Doctor consultation request"
              subtitle="Emergency consultation is created after escalation"
              titleStyle={styles.pendingStepTitle}
              subtitleStyle={styles.pendingStepSubtitle}
              showLine
            />

            <WorkflowStep
              icon={<Video size={17} color={RED} strokeWidth={2.2} />}
              circleStyle={styles.pendingStepCircle}
              title="Video consultation"
              subtitle="Patient and doctor join the same JaaS room"
              titleStyle={styles.pendingStepTitle}
              subtitleStyle={styles.pendingStepSubtitle}
            />
          </View>

          <View style={styles.warningBox}>
            <AlertCircle size={18} color={RED_DARK} strokeWidth={2.2} />
            <Text style={styles.warningText}>
              If the timer ends, CareMate+ will automatically escalate this critical alert and create an emergency video consultation.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const WorkflowStep = ({
  icon,
  circleStyle,
  title,
  subtitle,
  titleStyle,
  subtitleStyle,
  showLine,
}: {
  icon: ReactNode;
  circleStyle: object;
  title: string;
  subtitle: string;
  titleStyle: object;
  subtitleStyle: object;
  showLine?: boolean;
}) => {
  return (
    <View style={styles.workflowStep}>
      <View style={styles.workflowLeft}>
        <View style={[styles.stepCircle, circleStyle]}>{icon}</View>
        {showLine ? <View style={styles.stepLine} /> : null}
      </View>

      <View style={styles.workflowTextBlock}>
        <Text style={titleStyle}>{title}</Text>
        <Text style={subtitleStyle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: RED },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22, flexDirection: "row", alignItems: "center", backgroundColor: RED, ...elevate(2) },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginRight: 14, overflow: "hidden" },
  headerTextBlock: { flex: 1 },
  headerTitle: { color: SURFACE, fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: SURFACE, fontSize: 13, fontWeight: "500", marginTop: 3, opacity: 0.9 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  emergencyPanel: { backgroundColor: RED, borderRadius: 18, padding: 18, marginBottom: 14, overflow: "hidden", ...elevate(2) },
  emergencyTopRow: { flexDirection: "row", alignItems: "flex-start" },
  emergencyIconCircle: { width: 50, height: 50, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginRight: 13 },
  emergencyTextBlock: { flex: 1 },
  emergencyBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", backgroundColor: SURFACE, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  emergencyBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: RED, marginRight: 7 },
  emergencyBadgeText: { color: RED_DARK, fontSize: 11, fontWeight: "700" },
  emergencyTitle: { color: SURFACE, fontSize: 22, fontWeight: "700", marginTop: 13 },
  emergencySubtitle: { color: "#FCE6E4", fontSize: 13, fontWeight: "500", lineHeight: 19, marginTop: 6 },
  emergencyValuePanel: { backgroundColor: SURFACE, borderRadius: 14, padding: 15, marginTop: 18 },
  vitalValueRow: { flexDirection: "row", alignItems: "center" },
  vitalValue: { color: RED, fontSize: 22, fontWeight: "700", marginLeft: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  metaText: { color: MUTED, fontSize: 12, fontWeight: "600", marginLeft: 6 },
  sourceText: { color: SOFT_MUTED, fontSize: 11, fontWeight: "600", marginTop: 8 },
  timerCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 22, alignItems: "center", marginBottom: 14, ...elevate(1) },
  timerCircle: { width: 136, height: 136, borderRadius: 68, backgroundColor: RED_CONTAINER, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  timerText: { color: RED_DARK, fontSize: 34, fontWeight: "700" },
  timerTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 12, marginBottom: 6, textAlign: "center" },
  timerSubtitle: { color: MUTED, fontSize: 12, fontWeight: "500", textAlign: "center", marginBottom: 14 },
  progressTrack: { width: "100%", height: 6, borderRadius: 3, backgroundColor: RED_CONTAINER, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: RED },
  errorBox: { backgroundColor: RED_SOFT, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "flex-start", marginBottom: 14, ...elevate(0.5) },
  errorText: { flex: 1, color: RED_DARK, fontSize: 12, fontWeight: "600", lineHeight: 18, marginLeft: 10 },
  actionCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 18, marginBottom: 14, ...elevate(1) },
  questionText: { color: TEXT, fontSize: 15, fontWeight: "600", lineHeight: 22, marginBottom: 18 },
  cancelButton: { backgroundColor: RED_CONTAINER, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 12, overflow: "hidden" },
  cancelButtonText: { color: ON_RED_CONTAINER, fontSize: 14, fontWeight: "700" },
  startButton: { backgroundColor: RED, borderRadius: 12, paddingVertical: 14, alignItems: "center", overflow: "hidden", ...elevate(1) },
  startButtonText: { color: SURFACE, fontSize: 14, fontWeight: "700" },
  disabledButton: { opacity: 0.55 },
  disabledStartButton: { opacity: 0.7 },
  workflowCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 18, marginBottom: 14, ...elevate(1) },
  workflowTitle: { color: TEXT, fontSize: 17, fontWeight: "700", marginBottom: 18 },
  workflowStep: { flexDirection: "row", alignItems: "flex-start" },
  workflowLeft: { alignItems: "center", marginRight: 14 },
  stepCircle: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepLine: { width: 2, height: 30, backgroundColor: RED_CONTAINER, marginVertical: 5 },
  completedStepCircle: { backgroundColor: RED },
  activeStepCircle: { backgroundColor: RED_DARK },
  pendingStepCircle: { backgroundColor: RED_CONTAINER },
  workflowTextBlock: { flex: 1, paddingBottom: 15 },
  workflowStepTitle: { color: TEXT, fontSize: 13, fontWeight: "700" },
  workflowStepSubtitle: { color: SOFT_MUTED, fontSize: 12, fontWeight: "500", marginTop: 4, lineHeight: 17 },
  activeStepTitle: { color: RED_DARK, fontSize: 13, fontWeight: "700" },
  activeStepSubtitle: { color: RED, fontSize: 12, fontWeight: "600", marginTop: 4, lineHeight: 17 },
  pendingStepTitle: { color: RED_DARK, fontSize: 13, fontWeight: "700" },
  pendingStepSubtitle: { color: SOFT_MUTED, fontSize: 12, fontWeight: "500", marginTop: 4, lineHeight: 17 },
  warningBox: { backgroundColor: RED_SOFT, borderRadius: 14, padding: 15, flexDirection: "row", alignItems: "flex-start", ...elevate(0.5) },
  warningText: { flex: 1, color: RED_DARK, fontSize: 12, fontWeight: "600", lineHeight: 18, marginLeft: 10 },
});

