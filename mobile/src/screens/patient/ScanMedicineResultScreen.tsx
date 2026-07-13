import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  medicineScanApi,
  type ParsedMedicineScan,
} from "../../services/medicineScanApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ScanMedicineResult">;

const HEADER_BLUE = "#2563EB";
const BODY_BACKGROUND = "#F8FAFC";

const ScanMedicineResultScreen = ({ navigation, route }: Props) => {
  const [scanResult, setScanResult] = useState<ParsedMedicineScan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [screenError, setScreenError] = useState("");

  const scannedImageUri = route.params.scannedImageUri;
  const isMatched = Boolean(scanResult?.matched);

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
      <View style={styles.scheduleCard}>
        <View style={styles.scheduleHeaderRow}>
          <Text style={styles.scheduleTitle}>Schedule Detected</Text>

          <View style={styles.patternBadge}>
            <Text style={styles.patternBadgeText}>
              {scanResult.prescriptionSchedule.pattern}
            </Text>
          </View>
        </View>

        <View style={styles.timeRow}>
          <View
            style={[
              styles.timePill,
              scanResult.prescriptionSchedule.morning && styles.activeTimePill,
            ]}
          >
            <Text
              style={[
                styles.timePillText,
                scanResult.prescriptionSchedule.morning &&
                  styles.activeTimePillText,
              ]}
            >
              Morning
            </Text>
          </View>

          <View
            style={[
              styles.timePill,
              scanResult.prescriptionSchedule.afternoon &&
                styles.activeTimePill,
            ]}
          >
            <Text
              style={[
                styles.timePillText,
                scanResult.prescriptionSchedule.afternoon &&
                  styles.activeTimePillText,
              ]}
            >
              Lunch
            </Text>
          </View>

          <View
            style={[
              styles.timePill,
              scanResult.prescriptionSchedule.night && styles.activeTimePill,
            ]}
          >
            <Text
              style={[
                styles.timePillText,
                scanResult.prescriptionSchedule.night &&
                  styles.activeTimePillText,
              ]}
            >
              Night
            </Text>
          </View>
        </View>

        <Text style={styles.scheduleInfoText}>
          {scanResult.prescriptionSchedule.instructionText}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_BLUE} />

      <SafeAreaView style={styles.headerSafeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Medicine Scan Result</Text>
            <Text style={styles.headerSubtitle}>
              Matched medicine from catalogue
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.bodySafeArea} edges={["bottom"]}>
        <View style={styles.body}>
          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={HEADER_BLUE} />
              <Text style={styles.centerTitle}>Analysing medicine...</Text>
              <Text style={styles.centerSubtitle}>
                Matching scan with medicine catalogue
              </Text>
            </View>
          ) : screenError ? (
            <View style={styles.centerState}>
              <Text style={styles.errorIcon}>!</Text>
              <Text style={styles.centerTitle}>Unable to analyse scan</Text>
              <Text style={styles.centerSubtitle}>{screenError}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadScanResult}
                activeOpacity={0.85}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : scanResult ? (
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.imageCard}>
                <Text style={styles.cardTitle}>Scanned Medicine</Text>

                <View style={styles.scannedImageBox}>
                  {scannedImageUri ? (
                    <Image
                      source={{ uri: scannedImageUri }}
                      style={styles.scannedImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.noImageBox}>
                      <Text style={styles.noImageIcon}>⌁</Text>
                      <Text style={styles.noImageText}>
                        Preview unavailable
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.medicineHeroCard}>
                <View
                  style={[
                    styles.matchPill,
                    isMatched
                      ? styles.matchPillSuccess
                      : styles.matchPillWarning,
                  ]}
                >
                  <Text
                    style={[
                      styles.matchPillText,
                      isMatched
                        ? styles.matchPillSuccessText
                        : styles.matchPillWarningText,
                    ]}
                  >
                    {isMatched ? "Matched" : "Not Found"}
                  </Text>
                </View>

                {isMatched ? (
                  <>
                    <Text style={styles.medicineName}>
                      {scanResult.brandName}
                    </Text>

                    <Text style={styles.genericText}>
                      {scanResult.genericName}
                    </Text>

                    <View style={styles.keyInfoRow}>
                      <View style={styles.keyInfoBox}>
                        <Text style={styles.keyInfoLabel}>Dose</Text>
                        <Text style={styles.keyInfoValue}>
                          {scanResult.dose}
                        </Text>
                      </View>

                      <View style={styles.keyInfoBoxLast}>
                        <Text style={styles.keyInfoLabel}>Form</Text>
                        <Text style={styles.keyInfoValue}>
                          {scanResult.form}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.notFoundTitle}>
                      Medicine not found in catalogue
                    </Text>
                    <Text style={styles.notFoundText}>
                      The scan did not confidently match a saved medicine.
                      Please scan again with better lighting or add the medicine
                      manually.
                    </Text>
                  </>
                )}
              </View>

              {renderSchedule()}

              {isMatched ? (
                <View style={styles.infoCard}>
                  <Text style={styles.infoCardTitle}>
                    Medicine Information
                  </Text>

                  <View style={styles.infoRow}>
                    <View style={styles.infoIconCircle}>
                      <Text style={styles.infoIcon}>i</Text>
                    </View>

                    <View style={styles.infoTextBlock}>
                      <Text style={styles.infoLabel}>Category</Text>
                      <Text style={styles.infoText}>{scanResult.category}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.infoIconCircleGreen}>
                      <Text style={styles.infoIconGreen}>✓</Text>
                    </View>

                    <View style={styles.infoTextBlock}>
                      <Text style={styles.infoLabel}>Used for</Text>
                      <Text style={styles.infoText}>{scanResult.usedFor}</Text>
                    </View>
                  </View>

                  <View style={styles.sideEffectBlock}>
                    <Text style={styles.sideEffectTitle}>
                      Common Side Effects
                    </Text>

                    <View style={styles.sideEffectRow}>
                      {scanResult.commonSideEffects.length > 0 ? (
                        scanResult.commonSideEffects.map((sideEffect) => (
                          <View key={sideEffect} style={styles.sideEffectChip}>
                            <Text style={styles.sideEffectText}>
                              {sideEffect}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noSideEffectText}>
                          No common side effects listed.
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.instructionBlock}>
                    <Text style={styles.instructionTitle}>Instructions</Text>
                    <Text style={styles.instructionText}>
                      {scanResult.instructions}
                    </Text>
                  </View>
                </View>
              ) : null}

              {isMatched ? (
                <View style={styles.safetyCard}>
                  <View style={styles.safetyIconCircle}>
                    <Text style={styles.safetyIcon}>!</Text>
                  </View>

                  <View style={styles.safetyTextBlock}>
                    <Text style={styles.safetyTitle}>Safety Note</Text>
                    <Text style={styles.safetyText}>
                      {scanResult.safetyNote}
                    </Text>
                  </View>
                </View>
              ) : null}

              {isMatched ? (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleAddToReminder}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Add to Reminder</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleScanAgain}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Scan Again</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleAskDoctor}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>Ask Doctor</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
};

