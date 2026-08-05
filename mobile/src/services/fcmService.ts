import AsyncStorage from "@react-native-async-storage/async-storage";
import { PermissionsAndroid, Platform } from "react-native";
import { deleteToken, getInitialNotification, getMessaging, getToken, onMessage, onNotificationOpenedApp, onTokenRefresh } from "@react-native-firebase/messaging";

export type FcmMessage = NonNullable<Awaited<ReturnType<typeof getInitialNotification>>>;

type FcmListeners = {
  onForegroundMessage?: (message: FcmMessage) => void;
  onNotificationOpened?: (message: FcmMessage) => void;
  onTokenRefreshed?: (token: string, previousToken?: string) => void;
};

const FCM_TOKEN_KEY = "caremate_fcm_token";
const messaging = getMessaging();

const requestAndroidNotificationPermission = async () => {
  if (Platform.OS !== "android" || Number(Platform.Version) < 33) return true;

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  const alreadyGranted = await PermissionsAndroid.check(permission);

  if (alreadyGranted) return true;

  const result = await PermissionsAndroid.request(permission);

  return result === PermissionsAndroid.RESULTS.GRANTED;
};

const saveStoredToken = async (token: string) => {
  await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
};

export const fcmService = {
  async requestNotificationPermission() {
    return requestAndroidNotificationPermission();
  },

  async getCurrentToken() {
    const permissionGranted = await requestAndroidNotificationPermission();
    if (!permissionGranted) return null;

    const token = await getToken(messaging);
    await saveStoredToken(token);
    return token;
  },

  async getStoredToken() {
    return AsyncStorage.getItem(FCM_TOKEN_KEY);
  },

  async deleteCurrentToken() {
    try {
      await deleteToken(messaging);
    } finally {
      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
    }
  },

  async getInitialMessage() {
    return getInitialNotification(messaging);
  },

  startListeners({ onForegroundMessage, onNotificationOpened, onTokenRefreshed }: FcmListeners) {
    const unsubscribeForeground = onMessage(messaging, remoteMessage => {
      onForegroundMessage?.(remoteMessage);
    });

    const unsubscribeOpened = onNotificationOpenedApp(messaging, remoteMessage => {
      onNotificationOpened?.(remoteMessage);
    });

    const unsubscribeTokenRefresh = onTokenRefresh(messaging, token => {
      void (async () => {
        const storedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
        const previousToken = storedToken && storedToken !== token ? storedToken : undefined;
        await saveStoredToken(token);
        onTokenRefreshed?.(token, previousToken);
      })().catch(error => {
        console.warn("Unable to process refreshed FCM token:", error instanceof Error ? error.message : error);
        onTokenRefreshed?.(token);
      });
    });

    return () => {
      unsubscribeForeground();
      unsubscribeOpened();
      unsubscribeTokenRefresh();
    };
  },
};
