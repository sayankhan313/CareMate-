import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  FileUp,
  Package,
  Pill,
  Send,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react-native";
import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
} from "@react-native-documents/picker";

import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedTextInput as TextInput } from "../../components/common/LocalizedTextInput";
import { API_BASE_URL } from "../../constants/api";
import {
  doctorAssignmentApi,
  type AssignedDoctor,
} from "../../services/doctorAssignmentApi";
import {
  patientPharmacyRefillApi,
  type ActivePharmacyRefillRequest,
  type PatientMedicineEvidenceType,
  type PatientRefillVerificationPath,
  type RefillEvidenceFile,
} from "../../services/patientPharmacyRefillApi";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "MedicineStock"
>;

type Medicine = {
  id: string;
  name: string;
  dose: string;
  source: string;
  isActive: boolean;
  hasMedicineOnHand?: boolean | null;
  currentStock?: number | null;
  stockUnit?: string | null;
  lowStockThreshold?: number | null;
  isLowStock?: boolean;
  reminders: {
    id: string;
    timeOfDay: string;
    isActive: boolean;
  }[];
};

type StockState =
  | "OUT"
  | "LOW"
  | "AVAILABLE"
  | "UNKNOWN";

type RefillModalState = {
  medicineId: string;
  medicineName: string;
  dose: string;
  source: string;
  currentStock?: number | null;
  stockUnit?: string | null;
} | null;

type SelectedEvidence = RefillEvidenceFile & {
  size: number | null;
};

type EvidenceOption = {
  value: PatientMedicineEvidenceType;
  label: string;
  helper: string;
};

const BACKGROUND = "#F2F3F8";
const SURFACE = "#FFFFFF";
const SOFT = "#F4F5F9";
const BORDER = "#E4E7EF";
const TEXT = "#1B1D2A";
const MUTED = "#666A78";

const PRIMARY = "#4C6FE0";
const PRIMARY_LIGHT = "#E1E7FF";
const PRIMARY_DARK = "#0C2A8C";

const SUCCESS = "#3A9D75";
const SUCCESS_LIGHT = "#DBF3E7";
const SUCCESS_DARK = "#0F5C3C";

const WARNING = "#C77A1F";
const WARNING_LIGHT = "#FBE7CD";
const WARNING_DARK = "#7A4708";

const DANGER = "#C6404A";
const DANGER_LIGHT = "#FBDADC";
const DANGER_DARK = "#8C1D24";

const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;

const EVIDENCE_OPTIONS: EvidenceOption[] = [
  {
    value: "NHS_APP_SCREENSHOT",
    label: "NHS App",
    helper: "Medicine details screenshot",
  },
  {
    value: "EPS_TOKEN",
    label: "EPS token",
    helper: "Prescription token or barcode",
  },
  {
    value: "GP_REPEAT_MEDICATION_RECORD",
    label: "GP repeat record",
    helper: "Repeat medication record",
  },
  {
    value: "HOSPITAL_OR_CLINIC_LETTER",
    label: "Hospital / clinic letter",
    helper: "Medicine letter or record",
  },
  {
    value: "PHARMACY_LABELLED_MEDICINE",
    label: "Pharmacy label",
    helper: "Photo of labelled medicine",
  },
  {
    value: "OTHER",
    label: "Other evidence",
    helper: "Other medicine document",
  },
];

const elevate = (level = 1) => ({
  elevation: level,
  shadowColor: TEXT,
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level * 1.6,
  shadowOffset: {
    width: 0,
    height: level,
  },
});

const getStockState = (
  medicine: Medicine,
): StockState => {
  if (
    medicine.currentStock === null ||
    medicine.currentStock === undefined
  ) {
    return "UNKNOWN";
  }

  if (medicine.currentStock === 0) {
    return "OUT";
  }

  if (medicine.isLowStock) {
    return "LOW";
  }

  return "AVAILABLE";
};

const getStateStyle = (
  state: StockState,
) => {
  if (state === "OUT") {
    return {
      background: DANGER_LIGHT,
      color: DANGER_DARK,
      icon: DANGER,
      label: "Out of stock",
    };
  }

  if (state === "LOW") {
    return {
      background: WARNING_LIGHT,
      color: WARNING_DARK,
      icon: WARNING,
      label: "Low stock",
    };
  }

  if (state === "AVAILABLE") {
    return {
      background: SUCCESS_LIGHT,
      color: SUCCESS_DARK,
      icon: SUCCESS,
      label: "Available",
    };
  }

  return {
    background: PRIMARY_LIGHT,
    color: PRIMARY_DARK,
    icon: PRIMARY,
    label: "Not recorded",
  };
};

const formatOrderStatus = (
  status?: string | null,
) => {
  if (!status) return "Pending";

  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, letter =>
      letter.toUpperCase(),
    );
};

const getActiveRequestMessage = (
  request: ActivePharmacyRefillRequest,
) => {
  if (
    request.verificationPath ===
      "ASSIGNED_DOCTOR" &&
    request.doctorVerificationStatus ===
      "PENDING"
  ) {
    return request.verificationDoctor
      ?.fullName
      ? `Waiting for ${request.verificationDoctor.fullName}`
      : "Waiting for doctor";
  }

  if (
    request.verificationPath ===
      "EXTERNAL_EVIDENCE" &&
    !request.fulfilmentAllowed
  ) {
    return "Awaiting pharmacy review";
  }

  if (!request.fulfilmentAllowed) {
    return "Verification pending";
  }

  return formatOrderStatus(
    request.orderStatus,
  );
};

