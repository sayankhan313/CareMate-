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
import { tokenStorage } from "../../services/tokenStorage";
import { CareMateLogo } from "../../components/CareMateLogo";

type LoginFormValues = {
  email: string;
  password: string;
};

type Props = {
  navigation: any;
};

export const LoginScreen = ({ navigation }: Props) => {
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
    <View style={styles.container}>
     <View style={styles.logoWrapper}>
  <CareMateLogo size={86} />
</View>

      <Text style={styles.title}>Welcome to CareMate+</Text>

      <Text style={styles.subtitle}>
        Sign in to continue to your healthcare support account.
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

        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassword")}
          disabled={isSubmitting}
        >
          <Text style={styles.linkText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("RoleSelection")}
          disabled={isSubmitting}
        >
          <Text style={styles.bottomText}>
            Do not have an account?{" "}
            <Text style={styles.linkText}>Create one</Text>
          </Text>
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
    justifyContent: "center",
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.mutedText,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
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
  loginButton: {
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
  loginButtonText: {
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
  bottomText: {
    color: colors.mutedText,
    fontSize: 15,
    textAlign: "center",
    marginTop: 18,
  },
  logoWrapper: {
  alignItems: "center",
  marginBottom: 18,
},
});