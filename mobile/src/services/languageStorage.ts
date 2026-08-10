import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AccessibilitySettings } from "./patientSettingsApi";

const LANGUAGE_PREFERENCES_KEY = "caremate_language_preferences_v1";

export const languageStorage = {
  async savePreferences(preferences: AccessibilitySettings) {
    await AsyncStorage.setItem(LANGUAGE_PREFERENCES_KEY, JSON.stringify(preferences));
  },

  async getPreferences(): Promise<AccessibilitySettings | null> {
    const value = await AsyncStorage.getItem(LANGUAGE_PREFERENCES_KEY);
    if (!value) return null;

    try {
      return JSON.parse(value) as AccessibilitySettings;
    } catch {
      await AsyncStorage.removeItem(LANGUAGE_PREFERENCES_KEY);
      return null;
    }
  },
};
