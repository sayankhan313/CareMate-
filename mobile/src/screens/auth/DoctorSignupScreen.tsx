import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
  type DocumentPickerResponse,
} from "@react-native-documents/picker";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  FileText,
  ShieldCheck,
  Stethoscope,
  UploadCloud,
} from "lucide-react-native";

import { API_BASE_URL } from "../../constants/api";
import type { RootStackParamList } from "../../types/navigation";

type DoctorSignupScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "DoctorSignup"
>;

type DoctorDocumentKey =
  | "gmcDocument"
  | "photoIdDocument"
  | "qualificationDocument";

type DoctorSignupForm = {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  gmcNumber: string;
  specialization: string;
  clinicName: string;
  clinicAddress: string;
  yearsExperience: string;
  bio: string;
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const DOCTOR_PRIMARY = "#7C3AED";
const DOCTOR_DARK = "#5B21B6";
const DOCTOR_LIGHT = "#F3E8FF";

const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#F6A545";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const initialForm: DoctorSignupForm = {
  fullName: "",
  email: "",
  password: "",
  phoneNumber: "",
  gmcNumber: "",
  specialization: "",
  clinicName: "",
  clinicAddress: "",
  yearsExperience: "",
  bio: "",
};

const getApiMessage = (result: any) => {
  if (typeof result?.message === "string") {
    return result.message;
  }

  if (Array.isArray(result?.message)) {
    return result.message[0]?.message || "Doctor registration failed.";
  }

  if (Array.isArray(result?.errors)) {
    return result.errors[0]?.message || "Doctor registration failed.";
  }

  return "Doctor registration failed.";
};

const getDocumentLabel = (key: DoctorDocumentKey) => {
  if (key === "gmcDocument") {
    return "GMC Registration Proof";
  }

  if (key === "photoIdDocument") {
    return "Photo ID Proof";
  }

  return "Qualification / Work Proof";
};

const getDocumentHint = (key: DoctorDocumentKey) => {
  if (key === "gmcDocument") {
    return "GMC register proof PDF, screenshot or certificate.";
  }

  if (key === "photoIdDocument") {
    return "Passport, driving licence or BRP document.";
  }

  return "Medical qualification certificate or employment proof.";
};

