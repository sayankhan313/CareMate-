import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  RefreshCw,
  Stethoscope,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "../../constants/api";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type SelectDoctorScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "SelectDoctor"
>;

type ApprovedDoctor = {
  id: string;
  fullName: string;
  email: string;
  specialization: string | null;
  clinicName: string | null;
  clinicAddress: string | null;
  yearsExperience: number | null;
  bio: string | null;
  isAssigned: boolean;
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";

const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#3F6FD0";
const PRIMARY_LIGHT = "#EEF4FF";

const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";

const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

export const SelectDoctorScreen = ({
  navigation,
}: SelectDoctorScreenProps) => {
  const [doctors, setDoctors] = useState<ApprovedDoctor[]>([]);
  const [assignedDoctorId, setAssignedDoctorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const resetToLogin = useCallback(async () => {
    await tokenStorage.removeToken();

    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  }, [navigation]);

  const loadDoctors = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const token = await tokenStorage.getToken();

        if (!token) {
          await resetToLogin();
          return;
        }

        const response = await fetch(`${API_BASE_URL}/patient/doctors`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        let result: any = {};

        try {
          result = await response.json();
        } catch {
          result = {};
        }

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load doctors.");
        }

        setDoctors(result.data?.doctors || []);
        setAssignedDoctorId(result.data?.assignedDoctorId || null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load doctors.";

        setErrorMessage(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [resetToLogin]
  );

  useFocusEffect(
    useCallback(() => {
      loadDoctors("initial");
    }, [loadDoctors])
  );

  const assignDoctor = async (doctor: ApprovedDoctor) => {
    if (selectedDoctorId) {
      return;
    }

    try {
      setSelectedDoctorId(doctor.id);

      const token = await tokenStorage.getToken();

      if (!token) {
        await resetToLogin();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/patient/doctor-assignment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorId: doctor.id,
        }),
      });

      let result: any = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to assign doctor.");
      }

      setAssignedDoctorId(doctor.id);
      setDoctors((currentDoctors) =>
        currentDoctors.map((currentDoctor) => ({
          ...currentDoctor,
          isAssigned: currentDoctor.id === doctor.id,
        }))
      );

      Alert.alert(
        "Doctor selected",
        `Dr. ${doctor.fullName} has been assigned as your doctor.`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to assign doctor.";

      Alert.alert("Unable to select doctor", message);
    } finally {
      setSelectedDoctorId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={21} color={TEXT} strokeWidth={2.6} />
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>Select Doctor</Text>
          <Text style={styles.subtitle}>
            Choose an approved doctor for consultations and safety alerts
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadDoctors("refresh")}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={styles.stateText}>Loading approved doctors...</Text>
          </View>
        ) : null}

        {!isLoading && errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to load doctors</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.85}
              onPress={() => loadDoctors("initial")}
            >
              <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!isLoading && !errorMessage && doctors.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.emptyIcon}>
              <Stethoscope size={28} color={PRIMARY} strokeWidth={2.6} />
            </View>
            <Text style={styles.emptyTitle}>No approved doctors yet</Text>
            <Text style={styles.emptyText}>
              Once admin approves doctor accounts, they will appear here.
            </Text>
          </View>
        ) : null}

        {!isLoading && !errorMessage
          ? doctors.map((doctor) => {
              const isAssigned =
                doctor.isAssigned || assignedDoctorId === doctor.id;
              const isAssigning = selectedDoctorId === doctor.id;

              return (
                <View key={doctor.id} style={styles.doctorCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.doctorIcon}>
                      <Stethoscope
                        size={23}
                        color={PRIMARY}
                        strokeWidth={2.6}
                      />
                    </View>

                    <View style={styles.doctorTextBlock}>
                      <Text style={styles.doctorName} numberOfLines={1}>
                        Dr. {doctor.fullName}
                      </Text>
                      <Text style={styles.specialization} numberOfLines={1}>
                        {doctor.specialization || "General Practitioner"}
                      </Text>
                    </View>

                    {isAssigned ? (
                      <View style={styles.assignedBadge}>
                        <CheckCircle2
                          size={14}
                          color="#167A58"
                          strokeWidth={2.6}
                        />
                        <Text style={styles.assignedText}>Assigned</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.infoPanel}>
                    <Text style={styles.infoText}>
                      {doctor.clinicName || "Clinic not added"}
                    </Text>

                    <View style={styles.locationRow}>
                      <MapPin size={14} color={MUTED} strokeWidth={2.3} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {doctor.clinicAddress || "Address not added"}
                      </Text>
                    </View>

                    {doctor.bio ? (
                      <Text style={styles.bioText} numberOfLines={2}>
                        {doctor.bio}
                      </Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.assignButton,
                      isAssigned ? styles.assignedButton : undefined,
                      isAssigning ? styles.disabledButton : undefined,
                    ]}
                    activeOpacity={0.88}
                    onPress={() => assignDoctor(doctor)}
                    disabled={isAssigned || Boolean(selectedDoctorId)}
                  >
                    {isAssigning ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.assignButtonText,
                          isAssigned ? styles.assignedButtonText : undefined,
                        ]}
                      >
                        {isAssigned ? "Currently Assigned" : "Select Doctor"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  appBar: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  stateText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    textAlign: "center",
  },
  errorCard: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  errorTitle: {
    color: "#B42318",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 5,
  },
  errorText: {
    color: "#B42318",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: DANGER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 7,
  },
  doctorCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  doctorTextBlock: {
    flex: 1,
  },
  doctorName: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
  },
  specialization: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  assignedBadge: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  assignedText: {
    color: "#167A58",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 4,
  },
  infoPanel: {
    backgroundColor: "#F7F9FF",
    borderRadius: 14,
    padding: 12,
    marginTop: 13,
  },
  infoText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  locationText: {
    flex: 1,
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
  },
  bioText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 8,
  },
  assignButton: {
    height: 46,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },
  assignedButton: {
    backgroundColor: SUCCESS_LIGHT,
  },
  disabledButton: {
    opacity: 0.65,
  },
  assignButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  assignedButtonText: {
    color: "#167A58",
  },
});