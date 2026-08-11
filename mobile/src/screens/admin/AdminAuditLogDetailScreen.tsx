import {
  useCallback,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
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
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Database,
  FileKey2,
  Fingerprint,
  Globe2,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react-native";

import {
  adminApi,
  type AdminAuditLog,
} from "../../services/adminApi";
import type { RootStackParamList } from "../../types/navigation";

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    "AdminAuditLogDetail"
  >;

type RenderRowOptions = {
  last?: boolean;
  rowKey?: string;
  compact?: boolean;
};

const BACKGROUND = "#F3F1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#1D1B2F";
const MUTED = "#6D687B";
const SOFT = "#F8F6FC";

const ADMIN = "#6750D8";
const ADMIN_DARK = "#4E3BB2";
const ADMIN_CONTAINER = "#EADDFF";

const SUCCESS_CONTAINER = "#DBF3E7";
const SUCCESS_TEXT = "#0F5C3C";

const DANGER_CONTAINER = "#FBDADC";
const DANGER_TEXT = "#8C1D24";

const WARNING_CONTAINER = "#FBE7CD";
const WARNING_TEXT = "#7A4708";

const DIVIDER = "#E7E3EE";

const elevate = (
  level: number
) => ({
  elevation: level,
  shadowColor: "#1B1D2A",
  shadowOpacity:
    Platform.OS === "android"
      ? 0
      : 0.08 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: {
    width: 0,
    height: level * 0.8,
  },
});

const getErrorMessage = (
  error: unknown
) => {
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
};

const formatAction = (
  value: string
) => {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
};

const formatDateTime = (
  value: string
) => {
  const parsedDate = new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "Unknown";
  }

  return parsedDate.toLocaleString(
    [],
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
};

const formatMetadataValue = (
  value: unknown
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not recorded";
  }

  if (
    typeof value === "boolean"
  ) {
    return value ? "Yes" : "No";
  }

  if (
    typeof value === "object"
  ) {
    try {
      return JSON.stringify(
        value,
        null,
        2
      );
    } catch {
      return "Structured value";
    }
  }

  return String(value);
};

