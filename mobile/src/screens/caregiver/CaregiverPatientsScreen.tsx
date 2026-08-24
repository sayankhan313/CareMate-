import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, ChevronRight, Link2, Plus, RefreshCw, Search, UserRound, UsersRound, X } from "lucide-react-native";

import { caregiverPatientsApi, type CaregiverLinkedPatient } from "../../services/caregiver/caregiverPatientsApi";
import type { CaregiverTabParamList } from "../../types/navigation";

type CaregiverPatientsScreenProps = BottomTabScreenProps<CaregiverTabParamList, "Patients">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PRIMARY = "#F6A545";
const PRIMARY_LIGHT = "#FFF3E2";
const PRIMARY_DARK = "#8A520E";
const SUCCESS = "#3A9D75";
const SUCCESS_LIGHT = "#E8F7F0";
const DANGER = "#DC4C57";
const DANGER_LIGHT = "#FDEBED";

const getInitials = (name?: string | null) => {
  if (!name) return "P";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0]?.charAt(0) || ""}${parts[1]?.charAt(0) || ""}`.toUpperCase();
};

const formatLinkedDate = (value?: string | null) => {
  if (!value) return "Linked";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Linked";
  return `Linked ${date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}`;
};

export const CaregiverPatientsScreen = ({ navigation }: CaregiverPatientsScreenProps) => {
  const insets = useSafeAreaInsets();
  const [patients, setPatients] = useState<CaregiverLinkedPatient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<CaregiverLinkedPatient[]>([]);
  const [searchText, setSearchText] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const applySearch = useCallback((items: CaregiverLinkedPatient[], query: string) => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      setFilteredPatients(items);
      return;
    }

    setFilteredPatients(items.filter(item => item.patient.fullName.toLowerCase().includes(normalized) || item.patient.email.toLowerCase().includes(normalized)));
  }, []);

  const loadPatients = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      setErrorMessage("");

      const result = await caregiverPatientsApi.getLinkedPatients();
      setPatients(result.patients);
      applySearch(result.patients, searchText);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load patients.");
    } finally {
      if (mode === "initial") setIsLoading(false);
      if (mode === "refresh") setIsRefreshing(false);
    }
  }, [applySearch, searchText]);

  useFocusEffect(useCallback(() => {
    void loadPatients("initial");
  }, [loadPatients]));

  const handleSearch = (value: string) => {
    setSearchText(value);
    applySearch(patients, value);
  };

  const openLinkModal = () => {
    setPatientEmail("");
    setRequestSent(false);
    setShowLinkModal(true);
  };

  const closeLinkModal = () => {
    if (isSending) return;
    setShowLinkModal(false);
    setPatientEmail("");
    setRequestSent(false);
  };

  const sendLinkRequest = async () => {
    const email = patientEmail.trim().toLowerCase();

    if (!email) {
      Alert.alert("Email required", "Enter the patient's email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }

    try {
      setIsSending(true);
      await caregiverPatientsApi.requestLink(email);
      setRequestSent(true);
      setPatientEmail("");
    } catch (error) {
      Alert.alert("Couldn't send request", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const openPatient = (patient: CaregiverLinkedPatient) => {
    const rootNavigation = navigation.getParent();

    if (!rootNavigation) {
      Alert.alert("Screen unavailable", "Please try again.");
      return;
    }

    rootNavigation.dispatch(CommonActions.navigate({
      name: "CaregiverPatientDetail",
      params: { patientId: patient.patient.id, patientName: patient.patient.fullName },
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Linked patients</Text>
            <Text style={styles.subtitle}>{patients.length} patient{patients.length === 1 ? "" : "s"}</Text>
          </View>

          <TouchableOpacity style={styles.addButton} activeOpacity={0.86} onPress={openLinkModal}>
            <Plus size={19} color={SURFACE} strokeWidth={2.7} />
            <Text style={styles.addButtonText}>Link patient</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={18} color={MUTED} strokeWidth={2.3} />

          <TextInput
            value={searchText}
            onChangeText={handleSearch}
            placeholder="Search patients"
            placeholderTextColor="#98A2B3"
            autoCorrect={false}
            style={styles.searchInput}
          />

          {searchText ? (
            <TouchableOpacity activeOpacity={0.75} onPress={() => handleSearch("")}>
              <X size={17} color={MUTED} strokeWidth={2.4} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 100, 124) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadPatients("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {isLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading patients</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.stateContainer}>
              <View style={styles.errorIcon}>
                <RefreshCw size={24} color={DANGER} strokeWidth={2.5} />
              </View>

              <Text style={styles.stateTitle}>Couldn't load patients</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>

              <TouchableOpacity style={styles.retryButton} activeOpacity={0.86} onPress={() => void loadPatients("initial")}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage && filteredPatients.length ? (
            <View style={styles.patientList}>
              {filteredPatients.map((item, index) => (
                <TouchableOpacity key={item.relationshipId} style={[styles.patientRow, index === filteredPatients.length - 1 ? styles.lastRow : undefined]} activeOpacity={0.82} onPress={() => openPatient(item)}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(item.patient.fullName)}</Text>
                  </View>

                  <View style={styles.patientContent}>
                    <Text style={styles.patientName}>{item.patient.fullName}</Text>
                    <Text style={styles.patientEmail} numberOfLines={1}>{item.patient.email}</Text>

                    <View style={styles.linkedRow}>
                      <View style={styles.activeDot} />
                      <Text style={styles.linkedText}>{formatLinkedDate(item.linkedAt)}</Text>
                    </View>
                  </View>

                  <ChevronRight size={19} color={MUTED} strokeWidth={2.4} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {!isLoading && !errorMessage && !filteredPatients.length ? (
            searchText ? (
              <View style={styles.stateContainer}>
                <View style={styles.emptyIcon}>
                  <Search size={24} color={PRIMARY_DARK} strokeWidth={2.4} />
                </View>
                <Text style={styles.stateTitle}>No matches</Text>
                <Text style={styles.stateText}>Try another name or email.</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <UsersRound size={26} color={PRIMARY_DARK} strokeWidth={2.5} />
                </View>

                <Text style={styles.emptyTitle}>No linked patients</Text>
                <Text style={styles.emptyText}>Link a patient to get started.</Text>

                <TouchableOpacity style={styles.emptyButton} activeOpacity={0.86} onPress={openLinkModal}>
                  <Link2 size={17} color={SURFACE} strokeWidth={2.5} />
                  <Text style={styles.emptyButtonText}>Link patient</Text>
                </TouchableOpacity>
              </View>
            )
          ) : null}
        </ScrollView>
      </View>

      <Modal visible={showLinkModal} transparent animationType="fade" statusBarTranslucent onRequestClose={closeLinkModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <UserRound size={22} color={PRIMARY_DARK} strokeWidth={2.5} />
              </View>

              <View style={styles.modalTitleBlock}>
                <Text style={styles.modalTitle}>Link patient</Text>
                <Text style={styles.modalSubtitle}>Send a link request.</Text>
              </View>

              <TouchableOpacity style={styles.closeButton} activeOpacity={0.75} onPress={closeLinkModal}>
                <X size={20} color={MUTED} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {requestSent ? (
              <View style={styles.successState}>
                <View style={styles.successIcon}>
                  <CheckCircle2 size={28} color={SUCCESS} strokeWidth={2.4} />
                </View>

                <Text style={styles.successTitle}>Request sent</Text>
                <Text style={styles.successText}>Waiting for patient approval.</Text>

                <TouchableOpacity style={styles.doneButton} activeOpacity={0.86} onPress={closeLinkModal}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Patient email</Text>

                <TextInput
                  value={patientEmail}
                  onChangeText={setPatientEmail}
                  placeholder="patient@example.com"
                  placeholderTextColor="#98A2B3"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isSending}
                  style={styles.emailInput}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} activeOpacity={0.8} onPress={closeLinkModal} disabled={isSending}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.sendButton, isSending ? styles.disabledButton : undefined]} activeOpacity={0.86} onPress={() => void sendLinkRequest()} disabled={isSending}>
                    {isSending ? <ActivityIndicator color={SURFACE} size="small" /> : <Text style={styles.sendText}>Send request</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, flexDirection: "row", alignItems: "center" },
  headerText: { flex: 1, paddingRight: 12 },
  title: { color: TEXT, fontSize: 26, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 4 },
  addButton: { height: 42, backgroundColor: PRIMARY, borderRadius: 13, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  addButtonText: { color: SURFACE, fontSize: 11, fontWeight: "800", marginLeft: 6 },
  searchContainer: { height: 48, marginHorizontal: 16, backgroundColor: SURFACE, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: BORDER },
  searchInput: { flex: 1, height: "100%", color: TEXT, fontSize: 13, marginLeft: 9, paddingVertical: 0 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 14 },
  patientList: { backgroundColor: SURFACE, borderRadius: 16, overflow: "hidden" },
  patientRow: { minHeight: 86, paddingHorizontal: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  lastRow: { borderBottomWidth: 0 },
  avatar: { width: 48, height: 48, borderRadius: 15, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarText: { color: PRIMARY_DARK, fontSize: 14, fontWeight: "800" },
  patientContent: { flex: 1, paddingRight: 8 },
  patientName: { color: TEXT, fontSize: 14, fontWeight: "700" },
  patientEmail: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 3 },
  linkedRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SUCCESS, marginRight: 5 },
  linkedText: { color: MUTED, fontSize: 9, fontWeight: "600" },
  stateContainer: { alignItems: "center", paddingVertical: 64, paddingHorizontal: 24 },
  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 11, textAlign: "center" },
  stateText: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, textAlign: "center", marginTop: 5 },
  errorIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  retryButton: { backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, marginTop: 15 },
  retryText: { color: SURFACE, fontSize: 12, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 64 },
  emptyIcon: { width: 56, height: 56, borderRadius: 17, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptyText: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 5 },
  emptyButton: { backgroundColor: PRIMARY, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 11, flexDirection: "row", alignItems: "center", marginTop: 17 },
  emptyButtonText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginLeft: 7 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(17,25,54,0.42)", justifyContent: "center", paddingHorizontal: 22 },
  modalCard: { backgroundColor: SURFACE, borderRadius: 20, padding: 18 },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  modalIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  modalTitleBlock: { flex: 1 },
  modalTitle: { color: TEXT, fontSize: 17, fontWeight: "700" },
  modalSubtitle: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 2 },
  closeButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  label: { color: TEXT, fontSize: 12, fontWeight: "700", marginBottom: 7 },
  emailInput: { height: 50, backgroundColor: "#F8F9FC", borderWidth: 1, borderColor: BORDER, borderRadius: 13, paddingHorizontal: 13, color: TEXT, fontSize: 13 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 18 },
  cancelButton: { height: 44, paddingHorizontal: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 9 },
  cancelText: { color: MUTED, fontSize: 12, fontWeight: "700" },
  sendButton: { minWidth: 124, height: 44, backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  sendText: { color: SURFACE, fontSize: 12, fontWeight: "800" },
  disabledButton: { opacity: 0.65 },
  successState: { alignItems: "center", paddingTop: 6 },
  successIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: SUCCESS_LIGHT, alignItems: "center", justifyContent: "center" },
  successTitle: { color: TEXT, fontSize: 17, fontWeight: "700", marginTop: 12 },
  successText: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 4 },
  doneButton: { width: "100%", height: 46, backgroundColor: PRIMARY, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 20 },
  doneButtonText: { color: SURFACE, fontSize: 12, fontWeight: "800" },
});