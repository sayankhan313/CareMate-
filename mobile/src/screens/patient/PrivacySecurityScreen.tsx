import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertCircle, ArrowLeft, BellRing, Clock3, FileCheck2, HeartPulse, Lock, Pill, RefreshCw, Save, ShieldCheck } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedAlert as Alert } from "../../utils/localizedAlert";

import { patientSettingsApi, type PrivacySettings } from "../../services/patientSettingsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PrivacySecurity">;
type PrivacyBooleanKey =
  | "shareVitalsWithAssignedDoctors"
  | "shareMedicinesWithAssignedDoctors"
  | "shareReportsWithAssignedDoctors"
  | "hideSensitiveNotificationContent"
  | "loginAlertsEnabled"
  | "confirmBeforeReportSharing";

const DEFAULT_SETTINGS: PrivacySettings = {
  shareVitalsWithAssignedDoctors: true,
  shareMedicinesWithAssignedDoctors: true,
  shareReportsWithAssignedDoctors: true,
  hideSensitiveNotificationContent: true,
  loginAlertsEnabled: true,
  sessionTimeoutMinutes: 30,
  confirmBeforeReportSharing: true,
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PRIMARY = "#5B86E5";
const PRIMARY_LIGHT = "#EEF4FF";
const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";
const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";
const WARNING_LIGHT = "#FFF3E2";
const WARNING_DARK = "#A45A08";

const elevate = (level = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const PrivacySecurityScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasChanges = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [settings, savedSettings]);

  const loadSettings = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await patientSettingsApi.getPrivacySettings();
      setSettings(result.settings);
      setSavedSettings(result.settings);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load privacy settings.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadSettings("initial");
  }, [loadSettings]));

  const toggle = (key: PrivacyBooleanKey) => setSettings(current => ({ ...current, [key]: !current[key] }));

  const saveSettings = async () => {
    try {
      setIsSaving(true);

      const result = await patientSettingsApi.updatePrivacySettings(settings);
      setSettings(result.settings);
      setSavedSettings(result.settings);

      Alert.alert("Privacy settings saved", "Your privacy and security preferences have been updated.");
    } catch (error) {
      Alert.alert("Unable to save settings", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => navigation.goBack()}><ArrowLeft size={22} color={TEXT} strokeWidth={2.7} /></TouchableOpacity>
          <View style={styles.headerText}><Text style={styles.headerTitle}>Privacy & security</Text><Text style={styles.headerSubtitle}>Control sharing and account protection</Text></View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(36, insets.bottom + 26) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadSettings("refresh")} colors={[PRIMARY]} tintColor={PRIMARY} />}
        >
          {isLoading ? <View style={styles.stateCard}><ActivityIndicator color={PRIMARY} /><Text style={styles.stateText}>Loading privacy settings...</Text></View> : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <AlertCircle size={22} color={DANGER} />
              <View style={styles.errorContent}><Text style={styles.errorTitle}>Settings unavailable</Text><Text style={styles.errorText}>{errorMessage}</Text><TouchableOpacity style={styles.retryButton} onPress={() => void loadSettings("initial")}><RefreshCw size={16} color={SURFACE} /><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <View style={styles.heroCard}>
                <View style={styles.heroIcon}><ShieldCheck size={25} color={SUCCESS} /></View>
                <View style={styles.heroText}><Text style={styles.heroTitle}>Your health information</Text><Text style={styles.heroDescription}>Preferences are stored against the authenticated patient account.</Text></View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Doctor sharing</Text>
                <Text style={styles.sectionSubtitle}>Choose which information may be shared with assigned doctors</Text>

                <ToggleRow icon={<HeartPulse size={20} color={PRIMARY} />} title="Share vital readings" description="Allow assigned doctors to access patient vital readings." value={settings.shareVitalsWithAssignedDoctors} onPress={() => toggle("shareVitalsWithAssignedDoctors")} />

                <ToggleRow icon={<Pill size={20} color={PRIMARY} />} title="Share medicines" description="Allow assigned doctors to access medicines and reminders." value={settings.shareMedicinesWithAssignedDoctors} onPress={() => toggle("shareMedicinesWithAssignedDoctors")} />

                <ToggleRow icon={<FileCheck2 size={20} color={PRIMARY} />} title="Share medical reports" description="Allow assigned doctors to access uploaded medical reports." value={settings.shareReportsWithAssignedDoctors} onPress={() => toggle("shareReportsWithAssignedDoctors")} />

                <ToggleRow icon={<Lock size={20} color={PRIMARY} />} title="Confirm before report sharing" description="Ask for confirmation before sharing a newly uploaded report." value={settings.confirmBeforeReportSharing} onPress={() => toggle("confirmBeforeReportSharing")} isLast />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account security</Text>
                <Text style={styles.sectionSubtitle}>Notification privacy and session preferences</Text>

                <ToggleRow icon={<BellRing size={20} color={PRIMARY} />} title="Hide sensitive notification content" description="Use generic notification text on the device lock screen." value={settings.hideSensitiveNotificationContent} onPress={() => toggle("hideSensitiveNotificationContent")} />

                <ToggleRow icon={<ShieldCheck size={20} color={PRIMARY} />} title="Login alerts" description="Save permission to receive new-login security alerts." value={settings.loginAlertsEnabled} onPress={() => toggle("loginAlertsEnabled")} isLast />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Session timeout</Text>
                <Text style={styles.sectionSubtitle}>Preferred inactivity period before re-authentication</Text>

                <View style={styles.choiceGroup}>
                  {[15, 30, 60, 120].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.choiceButton, settings.sessionTimeoutMinutes === option ? styles.choiceButtonActive : undefined]}
                      activeOpacity={0.85}
                      onPress={() => setSettings(current => ({ ...current, sessionTimeoutMinutes: option as PrivacySettings["sessionTimeoutMinutes"] }))}
                    >
                      <Clock3 size={16} color={settings.sessionTimeoutMinutes === option ? SURFACE : PRIMARY} />
                      <Text style={[styles.choiceText, settings.sessionTimeoutMinutes === option ? styles.choiceTextActive : undefined]}>{option} min</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.warningCard}>
                <AlertCircle size={20} color={WARNING_DARK} />
                <Text style={styles.warningText}>These preferences are persisted. Doctor API enforcement, automatic session expiry and login-alert delivery require the final security integration step.</Text>
              </View>

              <TouchableOpacity style={[styles.saveButton, !hasChanges || isSaving ? styles.disabled : undefined]} activeOpacity={0.85} disabled={!hasChanges || isSaving} onPress={saveSettings}>
                {isSaving ? <ActivityIndicator color={SURFACE} /> : <><Save size={19} color={SURFACE} /><Text style={styles.saveText}>Save Privacy Settings</Text></>}
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const ToggleRow = ({ icon, title, description, value, onPress, isLast }: { icon: ReactNode; title: string; description: string; value: boolean; onPress: () => void; isLast?: boolean }) => (
  <TouchableOpacity style={[styles.toggleRow, isLast ? styles.rowLast : undefined]} activeOpacity={0.84} onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: value }}>
    <View style={styles.iconBox}>{icon}</View>
    <View style={styles.rowText}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDescription}>{description}</Text></View>
    <View style={[styles.switchTrack, value ? styles.switchTrackActive : undefined]}><View style={[styles.switchThumb, value ? styles.switchThumbActive : undefined]} /></View>
  </TouchableOpacity>
);

