import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleAlert,
  PackageCheck,
  PackageSearch,
  ShieldCheck,
  X,
} from "lucide-react-native";

import {
  pharmacyOrdersApi,
  type PharmacyInventoryCandidatesResponse,
  type PharmacyInventoryMatchCandidate,
  type PharmacyOrderDetail,
} from "../../services/pharmacy/pharmacy-orders.api";

type PharmacyMedicineItem = PharmacyOrderDetail["items"][number];

type Props = {
  visible: boolean;
  orderId: string;
  item: PharmacyMedicineItem | null;
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onOpenInventory: () => void;
};

const SURFACE = "#FFFFFF";
const BACKGROUND = "#EEF1FA";
const TEXT = "#111936";
const MUTED = "#747C91";
const BORDER = "#E1E6EF";
const PHARMACY = "#15803D";
const PHARMACY_DARK = "#14532D";
const PHARMACY_LIGHT = "#E9F8EF";
const BLUE_DARK = "#315FBA";
const BLUE_LIGHT = "#EEF4FF";
const WARNING_DARK = "#9A570D";
const WARNING_LIGHT = "#FFF3E2";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const normalizeUnit = (value?: string | null) => {
  if (!value) return "";
  const normalized = value.trim().toLowerCase();

  const aliases: Record<string, string> = {
    packs: "pack",
    pack: "pack",
    tablets: "tablet",
    tablet: "tablet",
    tabs: "tablet",
    tab: "tablet",
    capsules: "capsule",
    capsule: "capsule",
    caps: "capsule",
    cap: "capsule",
    bottles: "bottle",
    bottle: "bottle",
    boxes: "box",
    box: "box",
    units: "unit",
    unit: "unit",
  };

  return aliases[normalized] || normalized.replace(/s$/, "");
};

const formatComparison = (value: PharmacyInventoryMatchCandidate["strengthMatch"]) => {
  if (value === "MATCH") return "Matched";
  if (value === "MISMATCH") return "Conflict";
  if (value === "MISSING_SOURCE") return "Not confirmed in order";
  return "Not recorded in inventory";
};

const getCandidateTone = (candidate: PharmacyInventoryMatchCandidate) => {
  const conflict = candidate.strengthMatch === "MISMATCH" || candidate.formMatch === "MISMATCH";

  if (conflict) {
    return { label: "Conflict", background: DANGER_LIGHT, color: DANGER_DARK };
  }

  if (candidate.matchQuality === "EXACT") {
    return { label: "Strong match", background: PHARMACY_LIGHT, color: PHARMACY_DARK };
  }

  return { label: "Review", background: WARNING_LIGHT, color: WARNING_DARK };
};

const getNameMatchLabel = (candidate: PharmacyInventoryMatchCandidate) => {
  if (candidate.nameMatchedBy === "EXACT") return "Exact name";
  if (candidate.nameMatchedBy === "ALIAS") return "Known alias";
  if (candidate.nameMatchedBy === "FUZZY") {
    return `Likely spelling match · ${Math.round(candidate.nameMatchConfidence * 100)}%`;
  }

  return "Partial name match";
};

