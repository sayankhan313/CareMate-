import React from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Home,
  MessageSquareText,
  Video,
} from "lucide-react-native";

import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ConsultationEnded">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#3F6FD0";
const PRIMARY_LIGHT = "#EEF4FF";

const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";

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
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <View>
            <Text style={styles.appBarTitle}>Consultation Ended</Text>
            <Text style={styles.appBarSubtitle}>
              Your CareMate+ video call has been closed
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.content,
            {
              paddingBottom: Math.max(28, insets.bottom + 24),
            },
          ]}
        >
          <View style={styles.successPanel}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={48} color={SUCCESS} strokeWidth={2.8} />
            </View>

            <Text style={styles.title}>Video call ended</Text>

            <Text style={styles.description}>
              The consultation session has ended. You can return to your
              dashboard or review your consultation history.
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIconCircle}>
                <Video size={22} color={PRIMARY} strokeWidth={2.7} />
              </View>

              <View style={styles.summaryHeaderText}>
                <Text style={styles.summaryTitle}>Session summary</Text>
                <Text style={styles.summarySubtitle}>
                  Consultation details
                </Text>
              </View>
            </View>

            <SummaryRow
              icon={
                <MessageSquareText
                  size={18}
                  color={PRIMARY}
                  strokeWidth={2.5}
                />
              }
              label="Type"
              value={consultationType === "EMERGENCY" ? "Emergency" : "Manual"}
            />

            <SummaryRow
              icon={
                <ClipboardList
                  size={18}
                  color={PRIMARY}
                  strokeWidth={2.5}
                />
              }
              label="Consultation ID"
              value={consultationId.slice(0, 8)}
              isLast
            />
          </View>

          <View style={styles.actionPanel}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.86}
              onPress={goHome}
            >
              <Home size={20} color={SURFACE} strokeWidth={2.7} />
              <Text style={styles.primaryButtonText}>Back to Home</Text>
              <ChevronRight size={20} color={SURFACE} strokeWidth={2.8} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.86}
              onPress={goConsultations}
            >
              <MessageSquareText size={20} color={TEXT} strokeWidth={2.6} />
              <Text style={styles.secondaryButtonText}>
                Back to Consultations
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const SummaryRow = ({
  icon,
  label,
  value,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}) => {
  return (
    <View style={[styles.summaryRow, isLast ? styles.summaryRowLast : null]}>
      <View style={styles.summaryRowIcon}>{icon}</View>

      <View style={styles.summaryRowText}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  );
};

export default ConsultationEndedScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  appBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
    lineHeight: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    justifyContent: "center",
  },
  successPanel: {
    backgroundColor: SURFACE,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  successIconCircle: {
    width: 92,
    height: 92,
    borderRadius: 32,
    backgroundColor: SUCCESS_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    color: TEXT,
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.45,
  },
  description: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 10,
  },
  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  summaryHeaderText: {
    flex: 1,
  },
  summaryTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
  },
  summarySubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  summaryRowText: {
    flex: 1,
  },
  summaryLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 3,
  },
  summaryValue: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  actionPanel: {
    backgroundColor: SURFACE,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "900",
    marginHorizontal: 8,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 10,
    flexDirection: "row",
  },
  secondaryButtonText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
});