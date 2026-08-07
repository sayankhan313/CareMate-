import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Platform, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, BellRing, Building2, CheckCheck, ChevronLeft, ChevronRight, CircleAlert, Clock3, FileCheck2, FileText, HeartPulse, Pill, RefreshCw, ShieldAlert, Stethoscope, UserRound, Video } from "lucide-react-native";

import { useLanguage } from "../../context/LanguageContext";
import { notificationApi, type UserNotification } from "../../services/notificationApi";
import { notificationEvents } from "../../services/notificationEvents";
import { openNotificationTarget } from "../../services/notificationNavigation";
import type { RootStackParamList } from "../../types/navigation";

type NotificationsScreenProps = NativeStackScreenProps<RootStackParamList, "Notifications">;
type NotificationFilter = "ALL" | "UNREAD";

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const PRIMARY = "#5B86E5";
const PRIMARY_LIGHT = "#EEF4FF";
const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";
const WARNING = "#F6A545";
const WARNING_LIGHT = "#FFF3E2";
const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";
const PAGE_LIMIT = 20;

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
  shadowOpacity: Platform.OS === "android" ? 0 : level === 1 ? 0.06 : 0.1,
  shadowRadius: level === 1 ? 4 : 9,
});

const getTone = (notification: UserNotification) => {
  if (notification.priority === "CRITICAL" || notification.type.includes("SAFETY") || notification.type === "CRITICAL_VITAL_DETECTED") {
    return { background: DANGER_LIGHT, color: DANGER };
  }

  if (notification.priority === "HIGH" || notification.type.includes("CONSULTATION") || notification.type.includes("REVIEW")) {
    return { background: WARNING_LIGHT, color: WARNING };
  }

  if (notification.type.includes("APPROVED") || notification.type.includes("READY") || notification.type.includes("DELIVERED") || notification.type.includes("RESOLVED")) {
    return { background: SUCCESS_LIGHT, color: SUCCESS };
  }

  return { background: PRIMARY_LIGHT, color: PRIMARY };
};

const getNotificationIcon = (notification: UserNotification, color: string): ReactNode => {
  const type = notification.type;
  if (type.includes("SAFETY")) return <ShieldAlert size={22} color={color} strokeWidth={2.5} />;
  if (type.includes("VITAL")) return <HeartPulse size={22} color={color} strokeWidth={2.5} />;
  if (type.includes("CONSULTATION") || type.includes("CALL")) return <Video size={22} color={color} strokeWidth={2.5} />;
  if (type.includes("MEDICINE") || type.includes("PRESCRIPTION") || type.includes("DOSE")) return <Pill size={22} color={color} strokeWidth={2.5} />;
  if (type.includes("REPORT")) return <FileText size={22} color={color} strokeWidth={2.5} />;
  if (type.includes("DOCTOR") || type.includes("PATIENT_ASSIGNED")) return <Stethoscope size={22} color={color} strokeWidth={2.5} />;
  if (type.includes("PHARMACY") || type.includes("ORDER")) return <Building2 size={22} color={color} strokeWidth={2.5} />;
  if (type.includes("ACCOUNT") || type.includes("VERIFICATION")) return <FileCheck2 size={22} color={color} strokeWidth={2.5} />;
  if (type.includes("PATIENT")) return <UserRound size={22} color={color} strokeWidth={2.5} />;
  if (notification.priority === "CRITICAL") return <CircleAlert size={22} color={color} strokeWidth={2.5} />;
  return <Bell size={22} color={color} strokeWidth={2.5} />;
};

