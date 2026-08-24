import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity, ChevronRight, CircleCheck, Clock3, HeartPulse, RefreshCw, ShieldAlert, ShieldCheck, Stethoscope, TriangleAlert, UsersRound } from "lucide-react-native";

import { caregiverPatientsApi, type CaregiverLinkedPatient } from "../../services/caregiver/caregiverPatientsApi";
import { caregiverSafetyApi, type CaregiverSafetyAlert, type CaregiverSafetyList } from "../../services/caregiver/caregiverSafetyApi";
import type { CaregiverTabParamList } from "../../types/navigation";

type Props = BottomTabScreenProps<CaregiverTabParamList, "Safety">;
type PatientSafetyBundle = { patient: CaregiverLinkedPatient["patient"]; safety: CaregiverSafetyList };
type CombinedAlert = { patient: CaregiverLinkedPatient["patient"]; alert: CaregiverSafetyAlert };

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

const formatDateTime = (value?: string | null) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const getStatusTone = (status: CaregiverSafetyAlert["status"]) => {
  if (status === "ESCALATED") return { background: DANGER_LIGHT, color: DANGER_DARK, label: "Escalated" };
  if (status === "ACTIVE") return { background: WARNING_LIGHT, color: WARNING_DARK, label: "Active" };
  if (status === "RESOLVED") return { background: SUCCESS_LIGHT, color: SUCCESS_DARK, label: "Resolved" };
  return { background: "#F1F3F7", color: MUTED, label: "Cancelled" };
};

