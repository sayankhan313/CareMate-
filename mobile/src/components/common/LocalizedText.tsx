import React, { type ReactNode } from "react";
import { Text as NativeText, type TextProps } from "react-native";

import { useLanguage } from "../../context/LanguageContext";
import { translateDisplayText } from "../../locales/displayTranslations";

const translateNode = (node: ReactNode, language: ReturnType<typeof useLanguage>["language"]): ReactNode => {
  if (typeof node === "string") return translateDisplayText(language, node);
  if (Array.isArray(node)) return node.map((child, index) => <React.Fragment key={index}>{translateNode(child, language)}</React.Fragment>);
  return node;
};

export const LocalizedText = ({ children, ...props }: TextProps) => {
  const { language } = useLanguage();
  return <NativeText {...props}>{React.Children.map(children, child => translateNode(child, language))}</NativeText>;
};
