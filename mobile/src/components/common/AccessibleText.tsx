import React from "react";
import { StyleSheet, Text as NativeText, type TextProps } from "react-native";

import { useLanguage } from "../../context/LanguageContext";

export const AccessibleText = ({ style, ...props }: TextProps) => {
  const { scaleFont } = useLanguage();
  const flattenedStyle = StyleSheet.flatten(style);
  const scaledStyle = {
    ...(typeof flattenedStyle?.fontSize === "number" ? { fontSize: scaleFont(flattenedStyle.fontSize) } : {}),
    ...(typeof flattenedStyle?.lineHeight === "number" ? { lineHeight: scaleFont(flattenedStyle.lineHeight) } : {}),
  };

  return <NativeText {...props} style={[style, scaledStyle]} />;
};