const inferMimeType = (
  fileName: string,
  suppliedType?: string | null,
) => {
  const type =
    suppliedType?.toLowerCase();

  if (
    type === "application/pdf" ||
    type === "image/jpeg" ||
    type === "image/png" ||
    type === "image/webp"
  ) {
    return type;
  }

  const lowerName =
    fileName.toLowerCase();

  if (lowerName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg")
  ) {
    return "image/jpeg";
  }

  if (lowerName.endsWith(".png")) {
    return "image/png";
  }

  if (lowerName.endsWith(".webp")) {
    return "image/webp";
  }

  return null;
};

const getFallbackEvidenceName = (
  mimeType: string,
) => {
  if (mimeType === "application/pdf") {
    return "medicine-evidence.pdf";
  }

  if (mimeType === "image/png") {
    return "medicine-evidence.png";
  }

  if (mimeType === "image/webp") {
    return "medicine-evidence.webp";
  }

  return "medicine-evidence.jpg";
};

export const MedicineStockScreen = ({
  navigation,
  route,
}: Props) => {
  const insets =
    useSafeAreaInsets();

  const initialRequest =
    route.params?.initialRequest;

  const hasAppliedInitialRequest =
    useRef(false);

  const [medicines, setMedicines] =
    useState<Medicine[]>([]);

  const [
    activeRequests,
    setActiveRequests,
  ] = useState<
    ActivePharmacyRefillRequest[]
  >([]);

  const [
    assignedDoctors,
    setAssignedDoctors,
  ] = useState<AssignedDoctor[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    refillModal,
    setRefillModal,
  ] =
    useState<RefillModalState>(
      null,
    );

  const [quantity, setQuantity] =
    useState("1");

  const [unit, setUnit] =
    useState("pack");

  const [note, setNote] =
    useState("");

  const [
    verificationPath,
    setVerificationPath,
  ] =
    useState<PatientRefillVerificationPath | null>(
      null,
    );

  const [
    selectedDoctorId,
    setSelectedDoctorId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    evidenceType,
    setEvidenceType,
  ] =
    useState<PatientMedicineEvidenceType | null>(
      null,
    );

  const [
    selectedEvidence,
    setSelectedEvidence,
  ] =
    useState<SelectedEvidence | null>(
      null,
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isPickingEvidence,
    setIsPickingEvidence,
  ] = useState(false);

  const loadData = useCallback(
    async (
      mode:
        | "initial"
        | "refresh"
        | "silent" = "initial",
    ) => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        }

        if (mode === "refresh") {
          setIsRefreshing(true);
        }

        const token =
          await tokenStorage.getToken();

        if (!token) {
          throw new Error(
            "Please login again.",
          );
        }

        const medicinePromise =
          fetch(
            `${API_BASE_URL}/patient/medicines`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

        const activeRequestPromise =
          patientPharmacyRefillApi.listActiveRefills();

        const doctorPromise =
          doctorAssignmentApi
            .getAssignedDoctors()
            .catch(() => null);

        const [
          medicineResponse,
          refillData,
          doctorData,
        ] = await Promise.all([
          medicinePromise,
          activeRequestPromise,
          doctorPromise,
        ]);

        const medicineResult =
          await medicineResponse
            .json()
            .catch(() => ({}));

        if (!medicineResponse.ok) {
          throw new Error(
            medicineResult.message ||
              "Unable to load medicines.",
          );
        }

        setMedicines(
          Array.isArray(
            medicineResult.data,
          )
            ? medicineResult.data
            : [],
        );

        setActiveRequests(
          Array.isArray(
            refillData.activeRequests,
          )
            ? refillData.activeRequests
            : [],
        );

        setAssignedDoctors(
          doctorData
            ? doctorData.doctors.filter(
                assignment =>
                  assignment.status ===
                  "ACTIVE",
              )
            : [],
        );
      } catch (error) {
        Alert.alert(
          "Unable to load medicines",
          error instanceof Error
            ? error.message
            : "Please try again.",
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
      void loadData("initial");
    }, [loadData]),
  );

  const sortedMedicines =
    useMemo(() => {
      const priority: Record<
        StockState,
        number
      > = {
        OUT: 0,
        LOW: 1,
        UNKNOWN: 2,
        AVAILABLE: 3,
      };

      return [...medicines].sort(
        (a, b) => {
          const difference =
            priority[
              getStockState(a)
            ] -
            priority[
              getStockState(b)
            ];

          return difference !== 0
            ? difference
            : a.name.localeCompare(
                b.name,
              );
        },
      );
    }, [medicines]);

  const activeRequestByMedicine =
    useMemo(() => {
      const map =
        new Map<
          string,
          ActivePharmacyRefillRequest
        >();

      activeRequests.forEach(
        request => {
          if (
            !map.has(
              request.medicineId,
            )
          ) {
            map.set(
              request.medicineId,
              request,
            );
          }
        },
      );

      return map;
    }, [activeRequests]);

  const attentionCount =
    medicines.filter(medicine =>
      ["OUT", "LOW"].includes(
        getStockState(medicine),
      ),
    ).length;

  const outCount =
    medicines.filter(
      medicine =>
        getStockState(medicine) ===
        "OUT",
    ).length;

  const lowCount =
    medicines.filter(
      medicine =>
        getStockState(medicine) ===
        "LOW",
    ).length;

  const resetRequestForm = () => {
    setQuantity("1");
    setUnit("pack");
    setNote("");
    setVerificationPath(null);
    setSelectedDoctorId(null);
    setEvidenceType(null);
    setSelectedEvidence(null);
  };

  const openRefill = (
    medicine: Medicine,
  ) => {
    if (
      activeRequestByMedicine.has(
        medicine.id,
      )
    ) {
      return;
    }

    setRefillModal({
      medicineId: medicine.id,
      medicineName: medicine.name,
      dose: medicine.dose,
      source: medicine.source,
      currentStock:
        medicine.currentStock,
      stockUnit: medicine.stockUnit,
    });

    setQuantity("1");

    setUnit(
      medicine.stockUnit?.trim() ||
        "pack",
    );

    setNote("");
    setVerificationPath(null);
    setSelectedDoctorId(null);
    setEvidenceType(null);
    setSelectedEvidence(null);
  };

  useEffect(() => {
    if (
      hasAppliedInitialRequest.current ||
      !initialRequest ||
      isLoading
    ) {
      return;
    }

    const medicine =
      medicines.find(
        item =>
          item.id ===
          initialRequest.medicineId,
      );

    if (!medicine) {
      return;
    }

    hasAppliedInitialRequest.current =
      true;

    const existingRequest =
      activeRequestByMedicine.get(
        medicine.id,
      );

    if (existingRequest) {
      Alert.alert(
        "Request already pending",
        "This medicine already has an active request.",
      );
      return;
    }

    openRefill(medicine);
  }, [
    initialRequest,
    isLoading,
    medicines,
    activeRequestByMedicine,
  ]);

  const closeModal = () => {
    if (
      isSubmitting ||
      isPickingEvidence
    ) {
      return;
    }

    setRefillModal(null);
    resetRequestForm();
  };

  const selectVerificationPath = (
    path: PatientRefillVerificationPath,
  ) => {
    setVerificationPath(path);

    if (
      path ===
      "ASSIGNED_DOCTOR"
    ) {
      setEvidenceType(null);
      setSelectedEvidence(null);
    } else {
      setSelectedDoctorId(null);
    }
  };

  const selectDoctor = (
    assignment: AssignedDoctor,
  ) => {
    if (
      assignment.status !==
      "ACTIVE"
    ) {
      return;
    }

    setSelectedDoctorId(
      assignment.doctor.id,
    );
  };

  const pickEvidence = async () => {
    if (isPickingEvidence) return;

    try {
      setIsPickingEvidence(true);

      const results = await pick({
        allowMultiSelection: false,
        type: [
          types.pdf,
          types.images,
        ],
      });

      const file = results[0];

      if (!file) return;

      const rawName =
        file.name ||
        "medicine-evidence";

      const mimeType =
        inferMimeType(
          rawName,
          file.type,
        );

      if (!mimeType) {
        Alert.alert(
          "Unsupported file",
          "Choose a PDF or image file.",
        );
        return;
      }

      if (
        file.size !== null &&
        file.size >
          MAX_EVIDENCE_BYTES
      ) {
        Alert.alert(
          "File too large",
          "Maximum file size is 8 MB.",
        );
        return;
      }

      setSelectedEvidence({
        uri: file.uri,
        name:
          file.name ||
          getFallbackEvidenceName(
            mimeType,
          ),
        type: mimeType,
        size: file.size,
      });
    } catch (error) {
      if (
        isErrorWithCode(error) &&
        error.code ===
          errorCodes.OPERATION_CANCELED
      ) {
        return;
      }

      Alert.alert(
        "Unable to select file",
        error instanceof Error
          ? error.message
          : "Please try again.",
      );
    } finally {
      setIsPickingEvidence(false);
    }
  };

  const removeEvidence = () => {
    if (!isSubmitting) {
      setSelectedEvidence(null);
    }
  };

  const openDoctorSelection = () => {
    closeModal();

    setTimeout(() => {
      navigation.navigate(
        "SelectDoctor",
      );
    }, 150);
  };

  const submitRefill = async () => {
    if (
      !refillModal ||
      isSubmitting
    ) {
      return;
    }

    const requestedQuantity =
      Number.parseInt(
        quantity.trim(),
        10,
      );

    const quantityUnit =
      unit.trim();

    if (
      !Number.isInteger(
        requestedQuantity,
      ) ||
      requestedQuantity < 1 ||
      requestedQuantity > 1000
    ) {
      Alert.alert(
        "Invalid quantity",
        "Enter a quantity between 1 and 1000.",
      );
      return;
    }

    if (!quantityUnit) {
      Alert.alert(
        "Unit required",
        "Enter a quantity unit.",
      );
      return;
    }

    const isCareMatePrescription =
      refillModal.source ===
      "DOCTOR_PRESCRIBED";

    if (
      !isCareMatePrescription &&
      !verificationPath
    ) {
      Alert.alert(
        "Verification required",
        "Choose a verification method.",
      );
      return;
    }

    if (
      !isCareMatePrescription &&
      verificationPath ===
        "ASSIGNED_DOCTOR" &&
      !selectedDoctorId
    ) {
      Alert.alert(
        "Doctor required",
        "Select your CareMate+ doctor.",
      );
      return;
    }

    if (
      !isCareMatePrescription &&
      verificationPath ===
        "EXTERNAL_EVIDENCE" &&
      !evidenceType
    ) {
      Alert.alert(
        "Evidence type required",
        "Select an evidence type.",
      );
      return;
    }

    if (
      !isCareMatePrescription &&
      verificationPath ===
        "EXTERNAL_EVIDENCE" &&
      !selectedEvidence
    ) {
      Alert.alert(
        "Evidence required",
        "Attach a supporting file.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const result =
        await patientPharmacyRefillApi.createRefill(
          {
            medicineId:
              refillModal.medicineId,

            requestedQuantity,

            quantityUnit,

            note:
              note.trim() ||
              undefined,

            ...(!isCareMatePrescription &&
            verificationPath
              ? {
                  verificationPath,
                }
              : {}),

            ...(!isCareMatePrescription &&
            verificationPath ===
              "ASSIGNED_DOCTOR" &&
            selectedDoctorId
              ? {
                  verificationDoctorId:
                    selectedDoctorId,
                }
              : {}),

            ...(!isCareMatePrescription &&
            verificationPath ===
              "EXTERNAL_EVIDENCE" &&
            evidenceType &&
            selectedEvidence
              ? {
                  evidenceType,
                  evidenceFile: {
                    uri:
                      selectedEvidence.uri,
                    name:
                      selectedEvidence.name,
                    type:
                      selectedEvidence.type,
                  },
                }
              : {}),
          },
        );

      setRefillModal(null);
      resetRequestForm();

      await loadData("silent");

      if (
        result.requiresDoctorVerification
      ) {
        Alert.alert(
          "Request sent",
          "Waiting for doctor confirmation.",
          [
            {
              text: "View Orders",
              onPress: () =>
                navigation.navigate(
                  "PatientTabs",
                  {
                    screen:
                      "PatientOrders",
                  },
                ),
            },
            {
              text: "Done",
            },
          ],
        );

        return;
      }

      if (
        result.requiresPharmacyVerification
      ) {
        Alert.alert(
          "Request sent",
          "Waiting for pharmacy review.",
          [
            {
              text: "View Orders",
              onPress: () =>
                navigation.navigate(
                  "PatientTabs",
                  {
                    screen:
                      "PatientOrders",
                  },
                ),
            },
            {
              text: "Done",
            },
          ],
        );

        return;
      }

      Alert.alert(
        "Request sent",
        `Sent to ${result.pharmacy.pharmacyName}.`,
        [
          {
            text: "View Orders",
            onPress: () =>
              navigation.navigate(
                "PatientTabs",
                {
                  screen:
                    "PatientOrders",
                },
              ),
          },
          {
            text: "Done",
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Unable to send request",
        error instanceof Error
          ? error.message
          : "Please try again.",
      );

      await loadData("silent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCareMatePrescription =
    refillModal?.source ===
    "DOCTOR_PRESCRIBED";

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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <ArrowLeft
              size={22}
              color={TEXT}
              strokeWidth={2.5}
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              Medicine Stock
            </Text>

            <Text style={styles.headerSubtitle}>
              Stock and pharmacy requests
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator
              size="large"
              color={PRIMARY}
            />

            <Text style={styles.loadingText}>
              Loading medicines...
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom:
                  Math.max(
                    insets.bottom +
                      30,
                    45,
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
                  void loadData(
                    "refresh",
                  )
                }
                colors={[PRIMARY]}
              />
            }
          >
            {attentionCount > 0 ? (
              <View
                style={
                  styles.attentionSummary
                }
              >
                <AlertTriangle
                  size={22}
                  color={WARNING_DARK}
                  strokeWidth={2.6}
                />

                <View
                  style={
                    styles.attentionText
                  }
                >
                  <Text
                    style={
                      styles.attentionTitle
                    }
                  >
                    {attentionCount}{" "}
                    {attentionCount ===
                    1
                      ? "medicine needs"
                      : "medicines need"}{" "}
                    attention
                  </Text>

                  <Text
                    style={
                      styles.attentionSubtitle
                    }
                  >
                    {outCount > 0
                      ? `${outCount} out of stock`
                      : ""}

                    {outCount > 0 &&
                    lowCount > 0
                      ? " • "
                      : ""}

                    {lowCount > 0
                      ? `${lowCount} low stock`
                      : ""}
                  </Text>
                </View>
              </View>
            ) : (
              <View
                style={
                  styles.healthySummary
                }
              >
                <CheckCircle2
                  size={21}
                  color={SUCCESS_DARK}
                  strokeWidth={2.6}
                />

                <Text
                  style={
                    styles.healthyTitle
                  }
                >
                  Stock levels look good
                </Text>
              </View>
            )}

            <Text
              style={
                styles.sectionTitle
              }
            >
              Medicines
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {medicines.length} tracked
            </Text>

            {sortedMedicines.map(
              medicine => {
                const state =
                  getStockState(
                    medicine,
                  );

                const tone =
                  getStateStyle(state);

                const activeReminders =
                  medicine.reminders.filter(
                    reminder =>
                      reminder.isActive,
                  ).length;

                const activeRequest =
                  activeRequestByMedicine.get(
                    medicine.id,
                  );

                return (
                  <View
                    key={medicine.id}
                    style={
                      styles.medicineCard
                    }
                  >
                    <View
                      style={
                        styles.medicineTop
                      }
                    >
                      <View
                        style={[
                          styles.medicineIcon,
                          {
                            backgroundColor:
                              tone.background,
                          },
                        ]}
                      >
                        <Pill
                          size={22}
                          color={
                            tone.icon
                          }
                          strokeWidth={
                            2.5
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.medicineText
                        }
                      >
                        <Text
                          style={
                            styles.medicineName
                          }
                        >
                          {
                            medicine.name
                          }
                        </Text>

                        <Text
                          style={
                            styles.medicineDose
                          }
                        >
                          {
                            medicine.dose
                          }
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              tone.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                tone.color,
                            },
                          ]}
                        >
                          {
                            tone.label
                          }
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.stockDetails
                      }
                    >
                      <View
                        style={
                          styles.stockDetail
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          STOCK
                        </Text>

                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {state ===
                          "UNKNOWN"
                            ? "Not recorded"
                            : `${medicine.currentStock ?? 0} ${
                                medicine.stockUnit ||
                                "units"
                              }`}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.detailDivider
                        }
                      />

                      <View
                        style={
                          styles.stockDetail
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          REMINDERS
                        </Text>

                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {state ===
                          "OUT"
                            ? "Paused"
                            : activeReminders >
                                0
                              ? `${activeReminders} active`
                              : "Inactive"}
                        </Text>
                      </View>
                    </View>

                    {activeRequest ? (
                      <View
                        style={
                          styles.pendingPanel
                        }
                      >
                        <Clock3
                          size={17}
                          color={PRIMARY_DARK}
                          strokeWidth={2.5}
                        />

                        <View
                          style={
                            styles.pendingText
                          }
                        >
                          <Text
                            style={
                              styles.pendingTitle
                            }
                          >
                            Request Pending
                          </Text>

                          <Text
                            style={
                              styles.pendingSubtitle
                            }
                          >
                            {getActiveRequestMessage(
                              activeRequest,
                            )}
                          </Text>
                        </View>
                      </View>
                    ) : state === "OUT" ||
                      state === "LOW" ? (
                      <TouchableOpacity
                        style={
                          styles.requestButton
                        }
                        activeOpacity={0.85}
                        onPress={() =>
                          openRefill(
                            medicine,
                          )
                        }
                      >
                        <ShoppingBag
                          size={18}
                          color={SURFACE}
                          strokeWidth={2.5}
                        />

                        <Text
                          style={
                            styles.requestButtonText
                          }
                        >
                          {state === "OUT"
                            ? "Request from Pharmacy"
                            : "Request More"}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View
                        style={
                          styles.availablePanel
                        }
                      >
                        <CheckCircle2
                          size={16}
                          color={SUCCESS_DARK}
                          strokeWidth={2.5}
                        />

                        <Text
                          style={
                            styles.availableText
                          }
                        >
                          Available
                        </Text>
                      </View>
                    )}
                  </View>
                );
              },
            )}
          </ScrollView>
        )}
      </View>

      <Modal
        visible={Boolean(
          refillModal,
        )}
        transparent
        animationType="fade"
        onRequestClose={
          closeModal
        }
      >
        <KeyboardAvoidingView
          style={
            styles.modalBackdrop
          }
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <View
            style={styles.modalCard}
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <View
                style={
                  styles.modalHeaderText
                }
              >
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Pharmacy Request
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  {refillModal
                    ? `${refillModal.medicineName} · ${refillModal.dose}`
                    : ""}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.closeButton
                }
                onPress={
                  closeModal
                }
              >
                <X
                  size={20}
                  color={TEXT}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={
                styles.modalScroll
              }
              contentContainerStyle={
                styles.modalScrollContent
              }
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            >
              {isCareMatePrescription ? (
                <View
                  style={
                    styles.prescriptionPanel
                  }
                >
                  <ShieldCheck
                    size={19}
                    color={SUCCESS_DARK}
                    strokeWidth={2.6}
                  />

                  <View
                    style={
                      styles.prescriptionText
                    }
                  >
                    <Text
                      style={
                        styles.prescriptionTitle
                      }
                    >
                      CareMate+ Prescription
                    </Text>

                    <Text
                      style={
                        styles.prescriptionSubtitle
                      }
                    >
                      Prescription verified
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text
                    style={
                      styles.modalSectionTitle
                    }
                  >
                    Verification
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.verificationOption,
                      verificationPath ===
                      "ASSIGNED_DOCTOR"
                        ? styles.verificationSelected
                        : undefined,
                    ]}
                    activeOpacity={0.85}
                    onPress={() =>
                      selectVerificationPath(
                        "ASSIGNED_DOCTOR",
                      )
                    }
                  >
                    <View
                      style={
                        styles.optionIcon
                      }
                    >
                      <Stethoscope
                        size={20}
                        color={PRIMARY}
                        strokeWidth={2.6}
                      />
                    </View>

                    <View
                      style={
                        styles.optionText
                      }
                    >
                      <Text
                        style={
                          styles.optionTitle
                        }
                      >
                        My CareMate+ Doctor
                      </Text>

                      <Text
                        style={
                          styles.optionSubtitle
                        }
                      >
                        Doctor confirmation
                      </Text>
                    </View>

                    <SelectionDot
                      selected={
                        verificationPath ===
                        "ASSIGNED_DOCTOR"
                      }
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.verificationOption,
                      verificationPath ===
                      "EXTERNAL_EVIDENCE"
                        ? styles.verificationSelected
                        : undefined,
                    ]}
                    activeOpacity={0.85}
                    onPress={() =>
                      selectVerificationPath(
                        "EXTERNAL_EVIDENCE",
                      )
                    }
                  >
                    <View
                      style={
                        styles.optionIcon
                      }
                    >
                      <FileText
                        size={20}
                        color={PRIMARY}
                        strokeWidth={2.6}
                      />
                    </View>

                    <View
                      style={
                        styles.optionText
                      }
                    >
                      <Text
                        style={
                          styles.optionTitle
                        }
                      >
                        External Source
                      </Text>

                      <Text
                        style={
                          styles.optionSubtitle
                        }
                      >
                        Upload evidence
                      </Text>
                    </View>

                    <SelectionDot
                      selected={
                        verificationPath ===
                        "EXTERNAL_EVIDENCE"
                      }
                    />
                  </TouchableOpacity>

                  {verificationPath ===
                  "ASSIGNED_DOCTOR" ? (
                    <View
                      style={
                        styles.detailsSection
                      }
                    >
                      <Text
                        style={
                          styles.inputLabel
                        }
                      >
                        Select doctor
                      </Text>

                      {assignedDoctors.length ===
                      0 ? (
                        <View
                          style={
                            styles.noDoctorPanel
                          }
                        >
                          <UserRound
                            size={19}
                            color={WARNING_DARK}
                            strokeWidth={2.5}
                          />

                          <Text
                            style={
                              styles.noDoctorText
                            }
                          >
                            No assigned doctor
                          </Text>

                          <TouchableOpacity
                            style={
                              styles.selectDoctorButton
                            }
                            onPress={
                              openDoctorSelection
                            }
                          >
                            <Text
                              style={
                                styles.selectDoctorText
                              }
                            >
                              Select
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        assignedDoctors.map(
                          assignment => {
                            const selected =
                              selectedDoctorId ===
                              assignment
                                .doctor.id;

                            return (
                              <TouchableOpacity
                                key={
                                  assignment.assignmentId
                                }
                                style={[
                                  styles.doctorOption,
                                  selected
                                    ? styles.doctorSelected
                                    : undefined,
                                ]}
                                activeOpacity={0.85}
                                onPress={() =>
                                  selectDoctor(
                                    assignment,
                                  )
                                }
                              >
                                <View
                                  style={
                                    styles.doctorAvatar
                                  }
                                >
                                  <UserRound
                                    size={19}
                                    color={PRIMARY}
                                    strokeWidth={2.5}
                                  />
                                </View>

                                <View
                                  style={
                                    styles.doctorText
                                  }
                                >
                                  <Text
                                    style={
                                      styles.doctorName
                                    }
                                  >
                                    {
                                      assignment
                                        .doctor
                                        .fullName
                                    }
                                  </Text>

                                  <Text
                                    style={
                                      styles.doctorMeta
                                    }
                                  >
                                    {assignment
                                      .doctor
                                      .specialization ||
                                      "CareMate+ Doctor"}
                                  </Text>
                                </View>

                                <SelectionDot
                                  selected={
                                    selected
                                  }
                                />
                              </TouchableOpacity>
                            );
                          },
                        )
                      )}

                      <View
                        style={
                          styles.smallInfoPanel
                        }
                      >
                        <ShieldCheck
                          size={16}
                          color={PRIMARY_DARK}
                          strokeWidth={2.5}
                        />

                        <Text
                          style={
                            styles.smallInfoText
                          }
                        >
                          Doctor confirmation required.
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {verificationPath ===
                  "EXTERNAL_EVIDENCE" ? (
                    <View
                      style={
                        styles.detailsSection
                      }
                    >
                      <Text
                        style={
                          styles.inputLabel
                        }
                      >
                        Evidence type
                      </Text>

                      {EVIDENCE_OPTIONS.map(
                        option => {
                          const selected =
                            evidenceType ===
                            option.value;

                          return (
                            <TouchableOpacity
                              key={
                                option.value
                              }
                              style={[
                                styles.evidenceOption,
                                selected
                                  ? styles.evidenceSelected
                                  : undefined,
                              ]}
                              activeOpacity={0.85}
                              onPress={() =>
                                setEvidenceType(
                                  option.value,
                                )
                              }
                            >
                              <View
                                style={
                                  styles.evidenceText
                                }
                              >
                                <Text
                                  style={
                                    styles.evidenceTitle
                                  }
                                >
                                  {
                                    option.label
                                  }
                                </Text>

                                <Text
                                  style={
                                    styles.evidenceHelper
                                  }
                                >
                                  {
                                    option.helper
                                  }
                                </Text>
                              </View>

                              <SelectionDot
                                selected={
                                  selected
                                }
                              />
                            </TouchableOpacity>
                          );
                        },
                      )}

                      <Text
                        style={
                          styles.inputLabel
                        }
                      >
                        Evidence file
                      </Text>

                      {selectedEvidence ? (
                        <View
                          style={
                            styles.fileCard
                          }
                        >
                          <FileText
                            size={21}
                            color={PRIMARY}
                            strokeWidth={2.5}
                          />

                          <View
                            style={
                              styles.fileText
                            }
                          >
                            <Text
                              style={
                                styles.fileName
                              }
                              numberOfLines={1}
                            >
                              {
                                selectedEvidence.name
                              }
                            </Text>

                            <Text
                              style={
                                styles.fileMeta
                              }
                            >
                              {selectedEvidence.size !==
                              null
                                ? `${(
                                    selectedEvidence.size /
                                    (1024 *
                                      1024)
                                  ).toFixed(
                                    2,
                                  )} MB`
                                : "Selected"}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={
                              styles.removeButton
                            }
                            onPress={
                              removeEvidence
                            }
                          >
                            <X
                              size={17}
                              color={DANGER}
                              strokeWidth={2.5}
                            />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={
                            styles.uploadButton
                          }
                          activeOpacity={0.85}
                          disabled={
                            isPickingEvidence
                          }
                          onPress={() =>
                            void pickEvidence()
                          }
                        >
                          {isPickingEvidence ? (
                            <ActivityIndicator
                              color={PRIMARY}
                            />
                          ) : (
                            <>
                              <FileUp
                                size={20}
                                color={PRIMARY}
                                strokeWidth={2.5}
                              />

                              <View
                                style={
                                  styles.uploadText
                                }
                              >
                                <Text
                                  style={
                                    styles.uploadTitle
                                  }
                                >
                                  Upload file
                                </Text>

                                <Text
                                  style={
                                    styles.uploadSubtitle
                                  }
                                >
                                  PDF or image · max 8 MB
                                </Text>
                              </View>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      <View
                        style={
                          styles.warningPanel
                        }
                      >
                        <AlertTriangle
                          size={16}
                          color={WARNING_DARK}
                          strokeWidth={2.5}
                        />

                        <Text
                          style={
                            styles.warningText
                          }
                        >
                          Pharmacy review required.
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </>
              )}

              <Text
                style={
                  styles.inputLabel
                }
              >
                Quantity
              </Text>

              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={value =>
                  setQuantity(
                    value.replace(
                      /[^0-9]/g,
                      "",
                    ),
                  )
                }
                keyboardType="number-pad"
                placeholder="1"
              />

              <Text
                style={
                  styles.inputLabel
                }
              >
                Unit
              </Text>

              <TextInput
                style={styles.input}
                value={unit}
                onChangeText={setUnit}
                placeholder="pack, tablets, capsules"
                maxLength={30}
              />

              <Text
                style={
                  styles.inputLabel
                }
              >
                Note
              </Text>

              <TextInput
                style={
                  styles.noteInput
                }
                value={note}
                onChangeText={setNote}
                placeholder="Optional"
                multiline
                maxLength={500}
                textAlignVertical="top"
              />

              <View
                style={
                  styles.modalActions
                }
              >
                <TouchableOpacity
                  style={
                    styles.cancelButton
                  }
                  onPress={
                    closeModal
                  }
                  disabled={
                    isSubmitting
                  }
                >
                  <Text
                    style={
                      styles.cancelText
                    }
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    isSubmitting
                      ? styles.disabledButton
                      : undefined,
                  ]}
                  disabled={
                    isSubmitting
                  }
                  activeOpacity={0.85}
                  onPress={() =>
                    void submitRefill()
                  }
                >
                  {isSubmitting ? (
                    <ActivityIndicator
                      color={SURFACE}
                    />
                  ) : (
                    <>
                      <Send
                        size={17}
                        color={SURFACE}
                        strokeWidth={2.5}
                      />

                      <Text
                        style={
                          styles.sendText
                        }
                      >
                        Send Request
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const SelectionDot = ({
  selected,
}: {
  selected: boolean;
}) => (
  <View
    style={[
      styles.radioOuter,
      selected
        ? styles.radioSelected
        : undefined,
    ]}
  >
    {selected ? (
      <View
        style={styles.radioInner}
      />
    ) : null}
  </View>
);

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
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    ...elevate(1),
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "700",
  },

  headerSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 3,
  },

  loadingArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 11,
  },

  attentionSummary: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  attentionText: {
    flex: 1,
    marginLeft: 9,
  },

  attentionTitle: {
    color: WARNING_DARK,
    fontSize: 13,
    fontWeight: "700",
  },

  attentionSubtitle: {
    color: WARNING_DARK,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },

  healthySummary: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  healthyTitle: {
    color: SUCCESS_DARK,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 3,
    marginBottom: 10,
  },

  medicineCard: {
    backgroundColor: SURFACE,
    borderRadius: 15,
    padding: 13,
    marginBottom: 11,
    ...elevate(1),
  },

  medicineTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  medicineIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  medicineText: {
    flex: 1,
  },

  medicineName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },

  medicineDose: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },

  statusBadge: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "700",
  },

  stockDetails: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SOFT,
    borderRadius: 11,
    padding: 10,
    marginTop: 12,
  },

  stockDetail: {
    flex: 1,
  },

  detailLabel: {
    color: MUTED,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  detailValue: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },

  detailDivider: {
    width:
      StyleSheet.hairlineWidth,
    height: 31,
    backgroundColor: BORDER,
    marginHorizontal: 11,
  },

  pendingPanel: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 11,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  pendingText: {
    flex: 1,
    marginLeft: 8,
  },

  pendingTitle: {
    color: PRIMARY_DARK,
    fontSize: 10,
    fontWeight: "700",
  },

  pendingSubtitle: {
    color: PRIMARY_DARK,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },

  requestButton: {
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  requestButtonText: {
    color: SURFACE,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },

  availablePanel: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 10,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  availableText: {
    color: SUCCESS_DARK,
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 6,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor:
      "rgba(27,29,42,0.50)",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },

  modalCard: {
    maxHeight: "92%",
    backgroundColor: SURFACE,
    borderRadius: 18,
    paddingTop: 17,
    paddingHorizontal: 17,
    overflow: "hidden",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
  },

  modalHeaderText: {
    flex: 1,
  },

  modalTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },

  modalSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },

  closeButton: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: SOFT,
    alignItems: "center",
    justifyContent: "center",
  },

  modalScroll: {
    flexGrow: 0,
  },

  modalScrollContent: {
    paddingBottom: 17,
  },

  prescriptionPanel: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 12,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  prescriptionText: {
    flex: 1,
    marginLeft: 8,
  },

  prescriptionTitle: {
    color: SUCCESS_DARK,
    fontSize: 11,
    fontWeight: "700",
  },

  prescriptionSubtitle: {
    color: SUCCESS_DARK,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },

  modalSectionTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 3,
  },

  verificationOption: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  verificationSelected: {
    borderColor: PRIMARY,
    backgroundColor: "#F5F7FF",
  },

  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  optionText: {
    flex: 1,
  },

  optionTitle: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
  },

  optionSubtitle: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "500",
    marginTop: 2,
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#B9BECC",
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: PRIMARY,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },

  detailsSection: {
    marginTop: 6,
  },

  inputLabel: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 6,
  },

  noDoctorPanel: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 11,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  noDoctorText: {
    flex: 1,
    color: WARNING_DARK,
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 7,
  },

  selectDoctorButton: {
    backgroundColor: WARNING,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  selectDoctorText: {
    color: SURFACE,
    fontSize: 9,
    fontWeight: "700",
  },

  doctorOption: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  doctorSelected: {
    borderColor: PRIMARY,
    backgroundColor: "#F5F7FF",
  },

  doctorAvatar: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  doctorText: {
    flex: 1,
  },

  doctorName: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
  },

  doctorMeta: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "500",
    marginTop: 2,
  },

  smallInfoPanel: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 10,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  smallInfoText: {
    color: PRIMARY_DARK,
    fontSize: 9,
    fontWeight: "600",
    marginLeft: 7,
  },

  evidenceOption: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  evidenceSelected: {
    borderColor: PRIMARY,
    backgroundColor: "#F5F7FF",
  },

  evidenceText: {
    flex: 1,
  },

  evidenceTitle: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
  },

  evidenceHelper: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "500",
    marginTop: 2,
  },

  uploadButton: {
    minHeight: 60,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: PRIMARY,
    borderRadius: 12,
    backgroundColor: "#F7F8FF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  uploadText: {
    flex: 1,
    marginLeft: 9,
  },

  uploadTitle: {
    color: PRIMARY_DARK,
    fontSize: 10,
    fontWeight: "700",
  },

  uploadSubtitle: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "500",
    marginTop: 2,
  },

  fileCard: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 12,
    backgroundColor: "#F7F8FF",
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  fileText: {
    flex: 1,
    marginLeft: 8,
  },

  fileName: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
  },

  fileMeta: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "500",
    marginTop: 2,
  },

  removeButton: {
    width: 33,
    height: 33,
    borderRadius: 9,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  warningPanel: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 10,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  warningText: {
    color: WARNING_DARK,
    fontSize: 9,
    fontWeight: "600",
    marginLeft: 7,
  },

  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SOFT,
    color: TEXT,
    paddingHorizontal: 12,
  },

  noteInput: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SOFT,
    color: TEXT,
    padding: 12,
  },

  modalActions: {
    flexDirection: "row",
    marginTop: 15,
  },

  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: SOFT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  cancelText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },

  sendButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  sendText: {
    color: SURFACE,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },

  disabledButton: {
    opacity: 0.5,
  },
});

export default MedicineStockScreen;