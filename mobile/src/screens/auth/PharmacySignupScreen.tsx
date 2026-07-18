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
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileCheck2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react-native";

import { API_BASE_URL } from "../../constants/api";
import type { RootStackParamList } from "../../types/navigation";

type PharmacySignupScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "PharmacySignup"
>;

type PharmacySignupForm = {
  staffName: string;
  pharmacyName: string;
  email: string;
  phoneNumber: string;
  registrationNumber: string;
  licenseNumber: string;
  address: string;
  city: string;
  postcode: string;
  password: string;
  confirmPassword: string;
};

type InputConfig = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: ReactNode;
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const PHARMACY = "#16A34A";
const PHARMACY_DARK = "#0F6B3A";
const PHARMACY_CONTAINER = "#ECFDF3";
const ON_PHARMACY_CONTAINER = "#064E3B";

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.07 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: {
    width: 0,
    height: level,
  },
});

const initialForm: PharmacySignupForm = {
  staffName: "",
  pharmacyName: "",
  email: "",
  phoneNumber: "",
  registrationNumber: "",
  licenseNumber: "",
  address: "",
  city: "",
  postcode: "",
  password: "",
  confirmPassword: "",
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Something went wrong.";
};

export const PharmacySignupScreen = ({
  navigation,
}: PharmacySignupScreenProps) => {
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState<PharmacySignupForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (key: keyof PharmacySignupForm, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  };

  const validateForm = () => {
    const email = form.email.trim().toLowerCase();

    if (!form.staffName.trim()) {
      Alert.alert(
        "Missing staff name",
        "Please enter the responsible staff name."
      );
      return false;
    }

    if (!form.pharmacyName.trim()) {
      Alert.alert("Missing pharmacy name", "Please enter the pharmacy name.");
      return false;
    }

    if (!email || !email.includes("@")) {
      Alert.alert(
        "Invalid email",
        "Please enter a valid pharmacy email address."
      );
      return false;
    }

    if (!form.phoneNumber.trim()) {
      Alert.alert("Missing phone number", "Please enter pharmacy phone number.");
      return false;
    }

    if (!form.registrationNumber.trim()) {
      Alert.alert(
        "Missing registration number",
        "Please enter pharmacy registration number."
      );
      return false;
    }

    if (!form.licenseNumber.trim()) {
      Alert.alert(
        "Missing licence number",
        "Please enter pharmacy licence number."
      );
      return false;
    }

    if (!form.address.trim() || !form.city.trim() || !form.postcode.trim()) {
      Alert.alert(
        "Missing address",
        "Please enter pharmacy address, city and postcode."
      );
      return false;
    }

    if (form.password.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters.");
      return false;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert(
        "Password mismatch",
        "Password and confirm password do not match."
      );
      return false;
    }

    return true;
  };

  const openEmailVerificationScreen = (email: string) => {
    navigation.replace("EmailVerification", {
      email,
    });
  };

  const resendVerificationEmail = async (email: string) => {
    const resendResponse = await fetch(
      `${API_BASE_URL}/auth/resend-verification-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      }
    );

    const resendJson = await resendResponse.json();

    if (!resendResponse.ok || !resendJson.success) {
      throw new Error(
        resendJson.message || "Could not resend verification email."
      );
    }

    Alert.alert(
      "Verification email sent",
      "This email is already registered, so we sent a new verification email. Please check your inbox.",
      [
        {
          text: "OK",
          onPress: () => openEmailVerificationScreen(email),
        },
      ]
    );
  };

  const submitSignup = async () => {
    if (!validateForm() || isSubmitting) {
      return;
    }

    const email = form.email.trim().toLowerCase();

    try {
      setIsSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: form.staffName.trim(),
          email,
          password: form.password,
          role: "PHARMACY",

          phoneNumber: form.phoneNumber.trim(),
          staffName: form.staffName.trim(),
          pharmacyName: form.pharmacyName.trim(),
          registrationNumber: form.registrationNumber.trim(),
          licenseNumber: form.licenseNumber.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          postcode: form.postcode.trim().toUpperCase(),
          pharmacyEmail: email,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || "Pharmacy signup failed.");
      }

      Alert.alert(
        "Registration submitted",
        "Please verify your email first. After email verification, admin approval is required before pharmacy access.",
        [
          {
            text: "OK",
            onPress: () => openEmailVerificationScreen(email),
          },
        ]
      );
    } catch (error) {
      const message = getErrorMessage(error);

      if (message.toLowerCase().includes("already registered")) {
        try {
          await resendVerificationEmail(email);
          return;
        } catch (resendError) {
          Alert.alert("Signup failed", getErrorMessage(resendError));
          return;
        }
      }

      Alert.alert("Signup failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    icon,
    keyboardType = "default",
    secureTextEntry = false,
    autoCapitalize = "sentences",
    multiline = false,
  }: InputConfig) => {
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>

        <View
          style={[
            styles.inputShell,
            multiline ? styles.textAreaShell : undefined,
          ]}
        >
          <View style={styles.inputIconBox}>{icon}</View>

          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9AA2B6"
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : "center"}
            style={[styles.input, multiline ? styles.textArea : undefined]}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backIconButton}
            activeOpacity={0.82}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
          >
            <ArrowLeft size={20} color={TEXT} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.topTitleBlock}>
            <Text style={styles.kicker}>CareMate+ registration</Text>
            <Text style={styles.topTitle}>Pharmacy Signup</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: Math.max(insets.bottom + 28, 42),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIconBox}>
              <Store size={28} color={PHARMACY} strokeWidth={2.6} />
            </View>

            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>Register pharmacy account</Text>
              <Text style={styles.heroSubtitle}>
                Submit pharmacy details for admin verification before accessing
                fulfilment workflows.
              </Text>
            </View>
          </View>

          <View style={styles.noticeCard}>
            <ShieldCheck
              size={18}
              color={ON_PHARMACY_CONTAINER}
              strokeWidth={2.6}
            />
            <Text style={styles.noticeText}>
              This account will remain pending until admin reviews the pharmacy
              registration and licence details.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Responsible staff</Text>

            {renderInput({
              label: "Staff name",
              value: form.staffName,
              onChangeText: (value) => updateField("staffName", value),
              placeholder: "Enter responsible staff name",
              icon: (
                <UserRound
                  size={18}
                  color={ON_PHARMACY_CONTAINER}
                  strokeWidth={2.4}
                />
              ),
              autoCapitalize: "words",
            })}

            {renderInput({
              label: "Email address",
              value: form.email,
              onChangeText: (value) => updateField("email", value),
              placeholder: "pharmacy@example.com",
              icon: (
                <Mail
                  size={18}
                  color={ON_PHARMACY_CONTAINER}
                  strokeWidth={2.4}
                />
              ),
              keyboardType: "email-address",
              autoCapitalize: "none",
            })}

            {renderInput({
              label: "Phone number",
              value: form.phoneNumber,
              onChangeText: (value) => updateField("phoneNumber", value),
              placeholder: "Enter contact number",
              icon: (
                <Phone
                  size={18}
                  color={ON_PHARMACY_CONTAINER}
                  strokeWidth={2.4}
                />
              ),
              keyboardType: "phone-pad",
            })}

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Pharmacy details</Text>

            {renderInput({
              label: "Pharmacy name",
              value: form.pharmacyName,
              onChangeText: (value) => updateField("pharmacyName", value),
              placeholder: "Enter pharmacy name",
              icon: (
                <Building2
                  size={18}
                  color={ON_PHARMACY_CONTAINER}
                  strokeWidth={2.4}
                />
              ),
              autoCapitalize: "words",
            })}

            {renderInput({
              label: "Registration number",
              value: form.registrationNumber,
              onChangeText: (value) =>
                updateField("registrationNumber", value),
              placeholder: "Enter registration number",
              icon: (
                <FileCheck2
                  size={18}
                  color={ON_PHARMACY_CONTAINER}
                  strokeWidth={2.4}
                />
              ),
              autoCapitalize: "characters",
            })}

            {renderInput({
              label: "Licence number",
              value: form.licenseNumber,
              onChangeText: (value) => updateField("licenseNumber", value),
              placeholder: "Enter licence number",
              icon: (
                <CheckCircle2
                  size={18}
                  color={ON_PHARMACY_CONTAINER}
                  strokeWidth={2.4}
                />
              ),
              autoCapitalize: "characters",
            })}

            {renderInput({
              label: "Address",
              value: form.address,
              onChangeText: (value) => updateField("address", value),
              placeholder: "Enter pharmacy address",
              icon: (
                <MapPin
                  size={18}
                  color={ON_PHARMACY_CONTAINER}
                  strokeWidth={2.4}
                />
              ),
              multiline: true,
            })}

            {renderInput({
              label: "City",
              value: form.city,
              onChangeText: (value) => updateField("city", value),
              placeholder: "Enter city",
              icon: (
                <MapPin
                  size={18}
                  color={ON_PHARMACY_CONTAINER}
                  strokeWidth={2.4}
                />
              ),
              autoCapitalize: "words",
            })}

            {renderInput({
              label: "Postcode",
              value: form.postcode,
              onChangeText: (value) => updateField("postcode", value),
              placeholder: "Enter postcode",
              icon: (
                <MapPin
                  size={18}
                  color={ON_PHARMACY_CONTAINER}
                  strokeWidth={2.4}
                />
              ),
              autoCapitalize: "characters",
            })}

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Security</Text>

            {renderInput({
              label: "Password",
              value: form.password,
              onChangeText: (value) => updateField("password", value),
              placeholder: "Create password",
              icon: (
                <ShieldCheck
                  size={18}
                  color={ON_PHARMACY_CONTAINER}
                  strokeWidth={2.4}
                />
              ),
              secureTextEntry: true,
              autoCapitalize: "none",
            })}

            {renderInput({
              label: "Confirm password",
              value: form.confirmPassword,
              onChangeText: (value) => updateField("confirmPassword", value),
              placeholder: "Confirm password",
              icon: (
                <ShieldCheck
                  size={18}
                  color={ON_PHARMACY_CONTAINER}
                  strokeWidth={2.4}
                />
              ),
              secureTextEntry: true,
              autoCapitalize: "none",
            })}

            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting ? styles.disabledButton : undefined,
              ]}
              activeOpacity={0.88}
              onPress={submitSignup}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Submit for Verification
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginLinkButton}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.82}
            disabled={isSubmitting}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? Login
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  keyboardView: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: BACKGROUND,
  },
  backIconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    ...elevate(2),
  },
  topTitleBlock: {
    flex: 1,
    paddingLeft: 12,
  },
  kicker: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  topTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    paddingHorizontal: 18,
  },
  heroCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    ...elevate(2),
  },
  heroIconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: PHARMACY_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  heroSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
  noticeCard: {
    backgroundColor: PHARMACY_CONTAINER,
    borderRadius: 16,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  noticeText: {
    flex: 1,
    color: ON_PHARMACY_CONTAINER,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginLeft: 9,
  },
  formCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 16,
    ...elevate(2),
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 13,
  },
  label: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },
  inputShell: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: SOFT_PANEL,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  textAreaShell: {
    minHeight: 88,
    alignItems: "flex-start",
    paddingTop: 12,
  },
  inputIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PHARMACY_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 0,
  },
  textArea: {
    minHeight: 64,
    paddingTop: 5,
    paddingBottom: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginVertical: 6,
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: PHARMACY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    ...elevate(2),
  },
  disabledButton: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  loginLinkButton: {
    alignItems: "center",
    paddingVertical: 16,
  },
  loginLinkText: {
    color: PHARMACY_DARK,
    fontSize: 13,
    fontWeight: "700",
  },
});