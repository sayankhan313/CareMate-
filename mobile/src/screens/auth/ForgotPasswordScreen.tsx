import { Controller, useForm } from "react-hook-form";
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

type ForgotPasswordFormValues = {
  email: string;
};

type Props = {
  navigation: any;
};

export const ForgotPasswordScreen = ({ navigation }: Props) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (formData: ForgotPasswordFormValues) => {
    try {
      const forgotResponse = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
        }),
      });

      const forgotJson = await forgotResponse.json();

      if (!forgotResponse.ok || !forgotJson.success) {
        throw new Error(forgotJson.message || "Forgot password request failed.");
      }

      Alert.alert(
        "Reset request created",
        forgotJson.message || "Password reset request created."
      );

      navigation.navigate("ResetPassword", {
        resetLink: forgotJson.data?.resetLink,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      Alert.alert("Request failed", message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>

      <Text style={styles.subtitle}>
        Enter your registered email address to create a password reset request.
      </Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>Email</Text>

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
              placeholder="Enter your email"
              placeholderTextColor={colors.mutedText}
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
            <Text style={styles.submitButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          disabled={isSubmitting}
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