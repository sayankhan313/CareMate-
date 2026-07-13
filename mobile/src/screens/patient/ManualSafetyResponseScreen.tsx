import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Activity,
  ArrowLeft,
  Droplet,
  HeartPulse,
  ShieldAlert,
  Thermometer,
} from "lucide-react-native";

import type { RootStackParamList } from "../../types/navigation";
import { vitalsApi } from "../../services/vitalsApi";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "ManualSafetyResponse"
>;

type ManualCriticalVitalOption = {
  id: string;
  title: string;
  subtitle: string;
  manualDisplayTitle: string;
  manualDisplayValue: string;
  manualReason: string;
  icon: ReactNode;
  iconBackground: string;
  iconColor: string;
  hiddenCriticalPayload: Record<string, number>;
};

const criticalVitalOptions: ManualCriticalVitalOption[] = [
  {
    id: "oxygen-level-concern",
    title: "Oxygen Level Concern",
    subtitle: "Use this when oxygen level appears unsafe",
    manualDisplayTitle: "Oxygen Level Concern",
    manualDisplayValue: "Patient reported oxygen level concern",
    manualReason: "Manual safety response selected for oxygen level concern",
    icon: <Activity size={24} color="#2563EB" strokeWidth={2.6} />,
    iconBackground: "#DBEAFE",
    iconColor: "#2563EB",
    hiddenCriticalPayload: {
      spo2: 88,
    },
  },
  {
    id: "heart-rate-concern",
    title: "Heart Rate Concern",
    subtitle: "Use this when heart rate appears unsafe",
    manualDisplayTitle: "Heart Rate Concern",
    manualDisplayValue: "Patient reported heart rate concern",
    manualReason: "Manual safety response selected for heart rate concern",
    icon: <HeartPulse size={24} color="#DC2626" strokeWidth={2.6} />,
    iconBackground: "#FEE2E2",
    iconColor: "#DC2626",
    hiddenCriticalPayload: {
      heartRate: 135,
    },
  },
  {
    id: "blood-pressure-concern",
    title: "Blood Pressure Concern",
    subtitle: "Use this when blood pressure appears unsafe",
    manualDisplayTitle: "Blood Pressure Concern",
    manualDisplayValue: "Patient reported blood pressure concern",
    manualReason: "Manual safety response selected for blood pressure concern",
    icon: <Droplet size={24} color="#9333EA" strokeWidth={2.6} />,
    iconBackground: "#F3E8FF",
    iconColor: "#9333EA",
    hiddenCriticalPayload: {
      bpSystolic: 180,
      bpDiastolic: 120,
    },
  },
  {
    id: "glucose-concern",
    title: "Glucose Concern",
    subtitle: "Use this when glucose level appears unsafe",
    manualDisplayTitle: "Glucose Concern",
    manualDisplayValue: "Patient reported glucose concern",
    manualReason: "Manual safety response selected for glucose concern",
    icon: <Droplet size={24} color="#F97316" strokeWidth={2.6} />,
    iconBackground: "#FFEDD5",
    iconColor: "#F97316",
    hiddenCriticalPayload: {
      glucose: 260,
    },
  },
  {
    id: "temperature-concern",
    title: "Temperature Concern",
    subtitle: "Use this when body temperature appears unsafe",
    manualDisplayTitle: "Temperature Concern",
    manualDisplayValue: "Patient reported temperature concern",
    manualReason: "Manual safety response selected for temperature concern",
    icon: <Thermometer size={24} color="#0F766E" strokeWidth={2.6} />,
    iconBackground: "#CCFBF1",
    iconColor: "#0F766E",
    hiddenCriticalPayload: {
      temperature: 39.2,
    },
  },
  {
    id: "other-critical-concern",
    title: "Other Critical Concern",
    subtitle: "Use this for any other urgent safety reason",
    manualDisplayTitle: "Other Critical Concern",
    manualDisplayValue: "Patient reported another urgent safety concern",
    manualReason: "Manual safety response selected for another urgent concern",
    icon: <ShieldAlert size={24} color="#B91C1C" strokeWidth={2.6} />,
    iconBackground: "#FEE2E2",
    iconColor: "#B91C1C",
    hiddenCriticalPayload: {
      heartRate: 135,
    },
  },
];

export const ManualSafetyResponseScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const isSubmitting = Boolean(selectedOptionId);

  const startManualSafetyResponse = async (
    option: ManualCriticalVitalOption
  ) => {
    if (isSubmitting) {
      return;
    }

    try {
      setSelectedOptionId(option.id);
      setErrorMessage("");

      const savedReading = await vitalsApi.createReading({
        ...option.hiddenCriticalPayload,
        source: "MANUAL",
        deviceSource: `Manual Safety Response - ${option.title}`,
        recordedAt: new Date().toISOString(),
      } as any);

      navigation.replace("SafetyResponse", {
        vitalReading: savedReading,
        triggerSource: `Manual Safety Response - ${option.title}`,
        manualCriticalInfo: {
          title: option.manualDisplayTitle,
          value: option.manualDisplayValue,
          reason: option.manualReason,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start manual safety response.";

      setErrorMessage(message);
      Alert.alert("Safety Response", message);
    } finally {
      setSelectedOptionId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <StatusBar backgroundColor="#DC2626" barStyle="light-content" />

      <View style={styles.screen}>
              <LinearGradient
                  colors={["#EF4444", "#DC2626"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                      styles.header,
                      {
                          paddingTop: insets.top + 22,
                      },
                  ]}
              >
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
          >
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.7} />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Manual Safety Response</Text>
            <Text style={styles.headerSubtitle}>
              Choose the reason to start the safety response
            </Text>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom + 28, 48),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoCard}>
            <View style={styles.infoIconCircle}>
              <ShieldAlert size={26} color="#DC2626" strokeWidth={2.6} />
            </View>

            <View style={styles.infoTextBlock}>
              <Text style={styles.infoTitle}>Manual trigger</Text>
              <Text style={styles.infoText}>
                Select which vital or concern looks critical. CareMate+ will
                start the same safety response timer flow.
              </Text>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Select Safety Concern</Text>

          {criticalVitalOptions.map((option) => {
            const isSelected = selectedOptionId === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  isSelected ? styles.optionCardSelected : undefined,
                ]}
                activeOpacity={0.86}
                onPress={() => startManualSafetyResponse(option)}
                disabled={isSubmitting}
              >
                <View
                  style={[
                    styles.optionIconCircle,
                    {
                      backgroundColor: option.iconBackground,
                    },
                  ]}
                >
                  {option.icon}
                </View>

                <View style={styles.optionTextBlock}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>

                {isSelected ? (
                  <ActivityIndicator color="#DC2626" />
                ) : (
                  <View style={styles.selectPill}>
                    <Text style={styles.selectPillText}>Trigger</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingHorizontal: 20,
    
    paddingBottom: 26,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#FEE2E2",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  infoIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  infoTextBlock: {
    flex: 1,
  },
  infoTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },
  infoText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    marginBottom: 16,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  optionIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  optionTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  optionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  optionSubtitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  selectPill: {
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selectPillText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "900",
  },
  warningBox: {
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginTop: 6,
  },
  warningTitle: {
    color: "#92400E",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 5,
  },
  warningText: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
});