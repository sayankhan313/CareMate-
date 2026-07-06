import { useMemo, useState, type ReactNode } from "react";
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
  Battery,
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
import type {VitalSimulationMode} from "../../types/vitals";
import { useHealthConnectDevice } from "../../context/HealthConnectDeviceContext";
import { healthConnectService } from "../../services/healthConnectService";
import { vitalsApi } from "../../services/vitalsApi";
import { getSimulatedVitalReading } from "../../utils/vitalSimulator";

type ConnectedDeviceScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ConnectedDevice"
>;

const getModeLabel = (mode: VitalSimulationMode) => {
  if (mode === "CRITICAL") return "Critical";
  if (mode === "WARNING") return "Warning";
  return "Normal";
};

const getModeColors = (mode: VitalSimulationMode) => {
  if (mode === "CRITICAL") {
    return {
      background: "#FEF2F2",
      border: "#FCA5A5",
      text: "#B91C1C",
      pill: "#FEE2E2",
    };
  }

  if (mode === "WARNING") {
    return {
      background: "#FFF7ED",
      border: "#FDBA74",
      text: "#C2410C",
      pill: "#FFEDD5",
    };
  }

  return {
    background: "#ECFDF5",
    border: "#86EFAC",
    text: "#15803D",
    pill: "#DCFCE7",
  };
};


