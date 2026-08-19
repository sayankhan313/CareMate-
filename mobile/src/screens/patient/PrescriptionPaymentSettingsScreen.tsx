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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileCheck2,
  FileText,
  Info,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react-native";
import { errorCodes, isErrorWithCode, pick, types } from "@react-native-documents/picker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AccessibleText as Text } from "../../components/common/AccessibleText";
import { useLanguage } from "../../context/LanguageContext";
import {
  patientPrescriptionChargeApi,
  type PatientChargeSelection,
  type PatientPrescriptionChargeProfile,
  type PrescriptionChargeEvidenceFile,
  type PrescriptionExemptionType,
} from "../../services/patientPrescriptionChargeApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = { navigation: NativeStackNavigationProp<RootStackParamList> };
type CopyLanguage = "ENGLISH" | "HINDI" | "GREEK" | "HAUSA" | "GERMAN";

type SelectedEvidenceFile = PrescriptionChargeEvidenceFile & {
  size: number | null;
};

type ExemptionOption = {
  value: PrescriptionExemptionType;
  label: string;
  helper: string;
};

type Copy = {
  title: string;
  subtitle: string;
  loading: string;
  unavailable: string;
  retry: string;
  preferenceTitle: string;
  preferenceSubtitle: string;
  chargeableTitle: string;
  chargeableDescription: string;
  exemptTitle: string;
  exemptDescription: string;
  selected: string;
  statusTitle: string;
  paymentRequired: string;
  paymentRequiredDescription: string;
  evidenceRequired: string;
  evidenceRequiredDescription: string;
  pending: string;
  pendingDescription: string;
  verified: string;
  verifiedDescription: string;
  rejected: string;
  rejectedDescription: string;
  expired: string;
  expiredDescription: string;
  effectiveStatus: string;
  payable: string;
  noPaymentRequired: string;
  primaryPharmacy: string;
  noPrimaryPharmacy: string;
  noPrimaryDescription: string;
  choosePharmacy: string;
  evidenceTitle: string;
  evidenceSubtitle: string;
  exemptionType: string;
  selectExemptionType: string;
  referenceNumber: string;
  referencePlaceholder: string;
  expiryDate: string;
  expiryPlaceholder: string;
  expiryHelper: string;
  documents: string;
  documentsHelper: string;
  chooseDocuments: string;
  addMore: string;
  remove: string;
  submitEvidence: string;
  submitting: string;
  latestEvidence: string;
  submitted: string;
  verifiedOn: string;
  rejectedOn: string;
  expires: string;
  rejectionReason: string;
  documentCount: string;
  changeToChargeableTitle: string;
  changeToChargeableMessage: string;
  confirmChargeable: string;
  cancel: string;
  preferenceUpdated: string;
  evidenceSubmitted: string;
  evidenceSubmittedMessage: string;
  unableUpdate: string;
  unableSubmit: string;
  fileTooLarge: string;
  unsupportedFile: string;
  fileLimit: string;
  selectTypeFirst: string;
  selectFileFirst: string;
  invalidExpiry: string;
  primaryRequired: string;
  infoTitle: string;
  infoText: string;
};

