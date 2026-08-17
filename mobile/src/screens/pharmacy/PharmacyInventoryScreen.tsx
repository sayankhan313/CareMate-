import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Archive,
  ArrowLeft,
  Edit3,
  PackagePlus,
  Pill,
  RefreshCw,
  RotateCcw,
  Search,
  TriangleAlert,
  X,
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  pharmacyInventoryApi,
  type PharmacyInventoryItem,
} from "../../services/pharmacy/pharmacy-inventory.api";
import type { RootStackParamList } from "../../types/navigation";

type PharmacyNavigation = NativeStackNavigationProp<RootStackParamList>;
type InventoryTab = "ACTIVE" | "ARCHIVED";

type InventoryForm = {
  medicineName: string;
  strength: string;
  form: string;
  stockUnit: string;
  quantityInStock: string;
  lowStockThreshold: string;
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#747C91";
const RIPPLE = "rgba(17, 25, 54, 0.08)";
const BORDER = "#E1E6EF";

const PRIMARY = "#15803D";
const PRIMARY_LIGHT = "#E9F8EF";

const BLUE_DARK = "#315FBA";
const BLUE_LIGHT = "#EEF4FF";

const WARNING = "#F6A545";
const WARNING_DARK = "#9A570D";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const EMPTY_FORM: InventoryForm = {
  medicineName: "",
  strength: "",
  form: "",
  stockUnit: "pack",
  quantityInStock: "0",
  lowStockThreshold: "5",
};

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.07,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const parseStockNumber = (value: string) => {
  const number = Number(value.trim());
  if (!Number.isInteger(number) || number < 0) return null;
  return number;
};

export const PharmacyInventoryScreen = () => {
  const navigation = useNavigation<PharmacyNavigation>();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<InventoryTab>("ACTIVE");
  const [items, setItems] = useState<PharmacyInventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PharmacyInventoryItem | null>(null);
  const [form, setForm] = useState<InventoryForm>(EMPTY_FORM);

  const loadInventory = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") setIsLoading(true);
        if (mode === "refresh") setIsRefreshing(true);

        setErrorMessage("");

        const result = await pharmacyInventoryApi.getInventory({
          search: appliedSearch || undefined,
          lowStock: lowStockOnly ? true : undefined,
          active: tab === "ACTIVE",
          limit: 200,
        });

        setItems(result.items || []);
        setTotal(result.total || 0);
        setLowStockCount(result.lowStockCount || 0);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load pharmacy inventory.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [appliedSearch, lowStockOnly, tab],
  );

  useFocusEffect(
    useCallback(() => {
      void loadInventory("initial");
    }, [loadInventory]),
  );

  const applySearch = () => setAppliedSearch(searchText.trim());

  const clearSearch = () => {
    setSearchText("");
    setAppliedSearch("");
  };

  const openCreate = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormVisible(true);
  };

  const openEdit = (item: PharmacyInventoryItem) => {
    setEditingItem(item);
    setForm({
      medicineName: item.medicineName,
      strength: item.strength || "",
      form: item.form || "",
      stockUnit: item.stockUnit,
      quantityInStock: String(item.quantityInStock),
      lowStockThreshold: String(item.lowStockThreshold),
    });
    setFormVisible(true);
  };

  const closeForm = () => {
    if (isSaving) return;

    setFormVisible(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
  };

  const saveItem = async () => {
    const medicineName = form.medicineName.trim();
    const stockUnit = form.stockUnit.trim();

    if (medicineName.length < 2) {
      Alert.alert("Medicine name required", "Please enter a valid medicine name.");
      return;
    }

    if (!stockUnit) {
      Alert.alert("Stock unit required", "Please enter a stock unit.");
      return;
    }

    const quantityInStock = parseStockNumber(form.quantityInStock);
    const lowStockThreshold = parseStockNumber(form.lowStockThreshold);

    if (quantityInStock === null) {
      Alert.alert(
        "Invalid stock quantity",
        "Stock quantity must be a whole number of 0 or more.",
      );
      return;
    }

    if (lowStockThreshold === null) {
      Alert.alert(
        "Invalid low-stock threshold",
        "Low-stock threshold must be a whole number of 0 or more.",
      );
      return;
    }

    try {
      setIsSaving(true);

      const input = {
        medicineName,
        strength: form.strength.trim() || undefined,
        form: form.form.trim() || undefined,
        stockUnit,
        quantityInStock,
        lowStockThreshold,
      };

      if (editingItem) {
        await pharmacyInventoryApi.updateInventoryItem(editingItem.id, input);
      } else {
        await pharmacyInventoryApi.createInventoryItem(input);
      }

      closeForm();
      await loadInventory("refresh");

      Alert.alert(
        editingItem ? "Inventory updated" : "Medicine added",
        editingItem
          ? "The inventory item has been updated."
          : "The medicine has been added to pharmacy inventory.",
      );
    } catch (error) {
      Alert.alert(
        editingItem ? "Unable to update inventory" : "Unable to add medicine",
        error instanceof Error
          ? error.message
          : "Unable to save this inventory item.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const archiveItem = (item: PharmacyInventoryItem) => {
    Alert.alert(
      "Archive inventory item?",
      `${item.medicineName} will be removed from the active inventory list. Existing history will be preserved.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await pharmacyInventoryApi.archiveInventoryItem(item.id);
              await loadInventory("refresh");
            } catch (error) {
              Alert.alert(
                "Unable to archive",
                error instanceof Error
                  ? error.message
                  : "Unable to archive this inventory item.",
              );
            }
          },
        },
      ],
    );
  };

  const restoreItem = async (item: PharmacyInventoryItem) => {
    try {
      await pharmacyInventoryApi.restoreInventoryItem(item.id);
      await loadInventory("refresh");

      Alert.alert(
        "Inventory restored",
        `${item.medicineName} has been restored to active inventory.`,
      );
    } catch (error) {
      Alert.alert(
        "Unable to restore",
        error instanceof Error
          ? error.message
          : "Unable to restore this inventory item.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.appBar}>
          <Pressable
            android_ripple={{ color: RIPPLE }}
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.6} />
          </Pressable>

          <View style={styles.appBarText}>
            <Text style={styles.title}>Pharmacy inventory</Text>
            <Text style={styles.subtitle}>Manage available medicine stock</Text>
          </View>

          <Pressable
            android_ripple={{ color: RIPPLE }}
            style={styles.addButton}
            onPress={openCreate}
          >
            <PackagePlus size={21} color={SURFACE} strokeWidth={2.6} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom + 34, 48) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadInventory("refresh")}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Pill size={24} color={PRIMARY} strokeWidth={2.6} />
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{total}</Text>
              <Text style={styles.summaryLabel}>
                {tab === "ACTIVE" ? "Inventory items" : "Archived"}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryValue,
                  lowStockCount > 0 ? styles.warningValue : undefined,
                ]}
              >
                {lowStockCount}
              </Text>
              <Text style={styles.summaryLabel}>Low stock</Text>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchInputContainer}>
              <Search size={18} color={MUTED} strokeWidth={2.4} />

              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search medicine"
                placeholderTextColor="#9AA0AF"
                returnKeyType="search"
                onSubmitEditing={applySearch}
              />

              {searchText.length > 0 ? (
                <Pressable
                  android_ripple={{ color: RIPPLE }}
                  style={styles.clearSearch}
                  onPress={clearSearch}
                >
                  <X size={17} color={MUTED} strokeWidth={2.5} />
                </Pressable>
              ) : null}
            </View>

            <Pressable
              android_ripple={{ color: RIPPLE }}
              style={styles.searchButton}
              onPress={applySearch}
            >
              <Search size={18} color={SURFACE} strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={styles.tabs}>
            <Pressable
              android_ripple={{ color: RIPPLE }}
              style={[styles.tab, tab === "ACTIVE" ? styles.tabSelected : undefined]}
              onPress={() => setTab("ACTIVE")}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "ACTIVE" ? styles.tabTextSelected : undefined,
                ]}
              >
                Active
              </Text>
            </Pressable>

            <Pressable
              android_ripple={{ color: RIPPLE }}
              style={[styles.tab, tab === "ARCHIVED" ? styles.tabSelected : undefined]}
              onPress={() => setTab("ARCHIVED")}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "ARCHIVED" ? styles.tabTextSelected : undefined,
                ]}
              >
                Archived
              </Text>
            </Pressable>
          </View>

          {tab === "ACTIVE" ? (
            <Pressable
              android_ripple={{ color: RIPPLE }}
              style={[
                styles.lowStockFilter,
                lowStockOnly ? styles.lowStockFilterSelected : undefined,
              ]}
              onPress={() => setLowStockOnly(value => !value)}
            >
              <TriangleAlert
                size={17}
                color={lowStockOnly ? WARNING_DARK : MUTED}
                strokeWidth={2.5}
              />

              <Text
                style={[
                  styles.lowStockFilterText,
                  lowStockOnly ? styles.lowStockFilterTextSelected : undefined,
                ]}
              >
                Low stock only
              </Text>
            </Pressable>
          ) : null}

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateTitle}>Loading inventory</Text>
              <Text style={styles.stateText}>
                Checking medicine stock for this pharmacy.
              </Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <RefreshCw size={26} color={DANGER} strokeWidth={2.6} />
              <Text style={styles.errorTitle}>Inventory unavailable</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <Pressable
                android_ripple={{ color: RIPPLE }}
                style={styles.retryButton}
                onPress={() => void loadInventory("initial")}
              >
                <RefreshCw size={16} color={SURFACE} strokeWidth={2.5} />
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {!isLoading && !errorMessage && items.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Pill size={27} color={PRIMARY} strokeWidth={2.6} />
              </View>

              <Text style={styles.emptyTitle}>
                {tab === "ACTIVE" ? "No inventory items" : "No archived items"}
              </Text>

              <Text style={styles.emptyText}>
                {tab === "ACTIVE"
                  ? "Add medicines to begin tracking pharmacy stock."
                  : "Archived inventory items will appear here."}
              </Text>

              {tab === "ACTIVE" ? (
                <Pressable
                  android_ripple={{ color: RIPPLE }}
                  style={styles.emptyAddButton}
                  onPress={openCreate}
                >
                  <PackagePlus size={17} color={SURFACE} strokeWidth={2.5} />
                  <Text style={styles.emptyAddText}>Add medicine</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {!isLoading && !errorMessage
            ? items.map(item => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  onEdit={() => openEdit(item)}
                  onArchive={() => archiveItem(item)}
                  onRestore={() => void restoreItem(item)}
                />
              ))
            : null}
        </ScrollView>
      </View>

      <Modal
        visible={formVisible}
        transparent
        animationType="fade"
        onRequestClose={closeForm}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.formModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>
                  {editingItem ? "Edit inventory item" : "Add medicine"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {editingItem
                    ? "Update pharmacy stock information."
                    : "Add a medicine to the pharmacy inventory."}
                </Text>
              </View>

              <Pressable
                android_ripple={{ color: RIPPLE }}
                style={styles.closeButton}
                disabled={isSaving}
                onPress={closeForm}
              >
                <X size={20} color={TEXT} strokeWidth={2.5} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.formScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <FormField
                label="Medicine name"
                value={form.medicineName}
                placeholder="e.g. Amoxicillin"
                onChangeText={medicineName =>
                  setForm(current => ({ ...current, medicineName }))
                }
              />

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <FormField
                    label="Strength"
                    value={form.strength}
                    placeholder="e.g. 500 mg"
                    onChangeText={strength =>
                      setForm(current => ({ ...current, strength }))
                    }
                  />
                </View>

                <View style={styles.formGap} />

                <View style={styles.formHalf}>
                  <FormField
                    label="Form"
                    value={form.form}
                    placeholder="e.g. Tablet"
                    onChangeText={medicineForm =>
                      setForm(current => ({ ...current, form: medicineForm }))
                    }
                  />
                </View>
              </View>

              <FormField
                label="Stock unit"
                value={form.stockUnit}
                placeholder="e.g. pack"
                onChangeText={stockUnit =>
                  setForm(current => ({ ...current, stockUnit }))
                }
              />

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <FormField
                    label="Stock quantity"
                    value={form.quantityInStock}
                    placeholder="0"
                    keyboardType="number-pad"
                    onChangeText={quantityInStock =>
                      setForm(current => ({ ...current, quantityInStock }))
                    }
                  />
                </View>

                <View style={styles.formGap} />

                <View style={styles.formHalf}>
                  <FormField
                    label="Low-stock level"
                    value={form.lowStockThreshold}
                    placeholder="5"
                    keyboardType="number-pad"
                    onChangeText={lowStockThreshold =>
                      setForm(current => ({ ...current, lowStockThreshold }))
                    }
                  />
                </View>
              </View>
            </ScrollView>

            <Pressable
              android_ripple={{ color: RIPPLE }}
              style={[styles.saveButton, isSaving ? styles.disabledButton : undefined]}
              disabled={isSaving}
              onPress={() => void saveItem()}
            >
              {isSaving ? (
                <ActivityIndicator color={SURFACE} />
              ) : (
                <>
                  <PackagePlus size={19} color={SURFACE} strokeWidth={2.6} />
                  <Text style={styles.saveButtonText}>
                    {editingItem ? "Save changes" : "Add medicine"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const InventoryCard = ({
  item,
  onEdit,
  onArchive,
  onRestore,
}: {
  item: PharmacyInventoryItem;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) => {
  const availablePercentage =
    item.quantityInStock > 0
      ? Math.min(
          100,
          Math.max(0, (item.availableQuantity / item.quantityInStock) * 100),
        )
      : 0;

  return (
    <View style={styles.inventoryCard}>
      <View style={styles.inventoryHeader}>
        <View
          style={[
            styles.medicineIcon,
            item.isLowStock ? styles.medicineIconWarning : undefined,
          ]}
        >
          {item.isLowStock ? (
            <TriangleAlert size={21} color={WARNING_DARK} strokeWidth={2.5} />
          ) : (
            <Pill size={21} color={PRIMARY} strokeWidth={2.5} />
          )}
        </View>

        <View style={styles.inventoryTitleBlock}>
          <Text style={styles.medicineName} numberOfLines={1}>
            {item.medicineName}
          </Text>

          <Text style={styles.medicineMeta} numberOfLines={1}>
            {[item.strength, item.form].filter(Boolean).join(" • ") ||
              "No strength or form specified"}
          </Text>
        </View>

        {item.isLowStock && item.isActive ? (
          <View style={styles.lowStockBadge}>
            <Text style={styles.lowStockBadgeText}>LOW STOCK</Text>
          </View>
        ) : null}

        {!item.isActive ? (
          <View style={styles.archivedBadge}>
            <Text style={styles.archivedBadgeText}>ARCHIVED</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.availableStockCard}>
        <View>
          <Text
            style={[
              styles.availableStockNumber,
              item.isLowStock ? styles.stockNumberWarning : undefined,
            ]}
          >
            {item.availableQuantity}
          </Text>
          <Text style={styles.availableStockUnit}>
            {item.stockUnit}
            {item.availableQuantity === 1 ? "" : "s"}
          </Text>
        </View>

        <View style={styles.availableStockText}>
          <Text style={styles.availableStockTitle}>Available stock</Text>
          <Text style={styles.availableStockSubtitle}>
            Available for new pharmacy orders
          </Text>
        </View>
      </View>

      {item.isActive ? (
        <>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Stock level</Text>
            <Text style={styles.thresholdText}>
              Low at ≤ {item.lowStockThreshold}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                item.isLowStock ? styles.progressFillWarning : undefined,
                { width: `${availablePercentage}%` },
              ]}
            />
          </View>
        </>
      ) : null}

      <View style={styles.cardActions}>
        {item.isActive ? (
          <>
            <Pressable
              android_ripple={{ color: RIPPLE }}
              style={styles.editButton}
              onPress={onEdit}
            >
              <Edit3 size={16} color={PRIMARY} strokeWidth={2.5} />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>

            <Pressable
              android_ripple={{ color: RIPPLE }}
              style={styles.archiveButton}
              onPress={onArchive}
            >
              <Archive size={16} color={DANGER_DARK} strokeWidth={2.5} />
              <Text style={styles.archiveButtonText}>Archive</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            android_ripple={{ color: RIPPLE }}
            style={styles.restoreButton}
            onPress={onRestore}
          >
            <RotateCcw size={16} color={PRIMARY} strokeWidth={2.5} />
            <Text style={styles.restoreButtonText}>Restore item</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const FormField = ({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad";
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>

    <TextInput
      style={styles.fieldInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9AA0AF"
      keyboardType={keyboardType}
    />
  </View>
);

export default PharmacyInventoryScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },

  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 13,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    overflow: "hidden",
  },
  appBarText: { flex: 1 },
  title: { color: TEXT, fontSize: 22, fontWeight: "700" },
  subtitle: { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 3 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16 },

  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(1),
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  summaryItem: { flex: 1 },
  summaryValue: { color: TEXT, fontSize: 20, fontWeight: "700" },
  warningValue: { color: WARNING_DARK },
  summaryLabel: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 2 },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 38,
    backgroundColor: BORDER,
    marginHorizontal: 12,
  },

  searchRow: { flexDirection: "row", marginTop: 12 },
  searchInputContainer: {
    flex: 1,
    minHeight: 46,
    backgroundColor: SURFACE,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 12,
    paddingHorizontal: 9,
  },
  clearSearch: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButton: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderRadius: 13,
    padding: 4,
    marginTop: 12,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabSelected: { backgroundColor: PRIMARY },
  tabText: { color: MUTED, fontSize: 11, fontWeight: "700" },
  tabTextSelected: { color: SURFACE },

  lowStockFilter: {
    alignSelf: "flex-start",
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 11,
    paddingHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  lowStockFilterSelected: {
    backgroundColor: WARNING_LIGHT,
    borderColor: WARNING,
  },
  lowStockFilterText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 6,
  },
  lowStockFilterTextSelected: { color: WARNING_DARK },

  stateCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginTop: 14,
    ...elevate(1),
  },
  stateTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 10 },
  stateText: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },

  errorCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 23,
    alignItems: "center",
    marginTop: 14,
    ...elevate(1),
  },
  errorTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 10 },
  errorText: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 5,
  },
  retryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },
  retryText: { color: SURFACE, fontSize: 11, fontWeight: "700", marginLeft: 6 },

  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 25,
    alignItems: "center",
    marginTop: 14,
    ...elevate(1),
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: { color: TEXT, fontSize: 15, fontWeight: "700" },
  emptyText: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 5,
  },
  emptyAddButton: {
    minHeight: 42,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },
  emptyAddText: {
    color: SURFACE,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },

  inventoryCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    ...elevate(1),
  },
  inventoryHeader: { flexDirection: "row", alignItems: "center" },
  medicineIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  medicineIconWarning: { backgroundColor: WARNING_LIGHT },
  inventoryTitleBlock: { flex: 1, minWidth: 0 },
  medicineName: { color: TEXT, fontSize: 14, fontWeight: "700" },
  medicineMeta: { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },

  lowStockBadge: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginLeft: 8,
  },
  lowStockBadgeText: { color: WARNING_DARK, fontSize: 7, fontWeight: "700" },

  archivedBadge: {
    backgroundColor: BLUE_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginLeft: 8,
  },
  archivedBadgeText: { color: BLUE_DARK, fontSize: 7, fontWeight: "700" },

  availableStockCard: {
    minHeight: 74,
    backgroundColor: BACKGROUND,
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  availableStockNumber: {
    color: TEXT,
    fontSize: 23,
    fontWeight: "800",
  },
  stockNumberWarning: { color: WARNING_DARK },
  availableStockUnit: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 1,
  },
  availableStockText: {
    flex: 1,
    marginLeft: 16,
    paddingLeft: 16,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: BORDER,
  },
  availableStockTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },
  availableStockSubtitle: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 3,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  progressLabel: { color: MUTED, fontSize: 8, fontWeight: "700" },
  thresholdText: { color: MUTED, fontSize: 8, fontWeight: "600" },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: "#E3E7E5",
    overflow: "hidden",
    marginTop: 6,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  progressFillWarning: { backgroundColor: WARNING },

  cardActions: { flexDirection: "row", marginTop: 13 },
  editButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: PRIMARY_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  editButtonText: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 5,
  },
  archiveButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: DANGER_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },
  archiveButtonText: {
    color: DANGER_DARK,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 5,
  },
  restoreButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    backgroundColor: PRIMARY_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  restoreButtonText: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 6,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,25,54,0.48)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  formModal: {
    maxHeight: "88%",
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 18,
  },
  modalHeader: { flexDirection: "row", alignItems: "flex-start" },
  modalHeaderText: { flex: 1, paddingRight: 10 },
  modalTitle: { color: TEXT, fontSize: 18, fontWeight: "700" },
  modalSubtitle: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 3,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },
  formScroll: { marginTop: 13 },

  field: { marginBottom: 12 },
  fieldLabel: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 6,
  },
  fieldInput: {
    minHeight: 46,
    backgroundColor: BACKGROUND,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: TEXT,
    fontSize: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  formRow: { flexDirection: "row" },
  formHalf: { flex: 1 },
  formGap: { width: 10 },

  saveButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  saveButtonText: {
    color: SURFACE,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
  },
  disabledButton: { opacity: 0.5 },
});