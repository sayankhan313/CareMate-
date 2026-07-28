import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  BadgeCheck,
  ChevronRight,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  XCircle,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  adminApi,
  type AdminAccountStatus,
  type AdminDoctorVerification,
} from "../../services/adminApi";
import type {
  AdminTabParamList,
  RootStackParamList,
} from "../../types/navigation";

type AdminDoctorListScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, "Doctors">,
  NativeStackScreenProps<RootStackParamList>
>;

const BACKGROUND = "#F3F1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#1D1B2F";
const MUTED = "#6D687B";

const ADMIN = "#6750D8";
const ADMIN_CONTAINER = "#EADDFF";
const ON_ADMIN_CONTAINER = "#21005D";

const DOCTOR = "#5B5FEF";
const DOCTOR_CONTAINER = "#E7E8FF";
const ON_DOCTOR_CONTAINER = "#20206F";

const SUCCESS_CONTAINER = "#DBF3E7";
const ON_SUCCESS_CONTAINER = "#0F5C3C";

const WARNING_CONTAINER = "#FBE7CD";
const ON_WARNING_CONTAINER = "#7A4708";

const DANGER_CONTAINER = "#FBDADC";
const ON_DANGER_CONTAINER = "#8C1D24";

const FILTERS: { label: string; value: AdminAccountStatus }[] = [
  {
    label: "Pending",
    value: "PENDING_VERIFICATION",
  },
  {
    label: "Active",
    value: "ACTIVE",
  },
  {
    label: "Rejected",
    value: "REJECTED",
  },
];

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: "#1B1D2A",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: {
    width: 0,
    height: level * 0.8,
  },
});

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Something went wrong.";
};

const getInitial = (fullName: string) => {
  const trimmedName = fullName.trim();

  if (!trimmedName) {
    return "D";
  }

  return trimmedName.charAt(0).toUpperCase();
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Recently";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently";
  }

  return parsedDate.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusTone = (status: AdminAccountStatus) => {
  if (status === "ACTIVE" || status === "APPROVED") {
    return {
      background: SUCCESS_CONTAINER,
      text: ON_SUCCESS_CONTAINER,
      label: "Active",
    };
  }

  if (status === "REJECTED" || status === "DISABLED") {
    return {
      background: DANGER_CONTAINER,
      text: ON_DANGER_CONTAINER,
      label: status === "DISABLED" ? "Disabled" : "Rejected",
    };
  }

  return {
    background: WARNING_CONTAINER,
    text: ON_WARNING_CONTAINER,
    label: "Pending",
  };
};

const getSummaryText = (status: AdminAccountStatus) => {
  if (status === "ACTIVE" || status === "APPROVED") {
    return "These doctors are approved and active in CareMate+.";
  }

  if (status === "REJECTED") {
    return "These doctor verification requests were rejected.";
  }

  if (status === "DISABLED") {
    return "These doctor accounts are currently disabled.";
  }

  return "Tap a doctor to review details and documents.";
};

