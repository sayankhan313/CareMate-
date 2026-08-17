import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Platform, ScrollView, StatusBar, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Clock3, FilePenLine, FileText, Package, Pill, Send, Stethoscope, XCircle } from "lucide-react-native";

import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedTextInput as TextInput } from "../../components/common/LocalizedTextInput";
import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../../services/tokenStorage";
import type { MedicineDraft, RootStackParamList } from "../../types/navigation";
import { LocalizedAlert as Alert } from "../../utils/localizedAlert";

type Props = NativeStackScreenProps<RootStackParamList, "AddMedicine">;
type MedicineFrequency = MedicineDraft["frequency"];

type MedicinePackReference = {
  id: string;
  medicineSlug: string;
  medicineName: string;
  strength: string;
  form: string;
  packageUnit: string;
  packSize: number;
  contentUnit: string;
};

type FormValues = {
  name: string;
  dose: string;
  doseQuantity: string;
  manualDoseUnit: string;
  frequency: MedicineFrequency;
  customFrequency: string;
  selectedTimes: string[];
  startDate: string;
  endDate: string;
  instructions: string;
  sendToDoctorForReview: boolean;
  hasMedicineOnHand?: boolean;
  packageQuantity: string;
  manualPackSize: string;
  manualPackageUnit: string;
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT = "#F7F9FF";
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

const frequencies = [
  { label: "Once daily", value: "ONCE_DAILY" },
  { label: "Twice daily", value: "TWICE_DAILY" },
  { label: "Three times daily", value: "THREE_TIMES_DAILY" },
  { label: "Four times daily", value: "FOUR_TIMES_DAILY" },
  { label: "As needed", value: "AS_NEEDED" },
  { label: "Custom schedule", value: "CUSTOM" },
] as const;

const timeOptions = ["06:00", "08:00", "10:00", "12:00", "13:00", "16:00", "18:00", "20:00", "21:00", "22:00"];
const doseUnitOptions = ["tablet", "capsule", "ml", "puff", "sachet", "dose"];
const packageUnitOptions = ["pack", "box", "bottle", "inhaler", "tube"];

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const today = () => {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const validDate = (value: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(value.trim()) || /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

const requiredTimes = (frequency: MedicineFrequency, resubmit: boolean) => {
  if (resubmit) return 1;
  if (frequency === "TWICE_DAILY") return 2;
  if (frequency === "THREE_TIMES_DAILY") return 3;
  if (frequency === "FOUR_TIMES_DAILY") return 4;
  return 1;
};

const defaultTimes = (frequency: MedicineFrequency, resubmit: boolean) => {
  if (resubmit) return ["08:00"];
  if (frequency === "TWICE_DAILY") return ["08:00", "20:00"];
  if (frequency === "THREE_TIMES_DAILY") return ["08:00", "13:00", "20:00"];
  if (frequency === "FOUR_TIMES_DAILY") return ["08:00", "12:00", "16:00", "20:00"];
  return ["08:00"];
};

const initialTimes = (draft: MedicineDraft | undefined, resubmit: boolean) => {
  if (draft?.selectedTimes?.length) return resubmit ? [draft.selectedTimes[0]] : draft.selectedTimes;
  if (draft?.timeOfDay) return [draft.timeOfDay];
  return defaultTimes(draft?.frequency || "ONCE_DAILY", resubmit);
};

const singularUnit = (unit?: string | null) => {
  const value = unit?.trim().toLowerCase() || "";
  const map: Record<string, string> = {
    tablets: "tablet",
    capsules: "capsule",
    puffs: "puff",
    doses: "dose",
    sprays: "spray",
    sachets: "sachet",
    inhalers: "inhaler",
    bottles: "bottle",
    packs: "pack",
    boxes: "box",
    tubes: "tube",
  };
  return map[value] || value;
};

const displayUnit = (unit: string, quantity: number) => {
  const value = singularUnit(unit);
  if (quantity === 1 || ["ml", "g", "mg", "mcg"].includes(value)) return value;
  if (value.endsWith("s")) return value;
  if (value === "box") return "boxes";
  return `${value}s`;
};

export const AddMedicineScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const draft = route.params?.medicineDraft;
  const mode = route.params?.mode || "CREATE";
  const reviewRequestId = route.params?.medicineReviewRequestId;
  const isEdit = mode === "EDIT_DRAFT";
  const isResubmit = mode === "RESUBMIT_REVIEW";

  const [frequencyOpen, setFrequencyOpen] = useState(false);
  const [packReference, setPackReference] = useState<MedicinePackReference | null>(null);
  const [packLoading, setPackLoading] = useState(false);
  const [packError, setPackError] = useState("");

  const { control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      name: draft?.name || "",
      dose: draft?.dose || "",
      doseQuantity: String(draft?.doseQuantity ?? 1),
      manualDoseUnit: singularUnit(draft?.doseUnit || draft?.stockUnit),
      frequency: draft?.frequency || "ONCE_DAILY",
      customFrequency: draft?.customFrequency || "",
      selectedTimes: initialTimes(draft, isResubmit),
      startDate: draft?.startDate || today(),
      endDate: draft?.endDate || "",
      instructions: draft?.instructions || "",
      sendToDoctorForReview: isResubmit ? true : draft?.sendToDoctorForReview || false,
      hasMedicineOnHand: draft?.hasMedicineOnHand,
      packageQuantity: draft?.packageQuantity !== undefined ? String(draft.packageQuantity) : "",
      manualPackSize: draft?.packSize !== undefined ? String(draft.packSize) : "",
      manualPackageUnit: draft?.packageUnit || "pack",
    },
  });

  const name = watch("name");
  const dose = watch("dose");
  const frequency = watch("frequency");
  const selectedTimes = watch("selectedTimes") || [];
  const hasMedicine = watch("hasMedicineOnHand");
  const packageQuantityText = watch("packageQuantity");
  const doseQuantityText = watch("doseQuantity");
  const manualDoseUnit = watch("manualDoseUnit");
  const manualPackSizeText = watch("manualPackSize");
  const manualPackageUnit = watch("manualPackageUnit");

  useEffect(() => {
    const medicineName = name.trim();
    const strength = dose.trim();

    if (medicineName.length < 2 || strength.length < 1) {
      setPackReference(null);
      setPackError("");
      setPackLoading(false);
      return;
    }

    let active = true;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          setPackLoading(true);
          setPackError("");

          const token = await tokenStorage.getToken();
          if (!token) throw new Error("Please login again.");

          const query = `medicineName=${encodeURIComponent(medicineName)}&strength=${encodeURIComponent(strength)}`;
          const response = await fetch(`${API_BASE_URL}/patient/medicine-pack-reference?${query}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });

          const result = await response.json().catch(() => ({}));
          if (!active) return;

          if (!response.ok) {
            setPackReference(null);
            setPackError("Pack reference not found");
            return;
          }

          const reference = result?.data?.reference || result?.data?.packReference || result?.data;

          if (!reference || !Number.isInteger(reference.packSize) || reference.packSize < 1 || !reference.contentUnit) {
            setPackReference(null);
            setPackError("Pack reference not found");
            return;
          }

          setPackReference(reference as MedicinePackReference);
          setValue("manualDoseUnit", singularUnit(reference.contentUnit), { shouldDirty: false });
        } catch {
          if (!active) return;
          setPackReference(null);
          setPackError("Pack reference not found");
        } finally {
          if (active) setPackLoading(false);
        }
      })();
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [name, dose, setValue]);

  useEffect(() => {
    if (!packReference || !draft?.hasMedicineOnHand || packageQuantityText.trim()) return;

    if (draft.packageQuantity && draft.packageQuantity > 0) {
      setValue("packageQuantity", String(draft.packageQuantity));
      return;
    }

    if (draft.currentStock && draft.currentStock > 0 && draft.currentStock % packReference.packSize === 0) {
      setValue("packageQuantity", String(draft.currentStock / packReference.packSize));
    }
  }, [draft, packReference, packageQuantityText, setValue]);

  const selectedFrequency = useMemo(() => frequencies.find(item => item.value === frequency)?.label || "Once daily", [frequency]);
  const timeCount = useMemo(() => requiredTimes(frequency, isResubmit), [frequency, isResubmit]);

  const doseQuantity = Number.parseInt(doseQuantityText || "", 10);
  const packageQuantity = Number.parseInt(packageQuantityText || "", 10);
  const manualPackSize = Number.parseInt(manualPackSizeText || "", 10);
  const manualMode = !packLoading && !packReference && Boolean(packError);

  const doseUnit = singularUnit(packReference?.contentUnit || manualDoseUnit || draft?.doseUnit || draft?.stockUnit);
  const packageUnit = packReference?.packageUnit || manualPackageUnit || "pack";
  const packSize = packReference?.packSize || (Number.isInteger(manualPackSize) && manualPackSize > 0 ? manualPackSize : 0);

  const totalStock =
    Number.isInteger(packageQuantity) && packageQuantity > 0 && packSize > 0
      ? packageQuantity * packSize
      : 0;

  const doseLabel =
    Number.isInteger(doseQuantity) && doseQuantity > 0 && doseUnit
      ? `${doseQuantity} ${displayUnit(doseUnit, doseQuantity)}`
      : "";

  const selectFrequency = (value: MedicineFrequency) => {
    setValue("frequency", value, { shouldValidate: true, shouldDirty: true });
    setValue("selectedTimes", defaultTimes(value, isResubmit), { shouldValidate: true, shouldDirty: true });
    if (value !== "CUSTOM") setValue("customFrequency", "", { shouldValidate: true, shouldDirty: true });
    setFrequencyOpen(false);
  };

  const toggleTime = (time: string) => {
    const selected = selectedTimes.includes(time);

    if (selected) {
      if (selectedTimes.length === 1) {
        Alert.alert("Reminder time required", "At least one reminder time must remain selected.");
        return;
      }

      setValue("selectedTimes", selectedTimes.filter(value => value !== time), { shouldValidate: true, shouldDirty: true });
      return;
    }

    if (selectedTimes.length < timeCount) {
      setValue("selectedTimes", [...selectedTimes, time], { shouldValidate: true, shouldDirty: true });
      return;
    }

    setValue("selectedTimes", [...selectedTimes.slice(1), time], { shouldValidate: true, shouldDirty: true });
  };

  const selectAvailability = (value: boolean) => {
    setValue("hasMedicineOnHand", value, { shouldValidate: true, shouldDirty: true });

    if (value) {
      if (!packageQuantityText.trim()) setValue("packageQuantity", "1", { shouldValidate: true, shouldDirty: true });
      return;
    }

    setValue("packageQuantity", "", { shouldValidate: true, shouldDirty: true });
    setValue("sendToDoctorForReview", false, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = (form: FormValues) => {
    const medicineName = form.name.trim();
    const strength = form.dose.trim();
    const customFrequency = form.customFrequency.trim();
    const startDate = form.startDate.trim();
    const endDate = form.endDate.trim();
    const instructions = form.instructions.trim();
    const amount = Number.parseInt(form.doseQuantity.trim(), 10);
    const expectedTimes = requiredTimes(form.frequency, isResubmit);
    const effectiveDoseUnit = singularUnit(packReference?.contentUnit || form.manualDoseUnit);

    if (form.selectedTimes.length !== expectedTimes) {
      Alert.alert("Reminder time required", expectedTimes === 1 ? "Please select exactly one reminder time." : `Please select exactly ${expectedTimes} reminder times.`);
      return;
    }

    if (form.frequency === "CUSTOM" && customFrequency.length < 2) {
      Alert.alert("Custom schedule required", "Please describe the custom medicine frequency.");
      return;
    }

    if (!Number.isInteger(amount) || amount < 1) {
      Alert.alert("Amount required", "Enter how much medicine is taken each time.");
      return;
    }

    if (!effectiveDoseUnit) {
      Alert.alert("Dose unit required", "Select whether the dose is a tablet, capsule, ml, puff or another supported unit.");
      return;
    }

    if (isResubmit && !reviewRequestId) {
      Alert.alert("Review unavailable", "The medicine review request ID is missing.");
      return;
    }

    if (!isResubmit && form.hasMedicineOnHand === undefined) {
      Alert.alert("Medicine availability required", "Please tell us whether you currently have this medicine.");
      return;
    }

    let packs: number | undefined;
    let calculatedStock: number | undefined;
    let calculatedPackSize: number | undefined;
    let calculatedPackageUnit: string | undefined;
    let threshold: number | undefined;

    if (!isResubmit && form.hasMedicineOnHand === true) {
      packs = Number.parseInt(form.packageQuantity.trim(), 10);

      if (!Number.isInteger(packs) || packs < 1) {
        Alert.alert("Package quantity required", "Enter how many packages you currently have.");
        return;
      }

      if (packReference) {
        calculatedPackSize = packReference.packSize;
        calculatedPackageUnit = packReference.packageUnit;
      } else {
        calculatedPackSize = Number.parseInt(form.manualPackSize.trim(), 10);
        calculatedPackageUnit = form.manualPackageUnit.trim();

        if (!Number.isInteger(calculatedPackSize) || calculatedPackSize < 1) {
          Alert.alert("Package contents required", `Enter how many ${displayUnit(effectiveDoseUnit, 2)} are in one package.`);
          return;
        }

        if (!calculatedPackageUnit) {
          Alert.alert("Package type required", "Select the type of package.");
          return;
        }
      }

      calculatedStock = packs * calculatedPackSize;
      threshold = Math.max(amount, Math.ceil(calculatedPackSize * 0.25));
    }

    const referencePackSize = calculatedPackSize || draft?.packSize;
    const referencePackageUnit = calculatedPackageUnit || draft?.packageUnit;
    const noStockThreshold = referencePackSize ? Math.max(amount, Math.ceil(referencePackSize * 0.25)) : draft?.lowStockThreshold;

    const updated: MedicineDraft = {
      name: medicineName,
      dose: strength,
      doseQuantity: amount,
      doseUnit: effectiveDoseUnit,
      frequency: form.frequency,
      customFrequency: form.frequency === "CUSTOM" ? customFrequency : undefined,
      timeOfDay: form.selectedTimes[0],
      selectedTimes: form.selectedTimes,
      startDate,
      endDate: endDate || undefined,
      instructions: instructions || undefined,
      prescriptionPattern: draft?.prescriptionPattern ?? null,
      sendToDoctorForReview: isResubmit ? true : form.hasMedicineOnHand === false ? false : form.sendToDoctorForReview,
      hasMedicineOnHand: isResubmit ? draft?.hasMedicineOnHand : form.hasMedicineOnHand,
      currentStock: isResubmit ? draft?.currentStock : form.hasMedicineOnHand ? calculatedStock : 0,
      stockUnit: isResubmit ? draft?.stockUnit || effectiveDoseUnit : effectiveDoseUnit,
      lowStockThreshold: isResubmit ? draft?.lowStockThreshold : form.hasMedicineOnHand ? threshold : noStockThreshold,
      packageQuantity: isResubmit ? draft?.packageQuantity : form.hasMedicineOnHand ? packs : undefined,
      packageUnit: referencePackageUnit,
      packSize: referencePackSize,
    };

    const params = {
      medicineDraft: updated,
      mode: isResubmit ? ("RESUBMIT_REVIEW" as const) : ("CREATE" as const),
      medicineReviewRequestId: isResubmit ? reviewRequestId : undefined,
    };

    if (isEdit || isResubmit) {
      navigation.replace("ConfirmReminder", params);
      return;
    }

    navigation.navigate("ConfirmReminder", params);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={isSubmitting} activeOpacity={0.85}>
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.appBarText}>
            <Text style={styles.title}>{isResubmit ? "Edit and Resubmit" : isEdit ? "Edit Medicine" : "Add Medicine"}</Text>
            <Text style={styles.subtitle}>{isResubmit ? "Update the rejected medicine" : "Medicine and reminder details"}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(150, insets.bottom + 140) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isEdit ? (
            <View style={styles.successNotice}>
              <CheckCircle2 size={20} color={SUCCESS_DARK} strokeWidth={2.6} />
              <Text style={styles.successNoticeText}>Check the detected medicine details before continuing.</Text>
            </View>
          ) : null}

          {isResubmit ? (
            <View style={styles.warningNotice}>
              <FilePenLine size={20} color={WARNING_DARK} strokeWidth={2.6} />
              <Text style={styles.warningNoticeText}>Update the rejected medicine and send it back for review.</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader icon={<Pill size={20} color={PRIMARY} strokeWidth={2.6} />} title="Medicine details" subtitle="Name, strength and amount" />

            <FieldLabel text="Medicine name" />

            <Controller
              control={control}
              name="name"
              rules={{ required: "Medicine name is required.", minLength: { value: 2, message: "Medicine name must be at least 2 characters." } }}
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="e.g., Metformin"
                  placeholderTextColor="#A8B0C2"
                  style={[styles.input, errors.name ? styles.inputError : undefined]}
                />
              )}
            />

            {errors.name ? <Text style={styles.errorText}>{errors.name.message}</Text> : null}

            <FieldLabel text="Strength" />

            <Controller
              control={control}
              name="dose"
              rules={{ required: "Strength is required." }}
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="e.g., 500mg"
                  placeholderTextColor="#A8B0C2"
                  style={[styles.input, errors.dose ? styles.inputError : undefined]}
                />
              )}
            />

            <FieldLabel text="Amount each time" />

            <View style={styles.amountRow}>
              <Controller
                control={control}
                name="doseQuantity"
                render={({ field }) => (
                  <TextInput
                    value={field.value}
                    onChangeText={value => field.onChange(value.replace(/[^0-9]/g, ""))}
                    onBlur={field.onBlur}
                    placeholder="1"
                    placeholderTextColor="#A8B0C2"
                    keyboardType="number-pad"
                    style={[styles.input, styles.amountInput]}
                  />
                )}
              />

              <View style={styles.unitBox}>
                {packLoading ? <ActivityIndicator size="small" color={PRIMARY} /> : <Text style={styles.unitText}>{doseUnit ? displayUnit(doseUnit, Number.isInteger(doseQuantity) ? doseQuantity : 1) : "Select unit"}</Text>}
              </View>
            </View>

            {!packLoading && !packReference ? (
              <>
                <Text style={styles.manualHelper}>Choose the unit taken each time.</Text>

                <View style={styles.chipGrid}>
                  {doseUnitOptions.map(unit => (
                    <TouchableOpacity
                      key={unit}
                      style={[styles.optionChip, singularUnit(manualDoseUnit) === unit ? styles.optionChipSelected : undefined]}
                      onPress={() => setValue("manualDoseUnit", unit, { shouldDirty: true })}
                    >
                      <Text style={[styles.optionChipText, singularUnit(manualDoseUnit) === unit ? styles.optionChipTextSelected : undefined]}>{unit}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            {doseLabel ? (
              <View style={styles.doseInfo}>
                <Pill size={17} color={PRIMARY_DARK} strokeWidth={2.5} />
                <Text style={styles.doseInfoText}>Each reminder records {doseLabel}.</Text>
              </View>
            ) : null}
          </View>

          {!isResubmit ? (
            <View style={styles.section}>
              <SectionHeader icon={<Package size={20} color={SUCCESS} strokeWidth={2.6} />} title="Medicine availability" subtitle="Record the medicine you currently have" />

              <FieldLabel text="Do you already have this medicine?" />

              <View style={styles.availabilityRow}>
                <TouchableOpacity style={[styles.availability, hasMedicine === true ? styles.availabilityYes : undefined]} onPress={() => selectAvailability(true)} activeOpacity={0.85}>
                  <CheckCircle2 size={21} color={hasMedicine === true ? SUCCESS_DARK : MUTED} strokeWidth={2.6} />

                  <View style={styles.availabilityText}>
                    <Text style={[styles.availabilityTitle, hasMedicine === true ? { color: SUCCESS_DARK } : undefined]}>Yes</Text>
                    <Text style={styles.availabilitySub}>I have it</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.availability, styles.availabilityRight, hasMedicine === false ? styles.availabilityNo : undefined]} onPress={() => selectAvailability(false)} activeOpacity={0.85}>
                  <XCircle size={21} color={hasMedicine === false ? WARNING_DARK : MUTED} strokeWidth={2.6} />

                  <View style={styles.availabilityText}>
                    <Text style={[styles.availabilityTitle, hasMedicine === false ? { color: WARNING_DARK } : undefined]}>No</Text>
                    <Text style={styles.availabilitySub}>I need it</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {hasMedicine === true ? (
                <>
                  {packLoading ? (
                    <View style={styles.packLoading}>
                      <ActivityIndicator size="small" color={PRIMARY} />
                      <Text style={styles.packLoadingText}>Checking package information…</Text>
                    </View>
                  ) : packReference ? (
                    <>
                      <View style={styles.packReferenceCard}>
                        <Package size={21} color={SUCCESS_DARK} strokeWidth={2.6} />

                        <View style={styles.packReferenceText}>
                          <Text style={styles.packReferenceTitle}>
                            1 {packReference.packageUnit} = {packReference.packSize} {displayUnit(packReference.contentUnit, packReference.packSize)}
                          </Text>
                          <Text style={styles.packReferenceSub}>Pack information matched automatically</Text>
                        </View>
                      </View>

                      <FieldLabel text={`Number of ${displayUnit(packReference.packageUnit, 2)}`} />

                      <Controller
                        control={control}
                        name="packageQuantity"
                        render={({ field }) => (
                          <TextInput
                            value={field.value}
                            onChangeText={value => field.onChange(value.replace(/[^0-9]/g, ""))}
                            onBlur={field.onBlur}
                            placeholder="e.g., 2"
                            placeholderTextColor="#A8B0C2"
                            keyboardType="number-pad"
                            style={styles.input}
                          />
                        )}
                      />
                    </>
                  ) : (
                    <>
                      <View style={styles.manualPackNotice}>
                        <AlertTriangle size={19} color={WARNING_DARK} strokeWidth={2.5} />

                        <View style={styles.manualPackNoticeText}>
                          <Text style={styles.manualPackTitle}>Pack information not found</Text>
                          <Text style={styles.manualPackText}>Enter the details shown on your medicine packaging.</Text>
                        </View>
                      </View>

                      <FieldLabel text="Package type" />

                      <View style={styles.chipGrid}>
                        {packageUnitOptions.map(unit => (
                          <TouchableOpacity
                            key={unit}
                            style={[styles.optionChip, manualPackageUnit === unit ? styles.optionChipSelected : undefined]}
                            onPress={() => setValue("manualPackageUnit", unit, { shouldDirty: true })}
                          >
                            <Text style={[styles.optionChipText, manualPackageUnit === unit ? styles.optionChipTextSelected : undefined]}>{unit}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <FieldLabel text={`How many ${displayUnit(manualPackageUnit || "pack", 2)} do you have?`} />

                      <Controller
                        control={control}
                        name="packageQuantity"
                        render={({ field }) => (
                          <TextInput
                            value={field.value}
                            onChangeText={value => field.onChange(value.replace(/[^0-9]/g, ""))}
                            onBlur={field.onBlur}
                            placeholder="e.g., 2"
                            placeholderTextColor="#A8B0C2"
                            keyboardType="number-pad"
                            style={styles.input}
                          />
                        )}
                      />

                      <FieldLabel text={`How many ${displayUnit(doseUnit || "unit", 2)} are in one ${manualPackageUnit || "pack"}?`} />

                      <Controller
                        control={control}
                        name="manualPackSize"
                        render={({ field }) => (
                          <TextInput
                            value={field.value}
                            onChangeText={value => field.onChange(value.replace(/[^0-9]/g, ""))}
                            onBlur={field.onBlur}
                            placeholder={doseUnit === "ml" ? "e.g., 100" : "e.g., 28"}
                            placeholderTextColor="#A8B0C2"
                            keyboardType="number-pad"
                            style={styles.input}
                          />
                        )}
                      />
                    </>
                  )}

                  {totalStock > 0 && doseUnit ? (
                    <View style={styles.stockTotal}>
                      <View>
                        <Text style={styles.stockTotalLabel}>Total medicine</Text>
                        <Text style={styles.stockCalculation}>{packageQuantity} × {packSize}</Text>
                      </View>

                      <Text style={styles.stockTotalValue}>{totalStock} {displayUnit(doseUnit, totalStock)}</Text>
                    </View>
                  ) : null}
                </>
              ) : null}

              {hasMedicine === false ? (
                <View style={styles.noStockPanel}>
                  <AlertTriangle size={19} color={WARNING_DARK} strokeWidth={2.6} />

                  <View style={styles.noStockText}>
                    <Text style={styles.noStockTitle}>No medicine available</Text>
                    <Text style={styles.noStockSub}>You can request this medicine from your pharmacy after reviewing the reminder.</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader icon={<Clock3 size={20} color={WARNING} strokeWidth={2.6} />} title="Schedule" subtitle="Frequency and reminder time" />

            <FieldLabel text="Frequency" />

            <TouchableOpacity style={styles.select} onPress={() => setFrequencyOpen(value => !value)} activeOpacity={0.85}>
              <Text style={styles.selectText}>{selectedFrequency}</Text>
              {frequencyOpen ? <ChevronUp size={21} color={PRIMARY} /> : <ChevronDown size={21} color={MUTED} />}
            </TouchableOpacity>

            {frequencyOpen ? (
              <View style={styles.dropdown}>
                {frequencies.map(item => {
                  const selected = item.value === frequency;

                  return (
                    <TouchableOpacity key={item.value} style={[styles.dropdownItem, selected ? styles.dropdownSelected : undefined]} onPress={() => selectFrequency(item.value)}>
                      <Text style={[styles.dropdownText, selected ? { color: PRIMARY_DARK } : undefined]}>{item.label}</Text>
                      {selected ? <CheckCircle2 size={18} color={PRIMARY} strokeWidth={2.6} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            {frequency === "CUSTOM" ? (
              <>
                <FieldLabel text="Custom frequency" />

                <Controller
                  control={control}
                  name="customFrequency"
                  render={({ field }) => (
                    <TextInput
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="e.g., Every alternate day"
                      placeholderTextColor="#A8B0C2"
                      style={styles.input}
                    />
                  )}
                />
              </>
            ) : null}

            <FieldLabel text="Reminder time" />

            <View style={styles.timeGrid}>
              {timeOptions.map(time => {
                const selected = selectedTimes.includes(time);

                return (
                  <TouchableOpacity key={time} style={[styles.timeChip, selected ? styles.timeSelected : undefined]} onPress={() => toggleTime(time)}>
                    <Clock3 size={15} color={selected ? PRIMARY_DARK : MUTED} strokeWidth={2.4} />
                    <Text style={[styles.timeText, selected ? { color: PRIMARY_DARK } : undefined]}>{time}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.helperText}>
              {timeCount === 1 ? "Select 1 reminder time." : `Select ${timeCount} reminder times.`} Selected: {selectedTimes.join(", ")}
            </Text>
          </View>

          <View style={styles.section}>
            <SectionHeader icon={<CalendarDays size={20} color={SUCCESS} strokeWidth={2.6} />} title="Dates" subtitle="Start and optional end date" />

            <FieldLabel text="Start date" />

            <Controller
              control={control}
              name="startDate"
              rules={{ required: "Start date is required.", validate: value => validDate(value) || "Use DD/MM/YYYY." }}
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#A8B0C2"
                  style={[styles.input, errors.startDate ? styles.inputError : undefined]}
                />
              )}
            />

            {errors.startDate ? <Text style={styles.errorText}>{errors.startDate.message}</Text> : null}

            <FieldLabel text="End date optional" />

            <Controller
              control={control}
              name="endDate"
              rules={{ validate: value => !value.trim() || validDate(value) || "Use DD/MM/YYYY." }}
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#A8B0C2"
                  style={[styles.input, errors.endDate ? styles.inputError : undefined]}
                />
              )}
            />
          </View>

          <View style={styles.section}>
            <SectionHeader icon={<FileText size={20} color={PRIMARY} strokeWidth={2.6} />} title="Instructions" subtitle="Optional medicine note" />

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
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  style={[styles.input, styles.multiline]}
                />
              )}
            />
          </View>

          {isResubmit || hasMedicine !== false ? (
            <View style={styles.reviewCard}>
              <View style={styles.reviewIcon}>
                <Stethoscope size={22} color={PRIMARY} strokeWidth={2.6} />
              </View>

              <View style={styles.reviewText}>
                <Text style={styles.reviewTitle}>Doctor review</Text>
                <Text style={styles.reviewSub}>{isResubmit ? "Send the corrected medicine back for review." : "Send this medicine to your primary doctor before activation."}</Text>
              </View>

              <Controller
                control={control}
                name="sendToDoctorForReview"
                render={({ field }) => (
                  <Switch
                    value={isResubmit ? true : field.value}
                    onValueChange={field.onChange}
                    disabled={isResubmit}
                    trackColor={{ false: "#DDE3EF", true: PRIMARY_LIGHT }}
                    thumbColor={isResubmit || field.value ? PRIMARY : SURFACE}
                  />
                )}
              />
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
          <TouchableOpacity style={[styles.primaryButton, isSubmitting ? styles.disabled : undefined]} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} activeOpacity={0.85}>
            <Send size={19} color={SURFACE} strokeWidth={2.6} />
            <Text style={styles.primaryText}>{isResubmit ? "Review Resubmission" : isEdit ? "Update Reminder Details" : "Review Reminder"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const SectionHeader = ({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIcon}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{subtitle}</Text>
    </View>
  </View>
);

const FieldLabel = ({ text }: { text: string }) => <Text style={styles.label}>{text}</Text>;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  appBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  backButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 13, ...elevate(1) },
  appBarText: { flex: 1 },
  title: { color: TEXT, fontSize: 25, fontWeight: "700" },
  subtitle: { color: MUTED, fontSize: 13, fontWeight: "500", marginTop: 3 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 5 },
  successNotice: { backgroundColor: SUCCESS_LIGHT, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 13 },
  successNoticeText: { flex: 1, marginLeft: 9, color: SUCCESS_DARK, fontSize: 11, fontWeight: "600", lineHeight: 17 },
  warningNotice: { backgroundColor: WARNING_LIGHT, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 13 },
  warningNoticeText: { flex: 1, marginLeft: 9, color: WARNING_DARK, fontSize: 11, fontWeight: "600", lineHeight: 17 },
  section: { backgroundColor: SURFACE, borderRadius: 16, padding: 16, marginBottom: 13, ...elevate(1) },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  sectionIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  sectionSub: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 3 },
  label: { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 15, marginBottom: 7 },
  input: { minHeight: 49, backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, color: TEXT, fontSize: 14, fontWeight: "500" },
  inputError: { borderColor: DANGER, backgroundColor: DANGER_LIGHT },
  errorText: { color: DANGER, fontSize: 11, fontWeight: "600", marginTop: 6 },
  multiline: { minHeight: 100, lineHeight: 20 },
  amountRow: { flexDirection: "row", alignItems: "stretch" },
  amountInput: { flex: 1, marginRight: 9 },
  unitBox: { minWidth: 110, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  unitText: { color: PRIMARY_DARK, fontSize: 12, fontWeight: "700" },
  manualHelper: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 9 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginTop: 6 },
  optionChip: { minHeight: 37, borderRadius: 10, backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, margin: 4, alignItems: "center", justifyContent: "center" },
  optionChipSelected: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  optionChipText: { color: MUTED, fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  optionChipTextSelected: { color: PRIMARY_DARK },
  doseInfo: { backgroundColor: PRIMARY_LIGHT, borderRadius: 11, padding: 10, flexDirection: "row", alignItems: "center", marginTop: 9 },
  doseInfoText: { flex: 1, marginLeft: 8, color: PRIMARY_DARK, fontSize: 11, fontWeight: "600" },
  availabilityRow: { flexDirection: "row" },
  availability: { flex: 1, minHeight: 76, backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER, borderRadius: 13, padding: 11, flexDirection: "row", alignItems: "center" },
  availabilityRight: { marginLeft: 9 },
  availabilityYes: { backgroundColor: SUCCESS_LIGHT, borderColor: SUCCESS },
  availabilityNo: { backgroundColor: WARNING_LIGHT, borderColor: WARNING },
  availabilityText: { flex: 1, marginLeft: 9 },
  availabilityTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  availabilitySub: { color: MUTED, fontSize: 10, fontWeight: "500", marginTop: 2 },
  packLoading: { minHeight: 58, marginTop: 12, borderRadius: 12, backgroundColor: SOFT, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  packLoadingText: { color: MUTED, fontSize: 11, fontWeight: "600", marginLeft: 8 },
  packReferenceCard: { backgroundColor: SUCCESS_LIGHT, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", marginTop: 12 },
  packReferenceText: { flex: 1, marginLeft: 9 },
  packReferenceTitle: { color: SUCCESS_DARK, fontSize: 13, fontWeight: "700" },
  packReferenceSub: { color: SUCCESS_DARK, fontSize: 10, fontWeight: "500", marginTop: 3 },
  manualPackNotice: { backgroundColor: WARNING_LIGHT, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "flex-start", marginTop: 12 },
  manualPackNoticeText: { flex: 1, marginLeft: 9 },
  manualPackTitle: { color: WARNING_DARK, fontSize: 12, fontWeight: "700" },
  manualPackText: { color: WARNING_DARK, fontSize: 10, fontWeight: "500", lineHeight: 16, marginTop: 3 },
  stockTotal: { backgroundColor: SOFT, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  stockTotalLabel: { color: MUTED, fontSize: 10, fontWeight: "600" },
  stockCalculation: { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 3 },
  stockTotalValue: { color: SUCCESS_DARK, fontSize: 16, fontWeight: "800" },
  noStockPanel: { backgroundColor: WARNING_LIGHT, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "flex-start", marginTop: 12 },
  noStockText: { flex: 1, marginLeft: 9 },
  noStockTitle: { color: WARNING_DARK, fontSize: 12, fontWeight: "700" },
  noStockSub: { color: WARNING_DARK, fontSize: 10, fontWeight: "500", lineHeight: 16, marginTop: 3 },
  select: { minHeight: 49, backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER, borderRadius: 13, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectText: { color: TEXT, fontSize: 13, fontWeight: "700" },
  dropdown: { borderRadius: 13, borderWidth: 1, borderColor: BORDER, overflow: "hidden", marginTop: 7 },
  dropdownItem: { minHeight: 45, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  dropdownSelected: { backgroundColor: PRIMARY_LIGHT },
  dropdownText: { color: TEXT, fontSize: 12, fontWeight: "600" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  timeChip: { minWidth: "22%", margin: 4, borderRadius: 10, backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER, paddingVertical: 9, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  timeSelected: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  timeText: { color: MUTED, fontSize: 10, fontWeight: "700", marginLeft: 4 },
  helperText: { color: MUTED, fontSize: 10, fontWeight: "600", lineHeight: 16, marginTop: 8 },
  reviewCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, marginBottom: 13, flexDirection: "row", alignItems: "center", ...elevate(1) },
  reviewIcon: { width: 45, height: 45, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  reviewText: { flex: 1, paddingRight: 8 },
  reviewTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  reviewSub: { color: MUTED, fontSize: 10, fontWeight: "500", lineHeight: 16, marginTop: 3 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: SURFACE, paddingHorizontal: 16, paddingTop: 12, ...elevate(2) },
  primaryButton: { minHeight: 50, borderRadius: 13, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  primaryText: { color: SURFACE, fontSize: 14, fontWeight: "700", marginLeft: 7 },
  disabled: { opacity: 0.55 },
});

export default AddMedicineScreen;