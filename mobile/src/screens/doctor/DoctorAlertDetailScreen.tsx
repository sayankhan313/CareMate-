import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Activity, AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, Clock3, Droplets, Gauge, HeartPulse, RefreshCw, ShieldAlert, ShieldCheck, Stethoscope, Thermometer, UserRound, Video, Waves } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { doctorAlertsApi, type DoctorAlertVitalReading, type DoctorSafetyAlert } from "../../services/doctor/doctorAlertsApi";
import { doctorConsultationsApi } from "../../services/doctor/doctorConsultationsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "DoctorAlertDetail">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
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

type ActiveAction = "ACCEPT" | "JOIN" | "RESOLVE" | null;

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : level === 1 ? 0.06 : 0.1,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatStatus = (value?: string | null) => {
  if (!value) return "Unknown";
  return value.toLowerCase().split("_").map(item => item.charAt(0).toUpperCase() + item.slice(1)).join(" ");
};

const getStatusTone = (status?: string) => {
  if (status === "ESCALATED") return { background: DANGER_LIGHT, text: DANGER_DARK, icon: DANGER };
  if (status === "ACTIVE") return { background: WARNING_LIGHT, text: WARNING_DARK, icon: WARNING };
  if (status === "RESOLVED") return { background: SUCCESS_LIGHT, text: SUCCESS_DARK, icon: SUCCESS };
  return { background: SOFT_PANEL, text: MUTED, icon: MUTED };
};

const getVitalTone = (status?: string) => {
  if (status === "CRITICAL") return { background: DANGER_LIGHT, text: DANGER_DARK, icon: DANGER };
  if (status === "WARNING") return { background: WARNING_LIGHT, text: WARNING_DARK, icon: WARNING };
  return { background: SUCCESS_LIGHT, text: SUCCESS_DARK, icon: SUCCESS };
};

