import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BellRing, ChevronRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { navigationRef } from "../../navigation/navigationRef";
import { fcmService, type FcmMessage } from "../../services/fcmService";
import { notificationApi } from "../../services/notificationApi";
import { notificationDeviceApi } from "../../services/notificationDeviceApi";
import { notificationEvents } from "../../services/notificationEvents";
import { openNotificationTarget } from "../../services/notificationNavigation";
import { tokenStorage } from "../../services/tokenStorage";

const PRIMARY = "#5B86E5";
const PRIMARY_LIGHT = "#EEF4FF";
const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BANNER_VISIBLE_MS = 5000;

type ForegroundBanner = { message: FcmMessage; title: string; body: string; isCritical: boolean };

const getPlatform = () => Platform.OS === "ios" ? "IOS" as const : "ANDROID" as const;

const getMessageData = (message: FcmMessage) => {
  const data = message.data || {};

  return {
    type: typeof data.type === "string" ? data.type : null,
    targetScreen: typeof data.targetScreen === "string" ? data.targetScreen : null,
    entityType: typeof data.entityType === "string" ? data.entityType : null,
    entityId: typeof data.entityId === "string" ? data.entityId : null,
    data: data as Record<string, unknown>,
  };
};

const getBannerContent = (message: FcmMessage): ForegroundBanner => {
  const dataTitle = typeof message.data?.title === "string" ? message.data.title : null;
  const dataBody = typeof message.data?.body === "string" ? message.data.body : null;
  const priority = typeof message.data?.priority === "string" ? message.data.priority : "NORMAL";

  return {
    message,
    title: message.notification?.title || dataTitle || "CareMate+",
    body: message.notification?.body || dataBody || "You have received a new notification.",
    isCritical: priority === "CRITICAL",
  };
};

