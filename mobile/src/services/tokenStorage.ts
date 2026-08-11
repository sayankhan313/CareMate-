import AsyncStorage from "@react-native-async-storage/async-storage";

import { fcmService } from "./fcmService";
import { notificationDeviceApi } from "./notificationDeviceApi";

const AUTH_TOKEN_KEY = "caremate_auth_token";
type AuthTokenListener = (token: string | null) => void;
const authTokenListeners = new Set<AuthTokenListener>();

const emitAuthToken = (token: string | null) => {
  authTokenListeners.forEach(listener => listener(token));
};

export const tokenStorage = {
  async saveToken(token: string) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    emitAuthToken(token);
  },

  async getToken() {
    return AsyncStorage.getItem(AUTH_TOKEN_KEY);
  },

  async removeToken() {
    const authToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    const fcmToken = await fcmService.getStoredToken();

    if (authToken && fcmToken) {
      try {
        await notificationDeviceApi.deactivateDevice(authToken, fcmToken);
      } catch (error) {
        if (__DEV__) console.warn("Unable to deactivate notification device during logout:", error instanceof Error ? error.message : error);
      }
    }

    try {
      await fcmService.deleteCurrentToken();
    } catch (error) {
      if (__DEV__) console.warn("Unable to delete local FCM token during logout:", error instanceof Error ? error.message : error);
    }

    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    emitAuthToken(null);
  },

  subscribe(listener: AuthTokenListener) {
    authTokenListeners.add(listener);
    return () => authTokenListeners.delete(listener);
  },
};