const formatTime = (dateValue: string | null) => {
  if (!dateValue) return "Not synced yet";

  return new Date(dateValue).toLocaleTimeString([], {
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
    <SafeAreaView style={styles.safeArea} edges={["top","bottom"]}>
      <StatusBar backgroundColor="#2563EB" barStyle="light-content" />

      <ScrollView
  style={styles.screen}
  contentContainerStyle={[
    styles.content,
    {
      paddingBottom: Math.max(insets.bottom + 34, 54),
    },
  ]}
  showsVerticalScrollIndicator={false}
>
        <LinearGradient
          colors={["#3B82F6", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Connected Device</Text>
            <Text style={styles.headerSubtitle}>
              Connect Health Connect once and keep vitals updated automatically
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.deviceRow}>
            <View
              style={[
                styles.deviceIcon,
                isHealthConnectConnected
                  ? styles.deviceIconConnected
                  : styles.deviceIconDisconnected,
              ]}
            >
              <Watch size={32} color="#FFFFFF" strokeWidth={2.5} />
            </View>

            <View style={styles.deviceTextBlock}>
              <Text style={styles.deviceTitle}>Android Health Connect</Text>
              <Text style={styles.deviceSubtitle}>
                Reads patient-approved vitals from Health Connect sources
              </Text>

              <View
                style={[
                  styles.connectedPill,
                  isHealthConnectConnected
                    ? styles.connectedPillActive
                    : styles.connectedPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.connectedText,
                    isHealthConnectConnected
                      ? styles.connectedTextActive
                      : styles.connectedTextInactive,
                  ]}
                >
                  {isHealthConnectConnected ? "Connected" : "Not connected"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statusBox}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Connection</Text>
              <Text
                style={[
                  styles.statusValue,
                  isHealthConnectConnected
                    ? styles.statusValueConnected
                    : styles.statusValueDisconnected,
                ]}
              >
                {isHealthConnectConnected ? "Active" : "Off"}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Connected via</Text>
              <Text style={styles.statusValue}>{connectedDeviceName}</Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Auto Sync</Text>
              <Text
                style={[
                  styles.statusValue,
                  isHealthConnectConnected
                    ? styles.statusValueConnected
                    : styles.statusValueDisconnected,
                ]}
              >
                {isHealthConnectConnected ? "Active" : "Off"}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Sync</Text>
              <Text style={styles.statusValue}>{formatTime(lastSyncAt)}</Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Status</Text>
              <Text style={styles.statusValue}>
                {lastSyncStatus || "No reading yet"}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <RefreshCw size={20} color="#64748B" />
              <Text style={styles.statLabel}>Sync Type</Text>
              <Text style={styles.statValue}>
                {isHealthConnectConnected ? "Auto" : "Manual"}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Battery size={20} color="#64748B" />
              <Text style={styles.statLabel}>Provider</Text>
              <Text style={styles.statValue}>Health Connect</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              isHealthConnectConnected
                ? styles.disconnectButton
                : styles.connectButton,
            ]}
            activeOpacity={0.85}
            onPress={connectOrDisconnect}
            disabled={isHealthConnectSyncing}
          >
            {isHealthConnectSyncing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                {isHealthConnectConnected ? (
                  <Link2Off size={20} color="#FFFFFF" strokeWidth={2.6} />
                ) : (
                  <Link size={20} color="#FFFFFF" strokeWidth={2.6} />
                )}

                <Text style={styles.primaryButtonText}>
                  {isHealthConnectConnected
                    ? "Disconnect Health Connect"
                    : "Connect Health Connect"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {isHealthConnectConnected ? (
            <TouchableOpacity
              style={styles.secondarySyncButton}
              activeOpacity={0.85}
              onPress={syncNowManually}
              disabled={isHealthConnectSyncing}
            >
              {isHealthConnectSyncing ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <>
                  <RefreshCw size={19} color="#2563EB" strokeWidth={2.4} />
                  <Text style={styles.secondarySyncButtonText}>
                    Update Now
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}


          <TouchableOpacity
            style={styles.outlineButton}
            activeOpacity={0.85}
            onPress={openHealthConnectSettings}
          >
            <Settings size={19} color="#334155" strokeWidth={2.4} />
            <Text style={styles.outlineButtonText}>
              Open Health Connect Settings
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>CareMate Watch Simulator</Text>
          <Text style={styles.sectionSubtitle}>
            Backup demo mode for Normal, Warning and Critical vitals
          </Text>

          <View style={styles.segmentControl}>
            {(["NORMAL", "WARNING", "CRITICAL"] as VitalSimulationMode[]).map(
              (mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.segmentButton,
                    selectedMode === mode ? styles.segmentButtonActive : null,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedMode(mode)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selectedMode === mode ? styles.segmentTextActive : null,
                    ]}
                  >
                    {getModeLabel(mode)}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: modeColors.background,
              borderColor: modeColors.border,
            },
          ]}
        >
          <View style={styles.previewHeaderRow}>
            <Text style={styles.sectionTitle}>Live Preview</Text>

            <View
              style={[
                styles.modePill,
                {
                  backgroundColor: modeColors.pill,
                },
              ]}
            >
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

          <View style={styles.previewGrid}>
            <PreviewBox
              label="Heart Rate"
              value={`${preview.heartRate}`}
              unit="bpm"
              icon={<HeartPulse size={21} color="#DC2626" />}
              backgroundColor="rgba(255,255,255,0.72)"
            />

            <PreviewBox
              label="SpO2"
              value={`${preview.spo2}`}
              unit="%"
              icon={<Activity size={21} color="#2563EB" />}
              backgroundColor="rgba(255,255,255,0.72)"
            />

            <PreviewBox
              label="Blood Pressure"
              value={`${preview.bpSystolic}/${preview.bpDiastolic}`}
              unit="mmHg"
              icon={<Activity size={21} color="#9333EA" />}
              backgroundColor="rgba(255,255,255,0.72)"
            />

            <PreviewBox
              label="Glucose"
              value={`${preview.glucose}`}
              unit="mg/dL"
              icon={<Droplet size={21} color="#F97316" />}
              backgroundColor="rgba(255,255,255,0.72)"
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={startSimulation}
            disabled={isStartingSimulation}
          >
            {isStartingSimulation ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Play size={20} color="#FFFFFF" strokeWidth={2.6} />
                <Text style={styles.primaryButtonText}>Start Simulation</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            activeOpacity={0.85}
            onPress={() =>
              Alert.alert(
                "Simulation stopped",
                "No background simulation is running."
              )
            }
          >
            <Square size={18} color="#334155" strokeWidth={2.4} />
            <Text style={styles.outlineButtonText}>Stop Simulation</Text>
          </TouchableOpacity>
        </View>

      
      </ScrollView>
    </SafeAreaView>
  );
};

const PreviewBox = ({
  label,
  value,
  unit,
  icon,
  backgroundColor,
}: {
  label: string;
  value: string;
  unit: string;
  icon: ReactNode;
  backgroundColor: string;
}) => {
  return (
    <View style={[styles.previewBox, { backgroundColor }]}>
      <View style={styles.previewIcon}>{icon}</View>
      <Text style={styles.previewLabel}>{label}</Text>

      <View style={styles.previewValueRow}>
        <Text style={styles.previewValue}>{value}</Text>
        <Text style={styles.previewUnit}>{unit}</Text>
      </View>
    </View>
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
  content: {
    paddingBottom: 34,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#DBEAFE",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  deviceIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  deviceIconConnected: {
    backgroundColor: "#16A34A",
  },
  deviceIconDisconnected: {
    backgroundColor: "#2563EB",
  },
  deviceTextBlock: {
    flex: 1,
  },
  deviceTitle: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "900",
  },
  deviceSubtitle: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
    lineHeight: 19,
  },
  connectedPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  connectedPillActive: {
    backgroundColor: "#DCFCE7",
  },
  connectedPillInactive: {
    backgroundColor: "#E2E8F0",
  },
  connectedText: {
    fontSize: 12,
    fontWeight: "900",
  },
  connectedTextActive: {
    color: "#15803D",
  },
  connectedTextInactive: {
    color: "#475569",
  },
  statusBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 7,
  },
  statusLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    marginRight: 12,
  },
  statusValue: {
    flex: 1,
    color: "#111827",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
  },
  statusValueConnected: {
    color: "#15803D",
  },
  statusValueDisconnected: {
    color: "#DC2626",
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    marginRight: 10,
  },
  statLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
  },
  statValue: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 4,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 18,
  },
  connectButton: {
    backgroundColor: "#2563EB",
  },
  disconnectButton: {
    backgroundColor: "#DC2626",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 10,
  },
  secondarySyncButton: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    marginTop: 12,
  },
  secondarySyncButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  debugButton: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    marginTop: 12,
  },
  debugButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  outlineButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    marginTop: 12,
  },
  outlineButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  debugCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  debugHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  debugTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 8,
  },
  debugMessage: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
    marginBottom: 10,
  },
  errorMessage: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
    marginBottom: 10,
  },
  debugPayloadBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  debugPayloadText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
    lineHeight: 20,
  },
  segmentControl: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    padding: 4,
    marginTop: 20,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  segmentText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: "#111827",
  },
  previewCard: {
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  previewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modePillText: {
    fontSize: 12,
    fontWeight: "900",
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 18,
  },
  previewBox: {
    width: "48%",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.88)",
  },
  previewIcon: {
    marginBottom: 10,
  },
  previewLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  previewValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  previewValue: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    marginRight: 4,
  },
  previewUnit: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },
  infoCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 21,
    marginLeft: 10,
  },
});