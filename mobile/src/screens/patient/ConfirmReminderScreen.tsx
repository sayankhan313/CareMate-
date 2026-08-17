import { useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Clock3, FilePenLine, Package, Pill, Send, ShieldCheck, Stethoscope } from "lucide-react-native";

import { API_BASE_URL } from "../../constants/api";
import { patientMedicineReviewsApi } from "../../services/patientMedicineReviewsApi";
import { tokenStorage } from "../../services/tokenStorage";
import type { MedicineDraft, RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ConfirmReminder">;

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

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const frequencyLabel = (frequency: string, custom?: string) => {
  if (frequency === "ONCE_DAILY") return "Once daily";
  if (frequency === "TWICE_DAILY") return "Twice daily";
  if (frequency === "THREE_TIMES_DAILY") return "Three times daily";
  if (frequency === "FOUR_TIMES_DAILY") return "Four times daily";
  if (frequency === "AS_NEEDED") return "As needed";
  if (frequency === "CUSTOM") return custom || "Custom schedule";
  return frequency;
};

const backendDate = (value: string) => {
  const date = value.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }

  return date;
};

const dateText = (date: Date) => `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

const passedToday = (time: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return false;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return false;

  const scheduled = new Date();
  scheduled.setHours(hour, minute, 0, 0);
  return scheduled <= new Date();
};

const scheduleStart = (start: string, times: string[]) => {
  const formatted = backendDate(start);
  if (formatted !== dateText(new Date())) return formatted;
  if (!times.some(passedToday)) return formatted;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateText(tomorrow);
};

const singularUnit = (unit?: string | null) => {
  const value = unit?.trim().toLowerCase() || "";
  const known: Record<string, string> = {
    tablets: "tablet",
    capsules: "capsule",
    puffs: "puff",
    doses: "dose",
    sprays: "spray",
    sachets: "sachet",
    packs: "pack",
  };
  return known[value] || value;
};

const displayUnit = (unit: string, quantity: number) => {
  const value = singularUnit(unit);
  if (quantity === 1 || ["ml", "g", "mg", "mcg"].includes(value)) return value;
  if (value.endsWith("s")) return value;
  return `${value}s`;
};

const getError = (result: any) => {
  if (typeof result?.message === "string") return result.message;
  if (Array.isArray(result?.message)) return result.message[0]?.message || "Please check the medicine details.";
  if (Array.isArray(result?.errors)) return result.errors[0]?.message || "Please check the medicine details.";
  if (Array.isArray(result?.issues)) return result.issues[0]?.message || "Please check the medicine details.";
  return "Please check the medicine details.";
};

export const ConfirmReminderScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const { medicineDraft, mode = "CREATE", medicineReviewRequestId } = route.params;
  const isResubmit = mode === "RESUBMIT_REVIEW";
  const noStock = !isResubmit && medicineDraft.hasMedicineOnHand === false;

  const selectedTimes = medicineDraft.selectedTimes?.length
    ? isResubmit
      ? [medicineDraft.selectedTimes[0]]
      : medicineDraft.selectedTimes
    : [medicineDraft.timeOfDay];

  const [doctorReview, setDoctorReview] = useState(isResubmit ? true : medicineDraft.sendToDoctorForReview);
  const [saving, setSaving] = useState(false);

  const startDate = useMemo(() => scheduleStart(medicineDraft.startDate, selectedTimes), [medicineDraft.startDate, selectedTimes]);
  const adjustedStart = startDate !== backendDate(medicineDraft.startDate);
  const amount = medicineDraft.doseQuantity ?? 1;
  const doseUnit = singularUnit(medicineDraft.doseUnit || medicineDraft.stockUnit || "dose");
  const amountText = `${amount} ${displayUnit(doseUnit, amount)}`;
  const stock = medicineDraft.currentStock ?? 0;
  const stockUnit = singularUnit(medicineDraft.stockUnit || doseUnit);
  const packQuantity = medicineDraft.packageQuantity;
  const packSize = medicineDraft.packSize;
  const packageUnit = medicineDraft.packageUnit || "pack";

  const editableDraft = (): MedicineDraft => ({
    ...medicineDraft,
    timeOfDay: selectedTimes[0],
    selectedTimes,
    sendToDoctorForReview: isResubmit ? true : doctorReview,
  });

  const edit = () => {
    navigation.replace("AddMedicine", {
      medicineDraft: editableDraft(),
      mode: isResubmit ? "RESUBMIT_REVIEW" : "EDIT_DRAFT",
      medicineReviewRequestId: isResubmit ? medicineReviewRequestId : undefined,
    });
  };

  const saveNewMedicine = async () => {
    const token = await tokenStorage.getToken();
    if (!token) throw new Error("Please login again.");

    const response = await fetch(`${API_BASE_URL}/patient/medicines`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: medicineDraft.name,
        dose: medicineDraft.dose,
        doseQuantity: medicineDraft.doseQuantity ?? 1,
        doseUnit,
        instructions: medicineDraft.instructions || undefined,
        frequency: medicineDraft.frequency,
        customFrequency: medicineDraft.frequency === "CUSTOM" ? medicineDraft.customFrequency : undefined,
        timeOfDay: selectedTimes[0],
        selectedTimes,
        startDate,
        endDate: medicineDraft.endDate ? backendDate(medicineDraft.endDate) : undefined,
        sendToDoctorForReview: doctorReview,
        hasMedicineOnHand: medicineDraft.hasMedicineOnHand,
        currentStock: medicineDraft.hasMedicineOnHand ? medicineDraft.currentStock : 0,
        stockUnit: medicineDraft.stockUnit || doseUnit,
        lowStockThreshold: medicineDraft.lowStockThreshold,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(getError(result));

    return result?.data;
  };

  const resubmit = async () => {
    if (!medicineReviewRequestId) throw new Error("Medicine review request ID is missing.");

    await patientMedicineReviewsApi.resubmitReview(medicineReviewRequestId, {
      name: medicineDraft.name,
      dose: medicineDraft.dose,
      doseQuantity: medicineDraft.doseQuantity ?? 1,
      doseUnit,
      instructions: medicineDraft.instructions || undefined,
      frequency: medicineDraft.frequency,
      customFrequency: medicineDraft.frequency === "CUSTOM" ? medicineDraft.customFrequency : undefined,
      timeOfDay: selectedTimes[0],
      startDate,
      endDate: medicineDraft.endDate ? backendDate(medicineDraft.endDate) : undefined,
    });
  };

  const medicines = () => {
    navigation.reset({ index: 0, routes: [{ name: "PatientTabs", params: { screen: "Medicines" } }] });
  };

  const openPharmacyRequest = (medicineId?: string) => {
    navigation.replace("MedicineStock", medicineId ? { initialRequest: { medicineId } } : undefined);
  };

  const save = async () => {
    if (saving) return;

    try {
      setSaving(true);

      if (isResubmit) {
        await resubmit();

        Alert.alert("Medicine resubmitted", "Your corrected medicine has been sent for review.", [
          { text: "View Updates", onPress: () => navigation.reset({ index: 0, routes: [{ name: "MedicineUpdates" }] }) },
        ]);
        return;
      }

      const created = await saveNewMedicine();

      if (noStock) {
        openPharmacyRequest(created?.id);
        return;
      }

      if (doctorReview) {
        Alert.alert("Sent for doctor review", "The medicine will remain inactive until the review is completed.", [
          { text: "View Updates", onPress: () => navigation.reset({ index: 0, routes: [{ name: "MedicineUpdates" }] }) },
          { text: "Done", onPress: medicines },
        ]);
        return;
      }

      Alert.alert("Reminder saved", "Your medicine reminder has been added.", [{ text: "OK", onPress: medicines }]);
    } catch (error) {
      Alert.alert(isResubmit ? "Unable to resubmit" : "Unable to save reminder", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={saving} activeOpacity={0.85}>
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{isResubmit ? "Confirm Resubmission" : "Confirm Reminder"}</Text>
            <Text style={styles.subtitle}>Review medicine and schedule</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(190, insets.bottom + 175) }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.medicineCard}>
            <View style={styles.medicineIcon}>
              <Pill size={34} color={PRIMARY} strokeWidth={2.6} />
            </View>

            <Text style={styles.medicineName}>{medicineDraft.name}</Text>
            <Text style={styles.strength}>{medicineDraft.dose}</Text>

            <View style={styles.amountBadge}>
              <Text style={styles.amountSmall}>Amount each time</Text>
              <Text style={styles.amountValue}>{amountText}</Text>
            </View>

            {medicineDraft.instructions ? <Text style={styles.instructions}>{medicineDraft.instructions}</Text> : null}
          </View>

          {!isResubmit ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Medicine availability</Text>
                  <Text style={styles.cardSub}>Recorded stock</Text>
                </View>

                <View style={[styles.statusBadge, medicineDraft.hasMedicineOnHand ? styles.availableBadge : styles.emptyBadge]}>
                  {medicineDraft.hasMedicineOnHand ? (
                    <CheckCircle2 size={15} color={SUCCESS_DARK} strokeWidth={2.5} />
                  ) : (
                    <AlertTriangle size={15} color={WARNING_DARK} strokeWidth={2.5} />
                  )}
                  <Text style={[styles.statusText, { color: medicineDraft.hasMedicineOnHand ? SUCCESS_DARK : WARNING_DARK }]}>
                    {medicineDraft.hasMedicineOnHand ? "Available" : "No stock"}
                  </Text>
                </View>
              </View>

              {medicineDraft.hasMedicineOnHand ? (
                <>
                  {packQuantity && packSize ? (
                    <Detail
                      icon={<Package size={17} color={PRIMARY} strokeWidth={2.5} />}
                      label="Packs recorded"
                      value={`${packQuantity} ${displayUnit(packageUnit, packQuantity)} • 1 ${packageUnit} = ${packSize} ${displayUnit(stockUnit, packSize)}`}
                    />
                  ) : null}

                  <Detail
                    icon={<Package size={17} color={SUCCESS} strokeWidth={2.5} />}
                    label="Total stock"
                    value={`${stock} ${displayUnit(stockUnit, stock)}`}
                  />

                  <Detail
                    icon={<Pill size={17} color={PRIMARY} strokeWidth={2.5} />}
                    label="Each dose"
                    value={amountText}
                  />

                  <Detail
                    icon={<AlertTriangle size={17} color={WARNING} strokeWidth={2.5} />}
                    label="Low-stock warning"
                    value={`${medicineDraft.lowStockThreshold ?? 0} ${displayUnit(stockUnit, medicineDraft.lowStockThreshold ?? 0)}`}
                    last
                  />

                  <View style={styles.stockInfo}>
                    <CheckCircle2 size={17} color={SUCCESS_DARK} strokeWidth={2.5} />
                    <Text style={styles.stockInfoText}>{amountText} will be deducted when this dose is marked Taken.</Text>
                  </View>
                </>
              ) : (
                <View style={styles.noStock}>
                  <AlertTriangle size={19} color={WARNING_DARK} strokeWidth={2.5} />
                  <View style={{ flex: 1, marginLeft: 9 }}>
                    <Text style={styles.noStockTitle}>Medicine unavailable</Text>
                    <Text style={styles.noStockText}>Reminder stays inactive until stock is available.</Text>
                  </View>
                </View>
              )}
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Reminder details</Text>
                <Text style={styles.cardSub}>Schedule</Text>
              </View>

              <TouchableOpacity style={styles.editSmall} onPress={edit} disabled={saving}>
                <FilePenLine size={15} color={PRIMARY_DARK} strokeWidth={2.5} />
                <Text style={styles.editSmallText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <Detail icon={<Clock3 size={17} color={WARNING} strokeWidth={2.5} />} label="Frequency" value={frequencyLabel(medicineDraft.frequency, medicineDraft.customFrequency)} />
            <Detail icon={<Clock3 size={17} color={PRIMARY} strokeWidth={2.5} />} label="Reminder times" value={selectedTimes.join(", ")} />
            <Detail icon={<CalendarDays size={17} color={SUCCESS} strokeWidth={2.5} />} label="Start date" value={startDate} />
            <Detail icon={<CalendarDays size={17} color={MUTED} strokeWidth={2.5} />} label="End date" value={medicineDraft.endDate ? backendDate(medicineDraft.endDate) : "Not set"} last />

            {adjustedStart ? (
              <View style={styles.startNotice}>
                <Clock3 size={17} color={WARNING_DARK} strokeWidth={2.5} />
                <Text style={styles.startNoticeText}>A selected time has already passed today, so the schedule starts tomorrow.</Text>
              </View>
            ) : null}
          </View>

          {!noStock ? (
            <View style={styles.reviewCard}>
              <View style={styles.reviewIcon}>
                <Stethoscope size={22} color={PRIMARY} strokeWidth={2.6} />
              </View>

              <View style={styles.reviewText}>
                <Text style={styles.reviewTitle}>{isResubmit ? "Send back to doctor" : "Send to doctor for review"}</Text>
                <Text style={styles.reviewSub}>{doctorReview || isResubmit ? "Medicine remains inactive while awaiting review." : "Medicine will be added directly."}</Text>
              </View>

              <Switch
                value={isResubmit ? true : doctorReview}
                onValueChange={setDoctorReview}
                disabled={saving || isResubmit}
                trackColor={{ false: "#DDE3EF", true: PRIMARY_LIGHT }}
                thumbColor={isResubmit || doctorReview ? PRIMARY : SURFACE}
              />
            </View>
          ) : (
            <View style={styles.pharmacyPanel}>
              <Package size={20} color={WARNING_DARK} strokeWidth={2.6} />
              <View style={{ flex: 1, marginLeft: 9 }}>
                <Text style={styles.pharmacyTitle}>Request medicine</Text>
                <Text style={styles.pharmacyText}>Continue to your pharmacy request after saving this medicine.</Text>
              </View>
            </View>
          )}

          {doctorReview || isResubmit ? (
            <View style={styles.reviewInfo}>
              <ShieldCheck size={19} color={PRIMARY_DARK} strokeWidth={2.6} />
              <Text style={styles.reviewInfoText}>Your medicine will be sent for professional review.</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
          <TouchableOpacity style={styles.editButton} onPress={edit} disabled={saving}>
            <FilePenLine size={18} color={PRIMARY_DARK} strokeWidth={2.5} />
            <Text style={styles.editButtonText}>Edit Details</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryButton, saving ? styles.disabled : undefined]} onPress={() => void save()} disabled={saving} activeOpacity={0.85}>
            {saving ? (
              <ActivityIndicator color={SURFACE} />
            ) : (
              <>
                {noStock ? <Package size={19} color={SURFACE} strokeWidth={2.6} /> : <Send size={19} color={SURFACE} strokeWidth={2.6} />}
                <Text style={styles.primaryText}>
                  {isResubmit ? "Resubmit to Doctor" : noStock ? "Request from Pharmacy" : doctorReview ? "Send for Review" : "Save Medicine & Reminder"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const Detail = ({ icon, label, value, last }: { icon: ReactNode; label: string; value: string; last?: boolean }) => (
  <View style={[styles.detail, last ? styles.detailLast : undefined]}>
    <View style={styles.detailIcon}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  appBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 13, flexDirection: "row", alignItems: "center" },
  backButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 13, ...elevate(1) },
  title: { color: TEXT, fontSize: 25, fontWeight: "700" },
  subtitle: { color: MUTED, fontSize: 13, fontWeight: "500", marginTop: 3 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  medicineCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 21, alignItems: "center", marginBottom: 13, ...elevate(1) },
  medicineIcon: { width: 70, height: 70, borderRadius: 18, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  medicineName: { color: TEXT, fontSize: 21, fontWeight: "700", textAlign: "center" },
  strength: { color: MUTED, fontSize: 14, fontWeight: "600", marginTop: 4 },
  amountBadge: { backgroundColor: PRIMARY_LIGHT, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 9, alignItems: "center", marginTop: 12 },
  amountSmall: { color: PRIMARY_DARK, fontSize: 9, fontWeight: "600" },
  amountValue: { color: PRIMARY_DARK, fontSize: 15, fontWeight: "800", marginTop: 2 },
  instructions: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, textAlign: "center", marginTop: 10 },
  card: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, marginBottom: 13, ...elevate(1) },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 7 },
  cardTitle: { color: TEXT, fontSize: 17, fontWeight: "700" },
  cardSub: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 3 },
  statusBadge: { minHeight: 34, borderRadius: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" },
  availableBadge: { backgroundColor: SUCCESS_LIGHT },
  emptyBadge: { backgroundColor: WARNING_LIGHT },
  statusText: { fontSize: 10, fontWeight: "700", marginLeft: 5 },
  detail: { minHeight: 58, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  detailLast: { borderBottomWidth: 0 },
  detailIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: SOFT, alignItems: "center", justifyContent: "center", marginRight: 10 },
  detailLabel: { color: MUTED, fontSize: 10, fontWeight: "600" },
  detailValue: { color: TEXT, fontSize: 13, fontWeight: "700", lineHeight: 18, marginTop: 2 },
  stockInfo: { backgroundColor: SUCCESS_LIGHT, borderRadius: 11, padding: 10, flexDirection: "row", alignItems: "flex-start", marginTop: 8 },
  stockInfoText: { flex: 1, color: SUCCESS_DARK, fontSize: 11, fontWeight: "600", lineHeight: 17, marginLeft: 8 },
  noStock: { backgroundColor: WARNING_LIGHT, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "flex-start", marginTop: 10 },
  noStockTitle: { color: WARNING_DARK, fontSize: 12, fontWeight: "700" },
  noStockText: { color: WARNING_DARK, fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 3 },
  editSmall: { minHeight: 36, borderRadius: 10, backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 11, flexDirection: "row", alignItems: "center" },
  editSmallText: { color: PRIMARY_DARK, fontSize: 11, fontWeight: "700", marginLeft: 5 },
  startNotice: { backgroundColor: WARNING_LIGHT, borderRadius: 11, padding: 10, flexDirection: "row", alignItems: "flex-start", marginTop: 8 },
  startNoticeText: { flex: 1, color: WARNING_DARK, fontSize: 11, fontWeight: "500", lineHeight: 17, marginLeft: 8 },
  reviewCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 13, ...elevate(1) },
  reviewIcon: { width: 45, height: 45, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  reviewText: { flex: 1, paddingRight: 8 },
  reviewTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  reviewSub: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 16, marginTop: 3 },
  pharmacyPanel: { backgroundColor: WARNING_LIGHT, borderRadius: 13, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 13 },
  pharmacyTitle: { color: WARNING_DARK, fontSize: 13, fontWeight: "700" },
  pharmacyText: { color: WARNING_DARK, fontSize: 10, fontWeight: "500", lineHeight: 16, marginTop: 2 },
  reviewInfo: { backgroundColor: PRIMARY_LIGHT, borderRadius: 13, padding: 12, flexDirection: "row", alignItems: "flex-start", marginBottom: 13 },
  reviewInfoText: { flex: 1, color: PRIMARY_DARK, fontSize: 11, fontWeight: "600", lineHeight: 17, marginLeft: 8 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: SURFACE, paddingHorizontal: 16, paddingTop: 12, ...elevate(2) },
  editButton: { minHeight: 45, borderRadius: 12, backgroundColor: PRIMARY_LIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 9 },
  editButtonText: { color: PRIMARY_DARK, fontSize: 13, fontWeight: "700", marginLeft: 6 },
  primaryButton: { minHeight: 50, borderRadius: 13, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  primaryText: { color: SURFACE, fontSize: 14, fontWeight: "700", marginLeft: 7 },
  disabled: { opacity: 0.58 },
});

export default ConfirmReminderScreen;