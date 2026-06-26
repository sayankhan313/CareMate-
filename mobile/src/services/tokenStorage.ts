import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_TOKEN_KEY = "caremate_auth_token";

export const tokenStorage = {
  async saveToken(token: string) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  async getToken() {
    return AsyncStorage.getItem(AUTH_TOKEN_KEY);
  },

  async removeToken() {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  },
};