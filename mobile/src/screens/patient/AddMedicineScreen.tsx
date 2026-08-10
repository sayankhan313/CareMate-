import {
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Controller,
  useForm,
} from "react-hook-form";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FilePenLine,
  FileText,
  Pill,
  Send,
  Stethoscope,
} from "lucide-react-native";
import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedTextInput as TextInput } from "../../components/common/LocalizedTextInput";
import { LocalizedAlert as Alert } from "../../utils/localizedAlert";

import type {
  MedicineDraft,
  RootStackParamList,
} from "../../types/navigation";

type AddMedicineScreenProps =
  NativeStackScreenProps<
    RootStackParamList,
    "AddMedicine"
  >;

type MedicineFrequency =
  MedicineDraft["frequency"];

type AddMedicineFormValues = {
  name: string;
  dose: string;
  frequency: MedicineFrequency;
  customFrequency: string;
  selectedTimes: string[];
  startDate: string;
  endDate: string;
  instructions: string;
  sendToDoctorForReview: boolean;
};

type DropdownOption = {
  label: string;
  value: MedicineFrequency;
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#2144A5";
const PRIMARY_LIGHT = "#E8EDFF";

const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#F6A545";
const WARNING_DARK = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const frequencyOptions: DropdownOption[] = [
  {
    label: "Once daily",
    value: "ONCE_DAILY",
  },
  {
    label: "Twice daily",
    value: "TWICE_DAILY",
  },
  {
    label: "Three times daily",
    value: "THREE_TIMES_DAILY",
  },
  {
    label: "Four times daily",
    value: "FOUR_TIMES_DAILY",
  },
  {
    label: "As needed",
    value: "AS_NEEDED",
  },
  {
    label: "Custom schedule",
    value: "CUSTOM",
  },
];

const timeOptions = [
  {
    label: "06:00",
    value: "06:00",
  },
  {
    label: "08:00",
    value: "08:00",
  },
  {
    label: "10:00",
    value: "10:00",
  },
  {
    label: "12:00",
    value: "12:00",
  },
  {
    label: "13:00",
    value: "13:00",
  },
  {
    label: "16:00",
    value: "16:00",
  },
  {
    label: "18:00",
    value: "18:00",
  },
  {
    label: "20:00",
    value: "20:00",
  },
  {
    label: "21:00",
    value: "21:00",
  },
  {
    label: "22:00",
    value: "22:00",
  },
];

const elevate = (
  level: 1 | 2 = 1
) => ({
  elevation:
    level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity:
    Platform.OS === "android"
      ? 0
      : 0.08,
  shadowRadius:
    level === 1 ? 4 : 8,
  shadowOffset: {
    width: 0,
    height:
      level === 1 ? 2 : 4,
  },
});

const getTodayDateForInput = () => {
  const today = new Date();

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const year =
    today.getFullYear();

  return `${day}/${month}/${year}`;
};

const isValidDateText = (
  date: string
) => {
  const trimmedDate =
    date.trim();

  return (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      trimmedDate
    ) ||
    /^\d{4}-\d{2}-\d{2}$/.test(
      trimmedDate
    )
  );
};

const getRequiredTimeCount = (
  frequency: MedicineFrequency,
  isResubmitMode: boolean
) => {
  if (isResubmitMode) {
    return 1;
  }

  if (
    frequency ===
    "TWICE_DAILY"
  ) {
    return 2;
  }

  if (
    frequency ===
    "THREE_TIMES_DAILY"
  ) {
    return 3;
  }

  if (
    frequency ===
    "FOUR_TIMES_DAILY"
  ) {
    return 4;
  }

  return 1;
};

