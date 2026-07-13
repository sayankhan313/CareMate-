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
import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  Bell,
  Calendar,
  ChevronRight,
  Clock,
  HeartPulse,
  Languages,
  Lock,
  LogOut,
  Mail,
  Phone,
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
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <StatusBar backgroundColor="#2563EB" barStyle="light-content" />

      <View style={styles.screen}>
        <LinearGradient
          colors={["#3B82F6", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.header,
            {
              paddingTop: insets.top + 22,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={23} color="#FFFFFF" strokeWidth={2.7} />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>
              Manage account and preferences
            </Text>
          </View>
        </LinearGradient>

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
            />
          }
        >
          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#2563EB" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Profile unavailable</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                activeOpacity={0.85}
                onPress={() => loadProfile("initial")}
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading ? (
            <>
              <View style={styles.profileCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>

                <View style={styles.profileTextBlock}>
                  <Text style={styles.profileName}>{fullName}</Text>
                  <Text style={styles.profileRole}>Patient</Text>

                  <View style={styles.contactRow}>
                    <Mail size={15} color="#94A3B8" strokeWidth={2.3} />
                    <Text style={styles.contactText} numberOfLines={1}>
                      {email}
                    </Text>
                  </View>

                  <View style={styles.contactRow}>
                    <Phone size={15} color="#94A3B8" strokeWidth={2.3} />
                    <Text style={styles.contactText} numberOfLines={1}>
                      {getDisplayValue(phone)}
                    </Text>
                  </View>
                </View>
              </View>

              <ProfileSection title="Personal Details">
                <ProfileRow
                  icon={<Calendar size={20} color="#64748B" />}
                  title="Date of birth"
                  value={getDisplayValue(profile?.dateOfBirth)}
                  onPress={() => showComingSoon("Date of birth")}
                />

                <ProfileRow
                  icon={<UserRound size={20} color="#64748B" />}
                  title="Gender"
                  value={getDisplayValue(profile?.gender)}
                  onPress={() => showComingSoon("Gender")}
                />

                <ProfileRow
                  icon={<Phone size={20} color="#64748B" />}
                  title="Emergency contact"
                  value={getDisplayValue(profile?.emergencyContact)}
                  onPress={() => showComingSoon("Emergency contact")}
                />

                <ProfileRow
                  icon={<HeartPulse size={20} color="#64748B" />}
                  title="Medical conditions"
                  value={formatMedicalConditions(profile?.medicalConditions)}
                  onPress={() => showComingSoon("Medical conditions")}
                  isLast
                />
              </ProfileSection>

              <ProfileSection title="Linked Users">
                <ProfileRow
                  icon={<Stethoscope size={20} color="#9333EA" />}
                  title="Doctor"
                  value={
                    linkedUsers.doctor
                      ? `Dr. ${linkedUsers.doctor.fullName}`
                      : "Not assigned yet"
                  }
                  onPress={() => showComingSoon("Assigned doctor")}
                />

                <ProfileRow
                  icon={<Users size={20} color="#16A34A" />}
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
                  icon={<Bell size={20} color="#64748B" />}
                  title="Notification preferences"
                  value="Medicine and health alerts"
                  onPress={() => showComingSoon("Notification preferences")}
                />

                <ProfileRow
                  icon={<Clock size={20} color="#64748B" />}
                  title="Reminder settings"
                  value="Medicine reminders"
                  onPress={() => showComingSoon("Reminder settings")}
                />

                <ProfileRow
                  icon={<ShieldAlert size={20} color="#64748B" />}
                  title="Safety response settings"
                  value="Critical vital alerts"
                  onPress={() => showComingSoon("Safety response settings")}
                />

                <ProfileRow
                  icon={<Languages size={20} color="#64748B" />}
                  title="Language and accessibility"
                  value="App preferences"
                  onPress={() => showComingSoon("Language and accessibility")}
                />

                <ProfileRow
                  icon={<Lock size={20} color="#64748B" />}
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
                <LogOut size={19} color="#DC2626" strokeWidth={2.6} />
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

      <ChevronRight size={19} color="#CBD5E1" strokeWidth={2.4} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 26,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#DBEAFE",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    padding: 20,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  loadingText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorTitle: {
    color: "#991B1B",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 5,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 18,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  profileTextBlock: {
    flex: 1,
  },
  profileName: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 2,
  },
  profileRole: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 9,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  contactText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  profileRowLast: {
    borderBottomWidth: 0,
  },
  rowIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  rowTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 3,
  },
  rowValue: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  logoutButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    marginTop: 2,
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
});