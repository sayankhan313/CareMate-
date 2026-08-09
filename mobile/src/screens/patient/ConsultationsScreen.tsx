import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Calendar, type DateData } from "react-native-calendars";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  History,
  MessageSquareText,
  RefreshCw,
  Send,
  Stethoscope,
  UserPlus,
  Video,
  X,
  XCircle,
} from "lucide-react-native";

import { useLanguage } from "../../context/LanguageContext";
import {
  consultationsApi,
  type CreateManualConsultationPayload,
  type PatientAppointmentSlot,
  type PatientCalendarDate,
  type RescheduleConsultationPayload,
} from "../../services/consultationsApi";
import { doctorAssignmentApi, type AssignedDoctor } from "../../services/doctorAssignmentApi";
import type { Consultation } from "../../services/safetyApi";
import type { PatientTabParamList } from "../../types/navigation";

type Props = BottomTabScreenProps<PatientTabParamList, "Consultations">;
type DropdownType = "doctor" | "reason";

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

const REASON_OPTIONS = [
  "High blood pressure",
  "Chest discomfort",
  "Dizziness",
  "Breathing difficulty",
  "Medication question",
  "General consultation",
];

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const formatDoctorName = (fullName: string) => {
  if (/^dr\.?\s/i.test(fullName.trim())) return fullName.trim();
  return `Dr. ${fullName.trim()}`;
};

