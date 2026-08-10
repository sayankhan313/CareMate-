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
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  HelpCircle,
  Info,
  Pill,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
} from "lucide-react-native";
import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedAlert as Alert } from "../../utils/localizedAlert";

import {
  getMedicineImageUrl,
  medicineScanApi,
  type ParsedPrescriptionMedicine,
  type ParsedPrescriptionScan,
} from "../../services/medicineScanApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "PrescriptionScanResult"
>;

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

const PrescriptionScanResultScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();

  const [scanResult, setScanResult] = useState<ParsedPrescriptionScan | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [screenError, setScreenError] = useState("");

  const confidenceText = useMemo(() => {
    return formatConfidence(route.params.ocrConfidence);
  }, [route.params.ocrConfidence]);

  const loadPrescriptionResult = useCallback(async () => {
    try {
      setIsLoading(true);
      setScreenError("");

      const result = await medicineScanApi.parsePrescriptionScan({
        detectedText: route.params.detectedText,
        ocrConfidence: route.params.ocrConfidence,
      });

      setScanResult(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to analyse prescription scan.";

      setScreenError(message);
    } finally {
      setIsLoading(false);
    }
  }, [route.params.detectedText, route.params.ocrConfidence]);

  useEffect(() => {
    loadPrescriptionResult();
  }, [loadPrescriptionResult]);

  const matchedMedicines = useMemo(() => {
    if (!scanResult?.medicines) {
      return [];
    }

    return scanResult.medicines.filter((medicine) => {
      return medicine.matched && medicine.medicineReference;
    });
  }, [scanResult]);

  const totalDetectedMedicines = scanResult?.medicines?.length || 0;

  const handleAddMedicine = (medicine: ParsedPrescriptionMedicine) => {
    navigation.navigate("ConfirmReminder", {
      medicineDraft: medicine.medicineDraft,
    });
  };

  const handleAskDoctor = () => {
    Alert.alert(
      "Doctor confirmation",
      "Please confirm the medicine and dosage with your prescription, doctor, or pharmacist before saving.",
    );
  };

  const handleScanAgain = () => {
    navigation.goBack();
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
            <Text style={styles.appBarTitle}>Prescription Result</Text>

            <Text style={styles.appBarSubtitle}>
              Multiple medicine recognition
            </Text>
          </View>
        </View>

        {isLoading ? (
          <CenterState
            icon={<ActivityIndicator size="large" color={PRIMARY} />}
            title="Analysing prescription..."
            subtitle="CareMate+ is reading the prescription and matching medicines with the catalogue."
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
            onAction={loadPrescriptionResult}
          />
        ) : scanResult ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: shouldShowFooter
                  ? Math.max(insets.bottom + 132, 152)
                  : Math.max(insets.bottom + 34, 64),
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.scanSummaryCard}>
              <View style={styles.scanSummaryHeaderRow}>
                <View
                  style={[
                    styles.scanSummaryIcon,
                    matchedMedicines.length > 0
                      ? styles.scanSummaryIconSuccess
                      : styles.scanSummaryIconWarning,
                  ]}
                >
                  {matchedMedicines.length > 0 ? (
                    <CheckCircle2
                      size={20}
                      color={SUCCESS_DARK}
                      strokeWidth={2.9}
                    />
                  ) : (
                    <AlertCircle
                      size={20}
                      color={WARNING_DARK}
                      strokeWidth={2.9}
                    />
                  )}
                </View>

                <View style={styles.scanSummaryHeadingBlock}>
                  <Text style={styles.scanSummaryTitle}>Scan complete</Text>

                  <Text style={styles.scanSummarySubtitle}>
                    {matchedMedicines.length > 0
                      ? `${matchedMedicines.length} medicine${
                          matchedMedicines.length === 1 ? "" : "s"
                        } found`
                      : "No catalogue matches found"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.scanStatusBadge,
                    matchedMedicines.length > 0
                      ? styles.scanStatusBadgeSuccess
                      : styles.scanStatusBadgeWarning,
                  ]}
                >
                  <Text
                    style={[
                      styles.scanStatusBadgeText,
                      matchedMedicines.length > 0
                        ? styles.scanStatusBadgeTextSuccess
                        : styles.scanStatusBadgeTextWarning,
                    ]}
                  >
                    {matchedMedicines.length > 0 ? "READY" : "REVIEW"}
                  </Text>
                </View>
              </View>

              <View style={styles.scanStatsRow}>
                <ScanStat
                  value={`${matchedMedicines.length}`}
                  label="Matched"
                />

                <View style={styles.scanStatDivider} />

                <ScanStat
                  value={`${totalDetectedMedicines}`}
                  label="Detected"
                />

                <View style={styles.scanStatDivider} />

                <ScanStat value={confidenceText} label="Confidence" />
              </View>
            </View>

            {matchedMedicines.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Matched medicines</Text>

                  <Text style={styles.sectionSubtitle}>
                    Review each medicine before creating reminders.
                  </Text>
                </View>

                {matchedMedicines.map((medicine, index) => (
                  <MedicinePrescriptionCard
                    key={`${medicine.brandName}-${medicine.dose}-${index}`}
                    medicine={medicine}
                    index={index}
                    onAdd={() => handleAddMedicine(medicine)}
                  />
                ))}
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
                    No medicine matched the catalogue
                  </Text>

                  <Text style={styles.notFoundText}>
                    The prescription text was read, but no confident medicine
                    match was found. Try scanning again with better lighting, or
                    ask a doctor before saving anything.
                  </Text>
                </View>

                <View style={styles.quickTipsCard}>
                  <Text style={styles.quickTipsTitle}>
                    Prescription scan tips
                  </Text>

                  <TipRow text="Keep the full prescription page inside the frame." />

                  <TipRow text="Make sure medicine names and dose patterns are readable." />

                  <TipRow text="Avoid shadows, folds, and blurred handwriting." />
                </View>
              </>
            )}
          </ScrollView>
        ) : null}

        {shouldShowFooter ? (
          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom + 6, 14),
              },
            ]}
          >
            <TouchableOpacity
              style={styles.footerPrimaryButton}
              activeOpacity={0.86}
              onPress={handleScanAgain}
            >
              <RefreshCw size={19} color={SURFACE} strokeWidth={2.6} />

              <Text style={styles.footerPrimaryButtonText}>Scan Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footerSecondaryButton}
              activeOpacity={0.86}
              onPress={handleAskDoctor}
            >
              <HelpCircle size={19} color={TEXT} strokeWidth={2.5} />

              <Text style={styles.footerSecondaryButtonText}>Ask Doctor</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const MedicinePrescriptionCard = ({
  medicine,
  index,
  onAdd,
}: {
  medicine: ParsedPrescriptionMedicine;
  index: number;
  onAdd: () => void;
}) => {
  const imageUrl = getMedicineImageUrl(medicine.imageUrl);

  return (
    <View style={styles.medicineCard}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardNumberCircle}>
          <Text style={styles.cardNumberText}>{index + 1}</Text>
        </View>

        <View style={styles.cardHeaderTextBlock}>
          <Text style={styles.cardHeaderTitle}>Prescription item</Text>

          <Text style={styles.cardHeaderSubtitle}>
            Confidence {medicine.matchConfidence}%
          </Text>
        </View>

        <View style={styles.matchedBadge}>
          <CheckCircle2
            size={14}
            color={SUCCESS_DARK}
            strokeWidth={2.7}
          />

          <Text style={styles.matchedBadgeText}>Matched</Text>
        </View>
      </View>

      <View style={styles.medicineIdentityRow}>
        <View style={styles.imageBox}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.medicineImage}
              resizeMode="contain"
              accessibilityLabel={
                medicine.imageAltText || `${medicine.brandName} reference`
              }
            />
          ) : (
            <View style={styles.noImageBox}>
              <Pill size={26} color={MUTED} strokeWidth={2.5} />

              <Text style={styles.noImageText}>No image</Text>
            </View>
          )}
        </View>

        <View style={styles.medicineMainInfo}>
          <Text style={styles.medicineName}>{medicine.brandName}</Text>

          <Text style={styles.genericName}>{medicine.genericName}</Text>

          <View style={styles.factRow}>
            <FactTile label="Dose" value={medicine.dose} />

            <FactTile label="Form" value={medicine.form} />
          </View>
        </View>
      </View>

      <ScheduleBlock medicine={medicine} />

      <View style={styles.infoPanel}>
        <View style={styles.panelTitleRow}>
          <View style={styles.panelIconCircle}>
            <Info size={19} color={PRIMARY} strokeWidth={2.6} />
          </View>

          <View style={styles.panelTitleTextBlock}>
            <Text style={styles.panelTitle}>Medicine details</Text>

            <Text style={styles.panelSubtitle}>Catalogue information</Text>
          </View>
        </View>

        <InfoRow
          label="Category"
          value={medicine.category}
          icon={<Pill size={18} color={PRIMARY} strokeWidth={2.5} />}
        />

        <InfoRow
          label="Used for"
          value={medicine.usedFor}
          icon={
            <Stethoscope
              size={18}
              color={PRIMARY}
              strokeWidth={2.5}
            />
          }
          isLast
        />
      </View>

      <SideEffectsBlock medicine={medicine} />

      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>Instructions</Text>

        <Text style={styles.instructionsText}>
          {medicine.instructions}
        </Text>
      </View>

      <View style={styles.safetyBox}>
        <View style={styles.safetyIconCircle}>
          <ShieldAlert size={22} color={DANGER} strokeWidth={2.7} />
        </View>

        <View style={styles.safetyTextBlock}>
          <Text style={styles.safetyTitle}>Safety note</Text>

          <Text style={styles.safetyText}>{medicine.safetyNote}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.86}
        onPress={onAdd}
      >
        <Text style={styles.addButtonText}>Add this medicine</Text>

        <ChevronRight size={20} color={SURFACE} strokeWidth={2.8} />
      </TouchableOpacity>
    </View>
  );
};

