import { useCallback, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  HeartPulse,
  Languages,
  Lock,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PatientProfile">;

type LinkedDoctor = {
  id: string;
  fullName: string;
  specialization?: string | null;
};

type LinkedCaregiver = {
  id: string;
  fullName: string;
  relationship?: string | null;
};

type LinkedUsers = {
  doctor: LinkedDoctor | null;
  caregiver: LinkedCaregiver | null;
};

type PatientProfileData = {
  id?: string;
  fullName?: string;
  firstName?: string;
  email?: string;
  phoneNumber?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  emergencyContact?: string | null;
  medicalConditions?: string | string[] | null;
  accountStatus?: string;
  isEmailVerified?: boolean;
};

type PatientProfileApiResponse = {
  success: boolean;
  message: string;
  data?: {
    patient?: PatientProfileData;
    linkedUsers?: LinkedUsers;
  };
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#3F6FD0";
const PRIMARY_LIGHT = "#EEF4FF";

const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";

const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const getInitials = (name?: string | null) => {
  if (!name) {
    return "P";
  }

  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) {
    return "P";
  }

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const getDisplayValue = (value?: string | null) => {
  if (!value || !value.trim()) {
    return "Not added";
  }

  return value;
};

const formatMedicalConditions = (
  conditions?: string | string[] | null
): string => {
  if (!conditions) {
    return "Not added";
  }

  if (Array.isArray(conditions)) {
    return conditions.length > 0 ? conditions.join(", ") : "Not added";
  }

  return conditions.trim() || "Not added";
};

const formatAccountStatus = (status?: string) => {
  if (!status) {
    return "Active";
  }

  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const PatientProfileScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<PatientProfileData | null>(
    route.params?.user || null
  );
  const [linkedUsers, setLinkedUsers] = useState<LinkedUsers>({
    doctor: null,
    caregiver: null,
  });
  const [isLoading, setIsLoading] = useState(!route.params?.user);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadProfile = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const token = await tokenStorage.getToken();

        if (!token) {
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
          return;
        }

        const response = await fetch(`${API_BASE_URL}/patient/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        let result: PatientProfileApiResponse | any = {};

        try {
          result = await response.json();
        } catch (error) {
          result = {};
        }

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load profile.");
        }

        if (result.data?.patient) {
          setProfile(result.data.patient);
        }

        if (result.data?.linkedUsers) {
          setLinkedUsers(result.data.linkedUsers);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load profile.";

        setErrorMessage(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [navigation]
  );

  useFocusEffect(
    useCallback(() => {
      loadProfile("initial");
    }, [loadProfile])
  );

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

          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        },
      },
    ]);
  };

  const showComingSoon = (title: string) => {
    Alert.alert("Coming soon", `${title} will be connected later.`);
  };

  const fullName =
    profile?.fullName ||
    route.params?.user?.fullName ||
    profile?.firstName ||
    "Patient";

  const email = profile?.email || route.params?.user?.email || "Not added";
  const phone = profile?.phoneNumber || profile?.phone || null;
  const initials = getInitials(fullName);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.7} />
          </TouchableOpacity>

          <View style={styles.appBarTextBlock}>
            <Text style={styles.appBarTitle}>Profile</Text>
            <Text style={styles.appBarSubtitle}>
              Manage account and preferences
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(36, insets.bottom + 36),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadProfile("refresh")}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        >
          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIconCircle}>
                <AlertCircle size={22} color={DANGER} strokeWidth={2.6} />
              </View>

              <View style={styles.errorTextBlock}>
                <Text style={styles.errorTitle}>Profile unavailable</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>

                <TouchableOpacity
                  style={styles.retryButton}
                  activeOpacity={0.85}
                  onPress={() => loadProfile("initial")}
                >
                  <RefreshCw size={16} color={SURFACE} strokeWidth={2.5} />
                  <Text style={styles.retryButtonText}>Try again</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {!isLoading ? (
            <>
              <View style={styles.profileCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>

                <View style={styles.profileTextBlock}>
                  <View style={styles.nameRow}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {fullName}
                    </Text>

                    {profile?.isEmailVerified ? (
                      <View style={styles.verifiedBadge}>
                        <CheckCircle2
                          size={13}
                          color="#167A58"
                          strokeWidth={2.6}
                        />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.profileRole}>Patient</Text>

                  <View style={styles.contactRow}>
                    <Mail size={15} color={MUTED} strokeWidth={2.3} />
                    <Text style={styles.contactText} numberOfLines={1}>
                      {email}
                    </Text>
                  </View>

                  <View style={styles.contactRow}>
                    <Phone size={15} color={MUTED} strokeWidth={2.3} />
                    <Text style={styles.contactText} numberOfLines={1}>
                      {getDisplayValue(phone)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.accountStatusPanel}>
                <View style={styles.statusIconCircle}>
                  <CheckCircle2 size={21} color={SUCCESS} strokeWidth={2.6} />
                </View>

                <View style={styles.statusTextBlock}>
                  <Text style={styles.statusTitle}>Account status</Text>
                  <Text style={styles.statusText}>
                    {formatAccountStatus(profile?.accountStatus)}
                  </Text>
                </View>
              </View>

              <ProfileSection title="Personal Details">
                <ProfileRow
                  icon={<Calendar size={20} color={PRIMARY} strokeWidth={2.5} />}
                  title="Date of birth"
                  value={getDisplayValue(profile?.dateOfBirth)}
                  onPress={() => showComingSoon("Date of birth")}
                />

                <ProfileRow
                  icon={
                    <UserRound size={20} color={PRIMARY} strokeWidth={2.5} />
                  }
                  title="Gender"
                  value={getDisplayValue(profile?.gender)}
                  onPress={() => showComingSoon("Gender")}
                />

                <ProfileRow
                  icon={<Phone size={20} color={PRIMARY} strokeWidth={2.5} />}
                  title="Emergency contact"
                  value={getDisplayValue(profile?.emergencyContact)}
                  onPress={() => showComingSoon("Emergency contact")}
                />

                <ProfileRow
                  icon={
                    <HeartPulse size={20} color={PRIMARY} strokeWidth={2.5} />
                  }
                  title="Medical conditions"
                  value={formatMedicalConditions(profile?.medicalConditions)}
                  onPress={() => showComingSoon("Medical conditions")}
                  isLast
                />
              </ProfileSection>

              <ProfileSection title="Linked Users">
                <ProfileRow
                  icon={
                    <Stethoscope size={20} color={PRIMARY} strokeWidth={2.5} />
                  }
                  title="Doctor"
                  value={
                    linkedUsers.doctor
                      ? `Dr. ${linkedUsers.doctor.fullName}`
                      : "Not assigned yet"
                  }
                  onPress={() => showComingSoon("Assigned doctor")}
                />

                <ProfileRow
                  icon={<Users size={20} color={PRIMARY} strokeWidth={2.5} />}
                  title="Caregiver"
                  value={
                    linkedUsers.caregiver
                      ? linkedUsers.caregiver.fullName
                      : "Not linked yet"
                  }
                  onPress={() => showComingSoon("Linked caregiver")}
                  isLast
                />
              </ProfileSection>

              <ProfileSection title="Settings">
                <ProfileRow
                  icon={<Bell size={20} color={PRIMARY} strokeWidth={2.5} />}
                  title="Notification preferences"
                  value="Medicine and health alerts"
                  onPress={() => showComingSoon("Notification preferences")}
                />

                <ProfileRow
                  icon={<Clock size={20} color={PRIMARY} strokeWidth={2.5} />}
                  title="Reminder settings"
                  value="Medicine reminders"
                  onPress={() => showComingSoon("Reminder settings")}
                />

                <ProfileRow
                  icon={
                    <ShieldAlert size={20} color={PRIMARY} strokeWidth={2.5} />
                  }
                  title="Safety response settings"
                  value="Critical vital alerts"
                  onPress={() => showComingSoon("Safety response settings")}
                />

                <ProfileRow
                  icon={
                    <Languages size={20} color={PRIMARY} strokeWidth={2.5} />
                  }
                  title="Language and accessibility"
                  value="App preferences"
                  onPress={() => showComingSoon("Language and accessibility")}
                />

                <ProfileRow
                  icon={<Lock size={20} color={PRIMARY} strokeWidth={2.5} />}
                  title="Privacy and security"
                  value="Account security"
                  onPress={() => showComingSoon("Privacy and security")}
                  isLast
                />
              </ProfileSection>

              <TouchableOpacity
                style={styles.logoutButton}
                activeOpacity={0.86}
                onPress={handleLogout}
              >
                <LogOut size={19} color={DANGER} strokeWidth={2.6} />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const ProfileSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
};

const ProfileRow = ({
  icon,
  title,
  value,
  onPress,
  isLast,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  onPress: () => void;
  isLast?: boolean;
}) => {
  return (
    <TouchableOpacity
      style={[styles.profileRow, isLast ? styles.profileRowLast : undefined]}
      activeOpacity={0.82}
      onPress={onPress}
    >
      <View style={styles.rowIconCircle}>{icon}</View>

      <View style={styles.rowTextBlock}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      </View>

      <ChevronRight size={19} color="#B7C1D4" strokeWidth={2.4} />
    </TouchableOpacity>
  );
};

export default PatientProfileScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  appBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    borderWidth: 1,
    borderColor: BORDER,
  },
  appBarTextBlock: {
    flex: 1,
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  loadingCard: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  loadingText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  errorCard: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 20,
    padding: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  errorIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTextBlock: {
    flex: 1,
  },
  errorTitle: {
    color: "#B42318",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 5,
  },
  errorText: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: DANGER,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  retryButtonText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 6,
  },
  profileCard: {
    backgroundColor: SURFACE,
    borderRadius: 24,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    color: SURFACE,
    fontSize: 22,
    fontWeight: "900",
  },
  profileTextBlock: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  profileName: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
    marginRight: 8,
    maxWidth: "72%",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: {
    color: "#167A58",
    fontSize: 9,
    fontWeight: "900",
    marginLeft: 4,
  },
  profileRole: {
    color: PRIMARY_DARK,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  contactText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
    flex: 1,
  },
  accountStatusPanel: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#B7E8D3",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  statusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    borderWidth: 1,
    borderColor: "#B7E8D3",
  },
  statusTextBlock: {
    flex: 1,
  },
  statusTitle: {
    color: "#167A58",
    fontSize: 13,
    fontWeight: "900",
  },
  statusText: {
    color: "#167A58",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  sectionCard: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    paddingTop: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  profileRowLast: {
    borderBottomWidth: 0,
  },
  rowIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  rowTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 3,
  },
  rowValue: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },
  logoutButton: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    marginTop: 2,
  },
  logoutText: {
    color: DANGER,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
});