const COPY: Record<CopyLanguage, Copy> = {
  ENGLISH: {
    title: "Prescription Payment",
    subtitle: "Manage prescription charges and exemption evidence",
    loading: "Loading payment settings...",
    unavailable: "Payment settings unavailable",
    retry: "Try again",
    preferenceTitle: "How do you pay for prescriptions?",
    preferenceSubtitle: "This preference is used automatically for eligible pharmacy prescription orders.",
    chargeableTitle: "I pay prescription charges",
    chargeableDescription: "Eligible prescription orders will require payment before final fulfilment.",
    exemptTitle: "I am exempt from prescription charges",
    exemptDescription: "Upload evidence once for pharmacy verification. Verified eligible orders will have £0 patient payment.",
    selected: "Selected",
    statusTitle: "Current status",
    paymentRequired: "Prescription charges enabled",
    paymentRequiredDescription: "Eligible orders are treated as chargeable.",
    evidenceRequired: "Evidence required",
    evidenceRequiredDescription: "Upload exemption evidence for your primary pharmacy to review.",
    pending: "Under pharmacy review",
    pendingDescription: "Your evidence is pending. Orders are not treated as £0 until verification is complete.",
    verified: "Exemption verified",
    verifiedDescription: "Eligible prescription orders are automatically treated as not requiring patient payment.",
    rejected: "Evidence rejected",
    rejectedDescription: "Your exemption remains selected, but orders are chargeable until replacement evidence is verified.",
    expired: "Evidence expired",
    expiredDescription: "Upload current evidence before exemption can be applied to eligible orders.",
    effectiveStatus: "Order payment",
    payable: "Payment required",
    noPaymentRequired: "£0 · No patient payment required",
    primaryPharmacy: "Reviewing pharmacy",
    noPrimaryPharmacy: "No primary pharmacy selected",
    noPrimaryDescription: "Choose a primary pharmacy before submitting exemption evidence.",
    choosePharmacy: "Choose pharmacy",
    evidenceTitle: "Exemption evidence",
    evidenceSubtitle: "Your evidence is stored with your account and does not need to be uploaded for every order.",
    exemptionType: "Exemption type",
    selectExemptionType: "Select exemption type",
    referenceNumber: "Reference / certificate number",
    referencePlaceholder: "Optional reference number",
    expiryDate: "Expiry date",
    expiryPlaceholder: "YYYY-MM-DD",
    expiryHelper: "Optional. Enter the expiry date shown on your evidence.",
    documents: "Evidence documents",
    documentsHelper: "Upload 1–3 PDF or image files. Maximum 8 MB per file.",
    chooseDocuments: "Choose documents",
    addMore: "Add more",
    remove: "Remove",
    submitEvidence: "Submit for verification",
    submitting: "Submitting...",
    latestEvidence: "Latest evidence",
    submitted: "Submitted",
    verifiedOn: "Verified",
    rejectedOn: "Rejected",
    expires: "Expires",
    rejectionReason: "Reason",
    documentCount: "Documents",
    changeToChargeableTitle: "Enable prescription charges?",
    changeToChargeableMessage: "Your active unpaid eligible orders may become chargeable. You can select exemption again later.",
    confirmChargeable: "Use chargeable",
    cancel: "Cancel",
    preferenceUpdated: "Prescription payment preference updated.",
    evidenceSubmitted: "Evidence submitted",
    evidenceSubmittedMessage: "Your primary pharmacy can now review your exemption evidence.",
    unableUpdate: "Unable to update preference",
    unableSubmit: "Unable to submit evidence",
    fileTooLarge: "Each evidence file must be 8 MB or smaller.",
    unsupportedFile: "Please choose PDF, JPG, PNG or WEBP evidence.",
    fileLimit: "You can upload a maximum of 3 evidence documents.",
    selectTypeFirst: "Please select your exemption type.",
    selectFileFirst: "Please upload at least one evidence document.",
    invalidExpiry: "Expiry date must use YYYY-MM-DD and be a valid date.",
    primaryRequired: "Select a primary pharmacy before submitting exemption evidence.",
    infoTitle: "How this works",
    infoText: "Chargeable patients pay for eligible prescription orders. Exempt patients receive £0 patient payment only after their evidence has been verified.",
  },

  HINDI: {
    title: "प्रिस्क्रिप्शन भुगतान",
    subtitle: "प्रिस्क्रिप्शन शुल्क और छूट प्रमाण प्रबंधित करें",
    loading: "भुगतान सेटिंग लोड हो रही है...",
    unavailable: "भुगतान सेटिंग उपलब्ध नहीं है",
    retry: "फिर कोशिश करें",
    preferenceTitle: "आप प्रिस्क्रिप्शन के लिए कैसे भुगतान करते हैं?",
    preferenceSubtitle: "यह विकल्प योग्य फ़ार्मेसी प्रिस्क्रिप्शन ऑर्डर पर अपने आप लागू होगा।",
    chargeableTitle: "मैं प्रिस्क्रिप्शन शुल्क देता/देती हूँ",
    chargeableDescription: "योग्य प्रिस्क्रिप्शन ऑर्डर के अंतिम fulfilment से पहले भुगतान आवश्यक होगा।",
    exemptTitle: "मुझे प्रिस्क्रिप्शन शुल्क से छूट है",
    exemptDescription: "फ़ार्मेसी सत्यापन के लिए प्रमाण एक बार अपलोड करें। सत्यापित योग्य ऑर्डर पर मरीज का भुगतान £0 होगा।",
    selected: "चुना गया",
    statusTitle: "वर्तमान स्थिति",
    paymentRequired: "प्रिस्क्रिप्शन शुल्क सक्रिय",
    paymentRequiredDescription: "योग्य ऑर्डर chargeable माने जाएँगे।",
    evidenceRequired: "प्रमाण आवश्यक",
    evidenceRequiredDescription: "अपनी प्राथमिक फ़ार्मेसी की समीक्षा के लिए छूट प्रमाण अपलोड करें।",
    pending: "फ़ार्मेसी समीक्षा में",
    pendingDescription: "प्रमाण लंबित है। सत्यापन पूरा होने तक ऑर्डर £0 नहीं होंगे।",
    verified: "छूट सत्यापित",
    verifiedDescription: "योग्य प्रिस्क्रिप्शन ऑर्डर पर मरीज का भुगतान स्वतः आवश्यक नहीं होगा।",
    rejected: "प्रमाण अस्वीकृत",
    rejectedDescription: "छूट चयन बनी रहेगी, लेकिन नया प्रमाण सत्यापित होने तक ऑर्डर chargeable रहेंगे।",
    expired: "प्रमाण समाप्त",
    expiredDescription: "छूट लागू करने से पहले नया प्रमाण अपलोड करें।",
    effectiveStatus: "ऑर्डर भुगतान",
    payable: "भुगतान आवश्यक",
    noPaymentRequired: "£0 · मरीज का भुगतान आवश्यक नहीं",
    primaryPharmacy: "समीक्षा करने वाली फ़ार्मेसी",
    noPrimaryPharmacy: "कोई प्राथमिक फ़ार्मेसी नहीं चुनी गई",
    noPrimaryDescription: "छूट प्रमाण भेजने से पहले प्राथमिक फ़ार्मेसी चुनें।",
    choosePharmacy: "फ़ार्मेसी चुनें",
    evidenceTitle: "छूट प्रमाण",
    evidenceSubtitle: "प्रमाण आपके अकाउंट के साथ सेव रहेगा और हर ऑर्डर पर दोबारा अपलोड नहीं करना होगा।",
    exemptionType: "छूट प्रकार",
    selectExemptionType: "छूट प्रकार चुनें",
    referenceNumber: "रेफ़रेंस / प्रमाणपत्र नंबर",
    referencePlaceholder: "वैकल्पिक रेफ़रेंस नंबर",
    expiryDate: "समाप्ति तिथि",
    expiryPlaceholder: "YYYY-MM-DD",
    expiryHelper: "वैकल्पिक। प्रमाण पर दी गई समाप्ति तिथि दर्ज करें।",
    documents: "प्रमाण दस्तावेज़",
    documentsHelper: "1–3 PDF या इमेज अपलोड करें। प्रति फ़ाइल अधिकतम 8 MB।",
    chooseDocuments: "दस्तावेज़ चुनें",
    addMore: "और जोड़ें",
    remove: "हटाएँ",
    submitEvidence: "सत्यापन के लिए भेजें",
    submitting: "भेजा जा रहा है...",
    latestEvidence: "नवीनतम प्रमाण",
    submitted: "भेजा गया",
    verifiedOn: "सत्यापित",
    rejectedOn: "अस्वीकृत",
    expires: "समाप्ति",
    rejectionReason: "कारण",
    documentCount: "दस्तावेज़",
    changeToChargeableTitle: "प्रिस्क्रिप्शन शुल्क सक्रिय करें?",
    changeToChargeableMessage: "आपके सक्रिय unpaid योग्य ऑर्डर chargeable हो सकते हैं। बाद में फिर exemption चुन सकते हैं।",
    confirmChargeable: "Chargeable चुनें",
    cancel: "रद्द करें",
    preferenceUpdated: "प्रिस्क्रिप्शन भुगतान विकल्प अपडेट हुआ।",
    evidenceSubmitted: "प्रमाण भेजा गया",
    evidenceSubmittedMessage: "अब आपकी प्राथमिक फ़ार्मेसी प्रमाण की समीक्षा कर सकती है।",
    unableUpdate: "विकल्प अपडेट नहीं हो सका",
    unableSubmit: "प्रमाण भेजा नहीं जा सका",
    fileTooLarge: "हर फ़ाइल 8 MB या उससे कम होनी चाहिए।",
    unsupportedFile: "PDF, JPG, PNG या WEBP प्रमाण चुनें।",
    fileLimit: "अधिकतम 3 प्रमाण दस्तावेज़ अपलोड किए जा सकते हैं।",
    selectTypeFirst: "कृपया छूट प्रकार चुनें।",
    selectFileFirst: "कम से कम एक प्रमाण दस्तावेज़ अपलोड करें।",
    invalidExpiry: "समाप्ति तिथि YYYY-MM-DD प्रारूप में वैध होनी चाहिए।",
    primaryRequired: "प्रमाण भेजने से पहले प्राथमिक फ़ार्मेसी चुनें।",
    infoTitle: "यह कैसे काम करता है",
    infoText: "Chargeable मरीज योग्य ऑर्डर का भुगतान करते हैं। Exempt मरीजों को £0 तभी मिलता है जब प्रमाण सत्यापित हो जाए।",
  },

  GREEK: {
    title: "Πληρωμή συνταγών",
    subtitle: "Διαχείριση χρεώσεων και αποδεικτικών απαλλαγής",
    loading: "Φόρτωση ρυθμίσεων πληρωμής...",
    unavailable: "Οι ρυθμίσεις πληρωμής δεν είναι διαθέσιμες",
    retry: "Δοκιμάστε ξανά",
    preferenceTitle: "Πώς πληρώνετε τις συνταγές σας;",
    preferenceSubtitle: "Η επιλογή εφαρμόζεται αυτόματα στις επιλέξιμες παραγγελίες συνταγών.",
    chargeableTitle: "Πληρώνω χρεώσεις συνταγών",
    chargeableDescription: "Οι επιλέξιμες παραγγελίες απαιτούν πληρωμή πριν την τελική εκτέλεση.",
    exemptTitle: "Απαλλάσσομαι από τις χρεώσεις",
    exemptDescription: "Ανεβάστε αποδεικτικά μία φορά για επαλήθευση από το φαρμακείο.",
    selected: "Επιλεγμένο",
    statusTitle: "Τρέχουσα κατάσταση",
    paymentRequired: "Οι χρεώσεις είναι ενεργές",
    paymentRequiredDescription: "Οι επιλέξιμες παραγγελίες αντιμετωπίζονται ως χρεώσιμες.",
    evidenceRequired: "Απαιτούνται αποδεικτικά",
    evidenceRequiredDescription: "Ανεβάστε αποδεικτικά για έλεγχο από το κύριο φαρμακείο.",
    pending: "Υπό έλεγχο φαρμακείου",
    pendingDescription: "Η απαλλαγή δεν εφαρμόζεται ως £0 μέχρι να ολοκληρωθεί η επαλήθευση.",
    verified: "Η απαλλαγή επαληθεύτηκε",
    verifiedDescription: "Οι επιλέξιμες παραγγελίες δεν απαιτούν πληρωμή από τον ασθενή.",
    rejected: "Τα αποδεικτικά απορρίφθηκαν",
    rejectedDescription: "Οι παραγγελίες παραμένουν χρεώσιμες μέχρι να επαληθευτούν νέα αποδεικτικά.",
    expired: "Τα αποδεικτικά έληξαν",
    expiredDescription: "Ανεβάστε ισχύοντα αποδεικτικά για να εφαρμοστεί η απαλλαγή.",
    effectiveStatus: "Πληρωμή παραγγελίας",
    payable: "Απαιτείται πληρωμή",
    noPaymentRequired: "£0 · Δεν απαιτείται πληρωμή",
    primaryPharmacy: "Φαρμακείο ελέγχου",
    noPrimaryPharmacy: "Δεν έχει επιλεγεί κύριο φαρμακείο",
    noPrimaryDescription: "Επιλέξτε κύριο φαρμακείο πριν υποβάλετε αποδεικτικά.",
    choosePharmacy: "Επιλογή φαρμακείου",
    evidenceTitle: "Αποδεικτικά απαλλαγής",
    evidenceSubtitle: "Τα αποδεικτικά αποθηκεύονται στον λογαριασμό σας και δεν χρειάζονται σε κάθε παραγγελία.",
    exemptionType: "Τύπος απαλλαγής",
    selectExemptionType: "Επιλέξτε τύπο",
    referenceNumber: "Αριθμός αναφοράς / πιστοποιητικού",
    referencePlaceholder: "Προαιρετικός αριθμός",
    expiryDate: "Ημερομηνία λήξης",
    expiryPlaceholder: "YYYY-MM-DD",
    expiryHelper: "Προαιρετικό. Εισαγάγετε την ημερομηνία λήξης.",
    documents: "Έγγραφα",
    documentsHelper: "Ανεβάστε 1–3 PDF ή εικόνες, έως 8 MB ανά αρχείο.",
    chooseDocuments: "Επιλογή εγγράφων",
    addMore: "Προσθήκη",
    remove: "Αφαίρεση",
    submitEvidence: "Υποβολή για επαλήθευση",
    submitting: "Υποβολή...",
    latestEvidence: "Τελευταία αποδεικτικά",
    submitted: "Υποβλήθηκε",
    verifiedOn: "Επαληθεύτηκε",
    rejectedOn: "Απορρίφθηκε",
    expires: "Λήγει",
    rejectionReason: "Αιτία",
    documentCount: "Έγγραφα",
    changeToChargeableTitle: "Ενεργοποίηση χρεώσεων;",
    changeToChargeableMessage: "Οι ενεργές απλήρωτες επιλέξιμες παραγγελίες μπορεί να γίνουν χρεώσιμες.",
    confirmChargeable: "Χρεώσιμο",
    cancel: "Ακύρωση",
    preferenceUpdated: "Η προτίμηση πληρωμής ενημερώθηκε.",
    evidenceSubmitted: "Τα αποδεικτικά υποβλήθηκαν",
    evidenceSubmittedMessage: "Το κύριο φαρμακείο μπορεί τώρα να τα ελέγξει.",
    unableUpdate: "Αδυναμία ενημέρωσης",
    unableSubmit: "Αδυναμία υποβολής",
    fileTooLarge: "Κάθε αρχείο πρέπει να είναι έως 8 MB.",
    unsupportedFile: "Επιλέξτε PDF, JPG, PNG ή WEBP.",
    fileLimit: "Μπορείτε να ανεβάσετε έως 3 έγγραφα.",
    selectTypeFirst: "Επιλέξτε τύπο απαλλαγής.",
    selectFileFirst: "Ανεβάστε τουλάχιστον ένα έγγραφο.",
    invalidExpiry: "Η ημερομηνία πρέπει να είναι έγκυρη σε μορφή YYYY-MM-DD.",
    primaryRequired: "Επιλέξτε κύριο φαρμακείο πριν την υποβολή.",
    infoTitle: "Πώς λειτουργεί",
    infoText: "Οι χρεώσιμοι ασθενείς πληρώνουν τις επιλέξιμες παραγγελίες. Η απαλλαγή εφαρμόζεται μόνο μετά την επαλήθευση.",
  },

  HAUSA: {
    title: "Biyan prescription",
    subtitle: "Sarrafa charges da exemption evidence",
    loading: "Ana loda payment settings...",
    unavailable: "Ba a samun payment settings",
    retry: "Sake gwadawa",
    preferenceTitle: "Yaya kake biyan prescriptions?",
    preferenceSubtitle: "Za a yi amfani da wannan zaɓin kai tsaye ga eligible prescription orders.",
    chargeableTitle: "Ina biyan prescription charges",
    chargeableDescription: "Eligible orders za su buƙaci payment kafin final fulfilment.",
    exemptTitle: "Ina da exemption daga prescription charges",
    exemptDescription: "Upload evidence sau ɗaya domin pharmacy ta verify.",
    selected: "An zaɓa",
    statusTitle: "Current status",
    paymentRequired: "Prescription charges enabled",
    paymentRequiredDescription: "Eligible orders za su kasance chargeable.",
    evidenceRequired: "Ana buƙatar evidence",
    evidenceRequiredDescription: "Upload exemption evidence domin primary pharmacy ta duba.",
    pending: "Pharmacy na dubawa",
    pendingDescription: "Orders ba za su zama £0 ba har sai an verify evidence.",
    verified: "An verify exemption",
    verifiedDescription: "Eligible prescription orders ba sa buƙatar patient payment.",
    rejected: "An ƙi evidence",
    rejectedDescription: "Orders za su kasance chargeable har sai an verify sabon evidence.",
    expired: "Evidence ya ƙare",
    expiredDescription: "Upload current evidence kafin exemption ya fara aiki.",
    effectiveStatus: "Order payment",
    payable: "Ana buƙatar payment",
    noPaymentRequired: "£0 · Babu patient payment",
    primaryPharmacy: "Pharmacy mai review",
    noPrimaryPharmacy: "Ba a zaɓi primary pharmacy ba",
    noPrimaryDescription: "Zaɓi primary pharmacy kafin ka tura evidence.",
    choosePharmacy: "Zaɓi pharmacy",
    evidenceTitle: "Exemption evidence",
    evidenceSubtitle: "Evidence zai kasance a account ɗinka; ba sai ka upload a kowane order ba.",
    exemptionType: "Exemption type",
    selectExemptionType: "Zaɓi exemption type",
    referenceNumber: "Reference / certificate number",
    referencePlaceholder: "Optional reference number",
    expiryDate: "Expiry date",
    expiryPlaceholder: "YYYY-MM-DD",
    expiryHelper: "Optional. Shigar da expiry date idan akwai.",
    documents: "Evidence documents",
    documentsHelper: "Upload 1–3 PDF ko image. Max 8 MB ga kowane file.",
    chooseDocuments: "Zaɓi documents",
    addMore: "Ƙara",
    remove: "Cire",
    submitEvidence: "Tura domin verification",
    submitting: "Ana turawa...",
    latestEvidence: "Latest evidence",
    submitted: "An tura",
    verifiedOn: "An verify",
    rejectedOn: "An ƙi",
    expires: "Expires",
    rejectionReason: "Dalili",
    documentCount: "Documents",
    changeToChargeableTitle: "A kunna prescription charges?",
    changeToChargeableMessage: "Active unpaid eligible orders na iya zama chargeable.",
    confirmChargeable: "Use chargeable",
    cancel: "Soke",
    preferenceUpdated: "An sabunta prescription payment preference.",
    evidenceSubmitted: "An tura evidence",
    evidenceSubmittedMessage: "Primary pharmacy na iya review yanzu.",
    unableUpdate: "Ba a iya update preference ba",
    unableSubmit: "Ba a iya submit evidence ba",
    fileTooLarge: "Kowane file dole ya kasance 8 MB ko ƙasa.",
    unsupportedFile: "Zaɓi PDF, JPG, PNG ko WEBP.",
    fileLimit: "Za ka iya upload maximum 3 documents.",
    selectTypeFirst: "Zaɓi exemption type.",
    selectFileFirst: "Upload aƙalla evidence document ɗaya.",
    invalidExpiry: "Expiry date dole ya kasance valid YYYY-MM-DD.",
    primaryRequired: "Zaɓi primary pharmacy kafin submission.",
    infoTitle: "Yadda yake aiki",
    infoText: "Chargeable patients suna biya. Exempt patients suna samun £0 ne kawai bayan pharmacy verification.",
  },

  GERMAN: {
    title: "Rezeptzahlung",
    subtitle: "Rezeptgebühren und Befreiungsnachweise verwalten",
    loading: "Zahlungseinstellungen werden geladen...",
    unavailable: "Zahlungseinstellungen nicht verfügbar",
    retry: "Erneut versuchen",
    preferenceTitle: "Wie bezahlen Sie Ihre Rezepte?",
    preferenceSubtitle: "Diese Einstellung wird automatisch für berechtigte Rezeptbestellungen verwendet.",
    chargeableTitle: "Ich zahle Rezeptgebühren",
    chargeableDescription: "Berechtigte Bestellungen müssen vor der endgültigen Abgabe bezahlt werden.",
    exemptTitle: "Ich bin von Rezeptgebühren befreit",
    exemptDescription: "Laden Sie den Nachweis einmal zur Prüfung durch Ihre Apotheke hoch.",
    selected: "Ausgewählt",
    statusTitle: "Aktueller Status",
    paymentRequired: "Rezeptgebühren aktiviert",
    paymentRequiredDescription: "Berechtigte Bestellungen werden als kostenpflichtig behandelt.",
    evidenceRequired: "Nachweis erforderlich",
    evidenceRequiredDescription: "Laden Sie einen Befreiungsnachweis für Ihre Hauptapotheke hoch.",
    pending: "Apothekenprüfung läuft",
    pendingDescription: "Bestellungen erhalten erst nach erfolgreicher Prüfung einen Patientenbetrag von £0.",
    verified: "Befreiung bestätigt",
    verifiedDescription: "Berechtigte Rezeptbestellungen erfordern automatisch keine Patientenzahlung.",
    rejected: "Nachweis abgelehnt",
    rejectedDescription: "Bestellungen bleiben kostenpflichtig, bis ein neuer Nachweis bestätigt wurde.",
    expired: "Nachweis abgelaufen",
    expiredDescription: "Laden Sie einen aktuellen Nachweis hoch.",
    effectiveStatus: "Bestellzahlung",
    payable: "Zahlung erforderlich",
    noPaymentRequired: "£0 · Keine Patientenzahlung",
    primaryPharmacy: "Prüfende Apotheke",
    noPrimaryPharmacy: "Keine Hauptapotheke ausgewählt",
    noPrimaryDescription: "Wählen Sie vor dem Hochladen eine Hauptapotheke.",
    choosePharmacy: "Apotheke wählen",
    evidenceTitle: "Befreiungsnachweis",
    evidenceSubtitle: "Der Nachweis wird mit Ihrem Konto gespeichert und muss nicht bei jeder Bestellung hochgeladen werden.",
    exemptionType: "Befreiungsart",
    selectExemptionType: "Befreiungsart wählen",
    referenceNumber: "Referenz- / Zertifikatsnummer",
    referencePlaceholder: "Optionale Referenznummer",
    expiryDate: "Ablaufdatum",
    expiryPlaceholder: "YYYY-MM-DD",
    expiryHelper: "Optional. Ablaufdatum des Nachweises eingeben.",
    documents: "Nachweisdokumente",
    documentsHelper: "1–3 PDF- oder Bilddateien, maximal 8 MB pro Datei.",
    chooseDocuments: "Dokumente wählen",
    addMore: "Weitere hinzufügen",
    remove: "Entfernen",
    submitEvidence: "Zur Prüfung einreichen",
    submitting: "Wird eingereicht...",
    latestEvidence: "Letzter Nachweis",
    submitted: "Eingereicht",
    verifiedOn: "Bestätigt",
    rejectedOn: "Abgelehnt",
    expires: "Läuft ab",
    rejectionReason: "Grund",
    documentCount: "Dokumente",
    changeToChargeableTitle: "Rezeptgebühren aktivieren?",
    changeToChargeableMessage: "Aktive unbezahlte berechtigte Bestellungen können kostenpflichtig werden.",
    confirmChargeable: "Kostenpflichtig",
    cancel: "Abbrechen",
    preferenceUpdated: "Rezeptzahlungseinstellung aktualisiert.",
    evidenceSubmitted: "Nachweis eingereicht",
    evidenceSubmittedMessage: "Ihre Hauptapotheke kann den Nachweis jetzt prüfen.",
    unableUpdate: "Einstellung konnte nicht aktualisiert werden",
    unableSubmit: "Nachweis konnte nicht eingereicht werden",
    fileTooLarge: "Jede Datei darf maximal 8 MB groß sein.",
    unsupportedFile: "Bitte PDF, JPG, PNG oder WEBP wählen.",
    fileLimit: "Maximal 3 Nachweisdokumente möglich.",
    selectTypeFirst: "Bitte eine Befreiungsart auswählen.",
    selectFileFirst: "Bitte mindestens ein Dokument hochladen.",
    invalidExpiry: "Das Datum muss gültig und im Format YYYY-MM-DD sein.",
    primaryRequired: "Vor der Einreichung eine Hauptapotheke auswählen.",
    infoTitle: "So funktioniert es",
    infoText: "Kostenpflichtige Patienten zahlen berechtigte Bestellungen. Eine Befreiung gilt erst nach erfolgreicher Prüfung.",
  },
};

