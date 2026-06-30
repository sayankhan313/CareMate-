import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../types/navigation";
import welcomeImage from "../../assets/images/caremate-welcome.png";

type WelcomeScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Welcome"
>;

const GRADIENT_TOP = "#ECF7FF";
const GRADIENT_BOTTOM = "#D6EDFC";

export const WelcomeScreen = ({ navigation }: WelcomeScreenProps) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={GRADIENT_TOP} barStyle="dark-content" />

      <LinearGradient
        colors={[GRADIENT_TOP, GRADIENT_BOTTOM]}
        style={styles.gradient}
      >
        <View style={styles.imageArea}>
          <Image
            source={welcomeImage}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.bottomArea}>
          <Text style={styles.helperText}>
            Securely manage your healthcare in one connected place.
          </Text>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GRADIENT_TOP,
  },
  gradient: {
    flex: 1,
  },
  imageArea: {
    height: "76%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  bottomArea: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 34,
    justifyContent: "flex-end",
  },
  helperText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 16,
  },
  continueButton: {
    backgroundColor: "#2563EB",
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
});