export const PharmacyInventoryMatchModal = ({
  visible,
  orderId,
  item,
  canEdit,
  onClose,
  onChanged,
  onOpenInventory,
}: Props) => {
  const [data, setData] = useState<PharmacyInventoryCandidatesResponse | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [reserveQuantity, setReserveQuantity] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCandidate = useMemo(
    () => data?.candidates.find(candidate => candidate.id === selectedCandidateId) || null,
    [data, selectedCandidateId],
  );

  const getEffectiveAvailable = (candidate: PharmacyInventoryMatchCandidate) => {
    if (candidate.id === item?.inventoryItemId) {
      return candidate.availableQuantity + (item.inventoryReservedQuantity || 0);
    }

    return candidate.availableQuantity;
  };

  const loadCandidates = async () => {
    if (!item) return;

    try {
      setIsLoading(true);
      setErrorMessage("");

      const result = await pharmacyOrdersApi.getInventoryCandidates(orderId, item.id);
      setData(result);

      const currentCandidate = item.inventoryItemId
        ? result.candidates.find(candidate => candidate.id === item.inventoryItemId)
        : null;

      setSelectedCandidateId(currentCandidate?.id || null);
      setReserveQuantity(
        currentCandidate && item.inventoryReservedQuantity > 0
          ? String(item.inventoryReservedQuantity)
          : "1",
      );
    } catch (error) {
      setData(null);
      setSelectedCandidateId(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to find inventory matches.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!visible || !item) return;
    void loadCandidates();
    // The modal is reloaded whenever a different order item is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item?.id, orderId]);

  const selectCandidate = (candidate: PharmacyInventoryMatchCandidate) => {
    if (!canEdit) return;

    const hasConflict = candidate.strengthMatch === "MISMATCH" || candidate.formMatch === "MISMATCH";
    const available = getEffectiveAvailable(candidate);

    if (hasConflict || available <= 0) return;

    setSelectedCandidateId(candidate.id);

    if (candidate.id === item?.inventoryItemId && item.inventoryReservedQuantity > 0) {
      setReserveQuantity(String(item.inventoryReservedQuantity));
      return;
    }

    const suggested = data?.extracted.suggestedReserveQuantity;
    const orderUnit = normalizeUnit(item?.quantityUnit);
    const stockUnit = normalizeUnit(candidate.stockUnit);

    if (suggested && orderUnit && stockUnit && orderUnit === stockUnit) {
      setReserveQuantity(String(suggested));
    } else {
      setReserveQuantity("1");
    }
  };

  const confirmReservation = () => {
    if (!item || !selectedCandidate || !canEdit) return;

    const quantity = Number(reserveQuantity.trim());
    const available = getEffectiveAvailable(selectedCandidate);

    if (!Number.isInteger(quantity) || quantity < 1) {
      Alert.alert("Invalid quantity", "Enter a whole stock quantity of at least 1.");
      return;
    }

    if (quantity > available) {
      Alert.alert(
        "Not enough available stock",
        `Only ${available} ${selectedCandidate.stockUnit}${available === 1 ? "" : "s"} can currently be reserved.`,
      );
      return;
    }

    const requiresJudgement =
      selectedCandidate.nameMatchedBy === "FUZZY" ||
      selectedCandidate.nameMatchedBy === "PARTIAL" ||
      selectedCandidate.strengthMatch !== "MATCH" ||
      selectedCandidate.formMatch !== "MATCH";

    const safetyMessage = requiresJudgement
      ? "The order data is not a fully exact medicine/strength/form match. Confirm that you have checked the medicine manually before reserving stock."
      : "Confirm that this is the correct medicine and stock quantity before reserving it.";

    Alert.alert(
      "Confirm stock reservation",
      `${selectedCandidate.medicineName}${selectedCandidate.strength ? ` · ${selectedCandidate.strength}` : ""}${selectedCandidate.form ? ` · ${selectedCandidate.form}` : ""}\n\nReserve ${quantity} ${selectedCandidate.stockUnit}${quantity === 1 ? "" : "s"}.\n\n${safetyMessage}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & reserve",
          onPress: () => {
            void (async () => {
              try {
                setIsSaving(true);
                await pharmacyOrdersApi.confirmInventoryMatch(
                  orderId,
                  item.id,
                  selectedCandidate.id,
                  quantity,
                );
                await onChanged();
                onClose();
                Alert.alert("Stock reserved", "The pharmacist-confirmed inventory match has been saved.");
              } catch (error) {
                Alert.alert(
                  "Unable to reserve stock",
                  error instanceof Error ? error.message : "Unable to reserve this inventory item.",
                );
              } finally {
                setIsSaving(false);
              }
            })();
          },
        },
      ],
    );
  };

  const releaseReservation = () => {
    if (!item?.inventoryItemId || !canEdit) return;

    Alert.alert(
      "Release stock reservation",
      "Release the stock currently reserved for this medicine? The order item will need to be matched again before preparation can continue.",
      [
        { text: "Keep reservation", style: "cancel" },
        {
          text: "Release",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                setIsSaving(true);
                await pharmacyOrdersApi.releaseInventoryMatch(orderId, item.id);
                await onChanged();
                onClose();
              } catch (error) {
                Alert.alert(
                  "Unable to release stock",
                  error instanceof Error ? error.message : "Unable to release this stock reservation.",
                );
              } finally {
                setIsSaving(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <PackageSearch size={21} color={PHARMACY_DARK} strokeWidth={2.5} />
            </View>

            <View style={styles.headerText}>
              <Text style={styles.title}>Match pharmacy stock</Text>
              <Text style={styles.subtitle} numberOfLines={2}>{item.name}</Text>
            </View>

            <TouchableOpacity activeOpacity={0.72} style={styles.closeButton} onPress={onClose}>
              <X size={20} color={TEXT} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.sourceCard}>
              <View style={styles.sourceHeading}>
                <ShieldCheck size={17} color={BLUE_DARK} strokeWidth={2.5} />
                <Text style={styles.sourceTitle}>Order medicine data</Text>
              </View>

              <Text style={styles.sourceMedicine}>{data?.extracted.medicineName || item.name}</Text>

              <View style={styles.sourceMetaRow}>
                <SourceMeta label="Strength" value={data?.extracted.strength || "Not safely confirmed"} />
                <SourceMeta label="Form" value={data?.extracted.form || "Not safely confirmed"} />
                <SourceMeta label="Order qty" value={item.quantity || "Not specified"} />
              </View>

              <View style={styles.safetyNote}>
                <CircleAlert size={15} color={WARNING_DARK} strokeWidth={2.4} />
                <Text style={styles.safetyNoteText}>
                  Candidate matching is decision support only. A pharmacist must confirm the correct medicine before stock is reserved.
                </Text>
              </View>
            </View>

            {!canEdit ? (
              <View style={styles.lockedCard}>
                <PackageCheck size={17} color={PHARMACY_DARK} strokeWidth={2.5} />
                <Text style={styles.lockedText}>
                  Inventory matching is locked at this fulfilment stage. Existing reservation details can still be reviewed.
                </Text>
              </View>
            ) : null}

            {isLoading ? (
              <View style={styles.loadingArea}>
                <ActivityIndicator color={PHARMACY} />
                <Text style={styles.loadingText}>Checking pharmacy inventory...</Text>
              </View>
            ) : null}

            {!isLoading && errorMessage ? (
              <View style={styles.errorCard}>
                <AlertTriangle size={20} color={DANGER_DARK} strokeWidth={2.5} />
                <Text style={styles.errorText}>{errorMessage}</Text>
                <TouchableOpacity activeOpacity={0.72} style={styles.retryButton} onPress={() => void loadCandidates()}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!isLoading && !errorMessage && data ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Inventory candidates</Text>
                  <Text style={styles.sectionCount}>{data.candidates.length}</Text>
                </View>

                {data.suggestedCandidateId ? (
                  <View style={styles.suggestionBanner}>
                    <CheckCircle2 size={16} color={PHARMACY_DARK} strokeWidth={2.5} />
                    <Text style={styles.suggestionText}>
                      One strong candidate was found. It is highlighted as recommended, but is not automatically selected.
                    </Text>
                  </View>
                ) : null}

                {data.candidates.length > 0 ? (
                  data.candidates.map(candidate => {
                    const tone = getCandidateTone(candidate);
                    const selected = selectedCandidateId === candidate.id;
                    const conflict = candidate.strengthMatch === "MISMATCH" || candidate.formMatch === "MISMATCH";
                    const effectiveAvailable = getEffectiveAvailable(candidate);
                    const unavailable = effectiveAvailable <= 0;
                    const disabled = !canEdit || conflict || unavailable;
                    const recommended = data.suggestedCandidateId === candidate.id;

                    return (
                      <TouchableOpacity
                        key={candidate.id}
                        activeOpacity={disabled ? 1 : 0.72}
                        style={[
                          styles.candidateCard,
                          selected && styles.candidateCardSelected,
                          disabled && styles.candidateCardDisabled,
                        ]}
                        disabled={disabled}
                        onPress={() => selectCandidate(candidate)}
                      >
                        <View style={styles.candidateTopRow}>
                          <View style={[styles.radio, selected && styles.radioSelected]}>
                            {selected ? <Check size={13} color={SURFACE} strokeWidth={3} /> : null}
                          </View>

                          <View style={styles.candidateMain}>
                            <View style={styles.candidateTitleRow}>
                              <Text style={styles.candidateName} numberOfLines={2}>{candidate.medicineName}</Text>
                              {recommended ? (
                                <View style={styles.recommendedChip}>
                                  <Text style={styles.recommendedText}>Recommended</Text>
                                </View>
                              ) : null}
                            </View>

                            <Text style={styles.candidateDetails}>
                              {candidate.strength || "Strength not recorded"}
                              {"  •  "}
                              {candidate.form || "Form not recorded"}
                            </Text>

                            <Text style={styles.nameMatchText}>{getNameMatchLabel(candidate)}</Text>
                          </View>

                          <View style={[styles.matchChip, { backgroundColor: tone.background }]}>
                            <Text style={[styles.matchChipText, { color: tone.color }]}>{tone.label}</Text>
                          </View>
                        </View>

                        <View style={styles.stockRow}>
                          <StockValue label="In stock" value={candidate.quantityInStock} />
                          <StockValue label="Reserved" value={candidate.reservedQuantity} />
                          <StockValue label="Available" value={effectiveAvailable} strong />
                          <Text style={styles.stockUnit}>{candidate.stockUnit}</Text>
                        </View>

                        <View style={styles.comparisonRow}>
                          <ComparisonBadge
                            label="Strength"
                            value={formatComparison(candidate.strengthMatch)}
                            danger={candidate.strengthMatch === "MISMATCH"}
                          />
                          <ComparisonBadge
                            label="Form"
                            value={formatComparison(candidate.formMatch)}
                            danger={candidate.formMatch === "MISMATCH"}
                          />
                        </View>

                        {candidate.reasons.slice(0, 2).map(reason => (
                          <Text key={reason} style={styles.reasonText}>• {reason}</Text>
                        ))}

                        {unavailable ? <Text style={styles.unavailableText}>No available stock to reserve.</Text> : null}
                        {conflict ? <Text style={styles.conflictText}>This candidate cannot be confirmed because order data conflicts with this stock record.</Text> : null}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyCard}>
                    <PackageSearch size={26} color={MUTED} strokeWidth={2.3} />
                    <Text style={styles.emptyTitle}>No safe inventory candidate found</Text>
                    <Text style={styles.emptyText}>
                      Check the medicine spelling/strength or add the correct stock record. CareMate+ will not invent a medicine match.
                    </Text>

                    <TouchableOpacity activeOpacity={0.72} style={styles.openInventoryButton} onPress={onOpenInventory}>
                      <Text style={styles.openInventoryText}>Open inventory</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedCandidate ? (
                  <View style={styles.reserveCard}>
                    <Text style={styles.reserveTitle}>Reserve stock quantity</Text>
                    <Text style={styles.reserveHelp}>
                      Enter the quantity in inventory units ({selectedCandidate.stockUnit}). No pack/tablet conversion is assumed automatically.
                    </Text>

                    <View style={styles.reserveInputRow}>
                      <TextInput
                        value={reserveQuantity}
                        onChangeText={value => setReserveQuantity(value.replace(/[^0-9]/g, ""))}
                        style={styles.reserveInput}
                        keyboardType="number-pad"
                        editable={canEdit && !isSaving}
                        maxLength={7}
                        placeholder="1"
                        placeholderTextColor="#9AA0AF"
                      />
                      <View style={styles.unitBox}>
                        <Text style={styles.unitText}>{selectedCandidate.stockUnit}</Text>
                      </View>
                    </View>

                    <Text style={styles.availableHint}>
                      Available for this reservation: {getEffectiveAvailable(selectedCandidate)} {selectedCandidate.stockUnit}
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.72}
                      style={[styles.confirmButton, (!canEdit || isSaving) && styles.disabledButton]}
                      disabled={!canEdit || isSaving}
                      onPress={confirmReservation}
                    >
                      {isSaving ? (
                        <ActivityIndicator color={SURFACE} />
                      ) : (
                        <>
                          <PackageCheck size={18} color={SURFACE} strokeWidth={2.6} />
                          <Text style={styles.confirmButtonText}>Confirm & reserve stock</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}

                {item.inventoryItemId && item.inventoryReservedQuantity > 0 && canEdit ? (
                  <TouchableOpacity
                    activeOpacity={0.72}
                    style={[styles.releaseButton, isSaving && styles.disabledButton]}
                    disabled={isSaving}
                    onPress={releaseReservation}
                  >
                    <Text style={styles.releaseButtonText}>Release current reservation</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const SourceMeta = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.sourceMeta}>
    <Text style={styles.sourceMetaLabel}>{label}</Text>
    <Text style={styles.sourceMetaValue} numberOfLines={2}>{value}</Text>
  </View>
);

const StockValue = ({ label, value, strong }: { label: string; value: number; strong?: boolean }) => (
  <View style={styles.stockValue}>
    <Text style={styles.stockValueLabel}>{label}</Text>
    <Text style={[styles.stockValueText, strong && styles.stockValueStrong]}>{value}</Text>
  </View>
);

const ComparisonBadge = ({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger: boolean;
}) => (
  <View style={[styles.comparisonBadge, danger && styles.comparisonBadgeDanger]}>
    <Text style={[styles.comparisonLabel, danger && styles.comparisonLabelDanger]}>{label}</Text>
    <Text style={[styles.comparisonValue, danger && styles.comparisonValueDanger]}>{value}</Text>
  </View>
);

export default PharmacyInventoryMatchModal;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(17,25,54,0.44)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "91%",
    backgroundColor: BACKGROUND,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#C4CAD6", alignSelf: "center", marginTop: 9 },
  header: { minHeight: 72, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 11 },
  headerIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: PHARMACY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 10 },
  headerText: { flex: 1 },
  title: { color: TEXT, fontSize: 17, fontWeight: "700" },
  subtitle: { color: MUTED, fontSize: 10, lineHeight: 14, fontWeight: "600", marginTop: 3 },
  closeButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  content: { paddingHorizontal: 16, paddingBottom: 34 },

  sourceCard: { backgroundColor: SURFACE, borderRadius: 15, padding: 13 },
  sourceHeading: { flexDirection: "row", alignItems: "center" },
  sourceTitle: { color: BLUE_DARK, fontSize: 10, fontWeight: "700", marginLeft: 7 },
  sourceMedicine: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 10 },
  sourceMetaRow: { flexDirection: "row", gap: 7, marginTop: 10 },
  sourceMeta: { flex: 1, backgroundColor: BLUE_LIGHT, borderRadius: 10, padding: 8 },
  sourceMetaLabel: { color: MUTED, fontSize: 7, fontWeight: "700" },
  sourceMetaValue: { color: TEXT, fontSize: 9, lineHeight: 13, fontWeight: "700", marginTop: 3 },
  safetyNote: { flexDirection: "row", alignItems: "flex-start", backgroundColor: WARNING_LIGHT, borderRadius: 10, padding: 9, marginTop: 10 },
  safetyNoteText: { flex: 1, color: WARNING_DARK, fontSize: 9, lineHeight: 14, fontWeight: "600", marginLeft: 7 },

  lockedCard: { flexDirection: "row", alignItems: "center", backgroundColor: PHARMACY_LIGHT, borderRadius: 12, padding: 11, marginTop: 10 },
  lockedText: { flex: 1, color: PHARMACY_DARK, fontSize: 9, lineHeight: 14, fontWeight: "600", marginLeft: 8 },
  loadingArea: { alignItems: "center", paddingVertical: 34 },
  loadingText: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 9 },

  errorCard: { backgroundColor: DANGER_LIGHT, borderRadius: 13, padding: 14, alignItems: "center", marginTop: 12 },
  errorText: { color: DANGER_DARK, fontSize: 10, lineHeight: 15, fontWeight: "600", textAlign: "center", marginTop: 7 },
  retryButton: { minHeight: 38, backgroundColor: DANGER_DARK, borderRadius: 10, paddingHorizontal: 15, alignItems: "center", justifyContent: "center", marginTop: 10 },
  retryText: { color: SURFACE, fontSize: 10, fontWeight: "700" },

  sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 8 },
  sectionTitle: { flex: 1, color: TEXT, fontSize: 13, fontWeight: "700" },
  sectionCount: { color: MUTED, fontSize: 9, fontWeight: "700", backgroundColor: SURFACE, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  suggestionBanner: { flexDirection: "row", alignItems: "flex-start", backgroundColor: PHARMACY_LIGHT, borderRadius: 11, padding: 9, marginBottom: 8 },
  suggestionText: { flex: 1, color: PHARMACY_DARK, fontSize: 9, lineHeight: 14, fontWeight: "600", marginLeft: 7 },

  candidateCard: { backgroundColor: SURFACE, borderRadius: 14, padding: 12, borderWidth: 1.2, borderColor: "transparent", marginBottom: 8 },
  candidateCardSelected: { borderColor: PHARMACY, backgroundColor: "#FBFFFC" },
  candidateCardDisabled: { opacity: 0.62 },
  candidateTopRow: { flexDirection: "row", alignItems: "flex-start" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#B7BECA", alignItems: "center", justifyContent: "center", marginTop: 1, marginRight: 9 },
  radioSelected: { backgroundColor: PHARMACY, borderColor: PHARMACY },
  candidateMain: { flex: 1, minWidth: 0 },
  candidateTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  candidateName: { color: TEXT, fontSize: 12, lineHeight: 16, fontWeight: "700", marginRight: 6 },
  recommendedChip: { backgroundColor: PHARMACY_LIGHT, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  recommendedText: { color: PHARMACY_DARK, fontSize: 7, fontWeight: "700" },
  candidateDetails: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 4 },
  nameMatchText: { color: BLUE_DARK, fontSize: 8, fontWeight: "600", marginTop: 4 },
  matchChip: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5, marginLeft: 7 },
  matchChipText: { fontSize: 7, fontWeight: "700" },

  stockRow: { flexDirection: "row", alignItems: "flex-end", backgroundColor: BACKGROUND, borderRadius: 10, padding: 9, marginTop: 10 },
  stockValue: { marginRight: 16 },
  stockValueLabel: { color: MUTED, fontSize: 7, fontWeight: "600" },
  stockValueText: { color: TEXT, fontSize: 11, fontWeight: "700", marginTop: 2 },
  stockValueStrong: { color: PHARMACY_DARK },
  stockUnit: { flex: 1, color: MUTED, fontSize: 8, fontWeight: "700", textAlign: "right" },

  comparisonRow: { flexDirection: "row", gap: 7, marginTop: 8 },
  comparisonBadge: { flex: 1, backgroundColor: PHARMACY_LIGHT, borderRadius: 9, padding: 7 },
  comparisonBadgeDanger: { backgroundColor: DANGER_LIGHT },
  comparisonLabel: { color: PHARMACY_DARK, fontSize: 7, fontWeight: "700" },
  comparisonLabelDanger: { color: DANGER_DARK },
  comparisonValue: { color: TEXT, fontSize: 8, fontWeight: "600", marginTop: 2 },
  comparisonValueDanger: { color: DANGER_DARK },
  reasonText: { color: MUTED, fontSize: 8, lineHeight: 12, fontWeight: "500", marginTop: 5 },
  unavailableText: { color: DANGER_DARK, fontSize: 8, fontWeight: "700", marginTop: 7 },
  conflictText: { color: DANGER_DARK, fontSize: 8, lineHeight: 12, fontWeight: "700", marginTop: 7 },

  emptyCard: { backgroundColor: SURFACE, borderRadius: 14, alignItems: "center", padding: 18 },
  emptyTitle: { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 8 },
  emptyText: { color: MUTED, fontSize: 9, lineHeight: 14, fontWeight: "500", textAlign: "center", marginTop: 4 },
  openInventoryButton: { minHeight: 40, backgroundColor: PHARMACY, borderRadius: 11, paddingHorizontal: 15, alignItems: "center", justifyContent: "center", marginTop: 12 },
  openInventoryText: { color: SURFACE, fontSize: 10, fontWeight: "700" },

  reserveCard: { backgroundColor: SURFACE, borderRadius: 14, padding: 13, marginTop: 10 },
  reserveTitle: { color: TEXT, fontSize: 12, fontWeight: "700" },
  reserveHelp: { color: MUTED, fontSize: 9, lineHeight: 14, fontWeight: "500", marginTop: 4 },
  reserveInputRow: { flexDirection: "row", alignItems: "center", marginTop: 11 },
  reserveInput: { flex: 1, minHeight: 46, backgroundColor: BACKGROUND, borderRadius: 11, paddingHorizontal: 12, color: TEXT, fontSize: 14, fontWeight: "700" },
  unitBox: { minHeight: 46, minWidth: 72, backgroundColor: PHARMACY_LIGHT, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, marginLeft: 8 },
  unitText: { color: PHARMACY_DARK, fontSize: 10, fontWeight: "700" },
  availableHint: { color: MUTED, fontSize: 8, fontWeight: "600", marginTop: 6 },
  confirmButton: { minHeight: 48, borderRadius: 12, backgroundColor: PHARMACY, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 12 },
  confirmButtonText: { color: SURFACE, fontSize: 11, fontWeight: "700", marginLeft: 7 },
  disabledButton: { opacity: 0.45 },
  releaseButton: { minHeight: 42, borderRadius: 11, backgroundColor: DANGER_LIGHT, alignItems: "center", justifyContent: "center", marginTop: 9 },
  releaseButtonText: { color: DANGER_DARK, fontSize: 10, fontWeight: "700" },
});