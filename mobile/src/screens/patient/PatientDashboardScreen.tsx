import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../../constants/colors";
import { tokenStorage } from "../../services/tokenStorage";

type Props = {
  navigation: any;
  route: any;
};

export const PatientDashboardScreen = ({ navigation, route }: Props) => {
  const user = route.params?.user;

  const handleLogout = async () => {
    try {
      await tokenStorage.removeToken();

      navigation.reset({
        index: 0,
        routes: [
          {
            name: "Login",
          },
        ],
      });
    } catch (error) {
      Alert.alert("Logout failed", "Something went wrong while logging out.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "P"}
            </Text>
          </View>

          <Text style={styles.title}>Patient Dashboard</Text>

          <Text style={styles.subtitle}>
            Welcome back, {user?.fullName || "Patient"}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Account Details</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>
              {user?.fullName || "Not available"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>
              {user?.email || "Not available"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{user?.role || "PATIENT"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Status</Text>
            <Text style={styles.infoValue}>
              {user?.accountStatus || "ACTIVE"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email Verified</Text>
            <Text style={styles.infoValue}>
              {user?.isEmailVerified ? "Yes" : "No"}
            </Text>
          </View>
        </View>

        <View style={styles.nextCard}>
          <Text style={styles.sectionTitle}>Next Module</Text>

          <Text style={styles.nextText}>
            Patient features such as medication reminders, vitals, appointments,
            emergency support and caregiver access will be connected after the
            authentication flow is completed.
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 18,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "800",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: "#EAF2FF",
    fontSize: 15,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 14,
  },
  infoRow: {
    marginBottom: 14,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedText,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  nextCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
  },
  nextText: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
  },
  logoutButton: {
    backgroundColor: colors.danger,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 20,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});