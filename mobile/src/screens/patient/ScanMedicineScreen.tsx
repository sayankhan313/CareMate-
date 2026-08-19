import React, { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
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
  ClipboardList,
  FileImage,
  Pill,
  ScanLine,
  Sparkles,
  Upload,
} from "lucide-react-native";
import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedAlert as Alert } from "../../utils/localizedAlert";

import { medicineOcrService } from "../../services/medicineOcrService";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ScanMedicine">;

type ScanMode = "LABEL" | "PRESCRIPTION";
type ScanSource = "CAMERA" | "GALLERY";

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
const WARNING = "#F6A545";
const WARNING_LIGHT = "#FFF3E2";

const DARK_SCANNER = "#111936";
const DARK_SCANNER_SOFT = "#1E2846";

const PRESCRIPTION_PATTERN_REGEX =
  /\b[01il|]\s*[-–—/\s]\s*[0o]\s*[-–—/\s]\s*[01il|]\b/i;

const DOSE_REGEX = /\b\d+(?:\.\d+)?\s?(mg|mcg|g|ml|iu|units|%)\b/i;

const inferGalleryScanMode = (detectedText: string): ScanMode => {
  const normalizedText = detectedText
    .toLowerCase()
    .replace(/[|]/g, "1")
    .replace(/\bl\b/g, "1")
    .replace(/\bi\b/g, "1")
    .replace(/\bo\b/g, "0");

  const lines = normalizedText
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  const hasPrescriptionPattern =
    PRESCRIPTION_PATTERN_REGEX.test(detectedText) ||
    PRESCRIPTION_PATTERN_REGEX.test(normalizedText);

  const medicineLikeLines = lines.filter(line => {
    const hasDose = DOSE_REGEX.test(line);

    const hasMedicineKeyword =
      /\b(tab|tablet|cap|capsule|syp|syrup|gel|cream|ointment|drop|inhaler|mg|ml)\b/i.test(
        line,
      );

    const hasSchedule =
      PRESCRIPTION_PATTERN_REGEX.test(line) ||
      /\b(od|bd|tds|sos|morning|afternoon|night|daily|twice)\b/i.test(line);

    return hasDose || hasMedicineKeyword || hasSchedule;
  });

  if (hasPrescriptionPattern && lines.length >= 2) {
    return "PRESCRIPTION";
  }

  if (medicineLikeLines.length >= 2) {
    return "PRESCRIPTION";
  }

  if (lines.length >= 5 && medicineLikeLines.length >= 1) {
    return "PRESCRIPTION";
  }

  return "LABEL";
};

const ScanMedicineScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();

  const [isScanning, setIsScanning] = useState(false);
  const [activeScanMode, setActiveScanMode] = useState<ScanMode | null>(null);
  const [activeSource, setActiveSource] = useState<ScanSource | null>(null);

  const navigateWithOcrText = ({
    scanMode,
    detectedText,
    ocrConfidence,
    source,
    imageUri,
  }: {
    scanMode: ScanMode;
    detectedText: string;
    ocrConfidence: number;
    source: ScanSource;
    imageUri: string;
  }) => {
    if (scanMode === "PRESCRIPTION") {
      navigation.navigate("PrescriptionScanResult", {
        detectedText,
        ocrConfidence,
        source,
        scannedImageUri: imageUri,
      });

      return;
    }

    navigation.navigate("ScanMedicineResult", {
      detectedText,
      ocrConfidence,
      source,
      scannedImageUri: imageUri,
    });
  };

  const handleCameraScan = async (scanMode: ScanMode) => {
    if (isScanning) {
      return;
    }

    try {
      setIsScanning(true);
      setActiveScanMode(scanMode);
      setActiveSource("CAMERA");

      const result = await medicineOcrService.scanFromCamera();

      if (!result) {
        return;
      }

      navigateWithOcrText({
        scanMode,
        detectedText: result.detectedText,
        ocrConfidence: result.ocrConfidence,
        source: result.source,
        imageUri: result.imageUri,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to scan medicine text. Please try again.";

      Alert.alert("Scan failed", message);
    } finally {
      setIsScanning(false);
      setActiveScanMode(null);
      setActiveSource(null);
    }
  };

  const handleGalleryUpload = async () => {
    if (isScanning) {
      return;
    }

    try {
      setIsScanning(true);
      setActiveScanMode(null);
      setActiveSource("GALLERY");

      const result = await medicineOcrService.scanFromGallery();

      if (!result) {
        return;
      }

      const detectedScanMode = inferGalleryScanMode(result.detectedText);

      navigateWithOcrText({
        scanMode: detectedScanMode,
        detectedText: result.detectedText,
        ocrConfidence: result.ocrConfidence,
        source: result.source,
        imageUri: result.imageUri,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to read text from selected image. Please try again.";

      Alert.alert("Upload failed", message);
    } finally {
      setIsScanning(false);
      setActiveScanMode(null);
      setActiveSource(null);
    }
  };

  const getStatusText = () => {
    if (!isScanning) {
      return "Ready to scan";
    }

    if (activeSource === "GALLERY") {
      return "Reading image from gallery...";
    }

    if (activeScanMode === "PRESCRIPTION") {
      return "Scanning prescription...";
    }

    return "Scanning medicine label...";
  };

  const isLabelCameraLoading =
    isScanning && activeScanMode === "LABEL" && activeSource === "CAMERA";

  const isPrescriptionCameraLoading =
    isScanning &&
    activeScanMode === "PRESCRIPTION" &&
    activeSource === "CAMERA";

  const isGalleryLoading = isScanning && activeSource === "GALLERY";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
            disabled={isScanning}
          >
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.7} />
          </TouchableOpacity>

          <View style={styles.appBarTextBlock}>
            <Text style={styles.appBarTitle}>Medicine Scanner</Text>
            <Text style={styles.appBarSubtitle}>
              Scan labels, prescriptions or gallery images
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(34, insets.bottom + 36),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.scannerPanel}>
            <View style={styles.scannerTopRow}>
              <View style={styles.scannerStatusBadge}>
                {isScanning ? (
                  <ActivityIndicator size="small" color={SURFACE} />
                ) : (
                  <View style={styles.scannerStatusDot} />
                )}

                <Text style={styles.scannerStatusText}>{getStatusText()}</Text>
              </View>

              <View style={styles.aiBadge}>
                <Sparkles size={14} color={PRIMARY_DARK} strokeWidth={2.6} />
                <Text style={styles.aiBadgeText}>OCR</Text>
              </View>
            </View>

            <View style={styles.cameraArea}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeftCorner]} />
                <View style={[styles.corner, styles.topRightCorner]} />
                <View style={[styles.corner, styles.bottomLeftCorner]} />
                <View style={[styles.corner, styles.bottomRightCorner]} />

                <View style={styles.scanLine} />

                <View style={styles.frameCenterContent}>
                  <ScanLine size={34} color={SURFACE} strokeWidth={2.6} />
                  <Text style={styles.frameText}>Place text inside frame</Text>
                </View>
              </View>
            </View>

            <View style={styles.scannerHintBox}>
              <CheckCircle2 size={17} color={SUCCESS} strokeWidth={2.6} />

              <Text style={styles.scannerHintText}>
                Keep the medicine name, dose and timing pattern clearly visible.
              </Text>
            </View>
          </View>

          <View style={styles.scanTypeHeader}>
            <Text style={styles.scanTypeTitle}>Choose scan type</Text>

            <Text style={styles.scanTypeSubtitle}>
              Tap one option to start scanning.
            </Text>
          </View>

          <View style={styles.buttonStack}>
            <ScanModeButton
              title="Medicine Label"
              subtitle="Single medicine strip, box, tube or bottle"
              icon={<Pill size={24} color={PRIMARY} strokeWidth={2.7} />}
              isLoading={isLabelCameraLoading}
              disabled={isScanning}
              onPress={() => handleCameraScan("LABEL")}
              primary
            />

            <ScanModeButton
              title="Prescription"
              subtitle="Multiple medicines and 1-0-1 dose pattern"
              icon={
                <ClipboardList size={24} color={PRIMARY} strokeWidth={2.7} />
              }
              isLoading={isPrescriptionCameraLoading}
              disabled={isScanning}
              onPress={() => handleCameraScan("PRESCRIPTION")}
            />

            <ScanModeButton
              title="Gallery Image"
              subtitle="Upload image and auto-detect scan type"
              icon={<FileImage size={24} color={PRIMARY} strokeWidth={2.7} />}
              isLoading={isGalleryLoading}
              disabled={isScanning}
              onPress={handleGalleryUpload}
              uploadAction
            />
          </View>

          <View style={styles.tipPanel}>
            <View style={styles.tipIconCircle}>
              <AlertCircle size={20} color={WARNING} strokeWidth={2.6} />
            </View>

            <View style={styles.tipTextBlock}>
              <Text style={styles.tipTitle}>Before scanning</Text>

              <Text style={styles.tipText}>
                Avoid blur, shadows and glare. Make sure the medicine name,
                strength and prescription pattern are visible.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const ScanModeButton = ({
  title,
  subtitle,
  icon,
  isLoading,
  disabled,
  primary,
  uploadAction,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  isLoading: boolean;
  disabled: boolean;
  primary?: boolean;
  uploadAction?: boolean;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.scanButton,
        primary ? styles.scanButtonPrimary : styles.scanButtonSecondary,
        disabled ? styles.disabledButton : undefined,
      ]}
      activeOpacity={0.86}
      onPress={onPress}
      disabled={disabled}
    >
      <View
        style={[
          styles.scanButtonIcon,
          primary ? styles.scanButtonIconPrimary : undefined,
        ]}
      >
        {isLoading ? <ActivityIndicator size="small" color={PRIMARY} /> : icon}
      </View>

      <View style={styles.scanButtonTextBlock}>
        <Text
          style={[
            styles.scanButtonTitle,
            primary ? styles.scanButtonTitlePrimary : undefined,
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.scanButtonSubtitle,
            primary ? styles.scanButtonSubtitlePrimary : undefined,
          ]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>

      <View
        style={[
          styles.scanButtonAction,
          primary ? styles.scanButtonActionPrimary : undefined,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={primary ? SURFACE : PRIMARY}
          />
        ) : uploadAction ? (
          <Upload
            size={19}
            color={primary ? SURFACE : PRIMARY}
            strokeWidth={2.8}
          />
        ) : (
          <ChevronRight
            size={21}
            color={primary ? SURFACE : PRIMARY}
            strokeWidth={2.9}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default ScanMedicineScreen;

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

  body: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  scannerPanel: {
    backgroundColor: DARK_SCANNER,
    borderRadius: 28,
    padding: 15,
    marginBottom: 16,
    overflow: "hidden",
  },

  scannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  scannerStatusBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DARK_SCANNER_SOFT,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginRight: 10,
  },

  scannerStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: SUCCESS,
  },

  scannerStatusText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 8,
  },

  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  aiBadgeText: {
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 5,
  },

  cameraArea: {
    height: 238,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    marginTop: 12,
  },

  scanFrame: {
    width: "100%",
    height: 164,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  scanLine: {
    position: "absolute",
    left: 22,
    right: 22,
    height: 2,
    backgroundColor: "#7DD3FC",
    opacity: 0.9,
  },

  corner: {
    position: "absolute",
    width: 33,
    height: 33,
    borderColor: "#7DD3FC",
  },

  topLeftCorner: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 22,
  },

  topRightCorner: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 22,
  },

  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 22,
  },

  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 22,
  },

  frameCenterContent: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,25,54,0.72)",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },

  frameText: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center",
  },

  scannerHintBox: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  scannerHintText: {
    flex: 1,
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginLeft: 9,
  },

  scanTypeHeader: {
    paddingHorizontal: 2,
    marginBottom: 10,
  },

  scanTypeTitle: {
    color: TEXT,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.25,
  },

  scanTypeSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 3,
  },

  buttonStack: {
    marginBottom: 14,
  },

  scanButton: {
    minHeight: 78,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
  },

  scanButtonPrimary: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  scanButtonSecondary: {
    backgroundColor: SURFACE,
    borderColor: BORDER,
  },

  disabledButton: {
    opacity: 0.65,
  },

  scanButtonIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  scanButtonIconPrimary: {
    backgroundColor: SURFACE,
  },

  scanButtonTextBlock: {
    flex: 1,
    paddingRight: 10,
  },

  scanButtonTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
  },

  scanButtonTitlePrimary: {
    color: SURFACE,
  },

  scanButtonSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 4,
  },

  scanButtonSubtitlePrimary: {
    color: "#EAF1FF",
  },

  scanButtonAction: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  scanButtonActionPrimary: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  tipPanel: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  tipIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: WARNING_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  tipTextBlock: {
    flex: 1,
  },

  tipTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },

  tipText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
});