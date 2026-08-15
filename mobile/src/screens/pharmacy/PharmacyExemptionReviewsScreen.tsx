import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WebView } from "react-native-webview";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  Hash,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  pharmacyApi,
  type PharmacyExemptionReviewDetail,
  type PharmacyExemptionType,
} from "../../services/pharmacy/pharmacyApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PharmacyExemptionReview">;

const CareMateWebView = WebView as unknown as React.ComponentType<any>;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";

const PRIMARY = "#15803D";
const PRIMARY_DARK = "#14532D";
const PRIMARY_LIGHT = "#ECFDF3";

const SUCCESS = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

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
  if (Number.isNaN(date.getTime())) return "Not provided";

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

export const PharmacyExemptionReviewScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const { evidenceId } = route.params;

  const [review, setReview] = useState<PharmacyExemptionReviewDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [documentSource, setDocumentSource] = useState<{ uri: string; headers: { Authorization: string } } | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentVisible, setDocumentVisible] = useState(false);

  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const loadReview = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const result = await pharmacyApi.getExemptionReview(evidenceId);
      setReview(result.review);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load exemption evidence.");
    } finally {
      setIsLoading(false);
    }
  }, [evidenceId]);

  useFocusEffect(
    useCallback(() => {
      void loadReview();
    }, [loadReview]),
  );

  const openDocument = async (index: number, fileName: string) => {
    try {
      const source = await pharmacyApi.getExemptionDocumentSource(evidenceId, index);
      setDocumentSource(source);
      setDocumentTitle(fileName);
      setDocumentVisible(true);
    } catch (error) {
      Alert.alert("Unable to open evidence", error instanceof Error ? error.message : "Unable to load this document.");
    }
  };

  const verifyEvidence = () => {
    Alert.alert(
      "Verify exemption evidence?",
      "Confirm that you have reviewed the submitted evidence and it supports this exemption claim.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Verify",
          onPress: async () => {
            try {
              setIsActionLoading(true);
              const result = await pharmacyApi.verifyExemptionEvidence(evidenceId);
              setReview(result.review);
              Alert.alert("Verified", "The exemption evidence has been marked as verified.");
            } catch (error) {
              Alert.alert("Unable to verify", error instanceof Error ? error.message : "Unable to verify evidence.");
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const rejectEvidence = async () => {
    const reason = rejectReason.trim();

    if (reason.length < 5) {
      Alert.alert("Reason required", "Please provide a clear reason for rejecting this evidence.");
      return;
    }

    try {
      setIsActionLoading(true);
      const result = await pharmacyApi.rejectExemptionEvidence(evidenceId, reason);
      setReview(result.review);
      setRejectVisible(false);
      setRejectReason("");
      Alert.alert("Evidence rejected", "The exemption evidence has been rejected.");
    } catch (error) {
      Alert.alert("Unable to reject", error instanceof Error ? error.message : "Unable to reject evidence.");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator color={PRIMARY} size="large" />
          <Text style={styles.loadingText}>Loading exemption evidence...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !review) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={21} color={TEXT} strokeWidth={2.6} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Exemption review</Text>
        </View>

        <View style={styles.errorContainer}>
          <RefreshCw size={30} color={DANGER} strokeWidth={2.5} />
          <Text style={styles.errorTitle}>Unable to load review</Text>
          <Text style={styles.errorText}>{errorMessage || "Evidence was not found."}</Text>

          <TouchableOpacity style={styles.retryButton} onPress={() => void loadReview()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const expired = isExpired(review.expiresAt);
  const pending = review.status === "PENDING";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.84} onPress={() => navigation.goBack()}>
            <ArrowLeft size={21} color={TEXT} strokeWidth={2.6} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Exemption review</Text>
            <Text style={styles.headerSubtitle}>Review patient evidence before approval</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 120, 140) }]}
          showsVerticalScrollIndicator={false}
        >
          <StatusPanel status={review.status} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient</Text>

            <View style={styles.card}>
              <InfoRow
                icon={<UserRound size={19} color={PRIMARY} strokeWidth={2.5} />}
                label="Patient"
                value={review.patient.fullName}
              />

              <Divider />

              <InfoRow
                icon={<Mail size={19} color={PRIMARY} strokeWidth={2.5} />}
                label="Email"
                value={review.patient.email}
              />

              {review.patient.phoneNumber ? (
                <>
                  <Divider />

                  <InfoRow
                    icon={<Phone size={19} color={PRIMARY} strokeWidth={2.5} />}
                    label="Phone"
                    value={review.patient.phoneNumber}
                  />
                </>
              ) : null}

              {review.patient.addressLine || review.patient.postcode ? (
                <>
                  <Divider />

                  <InfoRow
                    icon={<MapPin size={19} color={PRIMARY} strokeWidth={2.5} />}
                    label="Address"
                    value={[review.patient.addressLine, review.patient.postcode].filter(Boolean).join(", ")}
                  />
                </>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exemption details</Text>

            <View style={styles.claimCard}>
              <View style={styles.claimHeader}>
                <View style={styles.claimIcon}>
                  <ShieldCheck size={24} color={PRIMARY} strokeWidth={2.6} />
                </View>

                <View style={styles.claimHeaderText}>
                  <Text style={styles.claimType}>{formatType(review.exemptionType)}</Text>
                  <Text style={styles.claimPreference}>{review.chargePreference}</Text>
                </View>
              </View>

              <View style={styles.claimDivider} />

              <View style={styles.claimDetails}>
                <DetailItem
                  icon={<Hash size={17} color={MUTED} strokeWidth={2.4} />}
                  label="Reference number"
                  value={review.referenceNumber || "Not provided"}
                />

                <DetailItem
                  icon={<CalendarDays size={17} color={expired ? DANGER : MUTED} strokeWidth={2.4} />}
                  label="Expiry date"
                  value={formatDate(review.expiresAt)}
                  danger={expired}
                />

                <DetailItem
                  icon={<CalendarDays size={17} color={MUTED} strokeWidth={2.4} />}
                  label="Submitted"
                  value={formatDate(review.createdAt)}
                />
              </View>

              {expired ? (
                <View style={styles.expiredBanner}>
                  <XCircle size={18} color={DANGER} strokeWidth={2.5} />
                  <Text style={styles.expiredText}>This evidence appears to be expired and cannot be verified.</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Supporting evidence</Text>
              <Text style={styles.documentCount}>{review.documents.length} files</Text>
            </View>

            <View style={styles.documentsCard}>
              {review.documents.map((document, index) => (
                <React.Fragment key={`${document.index}-${document.fileName}`}>
                  <TouchableOpacity
                    style={styles.documentRow}
                    activeOpacity={0.84}
                    onPress={() => void openDocument(document.index, document.fileName)}
                  >
                    <View style={styles.documentIcon}>
                      <FileText size={21} color={PRIMARY} strokeWidth={2.5} />
                    </View>

                    <View style={styles.documentText}>
                      <Text style={styles.documentName} numberOfLines={1}>
                        {document.fileName}
                      </Text>
                      <Text style={styles.documentLabel}>Protected evidence document</Text>
                    </View>

                    <Text style={styles.viewText}>View</Text>
                  </TouchableOpacity>

                  {index < review.documents.length - 1 ? <Divider /> : null}
                </React.Fragment>
              ))}
            </View>
          </View>

          {review.status === "REJECTED" && review.rejectionReason ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rejection reason</Text>

              <View style={styles.rejectionCard}>
                <XCircle size={20} color={DANGER} strokeWidth={2.5} />
                <Text style={styles.rejectionText}>{review.rejectionReason}</Text>
              </View>
            </View>
          ) : null}

          {review.status === "VERIFIED" ? (
            <View style={styles.reviewedCard}>
              <CheckCircle2 size={22} color={SUCCESS} strokeWidth={2.6} />

              <View style={styles.reviewedText}>
                <Text style={styles.reviewedTitle}>Evidence verified</Text>
                <Text style={styles.reviewedSubtitle}>
                  Reviewed {review.verifiedAt ? formatDate(review.verifiedAt) : "by this pharmacy"}
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {pending ? (
          <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom + 12, 18) }]}>
            <TouchableOpacity
              style={styles.rejectButton}
              disabled={isActionLoading}
              activeOpacity={0.84}
              onPress={() => setRejectVisible(true)}
            >
              <XCircle size={19} color={DANGER} strokeWidth={2.6} />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.verifyButton, (expired || isActionLoading) && styles.disabledButton]}
              disabled={expired || isActionLoading}
              activeOpacity={0.84}
              onPress={verifyEvidence}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color={SURFACE} />
              ) : (
                <>
                  <CheckCircle2 size={19} color={SURFACE} strokeWidth={2.6} />
                  <Text style={styles.verifyButtonText}>Verify evidence</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <Modal visible={rejectVisible} transparent animationType="fade" onRequestClose={() => setRejectVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.rejectModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reject evidence</Text>
                <Text style={styles.modalSubtitle}>Give the patient a clear reason.</Text>
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={() => setRejectVisible(false)}>
                <X size={20} color={TEXT} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.reasonInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Document expired or details cannot be verified"
              placeholderTextColor="#9A9FAE"
              multiline
              maxLength={500}
              textAlignVertical="top"
            />

            <Text style={styles.characterCount}>{rejectReason.length}/500</Text>

            <TouchableOpacity
              style={[styles.confirmRejectButton, isActionLoading && styles.disabledButton]}
              disabled={isActionLoading}
              activeOpacity={0.84}
              onPress={() => void rejectEvidence()}
            >
              {isActionLoading ? (
                <ActivityIndicator color={SURFACE} />
              ) : (
                <Text style={styles.confirmRejectText}>Reject evidence</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={documentVisible} animationType="slide" onRequestClose={() => setDocumentVisible(false)}>
        <SafeAreaView style={styles.viewerSafeArea} edges={["top", "bottom"]}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity style={styles.viewerClose} onPress={() => setDocumentVisible(false)}>
              <X size={21} color={TEXT} strokeWidth={2.6} />
            </TouchableOpacity>

            <View style={styles.viewerTitleBlock}>
              <Text style={styles.viewerTitle} numberOfLines={1}>
                Evidence document
              </Text>
              <Text style={styles.viewerSubtitle} numberOfLines={1}>
                {documentTitle}
              </Text>
            </View>

            <ShieldCheck size={21} color={PRIMARY} strokeWidth={2.5} />
          </View>

          {documentSource ? (
            <CareMateWebView
              source={documentSource}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
              incognito
              cacheEnabled={false}
              style={styles.webView}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator color={PRIMARY} />
                  <Text style={styles.loadingText}>Opening protected document...</Text>
                </View>
              )}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const StatusPanel = ({ status }: { status: PharmacyExemptionReviewDetail["status"] }) => {
  if (status === "VERIFIED") {
    return (
      <View style={[styles.statusPanel, { backgroundColor: SUCCESS_LIGHT }]}>
        <CheckCircle2 size={21} color={SUCCESS} strokeWidth={2.6} />
        <View style={styles.statusPanelText}>
          <Text style={[styles.statusTitle, { color: SUCCESS }]}>Verified</Text>
          <Text style={styles.statusSubtitle}>This evidence has already been approved.</Text>
        </View>
      </View>
    );
  }

  if (status === "REJECTED") {
    return (
      <View style={[styles.statusPanel, { backgroundColor: DANGER_LIGHT }]}>
        <XCircle size={21} color={DANGER} strokeWidth={2.6} />
        <View style={styles.statusPanelText}>
          <Text style={[styles.statusTitle, { color: DANGER }]}>Rejected</Text>
          <Text style={styles.statusSubtitle}>This evidence has already been rejected.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.statusPanel, { backgroundColor: WARNING_LIGHT }]}>
      <ShieldCheck size={21} color={WARNING} strokeWidth={2.6} />
      <View style={styles.statusPanelText}>
        <Text style={[styles.statusTitle, { color: WARNING }]}>Awaiting pharmacy review</Text>
        <Text style={styles.statusSubtitle}>Review the supporting evidence before making a decision.</Text>
      </View>
    </View>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>{icon}</View>

    <View style={styles.infoText}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const DetailItem = ({
  icon,
  label,
  value,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) => (
  <View style={styles.detailItem}>
    {icon}

    <View style={styles.detailText}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, danger && styles.detailDanger]}>{value}</Text>
    </View>
  </View>
);

const Divider = () => <View style={styles.divider} />;

export default PharmacyExemptionReviewScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

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

  headerText: { flex: 1 },
  headerTitle: { color: TEXT, fontSize: 21, fontWeight: "700" },
  headerSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },

  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 10 },

  errorContainer: {
    margin: 16,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    ...elevate(1),
  },

  errorTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 12 },
  errorText: { color: MUTED, fontSize: 12, fontWeight: "600", textAlign: "center", marginTop: 6 },

  retryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 16,
  },

  retryText: { color: SURFACE, fontSize: 13, fontWeight: "700" },

  statusPanel: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
  },

  statusPanelText: { flex: 1, marginLeft: 11 },
  statusTitle: { fontSize: 14, fontWeight: "700" },
  statusSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", lineHeight: 17, marginTop: 2 },

  section: { marginTop: 22 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginBottom: 9 },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  documentCount: { color: MUTED, fontSize: 11, fontWeight: "700" },

  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 14,
    ...elevate(1),
  },

  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13 },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  infoText: { flex: 1 },
  infoLabel: { color: MUTED, fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  infoValue: { color: TEXT, fontSize: 13, fontWeight: "600", marginTop: 3 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 51 },

  claimCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    ...elevate(1),
  },

  claimHeader: { flexDirection: "row", alignItems: "center" },

  claimIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  claimHeaderText: { flex: 1 },
  claimType: { color: TEXT, fontSize: 16, fontWeight: "700" },
  claimPreference: { color: PRIMARY, fontSize: 11, fontWeight: "700", marginTop: 3 },

  claimDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 14 },
  claimDetails: { gap: 12 },

  detailItem: { flexDirection: "row", alignItems: "center" },
  detailText: { flex: 1, marginLeft: 9 },
  detailLabel: { color: MUTED, fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  detailValue: { color: TEXT, fontSize: 12, fontWeight: "600", marginTop: 2 },
  detailDanger: { color: DANGER },

  expiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DANGER_LIGHT,
    borderRadius: 12,
    padding: 11,
    marginTop: 14,
  },

  expiredText: { flex: 1, color: DANGER, fontSize: 11, fontWeight: "600", lineHeight: 17, marginLeft: 8 },

  documentsCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 14,
    ...elevate(1),
  },

  documentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13 },

  documentIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  documentText: { flex: 1, minWidth: 0 },
  documentName: { color: TEXT, fontSize: 12, fontWeight: "700" },
  documentLabel: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },
  viewText: { color: PRIMARY, fontSize: 12, fontWeight: "700", marginLeft: 10 },

  rejectionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: DANGER_LIGHT,
    borderRadius: 15,
    padding: 14,
  },

  rejectionText: { flex: 1, color: DANGER, fontSize: 12, fontWeight: "600", lineHeight: 18, marginLeft: 9 },

  reviewedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 16,
    padding: 15,
    marginTop: 22,
  },

  reviewedText: { flex: 1, marginLeft: 10 },
  reviewedTitle: { color: SUCCESS, fontSize: 14, fontWeight: "700" },
  reviewedSubtitle: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 3 },

  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: SURFACE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },

  rejectButton: {
    flex: 0.42,
    height: 50,
    borderRadius: 14,
    backgroundColor: DANGER_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  rejectButtonText: { color: DANGER, fontSize: 13, fontWeight: "700", marginLeft: 7 },

  verifyButton: {
    flex: 0.58,
    height: 50,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  verifyButtonText: { color: SURFACE, fontSize: 13, fontWeight: "700", marginLeft: 7 },
  disabledButton: { opacity: 0.45 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,25,54,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  rejectModal: { backgroundColor: SURFACE, borderRadius: 18, padding: 18 },

  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  modalTitle: { color: TEXT, fontSize: 18, fontWeight: "700" },
  modalSubtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },

  reasonInput: {
    minHeight: 110,
    backgroundColor: BACKGROUND,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 13,
    marginTop: 18,
  },

  characterCount: { color: MUTED, fontSize: 9, fontWeight: "600", textAlign: "right", marginTop: 5 },

  confirmRejectButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: DANGER,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  confirmRejectText: { color: SURFACE, fontSize: 13, fontWeight: "700" },

  viewerSafeArea: { flex: 1, backgroundColor: BACKGROUND },

  viewerHeader: {
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },

  viewerClose: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },

  viewerTitleBlock: { flex: 1, paddingHorizontal: 12 },
  viewerTitle: { color: TEXT, fontSize: 15, fontWeight: "700" },
  viewerSubtitle: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 2 },

  webView: { flex: 1, backgroundColor: SURFACE },

webViewLoading: {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  backgroundColor: SURFACE,
  alignItems: "center",
  justifyContent: "center",
},
});