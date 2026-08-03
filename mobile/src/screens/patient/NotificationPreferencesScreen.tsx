import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
 
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  BellRing,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  HeartPulse,
  Mail,
  MessageSquareText,
  Pill,
  RefreshCw,
  Save,
  ShieldAlert,
  Smartphone,
  Stethoscope,
  UsersRound,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  patientSettingsApi,
  type NotificationPreferences,
} from "../../services/patientSettingsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "NotificationPreferences">;
type PreferenceKey = keyof NotificationPreferences;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#3F6FD0";
const PRIMARY_LIGHT = "#EEF4FF";
const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";
const WARNING = "#F6A545";
const WARNING_DARK = "#A45A08";
const WARNING_LIGHT = "#FFF3E2";
const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  medicineReminders: true,
  missedDoseAlerts: true,
  consultationUpdates: true,
  medicineReviewUpdates: true,
  reportReviewUpdates: true,
  criticalVitalAlerts: true,
  safetyResponseAlerts: true,
  careTeamUpdates: true,
  emailNotifications: true,
  pushNotifications: true,
};

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const NotificationPreferencesScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [savedPreferences, setSavedPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasChanges = useMemo(() => JSON.stringify(preferences) !== JSON.stringify(savedPreferences), [preferences, savedPreferences]);

  const loadPreferences = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await patientSettingsApi.getNotificationPreferences();

      setPreferences(result.preferences);
      setSavedPreferences(result.preferences);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load notification preferences.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadPreferences("initial");
  }, [loadPreferences]));

  const togglePreference = (key: PreferenceKey) => {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const savePreferences = async () => {
    try {
      setIsSaving(true);

      const result = await patientSettingsApi.updateNotificationPreferences(preferences);

      setPreferences(result.preferences);
      setSavedPreferences(result.preferences);

      Alert.alert("Preferences saved", "Your notification preferences have been updated.");
    } catch (error) {
      Alert.alert("Unable to save preferences", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.headerButton} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.7} />
          </TouchableOpacity>

          <View style={styles.appBarTextBlock}>
            <Text style={styles.appBarTitle}>Notifications</Text>
            <Text style={styles.appBarSubtitle}>Choose the updates you receive</Text>
          </View>

          {hasChanges ? (
            <View style={styles.unsavedBadge}>
              <Text style={styles.unsavedText}>Unsaved</Text>
            </View>
          ) : (
            <View style={styles.savedBadge}>
              <CheckCircle2 size={14} color={SUCCESS_DARK} strokeWidth={2.6} />
            </View>
          )}
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(36, insets.bottom + 26) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadPreferences("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading preferences</Text>
              <Text style={styles.stateText}>Fetching your saved notification settings.</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <AlertCircle size={23} color={DANGER_DARK} strokeWidth={2.6} />

              <View style={styles.errorTextBlock}>
                <Text style={styles.errorTitle}>Preferences unavailable</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>

                <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => void loadPreferences("initial")}>
                  <RefreshCw size={16} color={SURFACE} strokeWidth={2.5} />
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <View style={styles.heroCard}>
                <View style={styles.heroIcon}>
                  <BellRing size={27} color={PRIMARY} strokeWidth={2.6} />
                </View>

                <View style={styles.heroTextBlock}>
                  <Text style={styles.heroTitle}>Stay informed</Text>
                  <Text style={styles.heroText}>These preferences are saved now. Remote push delivery will use them when Firebase is connected.</Text>
                </View>
              </View>

              <PreferenceSection title="Delivery methods" subtitle="Choose how updates may be delivered">
                <PreferenceRow
                  icon={<Smartphone size={20} color={PRIMARY} strokeWidth={2.5} />}
                  title="Push notifications"
                  description="Allow notifications on your registered mobile device."
                  value={preferences.pushNotifications}
                  onPress={() => togglePreference("pushNotifications")}
                />

                <PreferenceRow
                  icon={<Mail size={20} color={PRIMARY} strokeWidth={2.5} />}
                  title="Email notifications"
                  description="Allow important account and care updates by email."
                  value={preferences.emailNotifications}
                  onPress={() => togglePreference("emailNotifications")}
                  isLast
                />
              </PreferenceSection>

              <PreferenceSection title="Medicines and consultations" subtitle="Updates about treatment and care activity">
                <PreferenceRow
                  icon={<Pill size={20} color={PRIMARY} strokeWidth={2.5} />}
                  title="Medicine reminders"
                  description="Receive scheduled medicine reminder notifications."
                  value={preferences.medicineReminders}
                  onPress={() => togglePreference("medicineReminders")}
                />

                <PreferenceRow
                  icon={<AlertCircle size={20} color={WARNING_DARK} strokeWidth={2.5} />}
                  title="Missed dose alerts"
                  description="Receive an alert when a medicine dose may have been missed."
                  value={preferences.missedDoseAlerts}
                  onPress={() => togglePreference("missedDoseAlerts")}
                />

                <PreferenceRow
                  icon={<CalendarClock size={20} color={PRIMARY} strokeWidth={2.5} />}
                  title="Consultation updates"
                  description="Receive consultation requests, acceptance and status updates."
                  value={preferences.consultationUpdates}
                  onPress={() => togglePreference("consultationUpdates")}
                />

                <PreferenceRow
                  icon={<Stethoscope size={20} color={PRIMARY} strokeWidth={2.5} />}
                  title="Medicine review updates"
                  description="Receive updates when a doctor reviews a medicine request."
                  value={preferences.medicineReviewUpdates}
                  onPress={() => togglePreference("medicineReviewUpdates")}
                />

                <PreferenceRow
                  icon={<FileCheck2 size={20} color={PRIMARY} strokeWidth={2.5} />}
                  title="Report review updates"
                  description="Receive updates when a doctor reviews an uploaded report."
                  value={preferences.reportReviewUpdates}
                  onPress={() => togglePreference("reportReviewUpdates")}
                  isLast
                />
              </PreferenceSection>

              <PreferenceSection title="Health and safety" subtitle="Important health and care-team notifications">
                <PreferenceRow
                  icon={<HeartPulse size={20} color={DANGER} strokeWidth={2.5} />}
                  title="Critical vital alerts"
                  description="Controls notification delivery only. The in-app safety response remains available."
                  value={preferences.criticalVitalAlerts}
                  onPress={() => togglePreference("criticalVitalAlerts")}
                />

                <PreferenceRow
                  icon={<ShieldAlert size={20} color={DANGER} strokeWidth={2.5} />}
                  title="Safety Response alerts"
                  description="Receive updates related to Safety Response escalation."
                  value={preferences.safetyResponseAlerts}
                  onPress={() => togglePreference("safetyResponseAlerts")}
                />

                <PreferenceRow
                  icon={<UsersRound size={20} color={PRIMARY} strokeWidth={2.5} />}
                  title="Care team updates"
                  description="Receive doctor assignment and care-team changes."
                  value={preferences.careTeamUpdates}
                  onPress={() => togglePreference("careTeamUpdates")}
                  isLast
                />
              </PreferenceSection>

              <View style={styles.infoCard}>
                <MessageSquareText size={21} color={WARNING_DARK} strokeWidth={2.5} />

                <View style={styles.infoTextBlock}>
                  <Text style={styles.infoTitle}>Firebase connection pending</Text>
                  <Text style={styles.infoText}>The switches are fully saved in the database. Actual background push notifications will begin after Firebase device registration is added.</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, (!hasChanges || isSaving) ? styles.saveButtonDisabled : undefined]}
                activeOpacity={0.85}
                onPress={savePreferences}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={SURFACE} />
                ) : (
                  <>
                    <Save size={19} color={SURFACE} strokeWidth={2.6} />
                    <Text style={styles.saveButtonText}>Save Preferences</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const PreferenceSection = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.sectionRows}>{children}</View>
    </View>
  );
};

