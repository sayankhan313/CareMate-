import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, Vibration, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Accessibility, AlertCircle, ArrowLeft, Eye, Languages, RefreshCw, Save, Smartphone, Type } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "../../context/LanguageContext";
import { getLanguageNameKey, translateText } from "../../locales";
import { patientSettingsApi, type AccessibilitySettings, type AppTextSize, type SupportedLanguage } from "../../services/patientSettingsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "LanguageAccessibility">;
type AccessibilityBooleanKey = "highContrastEnabled" | "reduceMotionEnabled" | "screenReaderHintsEnabled" | "hapticFeedbackEnabled";

const DEFAULT_SETTINGS: AccessibilitySettings = { language: "ENGLISH", textSize: "NORMAL", highContrastEnabled: false, reduceMotionEnabled: false, screenReaderHintsEnabled: true, hapticFeedbackEnabled: true };

const LANGUAGES: Array<{ value: SupportedLanguage; nativeLabel: string }> = [
  { value: "ENGLISH", nativeLabel: "English" },
  { value: "HINDI", nativeLabel: "हिन्दी" },
  { value: "GREEK", nativeLabel: "Ελληνικά" },
  { value: "HAUSA", nativeLabel: "Hausa" },
  { value: "GERMAN", nativeLabel: "Deutsch" },
];

const TEXT_SIZES: Array<{ value: AppTextSize; key: "language.small" | "language.normal" | "language.large" | "language.extraLarge" }> = [
  { value: "SMALL", key: "language.small" },
  { value: "NORMAL", key: "language.normal" },
  { value: "LARGE", key: "language.large" },
  { value: "EXTRA_LARGE", key: "language.extraLarge" },
];

const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";
const WARNING_LIGHT = "#FFF3E2";
const WARNING_DARK = "#A45A08";

const elevate = (level = 1) => ({ elevation: level === 1 ? 2 : 4, shadowColor: "#172033", shadowOpacity: Platform.OS === "android" ? 0 : 0.08, shadowRadius: level === 1 ? 4 : 8, shadowOffset: { width: 0, height: level === 1 ? 2 : 4 } });

const LanguageAccessibilityScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { t, language, textSize, highContrastEnabled, reduceMotionEnabled, screenReaderHintsEnabled, hapticFeedbackEnabled, palette, scaleFont, applyAccessibilitySettings } = useLanguage();
  const [settings, setSettings] = useState<AccessibilitySettings>({ language, textSize, highContrastEnabled, reduceMotionEnabled, screenReaderHintsEnabled, hapticFeedbackEnabled });
  const [savedSettings, setSavedSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasChanges = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [settings, savedSettings]);

  const triggerHaptic = () => {
    if (hapticFeedbackEnabled) Vibration.vibrate(12);
  };

  const loadSettings = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await patientSettingsApi.getAccessibilitySettings();
      setSettings(result.settings);
      setSavedSettings(result.settings);
      await applyAccessibilitySettings(result.settings);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("common.settingsUnavailable"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [applyAccessibilitySettings, t]);

  useFocusEffect(useCallback(() => { void loadSettings("initial"); }, [loadSettings]));

  const toggle = (key: AccessibilityBooleanKey) => {
    triggerHaptic();
    setSettings(current => ({ ...current, [key]: !current[key] }));
  };

  const selectLanguage = (value: SupportedLanguage) => {
    triggerHaptic();
    setSettings(current => ({ ...current, language: value }));
  };

  const selectTextSize = (value: AppTextSize) => {
    triggerHaptic();
    setSettings(current => ({ ...current, textSize: value }));
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const result = await patientSettingsApi.updateAccessibilitySettings(settings);
      setSettings(result.settings);
      setSavedSettings(result.settings);
      await applyAccessibilitySettings(result.settings);

      const selectedLanguageName = translateText(result.settings.language, getLanguageNameKey(result.settings.language));
      Alert.alert(translateText(result.settings.language, "language.savedTitle"), translateText(result.settings.language, "language.savedMessage", { language: selectedLanguageName }));
    } catch (error) {
      Alert.alert(t("language.saveError"), error instanceof Error ? error.message : t("common.unableToSave"));
    } finally {
      setIsSaving(false);
    }
  };

  const textColor = palette.text;
  const mutedColor = palette.muted;
  const surfaceColor = palette.surface;
  const backgroundColor = palette.background;
  const borderColor = palette.border;
  const primaryColor = palette.primary;
  const primaryLightColor = palette.primaryLight;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={backgroundColor} barStyle="dark-content" />

      <View style={[styles.screen, { backgroundColor }]}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: surfaceColor }]} activeOpacity={0.85} onPress={() => navigation.goBack()} accessibilityLabel={screenReaderHintsEnabled ? t("common.cancel") : undefined}><ArrowLeft size={22} color={textColor} strokeWidth={2.7} /></TouchableOpacity>
          <View style={styles.headerText}><Text style={[styles.headerTitle, { color: textColor, fontSize: scaleFont(20) }]}>{t("language.title")}</Text><Text style={[styles.headerSubtitle, { color: mutedColor, fontSize: scaleFont(11) }]}>{t("language.subtitle")}</Text></View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(36, insets.bottom + 26) }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadSettings("refresh")} colors={[primaryColor]} tintColor={primaryColor} />}>
          {isLoading ? <View style={[styles.stateCard, { backgroundColor: surfaceColor }]}><ActivityIndicator color={primaryColor} /><Text style={[styles.stateText, { color: mutedColor, fontSize: scaleFont(13) }]}>{t("language.loading")}</Text></View> : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <AlertCircle size={22} color={DANGER} />
              <View style={styles.errorContent}><Text style={[styles.errorTitle, { fontSize: scaleFont(14) }]}>{t("common.settingsUnavailable")}</Text><Text style={[styles.errorText, { fontSize: scaleFont(11) }]}>{errorMessage}</Text><TouchableOpacity style={styles.retryButton} onPress={() => void loadSettings("initial")}><RefreshCw size={16} color="#FFFFFF" /><Text style={[styles.retryText, { fontSize: scaleFont(12) }]}>{t("common.tryAgain")}</Text></TouchableOpacity></View>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <View style={[styles.heroCard, { backgroundColor: primaryColor }]}>
                <View style={[styles.heroIcon, { backgroundColor: surfaceColor }]}><Languages size={25} color={primaryColor} /></View>
                <View style={styles.heroText}><Text style={[styles.heroTitle, { fontSize: scaleFont(16) }]}>{t("language.heroTitle")}</Text><Text style={[styles.heroDescription, { fontSize: scaleFont(11) }]}>{t("language.heroDescription")}</Text></View>
              </View>

              <View style={[styles.section, { backgroundColor: surfaceColor }]}>
                <Text style={[styles.sectionTitle, { color: textColor, fontSize: scaleFont(16) }]}>{t("language.appLanguage")}</Text>
                <Text style={[styles.sectionSubtitle, { color: mutedColor, fontSize: scaleFont(11) }]}>{t("language.appLanguageDescription")}</Text>

                <View style={styles.languageList}>
                  {LANGUAGES.map(item => {
                    const selected = settings.language === item.value;
                    return (
                      <TouchableOpacity key={item.value} style={[styles.languageRow, { backgroundColor: selected ? primaryLightColor : backgroundColor, borderColor }, selected ? styles.languageRowActive : undefined]} activeOpacity={0.85} onPress={() => selectLanguage(item.value)} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={screenReaderHintsEnabled ? `${t(getLanguageNameKey(item.value))}, ${item.nativeLabel}` : undefined}>
                        <View style={[styles.radioOuter, { borderColor: selected ? primaryColor : borderColor }]}>{selected ? <View style={[styles.radioInner, { backgroundColor: primaryColor }]} /> : null}</View>
                        <View style={styles.languageText}><Text style={[styles.languageName, { color: textColor, fontSize: scaleFont(13) }]}>{t(getLanguageNameKey(item.value))}</Text><Text style={[styles.nativeName, { color: mutedColor, fontSize: scaleFont(11) }]}>{item.nativeLabel}</Text></View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: surfaceColor }]}>
                <Text style={[styles.sectionTitle, { color: textColor, fontSize: scaleFont(16) }]}>{t("language.textSize")}</Text>
                <Text style={[styles.sectionSubtitle, { color: mutedColor, fontSize: scaleFont(11) }]}>{t("language.textSizeDescription")}</Text>

                <View style={styles.choiceGroup}>
                  {TEXT_SIZES.map(option => {
                    const selected = settings.textSize === option.value;
                    return (
                      <TouchableOpacity key={option.value} style={[styles.choiceButton, { backgroundColor: selected ? primaryColor : primaryLightColor }]} activeOpacity={0.85} onPress={() => selectTextSize(option.value)} accessibilityRole="radio" accessibilityState={{ selected }}>
                        <Type size={16} color={selected ? "#FFFFFF" : primaryColor} />
                        <Text style={[styles.choiceText, { color: selected ? "#FFFFFF" : primaryColor, fontSize: scaleFont(11) }]}>{t(option.key)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: surfaceColor }]}>
                <Text style={[styles.sectionTitle, { color: textColor, fontSize: scaleFont(16) }]}>{t("language.accessibility")}</Text>
                <Text style={[styles.sectionSubtitle, { color: mutedColor, fontSize: scaleFont(11) }]}>{t("language.accessibilityDescription")}</Text>

                <ToggleRow icon={<Eye size={20} color={primaryColor} />} title={t("language.highContrast")} description={t("language.highContrastDescription")} value={settings.highContrastEnabled} onPress={() => toggle("highContrastEnabled")} textColor={textColor} mutedColor={mutedColor} borderColor={borderColor} primaryColor={primaryColor} primaryLightColor={primaryLightColor} scaleFont={scaleFont} />
                <ToggleRow icon={<Smartphone size={20} color={primaryColor} />} title={t("language.reduceMotion")} description={t("language.reduceMotionDescription")} value={settings.reduceMotionEnabled} onPress={() => toggle("reduceMotionEnabled")} textColor={textColor} mutedColor={mutedColor} borderColor={borderColor} primaryColor={primaryColor} primaryLightColor={primaryLightColor} scaleFont={scaleFont} />
                <ToggleRow icon={<Accessibility size={20} color={primaryColor} />} title={t("language.screenReaderHints")} description={t("language.screenReaderHintsDescription")} value={settings.screenReaderHintsEnabled} onPress={() => toggle("screenReaderHintsEnabled")} textColor={textColor} mutedColor={mutedColor} borderColor={borderColor} primaryColor={primaryColor} primaryLightColor={primaryLightColor} scaleFont={scaleFont} />
                <ToggleRow icon={<Smartphone size={20} color={primaryColor} />} title={t("language.hapticFeedback")} description={t("language.hapticFeedbackDescription")} value={settings.hapticFeedbackEnabled} onPress={() => toggle("hapticFeedbackEnabled")} textColor={textColor} mutedColor={mutedColor} borderColor={borderColor} primaryColor={primaryColor} primaryLightColor={primaryLightColor} scaleFont={scaleFont} isLast />
              </View>

              <View style={styles.warningCard}><AlertCircle size={20} color={WARNING_DARK} /><Text style={[styles.warningText, { fontSize: scaleFont(11) }]}>{t("language.heroDescription")}</Text></View>

              <TouchableOpacity style={[styles.saveButton, { backgroundColor: primaryColor }, !hasChanges || isSaving ? styles.disabled : undefined]} activeOpacity={0.85} disabled={!hasChanges || isSaving} onPress={saveSettings} accessibilityLabel={screenReaderHintsEnabled ? t("language.save") : undefined}>
                {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <><Save size={19} color="#FFFFFF" /><Text style={[styles.saveText, { fontSize: scaleFont(14) }]}>{t("language.save")}</Text></>}
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const ToggleRow = ({ icon, title, description, value, onPress, isLast, textColor, mutedColor, borderColor, primaryColor, primaryLightColor, scaleFont }: { icon: ReactNode; title: string; description: string; value: boolean; onPress: () => void; isLast?: boolean; textColor: string; mutedColor: string; borderColor: string; primaryColor: string; primaryLightColor: string; scaleFont: (size: number) => number }) => (
  <TouchableOpacity style={[styles.toggleRow, { borderBottomColor: borderColor }, isLast ? styles.rowLast : undefined]} activeOpacity={0.84} onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: value }}>
    <View style={[styles.iconBox, { backgroundColor: primaryLightColor }]}>{icon}</View>
    <View style={styles.rowText}><Text style={[styles.rowTitle, { color: textColor, fontSize: scaleFont(13) }]}>{title}</Text><Text style={[styles.rowDescription, { color: mutedColor, fontSize: scaleFont(10) }]}>{description}</Text></View>
    <View style={[styles.switchTrack, value ? { backgroundColor: primaryColor } : undefined]}><View style={[styles.switchThumb, value ? styles.switchThumbActive : undefined]} /></View>
  </TouchableOpacity>
);

export default LanguageAccessibilityScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  header: { minHeight: 70, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  backButton: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", overflow: "hidden", ...elevate(1) },
  headerText: { flex: 1, paddingHorizontal: 12 },
  headerTitle: { fontWeight: "700" },
  headerSubtitle: { fontWeight: "500", marginTop: 3 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 3 },
  heroCard: { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 12, ...elevate(2) },
  heroIcon: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 },
  heroText: { flex: 1 },
  heroTitle: { color: "#FFFFFF", fontWeight: "700" },
  heroDescription: { color: "#EAF0FF", fontWeight: "500", lineHeight: 17, marginTop: 4 },
  section: { borderRadius: 16, padding: 15, marginBottom: 12, ...elevate(1) },
  sectionTitle: { fontWeight: "700" },
  sectionSubtitle: { fontWeight: "500", lineHeight: 17, marginTop: 3, marginBottom: 9 },
  languageList: { gap: 8 },
  languageRow: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12, flexDirection: "row", alignItems: "center" },
  languageRowActive: { borderWidth: 1 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center", marginRight: 11 },
  radioInner: { width: 11, height: 11, borderRadius: 6 },
  languageText: { flex: 1 },
  languageName: { fontWeight: "700" },
  nativeName: { fontWeight: "500", marginTop: 2 },
  choiceGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceButton: { borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row", alignItems: "center" },
  choiceText: { fontWeight: "700", marginLeft: 5 },
  toggleRow: { minHeight: 78, flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLast: { borderBottomWidth: 0 },
  iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 11 },
  rowText: { flex: 1, paddingRight: 10 },
  rowTitle: { fontWeight: "700" },
  rowDescription: { fontWeight: "500", lineHeight: 15, marginTop: 4 },
  switchTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: "#D7DDE8", padding: 3, justifyContent: "center" },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF" },
  switchThumbActive: { alignSelf: "flex-end" },
  warningCard: { backgroundColor: WARNING_LIGHT, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  warningText: { flex: 1, color: WARNING_DARK, fontWeight: "500", lineHeight: 17, marginLeft: 9 },
  stateCard: { borderRadius: 16, padding: 28, alignItems: "center", ...elevate(1) },
  stateText: { fontWeight: "600", marginTop: 10 },
  errorCard: { backgroundColor: DANGER_LIGHT, borderRadius: 16, padding: 15, flexDirection: "row" },
  errorContent: { flex: 1, marginLeft: 10 },
  errorTitle: { color: DANGER, fontWeight: "700" },
  errorText: { color: DANGER, fontWeight: "500", lineHeight: 17, marginTop: 4 },
  retryButton: { alignSelf: "flex-start", backgroundColor: DANGER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", marginTop: 10 },
  retryText: { color: "#FFFFFF", fontWeight: "700", marginLeft: 6 },
  saveButton: { minHeight: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", overflow: "hidden", ...elevate(2) },
  saveText: { color: "#FFFFFF", fontWeight: "700", marginLeft: 8 },
  disabled: { opacity: 0.5 },
});
