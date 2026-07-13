import { useEffect, useMemo, useRef, useState } from "react";
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
import { SafeAreaView , useSafeAreaInsets} from "react-native-safe-area-context";
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
      title: "Critical SpO2 Reading",
      value: `SpO2 ${reading.spo2}%`,
      reason: `Critical SpO2 ${reading.spo2}% detected`,
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
  const { vitalReading, triggerSource ,manualCriticalInfo} = route.params;

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
    <SafeAreaView style={styles.safeArea} edges={["top","bottom"]}>
      <StatusBar backgroundColor="#EF4444" barStyle="light-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={goBackToVitals}
            disabled={isEscalating}
          >
            <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Safety Response</Text>
            <Text style={styles.headerSubtitle}>Critical vital detected</Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.alertCard}>
            <View style={styles.alertHeaderRow}>
              <View style={styles.alertIconCircle}>
                <ShieldAlert size={25} color="#EF4444" strokeWidth={2.5} />
              </View>

              <View style={styles.alertTextBlock}>
                <Text style={styles.alertTitle}>{vitalInfo.title}</Text>

                <View style={styles.vitalValueRow}>
                  <HeartPulse size={18} color="#EF4444" strokeWidth={2.6} />
                  <Text style={styles.vitalValue}>{vitalInfo.value}</Text>
                </View>

                <View style={styles.timeRow}>
                  <Clock size={15} color="#64748B" strokeWidth={2.3} />
                  <Text style={styles.timeText}>
                    {formatReadingTime(vitalReading.recordedAt)}
                  </Text>
                </View>

                <Text style={styles.alertDescription}>
                  Please respond before the timer ends.
                </Text>

                <Text style={styles.sourceText}>
                  Source: {triggerSource || vitalReading.source}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.timerCard}>
            {isCreatingAlert ? (
              <>
                <ActivityIndicator size="large" color="#EF4444" />
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
              <AlertCircle size={18} color="#DC2626" strokeWidth={2.5} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.questionCard}>
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
            <Text style={styles.workflowTitle}>Safety Workflow</Text>

            <WorkflowStep
              icon={<CheckCircle2 size={20} color="#FFFFFF" strokeWidth={2.5} />}
              circleStyle={styles.completedStepCircle}
              title="Critical reading detected"
              subtitle={vitalInfo.reason}
              titleStyle={styles.workflowStepTitle}
              subtitleStyle={styles.workflowStepSubtitle}
              showLine
            />

            <WorkflowStep
              icon={<Clock size={18} color="#FFFFFF" strokeWidth={2.6} />}
              circleStyle={styles.activeStepCircle}
              title="Waiting for patient response"
              subtitle={`Timer: ${timeLeft} seconds remaining`}
              titleStyle={styles.activeStepTitle}
              subtitleStyle={styles.activeStepSubtitle}
              showLine
            />

            <WorkflowStep
              icon={<UserRound size={18} color="#94A3B8" strokeWidth={2.5} />}
              circleStyle={styles.pendingStepCircle}
              title="Caregiver escalation prepared"
              subtitle="Caregiver notification can be connected here"
              titleStyle={styles.pendingStepTitle}
              subtitleStyle={styles.pendingStepSubtitle}
              showLine
            />

            <WorkflowStep
              icon={<Stethoscope size={18} color="#94A3B8" strokeWidth={2.5} />}
              circleStyle={styles.pendingStepCircle}
              title="Doctor consultation request"
              subtitle="Emergency consultation is created after escalation"
              titleStyle={styles.pendingStepTitle}
              subtitleStyle={styles.pendingStepSubtitle}
              showLine
            />

            <WorkflowStep
              icon={<Video size={18} color="#94A3B8" strokeWidth={2.5} />}
              circleStyle={styles.pendingStepCircle}
              title="Video consultation"
              subtitle="Patient and doctor join the same JaaS room"
              titleStyle={styles.pendingStepTitle}
              subtitleStyle={styles.pendingStepSubtitle}
            />
          </View>

          <View style={styles.warningBox}>
            <AlertCircle size={18} color="#D97706" strokeWidth={2.5} />
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
  icon: React.ReactNode;
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
    backgroundColor: "#F9FAFB",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
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
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
    opacity: 0.95,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 34,
  },
  alertCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    marginBottom: 16,
  },
  alertHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  alertIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  alertTextBlock: {
    flex: 1,
  },
  alertTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  vitalValueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },
  vitalValue: {
    color: "#EF4444",
    fontSize: 24,
    fontWeight: "900",
    marginLeft: 8,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  timeText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },
  alertDescription: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  sourceText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8,
  },
  timerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    alignItems: "center",
    marginBottom: 16,
  },
  timerCircle: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  timerText: {
    color: "#EF4444",
    fontSize: 36,
    fontWeight: "900",
  },
  timerTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  timerSubtitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },
  progressTrack: {
    width: "100%",
    height: 7,
    borderRadius: 99,
    backgroundColor: "#FEE2E2",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: "#EF4444",
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginLeft: 10,
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    marginBottom: 16,
  },
  questionText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 18,
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#EF4444",
    marginBottom: 12,
  },
  cancelButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "900",
  },
  startButton: {
    backgroundColor: "#EF4444",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  startButtonText: {
    color: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    marginBottom: 16,
  },
  workflowTitle: {
    color: "#111827",
    fontSize: 17,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLine: {
    width: 2,
    height: 28,
    backgroundColor: "#E5E7EB",
    marginVertical: 5,
  },
  completedStepCircle: {
    backgroundColor: "#10B981",
  },
  activeStepCircle: {
    backgroundColor: "#F59E0B",
  },
  pendingStepCircle: {
    backgroundColor: "#E5E7EB",
  },
  workflowTextBlock: {
    flex: 1,
    paddingBottom: 14,
  },
  workflowStepTitle: {
    color: "#1F2937",
    fontSize: 13,
    fontWeight: "900",
  },
  workflowStepSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    lineHeight: 17,
  },
  activeStepTitle: {
    color: "#D97706",
    fontSize: 13,
    fontWeight: "900",
  },
  activeStepSubtitle: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    lineHeight: 17,
  },
  pendingStepTitle: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "900",
  },
  pendingStepSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    lineHeight: 17,
  },
  warningBox: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#FDE68A",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  warningText: {
    flex: 1,
    color: "#B45309",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginLeft: 10,
  },
});