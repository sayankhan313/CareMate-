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
import { CommonActions } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Bell,
  ClipboardList,
  Clock3,
  FileCheck2,
  LogOut,
  PackageCheck,
  Pill,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type PharmacyDashboardScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "PharmacyDashboard"
>;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";

const PHARMACY = "#16A34A";
const PHARMACY_DARK = "#0F6B3A";
const PHARMACY_CONTAINER = "#ECFDF3";
const ON_PHARMACY_CONTAINER = "#064E3B";

const WARNING_CONTAINER = "#FFF3E2";
const ON_WARNING_CONTAINER = "#7A4708";

const BLUE_CONTAINER = "#EEF4FF";
const ON_BLUE_CONTAINER = "#1D4ED8";

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

export const PharmacyDashboardScreen = ({
  navigation,
  route,
}: PharmacyDashboardScreenProps) => {
  const insets = useSafeAreaInsets();
  const user = route.params?.user;

  const pharmacyName = user?.fullName || "Pharmacy";

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

  const comingSoon = (title: string) => {
    Alert.alert(
      title,
      "This pharmacy feature will be connected after backend pharmacy orders module is completed."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.identityRow}>
            <View style={styles.logoBox}>
              <Store size={24} color={PHARMACY} strokeWidth={2.6} />
            </View>

            <View style={styles.titleBlock}>
              <Text style={styles.kicker}>CareMate+ Pharmacy</Text>
              <Text style={styles.title} numberOfLines={1}>
                {pharmacyName}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.85}
            onPress={logout}
          >
            <LogOut size={20} color={MUTED} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: Math.max(insets.bottom + 28, 46),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconBox}>
                <ShieldCheck size={28} color="#FFFFFF" strokeWidth={2.6} />
              </View>

              <View style={styles.activeChip}>
                <Text style={styles.activeChipText}>ACTIVE</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>Pharmacy dashboard ready</Text>
            <Text style={styles.heroText}>
              Your pharmacy account is approved. Temporary dashboard is active
              until medicine order fulfilment is connected.
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconGreen}>
                <ClipboardList
                  size={20}
                  color={ON_PHARMACY_CONTAINER}
                  strokeWidth={2.5}
                />
              </View>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>New orders</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWarning}>
                <Clock3
                  size={20}
                  color={ON_WARNING_CONTAINER}
                  strokeWidth={2.5}
                />
              </View>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconBlue}>
                <Truck
                  size={20}
                  color={ON_BLUE_CONTAINER}
                  strokeWidth={2.5}
                />
              </View>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Ready</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconGreen}>
                <PackageCheck
                  size={20}
                  color={ON_PHARMACY_CONTAINER}
                  strokeWidth={2.5}
                />
              </View>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick actions</Text>
            <Text style={styles.sectionMeta}>Temporary</Text>
          </View>

          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={styles.actionRow}
              activeOpacity={0.86}
              onPress={() => comingSoon("Prescription orders")}
            >
              <View style={styles.actionIconBox}>
                <Pill size={20} color={PHARMACY} strokeWidth={2.5} />
              </View>

              <View style={styles.actionTextBlock}>
                <Text style={styles.actionTitle}>Prescription orders</Text>
                <Text style={styles.actionText}>
                  View patient medicine fulfilment requests.
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              activeOpacity={0.86}
              onPress={() => comingSoon("Order status")}
            >
              <View style={styles.actionIconBox}>
                <FileCheck2 size={20} color={PHARMACY} strokeWidth={2.5} />
              </View>

              <View style={styles.actionTextBlock}>
                <Text style={styles.actionTitle}>Update order status</Text>
                <Text style={styles.actionText}>
                  Mark orders as preparing, ready or delivered.
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              activeOpacity={0.86}
              onPress={() => comingSoon("Notifications")}
            >
              <View style={styles.actionIconBox}>
                <Bell size={20} color={PHARMACY} strokeWidth={2.5} />
              </View>

              <View style={styles.actionTextBlock}>
                <Text style={styles.actionTitle}>Notifications</Text>
                <Text style={styles.actionText}>
                  Get alerts when new patient orders arrive.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Demo note</Text>
            <Text style={styles.noteText}>
              This is a temporary pharmacy dashboard for project flow testing.
              Next step is to connect real pharmacy orders from the backend.
            </Text>
          </View>
        </ScrollView>
      </View>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  identityRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  logoBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: PHARMACY_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  titleBlock: {
    flex: 1,
  },
  kicker: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  title: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "700",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    ...elevate(2),
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
  },
  heroCard: {
    backgroundColor: PHARMACY,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    ...elevate(3),
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeChip: {
    backgroundColor: PHARMACY_CONTAINER,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  activeChipText: {
    color: ON_PHARMACY_CONTAINER,
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 7,
  },
  heroText: {
    color: "#DCFCE7",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    ...elevate(2),
  },
  statIconGreen: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PHARMACY_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statIconWarning: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: WARNING_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statIconBlue: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BLUE_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    color: TEXT,
    fontSize: 23,
    fontWeight: "700",
    marginBottom: 2,
  },
  statLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },
  sectionMeta: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },
  actionsCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    ...elevate(2),
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: PHARMACY_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionTextBlock: {
    flex: 1,
  },
  actionTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  actionText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginVertical: 8,
  },
  noteCard: {
    backgroundColor: PHARMACY_CONTAINER,
    borderRadius: 16,
    padding: 14,
  },
  noteTitle: {
    color: ON_PHARMACY_CONTAINER,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  noteText: {
    color: ON_PHARMACY_CONTAINER,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
});