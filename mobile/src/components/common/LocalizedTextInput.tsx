import React, { forwardRef } from "react";
import { TextInput as NativeTextInput, type TextInputProps } from "react-native";

import { useLanguage } from "../../context/LanguageContext";
import { translateDisplayText } from "../../locales/displayTranslations";

export const LocalizedTextInput = forwardRef<any, TextInputProps>(({ placeholder, accessibilityLabel, ...props }, ref) => {
  const { language } = useLanguage();
  return <NativeTextInput ref={ref} {...props} placeholder={placeholder ? translateDisplayText(language, placeholder) : placeholder} accessibilityLabel={accessibilityLabel ? translateDisplayText(language, accessibilityLabel) : accessibilityLabel} />;
});

LocalizedTextInput.displayName = "LocalizedTextInput";
