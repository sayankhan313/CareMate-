import { Alert as NativeAlert, type AlertButton, type AlertOptions } from "react-native";

import { translateDisplayText } from "../locales/displayTranslations";
import { getRuntimeLanguage } from "../locales/localizationRuntime";

export const LocalizedAlert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    const language = getRuntimeLanguage();
    const translatedButtons = buttons?.map(button => ({ ...button, text: button.text ? translateDisplayText(language, button.text) : button.text }));
    NativeAlert.alert(translateDisplayText(language, title), message ? translateDisplayText(language, message) : message, translatedButtons, options);
  },
};
