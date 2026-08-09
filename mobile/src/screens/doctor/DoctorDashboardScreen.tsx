import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  HeartPulse,
  LogOut,
  MessageSquareText,
  Pill,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound,
  Video,
} from "lucide-react-native";

import { tokenStorage } from "../../services/tokenStorage";
import { notificationApi } from "../../services/notificationApi";
import { notificationEvents } from "../../services/notificationEvents";
import {
  doctorDashboardApi,
  type DoctorDashboardData,
  type DoctorDashboardPatient,
  type DoctorUpcomingConsultation,
  type DoctorUrgentAlert,
} from "../../services/doctor/doctorDashboardApi";
import { doctorReportsApi } from "../../services/doctor/doctorReportsApi";
import { doctorMedicineReviewsApi } from "../../services/doctor/doctorMedicineReviewsApi";
import type { DoctorTabParamList } from "../../types/navigation";

type DoctorDashboardScreenProps = BottomTabScreenProps<DoctorTabParamList, "Home">;

type DoctorQuickAction = {
  key: string;
  title: string;
  icon: ReactNode;
  badgeCount?: number;
  onPress: () => void;
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_SECONDARY = "#14B8A6";
const DOCTOR_DARK = "#134E4A";
const DOCTOR_LIGHT = "#E6FFFA";
const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";
const WARNING = "#F6A545";
const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const elevate = (level: 1 | 2 | 3 = 2) => {
  const elevation = level === 1 ? 2 : level === 2 ? 4 : 7;

  return {
    elevation,
    shadowColor: "#172033",
    shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
    shadowOpacity: level === 1 ? 0.06 : 0.1,
    shadowRadius: level === 1 ? 4 : 9,
  };
};

const getGreetingText = () => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) return "Good morning";
  if (currentHour < 18) return "Good afternoon";
  return "Good evening";
};

const getFirstName = (fullName?: string | null) => {
  if (!fullName) return "Doctor";
  return fullName.replace(/^Dr\.?\s*/i, "").trim().split(" ")[0] || "Doctor";
};

