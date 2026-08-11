import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Modal, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { CompositeScreenProps } from "@react-navigation/native";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertTriangle, Bell, Building2, ChevronRight, Clock3, FileCheck2, Pill, RefreshCw, ScrollText, ShieldCheck, Stethoscope, UserCheck, Users, X } from "lucide-react-native";

import { API_BASE_URL } from "../../constants/api";
import { adminApi, type AdminAccountStatus, type AdminDashboardStats, type AdminDoctorVerification, type AdminEligibleMedicineReviewDoctor, type AdminMedicineReviewEscalation, type AdminMedicineReviewEscalationDetailResult, type AdminPharmacyVerification } from "../../services/adminApi";
import { tokenStorage } from "../../services/tokenStorage";
import { notificationApi } from "../../services/notificationApi";
import { notificationEvents } from "../../services/notificationEvents";
import type { AdminTabParamList, RootStackParamList } from "../../types/navigation";
import { getRoleHomeRoute, type AppUser } from "../../utils/roleNavigation";

type AdminDashboardScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, "Dashboard">,
  NativeStackScreenProps<RootStackParamList>
>;

const BACKGROUND = "#F3F1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#1D1B2F";
const MUTED = "#6D687B";
const ADMIN = "#6750D8";
const ADMIN_CONTAINER = "#EADDFF";
const ON_ADMIN_CONTAINER = "#21005D";
const DOCTOR = "#5B5FEF";
const DOCTOR_CONTAINER = "#E7E8FF";
const ON_DOCTOR_CONTAINER = "#20206F";
const PHARMACY = "#0F8B6F";
const PHARMACY_CONTAINER = "#DFF5EE";
const ON_PHARMACY_CONTAINER = "#064C3D";
const SUCCESS_CONTAINER = "#DBF3E7";
const ON_SUCCESS_CONTAINER = "#0F5C3C";
const WARNING_CONTAINER = "#FBE7CD";
const ON_WARNING_CONTAINER = "#7A4708";
const DANGER_CONTAINER = "#FBDADC";
const ON_DANGER_CONTAINER = "#8C1D24";

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: "#1B1D2A",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: { width: 0, height: level * 0.8 },
});

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong.";

