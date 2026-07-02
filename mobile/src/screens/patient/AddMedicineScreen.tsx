import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../types/navigation";

type AddMedicineScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "AddMedicine"
>;

type AddMedicineFormValues = {
  name: string;
  dose: string;
  frequency: string;
  selectedTimes: string[];
  startDate: string;
  endDate: string;
  instructions: string;
  sendToDoctorForReview: boolean;
};

type DropdownOption = {
  label: string;
  value: string;
};

const frequencyOptions: DropdownOption[] = [
  { label: "Once daily", value: "ONCE_DAILY" },
  { label: "Twice daily", value: "TWICE_DAILY" },
  { label: "Three times daily", value: "THREE_TIMES_DAILY" },
  { label: "As needed", value: "AS_NEEDED" },
];

const timeOptions: DropdownOption[] = [
  { label: "08:00", value: "08:00" },
  { label: "12:00", value: "12:00" },
  { label: "18:00", value: "18:00" },
  { label: "21:00", value: "21:00" },
];

const getTodayDateForInput = () => {
  const today = new Date();

  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();

  return `${day}/${month}/${year}`;
};

const isValidDateText = (date: string) => {
  const trimmedDate = date.trim();

  return (
    /^\d{2}\/\d{2}\/\d{4}$/.test(trimmedDate) ||
    /^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)
  );
};

const getRequiredTimeCount = (frequency: string) => {
  if (frequency === "TWICE_DAILY") {
    return 2;
  }

  if (frequency === "THREE_TIMES_DAILY") {
    return 3;
  }

  return 1;
};

const getDefaultTimesForFrequency = (frequency: string) => {
  if (frequency === "TWICE_DAILY") {
    return ["08:00", "21:00"];
  }

  if (frequency === "THREE_TIMES_DAILY") {
    return ["08:00", "12:00", "21:00"];
  }

  return ["08:00"];
};

const getTimeRequirementText = (frequency: string) => {
  const requiredCount = getRequiredTimeCount(frequency);

  if (requiredCount === 1) {
    return "Select exactly 1 reminder time.";
  }

  return `Select exactly ${requiredCount} reminder times.`;
};