export const NotificationsScreen = ({ navigation }: NotificationsScreenProps) => {
  const insets = useSafeAreaInsets();
  const { t, locale } = useLanguage();
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const unreadOnly = filter === "UNREAD";

  const formatCreatedAt = useCallback((value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("notifications.updatedRecently");

    const differenceMs = Date.now() - date.getTime();
    const minutes = Math.max(0, Math.floor(differenceMs / 60_000));
    if (minutes < 1) return t("notifications.justNow");
    if (minutes < 60) return t("notifications.minutesAgo", { count: minutes });

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("notifications.hoursAgo", { count: hours });

    const days = Math.floor(hours / 24);
    if (days < 7) return t("notifications.daysAgo", { count: days });
    return date.toLocaleDateString(locale, { day: "2-digit", month: "short", year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
  }, [locale, t]);

  const loadNotifications = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await notificationApi.listNotifications(1, PAGE_LIMIT, unreadOnly);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setPage(1);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("notifications.loadErrorText"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t, unreadOnly]);

  const loadMore = useCallback(async () => {
    if (isLoading || isRefreshing || isLoadingMore || page >= totalPages) return;

    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const result = await notificationApi.listNotifications(nextPage, PAGE_LIMIT, unreadOnly);
      setNotifications(current => {
        const knownIds = new Set(current.map(item => item.id));
        return [...current, ...result.notifications.filter(item => !knownIds.has(item.id))];
      });
      setUnreadCount(result.unreadCount);
      setPage(nextPage);
      setTotalPages(result.pagination.totalPages);
    } catch {
      return;
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, isRefreshing, page, totalPages, unreadOnly]);

  useFocusEffect(useCallback(() => {
    void loadNotifications("initial");
  }, [loadNotifications]));

  const changeFilter = (nextFilter: NotificationFilter) => {
    if (nextFilter === filter) return;
    setFilter(nextFilter);
  };

  const markAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;

    try {
      setIsMarkingAll(true);
      await notificationApi.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(current => unreadOnly ? [] : current.map(item => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
      notificationEvents.emitChanged();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("notifications.markAllError"));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const openNotification = async (notification: UserNotification) => {
    let latestNotification = notification;

    if (!notification.isRead) {
      try {
        const result = await notificationApi.markNotificationRead(notification.id);
        latestNotification = result.notification;
        setNotifications(current => current.map(item => item.id === notification.id ? result.notification : item));
        setUnreadCount(current => Math.max(0, current - 1));
        notificationEvents.emitChanged();
      } catch {
        latestNotification = notification;
      }
    }

    openNotificationTarget(navigation, latestNotification, false);
  };

  const emptyTitle = unreadOnly ? t("notifications.emptyUnreadTitle") : t("notifications.emptyAllTitle");
  const emptyText = unreadOnly ? t("notifications.emptyUnreadText") : t("notifications.emptyAllText");
  const headerSubtitle = useMemo(() => unreadCount > 0 ? t("notifications.unreadSummary", { count: unreadCount }) : t("notifications.allCaughtUp"), [t, unreadCount]);

  const renderNotification = ({ item }: { item: UserNotification }) => {
    const tone = getTone(item);

    return (
      <TouchableOpacity style={[styles.notificationCard, !item.isRead ? styles.notificationCardUnread : undefined]} activeOpacity={0.86} onPress={() => void openNotification(item)}>
        <View style={[styles.notificationIcon, { backgroundColor: tone.background }]}>{getNotificationIcon(item, tone.color)}</View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationTitleRow}>
            <Text style={[styles.notificationTitle, !item.isRead ? styles.notificationTitleUnread : undefined]} numberOfLines={2}>{item.title}</Text>
            {!item.isRead ? <View style={styles.unreadDot} /> : null}
          </View>

          <Text style={styles.notificationBody} numberOfLines={3}>{item.body}</Text>

          <View style={styles.notificationMetaRow}>
            <Clock3 size={13} color={MUTED} strokeWidth={2.3} />
            <Text style={styles.notificationTime}>{formatCreatedAt(item.createdAt)}</Text>
            {!item.isRead ? <View style={styles.newChip}><Text style={styles.newChipText}>{t("notifications.new")}</Text></View> : null}
          </View>
        </View>

        <ChevronRight size={19} color={MUTED} strokeWidth={2.5} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} activeOpacity={0.84} onPress={() => navigation.goBack()}>
            <ChevronLeft size={23} color={TEXT} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>{t("notifications.title")}</Text>
            <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
          </View>

          <TouchableOpacity style={[styles.headerButton, unreadCount === 0 ? styles.headerButtonDisabled : undefined]} activeOpacity={0.84} onPress={() => void markAllRead()} disabled={unreadCount === 0 || isMarkingAll}>
            {isMarkingAll ? <ActivityIndicator size="small" color={PRIMARY} /> : <CheckCheck size={22} color={unreadCount > 0 ? PRIMARY : MUTED} strokeWidth={2.5} />}
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <FilterChip label={t("notifications.all")} isActive={filter === "ALL"} onPress={() => changeFilter("ALL")} />
          <FilterChip label={t("notifications.unread")} count={unreadCount} isActive={filter === "UNREAD"} onPress={() => changeFilter("UNREAD")} />
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={styles.stateTitle}>{t("notifications.loading")}</Text>
            <Text style={styles.stateText}>{t("notifications.loadingText")}</Text>
          </View>
        ) : errorMessage && notifications.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.errorIcon}><RefreshCw size={25} color={DANGER} strokeWidth={2.6} /></View>
            <Text style={styles.stateTitle}>{t("notifications.loadErrorTitle")}</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.86} onPress={() => void loadNotifications("initial")}>
              <RefreshCw size={17} color={SURFACE} strokeWidth={2.5} />
              <Text style={styles.retryText}>{t("common.tryAgain")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={item => item.id}
            renderItem={renderNotification}
            style={styles.list}
            contentContainerStyle={[styles.listContent, notifications.length === 0 ? styles.emptyListContent : undefined, { paddingBottom: Math.max(insets.bottom + 24, 34) }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadNotifications("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={0.35}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}><BellRing size={29} color={PRIMARY} strokeWidth={2.4} /></View>
                <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                <Text style={styles.emptyText}>{emptyText}</Text>
              </View>
            }
            ListFooterComponent={isLoadingMore ? <View style={styles.loadingMore}><ActivityIndicator size="small" color={PRIMARY} /><Text style={styles.loadingMoreText}>{t("notifications.loadingMore")}</Text></View> : null}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const FilterChip = ({ label, count, isActive, onPress }: { label: string; count?: number; isActive: boolean; onPress: () => void }) => (
  <TouchableOpacity style={[styles.filterChip, isActive ? styles.filterChipActive : undefined]} activeOpacity={0.84} onPress={onPress}>
    <Text style={[styles.filterChipText, isActive ? styles.filterChipTextActive : undefined]}>{label}</Text>
    {count !== undefined && count > 0 ? <View style={[styles.filterCount, isActive ? styles.filterCountActive : undefined]}><Text style={[styles.filterCountText, isActive ? styles.filterCountTextActive : undefined]}>{count > 99 ? "99+" : count}</Text></View> : null}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  headerButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", ...elevate(1) },
  headerButtonDisabled: { opacity: 0.55 },
  headerTitleBlock: { flex: 1, paddingHorizontal: 13 },
  headerTitle: { color: TEXT, fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 3 },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 12 },
  filterChip: { minHeight: 40, borderRadius: 12, backgroundColor: SURFACE, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginRight: 10, overflow: "hidden", ...elevate(1) },
  filterChipActive: { backgroundColor: PRIMARY },
  filterChipText: { color: TEXT, fontSize: 13, fontWeight: "700" },
  filterChipTextActive: { color: SURFACE },
  filterCount: { minWidth: 22, height: 22, borderRadius: 8, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, marginLeft: 7 },
  filterCountActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  filterCountText: { color: PRIMARY, fontSize: 9, fontWeight: "700" },
  filterCountTextActive: { color: SURFACE },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 2 },
  emptyListContent: { flexGrow: 1, justifyContent: "center" },
  notificationCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 10, ...elevate(1) },
  notificationCardUnread: { backgroundColor: "#F9FBFF" },
  notificationIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 },
  notificationContent: { flex: 1, paddingRight: 9 },
  notificationTitleRow: { flexDirection: "row", alignItems: "flex-start" },
  notificationTitle: { flex: 1, color: TEXT, fontSize: 14, fontWeight: "600", lineHeight: 19 },
  notificationTitleUnread: { fontWeight: "700" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY, marginLeft: 8, marginTop: 5 },
  notificationBody: { color: MUTED, fontSize: 12, fontWeight: "500", lineHeight: 18, marginTop: 4 },
  notificationMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  notificationTime: { color: MUTED, fontSize: 10, fontWeight: "600", marginLeft: 5 },
  newChip: { backgroundColor: PRIMARY_LIGHT, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 8 },
  newChipText: { color: PRIMARY, fontSize: 9, fontWeight: "700" },
  stateCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 24, alignItems: "center", marginHorizontal: 16, marginTop: 16, ...elevate(1) },
  errorIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 11 },
  stateTitle: { color: TEXT, fontSize: 16, fontWeight: "700", textAlign: "center", marginTop: 11 },
  stateText: { color: MUTED, fontSize: 13, fontWeight: "500", lineHeight: 19, textAlign: "center", marginTop: 5 },
  retryButton: { backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, flexDirection: "row", alignItems: "center", marginTop: 15, overflow: "hidden" },
  retryText: { color: SURFACE, fontSize: 13, fontWeight: "700", marginLeft: 7 },
  emptyState: { alignItems: "center", paddingHorizontal: 30, paddingVertical: 40 },
  emptyIcon: { width: 66, height: 66, borderRadius: 18, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { color: TEXT, fontSize: 17, fontWeight: "700", textAlign: "center" },
  emptyText: { color: MUTED, fontSize: 13, fontWeight: "500", lineHeight: 19, textAlign: "center", marginTop: 6 },
  loadingMore: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16 },
  loadingMoreText: { color: MUTED, fontSize: 12, fontWeight: "600", marginLeft: 8 },
});

export default NotificationsScreen;
