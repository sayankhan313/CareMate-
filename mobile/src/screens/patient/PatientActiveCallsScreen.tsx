import {
  useCallback,
  useMemo,
  useState,
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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  HeartPulse,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  Video,
  VideoOff,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { consultationsApi } from "../../services/consultationsApi";
import type { Consultation } from "../../services/safetyApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "PatientActiveCalls"
>;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";

const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#3F6FD0";
const PRIMARY_LIGHT = "#EEF4FF";

const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const ACTIVE_CALL_REFRESH_MS = 15_000;

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity:
    Platform.OS === "android"
      ? 0
      : level === 1
        ? 0.06
        : 0.1,
  shadowRadius:
    level === 1 ? 4 : 8,
  shadowOffset: {
    width: 0,
    height: level === 1 ? 2 : 4,
  },
});

const formatDoctorName = (
  fullName?: string | null
) => {
  if (!fullName) {
    return "Assigned doctor";
  }

  if (
    /^dr\.?\s/i.test(
      fullName.trim()
    )
  ) {
    return fullName.trim();
  }

  return `Dr. ${fullName.trim()}`;
};

const formatConsultationDate = (
  value?: string | null
) => {
  if (!value) {
    return "Time not specified";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Time not specified";
  }

  return date.toLocaleString(
    undefined,
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

const getTypeLabel = (
  type: string
) => {
  if (type === "EMERGENCY") {
    return "Emergency consultation";
  }

  return "Manual consultation";
};

const getStatusLabel = (
  status: string
) => {
  if (
    status === "IN_PROGRESS"
  ) {
    return "Call in progress";
  }

  return "Ready to join";
};

const getStatusDescription = (
  status: string
) => {
  if (
    status === "IN_PROGRESS"
  ) {
    return "This consultation is already active. Rejoin the video call to continue.";
  }

  return "Your doctor has accepted this consultation. The video call is ready.";
};

const PatientActiveCallsScreen = ({
  navigation,
}: Props) => {
  const insets =
    useSafeAreaInsets();

  const [
    consultations,
    setConsultations,
  ] = useState<
    Consultation[]
  >([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    joiningConsultationId,
    setJoiningConsultationId,
  ] = useState<
    string | null
  >(null);

  const activeCalls =
    useMemo(() => {
      return consultations
        .filter(
          (consultation) =>
            consultation.status ===
              "ACCEPTED" ||
            consultation.status ===
              "IN_PROGRESS"
        )
        .sort((first, second) => {
          if (
            first.status ===
              "IN_PROGRESS" &&
            second.status !==
              "IN_PROGRESS"
          ) {
            return -1;
          }

          if (
            second.status ===
              "IN_PROGRESS" &&
            first.status !==
              "IN_PROGRESS"
          ) {
            return 1;
          }

          return (
            new Date(
              second.createdAt
            ).getTime() -
            new Date(
              first.createdAt
            ).getTime()
          );
        });
    }, [consultations]);

  const loadActiveCalls =
    useCallback(
      async (
        mode:
          | "initial"
          | "refresh"
          | "silent" = "initial"
      ) => {
        try {
          if (
            mode === "initial"
          ) {
            setIsLoading(true);
          }

          if (
            mode === "refresh"
          ) {
            setIsRefreshing(
              true
            );
          }

          if (
            mode !== "silent"
          ) {
            setErrorMessage("");
          }

          const result =
            await consultationsApi.listConsultations();

          setConsultations(
            result
          );
        } catch (error) {
          if (
            mode !== "silent"
          ) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Unable to load active calls."
            );
          }
        } finally {
          if (
            mode === "initial"
          ) {
            setIsLoading(false);
          }

          if (
            mode === "refresh"
          ) {
            setIsRefreshing(
              false
            );
          }
        }
      },
      []
    );

  useFocusEffect(
    useCallback(() => {
      void loadActiveCalls(
        "initial"
      );

      const intervalId =
        setInterval(() => {
          void loadActiveCalls(
            "silent"
          );
        }, ACTIVE_CALL_REFRESH_MS);

      return () => {
        clearInterval(
          intervalId
        );
      };
    }, [loadActiveCalls])
  );

  const joinConsultation =
    useCallback(
      async (
        consultation: Consultation
      ) => {
        if (
          joiningConsultationId
        ) {
          return;
        }

        try {
          setJoiningConsultationId(
            consultation.id
          );

          setErrorMessage("");

          const result =
            await consultationsApi.getPatientJoinConfig(
              consultation.id
            );

          navigation.navigate(
            "VideoConsultation",
            {
              consultationId:
                result.consultation.id,
              consultationType:
                result.consultation.type,
              patientMeeting:
                result.patientMeeting,
              patientMeetingUrl:
                result.patientMeeting
                  .webUrl,
            }
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to join consultation.";

          setErrorMessage(
            message
          );

          Alert.alert(
            "Unable to join",
            message
          );
        } finally {
          setJoiningConsultationId(
            null
          );
        }
      },
      [
        joiningConsultationId,
        navigation,
      ]
    );

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        "top",
        "bottom",
      ]}
    >
      <StatusBar
        backgroundColor={
          BACKGROUND
        }
        barStyle="dark-content"
      />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity
            style={
              styles.backButton
            }
            activeOpacity={0.84}
            onPress={() =>
              navigation.goBack()
            }
          >
            <ArrowLeft
              size={22}
              color={PRIMARY}
              strokeWidth={2.7}
            />
          </TouchableOpacity>

          <View
            style={
              styles.appBarTextBlock
            }
          >
            <Text
              style={
                styles.appBarTitle
              }
            >
              Active Calls
            </Text>

            <Text
              style={
                styles.appBarSubtitle
              }
            >
              Join accepted or ongoing
              consultations
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.refreshButton
            }
            activeOpacity={0.84}
            onPress={() =>
              void loadActiveCalls(
                "refresh"
              )
            }
          >
            <RefreshCw
              size={20}
              color={PRIMARY}
              strokeWidth={2.6}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                Math.max(
                  28,
                  insets.bottom + 22
                ),
            },
          ]}
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                isRefreshing
              }
              onRefresh={() =>
                void loadActiveCalls(
                  "refresh"
                )
              }
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        >
          <View
            style={
              styles.summaryCard
            }
          >
            <View
              style={
                styles.summaryIconBox
              }
            >
              <Video
                size={27}
                color={PRIMARY}
                strokeWidth={2.7}
              />
            </View>

            <View
              style={
                styles.summaryTextBlock
              }
            >
              <Text
                style={
                  styles.summaryTitle
                }
              >
                Video consultations
              </Text>

              <Text
                style={
                  styles.summaryText
                }
              >
                This screen only shows
                calls that are ready to
                join or already in
                progress.
              </Text>
            </View>

            <View
              style={
                styles.summaryCountBox
              }
            >
              <Text
                style={
                  styles.summaryCount
                }
              >
                {
                  activeCalls.length
                }
              </Text>

              <Text
                style={
                  styles.summaryCountLabel
                }
              >
                Active
              </Text>
            </View>
          </View>

          {errorMessage ? (
            <View
              style={
                styles.errorPanel
              }
            >
              <AlertCircle
                size={22}
                color={DANGER}
                strokeWidth={2.7}
              />

              <View
                style={
                  styles.errorTextBlock
                }
              >
                <Text
                  style={
                    styles.errorTitle
                  }
                >
                  Unable to update calls
                </Text>

                <Text
                  style={
                    styles.errorText
                  }
                >
                  {errorMessage}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.errorRetryButton
                }
                activeOpacity={0.84}
                onPress={() =>
                  void loadActiveCalls(
                    "initial"
                  )
                }
              >
                <Text
                  style={
                    styles.errorRetryText
                  }
                >
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isLoading ? (
            <View
              style={
                styles.stateCard
              }
            >
              <ActivityIndicator
                color={PRIMARY}
              />

              <Text
                style={
                  styles.stateTitle
                }
              >
                Checking active calls...
              </Text>

              <Text
                style={
                  styles.stateText
                }
              >
                Accepted and ongoing
                consultations will
                appear here.
              </Text>
            </View>
          ) : null}

          {!isLoading &&
          !errorMessage &&
          activeCalls.length ===
            0 ? (
            <View
              style={
                styles.stateCard
              }
            >
              <View
                style={
                  styles.emptyIconBox
                }
              >
                <VideoOff
                  size={28}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              </View>

              <Text
                style={
                  styles.stateTitle
                }
              >
                No active calls
              </Text>

              <Text
                style={
                  styles.stateText
                }
              >
                When a doctor accepts
                your request or an
                emergency consultation
                starts, it will appear
                here.
              </Text>

              <TouchableOpacity
                style={
                  styles.checkAgainButton
                }
                activeOpacity={0.84}
                onPress={() =>
                  void loadActiveCalls(
                    "refresh"
                  )
                }
              >
                <RefreshCw
                  size={17}
                  color={PRIMARY}
                  strokeWidth={2.5}
                />

                <Text
                  style={
                    styles.checkAgainText
                  }
                >
                  Check again
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading &&
          activeCalls.length > 0 ? (
            <>
              <View
                style={
                  styles.sectionHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Ready consultations
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Select the correct
                    call and use the
                    large button to join
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.callStack
                }
              >
                {activeCalls.map(
                  (consultation) => (
                    <ActiveCallCard
                      key={
                        consultation.id
                      }
                      consultation={
                        consultation
                      }
                      isJoining={
                        joiningConsultationId ===
                        consultation.id
                      }
                      disabled={
                        joiningConsultationId !==
                        null
                      }
                      onJoin={() =>
                        void joinConsultation(
                          consultation
                        )
                      }
                    />
                  )
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const ActiveCallCard = ({
  consultation,
  isJoining,
  disabled,
  onJoin,
}: {
  consultation: Consultation;
  isJoining: boolean;
  disabled: boolean;
  onJoin: () => void;
}) => {
  const isEmergency =
    consultation.type ===
    "EMERGENCY";

  const isInProgress =
    consultation.status ===
    "IN_PROGRESS";

  return (
    <View
      style={[
        styles.callCard,
        isEmergency
          ? styles.emergencyCallCard
          : undefined,
      ]}
    >
      <View
        style={
          styles.callHeader
        }
      >
        <View
          style={[
            styles.callTypeIcon,
            isEmergency
              ? styles.emergencyIconBox
              : undefined,
          ]}
        >
          {isEmergency ? (
            <ShieldAlert
              size={23}
              color={DANGER}
              strokeWidth={2.7}
            />
          ) : (
            <Stethoscope
              size={23}
              color={PRIMARY}
              strokeWidth={2.7}
            />
          )}
        </View>

        <View
          style={
            styles.callHeaderText
          }
        >
          <Text
            style={[
              styles.callTypeTitle,
              isEmergency
                ? styles.emergencyTitle
                : undefined,
            ]}
          >
            {getTypeLabel(
              consultation.type
            )}
          </Text>

          <Text
            style={
              styles.doctorName
            }
            numberOfLines={1}
          >
            {formatDoctorName(
              consultation.doctorName
            )}
          </Text>
        </View>

        <View
          style={[
            styles.statusChip,
            isInProgress
              ? styles.inProgressChip
              : undefined,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isInProgress
                ? styles.inProgressDot
                : undefined,
            ]}
          />

          <Text
            style={[
              styles.statusChipText,
              isInProgress
                ? styles.inProgressText
                : undefined,
            ]}
          >
            {isInProgress
              ? "LIVE"
              : "READY"}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.callStatusPanel
        }
      >
        <View
          style={
            styles.callStatusIcon
          }
        >
          {isInProgress ? (
            <HeartPulse
              size={19}
              color={SUCCESS}
              strokeWidth={2.7}
            />
          ) : (
            <Video
              size={19}
              color={PRIMARY}
              strokeWidth={2.7}
            />
          )}
        </View>

        <View
          style={
            styles.callStatusTextBlock
          }
        >
          <Text
            style={
              styles.callStatusTitle
            }
          >
            {getStatusLabel(
              consultation.status
            )}
          </Text>

          <Text
            style={
              styles.callStatusText
            }
          >
            {getStatusDescription(
              consultation.status
            )}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.detailRow
        }
      >
        <View
          style={
            styles.detailIcon
          }
        >
          <CalendarDays
            size={17}
            color={PRIMARY}
            strokeWidth={2.5}
          />
        </View>

        <View
          style={
            styles.detailTextBlock
          }
        >
          <Text
            style={
              styles.detailLabel
            }
          >
            Consultation time
          </Text>

          <Text
            style={
              styles.detailValue
            }
          >
            {formatConsultationDate(
              consultation.preferredAt ||
                consultation.createdAt
            )}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.detailRow
        }
      >
        <View
          style={
            styles.detailIcon
          }
        >
          <Clock3
            size={17}
            color={PRIMARY}
            strokeWidth={2.5}
          />
        </View>

        <View
          style={
            styles.detailTextBlock
          }
        >
          <Text
            style={
              styles.detailLabel
            }
          >
            Reason
          </Text>

          <Text
            style={
              styles.detailValue
            }
            numberOfLines={3}
          >
            {consultation.reason ||
              "No reason provided"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.joinButton,
          isEmergency
            ? styles.emergencyJoinButton
            : undefined,
          disabled
            ? styles.disabledButton
            : undefined,
        ]}
        activeOpacity={0.86}
        onPress={onJoin}
        disabled={disabled}
      >
        {isJoining ? (
          <ActivityIndicator
            color={SURFACE}
          />
        ) : (
          <>
            <Video
              size={20}
              color={SURFACE}
              strokeWidth={2.7}
            />

            <Text
              style={
                styles.joinButtonText
              }
            >
              {isInProgress
                ? "Rejoin Video Consultation"
                : "Join Video Consultation"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text
        style={
          styles.joinHelperText
        }
      >
        Camera and microphone access may
        be requested when the call opens.
      </Text>
    </View>
  );
};

export default PatientActiveCallsScreen;

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
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    ...elevate(1),
  },
  appBarTextBlock: {
    flex: 1,
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "700",
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  refreshButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
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
    backgroundColor: PRIMARY,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(2),
  },
  summaryIconBox: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  summaryTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  summaryTitle: {
    color: SURFACE,
    fontSize: 17,
    fontWeight: "700",
  },
  summaryText: {
    color: "#E5ECFF",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },
  summaryCountBox: {
    minWidth: 58,
    borderRadius: 13,
    backgroundColor:
      "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  summaryCount: {
    color: SURFACE,
    fontSize: 20,
    fontWeight: "700",
  },
  summaryCountLabel: {
    color: "#E5ECFF",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
  errorPanel: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  errorTextBlock: {
    flex: 1,
    marginLeft: 10,
  },
  errorTitle: {
    color: DANGER_DARK,
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    color: DANGER_DARK,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 2,
  },
  errorRetryButton: {
    borderRadius: 10,
    backgroundColor: DANGER,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginLeft: 10,
  },
  errorRetryText: {
    color: SURFACE,
    fontSize: 11,
    fontWeight: "700",
  },
  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginTop: 16,
    ...elevate(1),
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 17,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  stateTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },
  stateText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
  },
  checkAgainButton: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  checkAgainText: {
    color: PRIMARY_DARK,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 7,
  },
  sectionHeader: {
    marginTop: 20,
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
    lineHeight: 18,
    marginTop: 3,
  },
  callStack: {
    gap: 12,
  },
  callCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    ...elevate(1),
  },
  emergencyCallCard: {
    borderLeftWidth: 4,
    borderLeftColor: DANGER,
  },
  callHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  callTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  emergencyIconBox: {
    backgroundColor: DANGER_LIGHT,
  },
  callHeaderText: {
    flex: 1,
    paddingRight: 8,
  },
  callTypeTitle: {
    color: PRIMARY_DARK,
    fontSize: 13,
    fontWeight: "700",
  },
  emergencyTitle: {
    color: DANGER_DARK,
  },
  doctorName: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 3,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: PRIMARY,
    marginRight: 5,
  },
  statusChipText: {
    color: PRIMARY_DARK,
    fontSize: 9,
    fontWeight: "700",
  },
  inProgressChip: {
    backgroundColor: SUCCESS_LIGHT,
  },
  inProgressDot: {
    backgroundColor: SUCCESS,
  },
  inProgressText: {
    color: SUCCESS_DARK,
  },
  callStatusPanel: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    padding: 12,
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  callStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  callStatusTextBlock: {
    flex: 1,
  },
  callStatusTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },
  callStatusText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 3,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  detailTextBlock: {
    flex: 1,
    paddingTop: 1,
  },
  detailLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
  },
  detailValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 2,
  },
  joinButton: {
    minHeight: 54,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    overflow: "hidden",
    ...elevate(1),
  },
  emergencyJoinButton: {
    backgroundColor: DANGER,
  },
  joinButtonText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.55,
  },
  joinHelperText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 15,
    textAlign: "center",
    marginTop: 8,
  },
});
