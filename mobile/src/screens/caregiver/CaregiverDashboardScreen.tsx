import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, Bell, CalendarDays, ChevronRight, Clock3, HeartPulse, PackageCheck, Pill, RefreshCw, ShieldAlert, ShieldCheck, UsersRound } from "lucide-react-native";

import { caregiverDashboardApi, type CaregiverDashboardPatient } from "../../services/caregiver/caregiverDashboardApi";
import { notificationEvents } from "../../services/notificationEvents";
import { tokenStorage } from "../../services/tokenStorage";
import type { CaregiverTabParamList } from "../../types/navigation";

type CaregiverDashboardScreenProps = BottomTabScreenProps<CaregiverTabParamList, "Home">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const PRIMARY = "#F6A545";
const PRIMARY_DARK = "#8A520E";
const PRIMARY_LIGHT = "#FFF3E2";
const SECONDARY = "#F8C36A";
const SUCCESS = "#3A9D75";
const SUCCESS_LIGHT = "#E8F7F0";
const WARNING = "#D18425";
const WARNING_LIGHT = "#FFF3E1";
const DANGER = "#DC4C57";
const DANGER_LIGHT = "#FDEBED";
const BORDER = "#E4E8F2";
const AUTO_REFRESH_MS = 30_000;

const elevate = (level: 1 | 2 | 3 = 1) => ({
  elevation: level === 1 ? 2 : level === 2 ? 4 : 7,
  shadowColor: "#172033",
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
  shadowOpacity: level === 1 ? 0.06 : 0.1,
  shadowRadius: level === 1 ? 4 : 9,
});

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const getInitials = (name?: string | null) => {
  if (!name) return "CG";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CG";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const formatStatus = (value?: string | null) => {
  if (!value) return "No update";
  return value.toLowerCase().split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
};

const getVitalTone = (status?: string | null) => {
  if (status === "CRITICAL") return { background: DANGER_LIGHT, text: "#B42318", label: "Critical" };
  if (status === "WARNING") return { background: WARNING_LIGHT, text: "#9A5B12", label: "Warning" };
  if (status === "STABLE") return { background: SUCCESS_LIGHT, text: "#167A58", label: "Stable" };
  return { background: PRIMARY_LIGHT, text: PRIMARY_DARK, label: "No vitals" };
};

const getOrderTone = (status?: string | null) => {
  if (!status) return { background: "#EEF2F6", text: MUTED };
  if (["READY", "COMPLETED", "COLLECTED", "DELIVERED", "FULFILLED"].includes(status)) return { background: SUCCESS_LIGHT, text: "#167A58" };
  if (["CANCELLED", "REJECTED"].includes(status)) return { background: DANGER_LIGHT, text: "#B42318" };
  return { background: WARNING_LIGHT, text: "#9A5B12" };
};

