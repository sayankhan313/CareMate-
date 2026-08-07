import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertCircle, ArrowLeft, Bell, BellRing, CheckCircle2, Clock3, FileText, HeartPulse, Mail, Pill, RefreshCw, Repeat2, ShieldAlert, Stethoscope, UsersRound, Vibrate, Video, Volume2 } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "../../context/LanguageContext";
import { notificationPreferencesApi, type PatientNotificationPreferences, type PatientPreferencesData, type PatientReminderPreferences } from "../../services/notificationPreferencesApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "NotificationPreferences">;
type NotificationBooleanKey = Exclude<keyof PatientNotificationPreferences, "updatedAt">;
type ReminderBooleanKey = "missedDoseReminder" | "repeatMissedDoseAlert" | "vibrationEnabled" | "soundEnabled";
type Copy = Record<keyof typeof COPY.en, string>;

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
const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const COPY = {
  en: {
    title: "Notification settings",
    subtitle: "Choose which CareMate+ updates you receive",
    loading: "Loading notification settings",
    unavailable: "Settings unavailable",
    tryAgain: "Try again",
    autoSave: "Changes save automatically",
    delivery: "Delivery",
    push: "Push notifications",
    pushDesc: "Allow CareMate+ notifications on this device.",
    email: "Email notifications",
    emailDesc: "Receive account and important service updates by email.",
    careUpdates: "Care updates",
    medicine: "Medicine reminders",
    medicineDesc: "Reminder when a scheduled medicine is due.",
    missed: "Missed-dose alerts",
    missedDesc: "Alert when a dose is not marked as taken.",
    consultation: "Consultation updates",
    consultationDesc: "Doctor responses and consultation status changes.",
    medicineReview: "Medicine review updates",
    medicineReviewDesc: "Updates when a doctor reviews a medicine request.",
    reports: "Report review updates",
    reportsDesc: "Updates when a doctor reviews an uploaded report.",
    criticalVitals: "Critical vital alerts",
    criticalVitalsDesc: "Important alerts when a critical reading is detected.",
    safety: "Safety Response updates",
    safetyDesc: "Updates about Safety Response and emergency escalation.",
    careTeam: "Care team updates",
    careTeamDesc: "Doctor assignment and primary-doctor changes.",
    reminderBehaviour: "Reminder behaviour",
    missedReminder: "Mark overdue doses as missed",
    missedReminderDesc: "Create a missed-dose record after the grace period.",
    repeatMissed: "Repeat missed-dose alerts",
    repeatMissedDesc: "Repeat an alert while the dose remains missed.",
    snooze: "Default snooze",
    repeatInterval: "Repeat interval",
    sound: "Notification sound",
    soundDesc: "Use sound for medicine reminder notifications.",
    vibration: "Vibration",
    vibrationDesc: "Use vibration for medicine reminder notifications.",
    minutes: "min",
    disabledHint: "Turn on push notifications to manage push categories.",
    saveFailed: "Unable to save setting",
    saved: "Saved",
  },
  de: {
    title: "Benachrichtigungseinstellungen",
    subtitle: "Wählen Sie, welche CareMate+-Updates Sie erhalten",
    loading: "Benachrichtigungseinstellungen werden geladen",
    unavailable: "Einstellungen nicht verfügbar",
    tryAgain: "Erneut versuchen",
    autoSave: "Änderungen werden automatisch gespeichert",
    delivery: "Zustellung",
    push: "Push-Benachrichtigungen",
    pushDesc: "CareMate+-Benachrichtigungen auf diesem Gerät erlauben.",
    email: "E-Mail-Benachrichtigungen",
    emailDesc: "Konto- und wichtige Service-Updates per E-Mail erhalten.",
    careUpdates: "Versorgungsupdates",
    medicine: "Medikamentenerinnerungen",
    medicineDesc: "Erinnerung, wenn ein Medikament fällig ist.",
    missed: "Warnungen bei ausgelassener Dosis",
    missedDesc: "Warnung, wenn eine Dosis nicht als eingenommen markiert wurde.",
    consultation: "Sprechstunden-Updates",
    consultationDesc: "Arztantworten und Statusänderungen.",
    medicineReview: "Medikamentenprüfungen",
    medicineReviewDesc: "Updates zu ärztlich geprüften Medikamentenanfragen.",
    reports: "Befundprüfungen",
    reportsDesc: "Updates zu geprüften hochgeladenen Befunden.",
    criticalVitals: "Kritische Vitalwerte",
    criticalVitalsDesc: "Wichtige Warnungen bei kritischen Messwerten.",
    safety: "Safety-Response-Updates",
    safetyDesc: "Updates zu Safety Response und Eskalation.",
    careTeam: "Versorgungsteam",
    careTeamDesc: "Arztzuweisung und Wechsel des Hausarztes.",
    reminderBehaviour: "Erinnerungsverhalten",
    missedReminder: "Überfällige Dosen als ausgelassen markieren",
    missedReminderDesc: "Nach der Karenzzeit einen Eintrag erstellen.",
    repeatMissed: "Warnungen wiederholen",
    repeatMissedDesc: "Warnung wiederholen, solange die Dosis ausgelassen ist.",
    snooze: "Standard-Schlummerzeit",
    repeatInterval: "Wiederholungsintervall",
    sound: "Benachrichtigungston",
    soundDesc: "Ton für Medikamentenerinnerungen verwenden.",
    vibration: "Vibration",
    vibrationDesc: "Vibration für Medikamentenerinnerungen verwenden.",
    minutes: "Min.",
    disabledHint: "Aktivieren Sie Push-Benachrichtigungen, um Kategorien zu verwalten.",
    saveFailed: "Einstellung konnte nicht gespeichert werden",
    saved: "Gespeichert",
  },
  el: {
    title: "Ρυθμίσεις ειδοποιήσεων",
    subtitle: "Επιλέξτε ποιες ενημερώσεις CareMate+ θα λαμβάνετε",
    loading: "Φόρτωση ρυθμίσεων ειδοποιήσεων",
    unavailable: "Οι ρυθμίσεις δεν είναι διαθέσιμες",
    tryAgain: "Δοκιμάστε ξανά",
    autoSave: "Οι αλλαγές αποθηκεύονται αυτόματα",
    delivery: "Παράδοση",
    push: "Ειδοποιήσεις push",
    pushDesc: "Να επιτρέπονται ειδοποιήσεις CareMate+ σε αυτή τη συσκευή.",
    email: "Ειδοποιήσεις email",
    emailDesc: "Λήψη σημαντικών ενημερώσεων μέσω email.",
    careUpdates: "Ενημερώσεις φροντίδας",
    medicine: "Υπενθυμίσεις φαρμάκων",
    medicineDesc: "Υπενθύμιση όταν πρέπει να ληφθεί ένα φάρμακο.",
    missed: "Ειδοποιήσεις χαμένης δόσης",
    missedDesc: "Ειδοποίηση όταν μια δόση δεν σημειωθεί ως ληφθείσα.",
    consultation: "Ενημερώσεις συνεδρίας",
    consultationDesc: "Απαντήσεις γιατρού και αλλαγές κατάστασης.",
    medicineReview: "Ενημερώσεις ελέγχου φαρμάκων",
    medicineReviewDesc: "Ενημερώσεις όταν ο γιατρός ελέγξει ένα αίτημα.",
    reports: "Ενημερώσεις ελέγχου αναφορών",
    reportsDesc: "Ενημερώσεις όταν ο γιατρός ελέγξει μια αναφορά.",
    criticalVitals: "Κρίσιμες ζωτικές ενδείξεις",
    criticalVitalsDesc: "Σημαντικές ειδοποιήσεις για κρίσιμη μέτρηση.",
    safety: "Ενημερώσεις Safety Response",
    safetyDesc: "Ενημερώσεις για απόκριση ασφαλείας και κλιμάκωση.",
    careTeam: "Ομάδα φροντίδας",
    careTeamDesc: "Ανάθεση γιατρού και αλλαγές κύριου γιατρού.",
    reminderBehaviour: "Συμπεριφορά υπενθύμισης",
    missedReminder: "Σήμανση καθυστερημένων δόσεων ως χαμένων",
    missedReminderDesc: "Δημιουργία εγγραφής μετά την περίοδο χάριτος.",
    repeatMissed: "Επανάληψη ειδοποιήσεων χαμένης δόσης",
    repeatMissedDesc: "Επανάληψη όσο η δόση παραμένει χαμένη.",
    snooze: "Προεπιλεγμένη αναβολή",
    repeatInterval: "Διάστημα επανάληψης",
    sound: "Ήχος ειδοποίησης",
    soundDesc: "Χρήση ήχου για υπενθυμίσεις φαρμάκων.",
    vibration: "Δόνηση",
    vibrationDesc: "Χρήση δόνησης για υπενθυμίσεις φαρμάκων.",
    minutes: "λεπ.",
    disabledHint: "Ενεργοποιήστε τις ειδοποιήσεις push για διαχείριση κατηγοριών.",
    saveFailed: "Δεν ήταν δυνατή η αποθήκευση",
    saved: "Αποθηκεύτηκε",
  },
  ha: {
    title: "Saitunan sanarwa",
    subtitle: "Zaɓi sabuntawar CareMate+ da kake son karɓa",
    loading: "Ana loda saitunan sanarwa",
    unavailable: "Ba a samun saituna",
    tryAgain: "Sake gwadawa",
    autoSave: "Ana adana canje-canje kai tsaye",
    delivery: "Isarwa",
    push: "Sanarwar push",
    pushDesc: "Bada damar sanarwar CareMate+ a wannan na'urar.",
    email: "Sanarwar imel",
    emailDesc: "Karɓi muhimman sabuntawa ta imel.",
    careUpdates: "Sabuntawar kulawa",
    medicine: "Tunanin magani",
    medicineDesc: "Tuna lokacin shan magani ya yi.",
    missed: "Gargadin rasa kashi",
    missedDesc: "Gargadi idan ba a nuna an sha magani ba.",
    consultation: "Sabuntawar ganawa",
    consultationDesc: "Amsar likita da canjin matsayin ganawa.",
    medicineReview: "Sabuntawar duba magani",
    medicineReviewDesc: "Sabuntawa lokacin da likita ya duba buƙata.",
    reports: "Sabuntawar duba rahoto",
    reportsDesc: "Sabuntawa lokacin da likita ya duba rahoto.",
    criticalVitals: "Gargadin ma'auni mai tsanani",
    criticalVitalsDesc: "Muhimmin gargadi idan an gano ma'auni mai tsanani.",
    safety: "Sabuntawar Safety Response",
    safetyDesc: "Sabuntawa game da martanin tsaro da ɗaukaka.",
    careTeam: "Tawagar kulawa",
    careTeamDesc: "Naɗin likita da canjin babban likita.",
    reminderBehaviour: "Halayen tunatarwa",
    missedReminder: "Nuna kashin da ya wuce a matsayin rasa",
    missedReminderDesc: "Ƙirƙiri rikodi bayan lokacin jira.",
    repeatMissed: "Maimaita gargadin rasa kashi",
    repeatMissedDesc: "Maimaita gargadi muddin ba a sha kashin ba.",
    snooze: "Lokacin jinkiri na asali",
    repeatInterval: "Tazarar maimaitawa",
    sound: "Sautin sanarwa",
    soundDesc: "Yi amfani da sauti don tunatarwar magani.",
    vibration: "Girgiza",
    vibrationDesc: "Yi amfani da girgiza don tunatarwar magani.",
    minutes: "mint.",
    disabledHint: "Kunna sanarwar push don sarrafa rukuni.",
    saveFailed: "Ba a iya adana saitin ba",
    saved: "An adana",
  },
  hi: {
    title: "नोटिफिकेशन सेटिंग्स",
    subtitle: "चुनें कि आपको कौन-से CareMate+ अपडेट मिलें",
    loading: "नोटिफिकेशन सेटिंग्स लोड हो रही हैं",
    unavailable: "सेटिंग्स उपलब्ध नहीं हैं",
    tryAgain: "फिर कोशिश करें",
    autoSave: "बदलाव अपने-आप सेव होते हैं",
    delivery: "डिलीवरी",
    push: "पुश नोटिफिकेशन",
    pushDesc: "इस डिवाइस पर CareMate+ नोटिफिकेशन की अनुमति दें।",
    email: "ईमेल नोटिफिकेशन",
    emailDesc: "ज़रूरी अकाउंट और सेवा अपडेट ईमेल से पाएं।",
    careUpdates: "केयर अपडेट",
    medicine: "दवा रिमाइंडर",
    medicineDesc: "दवा लेने का समय होने पर रिमाइंडर पाएं।",
    missed: "मिस्ड डोज़ अलर्ट",
    missedDesc: "डोज़ को लिया हुआ मार्क न करने पर अलर्ट पाएं।",
    consultation: "कंसल्टेशन अपडेट",
    consultationDesc: "डॉक्टर के जवाब और स्टेटस बदलाव पाएं।",
    medicineReview: "दवा रिव्यू अपडेट",
    medicineReviewDesc: "डॉक्टर द्वारा दवा अनुरोध रिव्यू करने पर अपडेट।",
    reports: "रिपोर्ट रिव्यू अपडेट",
    reportsDesc: "डॉक्टर द्वारा अपलोड की गई रिपोर्ट रिव्यू करने पर अपडेट।",
    criticalVitals: "क्रिटिकल वाइटल अलर्ट",
    criticalVitalsDesc: "क्रिटिकल रीडिंग मिलने पर महत्वपूर्ण अलर्ट।",
    safety: "सेफ्टी रिस्पॉन्स अपडेट",
    safetyDesc: "सेफ्टी रिस्पॉन्स और इमरजेंसी एस्केलेशन अपडेट।",
    careTeam: "केयर टीम अपडेट",
    careTeamDesc: "डॉक्टर असाइनमेंट और प्राइमरी डॉक्टर बदलाव।",
    reminderBehaviour: "रिमाइंडर व्यवहार",
    missedReminder: "ओवरड्यू डोज़ को मिस्ड मार्क करें",
    missedReminderDesc: "ग्रेस पीरियड के बाद मिस्ड डोज़ रिकॉर्ड बनाएं।",
    repeatMissed: "मिस्ड डोज़ अलर्ट दोहराएं",
    repeatMissedDesc: "डोज़ मिस्ड रहने तक अलर्ट दोहराएं।",
    snooze: "डिफ़ॉल्ट स्नूज़",
    repeatInterval: "रिपीट इंटरवल",
    sound: "नोटिफिकेशन साउंड",
    soundDesc: "दवा रिमाइंडर के लिए साउंड इस्तेमाल करें।",
    vibration: "वाइब्रेशन",
    vibrationDesc: "दवा रिमाइंडर के लिए वाइब्रेशन इस्तेमाल करें।",
    minutes: "मिनट",
    disabledHint: "पुश कैटेगरी मैनेज करने के लिए पुश नोटिफिकेशन चालू करें।",
    saveFailed: "सेटिंग सेव नहीं हो सकी",
    saved: "सेव हो गया",
  },
} as const;

