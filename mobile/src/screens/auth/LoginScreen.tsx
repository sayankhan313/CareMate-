import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { API_BASE_URL } from "../../constants/api";
import { colors } from "../../constants/colors";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, "Login">;

export const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (formData: LoginFormValues) => {
    try {
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const loginJson = await loginResponse.json();

      if (!loginResponse.ok || !loginJson.success) {
        throw new Error(loginJson.message || "Login failed.");
      }

      const token = loginJson.data.token;

      await tokenStorage.saveToken(token);

      const currentUserResponse = await fetch(`${API_BASE_URL}/users/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const currentUserJson = await currentUserResponse.json();

      if (!currentUserResponse.ok || !currentUserJson.success) {
        throw new Error(currentUserJson.message || "Could not load user.");
      }

      navigation.reset({
        index: 0,
        routes: [
          {
            name: "PatientDashboard",
            params: {
              user: currentUserJson.data.user,
            },
          },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      Alert.alert("Login failed", message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>♡</Text>
          </View>

          <Text style={styles.appName}>CareMate+</Text>

          <Text style={styles.title}>Welcome Back</Text>

          <Text style={styles.subtitle}>
            Sign in to continue your care journey
          </Text>
        </View>

        <View style={styles.illustrationCard}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconCircle}>
              <Text style={styles.featureIcon}>↗</Text>
            </View>
            <Text style={styles.featureLabel}>Monitor</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconCircle}>
              <Text style={styles.featureIcon}>♡</Text>
            </View>
            <Text style={styles.featureLabel}>Care</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconCircle}>
              <Text style={styles.featureIcon}>👥</Text>
            </View>
            <Text style={styles.featureLabel}>Connect</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email address</Text>

          <Controller
            control={control}
            name="email"
            rules={{
              required: "Email is required.",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Please enter a valid email address.",
              },
            }}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="#94A3B8"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.input,
                  errors.email ? styles.inputError : undefined,
                ]}
              />
            )}
          />

          {errors.email ? (
            <Text style={styles.errorText}>{errors.email.message}</Text>
          ) : null}

          <Text style={styles.label}>Password</Text>

          <Controller
            control={control}
            name="password"
            rules={{
              required: "Password is required.",
            }}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                style={[
                  styles.input,
                  errors.password ? styles.inputError : undefined,
                ]}
              />
            )}
          />

          {errors.password ? (
            <Text style={styles.errorText}>{errors.password.message}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.forgotContainer}
            onPress={() => navigation.navigate("ForgotPassword")}
            disabled={isSubmitting}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Your dashboard opens based on your verified role.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.loginButton,
              isSubmitting ? styles.disabledButton : undefined,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>
            New to CareMate+?{" "}
            <Text
              style={styles.signupLink}
              onPress={() => navigation.navigate("RoleSelection")}
            >
              Create account
            </Text>
          </Text>
        </View>

        <View style={styles.securityCard}>
          <View style={styles.securityIconCircle}>
            <Text style={styles.securityIcon}>✓</Text>
          </View>

          <Text style={styles.securityText}>
            Secure role-based access for patients, doctors, caregivers and
            pharmacy users.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6FAFF",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F6FAFF",
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 36,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 26,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  logoIcon: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  illustrationCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "center",
  },
  featureItem: {
    alignItems: "center",
    marginHorizontal: 12,
  },
  featureIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  featureIcon: {
    color: "#2563EB",
    fontSize: 22,
    fontWeight: "800",
  },
  featureLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginBottom: 12,
  },
  forgotContainer: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    marginBottom: 10,
  },
  forgotText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  infoBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    marginBottom: 14,
  },
  infoText: {
    color: "#1E40AF",
    fontSize: 11,
    textAlign: "center",
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  signupContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  signupText: {
    color: "#64748B",
    fontSize: 13,
  },
  signupLink: {
    color: "#2563EB",
    fontWeight: "800",
  },
  securityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  securityIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  securityIcon: {
    color: "#10B981",
    fontSize: 20,
    fontWeight: "900",
  },
  securityText: {
    flex: 1,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
  },
});