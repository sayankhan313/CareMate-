import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, FileText, FileUp, Package, Send, ShieldCheck, Stethoscope, UserRound, X } from "lucide-react-native";
import { errorCodes, isErrorWithCode, pick, types } from "@react-native-documents/picker";

import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedTextInput as TextInput } from "../../components/common/LocalizedTextInput";
import { API_BASE_URL } from "../../constants/api";
import { doctorAssignmentApi, type AssignedDoctor } from "../../services/doctorAssignmentApi";
import { patientPharmacyRefillApi, type PatientMedicineEvidenceType, type PatientRefillVerificationPath, type RefillEvidenceFile } from "../../services/patientPharmacyRefillApi";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PharmacyRequest">;
type SelectedEvidence = RefillEvidenceFile & { size: number | null };
type EvidenceOption = { value: PatientMedicineEvidenceType; label: string; helper: string };

const BACKGROUND = "#F2F3F8";
const SURFACE = "#FFFFFF";
const SOFT = "#F4F5F9";
const BORDER = "#E4E7EF";
const TEXT = "#1B1D2A";
const MUTED = "#666A78";
const PRIMARY = "#4C6FE0";
const PRIMARY_LIGHT = "#E1E7FF";
const PRIMARY_DARK = "#0C2A8C";
const SUCCESS = "#3A9D75";
const SUCCESS_LIGHT = "#DBF3E7";
const SUCCESS_DARK = "#0F5C3C";
const WARNING = "#C77A1F";
const WARNING_LIGHT = "#FBE7CD";
const WARNING_DARK = "#7A4708";
const DANGER = "#C6404A";
const DANGER_LIGHT = "#FBDADC";
const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;

const EVIDENCE_OPTIONS: EvidenceOption[] = [
  { value: "NHS_APP_SCREENSHOT", label: "NHS App", helper: "Medicine details screenshot" },
  { value: "EPS_TOKEN", label: "EPS token", helper: "Prescription token or barcode" },
  { value: "GP_REPEAT_MEDICATION_RECORD", label: "GP repeat record", helper: "Repeat medication record" },
  { value: "HOSPITAL_OR_CLINIC_LETTER", label: "Hospital / clinic letter", helper: "Medicine letter or record" },
  { value: "PHARMACY_LABELLED_MEDICINE", label: "Pharmacy label", helper: "Photo of labelled medicine" },
  { value: "OTHER", label: "Other evidence", helper: "Other medicine document" },
];

const PACKAGE_UNITS = new Set(["pack", "box", "bottle", "inhaler", "tube", "sachet"]);

const normalizePackageUnit = (value?: string | null) => {
  const unit = value?.trim().toLowerCase() || "";
  const aliases: Record<string, string> = { packs: "pack", boxes: "box", bottles: "bottle", inhalers: "inhaler", tubes: "tube", sachets: "sachet" };
  return aliases[unit] || unit;
};

const displayPackageUnit = (unit: string, quantity: number) => {
  const value = normalizePackageUnit(unit);
  if (quantity === 1) return value;
  if (value === "box") return "boxes";
  return value.endsWith("s") ? value : `${value}s`;
};

const inferPackageUnit = (name: string, stockUnit?: string | null) => {
  const existing = normalizePackageUnit(stockUnit);
  if (PACKAGE_UNITS.has(existing)) return existing;

  const text = name.toLowerCase();
  if (/\b(syrup|suspension|solution|liquid)\b/.test(text)) return "bottle";
  if (/\b(gel|cream|ointment)\b/.test(text)) return "tube";
  if (/\binhaler\b/.test(text)) return "inhaler";
  if (/\bsachet\b/.test(text)) return "sachet";
  return "pack";
};

const inferMimeType = (fileName: string, suppliedType?: string | null) => {
  const type = suppliedType?.toLowerCase();
  if (type === "application/pdf" || type === "image/jpeg" || type === "image/png" || type === "image/webp") return type;

  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
};

const fallbackEvidenceName = (mimeType: string) => {
  if (mimeType === "application/pdf") return "medicine-evidence.pdf";
  if (mimeType === "image/png") return "medicine-evidence.png";
  if (mimeType === "image/webp") return "medicine-evidence.webp";
  return "medicine-evidence.jpg";
};

