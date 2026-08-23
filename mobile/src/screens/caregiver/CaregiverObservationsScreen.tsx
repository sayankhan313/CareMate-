import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity, ChevronLeft, Clock3, FileText, Heart, Moon, Pill, Plus, RefreshCw, Smile, Utensils, X } from "lucide-react-native";

import { caregiverObservationApi, type CaregiverObservation, type CaregiverObservationCategory, type CaregiverObservationList } from "../../services/caregiver/caregiverObservationApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "CaregiverObservations">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PRIMARY = "#F6A545";
const PRIMARY_DARK = "#8A520E";
const PRIMARY_LIGHT = "#FFF3E2";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#E8F7F0";
const DANGER = "#DC4C57";
const DANGER_LIGHT = "#FDEBED";
const BLUE = "#5579D9";
const BLUE_LIGHT = "#EDF2FF";

const CATEGORIES: Array<{ value: CaregiverObservationCategory; label: string }> = [
  { value: "GENERAL", label: "General" },
  { value: "ROUTINE", label: "Routine" },
  { value: "APPETITE", label: "Appetite" },
  { value: "SLEEP", label: "Sleep" },
  { value: "MOBILITY", label: "Mobility" },
  { value: "MOOD", label: "Mood" },
  { value: "MEDICATION_SUPPORT", label: "Medication support" },
];

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const categoryLabel = (category: CaregiverObservationCategory) => CATEGORIES.find(item => item.value === category)?.label || "General";

const CategoryIcon = ({ category, size = 18 }: { category: CaregiverObservationCategory; size?: number }) => {
  if (category === "MEDICATION_SUPPORT") return <Pill size={size} color={PRIMARY_DARK} strokeWidth={2.5} />;
  if (category === "SLEEP") return <Moon size={size} color={BLUE} strokeWidth={2.5} />;
  if (category === "APPETITE") return <Utensils size={size} color={SUCCESS_DARK} strokeWidth={2.5} />;
  if (category === "MOBILITY") return <Activity size={size} color={BLUE} strokeWidth={2.5} />;
  if (category === "MOOD") return <Smile size={size} color={PRIMARY_DARK} strokeWidth={2.5} />;
  if (category === "ROUTINE") return <Clock3 size={size} color={BLUE} strokeWidth={2.5} />;
  return <FileText size={size} color={PRIMARY_DARK} strokeWidth={2.5} />;
};

