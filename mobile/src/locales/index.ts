import type { SupportedLanguage } from "../services/patientSettingsApi";
import { de } from "./de";
import { el } from "./el";
import { en } from "./en";
import { ha } from "./ha";
import { hi } from "./hi";

export type TranslationKey = keyof typeof en;
export type TranslationValues = Record<string, string | number>;
export type TranslationDictionary = Record<TranslationKey, string>;

const dictionaries: Record<SupportedLanguage, TranslationDictionary> = {
  ENGLISH: en,
  HINDI: hi,
  GREEK: el,
  HAUSA: ha,
  GERMAN: de,
};

const interpolate = (value: string, replacements?: TranslationValues) => {
  if (!replacements) return value;

  return Object.entries(replacements).reduce((current, [key, replacement]) => {
    return current.replace(new RegExp(`{{${key}}}`, "g"), String(replacement));
  }, value);
};

export const translateText = (language: SupportedLanguage, key: TranslationKey, replacements?: TranslationValues) => {
  const template = dictionaries[language]?.[key] || dictionaries.ENGLISH[key] || key;
  return interpolate(template, replacements);
};

export const getLanguageNameKey = (language: SupportedLanguage): TranslationKey => {
  if (language === "HINDI") return "language.hindi";
  if (language === "GREEK") return "language.greek";
  if (language === "HAUSA") return "language.hausa";
  if (language === "GERMAN") return "language.german";
  return "language.english";
};
