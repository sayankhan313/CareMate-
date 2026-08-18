import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Crown,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
  X,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AccessibleText as Text } from "../../components/common/AccessibleText";
import { useLanguage } from "../../context/LanguageContext";
import { patientPharmacyApi, type PatientPharmacy } from "../../services/pharmacy/patientPharmacyApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "MyPharmacies">;
type CopyLanguage = "ENGLISH" | "HINDI" | "GREEK" | "HAUSA" | "GERMAN";

type Copy = {
  title: string;
  subtitle: string;
  loading: string;
  unavailable: string;
  tryAgain: string;
  overviewTitle: string;
  primaryPharmacy: string;
  noPrimary: string;
  noPrimaryDescription: string;
  prescriptionsRouteHere: string;
  savedCount: string;
  savedTitle: string;
  savedSubtitle: string;
  noSaved: string;
  noSavedText: string;
  primary: string;
  saved: string;
  unavailablePharmacy: string;
  setPrimary: string;
  remove: string;
  findTitle: string;
  findSubtitle: string;
  searchPlaceholder: string;
  search: string;
  noResults: string;
  noResultsText: string;
  availableCount: string;
  savePharmacy: string;
  verified: string;
  openingHours: string;
  cancel: string;
  savedSuccess: string;
  primaryUpdated: string;
  removeTitle: string;
  removeMessage: string;
  removeConfirm: string;
  removedSuccess: string;
  unableSave: string;
  unablePrimary: string;
  unableRemove: string;
};

