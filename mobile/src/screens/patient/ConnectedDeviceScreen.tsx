import { useMemo, useState, type ReactNode } from "react";
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
  Activity as ActivityIcon,
  ArrowLeft,
  Droplet,
  HeartPulse,
  Link,
  Link2Off,
  Play,
  RefreshCw,
  Settings,
  Square,
  Watch,
} from "lucide-react-native";

import type { RootStackParamList } from "../../types/navigation";
import type { VitalReading, VitalSimulationMode } from "../../types/vitals";

import { useHealthConnectDevice } from "../../context/HealthConnectDeviceContext";
import { healthConnectService } from "../../services/healthConnectService";
import { vitalsApi } from "../../services/vitalsApi";
import { getSimulatedVitalReading } from "../../utils/vitalSimulator";

type ConnectedDeviceScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ConnectedDevice"
>;

const BACKGROUND = "#F2F3F8";
const SURFACE = "#FFFFFF";
const SURFACE_VARIANT = "#E7E9F2";
const TEXT = "#1B1D2A";
const MUTED = "#5F6270";
const SOFT_PANEL = "#F3F4FA";

const PRIMARY = "#4C6FE0";
const PRIMARY_CONTAINER = "#E1E7FF";
const ON_PRIMARY_CONTAINER = "#0C2A8C";

const SUCCESS = "#3A9D75";
const SUCCESS_CONTAINER = "#DBF3E7";
const ON_SUCCESS_CONTAINER = "#0F5C3C";

const WARNING = "#C77A1F";
const WARNING_CONTAINER = "#FBE7CD";
const ON_WARNING_CONTAINER = "#7A4708";

const DANGER = "#C6404A";
const DANGER_CONTAINER = "#FBDADC";
const ON_DANGER_CONTAINER = "#8C1D24";

const INDIGO = "#6B59B5";
const INDIGO_CONTAINER = "#E9E4F8";


const PRIMARY_LIGHT = PRIMARY_CONTAINER;
const WARNING_LIGHT = WARNING_CONTAINER;
const DANGER_LIGHT = DANGER_CONTAINER;
const INDIGO_LIGHT = INDIGO_CONTAINER;

const getModeLabel = (mode: VitalSimulationMode) => {
  if (mode === "CRITICAL") return "Critical";
  if (mode === "WARNING") return "Warning";
  return "Normal";
};

const getModeColors = (mode: VitalSimulationMode) => {
  if (mode === "CRITICAL") {
    return {
      background: DANGER_CONTAINER,
      border: DANGER_CONTAINER,
      text: ON_DANGER_CONTAINER,
      pill: DANGER_CONTAINER,
      dot: DANGER,
    };
  }

  if (mode === "WARNING") {
    return {
      background: WARNING_CONTAINER,
      border: WARNING_CONTAINER,
      text: ON_WARNING_CONTAINER,
      pill: WARNING_CONTAINER,
      dot: WARNING,
    };
  }

  return {
    background: SUCCESS_CONTAINER,
    border: SUCCESS_CONTAINER,
    text: ON_SUCCESS_CONTAINER,
    pill: SUCCESS_CONTAINER,
    dot: SUCCESS,
  };
};