export const DoctorSignupScreen = ({
  navigation,
}: DoctorSignupScreenProps) => {
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState<DoctorSignupForm>(initialForm);
  const [documents, setDocuments] = useState<
    Record<DoctorDocumentKey, DocumentPickerResponse | null>
  >({
    gmcDocument: null,
    photoIdDocument: null,
    qualificationDocument: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (key: keyof DoctorSignupForm, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

 const pickDocument = async (key: DoctorDocumentKey) => {
  try {
    const selectedFiles = await pick({
      type: [types.pdf, types.images],
      allowMultiSelection: false,
    });

    const selectedFile = selectedFiles[0];

    if (!selectedFile) {
      return;
    }

    setDocuments((current) => ({
      ...current,
      [key]: selectedFile,
    }));
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      error.code === errorCodes.OPERATION_CANCELED
    ) {
      return;
    }

    Alert.alert("Unable to select file", "Please choose a PDF, JPG or PNG.");
  }
};

  const validateForm = () => {
    if (!form.fullName.trim()) {
      return "Full name is required.";
    }

    if (!form.email.trim()) {
      return "Email is required.";
    }

    if (!form.password.trim() || form.password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (!form.phoneNumber.trim()) {
      return "Phone number is required.";
    }

    if (!form.gmcNumber.trim()) {
      return "GMC registration number is required.";
    }

    if (!form.specialization.trim()) {
      return "Specialisation is required.";
    }

    if (!form.clinicName.trim()) {
      return "Clinic or hospital name is required.";
    }

    if (!documents.gmcDocument) {
      return "Please upload GMC registration proof.";
    }

    if (!documents.photoIdDocument) {
      return "Please upload photo ID proof.";
    }

    if (!documents.qualificationDocument) {
      return "Please upload qualification or work proof.";
    }

    return "";
  };

  const appendText = (formData: FormData, key: string, value: string) => {
    const trimmedValue = value.trim();

    if (trimmedValue) {
      formData.append(key, trimmedValue);
    }
  };

const appendFile = (
  formData: FormData,
  key: DoctorDocumentKey,
  file: DocumentPickerResponse | null,
  fallbackName: string
) => {
  if (!file) {
    return;
  }

  formData.append(key, {
    uri: file.uri,
    name: file.name || fallbackName,
    type: file.type || "application/pdf",
  } as any);
};

  const submitDoctorSignup = async () => {
    const validationMessage = validateForm();

    if (validationMessage) {
      Alert.alert("Check details", validationMessage);
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();

      appendText(formData, "fullName", form.fullName);
      appendText(formData, "email", form.email.toLowerCase());
      appendText(formData, "password", form.password);
      appendText(formData, "phoneNumber", form.phoneNumber);
      appendText(formData, "gmcNumber", form.gmcNumber);
      appendText(formData, "specialization", form.specialization);
      appendText(formData, "clinicName", form.clinicName);
      appendText(formData, "clinicAddress", form.clinicAddress);
      appendText(formData, "yearsExperience", form.yearsExperience);
      appendText(formData, "bio", form.bio);

      appendFile(
        formData,
        "gmcDocument",
        documents.gmcDocument,
        "gmc-registration-proof.pdf"
      );
      appendFile(
        formData,
        "photoIdDocument",
        documents.photoIdDocument,
        "photo-id-proof.pdf"
      );
      appendFile(
        formData,
        "qualificationDocument",
        documents.qualificationDocument,
        "qualification-proof.pdf"
      );

      const response = await fetch(`${API_BASE_URL}/auth/register/doctor`, {
        method: "POST",
        body: formData,
      });

      let result: any = {};

      try {
        result = await response.json();
      } catch (error) {
        result = {};
      }

      if (!response.ok || !result.success) {
        throw new Error(getApiMessage(result));
      }

      Alert.alert(
        "Submitted for verification",
        "Please verify your email. After that, your doctor account will wait for admin approval.",
        [
          {
            text: "Continue",
            onPress: () =>
              navigation.navigate("EmailVerification", {
                email: form.email.trim().toLowerCase(),
              }),
          },
        ]
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit doctor registration.";

      Alert.alert("Registration failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
          >
            <ArrowLeft size={21} color={TEXT} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.appBarTextBlock}>
            <Text style={styles.appBarTitle}>Doctor Signup</Text>
            <Text style={styles.appBarSubtitle}>
              Submit details for admin verification
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom + 26, 38),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statusCard}>
            <View style={styles.statusIconBox}>
              <ShieldCheck size={18} color={WARNING} strokeWidth={2.6} />
            </View>

            <View style={styles.statusTextBlock}>
              <Text style={styles.statusTitle}>Account status</Text>
              <Text style={styles.statusText}>Pending Verification</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIconBox}>
                <Stethoscope
                  size={22}
                  color={DOCTOR_PRIMARY}
                  strokeWidth={2.5}
                />
              </View>

              <View style={styles.formHeaderText}>
                <Text style={styles.formTitle}>Professional details</Text>
                <Text style={styles.formSubtitle}>
                  These details help admin verify your doctor account.
                </Text>
              </View>
            </View>

            <FormInput
              label="Full name"
              value={form.fullName}
              placeholder="Dr. Full Name"
              onChangeText={(value) => updateField("fullName", value)}
            />

            <FormInput
              label="Email"
              value={form.email}
              placeholder="doctor@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={(value) => updateField("email", value)}
            />

            <FormInput
              label="Phone number"
              value={form.phoneNumber}
              placeholder="+44 7000 000000"
              keyboardType="phone-pad"
              onChangeText={(value) => updateField("phoneNumber", value)}
            />

            <FormInput
              label="Password"
              value={form.password}
              placeholder="Create a secure password"
              secureTextEntry
              onChangeText={(value) => updateField("password", value)}
            />

            <FormInput
              label="GMC registration number"
              value={form.gmcNumber}
              placeholder="GMC or registration number"
              autoCapitalize="characters"
              onChangeText={(value) => updateField("gmcNumber", value)}
            />

            <FormInput
              label="Specialisation"
              value={form.specialization}
              placeholder="General Practitioner"
              onChangeText={(value) => updateField("specialization", value)}
            />

            <FormInput
              label="Clinic / hospital name"
              value={form.clinicName}
              placeholder="Name of your practice"
              onChangeText={(value) => updateField("clinicName", value)}
            />

            <FormInput
              label="Clinic address"
              value={form.clinicAddress}
              placeholder="Leicester, UK"
              onChangeText={(value) => updateField("clinicAddress", value)}
            />

            <FormInput
              label="Years of experience"
              value={form.yearsExperience}
              placeholder="Years in practice"
              keyboardType="number-pad"
              onChangeText={(value) => updateField("yearsExperience", value)}
            />

            <FormInput
              label="Bio"
              value={form.bio}
              placeholder="Short professional summary"
              multiline
              onChangeText={(value) => updateField("bio", value)}
            />
          </View>

          <View style={styles.documentsCard}>
            <Text style={styles.documentsTitle}>Verification documents</Text>
            <Text style={styles.documentsSubtitle}>
              3 documents are required before admin can approve your account.
            </Text>

            <DocumentUploadRow
              documentKey="gmcDocument"
              file={documents.gmcDocument}
              icon={<FileText size={19} color={DOCTOR_PRIMARY} />}
              onPress={() => pickDocument("gmcDocument")}
            />

            <DocumentUploadRow
              documentKey="photoIdDocument"
              file={documents.photoIdDocument}
              icon={<ShieldCheck size={19} color={DOCTOR_PRIMARY} />}
              onPress={() => pickDocument("photoIdDocument")}
            />

            <DocumentUploadRow
              documentKey="qualificationDocument"
              file={documents.qualificationDocument}
              icon={<CheckCircle2 size={19} color={DOCTOR_PRIMARY} />}
              onPress={() => pickDocument("qualificationDocument")}
            />
          </View>

          <View style={styles.infoCard}>
            <ShieldCheck size={18} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
            <Text style={styles.infoText}>
              Doctor accounts require admin verification before accessing
              patient data.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting ? styles.disabledButton : undefined,
            ]}
            activeOpacity={0.88}
            onPress={submitDoctorSignup}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={SURFACE} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>
                  Submit for Verification
                </Text>
                <ChevronRight size={19} color={SURFACE} strokeWidth={2.8} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const FormInput = ({
  label,
  value,
  placeholder,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
}) => {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        style={[styles.input, multiline ? styles.multilineInput : undefined]}
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#A7B0C2"
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
};

const DocumentUploadRow = ({
  documentKey,
  file,
  icon,
  onPress,
}: {
  documentKey: DoctorDocumentKey;
  file: DocumentPickerResponse | null;
  icon: ReactNode;
  onPress: () => void;
}) => {
  const isUploaded = Boolean(file);

  return (
    <TouchableOpacity
      style={styles.documentRow}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <View style={styles.documentIconBox}>{icon}</View>

      <View style={styles.documentTextBlock}>
        <View style={styles.documentTitleRow}>
          <Text style={styles.documentTitle}>{getDocumentLabel(documentKey)}</Text>

          <View
            style={[
              styles.requiredPill,
              isUploaded ? styles.uploadedPill : undefined,
            ]}
          >
            <Text
              style={[
                styles.requiredPillText,
                isUploaded ? styles.uploadedPillText : undefined,
              ]}
            >
              {isUploaded ? "Uploaded" : "Required"}
            </Text>
          </View>
        </View>

        <Text style={styles.documentHint} numberOfLines={2}>
          {file?.name || getDocumentHint(documentKey)}
        </Text>
      </View>

      <View style={styles.uploadIconCircle}>
        <UploadCloud
          size={18}
          color={isUploaded ? SUCCESS : DOCTOR_PRIMARY}
          strokeWidth={2.6}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  appBar: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BACKGROUND,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 12,
  },
  appBarTextBlock: {
    flex: 1,
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  statusCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  statusIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: WARNING_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  statusTextBlock: {
    flex: 1,
  },
  statusTitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
  },
  statusText: {
    color: "#A85A13",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },
  formCard: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  formIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  formHeaderText: {
    flex: 1,
  },
  formTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
  },
  formSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3,
  },
  inputGroup: {
    marginBottom: 13,
  },
  inputLabel: {
    color: "#64708A",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
  },
  input: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },
  multilineInput: {
    minHeight: 88,
    paddingTop: 13,
    lineHeight: 20,
  },
  documentsCard: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  documentsTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  documentsSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: 12,
  },
  documentRow: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  documentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  documentTextBlock: {
    flex: 1,
  },
  documentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  documentTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
    marginRight: 8,
  },
  requiredPill: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  requiredPillText: {
    color: "#B42318",
    fontSize: 8,
    fontWeight: "900",
  },
  uploadedPill: {
    backgroundColor: SUCCESS_LIGHT,
  },
  uploadedPillText: {
    color: "#167A58",
  },
  documentHint: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  uploadIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoCard: {
    backgroundColor: DOCTOR_LIGHT,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    color: DOCTOR_DARK,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: DOCTOR_PRIMARY,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  disabledButton: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "900",
    marginRight: 7,
  },
});