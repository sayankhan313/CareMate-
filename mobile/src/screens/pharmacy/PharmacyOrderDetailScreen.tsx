import { useCallback, useState, type ReactNode } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck2,
  FileText,
  History,
  MapPin,
  PackageCheck,
  Phone,
  Pill,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  pharmacyApi,
  type PharmacyOrderDetail,
  type PharmacyOrderStatus,
} from "../../services/pharmacy/pharmacyApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "PharmacyOrderDetail"
>;

type PharmacyMedicineItem =
  PharmacyOrderDetail["items"][number];

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#747C91";
const BORDER = "#E1E6EF";

const PHARMACY = "#15803D";
const PHARMACY_DARK = "#14532D";
const PHARMACY_LIGHT = "#E9F8EF";
const PHARMACY_SOFT = "#F2FBF5";

const BLUE = "#5B86E5";
const BLUE_DARK = "#315FBA";
const BLUE_LIGHT = "#EEF4FF";

const WARNING = "#F6A545";
const WARNING_DARK = "#9A570D";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const formatDateTime = (
  value: string | null | undefined
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

const formatStatus = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map(
      part =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");

const getSourceLabel = (
  source: PharmacyOrderDetail["orderSource"]
) => {
  if (source === "DOCTOR_PRESCRIPTION") {
    return "Doctor prescription";
  }

  if (source === "PATIENT_SUBMISSION") {
    return "Patient submission";
  }

  if (source === "REFILL_REQUEST") {
    return "Refill request";
  }

  return "Manual request";
};

const getStatusTone = (
  status: PharmacyOrderStatus
) => {
  if (
    status === "READY" ||
    status === "COLLECTED" ||
    status === "DELIVERED"
  ) {
    return {
      background: "#DDF7E6",
      color: PHARMACY_DARK,
    };
  }

  if (
    status === "RECEIVED" ||
    status === "ACCEPTED" ||
    status === "PREPARING"
  ) {
    return {
      background: WARNING_LIGHT,
      color: WARNING_DARK,
    };
  }

  if (
    status === "REJECTED" ||
    status === "CANCELLED" ||
    status === "OUT_OF_STOCK"
  ) {
    return {
      background: DANGER_LIGHT,
      color: DANGER_DARK,
    };
  }

  return {
    background: BLUE_LIGHT,
    color: BLUE_DARK,
  };
};

const formatMoney = (
  amountPence: number,
  currency: string
) => {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
    }).format(amountPence / 100);
  } catch {
    return `£${(amountPence / 100).toFixed(2)}`;
  }
};

