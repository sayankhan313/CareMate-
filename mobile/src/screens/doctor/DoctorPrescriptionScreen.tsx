import {
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileImage,
  FilePenLine,
  Pill,
  Plus,
  Save,
  ScanLine,
  Stethoscope,
  Trash2,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { medicineOcrService } from "../../services/medicineOcrService";
import {
  doctorPrescriptionsApi,
  type DoctorPrescriptionFrequency,
  type DoctorPrescriptionItemInput,
  type DoctorPrescriptionSource,
} from "../../services/doctor/doctorPrescriptionsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    "DoctorPrescription"
  >;

type ScreenMode =
  | "SELECT"
  | "EDITOR";

type ScanInputSource =
  | "CAMERA"
  | "GALLERY";

type PrescriptionItemDraft =
  DoctorPrescriptionItemInput & {
    localId: string;
  };

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";
const BORDER = "#E4E8F2";

const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_SECONDARY = "#14B8A6";
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

const TIME_OPTIONS = [
  {
    label: "Morning",
    time: "08:00",
  },
  {
    label: "Afternoon",
    time: "13:00",
  },
  {
    label: "Night",
    time: "20:00",
  },
];

const FREQUENCY_OPTIONS: {
  label: string;
  value: DoctorPrescriptionFrequency;
  times: string[];
}[] = [
  {
    label: "Once daily",
    value: "ONCE_DAILY",
    times: ["08:00"],
  },
  {
    label: "Twice daily",
    value: "TWICE_DAILY",
    times: [
      "08:00",
      "20:00",
    ],
  },
  {
    label: "Three times",
    value:
      "THREE_TIMES_DAILY",
    times: [
      "08:00",
      "13:00",
      "20:00",
    ],
  },
  {
    label: "As needed",
    value: "AS_NEEDED",
    times: ["08:00"],
  },
];

const elevate = (
  level: 1 | 2 = 1
) => ({
  elevation:
    level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOffset: {
    width: 0,
    height: level === 1 ? 2 : 4,
  },
  shadowOpacity:
    Platform.OS === "android"
      ? 0
      : level === 1
        ? 0.06
        : 0.1,
  shadowRadius:
    level === 1 ? 4 : 8,
});

const getTodayDate = () => {
  const date = new Date();

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createLocalId = () => {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const createEmptyItem =
  (): PrescriptionItemDraft => ({
    localId: createLocalId(),
    name: "",
    dose: "",
    instructions: "",
    frequency: "ONCE_DAILY",
    customFrequency: "",
    selectedTimes: ["08:00"],
    startDate: getTodayDate(),
    endDate: "",
    prescriptionPattern: "",
  });

const getFrequencyFromTimes = (
  times: string[]
): DoctorPrescriptionFrequency => {
  if (times.length >= 3) {
    return "THREE_TIMES_DAILY";
  }

  if (times.length === 2) {
    return "TWICE_DAILY";
  }

  return "ONCE_DAILY";
};

const formatFrequency = (
  frequency: string
) => {
  return frequency
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
};

const DoctorPrescriptionScreen = ({
  navigation,
  route,
}: Props) => {
  const insets =
    useSafeAreaInsets();

  const {
    patientId,
    patientName,
  } = route.params;

  const [
    screenMode,
    setScreenMode,
  ] =
    useState<ScreenMode>("SELECT");

  const [
    prescriptionSource,
    setPrescriptionSource,
  ] =
    useState<DoctorPrescriptionSource>(
      "MANUAL"
    );

  const [items, setItems] =
    useState<
      PrescriptionItemDraft[]
    >([]);

  const [notes, setNotes] =
    useState("");

  const [
    rawDetectedText,
    setRawDetectedText,
  ] = useState("");

  const [
    ocrConfidence,
    setOcrConfidence,
  ] =
    useState<number | undefined>(
      undefined
    );

  const [
    prescriptionImageUri,
    setPrescriptionImageUri,
  ] = useState<
    string | undefined
  >(undefined);

  const [
    isScanning,
    setIsScanning,
  ] = useState(false);

  const [
    activeScanSource,
    setActiveScanSource,
  ] =
    useState<ScanInputSource | null>(
      null
    );

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const medicineCount =
    items.length;

  const handleBack = () => {
    if (
      screenMode === "EDITOR" &&
      !isSaving
    ) {
      setScreenMode("SELECT");
      return;
    }

    navigation.goBack();
  };

  const startManualPrescription =
    () => {
      setPrescriptionSource(
        "MANUAL"
      );

      setItems([
        createEmptyItem(),
      ]);

      setNotes("");
      setRawDetectedText("");
      setOcrConfidence(undefined);
      setPrescriptionImageUri(
        undefined
      );

      setScreenMode("EDITOR");
    };

  const buildScannedItems = (
    medicines: any[]
  ): PrescriptionItemDraft[] => {
    return medicines.map(
      (medicine) => {
        const draft =
          medicine.medicineDraft;

        const selectedTimes =
          Array.isArray(
            draft?.selectedTimes
          ) &&
          draft.selectedTimes.length >
            0
            ? draft.selectedTimes
            : [
                draft?.timeOfDay ||
                  "08:00",
              ];

        return {
          localId: createLocalId(),
          name:
            draft?.name ||
            medicine.brandName ||
            medicine.detectedName ||
            "",
          dose:
            draft?.dose ||
            medicine.dose ||
            "",
          instructions:
            draft?.instructions ||
            medicine.instructions ||
            "",
          frequency:
            draft?.frequency ||
            getFrequencyFromTimes(
              selectedTimes
            ),
          customFrequency: "",
          selectedTimes,
          startDate:
            draft?.startDate ||
            getTodayDate(),
          endDate:
            draft?.endDate || "",
          prescriptionPattern:
            draft?.prescriptionPattern ||
            medicine
              .prescriptionSchedule
              ?.pattern ||
            "",
        };
      }
    );
  };

  const scanPrescription =
    async (
      source: ScanInputSource
    ) => {
      if (isScanning) {
        return;
      }

      try {
        setIsScanning(true);
        setActiveScanSource(
          source
        );

        const ocrResult =
          source === "CAMERA"
            ? await medicineOcrService.scanFromCamera()
            : await medicineOcrService.scanFromGallery();

        if (!ocrResult) {
          return;
        }

        const parsed =
          await doctorPrescriptionsApi.parsePrescriptionScan(
            {
              detectedText:
                ocrResult.detectedText,
              ocrConfidence:
                ocrResult.ocrConfidence,
            }
          );

        if (
          !parsed.medicines ||
          parsed.medicines.length ===
            0
        ) {
          Alert.alert(
            "No medicines detected",
            "The prescription text was read, but no medicine could be matched. Try a clearer image or use manual entry."
          );

          return;
        }

        setPrescriptionSource(
          "SCANNED"
        );

        setItems(
          buildScannedItems(
            parsed.medicines
          )
        );

        setRawDetectedText(
          ocrResult.detectedText
        );

        setOcrConfidence(
          ocrResult.ocrConfidence
        );

        setPrescriptionImageUri(
          ocrResult.imageUri
        );

        setNotes("");
        setScreenMode("EDITOR");
      } catch (error) {
        Alert.alert(
          "Unable to scan",
          error instanceof Error
            ? error.message
            : "The prescription could not be scanned."
        );
      } finally {
        setIsScanning(false);
        setActiveScanSource(null);
      }
    };

  const updateItem = <
    K extends keyof PrescriptionItemDraft,
  >(
    localId: string,
    field: K,
    value:
      PrescriptionItemDraft[K]
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const updateFrequency = (
    localId: string,
    frequency: DoctorPrescriptionFrequency
  ) => {
    const option =
      FREQUENCY_OPTIONS.find(
        (item) =>
          item.value === frequency
      );

    setItems((current) =>
      current.map((item) =>
        item.localId === localId
          ? {
              ...item,
              frequency,
              selectedTimes:
                option?.times || [
                  "08:00",
                ],
            }
          : item
      )
    );
  };

  const toggleTime = (
    localId: string,
    time: string
  ) => {
    setItems((current) =>
      current.map((item) => {
        if (
          item.localId !==
          localId
        ) {
          return item;
        }

        const alreadySelected =
          item.selectedTimes.includes(
            time
          );

        if (
          alreadySelected &&
          item.selectedTimes.length ===
            1
        ) {
          return item;
        }

        const nextTimes =
          alreadySelected
            ? item.selectedTimes.filter(
                (selectedTime) =>
                  selectedTime !== time
              )
            : [
                ...item.selectedTimes,
                time,
              ];

        const sortedTimes =
          [...nextTimes].sort();

        return {
          ...item,
          selectedTimes:
            sortedTimes,
          frequency:
            item.frequency ===
            "AS_NEEDED"
              ? "AS_NEEDED"
              : getFrequencyFromTimes(
                  sortedTimes
                ),
        };
      })
    );
  };

  const addMedicineItem = () => {
    setItems((current) => [
      ...current,
      createEmptyItem(),
    ]);
  };

  const removeMedicineItem = (
    localId: string
  ) => {
    if (items.length === 1) {
      Alert.alert(
        "Medicine required",
        "A prescription must contain at least one medicine."
      );

      return;
    }

    setItems((current) =>
      current.filter(
        (item) =>
          item.localId !== localId
      )
    );
  };

  const validateItems = () => {
    for (
      let index = 0;
      index < items.length;
      index += 1
    ) {
      const item = items[index];

      if (!item.name.trim()) {
        return `Enter the medicine name for item ${
          index + 1
        }.`;
      }

      if (!item.dose.trim()) {
        return `Enter the dose for ${
          item.name ||
          `item ${index + 1}`
        }.`;
      }

      if (
        item.selectedTimes.length ===
        0
      ) {
        return `Select at least one reminder time for ${item.name}.`;
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          item.startDate.trim()
        )
      ) {
        return `Enter the start date for ${item.name} in YYYY-MM-DD format.`;
      }

      if (
        item.endDate?.trim() &&
        !/^\d{4}-\d{2}-\d{2}$/.test(
          item.endDate.trim()
        )
      ) {
        return `Enter the end date for ${item.name} in YYYY-MM-DD format.`;
      }
    }

    return null;
  };

  const savePrescription =
    async () => {
      if (isSaving) {
        return;
      }

      const validationError =
        validateItems();

      if (validationError) {
        Alert.alert(
          "Check prescription",
          validationError
        );

        return;
      }

      try {
        setIsSaving(true);

        const cleanItems =
          items.map((item) => ({
            name: item.name.trim(),
            dose: item.dose.trim(),
            instructions:
              item.instructions?.trim() ||
              undefined,
            frequency:
              item.frequency,
            customFrequency:
              item.customFrequency?.trim() ||
              undefined,
            selectedTimes:
              item.selectedTimes,
            startDate:
              item.startDate.trim(),
            endDate:
              item.endDate?.trim() ||
              undefined,
            prescriptionPattern:
              item.prescriptionPattern?.trim() ||
              undefined,
          }));

        const result =
          await doctorPrescriptionsApi.createPrescription(
            {
              patientId,
              source:
                prescriptionSource,
              notes:
                notes.trim() ||
                undefined,
              rawDetectedText:
                rawDetectedText ||
                undefined,
              ocrConfidence,
              items: cleanItems,
              imageUri:
                prescriptionImageUri,
            }
          );

        Alert.alert(
          "Prescription added",
          `${result.prescription.items.length} medicine${
            result.prescription
              .items.length === 1
              ? ""
              : "s"
          } added to ${patientName}'s medicine plan.`,
          [
            {
              text: "Done",
              onPress: () =>
                navigation.goBack(),
            },
          ]
        );
      } catch (error) {
        Alert.alert(
          "Unable to save",
          error instanceof Error
            ? error.message
            : "The prescription could not be saved."
        );
      } finally {
        setIsSaving(false);
      }
    };

  const screenTitle =
    screenMode === "SELECT"
      ? "Add Prescription"
      : prescriptionSource ===
          "SCANNED"
        ? "Review Prescription"
        : "Manual Prescription";

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
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
            activeOpacity={0.85}
            onPress={handleBack}
            disabled={
              isSaving ||
              isScanning
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
              style={styles.headerTitle}
              numberOfLines={1}
            >
              {screenTitle}
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
              numberOfLines={1}
            >
              Patient: {patientName}
            </Text>
          </View>
        </View>

        {screenMode ===
        "SELECT" ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.selectContent,
              {
                paddingBottom:
                  Math.max(
                    insets.bottom + 30,
                    50
                  ),
              },
            ]}
            showsVerticalScrollIndicator={
              false
            }
          >
            <View
              style={styles.heroCard}
            >
              <View
                style={styles.heroIcon}
              >
                <Stethoscope
                  size={28}
                  color={
                    DOCTOR_PRIMARY
                  }
                  strokeWidth={2.7}
                />
              </View>

              <Text
                style={styles.heroTitle}
              >
                Create a patient prescription
              </Text>

              <Text
                style={styles.heroText}
              >
                Add medicines manually or scan an existing prescription. You can review and edit every item before saving.
              </Text>
            </View>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Choose entry method
            </Text>

            <ActionCard
              title="Manual Entry"
              description="Enter medicines, doses, timings and instructions manually."
              icon={
                <FilePenLine
                  size={25}
                  color={
                    DOCTOR_PRIMARY
                  }
                  strokeWidth={2.7}
                />
              }
              onPress={
                startManualPrescription
              }
              disabled={
                isScanning
              }
            />

            <ActionCard
              title="Scan with Camera"
              description="Take a clear photo and extract medicines using OCR."
              icon={
                isScanning &&
                activeScanSource ===
                  "CAMERA" ? (
                  <ActivityIndicator
                    color={
                      DOCTOR_PRIMARY
                    }
                  />
                ) : (
                  <Camera
                    size={25}
                    color={
                      DOCTOR_PRIMARY
                    }
                    strokeWidth={2.7}
                  />
                )
              }
              onPress={() =>
                void scanPrescription(
                  "CAMERA"
                )
              }
              disabled={
                isScanning
              }
            />

            <ActionCard
              title="Upload Prescription"
              description="Select a prescription image from the phone gallery."
              icon={
                isScanning &&
                activeScanSource ===
                  "GALLERY" ? (
                  <ActivityIndicator
                    color={
                      DOCTOR_PRIMARY
                    }
                  />
                ) : (
                  <FileImage
                    size={25}
                    color={
                      DOCTOR_PRIMARY
                    }
                    strokeWidth={2.7}
                  />
                )
              }
              onPress={() =>
                void scanPrescription(
                  "GALLERY"
                )
              }
              disabled={
                isScanning
              }
            />

            <View
              style={styles.infoPanel}
            >
              <AlertCircle
                size={20}
                color={WARNING_DARK}
                strokeWidth={2.6}
              />

              <Text
                style={styles.infoText}
              >
                OCR results are drafts only. Check the medicine name, dose and schedule before saving.
              </Text>
            </View>
          </ScrollView>
        ) : (
          <>
            <ScrollView
              style={
                styles.scrollView
              }
              contentContainerStyle={[
                styles.editorContent,
                {
                  paddingBottom:
                    Math.max(
                      insets.bottom +
                        126,
                      150
                    ),
                },
              ]}
              showsVerticalScrollIndicator={
                false
              }
            >
              {prescriptionSource ===
              "SCANNED" ? (
                <View
                  style={
                    styles.scanSummary
                  }
                >
                  <View
                    style={
                      styles.scanSummaryIcon
                    }
                  >
                    <ScanLine
                      size={22}
                      color={
                        SUCCESS_DARK
                      }
                      strokeWidth={
                        2.7
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.scanSummaryTextBlock
                    }
                  >
                    <Text
                      style={
                        styles.scanSummaryTitle
                      }
                    >
                      Prescription scanned
                    </Text>

                    <Text
                      style={
                        styles.scanSummaryText
                      }
                    >
                      {medicineCount} medicine
                      {medicineCount ===
                      1
                        ? ""
                        : "s"}{" "}
                      detected
                      {ocrConfidence !==
                      undefined
                        ? ` · ${Math.round(
                            ocrConfidence
                          )}% OCR`
                        : ""}
                    </Text>
                  </View>

                  <CheckCircle2
                    size={21}
                    color={SUCCESS}
                    strokeWidth={2.7}
                  />
                </View>
              ) : null}

              <View
                style={
                  styles.notesPanel
                }
              >
                <Text
                  style={
                    styles.inputLabel
                  }
                >
                  Prescription note
                </Text>

                <TextInput
                  style={
                    styles.notesInput
                  }
                  value={notes}
                  onChangeText={
                    setNotes
                  }
                  placeholder="Optional clinical note..."
                  placeholderTextColor={
                    MUTED
                  }
                  multiline
                  maxLength={2000}
                  textAlignVertical="top"
                  editable={
                    !isSaving
                  }
                />
              </View>

              <View
                style={
                  styles.itemsHeader
                }
              >
                <View>
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
                    {medicineCount} item
                    {medicineCount ===
                    1
                      ? ""
                      : "s"}{" "}
                    in this prescription
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.addItemButton
                  }
                  activeOpacity={0.85}
                  onPress={
                    addMedicineItem
                  }
                  disabled={
                    isSaving
                  }
                >
                  <Plus
                    size={17}
                    color={SURFACE}
                    strokeWidth={2.8}
                  />

                  <Text
                    style={
                      styles.addItemText
                    }
                  >
                    Add
                  </Text>
                </TouchableOpacity>
              </View>

              {items.map(
                (item, index) => (
                  <MedicineEditorCard
                    key={item.localId}
                    item={item}
                    index={index}
                    canRemove={
                      items.length > 1
                    }
                    disabled={
                      isSaving
                    }
                    onUpdate={(
                      field,
                      value
                    ) =>
                      updateItem(
                        item.localId,
                        field,
                        value as never
                      )
                    }
                    onFrequencyChange={(
                      frequency
                    ) =>
                      updateFrequency(
                        item.localId,
                        frequency
                      )
                    }
                    onToggleTime={(
                      time
                    ) =>
                      toggleTime(
                        item.localId,
                        time
                      )
                    }
                    onRemove={() =>
                      removeMedicineItem(
                        item.localId
                      )
                    }
                  />
                )
              )}
            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  paddingBottom:
                    Math.max(
                      insets.bottom +
                        6,
                      14
                    ),
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSaving
                    ? styles.disabledButton
                    : undefined,
                ]}
                activeOpacity={0.86}
                onPress={() =>
                  void savePrescription()
                }
                disabled={
                  isSaving
                }
              >
                {isSaving ? (
                  <ActivityIndicator
                    color={SURFACE}
                  />
                ) : (
                  <>
                    <Save
                      size={19}
                      color={SURFACE}
                      strokeWidth={2.7}
                    />

                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      Save Prescription
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const ActionCard = ({
  title,
  description,
  icon,
  disabled,
  onPress,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  disabled: boolean;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.actionCard,
        disabled
          ? styles.disabledButton
          : undefined,
      ]}
      activeOpacity={0.86}
      onPress={onPress}
      disabled={disabled}
    >
      <View
        style={
          styles.actionCardIcon
        }
      >
        {icon}
      </View>

      <View
        style={
          styles.actionCardTextBlock
        }
      >
        <Text
          style={
            styles.actionCardTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.actionCardText
          }
        >
          {description}
        </Text>
      </View>

      <ChevronRight
        size={20}
        color={DOCTOR_PRIMARY}
        strokeWidth={2.7}
      />
    </TouchableOpacity>
  );
};

const MedicineEditorCard = ({
  item,
  index,
  canRemove,
  disabled,
  onUpdate,
  onFrequencyChange,
  onToggleTime,
  onRemove,
}: {
  item: PrescriptionItemDraft;
  index: number;
  canRemove: boolean;
  disabled: boolean;
  onUpdate: (
    field:
      keyof PrescriptionItemDraft,
    value: string
  ) => void;
  onFrequencyChange: (
    frequency: DoctorPrescriptionFrequency
  ) => void;
  onToggleTime: (
    time: string
  ) => void;
  onRemove: () => void;
}) => {
  return (
    <View
      style={styles.medicineCard}
    >
      <View
        style={
          styles.medicineCardHeader
        }
      >
        <View
          style={
            styles.medicineNumber
          }
        >
          <Text
            style={
              styles.medicineNumberText
            }
          >
            {index + 1}
          </Text>
        </View>

        <View
          style={
            styles.medicineHeaderText
          }
        >
          <Text
            style={
              styles.medicineCardTitle
            }
          >
            Medicine item
          </Text>

          <Text
            style={
              styles.medicineCardSubtitle
            }
          >
            Review all details
          </Text>
        </View>

        {canRemove ? (
          <TouchableOpacity
            style={
              styles.removeButton
            }
            activeOpacity={0.85}
            onPress={onRemove}
            disabled={disabled}
          >
            <Trash2
              size={18}
              color={DANGER}
              strokeWidth={2.6}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <InputField
        label="Medicine name"
        value={item.name}
        placeholder="e.g. Metformin"
        icon={
          <Pill
            size={17}
            color={DOCTOR_PRIMARY}
            strokeWidth={2.5}
          />
        }
        editable={!disabled}
        onChangeText={(value) =>
          onUpdate("name", value)
        }
      />

      <InputField
        label="Dose"
        value={item.dose}
        placeholder="e.g. 500mg"
        icon={
          <ClipboardList
            size={17}
            color={DOCTOR_PRIMARY}
            strokeWidth={2.5}
          />
        }
        editable={!disabled}
        onChangeText={(value) =>
          onUpdate("dose", value)
        }
      />

      <Text
        style={styles.inputLabel}
      >
        Frequency
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.frequencyRow
        }
      >
        {FREQUENCY_OPTIONS.map(
          (option) => {
            const selected =
              item.frequency ===
              option.value;

            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.frequencyChip,
                  selected
                    ? styles.frequencyChipSelected
                    : undefined,
                ]}
                activeOpacity={0.84}
                onPress={() =>
                  onFrequencyChange(
                    option.value
                  )
                }
                disabled={disabled}
              >
                <Text
                  style={[
                    styles.frequencyChipText,
                    selected
                      ? styles.frequencyChipTextSelected
                      : undefined,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </ScrollView>

      <Text
        style={styles.inputLabel}
      >
        Reminder times
      </Text>

      <View
        style={styles.timeRow}
      >
        {TIME_OPTIONS.map(
          (option) => {
            const selected =
              item.selectedTimes.includes(
                option.time
              );

            return (
              <TouchableOpacity
                key={option.time}
                style={[
                  styles.timeChip,
                  selected
                    ? styles.timeChipSelected
                    : undefined,
                ]}
                activeOpacity={0.84}
                onPress={() =>
                  onToggleTime(
                    option.time
                  )
                }
                disabled={disabled}
              >
                <Clock3
                  size={15}
                  color={
                    selected
                      ? SURFACE
                      : DOCTOR_PRIMARY
                  }
                  strokeWidth={2.5}
                />

                <Text
                  style={[
                    styles.timeChipLabel,
                    selected
                      ? styles.timeChipLabelSelected
                      : undefined,
                  ]}
                >
                  {option.label}
                </Text>

                <Text
                  style={[
                    styles.timeChipValue,
                    selected
                      ? styles.timeChipLabelSelected
                      : undefined,
                  ]}
                >
                  {option.time}
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </View>

      <View
        style={styles.dateRow}
      >
        <View
          style={
            styles.dateField
          }
        >
          <InputField
            label="Start date"
            value={item.startDate}
            placeholder="YYYY-MM-DD"
            icon={
              <CalendarDays
                size={17}
                color={
                  DOCTOR_PRIMARY
                }
                strokeWidth={2.5}
              />
            }
            editable={!disabled}
            onChangeText={(value) =>
              onUpdate(
                "startDate",
                value
              )
            }
          />
        </View>

        <View
          style={
            styles.dateField
          }
        >
          <InputField
            label="End date"
            value={
              item.endDate || ""
            }
            placeholder="Optional"
            icon={
              <CalendarDays
                size={17}
                color={
                  DOCTOR_PRIMARY
                }
                strokeWidth={2.5}
              />
            }
            editable={!disabled}
            onChangeText={(value) =>
              onUpdate(
                "endDate",
                value
              )
            }
          />
        </View>
      </View>

      <Text
        style={styles.inputLabel}
      >
        Instructions
      </Text>

      <TextInput
        style={
          styles.instructionsInput
        }
        value={
          item.instructions || ""
        }
        onChangeText={(value) =>
          onUpdate(
            "instructions",
            value
          )
        }
        placeholder="e.g. Take after food"
        placeholderTextColor={MUTED}
        multiline
        maxLength={1000}
        textAlignVertical="top"
        editable={!disabled}
      />

      {item.prescriptionPattern ? (
        <View
          style={styles.patternPanel}
        >
          <Text
            style={
              styles.patternLabel
            }
          >
            Prescription pattern
          </Text>

          <Text
            style={
              styles.patternValue
            }
          >
            {
              item.prescriptionPattern
            }
          </Text>

          <Text
            style={
              styles.patternFrequency
            }
          >
            {formatFrequency(
              item.frequency
            )}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const InputField = ({
  label,
  value,
  placeholder,
  icon,
  editable,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon: ReactNode;
  editable: boolean;
  onChangeText: (
    value: string
  ) => void;
}) => {
  return (
    <View
      style={styles.inputBlock}
    >
      <Text
        style={styles.inputLabel}
      >
        {label}
      </Text>

      <View
        style={styles.inputShell}
      >
        <View
          style={styles.inputIcon}
        >
          {icon}
        </View>

        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={
            MUTED
          }
          editable={editable}
        />
      </View>
    </View>
  );
};

export default DoctorPrescriptionScreen;

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
  selectContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  editorContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  heroCard: {
    backgroundColor: DOCTOR_PRIMARY,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    ...elevate(2),
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    color: SURFACE,
    fontSize: 21,
    fontWeight: "700",
    marginTop: 16,
  },
  heroText: {
    color: "#D7FFFA",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
    marginTop: 6,
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
  actionCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    marginTop: 11,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(1),
  },
  actionCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionCardTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  actionCardTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },
  actionCardText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 4,
  },
  infoPanel: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 14,
    padding: 14,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    color: WARNING_DARK,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginLeft: 9,
  },
  scanSummary: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scanSummaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  scanSummaryTextBlock: {
    flex: 1,
  },
  scanSummaryTitle: {
    color: SUCCESS_DARK,
    fontSize: 14,
    fontWeight: "700",
  },
  scanSummaryText: {
    color: SUCCESS_DARK,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },
  notesPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    ...elevate(1),
  },
  notesInput: {
    minHeight: 82,
    borderRadius: 12,
    backgroundColor: SOFT_PANEL,
    color: TEXT,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    padding: 12,
    marginTop: 7,
  },
  itemsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  addItemButton: {
    backgroundColor: DOCTOR_PRIMARY,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  addItemText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },
  medicineCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    marginBottom: 13,
    ...elevate(1),
  },
  medicineCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  medicineNumber: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: DOCTOR_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  medicineNumberText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "700",
  },
  medicineHeaderText: {
    flex: 1,
  },
  medicineCardTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },
  medicineCardSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  inputBlock: {
    marginBottom: 12,
  },
  inputLabel: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },
  inputShell: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: SOFT_PANEL,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  inputIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "500",
    paddingVertical: 10,
  },
  frequencyRow: {
    paddingBottom: 12,
  },
  frequencyChip: {
    borderRadius: 10,
    backgroundColor: SOFT_PANEL,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginRight: 8,
  },
  frequencyChipSelected: {
    backgroundColor: DOCTOR_LIGHT,
  },
  frequencyChipText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
  },
  frequencyChipTextSelected: {
    color: DOCTOR_DARK,
    fontWeight: "700",
  },
  timeRow: {
    flexDirection: "row",
    marginBottom: 13,
  },
  timeChip: {
    flex: 1,
    minHeight: 74,
    borderRadius: 12,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    padding: 8,
  },
  timeChipSelected: {
    backgroundColor: DOCTOR_PRIMARY,
  },
  timeChipLabel: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 5,
  },
  timeChipValue: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
  timeChipLabelSelected: {
    color: SURFACE,
  },
  dateRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateField: {
    flex: 1,
  },
  instructionsInput: {
    minHeight: 92,
    borderRadius: 12,
    backgroundColor: SOFT_PANEL,
    color: TEXT,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    padding: 12,
  },
  patternPanel: {
    backgroundColor: DOCTOR_LIGHT,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  patternLabel: {
    color: DOCTOR_DARK,
    fontSize: 10,
    fontWeight: "600",
  },
  patternValue: {
    color: DOCTOR_DARK,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 4,
  },
  patternFrequency: {
    color: DOCTOR_DARK,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
    paddingTop: 12,
    ...elevate(2),
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: DOCTOR_PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.58,
  },
});