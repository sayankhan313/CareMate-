import React from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ConsultationEnded">;

const HEADER_COLOR = "#2563EB";

const ConsultationEndedScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const { consultationId, consultationType } = route.params;

  const goHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "PatientTabs", params: { screen: "Home" } }],
    });
  };

  const goConsultations = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "PatientTabs", params: { screen: "Consultations" } }],
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_COLOR} />

      <View
        style={[
          styles.header,
          { paddingTop: Math.max(26, insets.top + 14) },
        ]}
      >
        <Text style={styles.headerTitle}>Consultation Ended</Text>
        <Text style={styles.headerSubtitle}>
          Your CareMate+ video call has been closed.
        </Text>
      </View>

      <View
        style={[
          styles.content,
          { paddingBottom: Math.max(24, insets.bottom + 18) },
        ]}
      >
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>✓</Text>
        </View>

        <Text style={styles.title}>Video Call Ended</Text>

        <Text style={styles.description}>
          The consultation session has ended. You can return to your dashboard or
          review your consultation history.
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Type</Text>
            <Text style={styles.summaryValue}>
              {consultationType === "EMERGENCY" ? "Emergency" : "Manual"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Consultation ID</Text>
            <Text style={styles.summaryValue}>
              {consultationId.slice(0, 8)}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={goHome}>
          <Text style={styles.primaryButtonText}>Back to Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={goConsultations}
        >
          <Text style={styles.secondaryButtonText}>Back to Consultations</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ConsultationEndedScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: HEADER_COLOR,
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#DBEAFE",
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  iconText: {
    color: HEADER_COLOR,
    fontSize: 46,
    fontWeight: "900",
  },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  description: {
    marginTop: 12,
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  summaryCard: {
    width: "100%",
    marginTop: 26,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  summaryLabel: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
  },
  summaryValue: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  primaryButton: {
    width: "100%",
    marginTop: 28,
    backgroundColor: HEADER_COLOR,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    width: "100%",
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  secondaryButtonText: {
    color: HEADER_COLOR,
    fontSize: 16,
    fontWeight: "900",
  },
});
