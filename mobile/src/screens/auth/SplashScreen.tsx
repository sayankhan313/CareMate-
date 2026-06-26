import { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { API_BASE_URL } from "../../constants/api";
import { colors } from "../../constants/colors";
import { tokenStorage } from "../../services/tokenStorage";
import { CareMateLogo } from "../../components/CareMateLogo";
type Props = {
  navigation: any;
};

export const SplashScreen = ({ navigation }: Props) => {
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await tokenStorage.getToken();

      if (!token) {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "Login",
            },
          ],
        });

        return;
      }

      const currentUserResponse = await fetch(`${API_BASE_URL}/users/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const currentUserJson = await currentUserResponse.json();

      if (!currentUserResponse.ok || !currentUserJson.success) {
        await tokenStorage.removeToken();

        navigation.reset({
          index: 0,
          routes: [
            {
              name: "Login",
            },
          ],
        });

        return;
      }

      navigation.reset({
        index: 0,
        routes: [
          {
            name: "PatientDashboard",
            params: {
              user: currentUserJson.data.user,
            },
          },
        ],
      });
    } catch (error) {
      await tokenStorage.removeToken();

      navigation.reset({
        index: 0,
        routes: [
          {
            name: "Login",
          },
        ],
      });
    }
  };

  return (
    <View style={styles.container}>
      <CareMateLogo size={96} />

      <Text style={styles.title}>CareMate+</Text>

      <Text style={styles.subtitle}>
        Checking your secure session...
      </Text>

      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={styles.loader}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.mutedText,
    textAlign: "center",
  },
  loader: {
    marginTop: 28,
  },
});