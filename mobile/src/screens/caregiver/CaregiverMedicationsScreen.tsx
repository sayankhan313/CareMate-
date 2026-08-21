import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BellRing, Check, ChevronLeft, Clock3, PackageCheck, Pill, RefreshCw, TriangleAlert } from "lucide-react-native";

import { caregiverMedicationApi, type CaregiverDoseStatus, type CaregiverMedication, type CaregiverMedicationReminder, type CaregiverMedicationSchedule } from "../../services/caregiver/caregiverMedicationApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "CaregiverMedications">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PRIMARY = "#F6A545";
const PRIMARY_SECONDARY = "#F8C36A";
const PRIMARY_LIGHT = "#FFF3E2";
const PRIMARY_DARK = "#8A520E";
const SUCCESS = "#3A9D75";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#E8F7F0";
const WARNING = "#D18425";
const WARNING_DARK = "#9A5B12";
const WARNING_LIGHT = "#FFF3E1";
const DANGER = "#DC4C57";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FDEBED";
const BLUE = "#5579D9";
const BLUE_LIGHT = "#EDF2FF";
const FOCUS_DURATION_MS = 5000;

const formatTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const [hours, minutes] = value.split(":");
  const time = new Date();
  time.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatFrequency = (value: string, custom?: string | null) => {
  if (value === "CUSTOM" && custom) return custom;
  return value.toLowerCase().split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
};

const getStatusTone = (status?: CaregiverDoseStatus | null) => {
  if (status === "TAKEN") return { background: SUCCESS_LIGHT, color: SUCCESS_DARK, label: "Taken", icon: <Check size={13} color={SUCCESS_DARK} strokeWidth={2.7} /> };
  if (status === "MISSED") return { background: DANGER_LIGHT, color: DANGER_DARK, label: "Missed", icon: <TriangleAlert size={13} color={DANGER_DARK} strokeWidth={2.5} /> };
  if (status === "SNOOZED") return { background: WARNING_LIGHT, color: WARNING_DARK, label: "Snoozed", icon: <Clock3 size={13} color={WARNING_DARK} strokeWidth={2.5} /> };
  return { background: BLUE_LIGHT, color: BLUE, label: "Pending", icon: <Clock3 size={13} color={BLUE} strokeWidth={2.5} /> };
};

const canSendReminder = (reminder: CaregiverMedicationReminder) => {
  if (!reminder.doseLogId || reminder.todayStatus === "TAKEN" || !reminder.todayStatus) return false;
  if (reminder.todayStatus === "MISSED") return true;

  const dueValue = reminder.todayStatus === "SNOOZED" && reminder.snoozedUntil ? reminder.snoozedUntil : reminder.scheduledToday;
  if (!dueValue) return false;

  const dueAt = new Date(dueValue).getTime();
  if (!Number.isFinite(dueAt)) return false;
  return dueAt - Date.now() <= 2 * 60 * 60_000;
};