const EXEMPTION_OPTIONS: Record<CopyLanguage, ExemptionOption[]> = {
  ENGLISH: [
    { value: "AGE_BASED", label: "Age-based exemption", helper: "Exemption based on eligible age criteria" },
    { value: "MEDICAL_EXEMPTION", label: "Medical exemption", helper: "Valid medical exemption certificate" },
    { value: "MATERNITY_EXEMPTION", label: "Maternity exemption", helper: "Valid maternity exemption certificate" },
    { value: "LOW_INCOME_HC2", label: "HC2 / low income", helper: "Valid HC2 certificate or equivalent evidence" },
    { value: "UNIVERSAL_CREDIT", label: "Universal Credit", helper: "Evidence supporting qualifying Universal Credit exemption" },
    { value: "PPC", label: "Prescription Prepayment Certificate", helper: "Valid PPC evidence" },
    { value: "OTHER", label: "Other exemption", helper: "Other appropriate prescription exemption evidence" },
  ],
  HINDI: [
    { value: "AGE_BASED", label: "आयु आधारित छूट", helper: "योग्य आयु मानदंड के आधार पर" },
    { value: "MEDICAL_EXEMPTION", label: "मेडिकल छूट", helper: "वैध मेडिकल छूट प्रमाणपत्र" },
    { value: "MATERNITY_EXEMPTION", label: "मातृत्व छूट", helper: "वैध मातृत्व प्रमाणपत्र" },
    { value: "LOW_INCOME_HC2", label: "HC2 / कम आय", helper: "वैध HC2 प्रमाणपत्र" },
    { value: "UNIVERSAL_CREDIT", label: "Universal Credit", helper: "योग्य Universal Credit प्रमाण" },
    { value: "PPC", label: "Prescription Prepayment Certificate", helper: "वैध PPC प्रमाण" },
    { value: "OTHER", label: "अन्य छूट", helper: "अन्य उपयुक्त प्रमाण" },
  ],
  GREEK: [
    { value: "AGE_BASED", label: "Απαλλαγή λόγω ηλικίας", helper: "Με βάση τα επιλέξιμα ηλικιακά κριτήρια" },
    { value: "MEDICAL_EXEMPTION", label: "Ιατρική απαλλαγή", helper: "Έγκυρο ιατρικό πιστοποιητικό" },
    { value: "MATERNITY_EXEMPTION", label: "Απαλλαγή μητρότητας", helper: "Έγκυρο πιστοποιητικό μητρότητας" },
    { value: "LOW_INCOME_HC2", label: "HC2 / χαμηλό εισόδημα", helper: "Έγκυρο πιστοποιητικό HC2" },
    { value: "UNIVERSAL_CREDIT", label: "Universal Credit", helper: "Σχετικό αποδεικτικό" },
    { value: "PPC", label: "Prescription Prepayment Certificate", helper: "Έγκυρο PPC" },
    { value: "OTHER", label: "Άλλη απαλλαγή", helper: "Άλλο κατάλληλο αποδεικτικό" },
  ],
  HAUSA: [
    { value: "AGE_BASED", label: "Age-based exemption", helper: "Exemption bisa eligible age" },
    { value: "MEDICAL_EXEMPTION", label: "Medical exemption", helper: "Valid medical exemption certificate" },
    { value: "MATERNITY_EXEMPTION", label: "Maternity exemption", helper: "Valid maternity certificate" },
    { value: "LOW_INCOME_HC2", label: "HC2 / low income", helper: "Valid HC2 evidence" },
    { value: "UNIVERSAL_CREDIT", label: "Universal Credit", helper: "Evidence na qualifying Universal Credit" },
    { value: "PPC", label: "Prescription Prepayment Certificate", helper: "Valid PPC evidence" },
    { value: "OTHER", label: "Other exemption", helper: "Other appropriate evidence" },
  ],
  GERMAN: [
    { value: "AGE_BASED", label: "Altersbedingte Befreiung", helper: "Befreiung aufgrund berechtigter Alterskriterien" },
    { value: "MEDICAL_EXEMPTION", label: "Medizinische Befreiung", helper: "Gültiger medizinischer Befreiungsnachweis" },
    { value: "MATERNITY_EXEMPTION", label: "Mutterschaftsbefreiung", helper: "Gültiger Mutterschaftsnachweis" },
    { value: "LOW_INCOME_HC2", label: "HC2 / geringes Einkommen", helper: "Gültiger HC2-Nachweis" },
    { value: "UNIVERSAL_CREDIT", label: "Universal Credit", helper: "Nachweis einer berechtigten Befreiung" },
    { value: "PPC", label: "Prescription Prepayment Certificate", helper: "Gültiger PPC-Nachweis" },
    { value: "OTHER", label: "Andere Befreiung", helper: "Anderer geeigneter Befreiungsnachweis" },
  ],
};

