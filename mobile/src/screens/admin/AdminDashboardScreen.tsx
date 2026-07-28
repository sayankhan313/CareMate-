import { useCallback, useMemo, useState, type ReactNode } from "react";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { CompositeScreenProps } from "@react-navigation/native";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Building2,
  ChevronRight,
  Clock3,
  FileCheck2,
  LogOut,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react-native";

import { API_BASE_URL } from "../../constants/api";
import {
  adminApi,
  type AdminAccountStatus,
  type AdminDoctorVerification,
  type AdminPharmacyVerification,
} from "../../services/adminApi";
import { tokenStorage } from "../../services/tokenStorage";
import type {
  AdminTabParamList,
  RootStackParamList,
} from "../../types/navigation";
import {
  getRoleHomeRoute,
  type AppUser,
} from "../../utils/roleNavigation";

type AdminDashboardScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, "Dashboard">,
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

const PHARMACY = "#0F8B6F";
const PHARMACY_CONTAINER = "#DFF5EE";
const ON_PHARMACY_CONTAINER = "#064C3D";

const SUCCESS_CONTAINER = "#DBF3E7";
const ON_SUCCESS_CONTAINER = "#0F5C3C";

const WARNING_CONTAINER = "#FBE7CD";
const ON_WARNING_CONTAINER = "#7A4708";

const DANGER_CONTAINER = "#FBDADC";
const ON_DANGER_CONTAINER = "#8C1D24";

type DashboardStats = {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalPharmacies: number;
  pendingDoctors: number;
  approvedDoctors: number;
  rejectedDoctors: number;
  pendingPharmacies: number;
  approvedPharmacies: number;
  rejectedPharmacies: number;
  disabledUsers: number;
};

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: "#1B1D2A",
  shadowOpacity:
    Platform.OS === "android"
      ? 0
      : 0.08 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: {
    width: 0,
    height: level * 0.8,
  },
});

const getErrorMessage = (error: unknown) => {
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Submitted recently";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Submitted recently";
  }

  return parsedDate.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getInitial = (
  value: string,
  fallback = "A"
) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return fallback;
  }

  return trimmedValue
    .charAt(0)
    .toUpperCase();
};

