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
import type { RootStackParamList } from "../../types/navigation";

type ForgotPasswordFormValues = {
  email: string;
};

type ForgotPasswordScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ForgotPassword"
>;

export const ForgotPasswordScreen = ({
  navigation,
}: ForgotPasswordScreenProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: "",
    },
  });

  const handleBackToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  const onSubmit = async (formData: ForgotPasswordFormValues) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || "Could not send password reset email.");
      }

      Alert.alert(
        "Reset link sent",
        "If an account exists with this email, a password reset link has been sent. Please check your inbox.",
        [
          {
            text: "Back to Login",
            onPress: handleBackToLogin,
          },
        ]
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      Alert.alert("Reset email failed", message);
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
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={handleBackToLogin}
            disabled={isSubmitting}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.appName}>CareMate+</Text>

            <Text style={styles.title}>Forgot password?</Text>

            <Text style={styles.subtitle}>
              Enter your email and we will send a secure reset link.
            </Text>
          </View>
        </View>

        <View style={styles.iconCard}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🔐</Text>
          </View>

          <Text style={styles.iconTitle}>Secure password recovery</Text>

          <Text style={styles.iconSubtitle}>
            For your safety, password reset is completed through your email
            reset link.
          </Text>
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
            render={({ field }) => (
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="#94A3B8"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
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

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              If this email exists in CareMate+, a reset link will be sent.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              isSubmitting ? styles.disabledButton : undefined,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backToLoginButton}
          onPress={handleBackToLogin}
          disabled={isSubmitting}
        >
          <Text style={styles.backToLoginText}>Back to login</Text>
        </TouchableOpacity>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 34,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 26,
  },
  backIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  backIcon: {
    color: "#2563EB",
    fontSize: 24,
    fontWeight: "800",
  },
  headerTextContainer: {
    flex: 1,
  },
  appName: {
    color: "#2563EB",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
  },
  iconCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 22,
    alignItems: "center",
    marginBottom: 18,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  iconText: {
    fontSize: 34,
  },
  iconTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  iconSubtitle: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
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
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
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
  infoBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginTop: 6,
    marginBottom: 14,
  },
  infoText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.7,
  },
  backToLoginButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  backToLoginText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "900",
  },
});