const SURFACE = "#FFFFFF";
const SUCCESS = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";
const WARNING = "#A45A08";
const WARNING_LIGHT = "#FFF3E2";
const DANGER = "#C33E48";
const DANGER_LIGHT = "#FFEDEE";
const INFO = "#315DB6";
const INFO_LIGHT = "#EDF3FF";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 3;

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const getCopyLanguage = (language: string): CopyLanguage =>
  ["ENGLISH", "HINDI", "GREEK", "HAUSA", "GERMAN"].includes(language) ? language as CopyLanguage : "ENGLISH";

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
};

const isValidExpiryDate = (value: string) => {
  if (!value.trim()) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return false;

  const [year, month, day] = value.trim().split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const inferMimeType = (name: string, provided?: string | null) => {
  const type = provided?.toLowerCase();
  if (type === "application/pdf" || type === "image/jpeg" || type === "image/jpg" || type === "image/png" || type === "image/webp") {
    return type === "image/jpg" ? "image/jpeg" : type;
  }

  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return null;
};

const getStatusPresentation = (profile: PatientPrescriptionChargeProfile, copy: Copy) => {
  if (profile.selectedPreference === "CHARGEABLE") {
    return {
      title: copy.paymentRequired,
      description: copy.paymentRequiredDescription,
      icon: CreditCard,
      color: INFO,
      background: INFO_LIGHT,
    };
  }

  switch (profile.verificationState) {
    case "VERIFIED":
      return {
        title: copy.verified,
        description: copy.verifiedDescription,
        icon: BadgeCheck,
        color: SUCCESS,
        background: SUCCESS_LIGHT,
      };
    case "PENDING":
      return {
        title: copy.pending,
        description: copy.pendingDescription,
        icon: RefreshCw,
        color: WARNING,
        background: WARNING_LIGHT,
      };
    case "REJECTED":
      return {
        title: copy.rejected,
        description: copy.rejectedDescription,
        icon: AlertCircle,
        color: DANGER,
        background: DANGER_LIGHT,
      };
    case "EXPIRED":
      return {
        title: copy.expired,
        description: copy.expiredDescription,
        icon: CalendarDays,
        color: DANGER,
        background: DANGER_LIGHT,
      };
    default:
      return {
        title: copy.evidenceRequired,
        description: copy.evidenceRequiredDescription,
        icon: FileText,
        color: WARNING,
        background: WARNING_LIGHT,
      };
  }
};

export const PrescriptionPaymentSettingsScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { language, palette, scaleFont, hapticFeedbackEnabled, screenReaderHintsEnabled } = useLanguage();
  const copyLanguage = getCopyLanguage(language);
  const copy = COPY[copyLanguage];
  const exemptionOptions = EXEMPTION_OPTIONS[copyLanguage];

  const [profile, setProfile] = useState<PatientPrescriptionChargeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingPreference, setIsUpdatingPreference] = useState(false);
  const [isPickingFiles, setIsPickingFiles] = useState(false);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [exemptionType, setExemptionType] = useState<PrescriptionExemptionType | null>(null);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<SelectedEvidenceFile[]>([]);

  const selectedUiPreference: PatientChargeSelection = profile?.selectedPreference === "CHARGEABLE" ? "CHARGEABLE" : "EXEMPT";
  const statusPresentation = profile ? getStatusPresentation(profile, copy) : null;
  const selectedExemptionOption = exemptionOptions.find(option => option.value === exemptionType) || null;

  const canSubmitNewEvidence = useMemo(() => {
  if (!profile || selectedUiPreference !== "EXEMPT") return false;
  return ["MISSING", "PENDING", "REJECTED", "EXPIRED"].includes(profile.verificationState);
}, [profile, selectedUiPreference]);

  const feedback = useCallback(() => {
    if (hapticFeedbackEnabled) Vibration.vibrate(12);
  }, [hapticFeedbackEnabled]);

  const loadProfile = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await patientPrescriptionChargeApi.getProfile();
      setProfile(result.profile);

      if (result.profile.latestEvidence?.exemptionType) {
        setExemptionType(result.profile.latestEvidence.exemptionType);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.unavailable);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [copy.unavailable]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile("initial");
    }, [loadProfile]),
  );

  const applyPreference = async (selection: PatientChargeSelection) => {
    if (isUpdatingPreference || selectedUiPreference === selection) return;

    try {
      setIsUpdatingPreference(true);
      setErrorMessage("");

      const result = await patientPrescriptionChargeApi.updatePreference(selection);
      setProfile(result.profile);
      feedback();

      if (selection === "EXEMPT" && !exemptionType) setExemptionType(result.profile.latestEvidence?.exemptionType || null);

      Alert.alert(copy.title, copy.preferenceUpdated);
    } catch (error) {
      Alert.alert(copy.unableUpdate, error instanceof Error ? error.message : copy.unavailable);
    } finally {
      setIsUpdatingPreference(false);
    }
  };

  const handlePreference = (selection: PatientChargeSelection) => {
    if (selection === "CHARGEABLE" && selectedUiPreference !== "CHARGEABLE") {
      Alert.alert(copy.changeToChargeableTitle, copy.changeToChargeableMessage, [
        { text: copy.cancel, style: "cancel" },
        { text: copy.confirmChargeable, style: "destructive", onPress: () => void applyPreference("CHARGEABLE") },
      ]);
      return;
    }

    void applyPreference(selection);
  };

  const chooseEvidenceFiles = async () => {
    if (isPickingFiles || selectedFiles.length >= MAX_FILES) {
      if (selectedFiles.length >= MAX_FILES) Alert.alert(copy.documents, copy.fileLimit);
      return;
    }

    try {
      setIsPickingFiles(true);

      const results = await pick({
        mode: "import",
        allowMultiSelection: true,
        allowVirtualFiles: false,
        type: [types.pdf, types.images],
      });

      const remainingSlots = MAX_FILES - selectedFiles.length;

      if (results.length > remainingSlots) {
        Alert.alert(copy.documents, copy.fileLimit);
        return;
      }

      const nextFiles: SelectedEvidenceFile[] = [];

      for (const file of results) {
        if (!file.hasRequestedType || file.isVirtual) {
          Alert.alert(copy.documents, copy.unsupportedFile);
          return;
        }

        const name = file.name?.trim() || "exemption-evidence";
        const mimeType = inferMimeType(name, file.type);

        if (!mimeType) {
          Alert.alert(copy.documents, copy.unsupportedFile);
          return;
        }

        if (file.size !== null && file.size > MAX_FILE_BYTES) {
          Alert.alert(copy.documents, copy.fileTooLarge);
          return;
        }

        nextFiles.push({ uri: file.uri, name, type: mimeType, size: file.size });
      }

      setSelectedFiles(current => {
        const existingKeys = new Set(current.map(file => `${file.uri}|${file.name}`));
        const uniqueNew = nextFiles.filter(file => !existingKeys.has(`${file.uri}|${file.name}`));
        return [...current, ...uniqueNew].slice(0, MAX_FILES);
      });

      feedback();
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert(copy.documents, error instanceof Error ? error.message : copy.unavailable);
    } finally {
      setIsPickingFiles(false);
    }
  };

  const removeFile = (index: number) => {
    if (isSubmittingEvidence) return;
    setSelectedFiles(current => current.filter((_, fileIndex) => fileIndex !== index));
  };

  const submitEvidence = async () => {
    if (!profile) return;

    if (!profile.primaryPharmacy) {
      Alert.alert(copy.primaryPharmacy, copy.primaryRequired);
      return;
    }

    if (!exemptionType) {
      Alert.alert(copy.evidenceTitle, copy.selectTypeFirst);
      return;
    }

    if (selectedFiles.length === 0) {
      Alert.alert(copy.evidenceTitle, copy.selectFileFirst);
      return;
    }

    if (!isValidExpiryDate(expiresAt)) {
      Alert.alert(copy.expiryDate, copy.invalidExpiry);
      return;
    }

    try {
      setIsSubmittingEvidence(true);

      const result = await patientPrescriptionChargeApi.submitEvidence({
        exemptionType,
        referenceNumber: referenceNumber.trim() || undefined,
        expiresAt: expiresAt.trim() || undefined,
        files: selectedFiles.map(({ uri, name, type }) => ({ uri, name, type })),
      });

      setProfile(result.profile);
      setSelectedFiles([]);
      setReferenceNumber("");
      setExpiresAt("");
      setIsTypeOpen(false);
      feedback();

      Alert.alert(copy.evidenceSubmitted, copy.evidenceSubmittedMessage);
    } catch (error) {
      Alert.alert(copy.unableSubmit, error instanceof Error ? error.message : copy.unavailable);
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  const renderPreferenceCard = (
    selection: PatientChargeSelection,
    title: string,
    description: string,
    Icon: typeof CreditCard,
  ) => {
    const selected = selectedUiPreference === selection;
    const accent = selection === "CHARGEABLE" ? INFO : SUCCESS;
    const soft = selection === "CHARGEABLE" ? INFO_LIGHT : SUCCESS_LIGHT;

    return (
      <TouchableOpacity
        style={[
          styles.preferenceCard,
          {
            backgroundColor: selected ? soft : palette.surface,
            borderColor: selected ? accent : palette.border,
          },
        ]}
        activeOpacity={0.86}
        disabled={isUpdatingPreference}
        onPress={() => handlePreference(selection)}
        accessibilityLabel={screenReaderHintsEnabled ? title : undefined}
      >
        <View style={[styles.preferenceIcon, { backgroundColor: selected ? SURFACE : soft }]}>
          <Icon size={23} color={accent} strokeWidth={2.4} />
        </View>

        <View style={styles.preferenceText}>
          <View style={styles.preferenceTitleRow}>
            <Text style={[styles.preferenceTitle, { color: palette.text }]}>{title}</Text>

            {selected ? (
              <View style={[styles.selectedBadge, { backgroundColor: accent }]}>
                <Check size={12} color={SURFACE} strokeWidth={3} />
                <Text style={styles.selectedBadgeText}>{copy.selected}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.preferenceDescription, { color: palette.muted }]}>{description}</Text>
        </View>

        {isUpdatingPreference && !selected ? <ActivityIndicator size="small" color={accent} /> : null}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={["top", "bottom"]}>
        <StatusBar backgroundColor={palette.background} barStyle="dark-content" />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.stateText, { color: palette.muted }]}>{copy.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile || errorMessage) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={["top", "bottom"]}>
        <StatusBar backgroundColor={palette.background} barStyle="dark-content" />

        <View style={styles.appBar}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: palette.surface }]} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={palette.text} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.appBarText}>
            <Text style={[styles.appBarTitle, { color: palette.text }]}>{copy.title}</Text>
            <Text style={[styles.appBarSubtitle, { color: palette.muted }]}>{copy.subtitle}</Text>
          </View>
        </View>

        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <AlertCircle size={28} color={DANGER} strokeWidth={2.5} />
          </View>
          <Text style={[styles.errorTitle, { color: palette.text }]}>{copy.unavailable}</Text>
          <Text style={[styles.errorMessage, { color: palette.muted }]}>{errorMessage}</Text>

          <TouchableOpacity style={[styles.retryButton, { backgroundColor: palette.primary }]} activeOpacity={0.86} onPress={() => void loadProfile("initial")}>
            <RefreshCw size={17} color={SURFACE} strokeWidth={2.5} />
            <Text style={styles.retryText}>{copy.retry}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const StatusIcon = statusPresentation!.icon;
  const latestEvidence = profile.latestEvidence;
  const effectiveNoPayment = profile.effectiveOrderPaymentStatus === "NOT_REQUIRED";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={palette.background} barStyle="dark-content" />

      <View style={[styles.screen, { backgroundColor: palette.background }]}>
        <View style={styles.appBar}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: palette.surface }]} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={palette.text} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.appBarText}>
            <Text style={[styles.appBarTitle, { color: palette.text }]}>{copy.title}</Text>
            <Text style={[styles.appBarSubtitle, { color: palette.muted }]}>{copy.subtitle}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(50, insets.bottom + 32) }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadProfile("refresh")}
              colors={[palette.primary]}
              tintColor={palette.primary}
            />
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>{copy.preferenceTitle}</Text>
            <Text style={[styles.sectionSubtitle, { color: palette.muted }]}>{copy.preferenceSubtitle}</Text>

            <View style={styles.preferenceList}>
              {renderPreferenceCard("CHARGEABLE", copy.chargeableTitle, copy.chargeableDescription, CreditCard)}
              {renderPreferenceCard("EXEMPT", copy.exemptTitle, copy.exemptDescription, ShieldCheck)}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>{copy.statusTitle}</Text>

            <View style={[styles.statusCard, { backgroundColor: statusPresentation!.background, borderColor: `${statusPresentation!.color}35` }]}>
              <View style={[styles.statusIcon, { backgroundColor: SURFACE }]}>
                <StatusIcon size={24} color={statusPresentation!.color} strokeWidth={2.5} />
              </View>

              <View style={styles.statusTextBlock}>
                <Text style={[styles.statusTitle, { color: statusPresentation!.color }]}>{statusPresentation!.title}</Text>
                <Text style={[styles.statusDescription, { color: palette.text }]}>{statusPresentation!.description}</Text>
              </View>
            </View>

            <View style={[styles.effectivePaymentCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.smallIcon, { backgroundColor: effectiveNoPayment ? SUCCESS_LIGHT : INFO_LIGHT }]}>
                {effectiveNoPayment ? (
                  <CheckCircle2 size={19} color={SUCCESS} strokeWidth={2.5} />
                ) : (
                  <CreditCard size={19} color={INFO} strokeWidth={2.5} />
                )}
              </View>

              <View style={styles.effectivePaymentText}>
                <Text style={[styles.metaLabel, { color: palette.muted }]}>{copy.effectiveStatus}</Text>
                <Text style={[styles.effectiveValue, { color: effectiveNoPayment ? SUCCESS : palette.text }]}>
                  {effectiveNoPayment ? copy.noPaymentRequired : copy.payable}
                </Text>
              </View>
            </View>
          </View>

          {selectedUiPreference === "EXEMPT" ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>{copy.primaryPharmacy}</Text>

              {profile.primaryPharmacy ? (
                <View style={[styles.pharmacyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <View style={[styles.smallIcon, { backgroundColor: palette.primaryLight }]}>
                    <Building2 size={20} color={palette.primary} strokeWidth={2.5} />
                  </View>

                  <View style={styles.pharmacyText}>
                    <Text style={[styles.pharmacyName, { color: palette.text }]}>{profile.primaryPharmacy.pharmacyName}</Text>
                    <Text style={[styles.pharmacyHelper, { color: palette.muted }]}>{copy.primaryPharmacy}</Text>
                  </View>

                  <BadgeCheck size={21} color={SUCCESS} strokeWidth={2.4} />
                </View>
              ) : (
                <View style={[styles.noPharmacyCard, { backgroundColor: WARNING_LIGHT }]}>
                  <View style={styles.noPharmacyTop}>
                    <AlertCircle size={21} color={WARNING} strokeWidth={2.5} />
                    <View style={styles.noPharmacyText}>
                      <Text style={[styles.noPharmacyTitle, { color: WARNING }]}>{copy.noPrimaryPharmacy}</Text>
                      <Text style={[styles.noPharmacyDescription, { color: palette.text }]}>{copy.noPrimaryDescription}</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={[styles.choosePharmacyButton, { backgroundColor: palette.primary }]} activeOpacity={0.86} onPress={() => navigation.navigate("MyPharmacies")}>
                    <Building2 size={17} color={SURFACE} strokeWidth={2.5} />
                    <Text style={styles.choosePharmacyText}>{copy.choosePharmacy}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}

          {selectedUiPreference === "EXEMPT" && latestEvidence ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>{copy.latestEvidence}</Text>

              <View style={[styles.evidenceHistoryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.evidenceHistoryHeader}>
                  <View style={[styles.smallIcon, { backgroundColor: profile.verificationState === "VERIFIED" ? SUCCESS_LIGHT : profile.verificationState === "PENDING" ? WARNING_LIGHT : DANGER_LIGHT }]}>
                    <FileCheck2
                      size={20}
                      color={profile.verificationState === "VERIFIED" ? SUCCESS : profile.verificationState === "PENDING" ? WARNING : DANGER}
                      strokeWidth={2.4}
                    />
                  </View>

                  <View style={styles.evidenceHistoryTitle}>
                    <Text style={[styles.evidenceTypeName, { color: palette.text }]}>
                      {exemptionOptions.find(option => option.value === latestEvidence.exemptionType)?.label || latestEvidence.exemptionType}
                    </Text>
                    <Text style={[styles.evidencePharmacy, { color: palette.muted }]}>{latestEvidence.pharmacyName}</Text>
                  </View>
                </View>

                <View style={styles.detailsGrid}>
                  <DetailItem label={copy.submitted} value={formatDate(latestEvidence.submittedAt) || "—"} textColor={palette.text} mutedColor={palette.muted} />
                  <DetailItem label={copy.documentCount} value={String(latestEvidence.documentCount)} textColor={palette.text} mutedColor={palette.muted} />

                  {latestEvidence.referenceNumber ? (
                    <DetailItem label={copy.referenceNumber} value={latestEvidence.referenceNumber} textColor={palette.text} mutedColor={palette.muted} />
                  ) : null}

                  {latestEvidence.expiresAt ? (
                    <DetailItem label={copy.expires} value={formatDate(latestEvidence.expiresAt) || "—"} textColor={palette.text} mutedColor={palette.muted} />
                  ) : null}

                  {latestEvidence.verifiedAt ? (
                    <DetailItem label={copy.verifiedOn} value={formatDate(latestEvidence.verifiedAt) || "—"} textColor={palette.text} mutedColor={palette.muted} />
                  ) : null}

                  {latestEvidence.rejectedAt ? (
                    <DetailItem label={copy.rejectedOn} value={formatDate(latestEvidence.rejectedAt) || "—"} textColor={palette.text} mutedColor={palette.muted} />
                  ) : null}
                </View>

                {latestEvidence.rejectionReason ? (
                  <View style={styles.rejectionBox}>
                    <AlertCircle size={17} color={DANGER} strokeWidth={2.4} />
                    <View style={styles.rejectionText}>
                      <Text style={styles.rejectionLabel}>{copy.rejectionReason}</Text>
                      <Text style={[styles.rejectionReason, { color: palette.text }]}>{latestEvidence.rejectionReason}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {selectedUiPreference === "EXEMPT" && canSubmitNewEvidence ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>{copy.evidenceTitle}</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.muted }]}>{copy.evidenceSubtitle}</Text>

              <View style={[styles.formCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>{copy.exemptionType}</Text>

                <TouchableOpacity style={[styles.selectField, { borderColor: palette.border }]} activeOpacity={0.85} onPress={() => setIsTypeOpen(value => !value)}>
                  <View style={styles.selectTextBlock}>
                    <Text style={[styles.selectValue, { color: selectedExemptionOption ? palette.text : palette.muted }]}>
                      {selectedExemptionOption?.label || copy.selectExemptionType}
                    </Text>
                    {selectedExemptionOption ? (
                      <Text style={[styles.selectHelper, { color: palette.muted }]}>{selectedExemptionOption.helper}</Text>
                    ) : null}
                  </View>

                  <ChevronDown size={19} color={palette.muted} strokeWidth={2.4} />
                </TouchableOpacity>

                {isTypeOpen ? (
                  <View style={[styles.optionsPanel, { borderColor: palette.border }]}>
                    {exemptionOptions.map((option, index) => {
                      const selected = exemptionType === option.value;

                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.optionRow,
                            index < exemptionOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: palette.border },
                          ]}
                          activeOpacity={0.82}
                          onPress={() => {
                            setExemptionType(option.value);
                            setIsTypeOpen(false);
                          }}
                        >
                          <View style={styles.optionText}>
                            <Text style={[styles.optionLabel, { color: palette.text }]}>{option.label}</Text>
                            <Text style={[styles.optionHelper, { color: palette.muted }]}>{option.helper}</Text>
                          </View>

                          {selected ? <CheckCircle2 size={20} color={SUCCESS} strokeWidth={2.5} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                <Text style={[styles.fieldLabel, { color: palette.text }]}>{copy.referenceNumber}</Text>
                <TextInput
                  style={[styles.input, { borderColor: palette.border, color: palette.text, fontSize: scaleFont(14) }]}
                  value={referenceNumber}
                  onChangeText={setReferenceNumber}
                  placeholder={copy.referencePlaceholder}
                  placeholderTextColor={palette.muted}
                  maxLength={120}
                  editable={!isSubmittingEvidence}
                />

                <Text style={[styles.fieldLabel, { color: palette.text }]}>{copy.expiryDate}</Text>
                <TextInput
                  style={[styles.input, { borderColor: palette.border, color: palette.text, fontSize: scaleFont(14) }]}
                  value={expiresAt}
                  onChangeText={value => setExpiresAt(value.replace(/[^0-9-]/g, "").slice(0, 10))}
                  placeholder={copy.expiryPlaceholder}
                  placeholderTextColor={palette.muted}
                  maxLength={10}
                  keyboardType="numbers-and-punctuation"
                  editable={!isSubmittingEvidence}
                />
                <Text style={[styles.fieldHelper, { color: palette.muted }]}>{copy.expiryHelper}</Text>

                <View style={styles.documentsHeader}>
                  <View style={styles.documentsHeaderText}>
                    <Text style={[styles.fieldLabelNoMargin, { color: palette.text }]}>{copy.documents}</Text>
                    <Text style={[styles.fieldHelper, { color: palette.muted }]}>{copy.documentsHelper}</Text>
                  </View>

                  <View style={[styles.fileCounter, { backgroundColor: palette.primaryLight }]}>
                    <Text style={[styles.fileCounterText, { color: palette.primary }]}>{selectedFiles.length}/{MAX_FILES}</Text>
                  </View>
                </View>

                {selectedFiles.length > 0 ? (
                  <View style={styles.fileList}>
                    {selectedFiles.map((file, index) => (
                      <View key={`${file.uri}-${index}`} style={[styles.fileRow, { borderColor: palette.border }]}>
                        <View style={[styles.fileIcon, { backgroundColor: palette.primaryLight }]}>
                          <FileText size={18} color={palette.primary} strokeWidth={2.4} />
                        </View>

                        <View style={styles.fileText}>
                          <Text style={[styles.fileName, { color: palette.text }]} numberOfLines={1}>{file.name}</Text>
                          <Text style={[styles.fileSize, { color: palette.muted }]}>
                            {file.size !== null ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : file.type}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.removeFileButton}
                          activeOpacity={0.8}
                          disabled={isSubmittingEvidence}
                          onPress={() => removeFile(index)}
                          accessibilityLabel={screenReaderHintsEnabled ? copy.remove : undefined}
                        >
                          <X size={18} color={DANGER} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.uploadButton, { backgroundColor: palette.primaryLight }]}
                  activeOpacity={0.86}
                  disabled={isPickingFiles || isSubmittingEvidence || selectedFiles.length >= MAX_FILES}
                  onPress={() => void chooseEvidenceFiles()}
                >
                  {isPickingFiles ? (
                    <ActivityIndicator size="small" color={palette.primary} />
                  ) : (
                    <UploadCloud size={20} color={palette.primary} strokeWidth={2.5} />
                  )}

                  <Text style={[styles.uploadButtonText, { color: palette.primary }]}>
                    {selectedFiles.length > 0 ? copy.addMore : copy.chooseDocuments}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    {
                      backgroundColor:
                        isSubmittingEvidence || !profile.primaryPharmacy || selectedFiles.length === 0 || !exemptionType
                          ? "#AEB9CF"
                          : palette.primary,
                    },
                  ]}
                  activeOpacity={0.86}
                  disabled={isSubmittingEvidence || !profile.primaryPharmacy || selectedFiles.length === 0 || !exemptionType}
                  onPress={() => void submitEvidence()}
                >
                  {isSubmittingEvidence ? (
                    <ActivityIndicator size="small" color={SURFACE} />
                  ) : (
                    <ShieldCheck size={19} color={SURFACE} strokeWidth={2.5} />
                  )}

                  <Text style={styles.submitButtonText}>
                    {isSubmittingEvidence ? copy.submitting : copy.submitEvidence}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={[styles.infoCard, { backgroundColor: INFO_LIGHT }]}>
            <Info size={20} color={INFO} strokeWidth={2.5} />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>{copy.infoTitle}</Text>
              <Text style={[styles.infoDescription, { color: palette.text }]}>{copy.infoText}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const DetailItem = ({
  label,
  value,
  textColor,
  mutedColor,
}: {
  label: string;
  value: string;
  textColor: string;
  mutedColor: string;
}) => (
  <View style={styles.detailItem}>
    <Text style={[styles.detailLabel, { color: mutedColor }]}>{label}</Text>
    <Text style={[styles.detailValue, { color: textColor }]}>{value}</Text>
  </View>
);

export default PrescriptionPaymentSettingsScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 4 },
  appBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14, gap: 13 },
  backButton: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", ...elevate(1) },
  appBarText: { flex: 1 },
  appBarTitle: { fontSize: 25, fontWeight: "800", letterSpacing: -0.5 },
  appBarSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: "500" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, gap: 12 },
  stateText: { fontSize: 13, fontWeight: "600" },
  errorIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  errorTitle: { fontSize: 18, fontWeight: "800" },
  errorMessage: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  retryButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  retryText: { color: SURFACE, fontSize: 12, fontWeight: "800" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.2 },
  sectionSubtitle: { marginTop: 4, fontSize: 11.5, lineHeight: 17, fontWeight: "500" },
  preferenceList: { marginTop: 12, gap: 10 },
  preferenceCard: { minHeight: 102, borderWidth: 1.5, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, ...elevate(1) },
  preferenceIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  preferenceText: { flex: 1 },
  preferenceTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  preferenceTitle: { flexShrink: 1, fontSize: 15, fontWeight: "800" },
  preferenceDescription: { marginTop: 5, fontSize: 11, lineHeight: 16, fontWeight: "500" },
  selectedBadge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 3 },
  selectedBadgeText: { color: SURFACE, fontSize: 9.5, fontWeight: "800" },
  statusCard: { marginTop: 11, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  statusIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statusTextBlock: { flex: 1 },
  statusTitle: { fontSize: 15, fontWeight: "800" },
  statusDescription: { marginTop: 4, fontSize: 11.5, lineHeight: 17, fontWeight: "500" },
  effectivePaymentCard: { marginTop: 10, borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  smallIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  effectivePaymentText: { flex: 1 },
  metaLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: "700" },
  effectiveValue: { marginTop: 2, fontSize: 14, fontWeight: "800" },
  pharmacyCard: { marginTop: 10, borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", gap: 11, ...elevate(1) },
  pharmacyText: { flex: 1 },
  pharmacyName: { fontSize: 15, fontWeight: "800" },
  pharmacyHelper: { marginTop: 2, fontSize: 10.5, fontWeight: "500" },
  noPharmacyCard: { marginTop: 10, borderRadius: 16, padding: 14 },
  noPharmacyTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noPharmacyText: { flex: 1 },
  noPharmacyTitle: { fontSize: 14, fontWeight: "800" },
  noPharmacyDescription: { marginTop: 3, fontSize: 11, lineHeight: 16 },
  choosePharmacyButton: { minHeight: 42, borderRadius: 12, marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  choosePharmacyText: { color: SURFACE, fontSize: 12, fontWeight: "800" },
  evidenceHistoryCard: { marginTop: 10, borderWidth: 1, borderRadius: 17, padding: 14, ...elevate(1) },
  evidenceHistoryHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  evidenceHistoryTitle: { flex: 1 },
  evidenceTypeName: { fontSize: 14.5, fontWeight: "800" },
  evidencePharmacy: { marginTop: 2, fontSize: 10.5, fontWeight: "500" },
  detailsGrid: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", rowGap: 13 },
  detailItem: { width: "50%", paddingRight: 8 },
  detailLabel: { fontSize: 9.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.35 },
  detailValue: { marginTop: 2, fontSize: 12, fontWeight: "700" },
  rejectionBox: { marginTop: 14, padding: 11, borderRadius: 12, backgroundColor: DANGER_LIGHT, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  rejectionText: { flex: 1 },
  rejectionLabel: { color: DANGER, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  rejectionReason: { marginTop: 3, fontSize: 11, lineHeight: 16 },
  formCard: { marginTop: 11, borderWidth: 1, borderRadius: 18, padding: 15, ...elevate(1) },
  fieldLabel: { marginTop: 15, marginBottom: 7, fontSize: 12, fontWeight: "800" },
  fieldLabelNoMargin: { fontSize: 12, fontWeight: "800" },
  fieldHelper: { marginTop: 5, fontSize: 10.5, lineHeight: 15, fontWeight: "500" },
  selectField: { minHeight: 54, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  selectTextBlock: { flex: 1 },
  selectValue: { fontSize: 13.5, fontWeight: "700" },
  selectHelper: { marginTop: 2, fontSize: 10, lineHeight: 14 },
  optionsPanel: { borderWidth: 1, borderRadius: 13, overflow: "hidden", marginTop: 6 },
  optionRow: { paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 8 },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 12.5, fontWeight: "700" },
  optionHelper: { marginTop: 2, fontSize: 9.5, lineHeight: 14 },
  input: { height: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, backgroundColor: SURFACE, fontWeight: "500" },
  documentsHeader: { marginTop: 17, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  documentsHeaderText: { flex: 1 },
  fileCounter: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  fileCounterText: { fontSize: 10, fontWeight: "800" },
  fileList: { marginTop: 10, gap: 8 },
  fileRow: { minHeight: 58, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 9 },
  fileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fileText: { flex: 1 },
  fileName: { fontSize: 11.5, fontWeight: "700" },
  fileSize: { marginTop: 2, fontSize: 9.5, fontWeight: "500" },
  removeFileButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  uploadButton: { minHeight: 45, borderRadius: 12, marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  uploadButtonText: { fontSize: 12.5, fontWeight: "800" },
  submitButton: { minHeight: 48, borderRadius: 13, marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitButtonText: { color: SURFACE, fontSize: 13, fontWeight: "800" },
  infoCard: { borderRadius: 16, padding: 14, marginBottom: 4, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoText: { flex: 1 },
  infoTitle: { color: INFO, fontSize: 12, fontWeight: "800" },
  infoDescription: { marginTop: 3, fontSize: 10.5, lineHeight: 16 },
});