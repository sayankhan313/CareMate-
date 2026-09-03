import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Modal, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, FileText, History, MessageSquareText, RefreshCw, Stethoscope, UserRound, Video, X, XCircle } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { doctorConsultationsApi, type DoctorConsultation, type DoctorConsultationFilterStatus, type DoctorConsultationFilterType } from "../../services/doctor/doctorConsultationsApi";
import type { DoctorTabParamList } from "../../types/navigation";

type Props = BottomTabScreenProps<DoctorTabParamList, "Consultations">;
type ActionType = "ACCEPT" | "REJECT" | "COMPLETE";

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";
const DIVIDER = "#E4E8F2";
const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_LIGHT = "#E6FFFA";
const DOCTOR_DARK = "#134E4A";
const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";
const SUCCESS_DARK = "#167A58";
const WARNING = "#F6A545";
const WARNING_LIGHT = "#FFF3E2";
const WARNING_DARK = "#A85A13";
const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";
const DANGER_DARK = "#B42318";

const STATUS_FILTERS: { label: string; value: DoctorConsultationFilterStatus }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
];

const TYPE_FILTERS: { label: string; value: DoctorConsultationFilterType }[] = [
  { label: "All", value: "ALL" },
  { label: "Manual", value: "MANUAL" },
  { label: "Emergency", value: "EMERGENCY" },
];

