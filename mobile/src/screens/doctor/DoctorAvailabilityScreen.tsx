import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Calendar, type DateData } from "react-native-calendars";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Ban,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock3,
  Coffee,
  RefreshCw,
  Trash2,
} from "lucide-react-native";

import {
  doctorAvailabilityApi,
  type DoctorAvailabilityItem,
  type DoctorAvailabilityStatus,
} from "../../services/doctor/doctorAvailabilityApi";
import type { RootStackParamList } from "../../types/navigation";

type DoctorAvailabilityScreenProps = NativeStackScreenProps<RootStackParamList, "DoctorAvailability">;
type TimeTarget = "start" | "end" | null;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_LIGHT = "#E6FFFA";
const WARNING = "#F6A545";
const WARNING_LIGHT = "#FFF3E2";
const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";
const NO_APPOINTMENTS = "#7A8194";
const NO_APPOINTMENTS_LIGHT = "#F1F3F7";
const SOFT = "#F7F9FF";

const SLOT_OPTIONS = [15, 30, 45, 60];

const createTimeOptions = () => {
  const values: string[] = [];

  for (let hour = 6; hour <= 22; hour += 1) {
    values.push(`${String(hour).padStart(2, "0")}:00`);
    if (hour < 22) values.push(`${String(hour).padStart(2, "0")}:30`);
  }

  return values;
};

const TIME_OPTIONS = createTimeOptions();

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
  shadowOpacity: level === 1 ? 0.06 : 0.1,
  shadowRadius: level === 1 ? 4 : 9,
});

const getMonthString = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatMonthTitle = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString([], { month: "long", year: "numeric" });
};

const formatAvailabilityDate = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" });
};

const getStatusLabel = (status: DoctorAvailabilityStatus) => {
  if (status === "OUT_OF_OFFICE") return "Out of office";
  if (status === "UNAVAILABLE") return "No appointments";
  return "Available";
};

const getStatusColour = (status: DoctorAvailabilityStatus) => {
  if (status === "OUT_OF_OFFICE") return WARNING;
  if (status === "UNAVAILABLE") return NO_APPOINTMENTS;
  return DOCTOR_PRIMARY;
};

const getStatusBackground = (status: DoctorAvailabilityStatus) => {
  if (status === "OUT_OF_OFFICE") return WARNING_LIGHT;
  if (status === "UNAVAILABLE") return NO_APPOINTMENTS_LIGHT;
  return DOCTOR_LIGHT;
};

