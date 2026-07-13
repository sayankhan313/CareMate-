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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { API_BASE_URL } from "../../constants/api";
import { colors } from "../../constants/colors";
import type { RootStackParamList } from "../../types/navigation";

type PatientGender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

type PatientSignupFormValues = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  dateOfBirth: string;
  gender: PatientGender;
  medicalConditions: string;
  emergencyContact: string;
};

type GenderOption = {
  label: string;
  value: PatientGender;
};

type PatientSignupScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "PatientSignup"
>;

const genderOptions: GenderOption[] = [
  {
    label: "Male",
    value: "MALE",
  },
  {
    label: "Female",
    value: "FEMALE",
  },
  {
    label: "Other",
    value: "OTHER",
  },
  {
    label: "Prefer not to say",
    value: "PREFER_NOT_TO_SAY",
  },
];

export const PatientSignupScreen = ({
  navigation,
}: PatientSignupScreenProps) => {
  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PatientSignupFormValues>({
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      dateOfBirth: "",
      gender: "PREFER_NOT_TO_SAY",
      medicalConditions: "",
      emergencyContact: "",
    },
  });

  const onSubmit = async (formData: PatientSignupFormValues) => {
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
          phoneNumber: formData.phoneNumber.trim(),
          dateOfBirth: formData.dateOfBirth.trim(),
          gender: formData.gender,
          medicalConditions: formData.medicalConditions.trim(),
          emergencyContact: formData.emergencyContact.trim(),
        }),
      });

      let registerJson: any = {};

      try {
        registerJson = await registerResponse.json();
      } catch (error) {
        registerJson = {};
      }

      if (!registerResponse.ok || !registerJson.success) {
        throw new Error(registerJson.message || "Registration failed.");
      }

      navigation.navigate("EmailVerification", {
        email: formData.email.trim().toLowerCase(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      Alert.alert("Registration failed", message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom: Math.max(36, insets.bottom + 36),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Patient Signup</Text>
            <Text style={styles.headerSubtitle}>Create your patient account</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusIconCircle}>
            <Text style={styles.statusIcon}>✓</Text>
          </View>

          <Text style={styles.statusText}>
            Account status: <Text style={styles.statusActive}>Active</Text>
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Full name</Text>
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
            render={({ field }) => (
              <TextInput
                placeholder="Enter your full name"
                placeholderTextColor="#8A94A6"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!isSubmitting}
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
            render={({ field }) => (
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="#8A94A6"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!isSubmitting}
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

          <Text style={styles.label}>Phone number</Text>
          <Controller
            control={control}
            name="phoneNumber"
            rules={{
              required: "Phone number is required.",
            }}
            render={({ field }) => (
              <TextInput
                placeholder="+44 7000 000000"
                placeholderTextColor="#8A94A6"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!isSubmitting}
                keyboardType="phone-pad"
                style={[
                  styles.input,
                  errors.phoneNumber ? styles.inputError : undefined,
                ]}
              />
            )}
          />
          {errors.phoneNumber ? (
            <Text style={styles.errorText}>{errors.phoneNumber.message}</Text>
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
            render={({ field }) => (
              <TextInput
                placeholder="Create a secure password"
                placeholderTextColor="#8A94A6"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!isSubmitting}
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

          <Text style={styles.label}>Date of birth</Text>
          <Controller
            control={control}
            name="dateOfBirth"
            rules={{
              required: "Date of birth is required.",
            }}
            render={({ field }) => (
              <TextInput
                placeholder="dd/mm/yyyy"
                placeholderTextColor="#8A94A6"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!isSubmitting}
                keyboardType="numbers-and-punctuation"
                style={[
                  styles.input,
                  errors.dateOfBirth ? styles.inputError : undefined,
                ]}
              />
            )}
          />
          {errors.dateOfBirth ? (
            <Text style={styles.errorText}>{errors.dateOfBirth.message}</Text>
          ) : null}

          <Text style={styles.label}>Gender</Text>
          <Controller
            control={control}
            name="gender"
            rules={{
              required: "Gender is required.",
            }}
            render={({ field }) => (
              <View style={styles.genderGrid}>
                {genderOptions.map((option, index) => {
                  const isSelected = field.value === option.value;
                  const isRightColumn = index % 2 === 1;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.genderOption,
                        isRightColumn ? styles.genderOptionRight : undefined,
                        isSelected ? styles.genderOptionSelected : undefined,
                        isSubmitting ? styles.disabledGenderOption : undefined,
                      ]}
                      activeOpacity={0.85}
                      disabled={isSubmitting}
                      onPress={() => field.onChange(option.value)}
                    >
                      <Text
                        style={[
                          styles.genderOptionText,
                          isSelected
                            ? styles.genderOptionTextSelected
                            : undefined,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />
          {errors.gender ? (
            <Text style={styles.errorText}>{errors.gender.message}</Text>
          ) : null}

          <Text style={styles.label}>
            Medical conditions <Text style={styles.optionalText}>(optional)</Text>
          </Text>
          <Controller
            control={control}
            name="medicalConditions"
            render={({ field }) => (
              <TextInput
                placeholder="List any medical conditions"
                placeholderTextColor="#8A94A6"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!isSubmitting}
                multiline
                textAlignVertical="top"
                style={styles.textArea}
              />
            )}
          />

          <Text style={styles.label}>Emergency contact</Text>
          <Controller
            control={control}
            name="emergencyContact"
            rules={{
              required: "Emergency contact is required.",
            }}
            render={({ field }) => (
              <TextInput
                placeholder="Name and phone number"
                placeholderTextColor="#8A94A6"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!isSubmitting}
                style={[
                  styles.input,
                  errors.emergencyContact ? styles.inputError : undefined,
                ]}
              />
            )}
          />
          {errors.emergencyContact ? (
            <Text style={styles.errorText}>
              {errors.emergencyContact.message}
            </Text>
          ) : null}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIconCircle}>
            <Text style={styles.infoIcon}>i</Text>
          </View>

          <Text style={styles.infoText}>
            Patients can access the dashboard after email verification.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.createButton,
            isSubmitting ? styles.disabledButton : undefined,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          activeOpacity={0.88}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>Create Patient Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>
            Already have an account?{" "}
            <Text
              style={styles.loginLink}
              onPress={() => {
                if (!isSubmitting) {
                  navigation.navigate("Login");
                }
              }}
            >
              Login
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EEF5FC",
  },
  screen: {
    flex: 1,
    backgroundColor: "#EEF5FC",
  },
  container: {},
  header: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 66,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTextBlock: {
    flex: 1,
  },
  backIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  backIcon: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "400",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    marginBottom: 8,
  },
  headerSubtitle: {
    color: "#EAF2FF",
    fontSize: 17,
    fontWeight: "600",
  },
  statusCard: {
    marginHorizontal: 30,
    marginTop: -34,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#DDE7F3",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  statusIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statusIcon: {
    color: "#10B981",
    fontSize: 15,
    fontWeight: "900",
  },
  statusText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  statusActive: {
    color: "#10B981",
    fontWeight: "900",
  },
  formCard: {
    marginHorizontal: 30,
    marginTop: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: "#DDE7F3",
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  label: {
    color: "#60728E",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  optionalText: {
    color: "#94A3B8",
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDE7F3",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#DDE7F3",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    minHeight: 100,
    fontSize: 16,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    marginBottom: 28,
  },
  genderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  genderOption: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#DDE7F3",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 10,
    marginBottom: 10,
    marginRight: "4%",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  genderOptionRight: {
    marginRight: 0,
  },
  genderOptionSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  disabledGenderOption: {
    opacity: 0.7,
  },
  genderOptionText: {
    color: "#60728E",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  genderOptionTextSelected: {
    color: "#2563EB",
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: -14,
    marginBottom: 14,
  },
  infoCard: {
    marginHorizontal: 30,
    marginTop: 22,
    backgroundColor: "#EAF4FF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CFE3FF",
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 1,
  },
  infoIcon: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "900",
  },
  infoText: {
    flex: 1,
    color: "#1D4ED8",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  createButton: {
    marginHorizontal: 30,
    marginTop: 22,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  loginContainer: {
    alignItems: "center",
    marginTop: 24,
  },
  loginText: {
    color: "#60728E",
    fontSize: 15,
    fontWeight: "600",
  },
  loginLink: {
    color: "#2563EB",
    fontSize: 17,
    fontWeight: "900",
  },
});