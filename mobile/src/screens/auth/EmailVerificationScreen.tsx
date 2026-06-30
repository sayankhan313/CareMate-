import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { API_BASE_URL } from "../../constants/api";
import { colors } from "../../constants/colors";
import type { RootStackParamList } from "../../types/navigation";

type EmailVerificationScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "EmailVerification"
>;

export const EmailVerificationScreen = ({
  navigation,
  route,
}: EmailVerificationScreenProps) => {
  const { email } = route.params;

  const [isResending, setIsResending] = useState(false);

  const handleGoToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  const handleResendEmail = async () => {
    try {
      setIsResending(true);

      const response = await fetch(
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

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || "Could not resend verification email.");
      }

      Alert.alert(
        "Verification email sent",
        "Please check your inbox for the new verification link."
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      Alert.alert("Resend failed", message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✉</Text>
          </View>

          <Text style={styles.appName}>CareMate+</Text>

          <Text style={styles.title}>Verify your email</Text>

          <Text style={styles.subtitle}>
            We have sent a verification link to your email address.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Verification email sent to</Text>

          <View style={styles.emailBox}>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          <Text style={styles.instructions}>
            Open your email inbox and click the CareMate+ verification link.
            After your email is verified, return to the app and login.
          </Text>

          <View style={styles.stepsBox}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Check your email inbox.</Text>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Open the CareMate+ verification link.
              </Text>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Return here and login.</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGoToLogin}
          disabled={isResending}
        >
          <Text style={styles.primaryButtonText}>
            I have verified, go to login
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            isResending ? styles.disabledButton : undefined,
          ]}
          onPress={handleResendEmail}
          disabled={isResending}
        >
          {isResending ? (
            <ActivityIndicator color="#2563EB" />
          ) : (
            <Text style={styles.secondaryButtonText}>
              Resend verification email
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoToLogin}
          disabled={isResending}
        >
          <Text style={styles.backButtonText}>Back to login</Text>
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
    paddingTop: 40,
    paddingBottom: 34,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  iconText: {
    color: "#2563EB",
    fontSize: 34,
    fontWeight: "900",
  },
  appName: {
    color: "#2563EB",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  title: {
    color: "#0F172A",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 18,
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
    textAlign: "center",
  },
  emailBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  emailText: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  instructions: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 18,
  },
  stepsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  stepText: {
    flex: 1,
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.7,
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  backButtonText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "800",
  },
});