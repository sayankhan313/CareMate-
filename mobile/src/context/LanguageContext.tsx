import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { AccessibilitySettings, AppTextSize, SupportedLanguage } from "../services/patientSettingsApi";
import { languageStorage } from "../services/languageStorage";
import { translateText, type TranslationKey, type TranslationValues } from "../locales";
import { setRuntimeLanguage } from "../locales/localizationRuntime";

const DEFAULT_SETTINGS: AccessibilitySettings = {
  language: "ENGLISH",
  textSize: "NORMAL",
  highContrastEnabled: false,
  reduceMotionEnabled: false,
  screenReaderHintsEnabled: true,
  hapticFeedbackEnabled: true,
};

const TEXT_SCALE: Record<AppTextSize, number> = { SMALL: 0.9, NORMAL: 1, LARGE: 1.12, EXTRA_LARGE: 1.25 };
const LANGUAGE_LOCALES: Record<SupportedLanguage, string> = { ENGLISH: "en-GB", HINDI: "hi-IN", GREEK: "el-GR", HAUSA: "ha-NG", GERMAN: "de-DE" };

type LanguagePalette = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryLight: string;
};

type LanguageContextValue = AccessibilitySettings & {
  isReady: boolean;
  locale: string;
  fontScale: number;
  palette: LanguagePalette;
  t: (key: TranslationKey, replacements?: TranslationValues) => string;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  applyAccessibilitySettings: (settings: AccessibilitySettings) => Promise<void>;
  scaleFont: (size: number) => number;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => { setRuntimeLanguage(settings.language); }, [settings.language]);

  useEffect(() => {
    const loadStoredSettings = async () => {
      try {
        const stored = await languageStorage.getPreferences();
        if (stored) setSettings(stored);
      } finally {
        setIsReady(true);
      }
    };

    void loadStoredSettings();
  }, []);

  const applyAccessibilitySettings = useCallback(async (nextSettings: AccessibilitySettings) => {
    setSettings(nextSettings);
    await languageStorage.savePreferences(nextSettings);
  }, []);

  const setLanguage = useCallback(async (language: SupportedLanguage) => {
    const nextSettings = { ...settings, language };
    setSettings(nextSettings);
    await languageStorage.savePreferences(nextSettings);
  }, [settings]);

  const t = useCallback((key: TranslationKey, replacements?: TranslationValues) => translateText(settings.language, key, replacements), [settings.language]);
  const fontScale = TEXT_SCALE[settings.textSize];
  const locale = LANGUAGE_LOCALES[settings.language];
  const scaleFont = useCallback((size: number) => Math.round(size * fontScale * 10) / 10, [fontScale]);

  const palette = useMemo<LanguagePalette>(() => {
    return { background: "#EEF1FA", surface: "#FFFFFF", text: "#111936", muted: "#7A8194", border: "#E4E8F2", primary: "#5B86E5", primaryLight: "#EEF4FF" };
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({ ...settings, isReady, locale, fontScale, palette, t, setLanguage, applyAccessibilitySettings, scaleFont }), [settings, isReady, locale, fontScale, palette, t, setLanguage, applyAccessibilitySettings, scaleFont]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider.");
  return context;
};