const getInitials = (name?: string | null) => {
  if (!name) return "P";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

export const DoctorAlertDetailScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const alertId = route.params.alertId;

  const [alertDetail, setAlertDetail] = useState<DoctorSafetyAlert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

  const statusTone = useMemo(() => getStatusTone(alertDetail?.status), [alertDetail?.status]);
  const vitalTone = useMemo(() => getVitalTone(alertDetail?.vitalReading?.status), [alertDetail?.vitalReading?.status]);

  const loadAlert = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await doctorAlertsApi.getAlertDetail(alertId);
      setAlertDetail(result.alert);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load safety alert.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [alertId]);

  useFocusEffect(useCallback(() => { void loadAlert("initial"); }, [loadAlert]));

  const openPatient = () => {
    if (!alertDetail?.patient) return;

    navigation.navigate("DoctorPatientDetail", {
      patientId: alertDetail.patient.id,
      patientName: alertDetail.patient.fullName,
    });
  };

  const acceptConsultation = async () => {
    if (!alertDetail?.consultation || activeAction) return;

    try {
      setActiveAction("ACCEPT");
      await doctorConsultationsApi.acceptConsultation(alertDetail.consultation.id);
      await loadAlert("refresh");

      Alert.alert("Consultation accepted", "The emergency consultation is now ready for the doctor and patient to join.");
    } catch (error) {
      Alert.alert("Unable to accept consultation", error instanceof Error ? error.message : "The consultation could not be accepted.");
    } finally {
      setActiveAction(null);
    }
  };

  const confirmAcceptConsultation = () => {
    Alert.alert(
      "Accept emergency consultation",
      `Accept the emergency consultation from ${alertDetail?.patient?.fullName || "this patient"}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Accept", onPress: () => void acceptConsultation() },
      ],
    );
  };

  const joinConsultation = async () => {
    if (!alertDetail?.consultation || activeAction) return;

    try {
      setActiveAction("JOIN");

      const result = await doctorConsultationsApi.getDoctorJoinConfig(alertDetail.consultation.id);

      navigation.navigate("VideoConsultation", {
        consultationId: result.consultation.id,
        consultationType: result.consultation.type,
        doctorMeeting: result.doctorMeeting,
        doctorMeetingUrl: result.doctorMeeting.webUrl,
      });
    } catch (error) {
      Alert.alert("Unable to join consultation", error instanceof Error ? error.message : "The emergency video consultation could not be opened.");
    } finally {
      setActiveAction(null);
    }
  };

  const resolveAlert = async () => {
    if (!alertDetail || activeAction) return;

    try {
      setActiveAction("RESOLVE");
      const result = await doctorAlertsApi.resolveAlert(alertDetail.id);
      setAlertDetail(result.alert);

      Alert.alert("Alert resolved", "The Safety Response alert has been marked as resolved.");
    } catch (error) {
      Alert.alert("Unable to resolve alert", error instanceof Error ? error.message : "The safety alert could not be resolved.");
    } finally {
      setActiveAction(null);
    }
  };

  const confirmResolveAlert = () => {
    Alert.alert(
      "Resolve safety alert",
      "Confirm that the emergency workflow has been reviewed and the linked consultation has been completed or closed.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Resolve", style: "destructive", onPress: () => void resolveAlert() },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={DOCTOR_PRIMARY} strokeWidth={2.7} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Safety Alert</Text>
            <Text style={styles.headerSubtitle}>Emergency patient event</Text>
          </View>

          <TouchableOpacity style={styles.refreshButton} activeOpacity={0.85} onPress={() => void loadAlert("refresh")}>
            <RefreshCw size={20} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(36, insets.bottom + 24) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadAlert("refresh")} tintColor={DANGER} colors={[DANGER]} />}
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={DANGER} />
              <Text style={styles.stateText}>Loading safety alert...</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIcon}><RefreshCw size={25} color={DANGER} strokeWidth={2.7} /></View>
              <Text style={styles.errorTitle}>Unable to load alert</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => void loadAlert("initial")}>
                <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage && alertDetail ? (
            <>
              <View style={[styles.alertHero, { backgroundColor: statusTone.background }]}>
                <View style={styles.alertHeroTop}>
                  <View style={[styles.alertHeroIcon, { backgroundColor: SURFACE }]}>
                    <ShieldAlert size={27} color={statusTone.icon} strokeWidth={2.7} />
                  </View>

                  <View style={styles.alertHeroText}>
                    <Text style={[styles.alertHeroKicker, { color: statusTone.text }]}>SAFETY RESPONSE</Text>
                    <Text style={styles.alertHeroTitle}>{formatStatus(alertDetail.status)} Alert</Text>
                    <Text style={styles.alertHeroTime}>{formatDateTime(alertDetail.createdAt)}</Text>
                  </View>

                  <View style={[styles.statusChip, { backgroundColor: SURFACE }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusTone.icon }]} />
                    <Text style={[styles.statusChipText, { color: statusTone.text }]}>{formatStatus(alertDetail.status)}</Text>
                  </View>
                </View>

                <Text style={styles.alertReason}>{alertDetail.reason}</Text>

                {alertDetail.escalatedAt ? (
                  <View style={styles.escalatedRow}>
                    <Clock3 size={15} color={statusTone.text} strokeWidth={2.4} />
                    <Text style={[styles.escalatedText, { color: statusTone.text }]}>
                      Escalated {formatDateTime(alertDetail.escalatedAt)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity style={styles.patientCard} activeOpacity={0.86} onPress={openPatient}>
                <View style={styles.patientAvatar}>
                  <Text style={styles.patientAvatarText}>{getInitials(alertDetail.patient?.fullName)}</Text>
                </View>

                <View style={styles.patientText}>
                  <Text style={styles.sectionLabel}>PATIENT</Text>
                  <Text style={styles.patientName}>{alertDetail.patient?.fullName || "Assigned patient"}</Text>
                  <Text style={styles.patientEmail}>{alertDetail.patient?.email || "Patient record"}</Text>
                </View>

                <View style={styles.openPatientIcon}>
                  <UserRound size={20} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
                </View>
              </TouchableOpacity>

              <SectionHeader title="Triggering Vitals" subtitle="Reading associated with this Safety Response" />

              {alertDetail.vitalReading ? (
                <VitalPanel vital={alertDetail.vitalReading} tone={vitalTone} />
              ) : (
                <View style={styles.emptyCard}>
                  <HeartPulse size={25} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
                  <Text style={styles.emptyTitle}>No linked vital reading</Text>
                  <Text style={styles.emptyText}>This alert does not contain a saved vital reading.</Text>
                </View>
              )}

              <SectionHeader title="Emergency Consultation" subtitle="Consultation created from this escalation" />

              {alertDetail.consultation ? (
                <View style={styles.consultationCard}>
                  <View style={styles.consultationHeader}>
                    <View style={styles.consultationIcon}>
                      <Video size={23} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
                    </View>

                    <View style={styles.consultationText}>
                      <Text style={styles.consultationTitle}>
                        {alertDetail.consultation.type === "EMERGENCY" ? "Emergency consultation" : "Consultation"}
                      </Text>

                      <Text style={styles.consultationReason}>{alertDetail.consultation.reason}</Text>
                    </View>

                    <View style={styles.consultationStatus}>
                      <Text style={styles.consultationStatusText}>{formatStatus(alertDetail.consultation.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.timelinePanel}>
                    <TimelineItem label="Created" value={formatDateTime(alertDetail.consultation.createdAt)} />
                    {alertDetail.consultation.acceptedAt ? <TimelineItem label="Accepted" value={formatDateTime(alertDetail.consultation.acceptedAt)} /> : null}
                    {alertDetail.consultation.startedAt ? <TimelineItem label="Started" value={formatDateTime(alertDetail.consultation.startedAt)} /> : null}
                    {alertDetail.consultation.completedAt ? <TimelineItem label="Completed" value={formatDateTime(alertDetail.consultation.completedAt)} /> : null}
                    {alertDetail.consultation.rejectedAt ? <TimelineItem label="Rejected" value={formatDateTime(alertDetail.consultation.rejectedAt)} /> : null}
                    {alertDetail.consultation.cancelledAt ? <TimelineItem label="Cancelled" value={formatDateTime(alertDetail.consultation.cancelledAt)} /> : null}
                  </View>

                  {alertDetail.canAcceptConsultation ? (
                    <TouchableOpacity style={styles.acceptButton} activeOpacity={0.86} disabled={Boolean(activeAction)} onPress={confirmAcceptConsultation}>
                      {activeAction === "ACCEPT" ? <ActivityIndicator color="#FFFFFF" /> : <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.6} />}
                      <Text style={styles.primaryButtonText}>Accept Emergency Consultation</Text>
                    </TouchableOpacity>
                  ) : null}

                  {alertDetail.canJoinCall ? (
                    <TouchableOpacity style={styles.joinButton} activeOpacity={0.86} disabled={Boolean(activeAction)} onPress={() => void joinConsultation()}>
                      {activeAction === "JOIN" ? <ActivityIndicator color="#FFFFFF" /> : <Video size={18} color="#FFFFFF" strokeWidth={2.6} />}
                      <Text style={styles.primaryButtonText}>Join Video Consultation</Text>
                    </TouchableOpacity>
                  ) : null}

                  {!alertDetail.canAcceptConsultation && !alertDetail.canJoinCall ? (
                    <View style={styles.consultationInfo}>
                      <CalendarClock size={18} color={MUTED} strokeWidth={2.5} />
                      <Text style={styles.consultationInfoText}>
                        {alertDetail.consultation.status === "COMPLETED"
                          ? "This emergency consultation has been completed."
                          : alertDetail.consultation.status === "REJECTED"
                            ? "This emergency consultation was rejected."
                            : alertDetail.consultation.status === "CANCELLED"
                              ? "This emergency consultation was cancelled."
                              : "No call action is currently available."}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Video size={25} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
                  <Text style={styles.emptyTitle}>No consultation created</Text>
                  <Text style={styles.emptyText}>A linked emergency consultation is not available for this alert.</Text>
                </View>
              )}

              <SectionHeader title="Alert Management" subtitle="Complete the Safety Response workflow" />

              {alertDetail.status === "RESOLVED" ? (
                <View style={styles.resolvedCard}>
                  <ShieldCheck size={23} color={SUCCESS_DARK} strokeWidth={2.6} />

                  <View style={styles.resolvedText}>
                    <Text style={styles.resolvedTitle}>Alert resolved</Text>
                    <Text style={styles.resolvedSubtitle}>{formatDateTime(alertDetail.resolvedAt)}</Text>
                  </View>
                </View>
              ) : alertDetail.canResolveAlert ? (
                <TouchableOpacity style={styles.resolveButton} activeOpacity={0.86} disabled={Boolean(activeAction)} onPress={confirmResolveAlert}>
                  {activeAction === "RESOLVE" ? <ActivityIndicator color="#FFFFFF" /> : <ShieldCheck size={19} color="#FFFFFF" strokeWidth={2.6} />}
                  <Text style={styles.primaryButtonText}>Mark Alert Resolved</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.resolveInfo}>
                  <AlertTriangle size={20} color={WARNING_DARK} strokeWidth={2.5} />

                  <Text style={styles.resolveInfoText}>
                    {alertDetail.status === "ACTIVE"
                      ? "The countdown alert cannot be resolved before escalation."
                      : alertDetail.consultation &&
                          !["COMPLETED", "REJECTED", "CANCELLED"].includes(alertDetail.consultation.status)
                        ? "Complete or close the linked consultation before resolving this alert."
                        : "This alert cannot currently be resolved."}
                  </Text>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionSubtitle}>{subtitle}</Text>
  </View>
);

const TimelineItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.timelineRow}>
    <View style={styles.timelineDot} />

    <View style={styles.timelineText}>
      <Text style={styles.timelineLabel}>{label}</Text>
      <Text style={styles.timelineValue}>{value}</Text>
    </View>
  </View>
);

const VitalPanel = ({
  vital,
  tone,
}: {
  vital: DoctorAlertVitalReading;
  tone: { background: string; text: string; icon: string };
}) => (
  <View style={[styles.vitalsCard, { backgroundColor: tone.background }]}>
    <View style={styles.vitalHeader}>
      <View style={styles.vitalHeaderIcon}>
        <HeartPulse size={23} color={tone.icon} strokeWidth={2.7} />
      </View>

      <View style={styles.vitalHeaderText}>
        <Text style={styles.vitalHeaderTitle}>Critical reading</Text>
        <Text style={styles.vitalHeaderSubtitle}>{formatDateTime(vital.recordedAt)}</Text>
      </View>

      <View style={styles.vitalStatusChip}>
        <Text style={[styles.vitalStatusText, { color: tone.text }]}>{formatStatus(vital.status)}</Text>
      </View>
    </View>

    <View style={styles.vitalsGrid}>
      <VitalItem icon={<HeartPulse size={18} color={tone.icon} strokeWidth={2.5} />} label="Heart rate" value={vital.heartRate !== null ? `${vital.heartRate} bpm` : "--"} />
      <VitalItem icon={<Waves size={18} color={tone.icon} strokeWidth={2.5} />} label="SpO₂" value={vital.spo2 !== null ? `${vital.spo2}%` : "--"} />
      <VitalItem icon={<Gauge size={18} color={tone.icon} strokeWidth={2.5} />} label="Blood pressure" value={vital.bpSystolic !== null && vital.bpDiastolic !== null ? `${vital.bpSystolic}/${vital.bpDiastolic}` : "--"} />
      <VitalItem icon={<Activity size={18} color={tone.icon} strokeWidth={2.5} />} label="Glucose" value={vital.glucose !== null ? `${vital.glucose} mmol/L` : "--"} />
      <VitalItem icon={<Thermometer size={18} color={tone.icon} strokeWidth={2.5} />} label="Temperature" value={vital.temperature !== null ? `${vital.temperature}°C` : "--"} />
      <VitalItem icon={<Stethoscope size={18} color={tone.icon} strokeWidth={2.5} />} label="Source" value={vital.deviceSource || vital.source} />
    </View>
  </View>
);

const VitalItem = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <View style={styles.vitalItem}>
    <View style={styles.vitalItemIcon}>{icon}</View>

    <View style={styles.vitalItemText}>
      <Text style={styles.vitalItemLabel}>{label}</Text>
      <Text style={styles.vitalItemValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

export default DoctorAlertDetailScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  appBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", ...elevate(1) },
  headerText: { flex: 1, marginHorizontal: 12 },
  headerTitle: { color: TEXT, fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 2 },
  refreshButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", ...elevate(1) },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  stateCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 24, alignItems: "center", ...elevate(1) },
  stateText: { color: MUTED, fontSize: 13, fontWeight: "600", marginTop: 10 },

  errorCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 22, alignItems: "center", ...elevate(1) },
  errorIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  errorTitle: { color: TEXT, fontSize: 17, fontWeight: "700", marginTop: 10 },
  errorText: { color: MUTED, fontSize: 12, fontWeight: "600", textAlign: "center", lineHeight: 18, marginTop: 5 },
  retryButton: { backgroundColor: DOCTOR_PRIMARY, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, flexDirection: "row", alignItems: "center", marginTop: 14 },
  retryButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", marginLeft: 7 },

  alertHero: { borderRadius: 16, padding: 16, ...elevate(1) },
  alertHeroTop: { flexDirection: "row", alignItems: "center" },
  alertHeroIcon: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", marginRight: 11 },
  alertHeroText: { flex: 1 },
  alertHeroKicker: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  alertHeroTitle: { color: TEXT, fontSize: 18, fontWeight: "700", marginTop: 2 },
  alertHeroTime: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 3 },
  statusChip: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, flexDirection: "row", alignItems: "center", marginLeft: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusChipText: { fontSize: 9, fontWeight: "800" },
  alertReason: { color: TEXT, fontSize: 13, fontWeight: "600", lineHeight: 19, marginTop: 14 },
  escalatedRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  escalatedText: { fontSize: 10, fontWeight: "700", marginLeft: 6 },

  patientCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", marginTop: 12, ...elevate(1) },
  patientAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  patientAvatarText: { color: DOCTOR_PRIMARY, fontSize: 15, fontWeight: "800" },
  patientText: { flex: 1 },
  sectionLabel: { color: MUTED, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  patientName: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 2 },
  patientEmail: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 2 },
  openPatientIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center" },

  sectionHeader: { marginTop: 21, marginBottom: 9 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "700" },
  sectionSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },

  vitalsCard: { borderRadius: 16, padding: 14, ...elevate(1) },
  vitalHeader: { flexDirection: "row", alignItems: "center" },
  vitalHeaderIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  vitalHeaderText: { flex: 1 },
  vitalHeaderTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  vitalHeaderSubtitle: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 2 },
  vitalStatusChip: { backgroundColor: SURFACE, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  vitalStatusText: { fontSize: 9, fontWeight: "800" },
  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 13 },
  vitalItem: { width: "48%", borderRadius: 12, backgroundColor: SURFACE, padding: 10, flexDirection: "row", alignItems: "center" },
  vitalItemIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: SOFT_PANEL, alignItems: "center", justifyContent: "center", marginRight: 8 },
  vitalItemText: { flex: 1 },
  vitalItemLabel: { color: MUTED, fontSize: 9, fontWeight: "700" },
  vitalItemValue: { color: TEXT, fontSize: 11, fontWeight: "700", marginTop: 2 },

  consultationCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 14, ...elevate(1) },
  consultationHeader: { flexDirection: "row", alignItems: "center" },
  consultationIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  consultationText: { flex: 1 },
  consultationTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  consultationReason: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 3 },
  consultationStatus: { backgroundColor: DOCTOR_LIGHT, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginLeft: 8 },
  consultationStatusText: { color: DOCTOR_DARK, fontSize: 9, fontWeight: "700" },

  timelinePanel: { backgroundColor: SOFT_PANEL, borderRadius: 13, padding: 11, marginTop: 13 },
  timelineRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DOCTOR_PRIMARY, marginRight: 9 },
  timelineText: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timelineLabel: { color: TEXT, fontSize: 11, fontWeight: "700" },
  timelineValue: { color: MUTED, fontSize: 10, fontWeight: "600" },

  acceptButton: { backgroundColor: DOCTOR_PRIMARY, borderRadius: 12, height: 46, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 13 },
  joinButton: { backgroundColor: DANGER, borderRadius: 12, height: 46, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 13 },
  resolveButton: { backgroundColor: SUCCESS_DARK, borderRadius: 12, height: 46, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", marginLeft: 7 },

  consultationInfo: { backgroundColor: SOFT_PANEL, borderRadius: 12, padding: 11, flexDirection: "row", alignItems: "center", marginTop: 13 },
  consultationInfoText: { flex: 1, color: MUTED, fontSize: 11, fontWeight: "600", lineHeight: 16, marginLeft: 8 },

  resolvedCard: { backgroundColor: SUCCESS_LIGHT, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center" },
  resolvedText: { flex: 1, marginLeft: 10 },
  resolvedTitle: { color: SUCCESS_DARK, fontSize: 14, fontWeight: "700" },
  resolvedSubtitle: { color: SUCCESS_DARK, fontSize: 10, fontWeight: "600", marginTop: 3 },

  resolveInfo: { backgroundColor: WARNING_LIGHT, borderRadius: 14, padding: 13, flexDirection: "row", alignItems: "center" },
  resolveInfoText: { flex: 1, color: WARNING_DARK, fontSize: 11, fontWeight: "600", lineHeight: 16, marginLeft: 9 },

  emptyCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 20, alignItems: "center", ...elevate(1) },
  emptyTitle: { color: TEXT, fontSize: 14, fontWeight: "700", marginTop: 9 },
  emptyText: { color: MUTED, fontSize: 11, fontWeight: "500", textAlign: "center", lineHeight: 16, marginTop: 4 },
});