export const AdminDashboardScreen = ({
  navigation,
}: AdminDashboardScreenProps) => {
  const insets = useSafeAreaInsets();

  const [stats, setStats] =
    useState<DashboardStats | null>(null);

  const [
    pendingDoctors,
    setPendingDoctors,
  ] = useState<
    AdminDoctorVerification[]
  >([]);

  const [
    pendingPharmacies,
    setPendingPharmacies,
  ] = useState<
    AdminPharmacyVerification[]
  >([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const totalPendingApprovals =
    (stats?.pendingDoctors || 0) +
    (stats?.pendingPharmacies || 0);

  const approvalRate = useMemo(() => {
    const totalProfessionals =
      (stats?.totalDoctors || 0) +
      (stats?.totalPharmacies || 0);

    const totalApproved =
      (stats?.approvedDoctors || 0) +
      (stats?.approvedPharmacies || 0);

    if (totalProfessionals === 0) {
      return 0;
    }

    return Math.round(
      (totalApproved / totalProfessionals) *
        100
    );
  }, [
    stats?.approvedDoctors,
    stats?.approvedPharmacies,
    stats?.totalDoctors,
    stats?.totalPharmacies,
  ]);

  const resetToLogin = useCallback(
    async () => {
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
    },
    [navigation]
  );

  const resetToCorrectRole = useCallback(
    async (user: AppUser) => {
      const roleRoute =
        getRoleHomeRoute(user);

      if (!roleRoute) {
        await resetToLogin();
        return;
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            roleRoute as any,
          ],
        })
      );
    },
    [
      navigation,
      resetToLogin,
    ]
  );

  const ensureAdminAccess =
    useCallback(async () => {
      const token =
        await tokenStorage.getToken();

      if (!token) {
        await resetToLogin();
        return false;
      }

      const response = await fetch(
        `${API_BASE_URL}/users/me`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success ||
        !result.data?.user
      ) {
        await resetToLogin();
        return false;
      }

      const currentUser =
        result.data.user as AppUser;

      if (
        currentUser.role !== "ADMIN"
      ) {
        await resetToCorrectRole(
          currentUser
        );

        return false;
      }

      return true;
    }, [
      resetToCorrectRole,
      resetToLogin,
    ]);

  const loadAdminData = useCallback(
    async (
      mode:
        | "initial"
        | "refresh" = "initial"
    ) => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        }

        if (mode === "refresh") {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const hasAdminAccess =
          await ensureAdminAccess();

        if (!hasAdminAccess) {
          return;
        }

        const [
          dashboardData,
          doctorListData,
          pharmacyListData,
        ] = await Promise.all([
          adminApi.getDashboard(),
          adminApi.listDoctorVerifications(
            "PENDING_VERIFICATION"
          ),
          adminApi.listPharmacyVerifications(
            "PENDING_VERIFICATION"
          ),
        ]);

        setStats(
          dashboardData.stats
        );

        setPendingDoctors(
          doctorListData.doctors
        );

        setPendingPharmacies(
          pharmacyListData.pharmacies
        );
      } catch (error) {
        setErrorMessage(
          getErrorMessage(error)
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [ensureAdminAccess]
  );

  useFocusEffect(
    useCallback(() => {
      loadAdminData("initial");
    }, [loadAdminData])
  );

  const logout = async () => {
    await resetToLogin();
  };

  const confirmLogout = () => {
    Alert.alert(
      "Logout",
      "Do you want to logout from the admin account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  };

  const openDoctorDetail = (
    doctorId: string
  ) => {
    navigation.navigate(
      "AdminDoctorVerificationDetail",
      {
        doctorId,
      }
    );
  };

  const openPharmacyDetail = (
    pharmacyId: string
  ) => {
    navigation.navigate(
      "AdminPharmacyVerificationDetail",
      {
        pharmacyId,
      }
    );
  };

  const openDoctorTab = (
    status: AdminAccountStatus =
      "PENDING_VERIFICATION"
  ) => {
    navigation.navigate("Doctors", {
      status,
    });
  };

  const openPharmacyTab = (
    status: AdminAccountStatus =
      "PENDING_VERIFICATION"
  ) => {
    navigation.navigate(
      "Pharmacies",
      {
        status,
      }
    );
  };

  const openUsersTab = (
    status:
      | "ALL"
      | AdminAccountStatus = "ALL"
  ) => {
    navigation.navigate("Users", {
      status,
    });
  };

  const openAuditLogs = () => {
    navigation.navigate(
      "AdminAuditLogs"
    );
  };

  const renderStatCard = ({
    label,
    value,
    helper,
    icon,
    backgroundColor,
    textColor,
    onPress,
  }: {
    label: string;
    value: number;
    helper: string;
    icon: ReactNode;
    backgroundColor: string;
    textColor: string;
    onPress?: () => void;
  }) => {
    return (
      <TouchableOpacity
        style={styles.statCard}
        activeOpacity={
          onPress ? 0.86 : 1
        }
        onPress={onPress}
        disabled={!onPress}
      >
        <View
          style={styles.statTopRow}
        >
          <View
            style={[
              styles.statIconBox,
              {
                backgroundColor,
              },
            ]}
          >
            {icon}
          </View>

          <View
            style={[
              styles.statStatusDot,
              {
                backgroundColor:
                  textColor,
              },
            ]}
          />
        </View>

        <Text
          style={styles.statValue}
        >
          {value}
        </Text>

        <Text
          style={styles.statLabel}
        >
          {label}
        </Text>

        <Text
          style={styles.statHelper}
        >
          {helper}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDoctorCard = (
    doctor: AdminDoctorVerification
  ) => {
    return (
      <TouchableOpacity
        key={doctor.id}
        style={
          styles.approvalCard
        }
        activeOpacity={0.86}
        onPress={() =>
          openDoctorDetail(
            doctor.id
          )
        }
      >
        <View
          style={[
            styles.cardAccent,
            {
              backgroundColor:
                DOCTOR,
            },
          ]}
        />

        <View
          style={[
            styles.avatar,
            {
              backgroundColor:
                DOCTOR_CONTAINER,
            },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              {
                color:
                  ON_DOCTOR_CONTAINER,
              },
            ]}
          >
            {getInitial(
              doctor.fullName,
              "D"
            )}
          </Text>
        </View>

        <View
          style={styles.cardContent}
        >
          <View
            style={
              styles.cardTitleRow
            }
          >
            <Text
              style={styles.cardName}
              numberOfLines={1}
            >
              {doctor.fullName}
            </Text>

            <View
              style={
                styles.pendingChip
              }
            >
              <Clock3
                size={11}
                color={
                  ON_WARNING_CONTAINER
                }
                strokeWidth={2.5}
              />

              <Text
                style={
                  styles.pendingChipText
                }
              >
                Pending
              </Text>
            </View>
          </View>

          <Text
            style={styles.cardMeta}
            numberOfLines={1}
          >
            {doctor.profile
              ?.specialization ||
              "Doctor verification"}
          </Text>

          <View
            style={styles.cardFooter}
          >
            <View
              style={[
                styles.documentChip,
                {
                  backgroundColor:
                    DOCTOR_CONTAINER,
                },
              ]}
            >
              <FileCheck2
                size={12}
                color={
                  ON_DOCTOR_CONTAINER
                }
                strokeWidth={2.4}
              />

              <Text
                style={[
                  styles.documentChipText,
                  {
                    color:
                      ON_DOCTOR_CONTAINER,
                  },
                ]}
              >
                Doctor docs
              </Text>
            </View>

            <Text
              style={styles.dateText}
            >
              {formatDate(
                doctor.submittedAt
              )}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.chevronBox,
            {
              backgroundColor:
                DOCTOR_CONTAINER,
            },
          ]}
        >
          <ChevronRight
            size={18}
            color={DOCTOR}
            strokeWidth={2.5}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderPharmacyCard = (
    pharmacy: AdminPharmacyVerification
  ) => {
    const displayName =
      pharmacy.profile
        ?.pharmacyName ||
      pharmacy.fullName;

    return (
      <TouchableOpacity
        key={pharmacy.id}
        style={
          styles.approvalCard
        }
        activeOpacity={0.86}
        onPress={() =>
          openPharmacyDetail(
            pharmacy.id
          )
        }
      >
        <View
          style={[
            styles.cardAccent,
            {
              backgroundColor:
                PHARMACY,
            },
          ]}
        />

        <View
          style={[
            styles.avatar,
            {
              backgroundColor:
                PHARMACY_CONTAINER,
            },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              {
                color:
                  ON_PHARMACY_CONTAINER,
              },
            ]}
          >
            {getInitial(
              displayName,
              "P"
            )}
          </Text>
        </View>

        <View
          style={styles.cardContent}
        >
          <View
            style={
              styles.cardTitleRow
            }
          >
            <Text
              style={styles.cardName}
              numberOfLines={1}
            >
              {displayName}
            </Text>

            <View
              style={
                styles.pendingChip
              }
            >
              <Clock3
                size={11}
                color={
                  ON_WARNING_CONTAINER
                }
                strokeWidth={2.5}
              />

              <Text
                style={
                  styles.pendingChipText
                }
              >
                Pending
              </Text>
            </View>
          </View>

          <Text
            style={styles.cardMeta}
            numberOfLines={1}
          >
            {pharmacy.profile
              ?.city ||
              "Pharmacy verification"}{" "}
            {pharmacy.profile
              ?.postcode
              ? `• ${pharmacy.profile.postcode}`
              : ""}
          </Text>

          <View
            style={styles.cardFooter}
          >
            <View
              style={[
                styles.documentChip,
                {
                  backgroundColor:
                    PHARMACY_CONTAINER,
                },
              ]}
            >
              <FileCheck2
                size={12}
                color={
                  ON_PHARMACY_CONTAINER
                }
                strokeWidth={2.4}
              />

              <Text
                style={[
                  styles.documentChipText,
                  {
                    color:
                      ON_PHARMACY_CONTAINER,
                  },
                ]}
              >
                Licence docs
              </Text>
            </View>

            <Text
              style={styles.dateText}
            >
              {formatDate(
                pharmacy.submittedAt
              )}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.chevronBox,
            {
              backgroundColor:
                PHARMACY_CONTAINER,
            },
          ]}
        >
          <ChevronRight
            size={18}
            color={PHARMACY}
            strokeWidth={2.5}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <StatusBar
        backgroundColor={BACKGROUND}
        barStyle="dark-content"
      />

      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View
            style={
              styles.headerIdentity
            }
          >
            <View
              style={
                styles.adminIconBox
              }
            >
              <ShieldCheck
                size={22}
                color={
                  ON_ADMIN_CONTAINER
                }
                strokeWidth={2.4}
              />
            </View>

            <View
              style={
                styles.headerTextBlock
              }
            >
              <Text
                style={styles.kicker}
              >
                Admin console
              </Text>

              <Text
                style={styles.title}
              >
                Control centre
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={confirmLogout}
            activeOpacity={0.82}
          >
            <LogOut
              size={20}
              color={MUTED}
              strokeWidth={2.4}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                Math.max(
                  insets.bottom + 96,
                  120
                ),
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={
                isRefreshing
              }
              onRefresh={() =>
                loadAdminData(
                  "refresh"
                )
              }
              tintColor={ADMIN}
              colors={[ADMIN]}
            />
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          <View
            style={styles.heroCard}
          >
            <View
              style={
                styles.heroTopRow
              }
            >
              <View
                style={
                  styles.heroIconBox
                }
              >
                <FileCheck2
                  size={24}
                  color="#FFFFFF"
                  strokeWidth={2.4}
                />
              </View>

              <View
                style={
                  styles.heroPendingPill
                }
              >
                <Text
                  style={
                    styles.heroPendingText
                  }
                >
                  {totalPendingApprovals}{" "}
                  pending
                </Text>
              </View>
            </View>

            <Text
              style={styles.heroTitle}
            >
              Admin verification hub
            </Text>

            <Text
              style={
                styles.heroSubtitle
              }
            >
              Review doctors,
              pharmacies and user
              accounts from one secure
              admin console.
            </Text>

            <View
              style={
                styles.heroFooterRow
              }
            >
              <View
                style={
                  styles.heroFooterItem
                }
              >
                <Text
                  style={
                    styles.heroFooterValue
                  }
                >
                  {(stats?.totalDoctors ||
                    0) +
                    (stats?.totalPharmacies ||
                      0)}
                </Text>

                <Text
                  style={
                    styles.heroFooterLabel
                  }
                >
                  Professionals
                </Text>
              </View>

              <View
                style={
                  styles.heroFooterDivider
                }
              />

              <View
                style={
                  styles.heroFooterItem
                }
              >
                <Text
                  style={
                    styles.heroFooterValue
                  }
                >
                  {approvalRate}%
                </Text>

                <Text
                  style={
                    styles.heroFooterLabel
                  }
                >
                  Approved
                </Text>
              </View>
            </View>
          </View>

          {isLoading ? (
            <View
              style={
                styles.loadingCard
              }
            >
              <ActivityIndicator
                color={ADMIN}
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                Loading admin
                dashboard...
              </Text>
            </View>
          ) : errorMessage ? (
            <View
              style={styles.errorCard}
            >
              <View
                style={
                  styles.errorIconBox
                }
              >
                <RefreshCw
                  size={24}
                  color={
                    ON_DANGER_CONTAINER
                  }
                  strokeWidth={2.5}
                />
              </View>

              <Text
                style={
                  styles.errorTitle
                }
              >
                Unable to load
                dashboard
              </Text>

              <Text
                style={styles.errorText}
              >
                {errorMessage}
              </Text>

              <TouchableOpacity
                style={
                  styles.retryButton
                }
                onPress={() =>
                  loadAdminData(
                    "initial"
                  )
                }
                activeOpacity={0.86}
              >
                <RefreshCw
                  size={16}
                  color="#FFFFFF"
                  strokeWidth={2.5}
                />

                <Text
                  style={
                    styles.retryButtonText
                  }
                >
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View
                style={
                  styles.sectionHeader
                }
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Overview
                </Text>

                <Text
                  style={
                    styles.sectionMeta
                  }
                >
                  Tap cards to open
                </Text>
              </View>

              <View
                style={styles.statsGrid}
              >
                {renderStatCard({
                  label: "Users",
                  value:
                    stats?.totalUsers ||
                    0,
                  helper: "Registered",
                  backgroundColor:
                    ADMIN_CONTAINER,
                  textColor: ADMIN,
                  onPress: () =>
                    openUsersTab("ALL"),
                  icon: (
                    <Users
                      size={19}
                      color={
                        ON_ADMIN_CONTAINER
                      }
                      strokeWidth={2.4}
                    />
                  ),
                })}

                {renderStatCard({
                  label:
                    "Active Doctors",
                  value:
                    stats?.approvedDoctors ||
                    0,
                  helper:
                    "Approved accounts",
                  backgroundColor:
                    DOCTOR_CONTAINER,
                  textColor: DOCTOR,
                  onPress: () =>
                    openDoctorTab(
                      "ACTIVE"
                    ),
                  icon: (
                    <Stethoscope
                      size={19}
                      color={
                        ON_DOCTOR_CONTAINER
                      }
                      strokeWidth={2.4}
                    />
                  ),
                })}

                {renderStatCard({
                  label:
                    "Active Pharmacies",
                  value:
                    stats?.approvedPharmacies ||
                    0,
                  helper:
                    "Approved accounts",
                  backgroundColor:
                    PHARMACY_CONTAINER,
                  textColor: PHARMACY,
                  onPress: () =>
                    openPharmacyTab(
                      "ACTIVE"
                    ),
                  icon: (
                    <Building2
                      size={19}
                      color={
                        ON_PHARMACY_CONTAINER
                      }
                      strokeWidth={2.4}
                    />
                  ),
                })}

                {renderStatCard({
                  label: "Disabled",
                  value:
                    stats?.disabledUsers ||
                    0,
                  helper: "Suspended",
                  backgroundColor:
                    DANGER_CONTAINER,
                  textColor:
                    ON_DANGER_CONTAINER,
                  onPress: () =>
                    openUsersTab(
                      "DISABLED"
                    ),
                  icon: (
                    <ShieldCheck
                      size={19}
                      color={
                        ON_DANGER_CONTAINER
                      }
                      strokeWidth={2.4}
                    />
                  ),
                })}
              </View>

              <View
                style={
                  styles.sectionHeader
                }
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Security & governance
                </Text>

                <Text
                  style={
                    styles.sectionMeta
                  }
                >
                  Admin only
                </Text>
              </View>

              <TouchableOpacity
                style={styles.auditCard}
                activeOpacity={0.86}
                onPress={openAuditLogs}
              >
                <View
                  style={
                    styles.auditIconBox
                  }
                >
                  <ScrollText
                    size={23}
                    color={
                      ON_ADMIN_CONTAINER
                    }
                    strokeWidth={2.4}
                  />
                </View>

                <View
                  style={
                    styles.auditContent
                  }
                >
                  <Text
                    style={
                      styles.auditTitle
                    }
                  >
                    Audit logs
                  </Text>

                  <Text
                    style={
                      styles.auditText
                    }
                  >
                    Review clinical
                    actions, account
                    decisions and
                    security activity.
                  </Text>
                </View>

                <View
                  style={
                    styles.auditChevron
                  }
                >
                  <ChevronRight
                    size={19}
                    color={ADMIN}
                    strokeWidth={2.5}
                  />
                </View>
              </TouchableOpacity>

              <View
                style={
                  styles.sectionHeader
                }
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Doctor approvals
                </Text>

                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() =>
                    openDoctorTab(
                      "PENDING_VERIFICATION"
                    )
                  }
                >
                  <Text
                    style={
                      styles.sectionLink
                    }
                  >
                    View all{" "}
                    {
                      pendingDoctors.length
                    }
                  </Text>
                </TouchableOpacity>
              </View>

              {pendingDoctors.length >
              0 ? (
                <View
                  style={
                    styles.approvalList
                  }
                >
                  {pendingDoctors
                    .slice(0, 3)
                    .map(
                      renderDoctorCard
                    )}
                </View>
              ) : (
                <View
                  style={styles.emptyCard}
                >
                  <View
                    style={
                      styles.emptyIconBox
                    }
                  >
                    <ShieldCheck
                      size={26}
                      color={
                        ON_SUCCESS_CONTAINER
                      }
                      strokeWidth={2.4}
                    />
                  </View>

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    No pending doctors
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    New doctor
                    verification requests
                    will appear here after
                    signup.
                  </Text>
                </View>
              )}

              <View
                style={
                  styles.sectionHeader
                }
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Pharmacy approvals
                </Text>

                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() =>
                    openPharmacyTab(
                      "PENDING_VERIFICATION"
                    )
                  }
                >
                  <Text
                    style={
                      styles.sectionLink
                    }
                  >
                    View all{" "}
                    {
                      pendingPharmacies.length
                    }
                  </Text>
                </TouchableOpacity>
              </View>

              {pendingPharmacies.length >
              0 ? (
                <View
                  style={
                    styles.approvalList
                  }
                >
                  {pendingPharmacies
                    .slice(0, 3)
                    .map(
                      renderPharmacyCard
                    )}
                </View>
              ) : (
                <View
                  style={styles.emptyCard}
                >
                  <View
                    style={[
                      styles.emptyIconBox,
                      {
                        backgroundColor:
                          PHARMACY_CONTAINER,
                      },
                    ]}
                  >
                    <Building2
                      size={26}
                      color={
                        ON_PHARMACY_CONTAINER
                      }
                      strokeWidth={2.4}
                    />
                  </View>

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    No pending pharmacies
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Pharmacy verification
                    requests will appear
                    here after signup.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },
    screen: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 14,
      backgroundColor:
        BACKGROUND,
    },
    headerIdentity: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingRight: 12,
    },
    adminIconBox: {
      width: 46,
      height: 46,
      borderRadius: 13,
      backgroundColor:
        ADMIN_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },
    headerTextBlock: {
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
      fontSize: 21,
      fontWeight: "700",
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        SURFACE,
      alignItems: "center",
      justifyContent:
        "center",
      ...elevate(2),
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 18,
      paddingTop: 4,
    },
    heroCard: {
      backgroundColor: ADMIN,
      borderRadius: 18,
      padding: 18,
      marginBottom: 20,
      ...elevate(3),
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 16,
    },
    heroIconBox: {
      width: 50,
      height: 50,
      borderRadius: 15,
      backgroundColor:
        "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent:
        "center",
    },
    heroPendingPill: {
      backgroundColor:
        WARNING_CONTAINER,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    heroPendingText: {
      color:
        ON_WARNING_CONTAINER,
      fontSize: 12,
      fontWeight: "700",
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: 23,
      fontWeight: "800",
      marginBottom: 7,
    },
    heroSubtitle: {
      color: "#EDE9FE",
      fontSize: 13,
      fontWeight: "600",
      lineHeight: 20,
      marginBottom: 16,
    },
    heroFooterRow: {
      backgroundColor:
        "rgba(255,255,255,0.18)",
      borderRadius: 15,
      paddingVertical: 13,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
    },
    heroFooterItem: {
      flex: 1,
    },
    heroFooterValue: {
      color: "#FFFFFF",
      fontSize: 19,
      fontWeight: "800",
      marginBottom: 2,
    },
    heroFooterLabel: {
      color: "#EDE9FE",
      fontSize: 11,
      fontWeight: "700",
    },
    heroFooterDivider: {
      width:
        StyleSheet.hairlineWidth,
      height: 34,
      backgroundColor:
        "rgba(255,255,255,0.24)",
      marginHorizontal: 12,
    },
    loadingCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      padding: 22,
      alignItems: "center",
      ...elevate(2),
    },
    loadingText: {
      color: MUTED,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 10,
    },
    errorCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
      ...elevate(2),
    },
    errorIconBox: {
      width: 52,
      height: 52,
      borderRadius: 15,
      backgroundColor:
        DANGER_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 12,
    },
    errorTitle: {
      color: TEXT,
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 6,
    },
    errorText: {
      color: MUTED,
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 19,
      textAlign: "center",
      marginBottom: 14,
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: ADMIN,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    retryButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
      marginLeft: 8,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent:
        "space-between",
      marginBottom: 10,
      marginTop: 4,
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
    sectionLink: {
      color: ADMIN,
      fontSize: 12,
      fontWeight: "700",
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent:
        "space-between",
      marginBottom: 10,
    },
    statCard: {
      width: "48%",
      padding: 14,
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      marginBottom: 10,
      ...elevate(2),
    },
    statTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 12,
    },
    statIconBox: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent:
        "center",
    },
    statStatusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    statValue: {
      color: TEXT,
      fontSize: 23,
      fontWeight: "700",
      marginBottom: 2,
    },
    statLabel: {
      color: TEXT,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 2,
    },
    statHelper: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "500",
    },
    auditCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      padding: 15,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
      overflow: "hidden",
      ...elevate(2),
    },
    auditIconBox: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor:
        ADMIN_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },
    auditContent: {
      flex: 1,
    },
    auditTitle: {
      color: TEXT,
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 4,
    },
    auditText: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "500",
      lineHeight: 17,
    },
    auditChevron: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor:
        ADMIN_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 10,
    },
    approvalList: {
      marginBottom: 14,
    },
    approvalCard: {
      backgroundColor:
        SURFACE,
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
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 13,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
      marginLeft: 2,
    },
    avatarText: {
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
    cardName: {
      flex: 1,
      color: TEXT,
      fontSize: 15,
      fontWeight: "700",
      marginRight: 8,
    },
    pendingChip: {
      backgroundColor:
        WARNING_CONTAINER,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 4,
      flexDirection: "row",
      alignItems: "center",
    },
    pendingChipText: {
      color:
        ON_WARNING_CONTAINER,
      fontSize: 10,
      fontWeight: "700",
      marginLeft: 4,
    },
    cardMeta: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "500",
      marginBottom: 8,
    },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },
    documentChip: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
      flexDirection: "row",
      alignItems: "center",
    },
    documentChipText: {
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
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 10,
    },
    emptyCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
      marginBottom: 18,
      ...elevate(2),
    },
    emptyIconBox: {
      width: 54,
      height: 54,
      borderRadius: 16,
      backgroundColor:
        SUCCESS_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 12,
    },
    emptyTitle: {
      color: TEXT,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 6,
    },
    emptyText: {
      color: MUTED,
      fontSize: 13,
      fontWeight: "500",
      textAlign: "center",
      lineHeight: 19,
    },
  });