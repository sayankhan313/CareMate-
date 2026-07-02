import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type SplashScreenProps = NativeStackScreenProps<RootStackParamList, "Splash">;

export const SplashScreen = ({ navigation }: SplashScreenProps) => {
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await tokenStorage.getToken();

        if (!token) {
          navigation.reset({
            index: 0,
            routes: [{ name: "Welcome" }],
          });
          return;
        }

        const response = await fetch(`${API_BASE_URL}/users/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await response.json();

        if (!response.ok || !json.success) {
          await tokenStorage.removeToken();

          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
          return;
        }

        navigation.reset({
          index: 0,
          routes: [
            {
              name: "PatientTabs",
              params: {
                user: json.data.user,
              },
            },
          ],
        });
      } catch (error) {
        await tokenStorage.removeToken();

        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      }
    };

    checkLoginStatus();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>♡</Text>
        </View>

        <Text style={styles.appName}>CareMate+</Text>

        <Text style={styles.subtitle}>Preparing your care dashboard</Text>

        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={styles.loader}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6FAFF",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "900",
  },
  appName: {
    color: "#0F172A",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  loader: {
    marginTop: 26,
  },
});