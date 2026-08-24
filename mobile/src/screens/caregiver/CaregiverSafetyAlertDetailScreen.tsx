import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity, ArrowRight, ChevronLeft, CircleCheck, Clock3, Droplets, HeartPulse, RefreshCw, ShieldAlert, Stethoscope, Thermometer, TriangleAlert, UserRound } from "lucide-react-native";

import { caregiverSafetyApi, type CaregiverSafetyAlert, type CaregiverSafetyEscalationHistory } from "../../services/caregiver/caregiverSafetyApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "CaregiverSafetyAlertDetail">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PRIMARY = "#F6A545";
const PRIMARY_DARK = "#8A520E";
const PRIMARY_LIGHT = "#FFF3E2";
const SUCCESS = "#3A9D75";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#E8F7F0";
const WARNING = "#D18425";
const WARNING_DARK = "#9A5B12";
const WARNING_LIGHT = "#FFF3E1";
const DANGER = "#DC4C57";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FDEBED";
const BLUE = "#5579D9";
const BLUE_LIGHT = "#EDF2FF";

const blockedConsultationStatuses = new Set(["ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const getStatusTone = (status: CaregiverSafetyAlert["status"]) => {
  if (status === "ESCALATED") return { background: DANGER_LIGHT, color: DANGER_DARK, title: "Escalated", subtitle: "A doctor has been contacted" };
  if (status === "ACTIVE") return { background: WARNING_LIGHT, color: WARNING_DARK, title: "Active", subtitle: "Safety Response is still active" };
  if (status === "RESOLVED") return { background: SUCCESS_LIGHT, color: SUCCESS_DARK, title: "Resolved", subtitle: "This Safety Response has been resolved" };
  return { background: "#F1F3F7", color: MUTED, title: "Cancelled", subtitle: "This Safety Response was cancelled" };
};

export const CaregiverSafetyAlertDetailScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const [alertData, setAlertData] = useState<CaregiverSafetyAlert | null>(null);
  const [history, setHistory] = useState<CaregiverSafetyEscalationHistory | null>(null);
  const [historyMessage, setHistoryMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAlert = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      setErrorMessage("");
      setHistoryMessage("");

      const result = await caregiverSafetyApi.getPatientAlert(route.params.patientId, route.params.alertId);
      setAlertData(result);

      if (result.status === "ESCALATED") {
        try {
          setHistory(await caregiverSafetyApi.getEscalationHistory(route.params.patientId, route.params.alertId));
        } catch (error) {
          setHistory(null);
          setHistoryMessage(error instanceof Error ? error.message : "Escalation history is unavailable.");
        }
      } else {
        setHistory(null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load safety alert.");
    } finally {
      if (mode === "initial") setIsLoading(false);
      if (mode === "refresh") setIsRefreshing(false);
    }
  }, [route.params.alertId, route.params.patientId]);

  useFocusEffect(useCallback(() => {
    void loadAlert("initial");
  }, [loadAlert]));

  const performRetry = async () => {
    try {
      setIsRetrying(true);
      const result = await caregiverSafetyApi.tryAnotherDoctor(route.params.patientId, route.params.alertId);
      Alert.alert("Doctor notified", result.message);
      await loadAlert("refresh");
    } catch (error) {
      Alert.alert("Unable to try another doctor", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsRetrying(false);
    }
  };

  const confirmRetry = () => {
    Alert.alert(
      "Try another doctor?",
      "CareMate+ will contact the next available doctor already assigned to this patient. You cannot choose an unrelated doctor.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: () => void performRetry() },
      ],
    );
  };

  const canRetry = Boolean(alertData?.status === "ESCALATED" && (!alertData.consultation || !blockedConsultationStatuses.has(alertData.consultation.status)));
  const tone = alertData ? getStatusTone(alertData.status) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.82} onPress={() => navigation.goBack()}>
            <ChevronLeft size={23} color={TEXT} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Safety alert</Text>
            <Text style={styles.headerSubtitle}>{route.params.patientName || "Patient"}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 34, 50) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadAlert("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading safety alert</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.stateCard}>
              <View style={styles.errorIcon}><RefreshCw size={24} color={DANGER} strokeWidth={2.6} /></View>
              <Text style={styles.stateTitle}>Couldn't load safety alert</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.retryLoadButton} activeOpacity={0.85} onPress={() => void loadAlert("initial")}>
                <Text style={styles.retryLoadText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage && alertData && tone ? (
            <>
              <LinearGradient colors={alertData.status === "ESCALATED" ? [DANGER, "#F07A65"] : [PRIMARY, "#F7C066"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
                <View style={styles.heroTop}>
                  <View style={styles.heroIcon}>
                    <ShieldAlert size={29} color={alertData.status === "ESCALATED" ? DANGER_DARK : PRIMARY_DARK} strokeWidth={2.7} />
                  </View>

                  <View style={styles.heroText}>
                    <Text style={styles.heroEyebrow}>SAFETY RESPONSE</Text>
                    <Text style={styles.heroTitle}>{tone.title}</Text>
                    <Text style={styles.heroSubtitle}>{tone.subtitle}</Text>
                  </View>
                </View>

                <View style={styles.patientRow}>
                  <UserRound size={15} color={SURFACE} strokeWidth={2.4} />
                  <Text style={styles.patientName}>{route.params.patientName || "Patient"}</Text>
                  <Text style={styles.patientTime}>{formatDateTime(alertData.escalatedAt || alertData.createdAt)}</Text>
                </View>
              </LinearGradient>

              <View style={styles.reasonCard}>
                <View style={styles.reasonIcon}>
                  <TriangleAlert size={21} color={DANGER_DARK} strokeWidth={2.6} />
                </View>

                <View style={styles.reasonText}>
                  <Text style={styles.reasonLabel}>Alert reason</Text>
                  <Text style={styles.reasonValue}>{alertData.reason}</Text>
                </View>
              </View>

              {alertData.vitalReading ? (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recorded vitals</Text>
                    <View style={[styles.vitalStatus, alertData.vitalReading.status === "CRITICAL" ? styles.vitalCritical : alertData.vitalReading.status === "WARNING" ? styles.vitalWarning : styles.vitalStable]}>
                      <Text style={[styles.vitalStatusText, alertData.vitalReading.status === "CRITICAL" ? styles.vitalCriticalText : alertData.vitalReading.status === "WARNING" ? styles.vitalWarningText : styles.vitalStableText]}>{alertData.vitalReading.status}</Text>
                    </View>
                  </View>

                  <View style={styles.vitalsGrid}>
                    {alertData.vitalReading.heartRate !== null ? <VitalCard icon={<HeartPulse size={19} color={DANGER} strokeWidth={2.5} />} title="Heart rate" value={`${alertData.vitalReading.heartRate} bpm`} background={DANGER_LIGHT} /> : null}
                    {alertData.vitalReading.spo2 !== null ? <VitalCard icon={<Activity size={19} color={BLUE} strokeWidth={2.5} />} title="SpO₂" value={`${alertData.vitalReading.spo2}%`} background={BLUE_LIGHT} /> : null}
                    {alertData.vitalReading.bpSystolic !== null || alertData.vitalReading.bpDiastolic !== null ? <VitalCard icon={<HeartPulse size={19} color={PRIMARY_DARK} strokeWidth={2.5} />} title="Blood pressure" value={`${alertData.vitalReading.bpSystolic ?? "–"}/${alertData.vitalReading.bpDiastolic ?? "–"} mmHg`} background={PRIMARY_LIGHT} /> : null}
                    {alertData.vitalReading.glucose !== null ? <VitalCard icon={<Droplets size={19} color={WARNING} strokeWidth={2.5} />} title="Glucose" value={String(alertData.vitalReading.glucose)} background={WARNING_LIGHT} /> : null}
                    {alertData.vitalReading.temperature !== null ? <VitalCard icon={<Thermometer size={19} color={DANGER} strokeWidth={2.5} />} title="Temperature" value={`${alertData.vitalReading.temperature}°C`} background={DANGER_LIGHT} /> : null}
                  </View>

                  <Text style={styles.vitalFooter}>Recorded {formatDateTime(alertData.vitalReading.recordedAt)} · {alertData.vitalReading.source}</Text>
                </>
              ) : null}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Doctor response</Text>
              </View>

              <View style={styles.doctorCard}>
                <View style={styles.doctorIcon}>
                  <Stethoscope size={22} color={BLUE} strokeWidth={2.6} />
                </View>

                <View style={styles.doctorText}>
                  <Text style={styles.doctorLabel}>Current doctor</Text>
                  <Text style={styles.doctorName}>{alertData.doctor?.fullName || "No doctor recorded"}</Text>
                  {alertData.consultation ? <Text style={styles.consultationText}>Consultation · {alertData.consultation.status.replaceAll("_", " ")}</Text> : null}
                </View>
              </View>

              {history?.escalations.length ? (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Escalation history</Text>
                  </View>

                  <View style={styles.historyCard}>
                    {history.escalations.map((item, index) => (
                      <View key={item.id} style={[styles.historyRow, index === history.escalations.length - 1 ? styles.historyLast : undefined]}>
                        <View style={styles.sequenceBadge}><Text style={styles.sequenceText}>{item.sequenceNumber}</Text></View>

                        <View style={styles.historyText}>
                          <Text style={styles.historyDoctor}>{item.doctor.fullName}</Text>
                          {item.doctor.doctorProfile?.specialization ? <Text style={styles.historySpecialization}>{item.doctor.doctorProfile.specialization}</Text> : null}
                          <Text style={styles.historyMeta}>{item.source === "CAREGIVER_RETRY" ? "Caregiver escalation" : "Initial Safety Response"} · {formatDateTime(item.notifiedAt || item.createdAt)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {historyMessage && alertData.status === "ESCALATED" ? <Text style={styles.historyMessage}>{historyMessage}</Text> : null}

              {canRetry ? (
                <View style={styles.escalationCard}>
                  <View style={styles.escalationTop}>
                    <View style={styles.escalationIcon}>
                      <Stethoscope size={23} color={DANGER_DARK} strokeWidth={2.6} />
                    </View>

                    <View style={styles.escalationText}>
                      <Text style={styles.escalationTitle}>Still unresolved?</Text>
                      <Text style={styles.escalationSubtitle}>Contact the next available doctor already assigned to this patient.</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.escalationButton} activeOpacity={0.86} disabled={isRetrying} onPress={confirmRetry}>
                    {isRetrying ? (
                      <ActivityIndicator size="small" color={SURFACE} />
                    ) : (
                      <>
                        <Text style={styles.escalationButtonText}>Try another doctor</Text>
                        <ArrowRight size={18} color={SURFACE} strokeWidth={2.6} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : alertData.status === "RESOLVED" ? (
                <View style={styles.resolvedCard}>
                  <CircleCheck size={22} color={SUCCESS_DARK} strokeWidth={2.6} />
                  <Text style={styles.resolvedText}>This Safety Response has been resolved.</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const VitalCard = ({ icon, title, value, background }: { icon: React.ReactNode; title: string; value: string; background: string }) => (
  <View style={[styles.vitalCard, { backgroundColor: background }]}>
    <View style={styles.vitalIcon}>{icon}</View>
    <Text style={styles.vitalTitle}>{title}</Text>
    <Text style={styles.vitalValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { height: 68, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  backButton: { width: 43, height: 43, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  headerText: { flex: 1 },
  headerTitle: { color: TEXT, fontSize: 20, fontWeight: "800" },
  headerSubtitle: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 2 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 5 },
  heroCard: { borderRadius: 23, padding: 18, overflow: "hidden" },
  heroTop: { flexDirection: "row", alignItems: "center" },
  heroIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 13 },
  heroText: { flex: 1 },
  heroEyebrow: { color: "#FFF7ED", fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: SURFACE, fontSize: 22, fontWeight: "800", marginTop: 4 },
  heroSubtitle: { color: "#FFF7ED", fontSize: 10, fontWeight: "600", marginTop: 3 },
  patientRow: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9, flexDirection: "row", alignItems: "center", marginTop: 17 },
  patientName: { color: SURFACE, fontSize: 10, fontWeight: "800", marginLeft: 6 },
  patientTime: { color: "#FFF7ED", fontSize: 8, fontWeight: "600", marginLeft: "auto" },
  reasonCard: { backgroundColor: DANGER_LIGHT, borderRadius: 17, padding: 14, marginTop: 12, flexDirection: "row", alignItems: "flex-start" },
  reasonIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 10 },
  reasonText: { flex: 1 },
  reasonLabel: { color: DANGER_DARK, fontSize: 9, fontWeight: "800" },
  reasonValue: { color: DANGER_DARK, fontSize: 11, fontWeight: "600", lineHeight: 17, marginTop: 3 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 21, marginBottom: 9, paddingHorizontal: 2 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "800" },
  vitalStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  vitalStatusText: { fontSize: 8, fontWeight: "800" },
  vitalCritical: { backgroundColor: DANGER_LIGHT },
  vitalCriticalText: { color: DANGER_DARK },
  vitalWarning: { backgroundColor: WARNING_LIGHT },
  vitalWarningText: { color: WARNING_DARK },
  vitalStable: { backgroundColor: SUCCESS_LIGHT },
  vitalStableText: { color: SUCCESS_DARK },
  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  vitalCard: { width: "47.2%", minHeight: 114, borderRadius: 17, padding: 13, marginHorizontal: "1.4%", marginBottom: 10 },
  vitalIcon: { width: 37, height: 37, borderRadius: 11, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  vitalTitle: { color: MUTED, fontSize: 9, fontWeight: "700", marginTop: 10 },
  vitalValue: { color: TEXT, fontSize: 14, fontWeight: "800", marginTop: 3 },
  vitalFooter: { color: MUTED, fontSize: 8, fontWeight: "600", marginTop: 1, paddingHorizontal: 2 },
  doctorCard: { backgroundColor: BLUE_LIGHT, borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "center" },
  doctorIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  doctorText: { flex: 1 },
  doctorLabel: { color: MUTED, fontSize: 8, fontWeight: "700" },
  doctorName: { color: TEXT, fontSize: 13, fontWeight: "800", marginTop: 3 },
  consultationText: { color: BLUE, fontSize: 9, fontWeight: "700", marginTop: 4, textTransform: "capitalize" },
  historyCard: { backgroundColor: SURFACE, borderRadius: 17, overflow: "hidden" },
  historyRow: { minHeight: 73, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  historyLast: { borderBottomWidth: 0 },
  sequenceBadge: { width: 35, height: 35, borderRadius: 11, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 10 },
  sequenceText: { color: PRIMARY_DARK, fontSize: 11, fontWeight: "800" },
  historyText: { flex: 1 },
  historyDoctor: { color: TEXT, fontSize: 12, fontWeight: "800" },
  historySpecialization: { color: BLUE, fontSize: 9, fontWeight: "600", marginTop: 2 },
  historyMeta: { color: MUTED, fontSize: 8, fontWeight: "600", marginTop: 3 },
  historyMessage: { color: MUTED, fontSize: 9, lineHeight: 14, fontWeight: "600", marginTop: 8 },
  escalationCard: { backgroundColor: "#FFF3F0", borderRadius: 19, padding: 15, marginTop: 18, borderWidth: 1, borderColor: "#F8D6D2" },
  escalationTop: { flexDirection: "row", alignItems: "center" },
  escalationIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  escalationText: { flex: 1 },
  escalationTitle: { color: DANGER_DARK, fontSize: 14, fontWeight: "800" },
  escalationSubtitle: { color: "#905B52", fontSize: 9, lineHeight: 14, fontWeight: "600", marginTop: 3 },
  escalationButton: { height: 46, backgroundColor: DANGER, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 13 },
  escalationButtonText: { color: SURFACE, fontSize: 11, fontWeight: "800", marginRight: 7 },
  resolvedCard: { backgroundColor: SUCCESS_LIGHT, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", marginTop: 18 },
  resolvedText: { flex: 1, color: SUCCESS_DARK, fontSize: 10, fontWeight: "700", marginLeft: 9 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 18, padding: 30, alignItems: "center", marginTop: 8 },
  errorIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", textAlign: "center", marginTop: 11 },
  stateText: { color: MUTED, fontSize: 10, lineHeight: 16, fontWeight: "500", textAlign: "center", marginTop: 5 },
  retryLoadButton: { backgroundColor: PRIMARY, borderRadius: 11, paddingHorizontal: 17, paddingVertical: 10, marginTop: 15 },
  retryLoadText: { color: SURFACE, fontSize: 11, fontWeight: "700" },
});