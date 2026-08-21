import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarDays, ChevronLeft, ChevronRight, Mail, Pill, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react-native";

import { caregiverPatientsApi, type CaregiverLinkedPatientDetail } from "../../services/caregiver/caregiverPatientsApi";
import type { RootStackParamList } from "../../types/navigation";

type CaregiverPatientDetailScreenProps = NativeStackScreenProps<RootStackParamList, "CaregiverPatientDetail">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const PRIMARY = "#F6A545";
const PRIMARY_DARK = "#8A520E";
const PRIMARY_LIGHT = "#FFF3E2";
const PRIMARY_SECONDARY = "#F8C36A";
const SUCCESS = "#3A9D75";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#E8F7F0";
const DANGER = "#DC4C57";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FDEBED";
const BLUE = "#5579D9";
const BLUE_LIGHT = "#EDF2FF";

const getInitials = (name?: string | null) => {
  if (!name) return "P";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0]?.charAt(0) || ""}${parts[1]?.charAt(0) || ""}`.toUpperCase();
};

const formatLinkedDate = (value?: string | null) => {
  if (!value) return "Active";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Active";
  return `Linked ${date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}`;
};

export const CaregiverPatientDetailScreen = ({ navigation, route }: CaregiverPatientDetailScreenProps) => {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<CaregiverLinkedPatientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPatient = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      setErrorMessage("");

      const result = await caregiverPatientsApi.getLinkedPatient(route.params.patientId);
      setData(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load patient.");
    } finally {
      if (mode === "initial") setIsLoading(false);
      if (mode === "refresh") setIsRefreshing(false);
    }
  }, [route.params.patientId]);

  useFocusEffect(useCallback(() => {
    void loadPatient("initial");
  }, [loadPatient]));

  const openCaregiverTab = (screen: "Safety" | "Appointments") => {
    navigation.dispatch(CommonActions.navigate({ name: "CaregiverTabs", params: { screen } }));
  };

  const openMedicines = () => {
    navigation.navigate("CaregiverMedications", {
      patientId: route.params.patientId,
      patientName: data?.patient.fullName || route.params.patientName,
    });
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
            <Text style={styles.headerTitle}>Patient</Text>
            <Text style={styles.headerSubtitle}>Care overview</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 30, 46) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadPatient("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {isLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading patient</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.stateContainer}>
              <View style={styles.errorIcon}>
                <RefreshCw size={24} color={DANGER} strokeWidth={2.5} />
              </View>

              <Text style={styles.stateTitle}>Couldn't load patient</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>

              <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => void loadPatient("initial")}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage && data ? (
            <>
              <LinearGradient colors={[PRIMARY, PRIMARY_SECONDARY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
                <View style={styles.heroCircleLarge} />
                <View style={styles.heroCircleSmall} />

                <View style={styles.heroTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(data.patient.fullName)}</Text>
                  </View>

                  <View style={styles.linkedBadge}>
                    <ShieldCheck size={14} color={SURFACE} strokeWidth={2.5} />
                    <Text style={styles.linkedBadgeText}>Linked</Text>
                  </View>
                </View>

                <Text style={styles.patientName}>{data.patient.fullName}</Text>

                <View style={styles.emailRow}>
                  <Mail size={14} color="#FFF8EC" strokeWidth={2.3} />
                  <Text style={styles.patientEmail}>{data.patient.email}</Text>
                </View>

                <View style={styles.heroFooter}>
                  <View style={styles.activeDot} />
                  <Text style={styles.heroFooterText}>{formatLinkedDate(data.relationship.linkedAt)}</Text>
                </View>
              </LinearGradient>

              <View style={styles.accessCard}>
                <View style={styles.accessIcon}>
                  <ShieldCheck size={23} color={SUCCESS_DARK} strokeWidth={2.6} />
                </View>

                <View style={styles.accessTextBlock}>
                  <Text style={styles.accessTitle}>Caregiver access</Text>
                  <Text style={styles.accessSubtitle}>Your connection with this patient is active</Text>
                </View>

                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Patient care</Text>
                <Text style={styles.sectionSubtitle}>Monitor and support</Text>
              </View>

              <TouchableOpacity style={styles.medicineCard} activeOpacity={0.86} onPress={openMedicines}>
                <View style={styles.medicineTop}>
                  <View style={styles.medicineIcon}>
                    <Pill size={26} color={PRIMARY_DARK} strokeWidth={2.6} />
                  </View>

                  <View style={styles.cardArrow}>
                    <ChevronRight size={20} color={PRIMARY_DARK} strokeWidth={2.5} />
                  </View>
                </View>

                <Text style={styles.medicineTitle}>Medicines</Text>
                <Text style={styles.medicineSubtitle}>View schedules, dose status and stock levels</Text>

                <View style={styles.medicineFooter}>
                  <Text style={styles.medicineFooterText}>Medication support</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.twoColumn}>
                <TouchableOpacity style={styles.safetyCard} activeOpacity={0.86} onPress={() => openCaregiverTab("Safety")}>
                  <View style={styles.safetyIcon}>
                    <ShieldAlert size={24} color={DANGER} strokeWidth={2.6} />
                  </View>

                  <Text style={styles.smallCardTitle}>Safety</Text>
                  <Text style={styles.smallCardSubtitle}>Alerts and patient status</Text>

                  <View style={styles.smallCardFooter}>
                    <Text style={styles.safetyFooterText}>View alerts</Text>
                    <ChevronRight size={16} color={DANGER_DARK} strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.appointmentCard} activeOpacity={0.86} onPress={() => openCaregiverTab("Appointments")}>
                  <View style={styles.appointmentIcon}>
                    <CalendarDays size={24} color={BLUE} strokeWidth={2.6} />
                  </View>

                  <Text style={styles.smallCardTitle}>Appointments</Text>
                  <Text style={styles.smallCardSubtitle}>Consultations and requests</Text>

                  <View style={styles.smallCardFooter}>
                    <Text style={styles.appointmentFooterText}>View schedule</Text>
                    <ChevronRight size={16} color={BLUE} strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.supportPanel}>
                <View style={styles.supportIcon}>
                  <ShieldCheck size={20} color={PRIMARY_DARK} strokeWidth={2.5} />
                </View>

                <View style={styles.supportText}>
                  <Text style={styles.supportTitle}>Care support</Text>
                  <Text style={styles.supportSubtitle}>Monitor, remind and coordinate care from one place.</Text>
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { height: 68, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  backButton: { width: 43, height: 43, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12, elevation: 2, shadowColor: "#172033", shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  headerText: { flex: 1 },
  headerTitle: { color: TEXT, fontSize: 20, fontWeight: "800", letterSpacing: -0.2 },
  headerSubtitle: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 2 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 5 },

  heroCard: { minHeight: 235, borderRadius: 24, padding: 20, overflow: "hidden", elevation: 5, shadowColor: "#A86212", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  heroCircleLarge: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.10)", right: -60, top: -70 },
  heroCircleSmall: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.10)", right: 40, bottom: -50 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  avatar: { width: 72, height: 72, borderRadius: 22, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  avatarText: { color: PRIMARY_DARK, fontSize: 22, fontWeight: "800" },
  linkedBadge: { backgroundColor: "rgba(255,255,255,0.24)", borderRadius: 11, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center" },
  linkedBadgeText: { color: SURFACE, fontSize: 10, fontWeight: "800", marginLeft: 5 },
  patientName: { color: SURFACE, fontSize: 25, fontWeight: "800", marginTop: 21, letterSpacing: -0.3 },
  emailRow: { flexDirection: "row", alignItems: "center", marginTop: 7 },
  patientEmail: { color: "#FFF8EC", fontSize: 11, fontWeight: "600", marginLeft: 6 },
  heroFooter: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, marginTop: 16 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: SURFACE, marginRight: 6 },
  heroFooterText: { color: SURFACE, fontSize: 9, fontWeight: "700" },

  accessCard: { backgroundColor: SUCCESS_LIGHT, borderRadius: 18, padding: 14, marginTop: 13, flexDirection: "row", alignItems: "center" },
  accessIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  accessTextBlock: { flex: 1, paddingRight: 8 },
  accessTitle: { color: SUCCESS_DARK, fontSize: 13, fontWeight: "800" },
  accessSubtitle: { color: "#4D806D", fontSize: 9, fontWeight: "600", lineHeight: 14, marginTop: 3 },
  activeBadge: { backgroundColor: SURFACE, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  activeBadgeText: { color: SUCCESS_DARK, fontSize: 9, fontWeight: "800" },

  sectionHeader: { marginTop: 22, marginBottom: 10, paddingHorizontal: 2 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "800" },
  sectionSubtitle: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 3 },

  medicineCard: { minHeight: 176, borderRadius: 20, backgroundColor: PRIMARY_LIGHT, padding: 17, overflow: "hidden", borderWidth: 1, borderColor: "#FBE1B9" },
  medicineTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  medicineIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  cardArrow: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(246,165,69,0.18)", alignItems: "center", justifyContent: "center" },
  medicineTitle: { color: TEXT, fontSize: 18, fontWeight: "800", marginTop: 17 },
  medicineSubtitle: { color: "#7F6B53", fontSize: 10, lineHeight: 16, fontWeight: "600", marginTop: 4 },
  medicineFooter: { alignSelf: "flex-start", backgroundColor: SURFACE, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginTop: 12 },
  medicineFooterText: { color: PRIMARY_DARK, fontSize: 8, fontWeight: "800" },

  twoColumn: { flexDirection: "row", marginTop: 11 },
  safetyCard: { flex: 1, minHeight: 184, backgroundColor: DANGER_LIGHT, borderRadius: 20, padding: 15, marginRight: 6, borderWidth: 1, borderColor: "#F8D6D9" },
  appointmentCard: { flex: 1, minHeight: 184, backgroundColor: BLUE_LIGHT, borderRadius: 20, padding: 15, marginLeft: 6, borderWidth: 1, borderColor: "#DDE5FC" },
  safetyIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  appointmentIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  smallCardTitle: { color: TEXT, fontSize: 14, fontWeight: "800", marginTop: 13 },
  smallCardSubtitle: { color: MUTED, fontSize: 9, lineHeight: 14, fontWeight: "600", marginTop: 4, minHeight: 30 },
  smallCardFooter: { flexDirection: "row", alignItems: "center", marginTop: "auto", paddingTop: 10 },
  safetyFooterText: { flex: 1, color: DANGER_DARK, fontSize: 9, fontWeight: "800" },
  appointmentFooterText: { flex: 1, color: BLUE, fontSize: 9, fontWeight: "800" },

  supportPanel: { backgroundColor: "#FFF8EE", borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "center", marginTop: 12, borderWidth: 1, borderColor: "#FBE5C7" },
  supportIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  supportText: { flex: 1 },
  supportTitle: { color: TEXT, fontSize: 12, fontWeight: "800" },
  supportSubtitle: { color: MUTED, fontSize: 9, fontWeight: "600", lineHeight: 14, marginTop: 3 },

  stateContainer: { backgroundColor: SURFACE, borderRadius: 18, alignItems: "center", paddingVertical: 70, paddingHorizontal: 24, marginTop: 8 },
  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 11 },
  stateText: { color: MUTED, fontSize: 11, lineHeight: 17, fontWeight: "500", textAlign: "center", marginTop: 5 },
  errorIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  retryButton: { backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, marginTop: 15 },
  retryText: { color: SURFACE, fontSize: 12, fontWeight: "700" },
});