import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

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
  icon: string;
  borderColor: string;
  iconBackground: string;
  iconColor: string;
  badge?: string;
};

const roleOptions: RoleOption[] = [
  {
    id: "PATIENT",
    title: "Patient",
    description: "Manage medicines, vitals, consultations and orders",
    icon: "♡",
    borderColor: "#2563EB",
    iconBackground: "#DBEAFE",
    iconColor: "#2563EB",
  },
  {
    id: "DOCTOR",
    title: "Doctor",
    description: "Monitor patients, prescriptions and safety alerts",
    icon: "⌁",
    borderColor: "#14B8A6",
    iconBackground: "#CCFBF1",
    iconColor: "#14B8A6",
    badge: "Verification required",
  },
  {
    id: "CAREGIVER",
    title: "Caregiver",
    description: "Support linked patient and view alerts",
    icon: "👥",
    borderColor: "#F59E0B",
    iconBackground: "#FEF3C7",
    iconColor: "#F59E0B",
  },
  {
    id: "PHARMACY",
    title: "Pharmacy",
    description: "Manage prescription-linked fulfilment requests",
    icon: "▣",
    borderColor: "#8B5CF6",
    iconBackground: "#EDE9FE",
    iconColor: "#8B5CF6",
    badge: "Verification required",
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
      Alert.alert(
        "Doctor verification required",
        "Doctor registration will be connected with admin verification after patient authentication is completed."
      );
      return;
    }

    if (selectedRole === "PHARMACY") {
      Alert.alert(
        "Pharmacy verification required",
        "Pharmacy registration will be connected with admin verification after patient authentication is completed."
      );
      return;
    }

    if (selectedRole === "CAREGIVER") {
      Alert.alert(
        "Caregiver registration coming next",
        "Caregiver registration will be connected after the patient authentication flow is completed."
      );
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
                    borderColor: isSelected ? role.borderColor : "#E2E8F0",
                  },
                ]}
              >
                <View
                  style={[
                    styles.roleIconCircle,
                    {
                      backgroundColor: role.iconBackground,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleIcon,
                      {
                        color: role.iconColor,
                      },
                    ]}
                  >
                    {role.icon}
                  </Text>
                </View>

                <View style={styles.roleContent}>
                  <View style={styles.roleTitleRow}>
                    <Text style={styles.roleTitle}>{role.title}</Text>

                    {role.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{role.badge}</Text>
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
          <Text style={styles.noteIcon}>♡</Text>

          <Text style={styles.noteText}>
            Doctors and pharmacies require admin verification.
          </Text>
        </View>

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
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
    paddingTop: 56,
    paddingBottom: 34,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  title: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "500",
  },
  rolesContainer: {
    marginBottom: 18,
  },
  roleCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  roleIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  roleIcon: {
    fontSize: 24,
    fontWeight: "800",
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
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
    marginRight: 8,
  },
  badge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    color: "#92400E",
    fontSize: 8,
    fontWeight: "800",
  },
  roleDescription: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
  },
  noteCard: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  noteIcon: {
    color: "#2563EB",
    fontSize: 15,
    marginRight: 10,
    fontWeight: "800",
  },
  noteText: {
    flex: 1,
    color: "#1E40AF",
    fontSize: 11,
    fontWeight: "600",
  },
  continueButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 14,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  backButtonText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
  },
});