const PreferenceRow = ({
  icon,
  title,
  description,
  value,
  onPress,
  isLast,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  value: boolean;
  onPress: () => void;
  isLast?: boolean;
}) => {
  return (
    <TouchableOpacity
      style={[styles.preferenceRow, isLast ? styles.preferenceRowLast : undefined]}
      activeOpacity={0.84}
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={styles.preferenceIcon}>{icon}</View>

      <View style={styles.preferenceTextBlock}>
        <Text style={styles.preferenceTitle}>{title}</Text>
        <Text style={styles.preferenceDescription}>{description}</Text>
      </View>

      <View style={[styles.switchTrack, value ? styles.switchTrackActive : undefined]}>
        <View style={[styles.switchThumb, value ? styles.switchThumbActive : undefined]} />
      </View>
    </TouchableOpacity>
  );
};

export default NotificationPreferencesScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  appBar: { minHeight: 70, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", overflow: "hidden", ...elevate(1) },
  appBarTextBlock: { flex: 1, paddingHorizontal: 12 },
  appBarTitle: { color: TEXT, fontSize: 22, fontWeight: "700" },
  appBarSubtitle: { color: MUTED, fontSize: 12, fontWeight: "500", marginTop: 3 },
  unsavedBadge: { backgroundColor: WARNING_LIGHT, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  unsavedText: { color: WARNING_DARK, fontSize: 10, fontWeight: "700" },
  savedBadge: { width: 38, height: 38, borderRadius: 11, backgroundColor: SUCCESS_LIGHT, alignItems: "center", justifyContent: "center" },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 3 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 30, alignItems: "center", ...elevate(1) },
  stateTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 12 },
  stateText: { color: MUTED, fontSize: 12, fontWeight: "500", lineHeight: 18, textAlign: "center", marginTop: 5 },
  errorCard: { backgroundColor: DANGER_LIGHT, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "flex-start" },
  errorTextBlock: { flex: 1, marginLeft: 11 },
  errorTitle: { color: DANGER_DARK, fontSize: 15, fontWeight: "700" },
  errorText: { color: DANGER_DARK, fontSize: 12, fontWeight: "500", lineHeight: 18, marginTop: 4 },
  retryButton: { alignSelf: "flex-start", backgroundColor: DANGER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", marginTop: 10 },
  retryText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginLeft: 6 },
  heroCard: { backgroundColor: PRIMARY, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 12, ...elevate(2) },
  heroIcon: { width: 52, height: 52, borderRadius: 15, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  heroTextBlock: { flex: 1 },
  heroTitle: { color: SURFACE, fontSize: 17, fontWeight: "700" },
  heroText: { color: "#EAF0FF", fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 4 },
  sectionCard: { backgroundColor: SURFACE, borderRadius: 16, paddingTop: 15, paddingHorizontal: 15, marginBottom: 12, ...elevate(1) },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  sectionSubtitle: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 3 },
  sectionRows: { marginTop: 7 },
  preferenceRow: { minHeight: 82, flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  preferenceRowLast: { borderBottomWidth: 0 },
  preferenceIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  preferenceTextBlock: { flex: 1, paddingRight: 10 },
  preferenceTitle: { color: TEXT, fontSize: 13, fontWeight: "700" },
  preferenceDescription: { color: MUTED, fontSize: 10, fontWeight: "500", lineHeight: 15, marginTop: 4 },
  switchTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: "#D7DDE8", padding: 3, justifyContent: "center" },
  switchTrackActive: { backgroundColor: PRIMARY },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: SURFACE, ...elevate(1) },
  switchThumbActive: { alignSelf: "flex-end" },
  infoCard: { backgroundColor: WARNING_LIGHT, borderRadius: 14, padding: 13, flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  infoTextBlock: { flex: 1, marginLeft: 10 },
  infoTitle: { color: WARNING_DARK, fontSize: 13, fontWeight: "700" },
  infoText: { color: WARNING_DARK, fontSize: 10, fontWeight: "500", lineHeight: 16, marginTop: 4 },
  saveButton: { minHeight: 52, borderRadius: 14, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", overflow: "hidden", ...elevate(2) },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: SURFACE, fontSize: 14, fontWeight: "700", marginLeft: 8 },
});