export const CaregiverMedicationsScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const medicineStackYRef = useRef(0);
  const medicineOffsetsRef = useRef<Record<string, number>>({});
  const lastFocusedKeyRef = useRef<string | null>(null);

  const [data, setData] = useState<CaregiverMedicationSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sendingDoseId, setSendingDoseId] = useState<string | null>(null);
  const [sendingStockId, setSendingStockId] = useState<string | null>(null);
  const [focusedMedicineId, setFocusedMedicineId] = useState<string | null>(null);
  const [focusedDoseLogId, setFocusedDoseLogId] = useState<string | null>(null);

  const loadSchedule = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      setErrorMessage("");
      setData(await caregiverMedicationApi.getSchedule(route.params.patientId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load medicines.");
    } finally {
      if (mode === "initial") setIsLoading(false);
      if (mode === "refresh") setIsRefreshing(false);
    }
  }, [route.params.patientId]);

  useFocusEffect(useCallback(() => {
    void loadSchedule("initial");
  }, [loadSchedule]));

  const scrollToMedicine = useCallback((medicineId: string) => {
    const offset = medicineOffsetsRef.current[medicineId];
    if (offset === undefined) return false;

    scrollRef.current?.scrollTo({
      y: Math.max(0, medicineStackYRef.current + offset - 10),
      animated: true,
    });

    return true;
  }, []);

  useEffect(() => {
    if (!data || (!route.params.medicineId && !route.params.doseLogId)) return;

    const targetMedicine = data.medicines.find(medicine =>
      medicine.id === route.params.medicineId ||
      medicine.reminders.some(reminder => reminder.doseLogId === route.params.doseLogId),
    );

    if (!targetMedicine) return;

    const focusKey = `${route.params.patientId}:${targetMedicine.id}:${route.params.doseLogId || ""}`;
    if (lastFocusedKeyRef.current === focusKey) return;

    lastFocusedKeyRef.current = focusKey;
    setFocusedMedicineId(targetMedicine.id);
    setFocusedDoseLogId(route.params.doseLogId || null);

    const scrollTimer = setTimeout(() => {
      void scrollToMedicine(targetMedicine.id);
    }, 180);

    const clearTimer = setTimeout(() => {
      setFocusedMedicineId(null);
      setFocusedDoseLogId(null);
    }, FOCUS_DURATION_MS);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [data, route.params.doseLogId, route.params.medicineId, route.params.patientId, scrollToMedicine]);

  const registerMedicinePosition = (medicineId: string, y: number) => {
    medicineOffsetsRef.current[medicineId] = y;

    if (focusedMedicineId === medicineId) {
      setTimeout(() => {
        void scrollToMedicine(medicineId);
      }, 60);
    }
  };

  const sendReminder = async (reminder: CaregiverMedicationReminder) => {
    if (!reminder.doseLogId) return;

    try {
      setSendingDoseId(reminder.doseLogId);
      await caregiverMedicationApi.sendReminder(route.params.patientId, reminder.doseLogId);
      Alert.alert("Reminder sent", "The patient has been notified.");
    } catch (error) {
      Alert.alert("Couldn't send reminder", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSendingDoseId(null);
    }
  };

  const sendLowStockPrompt = async (medicine: CaregiverMedication) => {
    try {
      setSendingStockId(medicine.id);
      await caregiverMedicationApi.sendLowStockPrompt(route.params.patientId, medicine.id);
      Alert.alert("Reminder sent", "The patient has been notified about low stock.");
    } catch (error) {
      Alert.alert("Couldn't send reminder", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSendingStockId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.82} onPress={() => navigation.goBack()}>
            <ChevronLeft size={23} color={TEXT} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Medicines</Text>
            <Text style={styles.headerSubtitle}>{route.params.patientName || "Patient"}</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 28, 44) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadSchedule("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {isLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading medicines</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.stateContainer}>
              <View style={styles.errorIcon}>
                <RefreshCw size={24} color={DANGER} strokeWidth={2.5} />
              </View>

              <Text style={styles.stateTitle}>Couldn't load medicines</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>

              <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => void loadSchedule("initial")}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage && data ? (
            <>
              <LinearGradient colors={[PRIMARY, PRIMARY_SECONDARY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
                <View style={styles.heroCircleLarge} />
                <View style={styles.heroCircleSmall} />

                <View style={styles.heroHeader}>
                  <View>
                    <Text style={styles.heroEyebrow}>MEDICATION OVERVIEW</Text>
                    <Text style={styles.heroTitle}>Today's medicines</Text>
                    <Text style={styles.heroSubtitle}>{route.params.patientName || "Patient"}</Text>
                  </View>

                  <View style={styles.heroIcon}>
                    <Pill size={27} color={PRIMARY_DARK} strokeWidth={2.6} />
                  </View>
                </View>

                <View style={styles.heroStats}>
                  <HeroStat value={data.summary.activeMedicines} label="Medicines" />
                  <View style={styles.heroDivider} />
                  <HeroStat value={data.summary.taken} label="Taken" />
                  <View style={styles.heroDivider} />
                  <HeroStat value={data.summary.missed} label="Missed" />
                  <View style={styles.heroDivider} />
                  <HeroStat value={data.summary.lowStockMedicines} label="Low stock" />
                </View>
              </LinearGradient>

              <View style={styles.todayPanel}>
                <View style={styles.todayIcon}><Clock3 size={19} color={BLUE} strokeWidth={2.5} /></View>

                <View style={styles.todayTextBlock}>
                  <Text style={styles.todayTitle}>Today's schedule</Text>
                  <Text style={styles.todaySubtitle}>{data.summary.scheduledToday} dose{data.summary.scheduledToday === 1 ? "" : "s"} scheduled</Text>
                </View>

                {data.summary.pending > 0 ? (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeValue}>{data.summary.pending}</Text>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                  </View>
                ) : (
                  <View style={styles.clearBadge}>
                    <Check size={14} color={SUCCESS_DARK} strokeWidth={2.7} />
                    <Text style={styles.clearBadgeText}>Clear</Text>
                  </View>
                )}
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Medication list</Text>
                <Text style={styles.sectionSubtitle}>{data.summary.activeMedicines} active</Text>
              </View>

              {data.medicines.length ? (
                <View style={styles.medicineStack} onLayout={event => { medicineStackYRef.current = event.nativeEvent.layout.y; }}>
                  {data.medicines.map((medicine, medicineIndex) => {
                    const medicineFocused = focusedMedicineId === medicine.id;

                    return (
                      <View
                        key={medicine.id}
                        onLayout={event => registerMedicinePosition(medicine.id, event.nativeEvent.layout.y)}
                        style={[
                          styles.medicineCard,
                          medicineIndex % 2 === 0 ? styles.medicineWarm : styles.medicineCool,
                          medicineFocused ? styles.focusedMedicineCard : undefined,
                        ]}
                      >
                        <View style={styles.medicineHeader}>
                          <View style={[styles.medicineIcon, medicineIndex % 2 === 0 ? styles.medicineIconWarm : styles.medicineIconCool]}>
                            <Pill size={23} color={medicineIndex % 2 === 0 ? PRIMARY_DARK : BLUE} strokeWidth={2.6} />
                          </View>

                          <View style={styles.medicineTitleBlock}>
                            <Text style={styles.medicineName}>{medicine.name}</Text>
                            <Text style={styles.medicineDose}>{medicine.dose}</Text>
                          </View>

                          {medicine.stock.lowStock ? (
                            <View style={styles.lowBadge}>
                              <TriangleAlert size={12} color={WARNING_DARK} strokeWidth={2.5} />
                              <Text style={styles.lowBadgeText}>Low stock</Text>
                            </View>
                          ) : null}
                        </View>

                        {medicineFocused ? (
                          <View style={styles.notificationFocus}>
                            <BellRing size={15} color={PRIMARY_DARK} strokeWidth={2.5} />
                            <Text style={styles.notificationFocusText}>Opened from notification</Text>
                          </View>
                        ) : null}

                        {medicine.instructions ? (
                          <View style={styles.instructionsPanel}>
                            <Text style={styles.instructionsLabel}>Instructions</Text>
                            <Text style={styles.instructions}>{medicine.instructions}</Text>
                          </View>
                        ) : null}

                        <View style={[styles.stockPanel, medicine.stock.lowStock ? styles.stockPanelWarning : styles.stockPanelNormal]}>
                          <View style={[styles.stockIcon, medicine.stock.lowStock ? styles.stockIconWarning : styles.stockIconNormal]}>
                            <PackageCheck size={18} color={medicine.stock.lowStock ? WARNING_DARK : SUCCESS_DARK} strokeWidth={2.5} />
                          </View>

                          <View style={styles.stockContent}>
                            <Text style={styles.stockLabel}>Stock</Text>
                            <Text style={[styles.stockText, medicine.stock.lowStock ? styles.stockWarning : undefined]}>
                              {medicine.stock.currentStock !== null ? `${medicine.stock.currentStock}${medicine.stock.stockUnit ? ` ${medicine.stock.stockUnit}` : ""} available` : "Not recorded"}
                            </Text>
                          </View>

                          {medicine.stock.lowStock ? (
                            <TouchableOpacity style={styles.stockButton} activeOpacity={0.84} disabled={sendingStockId === medicine.id} onPress={() => void sendLowStockPrompt(medicine)}>
                              {sendingStockId === medicine.id ? (
                                <ActivityIndicator size="small" color={PRIMARY_DARK} />
                              ) : (
                                <>
                                  <BellRing size={14} color={PRIMARY_DARK} strokeWidth={2.5} />
                                  <Text style={styles.stockButtonText}>Prompt</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.stockGoodBadge}>
                              <Check size={13} color={SUCCESS_DARK} strokeWidth={2.7} />
                              <Text style={styles.stockGoodText}>Good</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.scheduleHeader}>
                          <Clock3 size={15} color={TEXT} strokeWidth={2.4} />
                          <Text style={styles.scheduleTitle}>Dose schedule</Text>
                        </View>

                        {medicine.reminders.length ? (
                          <View style={styles.reminders}>
                            {medicine.reminders.map((reminder, index) => {
                              const tone = getStatusTone(reminder.todayStatus);
                              const reminderAllowed = canSendReminder(reminder);
                              const doseFocused = Boolean(focusedDoseLogId && reminder.doseLogId === focusedDoseLogId);

                              return (
                                <View
                                  key={reminder.id}
                                  style={[
                                    styles.reminderRow,
                                    index === medicine.reminders.length - 1 ? styles.lastReminder : undefined,
                                    doseFocused ? styles.focusedReminderRow : undefined,
                                  ]}
                                >
                                  <View style={[styles.timeCircle, doseFocused ? styles.focusedTimeCircle : undefined]}>
                                    <Clock3 size={15} color={doseFocused ? DANGER_DARK : PRIMARY_DARK} strokeWidth={2.5} />
                                  </View>

                                  <View style={styles.timeBlock}>
                                    <Text style={styles.timeText}>{formatTime(reminder.timeOfDay)}</Text>
                                    <Text style={styles.frequencyText}>{formatFrequency(reminder.frequency, reminder.customFrequency)}</Text>
                                  </View>

                                  <View style={styles.reminderRight}>
                                    <View style={[styles.statusChip, { backgroundColor: tone.background }]}>
                                      {tone.icon}
                                      <Text style={[styles.statusText, { color: tone.color }]}>{tone.label}</Text>
                                    </View>

                                    {reminderAllowed ? (
                                      <TouchableOpacity style={styles.remindButton} activeOpacity={0.84} disabled={sendingDoseId === reminder.doseLogId} onPress={() => void sendReminder(reminder)}>
                                        {sendingDoseId === reminder.doseLogId ? (
                                          <ActivityIndicator size="small" color={SURFACE} />
                                        ) : (
                                          <>
                                            <BellRing size={14} color={SURFACE} strokeWidth={2.5} />
                                            <Text style={styles.remindText}>Remind</Text>
                                          </>
                                        )}
                                      </TouchableOpacity>
                                    ) : null}
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <View style={styles.noReminderPanel}>
                            <Clock3 size={16} color={MUTED} strokeWidth={2.4} />
                            <Text style={styles.noReminder}>No active schedule</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}><Pill size={26} color={PRIMARY_DARK} strokeWidth={2.5} /></View>
                  <Text style={styles.emptyTitle}>No active medicines</Text>
                  <Text style={styles.emptyText}>Active patient medicines will appear here.</Text>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const HeroStat = ({ value, label }: { value: number; label: string }) => (
  <View style={styles.heroStat}>
    <Text style={styles.heroStatValue}>{value}</Text>
    <Text style={styles.heroStatLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { height: 68, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  backButton: { width: 43, height: 43, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12, elevation: 2, shadowColor: "#172033", shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  headerText: { flex: 1 },
  headerTitle: { color: TEXT, fontSize: 20, fontWeight: "800", letterSpacing: -0.2 },
  headerSubtitle: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 2 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 5 },
  heroCard: { borderRadius: 23, padding: 18, overflow: "hidden", elevation: 5, shadowColor: "#A86212", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  heroCircleLarge: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.10)", right: -65, top: -80 },
  heroCircleSmall: { position: "absolute", width: 95, height: 95, borderRadius: 48, backgroundColor: "rgba(255,255,255,0.09)", left: -35, bottom: -45 },
  heroHeader: { flexDirection: "row", alignItems: "center" },
  heroEyebrow: { color: "#FFF8EC", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: SURFACE, fontSize: 22, fontWeight: "800", marginTop: 5 },
  heroSubtitle: { color: "#FFF8EC", fontSize: 11, fontWeight: "600", marginTop: 3 },
  heroIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginLeft: "auto" },
  heroStats: { backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 15, flexDirection: "row", alignItems: "center", marginTop: 18, paddingVertical: 13 },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { color: SURFACE, fontSize: 20, fontWeight: "800" },
  heroStatLabel: { color: "#FFF8EC", fontSize: 9, fontWeight: "700", marginTop: 3 },
  heroDivider: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.30)" },
  todayPanel: { backgroundColor: BLUE_LIGHT, borderRadius: 17, padding: 13, flexDirection: "row", alignItems: "center", marginTop: 12, borderWidth: 1, borderColor: "#DCE5FF" },
  todayIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  todayTextBlock: { flex: 1 },
  todayTitle: { color: TEXT, fontSize: 13, fontWeight: "800" },
  todaySubtitle: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },
  pendingBadge: { minWidth: 55, backgroundColor: SURFACE, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, alignItems: "center" },
  pendingBadgeValue: { color: BLUE, fontSize: 14, fontWeight: "800" },
  pendingBadgeText: { color: MUTED, fontSize: 8, fontWeight: "700", marginTop: 1 },
  clearBadge: { backgroundColor: SURFACE, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, flexDirection: "row", alignItems: "center" },
  clearBadgeText: { color: SUCCESS_DARK, fontSize: 9, fontWeight: "800", marginLeft: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 21, marginBottom: 10, paddingHorizontal: 2 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "800" },
  sectionSubtitle: { color: MUTED, fontSize: 10, fontWeight: "700" },
  medicineStack: { gap: 12 },
  medicineCard: { borderRadius: 20, padding: 15, borderWidth: 1 },
  medicineWarm: { backgroundColor: "#FFFBF5", borderColor: "#FBE6C8" },
  medicineCool: { backgroundColor: "#F8FAFF", borderColor: "#E1E7F8" },
  focusedMedicineCard: { borderColor: PRIMARY, borderWidth: 2, elevation: 4, shadowColor: "#A86212", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  notificationFocus: { backgroundColor: PRIMARY_LIGHT, borderRadius: 10, minHeight: 34, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", marginTop: 11 },
  notificationFocusText: { color: PRIMARY_DARK, fontSize: 9, fontWeight: "800", marginLeft: 6 },
  medicineHeader: { flexDirection: "row", alignItems: "center" },
  medicineIcon: { width: 49, height: 49, borderRadius: 15, alignItems: "center", justifyContent: "center", marginRight: 11 },
  medicineIconWarm: { backgroundColor: PRIMARY_LIGHT },
  medicineIconCool: { backgroundColor: BLUE_LIGHT },
  medicineTitleBlock: { flex: 1 },
  medicineName: { color: TEXT, fontSize: 15, fontWeight: "800" },
  medicineDose: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 3 },
  lowBadge: { backgroundColor: WARNING_LIGHT, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", alignItems: "center" },
  lowBadgeText: { color: WARNING_DARK, fontSize: 8, fontWeight: "800", marginLeft: 4 },
  instructionsPanel: { backgroundColor: SURFACE, borderRadius: 12, padding: 11, marginTop: 12 },
  instructionsLabel: { color: MUTED, fontSize: 8, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  instructions: { color: TEXT, fontSize: 10, fontWeight: "600", lineHeight: 15, marginTop: 4 },
  stockPanel: { borderRadius: 13, padding: 10, marginTop: 11, flexDirection: "row", alignItems: "center" },
  stockPanelNormal: { backgroundColor: SUCCESS_LIGHT },
  stockPanelWarning: { backgroundColor: WARNING_LIGHT },
  stockIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 9 },
  stockIconNormal: { backgroundColor: SURFACE },
  stockIconWarning: { backgroundColor: SURFACE },
  stockContent: { flex: 1 },
  stockLabel: { color: MUTED, fontSize: 8, fontWeight: "700" },
  stockText: { color: SUCCESS_DARK, fontSize: 10, fontWeight: "800", marginTop: 2 },
  stockWarning: { color: WARNING_DARK },
  stockButton: { minWidth: 82, height: 34, backgroundColor: SURFACE, borderRadius: 10, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  stockButtonText: { color: PRIMARY_DARK, fontSize: 9, fontWeight: "800", marginLeft: 5 },
  stockGoodBadge: { backgroundColor: SURFACE, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", alignItems: "center" },
  stockGoodText: { color: SUCCESS_DARK, fontSize: 8, fontWeight: "800", marginLeft: 4 },
  scheduleHeader: { flexDirection: "row", alignItems: "center", marginTop: 15, marginBottom: 5 },
  scheduleTitle: { color: TEXT, fontSize: 11, fontWeight: "800", marginLeft: 6 },
  reminders: { overflow: "hidden" },
  reminderRow: { minHeight: 68, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  focusedReminderRow: { backgroundColor: "#FFF0F1", borderRadius: 11, paddingHorizontal: 7 },
  focusedTimeCircle: { backgroundColor: DANGER_LIGHT },
  lastReminder: { borderBottomWidth: 0 },
  timeCircle: { width: 36, height: 36, borderRadius: 11, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 9 },
  timeBlock: { flex: 1 },
  timeText: { color: TEXT, fontSize: 13, fontWeight: "800" },
  frequencyText: { color: MUTED, fontSize: 8, fontWeight: "600", marginTop: 2 },
  reminderRight: { flexDirection: "row", alignItems: "center" },
  statusChip: { minHeight: 30, borderRadius: 9, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  statusText: { fontSize: 8, fontWeight: "800", marginLeft: 4 },
  remindButton: { minWidth: 78, height: 34, backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", marginLeft: 7 },
  remindText: { color: SURFACE, fontSize: 9, fontWeight: "800", marginLeft: 4 },
  noReminderPanel: { backgroundColor: SURFACE, borderRadius: 11, padding: 11, flexDirection: "row", alignItems: "center", marginTop: 4 },
  noReminder: { color: MUTED, fontSize: 9, fontWeight: "600", marginLeft: 6 },
  stateContainer: { backgroundColor: SURFACE, borderRadius: 18, alignItems: "center", paddingVertical: 70, paddingHorizontal: 24, marginTop: 8 },
  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 11 },
  stateText: { color: MUTED, fontSize: 11, lineHeight: 17, fontWeight: "500", textAlign: "center", marginTop: 5 },
  errorIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  retryButton: { backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, marginTop: 15 },
  retryText: { color: SURFACE, fontSize: 12, fontWeight: "700" },
  emptyCard: { backgroundColor: PRIMARY_LIGHT, borderRadius: 18, padding: 30, alignItems: "center", borderWidth: 1, borderColor: "#FBE1B9" },
  emptyIcon: { width: 56, height: 56, borderRadius: 17, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 12 },
  emptyText: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 4 },
});