
import type { ReactNode } from "react";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  Clock3,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
} from "lucide-react-native";

import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type DoctorPendingApprovalScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "DoctorPendingApproval"
>;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const DOCTOR_PRIMARY = "#7C3AED";
const DOCTOR_DARK = "#5B21B6";
const DOCTOR_LIGHT = "#F3E8FF";
const WARNING = "#F6A545";
const WARNING_LIGHT = "#FFF3E2";

const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";

export const DoctorPendingApprovalScreen = ({
  navigation,
  route,
}: DoctorPendingApprovalScreenProps) => {
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const user = route.params?.user;
  const displayName = user?.fullName || "Doctor";
  const email = user?.email || route.params?.email || "doctor account";

  const refreshStatus = async () => {
    try {
      setIsRefreshing(true);

      const token = await tokenStorage.getToken();

      if (!token) {
        Alert.alert("Session expired", "Please login again.");

        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });

        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let result: any = {};

      try {
        result = await response.json();
      } catch (error) {
        result = {};
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to refresh status.");
      }

      const currentUser = result.data.user;

      if (
        currentUser?.role === "DOCTOR" &&
        (currentUser.accountStatus === "ACTIVE" ||
          currentUser.accountStatus === "APPROVED")
      ) {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "DoctorTabs",
              params: {
                user: currentUser,
              },
            },
          ],
        });

        return;
      }

      Alert.alert(
        "Still pending",
        "Your doctor account is still waiting for admin approval."
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to refresh status.";

      Alert.alert("Unable to refresh", message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const backToLogin = async () => {
    await tokenStorage.removeToken();

    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom + 18, 34),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Stethoscope size={24} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
          </View>

          <View>
            <Text style={styles.brandTitle}>CareMate+ Doctor</Text>
            <Text style={styles.brandSubtitle}>Verification required</Text>
          </View>
        </View>

        <View style={styles.mainCard}>
          <View style={styles.statusIconCircle}>
            <Clock3 size={34} color={WARNING} strokeWidth={2.6} />
          </View>

          <Text style={styles.title}>Waiting for admin approval</Text>

          <Text style={styles.subtitle}>
            Hi {displayName}, your doctor account has been submitted. You can
            access patient data after admin verifies your GMC details and
            uploaded documents.
          </Text>

          <View style={styles.emailBox}>
            <Text style={styles.emailLabel}>Submitted account</Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>
        </View>

        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>Verification steps</Text>

          <StepRow
            icon={<ShieldCheck size={18} color={SUCCESS} strokeWidth={2.5} />}
            title="Email verification"
            text="Confirm your email address from the verification link."
            done
          />

          <StepRow
            icon={<Clock3 size={18} color={WARNING} strokeWidth={2.5} />}
            title="Admin review"
            text="Admin checks your GMC number and 3 uploaded documents."
          />

          <StepRow
            icon={
              <Stethoscope
                size={18}
                color={DOCTOR_PRIMARY}
                strokeWidth={2.5}
              />
            }
            title="Doctor access"
            text="Once approved, you can open the doctor dashboard."
          />
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isRefreshing ? styles.disabledButton : undefined,
            ]}
            activeOpacity={0.88}
            onPress={refreshStatus}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator color={SURFACE} />
            ) : (
              <>
                <RefreshCw size={18} color={SURFACE} strokeWidth={2.6} />
                <Text style={styles.primaryButtonText}>Refresh Status</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.logoutButton,
              isRefreshing ? styles.disabledButton : undefined,
            ]}
            activeOpacity={0.86}
            onPress={backToLogin}
            disabled={isRefreshing}
          >
            <LogOut size={18} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
            <Text style={styles.logoutButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const StepRow = ({
  icon,
  title,
  text,
  done,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  done?: boolean;
}) => {
  return (
    <View style={styles.stepRow}>
      <View
        style={[
          styles.stepIconBox,
          done ? styles.stepIconBoxDone : undefined,
        ]}
      >
        {icon}
      </View>

      <View style={styles.stepTextBlock}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  brandTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  mainCard: {
    backgroundColor: SURFACE,
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  statusIconCircle: {
    width: 78,
    height: 78,
    borderRadius: 28,
    backgroundColor: WARNING_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },
  title: {
    color: TEXT,
    fontSize: 23,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 10,
  },
  emailBox: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 16,
    padding: 13,
    width: "100%",
    marginTop: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emailLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },
  emailText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  stepsCard: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  stepsTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  stepIconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: WARNING_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  stepIconBoxDone: {
    backgroundColor: SUCCESS_LIGHT,
  },
  stepTextBlock: {
    flex: 1,
  },
  stepTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  stepText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 3,
  },
  bottomActions: {
    marginTop: "auto",
    paddingTop: 6,
  },
  primaryButton: {
    backgroundColor: DOCTOR_PRIMARY,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryButtonText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
  logoutButton: {
    backgroundColor: DOCTOR_LIGHT,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 11,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  logoutButtonText: {
    color: DOCTOR_DARK,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.65,
  },
});