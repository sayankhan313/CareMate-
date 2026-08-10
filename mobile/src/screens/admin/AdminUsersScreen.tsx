import { useCallback, useMemo, useState } from "react";
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
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  Mail,
  RefreshCw,
  ShieldCheck,
  RotateCcw,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  adminApi,
  type AdminAccountStatus,
  type AdminUser,
} from "../../services/adminApi";
import type { AdminTabParamList } from "../../types/navigation";

type AdminUsersScreenProps = BottomTabScreenProps<AdminTabParamList, "Users">;

const BACKGROUND = "#F3F1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#1D1B2F";
const MUTED = "#6D687B";

const ADMIN = "#6750D8";
const ADMIN_CONTAINER = "#EADDFF";
const ON_ADMIN_CONTAINER = "#21005D";

const SUCCESS_CONTAINER = "#DBF3E7";
const ON_SUCCESS_CONTAINER = "#0F5C3C";

const WARNING_CONTAINER = "#FBE7CD";
const ON_WARNING_CONTAINER = "#7A4708";

const DANGER = "#C6404A";
const DANGER_CONTAINER = "#FBDADC";
const ON_DANGER_CONTAINER = "#8C1D24";

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
    return "U";
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

export const AdminUsersScreen = ({ route }: AdminUsersScreenProps) => {
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedStatus = route.params?.status || "ALL";

  const filteredUsers = useMemo(() => {
    if (selectedStatus === "ALL") {
      return users;
    }

    return users.filter((user) => user.accountStatus === selectedStatus);
  }, [selectedStatus, users]);

  const isDisabledView = selectedStatus === "DISABLED";

  const loadUsers = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        }

        if (mode === "refresh") {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const result = await adminApi.listUsers();
        setUsers(result.users);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadUsers("initial");
    }, [loadUsers])
  );

  const confirmSuspendUser = (user: AdminUser) => {
    if (user.role === "ADMIN") {
      Alert.alert("Not allowed", "Admin accounts cannot be suspended here.");
      return;
    }

    if (user.accountStatus === "DISABLED") {
      Alert.alert("Already disabled", "This account is already disabled.");
      return;
    }

    Alert.alert(
      "Suspend user",
      `Suspend ${user.fullName}'s account? They will not be able to login.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Suspend",
          style: "destructive",
          onPress: async () => {
            try {
              setActionUserId(user.id);

              const result = await adminApi.suspendUser(user.id);

              setUsers((currentUsers) =>
                currentUsers.map((currentUser) =>
                  currentUser.id === user.id ? result.user : currentUser
                )
              );

              Alert.alert("User suspended", "The account has been disabled.");
            } catch (error) {
              Alert.alert("Suspend failed", getErrorMessage(error));
            } finally {
              setActionUserId(null);
            }
          },
        },
      ]
    );
  };

  const confirmReactivateUser = (user: AdminUser) => {
    if (user.role === "ADMIN") {
      Alert.alert("Not allowed", "Admin accounts cannot be reactivated here.");
      return;
    }

    if (user.accountStatus !== "DISABLED") {
      Alert.alert("Not disabled", "Only disabled accounts can be reactivated.");
      return;
    }

    Alert.alert(
      "Reactivate account",
      `Reactivate ${user.fullName}'s account? They will be able to sign in again.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reactivate",
          onPress: async () => {
            try {
              setActionUserId(user.id);

              const result = await adminApi.reactivateUser(user.id);

              setUsers((currentUsers) =>
                currentUsers.map((currentUser) =>
                  currentUser.id === user.id ? result.user : currentUser
                )
              );

              Alert.alert("Account reactivated", "The account is active again.");
            } catch (error) {
              Alert.alert("Reactivate failed", getErrorMessage(error));
            } finally {
              setActionUserId(null);
            }
          },
        },
      ]
    );
  };

  const renderUserCard = (user: AdminUser) => {
    const tone = getStatusTone(user.accountStatus);
    const isActionLoading = actionUserId === user.id;
    const canSuspend =
      user.role !== "ADMIN" &&
      (user.accountStatus === "ACTIVE" || user.accountStatus === "APPROVED");
    const canReactivate =
      user.role !== "ADMIN" && user.accountStatus === "DISABLED";

    return (
      <View key={user.id} style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitial(user.fullName)}</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {user.fullName}
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

          <View style={styles.metaRow}>
            <Mail size={13} color={MUTED} strokeWidth={2.4} />
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>{user.role}</Text>
            </View>

            <Text style={styles.dateText}>{formatDate(user.createdAt)}</Text>
          </View>

          {canSuspend ? (
            <TouchableOpacity
              style={styles.suspendButton}
              onPress={() => confirmSuspendUser(user)}
              disabled={isActionLoading}
              activeOpacity={0.86}
            >
              {isActionLoading ? (
                <ActivityIndicator color={DANGER} />
              ) : (
                <Text style={styles.suspendButtonText}>Suspend account</Text>
              )}
            </TouchableOpacity>
          ) : null}

          {canReactivate ? (
            <TouchableOpacity
              style={styles.reactivateButton}
              onPress={() => confirmReactivateUser(user)}
              disabled={isActionLoading}
              activeOpacity={0.86}
            >
              {isActionLoading ? (
                <ActivityIndicator color={ON_SUCCESS_CONTAINER} />
              ) : (
                <>
                  <RotateCcw size={15} color={ON_SUCCESS_CONTAINER} strokeWidth={2.5} />
                  <Text style={styles.reactivateButtonText}>Reactivate account</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.titleIcon}>
            <UsersRound size={22} color={ON_ADMIN_CONTAINER} strokeWidth={2.5} />
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.kicker}>Admin console</Text>
            <Text style={styles.title}>
              {isDisabledView ? "Suspended Accounts" : "Users"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => loadUsers("initial")}
            activeOpacity={0.82}
          >
            <RefreshCw size={19} color={MUTED} strokeWidth={2.4} />
          </TouchableOpacity>
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
              onRefresh={() => loadUsers("refresh")}
              tintColor={ADMIN}
              colors={[ADMIN]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={ADMIN} />
              <Text style={styles.stateText}>Loading users...</Text>
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
              <Text style={styles.stateTitle}>Unable to load users</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>
            </View>
          ) : filteredUsers.length > 0 ? (
            <>
              <View style={styles.summaryCard}>
                <ShieldCheck
                  size={20}
                  color={ON_ADMIN_CONTAINER}
                  strokeWidth={2.5}
                />
                <View style={styles.summaryTextBlock}>
                  <Text style={styles.summaryTitle}>
                    {filteredUsers.length}{" "}
                    {isDisabledView ? "suspended accounts" : "registered users"}
                  </Text>
                  <Text style={styles.summaryText}>
                    {isDisabledView
                      ? "Only disabled accounts are shown here."
                      : "Review user roles and disable accounts when required."}
                  </Text>
                </View>
              </View>

              {filteredUsers.map(renderUserCard)}
            </>
          ) : (
            <View style={styles.stateCard}>
              <View style={styles.emptyIconBox}>
                <UserRound
                  size={26}
                  color={ON_SUCCESS_CONTAINER}
                  strokeWidth={2.5}
                />
              </View>
              <Text style={styles.stateTitle}>
                {isDisabledView ? "No suspended accounts" : "No users found"}
              </Text>
              <Text style={styles.stateText}>
                {isDisabledView
                  ? "Suspended accounts will appear here after admin disables a user."
                  : "Registered users will appear here."}
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
  },
  summaryCard: {
    backgroundColor: ADMIN_CONTAINER,
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
    color: ON_ADMIN_CONTAINER,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  summaryText: {
    color: ON_ADMIN_CONTAINER,
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.82,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    marginBottom: 10,
    ...elevate(2),
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: ADMIN_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: ON_ADMIN_CONTAINER,
    fontSize: 18,
    fontWeight: "700",
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },
  email: {
    flex: 1,
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roleChip: {
    backgroundColor: ADMIN_CONTAINER,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  roleChipText: {
    color: ON_ADMIN_CONTAINER,
    fontSize: 10,
    fontWeight: "700",
  },
  dateText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
  },
  suspendButton: {
    alignSelf: "flex-start",
    backgroundColor: DANGER_CONTAINER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
  },
  suspendButtonText: {
    color: DANGER,
    fontSize: 12,
    fontWeight: "700",
  },
  reactivateButton: {
    alignSelf: "flex-start",
    backgroundColor: SUCCESS_CONTAINER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  reactivateButtonText: {
    color: ON_SUCCESS_CONTAINER,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
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