const getDefaultTimesForFrequency = (
  frequency: MedicineFrequency,
  isResubmitMode: boolean
) => {
  if (isResubmitMode) {
    return ["08:00"];
  }

  if (
    frequency ===
    "TWICE_DAILY"
  ) {
    return [
      "08:00",
      "20:00",
    ];
  }

  if (
    frequency ===
    "THREE_TIMES_DAILY"
  ) {
    return [
      "08:00",
      "13:00",
      "20:00",
    ];
  }

  if (
    frequency ===
    "FOUR_TIMES_DAILY"
  ) {
    return [
      "08:00",
      "12:00",
      "16:00",
      "20:00",
    ];
  }

  return ["08:00"];
};

const getInitialSelectedTimes = (
  medicineDraft: MedicineDraft | undefined,
  isResubmitMode: boolean
) => {
  if (
    medicineDraft?.selectedTimes &&
    medicineDraft.selectedTimes
      .length > 0
  ) {
    if (isResubmitMode) {
      return [
        medicineDraft
          .selectedTimes[0],
      ];
    }

    return medicineDraft
      .selectedTimes;
  }

  if (
    medicineDraft?.timeOfDay
  ) {
    return [
      medicineDraft.timeOfDay,
    ];
  }

  return getDefaultTimesForFrequency(
    medicineDraft?.frequency ||
      "ONCE_DAILY",
    isResubmitMode
  );
};

const getTimeRequirementText = (
  frequency: MedicineFrequency,
  isResubmitMode: boolean
) => {
  if (isResubmitMode) {
    return "Select one time for this medicine review request.";
  }

  const count =
    getRequiredTimeCount(
      frequency,
      false
    );

  return count === 1
    ? "Select exactly 1 reminder time."
    : `Select exactly ${count} reminder times.`;
};

