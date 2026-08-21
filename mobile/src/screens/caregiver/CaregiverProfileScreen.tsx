import { Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CommonActions } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react-native";

import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "CaregiverProfile">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PRIMARY = "#F6A545";
const PRIMARY_LIGHT = "#FFF3E2";
const PRIMARY_DARK = "#8A520E";
const DANGER = "#DC4C57";
const DANGER_LIGHT = "#FDEBED";

const getInitials = (name?: string) => {
  if (!name) return "CG";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0]?.charAt(0) || ""}${parts[1]?.charAt(0) || ""}`.toUpperCase();
};

export const CaregiverProfileScreen = ({ navigation, route }: Props) => {
  const user = route.params?.user;
  const fullName = user?.fullName || "Caregiver";
  const email = user?.email || "Caregiver account";

  const performLogout = async () => {
    await tokenStorage.removeToken();
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
  };

  const confirmLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => void performLogout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => navigation.goBack()}>
            <ChevronLeft size={23} color={TEXT} strokeWidth={2.5} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(fullName)}</Text>
          </View>

          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.role}>Caregiver</Text>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.list}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <UserRound size={20} color={PRIMARY_DARK} strokeWidth={2.4} />
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Name</Text>
              <Text style={styles.rowValue}>{fullName}</Text>
            </View>
          </View>

          <View style={[styles.row, styles.lastRow]}>
            <View style={styles.rowIcon}>
              <Mail size={20} color={PRIMARY_DARK} strokeWidth={2.4} />
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue}>{email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.accessRow}>
          <View style={styles.accessIcon}>
            <ShieldCheck size={20} color={PRIMARY_DARK} strokeWidth={2.4} />
          </View>

          <View style={styles.rowContent}>
            <Text style={styles.rowValue}>Caregiver account</Text>
            <Text style={styles.accessText}>Patient access requires an approved link.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.85} onPress={confirmLogout}>
          <LogOut size={19} color={DANGER} strokeWidth={2.5} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND, paddingHorizontal: 16 },
  header: { height: 66, flexDirection: "row", alignItems: "center" },
  backButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  headerTitle: { color: TEXT, fontSize: 19, fontWeight: "800" },
  profile: { alignItems: "center", paddingVertical: 22 },
  avatar: { width: 82, height: 82, borderRadius: 26, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center" },
  avatarText: { color: PRIMARY_DARK, fontSize: 24, fontWeight: "800" },
  name: { color: TEXT, fontSize: 21, fontWeight: "800", marginTop: 13 },
  role: { color: PRIMARY_DARK, fontSize: 11, fontWeight: "700", marginTop: 4 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 13, marginBottom: 8, paddingHorizontal: 2 },
  list: { backgroundColor: SURFACE, borderRadius: 16, overflow: "hidden" },
  row: { minHeight: 70, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  lastRow: { borderBottomWidth: 0 },
  rowIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowContent: { flex: 1 },
  rowLabel: { color: MUTED, fontSize: 10, fontWeight: "600" },
  rowValue: { color: TEXT, fontSize: 13, fontWeight: "700", marginTop: 2 },
  accessRow: { minHeight: 72, backgroundColor: PRIMARY_LIGHT, borderRadius: 16, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginTop: 14 },
  accessIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  accessText: { color: MUTED, fontSize: 10, fontWeight: "500", marginTop: 3 },
  logoutButton: { height: 52, backgroundColor: DANGER_LIGHT, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 24 },
  logoutText: { color: DANGER, fontSize: 13, fontWeight: "800", marginLeft: 8 },
});