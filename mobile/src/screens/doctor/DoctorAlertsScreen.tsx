import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  HeartPulse,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  Thermometer,
  UserRound,
  Video,
  Waves,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  doctorAlertsApi,
  type DoctorAlertFilterStatus,
  type DoctorAlertVitalReading,
  type DoctorSafetyAlert,
} from "../../services/doctor/doctorAlertsApi";
import { doctorConsultationsApi } from "../../services/doctor/doctorConsultationsApi";
import type { DoctorTabParamList } from "../../types/navigation";

type Props = BottomTabScreenProps<
  DoctorTabParamList,
  "Alerts"
>;

type ActiveAction = {
  alertId: string;
  type: "ACCEPT" | "JOIN" | "RESOLVE";
} | null;

type VitalItem = {
  key: string;
  label: string;
  value: string;
  icon: ReactNode;
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";

const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_DARK = "#134E4A";
const DOCTOR_LIGHT = "#E6FFFA";

const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#F6A545";
const WARNING_DARK = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const FILTERS: {
  label: string;
  value: DoctorAlertFilterStatus;
}[] = [
  {
    label: "All",
    value: "ALL",
  },
  {
    label: "Active",
    value: "ACTIVE",
  },
  {
    label: "Escalated",
    value: "ESCALATED",
  },
  {
    label: "Resolved",
    value: "RESOLVED",
  },
  {
    label: "Cancelled",
    value: "CANCELLED",
  },
];

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: {
    width: 0,
    height: level === 1 ? 2 : 4,
  },
});

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatus = (status: string) => {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
};

const getStatusTone = (status: string) => {
  if (status === "ESCALATED") {
    return {
      background: DANGER_LIGHT,
      text: DANGER_DARK,
      solid: DANGER,
    };
  }

  if (status === "ACTIVE") {
    return {
      background: WARNING_LIGHT,
      text: WARNING_DARK,
      solid: WARNING,
    };
  }

  if (status === "RESOLVED") {
    return {
      background: SUCCESS_LIGHT,
      text: SUCCESS_DARK,
      solid: SUCCESS,
    };
  }

  return {
    background: SOFT_PANEL,
    text: MUTED,
    solid: MUTED,
  };
};

const getVitalStatusTone = (status?: string) => {
  if (status === "CRITICAL") {
    return {
      background: DANGER_LIGHT,
      text: DANGER_DARK,
    };
  }

  if (status === "WARNING") {
    return {
      background: WARNING_LIGHT,
      text: WARNING_DARK,
    };
  }

  return {
    background: SUCCESS_LIGHT,
    text: SUCCESS_DARK,
  };
};

const getVitalItems = (
  vitalReading: DoctorAlertVitalReading | null
): VitalItem[] => {
  if (!vitalReading) {
    return [];
  }

  const items: VitalItem[] = [];

  if (vitalReading.heartRate !== null) {
    items.push({
      key: "heartRate",
      label: "Heart rate",
      value: `${vitalReading.heartRate} bpm`,
      icon: (
        <HeartPulse
          size={18}
          color={DANGER}
          strokeWidth={2.5}
        />
      ),
    });
  }

  if (vitalReading.spo2 !== null) {
    items.push({
      key: "spo2",
      label: "SpO₂",
      value: `${vitalReading.spo2}%`,
      icon: (
        <Waves
          size={18}
          color={DOCTOR_PRIMARY}
          strokeWidth={2.5}
        />
      ),
    });
  }

  if (
    vitalReading.bpSystolic !== null &&
    vitalReading.bpDiastolic !== null
  ) {
    items.push({
      key: "bloodPressure",
      label: "Blood pressure",
      value: `${vitalReading.bpSystolic}/${vitalReading.bpDiastolic} mmHg`,
      icon: (
        <Activity
          size={18}
          color={WARNING}
          strokeWidth={2.5}
        />
      ),
    });
  }

  if (vitalReading.glucose !== null) {
    items.push({
      key: "glucose",
      label: "Glucose",
      value: `${vitalReading.glucose} mmol/L`,
      icon: (
        <Activity
          size={18}
          color={DOCTOR_PRIMARY}
          strokeWidth={2.5}
        />
      ),
    });
  }

  if (vitalReading.temperature !== null) {
    items.push({
      key: "temperature",
      label: "Temperature",
      value: `${vitalReading.temperature}°C`,
      icon: (
        <Thermometer
          size={18}
          color={DANGER}
          strokeWidth={2.5}
        />
      ),
    });
  }

  return items;
};

