import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  HeartPulse,
  Pill,
  RefreshCw,
  Search,
  UserRound,
  UsersRound,
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
  "DoctorSelectPrescriptionPatient"
>;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";

const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_DARK = "#134E4A";
const DOCTOR_LIGHT = "#E6FFFA";

const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING_DARK = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const elevate = (level: 1 | 2 = 1) => {
  return {
    elevation: level === 1 ? 2 : 4,
    shadowColor: "#172033",
    shadowOffset: {
      width: 0,
      height: level === 1 ? 2 : 4,
    },
    shadowOpacity:
      level === 1 ? 0.06 : 0.1,
    shadowRadius:
      level === 1 ? 4 : 9,
  };
};

const getInitials = (
  name: string
) => {
  const parts = name
    .trim()
    .split(" ")
    .filter(Boolean);

  if (parts.length === 0) {
    return "PT";
  }

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const getAge = (
  dateOfBirth?: string | null
) => {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate =
    new Date(dateOfBirth);

  if (
    Number.isNaN(
      birthDate.getTime()
    )
  ) {
    return null;
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
    (
      monthDifference === 0 &&
      today.getDate() <
        birthDate.getDate()
    )
  ) {
    age -= 1;
  }

  return age >= 0
    ? age
    : null;
};

const formatPatientMeta = (
  patient: DoctorAssignedPatient
) => {
  const age =
    getAge(
      patient.patient.dateOfBirth
    );

  const values: string[] = [];

  if (age !== null) {
    values.push(`${age} years`);
  }

  if (patient.patient.gender) {
    values.push(
      patient.patient.gender
    );
  }

  if (values.length > 0) {
    return values.join(" • ");
  }

  return patient.patient.email;
};

const formatRecordedAt = (
  value?: string | null
) => {
  if (!value) {
    return "No readings yet";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "No readings yet";
  }

  return date.toLocaleString(
    [],
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

const getVitalTone = (
  status?: string | null
) => {
  if (status === "CRITICAL") {
    return {
      background:
        DANGER_LIGHT,
      text: DANGER_DARK,
      label: "Critical",
    };
  }

  if (status === "WARNING") {
    return {
      background:
        WARNING_LIGHT,
      text: WARNING_DARK,
      label: "Warning",
    };
  }

  if (status === "STABLE") {
    return {
      background:
        SUCCESS_LIGHT,
      text: SUCCESS_DARK,
      label: "Stable",
    };
  }

  return {
    background: SOFT_PANEL,
    text: MUTED,
    label: "No vitals",
  };
};

export const DoctorSelectPrescriptionPatientScreen = ({
  navigation,
}: Props) => {
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
            setIsRefreshing(
              true
            );
          }

          setErrorMessage("");

          const result =
            await doctorPatientsApi.getAssignedPatients();

          setPatients(
            result.patients
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

  const filteredPatients =
    useMemo(() => {
      const query =
        searchText
          .trim()
          .toLowerCase();

      if (!query) {
        return patients;
      }

      return patients.filter(
        (patient) => {
          const searchableValues =
            [
              patient.patient
                .fullName,
              patient.patient.email,
              patient.patient
                .phoneNumber || "",
            ];

          return searchableValues.some(
            (value) =>
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

  const openPrescription = (
    patient: DoctorAssignedPatient
  ) => {
    navigation.replace(
      "DoctorPrescription",
      {
        patientId:
          patient.patient.id,
        patientName:
          patient.patient
            .fullName,
      }
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <StatusBar
        backgroundColor={
          BACKGROUND
        }
        barStyle="dark-content"
      />

      <View style={styles.screen}>
        <View style={styles.header}>
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
              color={
                DOCTOR_PRIMARY
              }
              strokeWidth={2.7}
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerTextBlock
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Select Patient
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Choose an assigned patient
              to prescribe for
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                Math.max(
                  30,
                  insets.bottom + 24
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
              style={
                styles.heroIconBox
              }
            >
              <UsersRound
                size={27}
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
                Assigned patients
              </Text>

              <Text
                style={
                  styles.heroText
                }
              >
                Prescriptions can only
                be created for patients
                currently assigned to
                you.
              </Text>
            </View>

            <View
              style={
                styles.heroCountBox
              }
            >
              <Text
                style={
                  styles.heroCount
                }
              >
                {patients.length}
              </Text>

              <Text
                style={
                  styles.heroCountLabel
                }
              >
                Patients
              </Text>
            </View>
          </View>

          <View
            style={
              styles.searchShell
            }
          >
            <Search
              size={20}
              color={
                DOCTOR_PRIMARY
              }
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
              placeholder="Search patient name or email"
              placeholderTextColor={
                MUTED
              }
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
                Choose patient
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                {
                  filteredPatients.length
                }{" "}
                patient
                {filteredPatients.length ===
                1
                  ? ""
                  : "s"}{" "}
                available
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
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          </View>

          {errorMessage ? (
            <View
              style={
                styles.errorCard
              }
            >
              <AlertTriangle
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
                  Unable to load
                  patients
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
                  styles.retryButton
                }
                activeOpacity={0.86}
                onPress={() =>
                  void loadPatients(
                    "initial"
                  )
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
                Checking your active
                patient assignments.
              </Text>
            </View>
          ) : null}

          {!isLoading &&
          !errorMessage &&
          patients.length === 0 ? (
            <View
              style={
                styles.stateCard
              }
            >
              <View
                style={
                  styles.stateIconBox
                }
              >
                <UserRound
                  size={27}
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
                No assigned patients
              </Text>

              <Text
                style={
                  styles.stateText
                }
              >
                Patients will appear
                here after an active
                doctor assignment is
                created.
              </Text>
            </View>
          ) : null}

          {!isLoading &&
          !errorMessage &&
          patients.length > 0 &&
          filteredPatients.length ===
            0 ? (
            <View
              style={
                styles.stateCard
              }
            >
              <View
                style={
                  styles.stateIconBox
                }
              >
                <Search
                  size={26}
                  color={
                    DOCTOR_PRIMARY
                  }
                  strokeWidth={2.6}
                />
              </View>

              <Text
                style={
                  styles.stateTitle
                }
              >
                No matching patient
              </Text>

              <Text
                style={
                  styles.stateText
                }
              >
                Try another name, email
                address or phone
                number.
              </Text>
            </View>
          ) : null}

          {!isLoading &&
          !errorMessage &&
          filteredPatients.length >
            0 ? (
            <View
              style={
                styles.patientStack
              }
            >
              {filteredPatients.map(
                (patient) => (
                  <PatientSelectionCard
                    key={
                      patient.assignmentId
                    }
                    patient={patient}
                    onPress={() =>
                      openPrescription(
                        patient
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

const PatientSelectionCard = ({
  patient,
  onPress,
}: {
  patient: DoctorAssignedPatient;
  onPress: () => void;
}) => {
  const tone =
    getVitalTone(
      patient.latestVital?.status
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
              patient.patient
                .fullName
            )}
          </Text>
        </View>

        <View
          style={
            styles.patientTextBlock
          }
        >
          <Text
            style={
              styles.patientName
            }
            numberOfLines={1}
          >
            {
              patient.patient
                .fullName
            }
          </Text>

          <Text
            style={
              styles.patientMeta
            }
            numberOfLines={1}
          >
            {formatPatientMeta(
              patient
            )}
          </Text>
        </View>

        <View
          style={[
            styles.vitalChip,
            {
              backgroundColor:
                tone.background,
            },
          ]}
        >
          <Text
            style={[
              styles.vitalChipText,
              {
                color: tone.text,
              },
            ]}
          >
            {tone.label}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.patientInfoPanel
        }
      >
        <View
          style={
            styles.patientInfoItem
          }
        >
          <View
            style={
              styles.patientInfoIcon
            }
          >
            <Pill
              size={17}
              color={
                DOCTOR_PRIMARY
              }
              strokeWidth={2.5}
            />
          </View>

          <View>
            <Text
              style={
                styles.patientInfoValue
              }
            >
              {
                patient.activeMedicineCount
              }
            </Text>

            <Text
              style={
                styles.patientInfoLabel
              }
            >
              Active medicines
            </Text>
          </View>
        </View>

        <View
          style={
            styles.patientInfoDivider
          }
        />

        <View
          style={
            styles.patientInfoItem
          }
        >
          <View
            style={
              styles.patientInfoIcon
            }
          >
            <HeartPulse
              size={17}
              color={
                DOCTOR_PRIMARY
              }
              strokeWidth={2.5}
            />
          </View>

          <View
            style={
              styles.patientInfoTextBlock
            }
          >
            <Text
              style={
                styles.patientInfoValue
              }
              numberOfLines={1}
            >
              {formatRecordedAt(
                patient.latestVital
                  ?.recordedAt
              )}
            </Text>

            <Text
              style={
                styles.patientInfoLabel
              }
            >
              Latest vital
            </Text>
          </View>
        </View>
      </View>

      {patient.activeAlert ? (
        <View
          style={
            styles.alertPanel
          }
        >
          <AlertTriangle
            size={17}
            color={DANGER}
            strokeWidth={2.6}
          />

          <Text
            style={
              styles.alertPanelText
            }
            numberOfLines={1}
          >
            Active Safety Response
            alert
          </Text>
        </View>
      ) : null}

      <View
        style={
          styles.cardFooter
        }
      >
        <Text
          style={
            styles.cardFooterText
          }
        >
          Create prescription
        </Text>

        <ChevronRight
          size={19}
          color={
            DOCTOR_PRIMARY
          }
          strokeWidth={2.7}
        />
      </View>
    </TouchableOpacity>
  );
};

export default DoctorSelectPrescriptionPatientScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
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
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
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
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(2),
  },
  heroIconBox: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  heroTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  heroTitle: {
    color: SURFACE,
    fontSize: 17,
    fontWeight: "700",
  },
  heroText: {
    color: "#D7FFFA",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },
  heroCountBox: {
    minWidth: 58,
    borderRadius: 13,
    backgroundColor:
      "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  heroCount: {
    color: SURFACE,
    fontSize: 20,
    fontWeight: "700",
  },
  heroCountLabel: {
    color: "#D7FFFA",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
  searchShell: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: SURFACE,
    paddingHorizontal: 14,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(1),
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 12,
    marginLeft: 9,
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
  errorCard: {
    backgroundColor:
      DANGER_LIGHT,
    borderRadius: 14,
    padding: 14,
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
  retryButton: {
    borderRadius: 10,
    backgroundColor: DANGER,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginLeft: 10,
  },
  retryText: {
    color: SURFACE,
    fontSize: 11,
    fontWeight: "700",
  },
  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    ...elevate(1),
  },
  stateIconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor:
      DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },
  stateTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  stateText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
  },
  patientStack: {
    gap: 11,
  },
  patientCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
    ...elevate(1),
  },
  patientTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor:
      DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  patientAvatarText: {
    color: DOCTOR_PRIMARY,
    fontSize: 14,
    fontWeight: "700",
  },
  patientTextBlock: {
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
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  vitalChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  vitalChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  patientInfoPanel: {
    backgroundColor:
      SOFT_PANEL,
    borderRadius: 13,
    padding: 11,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  patientInfoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  patientInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor:
      DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  patientInfoTextBlock: {
    flex: 1,
  },
  patientInfoValue: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },
  patientInfoLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "500",
    marginTop: 2,
  },
  patientInfoDivider: {
    width: 1,
    height: 34,
    backgroundColor:
      "#E4E8F2",
    marginHorizontal: 10,
  },
  alertPanel: {
    backgroundColor:
      DANGER_LIGHT,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  alertPanelText: {
    flex: 1,
    color: DANGER_DARK,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 7,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  cardFooterText: {
    color: DOCTOR_DARK,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 5,
  },
});