const elevate = (level: 1 | 2 | 3 = 1) => {
  const elevation = level === 1 ? 2 : level === 2 ? 4 : 7;
  return { elevation, shadowColor: "#172033", shadowOpacity: Platform.OS === "android" ? 0 : 0.09, shadowRadius: level === 1 ? 4 : 9, shadowOffset: { width: 0, height: level === 1 ? 2 : 4 } };
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "No preferred time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No preferred time";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const formatStatus = (status: string) => {
  if (status === "PENDING") return "Pending";
  if (status === "ACCEPTED") return "Accepted";
  if (status === "REJECTED") return "Rejected";
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  return status;
};

const getConsultationTypeLabel = (type: string) => type === "EMERGENCY" ? "Emergency consultation" : "Manual consultation";

const getStatusTone = (status: string) => {
  if (status === "COMPLETED") return { background: SUCCESS_LIGHT, text: SUCCESS_DARK, dot: SUCCESS, solid: SUCCESS };
  if (status === "REJECTED" || status === "CANCELLED") return { background: DANGER_LIGHT, text: DANGER_DARK, dot: DANGER, solid: DANGER };
  if (status === "ACCEPTED" || status === "IN_PROGRESS") return { background: DOCTOR_LIGHT, text: DOCTOR_DARK, dot: DOCTOR_PRIMARY, solid: DOCTOR_PRIMARY };
  return { background: WARNING_LIGHT, text: WARNING_DARK, dot: WARNING, solid: WARNING };
};

const getPatientName = (consultation: DoctorConsultation) => consultation.patient?.fullName || "Assigned patient";
const canAccept = (consultation: DoctorConsultation) => consultation.status === "PENDING";
const canReject = (consultation: DoctorConsultation) => consultation.status === "PENDING" || consultation.status === "ACCEPTED";
const canJoin = (consultation: DoctorConsultation) => consultation.status === "ACCEPTED" || consultation.status === "IN_PROGRESS";
const canComplete = (consultation: DoctorConsultation) => consultation.status === "ACCEPTED" || consultation.status === "IN_PROGRESS";

const getActionTitle = (action: ActionType | null) => {
  if (action === "ACCEPT") return "Accept consultation";
  if (action === "REJECT") return "Reject consultation";
  return "Complete consultation";
};

const getActionButtonText = (action: ActionType | null) => {
  if (action === "ACCEPT") return "Accept";
  if (action === "REJECT") return "Reject";
  return "Complete";
};

const getActionButtonColor = (action: ActionType | null) => {
  if (action === "REJECT") return DANGER;
  if (action === "COMPLETE") return SUCCESS;
  return DOCTOR_PRIMARY;
};

export const DoctorConsultationsScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const rootNavigation = navigation.getParent<any>();
  const focusedConsultationId = route.params?.consultationId;
  const scrollViewRef = useRef<ScrollView | null>(null);
  const listTopRef = useRef(0);
  const hasScrolledToFocusRef = useRef<string | null>(null);

  const [consultations, setConsultations] = useState<DoctorConsultation[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<DoctorConsultationFilterStatus>("ALL");
  const [selectedType, setSelectedType] = useState<DoctorConsultationFilterType>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [screenError, setScreenError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [joinLoadingId, setJoinLoadingId] = useState<string | null>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<DoctorConsultation | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  const pendingConsultations = useMemo(() => consultations.filter(consultation => consultation.status === "PENDING"), [consultations]);
  const activeConsultations = useMemo(() => consultations.filter(consultation => consultation.status === "ACCEPTED" || consultation.status === "IN_PROGRESS"), [consultations]);
  const completedConsultations = useMemo(() => consultations.filter(consultation => consultation.status === "COMPLETED" || consultation.status === "REJECTED" || consultation.status === "CANCELLED"), [consultations]);

  const actionTitle = getActionTitle(selectedAction);
  const actionButtonText = getActionButtonText(selectedAction);
  const actionButtonColor = getActionButtonColor(selectedAction);

  useEffect(() => {
    if (!focusedConsultationId) return;
    hasScrolledToFocusRef.current = null;
    setSelectedStatus("ALL");
    setSelectedType("ALL");
  }, [focusedConsultationId]);

  const loadConsultations = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setScreenError("");

      const status = focusedConsultationId ? "ALL" : selectedStatus;
      const type = focusedConsultationId ? "ALL" : selectedType;
      const result = await doctorConsultationsApi.listConsultations(status, type);

      setConsultations(result.consultations);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Unable to load consultations.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [focusedConsultationId, selectedStatus, selectedType]);

  useFocusEffect(useCallback(() => {
    void loadConsultations("initial");
  }, [loadConsultations]));

  const refreshConsultations = useCallback(() => {
    void loadConsultations("refresh");
  }, [loadConsultations]);

  const updateConsultationInList = (updatedConsultation: DoctorConsultation) => {
    setConsultations(current => current.map(consultation => consultation.id === updatedConsultation.id ? updatedConsultation : consultation));
  };

  const openActionModal = (consultation: DoctorConsultation, action: ActionType) => {
    setSelectedConsultation(consultation);
    setSelectedAction(action);
    setActionNotes("");
  };

  const closeActionModal = () => {
    if (actionLoadingId) return;
    setSelectedConsultation(null);
    setSelectedAction(null);
    setActionNotes("");
  };

  const scrollToFocusedConsultation = (consultationId: string, cardY: number) => {
    if (!focusedConsultationId || consultationId !== focusedConsultationId) return;
    if (hasScrolledToFocusRef.current === consultationId) return;

    hasScrolledToFocusRef.current = consultationId;

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, listTopRef.current + cardY - 18),
        animated: true,
      });
    });
  };

  const joinConsultationCall = async (consultation: DoctorConsultation) => {
    if (joinLoadingId) return;

    if (!rootNavigation) {
      Alert.alert("Unable to open call", "Video consultation screen is not available right now.");
      return;
    }

    try {
      setJoinLoadingId(consultation.id);
      setScreenError("");

      const result = await doctorConsultationsApi.getDoctorJoinConfig(consultation.id);

      updateConsultationInList(result.consultation);

      rootNavigation.navigate("VideoConsultation", {
        consultationId: result.consultation.id,
        consultationType: result.consultation.type,
        doctorMeeting: result.doctorMeeting,
        doctorMeetingUrl: result.doctorMeeting.webUrl,
      });

      await loadConsultations("refresh");
    } catch (error) {
      Alert.alert("Unable to join call", error instanceof Error ? error.message : "Unable to join consultation.");
    } finally {
      setJoinLoadingId(null);
    }
  };

  const submitAction = async () => {
    if (!selectedConsultation || !selectedAction || actionLoadingId) return;

    try {
      setActionLoadingId(selectedConsultation.id);
      setScreenError("");

      let result;

      if (selectedAction === "ACCEPT") {
        result = await doctorConsultationsApi.acceptConsultation(selectedConsultation.id, actionNotes);
      } else if (selectedAction === "REJECT") {
        result = await doctorConsultationsApi.rejectConsultation(selectedConsultation.id, actionNotes);
      } else {
        result = await doctorConsultationsApi.completeConsultation(selectedConsultation.id, actionNotes);
      }

      updateConsultationInList(result.consultation);
      setSelectedConsultation(null);
      setSelectedAction(null);
      setActionNotes("");

      await loadConsultations("refresh");
    } catch (error) {
      Alert.alert("Consultation update failed", error instanceof Error ? error.message : "Unable to update request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <View>
            <Text style={styles.appBarTitle}>Consultations</Text>
            <Text style={styles.appBarSubtitle}>Review patient requests and join calls</Text>
          </View>

          <TouchableOpacity style={styles.appBarButton} activeOpacity={0.86} onPress={refreshConsultations}>
            <RefreshCw size={20} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(36, insets.bottom + 112) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshConsultations} tintColor={DOCTOR_PRIMARY} colors={[DOCTOR_PRIMARY]} />}
        >
          <View style={styles.summaryCard}>
            <Video size={130} color="#FFFFFF" strokeWidth={1.2} style={styles.summaryWatermark} />

            <View style={styles.summaryTopRow}>
              <View style={styles.summaryIconRingOuter}><View style={styles.summaryIconRingInner}><Video size={22} color={DOCTOR_PRIMARY} strokeWidth={2.7} /></View></View>
              <View style={styles.summaryTextBlock}>
                <Text style={styles.summaryTitle}>Doctor consultation desk</Text>
                <Text style={styles.summaryText}>Accept patient requests, join active video calls, and complete consultations.</Text>
              </View>
            </View>

            <View style={styles.summaryStatsRow}>
              <SummaryStatGlass label="Pending" value={`${pendingConsultations.length}`} accentColor={WARNING} />
              <SummaryStatGlass label="Active" value={`${activeConsultations.length}`} accentColor={DOCTOR_PRIMARY} />
              <SummaryStatGlass label="Past" value={`${completedConsultations.length}`} accentColor={MUTED} />
            </View>
          </View>

          <View style={styles.filterPanel}>
            <Text style={styles.filterTitle}>Status</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {STATUS_FILTERS.map(filter => {
                const isSelected = selectedStatus === filter.value;
                return (
                  <TouchableOpacity key={filter.value} style={[styles.materialChip, isSelected ? styles.materialChipSelected : undefined]} activeOpacity={0.7} onPress={() => setSelectedStatus(filter.value)}>
                    {isSelected ? <CheckCircle2 size={14} color={DOCTOR_DARK} strokeWidth={2.4} style={styles.materialChipIcon} /> : null}
                    <Text style={[styles.materialChipText, isSelected ? styles.materialChipTextSelected : undefined]}>{filter.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.filterTitle, styles.filterTitleSpaced]}>Type</Text>

            <View style={styles.segmentedGroup}>
              {TYPE_FILTERS.map((filter, index) => {
                const isSelected = selectedType === filter.value;
                const isLast = index === TYPE_FILTERS.length - 1;

                return (
                  <TouchableOpacity key={filter.value} style={[styles.segmentedItem, isSelected ? styles.segmentedItemSelected : undefined, !isLast ? styles.segmentedItemDivider : undefined]} activeOpacity={0.7} onPress={() => setSelectedType(filter.value)}>
                    <Text style={[styles.segmentedItemText, isSelected ? styles.segmentedItemTextSelected : undefined]}>{filter.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {screenError ? <View style={styles.errorCard}><AlertTriangle size={22} color={DANGER} strokeWidth={2.7} /><Text style={styles.errorText}>{screenError}</Text></View> : null}

          <SectionHeader title="Consultation requests" subtitle={consultations.length > 0 ? `${consultations.length} request${consultations.length === 1 ? "" : "s"} found` : "No consultation requests found"} icon={<Stethoscope size={21} color={DOCTOR_PRIMARY} strokeWidth={2.6} />} />

          {isLoading ? (
            <LoadingCard />
          ) : consultations.length === 0 ? (
            <EmptyCard />
          ) : (
            <View style={styles.listStack} onLayout={event => { listTopRef.current = event.nativeEvent.layout.y; }}>
              {consultations.map(consultation => (
                <View key={consultation.id} onLayout={event => scrollToFocusedConsultation(consultation.id, event.nativeEvent.layout.y)}>
                  <ConsultationCard
                    consultation={consultation}
                    isLoading={actionLoadingId === consultation.id}
                    isJoining={joinLoadingId === consultation.id}
                    isFocused={focusedConsultationId === consultation.id}
                    onAccept={() => openActionModal(consultation, "ACCEPT")}
                    onReject={() => openActionModal(consultation, "REJECT")}
                    onComplete={() => openActionModal(consultation, "COMPLETE")}
                    onJoin={() => void joinConsultationCall(consultation)}
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <Modal visible={Boolean(selectedConsultation && selectedAction)} transparent animationType="fade" onRequestClose={closeActionModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconBox, selectedAction === "REJECT" ? { backgroundColor: DANGER_LIGHT } : selectedAction === "COMPLETE" ? { backgroundColor: SUCCESS_LIGHT } : undefined]}>
                  {selectedAction === "REJECT" ? <XCircle size={24} color={DANGER} strokeWidth={2.7} /> : selectedAction === "COMPLETE" ? <CheckCircle2 size={24} color={SUCCESS} strokeWidth={2.7} /> : <Stethoscope size={24} color={DOCTOR_PRIMARY} strokeWidth={2.7} />}
                </View>

                <View style={styles.modalTitleBlock}>
                  <Text style={styles.modalTitle}>{actionTitle}</Text>
                  <Text style={styles.modalSubtitle}>{selectedConsultation ? getPatientName(selectedConsultation) : "Patient request"}</Text>
                </View>

                <TouchableOpacity style={styles.modalCloseButton} activeOpacity={0.86} onPress={closeActionModal}>
                  <X size={20} color={TEXT} strokeWidth={2.6} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Notes optional</Text>

              <TextInput style={styles.modalInput} value={actionNotes} onChangeText={setActionNotes} placeholder="Add a short message or clinical note..." placeholderTextColor={MUTED} multiline textAlignVertical="top" editable={!actionLoadingId} />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={styles.modalCancelButton} activeOpacity={0.86} onPress={closeActionModal} disabled={Boolean(actionLoadingId)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalSubmitButton, { backgroundColor: actionButtonColor }, actionLoadingId ? styles.disabledAction : undefined]} activeOpacity={0.86} onPress={() => void submitAction()} disabled={Boolean(actionLoadingId)}>
                  {actionLoadingId ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalSubmitText}>{actionButtonText}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const SummaryStatGlass = ({ label, value, accentColor }: { label: string; value: string; accentColor: string }) => (
  <View style={styles.summaryStatGlass}>
    <View style={[styles.summaryStatDot, { backgroundColor: accentColor }]} />
    <Text style={styles.summaryStatValue}>{value}</Text>
    <Text style={styles.summaryStatLabel}>{label}</Text>
  </View>
);

const SectionHeader = ({ title, subtitle, icon }: { title: string; subtitle: string; icon: ReactNode }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionAccentBar} />
      <View><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View>
    </View>
    <View style={styles.sectionIconBox}>{icon}</View>
  </View>
);

const LoadingCard = () => <View style={styles.stateCard}><ActivityIndicator color={DOCTOR_PRIMARY} /><Text style={styles.stateTitle}>Loading consultations...</Text><Text style={styles.stateText}>Please wait a moment.</Text></View>;

const EmptyCard = () => <View style={styles.stateCard}><View style={styles.emptyIconRingOuter}><View style={styles.emptyIconBox}><MessageSquareText size={26} color={DOCTOR_PRIMARY} strokeWidth={2.7} /></View></View><Text style={styles.stateTitle}>No consultation requests</Text><Text style={styles.stateText}>Patient manual and emergency requests will appear here.</Text></View>;

const ConsultationCard = ({
  consultation,
  isLoading,
  isJoining,
  isFocused,
  onAccept,
  onReject,
  onComplete,
  onJoin,
}: {
  consultation: DoctorConsultation;
  isLoading: boolean;
  isJoining: boolean;
  isFocused: boolean;
  onAccept: () => void;
  onReject: () => void;
  onComplete: () => void;
  onJoin: () => void;
}) => {
  const tone = getStatusTone(consultation.status);
  const isEmergency = consultation.type === "EMERGENCY";

  return (
    <View style={[styles.consultationCard, isFocused ? styles.focusedConsultationCard : undefined]}>
      <View style={[styles.consultationAccentBar, { backgroundColor: isEmergency ? DANGER : tone.solid }]} />

      {isFocused ? (
        <View style={styles.focusedLabel}>
          <Text style={styles.focusedLabelText}>Selected consultation</Text>
        </View>
      ) : null}

      <View style={styles.consultationTopRow}>
        <View style={[styles.patientIconBox, isEmergency ? styles.emergencyIconBox : undefined]}>
          {isEmergency ? <AlertTriangle size={22} color={DANGER} strokeWidth={2.7} /> : <UserRound size={22} color={DOCTOR_PRIMARY} strokeWidth={2.7} />}
        </View>

        <View style={styles.consultationTitleBlock}>
          <Text style={styles.patientName} numberOfLines={1}>{getPatientName(consultation)}</Text>
          <Text style={styles.consultationMeta} numberOfLines={1}>{getConsultationTypeLabel(consultation.type)}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: tone.background }]}>
          <View style={[styles.statusDot, { backgroundColor: tone.dot }]} />
          <Text style={[styles.statusBadgeText, { color: tone.text }]}>{formatStatus(consultation.status)}</Text>
        </View>
      </View>

      <View style={styles.infoPanel}>
        <InfoLine icon={<CalendarClock size={16} color={DOCTOR_PRIMARY} strokeWidth={2.5} />} label="Preferred" value={formatDateTime(consultation.preferredAt)} />
        <InfoLine icon={<Clock3 size={16} color={DOCTOR_PRIMARY} strokeWidth={2.5} />} label="Requested" value={formatDateTime(consultation.createdAt)} />
        {consultation.doctorName ? <InfoLine icon={<Stethoscope size={16} color={DOCTOR_PRIMARY} strokeWidth={2.5} />} label="Doctor" value={consultation.doctorName} /> : null}
      </View>

      <View style={styles.reasonPanel}>
        <View style={styles.reasonHeader}><FileText size={16} color={MUTED} strokeWidth={2.5} /><Text style={styles.reasonLabel}>Reason</Text></View>
        <Text style={styles.reasonText}>{consultation.reason}</Text>
        {consultation.notes ? <Text style={styles.notesText}>{consultation.notes}</Text> : null}
      </View>

      <View style={styles.actionRow}>
        {canAccept(consultation) ? <TouchableOpacity style={[styles.acceptButton, isLoading ? styles.disabledAction : undefined]} activeOpacity={0.86} onPress={onAccept} disabled={isLoading}><CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.6} /><Text style={styles.acceptButtonText}>Accept</Text></TouchableOpacity> : null}
        {canReject(consultation) ? <TouchableOpacity style={[styles.rejectButton, isLoading ? styles.disabledAction : undefined]} activeOpacity={0.86} onPress={onReject} disabled={isLoading}><XCircle size={16} color={DANGER_DARK} strokeWidth={2.6} /><Text style={styles.rejectButtonText}>Reject</Text></TouchableOpacity> : null}
        {canJoin(consultation) ? <TouchableOpacity style={[styles.joinButton, isJoining ? styles.disabledAction : undefined]} activeOpacity={0.86} onPress={onJoin} disabled={isJoining}>{isJoining ? <ActivityIndicator size="small" color="#FFFFFF" /> : <><Video size={16} color="#FFFFFF" strokeWidth={2.6} /><Text style={styles.joinButtonText}>Join</Text></>}</TouchableOpacity> : null}
        {canComplete(consultation) ? <TouchableOpacity style={[styles.completeButton, isLoading ? styles.disabledAction : undefined]} activeOpacity={0.86} onPress={onComplete} disabled={isLoading}><CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.6} /><Text style={styles.completeButtonText}>Complete</Text></TouchableOpacity> : null}

        {!canAccept(consultation) && !canReject(consultation) && !canJoin(consultation) && !canComplete(consultation) ? <View style={styles.noActionBox}><History size={16} color={MUTED} strokeWidth={2.5} /><Text style={styles.noActionText}>No action needed</Text></View> : null}
      </View>
    </View>
  );
};

const InfoLine = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => <View style={styles.infoLine}>{icon}<Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue} numberOfLines={1}>{value}</Text></View>;

export default DoctorConsultationsScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  appBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  appBarTitle: { color: TEXT, fontSize: 26, fontWeight: "700", letterSpacing: -0.4 },
  appBarSubtitle: { color: MUTED, fontSize: 13, fontWeight: "600", marginTop: 3 },
  appBarButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", ...elevate(1) },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  summaryCard: { backgroundColor: DOCTOR_PRIMARY, borderRadius: 20, padding: 16, marginBottom: 14, overflow: "hidden", ...elevate(2) },
  summaryWatermark: { position: "absolute", top: -26, right: -26, opacity: 0.14 },
  summaryTopRow: { flexDirection: "row", alignItems: "center" },
  summaryIconRingOuter: { width: 58, height: 58, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginRight: 12 },
  summaryIconRingInner: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  summaryTextBlock: { flex: 1 },
  summaryTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", letterSpacing: -0.25 },
  summaryText: { color: "#D7FFFA", fontSize: 13, fontWeight: "600", lineHeight: 19, marginTop: 4 },
  summaryStatsRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  summaryStatGlass: { flex: 1, backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 13, paddingVertical: 11, alignItems: "center", ...elevate(1) },
  summaryStatDot: { width: 7, height: 7, borderRadius: 4, marginBottom: 5 },
  summaryStatValue: { color: DOCTOR_DARK, fontSize: 19, fontWeight: "800" },
  summaryStatLabel: { color: MUTED, fontSize: 10, fontWeight: "700", marginTop: 2 },
  filterPanel: { backgroundColor: SURFACE, borderRadius: 16, padding: 14, marginBottom: 14, ...elevate(1) },
  filterTitle: { color: TEXT, fontSize: 13, fontWeight: "700", marginBottom: 9 },
  filterTitleSpaced: { marginTop: 14 },
  filterRow: { paddingRight: 8, gap: 8 },
  materialChip: { flexDirection: "row", alignItems: "center", backgroundColor: "transparent", borderWidth: 1, borderColor: "#C7CCDA", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  materialChipSelected: { backgroundColor: DOCTOR_LIGHT, borderColor: DOCTOR_LIGHT },
  materialChipIcon: { marginRight: 6 },
  materialChipText: { color: MUTED, fontSize: 12, fontWeight: "600" },
  materialChipTextSelected: { color: DOCTOR_DARK, fontWeight: "700" },
  segmentedGroup: { flexDirection: "row", borderWidth: 1, borderColor: "#C7CCDA", borderRadius: 10, overflow: "hidden" },
  segmentedItem: { flex: 1, paddingVertical: 9, alignItems: "center", justifyContent: "center" },
  segmentedItemDivider: { borderRightWidth: 1, borderRightColor: "#C7CCDA" },
  segmentedItemSelected: { backgroundColor: DOCTOR_LIGHT },
  segmentedItemText: { color: MUTED, fontSize: 12, fontWeight: "600" },
  segmentedItemTextSelected: { color: DOCTOR_DARK, fontWeight: "700" },
  errorCard: { backgroundColor: DANGER_LIGHT, borderRadius: 14, padding: 14, marginBottom: 14, flexDirection: "row", alignItems: "flex-start", ...elevate(1) },
  errorText: { flex: 1, color: DANGER_DARK, fontSize: 13, fontWeight: "700", lineHeight: 19, marginLeft: 10 },
  sectionHeader: { marginTop: 8, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 10 },
  sectionAccentBar: { width: 4, height: 30, borderRadius: 2, backgroundColor: DOCTOR_PRIMARY, marginRight: 10 },
  sectionTitle: { color: TEXT, fontSize: 18, fontWeight: "700" },
  sectionSubtitle: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 2 },
  sectionIconBox: { width: 40, height: 40, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", ...elevate(1) },
  stateCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 22, alignItems: "center", marginBottom: 14, ...elevate(1) },
  emptyIconRingOuter: { width: 68, height: 68, borderRadius: 20, backgroundColor: SOFT_PANEL, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyIconBox: { width: 52, height: 52, borderRadius: 15, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center" },
  stateTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 10, textAlign: "center" },
  stateText: { color: MUTED, fontSize: 13, fontWeight: "600", lineHeight: 19, textAlign: "center", marginTop: 6 },
  listStack: { gap: 12 },
  consultationCard: { backgroundColor: SURFACE, borderRadius: 18, padding: 14, paddingLeft: 17, overflow: "hidden", borderWidth: 1, borderColor: "transparent", ...elevate(1) },
  focusedConsultationCard: { borderColor: DOCTOR_PRIMARY, borderWidth: 2, backgroundColor: "#F7FFFD" },
  focusedLabel: { alignSelf: "flex-start", backgroundColor: DOCTOR_LIGHT, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, marginBottom: 10 },
  focusedLabelText: { color: DOCTOR_DARK, fontSize: 10, fontWeight: "800" },
  consultationAccentBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  consultationTopRow: { flexDirection: "row", alignItems: "center" },
  patientIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  emergencyIconBox: { backgroundColor: DANGER_LIGHT },
  consultationTitleBlock: { flex: 1 },
  patientName: { color: TEXT, fontSize: 16, fontWeight: "700" },
  consultationMeta: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 3 },
  statusBadge: { flexDirection: "row", alignItems: "center", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, marginLeft: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  infoPanel: { backgroundColor: SOFT_PANEL, borderRadius: 13, padding: 11, marginTop: 12, gap: 8 },
  infoLine: { flexDirection: "row", alignItems: "center" },
  infoLabel: { color: MUTED, fontSize: 11, fontWeight: "700", marginLeft: 7, width: 70 },
  infoValue: { flex: 1, color: TEXT, fontSize: 12, fontWeight: "700" },
  reasonPanel: { marginTop: 12 },
  reasonHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  reasonLabel: { color: MUTED, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3, marginLeft: 6 },
  reasonText: { color: TEXT, fontSize: 13, fontWeight: "600", lineHeight: 19 },
  notesText: { color: MUTED, fontSize: 12, fontWeight: "600", lineHeight: 18, marginTop: 7 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  acceptButton: { flex: 1, backgroundColor: DOCTOR_PRIMARY, borderRadius: 999, paddingVertical: 11, alignItems: "center", justifyContent: "center", flexDirection: "row", ...elevate(1) },
  acceptButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", marginLeft: 6 },
  rejectButton: { flex: 1, backgroundColor: DANGER_LIGHT, borderRadius: 999, paddingVertical: 11, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  rejectButtonText: { color: DANGER_DARK, fontSize: 13, fontWeight: "700", marginLeft: 6 },
  joinButton: { flex: 1, backgroundColor: DOCTOR_PRIMARY, borderRadius: 999, paddingVertical: 11, alignItems: "center", justifyContent: "center", flexDirection: "row", ...elevate(1) },
  joinButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", marginLeft: 6 },
  completeButton: { flex: 1, backgroundColor: SUCCESS, borderRadius: 999, paddingVertical: 11, alignItems: "center", justifyContent: "center", flexDirection: "row", ...elevate(1) },
  completeButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", marginLeft: 6 },
  disabledAction: { opacity: 0.62 },
  noActionBox: { flex: 1, backgroundColor: SOFT_PANEL, borderRadius: 999, paddingVertical: 11, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  noActionText: { color: MUTED, fontSize: 13, fontWeight: "700", marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(17,25,54,0.45)", justifyContent: "center", paddingHorizontal: 18 },
  modalCard: { backgroundColor: SURFACE, borderRadius: 20, padding: 16, ...elevate(3) },
  modalHeader: { flexDirection: "row", alignItems: "center" },
  modalIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  modalTitleBlock: { flex: 1 },
  modalTitle: { color: TEXT, fontSize: 18, fontWeight: "700" },
  modalSubtitle: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 3 },
  modalCloseButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: SOFT_PANEL, alignItems: "center", justifyContent: "center" },
  modalLabel: { color: TEXT, fontSize: 13, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  modalInput: { minHeight: 120, backgroundColor: SOFT_PANEL, borderRadius: 13, paddingHorizontal: 13, paddingTop: 13, paddingBottom: 13, color: TEXT, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  modalButtonRow: { flexDirection: "row", gap: 10, marginTop: 15 },
  modalCancelButton: { flex: 1, backgroundColor: DOCTOR_LIGHT, borderRadius: 999, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  modalCancelText: { color: DOCTOR_DARK, fontSize: 14, fontWeight: "800" },
  modalSubmitButton: { flex: 1, borderRadius: 999, paddingVertical: 13, alignItems: "center", justifyContent: "center", ...elevate(1) },
  modalSubmitText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});