export default function DoctorAvailabilityScreen({ navigation }: DoctorAvailabilityScreenProps) {
  const insets = useSafeAreaInsets();

  const [currentMonth, setCurrentMonth] = useState(getMonthString());
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, DoctorAvailabilityItem>>({});
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<DoctorAvailabilityStatus>("AVAILABLE");

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);

  const [timeTarget, setTimeTarget] = useState<TimeTarget>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMonth = useCallback(async (month: string, mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await doctorAvailabilityApi.getAvailability(month);
      const nextMap: Record<string, DoctorAvailabilityItem> = {};

      result.availabilities.forEach((item) => {
        nextMap[item.date] = item;
      });

      setCurrentMonth(result.month);
      setAvailabilityByDate(nextMap);
      setSelectedDates([]);
      setSelectedStatus("AVAILABLE");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load doctor availability.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMonth(getMonthString());
  }, [loadMonth]);

  const markedDates = useMemo(() => {
    const marked: Record<string, any> = {};

    Object.values(availabilityByDate).forEach((item) => {
      marked[item.date] = {
        marked: true,
        dotColor: getStatusColour(item.status),
      };
    });

    selectedDates.forEach((date) => {
      marked[date] = {
        ...(marked[date] || {}),
        selected: true,
        selectedColor: getStatusColour(selectedStatus),
        selectedTextColor: "#FFFFFF",
        marked: Boolean(availabilityByDate[date]),
        dotColor: "#FFFFFF",
      };
    });

    return marked;
  }, [availabilityByDate, selectedDates, selectedStatus]);

  const sortedAvailability = useMemo(
    () => Object.values(availabilityByDate).sort((a, b) => a.date.localeCompare(b.date)),
    [availabilityByDate],
  );

  const persistMap = async (nextMap: Record<string, DoctorAvailabilityItem>) => {
    const result = await doctorAvailabilityApi.saveMonthlyAvailability({
      month: currentMonth,
      availabilities: Object.values(nextMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((item) => ({
          date: item.date,
          status: item.status,
          startTime: item.status === "AVAILABLE" ? item.startTime : null,
          endTime: item.status === "AVAILABLE" ? item.endTime : null,
          slotDurationMinutes: item.status === "AVAILABLE" ? item.slotDurationMinutes : null,
        })),
    });

    const savedMap: Record<string, DoctorAvailabilityItem> = {};

    result.availabilities.forEach((item) => {
      savedMap[item.date] = item;
    });

    return savedMap;
  };

  const handleDayPress = (day: DateData) => {
    const date = day.dateString;

    if (date < getTodayString()) return;
    if (isApplying || isRemoving) return;

    setSelectedDates((current) => {
      if (current.includes(date)) return current.filter((item) => item !== date);
      return [...current, date].sort();
    });
  };

  const handleMonthChange = (day: DateData) => {
    const month = day.dateString.slice(0, 7);

    if (month === currentMonth) return;

    setSelectedDates([]);
    setSelectedStatus("AVAILABLE");
    void loadMonth(month);
  };

  const changeSelectedStatus = (status: DoctorAvailabilityStatus) => {
    setSelectedStatus(status);
  };

  const applyToSelectedDates = async () => {
    if (selectedDates.length === 0) {
      Alert.alert("Select dates", "Select one or more calendar dates first.");
      return;
    }

    if (selectedStatus === "AVAILABLE" && startTime >= endTime) {
      Alert.alert("Invalid time", "Available until must be later than available from.");
      return;
    }

    const appliedDateCount = selectedDates.length;

    try {
      setIsApplying(true);

      const nextMap = { ...availabilityByDate };

      selectedDates.forEach((date) => {
        const existing = nextMap[date];

        nextMap[date] = {
          id: existing?.id || `draft-${date}`,
          doctorId: existing?.doctorId || "",
          date,
          status: selectedStatus,
          startTime: selectedStatus === "AVAILABLE" ? startTime : null,
          endTime: selectedStatus === "AVAILABLE" ? endTime : null,
          slotDurationMinutes: selectedStatus === "AVAILABLE" ? slotDurationMinutes : null,
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      const savedMap = await persistMap(nextMap);

      setAvailabilityByDate(savedMap);
      setSelectedDates([]);
      setSelectedStatus("AVAILABLE");

      Alert.alert(
        "Applied",
        `${getStatusLabel(selectedStatus)} applied to ${appliedDateCount} date${appliedDateCount === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      Alert.alert("Unable to apply", error instanceof Error ? error.message : "Unable to apply the selected status.");
    } finally {
      setIsApplying(false);
    }
  };

  const removeSelectedDates = () => {
    if (selectedDates.length === 0) {
      Alert.alert("Select dates", "Select calendar dates you want to clear.");
      return;
    }

    const configuredDates = selectedDates.filter((date) => availabilityByDate[date]);

    if (configuredDates.length === 0) {
      Alert.alert("Nothing to remove", "The selected dates do not have a saved status.");
      return;
    }

    Alert.alert(
      "Clear selected dates",
      `Remove the saved status from ${configuredDates.length} selected date${configuredDates.length === 1 ? "" : "s"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setIsRemoving(true);

              const nextMap = { ...availabilityByDate };

              configuredDates.forEach((date) => {
                delete nextMap[date];
              });

              const savedMap = await persistMap(nextMap);

              setAvailabilityByDate(savedMap);
              setSelectedDates([]);
              setSelectedStatus("AVAILABLE");
            } catch (error) {
              Alert.alert("Unable to remove", error instanceof Error ? error.message : "Unable to clear the selected dates.");
            } finally {
              setIsRemoving(false);
            }
          },
        },
      ],
    );
  };

  const selectExistingAvailability = (item: DoctorAvailabilityItem) => {
    setSelectedDates([item.date]);
    setSelectedStatus(item.status);

    if (item.status === "AVAILABLE") {
      setStartTime(item.startTime || "09:00");
      setEndTime(item.endTime || "17:00");
      setSlotDurationMinutes(item.slotDurationMinutes || 30);
    }
  };

  const selectTime = (value: string) => {
    if (timeTarget === "start") setStartTime(value);
    if (timeTarget === "end") setEndTime(value);
    setTimeTarget(null);
  };

  const statusMessage =
    selectedStatus === "OUT_OF_OFFICE"
      ? "You will be away from work on the selected dates. Patients cannot book appointments and medicine review requests can be redirected to another eligible doctor."
      : "Appointments are closed on the selected dates. Patients cannot book, but you can still receive medicine review requests.";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} activeOpacity={0.84} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>Manage Availability</Text>
          <Text style={styles.headerSubtitle}>Set your status for individual calendar dates</Text>
        </View>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 28, 36) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadMonth(currentMonth, "refresh")}
            tintColor={DOCTOR_PRIMARY}
            colors={[DOCTOR_PRIMARY]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={DOCTOR_PRIMARY} />
            <Text style={styles.stateText}>Loading availability...</Text>
          </View>
        ) : null}

        {!isLoading && errorMessage ? (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <RefreshCw size={25} color={DANGER} strokeWidth={2.6} />
            </View>

            <Text style={styles.errorTitle}>Unable to load availability</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>

            <TouchableOpacity style={styles.retryButton} activeOpacity={0.84} onPress={() => void loadMonth(currentMonth)}>
              <RefreshCw size={17} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!isLoading && !errorMessage ? (
          <>
            <View style={styles.calendarCard}>
              <View style={styles.sectionTopRow}>
                <View style={styles.sectionIcon}>
                  <CalendarDays size={21} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
                </View>

                <View style={styles.sectionTitleBlock}>
                  <Text style={styles.sectionTitle}>{formatMonthTitle(currentMonth)}</Text>
                  <Text style={styles.sectionSubtitle}>
                    Select dates, choose a status and apply it. Applied dates remain saved until changed or cleared.
                  </Text>
                </View>
              </View>

              <Calendar
                key={currentMonth}
                current={`${currentMonth}-01`}
                minDate={getTodayString()}
                markedDates={markedDates}
                onDayPress={handleDayPress}
                onMonthChange={handleMonthChange}
                enableSwipeMonths
                hideExtraDays={false}
                firstDay={1}
                theme={{
                  calendarBackground: SURFACE,
                  textSectionTitleColor: MUTED,
                  selectedDayTextColor: "#FFFFFF",
                  todayTextColor: DOCTOR_PRIMARY,
                  dayTextColor: TEXT,
                  textDisabledColor: "#C7CBD5",
                  arrowColor: DOCTOR_PRIMARY,
                  monthTextColor: TEXT,
                  textDayFontWeight: "600",
                  textMonthFontWeight: "700",
                  textDayHeaderFontWeight: "700",
                  textDayFontSize: 13,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 11,
                }}
                style={styles.calendar}
              />

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: DOCTOR_PRIMARY }]} />
                  <Text style={styles.legendText}>Available</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: NO_APPOINTMENTS }]} />
                  <Text style={styles.legendText}>No appointments</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: WARNING }]} />
                  <Text style={styles.legendText}>Out of office</Text>
                </View>
              </View>
            </View>

            <View style={styles.editorCard}>
              <View style={styles.editorHeader}>
                <View style={styles.sectionTitleBlock}>
                  <Text style={styles.sectionTitle}>Selected dates</Text>

                  <Text style={styles.sectionSubtitle}>
                    {selectedDates.length > 0
                      ? `${selectedDates.length} date${selectedDates.length === 1 ? "" : "s"} selected`
                      : "Select dates from the calendar first"}
                  </Text>
                </View>

                {selectedDates.length > 0 ? (
                  <View style={styles.selectedCount}>
                    <Text style={styles.selectedCountText}>{selectedDates.length}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.statusHeading}>Status for selected dates</Text>

              <View style={styles.statusRow}>
                <TouchableOpacity
                  style={[styles.statusOption, selectedStatus === "AVAILABLE" ? styles.statusAvailableSelected : undefined]}
                  activeOpacity={0.84}
                  onPress={() => changeSelectedStatus("AVAILABLE")}
                >
                  <Check size={17} color={selectedStatus === "AVAILABLE" ? "#FFFFFF" : DOCTOR_PRIMARY} strokeWidth={2.7} />

                  <Text style={[styles.statusOptionText, selectedStatus === "AVAILABLE" ? styles.statusOptionTextSelected : undefined]}>
                    Available
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusOption, styles.statusMiddle, selectedStatus === "UNAVAILABLE" ? styles.statusNoAppointmentsSelected : undefined]}
                  activeOpacity={0.84}
                  onPress={() => changeSelectedStatus("UNAVAILABLE")}
                >
                  <Ban size={17} color={selectedStatus === "UNAVAILABLE" ? "#FFFFFF" : NO_APPOINTMENTS} strokeWidth={2.5} />

                  <Text style={[styles.statusOptionText, selectedStatus === "UNAVAILABLE" ? styles.statusOptionTextSelected : undefined]}>
                    No appointments
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusOption, selectedStatus === "OUT_OF_OFFICE" ? styles.statusOfficeSelected : undefined]}
                  activeOpacity={0.84}
                  onPress={() => changeSelectedStatus("OUT_OF_OFFICE")}
                >
                  <Coffee size={17} color={selectedStatus === "OUT_OF_OFFICE" ? "#FFFFFF" : WARNING} strokeWidth={2.5} />

                  <Text style={[styles.statusOptionText, selectedStatus === "OUT_OF_OFFICE" ? styles.statusOptionTextSelected : undefined]}>
                    Out of office
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedStatus === "AVAILABLE" ? (
                <View style={styles.availablePanel}>
                  <View style={styles.timeRow}>
                    <View style={styles.timeFieldWrapper}>
                      <Text style={styles.fieldLabel}>Available from</Text>

                      <TouchableOpacity style={styles.timeField} activeOpacity={0.84} onPress={() => setTimeTarget("start")}>
                        <Clock3 size={17} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
                        <Text style={styles.timeFieldText}>{startTime}</Text>
                        <ChevronDown size={17} color={MUTED} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.timeFieldGap} />

                    <View style={styles.timeFieldWrapper}>
                      <Text style={styles.fieldLabel}>Available until</Text>

                      <TouchableOpacity style={styles.timeField} activeOpacity={0.84} onPress={() => setTimeTarget("end")}>
                        <Clock3 size={17} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
                        <Text style={styles.timeFieldText}>{endTime}</Text>
                        <ChevronDown size={17} color={MUTED} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.fieldLabel, styles.durationLabel]}>Appointment duration</Text>

                  <View style={styles.durationRow}>
                    {SLOT_OPTIONS.map((duration, index) => {
                      const active = slotDurationMinutes === duration;

                      return (
                        <TouchableOpacity
                          key={duration}
                          style={[
                            styles.durationChip,
                            index < SLOT_OPTIONS.length - 1 ? styles.durationSpacing : undefined,
                            active ? styles.durationChipActive : undefined,
                          ]}
                          activeOpacity={0.84}
                          onPress={() => setSlotDurationMinutes(duration)}
                        >
                          <Text style={[styles.durationChipText, active ? styles.durationChipTextActive : undefined]}>
                            {duration} min
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.closedPanel,
                    selectedStatus === "OUT_OF_OFFICE" ? styles.closedPanelWarning : styles.closedPanelNeutral,
                  ]}
                >
                  <View
                    style={[
                      styles.closedIcon,
                      {
                        backgroundColor: selectedStatus === "OUT_OF_OFFICE" ? "#FFE7C2" : "#E6E9EF",
                      },
                    ]}
                  >
                    {selectedStatus === "OUT_OF_OFFICE" ? (
                      <Coffee size={22} color={WARNING} strokeWidth={2.6} />
                    ) : (
                      <Ban size={22} color={NO_APPOINTMENTS} strokeWidth={2.6} />
                    )}
                  </View>

                  <View style={styles.closedTextBlock}>
                    <Text style={styles.closedTitle}>{getStatusLabel(selectedStatus)}</Text>
                    <Text style={styles.closedText}>{statusMessage}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.applyButton,
                  { backgroundColor: getStatusColour(selectedStatus) },
                  selectedDates.length === 0 || isApplying ? styles.buttonDisabled : undefined,
                ]}
                activeOpacity={0.86}
                disabled={selectedDates.length === 0 || isApplying || isRemoving}
                onPress={() => void applyToSelectedDates()}
              >
                {isApplying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Check size={18} color="#FFFFFF" strokeWidth={2.6} />
                )}

                <Text style={styles.applyButtonText}>
                  {isApplying ? "Applying..." : "Apply to selected dates"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.removeButton,
                  selectedDates.length === 0 || isRemoving ? styles.buttonDisabled : undefined,
                ]}
                activeOpacity={0.86}
                disabled={selectedDates.length === 0 || isApplying || isRemoving}
                onPress={removeSelectedDates}
              >
                {isRemoving ? (
                  <ActivityIndicator size="small" color={DANGER} />
                ) : (
                  <Trash2 size={17} color={DANGER} strokeWidth={2.5} />
                )}

                <Text style={styles.removeButtonText}>
                  {isRemoving ? "Clearing..." : "Clear selected dates"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.savedCard}>
              <Text style={styles.sectionTitle}>Monthly schedule</Text>

              <Text style={styles.sectionSubtitle}>
                Applied dates are saved immediately and remain until you change or remove them.
              </Text>

              {sortedAvailability.length > 0 ? (
                <View style={styles.availabilityList}>
                  {sortedAvailability.map((item) => {
                    const selected = selectedDates.includes(item.date);
                    const statusColour = getStatusColour(item.status);
                    const statusBackground = getStatusBackground(item.status);

                    return (
                      <TouchableOpacity
                        key={item.date}
                        style={[styles.availabilityRow, selected ? { backgroundColor: statusBackground } : undefined]}
                        activeOpacity={0.84}
                        onPress={() => selectExistingAvailability(item)}
                      >
                        <View style={[styles.availabilityDateIcon, { backgroundColor: statusBackground }]}>
                          {item.status === "AVAILABLE" ? (
                            <CalendarDays size={19} color={statusColour} strokeWidth={2.5} />
                          ) : item.status === "OUT_OF_OFFICE" ? (
                            <Coffee size={19} color={statusColour} strokeWidth={2.5} />
                          ) : (
                            <Ban size={19} color={statusColour} strokeWidth={2.5} />
                          )}
                        </View>

                        <View style={styles.availabilityTextBlock}>
                          <Text style={styles.availabilityDate}>{formatAvailabilityDate(item.date)}</Text>

                          {item.status === "AVAILABLE" ? (
                            <Text style={styles.availabilityTime}>
                              {item.startTime} – {item.endTime} · {item.slotDurationMinutes} min slots
                            </Text>
                          ) : (
                            <Text style={[styles.closedDateText, { color: statusColour }]}>
                              {getStatusLabel(item.status)}
                            </Text>
                          )}
                        </View>

                        <View style={[styles.statusChip, { backgroundColor: statusBackground }]}>
                          <View style={[styles.statusSmallDot, { backgroundColor: statusColour }]} />

                          <Text style={[styles.statusChipText, { color: statusColour }]}>
                            {item.status === "AVAILABLE"
                              ? "Available"
                              : item.status === "OUT_OF_OFFICE"
                                ? "Away"
                                : "No appointments"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyAvailability}>
                  <CalendarDays size={25} color={DOCTOR_PRIMARY} strokeWidth={2.4} />

                  <Text style={styles.emptyAvailabilityTitle}>No dates configured</Text>

                  <Text style={styles.emptyAvailabilityText}>
                    Select calendar dates and mark them as available, no appointments or out of office.
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={Boolean(timeTarget)} transparent animationType="fade" onRequestClose={() => setTimeTarget(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.timeModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{timeTarget === "start" ? "Available from" : "Available until"}</Text>
                <Text style={styles.modalSubtitle}>Choose a time</Text>
              </View>

              <TouchableOpacity style={styles.modalClose} activeOpacity={0.84} onPress={() => setTimeTarget(null)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(item) => item}
              style={styles.timeList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = timeTarget === "start" ? startTime === item : endTime === item;

                return (
                  <TouchableOpacity
                    style={[styles.timeOption, active ? styles.timeOptionActive : undefined]}
                    activeOpacity={0.84}
                    onPress={() => selectTime(item)}
                  >
                    <Clock3 size={18} color={active ? "#FFFFFF" : DOCTOR_PRIMARY} strokeWidth={2.5} />

                    <Text style={[styles.timeOptionText, active ? styles.timeOptionTextActive : undefined]}>
                      {item}
                    </Text>

                    {active ? <Check size={17} color="#FFFFFF" strokeWidth={2.6} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  content: { paddingHorizontal: 16, paddingTop: 6 },
  header: { backgroundColor: BACKGROUND, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12, ...elevate(1) },
  headerTextBlock: { flex: 1 },
  headerTitle: { color: TEXT, fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 3 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 24, alignItems: "center", marginTop: 10, ...elevate(1) },
  stateText: { color: MUTED, fontSize: 13, fontWeight: "600", marginTop: 10 },
  errorCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 22, alignItems: "center", marginTop: 10, ...elevate(1) },
  errorIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  errorTitle: { color: TEXT, fontSize: 17, fontWeight: "700" },
  errorText: { color: MUTED, fontSize: 12, fontWeight: "600", lineHeight: 18, textAlign: "center", marginTop: 6 },
  retryButton: { backgroundColor: DOCTOR_PRIMARY, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 11, marginTop: 15 },
  retryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", marginLeft: 7 },
  calendarCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 16, ...elevate(1) },
  sectionTopRow: { flexDirection: "row", alignItems: "center" },
  sectionIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  sectionTitleBlock: { flex: 1 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  sectionSubtitle: { color: MUTED, fontSize: 12, fontWeight: "600", lineHeight: 18, marginTop: 3 },
  calendar: { marginTop: 12 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 9 },
  legendItem: { flexDirection: "row", alignItems: "center", marginRight: 16, marginTop: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { color: MUTED, fontSize: 10, fontWeight: "600" },
  editorCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 16, marginTop: 13, ...elevate(1) },
  editorHeader: { flexDirection: "row", alignItems: "center" },
  selectedCount: { minWidth: 32, height: 32, borderRadius: 10, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  selectedCountText: { color: DOCTOR_PRIMARY, fontSize: 13, fontWeight: "700" },
  statusHeading: { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 17, marginBottom: 8 },
  statusRow: { flexDirection: "row" },
  statusOption: { flex: 1, minHeight: 60, borderRadius: 12, backgroundColor: SOFT, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  statusMiddle: { marginHorizontal: 7 },
  statusAvailableSelected: { backgroundColor: DOCTOR_PRIMARY },
  statusNoAppointmentsSelected: { backgroundColor: NO_APPOINTMENTS },
  statusOfficeSelected: { backgroundColor: WARNING },
  statusOptionText: { color: MUTED, fontSize: 9, fontWeight: "700", textAlign: "center", marginTop: 5 },
  statusOptionTextSelected: { color: "#FFFFFF" },
  availablePanel: { marginTop: 4 },
  timeRow: { flexDirection: "row", marginTop: 16 },
  timeFieldWrapper: { flex: 1 },
  timeFieldGap: { width: 10 },
  fieldLabel: { color: TEXT, fontSize: 12, fontWeight: "700", marginBottom: 7 },
  timeField: { minHeight: 48, borderRadius: 12, backgroundColor: SOFT, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  timeFieldText: { flex: 1, color: TEXT, fontSize: 14, fontWeight: "700", marginLeft: 8 },
  durationLabel: { marginTop: 16 },
  durationRow: { flexDirection: "row" },
  durationChip: { flex: 1, minHeight: 40, borderRadius: 11, backgroundColor: SOFT, alignItems: "center", justifyContent: "center" },
  durationSpacing: { marginRight: 7 },
  durationChipActive: { backgroundColor: DOCTOR_LIGHT },
  durationChipText: { color: MUTED, fontSize: 11, fontWeight: "700" },
  durationChipTextActive: { color: DOCTOR_PRIMARY },
  closedPanel: { borderRadius: 13, padding: 13, marginTop: 16, flexDirection: "row", alignItems: "center" },
  closedPanelWarning: { backgroundColor: WARNING_LIGHT },
  closedPanelNeutral: { backgroundColor: NO_APPOINTMENTS_LIGHT },
  closedIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 11 },
  closedTextBlock: { flex: 1 },
  closedTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  closedText: { color: MUTED, fontSize: 11, fontWeight: "600", lineHeight: 17, marginTop: 3 },
  applyButton: { minHeight: 48, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 17 },
  applyButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", marginLeft: 8 },
  removeButton: { minHeight: 44, borderRadius: 12, backgroundColor: DANGER_LIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 9 },
  removeButtonText: { color: DANGER, fontSize: 12, fontWeight: "700", marginLeft: 7 },
  buttonDisabled: { opacity: 0.55 },
  savedCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 16, marginTop: 13, ...elevate(1) },
  availabilityList: { marginTop: 13 },
  availabilityRow: { minHeight: 67, borderRadius: 13, backgroundColor: SOFT, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  availabilityDateIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10 },
  availabilityTextBlock: { flex: 1 },
  availabilityDate: { color: TEXT, fontSize: 13, fontWeight: "700" },
  availabilityTime: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },
  closedDateText: { fontSize: 11, fontWeight: "700", marginTop: 3 },
  statusChip: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, marginLeft: 7 },
  statusSmallDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusChipText: { fontSize: 9, fontWeight: "700" },
  emptyAvailability: { alignItems: "center", paddingVertical: 24 },
  emptyAvailabilityTitle: { color: TEXT, fontSize: 14, fontWeight: "700", marginTop: 9 },
  emptyAvailabilityText: { color: MUTED, fontSize: 11, fontWeight: "600", lineHeight: 17, textAlign: "center", marginTop: 4, paddingHorizontal: 14 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(17,25,54,0.42)", justifyContent: "flex-end" },
  timeModal: { backgroundColor: SURFACE, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28, maxHeight: "72%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { color: TEXT, fontSize: 18, fontWeight: "700" },
  modalSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },
  modalClose: { backgroundColor: DOCTOR_LIGHT, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  modalCloseText: { color: DOCTOR_PRIMARY, fontSize: 11, fontWeight: "700" },
  timeList: { flexGrow: 0 },
  timeOption: { minHeight: 48, borderRadius: 12, backgroundColor: SOFT, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, marginBottom: 7 },
  timeOptionActive: { backgroundColor: DOCTOR_PRIMARY },
  timeOptionText: { flex: 1, color: TEXT, fontSize: 14, fontWeight: "700", marginLeft: 10 },
  timeOptionTextActive: { color: "#FFFFFF" },
});