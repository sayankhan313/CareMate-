import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Pill,
  RefreshCw,
  ShieldCheck,
} from "lucide-react-native";

import {
  doctorMedicineReviewsApi,
  type DoctorPoolMedicineReview,
} from "../../services/doctor/doctorMedicineReviewsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "DoctorMedicineReviewPool">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_DARK = "#134E4A";
const DOCTOR_LIGHT = "#E6FFFA";
const WARNING = "#F6A545";
const WARNING_DARK = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";
const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";
const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const formatDateTime = (value?: string | null) => {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatText = (value?: string | null) => {
  if (!value) return "Not available";
  return value.toLowerCase().split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
};

export const DoctorMedicineReviewPoolScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();

  const [reviews, setReviews] = useState<DoctorPoolMedicineReview[]>([]);
  const [summary, setSummary] = useState({ total: 0, awaitingReview: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReviews = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await doctorMedicineReviewsApi.listPoolReviews();

      setReviews(result.reviews || []);
      setSummary(result.summary || { total: 0, awaitingReview: 0, completed: 0 });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load pool medicine reviews.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadReviews("initial");
    }, [loadReviews])
  );

  const openReview = (review: DoctorPoolMedicineReview) => {
    navigation.navigate("DoctorMedicineReviewPoolDetail", { requestId: review.id });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.84} onPress={() => navigation.goBack()}>
            <ArrowLeft size={21} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.appBarText}>
            <Text style={styles.title}>Pool Medicine Reviews</Text>
            <Text style={styles.subtitle}>Reviews assigned specifically to you</Text>
          </View>

          <TouchableOpacity style={styles.refreshButton} activeOpacity={0.84} onPress={() => void loadReviews("refresh")}>
            <RefreshCw size={20} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 32, 48) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadReviews("refresh")}
              tintColor={DOCTOR_PRIMARY}
              colors={[DOCTOR_PRIMARY]}
            />
          }
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <ShieldCheck size={25} color={DOCTOR_PRIMARY} strokeWidth={2.7} />
              </View>

              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Restricted access</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>Medicine Review Doctor Pool</Text>

            <Text style={styles.heroText}>
              Only medicine reviews assigned to your account by an administrator appear here. This does not give access to the patient's full record.
            </Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.awaitingReview}</Text>
                <Text style={styles.summaryLabel}>Awaiting review</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.completed}</Text>
                <Text style={styles.summaryLabel}>Returned to admin</Text>
              </View>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Unable to load reviews</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity style={styles.retryButton} activeOpacity={0.84} onPress={() => void loadReviews("initial")}>
                <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Assigned to you</Text>
            <Text style={styles.sectionCount}>{reviews.length}</Text>
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={DOCTOR_PRIMARY} />
              <Text style={styles.stateTitle}>Loading assigned reviews...</Text>
            </View>
          ) : reviews.length === 0 ? (
            <View style={styles.stateCard}>
              <View style={styles.emptyIcon}>
                <Pill size={28} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
              </View>

              <Text style={styles.stateTitle}>No pool reviews assigned</Text>

              <Text style={styles.stateText}>
                Medicine reviews will appear here only when an administrator specifically assigns them to you.
              </Text>
            </View>
          ) : (
            reviews.map(review => (
              <TouchableOpacity key={review.id} style={styles.reviewCard} activeOpacity={0.86} onPress={() => openReview(review)}>
                <View
                  style={[
                    styles.reviewIcon,
                    { backgroundColor: review.routingStatus === "POOL_ASSIGNED" ? WARNING_LIGHT : SUCCESS_LIGHT },
                  ]}
                >
                  {review.routingStatus === "POOL_ASSIGNED" ? (
                    <Clock3 size={22} color={WARNING_DARK} strokeWidth={2.6} />
                  ) : (
                    <CheckCircle2 size={22} color={SUCCESS_DARK} strokeWidth={2.6} />
                  )}
                </View>

                <View style={styles.reviewContent}>
                  <View style={styles.reviewTitleRow}>
                    <Text style={styles.medicineName} numberOfLines={1}>{review.medicine.name}</Text>

                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: review.routingStatus === "POOL_ASSIGNED" ? WARNING_LIGHT : SUCCESS_LIGHT },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: review.routingStatus === "POOL_ASSIGNED" ? WARNING_DARK : SUCCESS_DARK },
                        ]}
                      >
                        {review.routingStatus === "POOL_ASSIGNED" ? "Awaiting" : "Returned"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.medicineDose}>{review.medicine.dose}</Text>

                  <Text style={styles.patientReference}>
                    {review.clinicalContext.patientReference}
                  </Text>

                  <Text style={styles.metaText}>
                    {formatText(review.requestType === "DELETE" ? "REMOVAL_REVIEW" : "MEDICINE_REVIEW")}
                  </Text>

                  <Text style={styles.dateText}>
                    {review.routingStatus === "POOL_ASSIGNED"
                      ? `Assigned ${formatDateTime(review.poolAssignedAt)}`
                      : `Completed ${formatDateTime(review.poolReviewedAt)}`}
                  </Text>
                </View>

                <ChevronRight size={20} color={MUTED} strokeWidth={2.5} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default DoctorMedicineReviewPoolScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },

  appBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    ...elevate(1),
  },

  appBarText: { flex: 1, paddingHorizontal: 12 },
  title: { color: TEXT, fontSize: 21, fontWeight: "700" },
  subtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 2 },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    ...elevate(1),
  },

  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4 },

  heroCard: {
    backgroundColor: DOCTOR_PRIMARY,
    borderRadius: 17,
    padding: 16,
    marginBottom: 18,
    ...elevate(2),
  },

  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },

  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  heroBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  heroTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "700", marginTop: 14 },

  heroText: {
    color: "#D7FFFA",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 5,
  },

  summaryRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 13,
    marginTop: 14,
    paddingVertical: 11,
  },

  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { color: "#FFFFFF", fontSize: 19, fontWeight: "700" },
  summaryLabel: { color: "#D7FFFA", fontSize: 10, fontWeight: "600", marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.24)" },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "700" },
  sectionCount: { color: DOCTOR_PRIMARY, fontSize: 12, fontWeight: "700" },

  reviewCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    ...elevate(1),
  },

  reviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  reviewContent: { flex: 1 },

  reviewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  medicineName: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginRight: 6,
  },

  medicineDose: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 2 },

  patientReference: {
    color: DOCTOR_PRIMARY,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },

  metaText: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 3 },
  dateText: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 4 },

  statusChip: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  statusText: { fontSize: 9, fontWeight: "700" },

  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    ...elevate(1),
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 10 },

  stateText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5,
  },

  errorCard: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },

  errorTitle: { color: DANGER, fontSize: 14, fontWeight: "700" },
  errorText: { color: DANGER, fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 4 },

  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: DOCTOR_PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", marginLeft: 6 },
});