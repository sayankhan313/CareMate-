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

type SignupFormValues = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type Props = {
  navigation: any;
};

export const PatientSignupScreen = ({ navigation }: Props) => {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password");

  const onSubmit = async (formData: SignupFormValues) => {
    try {
      const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: "PATIENT",
        }),
      });

      const registerJson = await registerResponse.json();

      if (!registerResponse.ok || !registerJson.success) {
        throw new Error(registerJson.message || "Registration failed.");
      }

      navigation.navigate("EmailVerification", {
        email: formData.email.trim().toLowerCase(),
        verificationLink: registerJson.data?.verificationLink,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      Alert.alert("Registration failed", message);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Patient Sign Up</Text>

      <Text style={styles.subtitle}>
        Create your CareMate+ patient account to continue.
      </Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>Full Name</Text>
        <Controller
          control={control}
          name="fullName"
          rules={{
            required: "Full name is required.",
            minLength: {
              value: 2,
              message: "Full name must be at least 2 characters.",
            },
          }}
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              placeholder="Enter your full name"
              placeholderTextColor={colors.mutedText}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              style={[
                styles.input,
                errors.fullName ? styles.inputError : undefined,
              ]}
            />
          )}
        />
        {errors.fullName ? (
          <Text style={styles.errorText}>{errors.fullName.message}</Text>
        ) : null}

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

        <Text style={styles.label}>Password</Text>
        <Controller
          control={control}
          name="password"
          rules={{
            required: "Password is required.",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters.",
            },
          }}
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              placeholder="Create a password"
              placeholderTextColor={colors.mutedText}
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

        <Text style={styles.label}>Confirm Password</Text>
        <Controller
          control={control}
          name="confirmPassword"
          rules={{
            required: "Please confirm your password.",
            validate: (value) =>
              value === passwordValue || "Passwords do not match.",
          }}
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              placeholder="Confirm your password"
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
            styles.signupButton,
            isSubmitting ? styles.disabledButton : undefined,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.signupButtonText}>Create Patient Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          disabled={isSubmitting}
        >
          <Text style={styles.linkText}>Already have an account? Login</Text>
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
  signupButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 18,
  },
  disabledButton: {
    opacity: 0.7,
  },
  signupButtonText: {
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