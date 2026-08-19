import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Clock3, FileCheck2, Pill, RefreshCw, Stethoscope, UserRound, X } from "lucide-react-native";

import { adminApi, type AdminEligibleMedicineReviewDoctor, type AdminMedicineReviewEscalation, type AdminMedicineReviewEscalationDetailResult } from "../../services/adminApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "AdminMedicineReviewRequests">;
type ReviewStage = "AWAITING" | "WITH_DOCTOR" | "TO_RELEASE";
type ReviewFilter = "ALL" | ReviewStage;
type ReviewRow = { request: AdminMedicineReviewEscalation; stage: ReviewStage };

const BACKGROUND = "#F3F1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#1D1B2F";
const MUTED = "#6D687B";
const BORDER = "#E7E3EE";
const ADMIN = "#6750D8";
const ADMIN_LIGHT = "#EADDFF";
const DOCTOR = "#5B5FEF";
const DOCTOR_LIGHT = "#E7E8FF";
const WARNING = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";
const SUCCESS = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";
const DANGER = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const FILTERS: { label: string; value: ReviewFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Awaiting", value: "AWAITING" },
  { label: "With doctor", value: "WITH_DOCTOR" },
  { label: "To release", value: "TO_RELEASE" },
];

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong.";

const getPatientReference = (patientId: string) => `CM-${patientId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

const formatDateTime = (value?: string | null) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const getRequestDate = (request: AdminMedicineReviewEscalation) => {
  const value = request.createdAt || request.escalatedAt || request.updatedAt;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getStageLabel = (stage: ReviewStage) => {
  if (stage === "AWAITING") return "Awaiting assignment";
  if (stage === "WITH_DOCTOR") return "With doctor";
  return "Ready to release";
};

const getStageTone = (stage: ReviewStage) => {
  if (stage === "AWAITING") return { background: WARNING_LIGHT, text: WARNING };
  if (stage === "WITH_DOCTOR") return { background: DOCTOR_LIGHT, text: DOCTOR };
  return { background: SUCCESS_LIGHT, text: SUCCESS };
};

const getAvailabilityLabel = (status: AdminEligibleMedicineReviewDoctor["availabilityStatus"]) => {
  if (status === "AVAILABLE") return "Available";
  if (status === "UNAVAILABLE") return "No appointments";
  return "Schedule not set";
};

export default function AdminMedicineReviewRequestsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [awaiting, setAwaiting] = useState<AdminMedicineReviewEscalation[]>([]);
  const [withDoctor, setWithDoctor] = useState<AdminMedicineReviewEscalation[]>([]);
  const [toRelease, setToRelease] = useState<AdminMedicineReviewEscalation[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedEscalation, setSelectedEscalation] = useState<AdminMedicineReviewEscalationDetailResult | null>(null);
  const [isLoadingEscalation, setIsLoadingEscalation] = useState(false);
  const [assigningDoctorId, setAssigningDoctorId] = useState<string | null>(null);
  const [releasingRequestId, setReleasingRequestId] = useState<string | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      refresh ? setIsRefreshing(true) : setIsLoading(true);
      setErrorMessage("");
      const [awaitingData, assignedData, completedData] = await Promise.all([
        adminApi.listMedicineReviewEscalations(),
        adminApi.listMedicineReviewPoolAssignments(),
        adminApi.listCompletedMedicineReviewPoolReviews(),
      ]);
      setAwaiting(awaitingData.requests || []);
      setWithDoctor(assignedData.requests || []);
      setToRelease(completedData.requests || []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadData(false); }, [loadData]));

  const allRows = useMemo<ReviewRow[]>(() => {
    const rows: ReviewRow[] = [
      ...awaiting.map(request => ({ request, stage: "AWAITING" as const })),
      ...withDoctor.map(request => ({ request, stage: "WITH_DOCTOR" as const })),
      ...toRelease.map(request => ({ request, stage: "TO_RELEASE" as const })),
    ];
    return rows.sort((a, b) => getRequestDate(b.request) - getRequestDate(a.request));
  }, [awaiting, withDoctor, toRelease]);

  const visibleRows = useMemo(() => filter === "ALL" ? allRows : allRows.filter(row => row.stage === filter), [allRows, filter]);

  const openAwaitingReview = async (requestId: string) => {
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

  const assignDoctor = (doctor: AdminEligibleMedicineReviewDoctor) => {
    if (!selectedEscalation || assigningDoctorId) return;
    Alert.alert("Assign review", `Send ${selectedEscalation.request.medicine.name} to ${doctor.fullName}? This does not create a patient-doctor assignment.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Assign",
        onPress: async () => {
          try {
            setAssigningDoctorId(doctor.id);
            await adminApi.assignMedicineReviewEscalation(selectedEscalation.request.id, doctor.id);
            setSelectedEscalation(null);
            await loadData(true);
          } catch (error) {
            Alert.alert("Unable to assign review", getErrorMessage(error));
          } finally {
            setAssigningDoctorId(null);
          }
        },
      },
    ]);
  };

  const releaseResult = (request: AdminMedicineReviewEscalation) => {
    if (!request.poolDecision || releasingRequestId) return;
    Alert.alert("Release to patient", `Release the ${request.poolDecision.toLowerCase()} ${request.medicine.name} result to the patient?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Release",
        onPress: async () => {
          try {
            setReleasingRequestId(request.id);
            await adminApi.releaseMedicineReviewPoolResult(request.id);
            await loadData(true);
          } catch (error) {
            Alert.alert("Unable to release result", getErrorMessage(error));
          } finally {
            setReleasingRequestId(null);
          }
        },
      },
    ]);
  };

  const handleRowPress = (row: ReviewRow) => {
    if (row.stage === "AWAITING") void openAwaitingReview(row.request.id);
  };

  const renderRow = ({ item }: { item: ReviewRow }) => {
    const { request, stage } = item;
    const tone = getStageTone(stage);
    const isReleasing = releasingRequestId === request.id;
    const reviewType = request.requestType === "DELETE" ? "Removal review" : "Medicine review";

    return (
      <TouchableOpacity style={styles.row} activeOpacity={stage === "AWAITING" ? 0.7 : 1} disabled={stage !== "AWAITING"} onPress={() => handleRowPress(item)}>
        <View style={[styles.iconCircle, { backgroundColor: tone.background }]}>
          {stage === "AWAITING" ? <Clock3 size={19} color={tone.text} strokeWidth={2.4} /> : stage === "WITH_DOCTOR" ? <Stethoscope size={19} color={tone.text} strokeWidth={2.4} /> : <FileCheck2 size={19} color={tone.text} strokeWidth={2.4} />}
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.medicineName} numberOfLines={1}>{request.medicine.name}</Text>
            <View style={[styles.statusPill, { backgroundColor: tone.background }]}>
              <Text style={[styles.statusText, { color: tone.text }]}>{getStageLabel(stage)}</Text>
            </View>
          </View>

          <Text style={styles.secondaryText} numberOfLines={1}>{request.medicine.dose} • {reviewType}</Text>
          <View style={styles.metaLine}>
            <UserRound size={12} color={MUTED} strokeWidth={2.2} />
            <Text style={styles.metaText}>{getPatientReference(request.patientId)}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{formatDateTime(request.createdAt)}</Text>
          </View>

          {stage === "WITH_DOCTOR" ? <Text style={styles.detailText}>Reviewing: {request.poolDoctor?.fullName || "Pool doctor"}</Text> : null}
          {stage === "TO_RELEASE" ? (
            <View style={styles.releaseLine}>
              <Text style={[styles.detailText, { color: request.poolDecision === "APPROVED" ? SUCCESS : DANGER }]}>
                {request.poolDecision === "APPROVED" ? "Approved by doctor" : "Rejected by doctor"}
              </Text>
              <TouchableOpacity style={styles.releaseButton} disabled={Boolean(releasingRequestId)} activeOpacity={0.8} onPress={() => releaseResult(request)}>
                {isReleasing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.releaseButtonText}>Release</Text>}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {stage === "AWAITING" ? <ChevronRight size={19} color={MUTED} strokeWidth={2.2} /> : null}
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <View>
      <View style={styles.summaryLine}>
        <Text style={styles.summaryText}>{allRows.length} medicine review request{allRows.length === 1 ? "" : "s"}</Text>
        <Text style={styles.latestText}>Latest first</Text>
      </View>

      <View style={styles.filters}>
        {FILTERS.map(item => (
          <TouchableOpacity key={item.value} style={[styles.filterButton, filter === item.value && styles.filterButtonActive]} activeOpacity={0.8} onPress={() => setFilter(item.value)}>
            <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={TEXT} strokeWidth={2.4} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Medicine review requests</Text>
          <Text style={styles.subtitle}>Doctor Pool administration</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={ADMIN} />
          <Text style={styles.stateText}>Loading medicine reviews...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <AlertTriangle size={32} color={DANGER} strokeWidth={2.3} />
          <Text style={styles.stateTitle}>Unable to load reviews</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} activeOpacity={0.82} onPress={() => void loadData(false)}>
            <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visibleRows}
          keyExtractor={item => `${item.stage}-${item.request.id}`}
          renderItem={renderRow}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <CheckCircle2 size={30} color={SUCCESS} strokeWidth={2.3} />
              <Text style={styles.stateTitle}>No requests here</Text>
              <Text style={styles.stateText}>Medicine review requests matching this filter will appear here.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadData(true)} tintColor={ADMIN} colors={[ADMIN]} />}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 28, 36) }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={Boolean(selectedEscalation) || isLoadingEscalation} transparent animationType="slide" onRequestClose={() => !assigningDoctorId && setSelectedEscalation(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>Assign review doctor</Text>
                <Text style={styles.modalSubtitle}>{selectedEscalation?.request.medicine.name || "Medicine review"}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} activeOpacity={0.8} disabled={Boolean(assigningDoctorId)} onPress={() => setSelectedEscalation(null)}>
                <X size={20} color={TEXT} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {isLoadingEscalation ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={ADMIN} />
                <Text style={styles.stateText}>Loading eligible doctors...</Text>
              </View>
            ) : selectedEscalation ? (
              <FlatList
                data={selectedEscalation.eligibleDoctors}
                keyExtractor={doctor => doctor.id}
                ListHeaderComponent={
                  <View style={styles.restrictedNotice}>
                    <Pill size={18} color={ADMIN} strokeWidth={2.4} />
                    <Text style={styles.restrictedText}>Pool access is restricted to this medicine review and does not create a patient-doctor relationship.</Text>
                  </View>
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <AlertTriangle size={28} color={WARNING} strokeWidth={2.3} />
                    <Text style={styles.stateTitle}>No eligible doctors</Text>
                    <Text style={styles.stateText}>Previously attempted or unavailable doctors are excluded.</Text>
                  </View>
                }
                renderItem={({ item: doctor }) => (
                  <TouchableOpacity style={styles.doctorRow} activeOpacity={0.8} disabled={Boolean(assigningDoctorId)} onPress={() => assignDoctor(doctor)}>
                    <View style={styles.doctorAvatar}><Text style={styles.doctorAvatarText}>{doctor.fullName.charAt(0).toUpperCase()}</Text></View>
                    <View style={styles.doctorBody}>
                      <Text style={styles.doctorName}>{doctor.fullName}</Text>
                      <Text style={styles.secondaryText}>{doctor.specialization || "Verified doctor"}</Text>
                      <Text style={styles.doctorMeta}>{getAvailabilityLabel(doctor.availabilityStatus)} • {doctor.pendingMedicineReviews} pending</Text>
                    </View>
                    {assigningDoctorId === doctor.id ? <ActivityIndicator size="small" color={ADMIN} /> : <ChevronRight size={19} color={MUTED} strokeWidth={2.2} />}
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: BACKGROUND },
  backButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  headerText: { flex: 1 },
  title: { color: TEXT, fontSize: 20, fontWeight: "800" },
  subtitle: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 2 },
  summaryLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12 },
  summaryText: { color: TEXT, fontSize: 13, fontWeight: "700" },
  latestText: { color: ADMIN, fontSize: 11, fontWeight: "700" },
  filters: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 10, gap: 6 },
  filterButton: { flex: 1, minHeight: 36, borderRadius: 10, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  filterButtonActive: { backgroundColor: ADMIN_LIGHT },
  filterText: { color: MUTED, fontSize: 10, fontWeight: "700", textAlign: "center" },
  filterTextActive: { color: ADMIN },
  row: { minHeight: 104, flexDirection: "row", alignItems: "center", backgroundColor: SURFACE, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowBody: { flex: 1, paddingRight: 8 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  medicineName: { flex: 1, color: TEXT, fontSize: 15, fontWeight: "800", marginRight: 8 },
  statusPill: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  statusText: { fontSize: 9, fontWeight: "800" },
  secondaryText: { color: MUTED, fontSize: 11, fontWeight: "600" },
  metaLine: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  metaText: { color: MUTED, fontSize: 10, fontWeight: "600", marginLeft: 4 },
  metaDot: { color: MUTED, fontSize: 10, marginHorizontal: 5 },
  detailText: { color: TEXT, fontSize: 10, fontWeight: "700", marginTop: 6 },
  releaseLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7 },
  releaseButton: { minWidth: 72, height: 34, borderRadius: 9, backgroundColor: ADMIN, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  releaseButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  stateTitle: { color: TEXT, fontSize: 16, fontWeight: "800", marginTop: 10, textAlign: "center" },
  stateText: { color: MUTED, fontSize: 12, fontWeight: "600", lineHeight: 18, marginTop: 6, textAlign: "center" },
  retryButton: { flexDirection: "row", alignItems: "center", backgroundColor: ADMIN, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10, marginTop: 14 },
  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", marginLeft: 7 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingVertical: 44 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(18,18,28,0.42)", justifyContent: "flex-end" },
  modalSheet: { maxHeight: "82%", minHeight: "45%", backgroundColor: SURFACE, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 8 },
  modalHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "#D7D2DE", alignSelf: "center", marginBottom: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12 },
  modalTitleWrap: { flex: 1 },
  modalTitle: { color: TEXT, fontSize: 18, fontWeight: "800" },
  modalSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 2 },
  closeButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: BACKGROUND, alignItems: "center", justifyContent: "center" },
  modalLoading: { minHeight: 180, alignItems: "center", justifyContent: "center" },
  restrictedNotice: { flexDirection: "row", alignItems: "flex-start", backgroundColor: ADMIN_LIGHT, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 11 },
  restrictedText: { flex: 1, color: ADMIN, fontSize: 10, fontWeight: "600", lineHeight: 15, marginLeft: 8 },
  doctorRow: { minHeight: 74, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  doctorAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  doctorAvatarText: { color: DOCTOR, fontSize: 16, fontWeight: "800" },
  doctorBody: { flex: 1 },
  doctorName: { color: TEXT, fontSize: 14, fontWeight: "800", marginBottom: 2 },
  doctorMeta: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 4 },
});