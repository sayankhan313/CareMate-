import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const HEADER_BLUE = "#2563EB";
const BODY_BACKGROUND = "#F8FAFC";

const PrescriptionScanResultScreen = ({ navigation, route }: Props) => {
  const [scanResult, setScanResult] = useState<ParsedPrescriptionScan | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [screenError, setScreenError] = useState("");

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

  const handleAddMedicine = (medicine: ParsedPrescriptionMedicine) => {
    navigation.navigate("ConfirmReminder", {
      medicineDraft: medicine.medicineDraft,
    });
  };

  const handleAskDoctor = () => {
    Alert.alert(
      "Doctor confirmation",
      "Please confirm the medicine and dosage with your prescription, doctor, or pharmacist before saving."
    );
  };

  const handleScanAgain = () => {
    navigation.goBack();
  };

  const renderSchedule = (medicine: ParsedPrescriptionMedicine) => {
    if (!medicine.prescriptionSchedule) {
      return (
        <View style={styles.scheduleFallback}>
          <Text style={styles.scheduleFallbackText}>
            No prescription schedule detected
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.scheduleBox}>
        <View style={styles.scheduleHeaderRow}>
          <Text style={styles.scheduleTitle}>Schedule Detected</Text>

          <View style={styles.patternBadge}>
            <Text style={styles.patternBadgeText}>
              {medicine.prescriptionSchedule.pattern}
            </Text>
          </View>
        </View>

        <View style={styles.timeRow}>
          <View
            style={[
              styles.timePill,
              medicine.prescriptionSchedule.morning && styles.activeTimePill,
            ]}
          >
            <Text
              style={[
                styles.timePillText,
                medicine.prescriptionSchedule.morning &&
                  styles.activeTimePillText,
              ]}
            >
              Morning
            </Text>
          </View>

          <View
            style={[
              styles.timePill,
              medicine.prescriptionSchedule.afternoon && styles.activeTimePill,
            ]}
          >
            <Text
              style={[
                styles.timePillText,
                medicine.prescriptionSchedule.afternoon &&
                  styles.activeTimePillText,
              ]}
            >
              Lunch
            </Text>
          </View>

          <View
            style={[
              styles.timePill,
              medicine.prescriptionSchedule.night && styles.activeTimePill,
            ]}
          >
            <Text
              style={[
                styles.timePillText,
                medicine.prescriptionSchedule.night &&
                  styles.activeTimePillText,
              ]}
            >
              Night
            </Text>
          </View>
        </View>

        <Text style={styles.scheduleInfoText}>
          {medicine.prescriptionSchedule.instructionText}
        </Text>
      </View>
    );
  };

  const renderSideEffects = (medicine: ParsedPrescriptionMedicine) => {
    return (
      <View style={styles.sideEffectBlock}>
        <Text style={styles.sideEffectTitle}>Common Side Effects</Text>

        <View style={styles.sideEffectRow}>
          {medicine.commonSideEffects.length > 0 ? (
            medicine.commonSideEffects.map((sideEffect) => (
              <View key={sideEffect} style={styles.sideEffectChip}>
                <Text style={styles.sideEffectText}>{sideEffect}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noSideEffectText}>
              No common side effects listed.
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderMedicineCard = (
    medicine: ParsedPrescriptionMedicine,
    index: number
  ) => {
    const imageUrl = getMedicineImageUrl(medicine.imageUrl);

    return (
      <View key={`${medicine.brandName}-${medicine.dose}-${index}`} style={styles.medicineCard}>
        <View style={styles.cardTopRow}>
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
                <Text style={styles.noImageIcon}>⌁</Text>
                <Text style={styles.noImageText}>No image</Text>
              </View>
            )}
          </View>

          <View style={styles.medicineMainInfo}>
            <View style={styles.statusRow}>
              <View style={styles.matchedBadge}>
                <Text style={styles.matchedBadgeText}>Matched</Text>
              </View>

              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {medicine.matchConfidence}%
                </Text>
              </View>
            </View>

            <Text style={styles.medicineName}>{medicine.brandName}</Text>
            <Text style={styles.genericName}>{medicine.genericName}</Text>

            <View style={styles.keyInfoRow}>
              <View style={styles.keyInfoBox}>
                <Text style={styles.keyInfoLabel}>Dose</Text>
                <Text style={styles.keyInfoValue}>{medicine.dose}</Text>
              </View>

              <View style={styles.keyInfoBoxLast}>
                <Text style={styles.keyInfoLabel}>Form</Text>
                <Text style={styles.keyInfoValue}>{medicine.form}</Text>
              </View>
            </View>
          </View>
        </View>

        {renderSchedule(medicine)}

        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Medicine Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoIcon}>i</Text>
            </View>

            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoText}>{medicine.category}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconCircleGreen}>
              <Text style={styles.infoIconGreen}>✓</Text>
            </View>

            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>Used for</Text>
              <Text style={styles.infoText}>{medicine.usedFor}</Text>
            </View>
          </View>

          {renderSideEffects(medicine)}

          <View style={styles.instructionBlock}>
            <Text style={styles.instructionTitle}>Instructions</Text>
            <Text style={styles.instructionText}>{medicine.instructions}</Text>
          </View>
        </View>

        <View style={styles.safetyBox}>
          <View style={styles.safetyIconCircle}>
            <Text style={styles.safetyIcon}>!</Text>
          </View>

          <View style={styles.safetyTextBlock}>
            <Text style={styles.safetyTitle}>Safety Note</Text>
            <Text style={styles.safetyText}>{medicine.safetyNote}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddMedicine(medicine)}
          activeOpacity={0.85}
        >
          <Text style={styles.addButtonText}>Add to Reminder</Text>
        </TouchableOpacity>
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
            <Text style={styles.headerTitle}>Prescription Scan</Text>
            <Text style={styles.headerSubtitle}>
              Matched medicines from catalogue
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.bodySafeArea} edges={["bottom"]}>
        <View style={styles.body}>
          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={HEADER_BLUE} />
              <Text style={styles.centerTitle}>Analysing prescription...</Text>
              <Text style={styles.centerSubtitle}>
                Matching medicines with the catalogue
              </Text>
            </View>
          ) : screenError ? (
            <View style={styles.centerState}>
              <Text style={styles.errorIcon}>!</Text>
              <Text style={styles.centerTitle}>Unable to analyse scan</Text>
              <Text style={styles.centerSubtitle}>{screenError}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadPrescriptionResult}
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
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Detected Medicines</Text>
                <Text style={styles.summaryText}>
                  {matchedMedicines.length > 0
                    ? `${matchedMedicines.length} matched medicine${
                        matchedMedicines.length === 1 ? "" : "s"
                      } found.`
                    : "No medicine from this prescription matched the catalogue."}
                </Text>
              </View>

              {matchedMedicines.length > 0 ? (
                matchedMedicines.map(renderMedicineCard)
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>
                    Medicine not found in catalogue
                  </Text>
                  <Text style={styles.emptyText}>
                    The prescription text was read, but no confident medicine
                    match was found. Please scan again with better lighting or
                    add the medicine manually.
                  </Text>

                  <TouchableOpacity
                    style={styles.emptyPrimaryButton}
                    onPress={handleScanAgain}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.emptyPrimaryButtonText}>
                      Scan Again
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.doctorButton}
                onPress={handleAskDoctor}
                activeOpacity={0.85}
              >
                <Text style={styles.doctorButtonText}>Ask Doctor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.scanAgainButton}
                onPress={handleScanAgain}
                activeOpacity={0.85}
              >
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
};