export const FCMInitializer = () => {
  const insets = useSafeAreaInsets();
  const [foregroundBanner, setForegroundBanner] = useState<ForegroundBanner | null>(null);
  const bannerTranslateY = useRef(new Animated.Value(-180)).current;
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerOpenHandlerRef = useRef<(message: FcmMessage) => void>(() => undefined);

  const clearBannerTimer = useCallback(() => {
    if (!bannerTimerRef.current) return;
    clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = null;
  }, []);

  const hideForegroundBanner = useCallback(() => {
    clearBannerTimer();

    Animated.timing(bannerTranslateY, { toValue: -180, duration: 220, useNativeDriver: true }).start(() => {
      setForegroundBanner(null);
    });
  }, [bannerTranslateY, clearBannerTimer]);

  const showForegroundBanner = useCallback((message: FcmMessage) => {
    clearBannerTimer();
    setForegroundBanner(getBannerContent(message));
    bannerTranslateY.setValue(-180);

    requestAnimationFrame(() => {
      Animated.spring(bannerTranslateY, { toValue: 0, damping: 18, stiffness: 180, mass: 0.8, useNativeDriver: true }).start();
    });

    bannerTimerRef.current = setTimeout(hideForegroundBanner, BANNER_VISIBLE_MS);
  }, [bannerTranslateY, clearBannerTimer, hideForegroundBanner]);

  const openForegroundBanner = useCallback(() => {
    const message = foregroundBanner?.message;
    hideForegroundBanner();
    if (message) bannerOpenHandlerRef.current(message);
  }, [foregroundBanner, hideForegroundBanner]);

  useEffect(() => {
    let isMounted = true;
    let pendingNavigationTimer: ReturnType<typeof setTimeout> | null = null;

    const registerDevice = async (authToken?: string | null, fcmToken?: string | null) => {
      const currentAuthToken = authToken ?? await tokenStorage.getToken();
      if (!currentAuthToken || !isMounted) return;

      const currentFcmToken = fcmToken ?? await fcmService.getCurrentToken();
      if (!currentFcmToken || !isMounted) return;

      await notificationDeviceApi.registerDevice(currentAuthToken, { token: currentFcmToken, platform: getPlatform() });
      if (__DEV__) console.log("FCM device registered with CareMate+ backend.");
    };

    const registerRefreshedToken = async (token: string, previousToken?: string) => {
      const authToken = await tokenStorage.getToken();
      if (!authToken || !isMounted) return;

      if (previousToken) {
        try {
          await notificationDeviceApi.deactivateDevice(authToken, previousToken);
        } catch (error) {
          if (__DEV__) console.warn("Unable to deactivate previous FCM token:", error instanceof Error ? error.message : error);
        }
      }

      await registerDevice(authToken, token);
    };

    const navigateFromMessage = (message: FcmMessage, attempt = 0) => {
      if (!isMounted) return;

      if (navigationRef.isReady()) {
        const currentRoute = navigationRef.getCurrentRoute();
        const blockedRoutes = new Set(["Splash", "Welcome", "Login", "RoleSelection"]);

        if (currentRoute && !blockedRoutes.has(currentRoute.name)) {
          openNotificationTarget(navigationRef, getMessageData(message));
          return;
        }
      }

      if (attempt >= 12) return;

      pendingNavigationTimer = setTimeout(() => {
        navigateFromMessage(message, attempt + 1);
      }, 350);
    };

    const handleOpenedNotification = async (message: FcmMessage) => {
      notificationEvents.emitChanged();

      const notificationId = typeof message.data?.notificationId === "string" ? message.data.notificationId : null;

      if (!notificationId) {
        if (__DEV__) console.warn("Blocked FCM deep link because notification ownership could not be verified.");
        return;
      }

      try {
        await notificationApi.markNotificationRead(notificationId);
        notificationEvents.emitChanged();
      } catch (error) {
        if (__DEV__) console.warn("Blocked notification navigation because this notification does not belong to the current user:", error instanceof Error ? error.message : error);
        return;
      }

      navigateFromMessage(message);
    };

    bannerOpenHandlerRef.current = message => {
      void handleOpenedNotification(message);
    };

    const stopListeners = fcmService.startListeners({
      onForegroundMessage: message => {
        if (__DEV__) console.log("Foreground FCM message received:", message.messageId || message.data || {});
        notificationEvents.emitChanged();
        showForegroundBanner(message);
      },

      onNotificationOpened: message => {
        if (__DEV__) console.log("FCM notification opened:", message.data || {});
        void handleOpenedNotification(message);
      },

      onTokenRefreshed: (token, previousToken) => {
        void registerRefreshedToken(token, previousToken).catch(error => {
          console.warn("Unable to register refreshed FCM token:", error instanceof Error ? error.message : error);
        });
      },
    });

    const unsubscribeAuthToken = tokenStorage.subscribe(token => {
      if (!token) return;

      void registerDevice(token).catch(error => {
        console.warn("Unable to register FCM device after login:", error instanceof Error ? error.message : error);
      });
    });

    const appStateSubscription = AppState.addEventListener("change", state => {
      if (state !== "active") return;

      void registerDevice().catch(error => {
        if (__DEV__) console.warn("Unable to refresh FCM device registration:", error instanceof Error ? error.message : error);
      });
    });

    const initialiseFcm = async () => {
      try {
        await registerDevice();

        const initialMessage = await fcmService.getInitialMessage();

        if (isMounted && initialMessage) {
          if (__DEV__) console.log("App opened from FCM notification:", initialMessage.data || {});
          void handleOpenedNotification(initialMessage);
        }
      } catch (error) {
        console.warn("Unable to initialise FCM:", error instanceof Error ? error.message : error);
      }
    };

    void initialiseFcm();

    return () => {
      isMounted = false;
      bannerOpenHandlerRef.current = () => undefined;

      if (pendingNavigationTimer) clearTimeout(pendingNavigationTimer);

      stopListeners();
      unsubscribeAuthToken();
      appStateSubscription.remove();
    };
  }, [showForegroundBanner]);

  useEffect(() => {
    return () => clearBannerTimer();
  }, [clearBannerTimer]);

  if (!foregroundBanner) return null;

  const accent = foregroundBanner.isCritical ? DANGER : PRIMARY;
  const accentBackground = foregroundBanner.isCritical ? DANGER_LIGHT : PRIMARY_LIGHT;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.overlay, { paddingTop: insets.top + 8, transform: [{ translateY: bannerTranslateY }] }]}>
      <TouchableOpacity style={styles.banner} activeOpacity={0.9} onPress={openForegroundBanner} accessibilityRole="button" accessibilityLabel={`${foregroundBanner.title}. ${foregroundBanner.body}`}>
        <View style={[styles.iconBox, { backgroundColor: accentBackground }]}>
          <BellRing size={23} color={accent} strokeWidth={2.5} />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>{foregroundBanner.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{foregroundBanner.body}</Text>
          <Text style={[styles.helper, { color: accent }]}>Tap to view</Text>
        </View>

        <ChevronRight size={20} color={MUTED} strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 9999, elevation: 9999, paddingHorizontal: 12 },
  banner: { minHeight: 82, borderRadius: 16, backgroundColor: SURFACE, padding: 13, flexDirection: "row", alignItems: "center", shadowColor: "#172033", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 },
  textBlock: { flex: 1, paddingRight: 8 },
  title: { color: TEXT, fontSize: 14, fontWeight: "700" },
  body: { color: MUTED, fontSize: 12, fontWeight: "500", lineHeight: 17, marginTop: 3 },
  helper: { fontSize: 10, fontWeight: "700", marginTop: 4 },
});