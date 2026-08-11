import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StackActions, useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Clock3, FileText, RefreshCw, ShieldAlert, ShieldCheck, Stethoscope } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { doctorReportsApi, type DoctorPatientReport, type DoctorReportReviewStatus } from "../../services/doctor/doctorReportsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "DoctorPatientReports">;
type ReportFilter = "ALL" | DoctorReportReviewStatus;

type RuntimeReport = DoctorPatientReport & {
  reportId?: string;
  report?: {
    id?: string;
  };
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";
const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_PRIMARY_DARK = "#115E59";
const DOCTOR_PRIMARY_LIGHT = "#DDF4F0";
const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";
const WARNING = "#F6A545";
const WARNING_DARK = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const FILTERS: { label: string; value: ReportFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Reviewed", value: "REVIEWED" },
];

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const getSafeString = (value: unknown) => typeof value === "string" ? value.trim() : "";

const resolveReportId = (report: RuntimeReport) => getSafeString(report.id) || getSafeString(report.reportId) || getSafeString(report.report?.id);

const formatLabel = (value?: string | null) => {
  const safeValue = getSafeString(value);
  if (!safeValue) return "Medical Report";
  return safeValue.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const formatFileSize = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const getReviewTone = (status: DoctorReportReviewStatus) => {
  if (status === "REVIEWED") return { background: SUCCESS_LIGHT, text: SUCCESS_DARK, accent: SUCCESS, label: "Reviewed" };
  return { background: WARNING_LIGHT, text: WARNING_DARK, accent: WARNING, label: "Pending" };
};

const getSafetyTone = (status: DoctorPatientReport["contentSafetyStatus"]) => {
  if (status === "BLOCKED") return { background: DANGER_LIGHT, text: DANGER_DARK, label: "Blocked", Icon: ShieldAlert };
  if (status === "CLEAR") return { background: SUCCESS_LIGHT, text: SUCCESS_DARK, label: "Checked", Icon: ShieldCheck };
  return { background: WARNING_LIGHT, text: WARNING_DARK, label: "Manual review", Icon: AlertTriangle };
};

export const DoctorPatientReportsScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const patientId = getSafeString(route.params?.patientId);
  const patientName = getSafeString(route.params?.patientName) || "Patient";

  const [reports, setReports] = useState<DoctorPatientReport[]>([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, reviewed: 0, blocked: 0 });
  const [selectedFilter, setSelectedFilter] = useState<ReportFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const visibleReports = useMemo(() => {
    if (selectedFilter === "ALL") return reports;
    return reports.filter((report) => (report.review?.status || "PENDING") === selectedFilter);
  }, [reports, selectedFilter]);

  const loadReports = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!patientId) {
      setReports([]);
      setIsLoading(false);
      setIsRefreshing(false);
      setErrorMessage("Patient ID is missing. Please reopen this patient from Assigned Patients.");
      return;
    }

    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const result = await doctorReportsApi.listPatientReports(patientId);
      const receivedReports = Array.isArray(result?.reports) ? result.reports : [];

      const correctedReports = receivedReports.map((report) => {
        const runtimeReport = report as RuntimeReport;
        return { ...report, id: resolveReportId(runtimeReport) };
      });

      const validReports = correctedReports.filter((report) => Boolean(getSafeString(report.id)));
      const pending = validReports.filter((report) => report.review?.status !== "REVIEWED").length;
      const reviewed = validReports.filter((report) => report.review?.status === "REVIEWED").length;
      const blocked = validReports.filter((report) => report.contentSafetyStatus === "BLOCKED").length;

      setReports(validReports);
      setSummary({ total: validReports.length, pending, reviewed, blocked });
    } catch (error) {
      setReports([]);
      setSummary({ total: 0, pending: 0, reviewed: 0, blocked: 0 });
      setErrorMessage(error instanceof Error ? error.message : "Unable to load patient reports.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [patientId]);

  useFocusEffect(useCallback(() => {
    void loadReports("initial");
  }, [loadReports]));

  const openReport = (report: DoctorPatientReport) => {
    const runtimeReport = report as RuntimeReport;
    const resolvedReportId = resolveReportId(runtimeReport);
    const resolvedPatientId = getSafeString(report.patientId) || getSafeString(report.patient?.id) || patientId;
    const resolvedPatientName = getSafeString(report.patient?.fullName) || patientName;

    if (!resolvedPatientId) {
      Alert.alert("Unable to open report", "Patient ID is missing. Please reopen this patient from Assigned Patients.");
      return;
    }

    if (!resolvedReportId) {
      Alert.alert("Unable to open report", "The backend did not return the medical report ID.");
      return;
    }

    navigation.dispatch(StackActions.push("DoctorReportReview", { patientId: resolvedPatientId, patientName: resolvedPatientName, reportId: resolvedReportId }));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} activeOpacity={0.84} onPress={() => navigation.goBack()}>
            <ArrowLeft size={21} color={TEXT} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>Medical Reports</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{patientName}</Text>
          </View>

          <TouchableOpacity style={styles.headerButton} activeOpacity={0.84} onPress={() => void loadReports("refresh")}>
            <RefreshCw size={20} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(32, insets.bottom + 24) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadReports("refresh")} tintColor={DOCTOR_PRIMARY} colors={[DOCTOR_PRIMARY]} />}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIcon}>
                <FileText size={27} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
              </View>

              <View style={styles.summaryTextBlock}>
                <Text style={styles.summaryTitle}>Report reviews</Text>
                <Text style={styles.summaryText}>Review protected reports uploaded by this patient.</Text>
              </View>
            </View>

            <View style={styles.summaryStats}>
              <SummaryItem value={summary.total} label="Total" />
              <SummaryItem value={summary.pending} label="Pending" />
              <SummaryItem value={summary.reviewed} label="Reviewed" />
              <SummaryItem value={summary.blocked} label="Blocked" />
            </View>
          </View>

          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
            {FILTERS.map((filter) => {
              const selected = selectedFilter === filter.value;

              return (
                <TouchableOpacity key={filter.value} style={[styles.filterChip, selected ? styles.filterChipSelected : undefined]} activeOpacity={0.84} onPress={() => setSelectedFilter(filter.value)}>
                  <Text style={[styles.filterText, selected ? styles.filterTextSelected : undefined]}>{filter.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <AlertTriangle size={22} color={DANGER_DARK} strokeWidth={2.6} />

              <View style={styles.errorTextBlock}>
                <Text style={styles.errorTitle}>Unable to load reports</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            </View>
          ) : null}

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={DOCTOR_PRIMARY} />
              <Text style={styles.stateTitle}>Loading reports...</Text>
              <Text style={styles.stateText}>Fetching protected patient report records.</Text>
            </View>
          ) : visibleReports.length === 0 ? (
            <View style={styles.stateCard}>
              <View style={styles.emptyIcon}>
                <FileText size={29} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
              </View>

              <Text style={styles.stateTitle}>No reports found</Text>
              <Text style={styles.stateText}>Patient reports matching this filter will appear here.</Text>
            </View>
          ) : (
            visibleReports.map((report, index) => <ReportCard key={getSafeString(report.id) || `report-${index}`} report={report} onOpen={() => openReport(report)} />)
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const SummaryItem = ({ value, label }: { value: number; label: string }) => (
  <View style={styles.summaryItem}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const ReportCard = ({ report, onOpen }: { report: DoctorPatientReport; onOpen: () => void }) => {
  const reviewStatus = report.review?.status || "PENDING";
  const reviewTone = getReviewTone(reviewStatus);
  const safetyTone = getSafetyTone(report.contentSafetyStatus);
  const SafetyIcon = safetyTone.Icon;

  return (
    <View style={styles.reportCard}>
      <View style={[styles.reportAccent, { backgroundColor: reviewTone.accent }]} />

      <View style={styles.reportHeader}>
        <View style={[styles.reportIcon, { backgroundColor: reviewTone.background }]}>
          <FileText size={24} color={reviewTone.text} strokeWidth={2.6} />
        </View>

        <View style={styles.reportTextBlock}>
          <Text style={styles.reportTitle} numberOfLines={1}>{getSafeString(report.title) || "Medical Report"}</Text>
          <Text style={styles.reportCategory}>{formatLabel(report.category)}</Text>
        </View>

        <View style={[styles.reviewBadge, { backgroundColor: reviewTone.background }]}>
          {reviewStatus === "REVIEWED" ? <CheckCircle2 size={14} color={reviewTone.text} strokeWidth={2.7} /> : <Clock3 size={14} color={reviewTone.text} strokeWidth={2.7} />}
          <Text style={[styles.reviewBadgeText, { color: reviewTone.text }]}>{reviewTone.label}</Text>
        </View>
      </View>

      <View style={styles.reportInformation}>
        <View style={styles.informationRow}>
          <Text style={styles.informationLabel}>Report date</Text>
          <Text style={styles.informationValue}>{formatDate(report.reportDate)}</Text>
        </View>

        <View style={styles.informationRow}>
          <Text style={styles.informationLabel}>File</Text>
          <Text style={styles.informationValue} numberOfLines={1}>{formatFileSize(report.fileSize)} · {getSafeString(report.originalFileName) || "Medical report"}</Text>
        </View>
      </View>

      <View style={styles.reportFooter}>
        <View style={[styles.safetyBadge, { backgroundColor: safetyTone.background }]}>
          <SafetyIcon size={15} color={safetyTone.text} strokeWidth={2.5} />
          <Text style={[styles.safetyText, { color: safetyTone.text }]}>{safetyTone.label}</Text>
        </View>
      </View>

      {report.review?.reviewNote ? (
        <View style={styles.reviewPreview}>
          <Stethoscope size={17} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
          <Text style={styles.reviewPreviewText} numberOfLines={2}>{report.review.reviewNote}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.openReportButton} activeOpacity={0.82} onPress={onOpen}>
        <Text style={styles.openReportButtonText}>{reviewStatus === "REVIEWED" ? "View Review" : "Open Report"}</Text>
        <ChevronRight size={19} color={SURFACE} strokeWidth={2.7} />
      </TouchableOpacity>
    </View>
  );
};

export default DoctorPatientReportsScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 13, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", ...elevate(1) },
  headerTextBlock: { flex: 1, paddingHorizontal: 11 },
  headerTitle: { color: TEXT, fontSize: 23, fontWeight: "700" },
  headerSubtitle: { color: MUTED, fontSize: 12, fontWeight: "500", marginTop: 3 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 3 },
  summaryCard: { backgroundColor: DOCTOR_PRIMARY, borderRadius: 17, padding: 16, ...elevate(2) },
  summaryHeader: { flexDirection: "row", alignItems: "center" },
  summaryIcon: { width: 54, height: 54, borderRadius: 15, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  summaryTextBlock: { flex: 1 },
  summaryTitle: { color: SURFACE, fontSize: 18, fontWeight: "700" },
  summaryText: { color: "#D9F3EF", fontSize: 12, fontWeight: "500", lineHeight: 18, marginTop: 4 },
  summaryStats: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 13, flexDirection: "row", marginTop: 15, paddingVertical: 11 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { color: SURFACE, fontSize: 18, fontWeight: "700" },
  summaryLabel: { color: "#D9F3EF", fontSize: 9, fontWeight: "600", marginTop: 2 },
  filtersRow: { paddingTop: 15, paddingBottom: 14, paddingRight: 12 },
  filterChip: { minHeight: 38, borderRadius: 10, backgroundColor: SURFACE, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", marginRight: 8, ...elevate(1) },
  filterChipSelected: { backgroundColor: DOCTOR_PRIMARY_LIGHT },
  filterText: { color: MUTED, fontSize: 11, fontWeight: "600" },
  filterTextSelected: { color: DOCTOR_PRIMARY_DARK, fontWeight: "700" },
  errorCard: { backgroundColor: DANGER_LIGHT, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  errorTextBlock: { flex: 1, marginLeft: 10 },
  errorTitle: { color: DANGER_DARK, fontSize: 13, fontWeight: "700" },
  errorText: { color: DANGER_DARK, fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 4 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 25, alignItems: "center", ...elevate(1) },
  emptyIcon: { width: 58, height: 58, borderRadius: 17, backgroundColor: DOCTOR_PRIMARY_LIGHT, alignItems: "center", justifyContent: "center" },
  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 11 },
  stateText: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, textAlign: "center", marginTop: 5 },
  reportCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 14, paddingLeft: 18, marginBottom: 12, overflow: "hidden", ...elevate(1) },
  reportAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  reportHeader: { flexDirection: "row", alignItems: "center" },
  reportIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 10 },
  reportTextBlock: { flex: 1 },
  reportTitle: { color: TEXT, fontSize: 15, fontWeight: "700" },
  reportCategory: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },
  reviewBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", alignItems: "center", marginLeft: 8 },
  reviewBadgeText: { fontSize: 9, fontWeight: "700", marginLeft: 4 },
  reportInformation: { backgroundColor: SOFT_PANEL, borderRadius: 12, padding: 10, marginTop: 12 },
  informationRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  informationLabel: { width: 78, color: MUTED, fontSize: 10, fontWeight: "600" },
  informationValue: { flex: 1, color: TEXT, fontSize: 10, fontWeight: "600", textAlign: "right" },
  reportFooter: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  safetyBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", alignItems: "center" },
  safetyText: { fontSize: 9, fontWeight: "700", marginLeft: 5 },
  reviewPreview: { backgroundColor: DOCTOR_PRIMARY_LIGHT, borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "flex-start", marginTop: 11 },
  reviewPreviewText: { flex: 1, color: DOCTOR_PRIMARY_DARK, fontSize: 11, fontWeight: "500", lineHeight: 17, marginLeft: 8 },
  openReportButton: { minHeight: 46, borderRadius: 12, backgroundColor: DOCTOR_PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 12 },
  openReportButtonText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginRight: 5 },
});