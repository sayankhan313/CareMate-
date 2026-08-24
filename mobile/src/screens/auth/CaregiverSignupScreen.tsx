import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChevronLeft, Eye, EyeOff, ShieldCheck, UsersRound } from "lucide-react-native";

import { API_BASE_URL } from "../../constants/api";
import type { RootStackParamList } from "../../types/navigation";

type CaregiverSignupScreenProps = NativeStackScreenProps<RootStackParamList, "CaregiverSignup">;

type CaregiverSignupForm = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const INPUT_BACKGROUND = "#F8F9FC";
const CAREGIVER_PRIMARY = "#F6A545";
const CAREGIVER_LIGHT = "#FFF3E2";
const CAREGIVER_DARK = "#8A520E";
const DANGER = "#DC4C57";

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.07 + level * 0.01,
  shadowRadius: level * 1.5,
  shadowOffset: { width: 0, height: level * 0.8 },
});

export const CaregiverSignupScreen = ({ navigation }: CaregiverSignupScreenProps) => {
  const insets = useSafeAreaInsets();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CaregiverSignupForm>({
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const password = watch("password");

  const onSubmit = async (data: CaregiverSignupForm) => {
    try {
      const email = data.email.trim().toLowerCase();

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: data.fullName.trim(), email, password: data.password, role: "CAREGIVER" }),
      });

      let result: any = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok || !result.success) throw new Error(result.message || "Unable to create your account.");

      navigation.replace("EmailVerification", { email });
    } catch (error) {
      Alert.alert("Couldn't create account", error instanceof Error ? error.message : "Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom + 28, 40) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.82} onPress={() => navigation.goBack()} disabled={isSubmitting}>
            <ChevronLeft size={23} color={TEXT} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <UsersRound size={30} color={CAREGIVER_PRIMARY} strokeWidth={2.5} />
          </View>

          <Text style={styles.title}>Create caregiver account</Text>
          <Text style={styles.subtitle}>Support the people you care for.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Full name</Text>

          <Controller
            control={control}
            name="fullName"
            rules={{
              required: "Full name is required.",
              minLength: { value: 2, message: "Enter your full name." },
            }}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Full name"
                placeholderTextColor="#98A2B3"
                autoCapitalize="words"
                editable={!isSubmitting}
                style={[styles.input, errors.fullName ? styles.inputError : undefined]}
              />
            )}
          />

          {errors.fullName ? <Text style={styles.errorText}>{errors.fullName.message}</Text> : null}

          <Text style={styles.label}>Email address</Text>

          <Controller
            control={control}
            name="email"
            rules={{
              required: "Email is required.",
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address." },
            }}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Email address"
                placeholderTextColor="#98A2B3"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isSubmitting}
                style={[styles.input, errors.email ? styles.inputError : undefined]}
              />
            )}
          />

          {errors.email ? <Text style={styles.errorText}>{errors.email.message}</Text> : null}

          <Text style={styles.label}>Password</Text>

          <Controller
            control={control}
            name="password"
            rules={{
              required: "Password is required.",
              minLength: { value: 8, message: "Use at least 8 characters." },
            }}
            render={({ field: { value, onChange, onBlur } }) => (
              <View style={[styles.passwordContainer, errors.password ? styles.inputError : undefined]}>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Password"
                  placeholderTextColor="#98A2B3"
                  secureTextEntry={!showPassword}
                  editable={!isSubmitting}
                  style={styles.passwordInput}
                />

                <TouchableOpacity style={styles.eyeButton} activeOpacity={0.75} onPress={() => setShowPassword(current => !current)}>
                  {showPassword ? <EyeOff size={19} color={MUTED} strokeWidth={2.3} /> : <Eye size={19} color={MUTED} strokeWidth={2.3} />}
                </TouchableOpacity>
              </View>
            )}
          />

          {errors.password ? <Text style={styles.errorText}>{errors.password.message}</Text> : null}

          <Text style={styles.label}>Confirm password</Text>

          <Controller
            control={control}
            name="confirmPassword"
            rules={{
              required: "Confirm your password.",
              validate: value => value === password || "Passwords do not match.",
            }}
            render={({ field: { value, onChange, onBlur } }) => (
              <View style={[styles.passwordContainer, errors.confirmPassword ? styles.inputError : undefined]}>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Confirm password"
                  placeholderTextColor="#98A2B3"
                  secureTextEntry={!showConfirmPassword}
                  editable={!isSubmitting}
                  style={styles.passwordInput}
                />

                <TouchableOpacity style={styles.eyeButton} activeOpacity={0.75} onPress={() => setShowConfirmPassword(current => !current)}>
                  {showConfirmPassword ? <EyeOff size={19} color={MUTED} strokeWidth={2.3} /> : <Eye size={19} color={MUTED} strokeWidth={2.3} />}
                </TouchableOpacity>
              </View>
            )}
          />

          {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword.message}</Text> : null}

          <TouchableOpacity style={[styles.createButton, isSubmitting ? styles.disabledButton : undefined]} activeOpacity={0.88} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color={SURFACE} /> : <Text style={styles.createButtonText}>Create account</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.permissionNote}>
          <View style={styles.permissionIcon}>
            <ShieldCheck size={17} color={CAREGIVER_PRIMARY} strokeWidth={2.5} />
          </View>
          <Text style={styles.permissionText}>Patient approval is required before care information is shared.</Text>
        </View>

        <TouchableOpacity style={styles.loginButton} activeOpacity={0.82} onPress={() => navigation.navigate("Login")} disabled={isSubmitting}>
          <Text style={styles.loginText}>Already have an account? <Text style={styles.loginLink}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  container: { flexGrow: 1, paddingHorizontal: 22 },
  topBar: { height: 60, justifyContent: "center" },
  backButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", ...elevate(1) },
  header: { alignItems: "center", marginTop: 8, marginBottom: 24 },
  logoCircle: { width: 70, height: 70, borderRadius: 21, backgroundColor: CAREGIVER_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 16, ...elevate(2) },
  title: { color: TEXT, fontSize: 25, fontWeight: "700", textAlign: "center", letterSpacing: -0.4 },
  subtitle: { color: MUTED, fontSize: 13, fontWeight: "600", marginTop: 7, textAlign: "center" },
  formCard: { backgroundColor: SURFACE, borderRadius: 18, padding: 18, ...elevate(2) },
  label: { color: TEXT, fontSize: 12, fontWeight: "700", marginBottom: 7 },
  input: { height: 50, backgroundColor: INPUT_BACKGROUND, borderWidth: 1, borderColor: BORDER, borderRadius: 13, paddingHorizontal: 14, color: TEXT, fontSize: 13, marginBottom: 15 },
  passwordContainer: { height: 50, backgroundColor: INPUT_BACKGROUND, borderWidth: 1, borderColor: BORDER, borderRadius: 13, flexDirection: "row", alignItems: "center", marginBottom: 15 },
  passwordInput: { flex: 1, height: "100%", paddingHorizontal: 14, color: TEXT, fontSize: 13 },
  eyeButton: { width: 46, height: "100%", alignItems: "center", justifyContent: "center" },
  inputError: { borderColor: DANGER, marginBottom: 5 },
  errorText: { color: DANGER, fontSize: 10, fontWeight: "600", marginBottom: 11 },
  createButton: { height: 52, backgroundColor: CAREGIVER_PRIMARY, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4, ...elevate(2) },
  disabledButton: { opacity: 0.65 },
  createButtonText: { color: SURFACE, fontSize: 14, fontWeight: "800" },
  permissionNote: { backgroundColor: CAREGIVER_LIGHT, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12, flexDirection: "row", alignItems: "center", marginTop: 14 },
  permissionIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 10 },
  permissionText: { flex: 1, color: CAREGIVER_DARK, fontSize: 11, fontWeight: "600", lineHeight: 16 },
  loginButton: { alignItems: "center", paddingVertical: 20 },
  loginText: { color: MUTED, fontSize: 12, fontWeight: "600" },
  loginLink: { color: CAREGIVER_PRIMARY, fontWeight: "800" },
});