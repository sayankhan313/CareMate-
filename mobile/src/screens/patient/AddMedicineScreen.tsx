import { useMemo, useState, type ReactNode } from "react";
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
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  Pill,
  Send,
  Stethoscope,
} from "lucide-react-native";

import type { MedicineDraft, RootStackParamList } from "../../types/navigation";

type AddMedicineScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "AddMedicine"
>;

type MedicineFrequency = MedicineDraft["frequency"];

type AddMedicineFormValues = {
  name: string;
  dose: string;
  frequency: MedicineFrequency;
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
const PRIMARY_DARK = "#3F6FD0";
const PRIMARY_LIGHT = "#EEF4FF";

const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#F6A545";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const frequencyOptions: DropdownOption[] = [
  { label: "Once daily", value: "ONCE_DAILY" },
  { label: "Twice daily", value: "TWICE_DAILY" },
  { label: "Three times daily", value: "THREE_TIMES_DAILY" },
  { label: "As needed", value: "AS_NEEDED" },
];

const timeOptions = [
  { label: "08:00", value: "08:00" },
  { label: "12:00", value: "12:00" },
  { label: "13:00", value: "13:00" },
  { label: "18:00", value: "18:00" },
  { label: "20:00", value: "20:00" },
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

const getRequiredTimeCount = (frequency: MedicineFrequency) => {
  if (frequency === "TWICE_DAILY") {
    return 2;
  }

  if (frequency === "THREE_TIMES_DAILY") {
    return 3;
  }

  return 1;
};

const getDefaultTimesForFrequency = (frequency: MedicineFrequency) => {
  if (frequency === "TWICE_DAILY") {
    return ["08:00", "20:00"];
  }

  if (frequency === "THREE_TIMES_DAILY") {
    return ["08:00", "13:00", "20:00"];
  }

  return ["08:00"];
};

const getTimeRequirementText = (frequency: MedicineFrequency) => {
  const requiredCount = getRequiredTimeCount(frequency);

  if (requiredCount === 1) {
    return "Select exactly 1 reminder time.";
  }

  return `Select exactly ${requiredCount} reminder times.`;
};

const getInitialSelectedTimes = (medicineDraft?: MedicineDraft) => {
  if (medicineDraft?.selectedTimes && medicineDraft.selectedTimes.length > 0) {
    return medicineDraft.selectedTimes;
  }

  if (medicineDraft?.timeOfDay) {
    return [medicineDraft.timeOfDay];
  }

  return getDefaultTimesForFrequency(
    medicineDraft?.frequency ? medicineDraft.frequency : "ONCE_DAILY"
  );
};

export const AddMedicineScreen = ({
  navigation,
  route,
}: AddMedicineScreenProps) => {
  const insets = useSafeAreaInsets();

  const medicineDraft = route.params?.medicineDraft;
  const isEditDraftMode = route.params?.mode === "EDIT_DRAFT";
  const initialFrequency = medicineDraft?.frequency || "ONCE_DAILY";

  const [isFrequencyDropdownOpen, setIsFrequencyDropdownOpen] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddMedicineFormValues>({
    defaultValues: {
      name: medicineDraft?.name || "",
      dose: medicineDraft?.dose || "",
      frequency: initialFrequency,
      selectedTimes: getInitialSelectedTimes(medicineDraft),
      startDate: medicineDraft?.startDate || getTodayDateForInput(),
      endDate: medicineDraft?.endDate || "",
      instructions: medicineDraft?.instructions || "",
      sendToDoctorForReview: medicineDraft?.sendToDoctorForReview || false,
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

  const handleFrequencySelect = (value: MedicineFrequency) => {
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

    const updatedMedicineDraft: MedicineDraft = {
      name: trimmedName,
      dose: trimmedDose,
      frequency: formData.frequency,
      timeOfDay: formData.selectedTimes[0],
      selectedTimes: formData.selectedTimes,
      startDate: trimmedStartDate,
      endDate: trimmedEndDate || undefined,
      instructions: trimmedInstructions || undefined,
      prescriptionPattern: medicineDraft?.prescriptionPattern ?? null,
      sendToDoctorForReview: formData.sendToDoctorForReview,
    };

    if (isEditDraftMode) {
      navigation.replace("ConfirmReminder", {
        medicineDraft: updatedMedicineDraft,
      });
      return;
    }

    navigation.navigate("ConfirmReminder", {
      medicineDraft: updatedMedicineDraft,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.appBarTextBlock}>
            <Text style={styles.appBarTitle}>
              {isEditDraftMode ? "Edit Medicine" : "Add Medicine"}
            </Text>

            <Text style={styles.appBarSubtitle}>
              {isEditDraftMode
                ? "Review scanned reminder details"
                : "Create a medicine reminder"}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(150, insets.bottom + 140),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isEditDraftMode ? (
            <View style={styles.prefillNotice}>
              <View style={styles.prefillIconCircle}>
                <CheckCircle2 size={20} color={SUCCESS} strokeWidth={2.8} />
              </View>

              <View style={styles.prefillTextBlock}>
                <Text style={styles.prefillTitle}>Auto-filled from scan</Text>
                <Text style={styles.prefillSubtitle}>
                  Check the detected details before confirming.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.formSection}>
            <SectionHeader
              icon={<Pill size={20} color={PRIMARY} strokeWidth={2.6} />}
              title="Medicine details"
              subtitle="Name and dose information"
            />

            <FieldLabel label="Medicine name" />

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
                  placeholderTextColor="#A8B0C2"
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

            <FieldLabel label="Dose" />

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
                  placeholderTextColor="#A8B0C2"
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
          </View>

          <View style={styles.formSection}>
            <SectionHeader
              icon={<Clock3 size={20} color={WARNING} strokeWidth={2.6} />}
              title="Schedule"
              subtitle="Frequency and reminder time"
            />

            <FieldLabel label="Frequency" />

            <TouchableOpacity
              style={styles.selectBox}
              onPress={() =>
                setIsFrequencyDropdownOpen(!isFrequencyDropdownOpen)
              }
              activeOpacity={0.85}
            >
              <View>
                <Text style={styles.selectSmallLabel}>Selected</Text>
                <Text style={styles.selectText}>{selectedFrequencyLabel}</Text>
              </View>

              {isFrequencyDropdownOpen ? (
                <ChevronUp size={22} color={PRIMARY} strokeWidth={2.7} />
              ) : (
                <ChevronDown size={22} color={MUTED} strokeWidth={2.7} />
              )}
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

                      {isSelected ? (
                        <CheckCircle2
                          size={18}
                          color={PRIMARY}
                          strokeWidth={2.7}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <FieldLabel label="Reminder time" />

            <View style={styles.timeGrid}>
              {timeOptions.map((option) => {
                const isSelected = selectedTimes.includes(option.value);

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.timeChip,
                      isSelected ? styles.timeChipSelected : undefined,
                    ]}
                    onPress={() => toggleTime(option.value)}
                    activeOpacity={0.85}
                  >
                    <Clock3
                      size={15}
                      color={isSelected ? PRIMARY_DARK : MUTED}
                      strokeWidth={2.5}
                    />

                    <Text
                      style={[
                        styles.timeChipText,
                        isSelected ? styles.timeChipTextSelected : undefined,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.helperBox}>
              <Text style={styles.helperText}>{getTimeRequirementText(frequency)}</Text>
              <Text style={styles.selectedTimeText}>
                Selected: {selectedTimes.join(", ")}
              </Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <SectionHeader
              icon={<CalendarDays size={20} color={SUCCESS} strokeWidth={2.6} />}
              title="Dates"
              subtitle="Start and optional end date"
            />

            <FieldLabel label="Start date" />

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
                  placeholderTextColor="#A8B0C2"
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

            <FieldLabel label="End date optional" />

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
                  placeholderTextColor="#A8B0C2"
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
          </View>

          <View style={styles.formSection}>
            <SectionHeader
              icon={<FileText size={20} color={PRIMARY} strokeWidth={2.6} />}
              title="Instructions"
              subtitle="Optional note for this medicine"
            />

            <Controller
              control={control}
              name="instructions"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="e.g., Take after breakfast"
                  placeholderTextColor="#A8B0C2"
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  textAlignVertical="top"
                />
              )}
            />
          </View>

          <View style={styles.reviewSection}>
            <View style={styles.reviewIconCircle}>
              <Stethoscope size={22} color={PRIMARY} strokeWidth={2.6} />
            </View>

            <View style={styles.reviewTextBlock}>
              <Text style={styles.reviewTitle}>Doctor review</Text>
              <Text style={styles.reviewSubtitle}>
                Send this reminder to your doctor for later review.
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
                    false: "#DDE3EF",
                    true: PRIMARY_LIGHT,
                  }}
                  thumbColor={field.value ? PRIMARY : SURFACE}
                />
              )}
            />
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom + 12, 34),
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
            <Send size={19} color={SURFACE} strokeWidth={2.6} />
            <Text style={styles.primaryButtonText}>
              {isEditDraftMode ? "Update reminder details" : "Create reminder"}
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
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>{icon}</View>

      <View style={styles.sectionTextBlock}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const FieldLabel = ({ label }: { label: string }) => {
  return <Text style={styles.label}>{label}</Text>;
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  appBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BACKGROUND,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    borderWidth: 1,
    borderColor: BORDER,
  },
  appBarTextBlock: {
    flex: 1,
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  prefillNotice: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#D8F1E6",
  },
  prefillIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  prefillTextBlock: {
    flex: 1,
  },
  prefillTitle: {
    color: "#167A58",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 2,
  },
  prefillSubtitle: {
    color: "#167A58",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  formSection: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  sectionTextBlock: {
    flex: 1,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.25,
  },
  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  label: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: SOFT_PANEL,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
  },
  inputError: {
    borderColor: DANGER,
    backgroundColor: DANGER_LIGHT,
  },
  errorText: {
    color: "#B42318",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 7,
  },
  multilineInput: {
    minHeight: 94,
    lineHeight: 21,
  },
  selectBox: {
    backgroundColor: SOFT_PANEL,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectSmallLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  selectText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
  },
  dropdownMenu: {
    backgroundColor: SOFT_PANEL,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    marginTop: 8,
    overflow: "hidden",
  },
  dropdownOption: {
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownOptionSelected: {
    backgroundColor: PRIMARY_LIGHT,
  },
  dropdownOptionText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
  },
  dropdownOptionTextSelected: {
    color: PRIMARY_DARK,
    fontWeight: "900",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
  },
  timeChip: {
    width: "31.5%",
    backgroundColor: SOFT_PANEL,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: "1.8%",
    marginBottom: 9,
  },
  timeChipSelected: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: PRIMARY,
  },
  timeChipText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4,
  },
  timeChipTextSelected: {
    color: PRIMARY_DARK,
  },
  helperBox: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginTop: 4,
  },
  helperText: {
    color: "#A85A13",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  selectedTimeText: {
    color: "#A85A13",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
  },
  reviewSection: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  reviewIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reviewTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  reviewTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 3,
  },
  reviewSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(238,241,250,0.96)",
    paddingHorizontal: 20,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: PRIMARY_DARK,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },
  primaryButtonText: {
    color: SURFACE,
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.65,
  },
});