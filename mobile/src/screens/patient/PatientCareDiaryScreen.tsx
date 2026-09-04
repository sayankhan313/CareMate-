import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, BookOpen, CalendarDays, ChevronDown, ChevronUp, HeartPulse, Pencil, Plus, Save, Trash2, X } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { patientCareDiaryApi, type PatientCareDiaryEntry, type PatientCareDiaryInput } from "../../services/patientCareDiaryApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PatientCareDiary">;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PRIMARY = "#5B86E5";
const PRIMARY_LIGHT = "#EEF4FF";
const DANGER = "#EF4D56";
const DANGER_LIGHT = "#FFEDEE";

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: { width: 0, height: level === 1 ? 2 : 4 },
});

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

export const PatientCareDiaryScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();

  const [entries, setEntries] = useState<PatientCareDiaryEntry[]>([]);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<PatientCareDiaryEntry | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [mood, setMood] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadEntries = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      const result = await patientCareDiaryApi.listEntries();
      setEntries(result.data.entries || []);
    } catch (error) {
      Alert.alert("Unable to load care diary", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadEntries();
  }, [loadEntries]));

  const resetForm = () => {
    setTitle("");
    setNote("");
    setMood("");
    setSymptoms("");
    setEditingEntry(null);
  };

  const openCreate = () => {
    resetForm();
    setIsFormVisible(true);
  };

  const openEdit = (entry: PatientCareDiaryEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setNote(entry.note);
    setMood(entry.mood || "");
    setSymptoms(entry.symptoms || "");
    setIsFormVisible(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setIsFormVisible(false);
    resetForm();
  };

  const saveEntry = async () => {
    const cleanTitle = title.trim();
    const cleanNote = note.trim();

    if (!cleanTitle) {
      Alert.alert("Title required", "Please enter a short title for your diary entry.");
      return;
    }

    if (!cleanNote) {
      Alert.alert("Note required", "Please write your diary note.");
      return;
    }

    const input: PatientCareDiaryInput = {
      title: cleanTitle,
      note: cleanNote,
      mood: mood.trim() || null,
      symptoms: symptoms.trim() || null,
      ...(editingEntry ? {} : { entryDate: new Date().toISOString() }),
    };

    try {
      setIsSaving(true);

      if (editingEntry) {
        await patientCareDiaryApi.updateEntry(editingEntry.id, input);
      } else {
        await patientCareDiaryApi.createEntry(input);
      }

      setIsFormVisible(false);
      resetForm();
      await loadEntries("refresh");
    } catch (error) {
      Alert.alert("Unable to save entry", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEntry = (entry: PatientCareDiaryEntry) => {
    Alert.alert("Delete diary entry?", `"${entry.title}" will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await patientCareDiaryApi.deleteEntry(entry.id);
            if (expandedEntryId === entry.id) setExpandedEntryId(null);
            await loadEntries("refresh");
          } catch (error) {
            Alert.alert("Unable to delete entry", error instanceof Error ? error.message : "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <ArrowLeft size={22} color={TEXT} strokeWidth={2.7} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Care Diary</Text>
            <Text style={styles.headerSubtitle}>Record how you are feeling</Text>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={openCreate} activeOpacity={0.85}>
            <Plus size={22} color={SURFACE} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(110, insets.bottom + 90) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadEntries("refresh")} colors={[PRIMARY]} />}
        >
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <HeartPulse size={25} color={PRIMARY} strokeWidth={2.5} />
            </View>
            <View style={styles.introTextBlock}>
              <Text style={styles.introTitle}>Your health notes</Text>
              <Text style={styles.introText}>Keep personal notes about symptoms, mood or how you feel over time.</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.loadingText}>Loading diary entries</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <BookOpen size={32} color={PRIMARY} strokeWidth={2.3} />
              </View>
              <Text style={styles.emptyTitle}>No diary entries yet</Text>
              <Text style={styles.emptyText}>Add a health note whenever there is something you want to remember.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openCreate} activeOpacity={0.85}>
                <Plus size={18} color={SURFACE} strokeWidth={2.5} />
                <Text style={styles.emptyButtonText}>Add first entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Recent entries</Text>
                <Text style={styles.sectionCount}>{entries.length}</Text>
              </View>

              {entries.map(entry => {
                const expanded = expandedEntryId === entry.id;

                return (
                  <View key={entry.id} style={styles.entryCard}>
                    <TouchableOpacity style={styles.entryHeader} activeOpacity={0.85} onPress={() => setExpandedEntryId(expanded ? null : entry.id)}>
                      <View style={styles.entryIcon}>
                        <BookOpen size={20} color={PRIMARY} strokeWidth={2.4} />
                      </View>

                      <View style={styles.entryHeaderText}>
                        <Text style={styles.entryTitle} numberOfLines={1}>{entry.title}</Text>

                        <View style={styles.dateRow}>
                          <CalendarDays size={13} color={MUTED} strokeWidth={2.2} />
                          <Text style={styles.entryDate}>{formatDate(entry.entryDate)} · {formatTime(entry.entryDate)}</Text>
                        </View>
                      </View>

                      {expanded ? <ChevronUp size={20} color={MUTED} strokeWidth={2.4} /> : <ChevronDown size={20} color={MUTED} strokeWidth={2.4} />}
                    </TouchableOpacity>

                    {expanded ? (
                      <View style={styles.entryBody}>
                        <Text style={styles.noteText}>{entry.note}</Text>

                        {entry.mood ? (
                          <View style={styles.detailBlock}>
                            <Text style={styles.detailLabel}>Mood / feeling</Text>
                            <Text style={styles.detailValue}>{entry.mood}</Text>
                          </View>
                        ) : null}

                        {entry.symptoms ? (
                          <View style={styles.detailBlock}>
                            <Text style={styles.detailLabel}>Symptoms</Text>
                            <Text style={styles.detailValue}>{entry.symptoms}</Text>
                          </View>
                        ) : null}

                        <View style={styles.entryActions}>
                          <TouchableOpacity style={styles.editButton} onPress={() => openEdit(entry)} activeOpacity={0.85}>
                            <Pencil size={16} color={PRIMARY} strokeWidth={2.5} />
                            <Text style={styles.editButtonText}>Edit</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.deleteButton} onPress={() => deleteEntry(entry)} activeOpacity={0.85}>
                            <Trash2 size={16} color={DANGER} strokeWidth={2.5} />
                            <Text style={styles.deleteButtonText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>

      <Modal visible={isFormVisible} transparent animationType="fade" onRequestClose={closeForm}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{editingEntry ? "Edit diary entry" : "New diary entry"}</Text>
                <Text style={styles.modalSubtitle}>{editingEntry ? "Update your health note" : "Record how you are feeling"}</Text>
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={closeForm}>
                <X size={20} color={TEXT} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Feeling tired today" placeholderTextColor={MUTED} maxLength={120} />

              <Text style={styles.inputLabel}>Health note</Text>
              <TextInput
                style={[styles.input, styles.noteInput]}
                value={note}
                onChangeText={setNote}
                placeholder="Write your note"
                placeholderTextColor={MUTED}
                multiline
                textAlignVertical="top"
                maxLength={5000}
              />

              <Text style={styles.inputLabel}>Mood / feeling <Text style={styles.optionalText}>Optional</Text></Text>
              <TextInput style={styles.input} value={mood} onChangeText={setMood} placeholder="e.g. Good, tired, anxious" placeholderTextColor={MUTED} maxLength={80} />

              <Text style={styles.inputLabel}>Symptoms <Text style={styles.optionalText}>Optional</Text></Text>
              <TextInput
                style={[styles.input, styles.symptomsInput]}
                value={symptoms}
                onChangeText={setSymptoms}
                placeholder="e.g. Mild headache"
                placeholderTextColor={MUTED}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />

              <TouchableOpacity style={[styles.saveButton, isSaving && styles.disabledButton]} disabled={isSaving} onPress={() => void saveEntry()} activeOpacity={0.85}>
                {isSaving ? (
                  <ActivityIndicator color={SURFACE} />
                ) : (
                  <>
                    <Save size={18} color={SURFACE} strokeWidth={2.5} />
                    <Text style={styles.saveButtonText}>{editingEntry ? "Save changes" : "Save entry"}</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default PatientCareDiaryScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  backButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 13, ...elevate(1) },
  headerText: { flex: 1 },
  headerTitle: { color: TEXT, fontSize: 26, fontWeight: "700", letterSpacing: -0.4 },
  headerSubtitle: { color: MUTED, fontSize: 13, fontWeight: "500", marginTop: 3 },
  addButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", marginLeft: 10, ...elevate(1) },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  introCard: { backgroundColor: PRIMARY_LIGHT, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 14 },
  introIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  introTextBlock: { flex: 1 },
  introTitle: { color: TEXT, fontSize: 15, fontWeight: "700" },
  introText: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 4 },
  loadingCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 24, alignItems: "center", ...elevate(1) },
  loadingText: { color: MUTED, fontSize: 13, fontWeight: "600", marginTop: 10 },
  emptyCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 24, alignItems: "center", ...elevate(1) },
  emptyIcon: { width: 64, height: 64, borderRadius: 19, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontSize: 17, fontWeight: "700", marginTop: 13 },
  emptyText: { color: MUTED, fontSize: 12, fontWeight: "500", lineHeight: 18, textAlign: "center", marginTop: 6 },
  emptyButton: { minHeight: 44, borderRadius: 12, paddingHorizontal: 16, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16 },
  emptyButtonText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginLeft: 6 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  sectionCount: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: PRIMARY_LIGHT, color: PRIMARY, textAlign: "center", textAlignVertical: "center", fontSize: 11, fontWeight: "700" },
  entryCard: { backgroundColor: SURFACE, borderRadius: 16, marginBottom: 11, overflow: "hidden", ...elevate(1) },
  entryHeader: { padding: 14, flexDirection: "row", alignItems: "center" },
  entryIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  entryHeaderText: { flex: 1, paddingRight: 8 },
  entryTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  dateRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  entryDate: { color: MUTED, fontSize: 10, fontWeight: "500", marginLeft: 5 },
  entryBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER },
  noteText: { color: TEXT, fontSize: 13, fontWeight: "500", lineHeight: 20, marginTop: 13 },
  detailBlock: { backgroundColor: "#F7F8FC", borderRadius: 11, padding: 11, marginTop: 10 },
  detailLabel: { color: MUTED, fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  detailValue: { color: TEXT, fontSize: 12, fontWeight: "500", lineHeight: 18, marginTop: 4 },
  entryActions: { flexDirection: "row", marginTop: 12 },
  editButton: { flex: 1, minHeight: 40, borderRadius: 11, backgroundColor: PRIMARY_LIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", marginRight: 5 },
  editButtonText: { color: PRIMARY, fontSize: 11, fontWeight: "700", marginLeft: 5 },
  deleteButton: { flex: 1, minHeight: 40, borderRadius: 11, backgroundColor: DANGER_LIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", marginLeft: 5 },
  deleteButtonText: { color: DANGER, fontSize: 11, fontWeight: "700", marginLeft: 5 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(17,25,54,0.48)", justifyContent: "center", paddingHorizontal: 17 },
  modalCard: { maxHeight: "88%", backgroundColor: SURFACE, borderRadius: 20, padding: 17, ...elevate(2) },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  modalHeaderText: { flex: 1 },
  modalTitle: { color: TEXT, fontSize: 19, fontWeight: "700" },
  modalSubtitle: { color: MUTED, fontSize: 11, fontWeight: "500", marginTop: 3 },
  closeButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F3F5FA", alignItems: "center", justifyContent: "center", marginLeft: 10 },
  inputLabel: { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  optionalText: { color: MUTED, fontSize: 10, fontWeight: "500" },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: "#F8F9FC", color: TEXT, fontSize: 13, paddingHorizontal: 12 },
  noteInput: { minHeight: 110, paddingTop: 12 },
  symptomsInput: { minHeight: 80, paddingTop: 12 },
  saveButton: { minHeight: 48, borderRadius: 13, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 17, marginBottom: 4 },
  saveButtonText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginLeft: 7 },
  disabledButton: { opacity: 0.5 },
});