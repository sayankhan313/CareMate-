import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  type CompositeScreenProps,
} from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import {
  Activity as ActivityIcon,
  AlertCircle,
  Bluetooth,
  CheckCircle2,
  Droplet,
  HeartPulse,
  RefreshCw,
  Thermometer,
} from "lucide-react-native";

import { vitalsApi } from "../../services/vitalsApi";
import { useHealthConnectDevice } from "../../context/HealthConnectDeviceContext";
import type {
  PatientTabParamList,
  RootStackParamList,
} from "../../types/navigation";
import type { VitalReading, VitalStatus } from "../../types/vitals";

type VitalsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<PatientTabParamList, "Vitals">,
  NativeStackScreenProps<RootStackParamList>
>;

type LoadMode = "initial" | "refresh" | "silent";

type TrendMetricKey =
  | "heartRate"
  | "spo2"
  | "bpSystolic"
  | "glucose"
  | "temperature";

type TrendMetricOption = {
  key: TrendMetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  color: string;
  softColor: string;
};

const CHART_WIDTH = 330;
const CHART_HEIGHT = 210;
const CHART_PADDING_LEFT = 38;
const CHART_PADDING_RIGHT = 20;
const CHART_PADDING_TOP = 24;
const CHART_PADDING_BOTTOM = 34;

const TREND_METRICS: TrendMetricOption[] = [
  {
    key: "heartRate",
    label: "Heart Rate",
    shortLabel: "HR",
    unit: "bpm",
    color: "#DC2626",
    softColor: "#FEE2E2",
  },
  {
    key: "spo2",
    label: "SpO2",
    shortLabel: "SpO2",
    unit: "%",
    color: "#2563EB",
    softColor: "#DBEAFE",
  },
  {
    key: "bpSystolic",
    label: "Blood Pressure",
    shortLabel: "BP",
    unit: "mmHg",
    color: "#9333EA",
    softColor: "#F3E8FF",
  },
  {
    key: "glucose",
    label: "Glucose",
    shortLabel: "Glucose",
    unit: "mg/dL",
    color: "#F97316",
    softColor: "#FFEDD5",
  },
  {
    key: "temperature",
    label: "Temperature",
    shortLabel: "Temp",
    unit: "°C",
    color: "#0F766E",
    softColor: "#CCFBF1",
  },
];

const getStatusTheme = (status: VitalStatus) => {
  if (status === "STABLE") {
    return {
      background: "#ECFDF5",
      border: "#86EFAC",
      pill: "#DCFCE7",
      text: "#15803D",
      label: "Stable",
    };
  }

  if (status === "WARNING") {
    return {
      background: "#FFF7ED",
      border: "#FDBA74",
      pill: "#FFEDD5",
      text: "#C2410C",
      label: "Warning",
    };
  }

  if (status === "CRITICAL") {
    return {
      background: "#FEF2F2",
      border: "#FCA5A5",
      pill: "#FEE2E2",
      text: "#B91C1C",
      label: "Critical",
    };
  }

  return {
    background: "#EFF6FF",
    border: "#BFDBFE",
    pill: "#DBEAFE",
    text: "#1D4ED8",
    label: "No Data",
  };
};

const formatSource = (source?: string | null) => {
  if (source === "HEALTH_CONNECT") return "Health Connect";
  if (source === "SIMULATED") return "Simulator";
  if (source === "MANUAL") return "Manual";
  return "No source";
};

const formatTime = (value?: string | null) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatShortTime = (value?: string | null) => {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatSyncTime = (value?: string | null) => {
  if (!value) return "Not synced yet";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not synced yet";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatBloodPressure = (reading?: VitalReading | null) => {
  if (
    reading?.bpSystolic !== null &&
    reading?.bpSystolic !== undefined &&
    reading?.bpDiastolic !== null &&
    reading?.bpDiastolic !== undefined
  ) {
    return `${reading.bpSystolic}/${reading.bpDiastolic}`;
  }

  return "--/--";
};

const getReadingStatus = (reading: VitalReading | null): VitalStatus => {
  return reading?.status || "NO_DATA";
};

const getNumberValue = (value?: number | null) => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  return null;
};

