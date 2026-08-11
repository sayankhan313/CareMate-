import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Crown,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  X,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AccessibleText as Text } from "../../components/common/AccessibleText";
import { useLanguage } from "../../context/LanguageContext";
import {
  patientPharmacyApi,
  type PatientPharmacy,
  type PrescriptionChargePreference,
} from "../../services/pharmacy/patientPharmacyApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "MyPharmacies">;

type CopyLanguage =
  | "ENGLISH"
  | "HINDI"
  | "GREEK"
  | "HAUSA"
  | "GERMAN";

type PreferenceModalState = {
  pharmacy: PatientPharmacy;
  mode: "SAVE" | "UPDATE";
} | null;

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

  chargePreference: string;
  chargeable: string;
  exempt: string;
  ppc: string;

  setPrimary: string;
  changePreference: string;
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

  prescriptionCharges: string;
  preferenceDescription: string;

  chargeableTitle: string;
  chargeableDescription: string;

  exemptTitle: string;
  exemptDescription: string;

  ppcTitle: string;
  ppcDescription: string;

  cancel: string;
  save: string;
  update: string;

  savedSuccess: string;
  preferenceUpdated: string;
  primaryUpdated: string;

  removeTitle: string;
  removeMessage: string;
  removeConfirm: string;
  removedSuccess: string;

  unableSave: string;
  unableUpdate: string;
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

    chargePreference: "Prescription charges",
    chargeable: "I pay",
    exempt: "Exempt",
    ppc: "PPC",

    setPrimary: "Set primary",
    changePreference: "Change",
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

    prescriptionCharges: "Prescription charge preference",
    preferenceDescription: "Choose your usual NHS prescription charge preference. You will confirm this again when an order requires payment.",

    chargeableTitle: "I normally pay prescription charges",
    chargeableDescription: "When payment is required, the order can continue to the CareMate+ test payment flow.",

    exemptTitle: "I am exempt from prescription charges",
    exemptDescription: "The pharmacy will review your exemption evidence before payment is marked as not required.",

    ppcTitle: "I have a valid PPC",
    ppcDescription: "The pharmacy will review your Prescription Prepayment Certificate details.",

    cancel: "Cancel",
    save: "Save",
    update: "Update",

    savedSuccess: "Pharmacy saved successfully.",
    preferenceUpdated: "Prescription charge preference updated.",
    primaryUpdated: "Primary pharmacy updated.",

    removeTitle: "Remove pharmacy?",
    removeMessage: "Remove this pharmacy from your saved pharmacies:",
    removeConfirm: "Remove",
    removedSuccess: "Pharmacy removed successfully.",

    unableSave: "Unable to save pharmacy",
    unableUpdate: "Unable to update charge preference",
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

    chargePreference: "प्रिस्क्रिप्शन शुल्क",
    chargeable: "मैं भुगतान करता हूँ",
    exempt: "छूट",
    ppc: "PPC",

    setPrimary: "प्राथमिक बनाएँ",
    changePreference: "बदलें",
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

    prescriptionCharges: "प्रिस्क्रिप्शन शुल्क विकल्प",
    preferenceDescription: "अपना सामान्य NHS प्रिस्क्रिप्शन शुल्क विकल्प चुनें। भुगतान वाले ऑर्डर पर आप इसे फिर पुष्टि करेंगे।",

    chargeableTitle: "मैं सामान्यतः प्रिस्क्रिप्शन शुल्क देता हूँ",
    chargeableDescription: "भुगतान आवश्यक होने पर ऑर्डर CareMate+ टेस्ट भुगतान प्रक्रिया में जा सकता है।",

    exemptTitle: "मुझे प्रिस्क्रिप्शन शुल्क से छूट है",
    exemptDescription: "भुगतान आवश्यक नहीं करने से पहले फ़ार्मेसी आपके छूट प्रमाण की समीक्षा करेगी।",

    ppcTitle: "मेरे पास वैध PPC है",
    ppcDescription: "फ़ार्मेसी आपके Prescription Prepayment Certificate की जानकारी की समीक्षा करेगी।",

    cancel: "रद्द करें",
    save: "सेव करें",
    update: "अपडेट करें",

    savedSuccess: "फ़ार्मेसी सफलतापूर्वक सेव हुई।",
    preferenceUpdated: "प्रिस्क्रिप्शन शुल्क विकल्प अपडेट हुआ।",
    primaryUpdated: "प्राथमिक फ़ार्मेसी अपडेट हुई।",

    removeTitle: "फ़ार्मेसी हटाएँ?",
    removeMessage: "इस फ़ार्मेसी को सेव सूची से हटाएँ:",
    removeConfirm: "हटाएँ",
    removedSuccess: "फ़ार्मेसी सफलतापूर्वक हटाई गई।",

    unableSave: "फ़ार्मेसी सेव नहीं हो सकी",
    unableUpdate: "शुल्क विकल्प अपडेट नहीं हो सका",
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

    chargePreference: "Χρεώσεις συνταγής",
    chargeable: "Πληρώνω",
    exempt: "Απαλλαγή",
    ppc: "PPC",

    setPrimary: "Ορισμός κύριου",
    changePreference: "Αλλαγή",
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

    prescriptionCharges: "Επιλογή χρέωσης συνταγής",
    preferenceDescription: "Επιλέξτε τη συνήθη προτίμηση χρέωσης NHS. Θα την επιβεβαιώσετε ξανά όταν απαιτείται πληρωμή.",

    chargeableTitle: "Συνήθως πληρώνω χρεώσεις συνταγής",
    chargeableDescription: "Όταν απαιτείται πληρωμή, η παραγγελία μπορεί να συνεχίσει στη δοκιμαστική πληρωμή CareMate+.",

    exemptTitle: "Έχω απαλλαγή από χρεώσεις",
    exemptDescription: "Το φαρμακείο θα ελέγξει τα αποδεικτικά απαλλαγής πριν οριστεί ότι δεν απαιτείται πληρωμή.",

    ppcTitle: "Έχω έγκυρο PPC",
    ppcDescription: "Το φαρμακείο θα ελέγξει τα στοιχεία του Prescription Prepayment Certificate.",

    cancel: "Ακύρωση",
    save: "Αποθήκευση",
    update: "Ενημέρωση",

    savedSuccess: "Το φαρμακείο αποθηκεύτηκε.",
    preferenceUpdated: "Η επιλογή χρέωσης ενημερώθηκε.",
    primaryUpdated: "Το κύριο φαρμακείο ενημερώθηκε.",

    removeTitle: "Αφαίρεση φαρμακείου;",
    removeMessage: "Αφαίρεση αυτού του φαρμακείου:",
    removeConfirm: "Αφαίρεση",
    removedSuccess: "Το φαρμακείο αφαιρέθηκε.",

    unableSave: "Δεν ήταν δυνατή η αποθήκευση",
    unableUpdate: "Δεν ήταν δυνατή η ενημέρωση της επιλογής χρέωσης",
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
    noSaved: "Ba a adana pharmacy ba",
    noSavedText: "Nemo approved pharmacy a ƙasa. Pharmacy na farko da ka adana zai zama primary kai tsaye.",

    primary: "Primary",
    saved: "An adana",
    unavailablePharmacy: "Ba ya samuwa",

    chargePreference: "Kudin prescription",
    chargeable: "Ina biya",
    exempt: "An keɓe",
    ppc: "PPC",

    setPrimary: "Sanya primary",
    changePreference: "Canja",
    remove: "Cire",

    findTitle: "Nemo pharmacy",
    findSubtitle: "Approved da verified CareMate+ pharmacies kawai ake nunawa",
    searchPlaceholder: "Nemo suna, city ko postcode",
    search: "Nema",
    noResults: "Ba a sami pharmacy ba",
    noResultsText: "Babu ƙarin approved pharmacy da ya dace da binciken.",
    availableCount: "Akwai",

    savePharmacy: "Adana pharmacy",
    verified: "Approved pharmacy",
    openingHours: "Lokutan buɗewa",

    prescriptionCharges: "Zaɓin kudin prescription",
    preferenceDescription: "Zaɓi yadda kake yawan biyan NHS prescription. Za ka sake tabbatarwa idan order na bukatar biya.",

    chargeableTitle: "Yawanci ina biyan prescription charges",
    chargeableDescription: "Idan ana bukatar biya, order zai iya shiga CareMate+ test payment.",

    exemptTitle: "An keɓe ni daga prescription charges",
    exemptDescription: "Pharmacy zai duba shaidar exemption kafin payment ya zama ba dole ba.",

    ppcTitle: "Ina da PPC mai aiki",
    ppcDescription: "Pharmacy zai duba bayanan Prescription Prepayment Certificate.",

    cancel: "Soke",
    save: "Adana",
    update: "Sabunta",

    savedSuccess: "An adana pharmacy.",
    preferenceUpdated: "An sabunta zaɓin kudin prescription.",
    primaryUpdated: "An sabunta primary pharmacy.",

    removeTitle: "A cire pharmacy?",
    removeMessage: "Cire wannan pharmacy daga waɗanda aka adana:",
    removeConfirm: "Cire",
    removedSuccess: "An cire pharmacy.",

    unableSave: "Ba a iya adana pharmacy ba",
    unableUpdate: "Ba a iya sabunta zaɓin kuɗi ba",
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
    savedSubtitle: "Speichern Sie mehrere Apotheken und wählen Sie eine Hauptapotheke",
    noSaved: "Noch keine Apotheke gespeichert",
    noSavedText: "Suchen Sie unten eine genehmigte Apotheke. Die erste gespeicherte Apotheke wird automatisch Hauptapotheke.",

    primary: "Hauptapotheke",
    saved: "Gespeichert",
    unavailablePharmacy: "Nicht verfügbar",

    chargePreference: "Rezeptgebühren",
    chargeable: "Ich zahle",
    exempt: "Befreit",
    ppc: "PPC",

    setPrimary: "Als Hauptapotheke",
    changePreference: "Ändern",
    remove: "Entfernen",

    findTitle: "Apotheke finden",
    findSubtitle: "Nur genehmigte und verifizierte CareMate+ Apotheken werden angezeigt",
    searchPlaceholder: "Name, Stadt oder Postleitzahl suchen",
    search: "Suchen",
    noResults: "Keine Apotheken gefunden",
    noResultsText: "Keine weiteren genehmigten Apotheken entsprechen Ihrer Suche.",
    availableCount: "Verfügbar",

    savePharmacy: "Apotheke speichern",
    verified: "Genehmigte Apotheke",
    openingHours: "Öffnungszeiten",

    prescriptionCharges: "Rezeptgebühren-Option",
    preferenceDescription: "Wählen Sie Ihre übliche NHS-Gebührenoption. Bei einem zahlungspflichtigen Auftrag bestätigen Sie diese erneut.",

    chargeableTitle: "Ich zahle normalerweise Rezeptgebühren",
    chargeableDescription: "Wenn eine Zahlung erforderlich ist, kann der Auftrag mit der CareMate+ Testzahlung fortfahren.",

    exemptTitle: "Ich bin von Rezeptgebühren befreit",
    exemptDescription: "Die Apotheke prüft Ihren Befreiungsnachweis, bevor die Zahlung als nicht erforderlich markiert wird.",

    ppcTitle: "Ich habe ein gültiges PPC",
    ppcDescription: "Die Apotheke prüft die Angaben zum Prescription Prepayment Certificate.",

    cancel: "Abbrechen",
    save: "Speichern",
    update: "Aktualisieren",

    savedSuccess: "Apotheke erfolgreich gespeichert.",
    preferenceUpdated: "Gebührenoption aktualisiert.",
    primaryUpdated: "Hauptapotheke aktualisiert.",

    removeTitle: "Apotheke entfernen?",
    removeMessage: "Diese Apotheke aus den gespeicherten Apotheken entfernen:",
    removeConfirm: "Entfernen",
    removedSuccess: "Apotheke entfernt.",

    unableSave: "Apotheke konnte nicht gespeichert werden",
    unableUpdate: "Gebührenoption konnte nicht aktualisiert werden",
    unablePrimary: "Hauptapotheke konnte nicht aktualisiert werden",
    unableRemove: "Apotheke konnte nicht entfernt werden",
  },
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

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

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: {
    width: 0,
    height: level === 1 ? 2 : 4,
  },
});