export default PrivacySecurityScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { minHeight: 70, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  backButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", overflow: "hidden", ...elevate(1) },
  headerText: { flex: 1, paddingHorizontal: 12 },
  headerTitle: { color: TEXT, fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: MUTED, fontSize: 12, fontWeight: "500", marginTop: 3 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 3 },
  heroCard: { backgroundColor: SUCCESS, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 12, ...elevate(2) },
  heroIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  heroText: { flex: 1 },
  heroTitle: { color: SURFACE, fontSize: 16, fontWeight: "700" },
  heroDescription: { color: "#EAF8F2", fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 4 },
  section: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, marginBottom: 12, ...elevate(1) },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  sectionSubtitle: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 3, marginBottom: 9 },
  toggleRow: { minHeight: 78, flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  rowLast: { borderBottomWidth: 0 },
  iconBox: { width: 42, height: 42, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  rowText: { flex: 1, paddingRight: 10 },
  rowTitle: { color: TEXT, fontSize: 13, fontWeight: "700" },
  rowDescription: { color: MUTED, fontSize: 10, fontWeight: "500", lineHeight: 15, marginTop: 4 },
  switchTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: "#D7DDE8", padding: 3, justifyContent: "center" },
  switchTrackActive: { backgroundColor: PRIMARY },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: SURFACE },
  switchThumbActive: { alignSelf: "flex-end" },
  choiceGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceButton: { borderRadius: 11, backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row", alignItems: "center" },
  choiceButtonActive: { backgroundColor: PRIMARY },
  choiceText: { color: PRIMARY, fontSize: 11, fontWeight: "700", marginLeft: 5 },
  choiceTextActive: { color: SURFACE },
  warningCard: { backgroundColor: WARNING_LIGHT, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  warningText: { flex: 1, color: WARNING_DARK, fontSize: 11, fontWeight: "500", lineHeight: 17, marginLeft: 9 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 28, alignItems: "center", ...elevate(1) },
  stateText: { color: MUTED, fontSize: 13, fontWeight: "600", marginTop: 10 },
  errorCard: { backgroundColor: DANGER_LIGHT, borderRadius: 16, padding: 15, flexDirection: "row" },
  errorContent: { flex: 1, marginLeft: 10 },
  errorTitle: { color: DANGER, fontSize: 14, fontWeight: "700" },
  errorText: { color: DANGER, fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 4 },
  retryButton: { alignSelf: "flex-start", backgroundColor: DANGER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", marginTop: 10 },
  retryText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginLeft: 6 },
  saveButton: { minHeight: 52, borderRadius: 14, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", overflow: "hidden", ...elevate(2) },
  saveText: { color: SURFACE, fontSize: 14, fontWeight: "700", marginLeft: 8 },
  disabled: { opacity: 0.5 },
});