const getInitials = (name?: string | null) => {
  if (!name) return "DR";

  const parts = name.replace(/^Dr\.?\s*/i, "").trim().split(" ").filter(Boolean);

  if (parts.length === 0) return "DR";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not scheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getVitalTone = (status?: string | null) => {
  if (status === "CRITICAL") return { background: DANGER_LIGHT, text: "#B42318", label: "Critical" };
  if (status === "WARNING") return { background: "#FFF3E2", text: "#A85A13", label: "Warning" };
  if (status === "STABLE") return { background: SUCCESS_LIGHT, text: "#167A58", label: "Stable" };
  return { background: DOCTOR_LIGHT, text: DOCTOR_DARK, label: "No vitals" };
};

export const DoctorDashboardScreen = ({ navigation, route }: DoctorDashboardScreenProps) => {
  const insets = useSafeAreaInsets();

  const [dashboard, setDashboard] = useState<DoctorDashboardData | null>(null);
  const [pendingReportReviews, setPendingReportReviews] = useState(0);
  const [pendingPoolReviews, setPendingPoolReviews] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const routeUser = route.params?.user;
  const doctorName = dashboard?.doctor.fullName || routeUser?.fullName || "";
  const firstName = getFirstName(doctorName);
  const initials = getInitials(doctorName);

  const resetToLogin = useCallback(async () => {
    await tokenStorage.removeToken();

    const rootNavigation = navigation.getParent();

    if (rootNavigation) {
      rootNavigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
      return;
    }

    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
  }, [navigation]);

  const loadNotificationUnreadCount = useCallback(async () => {
    try {
      const result = await notificationApi.getUnreadCount();
      setNotificationUnreadCount(result.unreadCount || 0);
    } catch {
      setNotificationUnreadCount(0);
    }
  }, []);

  const loadDashboard = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
        setErrorMessage("");

        const [dashboardData, reportQueue, poolReviewQueue, notificationData] = await Promise.all([
          doctorDashboardApi.getDashboard(),
          doctorReportsApi.listReportQueue("PENDING").catch(() => null),
          doctorMedicineReviewsApi.listPoolReviews().catch(() => null),
          notificationApi.getUnreadCount().catch(() => ({ unreadCount: 0 })),
        ]);

        setDashboard(dashboardData);
        setPendingReportReviews(reportQueue?.summary?.pending || 0);
        setPendingPoolReviews(poolReviewQueue?.summary?.awaitingReview || 0);
        setNotificationUnreadCount(notificationData.unreadCount || 0);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load doctor dashboard.";
        setErrorMessage(message);
        setPendingReportReviews(0);
        setPendingPoolReviews(0);

        if (message.toLowerCase().includes("login")) await resetToLogin();
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [resetToLogin],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDashboard("initial");
    }, [loadDashboard]),
  );

  useEffect(() => {
    return notificationEvents.subscribe(() => {
      void loadNotificationUnreadCount();
    });
  }, [loadNotificationUnreadCount]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: resetToLogin },
    ]);
  };

  const openPatients = () => navigation.navigate("Patients");
  const openConsultations = () => navigation.navigate("Consultations");
  const openMedicineReviews = () => navigation.navigate("Reviews");
  const openAlerts = () => navigation.navigate("Alerts");

  const openRootScreen = (name: string) => {
    const rootNavigation = navigation.getParent();

    if (!rootNavigation) {
      Alert.alert("Unable to open screen", "This screen is not available right now.");
      return;
    }

    rootNavigation.dispatch(CommonActions.navigate({ name }));
  };

  const openNotifications = () => openRootScreen("Notifications");
  const openAvailability = () => openRootScreen("DoctorAvailability");
  const openPrescriptionPatients = () => openRootScreen("DoctorSelectPrescriptionPatient");
  const openNotePatients = () => openRootScreen("DoctorSelectNotePatient");
  const openReportReviews = () => openRootScreen("DoctorReportReviews");
  const openPoolReviews = () => openRootScreen("DoctorMedicineReviewPool");

  const openPatientDetail = (patient: DoctorDashboardPatient) => {
    const rootNavigation = navigation.getParent();

    if (!rootNavigation) {
      navigation.navigate("Patients");
      return;
    }

    rootNavigation.dispatch(
      CommonActions.navigate({
        name: "DoctorPatientDetail",
        params: {
          patientId: patient.patient.id,
          patientName: patient.patient.fullName,
        },
      }),
    );
  };

  const quickActions: DoctorQuickAction[] = [
    {
      key: "patients",
      title: "Patients",
      icon: <UsersRound size={23} color={DOCTOR_PRIMARY} strokeWidth={2.6} />,
      onPress: openPatients,
    },
    {
      key: "consultations",
      title: "Consults",
      icon: <Video size={23} color={DOCTOR_PRIMARY} strokeWidth={2.6} />,
      onPress: openConsultations,
    },
    {
      key: "availability",
      title: "Availability",
      icon: <CalendarDays size={23} color={DOCTOR_PRIMARY} strokeWidth={2.6} />,
      onPress: openAvailability,
    },
    {
      key: "reviews",
      title: "Reviews",
      icon: <Pill size={23} color={WARNING} strokeWidth={2.6} />,
      badgeCount: dashboard?.stats.pendingMedicineReviews,
      onPress: openMedicineReviews,
    },
    {
      key: "pool-reviews",
      title: "Pool Reviews",
      icon: <ShieldCheck size={23} color={DOCTOR_PRIMARY} strokeWidth={2.6} />,
      badgeCount: pendingPoolReviews,
      onPress: openPoolReviews,
    },
    {
      key: "reports",
      title: "Reports",
      icon: <FileText size={23} color={DANGER} strokeWidth={2.6} />,
      badgeCount: pendingReportReviews,
      onPress: openReportReviews,
    },
    {
      key: "prescribe",
      title: "Prescribe",
      icon: <ClipboardList size={23} color={DOCTOR_PRIMARY} strokeWidth={2.6} />,
      onPress: openPrescriptionPatients,
    },
    {
      key: "add-note",
      title: "Add Note",
      icon: <MessageSquareText size={23} color={DOCTOR_PRIMARY} strokeWidth={2.6} />,
      onPress: openNotePatients,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greetingText}>{getGreetingText()}, Dr {firstName}</Text>
            <Text style={styles.headerSubText}>{dashboard?.doctor.specialization || "Your care workspace is ready"}</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.notificationCircle} activeOpacity={0.86} onPress={openNotifications}>
              <Bell size={19} color={DOCTOR_PRIMARY} strokeWidth={2.6} />

              {notificationUnreadCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <View style={styles.profileCircle}>
              <Text style={styles.profileInitial}>{initials}</Text>
            </View>

            <TouchableOpacity style={styles.logoutCircle} activeOpacity={0.86} onPress={handleLogout}>
              <LogOut size={19} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 108, 132) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadDashboard("refresh")}
              tintColor={DOCTOR_PRIMARY}
              colors={[DOCTOR_PRIMARY]}
            />
          }
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={DOCTOR_PRIMARY} />
              <Text style={styles.stateText}>Loading doctor dashboard...</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIcon}>
                <RefreshCw size={26} color={DANGER} strokeWidth={2.7} />
              </View>

              <Text style={styles.errorTitle}>Unable to load dashboard</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity style={styles.retryButton} activeOpacity={0.86} onPress={() => void loadDashboard("initial")}>
                <RefreshCw size={17} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage && dashboard ? (
            <>
              <LinearGradient
                colors={[DOCTOR_PRIMARY, DOCTOR_SECONDARY]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroTopRow}>
                  <View style={styles.heroIcon}>
                    <Stethoscope size={25} color={DOCTOR_PRIMARY} strokeWidth={2.7} />
                  </View>

                  <View style={styles.heroBadge}>
                    <ShieldCheck size={14} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.heroBadgeText}>Verified Workspace</Text>
                  </View>
                </View>

                <Text style={styles.heroTitle}>Doctor Dashboard</Text>

                <Text style={styles.heroText}>
                  Monitor assigned patients, reports, prescriptions, safety alerts, consultations and medicine reviews from one place.
                </Text>

                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStatBox}>
                    <Text style={styles.heroStatValue}>{dashboard.stats.assignedPatients}</Text>
                    <Text style={styles.heroStatLabel}>Patients</Text>
                  </View>

                  <View style={styles.heroStatDivider} />

                  <View style={styles.heroStatBox}>
                    <Text style={styles.heroStatValue}>{dashboard.stats.activeAlerts}</Text>
                    <Text style={styles.heroStatLabel}>Active alerts</Text>
                  </View>

                  <View style={styles.heroStatDivider} />

                  <View style={styles.heroStatBox}>
                    <Text style={styles.heroStatValue}>{pendingPoolReviews}</Text>
                    <Text style={styles.heroStatLabel}>Pool reviews</Text>
                  </View>
                </View>
              </LinearGradient>

              <FlatList
                horizontal
                data={quickActions}
                keyExtractor={item => item.key}
                renderItem={({ item }) => (
                  <QuickAction title={item.title} icon={item.icon} badgeCount={item.badgeCount} onPress={item.onPress} />
                )}
                ItemSeparatorComponent={() => <View style={styles.quickActionSeparator} />}
                contentContainerStyle={styles.quickActionsContent}
                style={styles.quickActionsList}
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
              />

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Safety Response</Text>
                  <Text style={styles.sectionSubtitle}>Escalated alerts from assigned patients</Text>
                </View>

                <TouchableOpacity activeOpacity={0.8} onPress={openAlerts}>
                  <Text style={styles.sectionLink}>View all</Text>
                </TouchableOpacity>
              </View>

              {dashboard.urgentAlerts.length > 0 ? (
                <View style={styles.alertStack}>
                  {dashboard.urgentAlerts.map(alert => (
                    <UrgentAlertPanel key={alert.id} alert={alert} onOpen={openAlerts} onJoin={openAlerts} />
                  ))}
                </View>
              ) : (
                <TouchableOpacity style={styles.safePanel} activeOpacity={0.86} onPress={openAlerts}>
                  <View style={styles.safePanelIcon}>
                    <ShieldCheck size={23} color={SUCCESS} strokeWidth={2.6} />
                  </View>

                  <View style={styles.safePanelTextBlock}>
                    <Text style={styles.safePanelTitle}>No active alerts</Text>
                    <Text style={styles.safePanelText}>Critical Safety Response alerts will appear here when a patient escalates.</Text>
                  </View>

                  <ChevronRight size={19} color={MUTED} strokeWidth={2.5} />
                </TouchableOpacity>
              )}

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Upcoming Consultations</Text>
                  <Text style={styles.sectionSubtitle}>Manual and emergency consultation requests</Text>
                </View>

                <TouchableOpacity activeOpacity={0.8} onPress={openConsultations}>
                  <Text style={styles.sectionLink}>View all</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardStack}>
                {dashboard.upcomingConsultations.length > 0 ? (
                  dashboard.upcomingConsultations.map(consultation => (
                    <ConsultationCard key={consultation.id} consultation={consultation} onPress={openConsultations} />
                  ))
                ) : (
                  <EmptyCard
                    icon={<Video size={24} color={DOCTOR_PRIMARY} strokeWidth={2.5} />}
                    title="No consultations yet"
                    text="Consultation requests from assigned patients will appear here."
                  />
                )}
              </View>

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Recent Patients</Text>
                  <Text style={styles.sectionSubtitle}>Latest assigned patient records</Text>
                </View>

                <TouchableOpacity activeOpacity={0.8} onPress={openPatients}>
                  <Text style={styles.sectionLink}>View all</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardStack}>
                {dashboard.recentPatients.length > 0 ? (
                  dashboard.recentPatients.map(patient => (
                    <PatientCard key={patient.assignmentId} patient={patient} onPress={() => openPatientDetail(patient)} />
                  ))
                ) : (
                  <EmptyCard
                    icon={<UserRound size={24} color={DOCTOR_PRIMARY} strokeWidth={2.5} />}
                    title="No assigned patients"
                    text="Patients will appear here after they select you as their doctor."
                  />
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const QuickAction = ({ title, icon, badgeCount, onPress }: { title: string; icon: ReactNode; badgeCount?: number; onPress: () => void }) => (
  <TouchableOpacity style={styles.quickAction} activeOpacity={0.86} onPress={onPress}>
    <View style={styles.quickActionIcon}>
      {icon}

      {badgeCount !== undefined && badgeCount > 0 ? (
        <View style={styles.quickActionBadge}>
          <Text style={styles.quickActionBadgeText}>{badgeCount > 99 ? "99+" : badgeCount}</Text>
        </View>
      ) : null}
    </View>

    <Text style={styles.quickActionText} numberOfLines={1}>{title}</Text>
  </TouchableOpacity>
);

const UrgentAlertPanel = ({ alert, onOpen, onJoin }: { alert: DoctorUrgentAlert; onOpen: () => void; onJoin: () => void }) => {
  const patientName = alert.patient?.fullName || "Assigned patient";

  return (
    <View style={styles.urgentAlertCard}>
      <View style={styles.urgentHeader}>
        <View style={styles.urgentIconBox}>
          <AlertTriangle size={23} color={DANGER} strokeWidth={2.7} />
        </View>

        <View style={styles.urgentTitleBlock}>
          <Text style={styles.urgentTitle}>Critical Safety Alert</Text>
          <Text style={styles.urgentPatient}>{patientName}</Text>
        </View>

        <View style={styles.urgentBadge}>
          <Text style={styles.urgentBadgeText}>{alert.status}</Text>
        </View>
      </View>

      <View style={styles.alertMetricBox}>
        <HeartPulse size={17} color={DANGER} strokeWidth={2.5} />
        <Text style={styles.alertMetricText}>
          {alert.vitalSummary ? `${alert.vitalSummary.label}: ${alert.vitalSummary.value}` : "Critical reading needs review"}
        </Text>
      </View>

      <Text style={styles.urgentReason} numberOfLines={2}>{alert.reason}</Text>

      <View style={styles.alertFooter}>
        <View style={styles.timeRow}>
          <Clock3 size={14} color={MUTED} strokeWidth={2.4} />
          <Text style={styles.alertTime}>{formatDateTime(alert.createdAt)}</Text>
        </View>

        <View style={styles.alertButtons}>
          <TouchableOpacity style={styles.alertSecondaryButton} activeOpacity={0.86} onPress={onOpen}>
            <Text style={styles.alertSecondaryText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.alertPrimaryButton, !alert.canJoinCall ? styles.alertButtonDisabled : undefined]}
            activeOpacity={0.86}
            onPress={onJoin}
            disabled={!alert.canJoinCall}
          >
            <Text style={styles.alertPrimaryText}>{alert.canJoinCall ? "Join" : "No call"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const ConsultationCard = ({ consultation, onPress }: { consultation: DoctorUpcomingConsultation; onPress: () => void }) => {
  const isEmergency = consultation.type === "EMERGENCY";
  const patientName = consultation.patient?.fullName || "Assigned patient";

  return (
    <TouchableOpacity style={styles.listCard} activeOpacity={0.86} onPress={onPress}>
      <View style={[styles.listIconBox, isEmergency ? styles.listIconDanger : undefined]}>
        <Video size={21} color={isEmergency ? DANGER : DOCTOR_PRIMARY} strokeWidth={2.6} />
      </View>

      <View style={styles.listTextBlock}>
        <Text style={styles.listTitle}>{isEmergency ? "Emergency Consultation" : "Manual Consultation"}</Text>
        <Text style={styles.listSubtitle}>{patientName} • {formatDateTime(consultation.preferredAt || consultation.createdAt)}</Text>
      </View>

      <View style={styles.statusChip}>
        <Text style={styles.statusChipText}>{consultation.status.replace("_", " ")}</Text>
      </View>
    </TouchableOpacity>
  );
};

const PatientCard = ({ patient, onPress }: { patient: DoctorDashboardPatient; onPress: () => void }) => {
  const tone = getVitalTone(patient.latestVital?.status);

  return (
    <TouchableOpacity style={styles.listCard} activeOpacity={0.86} onPress={onPress}>
      <View style={styles.patientAvatar}>
        <Text style={styles.patientAvatarText}>{getInitials(patient.patient.fullName)}</Text>
      </View>

      <View style={styles.listTextBlock}>
        <Text style={styles.listTitle}>{patient.patient.fullName}</Text>
        <Text style={styles.listSubtitle}>{patient.activeMedicineCount} active medicine{patient.activeMedicineCount === 1 ? "" : "s"}</Text>
      </View>

      <View style={[styles.vitalChip, { backgroundColor: tone.background }]}>
        <Text style={[styles.vitalChipText, { color: tone.text }]}>{tone.label}</Text>
      </View>

      <ChevronRight size={18} color={MUTED} strokeWidth={2.5} />
    </TouchableOpacity>
  );
};

const EmptyCard = ({ icon, title, text }: { icon: ReactNode; title: string; text: string }) => (
  <View style={styles.emptyCard}>
    <View style={styles.emptyIcon}>{icon}</View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, flexDirection: "row", alignItems: "center" },
  headerLeft: { flex: 1 },
  greetingText: { color: TEXT, fontSize: 25, fontWeight: "700", letterSpacing: -0.4 },
  headerSubText: { color: MUTED, fontSize: 13, fontWeight: "600", marginTop: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", marginLeft: 12 },
  notificationCircle: { width: 46, height: 46, borderRadius: 15, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 8, overflow: "visible", ...elevate(1) },
  notificationBadge: { position: "absolute", top: -4, right: -4, minWidth: 21, height: 21, borderRadius: 8, backgroundColor: DANGER, borderWidth: 2, borderColor: BACKGROUND, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, zIndex: 10, elevation: 10 },
  notificationBadgeText: { color: SURFACE, fontSize: 8, fontWeight: "700" },
  profileCircle: { width: 46, height: 46, borderRadius: 15, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 8 },
  profileInitial: { color: DOCTOR_PRIMARY, fontSize: 15, fontWeight: "800" },
  logoutCircle: { width: 46, height: 46, borderRadius: 15, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", ...elevate(1) },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 22, alignItems: "center", marginTop: 12, ...elevate(1) },
  stateText: { color: MUTED, fontSize: 13, fontWeight: "600", marginTop: 10 },
  errorCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 22, alignItems: "center", marginTop: 12, ...elevate(1) },
  errorIcon: { width: 58, height: 58, borderRadius: 16, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  errorTitle: { color: TEXT, fontSize: 18, fontWeight: "700", textAlign: "center" },
  errorText: { color: MUTED, fontSize: 13, fontWeight: "600", lineHeight: 20, textAlign: "center", marginTop: 8 },
  retryButton: { backgroundColor: DOCTOR_PRIMARY, borderRadius: 13, paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center", marginTop: 16 },
  retryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", marginLeft: 8 },
  heroCard: { borderRadius: 16, padding: 18, overflow: "hidden", ...elevate(2) },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroIcon: { width: 52, height: 52, borderRadius: 15, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  heroBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  heroBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", marginLeft: 6 },
  heroTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "700", marginTop: 18 },
  heroText: { color: "#D7FFFA", fontSize: 13, fontWeight: "600", lineHeight: 20, marginTop: 6 },
  heroStatsRow: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 14, flexDirection: "row", alignItems: "center", marginTop: 16, paddingVertical: 13 },
  heroStatBox: { flex: 1, alignItems: "center" },
  heroStatValue: { color: "#FFFFFF", fontSize: 21, fontWeight: "700" },
  heroStatLabel: { color: "#D7FFFA", fontSize: 11, fontWeight: "700", marginTop: 3 },
  heroStatDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.25)" },
  quickActionsList: { marginTop: 12, marginHorizontal: -16, overflow: "visible" },
  quickActionsContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  quickActionSeparator: { width: 10 },
  quickAction: { width: 76, alignItems: "center", paddingTop: 2, overflow: "visible" },
  quickActionIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 8, overflow: "visible" },
  quickActionBadge: { position: "absolute", top: -5, right: -5, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: DANGER, borderWidth: 2, borderColor: BACKGROUND, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, zIndex: 10, elevation: 10 },
  quickActionBadgeText: { color: SURFACE, fontSize: 9, fontWeight: "700" },
  quickActionText: { color: TEXT, fontSize: 11, fontWeight: "700", textAlign: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 22, marginBottom: 10 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "700" },
  sectionSubtitle: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 3 },
  sectionLink: { color: DOCTOR_PRIMARY, fontSize: 13, fontWeight: "700" },
  alertStack: { gap: 12 },
  urgentAlertCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, ...elevate(2) },
  urgentHeader: { flexDirection: "row", alignItems: "center" },
  urgentIconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  urgentTitleBlock: { flex: 1 },
  urgentTitle: { color: "#B42318", fontSize: 15, fontWeight: "700" },
  urgentPatient: { color: TEXT, fontSize: 13, fontWeight: "700", marginTop: 3 },
  urgentBadge: { backgroundColor: DANGER_LIGHT, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  urgentBadgeText: { color: "#B42318", fontSize: 10, fontWeight: "700" },
  alertMetricBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF5F5", borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, marginTop: 12 },
  alertMetricText: { color: "#B42318", fontSize: 13, fontWeight: "700", marginLeft: 8, flex: 1 },
  urgentReason: { color: MUTED, fontSize: 12, fontWeight: "600", lineHeight: 18, marginTop: 10 },
  alertFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13 },
  timeRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  alertTime: { color: MUTED, fontSize: 11, fontWeight: "600", marginLeft: 5 },
  alertButtons: { flexDirection: "row", gap: 8 },
  alertSecondaryButton: { backgroundColor: DANGER_LIGHT, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9 },
  alertSecondaryText: { color: "#B42318", fontSize: 12, fontWeight: "700" },
  alertPrimaryButton: { backgroundColor: DANGER, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9 },
  alertButtonDisabled: { opacity: 0.55 },
  alertPrimaryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  safePanel: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", ...elevate(1) },
  safePanelIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: SUCCESS_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  safePanelTextBlock: { flex: 1 },
  safePanelTitle: { color: TEXT, fontSize: 15, fontWeight: "700" },
  safePanelText: { color: MUTED, fontSize: 12, fontWeight: "600", lineHeight: 18, marginTop: 3 },
  cardStack: { gap: 10 },
  listCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", ...elevate(1) },
  listIconBox: { width: 44, height: 44, borderRadius: 13, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  listIconDanger: { backgroundColor: DANGER_LIGHT },
  listTextBlock: { flex: 1 },
  listTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  listSubtitle: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 3 },
  statusChip: { backgroundColor: DOCTOR_LIGHT, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  statusChipText: { color: DOCTOR_DARK, fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  patientAvatar: { width: 44, height: 44, borderRadius: 13, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  patientAvatarText: { color: DOCTOR_PRIMARY, fontSize: 14, fontWeight: "800" },
  vitalChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginRight: 8 },
  vitalChipText: { fontSize: 10, fontWeight: "700" },
  emptyCard: { backgroundColor: SURFACE, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 22, alignItems: "center", ...elevate(1) },
  emptyIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 11 },
  emptyTitle: { color: TEXT, fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptyText: { color: MUTED, fontSize: 12, fontWeight: "600", lineHeight: 18, textAlign: "center", marginTop: 5 },
});