import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
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
  CalendarDays,
  ChevronRight,
  FileCheck2,
  FileText,
  Hash,
  RefreshCw,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  pharmacyExemptionApi,
  type PharmacyExemptionReviewListItem,
  type PharmacyExemptionStatus,
  type PharmacyExemptionType,
} from "../../services/pharmacy/pharmacy-exemption.api";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PharmacyExemptionReviews">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";

const PRIMARY = "#15803D";
const PRIMARY_DARK = "#14532D";
const PRIMARY_LIGHT = "#ECFDF3";

const BLUE = "#315FBA";
const BLUE_LIGHT = "#EEF4FF";

const WARNING = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const SUCCESS = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const formatDate = (value?: string | null) => {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatType = (type: PharmacyExemptionType) => {
  const labels: Record<PharmacyExemptionType, string> = {
    AGE_BASED: "Age based",
    MEDICAL_EXEMPTION: "Medical exemption",
    MATERNITY_EXEMPTION: "Maternity exemption",
    LOW_INCOME_HC2: "Low income / HC2",
    UNIVERSAL_CREDIT: "Universal Credit",
    PPC: "Prescription Prepayment Certificate",
    OTHER: "Other exemption",
  };

  return labels[type];
};

const isExpired = (value?: string | null) => {
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
};

const getStatusTone = (status: PharmacyExemptionStatus) => {
  if (status === "VERIFIED") {
    return {
      background: SUCCESS_LIGHT,
      color: SUCCESS,
      label: "Verified",
    };
  }

  if (status === "REJECTED") {
    return {
      background: DANGER_LIGHT,
      color: DANGER,
      label: "Rejected",
    };
  }

  return {
    background: WARNING_LIGHT,
    color: WARNING,
    label: "Pending review",
  };
};

export const PharmacyExemptionReviewsScreen = ({
  navigation,
  route,
}: Props) => {
  const insets = useSafeAreaInsets();

  const [selectedStatus, setSelectedStatus] = useState<PharmacyExemptionStatus>(
    route.params?.status || "PENDING"
  );
  const [reviews, setReviews] = useState<PharmacyExemptionReviewListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReviews = useCallback(
    async (
      mode: "initial" | "refresh" = "initial",
      status = selectedStatus
    ) => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        }

        if (mode === "refresh") {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const result = await pharmacyExemptionApi.getExemptionReviews({
          status,
          limit: 100,
        });

        setReviews(result.reviews || []);
        setTotal(result.total || 0);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load exemption reviews."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedStatus]
  );

  useFocusEffect(
    useCallback(() => {
      void loadReviews("initial");
    }, [loadReviews])
  );

  const changeStatus = (status: PharmacyExemptionStatus) => {
    if (status === selectedStatus) {
      return;
    }

    setSelectedStatus(status);
    void loadReviews("initial", status);
  };

  const openReview = (review: PharmacyExemptionReviewListItem) => {
    navigation.navigate("PharmacyExemptionReview", {
      evidenceId: review.id,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.84}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={21} color={TEXT} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Exemption reviews</Text>
            <Text style={styles.headerSubtitle}>
              Review patient exemption and PPC evidence
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: Math.max(insets.bottom + 32, 48),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadReviews("refresh")}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <ShieldCheck size={25} color={PRIMARY} strokeWidth={2.6} />
            </View>

            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>Current queue</Text>
              <Text style={styles.summaryValue}>
                {total} {total === 1 ? "review" : "reviews"}
              </Text>
            </View>

            <View style={styles.secureBadge}>
              <FileCheck2 size={14} color={PRIMARY_DARK} strokeWidth={2.5} />
              <Text style={styles.secureBadgeText}>Protected</Text>
            </View>
          </View>

          <View style={styles.tabs}>
            <StatusTab
              label="Pending"
              selected={selectedStatus === "PENDING"}
              onPress={() => changeStatus("PENDING")}
            />

            <StatusTab
              label="Verified"
              selected={selectedStatus === "VERIFIED"}
              onPress={() => changeStatus("VERIFIED")}
            />

            <StatusTab
              label="Rejected"
              selected={selectedStatus === "REJECTED"}
              onPress={() => changeStatus("REJECTED")}
            />
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading exemption reviews</Text>
              <Text style={styles.stateText}>
                Checking evidence assigned to this pharmacy.
              </Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <RefreshCw size={26} color={DANGER} strokeWidth={2.5} />
              <Text style={styles.errorTitle}>Reviews unavailable</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                activeOpacity={0.84}
                onPress={() => void loadReviews("initial")}
              >
                <RefreshCw size={16} color={SURFACE} strokeWidth={2.5} />
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoading && !errorMessage && reviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <FileText size={26} color={PRIMARY} strokeWidth={2.5} />
              </View>

              <Text style={styles.emptyTitle}>
                No {selectedStatus.toLowerCase()} reviews
              </Text>

              <Text style={styles.emptyText}>
                Evidence matching this review status will appear here.
              </Text>
            </View>
          ) : null}

          {!isLoading && !errorMessage
            ? reviews.map(review => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onPress={() => openReview(review)}
                />
              ))
            : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const StatusTab = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.tab, selected ? styles.tabSelected : undefined]}
    activeOpacity={0.84}
    onPress={onPress}
  >
    <Text style={[styles.tabText, selected ? styles.tabTextSelected : undefined]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const ReviewCard = ({
  review,
  onPress,
}: {
  review: PharmacyExemptionReviewListItem;
  onPress: () => void;
}) => {
  const tone = getStatusTone(review.status);
  const expired = isExpired(review.expiresAt);

  return (
    <TouchableOpacity
      style={styles.reviewCard}
      activeOpacity={0.84}
      onPress={onPress}
    >
      <View style={styles.reviewHeader}>
        <View style={styles.patientIcon}>
          <UserRound size={21} color={PRIMARY} strokeWidth={2.5} />
        </View>

        <View style={styles.patientText}>
          <Text style={styles.patientName} numberOfLines={1}>
            {review.patient.fullName}
          </Text>

          <Text style={styles.patientEmail} numberOfLines={1}>
            {review.patient.email}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: tone.background,
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              {
                color: tone.color,
              },
            ]}
          >
            {tone.label}
          </Text>
        </View>
      </View>

      <View style={styles.claimPanel}>
        <View style={styles.claimIcon}>
          <ShieldCheck size={20} color={PRIMARY_DARK} strokeWidth={2.5} />
        </View>

        <View style={styles.claimText}>
          <Text style={styles.claimType} numberOfLines={1}>
            {formatType(review.exemptionType)}
          </Text>

          <Text style={styles.claimPreference}>
            {review.chargePreference} · {review.documentCount}{" "}
            {review.documentCount === 1 ? "document" : "documents"}
          </Text>
        </View>

        <ChevronRight size={19} color={MUTED} strokeWidth={2.4} />
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <Hash size={14} color={MUTED} strokeWidth={2.4} />

          <View style={styles.metaText}>
            <Text style={styles.metaLabel}>Reference</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {review.referenceNumber || "Not provided"}
            </Text>
          </View>
        </View>

        <View style={styles.metaItem}>
          {expired ? (
            <XCircle size={14} color={DANGER} strokeWidth={2.4} />
          ) : (
            <CalendarDays size={14} color={MUTED} strokeWidth={2.4} />
          )}

          <View style={styles.metaText}>
            <Text style={styles.metaLabel}>Expires</Text>
            <Text
              style={[
                styles.metaValue,
                expired ? styles.expiredValue : undefined,
              ]}
              numberOfLines={1}
            >
              {formatDate(review.expiresAt)}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.submittedText}>
        Submitted {formatDate(review.createdAt)}
      </Text>
    </TouchableOpacity>
  );
};

export default PharmacyExemptionReviewsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    ...elevate(1),
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    color: TEXT,
    fontSize: 21,
    fontWeight: "700",
  },

  headerSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
  },

  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(1),
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  summaryText: {
    flex: 1,
  },

  summaryLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
  },

  summaryValue: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 2,
  },

  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  secureBadgeText: {
    color: PRIMARY_DARK,
    fontSize: 8,
    fontWeight: "700",
    marginLeft: 4,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderRadius: 13,
    padding: 4,
    marginTop: 13,
    marginBottom: 13,
    ...elevate(1),
  },

  tab: {
    flex: 1,
    minHeight: 39,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  tabSelected: {
    backgroundColor: PRIMARY,
  },

  tabText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },

  tabTextSelected: {
    color: SURFACE,
  },

  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    ...elevate(1),
  },

  stateTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 11,
  },

  stateText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    textAlign: "center",
    marginTop: 4,
  },

  errorCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    ...elevate(1),
  },

  errorTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },

  errorText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5,
  },

  retryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },

  retryText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    ...elevate(1),
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },

  emptyText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5,
  },

  reviewCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 11,
    ...elevate(1),
  },

  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  patientIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  patientText: {
    flex: 1,
    minWidth: 0,
  },

  patientName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },

  patientEmail: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 3,
  },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 8,
  },

  statusBadgeText: {
    fontSize: 8,
    fontWeight: "700",
  },

  claimPanel: {
    backgroundColor: BLUE_LIGHT,
    borderRadius: 13,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  claimIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  claimText: {
    flex: 1,
    minWidth: 0,
  },

  claimType: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },

  claimPreference: {
    color: BLUE,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 3,
  },

  metaGrid: {
    flexDirection: "row",
    marginTop: 11,
  },

  metaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  metaText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 6,
  },

  metaLabel: {
    color: MUTED,
    fontSize: 7,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  metaValue: {
    color: TEXT,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },

  expiredValue: {
    color: DANGER,
  },

  submittedText: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "600",
    marginTop: 10,
  },
});