const getTrendMetricValue = (
  reading: VitalReading,
  metricKey: TrendMetricKey
) => {
  return getNumberValue(reading[metricKey]);
};

const buildSmoothLinePath = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return "";

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length; index += 1) {
    const previousPoint = points[index - 1];
    const currentPoint = points[index];
    const middleX = (previousPoint.x + currentPoint.x) / 2;

    path += ` C ${middleX} ${previousPoint.y}, ${middleX} ${currentPoint.y}, ${currentPoint.x} ${currentPoint.y}`;
  }

  return path;
};

const buildSmoothAreaPath = (
  points: { x: number; y: number }[],
  bottomY: number
) => {
  if (points.length < 2) return "";

  let path = `M ${points[0].x} ${bottomY} L ${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length; index += 1) {
    const previousPoint = points[index - 1];
    const currentPoint = points[index];
    const middleX = (previousPoint.x + currentPoint.x) / 2;

    path += ` C ${middleX} ${previousPoint.y}, ${middleX} ${currentPoint.y}, ${currentPoint.x} ${currentPoint.y}`;
  }

  const lastPoint = points[points.length - 1];

  path += ` L ${lastPoint.x} ${bottomY} Z`;

  return path;
};

const buildTrendChartData = (
  readings: VitalReading[],
  selectedMetric: TrendMetricOption
) => {
  const chartReadings = readings.slice(0, 8).reverse();

  const validReadings = chartReadings
    .map((reading, index) => {
      const value = getTrendMetricValue(reading, selectedMetric.key);

      if (value === null) return null;

      return {
        reading,
        index,
        value,
      };
    })
    .filter(
      (
        item
      ): item is {
        reading: VitalReading;
        index: number;
        value: number;
      } => item !== null
    );

  if (validReadings.length === 0) {
    return {
      chartReadings,
      points: [],
      minValue: 0,
      maxValue: 0,
      actualMinValue: 0,
      actualMaxValue: 0,
      avgValue: 0,
      latestValue: null as number | null,
      linePath: "",
      areaPath: "",
    };
  }

  const values = validReadings.map((item) => item.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const avgValue =
    values.reduce((total, value) => total + value, 0) / values.length;

  const padding =
    selectedMetric.key === "temperature"
      ? 0.5
      : Math.max((rawMax - rawMin) * 0.18, 5);

  const minValue = Math.max(0, rawMin - padding);
  const maxValue = rawMax + padding;
  const range = Math.max(maxValue - minValue, 1);

  const chartLeft = CHART_PADDING_LEFT;
  const chartRight = CHART_WIDTH - CHART_PADDING_RIGHT;
  const chartTop = CHART_PADDING_TOP;
  const chartBottom = CHART_HEIGHT - CHART_PADDING_BOTTOM;

  const getX = (originalIndex: number) => {
    if (chartReadings.length === 1) {
      return (chartLeft + chartRight) / 2;
    }

    return (
      chartLeft +
      (originalIndex / (chartReadings.length - 1)) * (chartRight - chartLeft)
    );
  };

  const getY = (value: number) => {
    return chartBottom - ((value - minValue) / range) * (chartBottom - chartTop);
  };

  const points = validReadings.map((item) => ({
    x: getX(item.index),
    y: getY(item.value),
    value: item.value,
    reading: item.reading,
  }));

  const linePath = buildSmoothLinePath(points);
  const areaPath = buildSmoothAreaPath(points, chartBottom);

  return {
    chartReadings,
    points,
    minValue,
    maxValue,
    actualMinValue: rawMin,
    actualMaxValue: rawMax,
    avgValue,
    latestValue: values[values.length - 1],
    linePath,
    areaPath,
  };
};

const formatTrendNumber = (value: number, metricKey: TrendMetricKey) => {
  if (metricKey === "temperature") {
    return value.toFixed(1);
  }

  return `${Math.round(value)}`;
};

export const VitalsScreen = ({ navigation }: VitalsScreenProps) => {
  const [latestReading, setLatestReading] = useState<VitalReading | null>(null);
  const [history, setHistory] = useState<VitalReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedMetricKey, setSelectedMetricKey] =
    useState<TrendMetricKey>("heartRate");

  const {
    isHealthConnectConnected,
    isHealthConnectSyncing,
    connectedDeviceName,
    lastSyncAt,
    lastSyncStatus,
    lastSyncError,
  } = useHealthConnectDevice();

  const loadVitals = useCallback(async (mode: LoadMode = "initial") => {
    try {
      if (mode === "initial") {
        setIsLoading(true);
      }

      if (mode === "refresh") {
        setIsRefreshing(true);
      }

      setErrorMessage("");

      const [latest, readings] = await Promise.all([
        vitalsApi.getLatestReading(),
        vitalsApi.getReadingHistory(10),
      ]);

      setLatestReading(latest);
      setHistory(readings);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load vitals.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVitals("initial");
    }, [loadVitals])
  );

  useEffect(() => {
    if (lastSyncAt) {
      loadVitals("silent");
    }
  }, [lastSyncAt, loadVitals]);

  const openConnectedDevice = () => {
    const rootNavigation =
      navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

    rootNavigation?.navigate("ConnectedDevice");
  };

  const status = getReadingStatus(latestReading);
  const statusTheme = getStatusTheme(status);

  const graphReadings = useMemo(() => {
    if (history.length > 0) {
      return history;
    }

    if (latestReading) {
      return [latestReading];
    }

    return [];
  }, [history, latestReading]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor="#2563EB" barStyle="light-content" />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadVitals("refresh")}
          />
        }
      >
        <LinearGradient
          colors={["#3B82F6", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Vitals</Text>
            <Text style={styles.headerSubtitle}>
              Health readings, trends and connected source
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.85}
            onPress={openConnectedDevice}
          >
            <Bluetooth size={22} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </LinearGradient>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.loadingText}>Loading vitals...</Text>
          </View>
        ) : null}

        {!isLoading && errorMessage ? (
          <View style={styles.errorCard}>
            <AlertCircle size={26} color="#DC2626" />
            <Text style={styles.errorTitle}>Vitals unavailable</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.85}
              onPress={() => loadVitals("initial")}
            >
              <RefreshCw size={18} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!isLoading && !errorMessage ? (
          <>
            <View
              style={[
                styles.statusCard,
                {
                  backgroundColor: statusTheme.background,
                  borderColor: statusTheme.border,
                },
              ]}
            >
              <View style={styles.statusHeaderRow}>
                <View style={styles.statusHeaderText}>
                  <Text style={styles.statusTitle}>Overall Status</Text>
                  <Text style={styles.statusSubtitle}>
                    Last updated {formatTime(latestReading?.recordedAt)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: statusTheme.pill,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color: statusTheme.text,
                      },
                    ]}
                  >
                    {statusTheme.label}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <VitalMetricCard
                  icon={<HeartPulse size={24} color="#DC2626" />}
                  label="Heart Rate"
                  value={
                    latestReading?.heartRate !== null &&
                    latestReading?.heartRate !== undefined
                      ? `${latestReading.heartRate}`
                      : "--"
                  }
                  unit="bpm"
                />

                <VitalMetricCard
                  icon={<ActivityIcon size={24} color="#2563EB" />}
                  label="SpO2"
                  value={
                    latestReading?.spo2 !== null &&
                    latestReading?.spo2 !== undefined
                      ? `${latestReading.spo2}`
                      : "--"
                  }
                  unit="%"
                />

                <VitalMetricCard
                  icon={<ActivityIcon size={24} color="#9333EA" />}
                  label="Blood Pressure"
                  value={formatBloodPressure(latestReading)}
                  unit="mmHg"
                />

                <VitalMetricCard
                  icon={<Droplet size={24} color="#F97316" />}
                  label="Glucose"
                  value={
                    latestReading?.glucose !== null &&
                    latestReading?.glucose !== undefined
                      ? `${latestReading.glucose}`
                      : "--"
                  }
                  unit="mg/dL"
                />
              </View>

              <View style={styles.temperatureRow}>
                <Thermometer size={20} color="#0F766E" />
                <Text style={styles.temperatureText}>
                  Temperature:{" "}
                  {latestReading?.temperature !== null &&
                  latestReading?.temperature !== undefined
                    ? `${latestReading.temperature}°C`
                    : "-- °C"}
                </Text>
              </View>

              <View style={styles.sourceRow}>
                <Text style={styles.sourceText}>
                  Source: {formatSource(latestReading?.source)}
                </Text>
                <Text style={styles.sourceText}>
                  Device: {latestReading?.deviceSource || "No device source"}
                </Text>
              </View>
            </View>

            <VitalsTrendChart
              readings={graphReadings}
              selectedMetricKey={selectedMetricKey}
              onChangeMetric={setSelectedMetricKey}
            />

            <TouchableOpacity
              style={styles.connectedDeviceCard}
              activeOpacity={0.85}
              onPress={openConnectedDevice}
            >
              <View
                style={[
                  styles.connectedIconCircle,
                  isHealthConnectConnected
                    ? styles.connectedIconCircleActive
                    : styles.connectedIconCircleInactive,
                ]}
              >
                {isHealthConnectConnected ? (
                  <CheckCircle2 size={26} color="#16A34A" strokeWidth={2.5} />
                ) : (
                  <Bluetooth size={26} color="#2563EB" strokeWidth={2.5} />
                )}
              </View>

              <View style={styles.connectedTextBlock}>
                <View style={styles.connectedTitleRow}>
                  <Text style={styles.connectedTitle}>Connected Device</Text>

                  <View
                    style={[
                      styles.devicePill,
                      isHealthConnectConnected
                        ? styles.devicePillActive
                        : styles.devicePillInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.devicePillText,
                        isHealthConnectConnected
                          ? styles.devicePillTextActive
                          : styles.devicePillTextInactive,
                      ]}
                    >
                      {isHealthConnectConnected ? "Connected" : "Off"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.connectedSubtitle}>
                  {isHealthConnectConnected
                    ? connectedDeviceName
                    : "Connect Health Connect to update vitals automatically"}
                </Text>

                <View style={styles.connectedMetaRow}>
                  <Text style={styles.connectedMetaText}>
                    Auto Sync:{" "}
                    {isHealthConnectConnected
                      ? "Active"
                      : "Off"}
                  </Text>
                  <Text style={styles.connectedMetaText}>
                    Last Sync: {formatSyncTime(lastSyncAt)}
                  </Text>
                  <Text style={styles.connectedMetaText}>
                    Last Status: {lastSyncStatus || "No reading yet"}
                  </Text>
                </View>

                {lastSyncError ? (
                  <Text style={styles.connectedErrorText}>{lastSyncError}</Text>
                ) : null}
              </View>

              <Text style={styles.connectedArrow}>›</Text>
            </TouchableOpacity>

            {isHealthConnectSyncing ? (
              <View style={styles.syncingCard}>
                <ActivityIndicator color="#2563EB" />
                <Text style={styles.syncingText}>
                  Updating latest Health Connect vitals...
                </Text>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Readings</Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => loadVitals("refresh")}
              >
                <RefreshCw size={20} color="#2563EB" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {history.length > 0 ? (
              history.map((reading) => (
                <HistoryCard key={reading.id} reading={reading} />
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No readings yet</Text>
                <Text style={styles.emptyText}>
                  Connect Health Connect or add a simulated reading to start
                  tracking vitals.
                </Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const VitalsTrendChart = ({
  readings,
  selectedMetricKey,
  onChangeMetric,
}: {
  readings: VitalReading[];
  selectedMetricKey: TrendMetricKey;
  onChangeMetric: (metric: TrendMetricKey) => void;
}) => {
  const selectedMetric =
    TREND_METRICS.find((metric) => metric.key === selectedMetricKey) ||
    TREND_METRICS[0];

  const chartData = useMemo(
    () => buildTrendChartData(readings, selectedMetric),
    [readings, selectedMetric]
  );

  const hasChartData = chartData.points.length > 0;
  const chartBottom = CHART_HEIGHT - CHART_PADDING_BOTTOM;
  const chartLeft = CHART_PADDING_LEFT;
  const chartRight = CHART_WIDTH - CHART_PADDING_RIGHT;
  const chartTop = CHART_PADDING_TOP;
  const middleY = (chartTop + chartBottom) / 2;

  const latestPoint =
    chartData.points.length > 0
      ? chartData.points[chartData.points.length - 1]
      : null;

  return (
    <View style={styles.trendCard}>
      <View style={styles.trendHeaderRow}>
        <View style={styles.trendHeaderText}>
          <Text style={styles.trendTitle}>Today&apos;s Trend</Text>
          <Text style={styles.trendSubtitle}>
            Select a vital to view recent changes
          </Text>
        </View>

        {hasChartData && chartData.latestValue !== null ? (
          <View
            style={[
              styles.latestBadge,
              {
                backgroundColor: selectedMetric.softColor,
              },
            ]}
          >
            <Text
              style={[
                styles.latestBadgeLabel,
                {
                  color: selectedMetric.color,
                },
              ]}
            >
              Latest
            </Text>
            <Text
              style={[
                styles.latestBadgeValue,
                {
                  color: selectedMetric.color,
                },
              ]}
            >
              {formatTrendNumber(chartData.latestValue, selectedMetric.key)}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.metricSelectorContent}
      >
        {TREND_METRICS.map((metric) => {
          const isSelected = metric.key === selectedMetricKey;

          return (
            <TouchableOpacity
              key={metric.key}
              activeOpacity={0.85}
              style={[
                styles.metricSelectorChip,
                isSelected
                  ? {
                      backgroundColor: metric.softColor,
                      borderColor: metric.color,
                    }
                  : null,
              ]}
              onPress={() => onChangeMetric(metric.key)}
            >
              <Text
                style={[
                  styles.metricSelectorText,
                  isSelected
                    ? {
                        color: metric.color,
                      }
                    : null,
                ]}
              >
                {metric.shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {hasChartData ? (
        <>
          <View style={styles.chartWrapper}>
            <Svg
              width="100%"
              height={CHART_HEIGHT}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            >
              <Defs>
                <SvgLinearGradient
                  id="trendFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop
                    offset="0%"
                    stopColor={selectedMetric.color}
                    stopOpacity="0.22"
                  />
                  <Stop
                    offset="100%"
                    stopColor={selectedMetric.color}
                    stopOpacity="0.02"
                  />
                </SvgLinearGradient>
              </Defs>

              <Line
                x1={chartLeft}
                y1={chartTop}
                x2={chartRight}
                y2={chartTop}
                stroke="#F1F5F9"
                strokeWidth="1"
              />

              <Line
                x1={chartLeft}
                y1={middleY}
                x2={chartRight}
                y2={middleY}
                stroke="#E2E8F0"
                strokeWidth="1"
              />

              <Line
                x1={chartLeft}
                y1={chartBottom}
                x2={chartRight}
                y2={chartBottom}
                stroke="#E2E8F0"
                strokeWidth="1.5"
              />

              <Line
                x1={chartLeft}
                y1={chartTop}
                x2={chartLeft}
                y2={chartBottom}
                stroke="#E2E8F0"
                strokeWidth="1.5"
              />

              <SvgText
                x={chartLeft - 8}
                y={chartTop + 4}
                fill="#94A3B8"
                fontSize="10"
                textAnchor="end"
              >
                {formatTrendNumber(chartData.maxValue, selectedMetric.key)}
              </SvgText>

              <SvgText
                x={chartLeft - 8}
                y={middleY + 4}
                fill="#94A3B8"
                fontSize="10"
                textAnchor="end"
              >
                {formatTrendNumber(
                  (chartData.maxValue + chartData.minValue) / 2,
                  selectedMetric.key
                )}
              </SvgText>

              <SvgText
                x={chartLeft - 8}
                y={chartBottom + 4}
                fill="#94A3B8"
                fontSize="10"
                textAnchor="end"
              >
                {formatTrendNumber(chartData.minValue, selectedMetric.key)}
              </SvgText>

              {chartData.areaPath ? (
                <Path d={chartData.areaPath} fill="url(#trendFill)" />
              ) : null}

              {chartData.linePath ? (
                <Path
                  d={chartData.linePath}
                  fill="none"
                  stroke={selectedMetric.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {chartData.points.map((point, index) => (
                <Circle
                  key={`${point.reading.id}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="4.5"
                  fill="#FFFFFF"
                  stroke={selectedMetric.color}
                  strokeWidth="3"
                />
              ))}

              {latestPoint ? (
                <>
                  <Circle
                    cx={latestPoint.x}
                    cy={latestPoint.y}
                    r="7"
                    fill={selectedMetric.color}
                    opacity="0.18"
                  />
                  <Circle
                    cx={latestPoint.x}
                    cy={latestPoint.y}
                    r="4.8"
                    fill={selectedMetric.color}
                  />
                </>
              ) : null}

              {chartData.chartReadings.map((reading, index) => {
                if (
                  index !== 0 &&
                  index !== Math.floor(chartData.chartReadings.length / 2) &&
                  index !== chartData.chartReadings.length - 1
                ) {
                  return null;
                }

                const x =
                  chartData.chartReadings.length === 1
                    ? (chartLeft + chartRight) / 2
                    : chartLeft +
                      (index / (chartData.chartReadings.length - 1)) *
                        (chartRight - chartLeft);

                return (
                  <SvgText
                    key={`${reading.id}-label-${index}`}
                    x={x}
                    y={CHART_HEIGHT - 8}
                    fill="#94A3B8"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {formatShortTime(reading.recordedAt)}
                  </SvgText>
                );
              })}
            </Svg>
          </View>

          <View style={styles.trendStatsRow}>
            <TrendStat
              label="Min"
              value={formatTrendNumber(
                chartData.actualMinValue,
                selectedMetric.key
              )}
              unit={selectedMetric.unit}
            />

            <TrendStat
              label="Avg"
              value={formatTrendNumber(chartData.avgValue, selectedMetric.key)}
              unit={selectedMetric.unit}
            />

            <TrendStat
              label="Max"
              value={formatTrendNumber(
                chartData.actualMaxValue,
                selectedMetric.key
              )}
              unit={selectedMetric.unit}
            />
          </View>
        </>
      ) : (
        <View style={styles.noChartCard}>
          <Text style={styles.noChartTitle}>No trend data yet</Text>
          <Text style={styles.noChartText}>
            Connect Health Connect or add readings to show a graph.
          </Text>
        </View>
      )}
    </View>
  );
};