const COPY: Record<CopyLanguage, Copy> = {
  ENGLISH: {
    title: "My Pharmacies",
    subtitle: "Choose where your prescriptions are sent",
    loading: "Loading pharmacies...",
    unavailable: "Pharmacies unavailable",
    tryAgain: "Try again",
    overviewTitle: "Pharmacy setup",
    primaryPharmacy: "Primary pharmacy",
    noPrimary: "No primary pharmacy",
    noPrimaryDescription: "Save a pharmacy below to start receiving prescriptions there.",
    prescriptionsRouteHere: "New prescriptions will be sent here",
    savedCount: "Saved",
    savedTitle: "Saved pharmacies",
    savedSubtitle: "Keep multiple pharmacies and choose one as your primary pharmacy",
    noSaved: "No pharmacy saved yet",
    noSavedText: "Find an approved pharmacy below. Your first saved pharmacy automatically becomes primary.",
    primary: "Primary",
    saved: "Saved",
    unavailablePharmacy: "Unavailable",
    setPrimary: "Set primary",
    remove: "Remove",
    findTitle: "Find a pharmacy",
    findSubtitle: "Only approved and verified CareMate+ pharmacies are shown",
    searchPlaceholder: "Search name, city or postcode",
    search: "Search",
    noResults: "No pharmacies found",
    noResultsText: "No additional approved pharmacies match your search.",
    availableCount: "Available",
    savePharmacy: "Save pharmacy",
    verified: "Approved pharmacy",
    openingHours: "Opening hours",
    cancel: "Cancel",
    savedSuccess: "Pharmacy saved successfully.",
    primaryUpdated: "Primary pharmacy updated.",
    removeTitle: "Remove pharmacy?",
    removeMessage: "Remove this pharmacy from your saved pharmacies:",
    removeConfirm: "Remove",
    removedSuccess: "Pharmacy removed successfully.",
    unableSave: "Unable to save pharmacy",
    unablePrimary: "Unable to update primary pharmacy",
    unableRemove: "Unable to remove pharmacy",
  },

  HINDI: {
    title: "मेरी फ़ार्मेसियाँ",
    subtitle: "चुनें कि आपकी प्रिस्क्रिप्शन कहाँ भेजी जाएँ",
    loading: "फ़ार्मेसियाँ लोड हो रही हैं...",
    unavailable: "फ़ार्मेसियाँ उपलब्ध नहीं हैं",
    tryAgain: "फिर कोशिश करें",
    overviewTitle: "फ़ार्मेसी सेटअप",
    primaryPharmacy: "प्राथमिक फ़ार्मेसी",
    noPrimary: "कोई प्राथमिक फ़ार्मेसी नहीं",
    noPrimaryDescription: "प्रिस्क्रिप्शन प्राप्त करने के लिए नीचे एक फ़ार्मेसी सेव करें।",
    prescriptionsRouteHere: "नई प्रिस्क्रिप्शन यहाँ भेजी जाएँगी",
    savedCount: "सेव",
    savedTitle: "सेव की गई फ़ार्मेसियाँ",
    savedSubtitle: "एक से अधिक फ़ार्मेसी रखें और एक को प्राथमिक चुनें",
    noSaved: "अभी कोई फ़ार्मेसी सेव नहीं है",
    noSavedText: "नीचे एक स्वीकृत फ़ार्मेसी खोजें। पहली सेव की गई फ़ार्मेसी स्वतः प्राथमिक बन जाएगी।",
    primary: "प्राथमिक",
    saved: "सेव",
    unavailablePharmacy: "उपलब्ध नहीं",
    setPrimary: "प्राथमिक बनाएँ",
    remove: "हटाएँ",
    findTitle: "फ़ार्मेसी खोजें",
    findSubtitle: "केवल स्वीकृत और सत्यापित CareMate+ फ़ार्मेसियाँ दिखाई जाती हैं",
    searchPlaceholder: "नाम, शहर या पोस्टकोड खोजें",
    search: "खोजें",
    noResults: "कोई फ़ार्मेसी नहीं मिली",
    noResultsText: "आपकी खोज से कोई अतिरिक्त स्वीकृत फ़ार्मेसी नहीं मिली।",
    availableCount: "उपलब्ध",
    savePharmacy: "फ़ार्मेसी सेव करें",
    verified: "स्वीकृत फ़ार्मेसी",
    openingHours: "खुलने का समय",
    cancel: "रद्द करें",
    savedSuccess: "फ़ार्मेसी सफलतापूर्वक सेव हुई।",
    primaryUpdated: "प्राथमिक फ़ार्मेसी अपडेट हुई।",
    removeTitle: "फ़ार्मेसी हटाएँ?",
    removeMessage: "इस फ़ार्मेसी को सेव सूची से हटाएँ:",
    removeConfirm: "हटाएँ",
    removedSuccess: "फ़ार्मेसी सफलतापूर्वक हटाई गई।",
    unableSave: "फ़ार्मेसी सेव नहीं हो सकी",
    unablePrimary: "प्राथमिक फ़ार्मेसी अपडेट नहीं हो सकी",
    unableRemove: "फ़ार्मेसी हटाई नहीं जा सकी",
  },

  GREEK: {
    title: "Τα φαρμακεία μου",
    subtitle: "Επιλέξτε πού θα αποστέλλονται οι συνταγές σας",
    loading: "Φόρτωση φαρμακείων...",
    unavailable: "Τα φαρμακεία δεν είναι διαθέσιμα",
    tryAgain: "Δοκιμάστε ξανά",
    overviewTitle: "Ρύθμιση φαρμακείου",
    primaryPharmacy: "Κύριο φαρμακείο",
    noPrimary: "Δεν υπάρχει κύριο φαρμακείο",
    noPrimaryDescription: "Αποθηκεύστε ένα φαρμακείο παρακάτω για να λαμβάνει τις συνταγές σας.",
    prescriptionsRouteHere: "Οι νέες συνταγές θα αποστέλλονται εδώ",
    savedCount: "Αποθηκευμένα",
    savedTitle: "Αποθηκευμένα φαρμακεία",
    savedSubtitle: "Διατηρήστε πολλά φαρμακεία και επιλέξτε ένα ως κύριο",
    noSaved: "Δεν έχει αποθηκευτεί φαρμακείο",
    noSavedText: "Βρείτε ένα εγκεκριμένο φαρμακείο παρακάτω. Το πρώτο θα γίνει αυτόματα κύριο.",
    primary: "Κύριο",
    saved: "Αποθηκευμένο",
    unavailablePharmacy: "Μη διαθέσιμο",
    setPrimary: "Ορισμός κύριου",
    remove: "Αφαίρεση",
    findTitle: "Εύρεση φαρμακείου",
    findSubtitle: "Εμφανίζονται μόνο εγκεκριμένα και επαληθευμένα φαρμακεία CareMate+",
    searchPlaceholder: "Αναζήτηση ονόματος, πόλης ή ταχυδρομικού κώδικα",
    search: "Αναζήτηση",
    noResults: "Δεν βρέθηκαν φαρμακεία",
    noResultsText: "Δεν υπάρχουν επιπλέον εγκεκριμένα φαρμακεία που να ταιριάζουν.",
    availableCount: "Διαθέσιμα",
    savePharmacy: "Αποθήκευση φαρμακείου",
    verified: "Εγκεκριμένο φαρμακείο",
    openingHours: "Ώρες λειτουργίας",
    cancel: "Ακύρωση",
    savedSuccess: "Το φαρμακείο αποθηκεύτηκε.",
    primaryUpdated: "Το κύριο φαρμακείο ενημερώθηκε.",
    removeTitle: "Αφαίρεση φαρμακείου;",
    removeMessage: "Αφαίρεση αυτού του φαρμακείου:",
    removeConfirm: "Αφαίρεση",
    removedSuccess: "Το φαρμακείο αφαιρέθηκε.",
    unableSave: "Δεν ήταν δυνατή η αποθήκευση",
    unablePrimary: "Δεν ήταν δυνατή η ενημέρωση του κύριου φαρμακείου",
    unableRemove: "Δεν ήταν δυνατή η αφαίρεση",
  },

  HAUSA: {
    title: "Pharmacies dina",
    subtitle: "Zaɓi inda za a aika prescriptions ɗinka",
    loading: "Ana loda pharmacies...",
    unavailable: "Ba a samun pharmacies",
    tryAgain: "Sake gwadawa",
    overviewTitle: "Pharmacy setup",
    primaryPharmacy: "Primary pharmacy",
    noPrimary: "Babu primary pharmacy",
    noPrimaryDescription: "Adana pharmacy a ƙasa domin prescriptions su fara zuwa can.",
    prescriptionsRouteHere: "Sabbin prescriptions za su tafi nan",
    savedCount: "An adana",
    savedTitle: "Pharmacies da aka adana",
    savedSubtitle: "Za ka iya adana pharmacies da yawa sannan ka zaɓi primary",
    noSaved: "Ba a adana pharmacy ba tukuna",
    noSavedText: "Nemo approved pharmacy a ƙasa. Na farko da ka adana zai zama primary.",
    primary: "Primary",
    saved: "An adana",
    unavailablePharmacy: "Ba ya samuwa",
    setPrimary: "Sa primary",
    remove: "Cire",
    findTitle: "Nemo pharmacy",
    findSubtitle: "Approved da verified CareMate+ pharmacies kawai ake nunawa",
    searchPlaceholder: "Nemo suna, birni ko postcode",
    search: "Nema",
    noResults: "Ba a sami pharmacy ba",
    noResultsText: "Babu ƙarin approved pharmacy da ya dace da bincikenka.",
    availableCount: "Akwai",
    savePharmacy: "Adana pharmacy",
    verified: "Approved pharmacy",
    openingHours: "Lokacin aiki",
    cancel: "Soke",
    savedSuccess: "An adana pharmacy.",
    primaryUpdated: "An sabunta primary pharmacy.",
    removeTitle: "A cire pharmacy?",
    removeMessage: "Cire wannan pharmacy daga waɗanda aka adana:",
    removeConfirm: "Cire",
    removedSuccess: "An cire pharmacy.",
    unableSave: "Ba a iya adana pharmacy ba",
    unablePrimary: "Ba a iya sabunta primary pharmacy ba",
    unableRemove: "Ba a iya cire pharmacy ba",
  },

  GERMAN: {
    title: "Meine Apotheken",
    subtitle: "Wählen Sie, wohin Ihre Rezepte gesendet werden",
    loading: "Apotheken werden geladen...",
    unavailable: "Apotheken nicht verfügbar",
    tryAgain: "Erneut versuchen",
    overviewTitle: "Apotheken-Einrichtung",
    primaryPharmacy: "Hauptapotheke",
    noPrimary: "Keine Hauptapotheke",
    noPrimaryDescription: "Speichern Sie unten eine Apotheke, damit Rezepte dorthin gesendet werden können.",
    prescriptionsRouteHere: "Neue Rezepte werden hierhin gesendet",
    savedCount: "Gespeichert",
    savedTitle: "Gespeicherte Apotheken",
    savedSubtitle: "Speichern Sie mehrere Apotheken und wählen Sie eine als Hauptapotheke",
    noSaved: "Noch keine Apotheke gespeichert",
    noSavedText: "Suchen Sie unten eine zugelassene Apotheke. Die erste gespeicherte Apotheke wird automatisch Hauptapotheke.",
    primary: "Hauptapotheke",
    saved: "Gespeichert",
    unavailablePharmacy: "Nicht verfügbar",
    setPrimary: "Als Hauptapotheke",
    remove: "Entfernen",
    findTitle: "Apotheke finden",
    findSubtitle: "Es werden nur zugelassene und verifizierte CareMate+ Apotheken angezeigt",
    searchPlaceholder: "Name, Stadt oder Postleitzahl",
    search: "Suchen",
    noResults: "Keine Apotheken gefunden",
    noResultsText: "Keine weiteren zugelassenen Apotheken entsprechen Ihrer Suche.",
    availableCount: "Verfügbar",
    savePharmacy: "Apotheke speichern",
    verified: "Zugelassene Apotheke",
    openingHours: "Öffnungszeiten",
    cancel: "Abbrechen",
    savedSuccess: "Apotheke erfolgreich gespeichert.",
    primaryUpdated: "Hauptapotheke aktualisiert.",
    removeTitle: "Apotheke entfernen?",
    removeMessage: "Diese Apotheke aus den gespeicherten Apotheken entfernen:",
    removeConfirm: "Entfernen",
    removedSuccess: "Apotheke erfolgreich entfernt.",
    unableSave: "Apotheke konnte nicht gespeichert werden",
    unablePrimary: "Hauptapotheke konnte nicht aktualisiert werden",
    unableRemove: "Apotheke konnte nicht entfernt werden",
  },
};

