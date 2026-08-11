import { useCallback, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Bell, BriefcaseMedical, Building2, CalendarDays, CheckCircle2, Clock3, FileBadge2, LogOut, Mail, MapPin, Phone, RefreshCw, ShieldCheck, Stethoscope, UserRound } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { doctorProfileApi, type DoctorProfileData, type DoctorOperationalStatus } from "../../services/doctor/doctorProfileApi";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "DoctorProfile">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PRIMARY = "#0F766E";
const PRIMARY_DARK = "#134E4A";
const PRIMARY_LIGHT = "#E6FFFA";
const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";
const WARNING = "#F6A545";
const WARNING_DARK = "#A45A08";
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

const getInitials = (name?: string | null) => {
  if (!name) return "DR";
  const parts = name.replace(/^Dr\.?\s*/i, "").trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "DR";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const getDisplayValue = (value?: string | number | null) => {
  if (typeof value === "number") return String(value);
  return value?.trim() || "Not added";
};

const getStatusInfo = (status?: DoctorOperationalStatus) => {
  if (status === "OUT_OF_OFFICE") return { label: "Out of office", background: DANGER_LIGHT, text: DANGER_DARK };
  if (status === "UNAVAILABLE") return { label: "No appointments", background: WARNING_LIGHT, text: WARNING_DARK };
  return { label: "Available", background: SUCCESS_LIGHT, text: SUCCESS_DARK };
};

export const DoctorProfileScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadProfile = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await doctorProfileApi.getProfile();
      setProfile(result.doctor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load doctor profile.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadProfile("initial"); }, [loadProfile]));

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await tokenStorage.removeToken();
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
        },
      },
    ]);
  };

  const statusInfo = getStatusInfo(profile?.operationalStatus.effectiveStatus);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.headerButton} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.7} />
          </TouchableOpacity>

          <View style={styles.appBarText}>
            <Text style={styles.appBarTitle}>Doctor Profile</Text>
            <Text style={styles.appBarSubtitle}>Professional account and practice details</Text>
          </View>

          <TouchableOpacity style={styles.headerButton} activeOpacity={0.85} onPress={() => navigation.navigate("Notifications")}>
            <Bell size={20} color={PRIMARY} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 28) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadProfile("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.loadingText}>Loading doctor profile...</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <RefreshCw size={25} color={DANGER} strokeWidth={2.6} />
              <Text style={styles.errorTitle}>Unable to load profile</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => void loadProfile("initial")}>
                <RefreshCw size={16} color={SURFACE} strokeWidth={2.5} />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage && profile ? (
            <>
              <View style={styles.profileCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(profile.fullName)}</Text>
                </View>

                <View style={styles.profileIdentity}>
                  <View style={styles.nameRow}>
                    <Text style={styles.profileName} numberOfLines={1}>{profile.fullName}</Text>

                    {profile.isEmailVerified ? (
                      <View style={styles.verifiedChip}>
                        <CheckCircle2 size={12} color={SUCCESS_DARK} strokeWidth={2.5} />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.profileRole}>{profile.specialization || "Doctor"}</Text>

                  <View style={styles.contactRow}>
                    <Mail size={14} color={MUTED} strokeWidth={2.4} />
                    <Text style={styles.contactText} numberOfLines={1}>{profile.email}</Text>
                  </View>

                  <View style={styles.contactRow}>
                    <Phone size={14} color={MUTED} strokeWidth={2.4} />
                    <Text style={styles.contactText}>{getDisplayValue(profile.phoneNumber)}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statusCard, { backgroundColor: statusInfo.background }]}>
                <View style={styles.statusIcon}>
                  <Clock3 size={21} color={statusInfo.text} strokeWidth={2.6} />
                </View>

                <View style={styles.statusContent}>
                  <Text style={[styles.statusLabel, { color: statusInfo.text }]}>Current availability</Text>
                  <Text style={[styles.statusValue, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                  {profile.operationalStatus.statusNote ? <Text style={[styles.statusNote, { color: statusInfo.text }]}>{profile.operationalStatus.statusNote}</Text> : null}
                </View>

                <TouchableOpacity style={styles.manageButton} activeOpacity={0.84} onPress={() => navigation.navigate("DoctorAvailability")}>
                  <Text style={styles.manageButtonText}>Manage</Text>
                </TouchableOpacity>
              </View>

              <ProfileSection title="Professional details">
                <ProfileRow icon={<FileBadge2 size={20} color={PRIMARY} strokeWidth={2.5} />} title="GMC number" value={getDisplayValue(profile.gmcNumber)} />
                <ProfileRow icon={<Stethoscope size={20} color={PRIMARY} strokeWidth={2.5} />} title="Specialization" value={getDisplayValue(profile.specialization)} />
                <ProfileRow icon={<BriefcaseMedical size={20} color={PRIMARY} strokeWidth={2.5} />} title="Experience" value={profile.yearsExperience !== null ? `${profile.yearsExperience} year${profile.yearsExperience === 1 ? "" : "s"}` : "Not added"} isLast />
              </ProfileSection>

              <ProfileSection title="Practice">
                <ProfileRow icon={<Building2 size={20} color={PRIMARY} strokeWidth={2.5} />} title="Clinic" value={getDisplayValue(profile.clinicName)} />
                <ProfileRow icon={<MapPin size={20} color={PRIMARY} strokeWidth={2.5} />} title="Clinic address" value={getDisplayValue(profile.clinicAddress)} isLast />
              </ProfileSection>

              <ProfileSection title="About">
                <View style={styles.bioRow}>
                  <View style={styles.rowIcon}><UserRound size={20} color={PRIMARY} strokeWidth={2.5} /></View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>Professional bio</Text>
                    <Text style={styles.bioText}>{getDisplayValue(profile.bio)}</Text>
                  </View>
                </View>
              </ProfileSection>

              <ProfileSection title="Account">
                <ProfileRow icon={<ShieldCheck size={20} color={PRIMARY} strokeWidth={2.5} />} title="Account status" value={profile.accountStatus.replace(/_/g, " ")} />
                <TouchableOpacity style={styles.actionRow} activeOpacity={0.84} onPress={() => navigation.navigate("Notifications")}>
                  <View style={styles.rowIcon}><Bell size={20} color={PRIMARY} strokeWidth={2.5} /></View>
                  <View style={styles.rowContent}><Text style={styles.rowTitle}>Notifications</Text><Text style={styles.rowValue}>View clinical and account updates</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionRow, styles.lastRow]} activeOpacity={0.84} onPress={() => navigation.navigate("DoctorAvailability")}>
                  <View style={styles.rowIcon}><CalendarDays size={20} color={PRIMARY} strokeWidth={2.5} /></View>
                  <View style={styles.rowContent}><Text style={styles.rowTitle}>Availability</Text><Text style={styles.rowValue}>Manage appointment availability</Text></View>
                </TouchableOpacity>
              </ProfileSection>

              <TouchableOpacity style={styles.logoutButton} activeOpacity={0.86} onPress={handleLogout}>
                <LogOut size={19} color={DANGER} strokeWidth={2.6} />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const ProfileSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const ProfileRow = ({ icon, title, value, isLast }: { icon: ReactNode; title: string; value: string; isLast?: boolean }) => (
  <View style={[styles.actionRow, isLast ? styles.lastRow : undefined]}>
    <View style={styles.rowIcon}>{icon}</View>
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  </View>
);

