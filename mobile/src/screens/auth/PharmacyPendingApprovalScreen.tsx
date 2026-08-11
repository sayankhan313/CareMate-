import {
  Alert,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CommonActions } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Clock3,
  FileCheck2,
  LogOut,
  MailCheck,
  ShieldCheck,
  Store,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type PharmacyPendingApprovalScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "PharmacyPendingApproval"
>;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";

const PHARMACY = "#16A34A";
const PHARMACY_DARK = "#0F6B3A";
const PHARMACY_CONTAINER = "#ECFDF3";
const ON_PHARMACY_CONTAINER = "#064E3B";

const WARNING_CONTAINER = "#FFF3E2";
const ON_WARNING_CONTAINER = "#7A4708";

const BORDER = "#E4E8F2";

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.07 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: {
    width: 0,
    height: level,
  },
});

export const PharmacyPendingApprovalScreen = ({
  navigation,
  route,
}: PharmacyPendingApprovalScreenProps) => {
  const user = route.params?.user;
  const email = route.params?.email || user?.email || "your registered email";

  const logout = async () => {
    await tokenStorage.removeToken();

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: "Login",
          },
        ],
      })
    );
  };

  const checkAgain = () => {
    Alert.alert(
      "Approval pending",
      "If admin has approved your pharmacy account, logout and login again to refresh your account status."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.container}>
        <View style={styles.iconHero}>
          <Store size={36} color={PHARMACY} strokeWidth={2.6} />
        </View>

        <Text style={styles.title}>Pharmacy Verification Pending</Text>

        <Text style={styles.subtitle}>
          Your email is verified, but your pharmacy account still needs admin
          approval before you can access pharmacy workflows.
        </Text>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={styles.statusIconSuccess}>
              <MailCheck
                size={20}
                color={ON_PHARMACY_CONTAINER}
                strokeWidth={2.6}
              />
            </View>

            <View style={styles.statusTextBlock}>
              <Text style={styles.statusTitle}>Email verified</Text>
              <Text style={styles.statusText}>{email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statusRow}>
            <View style={styles.statusIconWarning}>
              <Clock3
                size={20}
                color={ON_WARNING_CONTAINER}
                strokeWidth={2.6}
              />
            </View>

            <View style={styles.statusTextBlock}>
              <Text style={styles.statusTitle}>Admin review pending</Text>
              <Text style={styles.statusText}>
                Admin will check your pharmacy registration, licence and address
                proof.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <ShieldCheck size={18} color={PHARMACY_DARK} strokeWidth={2.6} />
          <Text style={styles.infoText}>
            Once approved, login again and your pharmacy dashboard will open
            after the pharmacy module is connected.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.88}
          onPress={checkAgain}
        >
          <FileCheck2 size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.primaryButtonText}>Check Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.86}
          onPress={logout}
        >
          <LogOut size={17} color={PHARMACY_DARK} strokeWidth={2.5} />
          <Text style={styles.logoutButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: "center",
  },
  iconHero: {
    width: 82,
    height: 82,
    borderRadius: 24,
    backgroundColor: PHARMACY_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
    ...elevate(2),
  },
  title: {
    color: TEXT,
    fontSize: 25,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 9,
  },
  subtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    ...elevate(2),
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIconSuccess: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PHARMACY_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statusIconWarning: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: WARNING_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statusTextBlock: {
    flex: 1,
  },
  statusTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  statusText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginVertical: 14,
  },
  infoCard: {
    backgroundColor: PHARMACY_CONTAINER,
    borderRadius: 16,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  infoText: {
    flex: 1,
    color: ON_PHARMACY_CONTAINER,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginLeft: 9,
  },
  primaryButton: {
    height: 52,
    borderRadius: 15,
    backgroundColor: PHARMACY,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 12,
    ...elevate(2),
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },
  logoutButton: {
    height: 50,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...elevate(1),
  },
  logoutButtonText: {
    color: PHARMACY_DARK,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
});