export const AdminDoctorListScreen = ({
  navigation,
  route,
}: AdminDoctorListScreenProps) => {
  const insets = useSafeAreaInsets();

  const status = route.params?.status || "PENDING_VERIFICATION";

  const [doctors, setDoctors] = useState<AdminDoctorVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDoctors = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        }

        if (mode === "refresh") {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const result = await adminApi.listDoctorVerifications(status);
        setDoctors(result.doctors);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [status]
  );

  useFocusEffect(
    useCallback(() => {
      loadDoctors("initial");
    }, [loadDoctors])
  );

  const openDoctor = (doctorId: string) => {
    navigation.navigate("AdminDoctorVerificationDetail", {
      doctorId,
    });
  };

  const changeStatusFilter = (nextStatus: AdminAccountStatus) => {
    navigation.navigate("Doctors", {
      status: nextStatus,
    });
  };

  const renderDoctorCard = (doctor: AdminDoctorVerification) => {
    const tone = getStatusTone(doctor.accountStatus);

    return (
      <TouchableOpacity
        key={doctor.id}
        style={styles.card}
        activeOpacity={0.86}
        onPress={() => openDoctor(doctor.id)}
      >
        <View style={styles.cardAccent} />

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitial(doctor.fullName)}</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {doctor.fullName}
            </Text>

            <View
              style={[
                styles.statusChip,
                {
                  backgroundColor: tone.background,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusChipText,
                  {
                    color: tone.text,
                  },
                ]}
              >
                {tone.label}
              </Text>
            </View>
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {doctor.profile?.specialization || "Doctor verification"}
          </Text>

          <View style={styles.footerRow}>
            <View style={styles.docChip}>
              <BadgeCheck
                size={12}
                color={ON_DOCTOR_CONTAINER}
                strokeWidth={2.5}
              />
              <Text style={styles.docChipText}>Documents</Text>
            </View>

            <Text style={styles.dateText}>{formatDate(doctor.submittedAt)}</Text>
          </View>
        </View>

        <View style={styles.chevronBox}>
          <ChevronRight size={18} color={DOCTOR} strokeWidth={2.5} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.titleIcon}>
            <Stethoscope size={22} color={ON_ADMIN_CONTAINER} strokeWidth={2.5} />
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.kicker}>Admin console</Text>
            <Text style={styles.title}>Doctors</Text>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => loadDoctors("initial")}
            activeOpacity={0.82}
          >
            <RefreshCw size={19} color={MUTED} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const isActive = filter.value === status;

            return (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterChip,
                  isActive ? styles.filterChipActive : undefined,
                ]}
                activeOpacity={0.82}
                onPress={() => changeStatusFilter(filter.value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive ? styles.filterTextActive : undefined,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: Math.max(insets.bottom + 96, 120),
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadDoctors("refresh")}
              tintColor={ADMIN}
              colors={[ADMIN]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={ADMIN} />
              <Text style={styles.stateText}>Loading doctors...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.stateCard}>
              <View style={styles.errorIconBox}>
                <XCircle
                  size={24}
                  color={ON_DANGER_CONTAINER}
                  strokeWidth={2.5}
                />
              </View>
              <Text style={styles.stateTitle}>Unable to load doctors</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>
            </View>
          ) : doctors.length > 0 ? (
            <>
              <View style={styles.summaryCard}>
                <ShieldCheck
                  size={20}
                  color={ON_DOCTOR_CONTAINER}
                  strokeWidth={2.5}
                />
                <View style={styles.summaryTextBlock}>
                  <Text style={styles.summaryTitle}>
                    {doctors.length} doctor account
                    {doctors.length === 1 ? "" : "s"}
                  </Text>
                  <Text style={styles.summaryText}>
                    {getSummaryText(status)}
                  </Text>
                </View>
              </View>

              {doctors.map(renderDoctorCard)}
            </>
          ) : (
            <View style={styles.stateCard}>
              <View style={styles.emptyIconBox}>
                <Clock3
                  size={26}
                  color={ON_SUCCESS_CONTAINER}
                  strokeWidth={2.5}
                />
              </View>
              <Text style={styles.stateTitle}>No doctors found</Text>
              <Text style={styles.stateText}>
                There are no doctor accounts in this filter.
              </Text>
            </View>
          )}
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
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  titleIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: ADMIN_CONTAINER,
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
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  filterChip: {
    borderRadius: 10,
    backgroundColor: SURFACE,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
    ...elevate(1),
  },
  filterChipActive: {
    backgroundColor: ADMIN,
  },
  filterText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
  },
  summaryCard: {
    backgroundColor: DOCTOR_CONTAINER,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    ...elevate(2),
  },
  summaryTextBlock: {
    flex: 1,
    marginLeft: 10,
  },
  summaryTitle: {
    color: ON_DOCTOR_CONTAINER,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  summaryText: {
    color: ON_DOCTOR_CONTAINER,
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.82,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
    ...elevate(2),
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: DOCTOR,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: DOCTOR_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginLeft: 2,
  },
  avatarText: {
    color: ON_DOCTOR_CONTAINER,
    fontSize: 18,
    fontWeight: "700",
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  name: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginRight: 8,
  },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  meta: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  docChip: {
    backgroundColor: DOCTOR_CONTAINER,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  docChipText: {
    color: ON_DOCTOR_CONTAINER,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
  dateText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 8,
  },
  chevronBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: DOCTOR_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    ...elevate(2),
  },
  stateTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  stateText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
  },
  errorIconBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: DANGER_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyIconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: SUCCESS_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
});