const ScheduleBlock = ({
  medicine,
}: {
  medicine: ParsedPrescriptionMedicine;
}) => {
  if (!medicine.prescriptionSchedule) {
    return (
      <View style={styles.scheduleFallback}>
        <Clock3 size={18} color={MUTED} strokeWidth={2.5} />

        <Text style={styles.scheduleFallbackText}>
          No prescription schedule detected
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.scheduleBlock}>
      <View style={styles.scheduleHeaderRow}>
        <View style={styles.scheduleTitleRow}>
          <Clock3 size={19} color={PRIMARY} strokeWidth={2.6} />

          <Text style={styles.scheduleTitle}>Dose timing</Text>
        </View>

        <View style={styles.patternBadge}>
          <Text style={styles.patternBadgeText}>
            {medicine.prescriptionSchedule.pattern}
          </Text>
        </View>
      </View>

      <View style={styles.timelineBox}>
        <TimelineItem
          label="Morning"
          active={medicine.prescriptionSchedule.morning}
        />

        <View style={styles.timelineConnector} />

        <TimelineItem
          label="Lunch"
          active={medicine.prescriptionSchedule.afternoon}
        />

        <View style={styles.timelineConnector} />

        <TimelineItem
          label="Night"
          active={medicine.prescriptionSchedule.night}
        />
      </View>

      <View style={styles.detectedInstructionBox}>
        <FileText
          size={17}
          color={PRIMARY_DARK}
          strokeWidth={2.5}
        />

        <Text style={styles.detectedInstructionText}>
          {medicine.prescriptionSchedule.instructionText}
        </Text>
      </View>
    </View>
  );
};

