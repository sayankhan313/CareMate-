import { useCallback, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Bell, CheckCircle2, LogOut, Mail, RefreshCw, ShieldCheck, UserRound } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";
import type { AppUser } from "../../utils/roleNavigation";

type Props = NativeStackScreenProps<RootStackParamList, "AdminProfile">;

const BACKGROUND = "#F3F1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#1D1B2F";
const MUTED = "#6D687B";
const BORDER = "#E4E0EC";
const ADMIN = "#6750D8";
const ADMIN_CONTAINER = "#EADDFF";
const ON_ADMIN_CONTAINER = "#21005D";
const SUCCESS_CONTAINER = "#DBF3E7";
const ON_SUCCESS_CONTAINER = "#0F5C3C";
const DANGER = "#EF4D56";
const DANGER_CONTAINER = "#FBDADC";
const ON_DANGER_CONTAINER = "#8C1D24";

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#1B1D2A",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const getInitials = (name?: string | null) => {
  if (!name) return "AD";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "AD";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

export const AdminProfileScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadProfile = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const token = await tokenStorage.getToken();
      if (!token) throw new Error("Please login again.");

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.data?.user) throw new Error(result?.message || "Unable to load admin profile.");

      const currentUser = result.data.user as AppUser;
      if (currentUser.role !== "ADMIN") throw new Error("Only administrators can access this profile.");

      setUser(currentUser);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load admin profile.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadProfile("initial"); }, [loadProfile]));

  const handleLogout = () => {
    Alert.alert("Logout", "Do you want to logout from the admin account?", [
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.headerButton} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.7} />
          </TouchableOpacity>

          <View style={styles.appBarText}>
            <Text style={styles.appBarTitle}>Admin Profile</Text>
            <Text style={styles.appBarSubtitle}>Administrator account and security</Text>
          </View>

          <TouchableOpacity style={styles.headerButton} activeOpacity={0.85} onPress={() => navigation.navigate("Notifications")}>
            <Bell size={20} color={ADMIN} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 28) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadProfile("refresh")} tintColor={ADMIN} colors={[ADMIN]} />}
        >
          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={ADMIN} />
              <Text style={styles.loadingText}>Loading admin profile...</Text>
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

          {!isLoading && !errorMessage && user ? (
            <>
              <View style={styles.profileCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(user.fullName)}</Text>
                </View>

                <View style={styles.identity}>
                  <View style={styles.nameRow}>
                    <Text style={styles.profileName} numberOfLines={1}>{user.fullName}</Text>

                    {user.isEmailVerified ? (
                      <View style={styles.verifiedChip}>
                        <CheckCircle2 size={12} color={ON_SUCCESS_CONTAINER} strokeWidth={2.5} />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.profileRole}>Administrator</Text>

                  <View style={styles.contactRow}>
                    <Mail size={14} color={MUTED} strokeWidth={2.4} />
                    <Text style={styles.contactText} numberOfLines={1}>{user.email}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.adminStatus}>
                <View style={styles.adminStatusIcon}>
                  <ShieldCheck size={22} color={ON_ADMIN_CONTAINER} strokeWidth={2.6} />
                </View>

                <View style={styles.adminStatusContent}>
                  <Text style={styles.adminStatusLabel}>Administrator access</Text>
                  <Text style={styles.adminStatusText}>Secure administrative workspace</Text>
                </View>
              </View>

              <ProfileSection title="Account information">
                <ProfileRow icon={<UserRound size={20} color={ADMIN} strokeWidth={2.5} />} title="Full name" value={user.fullName} />
                <ProfileRow icon={<Mail size={20} color={ADMIN} strokeWidth={2.5} />} title="Email" value={user.email} />
                <ProfileRow icon={<ShieldCheck size={20} color={ADMIN} strokeWidth={2.5} />} title="Role" value="Administrator" />
                <ProfileRow icon={<CheckCircle2 size={20} color={ADMIN} strokeWidth={2.5} />} title="Account status" value={(user.accountStatus || "ACTIVE").replace(/_/g, " ")} isLast />
              </ProfileSection>

              <ProfileSection title="Admin tools">
                <TouchableOpacity style={[styles.row, styles.lastRow]} activeOpacity={0.84} onPress={() => navigation.navigate("Notifications")}>
                  <View style={styles.rowIcon}><Bell size={20} color={ADMIN} strokeWidth={2.5} /></View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>Notifications</Text>
                    <Text style={styles.rowValue}>View verification and system updates</Text>
                  </View>
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
  <View style={[styles.row, isLast ? styles.lastRow : undefined]}>
    <View style={styles.rowIcon}>{icon}</View>
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  </View>
);

export default AdminProfileScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  appBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", ...elevate(1) },
  appBarText: { flex: 1, paddingHorizontal: 13 },
  appBarTitle: { color: TEXT, fontSize: 23, fontWeight: "700" },
  appBarSubtitle: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 2 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  loadingCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 22, alignItems: "center", ...elevate(1) },
  loadingText: { color: MUTED, fontSize: 13, fontWeight: "600", marginTop: 10 },
  errorCard: { backgroundColor: DANGER_CONTAINER, borderRadius: 16, padding: 20, alignItems: "center" },
  errorTitle: { color: ON_DANGER_CONTAINER, fontSize: 16, fontWeight: "700", marginTop: 9 },
  errorText: { color: ON_DANGER_CONTAINER, fontSize: 12, fontWeight: "500", textAlign: "center", marginTop: 5 },
  retryButton: { backgroundColor: DANGER, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9, flexDirection: "row", alignItems: "center", marginTop: 12 },
  retryText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginLeft: 6 },
  profileCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 17, flexDirection: "row", alignItems: "center", marginBottom: 12, ...elevate(1) },
  avatar: { width: 68, height: 68, borderRadius: 18, backgroundColor: ADMIN, alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatarText: { color: SURFACE, fontSize: 21, fontWeight: "700" },
  identity: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  profileName: { color: TEXT, fontSize: 19, fontWeight: "700", marginRight: 7, maxWidth: "70%" },
  verifiedChip: { backgroundColor: SUCCESS_CONTAINER, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, flexDirection: "row", alignItems: "center" },
  verifiedText: { color: ON_SUCCESS_CONTAINER, fontSize: 9, fontWeight: "700", marginLeft: 4 },
  profileRole: { color: ADMIN, fontSize: 12, fontWeight: "700", marginTop: 3, marginBottom: 7 },
  contactRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  contactText: { flex: 1, color: MUTED, fontSize: 11, fontWeight: "500", marginLeft: 7 },
  adminStatus: { backgroundColor: ADMIN_CONTAINER, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  adminStatusIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  adminStatusContent: { flex: 1 },
  adminStatusLabel: { color: ON_ADMIN_CONTAINER, fontSize: 13, fontWeight: "700" },
  adminStatusText: { color: ON_ADMIN_CONTAINER, fontSize: 11, fontWeight: "500", marginTop: 3 },
  sectionCard: { backgroundColor: SURFACE, borderRadius: 16, paddingTop: 15, paddingHorizontal: 15, marginBottom: 12, ...elevate(1) },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginBottom: 7 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  lastRow: { borderBottomWidth: 0 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: ADMIN_CONTAINER, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowContent: { flex: 1 },
  rowTitle: { color: TEXT, fontSize: 13, fontWeight: "700" },
  rowValue: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 16, marginTop: 3 },
  logoutButton: { backgroundColor: SURFACE, borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 2, ...elevate(1) },
  logoutText: { color: DANGER, fontSize: 14, fontWeight: "700", marginLeft: 8 },
});