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

import { API_BASE_URL } from "../../constants/api";
import { colors } from "../../constants/colors";

type ResetPasswordFormValues = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};

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

export const ResetPasswordScreen = ({ navigation, route }: Props) => {
  const resetLink = route.params?.resetLink;

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    defaultValues: {
      token: extractTokenFromLink(resetLink),
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPasswordValue = watch("newPassword");

  const onSubmit = async (formData: ResetPasswordFormValues) => {
    try {
      const resetResponse = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: formData.token.trim(),
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const resetJson = await resetResponse.json();

      if (!resetResponse.ok || !resetJson.success) {
        throw new Error(resetJson.message || "Password reset failed.");
      }

      Alert.alert("Password reset", "Your password has been reset successfully.");

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

      Alert.alert("Reset failed", message);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Reset Password</Text>

      <Text style={styles.subtitle}>
        Enter your reset token and create a new password.
      </Text>

      {resetLink ? (
        <View style={styles.devBox}>
          <Text style={styles.devTitle}>Development Reset Link</Text>
          <Text style={styles.devText}>{resetLink}</Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Text style={styles.label}>Reset Token</Text>

        <Controller
          control={control}
          name="token"
          rules={{
            required: "Reset token is required.",
          }}
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              placeholder="Paste reset token"
              placeholderTextColor={colors.mutedText}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              style={[
                styles.input,
                errors.token ? styles.inputError : undefined,
              ]}
            />
          )}
        />

        {errors.token ? (
          <Text style={styles.errorText}>{errors.token.message}</Text>
        ) : null}

        <Text style={styles.label}>New Password</Text>

        <Controller
          control={control}
          name="newPassword"
          rules={{
            required: "New password is required.",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters.",
            },
          }}
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              placeholder="Enter new password"
              placeholderTextColor={colors.mutedText}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              style={[
                styles.input,
                errors.newPassword ? styles.inputError : undefined,
              ]}
            />
          )}
        />

        {errors.newPassword ? (
          <Text style={styles.errorText}>{errors.newPassword.message}</Text>
        ) : null}

        <Text style={styles.label}>Confirm Password</Text>

        <Controller
          control={control}
          name="confirmPassword"
          rules={{
            required: "Please confirm your password.",
            validate: (value) =>
              value === newPasswordValue || "Passwords do not match.",
          }}
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              placeholder="Confirm new password"
              placeholderTextColor={colors.mutedText}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              style={[
                styles.input,
                errors.confirmPassword ? styles.inputError : undefined,
              ]}
            />
          )}
        />

        {errors.confirmPassword ? (
          <Text style={styles.errorText}>
            {errors.confirmPassword.message}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting ? styles.disabledButton : undefined,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          disabled={isSubmitting}
        >
          <Text style={styles.linkText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 40,
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
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
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