export const CaregiverSafetyScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const [bundles, setBundles] = useState<PatientSafetyBundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadSafety = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      setErrorMessage("");

      const patientsResult = await caregiverPatientsApi.getLinkedPatients();
      const results = await Promise.all(patientsResult.patients.map(async patient => ({
        patient: patient.patient,
        safety: await caregiverSafetyApi.listPatientAlerts(patient.patient.id),
      })));

      setBundles(results);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load safety information.");
    } finally {
      if (mode === "initial") setIsLoading(false);
      if (mode === "refresh") setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadSafety("initial");
  }, [loadSafety]));

  const allAlerts = useMemo<CombinedAlert[]>(() => bundles.flatMap(bundle => bundle.safety.recentAlerts.map(alert => ({ patient: bundle.patient, alert }))).sort((a, b) => new Date(b.alert.createdAt).getTime() - new Date(a.alert.createdAt).getTime()), [bundles]);
  const unresolved = useMemo(() => allAlerts.filter(item => item.alert.status === "ACTIVE" || item.alert.status === "ESCALATED"), [allAlerts]);
  const history = useMemo(() => allAlerts.filter(item => item.alert.status === "RESOLVED" || item.alert.status === "CANCELLED").slice(0, 8), [allAlerts]);
  const escalatedCount = unresolved.filter(item => item.alert.status === "ESCALATED").length;

  const openAlert = (item: CombinedAlert) => {
    navigation.dispatch(CommonActions.navigate({
      name: "CaregiverSafetyAlertDetail",
      params: { patientId: item.patient.id, patientName: item.patient.fullName, alertId: item.alert.id },
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 104, 126) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadSafety("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Safety</Text>
              <Text style={styles.headerSubtitle}>Linked patient monitoring</Text>
            </View>

            <View style={styles.headerIcon}>
              <ShieldAlert size={23} color={DANGER} strokeWidth={2.6} />
            </View>
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading safety status</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.stateCard}>
              <View style={styles.errorIcon}>
                <RefreshCw size={24} color={DANGER} strokeWidth={2.6} />
              </View>
              <Text style={styles.stateTitle}>Couldn't load safety status</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => void loadSafety("initial")}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <LinearGradient colors={[PRIMARY, "#F28758"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
                <View style={styles.heroCircleLarge} />
                <View style={styles.heroCircleSmall} />

                <View style={styles.heroTop}>
                  <View style={styles.heroIcon}>
                    <ShieldAlert size={27} color={DANGER_DARK} strokeWidth={2.7} />
                  </View>

                  <View style={styles.heroText}>
                    <Text style={styles.heroEyebrow}>SAFETY MONITORING</Text>
                    <Text style={styles.heroTitle}>{unresolved.length ? "Attention required" : "Patients monitored"}</Text>
                    <Text style={styles.heroSubtitle}>{unresolved.length ? `${unresolved.length} unresolved safety alert${unresolved.length === 1 ? "" : "s"}` : "No unresolved safety alerts"}</Text>
                  </View>
                </View>

                <View style={styles.heroStats}>
                  <HeroStat value={bundles.length} label="Patients" />
                  <View style={styles.heroDivider} />
                  <HeroStat value={unresolved.length} label="Open" />
                  <View style={styles.heroDivider} />
                  <HeroStat value={escalatedCount} label="Escalated" />
                </View>
              </LinearGradient>

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Needs attention</Text>
                  <Text style={styles.sectionSubtitle}>Active and escalated alerts</Text>
                </View>
                {unresolved.length ? <View style={styles.alertCount}><Text style={styles.alertCountText}>{unresolved.length}</Text></View> : null}
              </View>

              {unresolved.length ? (
                <View style={styles.alertStack}>
                  {unresolved.map(item => <SafetyAlertCard key={`${item.patient.id}-${item.alert.id}`} item={item} onPress={() => openAlert(item)} />)}
                </View>
              ) : (
                <View style={styles.safeCard}>
                  <View style={styles.safeIcon}>
                    <ShieldCheck size={27} color={SUCCESS_DARK} strokeWidth={2.6} />
                  </View>

                  <View style={styles.safeText}>
                    <Text style={styles.safeTitle}>No unresolved alerts</Text>
                    <Text style={styles.safeSubtitle}>Linked patients currently have no active Safety Response requiring caregiver attention.</Text>
                  </View>
                </View>
              )}

              {history.length ? (
                <>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Recent safety history</Text>
                      <Text style={styles.sectionSubtitle}>Resolved and cancelled alerts</Text>
                    </View>
                  </View>

                  <View style={styles.historyCard}>
                    {history.map((item, index) => {
                      const tone = getStatusTone(item.alert.status);

                      return (
                        <TouchableOpacity key={`${item.patient.id}-${item.alert.id}`} style={[styles.historyRow, index === history.length - 1 ? styles.historyLast : undefined]} activeOpacity={0.82} onPress={() => openAlert(item)}>
                          <View style={[styles.historyIcon, { backgroundColor: tone.background }]}>
                            {item.alert.status === "RESOLVED" ? <CircleCheck size={18} color={tone.color} strokeWidth={2.5} /> : <TriangleAlert size={18} color={tone.color} strokeWidth={2.5} />}
                          </View>

                          <View style={styles.historyText}>
                            <Text style={styles.historyName}>{item.patient.fullName}</Text>
                            <Text style={styles.historyMeta}>{tone.label} · {formatDateTime(item.alert.updatedAt)}</Text>
                          </View>

                          <ChevronRight size={18} color={MUTED} strokeWidth={2.4} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const SafetyAlertCard = ({ item, onPress }: { item: CombinedAlert; onPress: () => void }) => {
  const tone = getStatusTone(item.alert.status);

  return (
    <TouchableOpacity style={styles.alertCard} activeOpacity={0.86} onPress={onPress}>
      <View style={styles.alertTop}>
        <View style={styles.patientAvatar}>
          <Text style={styles.patientAvatarText}>{item.patient.fullName.trim().charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.patientText}>
          <Text style={styles.patientName}>{item.patient.fullName}</Text>
          <Text style={styles.alertTime}>{formatDateTime(item.alert.createdAt)}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: tone.background }]}>
          <Text style={[styles.statusBadgeText, { color: tone.color }]}>{tone.label}</Text>
        </View>
      </View>

      <View style={styles.reasonPanel}>
        <ShieldAlert size={18} color={DANGER} strokeWidth={2.5} />
        <Text style={styles.reasonText} numberOfLines={2}>{item.alert.reason}</Text>
      </View>

      <View style={styles.alertFooter}>
        {item.alert.vitalReading ? (
          <View style={[styles.infoChip, item.alert.vitalReading.status === "CRITICAL" ? styles.criticalChip : undefined]}>
            <HeartPulse size={14} color={item.alert.vitalReading.status === "CRITICAL" ? DANGER_DARK : BLUE} strokeWidth={2.4} />
            <Text style={[styles.infoChipText, item.alert.vitalReading.status === "CRITICAL" ? styles.criticalChipText : undefined]}>{item.alert.vitalReading.status}</Text>
          </View>
        ) : null}

        {item.alert.doctor ? (
          <View style={styles.infoChip}>
            <Stethoscope size={14} color={BLUE} strokeWidth={2.4} />
            <Text style={styles.infoChipText} numberOfLines={1}>{item.alert.doctor.fullName}</Text>
          </View>
        ) : null}

        <ChevronRight size={19} color={DANGER} strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
};

const HeroStat = ({ value, label }: { value: number; label: string }) => (
  <View style={styles.heroStat}>
    <Text style={styles.heroStatValue}>{value}</Text>
    <Text style={styles.heroStatLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingHorizontal: 2 },
  headerTitle: { color: TEXT, fontSize: 27, fontWeight: "800", letterSpacing: -0.4 },
  headerSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },
  headerIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  heroCard: { borderRadius: 23, padding: 18, overflow: "hidden" },
  heroCircleLarge: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.10)", right: -55, top: -80 },
  heroCircleSmall: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.09)", left: -35, bottom: -45 },
  heroTop: { flexDirection: "row", alignItems: "center" },
  heroIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 13 },
  heroText: { flex: 1 },
  heroEyebrow: { color: "#FFF6EB", fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: SURFACE, fontSize: 20, fontWeight: "800", marginTop: 4 },
  heroSubtitle: { color: "#FFF6EB", fontSize: 10, fontWeight: "600", marginTop: 4 },
  heroStats: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 15, marginTop: 18, paddingVertical: 12 },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { color: SURFACE, fontSize: 20, fontWeight: "800" },
  heroStatLabel: { color: "#FFF6EB", fontSize: 8, fontWeight: "700", marginTop: 3 },
  heroDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.28)" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 21, marginBottom: 10, paddingHorizontal: 2 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "800" },
  sectionSubtitle: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },
  alertCount: { minWidth: 30, height: 30, borderRadius: 10, backgroundColor: DANGER, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  alertCountText: { color: SURFACE, fontSize: 11, fontWeight: "800" },
  alertStack: { gap: 11 },
  alertCard: { backgroundColor: SURFACE, borderRadius: 19, padding: 14, borderWidth: 1, borderColor: "#F2D9DC" },
  alertTop: { flexDirection: "row", alignItems: "center" },
  patientAvatar: { width: 47, height: 47, borderRadius: 15, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 10 },
  patientAvatarText: { color: PRIMARY_DARK, fontSize: 16, fontWeight: "800" },
  patientText: { flex: 1 },
  patientName: { color: TEXT, fontSize: 14, fontWeight: "800" },
  alertTime: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },
  statusBadge: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  statusBadgeText: { fontSize: 8, fontWeight: "800" },
  reasonPanel: { backgroundColor: DANGER_LIGHT, borderRadius: 13, padding: 11, flexDirection: "row", alignItems: "flex-start", marginTop: 12 },
  reasonText: { flex: 1, color: DANGER_DARK, fontSize: 10, fontWeight: "600", lineHeight: 15, marginLeft: 8 },
  alertFooter: { flexDirection: "row", alignItems: "center", marginTop: 11, gap: 7 },
  infoChip: { maxWidth: 145, minHeight: 29, borderRadius: 9, backgroundColor: BLUE_LIGHT, paddingHorizontal: 8, flexDirection: "row", alignItems: "center" },
  infoChipText: { color: BLUE, fontSize: 8, fontWeight: "800", marginLeft: 4, flexShrink: 1 },
  criticalChip: { backgroundColor: DANGER_LIGHT },
  criticalChipText: { color: DANGER_DARK },
  safeCard: { backgroundColor: SUCCESS_LIGHT, borderRadius: 18, padding: 15, flexDirection: "row", alignItems: "center" },
  safeIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  safeText: { flex: 1 },
  safeTitle: { color: SUCCESS_DARK, fontSize: 14, fontWeight: "800" },
  safeSubtitle: { color: "#4D806D", fontSize: 9, fontWeight: "600", lineHeight: 14, marginTop: 4 },
  historyCard: { backgroundColor: SURFACE, borderRadius: 17, overflow: "hidden" },
  historyRow: { minHeight: 65, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  historyLast: { borderBottomWidth: 0 },
  historyIcon: { width: 39, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10 },
  historyText: { flex: 1 },
  historyName: { color: TEXT, fontSize: 12, fontWeight: "800" },
  historyMeta: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 18, padding: 30, alignItems: "center", marginTop: 8 },
  errorIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", textAlign: "center", marginTop: 11 },
  stateText: { color: MUTED, fontSize: 10, lineHeight: 16, fontWeight: "500", textAlign: "center", marginTop: 5 },
  retryButton: { backgroundColor: PRIMARY, borderRadius: 11, paddingHorizontal: 17, paddingVertical: 10, marginTop: 15 },
  retryText: { color: SURFACE, fontSize: 11, fontWeight: "700" },
});