const getCopy = (language: string) =>
  COPY[language as CopyLanguage] || COPY.ENGLISH;

const getAddress = (pharmacy: PatientPharmacy) =>
  [pharmacy.address, pharmacy.city, pharmacy.postcode]
    .filter(Boolean)
    .join(", ");

export const MyPharmaciesScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();

  const {
    language,
    palette,
    scaleFont,
    screenReaderHintsEnabled,
    hapticFeedbackEnabled,
  } = useLanguage();

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

  const [preferenceModal, setPreferenceModal] = useState<PreferenceModalState>(null);

  const [selectedPreference, setSelectedPreference] =
    useState<PrescriptionChargePreference>("CHARGEABLE");

  const savedPharmacyIds = useMemo(
    () => new Set(savedPharmacies.map(pharmacy => pharmacy.id)),
    [savedPharmacies]
  );

  const availablePharmacies = useMemo(
    () =>
      approvedPharmacies.filter(
        pharmacy =>
          pharmacy.isAvailable &&
          !pharmacy.isSaved &&
          !savedPharmacyIds.has(pharmacy.id)
      ),
    [approvedPharmacies, savedPharmacyIds]
  );

  const primaryPharmacy = useMemo(
    () =>
      savedPharmacies.find(
        pharmacy =>
          pharmacy.id === primaryPharmacyId ||
          pharmacy.isPrimary
      ) || null,
    [primaryPharmacyId, savedPharmacies]
  );

  const feedback = useCallback(() => {
    if (hapticFeedbackEnabled) {
      Vibration.vibrate(12);
    }
  }, [hapticFeedbackEnabled]);

  const loadData = useCallback(
    async (
      mode: "initial" | "refresh" | "search" = "initial",
      query = ""
    ) => {
      try {
        if (mode === "initial") setIsLoading(true);
        if (mode === "refresh") setIsRefreshing(true);
        if (mode === "search") setIsSearching(true);

        setErrorMessage("");

        const [savedResult, approvedResult] = await Promise.all([
          patientPharmacyApi.getSavedPharmacies(),
          patientPharmacyApi.getApprovedPharmacies({
            search: query.trim() || undefined,
            limit: 50,
          }),
        ]);

        setSavedPharmacies(savedResult.pharmacies || []);
        setPrimaryPharmacyId(savedResult.primaryPharmacyId);
        setApprovedPharmacies(approvedResult.pharmacies || []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : copy.unavailable
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsSearching(false);
      }
    },
    [copy.unavailable]
  );

  useFocusEffect(
    useCallback(() => {
      void loadData("initial");
    }, [loadData])
  );

  const openSavePreference = (pharmacy: PatientPharmacy) => {
    feedback();
    setSelectedPreference("CHARGEABLE");
    setPreferenceModal({
      pharmacy,
      mode: "SAVE",
    });
  };

  const openUpdatePreference = (pharmacy: PatientPharmacy) => {
    feedback();

    setSelectedPreference(
      pharmacy.chargePreference || "CHARGEABLE"
    );

    setPreferenceModal({
      pharmacy,
      mode: "UPDATE",
    });
  };

  const handlePreferenceConfirm = async () => {
    if (!preferenceModal) return;

    const { pharmacy, mode } = preferenceModal;

    try {
      setBusyId(pharmacy.id);

      if (mode === "SAVE") {
        await patientPharmacyApi.savePharmacy(
          pharmacy.id,
          selectedPreference
        );
      } else {
        await patientPharmacyApi.updateChargePreference(
          pharmacy.id,
          selectedPreference
        );
      }

      feedback();
      setPreferenceModal(null);

      Alert.alert(
        mode === "SAVE"
          ? copy.save
          : copy.update,
        mode === "SAVE"
          ? copy.savedSuccess
          : copy.preferenceUpdated
      );

      await loadData(
        "search",
        searchText
      );
    } catch (error) {
      Alert.alert(
        mode === "SAVE"
          ? copy.unableSave
          : copy.unableUpdate,
        error instanceof Error
          ? error.message
          : copy.unavailable
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleSetPrimary = async (pharmacy: PatientPharmacy) => {
    try {
      setBusyId(pharmacy.id);

      await patientPharmacyApi.setPrimaryPharmacy(
        pharmacy.id
      );

      feedback();

      Alert.alert(
        copy.primary,
        copy.primaryUpdated
      );

      await loadData(
        "search",
        searchText
      );
    } catch (error) {
      Alert.alert(
        copy.unablePrimary,
        error instanceof Error
          ? error.message
          : copy.unavailable
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = (pharmacy: PatientPharmacy) => {
    Alert.alert(
      copy.removeTitle,
      `${copy.removeMessage}\n\n${pharmacy.pharmacyName}`,
      [
        {
          text: copy.cancel,
          style: "cancel",
        },
        {
          text: copy.removeConfirm,
          style: "destructive",
          onPress: async () => {
            try {
              setBusyId(pharmacy.id);

              await patientPharmacyApi.removePharmacy(
                pharmacy.id
              );

              feedback();

              Alert.alert(
                copy.remove,
                copy.removedSuccess
              );

              await loadData(
                "search",
                searchText
              );
            } catch (error) {
              Alert.alert(
                copy.unableRemove,
                error instanceof Error
                  ? error.message
                  : copy.unavailable
              );
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const handleSearch = () => {
    feedback();

    void loadData(
      "search",
      searchText
    );
  };

  const handleClearSearch = () => {
    setSearchText("");

    void loadData(
      "search",
      ""
    );
  };

  const preferenceLabel = (
    preference: PrescriptionChargePreference | null
  ) => {
    if (preference === "EXEMPT") {
      return copy.exempt;
    }

    if (preference === "PPC") {
      return copy.ppc;
    }

    return copy.chargeable;
  };

  const renderSavedPharmacy = (pharmacy: PatientPharmacy) => {
    const isBusy = busyId === pharmacy.id;

    const isPrimary =
      pharmacy.id === primaryPharmacyId ||
      pharmacy.isPrimary;

    const address = getAddress(pharmacy);

    return (
      <View
        key={pharmacy.id}
        style={[
          styles.pharmacyCard,
          {
            backgroundColor: palette.surface,
          },
          isPrimary
            ? styles.primaryPharmacyCard
            : undefined,
        ]}
      >
        {isPrimary ? (
          <View style={styles.primaryAccent} />
        ) : null}

        <View style={styles.pharmacyTopRow}>
          <View
            style={[
              styles.pharmacyIcon,
              {
                backgroundColor: isPrimary
                  ? WARNING_LIGHT
                  : palette.primaryLight,
              },
            ]}
          >
            {isPrimary ? (
              <Crown
                size={22}
                color={WARNING_DARK}
                strokeWidth={2.5}
              />
            ) : (
              <Building2
                size={22}
                color={palette.primary}
                strokeWidth={2.4}
              />
            )}
          </View>

          <View style={styles.pharmacyTitleBlock}>
            <Text
              style={[
                styles.pharmacyName,
                {
                  color: palette.text,
                  fontSize: scaleFont(16),
                },
              ]}
              numberOfLines={1}
            >
              {pharmacy.pharmacyName}
            </Text>

            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isPrimary
                      ? WARNING_LIGHT
                      : PRIMARY_LIGHT,
                  },
                ]}
              >
                {isPrimary ? (
                  <Crown
                    size={12}
                    color={WARNING_DARK}
                    strokeWidth={2.5}
                  />
                ) : (
                  <CheckCircle2
                    size={12}
                    color={PRIMARY_DARK}
                    strokeWidth={2.5}
                  />
                )}

                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: isPrimary
                        ? WARNING_DARK
                        : PRIMARY_DARK,
                      fontSize: scaleFont(10),
                    },
                  ]}
                >
                  {isPrimary
                    ? copy.primary
                    : copy.saved}
                </Text>
              </View>

              {!pharmacy.isAvailable ? (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: DANGER_LIGHT,
                    },
                  ]}
                >
                  <AlertCircle
                    size={12}
                    color={DANGER_DARK}
                    strokeWidth={2.5}
                  />

                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color: DANGER_DARK,
                        fontSize: scaleFont(10),
                      },
                    ]}
                  >
                    {copy.unavailablePharmacy}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {address ? (
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <MapPin
                size={15}
                color={palette.primary}
                strokeWidth={2.3}
              />
            </View>

            <Text
              style={[
                styles.infoText,
                {
                  color: palette.muted,
                  fontSize: scaleFont(12),
                },
              ]}
            >
              {address}
            </Text>
          </View>
        ) : null}

        {pharmacy.phoneNumber ? (
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Phone
                size={15}
                color={palette.primary}
                strokeWidth={2.3}
              />
            </View>

            <Text
              style={[
                styles.infoText,
                {
                  color: palette.muted,
                  fontSize: scaleFont(12),
                },
              ]}
            >
              {pharmacy.phoneNumber}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.preferencePanel,
            {
              backgroundColor: palette.background,
            },
          ]}
        >
          <View
            style={[
              styles.preferenceIcon,
              {
                backgroundColor: palette.primaryLight,
              },
            ]}
          >
            <CreditCard
              size={18}
              color={palette.primary}
              strokeWidth={2.4}
            />
          </View>

          <View style={styles.preferenceTextBlock}>
            <Text
              style={[
                styles.preferenceLabel,
                {
                  color: palette.muted,
                  fontSize: scaleFont(10),
                },
              ]}
            >
              {copy.chargePreference}
            </Text>

            <Text
              style={[
                styles.preferenceValue,
                {
                  color: palette.text,
                  fontSize: scaleFont(13),
                },
              ]}
            >
              {preferenceLabel(
                pharmacy.chargePreference
              )}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.changeButton,
              {
                backgroundColor: palette.primaryLight,
              },
            ]}
            activeOpacity={0.85}
            disabled={isBusy}
            onPress={() =>
              openUpdatePreference(pharmacy)
            }
          >
            <Text
              style={[
                styles.changeButtonText,
                {
                  color: palette.primary,
                  fontSize: scaleFont(11),
                },
              ]}
            >
              {copy.changePreference}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardActions}>
          {!isPrimary && pharmacy.isAvailable ? (
            <TouchableOpacity
              style={[
                styles.setPrimaryButton,
                {
                  backgroundColor: palette.primary,
                },
              ]}
              activeOpacity={0.86}
              disabled={isBusy}
              onPress={() =>
                void handleSetPrimary(pharmacy)
              }
              accessibilityLabel={
                screenReaderHintsEnabled
                  ? copy.setPrimary
                  : undefined
              }
            >
              {isBusy ? (
                <ActivityIndicator
                  size="small"
                  color={SURFACE}
                />
              ) : (
                <Crown
                  size={17}
                  color={SURFACE}
                  strokeWidth={2.5}
                />
              )}

              <Text
                style={[
                  styles.setPrimaryButtonText,
                  {
                    fontSize: scaleFont(12),
                  },
                ]}
              >
                {copy.setPrimary}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              styles.removeButton,
              {
                flex: isPrimary ? 1 : undefined,
              },
            ]}
            activeOpacity={0.85}
            disabled={isBusy}
            onPress={() =>
              handleRemove(pharmacy)
            }
          >
            <Trash2
              size={17}
              color={DANGER}
              strokeWidth={2.4}
            />

            <Text
              style={[
                styles.removeButtonText,
                {
                  fontSize: scaleFont(12),
                },
              ]}
            >
              {copy.remove}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAvailablePharmacy = (pharmacy: PatientPharmacy) => {
    const isBusy =
      busyId === pharmacy.id;

    const address =
      getAddress(pharmacy);

    return (
      <View
        key={pharmacy.id}
        style={[
          styles.availableCard,
          {
            backgroundColor: palette.surface,
          },
        ]}
      >
        <View style={styles.availableTopRow}>
          <View style={styles.availableIcon}>
            <Store
              size={21}
              color={SUCCESS_DARK}
              strokeWidth={2.4}
            />
          </View>

          <View style={styles.availableTextBlock}>
            <Text
              style={[
                styles.availableName,
                {
                  color: palette.text,
                  fontSize: scaleFont(15),
                },
              ]}
              numberOfLines={1}
            >
              {pharmacy.pharmacyName}
            </Text>

            <View style={styles.approvedRow}>
              <BadgeCheck
                size={14}
                color={SUCCESS_DARK}
                strokeWidth={2.5}
              />

              <Text
                style={[
                  styles.approvedText,
                  {
                    fontSize: scaleFont(10),
                  },
                ]}
              >
                {copy.verified}
              </Text>
            </View>
          </View>
        </View>

        {address ? (
          <View style={styles.availableMetaRow}>
            <MapPin
              size={15}
              color={palette.muted}
              strokeWidth={2.2}
            />

            <Text
              style={[
                styles.availableMetaText,
                {
                  color: palette.muted,
                  fontSize: scaleFont(12),
                },
              ]}
            >
              {address}
            </Text>
          </View>
        ) : null}

        {pharmacy.openingHours ? (
          <View style={styles.availableMetaRow}>
            <Clock3
              size={15}
              color={palette.muted}
              strokeWidth={2.2}
            />

            <Text
              style={[
                styles.availableMetaText,
                {
                  color: palette.muted,
                  fontSize: scaleFont(12),
                },
              ]}
            >
              {pharmacy.openingHours}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.savePharmacyButton,
            {
              backgroundColor: palette.primaryLight,
            },
          ]}
          activeOpacity={0.86}
          disabled={isBusy}
          onPress={() =>
            openSavePreference(pharmacy)
          }
        >
          {isBusy ? (
            <ActivityIndicator
              size="small"
              color={palette.primary}
            />
          ) : (
            <Plus
              size={18}
              color={palette.primary}
              strokeWidth={2.6}
            />
          )}

          <Text
            style={[
              styles.savePharmacyButtonText,
              {
                color: palette.primary,
                fontSize: scaleFont(13),
              },
            ]}
          >
            {copy.savePharmacy}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: palette.background,
        },
      ]}
      edges={["top", "bottom"]}
    >
      <StatusBar
        backgroundColor={palette.background}
        barStyle="dark-content"
      />

      <View
        style={[
          styles.screen,
          {
            backgroundColor: palette.background,
          },
        ]}
      >
        <View style={styles.appBar}>
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: palette.surface,
              },
            ]}
            activeOpacity={0.85}
            onPress={() =>
              navigation.goBack()
            }
          >
            <ArrowLeft
              size={22}
              color={palette.text}
              strokeWidth={2.6}
            />
          </TouchableOpacity>

          <View style={styles.appBarTextBlock}>
            <Text
              style={[
                styles.appBarTitle,
                {
                  color: palette.text,
                  fontSize: scaleFont(25),
                },
              ]}
            >
              {copy.title}
            </Text>

            <Text
              style={[
                styles.appBarSubtitle,
                {
                  color: palette.muted,
                  fontSize: scaleFont(12),
                },
              ]}
            >
              {copy.subtitle}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(
                52,
                insets.bottom + 34
              ),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() =>
                void loadData(
                  "refresh",
                  searchText
                )
              }
              tintColor={palette.primary}
              colors={[palette.primary]}
            />
          }
        >
          {isLoading ? (
            <View
              style={[
                styles.loadingCard,
                {
                  backgroundColor: palette.surface,
                },
              ]}
            >
              <ActivityIndicator
                color={palette.primary}
              />

              <Text
                style={[
                  styles.loadingText,
                  {
                    color: palette.muted,
                    fontSize: scaleFont(13),
                  },
                ]}
              >
                {copy.loading}
              </Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIcon}>
                <AlertCircle
                  size={23}
                  color={DANGER}
                  strokeWidth={2.5}
                />
              </View>

              <View style={styles.errorContent}>
                <Text
                  style={[
                    styles.errorTitle,
                    {
                      fontSize: scaleFont(15),
                    },
                  ]}
                >
                  {copy.unavailable}
                </Text>

                <Text
                  style={[
                    styles.errorText,
                    {
                      fontSize: scaleFont(12),
                    },
                  ]}
                >
                  {errorMessage}
                </Text>

                <TouchableOpacity
                  style={styles.retryButton}
                  activeOpacity={0.85}
                  onPress={() =>
                    void loadData(
                      "initial",
                      searchText
                    )
                  }
                >
                  <RefreshCw
                    size={16}
                    color={SURFACE}
                    strokeWidth={2.5}
                  />

                  <Text
                    style={[
                      styles.retryText,
                      {
                        fontSize: scaleFont(12),
                      },
                    ]}
                  >
                    {copy.tryAgain}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <View
                style={[
                  styles.overviewCard,
                  {
                    backgroundColor: palette.primary,
                  },
                ]}
              >
                <View style={styles.overviewHeader}>
                  <View style={styles.overviewIcon}>
                    <Building2
                      size={23}
                      color={SURFACE}
                      strokeWidth={2.5}
                    />
                  </View>

                  <View style={styles.overviewHeaderText}>
                    <Text
                      style={[
                        styles.overviewEyebrow,
                        {
                          fontSize: scaleFont(11),
                        },
                      ]}
                    >
                      {copy.overviewTitle}
                    </Text>

                    <Text
                      style={[
                        styles.overviewTitle,
                        {
                          fontSize: scaleFont(18),
                        },
                      ]}
                    >
                      {primaryPharmacy
                        ? copy.primaryPharmacy
                        : copy.noPrimary}
                    </Text>
                  </View>

                  <View style={styles.savedCountBox}>
                    <Text
                      style={[
                        styles.savedCountValue,
                        {
                          fontSize: scaleFont(17),
                        },
                      ]}
                    >
                      {savedPharmacies.length}
                    </Text>

                    <Text
                      style={[
                        styles.savedCountLabel,
                        {
                          fontSize: scaleFont(9),
                        },
                      ]}
                    >
                      {copy.savedCount}
                    </Text>
                  </View>
                </View>

                {primaryPharmacy ? (
                  <View style={styles.primaryOverviewPanel}>
                    <View style={styles.primaryOverviewIcon}>
                      <Crown
                        size={18}
                        color={WARNING_DARK}
                        strokeWidth={2.5}
                      />
                    </View>

                    <View style={styles.primaryOverviewText}>
                      <Text
                        style={[
                          styles.primaryOverviewName,
                          {
                            fontSize: scaleFont(14),
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {primaryPharmacy.pharmacyName}
                      </Text>

                      <Text
                        style={[
                          styles.primaryOverviewMeta,
                          {
                            fontSize: scaleFont(10),
                          },
                        ]}
                      >
                        {copy.prescriptionsRouteHere}
                      </Text>
                    </View>

                    <CheckCircle2
                      size={20}
                      color={SUCCESS_DARK}
                      strokeWidth={2.5}
                    />
                  </View>
                ) : (
                  <View style={styles.noPrimaryPanel}>
                    <AlertCircle
                      size={18}
                      color={SURFACE}
                      strokeWidth={2.4}
                    />

                    <Text
                      style={[
                        styles.noPrimaryText,
                        {
                          fontSize: scaleFont(11),
                        },
                      ]}
                    >
                      {copy.noPrimaryDescription}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderText}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      {
                        color: palette.text,
                        fontSize: scaleFont(17),
                      },
                    ]}
                  >
                    {copy.savedTitle}
                  </Text>

                  <Text
                    style={[
                      styles.sectionSubtitle,
                      {
                        color: palette.muted,
                        fontSize: scaleFont(11),
                      },
                    ]}
                  >
                    {copy.savedSubtitle}
                  </Text>
                </View>

                {savedPharmacies.length > 0 ? (
                  <View
                    style={[
                      styles.countChip,
                      {
                        backgroundColor: palette.primaryLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countChipText,
                        {
                          color: palette.primary,
                          fontSize: scaleFont(11),
                        },
                      ]}
                    >
                      {savedPharmacies.length}
                    </Text>
                  </View>
                ) : null}
              </View>

              {savedPharmacies.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    {
                      backgroundColor: palette.surface,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.emptyIcon,
                      {
                        backgroundColor: palette.primaryLight,
                      },
                    ]}
                  >
                    <Building2
                      size={25}
                      color={palette.primary}
                      strokeWidth={2.4}
                    />
                  </View>

                  <Text
                    style={[
                      styles.emptyTitle,
                      {
                        color: palette.text,
                        fontSize: scaleFont(15),
                      },
                    ]}
                  >
                    {copy.noSaved}
                  </Text>

                  <Text
                    style={[
                      styles.emptyText,
                      {
                        color: palette.muted,
                        fontSize: scaleFont(12),
                      },
                    ]}
                  >
                    {copy.noSavedText}
                  </Text>
                </View>
              ) : (
                savedPharmacies.map(
                  renderSavedPharmacy
                )
              )}

              <View style={styles.findSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderText}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        {
                          color: palette.text,
                          fontSize: scaleFont(17),
                        },
                      ]}
                    >
                      {copy.findTitle}
                    </Text>

                    <Text
                      style={[
                        styles.sectionSubtitle,
                        {
                          color: palette.muted,
                          fontSize: scaleFont(11),
                        },
                      ]}
                    >
                      {copy.findSubtitle}
                    </Text>
                  </View>

                  {availablePharmacies.length > 0 ? (
                    <View style={styles.availableCountChip}>
                      <Text
                        style={[
                          styles.availableCountText,
                          {
                            fontSize: scaleFont(10),
                          },
                        ]}
                      >
                        {availablePharmacies.length}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.searchCard,
                    {
                      backgroundColor: palette.surface,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.searchInputRow,
                      {
                        backgroundColor: palette.background,
                      },
                    ]}
                  >
                    <Search
                      size={19}
                      color={palette.muted}
                      strokeWidth={2.3}
                    />

                    <TextInput
                      style={[
                        styles.searchInput,
                        {
                          color: palette.text,
                          fontSize: scaleFont(13),
                        },
                      ]}
                      value={searchText}
                      onChangeText={setSearchText}
                      placeholder={copy.searchPlaceholder}
                      placeholderTextColor={palette.muted}
                      returnKeyType="search"
                      onSubmitEditing={handleSearch}
                    />

                    {searchText ? (
                      <TouchableOpacity
                        style={styles.clearButton}
                        activeOpacity={0.8}
                        onPress={handleClearSearch}
                      >
                        <X
                          size={17}
                          color={palette.muted}
                          strokeWidth={2.4}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.searchButton,
                      {
                        backgroundColor: palette.primary,
                      },
                    ]}
                    activeOpacity={0.87}
                    disabled={isSearching}
                    onPress={handleSearch}
                  >
                    {isSearching ? (
                      <ActivityIndicator
                        size="small"
                        color={SURFACE}
                      />
                    ) : (
                      <Search
                        size={17}
                        color={SURFACE}
                        strokeWidth={2.5}
                      />
                    )}

                    <Text
                      style={[
                        styles.searchButtonText,
                        {
                          fontSize: scaleFont(12),
                        },
                      ]}
                    >
                      {copy.search}
                    </Text>
                  </TouchableOpacity>
                </View>

                {availablePharmacies.length === 0 ? (
                  <View
                    style={[
                      styles.emptyCard,
                      {
                        backgroundColor: palette.surface,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.emptyIcon,
                        {
                          backgroundColor: palette.primaryLight,
                        },
                      ]}
                    >
                      <Search
                        size={24}
                        color={palette.primary}
                        strokeWidth={2.4}
                      />
                    </View>

                    <Text
                      style={[
                        styles.emptyTitle,
                        {
                          color: palette.text,
                          fontSize: scaleFont(15),
                        },
                      ]}
                    >
                      {copy.noResults}
                    </Text>

                    <Text
                      style={[
                        styles.emptyText,
                        {
                          color: palette.muted,
                          fontSize: scaleFont(12),
                        },
                      ]}
                    >
                      {copy.noResultsText}
                    </Text>
                  </View>
                ) : (
                  availablePharmacies.map(
                    renderAvailablePharmacy
                  )
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>

      <Modal
        visible={Boolean(preferenceModal)}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setPreferenceModal(null)
        }
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: palette.surface,
                paddingBottom: Math.max(
                  24,
                  insets.bottom + 18
                ),
              },
            ]}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalHeaderIcon,
                  {
                    backgroundColor: palette.primaryLight,
                  },
                ]}
              >
                <CreditCard
                  size={22}
                  color={palette.primary}
                  strokeWidth={2.5}
                />
              </View>

              <View style={styles.modalHeaderText}>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: palette.text,
                      fontSize: scaleFont(17),
                    },
                  ]}
                >
                  {copy.prescriptionCharges}
                </Text>

                <Text
                  style={[
                    styles.modalPharmacyName,
                    {
                      color: palette.muted,
                      fontSize: scaleFont(11),
                    },
                  ]}
                  numberOfLines={1}
                >
                  {preferenceModal?.pharmacy.pharmacyName || ""}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.modalClose,
                  {
                    backgroundColor: palette.background,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  setPreferenceModal(null)
                }
              >
                <X
                  size={19}
                  color={palette.text}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.modalDescription,
                {
                  color: palette.muted,
                  fontSize: scaleFont(12),
                },
              ]}
            >
              {copy.preferenceDescription}
            </Text>

            <PreferenceOption
              selected={
                selectedPreference === "CHARGEABLE"
              }
              title={copy.chargeableTitle}
              description={copy.chargeableDescription}
              icon={
                <CreditCard
                  size={19}
                  color={
                    selectedPreference === "CHARGEABLE"
                      ? SURFACE
                      : PRIMARY
                  }
                  strokeWidth={2.5}
                />
              }
              onPress={() => {
                feedback();
                setSelectedPreference("CHARGEABLE");
              }}
            />

            <PreferenceOption
              selected={
                selectedPreference === "EXEMPT"
              }
              title={copy.exemptTitle}
              description={copy.exemptDescription}
              icon={
                <ShieldCheck
                  size={19}
                  color={
                    selectedPreference === "EXEMPT"
                      ? SURFACE
                      : PRIMARY
                  }
                  strokeWidth={2.5}
                />
              }
              onPress={() => {
                feedback();
                setSelectedPreference("EXEMPT");
              }}
            />

            <PreferenceOption
              selected={
                selectedPreference === "PPC"
              }
              title={copy.ppcTitle}
              description={copy.ppcDescription}
              icon={
                <BadgeCheck
                  size={19}
                  color={
                    selectedPreference === "PPC"
                      ? SURFACE
                      : PRIMARY
                  }
                  strokeWidth={2.5}
                />
              }
              onPress={() => {
                feedback();
                setSelectedPreference("PPC");
              }}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalCancelButton,
                  {
                    backgroundColor: palette.background,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  setPreferenceModal(null)
                }
              >
                <Text
                  style={[
                    styles.modalCancelText,
                    {
                      color: palette.text,
                      fontSize: scaleFont(13),
                    },
                  ]}
                >
                  {copy.cancel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSaveButton,
                  {
                    backgroundColor: palette.primary,
                  },
                ]}
                activeOpacity={0.87}
                disabled={Boolean(
                  preferenceModal &&
                    busyId === preferenceModal.pharmacy.id
                )}
                onPress={() =>
                  void handlePreferenceConfirm()
                }
              >
                {preferenceModal &&
                busyId === preferenceModal.pharmacy.id ? (
                  <ActivityIndicator
                    size="small"
                    color={SURFACE}
                  />
                ) : (
                  <Check
                    size={18}
                    color={SURFACE}
                    strokeWidth={2.7}
                  />
                )}

                <Text
                  style={[
                    styles.modalSaveText,
                    {
                      fontSize: scaleFont(13),
                    },
                  ]}
                >
                  {preferenceModal?.mode === "UPDATE"
                    ? copy.update
                    : copy.save}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const PreferenceOption = ({
  selected,
  title,
  description,
  icon,
  onPress,
}: {
  selected: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[
      styles.preferenceOption,
      selected
        ? styles.preferenceOptionSelected
        : undefined,
    ]}
    activeOpacity={0.85}
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityState={{
      selected,
    }}
  >
    <View
      style={[
        styles.preferenceOptionIcon,
        selected
          ? styles.preferenceOptionIconSelected
          : undefined,
      ]}
    >
      {icon}
    </View>

    <View style={styles.preferenceOptionText}>
      <Text style={styles.preferenceOptionTitle}>
        {title}
      </Text>

      <Text style={styles.preferenceOptionDescription}>
        {description}
      </Text>
    </View>

    <View
      style={[
        styles.radioOuter,
        selected
          ? styles.radioOuterSelected
          : undefined,
      ]}
    >
      {selected ? (
        <View style={styles.radioInner} />
      ) : null}
    </View>
  </TouchableOpacity>
);