export default ScanMedicineResultScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: HEADER_BLUE,
  },
  headerSafeArea: {
    backgroundColor: HEADER_BLUE,
  },
  bodySafeArea: {
    flex: 1,
    backgroundColor: BODY_BACKGROUND,
  },
  header: {
    backgroundColor: HEADER_BLUE,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  body: {
    flex: 1,
    backgroundColor: BODY_BACKGROUND,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 34,
  },
  centerState: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  centerTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 18,
    textAlign: "center",
  },
  centerSubtitle: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  errorIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 30,
    fontWeight: "900",
  },
  retryButton: {
    marginTop: 22,
    backgroundColor: HEADER_BLUE,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  imageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 14,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },
  scannedImageBox: {
    width: "100%",
    height: 230,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  scannedImage: {
    width: "100%",
    height: "100%",
  },
  noImageBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  noImageIcon: {
    color: "#94A3B8",
    fontSize: 26,
    fontWeight: "900",
  },
  noImageText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  medicineHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  matchPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  matchPillSuccess: {
    backgroundColor: "#DCFCE7",
  },
  matchPillWarning: {
    backgroundColor: "#FEF3C7",
  },
  matchPillText: {
    fontSize: 11,
    fontWeight: "900",
  },
  matchPillSuccessText: {
    color: "#15803D",
  },
  matchPillWarningText: {
    color: "#B45309",
  },
  medicineName: {
    color: "#0F172A",
    fontSize: 25,
    fontWeight: "900",
  },
  genericText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 14,
  },
  keyInfoRow: {
    flexDirection: "row",
  },
  keyInfoBox: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  keyInfoBoxLast: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  keyInfoLabel: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },
  keyInfoValue: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  notFoundTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  notFoundText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  scheduleCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 14,
  },
  scheduleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scheduleTitle: {
    color: "#047857",
    fontSize: 14,
    fontWeight: "900",
  },
  patternBadge: {
    backgroundColor: "#10B981",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  patternBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  timeRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  timePill: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1FAE5",
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
    marginRight: 7,
  },
  activeTimePill: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  timePillText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
  },
  activeTimePillText: {
    color: "#FFFFFF",
  },
  scheduleInfoText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 10,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  infoCardTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  infoIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoIcon: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "900",
  },
  infoIconCircleGreen: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoIconGreen: {
    color: "#15803D",
    fontSize: 15,
    fontWeight: "900",
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 4,
  },
  infoText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  sideEffectBlock: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 2,
  },
  sideEffectTitle: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 10,
  },
  sideEffectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sideEffectChip: {
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  sideEffectText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "900",
  },
  noSideEffectText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "800",
  },
  instructionBlock: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 14,
  },
  instructionTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
  },
  instructionText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  safetyCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FB923C",
    flexDirection: "row",
    marginBottom: 14,
  },
  safetyIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  safetyIcon: {
    color: "#EA580C",
    fontSize: 17,
    fontWeight: "900",
  },
  safetyTextBlock: {
    flex: 1,
  },
  safetyTitle: {
    color: "#9A3412",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 5,
  },
  safetyText: {
    color: "#C2410C",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: HEADER_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "900",
  },
});