const formatTime = (dateValue: string | null) => {
  if (!dateValue) return "Not synced yet";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not synced yet";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const ConnectedDeviceScreen = ({
  navigation,
}: ConnectedDeviceScreenProps) => {
  const insets = useSafeAreaInsets();

  const [selectedMode, setSelectedMode] =
    useState<VitalSimulationMode>("NORMAL");

  const [isStartingSimulation, setIsStartingSimulation] = useState(false);
  const [lastScreenMessage, setLastScreenMessage] = useState("");

  const {
    isHealthConnectConnected,
    isHealthConnectSyncing,
    connectedDeviceName,
    lastSyncAt,
    lastSyncStatus,
    lastSyncError,
    connectHealthConnect,
    disconnectHealthConnect,
    syncHealthConnectNow,
  } = useHealthConnectDevice();

  const preview = useMemo(() => {
    return getSimulatedVitalReading(selectedMode);
  }, [selectedMode]);

  const modeColors = getModeColors(selectedMode);

  const openSafetyResponseIfCritical = (
    savedReading: VitalReading | null,
    sourceLabel: string
  ) => {
    if (savedReading?.status !== "CRITICAL") {
      return false;
    }

    setLastScreenMessage(
      "Critical vital reading detected. Opening Safety Response."
    );

    navigation.navigate("SafetyResponse", {
      vitalReading: savedReading,
      triggerSource: sourceLabel,
    });

    return true;
  };

  const connectOrDisconnect = async () => {
    if (isHealthConnectConnected) {
      await disconnectHealthConnect();

      setLastScreenMessage("Health Connect has been disconnected.");

      Alert.alert(
        "Device disconnected",
        "Health Connect auto-sync has been stopped."
      );

      return;
    }

    try {
      setLastScreenMessage("");

      const savedReading = await connectHealthConnect();

      if (savedReading) {
        if (openSafetyResponseIfCritical(savedReading, "Health Connect")) {
          return;
        }

        const message = `Health Connect connected. Latest reading saved as ${savedReading.status}.`;

        setLastScreenMessage(message);

        Alert.alert("Device connected", message);

        return;
      }

      const message =
        "Health Connect connected, but no vitals were found yet. Add data in Toolbox or another health app.";

      setLastScreenMessage(message);

      Alert.alert("Device connected", message);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to connect Health Connect.";

      setLastScreenMessage(message);

      Alert.alert("Connection failed", message);
    }
  };

  const syncNowManually = async () => {
    try {
      setLastScreenMessage("");

      const savedReading = await syncHealthConnectNow("manual");

      if (!savedReading) {
        const message =
          "No new Health Connect reading detected. Latest reading is already saved.";

        setLastScreenMessage(message);

        Alert.alert("Health Connect", message);

        return;
      }

      if (openSafetyResponseIfCritical(savedReading, "Health Connect")) {
        return;
      }

      const message = `Latest reading saved as ${savedReading.status}.`;

      setLastScreenMessage(message);

      Alert.alert("Vitals updated", message);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update Health Connect data.";

      setLastScreenMessage(message);

      Alert.alert("Update failed", message);
    }
  };

  const startSimulation = async () => {
    try {
      setIsStartingSimulation(true);
      setLastScreenMessage("");

      const payload = getSimulatedVitalReading(selectedMode);

      const savedReading = await vitalsApi.createReading(payload);

      if (
        openSafetyResponseIfCritical(savedReading, "CareMate Watch Simulator")
      ) {
        return;
      }

      const message = `${getModeLabel(selectedMode)} reading saved as ${
        savedReading.status
      }.`;

      setLastScreenMessage(message);

      Alert.alert("Simulation saved", message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start simulation.";

      setLastScreenMessage(message);

      Alert.alert("Simulation failed", message);
    } finally {
      setIsStartingSimulation(false);
    }
  };

  const openHealthConnectSettings = async () => {
    try {
      await healthConnectService.openSettings();
    } catch (error) {
      Alert.alert("Health Connect", "Unable to open Health Connect settings.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.82}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.appBarTextBlock}>
            <Text style={styles.appBarTitle}>Connected Device</Text>
            <Text style={styles.appBarSubtitle}>
              Health Connect and simulator setup
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: Math.max(insets.bottom + 34, 64),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.featureCard}>
            <View style={styles.featureTopRow}>
              <View style={styles.featureTextBlock}>
                <View
                  style={[
                    styles.statusBadge,
                    isHealthConnectConnected
                      ? styles.statusBadgeActive
                      : styles.statusBadgeInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: isHealthConnectConnected
                          ? SUCCESS
                          : DANGER,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color: isHealthConnectConnected
                          ? ON_SUCCESS_CONTAINER
                          : ON_DANGER_CONTAINER,
                      },
                    ]}
                  >
                    {isHealthConnectConnected ? "Connected" : "Not connected"}
                  </Text>
                </View>

                <Text style={styles.featureTitle}>Android Health Connect</Text>

                <Text style={styles.featureSubtitle}>
                  Reads patient-approved vitals from Health Connect sources.
                </Text>
              </View>

              <View style={styles.featureIconBox}>
                <Watch size={29} color={PRIMARY} strokeWidth={2.2} />
              </View>
            </View>

            <View style={styles.featureStats}>
              <FeatureStat
                label="Sync"
                value={isHealthConnectConnected ? "Auto" : "Manual"}
              />

              <View style={styles.featureStatDivider} />

              <FeatureStat label="Last sync" value={formatTime(lastSyncAt)} />

              <View style={styles.featureStatDivider} />

              <FeatureStat label="Status" value={lastSyncStatus || "No data"} />
            </View>
          </View>

          <View style={styles.quickActionCard}>
            <DeviceActionButton
              label={isHealthConnectConnected ? "Disconnect" : "Connect"}
              icon={
                isHealthConnectConnected ? (
                  <Link2Off size={22} color={DANGER} strokeWidth={2.2} />
                ) : (
                  <Link size={22} color={PRIMARY} strokeWidth={2.2} />
                )
              }
              tone={isHealthConnectConnected ? "danger" : "primary"}
              disabled={isHealthConnectSyncing}
              onPress={connectOrDisconnect}
            />

            <DeviceActionButton
              label="Sync"
              icon={<RefreshCw size={22} color={PRIMARY} strokeWidth={2.2} />}
              tone="primary"
              disabled={!isHealthConnectConnected || isHealthConnectSyncing}
              onPress={syncNowManually}
            />

            <DeviceActionButton
              label="Settings"
              icon={<Settings size={22} color={TEXT} strokeWidth={2.2} />}
              tone="neutral"
              onPress={openHealthConnectSettings}
            />
          </View>

          <View style={styles.whitePanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Connection details</Text>
              <Text style={styles.panelAction}>
                {isHealthConnectConnected ? "Active" : "Off"}
              </Text>
            </View>

            <DetailRow
              label="Connection"
              value={isHealthConnectConnected ? "Active" : "Off"}
              tone={isHealthConnectConnected ? "success" : "danger"}
            />

            <DetailRow label="Connected via" value={connectedDeviceName} />

            <DetailRow
              label="Auto Sync"
              value={isHealthConnectConnected ? "Active" : "Off"}
              tone={isHealthConnectConnected ? "success" : "danger"}
            />

            <DetailRow label="Last Sync" value={formatTime(lastSyncAt)} />

            <DetailRow
              label="Last Status"
              value={lastSyncStatus || "No reading yet"}
              isLast
            />
          </View>

          <View style={styles.whitePanel}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelTitle}>CareMate Watch Simulator</Text>
                <Text style={styles.panelSubtitle}>
                  Demo mode for Normal, Warning and Critical vitals
                </Text>
              </View>
            </View>

            <View style={styles.segmentControl}>
              {(["NORMAL", "WARNING", "CRITICAL"] as VitalSimulationMode[]).map(
                (mode) => {
                  const isSelected = selectedMode === mode;
                  const colors = getModeColors(mode);

                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.segmentButton,
                        isSelected
                          ? {
                              backgroundColor: colors.pill,
                            }
                          : undefined,
                      ]}
                      activeOpacity={0.82}
                      onPress={() => setSelectedMode(mode)}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          isSelected
                            ? {
                                color: colors.text,
                              }
                            : undefined,
                        ]}
                      >
                        {getModeLabel(mode)}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            <View
              style={[
                styles.previewPanel,
                {
                  backgroundColor: modeColors.background,
                },
              ]}
            >
              <View style={styles.previewHeader}>
                <View>
                  <Text style={styles.previewTitle}>Live Preview</Text>
                  <Text style={styles.previewSubtitle}>
                    {getModeLabel(selectedMode)} vital reading
                  </Text>
                </View>

                <View
                  style={[
                    styles.modePill,
                    {
                      backgroundColor: modeColors.pill,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.modeDot,
                      {
                        backgroundColor: modeColors.dot,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.modePillText,
                      {
                        color: modeColors.text,
                      },
                    ]}
                  >
                    {getModeLabel(selectedMode)}
                  </Text>
                </View>
              </View>

              <PreviewRow
                icon={<HeartPulse size={20} color={DANGER} strokeWidth={2.2} />}
                label="Heart Rate"
                value={`${preview.heartRate}`}
                unit="bpm"
                iconBackground={DANGER_LIGHT}
              />

              <PreviewRow
                icon={
                  <ActivityIcon size={20} color={PRIMARY} strokeWidth={2.2} />
                }
                label="SpO₂"
                value={`${preview.spo2}`}
                unit="%"
                iconBackground={PRIMARY_LIGHT}
              />

              <PreviewRow
                icon={
                  <ActivityIcon size={20} color={INDIGO} strokeWidth={2.2} />
                }
                label="Blood Pressure"
                value={`${preview.bpSystolic}/${preview.bpDiastolic}`}
                unit="mmHg"
                iconBackground={INDIGO_LIGHT}
              />

              <PreviewRow
                icon={<Droplet size={20} color={WARNING} strokeWidth={2.2} />}
                label="Glucose"
                value={`${preview.glucose}`}
                unit="mg/dL"
                iconBackground={WARNING_LIGHT}
                isLast
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.82}
              onPress={startSimulation}
              disabled={isStartingSimulation}
            >
              {isStartingSimulation ? (
                <ActivityIndicator color={SURFACE} />
              ) : (
                <>
                  <Play size={20} color={SURFACE} strokeWidth={2.2} />
                  <Text style={styles.primaryButtonText}>Start Simulation</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineButton}
              activeOpacity={0.82}
              onPress={() =>
                Alert.alert(
                  "Simulation stopped",
                  "No background simulation is running."
                )
              }
            >
              <Square size={18} color={TEXT} strokeWidth={2.2} />
              <Text style={styles.outlineButtonText}>Stop Simulation</Text>
            </TouchableOpacity>
          </View>

          {lastScreenMessage || lastSyncError ? (
            <View style={styles.messagePanel}>
              <ActivityIcon
                size={20}
                color={lastSyncError ? DANGER : PRIMARY}
                strokeWidth={2.2}
              />

              <Text
                style={[
                  styles.messageText,
                  lastSyncError ? styles.messageError : undefined,
                ]}
              >
                {lastSyncError || lastScreenMessage}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const DeviceActionButton = ({
  label,
  icon,
  onPress,
  disabled,
  tone,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  tone: "primary" | "danger" | "neutral";
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.deviceActionButton,
        tone === "primary" ? styles.deviceActionPrimary : undefined,
        tone === "danger" ? styles.deviceActionDanger : undefined,
        tone === "neutral" ? styles.deviceActionNeutral : undefined,
        disabled ? styles.disabledActionButton : undefined,
      ]}
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.deviceActionIcon}>{icon}</View>
      <Text
        style={[
          styles.deviceActionText,
          tone === "danger" ? styles.deviceActionTextDanger : undefined,
          tone === "neutral" ? styles.deviceActionTextNeutral : undefined,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const FeatureStat = ({ label, value }: { label: string; value: string }) => {
  return (
    <View style={styles.featureStat}>
      <Text style={styles.featureStatLabel}>{label}</Text>
      <Text style={styles.featureStatValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

const DetailRow = ({
  label,
  value,
  tone,
  isLast,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
  isLast?: boolean;
}) => {
  const valueStyle =
    tone === "success"
      ? styles.detailValueSuccess
      : tone === "danger"
      ? styles.detailValueDanger
      : undefined;

  return (
    <View style={[styles.detailRow, isLast ? styles.rowLast : undefined]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueStyle]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
};

const PreviewRow = ({
  icon,
  label,
  value,
  unit,
  iconBackground,
  isLast,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  iconBackground: string;
  isLast?: boolean;
}) => {
  return (
    <View style={[styles.previewRow, isLast ? styles.rowLast : undefined]}>
      <View style={[styles.previewIcon, { backgroundColor: iconBackground }]}>
        {icon}
      </View>

      <View style={styles.previewTextBlock}>
        <Text style={styles.previewLabel}>{label}</Text>
      </View>

      <View style={styles.previewValueBlock}>
        <Text style={styles.previewValue}>{value}</Text>
        <Text style={styles.previewUnit}>{unit}</Text>
      </View>
    </View>
  );
};

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: TEXT,
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: {
    width: 0,
    height: level * 0.8,
  },
});

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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BACKGROUND,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  appBarTextBlock: {
    flex: 1,
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  featureCard: {
    backgroundColor: PRIMARY,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    overflow: "hidden",
    ...elevate(2),
  },
  featureTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  featureTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeActive: {
    backgroundColor: SUCCESS_CONTAINER,
  },
  statusBadgeInactive: {
    backgroundColor: DANGER_CONTAINER,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 7,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  featureTitle: {
    color: SURFACE,
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginTop: 14,
  },
  featureSubtitle: {
    color: "#E4EAFF",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    marginTop: 6,
  },
  featureIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  featureStats: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 5,
    marginTop: 18,
  },
  featureStat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  featureStatDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  featureStatLabel: {
    color: "#E4EAFF",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 5,
  },
  featureStatValue: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  quickActionCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 10,
    marginBottom: 16,
    flexDirection: "row",
    ...elevate(1),
  },
  deviceActionButton: {
    flex: 1,
    minHeight: 76,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    overflow: "hidden",
  },
  deviceActionPrimary: {
    backgroundColor: PRIMARY_CONTAINER,
  },
  deviceActionDanger: {
    backgroundColor: DANGER_CONTAINER,
  },
  deviceActionNeutral: {
    backgroundColor: SURFACE_VARIANT,
  },
  disabledActionButton: {
    opacity: 0.45,
  },
  deviceActionIcon: {
    marginBottom: 7,
  },
  deviceActionText: {
    color: ON_PRIMARY_CONTAINER,
    fontSize: 12,
    fontWeight: "700",
  },
  deviceActionTextDanger: {
    color: ON_DANGER_CONTAINER,
  },
  deviceActionTextNeutral: {
    color: TEXT,
  },
  whitePanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    ...elevate(1),
  },
  panelHeader: {
    paddingBottom: 12,
  },
  panelTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },
  panelSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },
  panelAction: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE_VARIANT,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    marginRight: 12,
  },
  detailValue: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
    lineHeight: 18,
  },
  detailValueSuccess: {
    color: ON_SUCCESS_CONTAINER,
  },
  detailValueDanger: {
    color: ON_DANGER_CONTAINER,
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 16,
    overflow: "hidden",
    ...elevate(1),
  },
  primaryButtonText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 9,
  },
  outlineButton: {
    backgroundColor: SURFACE_VARIANT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
    overflow: "hidden",
  },
  outlineButtonText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  segmentControl: {
    flexDirection: "row",
    backgroundColor: SOFT_PANEL,
    borderRadius: 14,
    padding: 4,
    marginTop: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  segmentText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
  },
  previewPanel: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
    marginTop: 14,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  previewTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
  },
  previewSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 10,
  },
  modeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  modePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(27,29,42,0.10)",
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  previewTextBlock: {
    flex: 1,
  },
  previewLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "600",
  },
  previewValueBlock: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  previewValue: {
    color: TEXT,
    fontSize: 19,
    fontWeight: "700",
    marginRight: 4,
  },
  previewUnit: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  messagePanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    ...elevate(1),
  },
  messageText: {
    flex: 1,
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
    marginLeft: 10,
  },
  messageError: {
    color: ON_DANGER_CONTAINER,
  },
});
