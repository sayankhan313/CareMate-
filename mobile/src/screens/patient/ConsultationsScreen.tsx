import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../../constants/colors";

export const ConsultationsScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Consultations</Text>
        <Text style={styles.subtitle}>
          Doctor consultation requests and video links will appear here.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coming later</Text>
          <Text style={styles.cardText}>
            This screen will connect patient consultation requests with doctor
            review and video consultation links.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 130,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.mutedText,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
  },
});