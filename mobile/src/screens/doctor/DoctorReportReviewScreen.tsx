import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileImage, FileText, RefreshCw, Send, ShieldAlert, ShieldCheck } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { doctorReportsApi, type DoctorPatientReport } from "../../services/doctor/doctorReportsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "DoctorReportReview">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";
const BORDER = "#E4E8F2";
const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_DARK = "#115E59";
const DOCTOR_LIGHT = "#DDF4F0";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";
const WARNING = "#F6A545";
const WARNING_DARK = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";
const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const getSafeString = (value: unknown) => typeof value === "string" ? value.trim() : "";

const formatLabel = (value?: string | null) => {
  const safeValue = getSafeString(value);
  if (!safeValue) return "Medical Report";
  return safeValue.toLowerCase().split("_").map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");
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

const getInitials = (name?: string | null) => {
  const safeName = getSafeString(name);
  if (!safeName) return "PT";
  const parts = safeName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const DoctorReportReviewScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const patientId = getSafeString(route.params?.patientId);
  const patientName = getSafeString(route.params?.patientName) || "Patient";
  const reportId = getSafeString(route.params?.reportId);

  const [report, setReport] = useState<DoctorPatientReport | null>(null);
  const [imageDataUri, setImageDataUri] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [imageErrorMessage, setImageErrorMessage] = useState("");

  const loadReport = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!patientId || !reportId) {
      setErrorMessage("Patient ID or report ID is missing. Please reopen this report.");
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");
      setImageErrorMessage("");

      const reportData = await doctorReportsApi.getReportDetail(patientId, reportId);
      setReport(reportData);
      setReviewNote(reportData.review?.reviewNote || "");

      const isImage = getSafeString(reportData.mimeType).toLowerCase().startsWith("image/");

      if (isImage) {
        try {
          setIsImageLoading(true);
          const dataUri = await doctorReportsApi.getReportImageDataUri(patientId, reportId);
          setImageDataUri(dataUri);
        } catch (error) {
          setImageDataUri("");
          setImageErrorMessage(error instanceof Error ? error.message : "Unable to load report image.");
        } finally {
          setIsImageLoading(false);
        }
      } else {
        setImageDataUri("");
        setImageErrorMessage(`Image preview is unavailable for ${reportData.mimeType || "this file type"}.`);
      }
    } catch (error) {
      setReport(null);
      setImageDataUri("");
      setErrorMessage(error instanceof Error ? error.message : "Unable to load report.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [patientId, reportId]);

  useFocusEffect(useCallback(() => {
    void loadReport("initial");
  }, [loadReport]));

  const submitReview = async () => {
    const trimmedNote = reviewNote.trim();

    if (trimmedNote.length < 2) {
      Alert.alert("Review note required", "Please enter at least 2 characters.");
      return;
    }

    if (!patientId || !reportId) {
      Alert.alert("Unable to submit", "Patient ID or report ID is missing.");
      return;
    }

    try {
      setIsSubmitting(true);

      const updatedReport = await doctorReportsApi.reviewReport(patientId, reportId, { reviewNote: trimmedNote });
      setReport(updatedReport);
      setReviewNote(updatedReport.review?.reviewNote || trimmedNote);

      Alert.alert(
        "Review submitted",
        "The report has been marked as reviewed.",
        [
          {
            text: "Done",
            onPress: () =>
              navigation.reset({
                index: 1,
                routes: [
                  { name: "DoctorTabs" },
                  { name: "DoctorReportReviews" },
                ],
              }),
          },
        ],
      );
    } catch (error) {
      Alert.alert("Unable to submit review", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReviewed = report?.review?.status === "REVIEWED";
  const contentSafetyStatus = report?.contentSafetyStatus;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} activeOpacity={0.84} onPress={() => navigation.goBack()}>
            <ArrowLeft size={21} color={TEXT} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>Review Report</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{patientName}</Text>
          </View>

          <TouchableOpacity style={styles.headerButton} activeOpacity={0.84} onPress={() => void loadReport("refresh")}>
            <RefreshCw size={20} color={DOCTOR_PRIMARY} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(32, insets.bottom + 24) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadReport("refresh")} tintColor={DOCTOR_PRIMARY} colors={[DOCTOR_PRIMARY]} />}
        >
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="large" color={DOCTOR_PRIMARY} />
              <Text style={styles.stateTitle}>Loading report</Text>
              <Text style={styles.stateText}>Fetching the protected report and image.</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <AlertTriangle size={24} color={DANGER_DARK} strokeWidth={2.6} />

              <View style={styles.errorTextBlock}>
                <Text style={styles.errorTitle}>Unable to open report</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>

                <TouchableOpacity style={styles.retryButton} activeOpacity={0.84} onPress={() => void loadReport("initial")}>
                  <RefreshCw size={16} color={SURFACE} strokeWidth={2.6} />
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {!isLoading && !errorMessage && report ? (
            <>
              <View style={styles.patientCard}>
                <View style={styles.patientAvatar}>
                  <Text style={styles.patientAvatarText}>{getInitials(report.patient?.fullName || patientName)}</Text>
                </View>

                <View style={styles.patientTextBlock}>
                  <Text style={styles.patientName}>{report.patient?.fullName || patientName}</Text>
                  <Text style={styles.patientEmail}>{report.patient?.email || "Email unavailable"}</Text>
                </View>

                <View style={[styles.reviewStatusBadge, isReviewed ? styles.reviewedBadge : styles.pendingBadge]}>
                  {isReviewed ? <CheckCircle2 size={15} color={SUCCESS_DARK} strokeWidth={2.7} /> : <FileText size={15} color={WARNING_DARK} strokeWidth={2.7} />}
                  <Text style={[styles.reviewStatusText, isReviewed ? styles.reviewedText : styles.pendingText]}>{isReviewed ? "Reviewed" : "Pending"}</Text>
                </View>
              </View>

              <View style={styles.reportInfoCard}>
                <View style={styles.reportInfoHeader}>
                  <View style={styles.reportIcon}>
                    <FileText size={25} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
                  </View>

                  <View style={styles.reportInfoTitleBlock}>
                    <Text style={styles.reportTitle}>{report.title || "Medical Report"}</Text>
                    <Text style={styles.reportCategory}>{formatLabel(report.category)}</Text>
                  </View>
                </View>

                <View style={styles.detailsPanel}>
                  <DetailRow label="Report date" value={formatDate(report.reportDate)} />
                  <DetailRow label="File name" value={report.originalFileName || "Medical report"} />
                  <DetailRow label="File size" value={formatFileSize(report.fileSize)} />
                  <DetailRow label="File type" value={report.mimeType || "Unknown"} isLast />
                </View>

                {report.description ? (
                  <View style={styles.descriptionPanel}>
                    <Text style={styles.descriptionLabel}>Patient description</Text>
                    <Text style={styles.descriptionText}>{report.description}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Uploaded report image</Text>
                <Text style={styles.sectionSubtitle}>Review the image before submitting your note.</Text>
              </View>

              <View style={styles.imageCard}>
                {isImageLoading ? (
                  <View style={styles.imageState}>
                    <ActivityIndicator size="large" color={DOCTOR_PRIMARY} />
                    <Text style={styles.imageStateTitle}>Loading image</Text>
                  </View>
                ) : imageDataUri ? (
                  <Image source={{ uri: imageDataUri }} style={styles.reportImage} resizeMode="contain" />
                ) : (
                  <View style={styles.imageState}>
                    <FileImage size={38} color={WARNING} strokeWidth={2.4} />
                    <Text style={styles.imageStateTitle}>Image preview unavailable</Text>
                    <Text style={styles.imageStateText}>{imageErrorMessage || "Unable to display this report image."}</Text>
                  </View>
                )}
              </View>

              <View style={[styles.safetyCard, contentSafetyStatus === "CLEAR" ? styles.safetyCardClear : undefined]}>
                {contentSafetyStatus === "CLEAR" ? <ShieldCheck size={22} color={SUCCESS_DARK} strokeWidth={2.6} /> : <ShieldAlert size={22} color={WARNING_DARK} strokeWidth={2.6} />}

                <View style={styles.safetyTextBlock}>
                  <Text style={[styles.safetyTitle, contentSafetyStatus === "CLEAR" ? styles.safetyClearText : styles.safetyWarningText]}>
                    {contentSafetyStatus === "CLEAR" ? "File safety check completed" : "Manual content review required"}
                  </Text>
                  <Text style={styles.safetyText}>{report.contentSafetyMessage || "Review the uploaded report carefully before recording your response."}</Text>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{isReviewed ? "Doctor review" : "Add review note"}</Text>
                <Text style={styles.sectionSubtitle}>{isReviewed ? "You can update the existing review note." : "Enter findings or follow-up instructions."}</Text>
              </View>

              <View style={styles.reviewCard}>
                <TextInput
                  style={styles.reviewInput}
                  value={reviewNote}
                  onChangeText={setReviewNote}
                  placeholder="Enter report review, findings or follow-up instructions..."
                  placeholderTextColor={MUTED}
                  multiline
                  textAlignVertical="top"
                  editable={!isSubmitting}
                  maxLength={2000}
                />

                <View style={styles.inputFooter}>
                  <Text style={styles.characterCount}>{reviewNote.length}/2000</Text>
                </View>

                <TouchableOpacity style={[styles.submitButton, isSubmitting ? styles.submitButtonDisabled : undefined]} activeOpacity={0.84} onPress={submitReview} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator color={SURFACE} />
                  ) : (
                    <>
                      <Send size={18} color={SURFACE} strokeWidth={2.6} />
                      <Text style={styles.submitButtonText}>{isReviewed ? "Update Review" : "Submit Review"}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const DetailRow = ({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) => (
  <View style={[styles.detailRow, isLast ? styles.detailRowLast : undefined]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
  </View>
);

export default DoctorReportReviewScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { minHeight: 70, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", overflow: "hidden", ...elevate(1) },
  headerTextBlock: { flex: 1, paddingHorizontal: 12 },
  headerTitle: { color: TEXT, fontSize: 20, fontWeight: "700" },
  headerSubtitle: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 3 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  stateCard: { backgroundColor: SURFACE, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 34, alignItems: "center", ...elevate(1) },
  stateTitle: { color: TEXT, fontSize: 17, fontWeight: "700", textAlign: "center", marginTop: 13 },
  stateText: { color: MUTED, fontSize: 13, fontWeight: "500", lineHeight: 19, textAlign: "center", marginTop: 6 },
  errorCard: { backgroundColor: DANGER_LIGHT, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "flex-start" },
  errorTextBlock: { flex: 1, marginLeft: 11 },
  errorTitle: { color: DANGER_DARK, fontSize: 15, fontWeight: "700" },
  errorText: { color: DANGER_DARK, fontSize: 12, fontWeight: "500", lineHeight: 18, marginTop: 4 },
  retryButton: { alignSelf: "flex-start", backgroundColor: DANGER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", marginTop: 10 },
  retryText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginLeft: 6 },
  patientCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 12, ...elevate(1) },
  patientAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  patientAvatarText: { color: DOCTOR_PRIMARY, fontSize: 14, fontWeight: "800" },
  patientTextBlock: { flex: 1 },
  patientName: { color: TEXT, fontSize: 15, fontWeight: "700" },
  patientEmail: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 3 },
  reviewStatusBadge: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7, flexDirection: "row", alignItems: "center", marginLeft: 8 },
  reviewedBadge: { backgroundColor: SUCCESS_LIGHT },
  pendingBadge: { backgroundColor: WARNING_LIGHT },
  reviewStatusText: { fontSize: 10, fontWeight: "700", marginLeft: 5 },
  reviewedText: { color: SUCCESS_DARK },
  pendingText: { color: WARNING_DARK },
  reportInfoCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, marginBottom: 18, ...elevate(1) },
  reportInfoHeader: { flexDirection: "row", alignItems: "center" },
  reportIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: DOCTOR_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  reportInfoTitleBlock: { flex: 1 },
  reportTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  reportCategory: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 4 },
  detailsPanel: { backgroundColor: SOFT_PANEL, borderRadius: 12, paddingHorizontal: 12, marginTop: 13 },
  detailRow: { minHeight: 42, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { color: MUTED, fontSize: 11, fontWeight: "600", width: 82 },
  detailValue: { flex: 1, color: TEXT, fontSize: 11, fontWeight: "600", textAlign: "right" },
  descriptionPanel: { backgroundColor: DOCTOR_LIGHT, borderRadius: 12, padding: 12, marginTop: 12 },
  descriptionLabel: { color: DOCTOR_DARK, fontSize: 11, fontWeight: "700" },
  descriptionText: { color: DOCTOR_DARK, fontSize: 12, fontWeight: "500", lineHeight: 18, marginTop: 5 },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "700" },
  sectionSubtitle: { color: MUTED, fontSize: 12, fontWeight: "500", lineHeight: 18, marginTop: 3 },
  imageCard: { backgroundColor: SURFACE, borderRadius: 16, minHeight: 380, overflow: "hidden", marginBottom: 14, ...elevate(1) },
  reportImage: { width: "100%", height: 520, backgroundColor: "#111111" },
  imageState: { minHeight: 380, padding: 24, alignItems: "center", justifyContent: "center" },
  imageStateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 12 },
  imageStateText: { color: MUTED, fontSize: 12, fontWeight: "500", lineHeight: 18, textAlign: "center", marginTop: 6 },
  safetyCard: { backgroundColor: WARNING_LIGHT, borderRadius: 14, padding: 13, flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  safetyCardClear: { backgroundColor: SUCCESS_LIGHT },
  safetyTextBlock: { flex: 1, marginLeft: 10 },
  safetyTitle: { fontSize: 13, fontWeight: "700" },
  safetyClearText: { color: SUCCESS_DARK },
  safetyWarningText: { color: WARNING_DARK },
  safetyText: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 4 },
  reviewCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 14, ...elevate(1) },
  reviewInput: { minHeight: 150, borderRadius: 12, backgroundColor: SOFT_PANEL, color: TEXT, fontSize: 13, fontWeight: "500", lineHeight: 20, padding: 13, borderWidth: 1, borderColor: BORDER },
  inputFooter: { alignItems: "flex-end", marginTop: 6 },
  characterCount: { color: MUTED, fontSize: 10, fontWeight: "600" },
  submitButton: { minHeight: 48, borderRadius: 12, backgroundColor: DOCTOR_PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 12, overflow: "hidden" },
  submitButtonDisabled: { opacity: 0.55 },
  submitButtonText: { color: SURFACE, fontSize: 13, fontWeight: "700", marginLeft: 7 },
});