export const AddMedicineScreen = ({ navigation }: AddMedicineScreenProps) => {
  const insets = useSafeAreaInsets();

  const [isFrequencyDropdownOpen, setIsFrequencyDropdownOpen] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddMedicineFormValues>({
    defaultValues: {
      name: "",
      dose: "",
      frequency: "ONCE_DAILY",
      selectedTimes: ["08:00"],
      startDate: getTodayDateForInput(),
      endDate: "",
      instructions: "",
      sendToDoctorForReview: false,
    },
  });

  const frequency = watch("frequency");
  const selectedTimes = watch("selectedTimes");

  const selectedFrequencyLabel = useMemo(() => {
    return (
      frequencyOptions.find((option) => option.value === frequency)?.label ||
      "Once daily"
    );
  }, [frequency]);

  const requiredTimeCount = useMemo(() => {
    return getRequiredTimeCount(frequency);
  }, [frequency]);

  const handleFrequencySelect = (value: string) => {
    setValue("frequency", value, {
      shouldValidate: true,
      shouldDirty: true,
    });

    setValue("selectedTimes", getDefaultTimesForFrequency(value), {
      shouldValidate: true,
      shouldDirty: true,
    });

    setIsFrequencyDropdownOpen(false);
  };

  const toggleTime = (time: string) => {
    const alreadySelected = selectedTimes.includes(time);

    if (alreadySelected) {
      Alert.alert(
        "Time already selected",
        `${selectedFrequencyLabel} needs exactly ${requiredTimeCount} reminder time${
          requiredTimeCount > 1 ? "s" : ""
        }. Tap another time to replace this selection.`
      );
      return;
    }

    if (selectedTimes.length < requiredTimeCount) {
      setValue("selectedTimes", [...selectedTimes, time], {
        shouldValidate: true,
        shouldDirty: true,
      });

      return;
    }

    const updatedTimes = [...selectedTimes.slice(1), time];

    setValue("selectedTimes", updatedTimes, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = (formData: AddMedicineFormValues) => {
    const trimmedName = formData.name.trim();
    const trimmedDose = formData.dose.trim();
    const trimmedStartDate = formData.startDate.trim();
    const trimmedEndDate = formData.endDate.trim();
    const trimmedInstructions = formData.instructions.trim();

    const expectedTimeCount = getRequiredTimeCount(formData.frequency);

    if (formData.selectedTimes.length !== expectedTimeCount) {
      Alert.alert(
        "Reminder time required",
        `Please select exactly ${expectedTimeCount} reminder time${
          expectedTimeCount > 1 ? "s" : ""
        }.`
      );
      return;
    }

    navigation.navigate("ConfirmReminder", {
      medicineDraft: {
        name: trimmedName,
        dose: trimmedDose,
        frequency: formData.frequency,
        timeOfDay: formData.selectedTimes[0],
        selectedTimes: formData.selectedTimes,
        startDate: trimmedStartDate,
        endDate: trimmedEndDate || undefined,
        instructions: trimmedInstructions || undefined,
        sendToDoctorForReview: formData.sendToDoctorForReview,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor="#2563EB" barStyle="light-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Add Medicine</Text>
            <Text style={styles.headerSubtitle}>
              Create a reminder schedule
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <Text style={styles.label}>Medicine Name</Text>

            <Controller
              control={control}
              name="name"
              rules={{
                required: "Medicine name is required.",
                minLength: {
                  value: 2,
                  message: "Medicine name must be at least 2 characters.",
                },
              }}
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="e.g., Metformin"
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.input,
                    errors.name ? styles.inputError : undefined,
                  ]}
                />
              )}
            />

            {errors.name ? (
              <Text style={styles.errorText}>{errors.name.message}</Text>
            ) : null}

            <Text style={styles.label}>Dose</Text>

            <Controller
              control={control}
              name="dose"
              rules={{
                required: "Dose is required.",
              }}
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="e.g., 500mg"
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.input,
                    errors.dose ? styles.inputError : undefined,
                  ]}
                />
              )}
            />

            {errors.dose ? (
              <Text style={styles.errorText}>{errors.dose.message}</Text>
            ) : null}

            <Text style={styles.label}>Frequency</Text>

            <TouchableOpacity
              style={styles.selectBox}
              onPress={() =>
                setIsFrequencyDropdownOpen(!isFrequencyDropdownOpen)
              }
              activeOpacity={0.85}
            >
              <Text style={styles.selectText}>{selectedFrequencyLabel}</Text>
              <Text style={styles.selectIcon}>
                {isFrequencyDropdownOpen ? "⌃" : "⌄"}
              </Text>
            </TouchableOpacity>

            {isFrequencyDropdownOpen ? (
              <View style={styles.dropdownMenu}>
                {frequencyOptions.map((option) => {
                  const isSelected = option.value === frequency;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dropdownOption,
                        isSelected ? styles.dropdownOptionSelected : undefined,
                      ]}
                      onPress={() => handleFrequencySelect(option.value)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          isSelected
                            ? styles.dropdownOptionTextSelected
                            : undefined,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <Text style={styles.label}>Reminder Time</Text>

            <View style={styles.timeGrid}>
              {timeOptions.map((option) => {
                const isSelected = selectedTimes.includes(option.value);

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.timeButton,
                      isSelected ? styles.timeButtonSelected : undefined,
                    ]}
                    onPress={() => toggleTime(option.value)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.timeButtonText,
                        isSelected ? styles.timeButtonTextSelected : undefined,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.helperText}>
              {getTimeRequirementText(frequency)}
            </Text>

            <Text style={styles.selectedTimeText}>
              Selected: {selectedTimes.join(", ")}
            </Text>

            <Text style={styles.label}>Start Date</Text>

            <Controller
              control={control}
              name="startDate"
              rules={{
                required: "Start date is required.",
                validate: (value) => {
                  return (
                    isValidDateText(value) ||
                    "Please enter start date in DD/MM/YYYY format."
                  );
                },
              }}
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.input,
                    errors.startDate ? styles.inputError : undefined,
                  ]}
                />
              )}
            />

            {errors.startDate ? (
              <Text style={styles.errorText}>{errors.startDate.message}</Text>
            ) : null}

            <Text style={styles.label}>End Date (Optional)</Text>

            <Controller
              control={control}
              name="endDate"
              rules={{
                validate: (value) => {
                  if (!value.trim()) {
                    return true;
                  }

                  return (
                    isValidDateText(value) ||
                    "Please enter end date in DD/MM/YYYY format."
                  );
                },
              }}
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.input,
                    errors.endDate ? styles.inputError : undefined,
                  ]}
                />
              )}
            />

            {errors.endDate ? (
              <Text style={styles.errorText}>{errors.endDate.message}</Text>
            ) : null}

            <Text style={styles.label}>Instructions (Optional)</Text>

            <Controller
              control={control}
              name="instructions"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="e.g., Take after breakfast"
                  placeholderTextColor="#94A3B8"
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  textAlignVertical="top"
                />
              )}
            />
          </View>

          <View style={styles.reviewCard}>
            <View style={styles.reviewTextBlock}>
              <Text style={styles.reviewTitle}>Send to doctor for review</Text>
              <Text style={styles.reviewSubtitle}>
                Your doctor can review this reminder later.
              </Text>
            </View>

            <Controller
              control={control}
              name="sendToDoctorForReview"
              render={({ field }) => (
                <Switch
                  value={field.value}
                  onValueChange={field.onChange}
                  trackColor={{
                    false: "#D1D5DB",
                    true: "#BFDBFE",
                  }}
                  thumbColor={field.value ? "#2563EB" : "#F9FAFB"}
                />
              )}
            />
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom + 12 , 34),
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isSubmitting ? styles.disabledButton : undefined,
            ]}
            onPress={handleSubmit(onSubmit)}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>Create Reminder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#2563EB",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  header: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "300",
    marginTop: -4,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 6,
  },
  headerSubtitle: {
    color: "#DBEAFE",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 22,
    paddingBottom: 120,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 15,
    color: "#111827",
    fontSize: 17,
    fontWeight: "600",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  inputError: {
    borderColor: "#DC2626",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 7,
  },
  multilineInput: {
    minHeight: 92,
  },
  selectBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  selectText: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
  },
  selectIcon: {
    color: "#94A3B8",
    fontSize: 24,
    fontWeight: "900",
  },
  dropdownMenu: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    marginTop: 8,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownOption: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownOptionSelected: {
    backgroundColor: "#EFF6FF",
  },
  dropdownOptionText: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "800",
  },
  dropdownOptionTextSelected: {
    color: "#2563EB",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  timeButton: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginRight: "3%",
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  timeButtonSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  timeButtonText: {
    color: "#64748B",
    fontSize: 17,
    fontWeight: "900",
  },
  timeButtonTextSelected: {
    color: "#2563EB",
  },
  helperText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 2,
  },
  selectedTimeText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 6,
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewTextBlock: {
    flex: 1,
    paddingRight: 16,
  },
  reviewTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },
  reviewSubtitle: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.65,
  },
});