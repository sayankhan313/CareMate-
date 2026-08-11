import React, { type ReactNode } from "react";
import { StyleSheet, Text as NativeText, type TextProps } from "react-native";

import { useLanguage } from "../../context/LanguageContext";
import { translateDisplayText } from "../../locales/displayTranslations";

const translateNode = (node: ReactNode, language: ReturnType<typeof useLanguage>["language"]): ReactNode => {
  if (typeof node === "string") return translateDisplayText(language, node);
  if (Array.isArray(node)) return node.map((child, index) => <React.Fragment key={index}>{translateNode(child, language)}</React.Fragment>);
  return node;
};

export const LocalizedText = ({ children, style, ...props }: TextProps) => {
  const { language, scaleFont } = useLanguage();
  const flattenedStyle = StyleSheet.flatten(style);
  const scaledStyle = {
    ...(typeof flattenedStyle?.fontSize === "number" ? { fontSize: scaleFont(flattenedStyle.fontSize) } : {}),
    ...(typeof flattenedStyle?.lineHeight === "number" ? { lineHeight: scaleFont(flattenedStyle.lineHeight) } : {}),
  };

  return <NativeText {...props} style={[style, scaledStyle]}>{React.Children.map(children, child => translateNode(child, language))}</NativeText>;
};