const TrendStat = ({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) => {
  return (
    <View style={styles.trendStatBox}>
      <Text style={styles.trendStatLabel}>{label}</Text>
      <View style={styles.trendStatValueRow}>
        <Text style={styles.trendStatValue}>{value}</Text>
        <Text style={styles.trendStatUnit}>{unit}</Text>
      </View>
    </View>
  );
};

const VitalMetricCard = ({
  icon,
  label,
  value,
  unit,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
}) => {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricLabel}>{label}</Text>

      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricUnit}>{unit}</Text>
      </View>
    </View>
  );
};

const HistoryCard = ({ reading }: { reading: VitalReading }) => {
  const theme = getStatusTheme(reading.status);

  return (
    <View style={styles.historyCard}>
      <View style={styles.historyTopRow}>
        <View style={styles.historyTitleBlock}>
          <Text style={styles.historyTime}>{formatTime(reading.recordedAt)}</Text>
          <Text style={styles.historySource}>
            {formatSource(reading.source)} ·{" "}
            {reading.deviceSource || "No device source"}
          </Text>
        </View>

        <View
          style={[
            styles.historyPill,
            {
              backgroundColor: theme.pill,
            },
          ]}
        >
          <Text
            style={[
              styles.historyPillText,
              {
                color: theme.text,
              },
            ]}
          >
            {theme.label}
          </Text>
        </View>
      </View>

      <View style={styles.historyValuesRow}>
        <Text style={styles.historyValue}>HR {reading.heartRate ?? "--"}</Text>
        <Text style={styles.historyValue}>SpO2 {reading.spo2 ?? "--"}%</Text>
        <Text style={styles.historyValue}>BP {formatBloodPressure(reading)}</Text>
      </View>

      <View style={styles.historyValuesRow}>
        <Text style={styles.historyValue}>
          Glucose {reading.glucose ?? "--"}
        </Text>
        <Text style={styles.historyValue}>
          Temp{" "}
          {reading.temperature !== null && reading.temperature !== undefined
            ? `${reading.temperature}°C`
            : "--"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#2563EB",
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
    justifyContent: "space-between",
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 14,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#DBEAFE",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
  },
  headerButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 22,
    alignItems: "center",
  },
  loadingText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
  },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTitle: {
    color: "#991B1B",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
  },
  errorText: {
    color: "#7F1D1D",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  statusCard: {
    borderRadius: 22,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 18,
    borderWidth: 1,
  },
  statusHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  statusHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  statusTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
  },
  statusSubtitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "900",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.74)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.88)",
  },
  metricIcon: {
    marginBottom: 10,
  },
  metricLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  metricValue: {
    color: "#111827",
    fontSize: 23,
    fontWeight: "900",
    marginRight: 4,
  },
  metricUnit: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 5,
  },
  temperatureRow: {
    backgroundColor: "rgba(255,255,255,0.70)",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  temperatureText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  sourceRow: {
    marginTop: 14,
  },
  sourceText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  trendCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    marginHorizontal: 20,
    marginTop: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  trendHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  trendHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  trendTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
  },
  trendSubtitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    lineHeight: 18,
  },
  latestBadge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 72,
  },
  latestBadgeLabel: {
    fontSize: 10,
    fontWeight: "900",
  },
  latestBadgeValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  metricSelectorContent: {
    paddingBottom: 14,
  },
  metricSelectorChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 9,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.3,
    borderColor: "#E2E8F0",
  },
  metricSelectorText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "900",
  },
  chartWrapper: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  trendStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  trendStatBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  trendStatLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  trendStatValueRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginTop: 5,
  },
  trendStatValue: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
    marginRight: 3,
  },
  trendStatUnit: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "900",
    marginBottom: 3,
  },
  noChartCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  noChartTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },
  noChartText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  connectedDeviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  connectedIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  connectedIconCircleActive: {
    backgroundColor: "#DCFCE7",
  },
  connectedIconCircleInactive: {
    backgroundColor: "#DBEAFE",
  },
  connectedTextBlock: {
    flex: 1,
  },
  connectedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  connectedTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    flex: 1,
  },
  devicePill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginLeft: 8,
  },
  devicePillActive: {
    backgroundColor: "#DCFCE7",
  },
  devicePillInactive: {
    backgroundColor: "#E2E8F0",
  },
  devicePillText: {
    fontSize: 10,
    fontWeight: "900",
  },
  devicePillTextActive: {
    color: "#15803D",
  },
  devicePillTextInactive: {
    color: "#475569",
  },
  connectedSubtitle: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 6,
  },
  connectedMetaRow: {
    marginTop: 8,
  },
  connectedMetaText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  connectedErrorText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 6,
    lineHeight: 16,
  },
  connectedArrow: {
    color: "#94A3B8",
    fontSize: 34,
    fontWeight: "300",
    marginLeft: 8,
  },
  syncingCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  syncingText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 10,
  },
  sectionHeader: {
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  historyTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  historyTime: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
  },
  historySource: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    lineHeight: 17,
  },
  historyPill: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  historyPillText: {
    fontSize: 11,
    fontWeight: "900",
  },
  historyValuesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  historyValue: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginHorizontal: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
});