import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Droplet,
  HeartPulse,
  Hash,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedTextInput as TextInput } from "../../components/common/LocalizedTextInput";
import { LocalizedAlert as Alert } from "../../utils/localizedAlert";

import {
  patientProfileApi,
  type PatientGenderInput,
  type PatientProfileData,
  type UpdatePatientProfilePayload,
} from "../../services/patientProfileApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "EditPatientProfile">;

type GenderOption = {
  label: string;
  value: PatientGenderInput;
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
const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const GENDER_OPTIONS: GenderOption[] = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
  { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
];

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const getSafeString = (value: unknown) => typeof value === "string" ? value.trim() : "";

const getNullableValue = (value: string) => {
  const normalized = value.trim();
  return normalized || null;
};

const normalizeGender = (value?: string | null): PatientGenderInput | null => {
  const normalized = getSafeString(value).toUpperCase().replace(/\s+/g, "_");

  if (normalized === "MALE") return "MALE";
  if (normalized === "FEMALE") return "FEMALE";
  if (normalized === "OTHER") return "OTHER";
  if (normalized === "PREFER_NOT_TO_SAY") return "PREFER_NOT_TO_SAY";

  return null;
};

const isValidDateOfBirth = (value: string) => {
  const normalized = value.trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    const [day, month, year] = normalized.split("/").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCDate() === day && date.getUTCMonth() === month - 1 && date.getUTCFullYear() === year && date <= new Date();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCDate() === day && date.getUTCMonth() === month - 1 && date.getUTCFullYear() === year && date <= new Date();
  }

  return false;
};

const EditPatientProfileScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<PatientGenderInput | null>(null);
  const [healthRecordNumber, setHealthRecordNumber] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [postcode, setPostcode] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const applyProfile = useCallback((patient: PatientProfileData) => {
    setProfile(patient);
    setFullName(getSafeString(patient.fullName));
    setEmail(getSafeString(patient.email));
    setPhoneNumber(getSafeString(patient.phoneNumber || patient.phone));
    setDateOfBirth(getSafeString(patient.dateOfBirth));
    setGender(normalizeGender(patient.gender));
    setHealthRecordNumber(getSafeString(patient.healthRecordNumber));
    setMedicalConditions(Array.isArray(patient.medicalConditions) ? patient.medicalConditions.join(", ") : getSafeString(patient.medicalConditions));
    setAllergies(getSafeString(patient.allergies));
    setBloodGroup(getSafeString(patient.bloodGroup));
    setEmergencyContactName(getSafeString(patient.emergencyContactName));
    setEmergencyContactPhone(getSafeString(patient.emergencyContactPhone));
    setAddressLine(getSafeString(patient.addressLine));
    setPostcode(getSafeString(patient.postcode));
  }, []);

  const loadProfile = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await patientProfileApi.getProfile();

      applyProfile(result.patient);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load patient profile.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [applyProfile]);

  useFocusEffect(useCallback(() => {
    void loadProfile("initial");
  }, [loadProfile]));

  const validateForm = () => {
    if (fullName.trim().length < 2) return "Full name must contain at least 2 characters.";
    if (phoneNumber.trim().length < 7) return "Enter a valid phone number.";
    if (!isValidDateOfBirth(dateOfBirth)) return "Date of birth must use DD/MM/YYYY format and cannot be in the future.";
    if (healthRecordNumber.trim().length > 30) return "Health record number must not exceed 30 characters.";
    if (bloodGroup.trim().length > 10) return "Blood group must not exceed 10 characters.";
    if (postcode.trim().length > 15) return "Postcode must not exceed 15 characters.";

    return "";
  };

  const saveProfile = async () => {
    const validationMessage = validateForm();

    if (validationMessage) {
      Alert.alert("Check profile details", validationMessage);
      return;
    }

    const payload: UpdatePatientProfilePayload = {
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      dateOfBirth: dateOfBirth.trim(),
      gender,
      healthRecordNumber: getNullableValue(healthRecordNumber),
      medicalConditions: getNullableValue(medicalConditions),
      allergies: getNullableValue(allergies),
      bloodGroup: getNullableValue(bloodGroup.toUpperCase()),
      emergencyContactName: getNullableValue(emergencyContactName),
      emergencyContactPhone: getNullableValue(emergencyContactPhone),
      addressLine: getNullableValue(addressLine),
      postcode: getNullableValue(postcode.toUpperCase()),
    };

    try {
      setIsSaving(true);

      const result = await patientProfileApi.updateProfile(payload);

      applyProfile(result.patient);

      Alert.alert("Profile updated", "Your personal and health profile details have been saved.", [
        {
          text: "Done",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert("Unable to update profile", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.headerButton} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.7} />
          </TouchableOpacity>

          <View style={styles.appBarTextBlock}>
            <Text style={styles.appBarTitle}>Edit Profile</Text>
            <Text style={styles.appBarSubtitle}>Update personal and health details</Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(34, insets.bottom + 24) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadProfile("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading profile</Text>
              <Text style={styles.stateText}>Fetching your latest personal and health information.</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <AlertCircle size={23} color={DANGER_DARK} strokeWidth={2.6} />

              <View style={styles.errorTextBlock}>
                <Text style={styles.errorTitle}>Profile unavailable</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>

                <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => void loadProfile("initial")}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {!isLoading && !errorMessage && profile ? (
            <>
              <View style={styles.heroCard}>
                <View style={styles.heroIcon}>
                  <ShieldCheck size={27} color={PRIMARY} strokeWidth={2.6} />
                </View>

                <View style={styles.heroTextBlock}>
                  <Text style={styles.heroTitle}>Complete your health profile</Text>
                  <Text style={styles.heroText}>These details help your assigned care team understand your basic health information.</Text>
                </View>
              </View>

              <FormSection title="Personal details" subtitle="Your basic account information">
                <FormField
                  label="Full name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter full name"
                  icon={<UserRound size={19} color={PRIMARY} strokeWidth={2.5} />}
                  maxLength={100}
                  autoCapitalize="words"
                />

                <FormField
                  label="Email address"
                  value={email}
                  onChangeText={() => undefined}
                  placeholder="Email address"
                  icon={<Hash size={19} color={MUTED} strokeWidth={2.5} />}
                  editable={false}
                  helperText="Email cannot be changed from the profile."
                />

                <FormField
                  label="Phone number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter phone number"
                  icon={<Phone size={19} color={PRIMARY} strokeWidth={2.5} />}
                  keyboardType="phone-pad"
                  maxLength={25}
                />

                <FormField
                  label="Date of birth"
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="DD/MM/YYYY"
                  icon={<Calendar size={19} color={PRIMARY} strokeWidth={2.5} />}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  helperText="Use DD/MM/YYYY format."
                />

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Gender</Text>

                  <View style={styles.genderOptions}>
                    {GENDER_OPTIONS.map((option) => {
                      const selected = gender === option.value;

                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.genderOption, selected ? styles.genderOptionSelected : undefined]}
                          activeOpacity={0.84}
                          onPress={() => setGender(option.value)}
                        >
                          <Text style={[styles.genderOptionText, selected ? styles.genderOptionTextSelected : undefined]}>{option.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </FormSection>

              <FormSection title="Health details" subtitle="Optional health information that can be updated later">
                <FormField
                  label="NHS / Health Record Number"
                  value={healthRecordNumber}
                  onChangeText={setHealthRecordNumber}
                  placeholder="Enter health record number"
                  icon={<Hash size={19} color={PRIMARY} strokeWidth={2.5} />}
                  maxLength={30}
                  autoCapitalize="characters"
                  helperText="For this prototype, use only test or demonstration data."
                />

                <FormField
                  label="Blood group"
                  value={bloodGroup}
                  onChangeText={setBloodGroup}
                  placeholder="For example O+"
                  icon={<Droplet size={19} color={PRIMARY} strokeWidth={2.5} />}
                  maxLength={10}
                  autoCapitalize="characters"
                />

                <FormField
                  label="Medical conditions"
                  value={medicalConditions}
                  onChangeText={setMedicalConditions}
                  placeholder="For example asthma, diabetes"
                  icon={<HeartPulse size={19} color={PRIMARY} strokeWidth={2.5} />}
                  multiline
                  maxLength={1000}
                />

                <FormField
                  label="Allergies"
                  value={allergies}
                  onChangeText={setAllergies}
                  placeholder="For example penicillin"
                  icon={<AlertCircle size={19} color={PRIMARY} strokeWidth={2.5} />}
                  multiline
                  maxLength={1000}
                />
              </FormSection>

              <FormSection title="Emergency contact" subtitle="A trusted person who may be contacted in an emergency">
                <FormField
                  label="Contact name"
                  value={emergencyContactName}
                  onChangeText={setEmergencyContactName}
                  placeholder="Enter emergency contact name"
                  icon={<UserRound size={19} color={PRIMARY} strokeWidth={2.5} />}
                  maxLength={100}
                  autoCapitalize="words"
                />

                <FormField
                  label="Contact phone"
                  value={emergencyContactPhone}
                  onChangeText={setEmergencyContactPhone}
                  placeholder="Enter emergency contact phone"
                  icon={<Phone size={19} color={PRIMARY} strokeWidth={2.5} />}
                  keyboardType="phone-pad"
                  maxLength={25}
                />
              </FormSection>

              <FormSection title="Address" subtitle="Your current contact address">
                <FormField
                  label="Address"
                  value={addressLine}
                  onChangeText={setAddressLine}
                  placeholder="Enter address"
                  icon={<MapPin size={19} color={PRIMARY} strokeWidth={2.5} />}
                  multiline
                  maxLength={250}
                  autoCapitalize="words"
                />

                <FormField
                  label="Postcode"
                  value={postcode}
                  onChangeText={setPostcode}
                  placeholder="Enter postcode"
                  icon={<MapPin size={19} color={PRIMARY} strokeWidth={2.5} />}
                  maxLength={15}
                  autoCapitalize="characters"
                />
              </FormSection>

              <TouchableOpacity
                style={[styles.saveButton, isSaving ? styles.saveButtonDisabled : undefined]}
                activeOpacity={0.85}
                onPress={saveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={SURFACE} />
                ) : (
                  <>
                    <Save size={19} color={SURFACE} strokeWidth={2.6} />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const FormSection = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.sectionFields}>{children}</View>
    </View>
  );
};

const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = "default",
  multiline,
  editable = true,
  maxLength,
  autoCapitalize = "sentences",
  helperText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  editable?: boolean;
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  helperText?: string;
}) => {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <View style={[styles.inputContainer, multiline ? styles.inputContainerMultiline : undefined, !editable ? styles.inputContainerDisabled : undefined]}>
        <View style={[styles.inputIcon, multiline ? styles.inputIconMultiline : undefined]}>{icon}</View>

        <TextInput
          style={[styles.textInput, multiline ? styles.textInputMultiline : undefined]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A2A9B8"
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          editable={editable}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
        />
      </View>

      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
};

export default EditPatientProfileScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  appBar: { paddingHorizontal: 16, paddingTop: 9, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", overflow: "hidden", ...elevate(1) },
  appBarTextBlock: { flex: 1, paddingHorizontal: 12 },
  appBarTitle: { color: TEXT, fontSize: 23, fontWeight: "700" },
  appBarSubtitle: { color: MUTED, fontSize: 12, fontWeight: "500", marginTop: 3 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 3 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 28, alignItems: "center", ...elevate(1) },
  stateTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 13 },
  stateText: { color: MUTED, fontSize: 12, fontWeight: "500", lineHeight: 18, textAlign: "center", marginTop: 5 },
  errorCard: { backgroundColor: DANGER_LIGHT, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "flex-start" },
  errorTextBlock: { flex: 1, marginLeft: 11 },
  errorTitle: { color: DANGER_DARK, fontSize: 15, fontWeight: "700" },
  errorText: { color: DANGER_DARK, fontSize: 12, fontWeight: "500", lineHeight: 18, marginTop: 4 },
  retryButton: { alignSelf: "flex-start", backgroundColor: DANGER, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9, marginTop: 10 },
  retryText: { color: SURFACE, fontSize: 12, fontWeight: "700" },
  heroCard: { backgroundColor: PRIMARY, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 12, ...elevate(2) },
  heroIcon: { width: 52, height: 52, borderRadius: 15, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  heroTextBlock: { flex: 1 },
  heroTitle: { color: SURFACE, fontSize: 17, fontWeight: "700" },
  heroText: { color: "#E9F0FF", fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 4 },
  sectionCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, marginBottom: 12, ...elevate(1) },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "700" },
  sectionSubtitle: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 4 },
  sectionFields: { marginTop: 15 },
  fieldBlock: { marginBottom: 15 },
  fieldLabel: { color: TEXT, fontSize: 12, fontWeight: "700", marginBottom: 7 },
  inputContainer: { minHeight: 50, borderRadius: 13, backgroundColor: SOFT_PANEL, borderWidth: 1, borderColor: BORDER, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  inputContainerMultiline: { minHeight: 116, alignItems: "flex-start" },
  inputContainerDisabled: { opacity: 0.65 },
  inputIcon: { width: 45, alignItems: "center", justifyContent: "center" },
  inputIconMultiline: { paddingTop: 15 },
  textInput: { flex: 1, minHeight: 50, color: TEXT, fontSize: 13, fontWeight: "500", paddingVertical: 10, paddingRight: 12 },
  textInputMultiline: { minHeight: 112, paddingTop: 14 },
  helperText: { color: MUTED, fontSize: 10, fontWeight: "500", lineHeight: 15, marginTop: 5 },
  genderOptions: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  genderOption: { minHeight: 40, borderRadius: 11, backgroundColor: SOFT_PANEL, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, margin: 4 },
  genderOptionSelected: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  genderOptionText: { color: MUTED, fontSize: 11, fontWeight: "600" },
  genderOptionTextSelected: { color: PRIMARY_DARK, fontWeight: "700" },
  saveButton: { minHeight: 52, borderRadius: 14, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", overflow: "hidden", ...elevate(2) },
  saveButtonDisabled: { opacity: 0.55 },
  saveButtonText: { color: SURFACE, fontSize: 14, fontWeight: "700", marginLeft: 8 },
});