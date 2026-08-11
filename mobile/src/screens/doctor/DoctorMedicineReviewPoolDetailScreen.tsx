import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  HeartPulse,
  Pill,
  RefreshCw,
  ShieldCheck,
  Thermometer,
  XCircle,
} from "lucide-react-native";

import {
  doctorMedicineReviewsApi,
  type DoctorPoolMedicineReview,
} from "../../services/doctor/doctorMedicineReviewsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "DoctorMedicineReviewPoolDetail">;

type DecisionAction = "APPROVE" | "REJECT";

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
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

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const formatText = (value?: string | null) => {
  if (!value) return "Not recorded";
  return value.toLowerCase().split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
};

const formatFrequency = (review: DoctorPoolMedicineReview) => {
  if (review.medicine.frequency === "CUSTOM") {
    return review.medicine.customFrequency || "Custom schedule";
  }

  return formatText(review.medicine.frequency);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatVital = (value: number | null | undefined, suffix = "") =>
  value === null || value === undefined ? "Not recorded" : `${value}${suffix}`;

export const DoctorMedicineReviewPoolDetailScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const requestId = route.params.requestId;

  const [review, setReview] = useState<DoctorPoolMedicineReview | null>(null);
  const [clinicalNote, setClinicalNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeAction, setActiveAction] = useState<DecisionAction | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReview = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await doctorMedicineReviewsApi.getPoolReviewDetail(requestId);
      setReview(result.review);

      if (result.review.poolDoctorNote && !clinicalNote) {
        setClinicalNote(result.review.poolDoctorNote);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load medicine review.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [requestId, clinicalNote]);

  useFocusEffect(
    useCallback(() => {
      void loadReview("initial");
    }, [loadReview])
  );

  const submitDecision = async (action: DecisionAction) => {
    if (!review || activeAction) return;

    const note = clinicalNote.trim();

    if (action === "REJECT" && note.length < 3) {
      Alert.alert("Clinical note required", "Please enter a clear reason before rejecting this medicine review.");
      return;
    }

    Alert.alert(
      action === "APPROVE" ? "Approve medicine review" : "Reject medicine review",
      action === "APPROVE"
        ? "Submit this review as approved and return it to the administrator?"
        : "Submit this review as rejected and return it to the administrator?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action === "APPROVE" ? "Approve" : "Reject",
          style: action === "REJECT" ? "destructive" : "default",
          onPress: async () => {
            try {
              setActiveAction(action);

              const result =
                action === "APPROVE"
                  ? await doctorMedicineReviewsApi.approvePoolReview(requestId, note || undefined)
                  : await doctorMedicineReviewsApi.rejectPoolReview(requestId, note);

              setReview(result.review);

              Alert.alert(
                "Returned to administrator",
                "Your clinical review has been completed. The administrator must release the result before the patient can see it.",
                [{ text: "Done", onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              Alert.alert(
                "Unable to submit review",
                error instanceof Error ? error.message : "The medicine review could not be submitted."
              );
            } finally {
              setActiveAction(null);
            }
          },
        },
      ]
    );
  };

  const latestVitals = review?.clinicalContext.latestVitals || null;
  const completed = review?.routingStatus === "POOL_REVIEW_COMPLETED";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.84} onPress={() => navigation.goBack()}>
            <ArrowLeft size={21} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.appBarText}>
            <Text style={styles.title}>Medicine Review</Text>
            <Text style={styles.subtitle}>Restricted clinical review</Text>
          </View>

          <TouchableOpacity style={styles.refreshButton} activeOpacity={0.84} onPress={() => void loadReview("refresh")}>
            <RefreshCw size={20} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 30, 46) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadReview("refresh")}
              tintColor={DOCTOR_PRIMARY}
              colors={[DOCTOR_PRIMARY]}
            />
          }
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={DOCTOR_PRIMARY} />
              <Text style={styles.stateTitle}>Loading clinical context...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.errorCard}>
              <AlertCircle size={24} color={DANGER} strokeWidth={2.6} />
              <Text style={styles.errorTitle}>Unable to open review</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : review ? (
            <>
              <View style={styles.securityCard}>
                <ShieldCheck size={22} color={DOCTOR_PRIMARY} strokeWidth={2.6} />

                <View style={styles.securityText}>
                  <Text style={styles.securityTitle}>Restricted pool access</Text>

                  <Text style={styles.securityBody}>
                    You can access only the clinical information required for this medicine review. This patient is not added to your assigned-patient list.
                  </Text>
                </View>
              </View>

              <View style={styles.patientReferenceCard}>
                <Text style={styles.sectionKicker}>Patient reference</Text>
                <Text style={styles.patientReference}>{review.clinicalContext.patientReference}</Text>

                <View style={styles.patientMetaRow}>
                  <View style={styles.patientMetaItem}>
                    <Text style={styles.metaLabel}>Age</Text>
                    <Text style={styles.metaValue}>
                      {review.clinicalContext.age === null ? "Not recorded" : `${review.clinicalContext.age} years`}
                    </Text>
                  </View>

                  <View style={styles.patientMetaDivider} />

                  <View style={styles.patientMetaItem}>
                    <Text style={styles.metaLabel}>Gender</Text>
                    <Text style={styles.metaValue}>{formatText(review.clinicalContext.gender)}</Text>
                  </View>
                </View>
              </View>

              <SectionHeader title="Clinical context" />

              <View style={styles.whiteCard}>
                <InfoBlock
                  label="Medical conditions"
                  value={review.clinicalContext.medicalConditions || "No medical conditions recorded"}
                />

                <View style={styles.divider} />

                <InfoBlock
                  label="Allergies"
                  value={review.clinicalContext.allergies || "No allergies recorded"}
                  danger={Boolean(review.clinicalContext.allergies)}
                />
              </View>

              <SectionHeader title="Medicine under review" />

              <View style={styles.medicineCard}>
                <View style={styles.medicineHeader}>
                  <View style={styles.medicineIcon}>
                    <Pill size={25} color={DOCTOR_PRIMARY} strokeWidth={2.7} />
                  </View>

                  <View style={styles.medicineHeading}>
                    <Text style={styles.medicineName}>{review.medicine.name}</Text>
                    <Text style={styles.medicineDose}>{review.medicine.dose}</Text>
                  </View>

                  <View style={styles.requestChip}>
                    <Text style={styles.requestChipText}>
                      {review.requestType === "DELETE" ? "Removal" : "Review"}
                    </Text>
                  </View>
                </View>

                <View style={styles.medicineDetails}>
                  <DetailLine label="Frequency" value={formatFrequency(review)} />
                  <DetailLine label="Time" value={review.medicine.timeOfDay || "Not set"} />
                  <DetailLine label="Source" value={formatText(review.medicine.source)} />
                </View>

                <View style={styles.instructionsPanel}>
                  <Text style={styles.instructionsLabel}>Instructions</Text>
                  <Text style={styles.instructionsText}>
                    {review.medicine.instructions || "No instructions provided"}
                  </Text>
                </View>

                <View style={styles.reasonPanel}>
                  <Text style={styles.reasonLabel}>Review reason</Text>
                  <Text style={styles.reasonText}>
                    {review.patientReason ||
                      (review.requestType === "DELETE"
                        ? "Patient requested medicine removal review."
                        : "Medicine submitted for clinical review.")}
                  </Text>
                </View>
              </View>

              <SectionHeader title="Other active medicines" />

              {review.clinicalContext.otherActiveMedicines.length > 0 ? (
                review.clinicalContext.otherActiveMedicines.map(medicine => (
                  <View key={medicine.id} style={styles.activeMedicineCard}>
                    <View style={styles.smallPillIcon}>
                      <Pill size={18} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
                    </View>

                    <View style={styles.activeMedicineText}>
                      <Text style={styles.activeMedicineName}>{medicine.name}</Text>
                      <Text style={styles.activeMedicineDose}>{medicine.dose}</Text>

                      {medicine.instructions ? (
                        <Text style={styles.activeMedicineInstructions}>{medicine.instructions}</Text>
                      ) : null}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyPanel}>
                  <Text style={styles.emptyPanelText}>No other active medicines recorded.</Text>
                </View>
              )}

              <SectionHeader title="Latest vitals" />

              {latestVitals ? (
                <View style={styles.vitalsCard}>
                  <View style={styles.vitalStatusRow}>
                    <View style={styles.vitalStatusIcon}>
                      <Activity size={20} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
                    </View>

                    <View style={styles.vitalStatusText}>
                      <Text style={styles.vitalStatusLabel}>Latest reading status</Text>
                      <Text style={styles.vitalStatusValue}>{formatText(latestVitals.status)}</Text>
                    </View>

                    <Text style={styles.vitalDate}>{formatDateTime(latestVitals.recordedAt)}</Text>
                  </View>

                  <View style={styles.vitalsGrid}>
                    <VitalItem
                      icon={<HeartPulse size={18} color={DANGER} strokeWidth={2.5} />}
                      label="Heart rate"
                      value={formatVital(latestVitals.heartRate, " bpm")}
                    />

                    <VitalItem
                      icon={<Activity size={18} color={DOCTOR_PRIMARY} strokeWidth={2.5} />}
                      label="SpO₂"
                      value={formatVital(latestVitals.spo2, "%")}
                    />

                    <VitalItem
                      icon={<HeartPulse size={18} color={WARNING} strokeWidth={2.5} />}
                      label="Blood pressure"
                      value={
                        latestVitals.bpSystolic !== null && latestVitals.bpDiastolic !== null
                          ? `${latestVitals.bpSystolic}/${latestVitals.bpDiastolic} mmHg`
                          : "Not recorded"
                      }
                    />

                    <VitalItem
                      icon={<Activity size={18} color={DOCTOR_PRIMARY} strokeWidth={2.5} />}
                      label="Glucose"
                      value={formatVital(latestVitals.glucose)}
                    />

                    <VitalItem
                      icon={<Thermometer size={18} color={WARNING} strokeWidth={2.5} />}
                      label="Temperature"
                      value={formatVital(latestVitals.temperature, " °C")}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.emptyPanel}>
                  <Text style={styles.emptyPanelText}>No recent vital reading is available.</Text>
                </View>
              )}

              <SectionHeader title="Clinical review note" />

              <View style={styles.noteCard}>
                <Text style={styles.noteHelper}>
                  Record the clinical reasoning that should accompany this medicine review.
                </Text>

                <TextInput
                  style={styles.noteInput}
                  placeholder="Enter clinical review note..."
                  placeholderTextColor={MUTED}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                  value={clinicalNote}
                  onChangeText={setClinicalNote}
                  editable={!completed && !activeAction}
                />

                <Text style={styles.characterCount}>{clinicalNote.length}/500</Text>
              </View>

              {completed ? (
                <View style={styles.completedCard}>
                  <CheckCircle2 size={22} color={SUCCESS_DARK} strokeWidth={2.6} />

                  <View style={styles.completedText}>
                    <Text style={styles.completedTitle}>Returned to administrator</Text>

                    <Text style={styles.completedBody}>
                      Decision: {formatText(review.poolDecision)}. The administrator must release this result before the patient can see it.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.rejectButton, activeAction ? styles.disabledButton : undefined]}
                    activeOpacity={0.84}
                    disabled={Boolean(activeAction) || !review.canReject}
                    onPress={() => void submitDecision("REJECT")}
                  >
                    {activeAction === "REJECT" ? (
                      <ActivityIndicator size="small" color={DANGER_DARK} />
                    ) : (
                      <>
                        <XCircle size={18} color={DANGER_DARK} strokeWidth={2.6} />
                        <Text style={styles.rejectText}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.approveButton, activeAction ? styles.disabledButton : undefined]}
                    activeOpacity={0.84}
                    disabled={Boolean(activeAction) || !review.canApprove}
                    onPress={() => void submitDecision("APPROVE")}
                  >
                    {activeAction === "APPROVE" ? (
                      <ActivityIndicator size="small" color={SURFACE} />
                    ) : (
                      <>
                        <CheckCircle2 size={18} color={SURFACE} strokeWidth={2.6} />
                        <Text style={styles.approveText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const SectionHeader = ({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const InfoBlock = ({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) => (
  <View>
    <Text style={[styles.infoLabel, danger ? { color: DANGER_DARK } : undefined]}>{label}</Text>
    <Text style={[styles.infoValue, danger ? { color: DANGER_DARK } : undefined]}>{value}</Text>
  </View>
);

const DetailLine = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailLine}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const VitalItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <View style={styles.vitalItem}>
    <View style={styles.vitalIcon}>{icon}</View>

    <View style={styles.vitalText}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <Text style={styles.vitalValue}>{value}</Text>
    </View>
  </View>
);

export default DoctorMedicineReviewPoolDetailScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },

  appBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    ...elevate(1),
  },

  appBarText: { flex: 1, paddingHorizontal: 12 },
  title: { color: TEXT, fontSize: 21, fontWeight: "700" },
  subtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 2 },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    ...elevate(1),
  },

  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4 },

  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    ...elevate(1),
  },

  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 10 },

  errorCard: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },

  errorTitle: { color: DANGER_DARK, fontSize: 15, fontWeight: "700", marginTop: 9 },
  errorText: { color: DANGER_DARK, fontSize: 11, fontWeight: "500", textAlign: "center", marginTop: 5 },

  securityCard: {
    backgroundColor: DOCTOR_LIGHT,
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  securityText: { flex: 1, marginLeft: 10 },
  securityTitle: { color: DOCTOR_DARK, fontSize: 13, fontWeight: "700" },

  securityBody: {
    color: DOCTOR_DARK,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 15,
    marginTop: 3,
  },

  patientReferenceCard: {
    backgroundColor: DOCTOR_PRIMARY,
    borderRadius: 17,
    padding: 16,
    ...elevate(2),
  },

  sectionKicker: { color: "#D7FFFA", fontSize: 10, fontWeight: "700" },
  patientReference: { color: "#FFFFFF", fontSize: 23, fontWeight: "700", marginTop: 3 },

  patientMetaRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 12,
    marginTop: 13,
    paddingVertical: 10,
  },

  patientMetaItem: { flex: 1, paddingHorizontal: 11 },
  patientMetaDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.24)" },
  metaLabel: { color: "#D7FFFA", fontSize: 9, fontWeight: "600" },
  metaValue: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", marginTop: 2 },

  sectionHeader: { marginTop: 18, marginBottom: 8 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },

  whiteCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    ...elevate(1),
  },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },
  infoLabel: { color: MUTED, fontSize: 10, fontWeight: "700" },
  infoValue: { color: TEXT, fontSize: 13, fontWeight: "600", lineHeight: 19, marginTop: 4 },

  medicineCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    ...elevate(1),
  },

  medicineHeader: { flexDirection: "row", alignItems: "center" },

  medicineIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  medicineHeading: { flex: 1 },
  medicineName: { color: TEXT, fontSize: 17, fontWeight: "700" },
  medicineDose: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 3 },

  requestChip: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  requestChipText: { color: WARNING_DARK, fontSize: 9, fontWeight: "700" },

  medicineDetails: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 12,
    padding: 10,
    marginTop: 13,
  },

  detailLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },

  detailLabel: { color: MUTED, fontSize: 11, fontWeight: "600" },
  detailValue: { color: TEXT, fontSize: 11, fontWeight: "700", flexShrink: 1, textAlign: "right" },

  instructionsPanel: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 12,
    padding: 11,
    marginTop: 11,
  },

  instructionsLabel: { color: WARNING_DARK, fontSize: 10, fontWeight: "700" },
  instructionsText: { color: WARNING_DARK, fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 3 },

  reasonPanel: {
    backgroundColor: DOCTOR_LIGHT,
    borderRadius: 12,
    padding: 11,
    marginTop: 10,
  },

  reasonLabel: { color: DOCTOR_DARK, fontSize: 10, fontWeight: "700" },
  reasonText: { color: DOCTOR_DARK, fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 3 },

  activeMedicineCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    ...elevate(1),
  },

  smallPillIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  activeMedicineText: { flex: 1 },
  activeMedicineName: { color: TEXT, fontSize: 13, fontWeight: "700" },
  activeMedicineDose: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 2 },

  activeMedicineInstructions: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 15,
    marginTop: 4,
  },

  emptyPanel: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 15,
    ...elevate(1),
  },

  emptyPanelText: { color: MUTED, fontSize: 11, fontWeight: "500" },

  vitalsCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    ...elevate(1),
  },

  vitalStatusRow: { flexDirection: "row", alignItems: "center" },

  vitalStatusIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  vitalStatusText: { flex: 1 },
  vitalStatusLabel: { color: MUTED, fontSize: 9, fontWeight: "600" },
  vitalStatusValue: { color: TEXT, fontSize: 13, fontWeight: "700", marginTop: 2 },
  vitalDate: { color: MUTED, fontSize: 9, fontWeight: "600", maxWidth: 90, textAlign: "right" },

  vitalsGrid: { marginTop: 11 },

  vitalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  vitalIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  vitalText: { flex: 1 },
  vitalLabel: { color: MUTED, fontSize: 10, fontWeight: "600" },
  vitalValue: { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 2 },

  noteCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    ...elevate(1),
  },

  noteHelper: { color: MUTED, fontSize: 10, fontWeight: "500", lineHeight: 15 },

  noteInput: {
    minHeight: 115,
    backgroundColor: SOFT_PANEL,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    color: TEXT,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    padding: 11,
    marginTop: 10,
  },

  characterCount: { color: MUTED, fontSize: 9, fontWeight: "600", textAlign: "right", marginTop: 5 },

  actions: { flexDirection: "row", marginTop: 16 },

  rejectButton: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    backgroundColor: DANGER_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },

  rejectText: { color: DANGER_DARK, fontSize: 13, fontWeight: "700", marginLeft: 6 },

  approveButton: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    backgroundColor: SUCCESS,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },

  approveText: { color: SURFACE, fontSize: 13, fontWeight: "700", marginLeft: 6 },
  disabledButton: { opacity: 0.58 },

  completedCard: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 15,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
  },

  completedText: { flex: 1, marginLeft: 10 },
  completedTitle: { color: SUCCESS_DARK, fontSize: 13, fontWeight: "700" },

  completedBody: {
    color: SUCCESS_DARK,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 15,
    marginTop: 3,
  },
});