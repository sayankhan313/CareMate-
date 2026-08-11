import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  HelpCircle,
  Info,
  Pill,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from "lucide-react-native";
import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedAlert as Alert } from "../../utils/localizedAlert";

import {
  medicineScanApi,
  type ParsedMedicineScan,
} from "../../services/medicineScanApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ScanMedicineResult">;

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
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#F6A545";
const WARNING_DARK = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const formatConfidence = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Not available";
  }

  if (value <= 1) {
    return `${Math.round(value * 100)}%`;
  }

  return `${Math.round(value)}%`;
};

const ScanMedicineResultScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();

  const [scanResult, setScanResult] = useState<ParsedMedicineScan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [screenError, setScreenError] = useState("");

  const scannedImageUri = route.params.scannedImageUri;
  const isMatched = Boolean(scanResult?.matched);

  const confidenceText = useMemo(() => {
    return formatConfidence(route.params.ocrConfidence);
  }, [route.params.ocrConfidence]);

  const loadScanResult = useCallback(async () => {
    try {
      setIsLoading(true);
      setScreenError("");

      const result = await medicineScanApi.parseMedicineScan({
        detectedText: route.params.detectedText,
        ocrConfidence: route.params.ocrConfidence,
      });

      setScanResult(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to analyse medicine scan.";

      setScreenError(message);
    } finally {
      setIsLoading(false);
    }
  }, [route.params.detectedText, route.params.ocrConfidence]);

  useEffect(() => {
    loadScanResult();
  }, [loadScanResult]);

  const handleAddToReminder = () => {
    if (!scanResult) {
      return;
    }

    if (!scanResult.matched) {
      Alert.alert(
        "Medicine not found",
        "This scan did not confidently match a medicine in the catalogue. Please scan again or add the medicine manually."
      );
      return;
    }

    navigation.navigate("ConfirmReminder", {
      medicineDraft: scanResult.medicineDraft,
    });
  };

  const handleScanAgain = () => {
    navigation.goBack();
  };

  const handleAskDoctor = () => {
    Alert.alert(
      "Doctor confirmation",
      "Please confirm this medicine with your prescription, doctor, or pharmacist before saving."
    );
  };

  const renderSchedule = () => {
    if (!scanResult?.prescriptionSchedule) {
      return null;
    }

    return (
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleRow}>
            <View style={styles.panelIconCircle}>
              <Clock3 size={20} color={PRIMARY} strokeWidth={2.6} />
            </View>

            <View style={styles.panelTitleBlock}>
              <Text style={styles.panelTitle}>Dose timing detected</Text>
              <Text style={styles.panelSubtitle}>
                Prescription pattern converted into reminder times
              </Text>
            </View>
          </View>

          <View style={styles.patternBadge}>
            <Text style={styles.patternBadgeText}>
              {scanResult.prescriptionSchedule.pattern}
            </Text>
          </View>
        </View>

        <View style={styles.timelineBox}>
          <TimelineItem
            label="Morning"
            active={scanResult.prescriptionSchedule.morning}
          />

          <View style={styles.timelineConnector} />

          <TimelineItem
            label="Lunch"
            active={scanResult.prescriptionSchedule.afternoon}
          />

          <View style={styles.timelineConnector} />

          <TimelineItem
            label="Night"
            active={scanResult.prescriptionSchedule.night}
          />
        </View>

        <View style={styles.detectedInstructionBox}>
          <FileText size={17} color={PRIMARY_DARK} strokeWidth={2.5} />
          <Text style={styles.detectedInstructionText}>
            {scanResult.prescriptionSchedule.instructionText}
          </Text>
        </View>
      </View>
    );
  };

  const shouldShowFooter = !isLoading && !screenError && Boolean(scanResult);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.7} />
          </TouchableOpacity>

          <View style={styles.appBarTextBlock}>
            <Text style={styles.appBarTitle}>Scan Result</Text>
            <Text style={styles.appBarSubtitle}>
              Smart medicine recognition
            </Text>
          </View>
        </View>

        {isLoading ? (
          <CenterState
            icon={<ActivityIndicator size="large" color={PRIMARY} />}
            title="Analysing medicine..."
            subtitle="CareMate+ is checking the scanned text against the medicine catalogue."
          />
        ) : screenError ? (
          <CenterState
            icon={
              <View style={styles.errorStateIcon}>
                <AlertCircle size={30} color={DANGER} strokeWidth={2.7} />
              </View>
            }
            title="Unable to analyse scan"
            subtitle={screenError}
            actionLabel="Try Again"
            onAction={loadScanResult}
          />
        ) : scanResult ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: shouldShowFooter
                  ? Math.max(insets.bottom + 132, 150)
                  : Math.max(insets.bottom + 34, 64),
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.scanPreviewCard}>
              <View style={styles.scanPreviewTopRow}>
                <View>
                  <Text style={styles.scanPreviewTitle}>Captured scan</Text>
                  <Text style={styles.scanPreviewSubtitle}>
                    OCR confidence {confidenceText}
                  </Text>
                </View>

                <View style={styles.ocrBadge}>
                  <Sparkles size={14} color={PRIMARY} strokeWidth={2.6} />
                  
                </View>
              </View>

              <View style={styles.scannedImageBox}>
                {scannedImageUri ? (
                  <Image
                    source={{ uri: scannedImageUri }}
                    style={styles.scannedImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.noImageBox}>
                    <Camera size={34} color={MUTED} strokeWidth={2.5} />
                    <Text style={styles.noImageText}>Preview unavailable</Text>
                  </View>
                )}

                <View
                  style={[
                    styles.floatingResultBadge,
                    isMatched
                      ? styles.floatingResultBadgeSuccess
                      : styles.floatingResultBadgeWarning,
                  ]}
                >
                  {isMatched ? (
                    <CheckCircle2
                      size={17}
                      color={SUCCESS_DARK}
                      strokeWidth={2.7}
                    />
                  ) : (
                    <AlertCircle
                      size={17}
                      color={WARNING_DARK}
                      strokeWidth={2.7}
                    />
                  )}

                  <Text
                    style={[
                      styles.floatingResultText,
                      isMatched
                        ? styles.floatingResultTextSuccess
                        : styles.floatingResultTextWarning,
                    ]}
                  >
                    {isMatched ? "Medicine matched" : "No confident match"}
                  </Text>
                </View>
              </View>

              
            </View>

            {isMatched ? (
              <>
                <View style={styles.medicinePassportCard}>
                  <View style={styles.passportTopRow}>
                    <View style={styles.passportIconCircle}>
                      <Pill size={27} color={PRIMARY} strokeWidth={2.8} />
                    </View>

                    <View style={styles.passportTextBlock}>
                      <Text style={styles.passportLabel}>Matched medicine</Text>
                      <Text style={styles.medicineName}>
                        {scanResult.brandName}
                      </Text>
                      <Text style={styles.genericName}>
                        {scanResult.genericName}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.passportDivider} />

                  <View style={styles.factGrid}>
                    <FactTile label="Dose" value={scanResult.dose} />
                    <FactTile label="Form" value={scanResult.form} />
                  </View>
                </View>

                {renderSchedule()}

                <View style={styles.panel}>
                  <View style={styles.panelHeaderSimple}>
                    <View style={styles.panelTitleRow}>
                      <View style={styles.panelIconCircle}>
                        <Info size={20} color={PRIMARY} strokeWidth={2.6} />
                      </View>

                      <View style={styles.panelTitleBlock}>
                        <Text style={styles.panelTitle}>
                          Medicine information
                        </Text>
                        <Text style={styles.panelSubtitle}>
                          Catalogue details shown for patient awareness
                        </Text>
                      </View>
                    </View>
                  </View>

                  <InfoRow
                    label="Category"
                    value={scanResult.category}
                    icon={<Pill size={19} color={PRIMARY} strokeWidth={2.5} />}
                  />

                  <InfoRow
                    label="Used for"
                    value={scanResult.usedFor}
                    icon={
                      <Stethoscope
                        size={19}
                        color={PRIMARY}
                        strokeWidth={2.5}
                      />
                    }
                    isLast
                  />
                </View>

                <View style={styles.panel}>
                  <View style={styles.panelHeaderSimple}>
                    <View style={styles.panelTitleRow}>
                      <View style={styles.dangerIconCircle}>
                        <AlertCircle
                          size={20}
                          color={DANGER}
                          strokeWidth={2.6}
                        />
                      </View>

                      <View style={styles.panelTitleBlock}>
                        <Text style={styles.panelTitle}>
                          Common side effects
                        </Text>
                        <Text style={styles.panelSubtitle}>
                          Review before creating the reminder
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.sideEffectWrap}>
                    {scanResult.commonSideEffects.length > 0 ? (
                      scanResult.commonSideEffects.map((sideEffect) => (
                        <View key={sideEffect} style={styles.sideEffectChip}>
                          <Text style={styles.sideEffectText}>{sideEffect}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyInlineText}>
                        No common side effects listed.
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.instructionsCard}>
                  <Text style={styles.instructionsTitle}>Instructions</Text>
                  <Text style={styles.instructionsText}>
                    {scanResult.instructions}
                  </Text>
                </View>

                <View style={styles.safetyCard}>
                  <View style={styles.safetyIconCircle}>
                    <ShieldAlert size={23} color={DANGER} strokeWidth={2.7} />
                  </View>

                  <View style={styles.safetyTextBlock}>
                    <Text style={styles.safetyTitle}>Safety note</Text>
                    <Text style={styles.safetyText}>
                      {scanResult.safetyNote}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.notFoundCard}>
                  <View style={styles.notFoundIconCircle}>
                    <AlertCircle
                      size={30}
                      color={WARNING}
                      strokeWidth={2.8}
                    />
                  </View>

                  <Text style={styles.notFoundTitle}>
                    Medicine not found in catalogue
                  </Text>

                  <Text style={styles.notFoundText}>
                    The scan did not confidently match a saved medicine. Try
                    scanning again with clearer lighting, or confirm with a
                    doctor or pharmacist before saving.
                  </Text>
                </View>

                <View style={styles.quickTipsCard}>
                  <Text style={styles.quickTipsTitle}>Scan tips</Text>

                  <TipRow text="Place the medicine label flat and avoid glare." />
                  <TipRow text="Keep the brand name and strength clearly visible." />
                  <TipRow text="Use good lighting and hold the camera steady." />
                </View>
              </>
            )}
          </ScrollView>
        ) : null}

        {shouldShowFooter && scanResult ? (
         <View
  style={[
    styles.footer,
    {
      paddingBottom: Math.max(insets.bottom + 6, 14),
    },
  ]}
>
            {isMatched ? (
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.86}
                onPress={handleAddToReminder}
              >
                <Text style={styles.primaryButtonText}>Add to Reminder</Text>
                <ChevronRight size={20} color={SURFACE} strokeWidth={2.7} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.86}
                onPress={handleScanAgain}
              >
                <RefreshCw size={19} color={SURFACE} strokeWidth={2.6} />
                <Text style={styles.primaryButtonText}>Scan Again</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.86}
              onPress={handleAskDoctor}
            >
              <HelpCircle size={19} color={TEXT} strokeWidth={2.5} />
              <Text style={styles.secondaryButtonText}>Ask Doctor</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const CenterState = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) => {
  return (
    <View style={styles.centerState}>
      {icon}

      <Text style={styles.centerTitle}>{title}</Text>
      <Text style={styles.centerSubtitle}>{subtitle}</Text>

      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.retryButton}
          activeOpacity={0.85}
          onPress={onAction}
        >
          <RefreshCw size={18} color={SURFACE} strokeWidth={2.5} />
          <Text style={styles.retryButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const FactTile = ({ label, value }: { label: string; value: string }) => {
  return (
    <View style={styles.factTile}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

const TimelineItem = ({ label, active }: { label: string; active: boolean }) => {
  return (
    <View style={styles.timelineItem}>
      <View
        style={[
          styles.timelineDot,
          active ? styles.timelineDotActive : styles.timelineDotInactive,
        ]}
      >
        {active ? <CheckCircle2 size={14} color={SURFACE} strokeWidth={3} /> : null}
      </View>

      <Text
        style={[
          styles.timelineLabel,
          active ? styles.timelineLabelActive : undefined,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const InfoRow = ({
  label,
  value,
  icon,
  isLast,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  isLast?: boolean;
}) => {
  return (
    <View style={[styles.infoRow, isLast ? styles.rowLast : undefined]}>
      <View style={styles.infoRowIcon}>{icon}</View>

      <View style={styles.infoTextBlock}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
};

const TipRow = ({ text }: { text: string }) => {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipDot} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
};

export default ScanMedicineResultScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  appBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    borderWidth: 1,
    borderColor: BORDER,
  },
  appBarTextBlock: {
    flex: 1,
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  centerState: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  centerTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 18,
    textAlign: "center",
  },
  centerSubtitle: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  errorStateIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButton: {
    marginTop: 22,
    backgroundColor: PRIMARY,
    borderRadius: 15,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  retryButtonText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },
  scanPreviewCard: {
    backgroundColor: SURFACE,
    borderRadius: 26,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  scanPreviewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  scanPreviewTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  scanPreviewSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  ocrBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ocrBadgeText: {
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 5,
  },
  scannedImageBox: {
    width: "100%",
    height: 245,
    borderRadius: 22,
    backgroundColor: SOFT_PANEL,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
  },
  scannedImage: {
    width: "100%",
    height: "100%",
  },
  noImageBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
  },
  floatingResultBadge: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  floatingResultBadgeSuccess: {
    backgroundColor: "rgba(234,248,242,0.96)",
    borderColor: "#B7E8D3",
  },
  floatingResultBadgeWarning: {
    backgroundColor: "rgba(255,243,226,0.96)",
    borderColor: "#FED7AA",
  },
  floatingResultText: {
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 8,
  },
  floatingResultTextSuccess: {
    color: SUCCESS_DARK,
  },
  floatingResultTextWarning: {
    color: WARNING_DARK,
  },
  detectedTextBox: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 12,
  },
  detectedTextLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },
  detectedTextValue: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  medicinePassportCard: {
    backgroundColor: SURFACE,
    borderRadius: 26,
    padding: 17,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  passportTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  passportIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  passportTextBlock: {
    flex: 1,
  },
  passportLabel: {
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },
  medicineName: {
    color: TEXT,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  genericName: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 4,
  },
  passportDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 16,
  },
  factGrid: {
    flexDirection: "row",
  },
  factTile: {
    flex: 1,
    backgroundColor: SOFT_PANEL,
    borderRadius: 17,
    padding: 13,
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 10,
  },
  factLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },
  factValue: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  panel: {
    backgroundColor: SURFACE,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  panelHeaderSimple: {
    marginBottom: 5,
  },
  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  panelIconCircle: {
    width: 43,
    height: 43,
    borderRadius: 16,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  dangerIconCircle: {
    width: 43,
    height: 43,
    borderRadius: 16,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  panelTitleBlock: {
    flex: 1,
  },
  panelTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  panelSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3,
  },
  patternBadge: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  patternBadgeText: {
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "900",
  },
  timelineBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SOFT_PANEL,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: BORDER,
  },
  timelineItem: {
    alignItems: "center",
    minWidth: 64,
  },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  timelineDotActive: {
    backgroundColor: PRIMARY,
  },
  timelineDotInactive: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  timelineLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
  },
  timelineLabelActive: {
    color: TEXT,
  },
  timelineConnector: {
    flex: 1,
    height: 2,
    backgroundColor: "#DDE3EF",
    marginBottom: 28,
  },
  detectedInstructionBox: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
  },
  detectedInstructionText: {
    flex: 1,
    color: PRIMARY_DARK,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  infoRowIcon: {
    width: 37,
    height: 37,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 4,
  },
  infoValue: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  sideEffectWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  sideEffectChip: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  sideEffectText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "900",
  },
  emptyInlineText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
  },
  instructionsCard: {
    backgroundColor: SURFACE,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  instructionsTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 7,
  },
  instructionsText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  safetyCard: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    marginBottom: 14,
  },
  safetyIconCircle: {
    width: 43,
    height: 43,
    borderRadius: 16,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  safetyTextBlock: {
    flex: 1,
  },
  safetyTitle: {
    color: DANGER_DARK,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 5,
  },
  safetyText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  notFoundCard: {
    backgroundColor: SURFACE,
    borderRadius: 26,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  notFoundIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: WARNING_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  notFoundTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  notFoundText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  quickTipsCard: {
    backgroundColor: SURFACE,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  quickTipsTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
    marginTop: 5,
    marginRight: 10,
  },
  tipText: {
    flex: 1,
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: BORDER,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "900",
    marginHorizontal: 8,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 10,
    flexDirection: "row",
  },
  secondaryButtonText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
});