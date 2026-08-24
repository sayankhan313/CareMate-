import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Plus, RefreshCw, Stethoscope, TriangleAlert, UserRound, Video, X } from "lucide-react-native";

import { caregiverPatientsApi, type CaregiverLinkedPatient } from "../../services/caregiver/caregiverPatientsApi";
import { caregiverAppointmentApi, type CaregiverAppointmentDoctor, type CaregiverAppointmentSlot, type CaregiverDoctorMonthlyAvailability } from "../../services/caregiver/caregiverAppointmentApi";
import { caregiverConsultationApi, type CaregiverConsultation, type CaregiverConsultationListData } from "../../services/caregiver/caregiverConsultationApi";
import type { CaregiverTabParamList } from "../../types/navigation";

type Props = BottomTabScreenProps<CaregiverTabParamList, "Appointments">;
type PatientConsultationBundle = { link: CaregiverLinkedPatient; data: CaregiverConsultationListData };
type ConsultationItem = { patient: CaregiverLinkedPatient["patient"]; consultation: CaregiverConsultation };

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
const GREY_LIGHT = "#F1F3F7";

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const shiftMonth = (month: string, amount: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return getMonthKey(new Date(year, monthNumber - 1 + amount, 1));
};

const formatMonth = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString([], { month: "long", year: "numeric" });
};

const parseCalendarDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const formatCalendarDate = (value: string) => {
  const date = parseCalendarDate(value);
  return {
    day: date.toLocaleDateString([], { weekday: "short" }),
    number: String(date.getDate()),
    month: date.toLocaleDateString([], { month: "short" }),
  };
};

const toBackendDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const formatAppointmentDate = (value?: string | null) => {
  if (!value) return "Time not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not set";
  return date.toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatSlotTime = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getStatusTone = (status: CaregiverConsultation["status"]) => {
  if (status === "PENDING") return { background: WARNING_LIGHT, color: WARNING_DARK, label: "Pending" };
  if (status === "ACCEPTED") return { background: BLUE_LIGHT, color: BLUE, label: "Accepted" };
  if (status === "IN_PROGRESS") return { background: BLUE_LIGHT, color: BLUE, label: "In progress" };
  if (status === "COMPLETED") return { background: SUCCESS_LIGHT, color: SUCCESS_DARK, label: "Completed" };
  if (status === "REJECTED") return { background: DANGER_LIGHT, color: DANGER_DARK, label: "Rejected" };
  return { background: GREY_LIGHT, color: MUTED, label: "Cancelled" };
};

export const CaregiverAppointmentsScreen = () => {
  const insets = useSafeAreaInsets();
  const [patients, setPatients] = useState<CaregiverLinkedPatient[]>([]);
  const [bundles, setBundles] = useState<PatientConsultationBundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [doctors, setDoctors] = useState<CaregiverAppointmentDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [activeMonth, setActiveMonth] = useState(getMonthKey(new Date()));
  const [availability, setAvailability] = useState<CaregiverDoctorMonthlyAvailability | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<CaregiverAppointmentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<CaregiverAppointmentSlot | null>(null);
  const [reason, setReason] = useState("");
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadOverview = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      setErrorMessage("");

      const linked = await caregiverPatientsApi.getLinkedPatients();
      setPatients(linked.patients);

      const results = await Promise.all(linked.patients.map(async link => ({
        link,
        data: await caregiverConsultationApi.listPatientConsultations(link.patient.id),
      })));

      setBundles(results);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load appointments.");
    } finally {
      if (mode === "initial") setIsLoading(false);
      if (mode === "refresh") setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadOverview("initial");
  }, [loadOverview]));

  const allConsultations = useMemo<ConsultationItem[]>(() => bundles.flatMap(bundle => bundle.data.consultations.map(consultation => ({ patient: bundle.link.patient, consultation }))), [bundles]);

  const upcoming = useMemo(() => allConsultations.filter(item => ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(item.consultation.status)).sort((a, b) => {
    const left = a.consultation.preferredAt ? new Date(a.consultation.preferredAt).getTime() : new Date(a.consultation.createdAt).getTime();
    const right = b.consultation.preferredAt ? new Date(b.consultation.preferredAt).getTime() : new Date(b.consultation.createdAt).getTime();
    return left - right;
  }), [allConsultations]);

  const history = useMemo(() => allConsultations.filter(item => ["COMPLETED", "REJECTED", "CANCELLED"].includes(item.consultation.status)).sort((a, b) => new Date(b.consultation.updatedAt).getTime() - new Date(a.consultation.updatedAt).getTime()).slice(0, 10), [allConsultations]);

  const pendingCount = allConsultations.filter(item => item.consultation.status === "PENDING").length;
  const acceptedCount = allConsultations.filter(item => item.consultation.status === "ACCEPTED").length;

  const resetRequestForm = () => {
    setSelectedPatientId("");
    setDoctors([]);
    setSelectedDoctorId("");
    setActiveMonth(getMonthKey(new Date()));
    setAvailability(null);
    setSelectedDate("");
    setSlots([]);
    setSelectedSlot(null);
    setReason("");
  };

  const closeRequestModal = () => {
    if (isSubmitting) return;
    setShowRequestModal(false);
    resetRequestForm();
  };

  const selectPatient = async (patient: CaregiverLinkedPatient) => {
    try {
      setSelectedPatientId(patient.patient.id);
      setDoctors([]);
      setSelectedDoctorId("");
      setAvailability(null);
      setSelectedDate("");
      setSlots([]);
      setSelectedSlot(null);
      setIsLoadingDoctors(true);

      const result = await caregiverAppointmentApi.listAssignedDoctors(patient.patient.id);
      setDoctors(result);
    } catch (error) {
      Alert.alert("Couldn't load doctors", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  const loadAvailability = async (patientId: string, doctorId: string, month: string) => {
    try {
      setIsLoadingAvailability(true);
      setAvailability(null);
      setSelectedDate("");
      setSlots([]);
      setSelectedSlot(null);
      const result = await caregiverAppointmentApi.getMonthlyAvailability(patientId, doctorId, month);
      setAvailability(result);
    } catch (error) {
      Alert.alert("Couldn't load availability", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const selectDoctor = async (doctor: CaregiverAppointmentDoctor) => {
    if (!doctor.acceptingAppointments) {
      Alert.alert("Doctor unavailable", `${doctor.fullName} is currently not accepting appointment requests.`);
      return;
    }

    const month = getMonthKey(new Date());
    setSelectedDoctorId(doctor.id);
    setActiveMonth(month);
    await loadAvailability(selectedPatientId, doctor.id, month);
  };

  const changeMonth = async (amount: number) => {
    if (!selectedPatientId || !selectedDoctorId) return;
    const nextMonth = shiftMonth(activeMonth, amount);
    const currentMonth = getMonthKey(new Date());
    if (nextMonth < currentMonth) return;

    setActiveMonth(nextMonth);
    await loadAvailability(selectedPatientId, selectedDoctorId, nextMonth);
  };

  const selectAppointmentDate = async (date: string) => {
    if (!selectedPatientId || !selectedDoctorId) return;

    try {
      setSelectedDate(date);
      setSlots([]);
      setSelectedSlot(null);
      setIsLoadingSlots(true);
      const result = await caregiverAppointmentApi.getAvailableSlots(selectedPatientId, selectedDoctorId, date);
      setSlots(result.slots);
    } catch (error) {
      Alert.alert("Couldn't load times", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const submitRequest = async () => {
    const cleanedReason = reason.trim();

    if (!selectedPatientId) return Alert.alert("Select patient", "Choose the linked patient this appointment is for.");
    if (!selectedDoctorId) return Alert.alert("Select doctor", "Choose one of the patient's assigned doctors.");
    if (!selectedDate) return Alert.alert("Select date", "Choose an available appointment date.");
    if (!selectedSlot) return Alert.alert("Select time", "Choose an available appointment time.");
    if (cleanedReason.length < 3) return Alert.alert("Reason required", "Enter at least 3 characters for the appointment reason.");

    try {
      setIsSubmitting(true);

      const result = await caregiverAppointmentApi.createAppointmentRequest(selectedPatientId, {
        doctorId: selectedDoctorId,
        reason: cleanedReason,
        preferredDate: toBackendDate(selectedDate),
        preferredTime: selectedSlot.time,
      });

      Alert.alert("Request sent", result.message);
      setShowRequestModal(false);
      resetRequestForm();
      await loadOverview("refresh");
    } catch (error) {
      Alert.alert("Couldn't request appointment", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRequest = () => {
    if (!patients.length) {
      Alert.alert("No linked patients", "Link a patient before requesting an appointment.");
      return;
    }

    resetRequestForm();
    setShowRequestModal(true);

    if (patients.length === 1) void selectPatient(patients[0]);
  };

  const canSubmit = Boolean(selectedPatientId && selectedDoctorId && selectedDate && selectedSlot && reason.trim().length >= 3);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 105, 126) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadOverview("refresh")} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Appointments</Text>
              <Text style={styles.headerSubtitle}>Consultations and appointment requests</Text>
            </View>

            <View style={styles.headerIcon}>
              <CalendarDays size={23} color={PRIMARY_DARK} strokeWidth={2.6} />
            </View>
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading appointments</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.stateCard}>
              <View style={styles.errorIcon}><RefreshCw size={24} color={DANGER} strokeWidth={2.6} /></View>
              <Text style={styles.stateTitle}>Couldn't load appointments</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => void loadOverview("initial")}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <LinearGradient colors={[PRIMARY, PRIMARY_SECONDARY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
                <View style={styles.heroCircleLarge} />
                <View style={styles.heroCircleSmall} />

                <View style={styles.heroTop}>
                  <View style={styles.heroIcon}>
                    <CalendarClock size={27} color={PRIMARY_DARK} strokeWidth={2.6} />
                  </View>

                  <View style={styles.heroText}>
                    <Text style={styles.heroEyebrow}>CARE COORDINATION</Text>
                    <Text style={styles.heroTitle}>Appointments</Text>
                    <Text style={styles.heroSubtitle}>Request and track patient consultations</Text>
                  </View>
                </View>

                <View style={styles.heroStats}>
                  <HeroStat value={patients.length} label="Patients" />
                  <View style={styles.heroDivider} />
                  <HeroStat value={pendingCount} label="Pending" />
                  <View style={styles.heroDivider} />
                  <HeroStat value={acceptedCount} label="Accepted" />
                </View>

                <TouchableOpacity style={styles.heroButton} activeOpacity={0.88} onPress={openRequest}>
                  <Plus size={18} color={PRIMARY_DARK} strokeWidth={2.7} />
                  <Text style={styles.heroButtonText}>Request appointment</Text>
                </TouchableOpacity>
              </LinearGradient>

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Upcoming</Text>
                  <Text style={styles.sectionSubtitle}>Pending, accepted and active consultations</Text>
                </View>
                {upcoming.length ? <View style={styles.countBadge}><Text style={styles.countBadgeText}>{upcoming.length}</Text></View> : null}
              </View>

              {upcoming.length ? (
                <View style={styles.appointmentStack}>
                  {upcoming.map(item => <ConsultationCard key={`${item.patient.id}-${item.consultation.id}`} item={item} />)}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}><CalendarDays size={26} color={PRIMARY_DARK} strokeWidth={2.5} /></View>
                  <Text style={styles.emptyTitle}>No upcoming appointments</Text>
                  <Text style={styles.emptyText}>Request an appointment with one of the patient's assigned doctors.</Text>
                </View>
              )}

              {history.length ? (
                <>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Recent history</Text>
                      <Text style={styles.sectionSubtitle}>Completed, rejected and cancelled consultations</Text>
                    </View>
                  </View>

                  <View style={styles.historyCard}>
                    {history.map((item, index) => {
                      const tone = getStatusTone(item.consultation.status);

                      return (
                        <View key={`${item.patient.id}-${item.consultation.id}`} style={[styles.historyRow, index === history.length - 1 ? styles.historyLast : undefined]}>
                          <View style={[styles.historyIcon, { backgroundColor: tone.background }]}>
                            {item.consultation.status === "COMPLETED" ? <CheckCircle2 size={19} color={tone.color} strokeWidth={2.6} /> : <CalendarClock size={19} color={tone.color} strokeWidth={2.5} />}
                          </View>

                          <View style={styles.historyText}>
                            <Text style={styles.historyPatient}>{item.patient.fullName}</Text>
                            <Text style={styles.historyDoctor}>{item.consultation.doctor?.fullName || "Doctor"} · {formatAppointmentDate(item.consultation.preferredAt)}</Text>
                          </View>

                          <View style={[styles.historyBadge, { backgroundColor: tone.background }]}>
                            <Text style={[styles.historyBadgeText, { color: tone.color }]}>{tone.label}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        <Modal visible={showRequestModal} transparent animationType="slide" onRequestClose={closeRequestModal}>
          <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
                <LinearGradient colors={[PRIMARY, PRIMARY_SECONDARY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalEyebrow}>CARE COORDINATION</Text>
                    <Text style={styles.modalTitle}>Request appointment</Text>
                    <Text style={styles.modalSubtitle}>The doctor must approve the request.</Text>
                  </View>

                  <TouchableOpacity style={styles.closeButton} activeOpacity={0.82} onPress={closeRequestModal}>
                    <X size={20} color={PRIMARY_DARK} strokeWidth={2.6} />
                  </TouchableOpacity>
                </LinearGradient>

                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <FormTitle number="1" title="Patient" />

                  <View style={styles.optionStack}>
                    {patients.map(link => {
                      const active = selectedPatientId === link.patient.id;

                      return (
                        <TouchableOpacity key={link.patient.id} style={[styles.patientOption, active ? styles.patientOptionActive : undefined]} activeOpacity={0.84} onPress={() => void selectPatient(link)}>
                          <View style={[styles.optionAvatar, active ? styles.optionAvatarActive : undefined]}>
                            <UserRound size={19} color={active ? SURFACE : PRIMARY_DARK} strokeWidth={2.5} />
                          </View>

                          <View style={styles.optionText}>
                            <Text style={styles.optionTitle}>{link.patient.fullName}</Text>
                            <Text style={styles.optionSubtitle}>{link.patient.email}</Text>
                          </View>

                          {active ? <CheckCircle2 size={20} color={PRIMARY} strokeWidth={2.6} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {selectedPatientId ? (
                    <>
                      <FormTitle number="2" title="Assigned doctor" />

                      {isLoadingDoctors ? (
                        <View style={styles.inlineLoading}><ActivityIndicator size="small" color={PRIMARY} /><Text style={styles.inlineLoadingText}>Loading doctors</Text></View>
                      ) : doctors.length ? (
                        <View style={styles.optionStack}>
                          {doctors.map(doctor => {
                            const active = selectedDoctorId === doctor.id;

                            return (
                              <TouchableOpacity key={doctor.id} style={[styles.doctorOption, active ? styles.doctorOptionActive : undefined, !doctor.acceptingAppointments ? styles.doctorDisabled : undefined]} activeOpacity={0.84} onPress={() => void selectDoctor(doctor)}>
                                <View style={[styles.doctorAvatar, active ? styles.doctorAvatarActive : undefined]}>
                                  <Stethoscope size={20} color={active ? SURFACE : BLUE} strokeWidth={2.5} />
                                </View>

                                <View style={styles.optionText}>
                                  <View style={styles.doctorTitleRow}>
                                    <Text style={styles.optionTitle}>{doctor.fullName}</Text>
                                    <View style={[styles.assignmentBadge, doctor.assignmentType === "PRIMARY" ? styles.primaryBadge : styles.specialistBadge]}>
                                      <Text style={[styles.assignmentBadgeText, doctor.assignmentType === "PRIMARY" ? styles.primaryBadgeText : styles.specialistBadgeText]}>{doctor.assignmentType === "PRIMARY" ? "Primary" : "Specialist"}</Text>
                                    </View>
                                  </View>

                                  <Text style={styles.optionSubtitle}>{doctor.specialization || "Doctor"}{doctor.clinicName ? ` · ${doctor.clinicName}` : ""}</Text>
                                  {!doctor.acceptingAppointments ? <Text style={styles.unavailableText}>{doctor.operationalStatus === "OUT_OF_OFFICE" ? "Out of office" : "Currently unavailable"}</Text> : null}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : (
                        <View style={styles.miniEmpty}><Text style={styles.miniEmptyText}>No assigned doctors available for appointments.</Text></View>
                      )}
                    </>
                  ) : null}

                  {selectedDoctorId ? (
                    <>
                      <FormTitle number="3" title="Date" />

                      <View style={styles.monthRow}>
                        <TouchableOpacity style={[styles.monthButton, activeMonth <= getMonthKey(new Date()) ? styles.monthButtonDisabled : undefined]} disabled={activeMonth <= getMonthKey(new Date())} onPress={() => void changeMonth(-1)}>
                          <ChevronLeft size={19} color={activeMonth <= getMonthKey(new Date()) ? MUTED : TEXT} strokeWidth={2.5} />
                        </TouchableOpacity>

                        <Text style={styles.monthText}>{formatMonth(activeMonth)}</Text>

                        <TouchableOpacity style={styles.monthButton} onPress={() => void changeMonth(1)}>
                          <ChevronRight size={19} color={TEXT} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>

                      {isLoadingAvailability ? (
                        <View style={styles.inlineLoading}><ActivityIndicator size="small" color={PRIMARY} /><Text style={styles.inlineLoadingText}>Loading availability</Text></View>
                      ) : availability?.dates.filter(item => item.isAvailable).length ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
                          {availability.dates.filter(item => item.isAvailable).map(item => {
                            const formatted = formatCalendarDate(item.date);
                            const active = selectedDate === item.date;

                            return (
                              <TouchableOpacity key={item.date} style={[styles.dateCard, active ? styles.dateCardActive : undefined]} activeOpacity={0.84} onPress={() => void selectAppointmentDate(item.date)}>
                                <Text style={[styles.dateDay, active ? styles.dateTextActive : undefined]}>{formatted.day}</Text>
                                <Text style={[styles.dateNumber, active ? styles.dateTextActive : undefined]}>{formatted.number}</Text>
                                <Text style={[styles.dateMonth, active ? styles.dateTextActive : undefined]}>{formatted.month}</Text>
                                <Text style={[styles.dateSlots, active ? styles.dateSlotsActive : undefined]}>{item.availableSlotCount} slot{item.availableSlotCount === 1 ? "" : "s"}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      ) : (
                        <View style={styles.miniEmpty}>
                          <CalendarDays size={20} color={MUTED} strokeWidth={2.4} />
                          <Text style={styles.miniEmptyText}>No available dates this month. Try the next month.</Text>
                        </View>
                      )}
                    </>
                  ) : null}

                  {selectedDate ? (
                    <>
                      <FormTitle number="4" title="Time" />

                      {isLoadingSlots ? (
                        <View style={styles.inlineLoading}><ActivityIndicator size="small" color={PRIMARY} /><Text style={styles.inlineLoadingText}>Loading times</Text></View>
                      ) : slots.length ? (
                        <View style={styles.slotWrap}>
                          {slots.map(slot => {
                            const active = selectedSlot?.startsAt === slot.startsAt;

                            return (
                              <TouchableOpacity key={slot.startsAt} style={[styles.slotButton, active ? styles.slotButtonActive : undefined]} activeOpacity={0.84} onPress={() => setSelectedSlot(slot)}>
                                <Clock3 size={14} color={active ? SURFACE : PRIMARY_DARK} strokeWidth={2.5} />
                                <Text style={[styles.slotText, active ? styles.slotTextActive : undefined]}>{formatSlotTime(slot.time)}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : (
                        <View style={styles.miniEmpty}><Text style={styles.miniEmptyText}>No remaining slots on this date.</Text></View>
                      )}
                    </>
                  ) : null}

                  {selectedSlot ? (
                    <>
                      <FormTitle number="5" title="Reason" />

                      <View style={styles.reasonBox}>
                        <TextInput
                          value={reason}
                          onChangeText={setReason}
                          placeholder="Why is this appointment being requested?"
                          placeholderTextColor="#9AA1B2"
                          style={styles.reasonInput}
                          multiline
                          maxLength={250}
                          textAlignVertical="top"
                        />
                        <Text style={styles.characterCount}>{reason.length}/250</Text>
                      </View>

                      <View style={styles.infoPanel}>
                        <TriangleAlert size={17} color={PRIMARY_DARK} strokeWidth={2.4} />
                        <Text style={styles.infoText}>This creates a pending request. The doctor decides whether to accept or reject it.</Text>
                      </View>
                    </>
                  ) : null}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={[styles.submitButton, !canSubmit ? styles.submitButtonDisabled : undefined]} activeOpacity={0.88} disabled={!canSubmit || isSubmitting} onPress={() => void submitRequest()}>
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={SURFACE} />
                    ) : (
                      <>
                        <CalendarDays size={18} color={SURFACE} strokeWidth={2.6} />
                        <Text style={styles.submitButtonText}>Send appointment request</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const ConsultationCard = ({ item }: { item: ConsultationItem }) => {
  const tone = getStatusTone(item.consultation.status);
  const emergency = item.consultation.type === "EMERGENCY";

  return (
    <View style={[styles.appointmentCard, emergency ? styles.emergencyCard : undefined]}>
      <View style={styles.appointmentTop}>
        <View style={[styles.appointmentIcon, emergency ? styles.emergencyIcon : styles.manualIcon]}>
          {emergency ? <Video size={22} color={DANGER} strokeWidth={2.5} /> : <CalendarDays size={22} color={PRIMARY_DARK} strokeWidth={2.5} />}
        </View>

        <View style={styles.appointmentTitleBlock}>
          <Text style={styles.appointmentPatient}>{item.patient.fullName}</Text>
          <Text style={styles.appointmentType}>{emergency ? "Safety consultation" : "Appointment"}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: tone.background }]}>
          <Text style={[styles.statusBadgeText, { color: tone.color }]}>{tone.label}</Text>
        </View>
      </View>

      <View style={styles.doctorPanel}>
        <Stethoscope size={17} color={BLUE} strokeWidth={2.5} />

        <View style={styles.doctorPanelText}>
          <Text style={styles.doctorName}>{item.consultation.doctor?.fullName || "Doctor"}</Text>
          <Text style={styles.doctorMeta}>{item.consultation.doctor?.specialization || item.consultation.doctor?.clinicName || "Assigned doctor"}</Text>
        </View>
      </View>

      <View style={styles.appointmentFooter}>
        <View style={styles.timeRow}>
          <Clock3 size={15} color={MUTED} strokeWidth={2.4} />
          <Text style={styles.timeText}>{formatAppointmentDate(item.consultation.preferredAt)}</Text>
        </View>

        {item.consultation.safetyAlert ? <View style={styles.safetyBadge}><Text style={styles.safetyBadgeText}>Safety</Text></View> : null}
      </View>
    </View>
  );
};

const HeroStat = ({ value, label }: { value: number; label: string }) => (
  <View style={styles.heroStat}>
    <Text style={styles.heroStatValue}>{value}</Text>
    <Text style={styles.heroStatLabel}>{label}</Text>
  </View>
);

const FormTitle = ({ number, title }: { number: string; title: string }) => (
  <View style={styles.formTitleRow}>
    <View style={styles.formNumber}><Text style={styles.formNumberText}>{number}</Text></View>
    <Text style={styles.formTitle}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 10 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingHorizontal: 2 },
  headerTitle: { color: TEXT, fontSize: 27, fontWeight: "800", letterSpacing: -0.4 },
  headerSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },
  headerIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center" },

  heroCard: { borderRadius: 23, padding: 18, overflow: "hidden" },
  heroCircleLarge: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.10)", right: -60, top: -80 },
  heroCircleSmall: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.09)", left: -32, bottom: -46 },
  heroTop: { flexDirection: "row", alignItems: "center" },
  heroIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 13 },
  heroText: { flex: 1 },
  heroEyebrow: { color: "#FFF8ED", fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: SURFACE, fontSize: 21, fontWeight: "800", marginTop: 4 },
  heroSubtitle: { color: "#FFF8ED", fontSize: 10, fontWeight: "600", marginTop: 3 },
  heroStats: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 15, marginTop: 18, paddingVertical: 12 },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { color: SURFACE, fontSize: 20, fontWeight: "800" },
  heroStatLabel: { color: "#FFF8ED", fontSize: 8, fontWeight: "700", marginTop: 3 },
  heroDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.28)" },
  heroButton: { height: 44, borderRadius: 13, backgroundColor: SURFACE, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 13 },
  heroButtonText: { color: PRIMARY_DARK, fontSize: 11, fontWeight: "800", marginLeft: 7 },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 21, marginBottom: 10, paddingHorizontal: 2 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "800" },
  sectionSubtitle: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },
  countBadge: { minWidth: 30, height: 30, borderRadius: 10, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  countBadgeText: { color: SURFACE, fontSize: 11, fontWeight: "800" },

  appointmentStack: { gap: 11 },
  appointmentCard: { backgroundColor: SURFACE, borderRadius: 19, padding: 14, borderWidth: 1, borderColor: "#F2E5D3" },
  emergencyCard: { borderColor: "#F2D4D7" },
  appointmentTop: { flexDirection: "row", alignItems: "center" },
  appointmentIcon: { width: 47, height: 47, borderRadius: 15, alignItems: "center", justifyContent: "center", marginRight: 10 },
  manualIcon: { backgroundColor: PRIMARY_LIGHT },
  emergencyIcon: { backgroundColor: DANGER_LIGHT },
  appointmentTitleBlock: { flex: 1 },
  appointmentPatient: { color: TEXT, fontSize: 14, fontWeight: "800" },
  appointmentType: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },
  statusBadge: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  statusBadgeText: { fontSize: 8, fontWeight: "800" },
  doctorPanel: { backgroundColor: BLUE_LIGHT, borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", marginTop: 12 },
  doctorPanelText: { flex: 1, marginLeft: 8 },
  doctorName: { color: TEXT, fontSize: 11, fontWeight: "800" },
  doctorMeta: { color: BLUE, fontSize: 8, fontWeight: "600", marginTop: 2 },
  appointmentFooter: { flexDirection: "row", alignItems: "center", marginTop: 11 },
  timeRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  timeText: { color: MUTED, fontSize: 9, fontWeight: "700", marginLeft: 5 },
  safetyBadge: { backgroundColor: DANGER_LIGHT, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  safetyBadgeText: { color: DANGER_DARK, fontSize: 8, fontWeight: "800" },

  historyCard: { backgroundColor: SURFACE, borderRadius: 17, overflow: "hidden" },
  historyRow: { minHeight: 67, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  historyLast: { borderBottomWidth: 0 },
  historyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10 },
  historyText: { flex: 1, paddingRight: 8 },
  historyPatient: { color: TEXT, fontSize: 12, fontWeight: "800" },
  historyDoctor: { color: MUTED, fontSize: 8, fontWeight: "600", marginTop: 3 },
  historyBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  historyBadgeText: { fontSize: 8, fontWeight: "800" },

  emptyCard: { backgroundColor: PRIMARY_LIGHT, borderRadius: 18, padding: 27, alignItems: "center", borderWidth: 1, borderColor: "#FBE2BD" },
  emptyIcon: { width: 56, height: 56, borderRadius: 17, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontSize: 14, fontWeight: "800", marginTop: 12 },
  emptyText: { color: MUTED, fontSize: 9, fontWeight: "600", lineHeight: 14, textAlign: "center", marginTop: 4 },

  stateCard: { backgroundColor: SURFACE, borderRadius: 18, padding: 30, alignItems: "center", marginTop: 8 },
  errorIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center" },
  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 11 },
  stateText: { color: MUTED, fontSize: 10, lineHeight: 16, fontWeight: "500", textAlign: "center", marginTop: 5 },
  retryButton: { backgroundColor: PRIMARY, borderRadius: 11, paddingHorizontal: 17, paddingVertical: 10, marginTop: 15 },
  retryText: { color: SURFACE, fontSize: 11, fontWeight: "700" },

  modalRoot: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(17,25,54,0.42)", justifyContent: "flex-end" },
  modalSheet: { maxHeight: "93%", backgroundColor: BACKGROUND, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: "hidden" },
  modalHeader: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 17, flexDirection: "row", alignItems: "center" },
  modalEyebrow: { color: "#FFF8ED", fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  modalTitle: { color: SURFACE, fontSize: 20, fontWeight: "800", marginTop: 4 },
  modalSubtitle: { color: "#FFF8ED", fontSize: 9, fontWeight: "600", marginTop: 3 },
  closeButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginLeft: "auto" },
  modalScroll: { flexGrow: 0 },
  modalContent: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 18 },

  formTitleRow: { flexDirection: "row", alignItems: "center", marginTop: 6, marginBottom: 9 },
  formNumber: { width: 27, height: 27, borderRadius: 9, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 8 },
  formNumberText: { color: PRIMARY_DARK, fontSize: 9, fontWeight: "800" },
  formTitle: { color: TEXT, fontSize: 13, fontWeight: "800" },

  optionStack: { gap: 8, marginBottom: 14 },
  patientOption: { backgroundColor: SURFACE, borderRadius: 14, padding: 11, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: BORDER },
  patientOptionActive: { backgroundColor: "#FFFAF2", borderColor: PRIMARY },
  optionAvatar: { width: 41, height: 41, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 10 },
  optionAvatarActive: { backgroundColor: PRIMARY },
  optionText: { flex: 1 },
  optionTitle: { color: TEXT, fontSize: 12, fontWeight: "800" },
  optionSubtitle: { color: MUTED, fontSize: 8, fontWeight: "600", marginTop: 3 },

  doctorOption: { backgroundColor: SURFACE, borderRadius: 14, padding: 11, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: BORDER },
  doctorOptionActive: { backgroundColor: "#FFFAF2", borderColor: PRIMARY },
  doctorDisabled: { opacity: 0.58 },
  doctorAvatar: { width: 43, height: 43, borderRadius: 13, backgroundColor: BLUE_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 10 },
  doctorAvatarActive: { backgroundColor: PRIMARY },
  doctorTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  assignmentBadge: { borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3, marginLeft: 6 },
  primaryBadge: { backgroundColor: SUCCESS_LIGHT },
  specialistBadge: { backgroundColor: BLUE_LIGHT },
  assignmentBadgeText: { fontSize: 7, fontWeight: "800" },
  primaryBadgeText: { color: SUCCESS_DARK },
  specialistBadgeText: { color: BLUE },
  unavailableText: { color: DANGER, fontSize: 8, fontWeight: "700", marginTop: 3 },

  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: SURFACE, borderRadius: 13, padding: 7, marginBottom: 10 },
  monthButton: { width: 38, height: 38, borderRadius: 11, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center" },
  monthButtonDisabled: { backgroundColor: GREY_LIGHT },
  monthText: { color: TEXT, fontSize: 12, fontWeight: "800" },
  dateScroll: { paddingBottom: 14, paddingRight: 8 },
  dateCard: { width: 75, minHeight: 103, borderRadius: 15, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 8, borderWidth: 1, borderColor: BORDER },
  dateCardActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  dateDay: { color: MUTED, fontSize: 8, fontWeight: "700" },
  dateNumber: { color: TEXT, fontSize: 22, fontWeight: "800", marginTop: 3 },
  dateMonth: { color: MUTED, fontSize: 8, fontWeight: "700", marginTop: 1 },
  dateSlots: { color: PRIMARY_DARK, fontSize: 7, fontWeight: "800", marginTop: 6 },
  dateTextActive: { color: SURFACE },
  dateSlotsActive: { color: "#FFF8ED" },

  slotWrap: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginBottom: 13 },
  slotButton: { minWidth: "30%", height: 39, borderRadius: 11, backgroundColor: PRIMARY_LIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", marginHorizontal: "1.6%", marginBottom: 8, paddingHorizontal: 8 },
  slotButtonActive: { backgroundColor: PRIMARY },
  slotText: { color: PRIMARY_DARK, fontSize: 9, fontWeight: "800", marginLeft: 5 },
  slotTextActive: { color: SURFACE },

  reasonBox: { backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 7, marginBottom: 10 },
  reasonInput: { minHeight: 78, color: TEXT, fontSize: 11, fontWeight: "600", padding: 0 },
  characterCount: { color: MUTED, fontSize: 8, fontWeight: "600", textAlign: "right", marginTop: 5 },
  infoPanel: { backgroundColor: PRIMARY_LIGHT, borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "flex-start" },
  infoText: { flex: 1, color: PRIMARY_DARK, fontSize: 8.5, fontWeight: "600", lineHeight: 14, marginLeft: 7 },

  inlineLoading: { minHeight: 55, backgroundColor: SURFACE, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 13 },
  inlineLoadingText: { color: MUTED, fontSize: 9, fontWeight: "600", marginLeft: 7 },
  miniEmpty: { minHeight: 58, backgroundColor: SURFACE, borderRadius: 13, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 13 },
  miniEmptyText: { color: MUTED, fontSize: 9, lineHeight: 14, fontWeight: "600", textAlign: "center", marginLeft: 6 },

  modalFooter: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER, backgroundColor: SURFACE },
  submitButton: { height: 47, borderRadius: 13, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  submitButtonDisabled: { opacity: 0.45 },
  submitButtonText: { color: SURFACE, fontSize: 11, fontWeight: "800", marginLeft: 7 },
});