const formatDate = (value?: string | null) => {
  if (!value) return "Recently";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "Recently";
  return parsedDate.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Recently";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "Recently";
  return parsedDate.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const getInitial = (value: string, fallback = "A") => {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue.charAt(0).toUpperCase() : fallback;
};

const getInitials = (value?: string | null) => {
  if (!value) return "AD";
  const parts = value.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "AD";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const getPatientReference = (patientId: string) => {
  const compactId = patientId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `CM-${compactId}`;
};

const getAvailabilityLabel = (status: AdminEligibleMedicineReviewDoctor["availabilityStatus"]) => {
  if (status === "AVAILABLE") return "Available";
  if (status === "UNAVAILABLE") return "No appointments";
  return "Schedule not set";
};

const getRequestTypeLabel = (requestType: AdminMedicineReviewEscalation["requestType"]) => requestType === "DELETE" ? "Removal review" : "Medicine review";

export const AdminDashboardScreen = ({ navigation }: AdminDashboardScreenProps) => {
  const insets = useSafeAreaInsets();

  const [adminUser, setAdminUser] = useState<AppUser | null>(null);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<AdminDoctorVerification[]>([]);
  const [pendingPharmacies, setPendingPharmacies] = useState<AdminPharmacyVerification[]>([]);
  const [medicineEscalations, setMedicineEscalations] = useState<AdminMedicineReviewEscalation[]>([]);
  const [poolAssignedReviews, setPoolAssignedReviews] = useState<AdminMedicineReviewEscalation[]>([]);
  const [completedPoolReviews, setCompletedPoolReviews] = useState<AdminMedicineReviewEscalation[]>([]);
  const [selectedEscalation, setSelectedEscalation] = useState<AdminMedicineReviewEscalationDetailResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingEscalation, setIsLoadingEscalation] = useState(false);
  const [assigningDoctorId, setAssigningDoctorId] = useState<string | null>(null);
  const [releasingRequestId, setReleasingRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

  const totalPendingApprovals = (stats?.pendingDoctors || 0) + (stats?.pendingPharmacies || 0) + (stats?.pendingMedicineReviewEscalations || 0) + (stats?.completedMedicineReviewPoolReviews || 0);

  const approvalRate = useMemo(() => {
    const totalProfessionals = (stats?.totalDoctors || 0) + (stats?.totalPharmacies || 0);
    const totalApproved = (stats?.approvedDoctors || 0) + (stats?.approvedPharmacies || 0);
    if (totalProfessionals === 0) return 0;
    return Math.round((totalApproved / totalProfessionals) * 100);
  }, [stats?.approvedDoctors, stats?.approvedPharmacies, stats?.totalDoctors, stats?.totalPharmacies]);

  const resetToLogin = useCallback(async () => {
    await tokenStorage.removeToken();

    navigation.dispatch(CommonActions.reset({
      index: 0,
      routes: [{ name: "Login" }],
    }));
  }, [navigation]);

  const resetToCorrectRole = useCallback(async (user: AppUser) => {
    const roleRoute = getRoleHomeRoute(user);

    if (!roleRoute) {
      await resetToLogin();
      return;
    }

    navigation.dispatch(CommonActions.reset({
      index: 0,
      routes: [roleRoute as any],
    }));
  }, [navigation, resetToLogin]);

  const ensureAdminAccess = useCallback(async () => {
    const token = await tokenStorage.getToken();

    if (!token) {
      await resetToLogin();
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await response.json();

    if (!response.ok || !result.success || !result.data?.user) {
      await resetToLogin();
      return false;
    }

    const currentUser = result.data.user as AppUser;

    if (currentUser.role !== "ADMIN") {
      await resetToCorrectRole(currentUser);
      return false;
    }

    setAdminUser(currentUser);
    return true;
  }, [resetToCorrectRole, resetToLogin]);

  const loadNotificationUnreadCount = useCallback(async () => {
    try {
      const result = await notificationApi.getUnreadCount();
      setNotificationUnreadCount(result.unreadCount || 0);
    } catch {
      setNotificationUnreadCount(0);
    }
  }, []);

  const loadAdminData = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);

      setErrorMessage("");

      const hasAdminAccess = await ensureAdminAccess();
      if (!hasAdminAccess) return;

      const [dashboardData, doctorListData, pharmacyListData, escalationData, poolAssignedData, completedPoolData, notificationData] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.listDoctorVerifications("PENDING_VERIFICATION"),
        adminApi.listPharmacyVerifications("PENDING_VERIFICATION"),
        adminApi.listMedicineReviewEscalations(),
        adminApi.listMedicineReviewPoolAssignments(),
        adminApi.listCompletedMedicineReviewPoolReviews(),
        notificationApi.getUnreadCount().catch(() => ({ unreadCount: 0 })),
      ]);

      setStats(dashboardData.stats);
      setPendingDoctors(doctorListData.doctors);
      setPendingPharmacies(pharmacyListData.pharmacies);
      setMedicineEscalations(escalationData.requests);
      setPoolAssignedReviews(poolAssignedData.requests);
      setCompletedPoolReviews(completedPoolData.requests);
      setNotificationUnreadCount(notificationData.unreadCount || 0);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [ensureAdminAccess]);

  useFocusEffect(useCallback(() => { void loadAdminData("initial"); }, [loadAdminData]));

  useEffect(() => {
    return notificationEvents.subscribe(() => {
      void loadNotificationUnreadCount();
    });
  }, [loadNotificationUnreadCount]);

  const openEscalation = async (requestId: string) => {
    try {
      setIsLoadingEscalation(true);
      const result = await adminApi.getMedicineReviewEscalation(requestId);
      setSelectedEscalation(result);
    } catch (error) {
      Alert.alert("Unable to open review", getErrorMessage(error));
    } finally {
      setIsLoadingEscalation(false);
    }
  };

  const assignEscalation = async (doctor: AdminEligibleMedicineReviewDoctor) => {
    if (!selectedEscalation || assigningDoctorId) return;

    Alert.alert(
      "Assign pool review",
      `Send ${selectedEscalation.request.medicine.name} to ${doctor.fullName} through the Medicine Review Doctor Pool? This will not assign the patient to the doctor.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Assign",
          onPress: async () => {
            try {
              setAssigningDoctorId(doctor.id);

              await adminApi.assignMedicineReviewEscalation(selectedEscalation.request.id, doctor.id);

              setSelectedEscalation(null);

              Alert.alert("Review assigned", `${doctor.fullName} now has restricted access to this medicine review only.`);

              await loadAdminData("refresh");
            } catch (error) {
              Alert.alert("Unable to assign review", getErrorMessage(error));
            } finally {
              setAssigningDoctorId(null);
            }
          },
        },
      ]
    );
  };

  const releasePoolResult = (request: AdminMedicineReviewEscalation) => {
    if (!request.poolDecision || releasingRequestId) return;

    const decisionText = request.poolDecision === "APPROVED" ? "approved" : "rejected";

    Alert.alert(
      "Release to patient",
      `Release the ${decisionText} ${request.medicine.name} review result to the patient?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Release",
          onPress: async () => {
            try {
              setReleasingRequestId(request.id);
              await adminApi.releaseMedicineReviewPoolResult(request.id);

              Alert.alert("Result released", "The medicine review result is now available to the patient.");

              await loadAdminData("refresh");
            } catch (error) {
              Alert.alert("Unable to release result", getErrorMessage(error));
            } finally {
              setReleasingRequestId(null);
            }
          },
        },
      ]
    );
  };

  const openNotifications = () => navigation.navigate("Notifications");
  const openProfile = () => navigation.navigate("AdminProfile");
  const openDoctorDetail = (doctorId: string) => navigation.navigate("AdminDoctorVerificationDetail", { doctorId });
  const openPharmacyDetail = (pharmacyId: string) => navigation.navigate("AdminPharmacyVerificationDetail", { pharmacyId });
  const openDoctorTab = (status: AdminAccountStatus = "PENDING_VERIFICATION") => navigation.navigate("Doctors", { status });
  const openPharmacyTab = (status: AdminAccountStatus = "PENDING_VERIFICATION") => navigation.navigate("Pharmacies", { status });
  const openUsersTab = (status: "ALL" | AdminAccountStatus = "ALL") => navigation.navigate("Users", { status });
  const openAuditLogs = () => navigation.navigate("AdminAuditLogs");

  const renderStatCard = ({ label, value, helper, icon, backgroundColor, textColor, onPress }: {
    label: string;
    value: number;
    helper: string;
    icon: ReactNode;
    backgroundColor: string;
    textColor: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity style={styles.statCard} activeOpacity={onPress ? 0.86 : 1} onPress={onPress} disabled={!onPress}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIconBox, { backgroundColor }]}>{icon}</View>
        <View style={[styles.statStatusDot, { backgroundColor: textColor }]} />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statHelper}>{helper}</Text>
    </TouchableOpacity>
  );

  const renderDoctorCard = (doctor: AdminDoctorVerification) => (
    <TouchableOpacity key={doctor.id} style={styles.approvalCard} activeOpacity={0.86} onPress={() => openDoctorDetail(doctor.id)}>
      <View style={[styles.cardAccent, { backgroundColor: DOCTOR }]} />

      <View style={[styles.avatar, { backgroundColor: DOCTOR_CONTAINER }]}>
        <Text style={[styles.avatarText, { color: ON_DOCTOR_CONTAINER }]}>{getInitial(doctor.fullName, "D")}</Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={1}>{doctor.fullName}</Text>

          <View style={styles.pendingChip}>
            <Clock3 size={11} color={ON_WARNING_CONTAINER} strokeWidth={2.5} />
            <Text style={styles.pendingChipText}>Pending</Text>
          </View>
        </View>

        <Text style={styles.cardMeta} numberOfLines={1}>{doctor.profile?.specialization || "Doctor verification"}</Text>

        <View style={styles.cardFooter}>
          <View style={[styles.documentChip, { backgroundColor: DOCTOR_CONTAINER }]}>
            <FileCheck2 size={12} color={ON_DOCTOR_CONTAINER} strokeWidth={2.4} />
            <Text style={[styles.documentChipText, { color: ON_DOCTOR_CONTAINER }]}>Doctor docs</Text>
          </View>

          <Text style={styles.dateText}>{formatDate(doctor.submittedAt)}</Text>
        </View>
      </View>

      <View style={[styles.chevronBox, { backgroundColor: DOCTOR_CONTAINER }]}>
        <ChevronRight size={18} color={DOCTOR} strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );

  const renderPharmacyCard = (pharmacy: AdminPharmacyVerification) => {
    const displayName = pharmacy.profile?.pharmacyName || pharmacy.fullName;

    return (
      <TouchableOpacity key={pharmacy.id} style={styles.approvalCard} activeOpacity={0.86} onPress={() => openPharmacyDetail(pharmacy.id)}>
        <View style={[styles.cardAccent, { backgroundColor: PHARMACY }]} />

        <View style={[styles.avatar, { backgroundColor: PHARMACY_CONTAINER }]}>
          <Text style={[styles.avatarText, { color: ON_PHARMACY_CONTAINER }]}>{getInitial(displayName, "P")}</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardName} numberOfLines={1}>{displayName}</Text>

            <View style={styles.pendingChip}>
              <Clock3 size={11} color={ON_WARNING_CONTAINER} strokeWidth={2.5} />
              <Text style={styles.pendingChipText}>Pending</Text>
            </View>
          </View>

          <Text style={styles.cardMeta} numberOfLines={1}>
            {pharmacy.profile?.city || "Pharmacy verification"} {pharmacy.profile?.postcode ? `• ${pharmacy.profile.postcode}` : ""}
          </Text>

          <View style={styles.cardFooter}>
            <View style={[styles.documentChip, { backgroundColor: PHARMACY_CONTAINER }]}>
              <FileCheck2 size={12} color={ON_PHARMACY_CONTAINER} strokeWidth={2.4} />
              <Text style={[styles.documentChipText, { color: ON_PHARMACY_CONTAINER }]}>Licence docs</Text>
            </View>

            <Text style={styles.dateText}>{formatDate(pharmacy.submittedAt)}</Text>
          </View>
        </View>

        <View style={[styles.chevronBox, { backgroundColor: PHARMACY_CONTAINER }]}>
          <ChevronRight size={18} color={PHARMACY} strokeWidth={2.5} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderAwaitingPoolCard = (request: AdminMedicineReviewEscalation) => (
    <TouchableOpacity key={request.id} style={styles.poolCard} activeOpacity={0.86} onPress={() => void openEscalation(request.id)}>
      <View style={[styles.poolIconBox, { backgroundColor: WARNING_CONTAINER }]}>
        <Pill size={21} color={ON_WARNING_CONTAINER} strokeWidth={2.5} />
      </View>

      <View style={styles.poolCardContent}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={1}>{request.medicine.name}</Text>

          <View style={[styles.statusChip, { backgroundColor: WARNING_CONTAINER }]}>
            <Text style={[styles.statusChipText, { color: ON_WARNING_CONTAINER }]}>Awaiting</Text>
          </View>
        </View>

        <Text style={styles.cardMeta}>{request.medicine.dose} • {getRequestTypeLabel(request.requestType)}</Text>
        <Text style={styles.poolReference}>{getPatientReference(request.patientId)}</Text>
        <Text style={styles.poolDetail}>{request.attemptedDoctorIds.length} assigned doctor{request.attemptedDoctorIds.length === 1 ? "" : "s"} attempted</Text>
        <Text style={styles.dateText}>Escalated {formatDateTime(request.escalatedAt)}</Text>
      </View>

      <View style={styles.auditChevron}><ChevronRight size={19} color={ADMIN} strokeWidth={2.5} /></View>
    </TouchableOpacity>
  );

  const renderAssignedPoolCard = (request: AdminMedicineReviewEscalation) => (
    <View key={request.id} style={styles.poolCard}>
      <View style={[styles.poolIconBox, { backgroundColor: DOCTOR_CONTAINER }]}>
        <Stethoscope size={21} color={DOCTOR} strokeWidth={2.5} />
      </View>

      <View style={styles.poolCardContent}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={1}>{request.medicine.name}</Text>

          <View style={[styles.statusChip, { backgroundColor: DOCTOR_CONTAINER }]}>
            <Text style={[styles.statusChipText, { color: ON_DOCTOR_CONTAINER }]}>With doctor</Text>
          </View>
        </View>

        <Text style={styles.cardMeta}>{request.medicine.dose} • {getPatientReference(request.patientId)}</Text>
        <Text style={styles.poolDoctorText}>Reviewing: {request.poolDoctor?.fullName || "Pool doctor"}</Text>
        <Text style={styles.poolDetail}>Restricted medicine-review access only</Text>
        <Text style={styles.dateText}>Assigned {formatDateTime(request.poolAssignedAt)}</Text>
      </View>
    </View>
  );

  const renderCompletedPoolCard = (request: AdminMedicineReviewEscalation) => {
    const approved = request.poolDecision === "APPROVED";
    const isReleasing = releasingRequestId === request.id;

    return (
      <View key={request.id} style={styles.completedPoolCard}>
        <View style={styles.completedPoolTop}>
          <View style={[styles.poolIconBox, { backgroundColor: approved ? SUCCESS_CONTAINER : DANGER_CONTAINER }]}>
            <FileCheck2 size={21} color={approved ? ON_SUCCESS_CONTAINER : ON_DANGER_CONTAINER} strokeWidth={2.5} />
          </View>

          <View style={styles.poolCardContent}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardName} numberOfLines={1}>{request.medicine.name}</Text>

              <View style={[styles.statusChip, { backgroundColor: approved ? SUCCESS_CONTAINER : DANGER_CONTAINER }]}>
                <Text style={[styles.statusChipText, { color: approved ? ON_SUCCESS_CONTAINER : ON_DANGER_CONTAINER }]}>
                  {approved ? "Approved" : "Rejected"}
                </Text>
              </View>
            </View>

            <Text style={styles.cardMeta}>{request.medicine.dose} • {getPatientReference(request.patientId)}</Text>
            <Text style={styles.poolDoctorText}>Reviewed by {request.poolDoctor?.fullName || "Pool doctor"}</Text>

            {request.poolDoctorNote ? (
              <View style={styles.reviewNoteBox}>
                <Text style={styles.reviewNoteLabel}>Doctor note</Text>
                <Text style={styles.reviewNoteText}>{request.poolDoctorNote}</Text>
              </View>
            ) : null}

            <Text style={styles.dateText}>Completed {formatDateTime(request.poolReviewedAt)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.releaseButton} activeOpacity={0.84} disabled={Boolean(releasingRequestId)} onPress={() => releasePoolResult(request)}>
          {isReleasing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.releaseButtonText}>Release to patient</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.headerIdentity}>
            <View style={styles.adminIconBox}>
              <ShieldCheck size={22} color={ON_ADMIN_CONTAINER} strokeWidth={2.4} />
            </View>

            <View style={styles.headerTextBlock}>
              <Text style={styles.kicker}>Admin console</Text>
              <Text style={styles.title}>Control centre</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={openNotifications} activeOpacity={0.82}>
              <Bell size={20} color={ADMIN} strokeWidth={2.4} />

              {notificationUnreadCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileButton} onPress={openProfile} activeOpacity={0.82}>
              <Text style={styles.profileButtonText}>{getInitials(adminUser?.fullName)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 96, 120) }]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadAdminData("refresh")} tintColor={ADMIN} colors={[ADMIN]} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconBox}><FileCheck2 size={24} color="#FFFFFF" strokeWidth={2.4} /></View>
              <View style={styles.heroPendingPill}><Text style={styles.heroPendingText}>{totalPendingApprovals} pending</Text></View>
            </View>

            <Text style={styles.heroTitle}>Admin verification hub</Text>

            <Text style={styles.heroSubtitle}>
              Review professional accounts and coordinate medicine-review escalations from one secure admin console.
            </Text>

            <View style={styles.heroFooterRow}>
              <View style={styles.heroFooterItem}>
                <Text style={styles.heroFooterValue}>{(stats?.totalDoctors || 0) + (stats?.totalPharmacies || 0)}</Text>
                <Text style={styles.heroFooterLabel}>Professionals</Text>
              </View>

              <View style={styles.heroFooterDivider} />

              <View style={styles.heroFooterItem}>
                <Text style={styles.heroFooterValue}>{approvalRate}%</Text>
                <Text style={styles.heroFooterLabel}>Approved</Text>
              </View>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={ADMIN} />
              <Text style={styles.loadingText}>Loading admin dashboard...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIconBox}><RefreshCw size={24} color={ON_DANGER_CONTAINER} strokeWidth={2.5} /></View>
              <Text style={styles.errorTitle}>Unable to load dashboard</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity style={styles.retryButton} onPress={() => void loadAdminData("initial")} activeOpacity={0.86}>
                <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <Text style={styles.sectionMeta}>Tap cards to open</Text>
              </View>

              <View style={styles.statsGrid}>
                {renderStatCard({
                  label: "Users",
                  value: stats?.totalUsers || 0,
                  helper: "Registered",
                  backgroundColor: ADMIN_CONTAINER,
                  textColor: ADMIN,
                  onPress: () => openUsersTab("ALL"),
                  icon: <Users size={19} color={ON_ADMIN_CONTAINER} strokeWidth={2.4} />,
                })}

                {renderStatCard({
                  label: "Active Doctors",
                  value: stats?.approvedDoctors || 0,
                  helper: "Approved accounts",
                  backgroundColor: DOCTOR_CONTAINER,
                  textColor: DOCTOR,
                  onPress: () => openDoctorTab("ACTIVE"),
                  icon: <Stethoscope size={19} color={ON_DOCTOR_CONTAINER} strokeWidth={2.4} />,
                })}

                {renderStatCard({
                  label: "Active Pharmacies",
                  value: stats?.approvedPharmacies || 0,
                  helper: "Approved accounts",
                  backgroundColor: PHARMACY_CONTAINER,
                  textColor: PHARMACY,
                  onPress: () => openPharmacyTab("ACTIVE"),
                  icon: <Building2 size={19} color={ON_PHARMACY_CONTAINER} strokeWidth={2.4} />,
                })}

                {renderStatCard({
                  label: "Disabled",
                  value: stats?.disabledUsers || 0,
                  helper: "Suspended",
                  backgroundColor: DANGER_CONTAINER,
                  textColor: ON_DANGER_CONTAINER,
                  onPress: () => openUsersTab("DISABLED"),
                  icon: <ShieldCheck size={19} color={ON_DANGER_CONTAINER} strokeWidth={2.4} />,
                })}
              </View>

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Medicine Review Doctor Pool</Text>
                  <Text style={styles.sectionDescription}>Controlled escalation and release</Text>
                </View>

                <View style={styles.escalationCountChip}>
                  <Pill size={12} color={ON_ADMIN_CONTAINER} strokeWidth={2.5} />
                  <Text style={styles.poolCountText}>{medicineEscalations.length + poolAssignedReviews.length + completedPoolReviews.length}</Text>
                </View>
              </View>

              <View style={styles.poolSummaryRow}>
                <View style={[styles.poolSummaryItem, { backgroundColor: WARNING_CONTAINER }]}>
                  <Text style={[styles.poolSummaryValue, { color: ON_WARNING_CONTAINER }]}>{medicineEscalations.length}</Text>
                  <Text style={[styles.poolSummaryLabel, { color: ON_WARNING_CONTAINER }]}>Awaiting</Text>
                </View>

                <View style={[styles.poolSummaryItem, { backgroundColor: DOCTOR_CONTAINER }]}>
                  <Text style={[styles.poolSummaryValue, { color: ON_DOCTOR_CONTAINER }]}>{poolAssignedReviews.length}</Text>
                  <Text style={[styles.poolSummaryLabel, { color: ON_DOCTOR_CONTAINER }]}>With doctor</Text>
                </View>

                <View style={[styles.poolSummaryItem, { backgroundColor: SUCCESS_CONTAINER }]}>
                  <Text style={[styles.poolSummaryValue, { color: ON_SUCCESS_CONTAINER }]}>{completedPoolReviews.length}</Text>
                  <Text style={[styles.poolSummaryLabel, { color: ON_SUCCESS_CONTAINER }]}>To release</Text>
                </View>
              </View>

              <View style={styles.poolSubHeader}>
                <Text style={styles.poolSubTitle}>Awaiting assignment</Text>
                <Text style={styles.poolSubMeta}>{medicineEscalations.length}</Text>
              </View>

              {medicineEscalations.length > 0 ? (
                <View style={styles.approvalList}>{medicineEscalations.slice(0, 5).map(renderAwaitingPoolCard)}</View>
              ) : (
                <View style={styles.compactEmptyCard}>
                  <UserCheck size={21} color={ON_SUCCESS_CONTAINER} strokeWidth={2.4} />
                  <View style={styles.compactEmptyContent}>
                    <Text style={styles.compactEmptyTitle}>Nothing awaiting assignment</Text>
                    <Text style={styles.compactEmptyText}>Escalated medicine reviews will appear here.</Text>
                  </View>
                </View>
              )}

              <View style={styles.poolSubHeader}>
                <Text style={styles.poolSubTitle}>With doctor</Text>
                <Text style={styles.poolSubMeta}>{poolAssignedReviews.length}</Text>
              </View>

              {poolAssignedReviews.length > 0 ? (
                <View style={styles.approvalList}>{poolAssignedReviews.slice(0, 5).map(renderAssignedPoolCard)}</View>
              ) : (
                <View style={styles.compactEmptyCard}>
                  <Clock3 size={21} color={DOCTOR} strokeWidth={2.4} />
                  <View style={styles.compactEmptyContent}>
                    <Text style={styles.compactEmptyTitle}>No pool reviews in progress</Text>
                    <Text style={styles.compactEmptyText}>Assigned pool reviews will appear here while a doctor reviews them.</Text>
                  </View>
                </View>
              )}

              <View style={styles.poolSubHeader}>
                <Text style={styles.poolSubTitle}>Completed reviews</Text>
                <Text style={styles.poolSubMeta}>{completedPoolReviews.length}</Text>
              </View>

              {completedPoolReviews.length > 0 ? (
                <View style={styles.approvalList}>{completedPoolReviews.slice(0, 5).map(renderCompletedPoolCard)}</View>
              ) : (
                <View style={styles.compactEmptyCard}>
                  <FileCheck2 size={21} color={ON_SUCCESS_CONTAINER} strokeWidth={2.4} />
                  <View style={styles.compactEmptyContent}>
                    <Text style={styles.compactEmptyTitle}>No results waiting for release</Text>
                    <Text style={styles.compactEmptyText}>Completed doctor reviews will return here before the patient sees them.</Text>
                  </View>
                </View>
              )}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Security & governance</Text>
                <Text style={styles.sectionMeta}>Admin only</Text>
              </View>

              <TouchableOpacity style={styles.auditCard} activeOpacity={0.86} onPress={openAuditLogs}>
                <View style={styles.auditIconBox}><ScrollText size={23} color={ON_ADMIN_CONTAINER} strokeWidth={2.4} /></View>
                <View style={styles.auditContent}>
                  <Text style={styles.auditTitle}>Audit logs</Text>
                  <Text style={styles.auditText}>Review clinical actions, account decisions and security activity.</Text>
                </View>
                <View style={styles.auditChevron}><ChevronRight size={19} color={ADMIN} strokeWidth={2.5} /></View>
              </TouchableOpacity>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Doctor approvals</Text>
                <TouchableOpacity activeOpacity={0.82} onPress={() => openDoctorTab("PENDING_VERIFICATION")}>
                  <Text style={styles.sectionLink}>View all {pendingDoctors.length}</Text>
                </TouchableOpacity>
              </View>

              {pendingDoctors.length > 0 ? (
                <View style={styles.approvalList}>{pendingDoctors.slice(0, 3).map(renderDoctorCard)}</View>
              ) : (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconBox}><ShieldCheck size={26} color={ON_SUCCESS_CONTAINER} strokeWidth={2.4} /></View>
                  <Text style={styles.emptyTitle}>No pending doctors</Text>
                  <Text style={styles.emptyText}>New doctor verification requests will appear here after signup.</Text>
                </View>
              )}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pharmacy approvals</Text>
                <TouchableOpacity activeOpacity={0.82} onPress={() => openPharmacyTab("PENDING_VERIFICATION")}>
                  <Text style={styles.sectionLink}>View all {pendingPharmacies.length}</Text>
                </TouchableOpacity>
              </View>

              {pendingPharmacies.length > 0 ? (
                <View style={styles.approvalList}>{pendingPharmacies.slice(0, 3).map(renderPharmacyCard)}</View>
              ) : (
                <View style={styles.emptyCard}>
                  <View style={[styles.emptyIconBox, { backgroundColor: PHARMACY_CONTAINER }]}>
                    <Building2 size={26} color={ON_PHARMACY_CONTAINER} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.emptyTitle}>No pending pharmacies</Text>
                  <Text style={styles.emptyText}>Pharmacy verification requests will appear here after signup.</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      <Modal
        visible={Boolean(selectedEscalation) || isLoadingEscalation}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!assigningDoctorId) setSelectedEscalation(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(18, insets.bottom + 12) }]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalKicker}>Medicine Review Doctor Pool</Text>
                <Text style={styles.modalTitle}>Select review doctor</Text>
              </View>

              <TouchableOpacity style={styles.modalClose} activeOpacity={0.82} disabled={Boolean(assigningDoctorId)} onPress={() => setSelectedEscalation(null)}>
                <X size={20} color={TEXT} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {isLoadingEscalation ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={ADMIN} />
                <Text style={styles.loadingText}>Loading eligible doctors...</Text>
              </View>
            ) : selectedEscalation ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.reviewSummaryCard}>
                  <View style={styles.reviewMedicineIcon}><Pill size={22} color={ON_WARNING_CONTAINER} strokeWidth={2.5} /></View>

                  <View style={styles.reviewSummaryContent}>
                    <Text style={styles.reviewMedicineName}>{selectedEscalation.request.medicine.name}</Text>
                    <Text style={styles.reviewPatientName}>{getPatientReference(selectedEscalation.request.patientId)}</Text>
                    <Text style={styles.reviewMeta}>
                      {selectedEscalation.request.medicine.dose}
                      {selectedEscalation.request.medicine.frequency ? ` • ${selectedEscalation.request.medicine.frequency.replace(/_/g, " ")}` : ""}
                    </Text>
                  </View>
                </View>

                <View style={styles.privacyNotice}>
                  <ShieldCheck size={18} color={ON_ADMIN_CONTAINER} strokeWidth={2.5} />

                  <View style={styles.privacyNoticeContent}>
                    <Text style={styles.privacyNoticeTitle}>Restricted pool access</Text>
                    <Text style={styles.privacyNoticeText}>Selecting a doctor does not create a patient-doctor assignment. Access is limited to this medicine review.</Text>
                  </View>
                </View>

                <Text style={styles.modalSectionTitle}>Eligible verified doctors</Text>
                <Text style={styles.modalSectionText}>Doctors are ordered by current medicine-review workload.</Text>

                {selectedEscalation.eligibleDoctors.length > 0 ? (
                  selectedEscalation.eligibleDoctors.map(doctor => {
                    const isAssigning = assigningDoctorId === doctor.id;

                    return (
                      <View key={doctor.id} style={styles.doctorOptionCard}>
                        <View style={styles.doctorOptionAvatar}>
                          <Text style={styles.doctorOptionAvatarText}>{getInitial(doctor.fullName, "D")}</Text>
                        </View>

                        <View style={styles.doctorOptionContent}>
                          <Text style={styles.doctorOptionName}>{doctor.fullName}</Text>
                          <Text style={styles.doctorOptionSpecialization}>{doctor.specialization || "Verified doctor"}</Text>

                          <View style={styles.doctorMetaRow}>
                            <View style={styles.doctorMetaChip}>
                              <Text style={styles.doctorMetaChipText}>{getAvailabilityLabel(doctor.availabilityStatus)}</Text>
                            </View>

                            <View style={styles.workloadChip}>
                              <Text style={styles.workloadChipText}>{doctor.pendingMedicineReviews} pending</Text>
                            </View>
                          </View>

                          <Text style={styles.assignmentText}>
                            {doctor.isAlreadyAssigned
                              ? `Existing ${doctor.assignmentType === "PRIMARY" ? "primary" : "specialist"} relationship • pool access remains restricted`
                              : "Pool-only review • no patient assignment created"}
                          </Text>
                        </View>

                        <TouchableOpacity style={styles.assignButton} activeOpacity={0.84} disabled={Boolean(assigningDoctorId)} onPress={() => void assignEscalation(doctor)}>
                          {isAssigning ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.assignButtonText}>Assign</Text>}
                        </TouchableOpacity>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.modalEmpty}>
                    <AlertTriangle size={28} color={ON_WARNING_CONTAINER} strokeWidth={2.5} />
                    <Text style={styles.modalEmptyTitle}>No eligible doctor available</Text>
                    <Text style={styles.modalEmptyText}>Verified doctors already attempted for this review or currently out of office are excluded.</Text>
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14, backgroundColor: BACKGROUND },
  headerIdentity: { flex: 1, flexDirection: "row", alignItems: "center", paddingRight: 12 },
  adminIconBox: { width: 46, height: 46, borderRadius: 13, backgroundColor: ADMIN_CONTAINER, alignItems: "center", justifyContent: "center", marginRight: 12 },
  headerTextBlock: { flex: 1 },
  kicker: { color: MUTED, fontSize: 12, fontWeight: "600", marginBottom: 2 },
  title: { color: TEXT, fontSize: 21, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  notificationBadge: { position: "absolute", top: -4, right: -4, minWidth: 21, height: 21, borderRadius: 8, backgroundColor: ON_DANGER_CONTAINER, borderWidth: 2, borderColor: BACKGROUND, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, zIndex: 10, elevation: 10 },
  notificationBadgeText: { color: SURFACE, fontSize: 8, fontWeight: "700" },
  iconButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", ...elevate(2) },
  profileButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: ADMIN_CONTAINER, alignItems: "center", justifyContent: "center", marginLeft: 8, overflow: "hidden", ...elevate(2) },
  profileButtonText: { color: ON_ADMIN_CONTAINER, fontSize: 13, fontWeight: "800" },

  scrollView: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 4 },
  heroCard: { backgroundColor: ADMIN, borderRadius: 18, padding: 18, marginBottom: 20, ...elevate(3) },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  heroIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  heroPendingPill: { backgroundColor: WARNING_CONTAINER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  heroPendingText: { color: ON_WARNING_CONTAINER, fontSize: 12, fontWeight: "700" },
  heroTitle: { color: "#FFFFFF", fontSize: 23, fontWeight: "800", marginBottom: 7 },
  heroSubtitle: { color: "#EDE9FE", fontSize: 13, fontWeight: "600", lineHeight: 20, marginBottom: 16 },
  heroFooterRow: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 15, paddingVertical: 13, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  heroFooterItem: { flex: 1 },
  heroFooterValue: { color: "#FFFFFF", fontSize: 19, fontWeight: "800", marginBottom: 2 },
  heroFooterLabel: { color: "#EDE9FE", fontSize: 11, fontWeight: "700" },
  heroFooterDivider: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: "rgba(255,255,255,0.24)", marginHorizontal: 12 },

  loadingCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 22, alignItems: "center", ...elevate(2) },
  loadingText: { color: MUTED, fontSize: 13, fontWeight: "600", marginTop: 10 },
  errorCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 20, alignItems: "center", ...elevate(2) },
  errorIconBox: { width: 52, height: 52, borderRadius: 15, backgroundColor: DANGER_CONTAINER, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  errorTitle: { color: TEXT, fontSize: 17, fontWeight: "700", marginBottom: 6 },
  errorText: { color: MUTED, fontSize: 13, fontWeight: "500", lineHeight: 19, textAlign: "center", marginBottom: 14 },
  retryButton: { flexDirection: "row", alignItems: "center", backgroundColor: ADMIN, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  retryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", marginLeft: 8 },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "700" },
  sectionDescription: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 2 },
  sectionMeta: { color: MUTED, fontSize: 12, fontWeight: "600" },
  sectionLink: { color: ADMIN, fontSize: 12, fontWeight: "700" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 },
  statCard: { width: "48%", padding: 14, backgroundColor: SURFACE, borderRadius: 16, marginBottom: 10, ...elevate(2) },
  statTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  statIconBox: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statStatusDot: { width: 7, height: 7, borderRadius: 4 },
  statValue: { color: TEXT, fontSize: 23, fontWeight: "700", marginBottom: 2 },
  statLabel: { color: TEXT, fontSize: 13, fontWeight: "700", marginBottom: 2 },
  statHelper: { color: MUTED, fontSize: 11, fontWeight: "500" },

  escalationCountChip: { backgroundColor: ADMIN_CONTAINER, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, flexDirection: "row", alignItems: "center" },
  poolCountText: { color: ON_ADMIN_CONTAINER, fontSize: 11, fontWeight: "700", marginLeft: 5 },
  poolSummaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  poolSummaryItem: { width: "31.5%", borderRadius: 13, paddingVertical: 11, paddingHorizontal: 9 },
  poolSummaryValue: { fontSize: 19, fontWeight: "700", marginBottom: 2 },
  poolSummaryLabel: { fontSize: 10, fontWeight: "700" },

  poolSubHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  poolSubTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  poolSubMeta: { color: MUTED, fontSize: 11, fontWeight: "700" },

  poolCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 10, ...elevate(2) },
  completedPoolCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 14, marginBottom: 10, ...elevate(2) },
  completedPoolTop: { flexDirection: "row", alignItems: "flex-start" },
  poolIconBox: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 12 },
  poolCardContent: { flex: 1 },
  poolReference: { color: ADMIN, fontSize: 11, fontWeight: "700", marginBottom: 5 },
  poolDetail: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 16, marginBottom: 5 },
  poolDoctorText: { color: TEXT, fontSize: 11, fontWeight: "700", marginBottom: 4 },
  statusChip: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  statusChipText: { fontSize: 9, fontWeight: "700" },

  reviewNoteBox: { backgroundColor: BACKGROUND, borderRadius: 11, padding: 10, marginTop: 5, marginBottom: 7 },
  reviewNoteLabel: { color: MUTED, fontSize: 9, fontWeight: "700", marginBottom: 3, textTransform: "uppercase" },
  reviewNoteText: { color: TEXT, fontSize: 11, fontWeight: "500", lineHeight: 16 },
  releaseButton: { height: 42, backgroundColor: ADMIN, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 12 },
  releaseButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  compactEmptyCard: { backgroundColor: SURFACE, borderRadius: 14, padding: 13, flexDirection: "row", alignItems: "center", marginBottom: 14, ...elevate(1) },
  compactEmptyContent: { flex: 1, marginLeft: 10 },
  compactEmptyTitle: { color: TEXT, fontSize: 12, fontWeight: "700", marginBottom: 2 },
  compactEmptyText: { color: MUTED, fontSize: 10, fontWeight: "500", lineHeight: 14 },

  auditCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 20, overflow: "hidden", ...elevate(2) },
  auditIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: ADMIN_CONTAINER, alignItems: "center", justifyContent: "center", marginRight: 12 },
  auditContent: { flex: 1 },
  auditTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  auditText: { color: MUTED, fontSize: 12, fontWeight: "500", lineHeight: 17 },
  auditChevron: { width: 34, height: 34, borderRadius: 11, backgroundColor: ADMIN_CONTAINER, alignItems: "center", justifyContent: "center", marginLeft: 10 },

  approvalList: { marginBottom: 14 },
  approvalCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 10, overflow: "hidden", ...elevate(2) },
  cardAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 5 },
  avatar: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 12, marginLeft: 2 },
  avatarText: { fontSize: 18, fontWeight: "700" },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  cardName: { flex: 1, color: TEXT, fontSize: 15, fontWeight: "700", marginRight: 8 },
  pendingChip: { backgroundColor: WARNING_CONTAINER, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, flexDirection: "row", alignItems: "center" },
  pendingChipText: { color: ON_WARNING_CONTAINER, fontSize: 10, fontWeight: "700", marginLeft: 4 },
  cardMeta: { color: MUTED, fontSize: 12, fontWeight: "500", marginBottom: 6 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  documentChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, flexDirection: "row", alignItems: "center" },
  documentChipText: { fontSize: 10, fontWeight: "700", marginLeft: 4 },
  dateText: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 2 },
  chevronBox: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", marginLeft: 10 },

  emptyCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 18, ...elevate(2) },
  emptyIconBox: { width: 54, height: 54, borderRadius: 16, backgroundColor: SUCCESS_CONTAINER, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptyText: { color: MUTED, fontSize: 13, fontWeight: "500", textAlign: "center", lineHeight: 19 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,15,25,0.42)", justifyContent: "flex-end" },
  modalCard: { maxHeight: "88%", backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10 },
  modalHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "#D5D0DE", alignSelf: "center", marginBottom: 14 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  modalKicker: { color: MUTED, fontSize: 11, fontWeight: "600", marginBottom: 2 },
  modalTitle: { color: TEXT, fontSize: 20, fontWeight: "700" },
  modalClose: { width: 40, height: 40, borderRadius: 13, backgroundColor: BACKGROUND, alignItems: "center", justifyContent: "center" },
  modalLoading: { minHeight: 180, alignItems: "center", justifyContent: "center" },

  reviewSummaryCard: { backgroundColor: WARNING_CONTAINER, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  reviewMedicineIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  reviewSummaryContent: { flex: 1 },
  reviewMedicineName: { color: TEXT, fontSize: 16, fontWeight: "700" },
  reviewPatientName: { color: ON_WARNING_CONTAINER, fontSize: 12, fontWeight: "700", marginTop: 3 },
  reviewMeta: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },

  privacyNotice: { backgroundColor: ADMIN_CONTAINER, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "flex-start", marginBottom: 18 },
  privacyNoticeContent: { flex: 1, marginLeft: 9 },
  privacyNoticeTitle: { color: ON_ADMIN_CONTAINER, fontSize: 12, fontWeight: "700", marginBottom: 3 },
  privacyNoticeText: { color: ON_ADMIN_CONTAINER, fontSize: 10, fontWeight: "500", lineHeight: 15 },

  modalSectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  modalSectionText: { color: MUTED, fontSize: 12, fontWeight: "500", lineHeight: 17, marginTop: 3, marginBottom: 12 },

  doctorOptionCard: { backgroundColor: BACKGROUND, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 10 },
  doctorOptionAvatar: { width: 44, height: 44, borderRadius: 13, backgroundColor: DOCTOR_CONTAINER, alignItems: "center", justifyContent: "center", marginRight: 10 },
  doctorOptionAvatarText: { color: ON_DOCTOR_CONTAINER, fontSize: 17, fontWeight: "700" },
  doctorOptionContent: { flex: 1 },
  doctorOptionName: { color: TEXT, fontSize: 14, fontWeight: "700" },
  doctorOptionSpecialization: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 2 },
  doctorMetaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 7 },
  doctorMetaChip: { backgroundColor: SUCCESS_CONTAINER, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, marginRight: 5 },
  doctorMetaChipText: { color: ON_SUCCESS_CONTAINER, fontSize: 9, fontWeight: "700" },
  workloadChip: { backgroundColor: ADMIN_CONTAINER, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  workloadChipText: { color: ON_ADMIN_CONTAINER, fontSize: 9, fontWeight: "700" },
  assignmentText: { color: MUTED, fontSize: 9, fontWeight: "600", lineHeight: 13, marginTop: 6 },
  assignButton: { minWidth: 64, height: 38, borderRadius: 11, backgroundColor: ADMIN, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, marginLeft: 8 },
  assignButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },

  modalEmpty: { backgroundColor: WARNING_CONTAINER, borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 20 },
  modalEmptyTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 10 },
  modalEmptyText: { color: MUTED, fontSize: 12, fontWeight: "500", lineHeight: 17, textAlign: "center", marginTop: 5 },
});