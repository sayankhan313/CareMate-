import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertCircle, ArrowLeft, BellRing, Clock3, RefreshCw, Save, Volume2, Vibrate } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { patientSettingsApi, type ReminderSettings } from "../../services/patientSettingsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ReminderSettings">;
type ReminderBooleanKey = "missedDoseReminder" | "repeatMissedDoseAlert" | "vibrationEnabled" | "soundEnabled";

const DEFAULT_SETTINGS: ReminderSettings = {
  defaultSnoozeMinutes: 10,
  missedDoseReminder: true,
  repeatMissedDoseAlert: true,
  repeatIntervalMinutes: 30,
  vibrationEnabled: true,
  soundEnabled: true,
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PRIMARY = "#5B86E5";
const PRIMARY_LIGHT = "#EEF4FF";
const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const elevate = (level = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const ReminderSettingsScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasChanges = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [settings, savedSettings]);

  const loadSettings = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await patientSettingsApi.getReminderSettings();
      setSettings(result.settings);
      setSavedSettings(result.settings);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load reminder settings.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadSettings("initial");
  }, [loadSettings]));

  const toggle = (key: ReminderBooleanKey) => setSettings(current => ({ ...current, [key]: !current[key] }));

  const saveSettings = async () => {
    try {
      setIsSaving(true);

      const result = await patientSettingsApi.updateReminderSettings(settings);
      setSettings(result.settings);
      setSavedSettings(result.settings);

      Alert.alert("Settings saved", "Your medicine reminder settings have been updated.");
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
        <Header title="Reminder settings" subtitle="Medicine alert behaviour" onBack={() => navigation.goBack()} />

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(36, insets.bottom + 26) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadSettings("refresh")} colors={[PRIMARY]} tintColor={PRIMARY} />}
        >
          {isLoading ? <LoadingState text="Loading reminder settings..." /> : null}
          {!isLoading && errorMessage ? <ErrorState message={errorMessage} onRetry={() => void loadSettings("initial")} /> : null}

          {!isLoading && !errorMessage ? (
            <>
              <InfoCard
                icon={<BellRing size={23} color={PRIMARY} strokeWidth={2.5} />}
                title="Medicine reminders"
                text="These values are saved now and will be used by the notification scheduler."
              />

              <Section title="Default snooze duration" subtitle="Used when a patient snoozes a medicine reminder">
                <ChoiceGroup
                  options={[5, 10, 15, 30]}
                  selected={settings.defaultSnoozeMinutes}
                  suffix="min"
                  onSelect={value => setSettings(current => ({ ...current, defaultSnoozeMinutes: value as ReminderSettings["defaultSnoozeMinutes"] }))}
                />
              </Section>

              <Section title="Missed-dose behaviour" subtitle="Control follow-up alerts after a scheduled dose">
                <ToggleRow icon={<AlertCircle size={20} color={PRIMARY} />} title="Missed-dose reminder" description="Alert when a scheduled medicine may have been missed." value={settings.missedDoseReminder} onPress={() => toggle("missedDoseReminder")} />

                <ToggleRow icon={<Clock3 size={20} color={PRIMARY} />} title="Repeat missed-dose alert" description="Repeat the alert until the dose is acknowledged." value={settings.repeatMissedDoseAlert} onPress={() => toggle("repeatMissedDoseAlert")} isLast />
              </Section>

              <Section title="Repeat interval" subtitle="Time between repeated missed-dose alerts">
                <ChoiceGroup
                  options={[10, 15, 30, 60]}
                  selected={settings.repeatIntervalMinutes}
                  suffix="min"
                  disabled={!settings.repeatMissedDoseAlert}
                  onSelect={value => setSettings(current => ({ ...current, repeatIntervalMinutes: value as ReminderSettings["repeatIntervalMinutes"] }))}
                />
              </Section>

              <Section title="Device feedback" subtitle="Sound and vibration preferences">
                <ToggleRow icon={<Volume2 size={20} color={PRIMARY} />} title="Reminder sound" description="Play a notification sound for medicine reminders." value={settings.soundEnabled} onPress={() => toggle("soundEnabled")} />

                <ToggleRow icon={<Vibrate size={20} color={PRIMARY} />} title="Vibration" description="Vibrate the device when a reminder is delivered." value={settings.vibrationEnabled} onPress={() => toggle("vibrationEnabled")} isLast />
              </Section>

              <SaveButton disabled={!hasChanges || isSaving} loading={isSaving} onPress={saveSettings} />
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const Header = ({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={onBack}><ArrowLeft size={22} color={TEXT} strokeWidth={2.7} /></TouchableOpacity>
    <View style={styles.headerText}><Text style={styles.headerTitle}>{title}</Text><Text style={styles.headerSubtitle}>{subtitle}</Text></View>
  </View>
);

const Section = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
  <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text><View style={styles.sectionContent}>{children}</View></View>
);

const ChoiceGroup = ({ options, selected, suffix, onSelect, disabled }: { options: number[]; selected: number; suffix: string; onSelect: (value: number) => void; disabled?: boolean }) => (
  <View style={[styles.choiceGroup, disabled ? styles.disabled : undefined]}>
    {options.map(option => (
      <TouchableOpacity key={option} style={[styles.choiceButton, selected === option ? styles.choiceButtonActive : undefined]} activeOpacity={0.85} disabled={disabled} onPress={() => onSelect(option)}>
        <Text style={[styles.choiceText, selected === option ? styles.choiceTextActive : undefined]}>{option} {suffix}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const ToggleRow = ({ icon, title, description, value, onPress, isLast }: { icon: ReactNode; title: string; description: string; value: boolean; onPress: () => void; isLast?: boolean }) => (
  <TouchableOpacity style={[styles.toggleRow, isLast ? styles.rowLast : undefined]} activeOpacity={0.84} onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: value }}>
    <View style={styles.iconBox}>{icon}</View>
    <View style={styles.rowText}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDescription}>{description}</Text></View>
    <View style={[styles.switchTrack, value ? styles.switchTrackActive : undefined]}><View style={[styles.switchThumb, value ? styles.switchThumbActive : undefined]} /></View>
  </TouchableOpacity>
);

const InfoCard = ({ icon, title, text }: { icon: ReactNode; title: string; text: string }) => (
  <View style={styles.infoCard}><View style={styles.infoIcon}>{icon}</View><View style={styles.infoText}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoDescription}>{text}</Text></View></View>
);

const LoadingState = ({ text }: { text: string }) => <View style={styles.stateCard}><ActivityIndicator color={PRIMARY} /><Text style={styles.stateText}>{text}</Text></View>;

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <View style={styles.errorCard}><AlertCircle size={22} color={DANGER} /><View style={styles.errorContent}><Text style={styles.errorTitle}>Settings unavailable</Text><Text style={styles.errorText}>{message}</Text><TouchableOpacity style={styles.retryButton} onPress={onRetry}><RefreshCw size={16} color={SURFACE} /><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View></View>
);

const SaveButton = ({ disabled, loading, onPress }: { disabled: boolean; loading: boolean; onPress: () => void }) => (
  <TouchableOpacity style={[styles.saveButton, disabled ? styles.disabled : undefined]} activeOpacity={0.85} disabled={disabled} onPress={onPress}>
    {loading ? <ActivityIndicator color={SURFACE} /> : <><Save size={19} color={SURFACE} /><Text style={styles.saveText}>Save Settings</Text></>}
  </TouchableOpacity>
);

export default ReminderSettingsScreen;

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
  infoCard: { backgroundColor: PRIMARY, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 12, ...elevate(2) },
  infoIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  infoText: { flex: 1 },
  infoTitle: { color: SURFACE, fontSize: 16, fontWeight: "700" },
  infoDescription: { color: "#EAF0FF", fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 4 },
  section: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, marginBottom: 12, ...elevate(1) },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  sectionSubtitle: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 3 },
  sectionContent: { marginTop: 9 },
  choiceGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceButton: { minWidth: 70, borderRadius: 11, backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 12, paddingVertical: 11, alignItems: "center" },
  choiceButtonActive: { backgroundColor: PRIMARY },
  choiceText: { color: PRIMARY, fontSize: 12, fontWeight: "700" },
  choiceTextActive: { color: SURFACE },
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