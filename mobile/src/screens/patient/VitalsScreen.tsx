import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
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
  ChevronRight,
  Droplet,
  HeartPulse,
  RefreshCw,
  SlidersHorizontal,
  Thermometer,
} from "lucide-react-native";

import { useLanguage } from "../../context/LanguageContext";
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
  "heartRate" | "spo2" | "bpSystolic" | "glucose" | "temperature";

type TrendMetricOption = {
  key: TrendMetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  color: string;
  softColor: string;
};

type VitalBarData = {
  key: string;
  label: string;
  displayValue: string;
  unit: string;
  percentage: number;
  color: string;
  status: VitalStatus;
  hasData: boolean;
};

const BACKGROUND = "#F2F3F8";
const SURFACE = "#FFFFFF";
const SURFACE_VARIANT = "#E7E9F2";
const TEXT = "#1B1D2A";
const MUTED = "#5F6270";
const SOFT_PANEL = "#F3F4FA";
const PRIMARY = "#4C6FE0";
const PRIMARY_CONTAINER = "#E1E7FF";
const ON_PRIMARY_CONTAINER = "#0C2A8C";
const PRIMARY_LIGHT = PRIMARY_CONTAINER;

const SUCCESS = "#3A9D75";
const SUCCESS_CONTAINER = "#DBF3E7";
const ON_SUCCESS_CONTAINER = "#0F5C3C";
const SUCCESS_LIGHT = SUCCESS_CONTAINER;

const WARNING = "#C77A1F";
const WARNING_CONTAINER = "#FBE7CD";
const ON_WARNING_CONTAINER = "#7A4708";
const WARNING_LIGHT = WARNING_CONTAINER;

const DANGER = "#C6404A";
const DANGER_CONTAINER = "#FBDADC";
const ON_DANGER_CONTAINER = "#8C1D24";
const DANGER_LIGHT = DANGER_CONTAINER;

const TEAL = "#0F766E";
const TEAL_LIGHT = "#DDF3F0";

const INDIGO = "#5A55B8";
const INDIGO_LIGHT = "#E8E7F8";

const CHART_WIDTH = 330;
const CHART_HEIGHT = 210;
const CHART_PADDING_LEFT = 38;
const CHART_PADDING_RIGHT = 20;
const CHART_PADDING_TOP = 24;
const CHART_PADDING_BOTTOM = 34;

const BAR_MAX_HEIGHT = 128;

const TREND_METRICS: TrendMetricOption[] = [
  {
    key: "heartRate",
    label: "Heart Rate",
    shortLabel: "Heart",
    unit: "bpm",
    color: DANGER,
    softColor: DANGER_LIGHT,
  },
  {
    key: "spo2",
    label: "SpO₂",
    shortLabel: "SpO₂",
    unit: "%",
    color: PRIMARY,
    softColor: PRIMARY_LIGHT,
  },
  {
    key: "bpSystolic",
    label: "Blood Pressure",
    shortLabel: "BP",
    unit: "mmHg",
    color: INDIGO,
    softColor: INDIGO_LIGHT,
  },
  {
    key: "glucose",
    label: "Glucose",
    shortLabel: "Sugar",
    unit: "mg/dL",
    color: WARNING,
    softColor: WARNING_LIGHT,
  },
  {
    key: "temperature",
    label: "Temperature",
    shortLabel: "Temp",
    unit: "°C",
    color: TEAL,
    softColor: TEAL_LIGHT,
  },
];

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const getPercentage = (
  value: number | null,
  minimum: number,
  maximum: number,
) => {
  if (value === null) {
    return 12;
  }

  const percentage = ((value - minimum) / (maximum - minimum)) * 100;

  return clamp(percentage, 18, 100);
};

type Translate = ReturnType<typeof useLanguage>["t"];

const getStatusTheme = (status: VitalStatus, t: Translate) => {
  if (status === "STABLE") return { badgeBackground: SUCCESS_CONTAINER, text: ON_SUCCESS_CONTAINER, dot: SUCCESS, label: t("vitals.statusStable"), title: t("vitals.titleStable"), flowLabel: t("vitals.flowGood") };
  if (status === "WARNING") return { badgeBackground: WARNING_CONTAINER, text: ON_WARNING_CONTAINER, dot: WARNING, label: t("vitals.statusWarning"), title: t("vitals.titleWarning"), flowLabel: t("vitals.flowCheck") };
  if (status === "CRITICAL") return { badgeBackground: DANGER_CONTAINER, text: ON_DANGER_CONTAINER, dot: DANGER, label: t("vitals.statusCritical"), title: t("vitals.titleCritical"), flowLabel: t("vitals.flowUrgent") };
  return { badgeBackground: PRIMARY_CONTAINER, text: ON_PRIMARY_CONTAINER, dot: PRIMARY, label: t("vitals.statusNoData"), title: t("vitals.titleNoData"), flowLabel: t("vitals.flowNone") };
};

