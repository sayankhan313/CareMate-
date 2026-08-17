import {
  useCallback,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Package,
  Pill,
  ShieldCheck,
  Store,
  UserRound,
  XCircle,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  useFocusEffect,
} from "@react-navigation/native";
import type {
  NativeStackScreenProps,
} from "@react-navigation/native-stack";

import {
  doctorRefillVerificationsApi,
  type DoctorRefillVerificationRequest,
} from "../../services/doctor/doctorRefillVerificationsApi";
import type {
  RootStackParamList,
} from "../../types/navigation";

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    "DoctorRefillVerificationDetail"
  >;

type Decision =
  | "CONFIRM"
  | "REJECT"
  | null;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";

const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_DARK = "#134E4A";
const DOCTOR_LIGHT = "#E6FFFA";

const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const WARNING_DARK = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";

const elevate = () => ({
  elevation: 2,
  shadowColor: "#172033",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.06,
  shadowRadius: 4,
});

const formatDateTime = (
  value?: string | null,
) => {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function DoctorRefillVerificationDetailScreen({
  navigation,
  route,
}: Props) {
  const insets = useSafeAreaInsets();

  const {
    submissionId,
  } = route.params;

  const [request, setRequest] =
    useState<
      DoctorRefillVerificationRequest | null
    >(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [decision, setDecision] =
    useState<Decision>(null);

  const [note, setNote] =
    useState("");

  const loadRequest =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const result =
          await doctorRefillVerificationsApi
            .getDetail(
              submissionId,
            );

        setRequest(result);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load medicine verification request.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [submissionId]);

  useFocusEffect(
    useCallback(() => {
      void loadRequest();
    }, [loadRequest]),
  );

  const submitDecision = async (
    action:
      | "CONFIRM"
      | "REJECT",
  ) => {
    if (
      !request ||
      decision
    ) {
      return;
    }

    const medicineName =
      request.items[0]?.name ||
      "this medicine";

    const actionTitle =
      action === "CONFIRM"
        ? "Confirm medicine?"
        : "Reject request?";

    const actionMessage =
      action === "CONFIRM"
        ? `Confirm that you prescribed or recommended ${medicineName} for ${request.patient.fullName}?`
        : `Reject ${request.patient.fullName}'s claim for ${medicineName}?`;

    Alert.alert(
      actionTitle,
      actionMessage,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text:
            action === "CONFIRM"
              ? "Confirm"
              : "Reject",
          style:
            action === "REJECT"
              ? "destructive"
              : "default",
          onPress: () =>
            void performDecision(
              action,
            ),
        },
      ],
    );
  };

  const performDecision = async (
    action:
      | "CONFIRM"
      | "REJECT",
  ) => {
    try {
      setDecision(action);

      if (
        action === "CONFIRM"
      ) {
        await doctorRefillVerificationsApi
          .confirm(
            submissionId,
            note.trim() ||
              undefined,
          );
      } else {
        await doctorRefillVerificationsApi
          .reject(
            submissionId,
            note.trim() ||
              undefined,
          );
      }

      Alert.alert(
        action === "CONFIRM"
          ? "Request confirmed"
          : "Request rejected",
        action === "CONFIRM"
          ? "The pharmacy can now continue processing this medicine request."
          : "The patient medicine request has been rejected.",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        action === "CONFIRM"
          ? "Unable to confirm"
          : "Unable to reject",
        error instanceof Error
          ? error.message
          : "Unable to update this request.",
      );
    } finally {
      setDecision(null);
    }
  };

  const openPatient = () => {
    if (!request) return;

    navigation.navigate(
      "DoctorPatientDetail",
      {
        patientId:
          request.patient.id,
        patientName:
          request.patient
            .fullName,
      },
    );
  };

  const medicine =
    request?.items[0];

  const isPending =
    request
      ?.doctorVerificationStatus ===
    "PENDING";

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <StatusBar
        backgroundColor={BACKGROUND}
        barStyle="dark-content"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() =>
              navigation.goBack()
            }
          >
            <ArrowLeft
              size={21}
              color={DOCTOR_PRIMARY}
              strokeWidth={2.6}
            />
          </TouchableOpacity>

          <View
            style={styles.headerText}
          >
            <Text style={styles.title}>
              Verify Medicine
            </Text>

            <Text
              style={styles.subtitle}
            >
              Confirm the patient's claim
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                Math.max(
                  insets.bottom + 36,
                  50,
                ),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          {isLoading ? (
            <View
              style={styles.stateCard}
            >
              <ActivityIndicator
                color={
                  DOCTOR_PRIMARY
                }
              />

              <Text
                style={styles.stateText}
              >
                Loading request...
              </Text>
            </View>
          ) : null}

          {!isLoading &&
          errorMessage ? (
            <View
              style={styles.stateCard}
            >
              <Text
                style={
                  styles.errorTitle
                }
              >
                Unable to load request
              </Text>

              <Text
                style={styles.stateText}
              >
                {errorMessage}
              </Text>

              <TouchableOpacity
                style={
                  styles.retryButton
                }
                activeOpacity={0.85}
                onPress={() =>
                  void loadRequest()
                }
              >
                <Text
                  style={
                    styles.retryText
                  }
                >
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading &&
          !errorMessage &&
          request ? (
            <>
              <View
                style={
                  styles.verificationCard
                }
              >
                <View
                  style={
                    styles.verificationIcon
                  }
                >
                  <ShieldCheck
                    size={26}
                    color={
                      DOCTOR_PRIMARY
                    }
                    strokeWidth={2.7}
                  />
                </View>

                <View
                  style={
                    styles.verificationText
                  }
                >
                  <Text
                    style={
                      styles.verificationTitle
                    }
                  >
                    Patient-selected
                    doctor verification
                  </Text>

                  <Text
                    style={
                      styles.verificationBody
                    }
                  >
                    The patient has
                    stated that you
                    prescribed or
                    recommended this
                    medicine. CareMate+
                    has not treated the
                    claim as verified.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.86}
                onPress={openPatient}
              >
                <View
                  style={
                    styles.cardHeader
                  }
                >
                  <View
                    style={
                      styles.iconBox
                    }
                  >
                    <UserRound
                      size={22}
                      color={
                        DOCTOR_PRIMARY
                      }
                      strokeWidth={2.6}
                    />
                  </View>

                  <View
                    style={
                      styles.cardHeaderText
                    }
                  >
                    <Text
                      style={
                        styles.cardLabel
                      }
                    >
                      Patient
                    </Text>

                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      {
                        request.patient
                          .fullName
                      }
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.viewPatient
                    }
                  >
                    View
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.card}>
                <View
                  style={
                    styles.cardHeader
                  }
                >
                  <View
                    style={
                      styles.iconBox
                    }
                  >
                    <Pill
                      size={22}
                      color={
                        DOCTOR_PRIMARY
                      }
                      strokeWidth={2.6}
                    />
                  </View>

                  <View
                    style={
                      styles.cardHeaderText
                    }
                  >
                    <Text
                      style={
                        styles.cardLabel
                      }
                    >
                      Medicine
                    </Text>

                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      {medicine?.name ||
                        "Medicine"}
                    </Text>
                  </View>
                </View>

                <InfoRow
                  label="Dose"
                  value={
                    medicine?.dose ||
                    "Not recorded"
                  }
                />

                <InfoRow
                  label="Requested quantity"
                  value={
                    medicine?.quantity ||
                    "Not recorded"
                  }
                />

                <InfoRow
                  label="Instructions"
                  value={
                    medicine?.instructions ||
                    "No instructions recorded"
                  }
                  last
                />
              </View>

              <View style={styles.card}>
                <View
                  style={
                    styles.cardHeader
                  }
                >
                  <View
                    style={
                      styles.iconBox
                    }
                  >
                    <Package
                      size={22}
                      color={
                        DOCTOR_PRIMARY
                      }
                      strokeWidth={2.6}
                    />
                  </View>

                  <View
                    style={
                      styles.cardHeaderText
                    }
                  >
                    <Text
                      style={
                        styles.cardLabel
                      }
                    >
                      Request
                    </Text>

                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      Pharmacy refill
                    </Text>
                  </View>
                </View>

                <InfoRow
                  label="Requested"
                  value={formatDateTime(
                    request
                      .doctorVerificationRequestedAt ||
                      request.createdAt,
                  )}
                />

                <InfoRow
                  label="Order"
                  value={
                    request
                      .medicineOrder
                      ?.orderNumber ||
                    "Pending order"
                  }
                />

                <InfoRow
                  label="Pharmacy"
                  value={
                    request.pharmacy
                      ?.pharmacyProfile
                      ?.pharmacyName ||
                    "Primary pharmacy"
                  }
                  last
                />
              </View>

              <View
                style={
                  styles.statusCard
                }
              >
                <Clock3
                  size={18}
                  color={
                    isPending
                      ? WARNING_DARK
                      : request.doctorVerificationStatus ===
                          "CONFIRMED"
                        ? SUCCESS_DARK
                        : DANGER_DARK
                  }
                  strokeWidth={2.5}
                />

                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        isPending
                          ? WARNING_DARK
                          : request.doctorVerificationStatus ===
                              "CONFIRMED"
                            ? SUCCESS_DARK
                            : DANGER_DARK,
                    },
                  ]}
                >
                  {isPending
                    ? "Awaiting your decision"
                    : request.doctorVerificationStatus ===
                        "CONFIRMED"
                      ? "You confirmed this request"
                      : "You rejected this request"}
                </Text>
              </View>

              {isPending ? (
                <>
                  <Text
                    style={
                      styles.noteLabel
                    }
                  >
                    Optional note
                  </Text>

                  <TextInput
                    style={
                      styles.noteInput
                    }
                    value={note}
                    onChangeText={
                      setNote
                    }
                    placeholder="Add a short note for this decision..."
                    placeholderTextColor={
                      "#9AA1B2"
                    }
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      decision
                        ? styles.disabledButton
                        : undefined,
                    ]}
                    activeOpacity={0.86}
                    disabled={
                      Boolean(decision)
                    }
                    onPress={() =>
                      void submitDecision(
                        "CONFIRM",
                      )
                    }
                  >
                    {decision ===
                    "CONFIRM" ? (
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />
                    ) : (
                      <>
                        <CheckCircle2
                          size={19}
                          color="#FFFFFF"
                          strokeWidth={2.7}
                        />

                        <Text
                          style={
                            styles.actionText
                          }
                        >
                          Confirm I
                          prescribed /
                          recommended this
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.rejectButton,
                      decision
                        ? styles.disabledButton
                        : undefined,
                    ]}
                    activeOpacity={0.86}
                    disabled={
                      Boolean(decision)
                    }
                    onPress={() =>
                      void submitDecision(
                        "REJECT",
                      )
                    }
                  >
                    {decision ===
                    "REJECT" ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          DANGER_DARK
                        }
                      />
                    ) : (
                      <>
                        <XCircle
                          size={19}
                          color={
                            DANGER_DARK
                          }
                          strokeWidth={2.7}
                        />

                        <Text
                          style={
                            styles.rejectText
                          }
                        >
                          I did not
                          prescribe /
                          recommend this
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <Text
                    style={
                      styles.safetyNote
                    }
                  >
                    Confirming unlocks
                    pharmacy processing.
                    Rejecting closes the
                    current request and
                    notifies the patient.
                  </Text>
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const InfoRow = ({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) => (
  <View
    style={[
      styles.infoRow,
      last
        ? styles.infoRowLast
        : undefined,
    ]}
  >
    <Text style={styles.infoLabel}>
      {label}
    </Text>

    <Text style={styles.infoValue}>
      {value}
    </Text>
  </View>
);

const styles =
  StyleSheet.create({
    flex: {
      flex: 1,
    },

    safeArea: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },

    header: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 14,
      flexDirection: "row",
      alignItems: "center",
    },

    backButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: SURFACE,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      ...elevate(),
    },

    headerText: {
      flex: 1,
    },

    title: {
      color: TEXT,
      fontSize: 21,
      fontWeight: "700",
    },

    subtitle: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 3,
    },

    content: {
      paddingHorizontal: 16,
    },

    stateCard: {
      backgroundColor: SURFACE,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
      ...elevate(),
    },

    stateText: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 18,
      textAlign: "center",
      marginTop: 8,
    },

    errorTitle: {
      color: TEXT,
      fontSize: 16,
      fontWeight: "700",
    },

    retryButton: {
      backgroundColor:
        DOCTOR_PRIMARY,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 11,
      marginTop: 14,
    },

    retryText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
    },

    verificationCard: {
      backgroundColor:
        DOCTOR_LIGHT,
      borderRadius: 16,
      padding: 15,
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },

    verificationIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: SURFACE,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    verificationText: {
      flex: 1,
    },

    verificationTitle: {
      color: DOCTOR_DARK,
      fontSize: 14,
      fontWeight: "700",
    },

    verificationBody: {
      color: "#416A67",
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 18,
      marginTop: 4,
    },

    card: {
      backgroundColor: SURFACE,
      borderRadius: 16,
      padding: 15,
      marginBottom: 11,
      ...elevate(),
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },

    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 13,
      backgroundColor:
        DOCTOR_LIGHT,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    cardHeaderText: {
      flex: 1,
    },

    cardLabel: {
      color: MUTED,
      fontSize: 10,
      fontWeight: "700",
      textTransform:
        "uppercase",
      letterSpacing: 0.5,
    },

    cardTitle: {
      color: TEXT,
      fontSize: 15,
      fontWeight: "700",
      marginTop: 2,
    },

    viewPatient: {
      color: DOCTOR_PRIMARY,
      fontSize: 12,
      fontWeight: "700",
    },

    infoRow: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },

    infoRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 2,
    },

    infoLabel: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "600",
    },

    infoValue: {
      color: TEXT,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19,
      marginTop: 3,
    },

    statusCard: {
      backgroundColor:
        WARNING_LIGHT,
      borderRadius: 13,
      paddingHorizontal: 13,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },

    statusText: {
      fontSize: 12,
      fontWeight: "700",
      marginLeft: 8,
      flex: 1,
    },

    noteLabel: {
      color: TEXT,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 7,
    },

    noteInput: {
      minHeight: 94,
      backgroundColor: SURFACE,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: BORDER,
      color: TEXT,
      fontSize: 13,
      fontWeight: "600",
      paddingHorizontal: 13,
      paddingVertical: 12,
      marginBottom: 12,
    },

    confirmButton: {
      minHeight: 52,
      backgroundColor:
        DOCTOR_PRIMARY,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },

    rejectButton: {
      minHeight: 52,
      backgroundColor:
        DANGER_LIGHT,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      marginTop: 10,
    },

    disabledButton: {
      opacity: 0.55,
    },

    actionText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
      marginLeft: 8,
      textAlign: "center",
    },

    rejectText: {
      color: DANGER_DARK,
      fontSize: 13,
      fontWeight: "700",
      marginLeft: 8,
      textAlign: "center",
    },

    safetyNote: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "600",
      lineHeight: 17,
      textAlign: "center",
      marginTop: 12,
      paddingHorizontal: 8,
    },
  });