const isPendingReview = (status?: string | null) => status === "PENDING";
const isApprovedReview = (status?: string | null) => status === "APPROVED" || status === "APPLIED";

const pendingReviewMessage = (routingStatus?: string | null, doctorName?: string | null) => {
  if (routingStatus === "ADMIN_REVIEW_REQUIRED") return "Waiting for administrator-assisted doctor assignment";
  if (routingStatus === "POOL_ASSIGNED" || routingStatus === "POOL_REVIEW_COMPLETED") return "Doctor review is being handled through the admin review pool";
  return doctorName ? `Waiting for ${doctorName}` : "Doctor review already pending";
};

export const PharmacyRequestScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const { medicineId, medicineName, dose, source, stockUnit, reviewStatus, reviewRoutingStatus, reviewDoctorName } = route.params;

  const [quantity, setQuantity] = useState("1");
  const [requestUnit, setRequestUnit] = useState(inferPackageUnit(medicineName, stockUnit));
  const [isResolvingRequestUnit, setIsResolvingRequestUnit] = useState(false);
  const [note, setNote] = useState("");
  const [verificationPath, setVerificationPath] = useState<PatientRefillVerificationPath | null>(null);
  const [assignedDoctors, setAssignedDoctors] = useState<AssignedDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [evidenceType, setEvidenceType] = useState<PatientMedicineEvidenceType | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<SelectedEvidence | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPickingEvidence, setIsPickingEvidence] = useState(false);

  const isCareMatePrescription = source === "DOCTOR_PRESCRIBED";
  const pendingMedicineReview = isPendingReview(reviewStatus);
  const approvedMedicineReview = isApprovedReview(reviewStatus);
  const usesExistingMedicineReview = pendingMedicineReview || approvedMedicineReview;

  const loadDoctors = useCallback(async () => {
    try {
      const result = await doctorAssignmentApi.getAssignedDoctors();
      setAssignedDoctors(result.doctors.filter(item => item.status === "ACTIVE"));
    } catch {
      setAssignedDoctors([]);
    }
  }, []);

  const resolveRequestUnit = useCallback(async () => {
    setRequestUnit(inferPackageUnit(medicineName, stockUnit));
    setIsResolvingRequestUnit(true);

    try {
      const token = await tokenStorage.getToken();
      if (!token) return;

      const query = `medicineName=${encodeURIComponent(medicineName)}&strength=${encodeURIComponent(dose)}`;
      const response = await fetch(`${API_BASE_URL}/patient/medicine-pack-reference?${query}`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return;

      const reference = result?.data?.reference || result?.data?.packReference || result?.data;
      const packageUnit = normalizePackageUnit(reference?.packageUnit);
      if (PACKAGE_UNITS.has(packageUnit)) setRequestUnit(packageUnit);
    } finally {
      setIsResolvingRequestUnit(false);
    }
  }, [dose, medicineName, stockUnit]);

  useEffect(() => {
    void loadDoctors();
    void resolveRequestUnit();
  }, [loadDoctors, resolveRequestUnit]);

  const selectVerificationPath = (path: PatientRefillVerificationPath) => {
    setVerificationPath(path);

    if (path === "ASSIGNED_DOCTOR") {
      setEvidenceType(null);
      setSelectedEvidence(null);
    } else {
      setSelectedDoctorId(null);
    }
  };

  const pickEvidence = async () => {
    if (isPickingEvidence) return;

    try {
      setIsPickingEvidence(true);
      const results = await pick({ allowMultiSelection: false, type: [types.pdf, types.images] });
      const file = results[0];
      if (!file) return;

      const name = file.name || "medicine-evidence";
      const mimeType = inferMimeType(name, file.type);

      if (!mimeType) {
        Alert.alert("Unsupported file", "Choose a PDF or image file.");
        return;
      }

      if (file.size !== null && file.size > MAX_EVIDENCE_BYTES) {
        Alert.alert("File too large", "Maximum file size is 8 MB.");
        return;
      }

      setSelectedEvidence({ uri: file.uri, name: file.name || fallbackEvidenceName(mimeType), type: mimeType, size: file.size });
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert("Unable to select file", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsPickingEvidence(false);
    }
  };

  const submit = async () => {
    if (isSubmitting) return;

    const requestedQuantity = Number.parseInt(quantity.trim(), 10);
    const quantityUnit = requestUnit.trim();

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 1000) {
      Alert.alert("Invalid quantity", "Enter a quantity between 1 and 1000.");
      return;
    }

    if (!quantityUnit || isResolvingRequestUnit) {
      Alert.alert("Package information", isResolvingRequestUnit ? "Please wait while package information is checked." : "Unable to determine the pharmacy package type.");
      return;
    }

    if (!isCareMatePrescription && !usesExistingMedicineReview && !verificationPath) {
      Alert.alert("Verification required", "Choose a verification method.");
      return;
    }

    if (!isCareMatePrescription && !usesExistingMedicineReview && verificationPath === "ASSIGNED_DOCTOR" && !selectedDoctorId) {
      Alert.alert("Doctor required", "Select your CareMate+ doctor.");
      return;
    }

    if (!isCareMatePrescription && !usesExistingMedicineReview && verificationPath === "EXTERNAL_EVIDENCE" && !evidenceType) {
      Alert.alert("Evidence type required", "Select an evidence type.");
      return;
    }

    if (!isCareMatePrescription && !usesExistingMedicineReview && verificationPath === "EXTERNAL_EVIDENCE" && !selectedEvidence) {
      Alert.alert("Evidence required", "Attach a supporting file.");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await patientPharmacyRefillApi.createRefill({
        medicineId,
        requestedQuantity,
        quantityUnit,
        note: note.trim() || undefined,
        ...(!isCareMatePrescription && !usesExistingMedicineReview && verificationPath ? { verificationPath } : {}),
        ...(!isCareMatePrescription && !usesExistingMedicineReview && verificationPath === "ASSIGNED_DOCTOR" && selectedDoctorId ? { verificationDoctorId: selectedDoctorId } : {}),
        ...(!isCareMatePrescription && !usesExistingMedicineReview && verificationPath === "EXTERNAL_EVIDENCE" && evidenceType && selectedEvidence
          ? { evidenceType, evidenceFile: { uri: selectedEvidence.uri, name: selectedEvidence.name, type: selectedEvidence.type } }
          : {}),
      });

      if (result.requiresDoctorVerification) {
        Alert.alert("Request sent", pendingMedicineReview ? "Your pharmacy request has been received. Fulfilment remains locked until the existing doctor review is approved." : "Waiting for doctor confirmation.", [
          { text: "View Orders", onPress: () => navigation.reset({ index: 0, routes: [{ name: "PatientTabs", params: { screen: "PatientOrders" } }] }) },
          { text: "Done", onPress: () => navigation.goBack() },
        ]);
        return;
      }

      if (result.requiresPharmacyVerification) {
        Alert.alert("Request sent", "Waiting for pharmacy review.", [
          { text: "View Orders", onPress: () => navigation.reset({ index: 0, routes: [{ name: "PatientTabs", params: { screen: "PatientOrders" } }] }) },
          { text: "Done", onPress: () => navigation.goBack() },
        ]);
        return;
      }

      Alert.alert("Request sent", `Sent to ${result.pharmacy.pharmacyName}.`, [
        { text: "View Orders", onPress: () => navigation.reset({ index: 0, routes: [{ name: "PatientTabs", params: { screen: "PatientOrders" } }] }) },
        { text: "Done", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Unable to send request", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={isSubmitting}>
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Pharmacy Request</Text>
            <Text style={styles.headerSubtitle}>Review and send your request</Text>
          </View>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 120, 140) }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.medicineCard}>
              <View style={styles.medicineIcon}><Package size={25} color={PRIMARY} strokeWidth={2.6} /></View>
              <View style={styles.medicineText}>
                <Text style={styles.medicineName}>{medicineName}</Text>
                <Text style={styles.medicineDose}>{dose}</Text>
              </View>
            </View>

            {isCareMatePrescription ? (
              <View style={styles.successPanel}>
                <ShieldCheck size={20} color={SUCCESS_DARK} strokeWidth={2.6} />
                <View style={styles.panelText}>
                  <Text style={styles.successTitle}>CareMate+ Prescription</Text>
                  <Text style={styles.successSubtitle}>Prescription verified</Text>
                </View>
              </View>
            ) : pendingMedicineReview ? (
              <View style={styles.reviewPanel}>
                <Clock3 size={20} color={PRIMARY_DARK} strokeWidth={2.6} />
                <View style={styles.panelText}>
                  <Text style={styles.reviewTitle}>Doctor review already pending</Text>
                  <Text style={styles.reviewSubtitle}>{pendingReviewMessage(reviewRoutingStatus, reviewDoctorName)}</Text>
                  <Text style={styles.reviewHelper}>The pharmacy can receive the request now, but fulfilment remains locked until approval.</Text>
                </View>
              </View>
            ) : approvedMedicineReview ? (
              <View style={styles.successPanel}>
                <ShieldCheck size={20} color={SUCCESS_DARK} strokeWidth={2.6} />
                <View style={styles.panelText}>
                  <Text style={styles.successTitle}>Doctor review approved</Text>
                  <Text style={styles.successSubtitle}>{reviewDoctorName ? `Reviewed by ${reviewDoctorName}` : "Existing CareMate+ review will be reused"}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Verification</Text>
                <Text style={styles.sectionSubtitle}>Choose how this medicine should be verified</Text>

                <TouchableOpacity style={[styles.option, verificationPath === "ASSIGNED_DOCTOR" && styles.optionSelected]} onPress={() => selectVerificationPath("ASSIGNED_DOCTOR")}>
                  <View style={styles.optionIcon}><Stethoscope size={20} color={PRIMARY} strokeWidth={2.5} /></View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>My CareMate+ Doctor</Text>
                    <Text style={styles.optionSubtitle}>Doctor confirmation</Text>
                  </View>
                  <SelectionDot selected={verificationPath === "ASSIGNED_DOCTOR"} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.option, verificationPath === "EXTERNAL_EVIDENCE" && styles.optionSelected]} onPress={() => selectVerificationPath("EXTERNAL_EVIDENCE")}>
                  <View style={styles.optionIcon}><FileText size={20} color={PRIMARY} strokeWidth={2.5} /></View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>External Source</Text>
                    <Text style={styles.optionSubtitle}>Upload medicine evidence</Text>
                  </View>
                  <SelectionDot selected={verificationPath === "EXTERNAL_EVIDENCE"} />
                </TouchableOpacity>

                {verificationPath === "ASSIGNED_DOCTOR" ? (
                  <View style={styles.detailsSection}>
                    <Text style={styles.label}>Select doctor</Text>

                    {assignedDoctors.length === 0 ? (
                      <View style={styles.warningPanel}>
                        <AlertTriangle size={18} color={WARNING_DARK} strokeWidth={2.5} />
                        <Text style={styles.warningText}>No active assigned doctor is available.</Text>
                      </View>
                    ) : assignedDoctors.map(assignment => {
                      const selected = selectedDoctorId === assignment.doctor.id;

                      return (
                        <TouchableOpacity key={assignment.assignmentId} style={[styles.doctorOption, selected && styles.optionSelected]} onPress={() => setSelectedDoctorId(assignment.doctor.id)}>
                          <View style={styles.doctorIcon}><UserRound size={19} color={PRIMARY} strokeWidth={2.5} /></View>
                          <View style={styles.optionText}>
                            <Text style={styles.optionTitle}>{assignment.doctor.fullName}</Text>
                            <Text style={styles.optionSubtitle}>{assignment.doctor.specialization || "CareMate+ Doctor"}</Text>
                          </View>
                          <SelectionDot selected={selected} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                {verificationPath === "EXTERNAL_EVIDENCE" ? (
                  <View style={styles.detailsSection}>
                    <Text style={styles.label}>Evidence type</Text>

                    {EVIDENCE_OPTIONS.map(option => {
                      const selected = evidenceType === option.value;

                      return (
                        <TouchableOpacity key={option.value} style={[styles.evidenceOption, selected && styles.optionSelected]} onPress={() => setEvidenceType(option.value)}>
                          <View style={styles.optionText}>
                            <Text style={styles.optionTitle}>{option.label}</Text>
                            <Text style={styles.optionSubtitle}>{option.helper}</Text>
                          </View>
                          <SelectionDot selected={selected} />
                        </TouchableOpacity>
                      );
                    })}

                    <Text style={styles.label}>Evidence file</Text>

                    {selectedEvidence ? (
                      <View style={styles.fileCard}>
                        <FileText size={21} color={PRIMARY} strokeWidth={2.5} />

                        <View style={styles.fileText}>
                          <Text style={styles.fileName} numberOfLines={1}>{selectedEvidence.name}</Text>
                          <Text style={styles.fileMeta}>{selectedEvidence.size !== null ? `${(selectedEvidence.size / (1024 * 1024)).toFixed(2)} MB` : "Selected"}</Text>
                        </View>

                        <TouchableOpacity style={styles.removeFile} onPress={() => setSelectedEvidence(null)}>
                          <X size={17} color={DANGER} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.uploadButton} disabled={isPickingEvidence} onPress={() => void pickEvidence()}>
                        {isPickingEvidence ? <ActivityIndicator color={PRIMARY} /> : (
                          <>
                            <FileUp size={20} color={PRIMARY} strokeWidth={2.5} />
                            <View style={styles.uploadText}>
                              <Text style={styles.uploadTitle}>Upload file</Text>
                              <Text style={styles.uploadSubtitle}>PDF or image · max 8 MB</Text>
                            </View>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Request details</Text>

              <Text style={styles.label}>Requested quantity</Text>
              <TextInput style={styles.input} value={quantity} onChangeText={value => setQuantity(value.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="1" />

              <Text style={styles.label}>Pharmacy package</Text>

              <View style={styles.packageCard}>
                <Package size={19} color={PRIMARY_DARK} strokeWidth={2.5} />

                <View style={styles.packageText}>
                  <Text style={styles.packageTitle}>
                    {isResolvingRequestUnit ? "Checking package type..." : `${quantity || "1"} ${displayPackageUnit(requestUnit, Number.parseInt(quantity || "1", 10) || 1)}`}
                  </Text>
                  <Text style={styles.packageHelper}>Package type is matched automatically from the medicine reference.</Text>
                </View>

                {isResolvingRequestUnit ? <ActivityIndicator size="small" color={PRIMARY} /> : <CheckCircle2 size={18} color={SUCCESS} strokeWidth={2.5} />}
              </View>

              <Text style={styles.label}>Note</Text>
              <TextInput style={styles.noteInput} value={note} onChangeText={setNote} placeholder="Optional" multiline maxLength={500} textAlignVertical="top" />
            </View>

            <View style={styles.infoPanel}>
              <ShieldCheck size={18} color={PRIMARY_DARK} strokeWidth={2.5} />
              <Text style={styles.infoText}>Nothing is sent to the pharmacy until you press Send Request.</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={isSubmitting}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.sendButton, (isSubmitting || isResolvingRequestUnit) && styles.disabled]} disabled={isSubmitting || isResolvingRequestUnit} onPress={() => void submit()}>
            {isSubmitting ? <ActivityIndicator color={SURFACE} /> : (
              <>
                <Send size={18} color={SURFACE} strokeWidth={2.5} />
                <Text style={styles.sendText}>Send Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const SelectionDot = ({ selected }: { selected: boolean }) => (
  <View style={[styles.radioOuter, selected && styles.radioSelected]}>
    {selected ? <View style={styles.radioInner} /> : null}
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center" },
  backButton: { width: 43, height: 43, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  headerText: { flex: 1 },
  headerTitle: { color: TEXT, fontSize: 24, fontWeight: "700" },
  headerSubtitle: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 3 },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  medicineCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 13 },
  medicineIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  medicineText: { flex: 1 },
  medicineName: { color: TEXT, fontSize: 16, fontWeight: "700" },
  medicineDose: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },
  section: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, marginBottom: 13 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  sectionSubtitle: { color: MUTED, fontSize: 10, fontWeight: "500", marginTop: 3, marginBottom: 7 },
  successPanel: { backgroundColor: SUCCESS_LIGHT, borderRadius: 14, padding: 13, flexDirection: "row", alignItems: "center", marginBottom: 13 },
  reviewPanel: { backgroundColor: PRIMARY_LIGHT, borderRadius: 14, padding: 13, flexDirection: "row", alignItems: "flex-start", marginBottom: 13 },
  panelText: { flex: 1, marginLeft: 9 },
  successTitle: { color: SUCCESS_DARK, fontSize: 12, fontWeight: "700" },
  successSubtitle: { color: SUCCESS_DARK, fontSize: 10, fontWeight: "600", marginTop: 3 },
  reviewTitle: { color: PRIMARY_DARK, fontSize: 12, fontWeight: "700" },
  reviewSubtitle: { color: PRIMARY_DARK, fontSize: 10, fontWeight: "600", marginTop: 3 },
  reviewHelper: { color: PRIMARY_DARK, fontSize: 9, fontWeight: "500", lineHeight: 14, marginTop: 5 },
  option: { borderWidth: 1, borderColor: BORDER, borderRadius: 13, padding: 11, flexDirection: "row", alignItems: "center", marginTop: 8 },
  optionSelected: { borderColor: PRIMARY, backgroundColor: "#F5F7FF" },
  optionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 9 },
  optionText: { flex: 1 },
  optionTitle: { color: TEXT, fontSize: 11, fontWeight: "700" },
  optionSubtitle: { color: MUTED, fontSize: 9, fontWeight: "500", marginTop: 2 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#B9BECC", alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: PRIMARY },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  detailsSection: { marginTop: 7 },
  label: { color: TEXT, fontSize: 11, fontWeight: "700", marginTop: 14, marginBottom: 6 },
  doctorOption: { borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", marginBottom: 7 },
  doctorIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 9 },
  warningPanel: { backgroundColor: WARNING_LIGHT, borderRadius: 11, padding: 10, flexDirection: "row", alignItems: "center" },
  warningText: { flex: 1, color: WARNING_DARK, fontSize: 10, fontWeight: "600", marginLeft: 8 },
  evidenceOption: { borderWidth: 1, borderColor: BORDER, borderRadius: 11, padding: 10, flexDirection: "row", alignItems: "center", marginBottom: 7 },
  uploadButton: { minHeight: 60, borderWidth: 1, borderStyle: "dashed", borderColor: PRIMARY, borderRadius: 12, backgroundColor: "#F7F8FF", paddingHorizontal: 12, flexDirection: "row", alignItems: "center" },
  uploadText: { flex: 1, marginLeft: 9 },
  uploadTitle: { color: PRIMARY_DARK, fontSize: 10, fontWeight: "700" },
  uploadSubtitle: { color: MUTED, fontSize: 8, fontWeight: "500", marginTop: 2 },
  fileCard: { minHeight: 58, borderWidth: 1, borderColor: PRIMARY, borderRadius: 12, backgroundColor: "#F7F8FF", padding: 9, flexDirection: "row", alignItems: "center" },
  fileText: { flex: 1, marginLeft: 8 },
  fileName: { color: TEXT, fontSize: 10, fontWeight: "700" },
  fileMeta: { color: MUTED, fontSize: 8, fontWeight: "500", marginTop: 2 },
  removeFile: { width: 33, height: 33, borderRadius: 9, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  input: { minHeight: 47, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: SOFT, color: TEXT, paddingHorizontal: 12 },
  packageCard: { minHeight: 66, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: PRIMARY_LIGHT, padding: 11, flexDirection: "row", alignItems: "center" },
  packageText: { flex: 1, marginLeft: 9, paddingRight: 7 },
  packageTitle: { color: PRIMARY_DARK, fontSize: 11, fontWeight: "800" },
  packageHelper: { color: PRIMARY_DARK, fontSize: 8.5, fontWeight: "500", lineHeight: 13, marginTop: 3 },
  noteInput: { minHeight: 85, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: SOFT, color: TEXT, padding: 12 },
  infoPanel: { backgroundColor: PRIMARY_LIGHT, borderRadius: 12, padding: 11, flexDirection: "row", alignItems: "flex-start", marginBottom: 13 },
  infoText: { flex: 1, color: PRIMARY_DARK, fontSize: 10, fontWeight: "600", lineHeight: 16, marginLeft: 8 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: SURFACE, paddingHorizontal: 16, paddingTop: 12, flexDirection: "row" },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: SOFT, alignItems: "center", justifyContent: "center", marginRight: 6 },
  cancelText: { color: TEXT, fontSize: 12, fontWeight: "700" },
  sendButton: { flex: 1.4, minHeight: 48, borderRadius: 12, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", marginLeft: 6 },
  sendText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginLeft: 6 },
  disabled: { opacity: 0.5 },
});

export default PharmacyRequestScreen;