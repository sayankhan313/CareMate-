import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
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
  DoorOpen,
  Home,
  MessageSquareText,
  Stethoscope,
  UserRound,
  Video,
} from "lucide-react-native";

import { consultationsApi } from "../../services/consultationsApi";
import type {
  ConsultationCompletionStatus,
  ConsultationEndedBy,
  ConsultationParticipantRole,
  RootStackParamList,
} from "../../types/navigation";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "ConsultationEnded"
>;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";

const PATIENT_PRIMARY = "#5B86E5";
const PATIENT_PRIMARY_DARK = "#3F6FD0";
const PATIENT_PRIMARY_LIGHT = "#EEF4FF";

const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_PRIMARY_DARK = "#134E4A";
const DOCTOR_PRIMARY_LIGHT = "#E6FFFA";

const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#F6A545";
const WARNING_DARK = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";

const elevate = (
  level: 1 | 2 | 3 = 2
) => {
  const elevation =
    level === 1
      ? 2
      : level === 2
        ? 4
        : 7;

  return {
    elevation,
    shadowColor: "#172033",
    shadowOffset: {
      width: 0,
      height:
        level === 1 ? 2 : 4,
    },
    shadowOpacity:
      level === 1 ? 0.06 : 0.1,
    shadowRadius:
      level === 1 ? 4 : 9,
  };
};

