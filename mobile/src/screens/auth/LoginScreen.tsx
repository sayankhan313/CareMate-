import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { API_BASE_URL } from "../../constants/api";
import { colors } from "../../constants/colors";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type LoginFormValues = { email: string; password: string };
type LoginScreenProps = NativeStackScreenProps<RootStackParamList, "Login">;

type LoggedInUser = {
  id: string;
  fullName: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "CAREGIVER" | "PHARMACY" | "ADMIN";
  accountStatus?: string;
  isEmailVerified?: boolean;
};

const isApprovedAccount = (accountStatus?: string) => accountStatus === "ACTIVE" || accountStatus === "APPROVED";
const isPendingAccount = (accountStatus?: string) => accountStatus === "PENDING_VERIFICATION";

export const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({ defaultValues: { email: "", password: "" } });

  const clearTokenAndShowMessage = async (title: string, message: string) => {
    await tokenStorage.removeToken();
    Alert.alert(title, message);
  };

  const redirectByRole = async (user: LoggedInUser) => {
    if (user.role === "PATIENT") {
      navigation.reset({ index: 0, routes: [{ name: "PatientTabs", params: { user } }] });
      return;
    }

    if (user.role === "DOCTOR") {
      if (isPendingAccount(user.accountStatus)) {
        navigation.reset({ index: 0, routes: [{ name: "DoctorPendingApproval", params: { user, email: user.email } }] });
        return;
      }

      if (isApprovedAccount(user.accountStatus)) {
        navigation.reset({ index: 0, routes: [{ name: "DoctorTabs", params: { user } }] });
        return;
      }

      await clearTokenAndShowMessage("Doctor account unavailable", "Your doctor account is not active right now.");
      return;
    }

    if (user.role === "CAREGIVER") {
      if (isApprovedAccount(user.accountStatus)) {
        navigation.reset({ index: 0, routes: [{ name: "CaregiverTabs", params: { user } }] });
        return;
      }

      await clearTokenAndShowMessage("Caregiver account unavailable", "Your caregiver account is not active right now.");
      return;
    }

    if (user.role === "ADMIN") {
      if (isApprovedAccount(user.accountStatus)) {
        navigation.reset({ index: 0, routes: [{ name: "AdminTabs", params: { user } }] });
        return;
      }

      await clearTokenAndShowMessage("Admin account unavailable", "Your admin account is not active right now.");
      return;
    }

    if (user.role === "PHARMACY") {
      if (isPendingAccount(user.accountStatus)) {
        navigation.reset({ index: 0, routes: [{ name: "PharmacyPendingApproval", params: { user, email: user.email } }] });
        return;
      }

      if (isApprovedAccount(user.accountStatus)) {
        navigation.reset({ index: 0, routes: [{ name: "PharmacyTabs", params: { user } }] });
        return;
      }

      await clearTokenAndShowMessage("Pharmacy account unavailable", "Your pharmacy account is not active right now.");
      return;
    }

    await clearTokenAndShowMessage("Unsupported role", "This account role is not supported yet.");
  };

  const onSubmit = async (formData: LoginFormValues) => {
    try {
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim().toLowerCase(), password: formData.password }),
      });

      const loginJson = await loginResponse.json();
      if (!loginResponse.ok || !loginJson.success) throw new Error(loginJson.message || "Login failed.");

      const token = loginJson.data?.token;
      if (!token) throw new Error("Login token missing from server response.");

      await tokenStorage.saveToken(token);

      const currentUserResponse = await fetch(`${API_BASE_URL}/users/me`, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
      const currentUserJson = await currentUserResponse.json();

      if (!currentUserResponse.ok || !currentUserJson.success || !currentUserJson.data?.user) {
        await tokenStorage.removeToken();
        throw new Error(currentUserJson.message || "Could not load user.");
      }

      await redirectByRole(currentUserJson.data.user as LoggedInUser);
    } catch (error) {
      Alert.alert("Login failed", error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoCircle}><Text style={styles.logoIcon}>♡</Text></View>
          <Text style={styles.appName}>CareMate+</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your care journey</Text>
        </View>

        <View style={styles.illustrationCard}>
          <View style={styles.featureItem}><View style={styles.featureIconCircle}><Text style={styles.featureIcon}>↗</Text></View><Text style={styles.featureLabel}>Monitor</Text></View>
          <View style={styles.featureItem}><View style={styles.featureIconCircle}><Text style={styles.featureIcon}>♡</Text></View><Text style={styles.featureLabel}>Care</Text></View>
          <View style={styles.featureItem}><View style={styles.featureIconCircle}><Text style={styles.featureIcon}>👥</Text></View><Text style={styles.featureLabel}>Connect</Text></View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email address</Text>

          <Controller
            control={control}
            name="email"
            rules={{ required: "Email is required.", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Please enter a valid email address." } }}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput placeholder="you@example.com" placeholderTextColor="#94A3B8" value={value} onChangeText={onChange} onBlur={onBlur} autoCapitalize="none" keyboardType="email-address" style={[styles.input, errors.email ? styles.inputError : undefined]} />
            )}
          />

          {errors.email ? <Text style={styles.errorText}>{errors.email.message}</Text> : null}

          <Text style={styles.label}>Password</Text>

          <Controller
            control={control}
            name="password"
            rules={{ required: "Password is required." }}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput placeholder="Enter your password" placeholderTextColor="#94A3B8" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry style={[styles.input, errors.password ? styles.inputError : undefined]} />
            )}
          />

          {errors.password ? <Text style={styles.errorText}>{errors.password.message}</Text> : null}

          <TouchableOpacity style={styles.forgotButton} onPress={() => navigation.navigate("ForgotPassword")} disabled={isSubmitting}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.roleHint}>
            <Text style={styles.roleHintText}>Your dashboard opens based on your verified role.</Text>
          </View>

          <TouchableOpacity style={[styles.loginButton, isSubmitting ? styles.disabledButton : undefined]} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} activeOpacity={0.85}>
            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginButtonText}>Login</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>New to CareMate+?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("RoleSelection")} disabled={isSubmitting}><Text style={styles.signupLink}> Create account</Text></TouchableOpacity>
        </View>

        <View style={styles.securityCard}>
          <View style={styles.securityIconCircle}><Text style={styles.securityIcon}>✓</Text></View>
          <Text style={styles.securityText}>CareMate+ uses secure authentication and role-based access to protect patient and clinical workflows.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F8FF" },
  screen: { flex: 1, backgroundColor: "#F4F8FF" },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  header: { alignItems: "center", marginBottom: 18 },
  logoCircle: { width: 66, height: 66, borderRadius: 33, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  logoIcon: { color: "#FFFFFF", fontSize: 34, fontWeight: "900" },
  appName: { color: "#0F172A", fontSize: 26, fontWeight: "900", marginBottom: 6 },
  title: { color: "#0F172A", fontSize: 24, fontWeight: "900", marginBottom: 6 },
  subtitle: { color: "#64748B", fontSize: 14, fontWeight: "600", textAlign: "center" },
  illustrationCard: { backgroundColor: "#EAF2FF", borderRadius: 20, padding: 16, marginBottom: 18, flexDirection: "row", justifyContent: "space-around" },
  featureItem: { alignItems: "center" },
  featureIconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  featureIcon: { color: "#2563EB", fontSize: 20, fontWeight: "900" },
  featureLabel: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  formCard: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 16 },
  label: { color: "#334155", fontSize: 13, fontWeight: "800", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: "#0F172A", backgroundColor: "#FFFFFF", marginBottom: 10 },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, marginBottom: 10, fontWeight: "600" },
  forgotButton: { alignSelf: "flex-end", paddingVertical: 4, marginBottom: 12 },
  forgotText: { color: "#2563EB", fontSize: 13, fontWeight: "800" },
  roleHint: { backgroundColor: "#EFF6FF", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 14 },
  roleHintText: { color: "#1D4ED8", fontSize: 12, fontWeight: "700", textAlign: "center" },
  loginButton: { backgroundColor: "#2563EB", borderRadius: 15, paddingVertical: 16, alignItems: "center" },
  disabledButton: { opacity: 0.7 },
  loginButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  signupContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  signupText: { color: "#64748B", fontSize: 13 },
  signupLink: { color: "#2563EB", fontWeight: "800" },
  securityCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  securityIconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center", marginRight: 12 },
  securityIcon: { color: "#10B981", fontSize: 20, fontWeight: "900" },
  securityText: { flex: 1, color: "#64748B", fontSize: 12, lineHeight: 18 },
});