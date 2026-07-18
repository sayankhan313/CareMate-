import { useState, type ReactNode } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  HeartPulse,
  Pill,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from "lucide-react-native";

import type { RootStackParamList } from "../../types/navigation";

type RoleSelectionScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "RoleSelection"
>;

type UserRole = "PATIENT" | "DOCTOR" | "CAREGIVER" | "PHARMACY";

type RoleOption = {
  id: UserRole;
  title: string;
  description: string;
  accent: string;
  light: string;
  badge?: string;
  icon: ReactNode;
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const PATIENT_PRIMARY = "#5B86E5";
const DOCTOR_PRIMARY = "#7C3AED";
const PHARMACY_PRIMARY = "#16A34A";
const CAREGIVER_PRIMARY = "#F6A545";

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.07 + level * 0.01,
  shadowRadius: level * 1.5,
  shadowOffset: {
    width: 0,
    height: level * 0.8,
  },
});

const roleOptions: RoleOption[] = [
  {
    id: "PATIENT",
    title: "Patient",
    description: "Track medicines, vitals, safety alerts and consultations.",
    accent: PATIENT_PRIMARY,
    light: "#EEF4FF",
    icon: <HeartPulse size={24} color={PATIENT_PRIMARY} strokeWidth={2.5} />,
  },
  {
    id: "DOCTOR",
    title: "Doctor",
    description: "Review patient consultations, safety cases and notes.",
    accent: DOCTOR_PRIMARY,
    light: "#F3E8FF",
    badge: "Verification required",
    icon: <Stethoscope size={24} color={DOCTOR_PRIMARY} strokeWidth={2.5} />,
  },
  {
    id: "PHARMACY",
    title: "Pharmacy",
    description: "Manage prescription-linked medicine fulfilment requests.",
    accent: PHARMACY_PRIMARY,
    light: "#ECFDF3",
    badge: "Verification required",
    icon: <Pill size={24} color={PHARMACY_PRIMARY} strokeWidth={2.5} />,
  },
  {
    id: "CAREGIVER",
    title: "Caregiver",
    description: "Support a linked patient and view important alerts.",
    accent: CAREGIVER_PRIMARY,
    light: "#FFF3E2",
    badge: "Coming next",
    icon: <UsersRound size={24} color={CAREGIVER_PRIMARY} strokeWidth={2.5} />,
  },
];

export const RoleSelectionScreen = ({
  navigation,
}: RoleSelectionScreenProps) => {
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<UserRole>("PATIENT");

  const selectedOption =
    roleOptions.find((role) => role.id === selectedRole) || roleOptions[0];

  const handleContinue = () => {
    if (selectedRole === "PATIENT") {
      navigation.navigate("PatientSignup");
      return;
    }

    if (selectedRole === "DOCTOR") {
      navigation.navigate("DoctorSignup");
      return;
    }

    if (selectedRole === "PHARMACY") {
      navigation.navigate("PharmacySignup");
      return;
    }

    Alert.alert(
      "Caregiver registration coming next",
      "Caregiver registration will be connected after the main patient, doctor and pharmacy workflows."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom: Math.max(insets.bottom + 28, 40),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <ShieldCheck size={28} color={selectedOption.accent} strokeWidth={2.7} />
          </View>

          <Text style={styles.title}>Choose Your Role</Text>

          <Text style={styles.subtitle}>
            Select how you want to use CareMate+
          </Text>
        </View>

        <View style={styles.rolesContainer}>
          {roleOptions.map((role) => {
            const isSelected = selectedRole === role.id;

            return (
              <TouchableOpacity
                key={role.id}
                activeOpacity={0.86}
                onPress={() => setSelectedRole(role.id)}
                style={[
                  styles.roleCard,
                  isSelected
                    ? {
                        backgroundColor: role.light,
                      }
                    : undefined,
                ]}
              >
                <View
                  style={[
                    styles.roleAccent,
                    {
                      backgroundColor: isSelected ? role.accent : BORDER,
                    },
                  ]}
                />

                <View
                  style={[
                    styles.roleIconCircle,
                    {
                      backgroundColor: role.light,
                    },
                  ]}
                >
                  {role.icon}
                </View>

                <View style={styles.roleContent}>
                  <View style={styles.roleTitleRow}>
                    <Text style={styles.roleTitle}>{role.title}</Text>

                    {role.badge ? (
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: isSelected ? SURFACE : role.light,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color: role.accent,
                            },
                          ]}
                        >
                          {role.badge}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.roleDescription}>
                    {role.description}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor: isSelected ? role.accent : BORDER,
                    },
                  ]}
                >
                  {isSelected ? (
                    <View
                      style={[
                        styles.radioInner,
                        {
                          backgroundColor: role.accent,
                        },
                      ]}
                    />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.noteCard}>
          <View
            style={[
              styles.noteIconBox,
              {
                backgroundColor: selectedOption.light,
              },
            ]}
          >
            <ShieldCheck
              size={18}
              color={selectedOption.accent}
              strokeWidth={2.6}
            />
          </View>

          <Text style={styles.noteText}>
            Doctors and pharmacies require admin verification before accessing
            clinical or fulfilment data.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor: selectedOption.accent,
            },
          ]}
          onPress={handleContinue}
          activeOpacity={0.88}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.82}
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
    backgroundColor: BACKGROUND,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 34,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    ...elevate(2),
  },
  title: {
    color: TEXT,
    fontSize: 25,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
  },
  rolesContainer: {
    marginBottom: 16,
  },
  roleCard: {
    position: "relative",
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...elevate(2),
  },
  roleAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  roleIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  roleContent: {
    flex: 1,
    paddingRight: 10,
  },
  roleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    flexWrap: "wrap",
  },
  roleTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginRight: 8,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  roleDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  noteCard: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  noteIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  noteText: {
    flex: 1,
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
  continueButton: {
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 14,
    ...elevate(2),
  },
  continueButtonText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "700",
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  backButtonText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
  },
});