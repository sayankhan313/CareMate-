import type { SupportedLanguage } from "../services/patientSettingsApi";

let currentLanguage: SupportedLanguage = "ENGLISH";

export const setRuntimeLanguage = (language: SupportedLanguage) => { currentLanguage = language; };
export const getRuntimeLanguage = () => currentLanguage;
