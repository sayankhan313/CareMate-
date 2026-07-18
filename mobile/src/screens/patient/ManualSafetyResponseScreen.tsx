import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
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
  Activity,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
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
  hiddenCriticalPayload: Record<string, number>;
};

const BACKGROUND = "#FBF1F1";
const SURFACE = "#FFFFFF";
const TEXT = "#1B1D2A";
const MUTED = "#5F6270";

const RED = "#D9483F";
const RED_DARK = "#A6332C";
const RED_CONTAINER = "#F9DAD7";
const ON_RED_CONTAINER = "#7A241F";
const RED_SOFT = "#FCEBE9";

const SURFACE_VARIANT = "#F2E4E2";
const DIVIDER = "#F1DEDC";


const elevate = (level: number) => ({
  elevation: level,
  shadowColor: "#1B1D2A",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: { width: 0, height: level * 0.8 },
});

const criticalVitalOptions: ManualCriticalVitalOption[] = [
  {
    id: "oxygen-level-concern",
    title: "Oxygen Level Concern",
    subtitle: "Use this when oxygen level appears unsafe",
    manualDisplayTitle: "Oxygen Level Concern",
    manualDisplayValue: "Patient reported oxygen level concern",
    manualReason: "Manual safety response selected for oxygen level concern",
    icon: <Activity size={21} color={RED} strokeWidth={2.2} />,
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
    icon: <HeartPulse size={21} color={RED} strokeWidth={2.2} />,
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
    icon: <Droplet size={21} color={RED} strokeWidth={2.2} />,
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
    icon: <Droplet size={21} color={RED} strokeWidth={2.2} />,
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
    icon: <Thermometer size={21} color={RED} strokeWidth={2.2} />,
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
    icon: <ShieldAlert size={21} color={RED} strokeWidth={2.2} />,
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
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
          >
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.appBarTextBlock}>
            <Text style={styles.appBarTitle}>Manual Safety</Text>
            <Text style={styles.appBarSubtitle}>Start emergency response</Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom + 28, 56),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.alertStrip}>
            <View style={styles.alertIconCircle}>
              <ShieldAlert size={25} color={SURFACE} strokeWidth={2.2} />
            </View>

            <View style={styles.alertTextBlock}>
              <Text style={styles.alertTitle}>Manual emergency trigger</Text>
              <Text style={styles.alertText}>
                Choose the concern that best matches the situation. CareMate+
                will start the safety timer flow.
              </Text>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <AlertCircle size={19} color={RED_DARK} strokeWidth={2.2} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>What looks unsafe?</Text>
            <Text style={styles.sectionSubtitle}>
              Tap one option to create a manual critical alert.
            </Text>
          </View>

          <View style={styles.optionPanel}>
            {criticalVitalOptions.map((option, index) => {
              const isSelected = selectedOptionId === option.id;
              const isLast = index === criticalVitalOptions.length - 1;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionRow,
                    isSelected ? styles.optionRowSelected : undefined,
                    isLast ? styles.rowLast : undefined,
                  ]}
                  activeOpacity={0.86}
                  onPress={() => startManualSafetyResponse(option)}
                  disabled={isSubmitting}
                >
                  <View style={styles.optionIconCircle}>{option.icon}</View>

                  <View style={styles.optionTextBlock}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>
                      {option.subtitle}
                    </Text>
                  </View>

                  {isSelected ? (
                    <ActivityIndicator color={RED} />
                  ) : (
                    <View style={styles.actionCircle}>
                      <ChevronRight
                        size={19}
                        color={RED}
                        strokeWidth={2.4}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.noteBox}>
            <AlertCircle size={18} color={RED_DARK} strokeWidth={2.2} />
            <Text style={styles.noteText}>
              This does not show fake values to the patient. It only creates the
              required critical backend reading so the Safety Response workflow
              can start correctly.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

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
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    ...elevate(1),
  },
  appBarTextBlock: {
    flex: 1,
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  alertStrip: {
    backgroundColor: RED,
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    ...elevate(2),
  },
  alertIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  alertTextBlock: {
    flex: 1,
  },
  alertTitle: {
    color: SURFACE,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0,
  },
  alertText: {
    color: "#FCE6E4",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    marginTop: 6,
  },
  errorCard: {
    backgroundColor: RED_SOFT,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    ...elevate(0.5),
  },
  errorText: {
    flex: 1,
    color: RED_DARK,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginLeft: 10,
  },
  sectionHeader: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0,
  },
  sectionSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    marginTop: 3,
  },
  optionPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    ...elevate(1),
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
  },
  optionRowSelected: {
    opacity: 0.72,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  optionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: RED_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  optionTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  optionSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },
  actionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: RED_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  noteBox: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
    ...elevate(1),
  },
  noteText: {
    flex: 1,
    color: RED_DARK,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginLeft: 10,
  },
});
