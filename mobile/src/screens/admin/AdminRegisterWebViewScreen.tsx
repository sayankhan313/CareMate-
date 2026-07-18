import { Alert, Linking, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, ExternalLink } from "lucide-react-native";
import { WebView } from "react-native-webview";

import type { RootStackParamList } from "../../types/navigation";

type AdminRegisterWebViewScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "AdminRegisterWebView"
>;

export const AdminRegisterWebViewScreen = ({
  navigation,
  route,
}: AdminRegisterWebViewScreenProps) => {
  const { title, url, helperText } = route.params;

  const openInBrowser = async () => {
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      Alert.alert("Unable to open", "This register page cannot be opened.");
      return;
    }

    await Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor="#F3F1FA" barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={20} color="#1D1B2F" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.helper} numberOfLines={1}>
            {helperText || "Manual verification search"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.85}
          onPress={openInBrowser}
        >
          <ExternalLink size={19} color="#6750D8" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <WebView
        source={{ uri: url }}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        style={styles.webView}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F1FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F3F1FA",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  titleBlock: {
    flex: 1,
    paddingHorizontal: 12,
  },
  title: {
    color: "#1D1B2F",
    fontSize: 18,
    fontWeight: "800",
  },
  helper: {
    color: "#6D687B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  webView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});