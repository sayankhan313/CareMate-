import { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  icon: React.ReactNode;
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

const roleOptions: RoleOption[] = [
  {
    id: "PATIENT",
    title: "Patient",
    description: "Manage medicines, vitals, consultations and orders",
    accent: PATIENT_PRIMARY,
    light: "#EEF4FF",
    icon: <HeartPulse size={24} color={PATIENT_PRIMARY} strokeWidth={2.5} />,
  },
  {
    id: "DOCTOR",
    title: "Doctor",
    description: "Monitor patients, consultations and safety alerts",
    accent: DOCTOR_PRIMARY,
    light: "#F3E8FF",
    badge: "Verification required",
    icon: <Stethoscope size={24} color={DOCTOR_PRIMARY} strokeWidth={2.5} />,
  },
  {
    id: "CAREGIVER",
    title: "Caregiver",
    description: "Support linked patient and view alerts",
    accent: CAREGIVER_PRIMARY,
    light: "#FFF3E2",
    badge: "Coming next",
    icon: <UsersRound size={24} color={CAREGIVER_PRIMARY} strokeWidth={2.5} />,
  },
  {
    id: "PHARMACY",
    title: "Pharmacy",
    description: "Manage prescription-linked fulfilment requests",
    accent: PHARMACY_PRIMARY,
    light: "#ECFDF3",
    badge: "Verification required",
    icon: <Pill size={24} color={PHARMACY_PRIMARY} strokeWidth={2.5} />,
  },
];

export const RoleSelectionScreen = ({
  navigation,
}: RoleSelectionScreenProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>("PATIENT");

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
      Alert.alert(
        "Pharmacy verification required",
        "Pharmacy registration will be connected after the doctor and admin verification flow."
      );
      return;
    }

    Alert.alert(
      "Caregiver registration coming next",
      "Caregiver registration will be connected after the main role workflows."
    );
  };

  const selectedOption =
    roleOptions.find((role) => role.id === selectedRole) || roleOptions[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <ShieldCheck size={28} color={PATIENT_PRIMARY} strokeWidth={2.7} />
          </View>

          <Text style={styles.title}>Choose Your Role</Text>

          <Text style={styles.subtitle}>
            Select how you will use CareMate+
          </Text>
        </View>

        <View style={styles.rolesContainer}>
          {roleOptions.map((role) => {
            const isSelected = selectedRole === role.id;

            return (
              <TouchableOpacity
                key={role.id}
                activeOpacity={0.85}
                onPress={() => setSelectedRole(role.id)}
                style={[
                  styles.roleCard,
                  {
                    borderColor: isSelected ? role.accent : BORDER,
                    backgroundColor: isSelected ? role.light : SURFACE,
                  },
                ]}
              >
                <View
                  style={[
                    styles.roleIconCircle,
                    {
                      backgroundColor: SURFACE,
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
                            backgroundColor: role.light,
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
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.noteCard}>
          <ShieldCheck
            size={17}
            color={selectedOption.accent}
            strokeWidth={2.6}
          />

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
          activeOpacity={0.8}
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
    paddingTop: 42,
    paddingBottom: 34,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 26,
  },
  logoCircle: {
    width: 66,
    height: 66,
    borderRadius: 24,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  title: {
    color: TEXT,
    fontSize: 25,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
  },
  rolesContainer: {
    marginBottom: 18,
  },
  roleCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  roleIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
    borderWidth: 1,
    borderColor: BORDER,
  },
  roleContent: {
    flex: 1,
  },
  roleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    flexWrap: "wrap",
  },
  roleTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    marginRight: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "900",
  },
  roleDescription: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
  noteCard: {
    backgroundColor: SOFT_PANEL,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  noteText: {
    flex: 1,
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 17,
    marginLeft: 10,
  },
  continueButton: {
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 14,
  },
  continueButtonText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "900",
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  backButtonText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "800",
  },
});