export default MyPharmaciesScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  appBar: {
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    overflow: "hidden",
    ...elevate(1),
  },

  appBarTextBlock: {
    flex: 1,
  },

  appBarTitle: {
    color: TEXT,
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.35,
  },

  appBarSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },

  loadingCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: "center",
    marginTop: 6,
    ...elevate(1),
  },

  loadingText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
  },

  errorCard: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
    marginTop: 6,
  },

  errorIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: DANGER_DARK,
    fontSize: 15,
    fontWeight: "700",
  },

  errorText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },

  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: DANGER,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
    overflow: "hidden",
  },

  retryText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  overviewCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    overflow: "hidden",
    ...elevate(2),
  },

  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  overviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  overviewHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  overviewEyebrow: {
    color: "#DCE6FF",
    fontSize: 11,
    fontWeight: "600",
  },

  overviewTitle: {
    color: SURFACE,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },

  savedCountBox: {
    minWidth: 54,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
    marginLeft: 10,
  },

  savedCountValue: {
    color: SURFACE,
    fontSize: 17,
    fontWeight: "700",
  },

  savedCountLabel: {
    color: "#E4EAFF",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 1,
  },

  primaryOverviewPanel: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },

  primaryOverviewIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: WARNING_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  primaryOverviewText: {
    flex: 1,
    minWidth: 0,
  },

  primaryOverviewName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },

  primaryOverviewMeta: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 3,
  },

  noPrimaryPanel: {
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },

  noPrimaryText: {
    flex: 1,
    color: "#EDF2FF",
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginLeft: 9,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  sectionHeaderText: {
    flex: 1,
    paddingRight: 10,
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 3,
  },

  countChip: {
    minWidth: 34,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },

  countChipText: {
    fontSize: 11,
    fontWeight: "700",
  },

  pharmacyCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    overflow: "hidden",
    ...elevate(1),
  },

  primaryPharmacyCard: {
    paddingTop: 17,
  },

  primaryAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: WARNING,
  },

  pharmacyTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  pharmacyIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  pharmacyTitleBlock: {
    flex: 1,
    minWidth: 0,
  },

  pharmacyName: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 7,
  },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 6,
    marginBottom: 3,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  infoIconBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  infoText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    flex: 1,
  },

  preferencePanel: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },

  preferenceIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  preferenceTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  preferenceLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
  },

  preferenceValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },

  changeButton: {
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginLeft: 8,
    overflow: "hidden",
  },

  changeButtonText: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "700",
  },

  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  setPrimaryButton: {
    flex: 1,
    minHeight: 43,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginRight: 8,
    overflow: "hidden",
  },

  setPrimaryButtonText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  removeButton: {
    minHeight: 43,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    overflow: "hidden",
  },

  removeButtonText: {
    color: DANGER,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: "center",
    marginBottom: 16,
    ...elevate(1),
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  emptyText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
  },

  findSection: {
    marginTop: 10,
  },

  availableCountChip: {
    minWidth: 34,
    height: 30,
    borderRadius: 9,
    backgroundColor: SUCCESS_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },

  availableCountText: {
    color: SUCCESS_DARK,
    fontSize: 10,
    fontWeight: "700",
  },

  searchCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 11,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(1),
  },

  searchInputRow: {
    flex: 1,
    backgroundColor: SOFT_PANEL,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 9,
  },

  clearButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  searchButton: {
    minWidth: 88,
    minHeight: 46,
    borderRadius: 12,
    marginLeft: 9,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 12,
    overflow: "hidden",
  },

  searchButtonText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },

  availableCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    ...elevate(1),
  },

  availableTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  availableIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: SUCCESS_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  availableTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  availableName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },

  approvedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  approvedText: {
    color: SUCCESS_DARK,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },

  availableMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 9,
  },

  availableMetaText: {
    flex: 1,
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginLeft: 7,
  },

  savePharmacyButton: {
    minHeight: 43,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 13,
    overflow: "hidden",
  },

  savePharmacyButtonText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 7,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,25,54,0.46)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 9,
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D3D7E2",
    alignSelf: "center",
    marginBottom: 14,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  modalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  modalHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  modalTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },

  modalPharmacyName: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    overflow: "hidden",
  },

  modalDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    marginTop: 13,
    marginBottom: 12,
  },

  preferenceOption: {
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
    borderWidth: 1,
    borderColor: BORDER,
  },

  preferenceOptionSelected: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: "#BFD0FF",
  },

  preferenceOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  preferenceOptionIconSelected: {
    backgroundColor: PRIMARY,
  },

  preferenceOptionText: {
    flex: 1,
    paddingRight: 10,
  },

  preferenceOptionTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  preferenceOptionDescription: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "500",
    marginTop: 3,
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#B7C1D4",
    alignItems: "center",
    justifyContent: "center",
  },

  radioOuterSelected: {
    borderColor: PRIMARY,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },

  modalActions: {
    flexDirection: "row",
    marginTop: 7,
  },

  modalCancelButton: {
    flex: 1,
    minHeight: 47,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    overflow: "hidden",
  },

  modalCancelText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  modalSaveButton: {
    flex: 1.25,
    minHeight: 47,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  modalSaveText: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 7,
  },
});