import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  NotebookPen,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { doctorNotesApi } from "../../services/doctor/doctorNotesApi";
import type { RootStackParamList } from "../../types/navigation";

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    "DoctorAddNote"
  >;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";

const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_DARK = "#134E4A";
const DOCTOR_LIGHT = "#E6FFFA";

const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";

const MAX_NOTE_LENGTH = 2000;

const elevate = (
  level: 1 | 2 = 1
) => ({
  elevation:
    level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity:
    Platform.OS === "android"
      ? 0
      : 0.08,
  shadowRadius:
    level === 1 ? 4 : 8,
  shadowOffset: {
    width: 0,
    height:
      level === 1 ? 2 : 4,
  },
});

const getInitials = (
  name: string
) => {
  const parts = name
    .trim()
    .split(" ")
    .filter(Boolean);

  if (parts.length === 0) {
    return "P";
  }

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return `${parts[0].charAt(
    0
  )}${parts[1].charAt(
    0
  )}`.toUpperCase();
};

const DoctorAddNoteScreen = ({
  navigation,
  route,
}: Props) => {
  const insets =
    useSafeAreaInsets();

  const {
    patientId,
    patientName,
  } = route.params;

  const [
    noteText,
    setNoteText,
  ] = useState("");

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const cleanedNote =
    noteText.trim();

  const isSaveDisabled =
    isSaving ||
    cleanedNote.length < 2;

  const saveNote = async () => {
    if (isSaveDisabled) {
      return;
    }

    try {
      setIsSaving(true);

      await doctorNotesApi.createNote(
        patientId,
        cleanedNote
      );

      Alert.alert(
        "Note saved",
        `Your note for ${patientName} has been saved and will appear in the patient's latest doctor note section.`,
        [
          {
            text: "Done",
            onPress: () =>
              navigation.pop(2),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Unable to save note",
        error instanceof Error
          ? error.message
          : "The doctor note could not be saved."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const cancelNote = () => {
    if (isSaving) {
      return;
    }

    if (!noteText.trim()) {
      navigation.goBack();
      return;
    }

    Alert.alert(
      "Discard note?",
      "Your unsaved note will be lost.",
      [
        {
          text: "Keep writing",
          style: "cancel",
        },
        {
          text: "Discard",
          style: "destructive",
          onPress: () =>
            navigation.goBack(),
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        "top",
        "bottom",
      ]}
    >
      <StatusBar
        backgroundColor={BACKGROUND}
        barStyle="dark-content"
      />

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.appBar}>
          <TouchableOpacity
            style={
              styles.backButton
            }
            activeOpacity={0.86}
            onPress={cancelNote}
            disabled={isSaving}
          >
            <ArrowLeft
              size={22}
              color={DOCTOR_PRIMARY}
              strokeWidth={2.7}
            />
          </TouchableOpacity>

          <View
            style={
              styles.appBarText
            }
          >
            <Text
              style={
                styles.appBarTitle
              }
            >
              Add Doctor Note
            </Text>

            <Text
              style={
                styles.appBarSubtitle
              }
            >
              Write a patient care
              update
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                Math.max(
                  30,
                  insets.bottom + 26
                ),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          <View
            style={
              styles.patientCard
            }
          >
            <View
              style={
                styles.patientAvatar
              }
            >
              <Text
                style={
                  styles.patientAvatarText
                }
              >
                {getInitials(
                  patientName
                )}
              </Text>
            </View>

            <View
              style={
                styles.patientTextBlock
              }
            >
              <Text
                style={
                  styles.patientLabel
                }
              >
                Selected patient
              </Text>

              <Text
                style={
                  styles.patientName
                }
                numberOfLines={1}
              >
                {patientName}
              </Text>

              <Text
                style={
                  styles.patientHelper
                }
              >
                This note will be
                linked to this
                patient only.
              </Text>
            </View>

            <View
              style={
                styles.verifiedIcon
              }
            >
              <ShieldCheck
                size={20}
                color={
                  DOCTOR_PRIMARY
                }
                strokeWidth={2.7}
              />
            </View>
          </View>

          <View
            style={
              styles.composerCard
            }
          >
            <View
              style={
                styles.composerHeader
              }
            >
              <View
                style={
                  styles.composerIcon
                }
              >
                <NotebookPen
                  size={23}
                  color={
                    DOCTOR_PRIMARY
                  }
                  strokeWidth={2.7}
                />
              </View>

              <View
                style={
                  styles.composerHeaderText
                }
              >
                <Text
                  style={
                    styles.composerTitle
                  }
                >
                  Clinical note
                </Text>

                <Text
                  style={
                    styles.composerSubtitle
                  }
                >
                  Add an observation,
                  instruction, or
                  follow-up message.
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.inputLabel
              }
            >
              Note
            </Text>

            <TextInput
              style={
                styles.noteInput
              }
              value={noteText}
              onChangeText={
                setNoteText
              }
              placeholder="Write clinical observation, advice, medicine guidance, or follow-up instructions..."
              placeholderTextColor="#A8B0C2"
              multiline
              maxLength={
                MAX_NOTE_LENGTH
              }
              textAlignVertical="top"
              editable={!isSaving}
              autoFocus
            />

            <View
              style={
                styles.inputFooter
              }
            >
              <View
                style={
                  styles.minimumHint
                }
              >
                <Info
                  size={14}
                  color={MUTED}
                  strokeWidth={2.5}
                />

                <Text
                  style={
                    styles.minimumHintText
                  }
                >
                  Minimum 2 characters
                </Text>
              </View>

              <Text
                style={
                  styles.characterCount
                }
              >
                {noteText.length}/
                {MAX_NOTE_LENGTH}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.visibilityPanel
            }
          >
            <View
              style={
                styles.visibilityIcon
              }
            >
              <UserRound
                size={20}
                color={
                  DOCTOR_PRIMARY
                }
                strokeWidth={2.6}
              />
            </View>

            <View
              style={
                styles.visibilityTextBlock
              }
            >
              <Text
                style={
                  styles.visibilityTitle
                }
              >
                Patient visibility
              </Text>

              <Text
                style={
                  styles.visibilityText
                }
              >
                The newest saved note
                will appear on the
                patient's dashboard
                under Latest doctor
                note.
              </Text>
            </View>
          </View>

          <View
            style={styles.actionRow}
          >
            <TouchableOpacity
              style={
                styles.cancelButton
              }
              activeOpacity={0.86}
              onPress={cancelNote}
              disabled={isSaving}
            >
              <Text
                style={
                  styles.cancelButtonText
                }
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                isSaveDisabled
                  ? styles.disabledButton
                  : undefined,
              ]}
              activeOpacity={0.86}
              onPress={() =>
                void saveNote()
              }
              disabled={
                isSaveDisabled
              }
            >
              {isSaving ? (
                <ActivityIndicator
                  size="small"
                  color={SURFACE}
                />
              ) : (
                <>
                  <CheckCircle2
                    size={18}
                    color={SURFACE}
                    strokeWidth={2.7}
                  />

                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    Save Note
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View
            style={
              styles.successInfo
            }
          >
            <CheckCircle2
              size={18}
              color={SUCCESS}
              strokeWidth={2.6}
            />

            <Text
              style={
                styles.successInfoText
              }
            >
              The note is saved under
              your doctor account and
              patient record.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default DoctorAddNoteScreen;

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },
    screen: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },
    appBar: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    backButton: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: SURFACE,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
      ...elevate(1),
    },
    appBarText: {
      flex: 1,
    },
    appBarTitle: {
      color: TEXT,
      fontSize: 24,
      fontWeight: "700",
      letterSpacing: -0.4,
    },
    appBarSubtitle: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 3,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 4,
    },
    patientCard: {
      backgroundColor: SURFACE,
      borderRadius: 16,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      ...elevate(1),
    },
    patientAvatar: {
      width: 52,
      height: 52,
      borderRadius: 15,
      backgroundColor:
        DOCTOR_LIGHT,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },
    patientAvatarText: {
      color: DOCTOR_PRIMARY,
      fontSize: 16,
      fontWeight: "800",
    },
    patientTextBlock: {
      flex: 1,
    },
    patientLabel: {
      color: MUTED,
      fontSize: 10,
      fontWeight: "700",
      textTransform:
        "uppercase",
      letterSpacing: 0.3,
    },
    patientName: {
      color: TEXT,
      fontSize: 16,
      fontWeight: "700",
      marginTop: 3,
    },
    patientHelper: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "600",
      marginTop: 3,
    },
    verifiedIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor:
        DOCTOR_LIGHT,
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 10,
    },
    composerCard: {
      backgroundColor: SURFACE,
      borderRadius: 16,
      padding: 16,
      marginTop: 14,
      ...elevate(1),
    },
    composerHeader: {
      flexDirection: "row",
      alignItems: "center",
    },
    composerIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor:
        DOCTOR_LIGHT,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
    },
    composerHeaderText: {
      flex: 1,
    },
    composerTitle: {
      color: TEXT,
      fontSize: 17,
      fontWeight: "700",
    },
    composerSubtitle: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 18,
      marginTop: 3,
    },
    inputLabel: {
      color: TEXT,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 17,
      marginBottom: 8,
    },
    noteInput: {
      minHeight: 210,
      backgroundColor:
        SOFT_PANEL,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 14,
      color: TEXT,
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 21,
    },
    inputFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginTop: 8,
    },
    minimumHint: {
      flexDirection: "row",
      alignItems: "center",
    },
    minimumHintText: {
      color: MUTED,
      fontSize: 10,
      fontWeight: "600",
      marginLeft: 5,
    },
    characterCount: {
      color: MUTED,
      fontSize: 10,
      fontWeight: "700",
    },
    visibilityPanel: {
      backgroundColor:
        DOCTOR_LIGHT,
      borderRadius: 14,
      padding: 13,
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
    },
    visibilityIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: SURFACE,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 10,
    },
    visibilityTextBlock: {
      flex: 1,
    },
    visibilityTitle: {
      color: DOCTOR_DARK,
      fontSize: 13,
      fontWeight: "700",
    },
    visibilityText: {
      color: DOCTOR_DARK,
      fontSize: 11,
      fontWeight: "600",
      lineHeight: 17,
      marginTop: 3,
    },
    actionRow: {
      flexDirection: "row",
      marginTop: 16,
    },
    cancelButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 13,
      backgroundColor: SURFACE,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 7,
      ...elevate(1),
    },
    cancelButtonText: {
      color: TEXT,
      fontSize: 14,
      fontWeight: "700",
    },
    saveButton: {
      flex: 1.35,
      minHeight: 48,
      borderRadius: 13,
      backgroundColor:
        DOCTOR_PRIMARY,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 7,
      ...elevate(1),
    },
    saveButtonText: {
      color: SURFACE,
      fontSize: 14,
      fontWeight: "700",
      marginLeft: 7,
    },
    disabledButton: {
      opacity: 0.55,
    },
    successInfo: {
      backgroundColor:
        SUCCESS_LIGHT,
      borderRadius: 13,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      marginTop: 14,
    },
    successInfoText: {
      flex: 1,
      color: "#167A58",
      fontSize: 11,
      fontWeight: "600",
      lineHeight: 17,
      marginLeft: 8,
    },
  });