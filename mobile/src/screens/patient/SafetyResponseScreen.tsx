import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  type DimensionValue,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  HeartPulse,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Video,
} from "lucide-react-native";

import type { RootStackParamList } from "../../types/navigation";
import type { VitalReading } from "../../types/vitals";
import { safetyApi, type SafetyAlert } from "../../services/safetyApi";

type Props = NativeStackScreenProps<RootStackParamList, "SafetyResponse">;

const DEFAULT_TIMER_SECONDS = 30;

const BACKGROUND = "#FFF5F5";
const SURFACE = "#FFFFFF";
const TEXT = "#111827";
const MUTED = "#64748B";
const SOFT_MUTED = "#94A3B8";

const RED = "#EF4444";
const RED_DARK = "#B91C1C";
const RED_DEEP = "#991B1B";
const RED_LIGHT = "#FEE2E2";
const RED_SOFT = "#FEF2F2";
const RED_BORDER = "#FCA5A5";

const BORDER = "#F1D4D4";
const PANEL = "#FFF7F7";

const DEFAULT_SOURCE_TEXT = "CareMate+";

const formatReadingTime = (value?: string | null) => {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTimeLeftFromTimerEnd = (timerEndsAt?: string | null) => {
  if (!timerEndsAt) {
    return DEFAULT_TIMER_SECONDS;
  }

  const endTime = new Date(timerEndsAt).getTime();

  if (Number.isNaN(endTime)) {
    return DEFAULT_TIMER_SECONDS;
  }

  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
};

const getCriticalVitalInfo = (reading: VitalReading) => {
  if (reading.spo2 !== null && reading.spo2 !== undefined && reading.spo2 < 90) {
    return {
      title: "Critical SpO₂ Reading",
      value: `SpO₂ ${reading.spo2}%`,
      reason: `Critical SpO₂ ${reading.spo2}% detected`,
    };
  }

  if (
    reading.heartRate !== null &&
    reading.heartRate !== undefined &&
    (reading.heartRate < 40 || reading.heartRate >= 130)
  ) {
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

  if (
    reading.glucose !== null &&
    reading.glucose !== undefined &&
    (reading.glucose < 54 || reading.glucose >= 250)
  ) {
    return {
      title: "Critical Glucose Reading",
      value: `Glucose ${reading.glucose}`,
      reason: `Critical glucose ${reading.glucose} detected`,
    };
  }

  if (
    reading.temperature !== null &&
    reading.temperature !== undefined &&
    reading.temperature >= 39
  ) {
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
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMER_SECONDS);
  const [isCreatingAlert, setIsCreatingAlert] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasEscalatedRef = useRef(false);

  const vitalInfo = useMemo(() => {
    return manualCriticalInfo || getCriticalVitalInfo(vitalReading);
  }, [manualCriticalInfo, vitalReading]);

  const progressWidth = useMemo<DimensionValue>(() => {
    const percentage = Math.max(
      0,
      Math.min(100, (timeLeft / DEFAULT_TIMER_SECONDS) * 100)
    );

    return `${percentage}%` as DimensionValue;
  }, [timeLeft]);

  const sourceText = triggerSource || vitalReading.source || DEFAULT_SOURCE_TEXT;

  const goBackToVitals = () => {
    navigation.navigate("PatientTabs", {
      screen: "Vitals",
    });
  };

  const createSafetyAlert = async () => {
    try {
      setIsCreatingAlert(true);
      setErrorMessage("");

      const createdAlert = await safetyApi.createSafetyAlert({
        vitalReadingId: vitalReading.id,
        reason: vitalInfo.reason,
      });

      setSafetyAlert(createdAlert);
      setTimeLeft(getTimeLeftFromTimerEnd(createdAlert.timerEndsAt));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start safety response.";

      setErrorMessage(message);
      Alert.alert("Safety Response", message);
    } finally {
      setIsCreatingAlert(false);
    }
  };

  const cancelSafetyAlert = async () => {
    if (!safetyAlert || isCancelling || isEscalating) {
      return;
    }

    Alert.alert(
      "Cancel safety alert?",
      "Only cancel if this was a false alarm or the device was worn incorrectly.",
      [
        {
          text: "Keep alert active",
          style: "cancel",
        },
        {
          text: "I am okay",
          style: "destructive",
          onPress: async () => {
            try {
              setIsCancelling(true);

              await safetyApi.cancelSafetyAlert(safetyAlert.id);

              Alert.alert(
                "Alert cancelled",
                "Safety response has been cancelled.",
                [
                  {
                    text: "OK",
                    onPress: goBackToVitals,
                  },
                ]
              );
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Unable to cancel safety alert.";

              Alert.alert("Safety Response", message);
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const escalateSafetyAlert = async (isAutomatic = false) => {
    if (!safetyAlert || hasEscalatedRef.current || isEscalating) {
      return;
    }

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

      const message =
        error instanceof Error
          ? error.message
          : "Unable to escalate safety alert.";

      Alert.alert(
        isAutomatic ? "Auto-escalation failed" : "Safety Response",
        message
      );
    } finally {
      setIsEscalating(false);
    }
  };

  useEffect(() => {
    createSafetyAlert();
  }, []);

  useEffect(() => {
    if (!safetyAlert || safetyAlert.status !== "ACTIVE") {
      return;
    }

    const interval = setInterval(() => {
      const updatedTimeLeft = getTimeLeftFromTimerEnd(safetyAlert.timerEndsAt);

      setTimeLeft(updatedTimeLeft);

      if (updatedTimeLeft <= 0) {
        clearInterval(interval);
        escalateSafetyAlert(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [safetyAlert]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={RED} barStyle="light-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={goBackToVitals}
            disabled={isEscalating}
          >
            <ArrowLeft size={22} color={SURFACE} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Safety Response</Text>
            <Text style={styles.headerSubtitle}>Critical vital detected</Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(34, insets.bottom + 34),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emergencyPanel}>
            <View style={styles.emergencyTopRow}>
              <View style={styles.emergencyIconCircle}>
                <ShieldAlert size={28} color={SURFACE} strokeWidth={2.8} />
              </View>

              <View style={styles.emergencyTextBlock}>
                <View style={styles.emergencyBadge}>
                  <View style={styles.emergencyBadgeDot} />
                  <Text style={styles.emergencyBadgeText}>Emergency alert</Text>
                </View>

                <Text style={styles.emergencyTitle}>{vitalInfo.title}</Text>
                <Text style={styles.emergencySubtitle}>
                  Please respond before the timer ends.
                </Text>
              </View>
            </View>

            <View style={styles.emergencyValuePanel}>
              <View style={styles.vitalValueRow}>
                <HeartPulse size={21} color={RED} strokeWidth={2.8} />
                <Text style={styles.vitalValue}>{vitalInfo.value}</Text>
              </View>

              <View style={styles.metaRow}>
                <Clock size={15} color={MUTED} strokeWidth={2.3} />
                <Text style={styles.metaText}>
                  {formatReadingTime(vitalReading.recordedAt)}
                </Text>
              </View>

              <Text style={styles.sourceText}>Source: {sourceText}</Text>
            </View>
          </View>

          <View style={styles.timerCard}>
            {isCreatingAlert ? (
              <>
                <ActivityIndicator size="large" color={RED} />

                <Text style={styles.timerTitle}>Starting safety response...</Text>
                <Text style={styles.timerSubtitle}>
                  Creating safety alert on CareMate+ backend
                </Text>
              </>
            ) : (
              <>
                <View style={styles.timerCircle}>
                  <Text style={styles.timerText}>
                    00:{String(timeLeft).padStart(2, "0")}
                  </Text>
                </View>

                <Text style={styles.timerTitle}>Auto-escalation timer</Text>
                <Text style={styles.timerSubtitle}>
                  Respond now to prevent automatic escalation
                </Text>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: progressWidth }]} />
                </View>
              </>
            )}
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color={RED_DARK} strokeWidth={2.5} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.actionCard}>
            <Text style={styles.questionText}>
              Are you okay? Is your device worn correctly?
            </Text>

            <TouchableOpacity
              style={[
                styles.cancelButton,
                (isCreatingAlert || isCancelling || isEscalating) &&
                  styles.disabledButton,
              ]}
              activeOpacity={0.85}
              onPress={cancelSafetyAlert}
              disabled={isCreatingAlert || isCancelling || isEscalating}
            >
              <Text style={styles.cancelButtonText}>
                {isCancelling ? "Cancelling..." : "I am okay / Cancel Alert"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.startButton,
                (isCreatingAlert || isEscalating) && styles.disabledStartButton,
              ]}
              activeOpacity={0.85}
              onPress={() => escalateSafetyAlert(false)}
              disabled={isCreatingAlert || isEscalating}
            >
              <Text style={styles.startButtonText}>
                {isEscalating
                  ? "Starting emergency consultation..."
                  : "Start Safety Response Now"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.workflowCard}>
            <Text style={styles.workflowTitle}>Safety workflow</Text>

            <WorkflowStep
              icon={<CheckCircle2 size={20} color={SURFACE} strokeWidth={2.6} />}
              circleStyle={styles.completedStepCircle}
              title="Critical reading detected"
              subtitle={vitalInfo.reason}
              titleStyle={styles.workflowStepTitle}
              subtitleStyle={styles.workflowStepSubtitle}
              showLine
            />

            <WorkflowStep
              icon={<Clock size={18} color={SURFACE} strokeWidth={2.6} />}
              circleStyle={styles.activeStepCircle}
              title="Waiting for patient response"
              subtitle={`Timer: ${timeLeft} seconds remaining`}
              titleStyle={styles.activeStepTitle}
              subtitleStyle={styles.activeStepSubtitle}
              showLine
            />

            <WorkflowStep
              icon={<UserRound size={18} color={RED} strokeWidth={2.5} />}
              circleStyle={styles.pendingStepCircle}
              title="Caregiver escalation prepared"
              subtitle="Caregiver notification can be connected here"
              titleStyle={styles.pendingStepTitle}
              subtitleStyle={styles.pendingStepSubtitle}
              showLine
            />

            <WorkflowStep
              icon={<Stethoscope size={18} color={RED} strokeWidth={2.5} />}
              circleStyle={styles.pendingStepCircle}
              title="Doctor consultation request"
              subtitle="Emergency consultation is created after escalation"
              titleStyle={styles.pendingStepTitle}
              subtitleStyle={styles.pendingStepSubtitle}
              showLine
            />

            <WorkflowStep
              icon={<Video size={18} color={RED} strokeWidth={2.5} />}
              circleStyle={styles.pendingStepCircle}
              title="Video consultation"
              subtitle="Patient and doctor join the same JaaS room"
              titleStyle={styles.pendingStepTitle}
              subtitleStyle={styles.pendingStepSubtitle}
            />
          </View>

          <View style={styles.warningBox}>
            <AlertCircle size={18} color={RED_DARK} strokeWidth={2.5} />
            <Text style={styles.warningText}>
              If the timer ends, CareMate+ will automatically escalate this
              critical alert and create an emergency video consultation.
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
  safeArea: {
    flex: 1,
    backgroundColor: RED,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: RED,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: SURFACE,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
    opacity: 0.95,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emergencyPanel: {
    backgroundColor: RED,
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    overflow: "hidden",
  },
  emergencyTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  emergencyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  emergencyTextBlock: {
    flex: 1,
  },
  emergencyBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  emergencyBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: RED,
    marginRight: 7,
  },
  emergencyBadgeText: {
    color: RED_DARK,
    fontSize: 11,
    fontWeight: "900",
  },
  emergencyTitle: {
    color: SURFACE,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 13,
  },
  emergencySubtitle: {
    color: "#FFECEC",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 6,
  },
  emergencyValuePanel: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 15,
    marginTop: 18,
  },
  vitalValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  vitalValue: {
    color: RED,
    fontSize: 24,
    fontWeight: "900",
    marginLeft: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  metaText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },
  sourceText: {
    color: SOFT_MUTED,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8,
  },
  timerCard: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    marginBottom: 14,
  },
  timerCircle: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: RED_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 8,
    borderColor: RED_SOFT,
  },
  timerText: {
    color: RED,
    fontSize: 36,
    fontWeight: "900",
  },
  timerTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  timerSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },
  progressTrack: {
    width: "100%",
    height: 7,
    borderRadius: 99,
    backgroundColor: RED_LIGHT,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: RED,
  },
  errorBox: {
    backgroundColor: RED_SOFT,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: RED_BORDER,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: RED_DARK,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginLeft: 10,
  },
  actionCard: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  questionText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 18,
  },
  cancelButton: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: RED,
    marginBottom: 12,
  },
  cancelButtonText: {
    color: RED,
    fontSize: 14,
    fontWeight: "900",
  },
  startButton: {
    backgroundColor: RED,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  startButtonText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.55,
  },
  disabledStartButton: {
    opacity: 0.7,
  },
  workflowCard: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  workflowTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 18,
  },
  workflowStep: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  workflowLeft: {
    alignItems: "center",
    marginRight: 14,
  },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLine: {
    width: 2,
    height: 30,
    backgroundColor: RED_LIGHT,
    marginVertical: 5,
  },
  completedStepCircle: {
    backgroundColor: RED,
  },
  activeStepCircle: {
    backgroundColor: RED_DARK,
  },
  pendingStepCircle: {
    backgroundColor: RED_LIGHT,
    borderWidth: 1,
    borderColor: RED_BORDER,
  },
  workflowTextBlock: {
    flex: 1,
    paddingBottom: 15,
  },
  workflowStepTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  workflowStepSubtitle: {
    color: SOFT_MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    lineHeight: 17,
  },
  activeStepTitle: {
    color: RED_DARK,
    fontSize: 13,
    fontWeight: "900",
  },
  activeStepSubtitle: {
    color: RED,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    lineHeight: 17,
  },
  pendingStepTitle: {
    color: RED_DARK,
    fontSize: 13,
    fontWeight: "900",
  },
  pendingStepSubtitle: {
    color: SOFT_MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    lineHeight: 17,
  },
  warningBox: {
    backgroundColor: RED_SOFT,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: RED_BORDER,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  warningText: {
    flex: 1,
    color: RED_DARK,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginLeft: 10,
  },
});