const getShortId = (
  value?: string | null
) => {
  if (!value) {
    return "Not recorded";
  }

  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(
    0,
    8
  )}…${value.slice(-4)}`;
};

export const AdminAuditLogDetailScreen =
  ({
    navigation,
    route,
  }: Props) => {
    const insets =
      useSafeAreaInsets();

    const [
      auditLog,
      setAuditLog,
    ] =
      useState<AdminAuditLog | null>(
        null
      );

    const [
      isLoading,
      setIsLoading,
    ] = useState(true);

    const [
      errorMessage,
      setErrorMessage,
    ] = useState("");

    const [
      showRequestContext,
      setShowRequestContext,
    ] = useState(false);

    const loadDetail =
      useCallback(async () => {
        try {
          setIsLoading(true);
          setErrorMessage("");

          const result =
            await adminApi.getAuditLogDetail(
              route.params
                .auditLogId
            );

          setAuditLog(result);
        } catch (error) {
          setErrorMessage(
            getErrorMessage(error)
          );
        } finally {
          setIsLoading(false);
        }
      }, [
        route.params.auditLogId,
      ]);

    useFocusEffect(
      useCallback(() => {
        loadDetail();
      }, [loadDetail])
    );

    const renderRow = (
      label: string,
      value?: string | null,
      options: RenderRowOptions = {}
    ) => {
      return (
        <View
          key={options.rowKey}
          style={[
            styles.detailRow,
            options.compact &&
              styles.compactDetailRow,
            options.last &&
              styles.lastDetailRow,
          ]}
        >
          <Text
            style={styles.detailLabel}
          >
            {label}
          </Text>

          <Text
            style={styles.detailValue}
            selectable
          >
            {value ||
              "Not recorded"}
          </Text>
        </View>
      );
    };

    const isSuccess =
      auditLog?.outcome ===
      "SUCCESS";

    const requestContextAvailable =
      Boolean(
        auditLog?.requestMethod ||
          auditLog?.requestPath ||
          auditLog?.ipAddress ||
          auditLog?.userAgent
      );

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

        <View
          style={styles.topBar}
        >
          <TouchableOpacity
            style={
              styles.backButton
            }
            activeOpacity={0.82}
            onPress={() =>
              navigation.goBack()
            }
          >
            <ArrowLeft
              size={21}
              color={TEXT}
              strokeWidth={2.5}
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerText
            }
          >
            <Text
              style={styles.kicker}
            >
              Security record
            </Text>

            <Text
              style={styles.title}
            >
              Audit detail
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.refreshButton
            }
            activeOpacity={0.82}
            onPress={loadDetail}
          >
            <RefreshCw
              size={19}
              color={ADMIN}
              strokeWidth={2.4}
            />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View
            style={
              styles.centredState
            }
          >
            <View
              style={
                styles.loadingIconBox
              }
            >
              <ActivityIndicator
                size="large"
                color={ADMIN}
              />
            </View>

            <Text
              style={
                styles.stateTitle
              }
            >
              Loading audit record
            </Text>

            <Text
              style={
                styles.stateText
              }
            >
              Retrieving the secure
              event details.
            </Text>
          </View>
        ) : errorMessage ||
          !auditLog ? (
          <View
            style={
              styles.centredState
            }
          >
            <View
              style={
                styles.errorIcon
              }
            >
              <AlertCircle
                size={28}
                color={
                  DANGER_TEXT
                }
                strokeWidth={2.5}
              />
            </View>

            <Text
              style={
                styles.stateTitle
              }
            >
              Unable to load audit
              record
            </Text>

            <Text
              style={
                styles.stateText
              }
            >
              {errorMessage ||
                "Audit record was not found."}
            </Text>

            <TouchableOpacity
              style={
                styles.retryButton
              }
              activeOpacity={0.84}
              onPress={loadDetail}
            >
              <RefreshCw
                size={17}
                color="#FFFFFF"
                strokeWidth={2.5}
              />

              <Text
                style={
                  styles.retryText
                }
              >
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom:
                  Math.max(
                    insets.bottom +
                      28,
                    44
                  ),
              },
            ]}
          >
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor:
                    isSuccess
                      ? SUCCESS_CONTAINER
                      : DANGER_CONTAINER,
                },
              ]}
            >
              <View
                style={[
                  styles.heroAccent,
                  {
                    backgroundColor:
                      isSuccess
                        ? SUCCESS_TEXT
                        : DANGER_TEXT,
                  },
                ]}
              />

              <View
                style={[
                  styles.heroIcon,
                  {
                    backgroundColor:
                      isSuccess
                        ? "rgba(15,92,60,0.10)"
                        : "rgba(140,29,36,0.10)",
                  },
                ]}
              >
                {isSuccess ? (
                  <CheckCircle2
                    size={29}
                    color={
                      SUCCESS_TEXT
                    }
                    strokeWidth={2.5}
                  />
                ) : (
                  <XCircle
                    size={29}
                    color={
                      DANGER_TEXT
                    }
                    strokeWidth={2.5}
                  />
                )}
              </View>

              <View
                style={
                  styles.heroContent
                }
              >
                <View
                  style={
                    styles.heroStatusRow
                  }
                >
                  <View
                    style={[
                      styles.heroOutcomeBadge,
                      {
                        backgroundColor:
                          isSuccess
                            ? "rgba(15,92,60,0.10)"
                            : "rgba(140,29,36,0.10)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.heroOutcome,
                        {
                          color:
                            isSuccess
                              ? SUCCESS_TEXT
                              : DANGER_TEXT,
                        },
                      ]}
                    >
                      {
                        auditLog.outcome
                      }
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.heroRecordId
                    }
                  >
                    #
                    {getShortId(
                      auditLog.id
                    )}
                  </Text>
                </View>

                <Text
                  style={
                    styles.heroTitle
                  }
                >
                  {formatAction(
                    auditLog.action
                  )}
                </Text>

                <Text
                  style={
                    styles.heroDescription
                  }
                >
                  {
                    auditLog.description
                  }
                </Text>
              </View>
            </View>

            <View
              style={
                styles.quickFactsRow
              }
            >
              <View
                style={
                  styles.quickFactCard
                }
              >
                <UserRound
                  size={18}
                  color={ADMIN}
                  strokeWidth={2.4}
                />

                <Text
                  style={
                    styles.quickFactValue
                  }
                  numberOfLines={1}
                >
                  {
                    auditLog.actorRole
                  }
                </Text>

                <Text
                  style={
                    styles.quickFactLabel
                  }
                >
                  Actor role
                </Text>
              </View>

              <View
                style={
                  styles.quickFactCard
                }
              >
                <Database
                  size={18}
                  color={ADMIN}
                  strokeWidth={2.4}
                />

                <Text
                  style={
                    styles.quickFactValue
                  }
                  numberOfLines={1}
                >
                  {formatAction(
                    auditLog.entityType
                  )}
                </Text>

                <Text
                  style={
                    styles.quickFactLabel
                  }
                >
                  Entity
                </Text>
              </View>

              <View
                style={
                  styles.quickFactCard
                }
              >
                <Clock3
                  size={18}
                  color={ADMIN}
                  strokeWidth={2.4}
                />

                <Text
                  style={
                    styles.quickFactValue
                  }
                  numberOfLines={1}
                >
                  {new Date(
                    auditLog.createdAt
                  ).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute:
                        "2-digit",
                    }
                  )}
                </Text>

                <Text
                  style={
                    styles.quickFactLabel
                  }
                >
                  Event time
                </Text>
              </View>
            </View>

            <View
              style={
                styles.sectionHeading
              }
            >
              <View
                style={
                  styles.sectionIconBox
                }
              >
                <ShieldCheck
                  size={18}
                  color={ADMIN}
                  strokeWidth={2.4}
                />
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Event overview
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Core event and entity
                  details
                </Text>
              </View>
            </View>

            <View
              style={
                styles.detailCard
              }
            >
              {renderRow(
                "Action",
                formatAction(
                  auditLog.action
                )
              )}

              {renderRow(
                "Entity type",
                formatAction(
                  auditLog.entityType
                )
              )}

              {renderRow(
                "Entity ID",
                auditLog.entityId
              )}

              {renderRow(
                "Created",
                formatDateTime(
                  auditLog.createdAt
                ),
                {
                  last: true,
                }
              )}
            </View>

            <View
              style={
                styles.sectionHeading
              }
            >
              <View
                style={
                  styles.sectionIconBox
                }
              >
                <UserRound
                  size={18}
                  color={ADMIN}
                  strokeWidth={2.4}
                />
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Actor
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Account responsible
                  for this action
                </Text>
              </View>
            </View>

            <View
              style={
                styles.identityCard
              }
            >
              <View
                style={
                  styles.identityAvatar
                }
              >
                <Text
                  style={
                    styles.identityAvatarText
                  }
                >
                  {(
                    auditLog.actor
                      ?.fullName ||
                    (auditLog.actorRole ===
                    "SYSTEM"
                      ? "S"
                      : "U")
                  )
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>

              <View
                style={
                  styles.identityContent
                }
              >
                <Text
                  style={
                    styles.identityName
                  }
                >
                  {auditLog.actor
                    ?.fullName ||
                    (auditLog.actorRole ===
                    "SYSTEM"
                      ? "CareMate+ System"
                      : "Unknown actor")}
                </Text>

                <Text
                  style={
                    styles.identityEmail
                  }
                  numberOfLines={1}
                >
                  {auditLog.actor
                    ?.email ||
                    "No email recorded"}
                </Text>
              </View>

              <View
                style={
                  styles.identityRoleBadge
                }
              >
                <Text
                  style={
                    styles.identityRoleText
                  }
                >
                  {
                    auditLog.actorRole
                  }
                </Text>
              </View>
            </View>

            <View
              style={
                styles.detailCard
              }
            >
              {renderRow(
                "Actor ID",
                auditLog.actorId,
                {
                  last: true,
                }
              )}
            </View>

            {auditLog.patientId ||
            auditLog.patient ? (
              <>
                <View
                  style={
                    styles.sectionHeading
                  }
                >
                  <View
                    style={
                      styles.sectionIconBox
                    }
                  >
                    <UsersRound
                      size={18}
                      color={ADMIN}
                      strokeWidth={2.4}
                    />
                  </View>

                  <View>
                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      Patient reference
                    </Text>

                    <Text
                      style={
                        styles.sectionSubtitle
                      }
                    >
                      Patient connected
                      to this event
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.identityCard
                  }
                >
                  <View
                    style={[
                      styles.identityAvatar,
                      styles.patientAvatar,
                    ]}
                  >
                    <Text
                      style={
                        styles.patientAvatarText
                      }
                    >
                      {(
                        auditLog
                          .patient
                          ?.fullName ||
                        "P"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.identityContent
                    }
                  >
                    <Text
                      style={
                        styles.identityName
                      }
                    >
                      {auditLog.patient
                        ?.fullName ||
                        "Patient"}
                    </Text>

                    <Text
                      style={
                        styles.identityEmail
                      }
                      numberOfLines={1}
                    >
                      {auditLog.patient
                        ?.email ||
                        "No email recorded"}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.detailCard
                  }
                >
                  {renderRow(
                    "Patient ID",
                    auditLog.patientId,
                    {
                      last: true,
                    }
                  )}
                </View>
              </>
            ) : null}

            <View
              style={
                styles.sectionHeading
              }
            >
              <View
                style={
                  styles.sectionIconBox
                }
              >
                <Database
                  size={18}
                  color={ADMIN}
                  strokeWidth={2.4}
                />
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Safe metadata
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Non-sensitive event
                  context
                </Text>
              </View>
            </View>

            <View
              style={
                styles.detailCard
              }
            >
              {auditLog.metadata &&
              Object.keys(
                auditLog.metadata
              ).length > 0 ? (
                Object.entries(
                  auditLog.metadata
                ).map(
                  (
                    [
                      metadataKey,
                      metadataValue,
                    ],
                    index,
                    entries
                  ) =>
                    renderRow(
                      formatAction(
                        metadataKey
                      ),
                      formatMetadataValue(
                        metadataValue
                      ),
                      {
                        rowKey: `${auditLog.id}-metadata-${metadataKey}-${index}`,
                        last:
                          index ===
                          entries.length -
                            1,
                      }
                    )
                )
              ) : (
                <View
                  style={
                    styles.noMetadata
                  }
                >
                  <FileKey2
                    size={23}
                    color={MUTED}
                    strokeWidth={2.3}
                  />

                  <Text
                    style={
                      styles.noMetadataTitle
                    }
                  >
                    No additional
                    metadata
                  </Text>

                  <Text
                    style={
                      styles.noMetadataText
                    }
                  >
                    No extra safe
                    information was
                    required for this
                    event.
                  </Text>
                </View>
              )}
            </View>

            <View
              style={
                styles.sectionHeading
              }
            >
              <View
                style={
                  styles.technicalSectionIcon
                }
              >
                <Globe2
                  size={18}
                  color={
                    WARNING_TEXT
                  }
                  strokeWidth={2.4}
                />
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Technical request
                  context
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Useful during security
                  investigation
                </Text>
              </View>
            </View>

            <View
              style={
                styles.technicalCard
              }
            >
              <TouchableOpacity
                style={
                  styles.technicalHeader
                }
                activeOpacity={0.84}
                onPress={() =>
                  setShowRequestContext(
                    (current) =>
                      !current
                  )
                }
              >
                <View
                  style={
                    styles.technicalHeaderIcon
                  }
                >
                  <Fingerprint
                    size={20}
                    color={
                      WARNING_TEXT
                    }
                    strokeWidth={2.4}
                  />
                </View>

                <View
                  style={
                    styles.technicalHeaderContent
                  }
                >
                  <Text
                    style={
                      styles.technicalHeaderTitle
                    }
                  >
                    {requestContextAvailable
                      ? `${auditLog.requestMethod || "Request"} context`
                      : "No request context"}
                  </Text>

                  <Text
                    style={
                      styles.technicalHeaderText
                    }
                    numberOfLines={
                      showRequestContext
                        ? undefined
                        : 1
                    }
                  >
                    {auditLog.requestPath ||
                      "No endpoint information was recorded."}
                  </Text>
                </View>

                <View
                  style={
                    styles.technicalChevron
                  }
                >
                  {showRequestContext ? (
                    <ChevronUp
                      size={19}
                      color={
                        WARNING_TEXT
                      }
                      strokeWidth={2.5}
                    />
                  ) : (
                    <ChevronDown
                      size={19}
                      color={
                        WARNING_TEXT
                      }
                      strokeWidth={2.5}
                    />
                  )}
                </View>
              </TouchableOpacity>

              {showRequestContext ? (
                <View
                  style={
                    styles.technicalDetails
                  }
                >
                  {renderRow(
                    "Method",
                    auditLog.requestMethod,
                    {
                      compact: true,
                    }
                  )}

                  {renderRow(
                    "Path",
                    auditLog.requestPath,
                    {
                      compact: true,
                    }
                  )}

                  {renderRow(
                    "IP address",
                    auditLog.ipAddress,
                    {
                      compact: true,
                    }
                  )}

                  {renderRow(
                    "User agent",
                    auditLog.userAgent,
                    {
                      compact: true,
                      last: true,
                    }
                  )}
                </View>
              ) : null}
            </View>

            <View
              style={
                styles.immutabilityNotice
              }
            >
              <View
                style={
                  styles.noticeIconBox
                }
              >
                <Clock3
                  size={18}
                  color={ADMIN}
                  strokeWidth={2.4}
                />
              </View>

              <View
                style={
                  styles.noticeContent
                }
              >
                <Text
                  style={
                    styles.noticeTitle
                  }
                >
                  Read-only record
                </Text>

                <Text
                  style={
                    styles.immutabilityText
                  }
                >
                  Audit records cannot
                  be edited or deleted
                  from the Admin app.
                </Text>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  };

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 14,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        SURFACE,
      alignItems: "center",
      justifyContent:
        "center",
      ...elevate(2),
    },
    headerText: {
      flex: 1,
      marginHorizontal: 12,
    },
    kicker: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 2,
    },
    title: {
      color: TEXT,
      fontSize: 21,
      fontWeight: "700",
    },
    refreshButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        ADMIN_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
    },
    content: {
      paddingHorizontal: 18,
    },
    heroCard: {
      borderRadius: 18,
      padding: 17,
      flexDirection: "row",
      marginBottom: 14,
      overflow: "hidden",
      ...elevate(2),
    },
    heroAccent: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 5,
    },
    heroIcon: {
      width: 54,
      height: 54,
      borderRadius: 16,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 13,
      marginLeft: 2,
    },
    heroContent: {
      flex: 1,
    },
    heroStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 6,
    },
    heroOutcomeBadge: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    heroOutcome: {
      fontSize: 10,
      fontWeight: "700",
    },
    heroRecordId: {
      color: MUTED,
      fontSize: 10,
      fontWeight: "600",
      marginLeft: 8,
    },
    heroTitle: {
      color: TEXT,
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 23,
      marginBottom: 5,
    },
    heroDescription: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "500",
      lineHeight: 18,
    },
    quickFactsRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      marginBottom: 20,
    },
    quickFactCard: {
      width: "31.5%",
      backgroundColor:
        SURFACE,
      borderRadius: 14,
      paddingHorizontal: 9,
      paddingVertical: 12,
      alignItems: "center",
      ...elevate(1),
    },
    quickFactValue: {
      color: TEXT,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 7,
      marginBottom: 3,
      textAlign: "center",
    },
    quickFactLabel: {
      color: MUTED,
      fontSize: 9,
      fontWeight: "600",
      textAlign: "center",
    },
    sectionHeading: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 9,
      marginTop: 2,
    },
    sectionIconBox: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor:
        ADMIN_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 10,
    },
    technicalSectionIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor:
        WARNING_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 10,
    },
    sectionTitle: {
      color: TEXT,
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 2,
    },
    sectionSubtitle: {
      color: MUTED,
      fontSize: 10,
      fontWeight: "500",
    },
    detailCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      paddingHorizontal: 15,
      marginBottom: 18,
      ...elevate(2),
    },
    detailRow: {
      paddingVertical: 13,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        DIVIDER,
    },
    compactDetailRow: {
      paddingVertical: 11,
    },
    lastDetailRow: {
      borderBottomWidth: 0,
    },
    detailLabel: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "600",
      marginBottom: 4,
    },
    detailValue: {
      color: TEXT,
      fontSize: 13,
      fontWeight: "600",
      lineHeight: 19,
    },
    identityCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      ...elevate(2),
    },
    identityAvatar: {
      width: 46,
      height: 46,
      borderRadius: 13,
      backgroundColor:
        ADMIN_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },
    identityAvatarText: {
      color: ADMIN_DARK,
      fontSize: 18,
      fontWeight: "700",
    },
    patientAvatar: {
      backgroundColor:
        SUCCESS_CONTAINER,
    },
    patientAvatarText: {
      color: SUCCESS_TEXT,
      fontSize: 18,
      fontWeight: "700",
    },
    identityContent: {
      flex: 1,
    },
    identityName: {
      color: TEXT,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 3,
    },
    identityEmail: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "500",
    },
    identityRoleBadge: {
      backgroundColor:
        ADMIN_CONTAINER,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      marginLeft: 8,
    },
    identityRoleText: {
      color: ADMIN,
      fontSize: 9,
      fontWeight: "700",
    },
    noMetadata: {
      alignItems: "center",
      paddingVertical: 22,
    },
    noMetadataTitle: {
      color: TEXT,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 9,
      marginBottom: 4,
    },
    noMetadataText: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "500",
      textAlign: "center",
      lineHeight: 17,
    },
    technicalCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      marginBottom: 18,
      overflow: "hidden",
      ...elevate(2),
    },
    technicalHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
    },
    technicalHeaderIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        WARNING_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
    },
    technicalHeaderContent: {
      flex: 1,
    },
    technicalHeaderTitle: {
      color: TEXT,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 3,
    },
    technicalHeaderText: {
      color: MUTED,
      fontSize: 10,
      fontWeight: "500",
      lineHeight: 15,
    },
    technicalChevron: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor:
        WARNING_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 9,
    },
    technicalDetails: {
      paddingHorizontal: 15,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor: DIVIDER,
    },
    immutabilityNotice: {
      backgroundColor:
        ADMIN_CONTAINER,
      borderRadius: 16,
      padding: 14,
      flexDirection: "row",
      alignItems: "flex-start",
    },
    noticeIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor:
        "rgba(103,80,216,0.10)",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 10,
    },
    noticeContent: {
      flex: 1,
    },
    noticeTitle: {
      color: ADMIN_DARK,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 3,
    },
    immutabilityText: {
      color: ADMIN,
      fontSize: 11,
      fontWeight: "600",
      lineHeight: 17,
    },
    centredState: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 28,
    },
    loadingIconBox: {
      width: 68,
      height: 68,
      borderRadius: 20,
      backgroundColor:
        ADMIN_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 15,
    },
    errorIcon: {
      width: 60,
      height: 60,
      borderRadius: 18,
      backgroundColor:
        DANGER_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 14,
    },
    stateTitle: {
      color: TEXT,
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 6,
    },
    stateText: {
      color: MUTED,
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 19,
      textAlign: "center",
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: ADMIN,
      borderRadius: 12,
      paddingHorizontal: 15,
      paddingVertical: 11,
      marginTop: 16,
    },
    retryText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
      marginLeft: 7,
    },
  });