export const CaregiverDashboardScreen = ({ navigation, route }: CaregiverDashboardScreenProps) => {
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof caregiverDashboardApi.getDashboard>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const caregiverName = dashboard?.caregiver.fullName || route.params?.user?.fullName || "Caregiver";
  const firstName = dashboard?.caregiver.firstName || caregiverName.split(" ")[0] || "Caregiver";
  const initials = getInitials(caregiverName);

  const resetToLogin = useCallback(async () => {
    await tokenStorage.removeToken();
    const rootNavigation = navigation.getParent();

    if (rootNavigation) {
      rootNavigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
      return;
    }

    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
  }, [navigation]);

  const loadDashboard = useCallback(async (mode: "initial" | "refresh" | "silent" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      if (mode !== "silent") setErrorMessage("");

      const data = await caregiverDashboardApi.getDashboard();
      setDashboard(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load dashboard.";
      if (mode !== "silent") setErrorMessage(message);
      if (message.toLowerCase().includes("login")) await resetToLogin();
    } finally {
      if (mode === "initial") setIsLoading(false);
      if (mode === "refresh") setIsRefreshing(false);
    }
  }, [resetToLogin]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard("initial");
      const interval = setInterval(() => void loadDashboard("silent"), AUTO_REFRESH_MS);
      return () => clearInterval(interval);
    }, [loadDashboard]),
  );

  useEffect(() => notificationEvents.subscribe(() => void loadDashboard("silent")), [loadDashboard]);

  const openRootScreen = (name: string, params?: Record<string, unknown>) => {
    const rootNavigation = navigation.getParent();

    if (!rootNavigation) {
      Alert.alert("Screen unavailable", "Please try again.");
      return;
    }

    rootNavigation.dispatch(CommonActions.navigate({ name, params }));
  };

  const openNotifications = () => openRootScreen("Notifications");

  const openProfile = () => {
    openRootScreen("CaregiverProfile", {
      user: {
        id: dashboard?.caregiver.id || route.params?.user?.id,
        fullName: dashboard?.caregiver.fullName || caregiverName,
        email: dashboard?.caregiver.email || route.params?.user?.email,
      },
    });
  };

  const openPatients = () => navigation.navigate("Patients");
  const openSafety = () => navigation.navigate("Safety");
  const openAppointments = () => navigation.navigate("Appointments");

  const needsAttention = useMemo(() => {
    return dashboard?.patients.filter(patient => patient.adherence.missedToday > 0 || patient.latestVital?.status === "CRITICAL" || Boolean(patient.safetyAlert) || patient.lowStock.count > 0) || [];
  }, [dashboard?.patients]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
            <Text style={styles.headerSubText}>Here’s today’s care overview</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.notificationCircle} activeOpacity={0.86} onPress={openNotifications}>
              <Bell size={20} color={PRIMARY_DARK} strokeWidth={2.5} />

              {(dashboard?.summary.unreadNotifications || 0) > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{(dashboard?.summary.unreadNotifications || 0) > 99 ? "99+" : dashboard?.summary.unreadNotifications}</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileCircle} activeOpacity={0.86} onPress={openProfile}>
              <Text style={styles.profileInitial}>{initials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 110, 132) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadDashboard("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading dashboard</Text>
              <Text style={styles.stateText}>Getting the latest updates.</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.stateCard}>
              <View style={styles.errorIcon}>
                <RefreshCw size={25} color={DANGER} strokeWidth={2.6} />
              </View>

              <Text style={styles.errorTitle}>Couldn't load dashboard</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>

              <TouchableOpacity style={styles.retryButton} activeOpacity={0.86} onPress={() => void loadDashboard("initial")}>
                <RefreshCw size={17} color={SURFACE} strokeWidth={2.5} />
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage && dashboard ? (
            <>
              <LinearGradient colors={[PRIMARY, SECONDARY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
                <View style={styles.heroTop}>
                  <View style={styles.heroIcon}>
                    <UsersRound size={25} color={PRIMARY_DARK} strokeWidth={2.6} />
                  </View>

                  <View style={styles.heroBadge}>
                    <ShieldCheck size={14} color={SURFACE} strokeWidth={2.4} />
                    <Text style={styles.heroBadgeText}>Care overview</Text>
                  </View>
                </View>

                <Text style={styles.heroTitle}>Your care circle</Text>
                <Text style={styles.heroText}>Linked patients at a glance.</Text>

                <View style={styles.heroStats}>
                  <HeroStat value={dashboard.summary.linkedPatients} label="Patients" />
                  <View style={styles.heroDivider} />
                  <HeroStat value={dashboard.summary.missedDosesToday} label="Missed" />
                  <View style={styles.heroDivider} />
                  <HeroStat value={dashboard.summary.unresolvedSafetyAlerts} label="Alerts" />
                </View>
              </LinearGradient>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsContent} style={styles.quickActions}>
                <QuickAction title="Patients" icon={<UsersRound size={23} color={PRIMARY_DARK} strokeWidth={2.5} />} badge={dashboard.summary.linkedPatients} onPress={openPatients} />
                <QuickAction title="Safety" icon={<ShieldAlert size={23} color={DANGER} strokeWidth={2.5} />} badge={dashboard.summary.unresolvedSafetyAlerts} danger onPress={openSafety} />
                <QuickAction title="Appointments" icon={<CalendarDays size={23} color={PRIMARY_DARK} strokeWidth={2.5} />} badge={dashboard.summary.activeConsultations} onPress={openAppointments} />
                <QuickAction title="Due soon" icon={<Clock3 size={23} color={WARNING} strokeWidth={2.5} />} badge={dashboard.summary.dosesDueSoon} onPress={openPatients} />
                <QuickAction title="Low stock" icon={<Pill size={23} color={WARNING} strokeWidth={2.5} />} badge={dashboard.summary.lowStockMedicines} onPress={openPatients} />
              </ScrollView>

              <SectionHeader title="Needs attention" subtitle="Important updates" action="Safety" onPress={openSafety} />

              {needsAttention.length ? (
                <View style={styles.cardStack}>
                  {needsAttention.slice(0, 3).map(patient => <PatientAttentionCard key={patient.relationshipId} patient={patient} onPress={openPatients} />)}
                </View>
              ) : (
                <TouchableOpacity style={styles.safeCard} activeOpacity={0.86} onPress={openPatients}>
                  <View style={styles.safeIcon}>
                    <ShieldCheck size={24} color={SUCCESS} strokeWidth={2.6} />
                  </View>

                  <View style={styles.safeTextBlock}>
                    <Text style={styles.safeTitle}>All clear</Text>
                    <Text style={styles.safeText}>No urgent updates right now.</Text>
                  </View>

                  <ChevronRight size={19} color={MUTED} strokeWidth={2.5} />
                </TouchableOpacity>
              )}

              <SectionHeader title="Linked patients" subtitle="Latest status" action="View all" onPress={openPatients} />

              {dashboard.patients.length ? (
                <View style={styles.cardStack}>
                  {dashboard.patients.slice(0, 3).map(patient => <LinkedPatientCard key={patient.relationshipId} patient={patient} onPress={openPatients} />)}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <UsersRound size={25} color={PRIMARY_DARK} strokeWidth={2.5} />
                  </View>

                  <Text style={styles.emptyTitle}>No linked patients</Text>
                  <Text style={styles.emptyText}>Approved patient links will appear here.</Text>
                </View>
              )}

              <SectionHeader title="Recent updates" subtitle="Latest notifications" action="View all" onPress={openNotifications} />

              {dashboard.recentNotifications.length ? (
                <View style={styles.cardStack}>
                  {dashboard.recentNotifications.slice(0, 4).map(notification => (
                    <TouchableOpacity key={notification.id} style={styles.notificationCard} activeOpacity={0.86} onPress={openNotifications}>
                      <View style={[styles.notificationIcon, !notification.isRead ? styles.notificationIconUnread : undefined]}>
                        {notification.priority === "CRITICAL" || notification.priority === "HIGH" ? (
                          <AlertTriangle size={20} color={DANGER} strokeWidth={2.5} />
                        ) : (
                          <Bell size={20} color={PRIMARY_DARK} strokeWidth={2.5} />
                        )}
                      </View>

                      <View style={styles.notificationTextBlock}>
                        <View style={styles.notificationTitleRow}>
                          <Text style={styles.notificationTitle} numberOfLines={1}>{notification.title}</Text>
                          {!notification.isRead ? <View style={styles.unreadDot} /> : null}
                        </View>

                        <Text style={styles.notificationBody} numberOfLines={2}>{notification.body}</Text>
                        <Text style={styles.notificationTime}>{formatDateTime(notification.createdAt)}</Text>
                      </View>

                      <ChevronRight size={18} color={MUTED} strokeWidth={2.4} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Bell size={24} color={PRIMARY_DARK} strokeWidth={2.5} />
                  </View>

                  <Text style={styles.emptyTitle}>No updates yet</Text>
                  <Text style={styles.emptyText}>New notifications will appear here.</Text>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const HeroStat = ({ value, label }: { value: number; label: string }) => (
  <View style={styles.heroStat}>
    <Text style={styles.heroStatValue}>{value}</Text>
    <Text style={styles.heroStatLabel}>{label}</Text>
  </View>
);

const QuickAction = ({ title, icon, badge, danger, onPress }: { title: string; icon: ReactNode; badge?: number; danger?: boolean; onPress: () => void }) => (
  <TouchableOpacity style={styles.quickAction} activeOpacity={0.86} onPress={onPress}>
    <View style={[styles.quickActionIcon, danger ? styles.quickActionDanger : undefined]}>
      {icon}

      {badge !== undefined && badge > 0 ? (
        <View style={styles.quickActionBadge}>
          <Text style={styles.quickActionBadgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </View>

    <Text style={styles.quickActionText} numberOfLines={1}>{title}</Text>
  </TouchableOpacity>
);

const SectionHeader = ({ title, subtitle, action, onPress }: { title: string; subtitle: string; action: string; onPress: () => void }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderText}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>

    <TouchableOpacity activeOpacity={0.8} hitSlop={8} onPress={onPress}>
      <Text style={styles.sectionLink}>{action}</Text>
    </TouchableOpacity>
  </View>
);

const PatientAttentionCard = ({ patient, onPress }: { patient: CaregiverDashboardPatient; onPress: () => void }) => {
  const critical = patient.latestVital?.status === "CRITICAL";

  const issueText = patient.safetyAlert
    ? `Safety alert · ${formatStatus(patient.safetyAlert.status)}`
    : critical
      ? "Critical vital reading"
      : patient.adherence.missedToday > 0
        ? `${patient.adherence.missedToday} missed dose${patient.adherence.missedToday === 1 ? "" : "s"}`
        : `${patient.lowStock.count} medicine${patient.lowStock.count === 1 ? "" : "s"} low`;

  return (
    <TouchableOpacity style={styles.attentionCard} activeOpacity={0.86} onPress={onPress}>
      <View style={styles.attentionIcon}>
        <AlertTriangle size={22} color={DANGER} strokeWidth={2.6} />
      </View>

      <View style={styles.patientTextBlock}>
        <Text style={styles.patientName}>{patient.patient.fullName}</Text>
        <Text style={styles.attentionText}>{issueText}</Text>
      </View>

      <ChevronRight size={19} color={MUTED} strokeWidth={2.5} />
    </TouchableOpacity>
  );
};

const LinkedPatientCard = ({ patient, onPress }: { patient: CaregiverDashboardPatient; onPress: () => void }) => {
  const vitalTone = getVitalTone(patient.latestVital?.status);
  const orderTone = getOrderTone(patient.pharmacyOrder?.status);

  const vitalText = patient.latestVital
    ? patient.latestVital.bpSystolic !== null && patient.latestVital.bpDiastolic !== null
      ? `BP ${patient.latestVital.bpSystolic}/${patient.latestVital.bpDiastolic}`
      : patient.latestVital.heartRate !== null
        ? `${patient.latestVital.heartRate} bpm`
        : "Reading available"
    : "No recent vital";

  return (
    <TouchableOpacity style={styles.patientCard} activeOpacity={0.86} onPress={onPress}>
      <View style={styles.patientHeader}>
        <View style={styles.patientAvatar}>
          <Text style={styles.patientAvatarText}>{getInitials(patient.patient.fullName)}</Text>
        </View>

        <View style={styles.patientTextBlock}>
          <Text style={styles.patientName}>{patient.patient.fullName}</Text>
          <Text style={styles.patientEmail} numberOfLines={1}>{patient.patient.email}</Text>
        </View>

        <ChevronRight size={19} color={MUTED} strokeWidth={2.5} />
      </View>

      <View style={styles.patientStatusRow}>
        <View style={[styles.statusChip, { backgroundColor: vitalTone.background }]}>
          <HeartPulse size={13} color={vitalTone.text} strokeWidth={2.5} />
          <Text style={[styles.statusChipText, { color: vitalTone.text }]}>{vitalTone.label}</Text>
        </View>

        {patient.adherence.missedToday > 0 ? (
          <View style={[styles.statusChip, { backgroundColor: DANGER_LIGHT }]}>
            <Clock3 size={13} color="#B42318" strokeWidth={2.5} />
            <Text style={[styles.statusChipText, { color: "#B42318" }]}>{patient.adherence.missedToday} missed</Text>
          </View>
        ) : null}

        {patient.adherence.dueSoon > 0 ? (
          <View style={[styles.statusChip, { backgroundColor: WARNING_LIGHT }]}>
            <Clock3 size={13} color="#9A5B12" strokeWidth={2.5} />
            <Text style={[styles.statusChipText, { color: "#9A5B12" }]}>{patient.adherence.dueSoon} due</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.patientDetailGrid}>
        <PatientDetail icon={<HeartPulse size={16} color={PRIMARY_DARK} strokeWidth={2.4} />} label="Latest vital" value={vitalText} />

        <PatientDetail
          icon={<ShieldAlert size={16} color={patient.safetyAlert ? DANGER : SUCCESS} strokeWidth={2.4} />}
          label="Safety"
          value={patient.safetyAlert ? formatStatus(patient.safetyAlert.status) : "No active alert"}
        />

        <PatientDetail
          icon={<CalendarDays size={16} color={PRIMARY_DARK} strokeWidth={2.4} />}
          label="Consultation"
          value={patient.consultation ? `${formatStatus(patient.consultation.status)}${patient.consultation.doctorName ? ` · ${patient.consultation.doctorName}` : ""}` : "None active"}
        />

        <PatientDetail
          icon={<PackageCheck size={16} color={PRIMARY_DARK} strokeWidth={2.4} />}
          label="Pharmacy"
          value={patient.pharmacyOrder ? `${patient.pharmacyOrder.orderNumber} · ${formatStatus(patient.pharmacyOrder.status)}` : "No recent order"}
          valueColor={patient.pharmacyOrder ? orderTone.text : undefined}
        />
      </View>

      {patient.lowStock.count > 0 ? (
        <View style={styles.lowStockPanel}>
          <Pill size={16} color={WARNING} strokeWidth={2.5} />
          <Text style={styles.lowStockText}>{patient.lowStock.count} medicine{patient.lowStock.count === 1 ? "" : "s"} running low</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const PatientDetail = ({ icon, label, value, valueColor }: { icon: ReactNode; label: string; value: string; valueColor?: string }) => (
  <View style={styles.patientDetail}>
    <View style={styles.patientDetailIcon}>{icon}</View>

    <View style={styles.patientDetailText}>
      <Text style={styles.patientDetailLabel}>{label}</Text>
      <Text style={[styles.patientDetailValue, valueColor ? { color: valueColor } : undefined]} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, flexDirection: "row", alignItems: "center" },
  headerLeft: { flex: 1, paddingRight: 8 },
  greeting: { color: TEXT, fontSize: 23, fontWeight: "700", letterSpacing: -0.3 },
  headerSubText: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
  notificationCircle: { width: 46, height: 46, borderRadius: 15, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 8, overflow: "visible", ...elevate(1) },
  notificationBadge: { position: "absolute", top: -4, right: -4, minWidth: 21, height: 21, borderRadius: 10.5, backgroundColor: DANGER, borderWidth: 2, borderColor: BACKGROUND, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, zIndex: 10, elevation: 10 },
  notificationBadgeText: { color: SURFACE, fontSize: 8, fontWeight: "800" },
  profileCircle: { width: 46, height: 46, borderRadius: 15, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", overflow: "hidden", ...elevate(1) },
  profileInitial: { color: PRIMARY_DARK, fontSize: 14, fontWeight: "800" },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 18, padding: 24, alignItems: "center", marginTop: 16, ...elevate(1) },
  stateTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 12 },
  stateText: { color: MUTED, fontSize: 13, fontWeight: "500", lineHeight: 19, textAlign: "center", marginTop: 6 },
  errorIcon: { width: 56, height: 56, borderRadius: 17, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  errorTitle: { color: TEXT, fontSize: 17, fontWeight: "700", marginTop: 12 },
  retryButton: { backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11, flexDirection: "row", alignItems: "center", marginTop: 16 },
  retryText: { color: SURFACE, fontSize: 13, fontWeight: "700", marginLeft: 7 },
  heroCard: { borderRadius: 18, padding: 18, overflow: "hidden", ...elevate(2) },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroIcon: { width: 52, height: 52, borderRadius: 15, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  heroBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  heroBadgeText: { color: SURFACE, fontSize: 11, fontWeight: "700", marginLeft: 6 },
  heroTitle: { color: SURFACE, fontSize: 24, fontWeight: "700", marginTop: 18 },
  heroText: { color: "#FFF9EE", fontSize: 13, fontWeight: "600", lineHeight: 20, marginTop: 5 },
  heroStats: { backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 14, flexDirection: "row", alignItems: "center", marginTop: 16, paddingVertical: 13 },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { color: SURFACE, fontSize: 21, fontWeight: "700" },
  heroStatLabel: { color: "#FFF9EE", fontSize: 10, fontWeight: "700", marginTop: 3, textAlign: "center" },
  heroDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.32)" },
  quickActions: { marginHorizontal: -16, marginTop: 12, overflow: "visible" },
  quickActionsContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  quickAction: { width: 82, alignItems: "center", marginRight: 8, overflow: "visible" },
  quickActionIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", overflow: "visible" },
  quickActionDanger: { backgroundColor: DANGER_LIGHT },
  quickActionBadge: { position: "absolute", top: -5, right: -5, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: DANGER, borderWidth: 2, borderColor: BACKGROUND, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, zIndex: 10, elevation: 10 },
  quickActionBadgeText: { color: SURFACE, fontSize: 9, fontWeight: "800" },
  quickActionText: { color: TEXT, fontSize: 11, fontWeight: "700", marginTop: 8, textAlign: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 20, marginBottom: 10 },
  sectionHeaderText: { flex: 1, paddingRight: 12 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "700" },
  sectionSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },
  sectionLink: { color: PRIMARY_DARK, fontSize: 12, fontWeight: "700" },
  cardStack: { gap: 10 },
  safeCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", ...elevate(1) },
  safeIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: SUCCESS_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  safeTextBlock: { flex: 1 },
  safeTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  safeText: { color: MUTED, fontSize: 11, fontWeight: "600", lineHeight: 17, marginTop: 3 },
  attentionCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", ...elevate(1) },
  attentionIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  patientTextBlock: { flex: 1 },
  patientName: { color: TEXT, fontSize: 14, fontWeight: "700" },
  patientEmail: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },
  attentionText: { color: "#B42318", fontSize: 12, fontWeight: "600", marginTop: 4 },
  patientCard: { backgroundColor: SURFACE, borderRadius: 17, padding: 15, ...elevate(1) },
  patientHeader: { flexDirection: "row", alignItems: "center" },
  patientAvatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  patientAvatarText: { color: PRIMARY_DARK, fontSize: 14, fontWeight: "800" },
  patientStatusRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, marginBottom: 4 },
  statusChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, flexDirection: "row", alignItems: "center", marginRight: 6, marginBottom: 6 },
  statusChipText: { fontSize: 10, fontWeight: "700", marginLeft: 4 },
  patientDetailGrid: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER, marginTop: 5, paddingTop: 10 },
  patientDetail: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  patientDetailIcon: { width: 30, alignItems: "center" },
  patientDetailText: { flex: 1, flexDirection: "row", alignItems: "center" },
  patientDetailLabel: { width: 86, color: MUTED, fontSize: 11, fontWeight: "600" },
  patientDetailValue: { flex: 1, color: TEXT, fontSize: 11, fontWeight: "700" },
  lowStockPanel: { backgroundColor: WARNING_LIGHT, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 9, flexDirection: "row", alignItems: "center", marginTop: 9 },
  lowStockText: { color: "#9A5B12", fontSize: 11, fontWeight: "700", marginLeft: 7 },
  notificationCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", ...elevate(1) },
  notificationIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  notificationIconUnread: { backgroundColor: DANGER_LIGHT },
  notificationTextBlock: { flex: 1 },
  notificationTitleRow: { flexDirection: "row", alignItems: "center" },
  notificationTitle: { flex: 1, color: TEXT, fontSize: 13, fontWeight: "700" },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: DANGER, marginLeft: 6 },
  notificationBody: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 16, marginTop: 3 },
  notificationTime: { color: "#98A1AD", fontSize: 10, fontWeight: "600", marginTop: 5 },
  emptyCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 20, alignItems: "center", ...elevate(1) },
  emptyIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emptyTitle: { color: TEXT, fontSize: 14, fontWeight: "700", textAlign: "center" },
  emptyText: { color: MUTED, fontSize: 11, fontWeight: "600", lineHeight: 17, textAlign: "center", marginTop: 4 },
});