export const CaregiverObservationsScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<CaregiverObservationList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [category, setCategory] = useState<CaregiverObservationCategory>("GENERAL");
  const [observation, setObservation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadObservations = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      setErrorMessage("");
      setData(await caregiverObservationApi.listPatientObservations(route.params.patientId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load care observations.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [route.params.patientId]);

  useFocusEffect(useCallback(() => {
    void loadObservations("initial");
  }, [loadObservations]));

  const openAddObservation = () => {
    setCategory("GENERAL");
    setObservation("");
    setIsModalVisible(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalVisible(false);
  };

  const submitObservation = async () => {
    const trimmed = observation.trim();

    if (trimmed.length < 2) {
      Alert.alert("Add an observation", "Enter a short care observation first.");
      return;
    }

    try {
      setIsSubmitting(true);
      await caregiverObservationApi.createObservation(route.params.patientId, { category, observation: trimmed });
      setIsModalVisible(false);
      setObservation("");
      setCategory("GENERAL");
      await loadObservations("refresh");
    } catch (error) {
      Alert.alert("Couldn't add observation", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.82} onPress={() => navigation.goBack()}>
            <ChevronLeft size={23} color={TEXT} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Care observations</Text>
            <Text style={styles.headerSubtitle}>{data?.patient.fullName || route.params.patientName || "Patient"}</Text>
          </View>

          <TouchableOpacity style={styles.addHeaderButton} activeOpacity={0.84} onPress={openAddObservation}>
            <Plus size={21} color={SURFACE} strokeWidth={2.7} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 30, 46) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadObservations("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading observations</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.stateCard}>
              <View style={styles.errorIcon}><RefreshCw size={24} color={DANGER} strokeWidth={2.6} /></View>
              <Text style={styles.stateTitle}>Couldn't load observations</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => void loadObservations("initial")}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage && data ? (
            <>
              <LinearGradient colors={[PRIMARY, "#F1B95F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
                <View style={styles.heroCircle} />

                <View style={styles.heroTop}>
                  <View style={styles.heroIcon}><Heart size={27} color={PRIMARY_DARK} strokeWidth={2.6} /></View>

                  <View style={styles.heroText}>
                    <Text style={styles.heroEyebrow}>CARE SUPPORT</Text>
                    <Text style={styles.heroTitle}>Everyday observations</Text>
                    <Text style={styles.heroSubtitle}>Record useful non-clinical care notes</Text>
                  </View>
                </View>

                <View style={styles.heroStats}>
                  <HeroStat value={data.summary.total} label="Total" />
                  <View style={styles.heroDivider} />
                  <HeroStat value={data.summary.routine} label="Routine" />
                  <View style={styles.heroDivider} />
                  <HeroStat value={data.summary.medicationSupport} label="Medicine" />
                </View>
              </LinearGradient>

              <View style={styles.noticeCard}>
                <View style={styles.noticeIcon}><FileText size={20} color={BLUE} strokeWidth={2.5} /></View>
                <View style={styles.noticeText}>
                  <Text style={styles.noticeTitle}>Non-clinical notes</Text>
                  <Text style={styles.noticeSubtitle}>Use observations for everyday care information, not diagnosis or medical instructions.</Text>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Recent observations</Text>
                  <Text style={styles.sectionSubtitle}>{data.summary.total} recorded</Text>
                </View>

                <TouchableOpacity style={styles.addButton} activeOpacity={0.84} onPress={openAddObservation}>
                  <Plus size={15} color={PRIMARY_DARK} strokeWidth={2.7} />
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              {data.observations.length ? (
                <View style={styles.observationStack}>
                  {data.observations.map(item => <ObservationCard key={item.id} observation={item} />)}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}><FileText size={27} color={PRIMARY_DARK} strokeWidth={2.5} /></View>
                  <Text style={styles.emptyTitle}>No observations yet</Text>
                  <Text style={styles.emptyText}>Add a short note when there is useful everyday care information to record.</Text>
                  <TouchableOpacity style={styles.emptyButton} activeOpacity={0.85} onPress={openAddObservation}><Plus size={16} color={SURFACE} strokeWidth={2.6} /><Text style={styles.emptyButtonText}>Add observation</Text></TouchableOpacity>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      </View>

      <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add observation</Text>
                <Text style={styles.modalSubtitle}>{data?.patient.fullName || route.params.patientName || "Patient"}</Text>
              </View>

              <TouchableOpacity style={styles.closeButton} activeOpacity={0.82} disabled={isSubmitting} onPress={closeModal}>
                <X size={20} color={TEXT} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Category</Text>

            <View style={styles.categoryGrid}>
              {CATEGORIES.map(item => {
                const selected = category === item.value;

                return (
                  <TouchableOpacity key={item.value} style={[styles.categoryChip, selected ? styles.categoryChipSelected : undefined]} activeOpacity={0.84} onPress={() => setCategory(item.value)}>
                    <CategoryIcon category={item.value} size={15} />
                    <Text style={[styles.categoryChipText, selected ? styles.categoryChipTextSelected : undefined]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Observation</Text>

            <TextInput
              style={styles.textInput}
              value={observation}
              onChangeText={setObservation}
              placeholder="e.g. Ate less than usual today."
              placeholderTextColor="#A0A6B5"
              multiline
              maxLength={1000}
              textAlignVertical="top"
              editable={!isSubmitting}
            />

            <View style={styles.inputFooter}>
              <Text style={styles.inputHelper}>Keep it factual and non-clinical.</Text>
              <Text style={styles.characterCount}>{observation.length}/1000</Text>
            </View>

            <TouchableOpacity style={[styles.saveButton, observation.trim().length < 2 || isSubmitting ? styles.saveButtonDisabled : undefined]} activeOpacity={0.86} disabled={observation.trim().length < 2 || isSubmitting} onPress={() => void submitObservation()}>
              {isSubmitting ? <ActivityIndicator size="small" color={SURFACE} /> : <Text style={styles.saveButtonText}>Save observation</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const ObservationCard = ({ observation }: { observation: CaregiverObservation }) => (
  <View style={styles.observationCard}>
    <View style={styles.observationHeader}>
      <View style={styles.observationIcon}><CategoryIcon category={observation.category} /></View>

      <View style={styles.observationHeaderText}>
        <Text style={styles.observationCategory}>{categoryLabel(observation.category)}</Text>
        <Text style={styles.observationTime}>{formatDateTime(observation.observedAt)}</Text>
      </View>
    </View>

    <Text style={styles.observationText}>{observation.observation}</Text>

    {observation.caregiverName ? <Text style={styles.authorText}>Added by {observation.caregiverName}</Text> : null}
  </View>
);

const HeroStat = ({ value, label }: { value: number; label: string }) => (
  <View style={styles.heroStat}>
    <Text style={styles.heroStatValue}>{value}</Text>
    <Text style={styles.heroStatLabel}>{label}</Text>
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
  addHeaderButton: { width: 43, height: 43, borderRadius: 14, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 5 },
  heroCard: { borderRadius: 23, padding: 18, overflow: "hidden" },
  heroCircle: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.10)", right: -70, top: -80 },
  heroTop: { flexDirection: "row", alignItems: "center" },
  heroIcon: { width: 57, height: 57, borderRadius: 18, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  heroText: { flex: 1 },
  heroEyebrow: { color: "#FFF8EC", fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: SURFACE, fontSize: 20, fontWeight: "800", marginTop: 4 },
  heroSubtitle: { color: "#FFF8EC", fontSize: 9, fontWeight: "600", marginTop: 3 },
  heroStats: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 15, marginTop: 18, paddingVertical: 12 },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { color: SURFACE, fontSize: 20, fontWeight: "800" },
  heroStatLabel: { color: "#FFF8EC", fontSize: 8, fontWeight: "700", marginTop: 3 },
  heroDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.28)" },

  noticeCard: { backgroundColor: BLUE_LIGHT, borderRadius: 17, padding: 13, flexDirection: "row", alignItems: "center", marginTop: 12 },
  noticeIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 10 },
  noticeText: { flex: 1 },
  noticeTitle: { color: TEXT, fontSize: 12, fontWeight: "800" },
  noticeSubtitle: { color: MUTED, fontSize: 9, lineHeight: 14, fontWeight: "600", marginTop: 3 },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 21, marginBottom: 10, paddingHorizontal: 2 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "800" },
  sectionSubtitle: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },
  addButton: { minHeight: 34, backgroundColor: PRIMARY_LIGHT, borderRadius: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" },
  addButtonText: { color: PRIMARY_DARK, fontSize: 9, fontWeight: "800", marginLeft: 5 },

  observationStack: { gap: 10 },
  observationCard: { backgroundColor: SURFACE, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: BORDER },
  observationHeader: { flexDirection: "row", alignItems: "center" },
  observationIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 10 },
  observationHeaderText: { flex: 1 },
  observationCategory: { color: TEXT, fontSize: 12, fontWeight: "800" },
  observationTime: { color: MUTED, fontSize: 8.5, fontWeight: "600", marginTop: 3 },
  observationText: { color: TEXT, fontSize: 11, lineHeight: 17, fontWeight: "600", marginTop: 12 },
  authorText: { color: MUTED, fontSize: 8, fontWeight: "600", marginTop: 10 },

  emptyCard: { backgroundColor: PRIMARY_LIGHT, borderRadius: 18, padding: 28, alignItems: "center" },
  emptyIcon: { width: 55, height: 55, borderRadius: 17, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontSize: 14, fontWeight: "800", marginTop: 12 },
  emptyText: { color: MUTED, fontSize: 9, lineHeight: 14, fontWeight: "600", textAlign: "center", marginTop: 5 },
  emptyButton: { minHeight: 39, borderRadius: 11, backgroundColor: PRIMARY, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", marginTop: 14 },
  emptyButtonText: { color: SURFACE, fontSize: 10, fontWeight: "800", marginLeft: 6 },

  stateCard: { backgroundColor: SURFACE, borderRadius: 18, alignItems: "center", paddingVertical: 65, paddingHorizontal: 24 },
  errorIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 11 },
  stateText: { color: MUTED, fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 5 },
  retryButton: { backgroundColor: PRIMARY, borderRadius: 11, paddingHorizontal: 17, paddingVertical: 10, marginTop: 15 },
  retryText: { color: SURFACE, fontSize: 11, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(17,25,54,0.38)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: SURFACE, borderTopLeftRadius: 27, borderTopRightRadius: 27, paddingHorizontal: 18, paddingTop: 9 },
  modalHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: "center", marginBottom: 15 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { color: TEXT, fontSize: 20, fontWeight: "800" },
  modalSubtitle: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 3 },
  closeButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: BACKGROUND, alignItems: "center", justifyContent: "center" },
  inputLabel: { color: TEXT, fontSize: 11, fontWeight: "800", marginTop: 18, marginBottom: 8 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  categoryChip: { minHeight: 36, borderRadius: 10, backgroundColor: BACKGROUND, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: BORDER },
  categoryChipSelected: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  categoryChipText: { color: MUTED, fontSize: 9, fontWeight: "700", marginLeft: 5 },
  categoryChipTextSelected: { color: PRIMARY_DARK },
  textInput: { height: 130, borderRadius: 14, backgroundColor: BACKGROUND, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 11, color: TEXT, fontSize: 12, lineHeight: 18, fontWeight: "500" },
  inputFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  inputHelper: { color: MUTED, fontSize: 8.5, fontWeight: "600" },
  characterCount: { color: MUTED, fontSize: 8.5, fontWeight: "600" },
  saveButton: { height: 48, borderRadius: 14, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", marginTop: 17 },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { color: SURFACE, fontSize: 12, fontWeight: "800" },
});