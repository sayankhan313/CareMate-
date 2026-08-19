import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CommonActions, useFocusEffect } from "@react-navigation/native";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Building2,
  ChevronRight,
  FileBadge2,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  pharmacyDashboardApi,
  type PharmacyDashboardData,
} from "../../services/pharmacy/pharmacy-dashboard.api";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PharmacyProfile">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#747C91";
const BORDER = "#E1E6EF";
const PHARMACY = "#15803D";
const PHARMACY_DARK = "#14532D";
const PHARMACY_LIGHT = "#E9F8EF";
const BLUE = "#5B86E5";
const BLUE_LIGHT = "#EEF4FF";
const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";
const RIPPLE = "rgba(17,25,54,0.08)";

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase()).join("");
};

export const PharmacyProfileScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState<PharmacyDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadProfile = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      setErrorMessage("");

      const result = await pharmacyDashboardApi.getDashboard();
      setDashboard(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load pharmacy profile.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile("initial");
    }, [loadProfile]),
  );

  const logout = () => {
    Alert.alert("Log out", "Are you sure you want to log out of CareMate+?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await tokenStorage.removeToken();
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Login" }],
            }),
          );
        },
      },
    ]);
  };

  const pharmacy = dashboard?.pharmacy;
  const pharmacyName = pharmacy?.pharmacyName || "Pharmacy";
  const initials = getInitials(pharmacyName);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <Pressable android_ripple={{ color: RIPPLE }} style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.5} />
          </Pressable>

          <View style={styles.appBarText}>
            <Text style={styles.appBarTitle}>Pharmacy profile</Text>
            <Text style={styles.appBarSubtitle}>Account and pharmacy details</Text>
          </View>

          <Pressable android_ripple={{ color: RIPPLE }} style={styles.bellButton} onPress={() => navigation.navigate("Notifications")}>
            <Bell size={20} color={TEXT} strokeWidth={2.5} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 28, 42) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadProfile("refresh")}
              tintColor={PHARMACY}
              colors={[PHARMACY]}
            />
          }
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={PHARMACY} />
              <Text style={styles.stateText}>Loading pharmacy profile...</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.stateCard}>
              <View style={styles.errorIcon}>
                <RefreshCw size={24} color={DANGER} strokeWidth={2.5} />
              </View>
              <Text style={styles.errorTitle}>Profile unavailable</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>

              <Pressable style={styles.retryButton} onPress={() => void loadProfile("initial")}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {!isLoading && !errorMessage && pharmacy ? (
            <>
              <View style={styles.hero}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>

                <Text style={styles.pharmacyName}>{pharmacyName}</Text>
                <Text style={styles.registeredName}>{pharmacy.fullName}</Text>

                <View style={styles.verifiedBadge}>
                  <BadgeCheck size={15} color={PHARMACY_DARK} strokeWidth={2.6} />
                  <Text style={styles.verifiedBadgeText}>Approved pharmacy</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Pharmacy details</Text>

              <View style={styles.detailsCard}>
                <DetailRow
                  icon={<Store size={19} color={PHARMACY} strokeWidth={2.5} />}
                  label="Pharmacy name"
                  value={pharmacy.pharmacyName}
                />

                <Divider />

                <DetailRow
                  icon={<UserRound size={19} color={BLUE} strokeWidth={2.5} />}
                  label="Account name"
                  value={pharmacy.fullName}
                />

                <Divider />

                <DetailRow
                  icon={<FileBadge2 size={19} color={PHARMACY} strokeWidth={2.5} />}
                  label="Registration number"
                  value={pharmacy.registrationNumber || "Not available"}
                />

                <Divider />

                <DetailRow
                  icon={<MapPin size={19} color={BLUE} strokeWidth={2.5} />}
                  label="Location"
                  value={[pharmacy.city, pharmacy.postcode].filter(Boolean).join(", ") || "Not available"}
                />
              </View>

              <Text style={styles.sectionTitle}>Account</Text>

              <View style={styles.menuCard}>
                <MenuRow
                  icon={<ShieldCheck size={19} color={PHARMACY} strokeWidth={2.5} />}
                  iconBackground={PHARMACY_LIGHT}
                  title="Verification status"
                  subtitle="Pharmacy access approved"
                />

                <Divider />

                <MenuRow
                  icon={<Bell size={19} color={BLUE} strokeWidth={2.5} />}
                  iconBackground={BLUE_LIGHT}
                  title="Notifications"
                  subtitle="View pharmacy notifications"
                  showChevron
                  onPress={() => navigation.navigate("Notifications")}
                />
              </View>

              <Pressable android_ripple={{ color: "rgba(239,77,86,0.08)" }} style={styles.logoutButton} onPress={logout}>
                <View style={styles.logoutIcon}>
                  <LogOut size={20} color={DANGER} strokeWidth={2.5} />
                </View>

                <View style={styles.logoutTextBlock}>
                  <Text style={styles.logoutTitle}>Log out</Text>
                  <Text style={styles.logoutSubtitle}>Sign out of this pharmacy account</Text>
                </View>

                <ChevronRight size={18} color={DANGER} strokeWidth={2.4} />
              </Pressable>

              <View style={styles.securityNote}>
                <Building2 size={17} color={PHARMACY_DARK} strokeWidth={2.4} />
                <Text style={styles.securityText}>
                  Pharmacy access is restricted to approved CareMate+ pharmacy accounts.
                </Text>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const DetailRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>{icon}</View>
    <View style={styles.detailText}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const MenuRow = ({
  icon,
  iconBackground,
  title,
  subtitle,
  showChevron,
  onPress,
}: {
  icon: React.ReactNode;
  iconBackground: string;
  title: string;
  subtitle: string;
  showChevron?: boolean;
  onPress?: () => void;
}) => (
  <Pressable disabled={!onPress} android_ripple={{ color: RIPPLE }} style={styles.menuRow} onPress={onPress}>
    <View style={[styles.menuIcon, { backgroundColor: iconBackground }]}>{icon}</View>
    <View style={styles.menuText}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuSubtitle}>{subtitle}</Text>
    </View>
    {showChevron ? <ChevronRight size={18} color={MUTED} strokeWidth={2.4} /> : null}
  </Pressable>
);

const Divider = () => <View style={styles.divider} />;

export default PharmacyProfileScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  appBar: { minHeight: 62, flexDirection: "row", alignItems: "center", paddingHorizontal: 10 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  appBarText: { flex: 1, marginLeft: 3 },
  appBarTitle: { color: TEXT, fontSize: 20, fontWeight: "700" },
  appBarSubtitle: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 2 },
  bellButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },

  stateCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 26, alignItems: "center", marginTop: 16 },
  stateText: { color: MUTED, fontSize: 11, lineHeight: 17, fontWeight: "600", textAlign: "center", marginTop: 9 },
  errorIcon: { width: 52, height: 52, borderRadius: 15, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  errorTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 10 },
  retryButton: { backgroundColor: PHARMACY, borderRadius: 11, paddingHorizontal: 18, paddingVertical: 10, marginTop: 14 },
  retryText: { color: SURFACE, fontSize: 11, fontWeight: "700" },

  hero: { backgroundColor: PHARMACY, borderRadius: 18, padding: 22, alignItems: "center", marginTop: 5 },
  avatar: { width: 72, height: 72, borderRadius: 22, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  avatarText: { color: PHARMACY_DARK, fontSize: 22, fontWeight: "800" },
  pharmacyName: { color: SURFACE, fontSize: 21, fontWeight: "800", textAlign: "center", marginTop: 12 },
  registeredName: { color: "#DDF7E6", fontSize: 11, fontWeight: "600", marginTop: 4 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", backgroundColor: SURFACE, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 12 },
  verifiedBadgeText: { color: PHARMACY_DARK, fontSize: 9, fontWeight: "800", marginLeft: 5 },

  sectionTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 22, marginBottom: 8, marginLeft: 2 },
  detailsCard: { backgroundColor: SURFACE, borderRadius: 15, paddingHorizontal: 13 },
  detailRow: { minHeight: 67, flexDirection: "row", alignItems: "center" },
  detailIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: BACKGROUND, alignItems: "center", justifyContent: "center", marginRight: 11 },
  detailText: { flex: 1 },
  detailLabel: { color: MUTED, fontSize: 9, fontWeight: "600" },
  detailValue: { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 3 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 51 },

  menuCard: { backgroundColor: SURFACE, borderRadius: 15, paddingHorizontal: 13 },
  menuRow: { minHeight: 68, flexDirection: "row", alignItems: "center" },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 11 },
  menuText: { flex: 1 },
  menuTitle: { color: TEXT, fontSize: 12, fontWeight: "700" },
  menuSubtitle: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },

  logoutButton: { minHeight: 70, backgroundColor: SURFACE, borderRadius: 15, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, marginTop: 14 },
  logoutIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  logoutTextBlock: { flex: 1 },
  logoutTitle: { color: DANGER, fontSize: 12, fontWeight: "700" },
  logoutSubtitle: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },

  securityNote: { flexDirection: "row", alignItems: "flex-start", backgroundColor: PHARMACY_LIGHT, borderRadius: 13, padding: 12, marginTop: 14 },
  securityText: { flex: 1, color: PHARMACY_DARK, fontSize: 9, lineHeight: 14, fontWeight: "600", marginLeft: 8 },
});