export const PharmacyOrderDetailScreen = ({
  navigation,
  route,
}: Props) => {
  const insets = useSafeAreaInsets();

  const [order, setOrder] =
    useState<PharmacyOrderDetail | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadOrder = useCallback(
    async (
      mode: "initial" | "refresh" = "initial"
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
          await pharmacyApi.getOrderDetail(
            route.params.orderId
          );

        setOrder(result.order);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load pharmacy order."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [route.params.orderId]
  );

  useFocusEffect(
    useCallback(() => {
      void loadOrder("initial");
    }, [loadOrder])
  );

  const address = order
    ? [
        order.patient.patientProfile?.addressLine,
        order.patient.patientProfile?.postcode,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const statusTone = order
    ? getStatusTone(order.status)
    : null;

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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: Math.max(
                insets.bottom + 36,
                50
              ),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() =>
                void loadOrder("refresh")
              }
              tintColor={PHARMACY}
              colors={[PHARMACY]}
            />
          }
        >
          <View style={styles.header}>
            <View style={styles.appBar}>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.goBack()
                }
              >
                <ArrowLeft
                  size={23}
                  color={TEXT}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>

              <View style={styles.appBarText}>
                <Text style={styles.appBarTitle}>
                  Prescription order
                </Text>

                <Text style={styles.appBarSubtitle}>
                  Pharmacy fulfilment
                </Text>
              </View>
            </View>

            {!isLoading &&
            !errorMessage &&
            order &&
            statusTone ? (
              <View style={styles.headerContent}>
                <View style={styles.orderSourceRow}>
                  <View style={styles.headerSourceIcon}>
                    {order.orderSource ===
                    "DOCTOR_PRESCRIPTION" ? (
                      <BadgeCheck
                        size={19}
                        color={PHARMACY_DARK}
                        strokeWidth={2.6}
                      />
                    ) : (
                      <FileText
                        size={19}
                        color={BLUE_DARK}
                        strokeWidth={2.6}
                      />
                    )}
                  </View>

                  <Text style={styles.headerSourceText}>
                    {getSourceLabel(
                      order.orderSource
                    )}
                  </Text>

                  <View
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor:
                          statusTone.background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            statusTone.color,
                        },
                      ]}
                    >
                      {formatStatus(
                        order.status
                      )}
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.orderNumber}
                  numberOfLines={1}
                >
                  {order.orderNumber ||
                    `Order ${order.id.slice(
                      0,
                      8
                    )}`}
                </Text>

                <View style={styles.receivedRow}>
                  <Clock3
                    size={14}
                    color="#D9F5E2"
                    strokeWidth={2.3}
                  />

                  <Text style={styles.receivedText}>
                    {formatDateTime(
                      order.createdAt
                    )}
                  </Text>
                </View>

                <View style={styles.verificationBar}>
                  <VerificationStatus
                    active={
                      order.prescriptionConfirmed
                    }
                    label="Confirmed"
                  />

                  <View
                    style={styles.headerDivider}
                  />

                  <VerificationStatus
                    active={
                      order.fulfilmentAllowed
                    }
                    label="Fulfilment allowed"
                  />
                </View>
              </View>
            ) : null}
          </View>

          {isLoading ? (
            <View style={styles.stateArea}>
              <ActivityIndicator
                color={PHARMACY}
              />

              <Text style={styles.stateTitle}>
                Loading order
              </Text>

              <Text style={styles.stateText}>
                Retrieving prescription information
              </Text>
            </View>
          ) : null}

          {!isLoading &&
          errorMessage ? (
            <View style={styles.stateArea}>
              <View style={styles.errorIcon}>
                <AlertCircle
                  size={24}
                  color={DANGER}
                  strokeWidth={2.5}
                />
              </View>

              <Text style={styles.errorTitle}>
                Order unavailable
              </Text>

              <Text style={styles.stateText}>
                {errorMessage}
              </Text>

              <TouchableOpacity
                style={styles.retryButton}
                activeOpacity={0.85}
                onPress={() =>
                  void loadOrder("initial")
                }
              >
                <RefreshCw
                  size={16}
                  color={SURFACE}
                  strokeWidth={2.5}
                />

                <Text style={styles.retryText}>
                  Try again
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading &&
          !errorMessage &&
          order ? (
            <View style={styles.body}>
              <View style={styles.quickInfoRow}>
                <QuickInfo
                  background={BLUE_LIGHT}
                  icon={
                    <UserRound
                      size={20}
                      color={BLUE}
                      strokeWidth={2.5}
                    />
                  }
                  label="Patient"
                  value={order.patient.fullName}
                />

                <QuickInfo
                  background={PHARMACY_LIGHT}
                  icon={
                    <Pill
                      size={20}
                      color={PHARMACY}
                      strokeWidth={2.5}
                    />
                  }
                  label="Medicines"
                  value={String(
                    order.items.length
                  )}
                />

                <QuickInfo
                  background={WARNING_LIGHT}
                  icon={
                    <CreditCard
                      size={20}
                      color={WARNING_DARK}
                      strokeWidth={2.5}
                    />
                  }
                  label="Payment"
                  value={
                    order.payment
                      ? formatStatus(
                          order.payment.status
                        )
                      : "None"
                  }
                />
              </View>

              <SectionHeading
                title="Patient"
                icon={
                  <UserRound
                    size={18}
                    color={BLUE}
                    strokeWidth={2.5}
                  />
                }
              />

              <View style={styles.patientPanel}>
                <View style={styles.profileRow}>
                  <View style={styles.patientAvatar}>
                    <UserRound
                      size={25}
                      color={BLUE_DARK}
                      strokeWidth={2.4}
                    />
                  </View>

                  <View style={styles.profileText}>
                    <Text style={styles.profileName}>
                      {order.patient.fullName}
                    </Text>

                    <Text style={styles.profileEmail}>
                      {order.patient.email}
                    </Text>
                  </View>
                </View>

                <View style={styles.contactGrid}>
                  <ContactItem
                    icon={
                      <Phone
                        size={16}
                        color={BLUE_DARK}
                        strokeWidth={2.3}
                      />
                    }
                    text={
                      order.patient
                        .patientProfile
                        ?.phoneNumber ||
                      "No phone"
                    }
                  />

                  <ContactItem
                    icon={
                      <MapPin
                        size={16}
                        color={BLUE_DARK}
                        strokeWidth={2.3}
                      />
                    }
                    text={
                      address ||
                      "No address"
                    }
                  />
                </View>
              </View>

              {order.doctor ? (
                <>
                  <SectionHeading
                    title="Prescriber"
                    icon={
                      <Stethoscope
                        size={18}
                        color={PHARMACY}
                        strokeWidth={2.5}
                      />
                    }
                  />

                  <View style={styles.prescriberPanel}>
                    <View style={styles.prescriberIcon}>
                      <Stethoscope
                        size={22}
                        color={PHARMACY_DARK}
                        strokeWidth={2.4}
                      />
                    </View>

                    <View style={styles.prescriberText}>
                      <Text style={styles.prescriberName}>
                        {order.doctor.fullName}
                      </Text>

                      <Text
                        style={
                          styles.prescriberSpeciality
                        }
                      >
                        {order.doctor
                          .doctorProfile
                          ?.specialization ||
                          "Doctor"}
                      </Text>

                      {order.prescription ? (
                        <Text
                          style={
                            styles.prescribedDate
                          }
                        >
                          Prescribed{" "}
                          {formatDateTime(
                            order.prescription
                              .prescribedAt
                          )}
                        </Text>
                      ) : null}
                    </View>

                    <BadgeCheck
                      size={20}
                      color={PHARMACY}
                      strokeWidth={2.5}
                    />
                  </View>
                </>
              ) : null}

              <SectionHeading
                title="Medicines"
                subtitle={`${order.items.length} ${
                  order.items.length === 1
                    ? "item"
                    : "items"
                }`}
                icon={
                  <Pill
                    size={18}
                    color={PHARMACY}
                    strokeWidth={2.5}
                  />
                }
              />

              <View style={styles.medicineContainer}>
                {order.items.length > 0 ? (
                  order.items.map(
                    (item, index) => (
                      <MedicineItem
                        key={item.id}
                        item={item}
                        index={index}
                        last={
                          index ===
                          order.items.length - 1
                        }
                      />
                    )
                  )
                ) : (
                  <View style={styles.medicineEmpty}>
                    <Pill
                      size={23}
                      color={MUTED}
                      strokeWidth={2.3}
                    />

                    <Text style={styles.emptyText}>
                      No medicines attached to this order.
                    </Text>
                  </View>
                )}
              </View>

              {order.prescription?.notes ||
              order.requestNote ||
              order.statusReason ? (
                <>
                  <SectionHeading
                    title="Notes"
                    icon={
                      <FileText
                        size={18}
                        color={WARNING_DARK}
                        strokeWidth={2.4}
                      />
                    }
                  />

                  <View style={styles.notesPanel}>
                    {order.prescription
                      ?.notes ? (
                      <NoteItem
                        title="Doctor note"
                        text={
                          order.prescription
                            .notes
                        }
                      />
                    ) : null}

                    {order.requestNote ? (
                      <NoteItem
                        title="Request"
                        text={order.requestNote}
                      />
                    ) : null}

                    {order.statusReason ? (
                      <NoteItem
                        title="Status"
                        text={order.statusReason}
                      />
                    ) : null}
                  </View>
                </>
              ) : null}

              <SectionHeading
                title="Payment"
                icon={
                  <CreditCard
                    size={18}
                    color={WARNING_DARK}
                    strokeWidth={2.4}
                  />
                }
              />

              <View style={styles.paymentPanel}>
                {order.payment ? (
                  <View style={styles.paymentTop}>
                    <View style={styles.paymentIcon}>
                      <CreditCard
                        size={21}
                        color={WARNING_DARK}
                        strokeWidth={2.5}
                      />
                    </View>

                    <View style={styles.paymentText}>
                      <Text
                        style={
                          styles.paymentPreference
                        }
                      >
                        {formatStatus(
                          order.payment
                            .chargePreference
                        )}
                      </Text>

                      <Text
                        style={
                          styles.paymentMode
                        }
                      >
                        {order.payment
                          .testMode
                          ? "CareMate+ test payment"
                          : "Prescription payment"}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.paymentAmount
                      }
                    >
                      <Text
                        style={
                          styles.paymentAmountText
                        }
                      >
                        {formatMoney(
                          order.payment
                            .amountPence,
                          order.payment
                            .currency
                        )}
                      </Text>

                      <Text
                        style={
                          styles.paymentStatus
                        }
                      >
                        {formatStatus(
                          order.payment.status
                        )}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.emptyText}>
                    No payment information required.
                  </Text>
                )}
              </View>

              {order.exemptionClaim ? (
                <>
                  <SectionHeading
                    title="Exemption"
                    icon={
                      <ShieldCheck
                        size={18}
                        color={BLUE}
                        strokeWidth={2.4}
                      />
                    }
                  />

                  <View style={styles.exemptionPanel}>
                    <View style={styles.exemptionTop}>
                      <ShieldCheck
                        size={23}
                        color={BLUE_DARK}
                        strokeWidth={2.5}
                      />

                      <View style={styles.exemptionText}>
                        <Text style={styles.exemptionType}>
                          {formatStatus(
                            order
                              .exemptionClaim
                              .exemptionType
                          )}
                        </Text>

                        <Text style={styles.exemptionMeta}>
                          {order
                            .exemptionClaim
                            .referenceNumber ||
                            "No reference"}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.exemptionStatus
                        }
                      >
                        {formatStatus(
                          order.exemptionClaim
                            .status
                        )}
                      </Text>
                    </View>

                    {order.exemptionClaim
                      .rejectionReason ? (
                      <Text
                        style={
                          styles.exemptionReason
                        }
                      >
                        {
                          order
                            .exemptionClaim
                            .rejectionReason
                        }
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : null}

              {order.patientSubmission ? (
                <>
                  <SectionHeading
                    title="Patient submission"
                    icon={
                      <FileCheck2
                        size={18}
                        color={BLUE}
                        strokeWidth={2.4}
                      />
                    }
                  />

                  <View style={styles.submissionPanel}>
                    <View style={styles.submissionIcon}>
                      <FileText
                        size={22}
                        color={BLUE_DARK}
                        strokeWidth={2.5}
                      />
                    </View>

                    <View style={styles.submissionText}>
                      <Text
                        style={
                          styles.submissionTitle
                        }
                      >
                        {formatStatus(
                          order
                            .patientSubmission
                            .requestType
                        )}
                      </Text>

                      <Text
                        style={
                          styles.submissionMeta
                        }
                      >
                        {formatStatus(
                          order
                            .patientSubmission
                            .status
                        )}
                        {"  •  "}
                        {order
                          .patientSubmission
                          .imageUrl
                          ? "Image attached"
                          : "No image"}
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}

              <SectionHeading
                title="Order progress"
                icon={
                  <History
                    size={18}
                    color={PHARMACY}
                    strokeWidth={2.4}
                  />
                }
              />

              <View style={styles.historyPanel}>
                {order.statusHistory.length >
                0 ? (
                  order.statusHistory.map(
                    (
                      historyItem,
                      index
                    ) => (
                      <HistoryItem
                        key={
                          historyItem.id
                        }
                        status={formatStatus(
                          historyItem.toStatus
                        )}
                        date={formatDateTime(
                          historyItem.createdAt
                        )}
                        note={
                          historyItem.note
                        }
                        current={
                          index ===
                          order
                            .statusHistory
                            .length -
                            1
                        }
                        last={
                          index ===
                          order
                            .statusHistory
                            .length -
                            1
                        }
                      />
                    )
                  )
                ) : (
                  <HistoryItem
                    status={formatStatus(
                      order.status
                    )}
                    date={formatDateTime(
                      order.createdAt
                    )}
                    note="Order received"
                    current
                    last
                  />
                )}
              </View>

              <View style={styles.refreshHint}>
                <PackageCheck
                  size={17}
                  color={PHARMACY}
                  strokeWidth={2.4}
                />

                <Text style={styles.refreshHintText}>
                  Pull down to refresh
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const VerificationStatus = ({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) => (
  <View style={styles.verificationItem}>
    {active ? (
      <CheckCircle2
        size={15}
        color={SURFACE}
        strokeWidth={2.5}
      />
    ) : (
      <AlertCircle
        size={15}
        color="#FFE7E7"
        strokeWidth={2.5}
      />
    )}

    <Text style={styles.verificationText}>
      {label}
    </Text>
  </View>
);

const QuickInfo = ({
  background,
  icon,
  label,
  value,
}: {
  background: string;
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <View
    style={[
      styles.quickInfo,
      {
        backgroundColor: background,
      },
    ]}
  >
    {icon}

    <Text
      style={styles.quickInfoValue}
      numberOfLines={1}
    >
      {value}
    </Text>

    <Text style={styles.quickInfoLabel}>
      {label}
    </Text>
  </View>
);

const SectionHeading = ({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
}) => (
  <View style={styles.sectionHeading}>
    {icon}

    <Text style={styles.sectionTitle}>
      {title}
    </Text>

    {subtitle ? (
      <Text style={styles.sectionSubtitle}>
        {subtitle}
      </Text>
    ) : null}
  </View>
);

const ContactItem = ({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) => (
  <View style={styles.contactItem}>
    {icon}

    <Text
      style={styles.contactText}
      numberOfLines={2}
    >
      {text}
    </Text>
  </View>
);

const MedicineItem = ({
  item,
  index,
  last,
}: {
  item: PharmacyMedicineItem;
  index: number;
  last: boolean;
}) => {
  const required =
    item.quantity !== null
      ? item.quantity
      : null;

  const dispensed =
    item.dispensedQuantity || 0;

  const progress =
    required && required > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (dispensed / required) * 100
          )
        )
      : 0;

  const quantityText =
    required !== null
      ? `${required}${
          item.quantityUnit
            ? ` ${item.quantityUnit}`
            : ""
        }`
      : "Not specified";

  const dispensedText =
    `${dispensed}${
      item.quantityUnit
        ? ` ${item.quantityUnit}`
        : ""
    }`;

  return (
    <View
      style={[
        styles.medicineItem,
        last
          ? styles.medicineItemLast
          : undefined,
      ]}
    >
      <View style={styles.medicineTopRow}>
        <View style={styles.medicineIcon}>
          <Pill
            size={20}
            color={PHARMACY}
            strokeWidth={2.5}
          />
        </View>

        <View style={styles.medicineMain}>
          <Text
            style={styles.medicineName}
            numberOfLines={2}
          >
            {item.name}
          </Text>

          <Text style={styles.medicineSubline}>
            {item.dose ||
              "Dose not specified"}
            {"  •  "}
            {quantityText}
          </Text>
        </View>

        <View style={styles.itemNumber}>
          <Text style={styles.itemNumberText}>
            {index + 1}
          </Text>
        </View>
      </View>

      <View style={styles.medicineInstructionBox}>
        <Text style={styles.instructionLabel}>
          DIRECTIONS
        </Text>

        <Text style={styles.instructionText}>
          {item.instructions ||
            "No instructions provided"}
        </Text>
      </View>

      <View style={styles.medicineStockRow}>
        <View style={styles.quantityBlock}>
          <Text style={styles.quantityLabel}>
            Required
          </Text>

          <Text style={styles.quantityValue}>
            {quantityText}
          </Text>
        </View>

        <View style={styles.quantityDivider} />

        <View style={styles.quantityBlock}>
          <Text style={styles.quantityLabel}>
            Dispensed
          </Text>

          <Text
            style={[
              styles.quantityValue,
              dispensed > 0
                ? styles.dispensedValue
                : undefined,
            ]}
          >
            {dispensedText}
          </Text>
        </View>
      </View>

      {required !== null &&
      required > 0 ? (
        <View style={styles.progressArea}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.progressText}>
            {dispensed >= required
              ? "Complete"
              : `${Math.max(
                  required - dispensed,
                  0
                )} remaining`}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const NoteItem = ({
  title,
  text,
}: {
  title: string;
  text: string;
}) => (
  <View style={styles.noteItem}>
    <Text style={styles.noteTitle}>
      {title}
    </Text>

    <Text style={styles.noteText}>
      {text}
    </Text>
  </View>
);

const HistoryItem = ({
  status,
  date,
  note,
  current,
  last,
}: {
  status: string;
  date: string;
  note?: string | null;
  current: boolean;
  last: boolean;
}) => (
  <View style={styles.historyItem}>
    <View style={styles.timeline}>
      <View
        style={[
          styles.timelineDot,
          current
            ? styles.timelineDotCurrent
            : undefined,
        ]}
      />

      {!last ? (
        <View style={styles.timelineLine} />
      ) : null}
    </View>

    <View style={styles.historyContent}>
      <View style={styles.historyTitleRow}>
        <Text style={styles.historyStatus}>
          {status}
        </Text>

        {current ? (
          <View style={styles.currentChip}>
            <Text style={styles.currentChipText}>
              Current
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.historyDate}>
        {date}
      </Text>

      {note ? (
        <Text style={styles.historyNote}>
          {note}
        </Text>
      ) : null}
    </View>
  </View>
);

export default PharmacyOrderDetailScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingBottom: 48,
  },

  header: {
    backgroundColor: BACKGROUND,
    paddingBottom: 2,
  },

  appBar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },

  appBarText: {
    flex: 1,
  },

  appBarTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "700",
  },

  appBarSubtitle: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },

  headerContent: {
    backgroundColor: PHARMACY,
    borderRadius: 17,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 12,
  },

  orderSourceRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerSourceIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  headerSourceText: {
    flex: 1,
    color: "#E9FFF0",
    fontSize: 10,
    fontWeight: "600",
  },

  orderNumber: {
    color: SURFACE,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.25,
    marginTop: 10,
  },

  receivedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  receivedText: {
    color: "#D9F5E2",
    fontSize: 9,
    fontWeight: "500",
    marginLeft: 6,
  },

  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 8,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "700",
  },

  verificationBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      "rgba(255,255,255,0.13)",
    borderRadius: 10,
    marginTop: 11,
    minHeight: 38,
  },

  verificationItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },

  verificationText: {
    color: SURFACE,
    fontSize: 8,
    fontWeight: "600",
    marginLeft: 5,
  },

  headerDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor:
      "rgba(255,255,255,0.3)",
  },

  stateArea: {
    paddingVertical: 50,
    paddingHorizontal: 24,
    alignItems: "center",
  },

  stateTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 11,
  },

  stateText: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    fontWeight: "500",
    marginTop: 4,
  },

  errorIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  errorTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
  },

  retryButton: {
    minHeight: 42,
    backgroundColor: PHARMACY,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },

  retryText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  body: {
    paddingHorizontal: 16,
  },

  quickInfoRow: {
    flexDirection: "row",
    marginTop: 13,
    gap: 8,
  },

  quickInfo: {
    flex: 1,
    minHeight: 88,
    borderRadius: 14,
    padding: 11,
    justifyContent: "space-between",
  },

  quickInfoValue: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },

  quickInfoLabel: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "600",
    marginTop: 2,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 9,
    paddingHorizontal: 2,
  },

  sectionTitle: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 7,
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
  },

  patientPanel: {
    backgroundColor: BLUE_LIGHT,
    borderRadius: 16,
    padding: 14,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#DCE8FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  profileText: {
    flex: 1,
  },

  profileName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },

  profileEmail: {
    color: BLUE_DARK,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 3,
  },

  contactGrid: {
    marginTop: 12,
    gap: 7,
  },

  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      "rgba(255,255,255,0.55)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  contactText: {
    flex: 1,
    color: TEXT,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 15,
    marginLeft: 8,
  },

  prescriberPanel: {
    backgroundColor: PHARMACY_LIGHT,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  prescriberIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#D7F3E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  prescriberText: {
    flex: 1,
  },

  prescriberName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },

  prescriberSpeciality: {
    color: PHARMACY_DARK,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },

  prescribedDate: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "500",
    marginTop: 5,
  },

  medicineContainer: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    overflow: "hidden",
  },

  medicineItem: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 13,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },

  medicineItemLast: {
    borderBottomWidth: 0,
  },

  medicineTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  medicineIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: PHARMACY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  medicineMain: {
    flex: 1,
    minWidth: 0,
  },

  medicineName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },

  medicineSubline: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 4,
  },

  itemNumber: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  itemNumberText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "700",
  },

  medicineInstructionBox: {
    backgroundColor: PHARMACY_SOFT,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 11,
  },

  instructionLabel: {
    color: PHARMACY_DARK,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  instructionText: {
    color: TEXT,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "500",
    marginTop: 4,
  },

  medicineStockRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  quantityBlock: {
    flex: 1,
  },

  quantityDivider: {
    width: StyleSheet.hairlineWidth,
    height: 29,
    backgroundColor: BORDER,
    marginHorizontal: 14,
  },

  quantityLabel: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "600",
  },

  quantityValue: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  dispensedValue: {
    color: PHARMACY_DARK,
  },

  progressArea: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
  },

  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E4E8E5",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: PHARMACY,
  },

  progressText: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "600",
    marginLeft: 9,
  },

  medicineEmpty: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  notesPanel: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 16,
    paddingHorizontal: 13,
  },

  noteItem: {
    paddingVertical: 10,
  },

  noteTitle: {
    color: WARNING_DARK,
    fontSize: 9,
    fontWeight: "700",
  },

  noteText: {
    color: TEXT,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "500",
    marginTop: 3,
  },

  paymentPanel: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 16,
    padding: 14,
  },

  paymentTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#FFE7C2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  paymentText: {
    flex: 1,
  },

  paymentPreference: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  paymentMode: {
    color: WARNING_DARK,
    fontSize: 9,
    fontWeight: "500",
    marginTop: 3,
  },

  paymentAmount: {
    alignItems: "flex-end",
    marginLeft: 8,
  },

  paymentAmountText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },

  paymentStatus: {
    color: WARNING_DARK,
    fontSize: 8,
    fontWeight: "700",
    marginTop: 3,
  },

  exemptionPanel: {
    backgroundColor: BLUE_LIGHT,
    borderRadius: 16,
    padding: 14,
  },

  exemptionTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  exemptionText: {
    flex: 1,
    marginLeft: 10,
  },

  exemptionType: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  exemptionMeta: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "500",
    marginTop: 3,
  },

  exemptionStatus: {
    color: BLUE_DARK,
    fontSize: 9,
    fontWeight: "700",
  },

  exemptionReason: {
    color: DANGER_DARK,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "500",
    marginTop: 10,
  },

  submissionPanel: {
    backgroundColor: BLUE_LIGHT,
    borderRadius: 16,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  submissionIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#DCE8FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  submissionText: {
    flex: 1,
  },

  submissionTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  submissionMeta: {
    color: BLUE_DARK,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 4,
  },

  historyPanel: {
    backgroundColor: PHARMACY_SOFT,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingTop: 13,
  },

  historyItem: {
    flexDirection: "row",
  },

  timeline: {
    width: 25,
    alignItems: "center",
  },

  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#9CD3AD",
    marginTop: 4,
  },

  timelineDotCurrent: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: PHARMACY,
    borderWidth: 3,
    borderColor: "#D7F3E0",
  },

  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 42,
    backgroundColor: "#CDEAD6",
    marginTop: 3,
  },

  historyContent: {
    flex: 1,
    paddingLeft: 7,
    paddingBottom: 15,
  },

  historyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  historyStatus: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
  },

  currentChip: {
    backgroundColor: PHARMACY_LIGHT,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 7,
  },

  currentChipText: {
    color: PHARMACY_DARK,
    fontSize: 7,
    fontWeight: "700",
  },

  historyDate: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "500",
    marginTop: 3,
  },

  historyNote: {
    color: MUTED,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "500",
    marginTop: 4,
  },

  emptyText: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 18,
  },

  refreshHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  refreshHintText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "500",
    marginLeft: 6,
  },
});