const formatSource = (source: string | null | undefined, t: Translate) => {
  if (source === "HEALTH_CONNECT") return t("dashboard.healthConnect");
  if (source === "SIMULATED") return t("dashboard.simulator");
  if (source === "MANUAL") return t("dashboard.manualEntry");
  return t("common.noSource");
};

const formatTime = (value: string | null | undefined, t: Translate, locale: string) => {
  if (!value) return t("vitals.notAvailable");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("vitals.notAvailable");
  return date.toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const formatShortTime = (value: string | null | undefined, locale: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
};

const formatSyncTime = (value: string | null | undefined, t: Translate, locale: string) => {
  if (!value) return t("vitals.notSynced");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("vitals.notSynced");
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const getMetricLabel = (metricKey: TrendMetricKey, t: Translate, short = false) => {
  if (metricKey === "heartRate") return t(short ? "vitals.metricHeart" : "vitals.metricHeartRate");
  if (metricKey === "spo2") return "SpO₂";
  if (metricKey === "bpSystolic") return short ? "BP" : t("vitals.metricBloodPressure");
  if (metricKey === "glucose") return t(short ? "vitals.metricSugar" : "vitals.metricGlucose");
  return t(short ? "vitals.metricTemp" : "vitals.metricTemperature");
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

const getVitalBarColor = (status: VitalStatus) => {
  if (status === "CRITICAL") {
    return DANGER;
  }

  if (status === "WARNING") {
    return WARNING;
  }

  if (status === "NO_DATA") {
    return "#CBD0DB";
  }

  return PRIMARY;
};

const getIndividualVitalStatus = (
  key: "heartRate" | "spo2" | "bp" | "glucose" | "temperature",
  primaryValue: number | null,
  secondaryValue: number | null = null,
): VitalStatus => {
  if (primaryValue === null && secondaryValue === null) {
    return "NO_DATA";
  }

  if (key === "heartRate" && primaryValue !== null) {
    if (primaryValue < 40 || primaryValue >= 130) {
      return "CRITICAL";
    }

    if (primaryValue < 50 || primaryValue > 110) {
      return "WARNING";
    }
  }

  if (key === "spo2" && primaryValue !== null) {
    if (primaryValue < 90) {
      return "CRITICAL";
    }

    if (primaryValue < 94) {
      return "WARNING";
    }
  }

  if (key === "bp") {
    const isCritical =
      (primaryValue !== null && primaryValue >= 180) ||
      (secondaryValue !== null && secondaryValue >= 120);

    if (isCritical) {
      return "CRITICAL";
    }

    const isWarning =
      (primaryValue !== null && primaryValue >= 140) ||
      (secondaryValue !== null && secondaryValue >= 90);

    if (isWarning) {
      return "WARNING";
    }
  }

  if (key === "glucose" && primaryValue !== null) {
    if (primaryValue < 54 || primaryValue >= 250) {
      return "CRITICAL";
    }

    if (primaryValue < 70 || primaryValue >= 180) {
      return "WARNING";
    }
  }

  if (key === "temperature" && primaryValue !== null) {
    if (primaryValue >= 39) {
      return "CRITICAL";
    }

    if (primaryValue >= 37.8) {
      return "WARNING";
    }
  }

  return "STABLE";
};

const getLatestVitalBars = (reading: VitalReading | null, t: Translate): VitalBarData[] => {
  const heartRate = getNumberValue(reading?.heartRate);
  const spo2 = getNumberValue(reading?.spo2);
  const bpSystolic = getNumberValue(reading?.bpSystolic);
  const bpDiastolic = getNumberValue(reading?.bpDiastolic);
  const glucose = getNumberValue(reading?.glucose);
  const temperature = getNumberValue(reading?.temperature);

  const heartRateStatus = getIndividualVitalStatus("heartRate", heartRate);
  const spo2Status = getIndividualVitalStatus("spo2", spo2);
  const bloodPressureStatus = getIndividualVitalStatus(
    "bp",
    bpSystolic,
    bpDiastolic,
  );
  const glucoseStatus = getIndividualVitalStatus("glucose", glucose);
  const temperatureStatus = getIndividualVitalStatus(
    "temperature",
    temperature,
  );

  return [
    {
      key: "heartRate",
      label: t("vitals.metricHeart"),
      displayValue: heartRate === null ? "--" : `${heartRate}`,
      unit: "bpm",
      percentage: getPercentage(heartRate, 50, 150),
      color: getVitalBarColor(heartRateStatus),
      status: heartRateStatus,
      hasData: heartRate !== null,
    },
    {
      key: "spo2",
      label: "SpO₂",
      displayValue: spo2 === null ? "--" : `${spo2}`,
      unit: "%",
      percentage: getPercentage(spo2, 85, 100),
      color: getVitalBarColor(spo2Status),
      status: spo2Status,
      hasData: spo2 !== null,
    },
    {
      key: "bp",
      label: "BP",
      displayValue: formatBloodPressure(reading),
      unit: "mmHg",
      percentage: getPercentage(bpSystolic ?? bpDiastolic, 90, 180),
      color: getVitalBarColor(bloodPressureStatus),
      status: bloodPressureStatus,
      hasData: bpSystolic !== null || bpDiastolic !== null,
    },
    {
      key: "glucose",
      label: t("vitals.metricSugar"),
      displayValue: glucose === null ? "--" : `${glucose}`,
      unit: "mg/dL",
      percentage: getPercentage(glucose, 60, 220),
      color: getVitalBarColor(glucoseStatus),
      status: glucoseStatus,
      hasData: glucose !== null,
    },
    {
      key: "temperature",
      label: t("vitals.metricTemp"),
      displayValue: temperature === null ? "--" : `${temperature}`,
      unit: "°C",
      percentage: getPercentage(temperature, 35, 40),
      color: getVitalBarColor(temperatureStatus),
      status: temperatureStatus,
      hasData: temperature !== null,
    },
  ];
};

const getTrendMetricValue = (
  reading: VitalReading,
  metricKey: TrendMetricKey,
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
  bottomY: number,
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
  selectedMetric: TrendMetricOption,
) => {
  const chartReadings = readings.slice(0, 8).reverse();

  const validReadings = chartReadings
    .map((reading, index) => {
      const value = getTrendMetricValue(reading, selectedMetric.key);

      if (value === null) {
        return null;
      }

      return {
        reading,
        index,
        value,
      };
    })
    .filter(
      (
        item,
      ): item is {
        reading: VitalReading;
        index: number;
        value: number;
      } => item !== null,
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
    return (
      chartBottom - ((value - minValue) / range) * (chartBottom - chartTop)
    );
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

const getMetricShortcutIcon = (metricKey: TrendMetricKey) => {
  if (metricKey === "heartRate") {
    return <HeartPulse size={23} color={TEXT} strokeWidth={2.4} />;
  }

  if (metricKey === "spo2") {
    return <ActivityIcon size={23} color={TEXT} strokeWidth={2.4} />;
  }

  if (metricKey === "bpSystolic") {
    return <ActivityIcon size={23} color={TEXT} strokeWidth={2.4} />;
  }

  if (metricKey === "glucose") {
    return <Droplet size={23} color={TEXT} strokeWidth={2.4} />;
  }

  return <Thermometer size={23} color={TEXT} strokeWidth={2.4} />;
};

export const VitalsScreen = ({ navigation }: VitalsScreenProps) => {
  const insets = useSafeAreaInsets();
  const { t, locale } = useLanguage();

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
        error instanceof Error ? error.message : t("vitals.unableLoad");

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      loadVitals("initial");
    }, [loadVitals]),
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
  const statusTheme = getStatusTheme(status, t);

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
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <View>
            <Text style={styles.appBarTitle}>{t("vitals.title")}</Text>
            <Text style={styles.appBarSubtitle}>{t("vitals.subtitle")}</Text>
          </View>

          <TouchableOpacity
            style={styles.deviceButton}
            activeOpacity={0.72}
            onPress={openConnectedDevice}
          >
            <Bluetooth size={27} color={PRIMARY} strokeWidth={2.6} />

            {isHealthConnectConnected ? (
              <View style={styles.deviceConnectedDot} />
            ) : null}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: Math.max(36, insets.bottom + 112),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadVitals("refresh")}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        >
          {isLoading ? (
            <View style={styles.statePanel}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>{t("vitals.loadingTitle")}</Text>
              <Text style={styles.stateText}>{t("vitals.loadingText")}</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorPanel}>
              <View style={styles.errorIconCircle}>
                <AlertCircle size={26} color={DANGER} strokeWidth={2.6} />
              </View>

              <Text style={styles.errorTitle}>{t("vitals.unavailable")}</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                activeOpacity={0.85}
                onPress={() => loadVitals("initial")}
              >
                <RefreshCw size={18} color={SURFACE} strokeWidth={2.5} />
                <Text style={styles.retryButtonText}>{t("common.tryAgain")}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <View style={styles.featureCard}>
                <View style={styles.featureTopRow}>
                  <View style={styles.featureTextBlock}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: statusTheme.badgeBackground,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: statusTheme.dot,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: statusTheme.text,
                          },
                        ]}
                      >
                        {statusTheme.label}
                      </Text>
                    </View>

                    <Text style={styles.featureTitle}>{statusTheme.title}</Text>
                    <Text style={styles.featureSubtitle}>
                      {formatTime(latestReading?.recordedAt, t, locale)}
                    </Text>
                  </View>

                  <View style={styles.featureIconBox}>
                    <HeartPulse size={29} color={PRIMARY} strokeWidth={2.7} />
                  </View>
                </View>

                <VitalBarGraph
                  reading={latestReading}
                  flowLabel={statusTheme.flowLabel}
                />
              </View>

              <View style={styles.whitePanel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>{t("vitals.readingSource")}</Text>
                  <Text style={styles.panelAction}>
                    {formatSource(latestReading?.source, t)}
                  </Text>
                </View>

                <InfoRow
                  label={t("vitals.source")}
                  value={formatSource(latestReading?.source, t)}
                />

                <InfoRow
                  label={t("vitals.device")}
                  value={latestReading?.deviceSource || t("vitals.noDeviceSource")}
                />

                <InfoRow
                  label={t("vitals.recorded")}
                  value={formatTime(latestReading?.recordedAt, t, locale)}
                  isLast
                />
              </View>

              <VitalsTrendChart
                readings={graphReadings}
                selectedMetricKey={selectedMetricKey}
                onChangeMetric={setSelectedMetricKey}
              />

              <TouchableOpacity
                style={styles.connectedRow}
                activeOpacity={0.85}
                onPress={openConnectedDevice}
              >
                <View
                  style={[
                    styles.connectedIcon,
                    {
                      backgroundColor: isHealthConnectConnected
                        ? SUCCESS_LIGHT
                        : PRIMARY_LIGHT,
                    },
                  ]}
                >
                  {isHealthConnectConnected ? (
                    <CheckCircle2 size={24} color={SUCCESS} strokeWidth={2.6} />
                  ) : (
                    <Bluetooth size={24} color={PRIMARY} strokeWidth={2.6} />
                  )}
                </View>

                <View style={styles.connectedTextBlock}>
                  <View style={styles.connectedTitleRow}>
                    <Text style={styles.connectedTitle}>{t("vitals.connectedDevice")}</Text>

                    <View
                      style={[
                        styles.deviceStatusBadge,
                        {
                          backgroundColor: isHealthConnectConnected
                            ? SUCCESS_LIGHT
                            : SOFT_PANEL,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.deviceStatusText,
                          {
                            color: isHealthConnectConnected ? "#167A58" : MUTED,
                          },
                        ]}
                      >
                        {isHealthConnectConnected ? t("common.connected") : t("common.off")}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.connectedSubtitle}>
                    {isHealthConnectConnected
                      ? connectedDeviceName
                      : t("vitals.connectPrompt")}
                  </Text>

                  <Text style={styles.connectedMeta}>{t("vitals.lastSync", { time: formatSyncTime(lastSyncAt, t, locale) })}</Text>

                  <Text style={styles.connectedMeta}>{t("vitals.lastStatus", { status: lastSyncStatus || t("vitals.noReadingYet") })}</Text>

                  {lastSyncError ? (
                    <Text style={styles.connectedError}>{lastSyncError}</Text>
                  ) : null}
                </View>

                <ChevronRight size={22} color={MUTED} strokeWidth={2.6} />
              </TouchableOpacity>

              {isHealthConnectSyncing ? (
                <View style={styles.syncingPanel}>
                  <ActivityIndicator color={PRIMARY} />
                  <Text style={styles.syncingText}>{t("vitals.syncing")}</Text>
                </View>
              ) : null}

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>{t("vitals.recentReadings")}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {history.length === 1
                      ? t("vitals.oneSavedReading")
                      : history.length > 1
                        ? t("vitals.manySavedReadings", { count: history.length })
                        : t("vitals.noSavedReadings")}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.refreshSmallButton}
                  activeOpacity={0.85}
                  onPress={() => loadVitals("refresh")}
                >
                  <RefreshCw size={19} color={PRIMARY} strokeWidth={2.6} />
                </TouchableOpacity>
              </View>

              {history.length > 0 ? (
                <View style={styles.historyPanel}>
                  {history.map((reading, index) => (
                    <HistoryRow
                      key={reading.id}
                      reading={reading}
                      isLast={index === history.length - 1}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyPanel}>
                  <Text style={styles.emptyTitle}>{t("vitals.noReadingsTitle")}</Text>
                  <Text style={styles.emptyText}>{t("vitals.noReadingsText")}</Text>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const VitalBarGraph = ({
  reading,
  flowLabel,
}: {
  reading: VitalReading | null;
  flowLabel: string;
}) => {
  const { t } = useLanguage();
  const bars = useMemo(() => getLatestVitalBars(reading, t), [reading, t]);

  return (
    <View style={styles.barGraphPanel}>
      <View style={styles.barGraphHeader}>
        <View>
          <Text style={styles.barGraphTitle}>{t("vitals.healthReadings")}</Text>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={styles.legendSafeDot} />
              <Text style={styles.legendText}>{t("common.stable")}</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={styles.legendWarningDot} />
              <Text style={styles.legendText}>{t("common.warning")}</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={styles.legendCriticalDot} />
              <Text style={styles.legendText}>{t("common.critical")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterButton}>
          <SlidersHorizontal size={20} color={TEXT} strokeWidth={2.2} />
        </View>
      </View>

      <View style={styles.flowPill}>
        <Text style={styles.flowPillText}>{flowLabel}</Text>
      </View>

      <View style={styles.barChartRow}>
        {bars.map((bar) => {
          const barHeight = bar.hasData
            ? Math.max(22, Math.round((bar.percentage / 100) * BAR_MAX_HEIGHT))
            : 16;

          return (
            <View key={bar.key} style={styles.barItem}>
              <Text style={styles.barValueText} numberOfLines={1}>
                {bar.displayValue}
              </Text>

              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: barHeight,
                      backgroundColor: bar.hasData ? bar.color : "#CBD5E1",
                    },
                  ]}
                />
              </View>

              <Text style={styles.barLabel}>{bar.label}</Text>
              <Text style={styles.barUnit}>{bar.unit}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const MetricShortcut = ({
  label,
  icon,
  isSelected,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  isSelected: boolean;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      style={styles.metricShortcut}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View
        style={[
          styles.metricShortcutIcon,
          isSelected ? styles.metricShortcutIconSelected : undefined,
        ]}
      >
        {icon}
      </View>

      <Text
        style={[
          styles.metricShortcutLabel,
          isSelected ? styles.metricShortcutLabelSelected : undefined,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const InfoRow = ({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) => {
  return (
    <View style={[styles.infoRow, isLast ? styles.rowLast : undefined]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
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
  const { t, locale } = useLanguage();
  const selectedMetric =
    TREND_METRICS.find((metric) => metric.key === selectedMetricKey) ||
    TREND_METRICS[0];

  const chartData = useMemo(
    () => buildTrendChartData(readings, selectedMetric),
    [readings, selectedMetric],
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
    <View style={styles.trendPanel}>
      <View style={styles.trendHeader}>
        <View style={styles.trendTitleBlock}>
          <Text style={styles.trendTitle}>{t("vitals.trendTitle")}</Text>
          <Text style={styles.trendSubtitle}>
            {t("vitals.trendSubtitle", { metric: getMetricLabel(selectedMetric.key, t) })}
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
              {t("vitals.latest")}
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
        contentContainerStyle={styles.metricShortcutContentInside}
      >
        {TREND_METRICS.map((metric) => (
          <MetricShortcut
            key={metric.key}
            label={getMetricLabel(metric.key, t, true)}
            icon={getMetricShortcutIcon(metric.key)}
            isSelected={selectedMetricKey === metric.key}
            onPress={() => onChangeMetric(metric.key)}
          />
        ))}
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
                <SvgLinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop
                    offset="0%"
                    stopColor={selectedMetric.color}
                    stopOpacity="0.18"
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
                stroke={SURFACE_VARIANT}
                strokeWidth="1"
              />

              <Line
                x1={chartLeft}
                y1={middleY}
                x2={chartRight}
                y2={middleY}
                stroke={SURFACE_VARIANT}
                strokeWidth="1"
              />

              <Line
                x1={chartLeft}
                y1={chartBottom}
                x2={chartRight}
                y2={chartBottom}
                stroke={SURFACE_VARIANT}
                strokeWidth="1.4"
              />

              <Line
                x1={chartLeft}
                y1={chartTop}
                x2={chartLeft}
                y2={chartBottom}
                stroke={SURFACE_VARIANT}
                strokeWidth="1.4"
              />

              <SvgText
                x={chartLeft - 8}
                y={chartTop + 4}
                fill={MUTED}
                fontSize="10"
                textAnchor="end"
              >
                {formatTrendNumber(chartData.maxValue, selectedMetric.key)}
              </SvgText>

              <SvgText
                x={chartLeft - 8}
                y={middleY + 4}
                fill={MUTED}
                fontSize="10"
                textAnchor="end"
              >
                {formatTrendNumber(
                  (chartData.maxValue + chartData.minValue) / 2,
                  selectedMetric.key,
                )}
              </SvgText>

              <SvgText
                x={chartLeft - 8}
                y={chartBottom + 4}
                fill={MUTED}
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
                  fill={SURFACE}
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
                    opacity="0.16"
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
                    fill={MUTED}
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {formatShortTime(reading.recordedAt, locale)}
                  </SvgText>
                );
              })}
            </Svg>
          </View>

          <View style={styles.trendStatsRow}>
            <TrendStat
              label={t("vitals.min")}
              value={formatTrendNumber(
                chartData.actualMinValue,
                selectedMetric.key,
              )}
              unit={selectedMetric.unit}
            />

            <TrendStat
              label={t("vitals.avg")}
              value={formatTrendNumber(chartData.avgValue, selectedMetric.key)}
              unit={selectedMetric.unit}
            />

            <TrendStat
              label={t("vitals.max")}
              value={formatTrendNumber(
                chartData.actualMaxValue,
                selectedMetric.key,
              )}
              unit={selectedMetric.unit}
            />
          </View>
        </>
      ) : (
        <View style={styles.noChartPanel}>
          <Text style={styles.noChartTitle}>{t("vitals.noTrendTitle")}</Text>
          <Text style={styles.noChartText}>{t("vitals.noTrendText")}</Text>
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

const HistoryRow = ({
  reading,
  isLast,
}: {
  reading: VitalReading;
  isLast: boolean;
}) => {
  const { t, locale } = useLanguage();
  const theme = getStatusTheme(reading.status, t);

  return (
    <View style={[styles.historyRow, isLast ? styles.rowLast : undefined]}>
      <View style={styles.historyTopRow}>
        <View style={styles.historyTitleBlock}>
          <Text style={styles.historyTime}>
            {formatTime(reading.recordedAt, t, locale)}
          </Text>
          <Text style={styles.historySource}>
            {formatSource(reading.source, t)} ·{" "}
            {reading.deviceSource || t("vitals.noDeviceSource")}
          </Text>
        </View>

        <View
          style={[
            styles.historyStatusBadge,
            {
              backgroundColor: theme.badgeBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.historyStatusText,
              {
                color: theme.text,
              },
            ]}
          >
            {theme.label}
          </Text>
        </View>
      </View>

      <View style={styles.historyValues}>
        <Text style={styles.historyValue}>HR {reading.heartRate ?? "--"}</Text>
        <Text style={styles.historyValue}>SpO₂ {reading.spo2 ?? "--"}%</Text>
        <Text style={styles.historyValue}>
          BP {formatBloodPressure(reading)}
        </Text>
        <Text style={styles.historyValue}>
          {t("vitals.metricGlucose")} {reading.glucose ?? "--"}
        </Text>
        <Text style={styles.historyValue}>
          {t("vitals.metricTemp")}{" "}
          {reading.temperature !== null && reading.temperature !== undefined
            ? `${reading.temperature}°C`
            : "--"}
        </Text>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: BACKGROUND,
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 3,
  },
  deviceButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  deviceConnectedDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SUCCESS,
    borderWidth: 1.5,
    borderColor: BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  statePanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
    ...elevate(1),
  },
  stateTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
  },
  stateText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 5,
  },
  errorPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
    ...elevate(1),
  },
  errorIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: DANGER_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    color: ON_DANGER_CONTAINER,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
  },
  errorText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...elevate(1),
  },
  retryButtonText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
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
    paddingRight: 14,
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  barGraphPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 15,
    paddingBottom: 12,
    marginTop: 18,
  },
  barGraphHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  barGraphTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    marginBottom: 3,
  },
  legendSafeDot: {
    width: 9,
    height: 9,
    borderRadius: 3,
    backgroundColor: PRIMARY,
    marginRight: 5,
  },
  legendWarningDot: {
    width: 9,
    height: 9,
    borderRadius: 3,
    backgroundColor: WARNING,
    marginRight: 5,
  },
  legendCriticalDot: {
    width: 9,
    height: 9,
    borderRadius: 3,
    backgroundColor: DANGER,
    marginRight: 5,
  },
  legendText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "500",
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
  },
  flowPill: {
    alignSelf: "center",
    backgroundColor: PRIMARY_CONTAINER,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 10,
  },
  flowPillText: {
    color: ON_PRIMARY_CONTAINER,
    fontSize: 12,
    fontWeight: "700",
  },
  barChartRow: {
    height: 184,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 14,
  },
  barItem: {
    flex: 1,
    alignItems: "center",
  },
  barValueText: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
    maxWidth: 60,
  },
  barTrack: {
    width: 30,
    height: BAR_MAX_HEIGHT,
    borderRadius: 10,
    backgroundColor: PRIMARY_CONTAINER,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 10,
  },
  barLabel: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  barUnit: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "500",
    marginTop: 2,
  },
  whitePanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
    marginBottom: 16,
    ...elevate(1),
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  panelTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },
  panelAction: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "700",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE_VARIANT,
  },
  infoLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
  },
  infoValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
    lineHeight: 18,
  },
  trendPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    ...elevate(1),
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  trendTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  trendTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },
  trendSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    lineHeight: 18,
  },
  latestBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
    minWidth: 68,
  },
  latestBadgeLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  latestBadgeValue: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 2,
  },
  metricShortcutContentInside: {
    paddingBottom: 14,
  },
  metricShortcut: {
    alignItems: "center",
    marginRight: 14,
    width: 68,
  },
  metricShortcutIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
  },
  metricShortcutIconSelected: {
    backgroundColor: PRIMARY_CONTAINER,
    ...elevate(1),
  },
  metricShortcutLabel: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 7,
    textAlign: "center",
  },
  metricShortcutLabelSelected: {
    color: ON_PRIMARY_CONTAINER,
    fontWeight: "700",
  },
  chartWrapper: {
    alignItems: "center",
    backgroundColor: SOFT_PANEL,
    borderRadius: 14,
    paddingTop: 8,
    overflow: "hidden",
  },
  trendStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 11,
  },
  trendStatBox: {
    flex: 1,
    backgroundColor: SOFT_PANEL,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 8,
    marginHorizontal: 3,
  },
  trendStatLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  trendStatValueRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginTop: 5,
  },
  trendStatValue: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    marginRight: 3,
  },
  trendStatUnit: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "500",
    marginBottom: 3,
  },
  noChartPanel: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },
  noChartTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
  },
  noChartText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  connectedRow: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
    ...elevate(1),
  },
  connectedIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  deviceStatusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  deviceStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  connectedSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 5,
  },
  connectedMeta: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },
  connectedError: {
    color: ON_DANGER_CONTAINER,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
    lineHeight: 16,
  },
  syncingPanel: {
    backgroundColor: PRIMARY_CONTAINER,
    borderRadius: 12,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  syncingText: {
    color: ON_PRIMARY_CONTAINER,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 10,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  refreshSmallButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: PRIMARY_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  historyPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    overflow: "hidden",
    ...elevate(1),
  },
  historyRow: {
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE_VARIANT,
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
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },
  historySource: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
    lineHeight: 17,
  },
  historyStatusBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  historyValues: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  historyValue: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: SOFT_PANEL,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 6,
  },
  emptyPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    ...elevate(1),
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
});