const SideEffectsBlock = ({
  medicine,
}: {
  medicine: ParsedPrescriptionMedicine;
}) => {
  return (
    <View style={styles.sideEffectsBox}>
      <View style={styles.sideEffectsHeader}>
        <View style={styles.dangerIconCircle}>
          <AlertCircle
            size={19}
            color={DANGER}
            strokeWidth={2.6}
          />
        </View>

        <View style={styles.panelTitleTextBlock}>
          <Text style={styles.panelTitle}>Common side effects</Text>

          <Text style={styles.panelSubtitle}>Review before saving</Text>
        </View>
      </View>

      <View style={styles.sideEffectWrap}>
        {medicine.commonSideEffects.length > 0 ? (
          medicine.commonSideEffects.map((sideEffect) => (
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

const ScanStat = ({
  value,
  label,
}: {
  value: string;
  label: string;
}) => {
  return (
    <View style={styles.scanStat}>
      <Text style={styles.scanStatValue}>{value}</Text>

      <Text style={styles.scanStatLabel}>{label}</Text>
    </View>
  );
};

const FactTile = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  return (
    <View style={styles.factTile}>
      <Text style={styles.factLabel}>{label}</Text>

      <Text style={styles.factValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

const TimelineItem = ({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) => {
  return (
    <View style={styles.timelineItem}>
      <View
        style={[
          styles.timelineDot,
          active
            ? styles.timelineDotActive
            : styles.timelineDotInactive,
        ]}
      >
        {active ? (
          <CheckCircle2
            size={14}
            color={SURFACE}
            strokeWidth={3}
          />
        ) : null}
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
    <View
      style={[
        styles.infoRow,
        isLast ? styles.rowLast : undefined,
      ]}
    >
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

export default PrescriptionScanResultScreen;

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

  scanSummaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
    marginBottom: 18,
  },

  scanSummaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  scanSummaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  scanSummaryIconSuccess: {
    backgroundColor: SUCCESS_LIGHT,
  },

  scanSummaryIconWarning: {
    backgroundColor: WARNING_LIGHT,
  },

  scanSummaryHeadingBlock: {
    flex: 1,
    paddingRight: 8,
  },

  scanSummaryTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  scanSummarySubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3,
  },

  scanStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  scanStatusBadgeSuccess: {
    backgroundColor: SUCCESS_LIGHT,
  },

  scanStatusBadgeWarning: {
    backgroundColor: WARNING_LIGHT,
  },

  scanStatusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  scanStatusBadgeTextSuccess: {
    color: SUCCESS_DARK,
  },

  scanStatusBadgeTextWarning: {
    color: WARNING_DARK,
  },

  scanStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SOFT_PANEL,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 11,
    marginTop: 14,
  },

  scanStat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  scanStatValue: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
  },

  scanStatLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 3,
  },

  scanStatDivider: {
    width: 1,
    height: 31,
    backgroundColor: BORDER,
  },

  sectionHeader: {
    paddingHorizontal: 2,
    marginBottom: 10,
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.25,
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 3,
  },

  medicineCard: {
    backgroundColor: SURFACE,
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  cardNumberCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  cardNumberText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "900",
  },

  cardHeaderTextBlock: {
    flex: 1,
  },

  cardHeaderTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },

  cardHeaderSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

  matchedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  matchedBadgeText: {
    color: SUCCESS_DARK,
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 5,
  },

  medicineIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  imageBox: {
    width: 98,
    height: 98,
    borderRadius: 20,
    backgroundColor: SOFT_PANEL,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 13,
  },

  medicineImage: {
    width: "100%",
    height: "100%",
  },

  noImageBox: {
    alignItems: "center",
    justifyContent: "center",
  },

  noImageText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 5,
  },

  medicineMainInfo: {
    flex: 1,
  },

  medicineName: {
    color: TEXT,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.35,
  },

  genericName: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 4,
  },

  factRow: {
    flexDirection: "row",
    marginTop: 11,
  },

  factTile: {
    flex: 1,
    backgroundColor: SOFT_PANEL,
    borderRadius: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 8,
  },

  factLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 3,
  },

  factValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },

  scheduleBlock: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginTop: 14,
  },

  scheduleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  scheduleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  scheduleTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 7,
  },

  patternBadge: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    marginTop: 13,
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

  scheduleFallback: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },

  scheduleFallbackText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 8,
  },

  infoPanel: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginTop: 14,
  },

  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  panelIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  dangerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  panelTitleTextBlock: {
    flex: 1,
  },

  panelTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },

  panelSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  rowLast: {
    borderBottomWidth: 0,
  },

  infoRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  infoTextBlock: {
    flex: 1,
  },

  infoLabel: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
  },

  infoValue: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },

  sideEffectsBox: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 14,
    marginTop: 14,
  },

  sideEffectsHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  sideEffectWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },

  sideEffectChip: {
    backgroundColor: SURFACE,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginRight: 7,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  sideEffectText: {
    color: DANGER_DARK,
    fontSize: 11,
    fontWeight: "900",
  },

  emptyInlineText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "800",
  },

  instructionsBox: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 14,
  },

  instructionsTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
  },

  instructionsText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },

  safetyBox: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 13,
    marginTop: 14,
    flexDirection: "row",
  },

  safetyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  safetyTextBlock: {
    flex: 1,
  },

  safetyTitle: {
    color: DANGER_DARK,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 4,
  },

  safetyText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },

  addButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    flexDirection: "row",
  },

  addButtonText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "900",
    marginRight: 7,
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

  footerPrimaryButton: {
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  footerPrimaryButtonText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },

  footerSecondaryButton: {
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

  footerSecondaryButtonText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
});