const SURFACE = "#FFFFFF";
const PRIMARY_DARK = "#3F6FD0";
const PRIMARY_LIGHT = "#EEF4FF";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";
const WARNING_DARK = "#A45A08";
const WARNING_LIGHT = "#FFF3E2";
const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const getCopy = (language: string) => COPY[language as CopyLanguage] || COPY.ENGLISH;
const getAddress = (pharmacy: PatientPharmacy) => [pharmacy.address, pharmacy.city, pharmacy.postcode].filter(Boolean).join(", ");

export const MyPharmaciesScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { language, palette, scaleFont, screenReaderHintsEnabled, hapticFeedbackEnabled } = useLanguage();
  const copy = getCopy(language);

  const [savedPharmacies, setSavedPharmacies] = useState<PatientPharmacy[]>([]);
  const [approvedPharmacies, setApprovedPharmacies] = useState<PatientPharmacy[]>([]);
  const [primaryPharmacyId, setPrimaryPharmacyId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const savedPharmacyIds = useMemo(() => new Set(savedPharmacies.map(pharmacy => pharmacy.id)), [savedPharmacies]);

  const availablePharmacies = useMemo(
    () => approvedPharmacies.filter(pharmacy => pharmacy.isAvailable && !pharmacy.isSaved && !savedPharmacyIds.has(pharmacy.id)),
    [approvedPharmacies, savedPharmacyIds],
  );

  const primaryPharmacy = useMemo(
    () => savedPharmacies.find(pharmacy => pharmacy.id === primaryPharmacyId || pharmacy.isPrimary) || null,
    [primaryPharmacyId, savedPharmacies],
  );

  const feedback = useCallback(() => {
    if (hapticFeedbackEnabled) Vibration.vibrate(12);
  }, [hapticFeedbackEnabled]);

  const loadData = useCallback(
    async (mode: "initial" | "refresh" | "search" = "initial", query = "") => {
      try {
        if (mode === "initial") setIsLoading(true);
        if (mode === "refresh") setIsRefreshing(true);
        if (mode === "search") setIsSearching(true);

        setErrorMessage("");

        const [savedResult, approvedResult] = await Promise.all([
          patientPharmacyApi.getSavedPharmacies(),
          patientPharmacyApi.getApprovedPharmacies({ search: query.trim() || undefined, limit: 50 }),
        ]);

        setSavedPharmacies(savedResult.pharmacies || []);
        setPrimaryPharmacyId(savedResult.primaryPharmacyId);
        setApprovedPharmacies(approvedResult.pharmacies || []);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : copy.unavailable);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsSearching(false);
      }
    },
    [copy.unavailable],
  );

  useFocusEffect(
    useCallback(() => {
      void loadData("initial");
    }, [loadData]),
  );

  const handleSave = async (pharmacy: PatientPharmacy) => {
    try {
      setBusyId(pharmacy.id);
      await patientPharmacyApi.savePharmacy(pharmacy.id);
      feedback();
      Alert.alert(copy.savePharmacy, copy.savedSuccess);
      await loadData("search", searchText);
    } catch (error) {
      Alert.alert(copy.unableSave, error instanceof Error ? error.message : copy.unavailable);
    } finally {
      setBusyId(null);
    }
  };

  const handleSetPrimary = async (pharmacy: PatientPharmacy) => {
    try {
      setBusyId(pharmacy.id);
      await patientPharmacyApi.setPrimaryPharmacy(pharmacy.id);
      feedback();
      Alert.alert(copy.primary, copy.primaryUpdated);
      await loadData("search", searchText);
    } catch (error) {
      Alert.alert(copy.unablePrimary, error instanceof Error ? error.message : copy.unavailable);
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = (pharmacy: PatientPharmacy) => {
    Alert.alert(copy.removeTitle, `${copy.removeMessage}\n\n${pharmacy.pharmacyName}`, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.removeConfirm,
        style: "destructive",
        onPress: async () => {
          try {
            setBusyId(pharmacy.id);
            await patientPharmacyApi.removePharmacy(pharmacy.id);
            feedback();
            Alert.alert(copy.remove, copy.removedSuccess);
            await loadData("search", searchText);
          } catch (error) {
            Alert.alert(copy.unableRemove, error instanceof Error ? error.message : copy.unavailable);
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const handleSearch = () => {
    feedback();
    void loadData("search", searchText);
  };

  const handleClearSearch = () => {
    setSearchText("");
    void loadData("search", "");
  };

  const renderSavedPharmacy = (pharmacy: PatientPharmacy) => {
    const isBusy = busyId === pharmacy.id;
    const isPrimary = pharmacy.id === primaryPharmacyId || pharmacy.isPrimary;
    const address = getAddress(pharmacy);

    return (
      <View
        key={pharmacy.id}
        style={[
          styles.pharmacyCard,
          { backgroundColor: palette.surface, borderColor: isPrimary ? "#F1C66D" : palette.border },
        ]}
      >
        {isPrimary ? <View style={styles.primaryAccent} /> : null}

        <View style={styles.pharmacyTopRow}>
          <View style={[styles.pharmacyIcon, { backgroundColor: isPrimary ? WARNING_LIGHT : palette.primaryLight }]}>
            {isPrimary ? (
              <Crown size={21} color={WARNING_DARK} strokeWidth={2.5} />
            ) : (
              <Building2 size={21} color={palette.primary} strokeWidth={2.4} />
            )}
          </View>

          <View style={styles.pharmacyTitleBlock}>
            <Text style={[styles.pharmacyName, { color: palette.text, fontSize: scaleFont(16) }]} numberOfLines={1}>
              {pharmacy.pharmacyName}
            </Text>

            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: isPrimary ? WARNING_LIGHT : PRIMARY_LIGHT }]}>
                {isPrimary ? (
                  <Crown size={12} color={WARNING_DARK} strokeWidth={2.5} />
                ) : (
                  <CheckCircle2 size={12} color={PRIMARY_DARK} strokeWidth={2.5} />
                )}

                <Text style={[styles.statusBadgeText, { color: isPrimary ? WARNING_DARK : PRIMARY_DARK, fontSize: scaleFont(10) }]}>
                  {isPrimary ? copy.primary : copy.saved}
                </Text>
              </View>

              {!pharmacy.isAvailable ? (
                <View style={[styles.statusBadge, { backgroundColor: DANGER_LIGHT }]}>
                  <Text style={[styles.statusBadgeText, { color: DANGER, fontSize: scaleFont(10) }]}>
                    {copy.unavailablePharmacy}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {address ? (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: palette.primaryLight }]}>
              <MapPin size={15} color={palette.primary} strokeWidth={2.3} />
            </View>
            <Text style={[styles.infoText, { color: palette.muted, fontSize: scaleFont(12) }]}>{address}</Text>
          </View>
        ) : null}

        {pharmacy.phoneNumber ? (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: palette.primaryLight }]}>
              <Phone size={15} color={palette.primary} strokeWidth={2.3} />
            </View>
            <Text style={[styles.infoText, { color: palette.muted, fontSize: scaleFont(12) }]}>
              {pharmacy.phoneNumber}
            </Text>
          </View>
        ) : null}

        {pharmacy.openingHours ? (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: palette.primaryLight }]}>
              <Clock3 size={15} color={palette.primary} strokeWidth={2.3} />
            </View>
            <Text style={[styles.infoText, { color: palette.muted, fontSize: scaleFont(12) }]}>
              {pharmacy.openingHours}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardActions}>
          {!isPrimary && pharmacy.isAvailable ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: palette.primary }]}
              activeOpacity={0.86}
              disabled={isBusy}
              onPress={() => void handleSetPrimary(pharmacy)}
              accessibilityLabel={screenReaderHintsEnabled ? copy.setPrimary : undefined}
            >
              {isBusy ? <ActivityIndicator size="small" color={SURFACE} /> : <Crown size={17} color={SURFACE} strokeWidth={2.5} />}
              <Text style={[styles.primaryButtonText, { fontSize: scaleFont(12) }]}>{copy.setPrimary}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.removeButton, { flex: isPrimary || !pharmacy.isAvailable ? 1 : undefined }]}
            activeOpacity={0.85}
            disabled={isBusy}
            onPress={() => handleRemove(pharmacy)}
          >
            {isBusy && (isPrimary || !pharmacy.isAvailable) ? (
              <ActivityIndicator size="small" color={DANGER} />
            ) : (
              <Trash2 size={17} color={DANGER} strokeWidth={2.4} />
            )}
            <Text style={[styles.removeButtonText, { fontSize: scaleFont(12) }]}>{copy.remove}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAvailablePharmacy = (pharmacy: PatientPharmacy) => {
    const isBusy = busyId === pharmacy.id;
    const address = getAddress(pharmacy);

    return (
      <View key={pharmacy.id} style={[styles.availableCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.availableTopRow}>
          <View style={styles.availableIcon}>
            <Store size={21} color={SUCCESS_DARK} strokeWidth={2.4} />
          </View>

          <View style={styles.availableTextBlock}>
            <Text style={[styles.availableName, { color: palette.text, fontSize: scaleFont(15) }]} numberOfLines={1}>
              {pharmacy.pharmacyName}
            </Text>

            <View style={styles.approvedRow}>
              <BadgeCheck size={14} color={SUCCESS_DARK} strokeWidth={2.5} />
              <Text style={[styles.approvedText, { fontSize: scaleFont(10) }]}>{copy.verified}</Text>
            </View>
          </View>
        </View>

        {address ? (
          <View style={styles.availableMetaRow}>
            <MapPin size={15} color={palette.muted} strokeWidth={2.2} />
            <Text style={[styles.availableMetaText, { color: palette.muted, fontSize: scaleFont(12) }]}>{address}</Text>
          </View>
        ) : null}

        {pharmacy.openingHours ? (
          <View style={styles.availableMetaRow}>
            <Clock3 size={15} color={palette.muted} strokeWidth={2.2} />
            <Text style={[styles.availableMetaText, { color: palette.muted, fontSize: scaleFont(12) }]}>
              {pharmacy.openingHours}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.savePharmacyButton, { backgroundColor: palette.primaryLight }]}
          activeOpacity={0.86}
          disabled={isBusy}
          onPress={() => void handleSave(pharmacy)}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color={palette.primary} />
          ) : (
            <Plus size={18} color={palette.primary} strokeWidth={2.6} />
          )}
          <Text style={[styles.savePharmacyButtonText, { color: palette.primary, fontSize: scaleFont(13) }]}>
            {copy.savePharmacy}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={palette.background} barStyle="dark-content" />

      <View style={[styles.screen, { backgroundColor: palette.background }]}>
        <View style={styles.appBar}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: palette.surface }]} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={palette.text} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.appBarTextBlock}>
            <Text style={[styles.appBarTitle, { color: palette.text, fontSize: scaleFont(25) }]}>{copy.title}</Text>
            <Text style={[styles.appBarSubtitle, { color: palette.muted, fontSize: scaleFont(12) }]}>{copy.subtitle}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={[styles.stateText, { color: palette.muted, fontSize: scaleFont(13) }]}>{copy.loading}</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.centerState}>
            <View style={[styles.errorIcon, { backgroundColor: DANGER_LIGHT }]}>
              <RefreshCw size={26} color={DANGER} strokeWidth={2.4} />
            </View>
            <Text style={[styles.errorTitle, { color: palette.text, fontSize: scaleFont(17) }]}>{copy.unavailable}</Text>
            <Text style={[styles.errorMessage, { color: palette.muted, fontSize: scaleFont(12) }]}>{errorMessage}</Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: palette.primary }]} activeOpacity={0.86} onPress={() => void loadData("initial")}>
              <RefreshCw size={16} color={SURFACE} strokeWidth={2.5} />
              <Text style={[styles.retryButtonText, { fontSize: scaleFont(12) }]}>{copy.tryAgain}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(52, insets.bottom + 34) }]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void loadData("refresh", searchText)}
                colors={[palette.primary]}
                tintColor={palette.primary}
              />
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: palette.text, fontSize: scaleFont(18) }]}>{copy.overviewTitle}</Text>
              </View>

              <View style={[styles.countBadge, { backgroundColor: palette.primaryLight }]}>
                <Text style={[styles.countBadgeText, { color: palette.primary, fontSize: scaleFont(11) }]}>
                  {savedPharmacies.length} {copy.savedCount}
                </Text>
              </View>
            </View>

            <View style={[styles.overviewCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.overviewIcon, { backgroundColor: primaryPharmacy ? WARNING_LIGHT : palette.primaryLight }]}>
                {primaryPharmacy ? (
                  <Crown size={25} color={WARNING_DARK} strokeWidth={2.5} />
                ) : (
                  <Building2 size={25} color={palette.primary} strokeWidth={2.5} />
                )}
              </View>

              <View style={styles.overviewTextBlock}>
                <Text style={[styles.overviewLabel, { color: palette.muted, fontSize: scaleFont(11) }]}>
                  {copy.primaryPharmacy}
                </Text>

                <Text style={[styles.overviewName, { color: palette.text, fontSize: scaleFont(16) }]}>
                  {primaryPharmacy?.pharmacyName || copy.noPrimary}
                </Text>

                <Text style={[styles.overviewDescription, { color: palette.muted, fontSize: scaleFont(11) }]}>
                  {primaryPharmacy ? copy.prescriptionsRouteHere : copy.noPrimaryDescription}
                </Text>
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: palette.text, fontSize: scaleFont(18) }]}>{copy.savedTitle}</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.muted, fontSize: scaleFont(11) }]}>{copy.savedSubtitle}</Text>

              {savedPharmacies.length > 0 ? (
                <View style={styles.cardsList}>{savedPharmacies.map(renderSavedPharmacy)}</View>
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <View style={[styles.emptyIcon, { backgroundColor: palette.primaryLight }]}>
                    <Building2 size={25} color={palette.primary} strokeWidth={2.4} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: palette.text, fontSize: scaleFont(15) }]}>{copy.noSaved}</Text>
                  <Text style={[styles.emptyText, { color: palette.muted, fontSize: scaleFont(11) }]}>{copy.noSavedText}</Text>
                </View>
              )}
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.findHeader}>
                <View style={styles.findHeaderText}>
                  <Text style={[styles.sectionTitle, { color: palette.text, fontSize: scaleFont(18) }]}>{copy.findTitle}</Text>
                  <Text style={[styles.sectionSubtitle, { color: palette.muted, fontSize: scaleFont(11) }]}>{copy.findSubtitle}</Text>
                </View>

                <View style={[styles.availableBadge, { backgroundColor: SUCCESS_LIGHT }]}>
                  <Text style={[styles.availableBadgeText, { fontSize: scaleFont(10) }]}>
                    {availablePharmacies.length} {copy.availableCount}
                  </Text>
                </View>
              </View>

              <View style={[styles.searchContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Search size={19} color={palette.muted} strokeWidth={2.3} />

                <TextInput
                  style={[styles.searchInput, { color: palette.text, fontSize: scaleFont(13) }]}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder={copy.searchPlaceholder}
                  placeholderTextColor={palette.muted}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />

                {searchText.length > 0 ? (
                  <TouchableOpacity style={styles.clearButton} activeOpacity={0.8} onPress={handleClearSearch}>
                    <X size={17} color={palette.muted} strokeWidth={2.4} />
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.searchButton, { backgroundColor: palette.primary }]}
                  activeOpacity={0.86}
                  disabled={isSearching}
                  onPress={handleSearch}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color={SURFACE} />
                  ) : (
                    <Search size={17} color={SURFACE} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              </View>

              {availablePharmacies.length > 0 ? (
                <View style={styles.cardsList}>{availablePharmacies.map(renderAvailablePharmacy)}</View>
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <View style={[styles.emptyIcon, { backgroundColor: SUCCESS_LIGHT }]}>
                    <Store size={25} color={SUCCESS_DARK} strokeWidth={2.4} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: palette.text, fontSize: scaleFont(15) }]}>{copy.noResults}</Text>
                  <Text style={[styles.emptyText, { color: palette.muted, fontSize: scaleFont(11) }]}>{copy.noResultsText}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default MyPharmaciesScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  appBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14, gap: 13 },
  backButton: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", ...elevate(1) },
  appBarTextBlock: { flex: 1 },
  appBarTitle: { fontWeight: "800", letterSpacing: -0.5 },
  appBarSubtitle: { marginTop: 2, fontWeight: "500" },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 4 },
  centerState: { flex: 1, paddingHorizontal: 30, alignItems: "center", justifyContent: "center", gap: 12 },
  stateText: { fontWeight: "600" },
  errorIcon: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  errorTitle: { fontWeight: "800", marginTop: 2 },
  errorMessage: { textAlign: "center", lineHeight: 18 },
  retryButton: { minHeight: 44, borderRadius: 13, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  retryButtonText: { color: SURFACE, fontWeight: "800" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontWeight: "800", letterSpacing: -0.2 },
  sectionSubtitle: { marginTop: 3, lineHeight: 16, fontWeight: "500" },
  countBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  countBadgeText: { fontWeight: "800" },
  overviewCard: { borderWidth: 1, borderRadius: 18, padding: 15, flexDirection: "row", alignItems: "center", gap: 13, ...elevate(1) },
  overviewIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  overviewTextBlock: { flex: 1 },
  overviewLabel: { fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  overviewName: { marginTop: 2, fontWeight: "800" },
  overviewDescription: { marginTop: 3, lineHeight: 16, fontWeight: "500" },
  sectionBlock: { marginTop: 24 },
  cardsList: { gap: 12, marginTop: 12 },
  pharmacyCard: { position: "relative", overflow: "hidden", borderWidth: 1, borderRadius: 18, padding: 15, ...elevate(1) },
  primaryAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: "#F1B84B" },
  pharmacyTopRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  pharmacyIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pharmacyTitleBlock: { flex: 1 },
  pharmacyName: { fontWeight: "800" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  statusBadge: { minHeight: 24, paddingHorizontal: 8, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 4 },
  statusBadgeText: { fontWeight: "800" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 8 },
  infoIconBox: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1, fontWeight: "500", lineHeight: 17 },
  cardActions: { flexDirection: "row", gap: 9, marginTop: 15 },
  primaryButton: { flex: 1, minHeight: 43, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  primaryButtonText: { color: SURFACE, fontWeight: "800" },
  removeButton: { minHeight: 43, paddingHorizontal: 14, borderRadius: 12, backgroundColor: DANGER_LIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  removeButtonText: { color: DANGER, fontWeight: "800" },
  findHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  findHeaderText: { flex: 1 },
  availableBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  availableBadgeText: { color: SUCCESS_DARK, fontWeight: "800" },
  searchContainer: { height: 52, borderWidth: 1, borderRadius: 15, marginTop: 12, paddingLeft: 13, paddingRight: 5, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, height: "100%", paddingVertical: 0, fontWeight: "500" },
  clearButton: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  searchButton: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  availableCard: { borderWidth: 1, borderRadius: 17, padding: 14, ...elevate(1) },
  availableTopRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  availableIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: SUCCESS_LIGHT, alignItems: "center", justifyContent: "center" },
  availableTextBlock: { flex: 1 },
  availableName: { fontWeight: "800" },
  approvedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  approvedText: { color: SUCCESS_DARK, fontWeight: "800" },
  availableMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  availableMetaText: { flex: 1, lineHeight: 17, fontWeight: "500" },
  savePharmacyButton: { minHeight: 43, borderRadius: 12, marginTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  savePharmacyButtonText: { fontWeight: "800" },
  emptyCard: { borderWidth: 1, borderRadius: 17, paddingHorizontal: 20, paddingVertical: 22, marginTop: 12, alignItems: "center" },
  emptyIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emptyTitle: { fontWeight: "800", textAlign: "center" },
  emptyText: { marginTop: 5, lineHeight: 17, textAlign: "center", fontWeight: "500" },
});