export const AddMedicineScreen = ({
  navigation,
  route,
}: AddMedicineScreenProps) => {
  const insets =
    useSafeAreaInsets();

  const medicineDraft =
    route.params?.medicineDraft;

  const mode =
    route.params?.mode ||
    "CREATE";

  const medicineReviewRequestId =
    route.params
      ?.medicineReviewRequestId;

  const isEditDraftMode =
    mode === "EDIT_DRAFT";

  const isResubmitMode =
    mode ===
    "RESUBMIT_REVIEW";

  const initialFrequency =
    medicineDraft?.frequency ||
    "ONCE_DAILY";

  const [
    isFrequencyDropdownOpen,
    setIsFrequencyDropdownOpen,
  ] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: {
      errors,
      isSubmitting,
    },
  } =
    useForm<AddMedicineFormValues>(
      {
        defaultValues: {
          name:
            medicineDraft?.name ||
            "",
          dose:
            medicineDraft?.dose ||
            "",
          frequency:
            initialFrequency,
          customFrequency:
            medicineDraft
              ?.customFrequency ||
            "",
          selectedTimes:
            getInitialSelectedTimes(
              medicineDraft,
              isResubmitMode
            ),
          startDate:
            medicineDraft
              ?.startDate ||
            getTodayDateForInput(),
          endDate:
            medicineDraft
              ?.endDate || "",
          instructions:
            medicineDraft
              ?.instructions || "",
          sendToDoctorForReview:
            isResubmitMode
              ? true
              : medicineDraft
                  ?.sendToDoctorForReview ||
                false,
        },
      }
    );

  const frequency =
    watch("frequency");

  const selectedTimes =
    watch("selectedTimes") || [];

  const selectedFrequencyLabel =
    useMemo(() => {
      return (
        frequencyOptions.find(
          (option) =>
            option.value ===
            frequency
        )?.label ||
        "Once daily"
      );
    }, [frequency]);

  const requiredTimeCount =
    useMemo(() => {
      return getRequiredTimeCount(
        frequency,
        isResubmitMode
      );
    }, [
      frequency,
      isResubmitMode,
    ]);

  const handleFrequencySelect = (
    value: MedicineFrequency
  ) => {
    setValue(
      "frequency",
      value,
      {
        shouldValidate: true,
        shouldDirty: true,
      }
    );

    setValue(
      "selectedTimes",
      getDefaultTimesForFrequency(
        value,
        isResubmitMode
      ),
      {
        shouldValidate: true,
        shouldDirty: true,
      }
    );

    if (
      value !== "CUSTOM"
    ) {
      setValue(
        "customFrequency",
        "",
        {
          shouldValidate: true,
          shouldDirty: true,
        }
      );
    }

    setIsFrequencyDropdownOpen(
      false
    );
  };

  const toggleTime = (
    time: string
  ) => {
    const alreadySelected =
      selectedTimes.includes(
        time
      );

    if (alreadySelected) {
      if (
        selectedTimes.length ===
        1
      ) {
        Alert.alert(
          "Reminder time required",
          "At least one reminder time must remain selected."
        );

        return;
      }

      setValue(
        "selectedTimes",
        selectedTimes.filter(
          (selectedTime) =>
            selectedTime !== time
        ),
        {
          shouldValidate: true,
          shouldDirty: true,
        }
      );

      return;
    }

    if (
      selectedTimes.length <
      requiredTimeCount
    ) {
      setValue(
        "selectedTimes",
        [
          ...selectedTimes,
          time,
        ],
        {
          shouldValidate: true,
          shouldDirty: true,
        }
      );

      return;
    }

    const updatedTimes = [
      ...selectedTimes.slice(1),
      time,
    ];

    setValue(
      "selectedTimes",
      updatedTimes,
      {
        shouldValidate: true,
        shouldDirty: true,
      }
    );
  };

  const onSubmit = (
    formData: AddMedicineFormValues
  ) => {
    const trimmedName =
      formData.name.trim();

    const trimmedDose =
      formData.dose.trim();

    const trimmedCustomFrequency =
      formData.customFrequency.trim();

    const trimmedStartDate =
      formData.startDate.trim();

    const trimmedEndDate =
      formData.endDate.trim();

    const trimmedInstructions =
      formData.instructions.trim();

    const expectedTimeCount =
      getRequiredTimeCount(
        formData.frequency,
        isResubmitMode
      );

    if (
      formData.selectedTimes
        .length !==
      expectedTimeCount
    ) {
      Alert.alert(
        "Reminder time required",
        expectedTimeCount === 1
          ? "Please select exactly one reminder time."
          : `Please select exactly ${expectedTimeCount} reminder times.`
      );

      return;
    }

    if (
      formData.frequency ===
        "CUSTOM" &&
      trimmedCustomFrequency
        .length < 2
    ) {
      Alert.alert(
        "Custom schedule required",
        "Please describe the custom medicine frequency."
      );

      return;
    }

    if (
      isResubmitMode &&
      !medicineReviewRequestId
    ) {
      Alert.alert(
        "Review unavailable",
        "The medicine review request ID is missing."
      );

      return;
    }

    const updatedMedicineDraft: MedicineDraft =
      {
        name: trimmedName,
        dose: trimmedDose,
        frequency:
          formData.frequency,
        customFrequency:
          formData.frequency ===
          "CUSTOM"
            ? trimmedCustomFrequency
            : undefined,
        timeOfDay:
          formData
            .selectedTimes[0],
        selectedTimes:
          formData.selectedTimes,
        startDate:
          trimmedStartDate,
        endDate:
          trimmedEndDate ||
          undefined,
        instructions:
          trimmedInstructions ||
          undefined,
        prescriptionPattern:
          medicineDraft
            ?.prescriptionPattern ??
          null,
        sendToDoctorForReview:
          isResubmitMode
            ? true
            : formData
                .sendToDoctorForReview,
      };

    const confirmParams = {
      medicineDraft:
        updatedMedicineDraft,
      mode: isResubmitMode
        ? ("RESUBMIT_REVIEW" as const)
        : ("CREATE" as const),
      medicineReviewRequestId:
        isResubmitMode
          ? medicineReviewRequestId
          : undefined,
    };

    if (
      isEditDraftMode ||
      isResubmitMode
    ) {
      navigation.replace(
        "ConfirmReminder",
        confirmParams
      );

      return;
    }

    navigation.navigate(
      "ConfirmReminder",
      confirmParams
    );
  };

  const headerTitle =
    isResubmitMode
      ? "Edit and Resubmit"
      : isEditDraftMode
        ? "Edit Medicine"
        : "Add Medicine";

  const headerSubtitle =
    isResubmitMode
      ? "Update the rejected medicine request"
      : isEditDraftMode
        ? "Review the detected medicine details"
        : "Create a medicine reminder";

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
        style={styles.screen}
      >
        <View
          style={styles.appBar}
        >
          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.85}
            disabled={
              isSubmitting
            }
          >
            <ArrowLeft
              size={22}
              color={TEXT}
              strokeWidth={2.6}
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
              {headerTitle}
            </Text>

            <Text
              style={
                styles.appBarSubtitle
              }
            >
              {headerSubtitle}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                Math.max(
                  150,
                  insets.bottom +
                    140
                ),
            },
          ]}
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
        >
          {isEditDraftMode ? (
            <View
              style={
                styles.successNotice
              }
            >
              <View
                style={
                  styles.noticeIcon
                }
              >
                <CheckCircle2
                  size={20}
                  color={SUCCESS}
                  strokeWidth={2.8}
                />
              </View>

              <View
                style={
                  styles.noticeTextBlock
                }
              >
                <Text
                  style={
                    styles.successNoticeTitle
                  }
                >
                  Auto-filled from scan
                </Text>

                <Text
                  style={
                    styles.successNoticeText
                  }
                >
                  Check the detected details before confirming.
                </Text>
              </View>
            </View>
          ) : null}

          {isResubmitMode ? (
            <View
              style={
                styles.resubmitNotice
              }
            >
              <View
                style={
                  styles.resubmitIcon
                }
              >
                <FilePenLine
                  size={20}
                  color={
                    WARNING_DARK
                  }
                  strokeWidth={2.6}
                />
              </View>

              <View
                style={
                  styles.noticeTextBlock
                }
              >
                <Text
                  style={
                    styles.resubmitNoticeTitle
                  }
                >
                  Updating rejected request
                </Text>

                <Text
                  style={
                    styles.resubmitNoticeText
                  }
                >
                  Review the doctor’s note, correct the medicine details and submit again.
                </Text>
              </View>
            </View>
          ) : null}

          <View
            style={
              styles.formSection
            }
          >
            <SectionHeader
              icon={
                <Pill
                  size={20}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              }
              title="Medicine details"
              subtitle="Name and dose information"
            />

            <FieldLabel label="Medicine name" />

            <Controller
              control={control}
              name="name"
              rules={{
                required:
                  "Medicine name is required.",
                minLength: {
                  value: 2,
                  message:
                    "Medicine name must be at least 2 characters.",
                },
              }}
              render={({
                field,
              }) => (
                <TextInput
                  value={
                    field.value
                  }
                  onChangeText={
                    field.onChange
                  }
                  onBlur={
                    field.onBlur
                  }
                  placeholder="e.g., Metformin"
                  placeholderTextColor="#A8B0C2"
                  style={[
                    styles.input,
                    errors.name
                      ? styles.inputError
                      : undefined,
                  ]}
                />
              )}
            />

            {errors.name ? (
              <Text
                style={
                  styles.errorText
                }
              >
                {
                  errors.name
                    .message
                }
              </Text>
            ) : null}

            <FieldLabel label="Dose" />

            <Controller
              control={control}
              name="dose"
              rules={{
                required:
                  "Dose is required.",
              }}
              render={({
                field,
              }) => (
                <TextInput
                  value={
                    field.value
                  }
                  onChangeText={
                    field.onChange
                  }
                  onBlur={
                    field.onBlur
                  }
                  placeholder="e.g., 500mg"
                  placeholderTextColor="#A8B0C2"
                  style={[
                    styles.input,
                    errors.dose
                      ? styles.inputError
                      : undefined,
                  ]}
                />
              )}
            />

            {errors.dose ? (
              <Text
                style={
                  styles.errorText
                }
              >
                {
                  errors.dose
                    .message
                }
              </Text>
            ) : null}
          </View>

          <View
            style={
              styles.formSection
            }
          >
            <SectionHeader
              icon={
                <Clock3
                  size={20}
                  color={WARNING}
                  strokeWidth={2.6}
                />
              }
              title="Schedule"
              subtitle="Frequency and reminder time"
            />

            <FieldLabel label="Frequency" />

            <TouchableOpacity
              style={
                styles.selectBox
              }
              onPress={() =>
                setIsFrequencyDropdownOpen(
                  (
                    currentValue
                  ) =>
                    !currentValue
                )
              }
              activeOpacity={0.85}
            >
              <View>
                <Text
                  style={
                    styles.selectSmallLabel
                  }
                >
                  Selected
                </Text>

                <Text
                  style={
                    styles.selectText
                  }
                >
                  {
                    selectedFrequencyLabel
                  }
                </Text>
              </View>

              {isFrequencyDropdownOpen ? (
                <ChevronUp
                  size={22}
                  color={PRIMARY}
                  strokeWidth={2.7}
                />
              ) : (
                <ChevronDown
                  size={22}
                  color={MUTED}
                  strokeWidth={2.7}
                />
              )}
            </TouchableOpacity>

            {isFrequencyDropdownOpen ? (
              <View
                style={
                  styles.dropdownMenu
                }
              >
                {frequencyOptions.map(
                  (option) => {
                    const isSelected =
                      option.value ===
                      frequency;

                    return (
                      <TouchableOpacity
                        key={
                          option.value
                        }
                        style={[
                          styles.dropdownOption,
                          isSelected
                            ? styles.dropdownOptionSelected
                            : undefined,
                        ]}
                        onPress={() =>
                          handleFrequencySelect(
                            option.value
                          )
                        }
                        activeOpacity={
                          0.85
                        }
                      >
                        <Text
                          style={[
                            styles.dropdownOptionText,
                            isSelected
                              ? styles.dropdownOptionTextSelected
                              : undefined,
                          ]}
                        >
                          {
                            option.label
                          }
                        </Text>

                        {isSelected ? (
                          <CheckCircle2
                            size={
                              18
                            }
                            color={
                              PRIMARY
                            }
                            strokeWidth={
                              2.7
                            }
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            ) : null}

            {frequency ===
            "CUSTOM" ? (
              <>
                <FieldLabel label="Custom frequency" />

                <Controller
                  control={control}
                  name="customFrequency"
                  rules={{
                    required:
                      "Custom frequency is required.",
                    minLength: {
                      value: 2,
                      message:
                        "Please describe the custom frequency.",
                    },
                  }}
                  render={({
                    field,
                  }) => (
                    <TextInput
                      value={
                        field.value
                      }
                      onChangeText={
                        field.onChange
                      }
                      onBlur={
                        field.onBlur
                      }
                      placeholder="e.g., Every alternate day"
                      placeholderTextColor="#A8B0C2"
                      style={[
                        styles.input,
                        errors.customFrequency
                          ? styles.inputError
                          : undefined,
                      ]}
                    />
                  )}
                />

                {errors.customFrequency ? (
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {
                      errors
                        .customFrequency
                        .message
                    }
                  </Text>
                ) : null}
              </>
            ) : null}

            <FieldLabel label="Reminder time" />

            <View
              style={
                styles.timeGrid
              }
            >
              {timeOptions.map(
                (option) => {
                  const isSelected =
                    selectedTimes.includes(
                      option.value
                    );

                  return (
                    <TouchableOpacity
                      key={
                        option.value
                      }
                      style={[
                        styles.timeChip,
                        isSelected
                          ? styles.timeChipSelected
                          : undefined,
                      ]}
                      onPress={() =>
                        toggleTime(
                          option.value
                        )
                      }
                      activeOpacity={
                        0.85
                      }
                    >
                      <Clock3
                        size={15}
                        color={
                          isSelected
                            ? PRIMARY_DARK
                            : MUTED
                        }
                        strokeWidth={
                          2.5
                        }
                      />

                      <Text
                        style={[
                          styles.timeChipText,
                          isSelected
                            ? styles.timeChipTextSelected
                            : undefined,
                        ]}
                      >
                        {
                          option.label
                        }
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            <View
              style={
                styles.helperBox
              }
            >
              <Text
                style={
                  styles.helperText
                }
              >
                {getTimeRequirementText(
                  frequency,
                  isResubmitMode
                )}
              </Text>

              <Text
                style={
                  styles.selectedTimeText
                }
              >
                Selected:{" "}
                {selectedTimes.join(
                  ", "
                )}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.formSection
            }
          >
            <SectionHeader
              icon={
                <CalendarDays
                  size={20}
                  color={SUCCESS}
                  strokeWidth={2.6}
                />
              }
              title="Dates"
              subtitle="Start and optional end date"
            />

            <FieldLabel label="Start date" />

            <Controller
              control={control}
              name="startDate"
              rules={{
                required:
                  "Start date is required.",
                validate: (
                  value
                ) =>
                  isValidDateText(
                    value
                  ) ||
                  "Please enter start date in DD/MM/YYYY format.",
              }}
              render={({
                field,
              }) => (
                <TextInput
                  value={
                    field.value
                  }
                  onChangeText={
                    field.onChange
                  }
                  onBlur={
                    field.onBlur
                  }
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#A8B0C2"
                  keyboardType="numbers-and-punctuation"
                  style={[
                    styles.input,
                    errors.startDate
                      ? styles.inputError
                      : undefined,
                  ]}
                />
              )}
            />

            {errors.startDate ? (
              <Text
                style={
                  styles.errorText
                }
              >
                {
                  errors.startDate
                    .message
                }
              </Text>
            ) : null}

            <FieldLabel label="End date optional" />

            <Controller
              control={control}
              name="endDate"
              rules={{
                validate: (
                  value
                ) => {
                  if (
                    !value.trim()
                  ) {
                    return true;
                  }

                  return (
                    isValidDateText(
                      value
                    ) ||
                    "Please enter end date in DD/MM/YYYY format."
                  );
                },
              }}
              render={({
                field,
              }) => (
                <TextInput
                  value={
                    field.value
                  }
                  onChangeText={
                    field.onChange
                  }
                  onBlur={
                    field.onBlur
                  }
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#A8B0C2"
                  keyboardType="numbers-and-punctuation"
                  style={[
                    styles.input,
                    errors.endDate
                      ? styles.inputError
                      : undefined,
                  ]}
                />
              )}
            />

            {errors.endDate ? (
              <Text
                style={
                  styles.errorText
                }
              >
                {
                  errors.endDate
                    .message
                }
              </Text>
            ) : null}
          </View>

          <View
            style={
              styles.formSection
            }
          >
            <SectionHeader
              icon={
                <FileText
                  size={20}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              }
              title="Instructions"
              subtitle="Optional note for this medicine"
            />

            <Controller
              control={control}
              name="instructions"
              render={({
                field,
              }) => (
                <TextInput
                  value={
                    field.value
                  }
                  onChangeText={
                    field.onChange
                  }
                  onBlur={
                    field.onBlur
                  }
                  placeholder="e.g., Take after breakfast"
                  placeholderTextColor="#A8B0C2"
                  style={[
                    styles.input,
                    styles.multilineInput,
                  ]}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
              )}
            />
          </View>

          <View
            style={
              styles.reviewSection
            }
          >
            <View
              style={
                styles.reviewIconCircle
              }
            >
              <Stethoscope
                size={22}
                color={PRIMARY}
                strokeWidth={2.6}
              />
            </View>

            <View
              style={
                styles.reviewTextBlock
              }
            >
              <Text
                style={
                  styles.reviewTitle
                }
              >
                Doctor review
              </Text>

              <Text
                style={
                  styles.reviewSubtitle
                }
              >
                {isResubmitMode
                  ? "This corrected medicine will be sent back to your primary doctor."
                  : "Send this medicine to your primary doctor before activating it."}
              </Text>
            </View>

            <Controller
              control={control}
              name="sendToDoctorForReview"
              render={({
                field,
              }) => (
                <Switch
                  value={
                    isResubmitMode
                      ? true
                      : field.value
                  }
                  onValueChange={
                    field.onChange
                  }
                  disabled={
                    isResubmitMode
                  }
                  trackColor={{
                    false:
                      "#DDE3EF",
                    true:
                      PRIMARY_LIGHT,
                  }}
                  thumbColor={
                    isResubmitMode ||
                    field.value
                      ? PRIMARY
                      : SURFACE
                  }
                />
              )}
            />
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom:
                Math.max(
                  insets.bottom +
                    12,
                  28
                ),
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isSubmitting
                ? styles.disabledButton
                : undefined,
            ]}
            onPress={handleSubmit(
              onSubmit
            )}
            activeOpacity={0.85}
            disabled={
              isSubmitting
            }
          >
            <Send
              size={19}
              color={SURFACE}
              strokeWidth={2.6}
            />

            <Text
              style={
                styles.primaryButtonText
              }
            >
              {isResubmitMode
                ? "Review Resubmission"
                : isEditDraftMode
                  ? "Update Reminder Details"
                  : "Review Reminder"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) => {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <View
        style={
          styles.sectionIcon
        }
      >
        {icon}
      </View>

      <View
        style={
          styles.sectionTextBlock
        }
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.sectionSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
};

const FieldLabel = ({
  label,
}: {
  label: string;
}) => {
  return (
    <Text style={styles.label}>
      {label}
    </Text>
  );
};

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
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 14,
      flexDirection: "row",
      alignItems: "center",
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
      marginRight: 13,
      ...elevate(1),
    },
    appBarTextBlock: {
      flex: 1,
    },
    appBarTitle: {
      color: TEXT,
      fontSize: 25,
      fontWeight: "700",
    },
    appBarSubtitle: {
      color: MUTED,
      fontSize: 13,
      fontWeight: "500",
      marginTop: 3,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 5,
    },
    successNotice: {
      backgroundColor:
        SUCCESS_LIGHT,
      borderRadius: 15,
      padding: 13,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 13,
    },
    resubmitNotice: {
      backgroundColor:
        WARNING_LIGHT,
      borderRadius: 15,
      padding: 13,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 13,
    },
    noticeIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        SURFACE,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
    },
    resubmitIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        SURFACE,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
    },
    noticeTextBlock: {
      flex: 1,
    },
    successNoticeTitle: {
      color: SUCCESS_DARK,
      fontSize: 14,
      fontWeight: "700",
    },
    successNoticeText: {
      color: SUCCESS_DARK,
      fontSize: 11,
      fontWeight: "500",
      lineHeight: 17,
      marginTop: 3,
    },
    resubmitNoticeTitle: {
      color: WARNING_DARK,
      fontSize: 14,
      fontWeight: "700",
    },
    resubmitNoticeText: {
      color: WARNING_DARK,
      fontSize: 11,
      fontWeight: "500",
      lineHeight: 17,
      marginTop: 3,
    },
    formSection: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      padding: 16,
      marginBottom: 13,
      ...elevate(1),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 5,
    },
    sectionIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        PRIMARY_LIGHT,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
    },
    sectionTextBlock: {
      flex: 1,
    },
    sectionTitle: {
      color: TEXT,
      fontSize: 16,
      fontWeight: "700",
    },
    sectionSubtitle: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "500",
      marginTop: 3,
    },
    label: {
      color: TEXT,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 7,
      marginTop: 15,
    },
    input: {
      minHeight: 49,
      backgroundColor:
        SOFT_PANEL,
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 13,
      paddingHorizontal: 13,
      paddingVertical: 12,
      color: TEXT,
      fontSize: 14,
      fontWeight: "500",
    },
    multilineInput: {
      minHeight: 105,
      lineHeight: 20,
    },
    inputError: {
      borderColor: DANGER,
      backgroundColor:
        DANGER_LIGHT,
    },
    errorText: {
      color: DANGER,
      fontSize: 11,
      fontWeight: "600",
      marginTop: 6,
    },
    selectBox: {
      minHeight: 56,
      backgroundColor:
        SOFT_PANEL,
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 13,
      paddingHorizontal: 13,
      paddingVertical: 9,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },
    selectSmallLabel: {
      color: MUTED,
      fontSize: 9,
      fontWeight: "600",
    },
    selectText: {
      color: TEXT,
      fontSize: 14,
      fontWeight: "700",
      marginTop: 2,
    },
    dropdownMenu: {
      backgroundColor:
        SURFACE,
      borderRadius: 13,
      marginTop: 7,
      overflow: "hidden",
      ...elevate(2),
    },
    dropdownOption: {
      minHeight: 47,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        BORDER,
    },
    dropdownOptionSelected: {
      backgroundColor:
        PRIMARY_LIGHT,
    },
    dropdownOptionText: {
      color: TEXT,
      fontSize: 13,
      fontWeight: "600",
    },
    dropdownOptionTextSelected: {
      color: PRIMARY_DARK,
      fontWeight: "700",
    },
    timeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -4,
    },
    timeChip: {
      minWidth: "29%",
      minHeight: 42,
      borderRadius: 11,
      backgroundColor:
        SOFT_PANEL,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: 9,
      marginHorizontal: 4,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
    },
    timeChipSelected: {
      backgroundColor:
        PRIMARY_LIGHT,
      borderColor: PRIMARY,
    },
    timeChipText: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "600",
      marginLeft: 5,
    },
    timeChipTextSelected: {
      color: PRIMARY_DARK,
      fontWeight: "700",
    },
    helperBox: {
      backgroundColor:
        WARNING_LIGHT,
      borderRadius: 11,
      padding: 10,
      marginTop: 3,
    },
    helperText: {
      color: WARNING_DARK,
      fontSize: 11,
      fontWeight: "600",
      lineHeight: 16,
    },
    selectedTimeText: {
      color: WARNING_DARK,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 4,
    },
    reviewSection: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      padding: 15,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 13,
      ...elevate(1),
    },
    reviewIconCircle: {
      width: 45,
      height: 45,
      borderRadius: 13,
      backgroundColor:
        PRIMARY_LIGHT,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
    },
    reviewTextBlock: {
      flex: 1,
      paddingRight: 9,
    },
    reviewTitle: {
      color: TEXT,
      fontSize: 14,
      fontWeight: "700",
    },
    reviewSubtitle: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "500",
      lineHeight: 16,
      marginTop: 3,
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor:
        SURFACE,
      paddingHorizontal: 16,
      paddingTop: 12,
      ...elevate(2),
    },
    primaryButton: {
      minHeight: 50,
      borderRadius: 13,
      backgroundColor:
        PRIMARY,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      overflow: "hidden",
    },
    primaryButtonText: {
      color: SURFACE,
      fontSize: 14,
      fontWeight: "700",
      marginLeft: 7,
    },
    disabledButton: {
      opacity: 0.58,
    },
  });

export default AddMedicineScreen;