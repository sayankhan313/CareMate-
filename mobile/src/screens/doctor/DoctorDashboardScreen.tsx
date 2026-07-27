import type { ReactNode } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CommonActions } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  LogOut,
  MessageSquareText,
  Search,
  ShieldAlert,
  Stethoscope,
  UserRound,
  UsersRound,
  Video,
} from "lucide-react-native";

import { tokenStorage } from "../../services/tokenStorage";
import type { DoctorTabParamList } from "../../types/navigation";

type DoctorDashboardScreenProps = BottomTabScreenProps<
  DoctorTabParamList,
  "Home"
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

const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const getGreetingText = () => {
  const currentHour = new Date().getHours();

  if (currentHour < 12) {
    return "Good morning";
  }

  if (currentHour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
};

export const DoctorDashboardScreen = ({
  navigation,
  route,
}: DoctorDashboardScreenProps) => {
  const insets = useSafeAreaInsets();

  const user = route.params?.user;
  const firstName =
    user?.fullName?.split(" ")[0]?.replace("Dr", "").trim() || "Doctor";
  const initial = firstName.charAt(0).toUpperCase() || "D";

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await tokenStorage.removeToken();

          const rootNavigation = navigation.getParent();

          if (rootNavigation) {
            rootNavigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: "Login",
                  },
                ],
              })
            );
            return;
          }

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
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.greetingBlock}>
            <Text style={styles.helloText}>
              {getGreetingText()}, Dr {firstName}
            </Text>
            <Text style={styles.subHelloText}>
              Manage consultations, alerts and patient reviews
            </Text>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity style={styles.roundButton} activeOpacity={0.85}>
              <Search size={18} color={TEXT} strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.roundButton} activeOpacity={0.85}>
              <Bell size={18} color={TEXT} strokeWidth={2.5} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.85}
              onPress={handleLogout}
            >
              <LogOut size={18} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom + 98, 120),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View>
                <View style={styles.roleBadge}>
                  <Stethoscope
                    size={14}
                    color={DOCTOR_DARK}
                    strokeWidth={2.6}
                  />
                  <Text style={styles.roleBadgeText}>Doctor Workspace</Text>
                </View>

                <Text style={styles.summaryTitle}>Today’s care overview</Text>
                <Text style={styles.summarySubtitle}>
                  Demo dashboard ready. Real consultation data will connect next.
                </Text>
              </View>

              <View style={styles.summaryIconBox}>
                <ClipboardList
                  size={28}
                  color={DOCTOR_PRIMARY}
                  strokeWidth={2.6}
                />
              </View>
            </View>

            <View style={styles.statsRow}>
              <SummaryStat label="Consults" value="3" />
              <SummaryStat label="Reviews" value="5" />
              <SummaryStat label="Alerts" value="1" />
            </View>
          </View>

          <View style={styles.quickGrid}>
            <QuickAction
              label="Consultations"
              icon={<Video size={23} color={DOCTOR_PRIMARY} strokeWidth={2.5} />}
            />

            <QuickAction
              label="Patients"
              icon={
                <UsersRound
                  size={23}
                  color={DOCTOR_PRIMARY}
                  strokeWidth={2.5}
                />
              }
            />

            <QuickAction
              label="Doctor Notes"
              icon={
                <MessageSquareText
                  size={23}
                  color={DOCTOR_PRIMARY}
                  strokeWidth={2.5}
                />
              }
            />

            <QuickAction
              label="Alerts"
              icon={
                <ShieldAlert
                  size={23}
                  color={DOCTOR_PRIMARY}
                  strokeWidth={2.5}
                />
              }
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming consultations</Text>
            <Text style={styles.sectionAction}>View all</Text>
          </View>

          <View style={styles.whitePanel}>
            <ConsultationRow
              time="10:30"
              title="Video consultation"
              patient="Patient: Sarah Ahmed"
              status="Accepted"
              tone="success"
            />

            <ConsultationRow
              time="12:15"
              title="Medicine review"
              patient="Patient: James Wilson"
              status="Pending"
              tone="warning"
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Patient alerts</Text>
          </View>

          <View style={styles.alertCard}>
            <View style={styles.alertIconBox}>
              <ShieldAlert size={22} color={DANGER} strokeWidth={2.6} />
            </View>

            <View style={styles.alertTextBlock}>
              <Text style={styles.alertTitle}>Critical vitals review</Text>
              <Text style={styles.alertText}>
                One patient has an emergency safety response awaiting doctor
                review.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const SummaryStat = ({ label, value }: { label: string; value: string }) => {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryStatValue}>{value}</Text>
      <Text style={styles.summaryStatLabel}>{label}</Text>
    </View>
  );
};

