import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardCheck,
  Pill,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  doctorRefillVerificationsApi,
  type DoctorRefillVerificationRequest,
} from "../../services/doctor/doctorRefillVerificationsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "DoctorRefillVerifications"
>;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#747C91";
const BORDER = "#E1E6EF";

const DOCTOR = "#0F766E";
const DOCTOR_DARK = "#115E59";
const DOCTOR_LIGHT = "#E8F7F5";

const WARNING = "#B76A08";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const RIPPLE = "rgba(17, 25, 54, 0.08)";

const formatDateTime = (
  value: string | null | undefined,
) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getMedicineName = (
  request: DoctorRefillVerificationRequest,
) => {
  const firstItem = request.items?.[0];

  return (
    firstItem?.name ||
    "Medicine request"
  );
};

const getMedicineSummary = (
  request: DoctorRefillVerificationRequest,
) => {
  const firstItem = request.items?.[0];

  if (!firstItem) {
    return "Medicine details unavailable";
  }

  return [
    firstItem.dose,
    firstItem.quantity,
  ]
    .filter(Boolean)
    .join(" • ") || "Details not specified";
};

export const DoctorRefillVerificationsScreen = ({
  navigation,
}: Props) => {
  const [requests, setRequests] = useState<
    DoctorRefillVerificationRequest[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadRequests = useCallback(
    async (
      mode: "initial" | "refresh" = "initial",
    ) => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        }

        if (mode === "refresh") {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const result =
          await doctorRefillVerificationsApi.listPending();

        setRequests(
          result.requests || [],
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load medicine verification requests.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadRequests("initial");
    }, [loadRequests]),
  );

  const openRequest = (
    request: DoctorRefillVerificationRequest,
  ) => {
    navigation.navigate(
      "DoctorRefillVerificationDetail",
      {
        submissionId: request.id,
      },
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >
      <StatusBar
        backgroundColor={BACKGROUND}
        barStyle="dark-content"
      />

      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            android_ripple={{
              color: RIPPLE,
            }}
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <ArrowLeft
              size={23}
              color={TEXT}
              strokeWidth={2.5}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Medicine verification
            </Text>

            <Text style={styles.subtitle}>
              Patient refill claims awaiting your review
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                isRefreshing
              }
              onRefresh={() =>
                void loadRequests(
                  "refresh",
                )
              }
              tintColor={DOCTOR}
              colors={[DOCTOR]}
            />
          }
        >
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <ShieldCheck
                size={22}
                color={DOCTOR_DARK}
                strokeWidth={2.5}
              />
            </View>

            <View style={styles.infoText}>
              <Text
                style={styles.infoTitle}
              >
                Doctor confirmation
              </Text>

              <Text
                style={
                  styles.infoDescription
                }
              >
                These patients have stated
                that you prescribed or
                recommended a medicine.
                Confirm only requests you
                recognise. Confirmation
                unlocks pharmacy
                fulfilment for that
                request.
              </Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator
                color={DOCTOR}
              />

              <Text
                style={styles.stateTitle}
              >
                Loading requests
              </Text>

              <Text
                style={styles.stateText}
              >
                Checking pending medicine
                verification requests.
              </Text>
            </View>
          ) : null}

          {!isLoading &&
          errorMessage ? (
            <View style={styles.stateBox}>
              <View
                style={styles.errorIcon}
              >
                <RefreshCw
                  size={24}
                  color={DANGER}
                  strokeWidth={2.5}
                />
              </View>

              <Text
                style={styles.stateTitle}
              >
                Unable to load requests
              </Text>

              <Text
                style={styles.stateText}
              >
                {errorMessage}
              </Text>

              <Pressable
                android_ripple={{
                  color: RIPPLE,
                }}
                style={styles.retryButton}
                onPress={() =>
                  void loadRequests(
                    "initial",
                  )
                }
              >
                <RefreshCw
                  size={16}
                  color={SURFACE}
                  strokeWidth={2.5}
                />

                <Text
                  style={
                    styles.retryText
                  }
                >
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!isLoading &&
          !errorMessage &&
          requests.length === 0 ? (
            <View style={styles.stateBox}>
              <View style={styles.emptyIcon}>
                <ClipboardCheck
                  size={28}
                  color={DOCTOR}
                  strokeWidth={2.4}
                />
              </View>

              <Text
                style={styles.stateTitle}
              >
                No pending requests
              </Text>

              <Text
                style={styles.stateText}
              >
                Patient medicine claims
                assigned to you will appear
                here when confirmation is
                required.
              </Text>
            </View>
          ) : null}

          {!isLoading &&
          !errorMessage &&
          requests.length > 0 ? (
            <>
              <View
                style={
                  styles.sectionHeader
                }
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Pending requests
                </Text>

                <View
                  style={styles.countBadge}
                >
                  <Text
                    style={
                      styles.countText
                    }
                  >
                    {requests.length}
                  </Text>
                </View>
              </View>

              <View
                style={styles.requestList}
              >
                {requests.map(
                  (request, index) => (
                    <Pressable
                      key={request.id}
                      android_ripple={{
                        color: RIPPLE,
                      }}
                      style={[
                        styles.requestCard,

                        index ===
                        requests.length -
                          1
                          ? styles.lastCard
                          : undefined,
                      ]}
                      onPress={() =>
                        openRequest(
                          request,
                        )
                      }
                    >
                      <View
                        style={
                          styles.medicineIcon
                        }
                      >
                        <Pill
                          size={22}
                          color={DOCTOR}
                          strokeWidth={
                            2.5
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.requestContent
                        }
                      >
                        <Text
                          style={
                            styles.medicineName
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {getMedicineName(
                            request,
                          )}
                        </Text>

                        <Text
                          style={
                            styles.medicineMeta
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {getMedicineSummary(
                            request,
                          )}
                        </Text>

                        <View
                          style={
                            styles.patientRow
                          }
                        >
                          <UserRound
                            size={13}
                            color={MUTED}
                            strokeWidth={
                              2.3
                            }
                          />

                          <Text
                            style={
                              styles.patientName
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {
                              request
                                .patient
                                .fullName
                            }
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.requestDate
                          }
                        >
                          Requested{" "}
                          {formatDateTime(
                            request.doctorVerificationRequestedAt ||
                              request.createdAt,
                          )}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.cardRight
                        }
                      >
                        <View
                          style={
                            styles.pendingBadge
                          }
                        >
                          <Text
                            style={
                              styles.pendingText
                            }
                          >
                            Pending
                          </Text>
                        </View>

                        <ChevronRight
                          size={19}
                          color={MUTED}
                          strokeWidth={
                            2.5
                          }
                        />
                      </View>
                    </Pressable>
                  ),
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default DoctorRefillVerificationsScreen;

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
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "700",
  },

  subtitle: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: 44,
  },

  infoCard: {
    backgroundColor: DOCTOR_LIGHT,
    borderRadius: 15,
    padding: 14,
    flexDirection: "row",
    marginTop: 6,
  },

  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  infoText: {
    flex: 1,
  },

  infoTitle: {
    color: DOCTOR_DARK,
    fontSize: 13,
    fontWeight: "700",
  },

  infoDescription: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 16,
    marginTop: 4,
  },

  stateBox: {
    backgroundColor: SURFACE,
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 34,
    alignItems: "center",
    marginTop: 18,
  },

  stateTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },

  stateText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 16,
    textAlign: "center",
    marginTop: 5,
  },

  errorIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  retryButton: {
    minHeight: 42,
    backgroundColor: DOCTOR,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },

  retryText: {
    color: SURFACE,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 10,
  },

  sectionTitle: {
    flex: 1,
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
  },

  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },

  countText: {
    color: DOCTOR_DARK,
    fontSize: 10,
    fontWeight: "700",
  },

  requestList: {
    backgroundColor: SURFACE,
    borderRadius: 15,
    overflow: "hidden",
  },

  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 14,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },

  lastCard: {
    borderBottomWidth: 0,
  },

  medicineIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  requestContent: {
    flex: 1,
    minWidth: 0,
  },

  medicineName: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  medicineMeta: {
    color: DOCTOR_DARK,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 3,
  },

  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  patientName: {
    flex: 1,
    color: TEXT,
    fontSize: 9,
    fontWeight: "600",
    marginLeft: 5,
  },

  requestDate: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "500",
    marginTop: 4,
  },

  cardRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: 48,
    marginLeft: 8,
  },

  pendingBadge: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  pendingText: {
    color: WARNING,
    fontSize: 8,
    fontWeight: "700",
  },
});