export const DoctorAlertsScreen = ({
  navigation,
}: Props) => {
  const insets = useSafeAreaInsets();
  const rootNavigation = navigation.getParent<any>();

  const [alerts, setAlerts] = useState<DoctorSafetyAlert[]>([]);

  const [selectedStatus, setSelectedStatus] =
    useState<DoctorAlertFilterStatus>("ALL");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeAction, setActiveAction] =
    useState<ActiveAction>(null);

  const visibleAlerts = useMemo(() => {
    if (selectedStatus === "ALL") {
      return alerts;
    }

    return alerts.filter((alert) => {
      return alert.status === selectedStatus;
    });
  }, [alerts, selectedStatus]);

  const activeCount = useMemo(() => {
    return alerts.filter((alert) => {
      return alert.status === "ACTIVE";
    }).length;
  }, [alerts]);

  const escalatedCount = useMemo(() => {
    return alerts.filter((alert) => {
      return alert.status === "ESCALATED";
    }).length;
  }, [alerts]);

  const resolvedCount = useMemo(() => {
    return alerts.filter((alert) => {
      return alert.status === "RESOLVED";
    }).length;
  }, [alerts]);

  const requiresActionCount = activeCount + escalatedCount;

  const loadAlerts = useCallback(
    async (
      mode: "initial" | "refresh" = "initial"
    ) => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const result =
          await doctorAlertsApi.listAlerts("ALL");

        setAlerts(result.alerts || []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load safety alerts."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadAlerts("initial");
    }, [loadAlerts])
  );

  const refreshAlerts = useCallback(() => {
    void loadAlerts("refresh");
  }, [loadAlerts]);

  const openAlertDetail = (alert: DoctorSafetyAlert) => {
    if (!rootNavigation) {
      Alert.alert(
        "Unable to open alert",
        "Safety alert details are not available right now."
      );
      return;
    }

    rootNavigation.navigate("DoctorAlertDetail", {
      alertId: alert.id,
    });
  };

  const openPatient = (alert: DoctorSafetyAlert) => {
    if (!rootNavigation || !alert.patient) {
      return;
    }

    rootNavigation.navigate("DoctorPatientDetail", {
      patientId: alert.patient.id,
      patientName: alert.patient.fullName,
    });
  };

  const acceptConsultation = async (
    alert: DoctorSafetyAlert
  ) => {
    if (!alert.consultation || activeAction) {
      return;
    }

    try {
      setActiveAction({
        alertId: alert.id,
        type: "ACCEPT",
      });

      await doctorConsultationsApi.acceptConsultation(
        alert.consultation.id
      );

      await loadAlerts("refresh");

      Alert.alert(
        "Consultation accepted",
        "The patient can now join the emergency consultation."
      );
    } catch (error) {
      Alert.alert(
        "Unable to accept consultation",
        error instanceof Error
          ? error.message
          : "Consultation could not be accepted."
      );
    } finally {
      setActiveAction(null);
    }
  };

  const confirmAccept = (alert: DoctorSafetyAlert) => {
    Alert.alert(
      "Accept emergency consultation",
      `Accept the emergency request from ${
        alert.patient?.fullName || "this patient"
      }?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Accept",
          onPress: () => {
            void acceptConsultation(alert);
          },
        },
      ]
    );
  };

  const joinConsultation = async (
    alert: DoctorSafetyAlert
  ) => {
    if (
      !alert.consultation ||
      !rootNavigation ||
      activeAction
    ) {
      return;
    }

    try {
      setActiveAction({
        alertId: alert.id,
        type: "JOIN",
      });

      const result =
        await doctorConsultationsApi.getDoctorJoinConfig(
          alert.consultation.id
        );

      rootNavigation.navigate("VideoConsultation", {
        consultationId: result.consultation.id,
        consultationType: result.consultation.type,
        doctorMeeting: result.doctorMeeting,
        doctorMeetingUrl: result.doctorMeeting.webUrl,
      });

      await loadAlerts("refresh");
    } catch (error) {
      Alert.alert(
        "Unable to join call",
        error instanceof Error
          ? error.message
          : "The emergency call could not be opened."
      );
    } finally {
      setActiveAction(null);
    }
  };

  const resolveAlert = async (
    alert: DoctorSafetyAlert
  ) => {
    if (activeAction) {
      return;
    }

    try {
      setActiveAction({
        alertId: alert.id,
        type: "RESOLVE",
      });

      await doctorAlertsApi.resolveAlert(alert.id);

      await loadAlerts("refresh");

      Alert.alert(
        "Alert resolved",
        "The safety alert has been marked as resolved."
      );
    } catch (error) {
      Alert.alert(
        "Unable to resolve alert",
        error instanceof Error
          ? error.message
          : "The safety alert could not be resolved."
      );
    } finally {
      setActiveAction(null);
    }
  };

  const confirmResolve = (alert: DoctorSafetyAlert) => {
    Alert.alert(
      "Resolve safety alert",
      "Confirm that the emergency workflow has been reviewed and completed.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Resolve",
          onPress: () => {
            void resolveAlert(alert);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <StatusBar
        backgroundColor={BACKGROUND}
        barStyle="dark-content"
      />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <View>
            <Text style={styles.appBarTitle}>
              Safety alerts
            </Text>

            <Text style={styles.appBarSubtitle}>
              Review critical patient events
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            activeOpacity={0.85}
            onPress={refreshAlerts}
          >
            <RefreshCw
              size={20}
              color={DOCTOR_PRIMARY}
              strokeWidth={2.6}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(
                36,
                insets.bottom + 112
              ),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshAlerts}
              tintColor={DANGER}
              colors={[DANGER]}
            />
          }
        >
          <View style={styles.summaryCard}>
            <ShieldAlert
              size={150}
              color={SURFACE}
              strokeWidth={1.2}
              style={styles.summaryWatermark}
            />

            <View style={styles.summaryBadgeRow}>
              <View style={styles.summaryBadge}>
                <View style={styles.summaryBadgeDot} />

                <Text style={styles.summaryBadgeText}>
                  SAFETY RESPONSE
                </Text>
              </View>

              <View style={styles.summaryActionBadge}>
                <AlertTriangle
                  size={13}
                  color={SURFACE}
                  strokeWidth={2.7}
                />

                <Text style={styles.summaryActionText}>
                  {requiresActionCount} need action
                </Text>
              </View>
            </View>

            <View style={styles.summaryTopRow}>
              <View style={styles.summaryIconOuter}>
                <View style={styles.summaryIcon}>
                  <ShieldAlert
                    size={27}
                    color={DANGER}
                    strokeWidth={2.8}
                  />
                </View>
              </View>

              <View style={styles.summaryTextBlock}>
                <Text style={styles.summaryTitle}>
                  Clinical safety response
                </Text>

                <Text style={styles.summaryText}>
                  Critical alerts from your actively
                  assigned patients requiring clinical
                  review.
                </Text>
              </View>
            </View>

            <View style={styles.summaryStats}>
              <SummaryStat
                value={activeCount}
                label="Active"
                tone={WARNING}
              />

              <SummaryStat
                value={escalatedCount}
                label="Escalated"
                tone={DANGER_DARK}
              />

              <SummaryStat
                value={resolvedCount}
                label="Resolved"
                tone={SUCCESS}
              />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {FILTERS.map((filter) => {
              const isSelected =
                selectedStatus === filter.value;

              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    isSelected
                      ? styles.filterChipSelected
                      : undefined,
                  ]}
                  activeOpacity={0.84}
                  onPress={() => {
                    setSelectedStatus(filter.value);
                  }}
                >
                  {isSelected ? (
                    <CheckCircle2
                      size={14}
                      color={DOCTOR_DARK}
                      strokeWidth={2.5}
                    />
                  ) : null}

                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected
                        ? styles.filterChipTextSelected
                        : undefined,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <AlertTriangle
                size={22}
                color={DANGER}
                strokeWidth={2.7}
              />

              <View style={styles.errorTextBlock}>
                <Text style={styles.errorTitle}>
                  Unable to load alerts
                </Text>

                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Patient alerts
              </Text>

              <Text style={styles.sectionSubtitle}>
                {visibleAlerts.length === 1
                  ? "1 alert"
                  : `${visibleAlerts.length} alerts`}
              </Text>
            </View>

            <View style={styles.sectionIcon}>
              <AlertTriangle
                size={20}
                color={DANGER}
                strokeWidth={2.6}
              />
            </View>
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator
                color={DOCTOR_PRIMARY}
              />

              <Text style={styles.stateTitle}>
                Loading safety alerts...
              </Text>
            </View>
          ) : visibleAlerts.length === 0 ? (
            <View style={styles.stateCard}>
              <View style={styles.emptyIcon}>
                <ShieldAlert
                  size={28}
                  color={DOCTOR_PRIMARY}
                  strokeWidth={2.6}
                />
              </View>

              <Text style={styles.stateTitle}>
                No safety alerts
              </Text>

              <Text style={styles.stateText}>
                Critical alerts from your assigned
                patients will appear here.
              </Text>
            </View>
          ) : (
            visibleAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                activeAction={activeAction}
                onViewAlert={() => {
                  openAlertDetail(alert);
                }}
                onViewPatient={() => {
                  openPatient(alert);
                }}
                onAccept={() => {
                  confirmAccept(alert);
                }}
                onJoin={() => {
                  void joinConsultation(alert);
                }}
                onResolve={() => {
                  confirmResolve(alert);
                }}
              />
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const SummaryStat = ({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: string;
}) => {
  return (
    <View style={styles.summaryStat}>
      <View
        style={[
          styles.summaryStatDot,
          {
            backgroundColor: tone,
          },
        ]}
      />

      <Text style={styles.summaryStatValue}>
        {value}
      </Text>

      <Text style={styles.summaryStatLabel}>
        {label}
      </Text>
    </View>
  );
};

const AlertCard = ({
  alert,
  activeAction,
  onViewAlert,
  onViewPatient,
  onAccept,
  onJoin,
  onResolve,
}: {
  alert: DoctorSafetyAlert;
  activeAction: ActiveAction;
  onViewAlert: () => void;
  onViewPatient: () => void;
  onAccept: () => void;
  onJoin: () => void;
  onResolve: () => void;
}) => {
  const statusTone = getStatusTone(alert.status);

  const vitalStatusTone = getVitalStatusTone(
    alert.vitalReading?.status
  );

  const vitalItems = getVitalItems(
    alert.vitalReading
  );

  const isAccepting =
    activeAction?.alertId === alert.id &&
    activeAction.type === "ACCEPT";

  const isJoining =
    activeAction?.alertId === alert.id &&
    activeAction.type === "JOIN";

  const isResolving =
    activeAction?.alertId === alert.id &&
    activeAction.type === "RESOLVE";

  const isBusy = Boolean(activeAction);

  return (
    <View style={styles.alertCard}>
      <View
        style={[
          styles.alertAccent,
          {
            backgroundColor: statusTone.solid,
          },
        ]}
      />

      <View style={styles.alertHeader}>
        <View
          style={[
            styles.patientIcon,
            {
              backgroundColor: statusTone.background,
            },
          ]}
        >
          <UserRound
            size={22}
            color={statusTone.text}
            strokeWidth={2.6}
          />
        </View>

        <View style={styles.alertHeading}>
          <Text
            style={styles.patientName}
            numberOfLines={1}
          >
            {alert.patient?.fullName ||
              "Patient unavailable"}
          </Text>

          <Text style={styles.alertTime}>
            {formatDateTime(
              alert.escalatedAt ||
                alert.createdAt
            )}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusTone.background,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: statusTone.solid,
              },
            ]}
          />

          <Text
            style={[
              styles.statusBadgeText,
              {
                color: statusTone.text,
              },
            ]}
          >
            {formatStatus(alert.status)}
          </Text>
        </View>
      </View>

      <View style={styles.reasonPanel}>
        <View style={styles.reasonHeader}>
          <AlertTriangle
            size={16}
            color={DANGER}
            strokeWidth={2.5}
          />

          <Text style={styles.reasonLabel}>
            Safety reason
          </Text>
        </View>

        <Text style={styles.reasonText}>
          {alert.reason}
        </Text>
      </View>

      <View style={styles.vitalsHeader}>
        <View>
          <Text style={styles.vitalsTitle}>
            Critical vital reading
          </Text>

          <Text style={styles.vitalsSubtitle}>
            {alert.vitalReading
              ? formatDateTime(
                  alert.vitalReading.recordedAt
                )
              : "No linked reading"}
          </Text>
        </View>

        {alert.vitalReading ? (
          <View
            style={[
              styles.vitalStatusBadge,
              {
                backgroundColor:
                  vitalStatusTone.background,
              },
            ]}
          >
            <Text
              style={[
                styles.vitalStatusText,
                {
                  color: vitalStatusTone.text,
                },
              ]}
            >
              {formatStatus(
                alert.vitalReading.status
              )}
            </Text>
          </View>
        ) : null}
      </View>

      {vitalItems.length === 0 ? (
        <View style={styles.emptyVitalsPanel}>
          <Activity
            size={20}
            color={MUTED}
            strokeWidth={2.5}
          />

          <Text style={styles.emptyVitalsText}>
            No vital values are linked to this alert.
          </Text>
        </View>
      ) : (
        <View style={styles.vitalsGrid}>
          {vitalItems.map((item) => (
            <View
              key={item.key}
              style={styles.vitalItem}
            >
              <View style={styles.vitalIcon}>
                {item.icon}
              </View>

              <View style={styles.vitalTextBlock}>
                <Text style={styles.vitalLabel}>
                  {item.label}
                </Text>

                <Text
                  style={styles.vitalValue}
                  numberOfLines={1}
                >
                  {item.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {alert.consultation ? (
        <View style={styles.consultationPanel}>
          <View style={styles.consultationIcon}>
            <Video
              size={19}
              color={DOCTOR_PRIMARY}
              strokeWidth={2.6}
            />
          </View>

          <View style={styles.consultationText}>
            <Text style={styles.consultationTitle}>
              Emergency consultation
            </Text>

            <Text style={styles.consultationStatus}>
              {formatStatus(
                alert.consultation.status
              )}
            </Text>
          </View>

          <Clock3
            size={18}
            color={MUTED}
            strokeWidth={2.5}
          />
        </View>
      ) : alert.status === "ACTIVE" ? (
        <View style={styles.waitingPanel}>
          <Clock3
            size={18}
            color={WARNING_DARK}
            strokeWidth={2.5}
          />

          <Text style={styles.waitingText}>
            Waiting for patient escalation
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.alertDetailButton}
          activeOpacity={0.85}
          onPress={onViewAlert}
          disabled={isBusy}
        >
          <ShieldAlert
            size={16}
            color={DANGER_DARK}
            strokeWidth={2.5}
          />

          <Text style={styles.alertDetailButtonText}>
            View alert
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.patientButton}
          activeOpacity={0.85}
          onPress={onViewPatient}
          disabled={!alert.patient || isBusy}
        >
          <Stethoscope
            size={16}
            color={DOCTOR_DARK}
            strokeWidth={2.5}
          />

          <Text style={styles.patientButtonText}>
            Patient
          </Text>
        </TouchableOpacity>

        {alert.canAcceptConsultation ? (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isBusy
                ? styles.disabledButton
                : undefined,
            ]}
            activeOpacity={0.85}
            onPress={onAccept}
            disabled={isBusy}
          >
            {isAccepting ? (
              <ActivityIndicator
                size="small"
                color={SURFACE}
              />
            ) : (
              <>
                <CheckCircle2
                  size={16}
                  color={SURFACE}
                  strokeWidth={2.6}
                />

                <Text style={styles.primaryButtonText}>
                  Accept
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {alert.canJoinCall ? (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isBusy
                ? styles.disabledButton
                : undefined,
            ]}
            activeOpacity={0.85}
            onPress={onJoin}
            disabled={isBusy}
          >
            {isJoining ? (
              <ActivityIndicator
                size="small"
                color={SURFACE}
              />
            ) : (
              <>
                <Video
                  size={16}
                  color={SURFACE}
                  strokeWidth={2.6}
                />

                <Text style={styles.primaryButtonText}>
                  Join call
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {alert.canResolveAlert ? (
          <TouchableOpacity
            style={[
              styles.resolveButton,
              isBusy
                ? styles.disabledButton
                : undefined,
            ]}
            activeOpacity={0.85}
            onPress={onResolve}
            disabled={isBusy}
          >
            {isResolving ? (
              <ActivityIndicator
                size="small"
                color={SUCCESS_DARK}
              />
            ) : (
              <>
                <CheckCircle2
                  size={16}
                  color={SUCCESS_DARK}
                  strokeWidth={2.6}
                />

                <Text style={styles.resolveButtonText}>
                  Resolve
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

export default DoctorAlertsScreen;

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
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 26,
    fontWeight: "700",
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 3,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    ...elevate(1),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  summaryCard: {
    backgroundColor: DANGER,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    overflow: "hidden",
    ...elevate(2),
  },
  summaryWatermark: {
    position: "absolute",
    top: -30,
    right: -30,
    opacity: 0.1,
  },
  summaryBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  summaryBadge: {
    minHeight: 27,
    borderRadius: 8,
    paddingHorizontal: 9,
    backgroundColor: "rgba(255,255,255,0.17)",
    flexDirection: "row",
    alignItems: "center",
  },
  summaryBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: SURFACE,
    marginRight: 6,
  },
  summaryBadgeText: {
    color: SURFACE,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  summaryActionBadge: {
    minHeight: 27,
    borderRadius: 8,
    paddingHorizontal: 9,
    backgroundColor: "rgba(130,18,27,0.25)",
    flexDirection: "row",
    alignItems: "center",
  },
  summaryActionText: {
    color: SURFACE,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 5,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryIconOuter: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.17)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  summaryIcon: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextBlock: {
    flex: 1,
  },
  summaryTitle: {
    color: SURFACE,
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.25,
  },
  summaryText: {
    color: "#FFE8EA",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 5,
  },
  summaryStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginHorizontal: -4,
  },
  summaryStat: {
    flex: 1,
    minHeight: 70,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  summaryStatDot: {
    width: 18,
    height: 4,
    borderRadius: 2,
    marginBottom: 5,
  },
  summaryStatValue: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },
  summaryStatLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  filtersRow: {
    paddingBottom: 14,
    paddingRight: 12,
  },
  filterChip: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C7CCDA",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: DOCTOR_LIGHT,
    borderColor: DOCTOR_LIGHT,
  },
  filterChipText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextSelected: {
    color: DOCTOR_DARK,
    fontWeight: "700",
    marginLeft: 6,
  },
  errorCard: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  errorTextBlock: {
    flex: 1,
    marginLeft: 10,
  },
  errorTitle: {
    color: DANGER_DARK,
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    ...elevate(1),
  },
  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    ...elevate(1),
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 17,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stateTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  stateText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
  alertCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    paddingLeft: 18,
    marginBottom: 12,
    overflow: "hidden",
    ...elevate(1),
  },
  alertAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  alertHeading: {
    flex: 1,
  },
  patientName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },
  alertTime: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  reasonPanel: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 13,
    padding: 12,
    marginTop: 13,
  },
  reasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  reasonLabel: {
    color: DANGER_DARK,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },
  reasonText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
  vitalsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 10,
  },
  vitalsTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },
  vitalsSubtitle: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 3,
  },
  vitalStatusBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  vitalStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  vitalsGrid: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    padding: 10,
  },
  vitalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
  },
  vitalIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  vitalTextBlock: {
    flex: 1,
  },
  vitalLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
  },
  vitalValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  emptyVitalsPanel: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  emptyVitalsText: {
    flex: 1,
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 9,
  },
  consultationPanel: {
    backgroundColor: DOCTOR_LIGHT,
    borderRadius: 13,
    padding: 12,
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  consultationIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  consultationText: {
    flex: 1,
  },
  consultationTitle: {
    color: DOCTOR_DARK,
    fontSize: 13,
    fontWeight: "700",
  },
  consultationStatus: {
    color: DOCTOR_DARK,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },
  waitingPanel: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },
  waitingText: {
    color: WARNING_DARK,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
    marginHorizontal: -4,
  },
  alertDetailButton: {
    flexGrow: 1,
    minWidth: "46%",
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: DANGER_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
  },
  alertDetailButtonText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  patientButton: {
    flexGrow: 1,
    minWidth: "46%",
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: DOCTOR_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
  },
  patientButtonText: {
    color: DOCTOR_DARK,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  primaryButton: {
    flexGrow: 1,
    minWidth: "46%",
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: DOCTOR_PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
  },
  primaryButtonText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  resolveButton: {
    flexGrow: 1,
    minWidth: "46%",
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: SUCCESS_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
  },
  resolveButtonText: {
    color: SUCCESS_DARK,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
});