const QuickAction = ({
  label,
  icon,
}: {
  label: string;
  icon: ReactNode;
}) => {
  return (
    <TouchableOpacity style={styles.quickAction} activeOpacity={0.86}>
      <View style={styles.quickIconBox}>{icon}</View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const ConsultationRow = ({
  time,
  title,
  patient,
  status,
  tone,
}: {
  time: string;
  title: string;
  patient: string;
  status: string;
  tone: "success" | "warning";
}) => {
  const isSuccess = tone === "success";

  return (
    <View style={styles.consultationRow}>
      <View style={styles.timeBox}>
        <CalendarDays size={16} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
        <Text style={styles.timeText}>{time}</Text>
      </View>

      <View style={styles.consultationTextBlock}>
        <Text style={styles.consultationTitle}>{title}</Text>
        <Text style={styles.consultationPatient}>{patient}</Text>
      </View>

      <View
        style={[
          styles.statusPill,
          {
            backgroundColor: isSuccess ? SUCCESS_LIGHT : WARNING_LIGHT,
          },
        ]}
      >
        <Text
          style={[
            styles.statusPillText,
            {
              color: isSuccess ? "#167A58" : "#A85A13",
            },
          ]}
        >
          {status}
        </Text>
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
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greetingBlock: {
    flex: 1,
    paddingRight: 12,
  },
  helloText: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subHelloText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
    borderWidth: 1,
    borderColor: BORDER,
  },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DOCTOR_PRIMARY,
    borderWidth: 1,
    borderColor: SURFACE,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: DOCTOR_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "900",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  summaryCard: {
    backgroundColor: DOCTOR_PRIMARY,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: DOCTOR_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
  },
  roleBadgeText: {
    color: DOCTOR_DARK,
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 6,
  },
  summaryTitle: {
    color: SURFACE,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginTop: 15,
  },
  summarySubtitle: {
    color: "#F5F0FF",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 250,
  },
  summaryIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.17)",
    borderRadius: 18,
    padding: 10,
    marginTop: 18,
  },
  summaryStat: {
    flex: 1,
    alignItems: "center",
  },
  summaryStatValue: {
    color: SURFACE,
    fontSize: 20,
    fontWeight: "900",
  },
  summaryStatLabel: {
    color: "#F5F0FF",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 3,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
    marginBottom: 12,
  },
  quickAction: {
    width: "50%",
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  quickIconBox: {
    backgroundColor: SURFACE,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 8,
  },
  quickLabel: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 3,
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  sectionAction: {
    color: DOCTOR_PRIMARY,
    fontSize: 12,
    fontWeight: "900",
  },
  whitePanel: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  consultationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  timeBox: {
    width: 58,
    height: 54,
    borderRadius: 16,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  timeText: {
    color: DOCTOR_DARK,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3,
  },
  consultationTextBlock: {
    flex: 1,
  },
  consultationTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  consultationPatient: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginLeft: 8,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "900",
  },
  alertCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
  },
  alertIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  alertTextBlock: {
    flex: 1,
  },
  alertTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  alertText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },
});