export default DoctorProfileScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  appBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", overflow: "hidden", ...elevate(1) },
  appBarText: { flex: 1, paddingHorizontal: 13 },
  appBarTitle: { color: TEXT, fontSize: 23, fontWeight: "700" },
  appBarSubtitle: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 2 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  loadingCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 22, alignItems: "center", ...elevate(1) },
  loadingText: { color: MUTED, fontSize: 13, fontWeight: "600", marginTop: 10 },
  errorCard: { backgroundColor: DANGER_LIGHT, borderRadius: 16, padding: 20, alignItems: "center" },
  errorTitle: { color: DANGER_DARK, fontSize: 16, fontWeight: "700", marginTop: 9 },
  errorText: { color: DANGER_DARK, fontSize: 12, fontWeight: "500", textAlign: "center", marginTop: 5 },
  retryButton: { backgroundColor: DANGER, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9, flexDirection: "row", alignItems: "center", marginTop: 12 },
  retryText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginLeft: 6 },
  profileCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 17, flexDirection: "row", alignItems: "center", marginBottom: 12, ...elevate(1) },
  avatar: { width: 68, height: 68, borderRadius: 18, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatarText: { color: SURFACE, fontSize: 21, fontWeight: "700" },
  profileIdentity: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  profileName: { color: TEXT, fontSize: 19, fontWeight: "700", marginRight: 7, maxWidth: "70%" },
  verifiedChip: { backgroundColor: SUCCESS_LIGHT, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, flexDirection: "row", alignItems: "center" },
  verifiedText: { color: SUCCESS_DARK, fontSize: 9, fontWeight: "700", marginLeft: 4 },
  profileRole: { color: PRIMARY, fontSize: 12, fontWeight: "700", marginTop: 3, marginBottom: 7 },
  contactRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  contactText: { flex: 1, color: MUTED, fontSize: 11, fontWeight: "500", marginLeft: 7 },
  statusCard: { borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  statusIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  statusContent: { flex: 1 },
  statusLabel: { fontSize: 10, fontWeight: "600" },
  statusValue: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  statusNote: { fontSize: 10, fontWeight: "500", marginTop: 3 },
  manageButton: { backgroundColor: SURFACE, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  manageButtonText: { color: PRIMARY, fontSize: 11, fontWeight: "700" },
  sectionCard: { backgroundColor: SURFACE, borderRadius: 16, paddingTop: 15, paddingHorizontal: 15, marginBottom: 12, ...elevate(1) },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginBottom: 7 },
  actionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  lastRow: { borderBottomWidth: 0 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowContent: { flex: 1 },
  rowTitle: { color: TEXT, fontSize: 13, fontWeight: "700" },
  rowValue: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 16, marginTop: 3 },
  bioRow: { flexDirection: "row", paddingVertical: 13 },
  bioText: { color: MUTED, fontSize: 12, fontWeight: "500", lineHeight: 18, marginTop: 4 },
  logoutButton: { backgroundColor: SURFACE, borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 2, ...elevate(1) },
  logoutText: { color: DANGER, fontSize: 14, fontWeight: "700", marginLeft: 8 },
});