import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { medicineOcrService } from "../../services/medicineOcrService";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ScanMedicine">;

type ScanMode = "LABEL" | "PRESCRIPTION";
type ScanSource = "CAMERA" | "GALLERY";

const HEADER_BLUE = "#2563EB";
const DARK_SCANNER = "#0B1020";

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
    .map((line) => line.trim())
    .filter(Boolean);

  const hasPrescriptionPattern =
    PRESCRIPTION_PATTERN_REGEX.test(detectedText) ||
    PRESCRIPTION_PATTERN_REGEX.test(normalizedText);

  const medicineLikeLines = lines.filter((line) => {
    const hasDose = DOSE_REGEX.test(line);

    const hasMedicineKeyword =
      /\b(tab|tablet|cap|capsule|syp|syrup|gel|cream|ointment|drop|inhaler|mg|ml)\b/i.test(
        line
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
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_BLUE} />

      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(18, insets.top + 10),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>Smart Medicine Scanner</Text>
          <Text style={styles.headerSubtitle}>
            Scan medicine labels or prescriptions
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(28, insets.bottom + 28),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scannerCard}>
          <View style={styles.cameraArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeftCorner]} />
              <View style={[styles.corner, styles.topRightCorner]} />
              <View style={[styles.corner, styles.bottomLeftCorner]} />
              <View style={[styles.corner, styles.bottomRightCorner]} />

              <Text style={styles.frameText}>Place text inside the frame</Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusHeaderRow}>
              {isScanning ? (
                <ActivityIndicator size="small" color={HEADER_BLUE} />
              ) : (
                <View style={styles.readyDot} />
              )}

              <Text style={styles.statusTitle}>{getStatusText()}</Text>
            </View>

            <Text style={styles.statusHint}>
              Use good lighting and keep medicine or prescription text clear.
            </Text>
          </View>
        </View>

        <View style={styles.optionCard}>
          <Text style={styles.sectionTitle}>Choose scan option</Text>

          <Text style={styles.groupLabel}>Camera</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleCameraScan("LABEL")}
            disabled={isScanning}
            activeOpacity={0.85}
          >
            {isLabelCameraLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Scan Medicine Label</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.prescriptionButton}
            onPress={() => handleCameraScan("PRESCRIPTION")}
            disabled={isScanning}
            activeOpacity={0.85}
          >
            {isPrescriptionCameraLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Scan Prescription</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.groupLabel}>Gallery</Text>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleGalleryUpload}
            disabled={isScanning}
            activeOpacity={0.85}
          >
            {isGalleryLoading ? (
              <ActivityIndicator size="small" color={HEADER_BLUE} />
            ) : (
              <Text style={styles.uploadButtonText}>Upload from Gallery</Text>
            )}
          </TouchableOpacity>

          
        </View>
      </ScrollView>
    </View>
  );
};

export default ScanMedicineScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: HEADER_BLUE,
  },
  header: {
    backgroundColor: HEADER_BLUE,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "300",
    marginTop: -2,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#DBEAFE",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  body: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  scannerCard: {
    backgroundColor: DARK_SCANNER,
    borderRadius: 22,
    overflow: "hidden",
  },
  cameraArea: {
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },
  scanFrame: {
    width: "100%",
    height: 155,
    borderWidth: 1,
    borderColor: "rgba(45,212,191,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#14B8A6",
  },
  topLeftCorner: {
    top: -1,
    left: -1,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  topRightCorner: {
    top: -1,
    right: -1,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  bottomLeftCorner: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  bottomRightCorner: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  frameText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    backgroundColor: "rgba(0,0,0,0.68)",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 8,
    textAlign: "center",
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    margin: 14,
    borderRadius: 16,
    padding: 16,
  },
  statusHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  readyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#14B8A6",
  },
  statusTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 10,
  },
  statusHint: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 8,
  },
  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 14,
  },
  groupLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  primaryButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: HEADER_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  prescriptionButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: "#14B8A6",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  uploadButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonText: {
    color: HEADER_BLUE,
    fontSize: 15,
    fontWeight: "900",
  },
  autoDetectText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 10,
  },
  footerNote: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 16,
  },
});