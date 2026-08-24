import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Mail, RefreshCw, ShieldCheck, UsersRound, X } from "lucide-react-native";

import { patientCaregiverApi, type PatientCaregiverRelationship, type PatientCaregiverRelationships } from "../../services/patientCaregiverApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PatientCaregiverAccess">;
type ActionType = "APPROVE" | "REJECT" | "REVOKE";

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PRIMARY = "#5B86E5";
const PRIMARY_LIGHT = "#EEF4FF";
const CAREGIVER = "#F6A545";
const CAREGIVER_DARK = "#8A520E";
const CAREGIVER_LIGHT = "#FFF3E2";
const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";
const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const emptyState: PatientCaregiverRelationships = { pendingRequests: [], activeCaregivers: [], history: [] };

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CG";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
};

export const PatientCaregiverAccessScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const [relationships, setRelationships] = useState<PatientCaregiverRelationships>(emptyState);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionKey, setActionKey] = useState<string | null>(null);

  const loadRelationships = useCallback(async (mode: "initial" | "refresh" | "silent" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      if (mode !== "silent") setErrorMessage("");

      const data = await patientCaregiverApi.getRelationships();
      setRelationships(data);
    } catch (error) {
      if (mode !== "silent") setErrorMessage(error instanceof Error ? error.message : "Unable to load caregiver access.");
    } finally {
      if (mode === "initial") setIsLoading(false);
      if (mode === "refresh") setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadRelationships("initial");
  }, [loadRelationships]));

  const performAction = async (relationship: PatientCaregiverRelationship, action: ActionType) => {
    const key = `${relationship.id}-${action}`;

    try {
      setActionKey(key);

      if (action === "APPROVE") await patientCaregiverApi.approve(relationship.id);
      if (action === "REJECT") await patientCaregiverApi.reject(relationship.id);
      if (action === "REVOKE") await patientCaregiverApi.revoke(relationship.id);

      await loadRelationships("silent");

      Alert.alert(
        action === "APPROVE" ? "Access approved" : action === "REJECT" ? "Request declined" : "Access removed",
        action === "APPROVE"
          ? `${relationship.caregiver.fullName} is now linked as your caregiver.`
          : action === "REJECT"
            ? "The caregiver request has been declined."
            : `${relationship.caregiver.fullName} can no longer access your caregiver information.`,
      );
    } catch (error) {
      Alert.alert("Unable to update access", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setActionKey(null);
    }
  };

  const confirmApprove = (relationship: PatientCaregiverRelationship) => {
    Alert.alert("Approve caregiver", `Allow ${relationship.caregiver.fullName} to support you through CareMate+?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Approve", onPress: () => void performAction(relationship, "APPROVE") },
    ]);
  };

  const confirmReject = (relationship: PatientCaregiverRelationship) => {
    Alert.alert("Decline request", `Decline the request from ${relationship.caregiver.fullName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Decline", style: "destructive", onPress: () => void performAction(relationship, "REJECT") },
    ]);
  };

  const confirmRevoke = (relationship: PatientCaregiverRelationship) => {
    Alert.alert("Remove caregiver access", `${relationship.caregiver.fullName} will no longer be able to access your linked caregiver information.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove access", style: "destructive", onPress: () => void performAction(relationship, "REVOKE") },
    ]);
  };

  const total = relationships.pendingRequests.length + relationships.activeCaregivers.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Caregiver access</Text>
            <Text style={styles.subtitle}>Manage caregiver connections</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 36, 52) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadRelationships("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading caregiver access</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.stateCard}>
              <View style={styles.errorIcon}>
                <RefreshCw size={24} color={DANGER} strokeWidth={2.5} />
              </View>

              <Text style={styles.stateTitle}>Couldn't load caregiver access</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>

              <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => void loadRelationships("initial")}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <UsersRound size={25} color={CAREGIVER_DARK} strokeWidth={2.5} />
                </View>

                <View style={styles.summaryText}>
                  <Text style={styles.summaryTitle}>Your caregivers</Text>
                  <Text style={styles.summarySubtitle}>
                    {relationships.activeCaregivers.length} active · {relationships.pendingRequests.length} pending
                  </Text>
                </View>

                <View style={styles.summaryCount}>
                  <Text style={styles.summaryCountText}>{total}</Text>
                </View>
              </View>

              {relationships.pendingRequests.length ? (
                <>
                  <SectionHeader title="Requests" subtitle={`${relationships.pendingRequests.length} waiting`} />

                  <View style={styles.stack}>
                    {relationships.pendingRequests.map(relationship => {
                      const approving = actionKey === `${relationship.id}-APPROVE`;
                      const rejecting = actionKey === `${relationship.id}-REJECT`;
                      const busy = approving || rejecting;

                      return (
                        <View key={relationship.id} style={styles.requestCard}>
                          <View style={styles.personRow}>
                            <View style={styles.pendingAvatar}>
                              <Text style={styles.pendingAvatarText}>{getInitials(relationship.caregiver.fullName)}</Text>
                            </View>

                            <View style={styles.personContent}>
                              <Text style={styles.personName}>{relationship.caregiver.fullName}</Text>

                              <View style={styles.emailRow}>
                                <Mail size={13} color={MUTED} strokeWidth={2.2} />
                                <Text style={styles.emailText} numberOfLines={1}>{relationship.caregiver.email}</Text>
                              </View>

                              <View style={styles.dateRow}>
                                <Clock size={13} color={MUTED} strokeWidth={2.2} />
                                <Text style={styles.dateText}>Requested {formatDate(relationship.requestedAt)}</Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.requestActions}>
                            <TouchableOpacity style={styles.rejectButton} activeOpacity={0.85} disabled={busy} onPress={() => confirmReject(relationship)}>
                              {rejecting ? <ActivityIndicator size="small" color={DANGER} /> : <Text style={styles.rejectText}>Decline</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.approveButton} activeOpacity={0.85} disabled={busy} onPress={() => confirmApprove(relationship)}>
                              {approving ? (
                                <ActivityIndicator size="small" color={SURFACE} />
                              ) : (
                                <>
                                  <CheckCircle2 size={16} color={SURFACE} strokeWidth={2.5} />
                                  <Text style={styles.approveText}>Approve</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <SectionHeader title="Linked caregivers" subtitle={`${relationships.activeCaregivers.length} active`} />

              {relationships.activeCaregivers.length ? (
                <View style={styles.stack}>
                  {relationships.activeCaregivers.map(relationship => {
                    const revoking = actionKey === `${relationship.id}-REVOKE`;

                    return (
                      <View key={relationship.id} style={styles.activeCard}>
                        <View style={styles.personRow}>
                          <View style={styles.activeAvatar}>
                            <Text style={styles.activeAvatarText}>{getInitials(relationship.caregiver.fullName)}</Text>
                          </View>

                          <View style={styles.personContent}>
                            <Text style={styles.personName}>{relationship.caregiver.fullName}</Text>

                            <View style={styles.emailRow}>
                              <Mail size={13} color={MUTED} strokeWidth={2.2} />
                              <Text style={styles.emailText} numberOfLines={1}>{relationship.caregiver.email}</Text>
                            </View>

                            <View style={styles.activeStatusRow}>
                              <ShieldCheck size={13} color={SUCCESS_DARK} strokeWidth={2.4} />
                              <Text style={styles.activeStatusText}>Linked {formatDate(relationship.approvedAt)}</Text>
                            </View>
                          </View>
                        </View>

                        <TouchableOpacity style={styles.revokeButton} activeOpacity={0.85} disabled={revoking} onPress={() => confirmRevoke(relationship)}>
                          {revoking ? (
                            <ActivityIndicator size="small" color={DANGER} />
                          ) : (
                            <>
                              <X size={15} color={DANGER} strokeWidth={2.5} />
                              <Text style={styles.revokeText}>Remove access</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <UsersRound size={25} color={CAREGIVER_DARK} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.emptyTitle}>No linked caregivers</Text>
                  <Text style={styles.emptyText}>Approved caregiver connections will appear here.</Text>
                </View>
              )}

              {relationships.history.length ? (
                <>
                  <SectionHeader title="Previous requests" subtitle="Access history" />

                  <View style={styles.historyCard}>
                    {relationships.history.slice(0, 5).map((relationship, index) => (
                      <View key={relationship.id} style={[styles.historyRow, index === Math.min(relationships.history.length, 5) - 1 ? styles.historyRowLast : undefined]}>
                        <View style={styles.historyIcon}>
                          <AlertCircle size={17} color={MUTED} strokeWidth={2.3} />
                        </View>

                        <View style={styles.historyText}>
                          <Text style={styles.historyName}>{relationship.caregiver.fullName}</Text>
                          <Text style={styles.historyMeta}>
                            {relationship.status === "REJECTED" ? "Declined" : "Access removed"} · {formatDate(relationship.rejectedAt || relationship.revokedAt)}
                          </Text>
                        </View>
                      </View>
                    ))}
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

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionSubtitle}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, flexDirection: "row", alignItems: "center" },
  backButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  headerText: { flex: 1 },
  title: { color: TEXT, fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  subtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16 },
  summaryCard: { backgroundColor: SURFACE, borderRadius: 17, padding: 15, flexDirection: "row", alignItems: "center" },
  summaryIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: CAREGIVER_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  summaryText: { flex: 1 },
  summaryTitle: { color: TEXT, fontSize: 15, fontWeight: "700" },
  summarySubtitle: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 4 },
  summaryCount: { minWidth: 38, height: 38, borderRadius: 12, backgroundColor: CAREGIVER, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  summaryCountText: { color: SURFACE, fontSize: 15, fontWeight: "800" },
  sectionHeader: { marginTop: 20, marginBottom: 9, paddingHorizontal: 2 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  sectionSubtitle: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 2 },
  stack: { gap: 10 },
  requestCard: { backgroundColor: SURFACE, borderRadius: 17, padding: 14 },
  activeCard: { backgroundColor: SURFACE, borderRadius: 17, padding: 14 },
  personRow: { flexDirection: "row", alignItems: "center" },
  pendingAvatar: { width: 50, height: 50, borderRadius: 15, backgroundColor: CAREGIVER_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  pendingAvatarText: { color: CAREGIVER_DARK, fontSize: 14, fontWeight: "800" },
  activeAvatar: { width: 50, height: 50, borderRadius: 15, backgroundColor: SUCCESS_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  activeAvatarText: { color: SUCCESS_DARK, fontSize: 14, fontWeight: "800" },
  personContent: { flex: 1 },
  personName: { color: TEXT, fontSize: 14, fontWeight: "700" },
  emailRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  emailText: { flex: 1, color: MUTED, fontSize: 10, fontWeight: "500", marginLeft: 5 },
  dateRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  dateText: { color: MUTED, fontSize: 9, fontWeight: "600", marginLeft: 5 },
  activeStatusRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  activeStatusText: { color: SUCCESS_DARK, fontSize: 9, fontWeight: "700", marginLeft: 5 },
  requestActions: { flexDirection: "row", marginTop: 13 },
  rejectButton: { flex: 1, height: 42, backgroundColor: DANGER_LIGHT, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 8 },
  rejectText: { color: DANGER, fontSize: 11, fontWeight: "700" },
  approveButton: { flex: 1, height: 42, backgroundColor: PRIMARY, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  approveText: { color: SURFACE, fontSize: 11, fontWeight: "700", marginLeft: 6 },
  revokeButton: { height: 40, backgroundColor: DANGER_LIGHT, borderRadius: 11, marginTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  revokeText: { color: DANGER, fontSize: 11, fontWeight: "700", marginLeft: 6 },
  emptyCard: { backgroundColor: SURFACE, borderRadius: 17, padding: 27, alignItems: "center" },
  emptyIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: CAREGIVER_LIGHT, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontSize: 14, fontWeight: "700", marginTop: 11 },
  emptyText: { color: MUTED, fontSize: 10, fontWeight: "500", marginTop: 4, textAlign: "center" },
  historyCard: { backgroundColor: SURFACE, borderRadius: 16, overflow: "hidden" },
  historyRow: { minHeight: 61, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  historyRowLast: { borderBottomWidth: 0 },
  historyIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 10 },
  historyText: { flex: 1 },
  historyName: { color: TEXT, fontSize: 12, fontWeight: "700" },
  historyMeta: { color: MUTED, fontSize: 9, fontWeight: "500", marginTop: 3 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 17, padding: 28, alignItems: "center", marginTop: 8 },
  stateTitle: { color: TEXT, fontSize: 14, fontWeight: "700", marginTop: 11, textAlign: "center" },
  stateText: { color: MUTED, fontSize: 10, fontWeight: "500", lineHeight: 16, marginTop: 5, textAlign: "center" },
  errorIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  retryButton: { backgroundColor: PRIMARY, borderRadius: 11, paddingHorizontal: 17, paddingVertical: 10, marginTop: 15 },
  retryText: { color: SURFACE, fontSize: 11, fontWeight: "700" },
});