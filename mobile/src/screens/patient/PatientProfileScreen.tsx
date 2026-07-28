import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
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
  Crown,
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
  UsersRound,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { API_BASE_URL } from "../../constants/api";
import {
  doctorAssignmentApi,
  type AssignedDoctor,
} from "../../services/doctorAssignmentApi";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "PatientProfile"
>;

type LinkedCaregiver = {
  id: string;
  fullName: string;
  relationship?: string | null;
};

type LinkedUsers = {
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
    linkedUsers?: {
      caregiver?: LinkedCaregiver | null;
    };
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
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#F6A545";
const WARNING_DARK = "#A45A08";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: {
    width: 0,
    height: level === 1 ? 2 : 4,
  },
});

const formatDoctorName = (fullName: string) => {
  if (/^dr\.?\s/i.test(fullName.trim())) {
    return fullName.trim();
  }

  return `Dr. ${fullName.trim()}`;
};

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
    return conditions.length > 0
      ? conditions.join(", ")
      : "Not added";
  }

  return conditions.trim() || "Not added";
};

const formatAccountStatus = (status?: string) => {
  if (!status) {
    return "Not available";
  }

  return status
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ");
};

export const PatientProfileScreen = ({
  navigation,
  route,
}: Props) => {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] =
    useState<PatientProfileData | null>(
      route.params?.user || null
    );

  const [linkedUsers, setLinkedUsers] =
    useState<LinkedUsers>({
      caregiver: null,
    });

  const [assignedDoctors, setAssignedDoctors] = useState<
    AssignedDoctor[]
  >([]);

  const [isLoading, setIsLoading] = useState(
    !route.params?.user
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const primaryDoctor = useMemo(() => {
    return assignedDoctors.find(
      (assignment) =>
        assignment.assignmentType === "PRIMARY"
    );
  }, [assignedDoctors]);

  const specialistCount = useMemo(() => {
    return assignedDoctors.filter(
      (assignment) =>
        assignment.assignmentType === "SPECIALIST"
    ).length;
  }, [assignedDoctors]);

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

        const [profileResponse, assignedDoctorsResult] =
          await Promise.all([
            fetch(`${API_BASE_URL}/patient/profile`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),
            doctorAssignmentApi.getAssignedDoctors(),
          ]);

        let profileResult:
          | PatientProfileApiResponse
          | any = {};

        try {
          profileResult = await profileResponse.json();
        } catch {
          profileResult = {};
        }

        if (!profileResponse.ok || !profileResult.success) {
          throw new Error(
            profileResult.message || "Unable to load profile."
          );
        }

        if (profileResult.data?.patient) {
          setProfile(profileResult.data.patient);
        }

        setLinkedUsers({
          caregiver:
            profileResult.data?.linkedUsers?.caregiver || null,
        });

        setAssignedDoctors(
          assignedDoctorsResult.doctors || []
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load profile.";

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
      void loadProfile("initial");
    }, [loadProfile])
  );

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
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
      ]
    );
  };

  const showComingSoon = (title: string) => {
    Alert.alert(
      "Coming soon",
      `${title} will be connected later.`
    );
  };

  const fullName =
    profile?.fullName ||
    route.params?.user?.fullName ||
    profile?.firstName ||
    "Patient";

  const email =
    profile?.email ||
    route.params?.user?.email ||
    "Not added";

  const phone =
    profile?.phoneNumber || profile?.phone || null;

  const initials = getInitials(fullName);

  const assignedDoctorsText =
    assignedDoctors.length === 0
      ? "No doctors assigned"
      : assignedDoctors.length === 1
      ? "1 doctor assigned"
      : `${assignedDoctors.length} doctors assigned`;

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >
      <StatusBar
        backgroundColor={BACKGROUND}
        barStyle="dark-content"
      />

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
              Account, health and care team
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(
                130,
                insets.bottom + 120
              ),
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
              <Text style={styles.loadingText}>
                Loading profile...
              </Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIconCircle}>
                <AlertCircle
                  size={22}
                  color={DANGER}
                  strokeWidth={2.6}
                />
              </View>

              <View style={styles.errorTextBlock}>
                <Text style={styles.errorTitle}>
                  Profile unavailable
                </Text>

                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>

                <TouchableOpacity
                  style={styles.retryButton}
                  activeOpacity={0.85}
                  onPress={() => loadProfile("initial")}
                >
                  <RefreshCw
                    size={16}
                    color={SURFACE}
                    strokeWidth={2.5}
                  />
                  <Text style={styles.retryButtonText}>
                    Try again
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <View style={styles.profileCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>

                <View style={styles.profileTextBlock}>
                  <View style={styles.nameRow}>
                    <Text
                      style={styles.profileName}
                      numberOfLines={1}
                    >
                      {fullName}
                    </Text>

                    {profile?.isEmailVerified ? (
                      <View style={styles.verifiedBadge}>
                        <CheckCircle2
                          size={13}
                          color={SUCCESS_DARK}
                          strokeWidth={2.6}
                        />
                        <Text style={styles.verifiedText}>
                          Verified
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.profileRole}>Patient</Text>

                  <View style={styles.contactRow}>
                    <Mail size={15} color={MUTED} strokeWidth={2.3} />
                    <Text
                      style={styles.contactText}
                      numberOfLines={1}
                    >
                      {email}
                    </Text>
                  </View>

                  <View style={styles.contactRow}>
                    <Phone size={15} color={MUTED} strokeWidth={2.3} />
                    <Text
                      style={styles.contactText}
                      numberOfLines={1}
                    >
                      {getDisplayValue(phone)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.profileStatsCard}>
                <View style={styles.profileStat}>
                  <Text style={styles.profileStatValue}>
                    {assignedDoctors.length}
                  </Text>
                  <Text style={styles.profileStatLabel}>
                    Doctors
                  </Text>
                </View>

                <View style={styles.profileStatDivider} />

                <View style={styles.profileStat}>
                  <Text style={styles.profileStatValue}>
                    {specialistCount}
                  </Text>
                  <Text style={styles.profileStatLabel}>
                    Specialists
                  </Text>
                </View>

                <View style={styles.profileStatDivider} />

                <View style={styles.profileStat}>
                  <Text style={styles.profileStatValue}>
                    {profile?.isEmailVerified ? "Yes" : "No"}
                  </Text>
                  <Text style={styles.profileStatLabel}>
                    Verified
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.careTeamCard}
                activeOpacity={0.86}
                onPress={() => navigation.navigate("SelectDoctor")}
              >
                <View style={styles.careTeamHeader}>
                  <View style={styles.careTeamIcon}>
                    <UsersRound
                      size={24}
                      color={PRIMARY_DARK}
                      strokeWidth={2.5}
                    />
                  </View>

                  <View style={styles.careTeamHeading}>
                    <Text style={styles.careTeamTitle}>
                      My care team
                    </Text>
                    <Text style={styles.careTeamSubtitle}>
                      {assignedDoctorsText}
                    </Text>
                  </View>

                  <View style={styles.doctorCountBadge}>
                    <Text style={styles.doctorCountText}>
                      {assignedDoctors.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.primaryDoctorPanel}>
                  <View
                    style={[
                      styles.primaryDoctorIcon,
                      !primaryDoctor
                        ? styles.emptyPrimaryDoctorIcon
                        : undefined,
                    ]}
                  >
                    {primaryDoctor ? (
                      <Crown
                        size={19}
                        color={WARNING_DARK}
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Stethoscope
                        size={19}
                        color={MUTED}
                        strokeWidth={2.5}
                      />
                    )}
                  </View>

                  <View style={styles.primaryDoctorTextBlock}>
                    <Text style={styles.primaryDoctorLabel}>
                      Primary doctor
                    </Text>

                    <Text
                      style={styles.primaryDoctorName}
                      numberOfLines={1}
                    >
                      {primaryDoctor
                        ? formatDoctorName(
                            primaryDoctor.doctor.fullName
                          )
                        : "Not assigned"}
                    </Text>

                    {primaryDoctor?.doctor.specialization ? (
                      <Text
                        style={styles.primaryDoctorSpecialization}
                        numberOfLines={1}
                      >
                        {primaryDoctor.doctor.specialization}
                      </Text>
                    ) : null}
                  </View>

                  <ChevronRight
                    size={20}
                    color="#A8B2C5"
                    strokeWidth={2.5}
                  />
                </View>
              </TouchableOpacity>

              <View style={styles.accountStatusPanel}>
                <View style={styles.statusIconCircle}>
                  <CheckCircle2
                    size={21}
                    color={SUCCESS}
                    strokeWidth={2.6}
                  />
                </View>

                <View style={styles.statusTextBlock}>
                  <Text style={styles.statusTitle}>
                    Account status
                  </Text>

                  <Text style={styles.statusText}>
                    {formatAccountStatus(
                      profile?.accountStatus
                    )}
                  </Text>
                </View>
              </View>

              <ProfileSection title="Personal details">
                <ProfileRow
                  icon={
                    <Calendar
                      size={20}
                      color={PRIMARY}
                      strokeWidth={2.5}
                    />
                  }
                  title="Date of birth"
                  value={getDisplayValue(profile?.dateOfBirth)}
                  onPress={() =>
                    showComingSoon("Date of birth")
                  }
                />

                <ProfileRow
                  icon={
                    <UserRound
                      size={20}
                      color={PRIMARY}
                      strokeWidth={2.5}
                    />
                  }
                  title="Gender"
                  value={getDisplayValue(profile?.gender)}
                  onPress={() => showComingSoon("Gender")}
                />

                <ProfileRow
                  icon={
                    <Phone
                      size={20}
                      color={PRIMARY}
                      strokeWidth={2.5}
                    />
                  }
                  title="Emergency contact"
                  value={getDisplayValue(
                    profile?.emergencyContact
                  )}
                  onPress={() =>
                    showComingSoon("Emergency contact")
                  }
                />

                <ProfileRow
                  icon={
                    <HeartPulse
                      size={20}
                      color={PRIMARY}
                      strokeWidth={2.5}
                    />
                  }
                  title="Medical conditions"
                  value={formatMedicalConditions(
                    profile?.medicalConditions
                  )}
                  onPress={() =>
                    showComingSoon("Medical conditions")
                  }
                  isLast
                />
              </ProfileSection>

              <ProfileSection title="Linked users">
                <ProfileRow
                  icon={
                    <Stethoscope
                      size={20}
                      color={PRIMARY}
                      strokeWidth={2.5}
                    />
                  }
                  title="Assigned doctors"
                  value={assignedDoctorsText}
                  onPress={() =>
                    navigation.navigate("SelectDoctor")
                  }
                />

                <ProfileRow
                  icon={
                    <Crown
                      size={20}
                      color={WARNING}
                      strokeWidth={2.5}
                    />
                  }
                  title="Primary doctor"
                  value={
                    primaryDoctor
                      ? formatDoctorName(
                          primaryDoctor.doctor.fullName
                        )
                      : "Not assigned"
                  }
                  onPress={() =>
                    navigation.navigate("SelectDoctor")
                  }
                />

                <ProfileRow
                  icon={
                    <Users
                      size={20}
                      color={PRIMARY}
                      strokeWidth={2.5}
                    />
                  }
                  title="Caregiver"
                  value={
                    linkedUsers.caregiver
                      ? linkedUsers.caregiver.fullName
                      : "Not linked yet"
                  }
                  onPress={() =>
                    showComingSoon("Linked caregiver")
                  }
                  isLast
                />
              </ProfileSection>

              <ProfileSection title="Settings">
                <ProfileRow
                  icon={
                    <Bell
                      size={20}
                      color={PRIMARY}
                      strokeWidth={2.5}
                    />
                  }
                  title="Notification preferences"
                  value="Medicine and health alerts"
                  onPress={() =>
                    showComingSoon(
                      "Notification preferences"
                    )
                  }
                />

                <ProfileRow
                  icon={
                    <Clock
                      size={20}
                      color={PRIMARY}
                      strokeWidth={2.5}
                    />
                  }
                  title="Reminder settings"
                  value="Medicine reminders"
                  onPress={() =>
                    showComingSoon("Reminder settings")
                  }
                />

                <ProfileRow
                  icon={
                    <ShieldAlert
                      size={20}
                      color={PRIMARY}
                      strokeWidth={2.5}
                    />
                  }
                  title="Safety response settings"
                  value="Critical vital alerts"
                  onPress={() =>
                    showComingSoon(
                      "Safety response settings"
                    )
                  }
                />

                <ProfileRow
                  icon={
                    <Languages
                      size={20}
                      color={PRIMARY}
                      strokeWidth={2.5}
                    />
                  }
                  title="Language and accessibility"
                  value="App preferences"
                  onPress={() =>
                    showComingSoon(
                      "Language and accessibility"
                    )
                  }
                />

                <ProfileRow
                  icon={
                    <Lock
                      size={20}
                      color={PRIMARY}
                      strokeWidth={2.5}
                    />
                  }
                  title="Privacy and security"
                  value="Account security"
                  onPress={() =>
                    showComingSoon("Privacy and security")
                  }
                  isLast
                />
              </ProfileSection>

              <TouchableOpacity
                style={styles.logoutButton}
                activeOpacity={0.86}
                onPress={handleLogout}
              >
                <LogOut
                  size={19}
                  color={DANGER}
                  strokeWidth={2.6}
                />
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
      style={[
        styles.profileRow,
        isLast ? styles.profileRowLast : undefined,
      ]}
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

      <ChevronRight
        size={19}
        color="#B7C1D4"
        strokeWidth={2.4}
      />
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
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    ...elevate(1),
  },
  appBarTextBlock: {
    flex: 1,
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
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
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
    ...elevate(1),
  },
  loadingText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },
  errorCard: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 16,
    padding: 15,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  errorIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  errorTextBlock: {
    flex: 1,
  },
  errorTitle: {
    color: DANGER_DARK,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 5,
  },
  errorText: {
    color: DANGER_DARK,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: DANGER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  retryButtonText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  profileCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    ...elevate(1),
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    color: SURFACE,
    fontSize: 22,
    fontWeight: "700",
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
    fontWeight: "700",
    marginRight: 8,
    maxWidth: "72%",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: {
    color: SUCCESS_DARK,
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 4,
  },
  profileRole: {
    color: PRIMARY_DARK,
    fontSize: 12,
    fontWeight: "700",
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
    fontWeight: "500",
    marginLeft: 7,
    flex: 1,
  },
  profileStatsCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    ...elevate(1),
  },
  profileStat: {
    flex: 1,
    alignItems: "center",
  },
  profileStatValue: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },
  profileStatLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },
  profileStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: BORDER,
  },
  careTeamCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    ...elevate(1),
  },
  careTeamHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  careTeamIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  careTeamHeading: {
    flex: 1,
  },
  careTeamTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
  },
  careTeamSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },
  doctorCountBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  doctorCountText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "700",
  },
  primaryDoctorPanel: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },
  primaryDoctorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: WARNING_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  emptyPrimaryDoctorIcon: {
    backgroundColor: PRIMARY_LIGHT,
  },
  primaryDoctorTextBlock: {
    flex: 1,
  },
  primaryDoctorLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
  },
  primaryDoctorName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  primaryDoctorSpecialization: {
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  accountStatusPanel: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  statusTextBlock: {
    flex: 1,
  },
  statusTitle: {
    color: SUCCESS_DARK,
    fontSize: 13,
    fontWeight: "700",
  },
  statusText: {
    color: SUCCESS_DARK,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  sectionCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    ...elevate(1),
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  profileRowLast: {
    borderBottomWidth: 0,
  },
  rowIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
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
    fontWeight: "700",
    marginBottom: 3,
  },
  rowValue: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
  },
  logoutButton: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 2,
    ...elevate(1),
  },
  logoutText: {
    color: DANGER,
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },
});