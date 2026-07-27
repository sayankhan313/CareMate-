import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  HeartPulse,
  NotebookPen,
  Pill,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  doctorPatientsApi,
  type DoctorAssignedPatient,
} from "../../services/doctor/doctorPatientsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "DoctorSelectNotePatient"
>;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";

const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_DARK = "#134E4A";
const DOCTOR_LIGHT = "#E6FFFA";

const SUCCESS_LIGHT = "#EAF8F2";
const SUCCESS_DARK = "#167A58";

const WARNING_LIGHT = "#FFF3E2";
const WARNING_DARK = "#A85A13";

const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";
const DANGER_DARK = "#B42318";

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity:
    Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: {
    width: 0,
    height: level === 1 ? 2 : 4,
  },
});

const getInitials = (
  name?: string | null
) => {
  if (!name) {
    return "P";
  }

  const parts = name
    .trim()
    .split(" ")
    .filter(Boolean);

  if (parts.length === 0) {
    return "P";
  }

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return `${parts[0].charAt(
    0
  )}${parts[1].charAt(
    0
  )}`.toUpperCase();
};

const getAgeText = (
  dateOfBirth?: string | null
) => {
  if (!dateOfBirth) {
    return "Age not set";
  }

  const dateMatch =
    dateOfBirth.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

  const birthDate = dateMatch
    ? new Date(
        Number(dateMatch[3]),
        Number(dateMatch[2]) - 1,
        Number(dateMatch[1])
      )
    : new Date(dateOfBirth);

  if (
    Number.isNaN(
      birthDate.getTime()
    )
  ) {
    return "Age not set";
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    birthDate.getFullYear();

  const monthDifference =
    today.getMonth() -
    birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() <
        birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0
    ? `${age} yrs`
    : "Age not set";
};

const formatDateTime = (
  value?: string | null
) => {
  if (!value) {
    return "No recent reading";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Updated recently";
  }

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getVitalTone = (
  status?: string | null
) => {
  if (status === "CRITICAL") {
    return {
      background: DANGER_LIGHT,
      text: DANGER_DARK,
      label: "Critical",
    };
  }

  if (status === "WARNING") {
    return {
      background: WARNING_LIGHT,
      text: WARNING_DARK,
      label: "Warning",
    };
  }

  if (status === "STABLE") {
    return {
      background: SUCCESS_LIGHT,
      text: SUCCESS_DARK,
      label: "Stable",
    };
  }

  return {
    background: DOCTOR_LIGHT,
    text: DOCTOR_DARK,
    label: "No vitals",
  };
};

const DoctorSelectNotePatientScreen =
  ({ navigation }: Props) => {
    const insets =
      useSafeAreaInsets();

    const [
      patients,
      setPatients,
    ] = useState<
      DoctorAssignedPatient[]
    >([]);

    const [
      searchText,
      setSearchText,
    ] = useState("");

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

    const filteredPatients =
      useMemo(() => {
        const query = searchText
          .trim()
          .toLowerCase();

        if (!query) {
          return patients;
        }

        return patients.filter(
          (assignment) => {
            const patient =
              assignment.patient;

            return [
              patient.fullName,
              patient.email,
              patient.phoneNumber ||
                "",
            ].some((value) =>
              value
                .toLowerCase()
                .includes(query)
            );
          }
        );
      }, [
        patients,
        searchText,
      ]);

    const loadPatients =
      useCallback(
        async (
          mode:
            | "initial"
            | "refresh" = "initial"
        ) => {
          try {
            if (
              mode === "initial"
            ) {
              setIsLoading(true);
            } else {
              setIsRefreshing(true);
            }

            setErrorMessage("");

            const result =
              await doctorPatientsApi.getAssignedPatients();

            setPatients(
              result.patients || []
            );
          } catch (error) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Unable to load assigned patients."
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
        void loadPatients(
          "initial"
        );
      }, [loadPatients])
    );

    const openNoteComposer = (
      assignment: DoctorAssignedPatient
    ) => {
      navigation.navigate(
        "DoctorAddNote",
        {
          patientId:
            assignment.patient.id,
          patientName:
            assignment.patient
              .fullName,
        }
      );
    };

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
              activeOpacity={0.86}
              onPress={() =>
                navigation.goBack()
              }
            >
              <ArrowLeft
                size={22}
                color={DOCTOR_PRIMARY}
                strokeWidth={2.7}
              />
            </TouchableOpacity>

            <View
              style={
                styles.appBarText
              }
            >
              <Text
                style={
                  styles.appBarTitle
                }
              >
                Select Patient
              </Text>

              <Text
                style={
                  styles.appBarSubtitle
                }
              >
                Choose an assigned
                patient for the note
              </Text>
            </View>
          </View>

          <ScrollView
            style={
              styles.scrollView
            }
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom:
                  Math.max(
                    28,
                    insets.bottom +
                      24
                  ),
              },
            ]}
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={
                  isRefreshing
                }
                onRefresh={() =>
                  void loadPatients(
                    "refresh"
                  )
                }
                tintColor={
                  DOCTOR_PRIMARY
                }
                colors={[
                  DOCTOR_PRIMARY,
                ]}
              />
            }
          >
            <View
              style={styles.heroCard}
            >
              <View
                style={styles.heroIcon}
              >
                <NotebookPen
                  size={26}
                  color={
                    DOCTOR_PRIMARY
                  }
                  strokeWidth={2.7}
                />
              </View>

              <View
                style={
                  styles.heroTextBlock
                }
              >
                <Text
                  style={
                    styles.heroTitle
                  }
                >
                  Add doctor note
                </Text>

                <Text
                  style={
                    styles.heroText
                  }
                >
                  Select a patient,
                  write the note, and
                  save it directly to
                  their care record.
                </Text>
              </View>
            </View>

            <View
              style={
                styles.searchBox
              }
            >
              <Search
                size={20}
                color={MUTED}
                strokeWidth={2.5}
              />

              <TextInput
                style={
                  styles.searchInput
                }
                value={searchText}
                onChangeText={
                  setSearchText
                }
                placeholder="Search name, email or phone"
                placeholderTextColor="#A8B0C2"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

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
                  Assigned Patients
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  {filteredPatients.length ===
                  1
                    ? "1 patient"
                    : `${filteredPatients.length} patients`}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.refreshButton
                }
                activeOpacity={0.86}
                onPress={() =>
                  void loadPatients(
                    "refresh"
                  )
                }
              >
                <RefreshCw
                  size={19}
                  color={
                    DOCTOR_PRIMARY
                  }
                  strokeWidth={2.6}
                />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View
                style={
                  styles.stateCard
                }
              >
                <ActivityIndicator
                  color={
                    DOCTOR_PRIMARY
                  }
                />

                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  Loading patients...
                </Text>

                <Text
                  style={
                    styles.stateText
                  }
                >
                  Please wait a moment.
                </Text>
              </View>
            ) : null}

            {!isLoading &&
            errorMessage ? (
              <View
                style={
                  styles.stateCard
                }
              >
                <View
                  style={
                    styles.errorIcon
                  }
                >
                  <AlertCircle
                    size={27}
                    color={DANGER}
                    strokeWidth={2.7}
                  />
                </View>

                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  Unable to load
                  patients
                </Text>

                <Text
                  style={
                    styles.stateText
                  }
                >
                  {errorMessage}
                </Text>

                <TouchableOpacity
                  style={
                    styles.retryButton
                  }
                  activeOpacity={0.86}
                  onPress={() =>
                    void loadPatients(
                      "initial"
                    )
                  }
                >
                  <RefreshCw
                    size={17}
                    color={SURFACE}
                    strokeWidth={2.5}
                  />

                  <Text
                    style={
                      styles.retryButtonText
                    }
                  >
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!isLoading &&
            !errorMessage &&
            filteredPatients.length ===
              0 ? (
              <View
                style={
                  styles.stateCard
                }
              >
                <View
                  style={
                    styles.emptyIcon
                  }
                >
                  <UserRound
                    size={28}
                    color={
                      DOCTOR_PRIMARY
                    }
                    strokeWidth={2.7}
                  />
                </View>

                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  {patients.length ===
                  0
                    ? "No assigned patients"
                    : "No matching patient"}
                </Text>

                <Text
                  style={
                    styles.stateText
                  }
                >
                  {patients.length ===
                  0
                    ? "Patients will appear after they select you as their doctor."
                    : "Try a different name, email or phone number."}
                </Text>
              </View>
            ) : null}

            {!isLoading &&
            !errorMessage &&
            filteredPatients.length >
              0 ? (
              <View
                style={
                  styles.patientList
                }
              >
                {filteredPatients.map(
                  (assignment) => (
                    <PatientCard
                      key={
                        assignment.assignmentId
                      }
                      assignment={
                        assignment
                      }
                      onPress={() =>
                        openNoteComposer(
                          assignment
                        )
                      }
                    />
                  )
                )}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  };

const PatientCard = ({
  assignment,
  onPress,
}: {
  assignment: DoctorAssignedPatient;
  onPress: () => void;
}) => {
  const patient =
    assignment.patient;

  const tone = getVitalTone(
    assignment.latestVital
      ?.status
  );

  return (
    <TouchableOpacity
      style={styles.patientCard}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <View
        style={
          styles.patientTopRow
        }
      >
        <View
          style={
            styles.patientAvatar
          }
        >
          <Text
            style={
              styles.patientAvatarText
            }
          >
            {getInitials(
              patient.fullName
            )}
          </Text>
        </View>

        <View
          style={
            styles.patientIdentity
          }
        >
          <Text
            style={
              styles.patientName
            }
            numberOfLines={1}
          >
            {patient.fullName}
          </Text>

          <Text
            style={
              styles.patientMeta
            }
            numberOfLines={1}
          >
            {getAgeText(
              patient.dateOfBirth
            )}{" "}
            •{" "}
            {patient.gender ||
              "Gender not set"}
          </Text>

          <Text
            style={
              styles.patientEmail
            }
            numberOfLines={1}
          >
            {patient.email}
          </Text>
        </View>

        <ChevronRight
          size={20}
          color={MUTED}
          strokeWidth={2.6}
        />
      </View>

      <View
        style={
          styles.patientStats
        }
      >
        <View
          style={[
            styles.statusChip,
            {
              backgroundColor:
                tone.background,
            },
          ]}
        >
          <HeartPulse
            size={14}
            color={tone.text}
            strokeWidth={2.5}
          />

          <Text
            style={[
              styles.statusChipText,
              {
                color: tone.text,
              },
            ]}
          >
            {tone.label}
          </Text>
        </View>

        <View
          style={
            styles.medicineChip
          }
        >
          <Pill
            size={14}
            color={DOCTOR_DARK}
            strokeWidth={2.5}
          />

          <Text
            style={
              styles.medicineChipText
            }
          >
            {
              assignment.activeMedicineCount
            }{" "}
            medicine
            {assignment.activeMedicineCount ===
            1
              ? ""
              : "s"}
          </Text>
        </View>

        {assignment.activeAlert ? (
          <View
            style={
              styles.alertChip
            }
          >
            <ShieldAlert
              size={14}
              color={DANGER_DARK}
              strokeWidth={2.5}
            />

            <Text
              style={
                styles.alertChipText
              }
            >
              Active alert
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={
          styles.updatedText
        }
      >
        {assignment.latestVital
          ? `Latest vital: ${formatDateTime(
              assignment
                .latestVital
                .recordedAt
            )}`
          : "No recent vital reading"}
      </Text>
    </TouchableOpacity>
  );
};

export default DoctorSelectNotePatientScreen;

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },
    screen: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },
    appBar: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    backButton: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: SURFACE,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
      ...elevate(1),
    },
    appBarText: {
      flex: 1,
    },
    appBarTitle: {
      color: TEXT,
      fontSize: 24,
      fontWeight: "700",
      letterSpacing: -0.4,
    },
    appBarSubtitle: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 3,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 4,
    },
    heroCard: {
      backgroundColor:
        DOCTOR_PRIMARY,
      borderRadius: 17,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
      ...elevate(2),
    },
    heroIcon: {
      width: 54,
      height: 54,
      borderRadius: 15,
      backgroundColor: SURFACE,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },
    heroTextBlock: {
      flex: 1,
    },
    heroTitle: {
      color: SURFACE,
      fontSize: 18,
      fontWeight: "700",
    },
    heroText: {
      color: "#D7FFFA",
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 18,
      marginTop: 4,
    },
    searchBox: {
      backgroundColor: SURFACE,
      borderRadius: 14,
      minHeight: 50,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      ...elevate(1),
    },
    searchInput: {
      flex: 1,
      color: TEXT,
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 10,
      paddingVertical: 0,
    },
    sectionHeader: {
      marginTop: 20,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },
    sectionTitle: {
      color: TEXT,
      fontSize: 18,
      fontWeight: "700",
    },
    sectionSubtitle: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 3,
    },
    refreshButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: SURFACE,
      alignItems: "center",
      justifyContent:
        "center",
      ...elevate(1),
    },
    stateCard: {
      backgroundColor: SURFACE,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
      ...elevate(1),
    },
    errorIcon: {
      width: 58,
      height: 58,
      borderRadius: 17,
      backgroundColor:
        DANGER_LIGHT,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 2,
    },
    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 17,
      backgroundColor:
        DOCTOR_LIGHT,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 2,
    },
    stateTitle: {
      color: TEXT,
      fontSize: 16,
      fontWeight: "700",
      marginTop: 11,
      textAlign: "center",
    },
    stateText: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 18,
      textAlign: "center",
      marginTop: 6,
    },
    retryButton: {
      backgroundColor:
        DOCTOR_PRIMARY,
      borderRadius: 12,
      paddingHorizontal: 17,
      paddingVertical: 11,
      flexDirection: "row",
      alignItems: "center",
      marginTop: 15,
    },
    retryButtonText: {
      color: SURFACE,
      fontSize: 13,
      fontWeight: "700",
      marginLeft: 7,
    },
    patientList: {
      gap: 11,
    },
    patientCard: {
      backgroundColor: SURFACE,
      borderRadius: 16,
      padding: 14,
      ...elevate(1),
    },
    patientTopRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    patientAvatar: {
      width: 50,
      height: 50,
      borderRadius: 15,
      backgroundColor:
        DOCTOR_LIGHT,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },
    patientAvatarText: {
      color: DOCTOR_PRIMARY,
      fontSize: 16,
      fontWeight: "800",
    },
    patientIdentity: {
      flex: 1,
      paddingRight: 8,
    },
    patientName: {
      color: TEXT,
      fontSize: 15,
      fontWeight: "700",
    },
    patientMeta: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "600",
      marginTop: 3,
    },
    patientEmail: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "600",
      marginTop: 3,
    },
    patientStats: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 12,
    },
    statusChip: {
      minHeight: 30,
      borderRadius: 9,
      paddingHorizontal: 9,
      flexDirection: "row",
      alignItems: "center",
    },
    statusChipText: {
      fontSize: 10,
      fontWeight: "700",
      marginLeft: 5,
    },
    medicineChip: {
      minHeight: 30,
      borderRadius: 9,
      paddingHorizontal: 9,
      backgroundColor:
        DOCTOR_LIGHT,
      flexDirection: "row",
      alignItems: "center",
    },
    medicineChipText: {
      color: DOCTOR_DARK,
      fontSize: 10,
      fontWeight: "700",
      marginLeft: 5,
    },
    alertChip: {
      minHeight: 30,
      borderRadius: 9,
      paddingHorizontal: 9,
      backgroundColor:
        DANGER_LIGHT,
      flexDirection: "row",
      alignItems: "center",
    },
    alertChipText: {
      color: DANGER_DARK,
      fontSize: 10,
      fontWeight: "700",
      marginLeft: 5,
    },
    updatedText: {
      color: MUTED,
      fontSize: 10,
      fontWeight: "600",
      marginTop: 10,
    },
  });