export default PrescriptionScanResultScreen;

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
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  summaryTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  summaryText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  emptyPrimaryButton: {
    height: 48,
    borderRadius: 13,
    backgroundColor: HEADER_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  emptyPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  medicineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  cardTopRow: {
    flexDirection: "row",
  },
  imageBox: {
    width: 96,
    height: 96,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#CBD5E1",
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
  noImageIcon: {
    color: "#94A3B8",
    fontSize: 22,
    fontWeight: "900",
  },
  noImageText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 3,
  },
  medicineMainInfo: {
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  matchedBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 7,
    marginBottom: 5,
  },
  matchedBadgeText: {
    color: "#15803D",
    fontSize: 10,
    fontWeight: "900",
  },
  confidenceBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 5,
  },
  confidenceText: {
    color: HEADER_BLUE,
    fontSize: 10,
    fontWeight: "900",
  },
  medicineName: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  genericName: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    lineHeight: 18,
  },
  keyInfoRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  keyInfoBox: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 9,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginRight: 8,
  },
  keyInfoBoxLast: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 9,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  keyInfoLabel: {
    color: HEADER_BLUE,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 3,
  },
  keyInfoValue: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "900",
  },
  scheduleBox: {
    backgroundColor: "#ECFDF5",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 14,
    marginTop: 14,
  },
  scheduleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scheduleTitle: {
    color: "#047857",
    fontSize: 13,
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
  scheduleFallback: {
    backgroundColor: "#F8FAFC",
    borderRadius: 13,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  scheduleFallbackText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  infoCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginTop: 14,
  },
  infoCardTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 13,
  },
  infoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  infoIcon: {
    color: HEADER_BLUE,
    fontSize: 15,
    fontWeight: "900",
  },
  infoIconCircleGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  infoIconGreen: {
    color: "#15803D",
    fontSize: 14,
    fontWeight: "900",
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
  },
  infoText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  sideEffectBlock: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 2,
  },
  sideEffectTitle: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 9,
  },
  sideEffectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sideEffectChip: {
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 7,
    marginBottom: 7,
  },
  sideEffectText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "900",
  },
  noSideEffectText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "800",
  },
  instructionBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 12,
  },
  instructionTitle: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 5,
  },
  instructionText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  safetyBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#FDBA74",
    padding: 13,
    marginTop: 14,
    flexDirection: "row",
  },
  safetyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  safetyIcon: {
    color: "#EA580C",
    fontSize: 16,
    fontWeight: "900",
  },
  safetyTextBlock: {
    flex: 1,
  },
  safetyTitle: {
    color: "#9A3412",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
  },
  safetyText: {
    color: "#C2410C",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  addButton: {
    height: 50,
    borderRadius: 13,
    backgroundColor: HEADER_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  doctorButton: {
    height: 50,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginTop: 2,
  },
  doctorButtonText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "900",
  },
  scanAgainButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  scanAgainText: {
    color: HEADER_BLUE,
    fontSize: 14,
    fontWeight: "900",
  },
});