const getMonthString = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const getTodayString = () => {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const getMonthDates = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${year}-${String(monthNumber).padStart(2, "0")}-${day}`;
  });
};

const formatDateForBackend = (date: string) => {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

const formatSelectedDate = (date: string, locale: string) => {
  const parsed = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

type Translate = ReturnType<typeof useLanguage>["t"];

const formatConsultationDate = (value: string | null | undefined, t: Translate, locale: string) => {
  if (!value) return t("consultations.noPreferredTime");

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("consultations.noPreferredTime");

  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusLabel = (status: string, t: Translate) => {
  if (status === "PENDING") return t("consultations.statusRequested");
  if (status === "ACCEPTED") return t("consultations.statusAccepted");
  if (status === "IN_PROGRESS") return t("consultations.statusInProgress");
  if (status === "COMPLETED") return t("consultations.statusCompleted");
  if (status === "CANCELLED") return t("consultations.statusCancelled");
  if (status === "REJECTED") return t("consultations.statusRejected");
  return status;
};

const getStatusHint = (status: string, t: Translate) => {
  if (status === "PENDING") return t("consultations.hintPending");
  if (status === "ACCEPTED") return t("consultations.hintAccepted");
  if (status === "IN_PROGRESS") return t("consultations.hintInProgress");
  if (status === "COMPLETED") return t("consultations.hintCompleted");
  if (status === "REJECTED") return t("consultations.hintRejected");
  if (status === "CANCELLED") return t("consultations.hintCancelled");
  return t("consultations.hintUpdated");
};

const getStatusTone = (status: string) => {
  if (status === "COMPLETED") {
    return { background: SUCCESS_LIGHT, text: "#167A58", dot: SUCCESS, icon: "✓" };
  }

  if (status === "CANCELLED" || status === "REJECTED") {
    return { background: DANGER_LIGHT, text: "#B42318", dot: DANGER, icon: "×" };
  }

  if (status === "ACCEPTED" || status === "IN_PROGRESS") {
    return { background: PRIMARY_LIGHT, text: PRIMARY_DARK, dot: PRIMARY, icon: "•" };
  }

  return { background: WARNING_LIGHT, text: "#A85A13", dot: WARNING, icon: "•" };
};

const getConsultationTypeLabel = (type: string, t: Translate) => {
  return type === "EMERGENCY" ? t("consultations.typeEmergency") : t("consultations.typeManual");
};

const canJoinConsultation = (status: string) => {
  return status === "ACCEPTED" || status === "IN_PROGRESS";
};

const canManageAppointment = (consultation: Consultation) => {
  return consultation.type === "MANUAL" && (consultation.status === "PENDING" || consultation.status === "ACCEPTED");
};

const getReasonLabel = (option: string, t: Translate) => {
  if (option === "High blood pressure") return t("consultations.reasonHighBP");
  if (option === "Chest discomfort") return t("consultations.reasonChest");
  if (option === "Dizziness") return t("consultations.reasonDizziness");
  if (option === "Breathing difficulty") return t("consultations.reasonBreathing");
  if (option === "Medication question") return t("consultations.reasonMedication");
  if (option === "General consultation") return t("consultations.reasonGeneral");
  return option;
};

const ConsultationsScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { t, locale } = useLanguage();
  const rootNavigation = navigation.getParent<any>();
  const slotRequestIdRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [assignedDoctors, setAssignedDoctors] = useState<AssignedDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  const [currentMonth, setCurrentMonth] = useState(getMonthString());
  const [availabilityDates, setAvailabilityDates] = useState<PatientCalendarDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<PatientAppointmentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<PatientAppointmentSlot | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [cancellingConsultationId, setCancellingConsultationId] = useState<string | null>(null);

  const [screenError, setScreenError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");

  const [selectedReason, setSelectedReason] = useState(REASON_OPTIONS[0]);
  const [notes, setNotes] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<DropdownType | null>(null);
  const [reschedulingConsultation, setReschedulingConsultation] = useState<Consultation | null>(null);

  const selectedDoctor = useMemo(() => {
    return assignedDoctors.find((assignment) => assignment.doctor.id === selectedDoctorId);
  }, [assignedDoctors, selectedDoctorId]);

  const activeConsultations = useMemo(() => {
    return consultations.filter(
      (consultation) =>
        consultation.status === "PENDING" ||
        consultation.status === "ACCEPTED" ||
        consultation.status === "IN_PROGRESS"
    );
  }, [consultations]);

  const pastConsultations = useMemo(() => {
    return consultations.filter(
      (consultation) =>
        consultation.status === "COMPLETED" ||
        consultation.status === "CANCELLED" ||
        consultation.status === "REJECTED"
    );
  }, [consultations]);

  const availabilityByDate = useMemo(() => {
    const map: Record<string, PatientCalendarDate> = {};

    availabilityDates.forEach((item) => {
      map[item.date] = item;
    });

    return map;
  }, [availabilityDates]);

  const markedDates = useMemo(() => {
    const marked: Record<string, any> = {};
    const today = getTodayString();

    getMonthDates(currentMonth).forEach((date) => {
      const item = availabilityByDate[date];
      const isAvailable = date >= today && Boolean(item?.isAvailable);

      if (isAvailable) {
        marked[date] = {
          marked: true,
          dotColor: SUCCESS,
          disabled: false,
          disableTouchEvent: false,
        };
      } else {
        marked[date] = {
          disabled: true,
          disableTouchEvent: true,
        };
      }
    });

    if (selectedDate && availabilityByDate[selectedDate]?.isAvailable) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: PRIMARY,
        selectedTextColor: SURFACE,
        marked: true,
        dotColor: SURFACE,
      };
    }

    return marked;
  }, [availabilityByDate, currentMonth, selectedDate]);

  const loadScreenData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") setIsLoading(true);
        else setIsRefreshing(true);

        setScreenError("");

        const [consultationResult, doctorResult] = await Promise.all([
          consultationsApi.listConsultations(),
          doctorAssignmentApi.getAssignedDoctors(),
        ]);

        setConsultations(consultationResult);
        setAssignedDoctors(doctorResult.doctors);

        setSelectedDoctorId((currentDoctorId) => {
          const currentExists = doctorResult.doctors.some(
            (assignment) => assignment.doctor.id === currentDoctorId
          );

          if (currentExists) return currentDoctorId;

          const primaryDoctor = doctorResult.doctors.find(
            (assignment) => assignment.assignmentType === "PRIMARY"
          );

          return primaryDoctor?.doctor.id || doctorResult.doctors[0]?.doctor.id || null;
        });
      } catch (error) {
        setScreenError(
          error instanceof Error ? error.message : t("consultations.unableLoad")
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [t]
  );

  const loadDoctorAvailability = useCallback(async (doctorId: string, month: string) => {
    try {
      setIsLoadingAvailability(true);
      setAvailabilityError("");

      const result = await consultationsApi.getDoctorMonthlyAvailability(doctorId, month);

      setAvailabilityDates(result.dates);
    } catch (error) {
      setAvailabilityDates([]);
      setAvailabilityError(
        error instanceof Error ? error.message : "Unable to load appointment availability."
      );
    } finally {
      setIsLoadingAvailability(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadScreenData("initial");
    }, [loadScreenData])
  );

  useEffect(() => {
    slotRequestIdRef.current += 1;
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableSlots([]);

    if (!selectedDoctorId) {
      setAvailabilityDates([]);
      return;
    }

    void loadDoctorAvailability(selectedDoctorId, currentMonth);
  }, [currentMonth, loadDoctorAvailability, selectedDoctorId]);

  const refreshScreen = useCallback(async () => {
    await loadScreenData("refresh");

    if (selectedDoctorId) {
      await loadDoctorAvailability(selectedDoctorId, currentMonth);
    }
  }, [currentMonth, loadDoctorAvailability, loadScreenData, selectedDoctorId]);

  const selectDoctor = useCallback(
    (doctorId: string) => {
      if (reschedulingConsultation) {
        setActiveDropdown(null);
        return;
      }

      if (doctorId !== selectedDoctorId) {
        slotRequestIdRef.current += 1;
        setCurrentMonth(getMonthString());
        setSelectedDate(null);
        setSelectedSlot(null);
        setAvailableSlots([]);
        setSelectedDoctorId(doctorId);
      }

      setActiveDropdown(null);
    },
    [reschedulingConsultation, selectedDoctorId]
  );

  const handleMonthChange = useCallback(
    (day: DateData) => {
      const nextMonth = day.dateString.slice(0, 7);

      if (nextMonth === currentMonth) return;

      slotRequestIdRef.current += 1;
      setSelectedDate(null);
      setSelectedSlot(null);
      setAvailableSlots([]);
      setCurrentMonth(nextMonth);
    },
    [currentMonth]
  );

  const handleDayPress = useCallback(
    async (day: DateData) => {
      if (!selectedDoctorId) return;

      const availability = availabilityByDate[day.dateString];

      if (!availability?.isAvailable) return;

      const requestId = ++slotRequestIdRef.current;

      setSelectedDate(day.dateString);
      setSelectedSlot(null);
      setAvailableSlots([]);
      setIsLoadingSlots(true);
      setAvailabilityError("");

      try {
        const result = await consultationsApi.getDoctorAvailableSlots(
          selectedDoctorId,
          day.dateString
        );

        if (requestId !== slotRequestIdRef.current) return;

        setAvailableSlots(result.slots);

        if (result.slots.length === 0) {
          setAvailabilityError("No appointment times are currently available for this date.");
        }
      } catch (error) {
        if (requestId !== slotRequestIdRef.current) return;

        setAvailableSlots([]);
        setAvailabilityError(
          error instanceof Error ? error.message : "Unable to load available appointment times."
        );
      } finally {
        if (requestId === slotRequestIdRef.current) setIsLoadingSlots(false);
      }
    },
    [availabilityByDate, selectedDoctorId]
  );

  const stopRescheduling = useCallback(() => {
    slotRequestIdRef.current += 1;
    setReschedulingConsultation(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setAvailabilityError("");
    setCurrentMonth(getMonthString());
  }, []);

  const startRescheduling = useCallback(
    (consultation: Consultation) => {
      if (!canManageAppointment(consultation)) return;

      if (!consultation.doctorId) {
        Alert.alert("Unable to reschedule", "This consultation no longer has an assigned doctor.");
        return;
      }

      const assignment = assignedDoctors.find((item) => item.doctor.id === consultation.doctorId);

      if (!assignment) {
        Alert.alert(
          "Unable to reschedule",
          "This doctor is no longer assigned to your account. Please create a new consultation request."
        );
        return;
      }

      const existingDate = consultation.preferredAt ? new Date(consultation.preferredAt) : null;

      slotRequestIdRef.current += 1;
      setReschedulingConsultation(consultation);
      setSelectedDoctorId(consultation.doctorId);
      setSelectedDate(null);
      setSelectedSlot(null);
      setAvailableSlots([]);
      setAvailabilityError("");
      setActiveDropdown(null);

      if (existingDate && !Number.isNaN(existingDate.getTime())) setCurrentMonth(getMonthString(existingDate));
      else setCurrentMonth(getMonthString());

      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 170, animated: true });
      });
    },
    [assignedDoctors]
  );

  const sendConsultationRequest = useCallback(async () => {
    if (isSendingRequest) return;

    if (!selectedDoctorId) {
      Alert.alert(t("consultations.selectDoctorTitle"), t("consultations.selectDoctorText"));
      return;
    }

    if (!selectedDate) {
      Alert.alert(t("consultations.selectPreferredDate"), t("consultations.selectPreferredDate"));
      return;
    }

    if (!selectedSlot) {
      Alert.alert(t("consultations.selectPreferredTime"), t("consultations.selectPreferredTime"));
      return;
    }

    try {
      setIsSendingRequest(true);
      setScreenError("");

      if (reschedulingConsultation) {
        const payload: RescheduleConsultationPayload = {
          preferredDate: formatDateForBackend(selectedDate),
          preferredTime: selectedSlot.time,
        };

        const result = await consultationsApi.rescheduleConsultation(reschedulingConsultation.id, payload);

        setConsultations((currentConsultations) =>
          currentConsultations.map((consultation) =>
            consultation.id === result.consultation.id ? result.consultation : consultation
          )
        );

        const doctorDisplayName = selectedDoctor?.doctor.fullName || result.consultation.doctorName;

        Alert.alert(
          "Appointment rescheduled",
          doctorDisplayName
            ? `${formatDoctorName(doctorDisplayName)} will need to review the updated appointment time again.`
            : "Your doctor will need to review the updated appointment time again."
        );

        setReschedulingConsultation(null);
        setSelectedDate(null);
        setSelectedSlot(null);
        setAvailableSlots([]);

        await Promise.all([
          loadScreenData("refresh"),
          loadDoctorAvailability(selectedDoctorId, currentMonth),
        ]);

        return;
      }

      const payload: CreateManualConsultationPayload = {
        doctorId: selectedDoctorId,
        reason: selectedReason,
        preferredDate: formatDateForBackend(selectedDate),
        preferredTime: selectedSlot.time,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };

      const result = await consultationsApi.createManualConsultation(payload);

      setConsultations((currentConsultations) => [
        result.consultation,
        ...currentConsultations.filter((consultation) => consultation.id !== result.consultation.id),
      ]);

      setNotes("");
      setSelectedReason(REASON_OPTIONS[0]);
      setSelectedDate(null);
      setSelectedSlot(null);
      setAvailableSlots([]);

      Alert.alert(
        t("consultations.requestSent"),
        selectedDoctor
          ? t("consultations.requestSentDoctor", { doctor: formatDoctorName(selectedDoctor.doctor.fullName) })
          : t("consultations.requestSentGeneric")
      );

      await Promise.all([
        loadScreenData("refresh"),
        loadDoctorAvailability(selectedDoctorId, currentMonth),
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : reschedulingConsultation
            ? "Unable to reschedule appointment."
            : t("consultations.unableSend");

      setScreenError(message);

      Alert.alert(
        reschedulingConsultation ? "Reschedule failed" : t("consultations.requestFailed"),
        message
      );

      if (selectedDoctorId) await loadDoctorAvailability(selectedDoctorId, currentMonth);
    } finally {
      setIsSendingRequest(false);
    }
  }, [
    currentMonth,
    isSendingRequest,
    loadDoctorAvailability,
    loadScreenData,
    notes,
    reschedulingConsultation,
    selectedDate,
    selectedDoctor,
    selectedDoctorId,
    selectedReason,
    selectedSlot,
    t,
  ]);

  const cancelConsultation = useCallback(
    async (consultation: Consultation) => {
      if (cancellingConsultationId || !canManageAppointment(consultation)) return;

      try {
        setCancellingConsultationId(consultation.id);

        const result = await consultationsApi.cancelConsultation(consultation.id);

        setConsultations((current) =>
          current.map((item) => item.id === result.consultation.id ? result.consultation : item)
        );

        if (reschedulingConsultation?.id === consultation.id) stopRescheduling();

        Alert.alert(
          "Appointment cancelled",
          "Your appointment has been cancelled and the doctor has been notified."
        );

        await refreshScreen();
      } catch (error) {
        Alert.alert(
          "Unable to cancel appointment",
          error instanceof Error ? error.message : "The appointment could not be cancelled."
        );
      } finally {
        setCancellingConsultationId(null);
      }
    },
    [cancellingConsultationId, refreshScreen, reschedulingConsultation?.id, stopRescheduling]
  );

  const confirmCancelConsultation = useCallback(
    (consultation: Consultation) => {
      const doctorName = consultation.doctorName ? formatDoctorName(consultation.doctorName) : "your doctor";

      Alert.alert(
        "Cancel appointment?",
        `Cancel this consultation with ${doctorName}? The appointment slot will become available again.`,
        [
          { text: "Keep appointment", style: "cancel" },
          {
            text: "Cancel appointment",
            style: "destructive",
            onPress: () => void cancelConsultation(consultation),
          },
        ]
      );
    },
    [cancelConsultation]
  );

  const openActiveCallsScreen = useCallback(() => {
    if (!rootNavigation) {
      Alert.alert(
        t("consultations.unableOpenCalls"),
        t("consultations.activeCallsUnavailable")
      );
      return;
    }

    rootNavigation.navigate("PatientActiveCalls");
  }, [rootNavigation, t]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <Text style={styles.appBarTitle}>{t("consultations.title")}</Text>
          <Text style={styles.appBarSubtitle}>{t("consultations.subtitle")}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(36, insets.bottom + 112) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refreshScreen()}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        >
          <View style={styles.summaryPanel}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIconCircle}>
                <Video size={24} color={PRIMARY} strokeWidth={2.7} />
              </View>

              <View style={styles.summaryTextBlock}>
                <Text style={styles.summaryTitle}>
                  {t("consultations.summaryTitle")}
                </Text>

                <Text style={styles.summarySubtitle}>
                  {t("consultations.summaryText")}
                </Text>
              </View>
            </View>

            <View style={styles.summaryStatsRow}>
              <SummaryStat
                label={t("consultations.active")}
                value={`${activeConsultations.length}`}
              />

              <SummaryStat
                label={t("consultations.past")}
                value={`${pastConsultations.length}`}
              />

              <SummaryStat
                label={t("consultations.doctors")}
                value={`${assignedDoctors.length}`}
              />
            </View>
          </View>

          <View style={styles.formPanel}>
            <SectionHeader
              icon={<Stethoscope size={21} color={PRIMARY} strokeWidth={2.6} />}
              title={reschedulingConsultation ? "Reschedule appointment" : t("consultations.requestTitle")}
              subtitle={
                reschedulingConsultation
                  ? "Choose a new available date and time with the same doctor."
                  : t("consultations.requestSubtitle")
              }
            />

            {reschedulingConsultation ? (
              <View style={styles.rescheduleBanner}>
                <View style={styles.rescheduleBannerIcon}>
                  <CalendarDays size={20} color={PRIMARY} strokeWidth={2.6} />
                </View>

                <View style={styles.rescheduleBannerText}>
                  <Text style={styles.rescheduleBannerTitle}>Updating existing appointment</Text>
                  <Text style={styles.rescheduleBannerSubtitle}>
                    {reschedulingConsultation.doctorName
                      ? formatDoctorName(reschedulingConsultation.doctorName)
                      : "Assigned doctor"}
                    {" • "}
                    {formatConsultationDate(reschedulingConsultation.preferredAt, t, locale)}
                  </Text>

                  {reschedulingConsultation.status === "ACCEPTED" ? (
                    <Text style={styles.rescheduleWarningText}>
                      The doctor previously accepted this appointment. After rescheduling, the updated time returns to Requested and must be accepted again.
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.stopRescheduleButton}
                  activeOpacity={0.85}
                  onPress={stopRescheduling}
                  disabled={isSendingRequest}
                >
                  <X size={18} color={PRIMARY_DARK} strokeWidth={2.6} />
                </TouchableOpacity>
              </View>
            ) : null}

            {assignedDoctors.length === 0 ? (
              <View style={styles.noDoctorPanel}>
                <View style={styles.noDoctorIcon}>
                  <Stethoscope size={25} color={PRIMARY} strokeWidth={2.5} />
                </View>

                <View style={styles.noDoctorTextBlock}>
                  <Text style={styles.noDoctorTitle}>{t("consultations.noDoctors")}</Text>
                  <Text style={styles.noDoctorText}>{t("consultations.noDoctorsText")}</Text>
                </View>

                <TouchableOpacity
                  style={styles.manageDoctorButton}
                  activeOpacity={0.85}
                  onPress={() => rootNavigation?.navigate("SelectDoctor")}
                >
                  <UserPlus size={17} color={SURFACE} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : reschedulingConsultation ? (
              <View style={styles.lockedFieldBlock}>
                <Text style={styles.inputLabel}>{t("consultations.assignedDoctor")}</Text>

                <View style={styles.lockedField}>
                  <View style={styles.selectIcon}>
                    <Stethoscope size={19} color={PRIMARY} strokeWidth={2.6} />
                  </View>

                  <View style={styles.selectTextBlock}>
                    <Text style={styles.selectText}>
                      {selectedDoctor
                        ? formatDoctorName(selectedDoctor.doctor.fullName)
                        : reschedulingConsultation.doctorName
                          ? formatDoctorName(reschedulingConsultation.doctorName)
                          : "Assigned doctor"}
                    </Text>
                    <Text style={styles.selectHelperText}>Doctor remains unchanged for rescheduling</Text>
                  </View>

                  <CheckCircle2 size={20} color={SUCCESS} strokeWidth={2.6} />
                </View>
              </View>
            ) : (
              <SelectField
                label={t("consultations.assignedDoctor")}
                value={
                  selectedDoctor
                    ? formatDoctorName(selectedDoctor.doctor.fullName)
                    : t("consultations.selectDoctor")
                }
                helperText={selectedDoctor?.doctor.specialization || undefined}
                icon={<Stethoscope size={19} color={PRIMARY} strokeWidth={2.6} />}
                placeholder={!selectedDoctor}
                onPress={() => setActiveDropdown("doctor")}
              />
            )}

            {reschedulingConsultation ? (
              <View style={styles.lockedFieldBlock}>
                <Text style={styles.inputLabel}>{t("consultations.reason")}</Text>

                <View style={styles.lockedReasonPanel}>
                  <MessageSquareText size={18} color={PRIMARY} strokeWidth={2.6} />
                  <View style={styles.lockedReasonText}>
                    <Text style={styles.lockedReasonValue}>{getReasonLabel(reschedulingConsultation.reason, t)}</Text>
                    <Text style={styles.lockedReasonHelper}>Reason and notes remain unchanged</Text>
                  </View>
                </View>
              </View>
            ) : (
              <SelectField
                label={t("consultations.reason")}
                value={getReasonLabel(selectedReason, t)}
                icon={<MessageSquareText size={19} color={PRIMARY} strokeWidth={2.6} />}
                placeholder={false}
                onPress={() => setActiveDropdown("reason")}
              />
            )}

            <View style={styles.calendarSection}>
              <View style={styles.calendarSectionHeader}>
                <View style={styles.calendarSectionIcon}>
                  <CalendarDays size={19} color={PRIMARY} strokeWidth={2.6} />
                </View>

                <View style={styles.calendarSectionText}>
                  <Text style={styles.inputLabelNoMargin}>
                    {reschedulingConsultation ? "New appointment date" : t("consultations.preferredDate")}
                  </Text>

                  <Text style={styles.calendarHelper}>
                    {reschedulingConsultation ? "Select a different available appointment slot" : "Select an available appointment date"}
                  </Text>
                </View>
              </View>

              {!selectedDoctorId ? (
                <View style={styles.calendarEmptyPanel}>
                  <Stethoscope size={23} color={PRIMARY} strokeWidth={2.5} />
                  <Text style={styles.calendarEmptyTitle}>
                    {t("consultations.selectDoctor")}
                  </Text>
                </View>
              ) : isLoadingAvailability ? (
                <View style={styles.calendarLoadingPanel}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                  <Text style={styles.calendarLoadingText}>
                    Loading appointment dates...
                  </Text>
                </View>
              ) : (
                <>
                  <Calendar
                    current={`${currentMonth}-01`}
                    minDate={getTodayString()}
                    markedDates={markedDates}
                    onDayPress={handleDayPress}
                    onMonthChange={handleMonthChange}
                    enableSwipeMonths
                    hideExtraDays
                    firstDay={1}
                    theme={{
                      calendarBackground: SURFACE,
                      textSectionTitleColor: MUTED,
                      selectedDayBackgroundColor: PRIMARY,
                      selectedDayTextColor: SURFACE,
                      todayTextColor: PRIMARY,
                      dayTextColor: TEXT,
                      textDisabledColor: "#C7CBD5",
                      arrowColor: PRIMARY,
                      disabledArrowColor: "#C7CBD5",
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

                  <View style={styles.calendarLegend}>
                    <View style={styles.legendItem}>
                      <View style={styles.availableDot} />
                      <Text style={styles.legendText}>Available</Text>
                    </View>

                    <Text style={styles.disabledLegendText}>
                      Grey dates cannot be booked
                    </Text>
                  </View>

                  {availabilityDates.filter((item) => item.isAvailable).length === 0 ? (
                    <View style={styles.noAvailabilityPanel}>
                      <CalendarDays size={21} color={MUTED} strokeWidth={2.4} />

                      <View style={styles.noAvailabilityTextBlock}>
                        <Text style={styles.noAvailabilityTitle}>
                          No appointments this month
                        </Text>

                        <Text style={styles.noAvailabilityText}>
                          {reschedulingConsultation ? "Try another month." : "Try another month or choose another assigned doctor."}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </>
              )}

              {selectedDate ? (
                <View style={styles.selectedDatePanel}>
                  <View style={styles.selectedDateHeader}>
                    <View style={styles.selectedDateIcon}>
                      <CalendarDays size={18} color={PRIMARY} strokeWidth={2.6} />
                    </View>

                    <View style={styles.selectedDateTextBlock}>
                      <Text style={styles.selectedDateLabel}>
                        {reschedulingConsultation ? "New appointment date" : t("consultations.preferredDate")}
                      </Text>

                      <Text style={styles.selectedDateValue}>
                        {formatSelectedDate(selectedDate, locale)}
                      </Text>
                    </View>

                    <View style={styles.availableChip}>
                      <View style={styles.availableChipDot} />
                      <Text style={styles.availableChipText}>Available</Text>
                    </View>
                  </View>

                  <Text style={styles.timeHeading}>
                    {reschedulingConsultation ? "New appointment time" : t("consultations.preferredTime")}
                  </Text>

                  {isLoadingSlots ? (
                    <View style={styles.slotLoadingRow}>
                      <ActivityIndicator size="small" color={PRIMARY} />

                      <Text style={styles.slotLoadingText}>
                        Loading available times...
                      </Text>
                    </View>
                  ) : availableSlots.length > 0 ? (
                    <View style={styles.slotGrid}>
                      {availableSlots.map((slot) => {
                        const isSelected = selectedSlot?.time === slot.time;

                        return (
                          <TouchableOpacity
                            key={slot.startsAt}
                            style={[
                              styles.slotButton,
                              isSelected ? styles.slotButtonSelected : undefined,
                            ]}
                            activeOpacity={0.84}
                            onPress={() => setSelectedSlot(slot)}
                          >
                            <Clock3
                              size={15}
                              color={isSelected ? SURFACE : PRIMARY}
                              strokeWidth={2.5}
                            />

                            <Text
                              style={[
                                styles.slotButtonText,
                                isSelected ? styles.slotButtonTextSelected : undefined,
                              ]}
                            >
                              {slot.time}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.noSlotsPanel}>
                      <Clock3 size={19} color={MUTED} strokeWidth={2.4} />

                      <Text style={styles.noSlotsText}>
                        No appointment times are available for this date.
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}

              {availabilityError ? (
                <View style={styles.availabilityErrorPanel}>
                  <AlertCircle size={18} color={DANGER} strokeWidth={2.5} />
                  <Text style={styles.availabilityErrorText}>
                    {availabilityError}
                  </Text>
                </View>
              ) : null}
            </View>

            {!reschedulingConsultation ? (
              <>
                <Text style={styles.inputLabel}>{t("consultations.notesOptional")}</Text>

                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t("consultations.notesPlaceholder")}
                  placeholderTextColor="#A8B0C2"
                  multiline
                  textAlignVertical="top"
                />
              </>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                isSendingRequest ||
                !selectedDoctorId ||
                !selectedDate ||
                !selectedSlot
                  ? styles.disabledButton
                  : undefined,
              ]}
              activeOpacity={0.85}
              onPress={() => void sendConsultationRequest()}
              disabled={
                isSendingRequest ||
                !selectedDoctorId ||
                !selectedDate ||
                !selectedSlot
              }
            >
              {isSendingRequest ? (
                <ActivityIndicator size="small" color={SURFACE} />
              ) : (
                <>
                  {reschedulingConsultation ? (
                    <CalendarDays size={19} color={SURFACE} strokeWidth={2.6} />
                  ) : (
                    <Send size={19} color={SURFACE} strokeWidth={2.6} />
                  )}

                  <Text style={styles.primaryButtonText}>
                    {reschedulingConsultation ? "Confirm new appointment" : t("common.sendRequest")}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {reschedulingConsultation ? (
              <TouchableOpacity
                style={styles.cancelRescheduleButton}
                activeOpacity={0.85}
                disabled={isSendingRequest}
                onPress={stopRescheduling}
              >
                <X size={17} color={PRIMARY_DARK} strokeWidth={2.6} />
                <Text style={styles.cancelRescheduleText}>Keep current appointment</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {screenError ? (
            <View style={styles.errorPanel}>
              <AlertCircle size={22} color={DANGER} strokeWidth={2.6} />
              <Text style={styles.errorText}>{screenError}</Text>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {t("consultations.activeRequests")}
              </Text>

              <Text style={styles.sectionSubtitle}>
                {activeConsultations.length === 1
                  ? t("consultations.oneActive")
                  : activeConsultations.length > 1
                    ? t("consultations.manyActive", {
                        count: activeConsultations.length,
                      })
                    : t("consultations.noActiveNow")}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              activeOpacity={0.85}
              onPress={() => void refreshScreen()}
            >
              <RefreshCw size={19} color={PRIMARY} strokeWidth={2.6} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <LoadingRow title={t("consultations.loadingConsultations")} />
          ) : activeConsultations.length === 0 ? (
            <EmptyRow
              icon={<Video size={22} color={PRIMARY} strokeWidth={2.6} />}
              title={t("consultations.noActiveRequests")}
              subtitle={t("consultations.noActiveText")}
            />
          ) : (
            <View style={styles.listPanel}>
              {activeConsultations.map((consultation, index) => (
                <ConsultationRow
                  key={consultation.id}
                  consultation={consultation}
                  isLast={index === activeConsultations.length - 1}
                  isCancelling={cancellingConsultationId === consultation.id}
                  isBeingRescheduled={reschedulingConsultation?.id === consultation.id}
                  onOpenActiveCalls={openActiveCallsScreen}
                  onReschedule={() => startRescheduling(consultation)}
                  onCancel={() => confirmCancelConsultation(consultation)}
                />
              ))}
            </View>
          )}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {t("consultations.pastTitle")}
              </Text>

              <Text style={styles.sectionSubtitle}>
                {t("consultations.pastSubtitle")}
              </Text>
            </View>

            <View style={styles.historyIcon}>
              <History size={20} color={PRIMARY} strokeWidth={2.6} />
            </View>
          </View>

          {isLoading ? (
            <LoadingRow title={t("consultations.loadingHistory")} />
          ) : pastConsultations.length === 0 ? (
            <EmptyRow
              icon={<History size={22} color={PRIMARY} strokeWidth={2.6} />}
              title={t("consultations.noPast")}
              subtitle={t("consultations.noPastText")}
            />
          ) : (
            <View style={styles.listPanel}>
              {pastConsultations.map((consultation, index) => (
                <ConsultationRow
                  key={consultation.id}
                  consultation={consultation}
                  isLast={index === pastConsultations.length - 1}
                  isCancelling={false}
                  isBeingRescheduled={false}
                  onOpenActiveCalls={() => undefined}
                  onReschedule={() => undefined}
                  onCancel={() => undefined}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <Modal
          visible={activeDropdown !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveDropdown(null)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalDismissArea}
              activeOpacity={1}
              onPress={() => setActiveDropdown(null)}
            />

            <View
              style={[
                styles.modalCard,
                { paddingBottom: Math.max(18, insets.bottom + 12) },
              ]}
            >
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <View style={styles.modalIconCircle}>
                    {activeDropdown === "doctor" ? (
                      <Stethoscope size={20} color={PRIMARY} strokeWidth={2.6} />
                    ) : (
                      <MessageSquareText
                        size={20}
                        color={PRIMARY}
                        strokeWidth={2.6}
                      />
                    )}
                  </View>

                  <Text style={styles.modalTitle}>
                    {activeDropdown === "doctor"
                      ? t("consultations.selectAssignedDoctor")
                      : t("consultations.selectReason")}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  activeOpacity={0.85}
                  onPress={() => setActiveDropdown(null)}
                >
                  <X size={20} color={TEXT} strokeWidth={2.6} />
                </TouchableOpacity>
              </View>

              {activeDropdown === "doctor"
                ? assignedDoctors.map((assignment, index) => {
                    const isSelected =
                      assignment.doctor.id === selectedDoctorId;

                    return (
                      <TouchableOpacity
                        key={assignment.assignmentId}
                        style={[
                          styles.modalDoctorOption,
                          index === assignedDoctors.length - 1
                            ? styles.modalOptionLast
                            : undefined,
                          isSelected
                            ? styles.modalOptionSelected
                            : undefined,
                        ]}
                        activeOpacity={0.85}
                        onPress={() => selectDoctor(assignment.doctor.id)}
                      >
                        <View style={styles.modalDoctorIcon}>
                          <Stethoscope
                            size={19}
                            color={PRIMARY}
                            strokeWidth={2.5}
                          />
                        </View>

                        <View style={styles.modalDoctorText}>
                          <Text
                            style={[
                              styles.modalOptionText,
                              isSelected
                                ? styles.modalOptionTextSelected
                                : undefined,
                            ]}
                          >
                            {formatDoctorName(assignment.doctor.fullName)}
                          </Text>

                          <Text style={styles.modalDoctorSpecialization}>
                            {assignment.doctor.specialization ||
                              (assignment.assignmentType === "PRIMARY"
                                ? t("consultations.primaryDoctor")
                                : t("consultations.specialistDoctor"))}
                          </Text>
                        </View>

                        {isSelected ? (
                          <CheckCircle2
                            size={19}
                            color={PRIMARY}
                            strokeWidth={2.7}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
                : REASON_OPTIONS.map((option, index) => {
                    const isSelected = option === selectedReason;

                    return (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.modalOption,
                          index === REASON_OPTIONS.length - 1
                            ? styles.modalOptionLast
                            : undefined,
                          isSelected
                            ? styles.modalOptionSelected
                            : undefined,
                        ]}
                        activeOpacity={0.85}
                        onPress={() => {
                          setSelectedReason(option);
                          setActiveDropdown(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            isSelected
                              ? styles.modalOptionTextSelected
                              : undefined,
                          ]}
                        >
                          {getReasonLabel(option, t)}
                        </Text>

                        {isSelected ? (
                          <CheckCircle2
                            size={19}
                            color={PRIMARY}
                            strokeWidth={2.7}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const SummaryStat = ({ label, value }: { label: string; value: string }) => {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryStatValue}>{value}</Text>
      <Text style={styles.summaryStatLabel}>{label}</Text>
    </View>
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
    <View style={styles.formHeader}>
      <View style={styles.formIcon}>{icon}</View>

      <View style={styles.formHeaderText}>
        <Text style={styles.formTitle}>{title}</Text>
        <Text style={styles.formSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const SelectField = ({
  label,
  value,
  helperText,
  icon,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  helperText?: string;
  icon: ReactNode;
  placeholder: boolean;
  onPress: () => void;
}) => {
  return (
    <View style={styles.selectFieldBlock}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TouchableOpacity
        style={styles.selectBox}
        activeOpacity={0.85}
        onPress={onPress}
      >
        <View style={styles.selectLeft}>
          <View style={styles.selectIcon}>{icon}</View>

          <View style={styles.selectTextBlock}>
            <Text
              style={[
                styles.selectText,
                placeholder ? styles.placeholderText : undefined,
              ]}
              numberOfLines={1}
            >
              {value}
            </Text>

            {helperText ? (
              <Text style={styles.selectHelperText} numberOfLines={1}>
                {helperText}
              </Text>
            ) : null}
          </View>
        </View>

        <ChevronDown size={21} color={MUTED} strokeWidth={2.7} />
      </TouchableOpacity>
    </View>
  );
};

const ConsultationRow = ({
  consultation,
  isLast,
  isCancelling,
  isBeingRescheduled,
  onOpenActiveCalls,
  onReschedule,
  onCancel,
}: {
  consultation: Consultation;
  isLast: boolean;
  isCancelling: boolean;
  isBeingRescheduled: boolean;
  onOpenActiveCalls: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}) => {
  const { t, locale } = useLanguage();
  const tone = getStatusTone(consultation.status);
  const canOpenActiveCall = canJoinConsultation(consultation.status);
  const canManage = canManageAppointment(consultation);
  const doctorName = consultation.doctorName;

  return (
    <View style={[styles.consultationRow, isLast ? styles.rowLast : undefined]}>
      <View style={styles.consultationMainRow}>
        <View style={[styles.statusIconCircle, { backgroundColor: tone.background }]}>
          <Text style={[styles.statusIconText, { color: tone.text }]}>{tone.icon}</Text>
        </View>

        <View style={styles.consultationInfo}>
          <Text style={styles.consultationTitle} numberOfLines={1}>
            {getConsultationTypeLabel(consultation.type, t)}
          </Text>

          {doctorName ? (
            <Text style={styles.consultationDoctor} numberOfLines={1}>
              {formatDoctorName(doctorName)}
            </Text>
          ) : null}

          <Text style={styles.consultationSubtitle} numberOfLines={1}>
            {formatConsultationDate(consultation.preferredAt || consultation.createdAt, t, locale)}
          </Text>

          <Text style={styles.consultationHint} numberOfLines={2}>
            {canOpenActiveCall ? t("consultations.tapActiveCall") : getStatusHint(consultation.status, t)}
          </Text>

          {consultation.reason ? (
            <Text style={styles.consultationReason} numberOfLines={2}>
              {consultation.reason}
            </Text>
          ) : null}
        </View>

        <View style={styles.consultationActionColumn}>
          <View style={[styles.consultationBadge, { backgroundColor: tone.background }]}>
            <View style={[styles.consultationBadgeDot, { backgroundColor: tone.dot }]} />
            <Text style={[styles.consultationBadgeText, { color: tone.text }]}>
              {getStatusLabel(consultation.status, t)}
            </Text>
          </View>
        </View>
      </View>

      {canOpenActiveCall || canManage ? (
        <View style={styles.appointmentActions}>
          {canOpenActiveCall ? (
            <TouchableOpacity style={styles.openCallButton} activeOpacity={0.85} onPress={onOpenActiveCalls}>
              <Video size={16} color={PRIMARY} strokeWidth={2.6} />
              <Text style={styles.openCallButtonText}>{t("common.open")}</Text>
            </TouchableOpacity>
          ) : null}

          {canManage ? (
            <TouchableOpacity
              style={[styles.rescheduleButton, isBeingRescheduled ? styles.rescheduleButtonActive : undefined]}
              activeOpacity={0.85}
              onPress={onReschedule}
              disabled={isCancelling}
            >
              <CalendarDays size={16} color={PRIMARY_DARK} strokeWidth={2.6} />
              <Text style={styles.rescheduleButtonText}>{isBeingRescheduled ? "Rescheduling" : "Reschedule"}</Text>
            </TouchableOpacity>
          ) : null}

          {canManage ? (
            <TouchableOpacity
              style={[styles.cancelAppointmentButton, isCancelling ? styles.disabledButton : undefined]}
              activeOpacity={0.85}
              onPress={onCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={DANGER} />
              ) : (
                <XCircle size={16} color={DANGER} strokeWidth={2.6} />
              )}
              <Text style={styles.cancelAppointmentButtonText}>{isCancelling ? "Cancelling" : "Cancel"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const LoadingRow = ({ title }: { title: string }) => {
  const { t } = useLanguage();

  return (
    <View style={styles.emptyPanel}>
      <ActivityIndicator size="small" color={PRIMARY} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{t("consultations.waitMoment")}</Text>
    </View>
  );
};

const EmptyRow = ({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) => {
  return (
    <View style={styles.emptyPanel}>
      <View style={styles.emptyIconCircle}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{subtitle}</Text>
    </View>
  );
};

export default ConsultationsScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  appBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  appBarTitle: { color: TEXT, fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  appBarSubtitle: { color: MUTED, fontSize: 13, fontWeight: "600", marginTop: 3 },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  summaryPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    ...elevate(1),
  },

  summaryHeader: { flexDirection: "row", alignItems: "center" },

  summaryIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  summaryTextBlock: { flex: 1 },
  summaryTitle: { color: TEXT, fontSize: 18, fontWeight: "700" },

  summarySubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 4,
  },

  summaryStatsRow: {
    flexDirection: "row",
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    padding: 10,
    marginTop: 14,
  },

  summaryStat: { flex: 1, alignItems: "center" },
  summaryStatValue: { color: TEXT, fontSize: 18, fontWeight: "700" },
  summaryStatLabel: { color: MUTED, fontSize: 11, fontWeight: "700", marginTop: 3 },

  formPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    ...elevate(1),
  },

  formHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },

  formIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  formHeaderText: { flex: 1 },
  formTitle: { color: TEXT, fontSize: 18, fontWeight: "700" },

  formSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 2,
  },

  rescheduleBanner: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
  },

  rescheduleBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  rescheduleBannerText: { flex: 1 },
  rescheduleBannerTitle: { color: PRIMARY_DARK, fontSize: 13, fontWeight: "700" },
  rescheduleBannerSubtitle: { color: TEXT, fontSize: 11, fontWeight: "600", lineHeight: 16, marginTop: 3 },
  rescheduleWarningText: { color: "#A85A13", fontSize: 10, fontWeight: "600", lineHeight: 15, marginTop: 6 },

  stopRescheduleButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  noDoctorPanel: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },

  noDoctorIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  noDoctorTextBlock: { flex: 1 },
  noDoctorTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },

  noDoctorText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 3,
  },

  manageDoctorButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 9,
  },

  selectFieldBlock: { marginTop: 13 },
  lockedFieldBlock: { marginTop: 13 },

  inputLabel: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  inputLabelNoMargin: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  selectBox: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  lockedField: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  lockedReasonPanel: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  lockedReasonText: { flex: 1, marginLeft: 10 },
  lockedReasonValue: { color: TEXT, fontSize: 14, fontWeight: "700" },
  lockedReasonHelper: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 3 },

  selectLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },

  selectIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  selectTextBlock: { flex: 1 },
  selectText: { color: TEXT, fontSize: 15, fontWeight: "700" },

  selectHelperText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },

  placeholderText: { color: "#A8B0C2" },

  calendarSection: {
    marginTop: 17,
    marginBottom: 16,
  },

  calendarSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  calendarSectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  calendarSectionText: { flex: 1 },

  calendarHelper: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },

  calendar: {
    borderRadius: 13,
    backgroundColor: SOFT_PANEL,
    paddingVertical: 4,
  },

  calendarLoadingPanel: {
    minHeight: 120,
    borderRadius: 13,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
  },

  calendarLoadingText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 9,
  },

  calendarEmptyPanel: {
    minHeight: 100,
    borderRadius: 13,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
  },

  calendarEmptyTitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },

  calendarLegend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
    paddingHorizontal: 4,
  },

  legendItem: { flexDirection: "row", alignItems: "center" },

  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SUCCESS,
    marginRight: 6,
  },

  legendText: {
    color: "#167A58",
    fontSize: 10,
    fontWeight: "700",
  },

  disabledLegendText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
  },

  noAvailabilityPanel: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  noAvailabilityTextBlock: {
    flex: 1,
    marginLeft: 10,
  },

  noAvailabilityTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },

  noAvailabilityText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 15,
    marginTop: 2,
  },

  selectedDatePanel: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 13,
    padding: 13,
    marginTop: 13,
  },

  selectedDateHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  selectedDateIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  selectedDateTextBlock: { flex: 1 },

  selectedDateLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
  },

  selectedDateValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },

  availableChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  availableChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SUCCESS,
    marginRight: 5,
  },

  availableChipText: {
    color: "#167A58",
    fontSize: 9,
    fontWeight: "700",
  },

  timeHeading: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 15,
    marginBottom: 8,
  },

  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },

  slotButton: {
    minWidth: "29%",
    flexGrow: 1,
    maxWidth: "48%",
    minHeight: 42,
    borderRadius: 11,
    backgroundColor: SURFACE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
    paddingHorizontal: 10,
  },

  slotButtonSelected: {
    backgroundColor: PRIMARY,
  },

  slotButtonText: {
    color: PRIMARY_DARK,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  slotButtonTextSelected: {
    color: SURFACE,
  },

  slotLoadingRow: {
    minHeight: 60,
    borderRadius: 11,
    backgroundColor: SURFACE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  slotLoadingText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 8,
  },

  noSlotsPanel: {
    minHeight: 58,
    borderRadius: 11,
    backgroundColor: SURFACE,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  noSlotsText: {
    flex: 1,
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginLeft: 8,
  },

  availabilityErrorPanel: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 11,
    padding: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
  },

  availabilityErrorText: {
    flex: 1,
    color: "#B42318",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginLeft: 8,
  },

  notesInput: {
    minHeight: 108,
    borderRadius: 13,
    backgroundColor: SOFT_PANEL,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 13,
    color: TEXT,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },

  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 16,
    ...elevate(1),
  },

  primaryButtonText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 9,
  },

  cancelRescheduleButton: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 9,
  },

  cancelRescheduleText: {
    color: PRIMARY_DARK,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  disabledButton: { opacity: 0.55 },

  errorPanel: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    ...elevate(1),
  },

  errorText: {
    flex: 1,
    color: "#B42318",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginLeft: 10,
  },

  sectionHeader: {
    marginTop: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: { color: TEXT, fontSize: 19, fontWeight: "700" },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    ...elevate(1),
  },

  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    ...elevate(1),
  },

  listPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
    ...elevate(1),
  },

  consultationRow: {
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },

  consultationMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  rowLast: { borderBottomWidth: 0 },

  statusIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  statusIconText: { fontSize: 18, fontWeight: "700" },

  consultationInfo: {
    flex: 1,
    paddingRight: 10,
  },

  consultationTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },

  consultationDoctor: {
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },

  consultationSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 3,
  },

  consultationHint: {
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 4,
  },

  consultationReason: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 4,
  },

  consultationActionColumn: {
    alignItems: "flex-end",
    minWidth: 82,
  },

  consultationBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  consultationBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  consultationBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },

  appointmentActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 11,
    marginHorizontal: -3,
  },

  openCallButton: {
    flexGrow: 1,
    minWidth: "29%",
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: PRIMARY_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 3,
    paddingHorizontal: 8,
  },

  openCallButtonText: {
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 5,
  },

  rescheduleButton: {
    flexGrow: 1,
    minWidth: "29%",
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: PRIMARY_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 3,
    paddingHorizontal: 8,
  },

  rescheduleButtonActive: { backgroundColor: "#DDE8FF" },

  rescheduleButtonText: {
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 5,
  },

  cancelAppointmentButton: {
    flexGrow: 1,
    minWidth: "29%",
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: DANGER_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 3,
    paddingHorizontal: 8,
  },

  cancelAppointmentButtonText: {
    color: DANGER,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 5,
  },

  emptyPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    marginBottom: 14,
    ...elevate(1),
  },

  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },

  emptyText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.38)",
    justifyContent: "flex-end",
  },

  modalDismissArea: { flex: 1 },

  modalCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D4DAE6",
    marginBottom: 14,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },

  modalTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  modalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  modalTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },

  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
  },

  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 13,
  },

  modalDoctorOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 13,
  },

  modalDoctorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  modalDoctorText: { flex: 1 },

  modalDoctorSpecialization: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },

  modalOptionLast: { borderBottomWidth: 0 },

  modalOptionSelected: {
    backgroundColor: PRIMARY_LIGHT,
    borderBottomColor: "transparent",
    marginBottom: 5,
  },

  modalOptionText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },

  modalOptionTextSelected: {
    color: PRIMARY_DARK,
  },
});