import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { API_BASE_URL } from "../../constants/api";
import { colors } from "../../constants/colors";

type Props = {
  navigation: any;
  route: any;
};

const extractTokenFromLink = (link?: string) => {
  if (!link) {
    return "";
  }

  const match = link.match(/[?&]token=([^&]+)/);

  return match?.[1] || "";
};

export const EmailVerificationScreen = ({ navigation, route }: Props) => {
  const email = route.params?.email || "";
  const verificationLink = route.params?.verificationLink;

  const [token, setToken] = useState(extractTokenFromLink(verificationLink));
  const [loading, setLoading] = useState(false);

  const handleVerifyEmail = async () => {
    if (!token.trim()) {
      Alert.alert("Missing token", "Please enter the verification token.");
      return;
    }

    try {
      setLoading(true);

      const verifyResponse = await fetch(
        `${API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(
          token.trim()
        )}`,
        {
          method: "GET",
        }
      );

      const verifyJson = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyJson.success) {
        throw new Error(verifyJson.message || "Email verification failed.");
      }

      Alert.alert("Email verified", "Your email has been verified successfully.");

      navigation.reset({
        index: 0,
        routes: [
          {
            name: "Login",
          },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      Alert.alert("Verification failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your email</Text>

      <Text style={styles.subtitle}>
        A verification token has been created for {email || "your account"}.
      </Text>

      {verificationLink ? (
        <View style={styles.devBox}>
          <Text style={styles.devTitle}>Development Verification Link</Text>
          <Text style={styles.devText}>{verificationLink}</Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Text style={styles.label}>Verification Token</Text>

        <TextInput
          placeholder="Paste verification token"
          placeholderTextColor={colors.mutedText}
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          style={styles.input}
        />

        <TouchableOpacity
          style={[
            styles.verifyButton,
            loading ? styles.disabledButton : undefined,
          ]}
          onPress={handleVerifyEmail}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify Email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          disabled={loading}
        >
          <Text style={styles.linkText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 70,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
    marginBottom: 24,
  },
  devBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 18,
  },
  devTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  devText: {
    fontSize: 12,
    color: colors.mutedText,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 18,
  },
  disabledButton: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  linkText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
});