const ConsultationEndedScreen = ({
  navigation,
  route,
}: Props) => {
  const insets =
    useSafeAreaInsets();

  const {
    consultationId,
    consultationType,
    participantRole:
      providedParticipantRole,
    endedBy: providedEndedBy,
    completionStatus:
      providedCompletionStatus,
  } = route.params;

  const participantRole:
    ConsultationParticipantRole =
    providedParticipantRole ||
    "PATIENT";

  const isDoctor =
    participantRole === "DOCTOR";

  const [
    resolvedCompletionStatus,
    setResolvedCompletionStatus,
  ] =
    useState<ConsultationCompletionStatus | null>(
      providedCompletionStatus ||
        (isDoctor
          ? "COMPLETED"
          : null)
    );

  const [
    resolvedEndedBy,
    setResolvedEndedBy,
  ] =
    useState<ConsultationEndedBy | null>(
      providedEndedBy ||
        (isDoctor
          ? "DOCTOR"
          : null)
    );

  const [
    isCheckingStatus,
    setIsCheckingStatus,
  ] = useState(
    !providedCompletionStatus &&
      !isDoctor
  );

  useEffect(() => {
    if (
      providedCompletionStatus ||
      isDoctor
    ) {
      return;
    }

    let isMounted = true;

    const loadConsultationStatus =
      async () => {
        try {
          setIsCheckingStatus(true);

          const consultation =
            await consultationsApi.getConsultationById(
              consultationId
            );

          if (!isMounted) {
            return;
          }

          if (
            consultation.status ===
            "COMPLETED"
          ) {
            setResolvedCompletionStatus(
              "COMPLETED"
            );

            setResolvedEndedBy(
              providedEndedBy ||
                "DOCTOR"
            );

            return;
          }

          setResolvedCompletionStatus(
            "LEFT"
          );

          setResolvedEndedBy(
            providedEndedBy ||
              "PATIENT"
          );
        } catch {
          if (!isMounted) {
            return;
          }

          setResolvedCompletionStatus(
            providedCompletionStatus ||
              "LEFT"
          );

          setResolvedEndedBy(
            providedEndedBy ||
              "PATIENT"
          );
        } finally {
          if (isMounted) {
            setIsCheckingStatus(false);
          }
        }
      };

    void loadConsultationStatus();

    return () => {
      isMounted = false;
    };
  }, [
    consultationId,
    isDoctor,
    providedCompletionStatus,
    providedEndedBy,
  ]);

  const completionStatus =
    resolvedCompletionStatus ||
    "LEFT";

  const endedBy =
    resolvedEndedBy ||
    (completionStatus === "COMPLETED"
      ? "DOCTOR"
      : "PATIENT");

  const isCompleted =
    completionStatus ===
    "COMPLETED";

  const rolePrimary =
    isDoctor
      ? DOCTOR_PRIMARY
      : PATIENT_PRIMARY;

  const rolePrimaryDark =
    isDoctor
      ? DOCTOR_PRIMARY_DARK
      : PATIENT_PRIMARY_DARK;

  const rolePrimaryLight =
    isDoctor
      ? DOCTOR_PRIMARY_LIGHT
      : PATIENT_PRIMARY_LIGHT;

  const screenContent =
    useMemo(() => {
      if (isDoctor) {
        return {
          appBarTitle:
            "Consultation Completed",
          appBarSubtitle:
            "The patient consultation record has been updated",
          title:
            "Consultation completed",
          description:
            consultationType ===
            "EMERGENCY"
              ? "The emergency consultation has been marked as completed and the linked Safety Response alert has been resolved."
              : "The consultation has been marked as completed and is now available in the patient consultation history.",
          statusLabel: "Completed",
          statusColor:
            SUCCESS_DARK,
          statusBackground:
            SUCCESS_LIGHT,
          primaryButton:
            "Back to Consultations",
          secondaryButton:
            "Doctor Dashboard",
        };
      }

      if (isCompleted) {
        return {
          appBarTitle:
            "Consultation Completed",
          appBarSubtitle:
            "Your CareMate+ consultation has been updated",
          title:
            "Doctor ended the call",
          description:
            "Your doctor has completed this consultation. The completed session is now available in your consultation history.",
          statusLabel: "Completed",
          statusColor:
            SUCCESS_DARK,
          statusBackground:
            SUCCESS_LIGHT,
          primaryButton:
            "Back to Home",
          secondaryButton:
            "View Consultations",
        };
      }

      return {
        appBarTitle:
          "Video Call Closed",
        appBarSubtitle:
          "You have left the CareMate+ video session",
        title:
          "You left the video call",
        description:
          "You have left the video session. The consultation may remain active until the doctor completes it.",
        statusLabel: "Call left",
        statusColor:
          WARNING_DARK,
        statusBackground:
          WARNING_LIGHT,
        primaryButton:
          "Back to Home",
        secondaryButton:
          "View Consultations",
      };
    }, [
      consultationType,
      isCompleted,
      isDoctor,
    ]);

  const goPrimaryDestination = () => {
    if (isDoctor) {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "DoctorTabs",
            params: {
              screen:
                "Consultations",
            },
          },
        ],
      });

      return;
    }

    navigation.reset({
      index: 0,
      routes: [
        {
          name: "PatientTabs",
          params: {
            screen: "Home",
          },
        },
      ],
    });
  };

  const goSecondaryDestination =
    () => {
      if (isDoctor) {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "DoctorTabs",
              params: {
                screen: "Home",
              },
            },
          ],
        });

        return;
      }

      navigation.reset({
        index: 0,
        routes: [
          {
            name: "PatientTabs",
            params: {
              screen:
                "Consultations",
            },
          },
        ],
      });
    };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={BACKGROUND}
      />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <Text
            style={styles.appBarTitle}
          >
            {screenContent.appBarTitle}
          </Text>

          <Text
            style={
              styles.appBarSubtitle
            }
          >
            {
              screenContent.appBarSubtitle
            }
          </Text>
        </View>

        <View
          style={[
            styles.content,
            {
              paddingBottom:
                Math.max(
                  24,
                  insets.bottom + 18
                ),
            },
          ]}
        >
          <View
            style={styles.successPanel}
          >
            <View
              style={[
                styles.successIconCircle,
                {
                  backgroundColor:
                    isCompleted
                      ? SUCCESS_LIGHT
                      : WARNING_LIGHT,
                },
              ]}
            >
              {isCompleted ? (
                <CheckCircle2
                  size={46}
                  color={SUCCESS}
                  strokeWidth={2.7}
                />
              ) : (
                <DoorOpen
                  size={42}
                  color={WARNING}
                  strokeWidth={2.7}
                />
              )}
            </View>

            <Text style={styles.title}>
              {screenContent.title}
            </Text>

            <Text
              style={
                styles.description
              }
            >
              {
                screenContent.description
              }
            </Text>

            {isCheckingStatus ? (
              <View
                style={
                  styles.checkingRow
                }
              >
                <ActivityIndicator
                  size="small"
                  color={rolePrimary}
                />

                <Text
                  style={
                    styles.checkingText
                  }
                >
                  Checking consultation
                  status...
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.resultChip,
                  {
                    backgroundColor:
                      screenContent.statusBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.resultChipText,
                    {
                      color:
                        screenContent.statusColor,
                    },
                  ]}
                >
                  {
                    screenContent.statusLabel
                  }
                </Text>
              </View>
            )}
          </View>

          <View
            style={styles.summaryCard}
          >
            <View
              style={
                styles.summaryHeader
              }
            >
              <View
                style={[
                  styles.summaryIconCircle,
                  {
                    backgroundColor:
                      rolePrimaryLight,
                  },
                ]}
              >
                <Video
                  size={22}
                  color={rolePrimary}
                  strokeWidth={2.7}
                />
              </View>

              <View
                style={
                  styles.summaryHeaderText
                }
              >
                <Text
                  style={
                    styles.summaryTitle
                  }
                >
                  Session summary
                </Text>

                <Text
                  style={
                    styles.summarySubtitle
                  }
                >
                  Consultation details
                </Text>
              </View>
            </View>

            <SummaryRow
              icon={
                <MessageSquareText
                  size={18}
                  color={rolePrimary}
                  strokeWidth={2.5}
                />
              }
              iconBackground={
                rolePrimaryLight
              }
              label="Type"
              value={
                consultationType ===
                "EMERGENCY"
                  ? "Emergency"
                  : "Manual"
              }
            />

            <SummaryRow
              icon={
                isDoctor ? (
                  <Stethoscope
                    size={18}
                    color={rolePrimary}
                    strokeWidth={2.5}
                  />
                ) : (
                  <UserRound
                    size={18}
                    color={rolePrimary}
                    strokeWidth={2.5}
                  />
                )
              }
              iconBackground={
                rolePrimaryLight
              }
              label="Ended by"
              value={
                endedBy === "DOCTOR"
                  ? "Doctor"
                  : "Patient"
              }
            />

            <SummaryRow
              icon={
                <ClipboardList
                  size={18}
                  color={rolePrimary}
                  strokeWidth={2.5}
                />
              }
              iconBackground={
                rolePrimaryLight
              }
              label="Consultation ID"
              value={consultationId.slice(
                0,
                8
              )}
              isLast
            />
          </View>

          <View
            style={styles.actionPanel}
          >
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor:
                    rolePrimary,
                },
              ]}
              activeOpacity={0.86}
              onPress={
                goPrimaryDestination
              }
            >
              {isDoctor ? (
                <MessageSquareText
                  size={20}
                  color={SURFACE}
                  strokeWidth={2.7}
                />
              ) : (
                <Home
                  size={20}
                  color={SURFACE}
                  strokeWidth={2.7}
                />
              )}

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {
                  screenContent.primaryButton
                }
              </Text>

              <ChevronRight
                size={20}
                color={SURFACE}
                strokeWidth={2.8}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  backgroundColor:
                    rolePrimaryLight,
                },
              ]}
              activeOpacity={0.86}
              onPress={
                goSecondaryDestination
              }
            >
              {isDoctor ? (
                <Stethoscope
                  size={20}
                  color={
                    rolePrimaryDark
                  }
                  strokeWidth={2.6}
                />
              ) : (
                <MessageSquareText
                  size={20}
                  color={
                    rolePrimaryDark
                  }
                  strokeWidth={2.6}
                />
              )}

              <Text
                style={[
                  styles.secondaryButtonText,
                  {
                    color:
                      rolePrimaryDark,
                  },
                ]}
              >
                {
                  screenContent.secondaryButton
                }
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
  iconBackground,
  label,
  value,
  isLast,
}: {
  icon: React.ReactNode;
  iconBackground: string;
  label: string;
  value: string;
  isLast?: boolean;
}) => {
  return (
    <View
      style={[
        styles.summaryRow,
        isLast
          ? styles.summaryRowLast
          : undefined,
      ]}
    >
      <View
        style={[
          styles.summaryRowIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        {icon}
      </View>

      <View
        style={styles.summaryRowText}
      >
        <Text
          style={styles.summaryLabel}
        >
          {label}
        </Text>

        <Text
          style={styles.summaryValue}
        >
          {value}
        </Text>
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
    paddingBottom: 14,
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3,
    lineHeight: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    justifyContent: "center",
  },
  successPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 25,
    alignItems: "center",
    marginBottom: 14,
    ...elevate(2),
  },
  successIconCircle: {
    width: 82,
    height: 82,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },
  title: {
    color: TEXT,
    fontSize: 23,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.35,
  },
  description: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 9,
  },
  checkingRow: {
    minHeight: 34,
    borderRadius: 10,
    backgroundColor: SOFT_PANEL,
    paddingHorizontal: 12,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  checkingText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
  resultChip: {
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginTop: 16,
  },
  resultChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    ...elevate(1),
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },
  summaryIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 13,
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
    fontWeight: "700",
  },
  summarySubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E8F2",
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  summaryRowText: {
    flex: 1,
  },
  summaryLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 3,
  },
  summaryValue: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },
  actionPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    ...elevate(1),
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "700",
    marginHorizontal: 8,
    flex: 1,
    textAlign: "center",
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },
});