const elevate = (level: 1 | 2 = 1) => ({ elevation: level === 1 ? 2 : 4, shadowColor: "#172033", shadowOpacity: Platform.OS === "android" ? 0 : 0.08, shadowRadius: level === 1 ? 4 : 8, shadowOffset: { width: 0, height: level === 1 ? 2 : 4 } });

const getCopy = (locale: string): Copy => {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("de") || normalized.startsWith("german")) return COPY.de;
  if (normalized.startsWith("el") || normalized.startsWith("gr") || normalized.startsWith("greek")) return COPY.el;
  if (normalized.startsWith("ha") || normalized.startsWith("hausa")) return COPY.ha;
  if (normalized.startsWith("hi") || normalized.startsWith("hindi")) return COPY.hi;
  return COPY.en;
};

export const NotificationPreferencesScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { locale, palette, scaleFont, screenReaderHintsEnabled } = useLanguage();
  const copy = useMemo(() => getCopy(String(locale)), [locale]);
  const [preferences, setPreferences] = useState<PatientPreferencesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPreferences = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");
      setPreferences(await notificationPreferencesApi.getPreferences());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.unavailable);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [copy.unavailable]);

  useFocusEffect(useCallback(() => { void loadPreferences("initial"); }, [loadPreferences]));

  const showSaved = (key: string) => {
    setSavedKey(key);
    setTimeout(() => setSavedKey(current => current === key ? null : current), 1200);
  };

  const updateNotificationBoolean = async (key: NotificationBooleanKey) => {
    if (!preferences || savingKey) return;

    const previous = preferences;
    const nextValue = !preferences.notifications[key];
    setSavingKey(key);
    setPreferences({ ...preferences, notifications: { ...preferences.notifications, [key]: nextValue } });

    try {
      const result = await notificationPreferencesApi.updateNotificationPreferences({ [key]: nextValue });
      setPreferences(result);
      showSaved(key);
    } catch (error) {
      setPreferences(previous);
      Alert.alert(copy.saveFailed, error instanceof Error ? error.message : copy.unavailable);
    } finally {
      setSavingKey(null);
    }
  };

  const updateReminderBoolean = async (key: ReminderBooleanKey) => {
    if (!preferences || savingKey) return;

    const previous = preferences;
    const nextValue = !preferences.reminders[key];
    setSavingKey(key);
    setPreferences({ ...preferences, reminders: { ...preferences.reminders, [key]: nextValue } });

    try {
      const result = await notificationPreferencesApi.updateReminderPreferences({ [key]: nextValue });
      setPreferences(result);
      showSaved(key);
    } catch (error) {
      setPreferences(previous);
      Alert.alert(copy.saveFailed, error instanceof Error ? error.message : copy.unavailable);
    } finally {
      setSavingKey(null);
    }
  };

  const updateReminderNumber = async (key: "defaultSnoozeMinutes" | "repeatIntervalMinutes", value: number) => {
    if (!preferences || savingKey || preferences.reminders[key] === value) return;

    const previous = preferences;
    setSavingKey(key);
    setPreferences({ ...preferences, reminders: { ...preferences.reminders, [key]: value } });

    try {
      const result = await notificationPreferencesApi.updateReminderPreferences({ [key]: value });
      setPreferences(result);
      showSaved(key);
    } catch (error) {
      setPreferences(previous);
      Alert.alert(copy.saveFailed, error instanceof Error ? error.message : copy.unavailable);
    } finally {
      setSavingKey(null);
    }
  };

  const pushEnabled = preferences?.notifications.pushNotifications ?? false;
  const surfaceColor = palette.surface;
  const backgroundColor = palette.background;
  const textColor = palette.text;
  const mutedColor = palette.muted;
  const primaryColor = palette.primary;
  const primaryLightColor = palette.primaryLight;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={backgroundColor} barStyle="dark-content" />
      <View style={[styles.screen, { backgroundColor }]}>
        <View style={styles.appBar}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: surfaceColor }]} activeOpacity={0.85} onPress={() => navigation.goBack()} accessibilityLabel={screenReaderHintsEnabled ? copy.title : undefined}><ArrowLeft size={22} color={textColor} strokeWidth={2.7} /></TouchableOpacity>
          <View style={styles.appBarText}><Text style={[styles.appBarTitle, { color: textColor, fontSize: scaleFont(24) }]}>{copy.title}</Text><Text style={[styles.appBarSubtitle, { color: mutedColor, fontSize: scaleFont(12) }]}>{copy.subtitle}</Text></View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 24) }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadPreferences("refresh")} colors={[primaryColor]} tintColor={primaryColor} />}>
          <View style={[styles.infoPanel, { backgroundColor: primaryLightColor }]}><BellRing size={19} color={primaryColor} strokeWidth={2.5} /><Text style={[styles.infoText, { color: primaryColor, fontSize: scaleFont(12) }]}>{copy.autoSave}</Text></View>

          {isLoading ? <View style={[styles.stateCard, { backgroundColor: surfaceColor }]}><ActivityIndicator color={primaryColor} /><Text style={[styles.stateText, { color: mutedColor, fontSize: scaleFont(13) }]}>{copy.loading}</Text></View> : null}

          {!isLoading && errorMessage ? <View style={styles.errorCard}><AlertCircle size={23} color={DANGER} strokeWidth={2.6} /><View style={styles.errorTextBlock}><Text style={[styles.errorTitle, { fontSize: scaleFont(15) }]}>{copy.unavailable}</Text><Text style={[styles.errorText, { fontSize: scaleFont(12) }]}>{errorMessage}</Text><TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => void loadPreferences("initial")}><RefreshCw size={15} color={SURFACE} strokeWidth={2.5} /><Text style={[styles.retryText, { fontSize: scaleFont(12) }]}>{copy.tryAgain}</Text></TouchableOpacity></View></View> : null}

          {!isLoading && !errorMessage && preferences ? (
            <>
              <SettingsSection title={copy.delivery} surfaceColor={surfaceColor} textColor={textColor} scaleFont={scaleFont}>
                <ToggleRow icon={<Bell size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.push} description={copy.pushDesc} value={preferences.notifications.pushNotifications} loading={savingKey === "pushNotifications"} saved={savedKey === "pushNotifications"} onPress={() => void updateNotificationBoolean("pushNotifications")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} />
                <ToggleRow icon={<Mail size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.email} description={copy.emailDesc} value={preferences.notifications.emailNotifications} loading={savingKey === "emailNotifications"} saved={savedKey === "emailNotifications"} onPress={() => void updateNotificationBoolean("emailNotifications")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} isLast />
              </SettingsSection>

              {!pushEnabled ? <View style={styles.disabledPanel}><AlertCircle size={18} color={DANGER_DARK} strokeWidth={2.5} /><Text style={[styles.disabledText, { fontSize: scaleFont(12) }]}>{copy.disabledHint}</Text></View> : null}

              <SettingsSection title={copy.careUpdates} surfaceColor={surfaceColor} textColor={textColor} scaleFont={scaleFont}>
                <ToggleRow icon={<Pill size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.medicine} description={copy.medicineDesc} value={preferences.notifications.medicineReminders} disabled={!pushEnabled} loading={savingKey === "medicineReminders"} saved={savedKey === "medicineReminders"} onPress={() => void updateNotificationBoolean("medicineReminders")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} />
                <ToggleRow icon={<Clock3 size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.missed} description={copy.missedDesc} value={preferences.notifications.missedDoseAlerts} disabled={!pushEnabled} loading={savingKey === "missedDoseAlerts"} saved={savedKey === "missedDoseAlerts"} onPress={() => void updateNotificationBoolean("missedDoseAlerts")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} />
                <ToggleRow icon={<Video size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.consultation} description={copy.consultationDesc} value={preferences.notifications.consultationUpdates} disabled={!pushEnabled} loading={savingKey === "consultationUpdates"} saved={savedKey === "consultationUpdates"} onPress={() => void updateNotificationBoolean("consultationUpdates")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} />
                <ToggleRow icon={<Stethoscope size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.medicineReview} description={copy.medicineReviewDesc} value={preferences.notifications.medicineReviewUpdates} disabled={!pushEnabled} loading={savingKey === "medicineReviewUpdates"} saved={savedKey === "medicineReviewUpdates"} onPress={() => void updateNotificationBoolean("medicineReviewUpdates")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} />
                <ToggleRow icon={<FileText size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.reports} description={copy.reportsDesc} value={preferences.notifications.reportReviewUpdates} disabled={!pushEnabled} loading={savingKey === "reportReviewUpdates"} saved={savedKey === "reportReviewUpdates"} onPress={() => void updateNotificationBoolean("reportReviewUpdates")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} />
                <ToggleRow icon={<HeartPulse size={20} color={DANGER} strokeWidth={2.5} />} title={copy.criticalVitals} description={copy.criticalVitalsDesc} value={preferences.notifications.criticalVitalAlerts} disabled={!pushEnabled} loading={savingKey === "criticalVitalAlerts"} saved={savedKey === "criticalVitalAlerts"} onPress={() => void updateNotificationBoolean("criticalVitalAlerts")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={DANGER_LIGHT} primaryColor={DANGER} scaleFont={scaleFont} />
                <ToggleRow icon={<ShieldAlert size={20} color={DANGER} strokeWidth={2.5} />} title={copy.safety} description={copy.safetyDesc} value={preferences.notifications.safetyResponseAlerts} disabled={!pushEnabled} loading={savingKey === "safetyResponseAlerts"} saved={savedKey === "safetyResponseAlerts"} onPress={() => void updateNotificationBoolean("safetyResponseAlerts")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={DANGER_LIGHT} primaryColor={DANGER} scaleFont={scaleFont} />
                <ToggleRow icon={<UsersRound size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.careTeam} description={copy.careTeamDesc} value={preferences.notifications.careTeamUpdates} disabled={!pushEnabled} loading={savingKey === "careTeamUpdates"} saved={savedKey === "careTeamUpdates"} onPress={() => void updateNotificationBoolean("careTeamUpdates")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} isLast />
              </SettingsSection>

              <SettingsSection title={copy.reminderBehaviour} surfaceColor={surfaceColor} textColor={textColor} scaleFont={scaleFont}>
                <ToggleRow icon={<Clock3 size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.missedReminder} description={copy.missedReminderDesc} value={preferences.reminders.missedDoseReminder} disabled={!pushEnabled || !preferences.notifications.missedDoseAlerts} loading={savingKey === "missedDoseReminder"} saved={savedKey === "missedDoseReminder"} onPress={() => void updateReminderBoolean("missedDoseReminder")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} />
                <ToggleRow icon={<Repeat2 size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.repeatMissed} description={copy.repeatMissedDesc} value={preferences.reminders.repeatMissedDoseAlert} disabled={!pushEnabled || !preferences.notifications.missedDoseAlerts || !preferences.reminders.missedDoseReminder} loading={savingKey === "repeatMissedDoseAlert"} saved={savedKey === "repeatMissedDoseAlert"} onPress={() => void updateReminderBoolean("repeatMissedDoseAlert")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} />
                <ChoiceRow icon={<Clock3 size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.snooze} values={[5, 10, 15, 30, 60]} selectedValue={preferences.reminders.defaultSnoozeMinutes} suffix={copy.minutes} disabled={!pushEnabled || !preferences.notifications.medicineReminders} loading={savingKey === "defaultSnoozeMinutes"} saved={savedKey === "defaultSnoozeMinutes"} onSelect={value => void updateReminderNumber("defaultSnoozeMinutes", value)} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} />
                <ChoiceRow icon={<Repeat2 size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.repeatInterval} values={[15, 30, 60, 120]} selectedValue={preferences.reminders.repeatIntervalMinutes} suffix={copy.minutes} disabled={!pushEnabled || !preferences.reminders.repeatMissedDoseAlert} loading={savingKey === "repeatIntervalMinutes"} saved={savedKey === "repeatIntervalMinutes"} onSelect={value => void updateReminderNumber("repeatIntervalMinutes", value)} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} />
                <ToggleRow icon={<Volume2 size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.sound} description={copy.soundDesc} value={preferences.reminders.soundEnabled} disabled={!pushEnabled} loading={savingKey === "soundEnabled"} saved={savedKey === "soundEnabled"} onPress={() => void updateReminderBoolean("soundEnabled")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} />
                <ToggleRow icon={<Vibrate size={20} color={primaryColor} strokeWidth={2.5} />} title={copy.vibration} description={copy.vibrationDesc} value={preferences.reminders.vibrationEnabled} disabled={!pushEnabled} loading={savingKey === "vibrationEnabled"} saved={savedKey === "vibrationEnabled"} onPress={() => void updateReminderBoolean("vibrationEnabled")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} iconBackground={primaryLightColor} primaryColor={primaryColor} scaleFont={scaleFont} isLast />
              </SettingsSection>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const SettingsSection = ({ title, children, surfaceColor, textColor, scaleFont }: { title: string; children: ReactNode; surfaceColor: string; textColor: string; scaleFont: (size: number) => number }) => <View style={[styles.sectionCard, { backgroundColor: surfaceColor }]}><Text style={[styles.sectionTitle, { color: textColor, fontSize: scaleFont(16) }]}>{title}</Text>{children}</View>;

const ToggleRow = ({ icon, title, description, value, onPress, disabled, loading, saved, isLast, textColor, mutedColor, borderColor, iconBackground, primaryColor, scaleFont }: { icon: ReactNode; title: string; description: string; value: boolean; onPress: () => void; disabled?: boolean; loading?: boolean; saved?: boolean; isLast?: boolean; textColor: string; mutedColor: string; borderColor: string; iconBackground: string; primaryColor: string; scaleFont: (size: number) => number }) => (
  <TouchableOpacity style={[styles.settingRow, { borderBottomColor: borderColor }, isLast ? styles.lastRow : undefined, disabled ? styles.disabledRow : undefined]} activeOpacity={0.82} onPress={onPress} disabled={disabled || loading}>
    <View style={[styles.rowIcon, { backgroundColor: iconBackground }]}>{icon}</View>
    <View style={styles.rowText}><View style={styles.rowTitleLine}><Text style={[styles.rowTitle, { color: textColor, fontSize: scaleFont(14) }]}>{title}</Text>{saved ? <CheckCircle2 size={15} color={SUCCESS} strokeWidth={2.7} /> : null}</View><Text style={[styles.rowDescription, { color: mutedColor, fontSize: scaleFont(11) }]}>{description}</Text></View>
    {loading ? <ActivityIndicator size="small" color={primaryColor} /> : <View style={[styles.toggleTrack, value ? { backgroundColor: primaryColor } : styles.toggleTrackOff]}><View style={[styles.toggleThumb, value ? styles.toggleThumbOn : undefined]} /></View>}
  </TouchableOpacity>
);

const ChoiceRow = ({ icon, title, values, selectedValue, suffix, onSelect, disabled, loading, saved, textColor, mutedColor, borderColor, iconBackground, primaryColor, scaleFont }: { icon: ReactNode; title: string; values: number[]; selectedValue: number; suffix: string; onSelect: (value: number) => void; disabled?: boolean; loading?: boolean; saved?: boolean; textColor: string; mutedColor: string; borderColor: string; iconBackground: string; primaryColor: string; scaleFont: (size: number) => number }) => (
  <View style={[styles.choiceRow, { borderBottomColor: borderColor }, disabled ? styles.disabledRow : undefined]}>
    <View style={styles.choiceHeader}><View style={[styles.rowIcon, { backgroundColor: iconBackground }]}>{icon}</View><View style={styles.rowText}><View style={styles.rowTitleLine}><Text style={[styles.rowTitle, { color: textColor, fontSize: scaleFont(14) }]}>{title}</Text>{saved ? <CheckCircle2 size={15} color={SUCCESS} strokeWidth={2.7} /> : null}</View></View>{loading ? <ActivityIndicator size="small" color={primaryColor} /> : null}</View>
    <View style={styles.chipRow}>{values.map(value => <TouchableOpacity key={value} style={[styles.choiceChip, { borderColor }, selectedValue === value ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined]} activeOpacity={0.82} disabled={disabled || loading} onPress={() => onSelect(value)}><Text style={[styles.choiceChipText, { color: selectedValue === value ? SURFACE : mutedColor, fontSize: scaleFont(11) }]}>{value} {suffix}</Text></TouchableOpacity>)}</View>
  </View>
);

export default NotificationPreferencesScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  appBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  backButton: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 13, overflow: "hidden", ...elevate(1) },
  appBarText: { flex: 1 },
  appBarTitle: { color: TEXT, fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  appBarSubtitle: { color: MUTED, fontSize: 12, fontWeight: "500", marginTop: 3 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  infoPanel: { borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  infoText: { color: PRIMARY_DARK, fontSize: 12, fontWeight: "600", marginLeft: 8, flex: 1 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 24, alignItems: "center", ...elevate(1) },
  stateText: { color: MUTED, fontSize: 13, fontWeight: "600", marginTop: 10 },
  errorCard: { backgroundColor: DANGER_LIGHT, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "flex-start" },
  errorTextBlock: { flex: 1, marginLeft: 11 },
  errorTitle: { color: DANGER_DARK, fontSize: 15, fontWeight: "700" },
  errorText: { color: DANGER_DARK, fontSize: 12, fontWeight: "500", lineHeight: 18, marginTop: 4 },
  retryButton: { alignSelf: "flex-start", backgroundColor: DANGER, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 9, flexDirection: "row", alignItems: "center", marginTop: 11 },
  retryText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginLeft: 6 },
  disabledPanel: { backgroundColor: DANGER_LIGHT, borderRadius: 13, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  disabledText: { color: DANGER_DARK, fontSize: 12, fontWeight: "600", lineHeight: 18, marginLeft: 8, flex: 1 },
  sectionCard: { backgroundColor: SURFACE, borderRadius: 16, paddingTop: 16, paddingHorizontal: 16, marginBottom: 12, ...elevate(1) },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginBottom: 7 },
  settingRow: { minHeight: 76, paddingVertical: 13, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  lastRow: { borderBottomWidth: 0 },
  disabledRow: { opacity: 0.48 },
  rowIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowText: { flex: 1, paddingRight: 10 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowTitle: { color: TEXT, fontSize: 14, fontWeight: "700", flexShrink: 1 },
  rowDescription: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 16, marginTop: 3 },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: PRIMARY, padding: 3, justifyContent: "center" },
  toggleTrackOff: { backgroundColor: "#C8CDDA" },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: SURFACE, ...elevate(1) },
  toggleThumbOn: { alignSelf: "flex-end" },
  choiceRow: { paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  choiceHeader: { flexDirection: "row", alignItems: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, marginLeft: 54 },
  choiceChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginRight: 7, marginBottom: 7 },
  choiceChipText: { color: MUTED, fontSize: 11, fontWeight: "700" },
});