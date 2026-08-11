import {
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
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
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileText,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react-native";
import {
  errorCodes,
  isErrorWithCode,
  pick,
} from "@react-native-documents/picker";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  patientReportsApi,
  type PatientReportCategory,
} from "../../services/patientReportsApi";
import { patientSettingsApi } from "../../services/patientSettingsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "PatientUploadReport"
>;

type SelectedReportFile = {
  uri: string;
  name: string;
  type: string;
  size: number | null;
};

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";

const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#2144A5";
const PRIMARY_LIGHT = "#E8EDFF";

const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#F6A545";
const WARNING_DARK = "#A85A13";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const MAX_FILE_SIZE =
  8 * 1024 * 1024;

const ALLOWED_MIME_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ]);

const CATEGORY_OPTIONS: {
  value: PatientReportCategory;
  label: string;
}[] = [
  {
    value: "BLOOD_TEST",
    label: "Blood Test",
  },
  {
    value: "SCAN_XRAY",
    label: "Scan / X-Ray",
  },
  {
    value: "PRESCRIPTION",
    label: "Prescription",
  },
  {
    value: "DISCHARGE_SUMMARY",
    label: "Discharge Summary",
  },
  {
    value: "MEDICAL_LETTER",
    label: "Medical Letter",
  },
  {
    value:
      "OTHER_MEDICAL_REPORT",
    label: "Other Medical Report",
  },
];

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

const formatFileSize = (
  size?: number | null
) => {
  if (
    size === null ||
    size === undefined
  ) {
    return "Size unavailable";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
};

const isValidReportDate = (
  value: string
) => {
  if (!value.trim()) {
    return true;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value.trim()
    )
  ) {
    return false;
  }

  const date = new Date(
    `${value.trim()}T00:00:00.000Z`
  );

  return (
    !Number.isNaN(
      date.getTime()
    ) &&
    date.getTime() <= Date.now()
  );
};

export const PatientUploadReportScreen = ({
  navigation,
}: Props) => {
  const insets =
    useSafeAreaInsets();

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    reportDate,
    setReportDate,
  ] = useState("");

  const [
    category,
    setCategory,
  ] =
    useState<PatientReportCategory>(
      "BLOOD_TEST"
    );

  const [
    isCategoryOpen,
    setIsCategoryOpen,
  ] = useState(false);

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<SelectedReportFile | null>(
      null
    );

  const [
    isSampleConfirmed,
    setIsSampleConfirmed,
  ] = useState(false);

  const [
    isUploading,
    setIsUploading,
  ] = useState(false);

  const selectedCategoryLabel =
    useMemo(() => {
      return (
        CATEGORY_OPTIONS.find(
          (option) =>
            option.value === category
        )?.label ||
        "Medical Report"
      );
    }, [category]);

  const chooseFile = async () => {
    try {
      const [result] =
        await pick({
          mode: "import",
          allowMultiSelection: false,
          allowVirtualFiles: false,
          type: [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
          ],
        });

      if (
        !result.hasRequestedType
      ) {
        Alert.alert(
          "Unsupported file",
          "Please select a PDF, JPG, JPEG, PNG or WEBP medical report."
        );

        return;
      }

      if (result.isVirtual) {
        Alert.alert(
          "Virtual file not supported",
          "Please download the report to your device before uploading it."
        );

        return;
      }

      const mimeType =
        result.type?.toLowerCase() ||
        "";

      if (
        !ALLOWED_MIME_TYPES.has(
          mimeType
        )
      ) {
        Alert.alert(
          "Unsupported file",
          "Please select a PDF, JPG, JPEG, PNG or WEBP medical report."
        );

        return;
      }

      if (
        result.size !== null &&
        result.size >
          MAX_FILE_SIZE
      ) {
        Alert.alert(
          "File too large",
          "Medical report files cannot exceed 8 MB."
        );

        return;
      }

      const fileName =
        result.name?.trim();

      if (!fileName) {
        Alert.alert(
          "Invalid file",
          "The selected file does not have a valid filename."
        );

        return;
      }

      setSelectedFile({
        uri: result.uri,
        name: fileName,
        type: mimeType,
        size: result.size,
      });

      if (!title.trim()) {
        const titleFromFile =
          fileName
            .replace(
              /\.[^/.]+$/,
              ""
            )
            .replace(/[-_]+/g, " ")
            .trim();

        setTitle(
          titleFromFile.slice(
            0,
            120
          )
        );
      }
    } catch (error) {
      if (
        isErrorWithCode(error) &&
        error.code ===
          errorCodes.OPERATION_CANCELED
      ) {
        return;
      }

      Alert.alert(
        "Unable to select file",
        error instanceof Error
          ? error.message
          : "The document picker could not be opened."
      );
    }
  };

  const performUploadReport = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);

      await patientReportsApi.uploadReport(
        {
          title: title.trim(),
          category,
          description: description.trim() || undefined,
          reportDate: reportDate.trim() || undefined,
          confirmSampleData: true,
          file: {
            uri: selectedFile.uri,
            name: selectedFile.name,
            type: selectedFile.type,
          },
        }
      );

      Alert.alert(
        "Report uploaded",
        "Your report was uploaded securely and sent to your assigned doctors for review.",
        [
          {
            text: "View Reports",
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.replace("PatientReports");
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Unable to upload report",
        error instanceof Error
          ? error.message
          : "The report could not be uploaded."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const uploadReport = async () => {
    if (title.trim().length < 2) {
      Alert.alert(
        "Title required",
        "Please enter a report title."
      );
      return;
    }

    if (!selectedFile) {
      Alert.alert(
        "File required",
        "Please select a medical report file."
      );
      return;
    }

    if (!isValidReportDate(reportDate)) {
      Alert.alert(
        "Invalid report date",
        "Use YYYY-MM-DD and do not enter a future date."
      );
      return;
    }

    if (!isSampleConfirmed) {
      Alert.alert(
        "Confirmation required",
        "Confirm that this is fictional or sample data without real personal information."
      );
      return;
    }

    let confirmBeforeSharing = true;

    try {
      const privacyResult = await patientSettingsApi.getPrivacySettings();
      confirmBeforeSharing = privacyResult.settings.confirmBeforeReportSharing;
    } catch {
      confirmBeforeSharing = true;
    }

    if (!confirmBeforeSharing) {
      await performUploadReport();
      return;
    }

    Alert.alert(
      "Share report with assigned doctors?",
      "This report will be uploaded securely and made available to your assigned doctors for review.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Upload & Share",
          onPress: () => {
            void performUploadReport();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <StatusBar
        backgroundColor={
          BACKGROUND
        }
        barStyle="dark-content"
      />

      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={
              styles.backButton
            }
            activeOpacity={0.84}
            onPress={() =>
              navigation.goBack()
            }
          >
            <ArrowLeft
              size={21}
              color={TEXT}
              strokeWidth={2.5}
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerTextBlock
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Upload Report
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Secure medical report upload
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
                  32,
                  insets.bottom + 24
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
              styles.securityCard
            }
          >
            <View
              style={
                styles.securityIcon
              }
            >
              <ShieldCheck
                size={25}
                color={SUCCESS_DARK}
                strokeWidth={2.6}
              />
            </View>

            <View
              style={
                styles.securityTextBlock
              }
            >
              <Text
                style={
                  styles.securityTitle
                }
              >
                Protected upload
              </Text>

              <Text
                style={
                  styles.securityText
                }
              >
                Only PDF and supported image files up to 8 MB are accepted.
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.fieldLabel
            }
          >
            Report file
          </Text>

          {selectedFile ? (
            <View
              style={
                styles.selectedFileCard
              }
            >
              <View
                style={
                  styles.fileIconBox
                }
              >
                <FileText
                  size={25}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              </View>

              <View
                style={
                  styles.fileTextBlock
                }
              >
                <Text
                  style={
                    styles.fileName
                  }
                  numberOfLines={1}
                >
                  {
                    selectedFile.name
                  }
                </Text>

                <Text
                  style={
                    styles.fileMeta
                  }
                >
                  {formatFileSize(
                    selectedFile.size
                  )}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.removeFileButton
                }
                activeOpacity={0.84}
                onPress={() =>
                  setSelectedFile(
                    null
                  )
                }
              >
                <X
                  size={19}
                  color={DANGER}
                  strokeWidth={2.6}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={
                styles.filePicker
              }
              activeOpacity={0.84}
              onPress={() =>
                void chooseFile()
              }
            >
              <View
                style={
                  styles.uploadIconBox
                }
              >
                <UploadCloud
                  size={28}
                  color={PRIMARY}
                  strokeWidth={2.6}
                />
              </View>

              <Text
                style={
                  styles.filePickerTitle
                }
              >
                Select report file
              </Text>

              <Text
                style={
                  styles.filePickerText
                }
              >
                PDF, JPG, PNG or WEBP · Maximum 8 MB
              </Text>
            </TouchableOpacity>
          )}

          <Text
            style={
              styles.fieldLabel
            }
          >
            Report title
          </Text>

          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Example: Blood Test July"
            placeholderTextColor={
              MUTED
            }
            maxLength={120}
            editable={!isUploading}
          />

          <Text
            style={
              styles.fieldLabel
            }
          >
            Category
          </Text>

          <TouchableOpacity
            style={
              styles.categorySelector
            }
            activeOpacity={0.84}
            onPress={() =>
              setIsCategoryOpen(
                (current) =>
                  !current
              )
            }
          >
            <Text
              style={
                styles.categorySelectorText
              }
            >
              {
                selectedCategoryLabel
              }
            </Text>

            <ChevronDown
              size={19}
              color={PRIMARY}
              strokeWidth={2.5}
            />
          </TouchableOpacity>

          {isCategoryOpen ? (
            <View
              style={
                styles.categoryPanel
              }
            >
              {CATEGORY_OPTIONS.map(
                (option) => {
                  const selected =
                    category ===
                    option.value;

                  return (
                    <TouchableOpacity
                      key={
                        option.value
                      }
                      style={[
                        styles.categoryOption,
                        selected
                          ? styles.categoryOptionSelected
                          : undefined,
                      ]}
                      activeOpacity={
                        0.84
                      }
                      onPress={() => {
                        setCategory(
                          option.value
                        );

                        setIsCategoryOpen(
                          false
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          selected
                            ? styles.categoryOptionTextSelected
                            : undefined,
                        ]}
                      >
                        {
                          option.label
                        }
                      </Text>

                      {selected ? (
                        <CheckCircle2
                          size={18}
                          color={
                            PRIMARY
                          }
                          strokeWidth={
                            2.6
                          }
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          ) : null}

          <Text
            style={
              styles.fieldLabel
            }
          >
            Report date
          </Text>

          <View
            style={
              styles.dateInputShell
            }
          >
            <CalendarDays
              size={19}
              color={PRIMARY}
              strokeWidth={2.5}
            />

            <TextInput
              style={
                styles.dateInput
              }
              value={reportDate}
              onChangeText={
                setReportDate
              }
              placeholder="YYYY-MM-DD (optional)"
              placeholderTextColor={
                MUTED
              }
              maxLength={10}
              editable={!isUploading}
            />
          </View>

          <Text
            style={
              styles.fieldLabel
            }
          >
            Description
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.descriptionInput,
            ]}
            value={description}
            onChangeText={
              setDescription
            }
            placeholder="Optional notes about this sample report"
            placeholderTextColor={
              MUTED
            }
            multiline
            textAlignVertical="top"
            maxLength={1000}
            editable={!isUploading}
          />

          <View
            style={
              styles.warningCard
            }
          >
            <AlertTriangle
              size={21}
              color={WARNING_DARK}
              strokeWidth={2.6}
            />

            <Text
              style={
                styles.warningText
              }
            >
              CareMate+ is a prototype. Do not upload real medical or personally identifying data.
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.confirmationRow
            }
            activeOpacity={0.84}
            onPress={() =>
              setIsSampleConfirmed(
                (current) =>
                  !current
              )
            }
          >
            <View
              style={[
                styles.checkbox,
                isSampleConfirmed
                  ? styles.checkboxSelected
                  : undefined,
              ]}
            >
              {isSampleConfirmed ? (
                <CheckCircle2
                  size={18}
                  color={SURFACE}
                  strokeWidth={2.7}
                />
              ) : null}
            </View>

            <Text
              style={
                styles.confirmationText
              }
            >
              I confirm this is fictional or sample medical data without real personal information.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.uploadButton,
              isUploading
                ? styles.disabledButton
                : undefined,
            ]}
            activeOpacity={0.84}
            onPress={() =>
              void uploadReport()
            }
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator
                size="small"
                color={SURFACE}
              />
            ) : (
              <>
                <UploadCloud
                  size={20}
                  color={SURFACE}
                  strokeWidth={2.7}
                />

                <Text
                  style={
                    styles.uploadButtonText
                  }
                >
                  Upload Report
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default PatientUploadReportScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    ...elevate(1),
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 3,
  },
  securityCard: {
    backgroundColor: SUCCESS_LIGHT,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  securityIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  securityTextBlock: {
    flex: 1,
  },
  securityTitle: {
    color: SUCCESS_DARK,
    fontSize: 14,
    fontWeight: "700",
  },
  securityText: {
    color: SUCCESS_DARK,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 3,
  },
  fieldLabel: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 14,
  },
  filePicker: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    ...elevate(1),
  },
  uploadIconBox: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  filePickerTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },
  filePickerText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },
  selectedFileCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(1),
  },
  fileIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  fileTextBlock: {
    flex: 1,
  },
  fileName: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },
  fileMeta: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },
  removeFileButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: SURFACE,
    paddingHorizontal: 13,
    color: TEXT,
    fontSize: 13,
    fontWeight: "500",
    ...elevate(1),
  },
  descriptionInput: {
    minHeight: 120,
    paddingTop: 13,
    paddingBottom: 13,
  },
  categorySelector: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: SURFACE,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...elevate(1),
  },
  categorySelectorText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "600",
  },
  categoryPanel: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 7,
    marginTop: 8,
    ...elevate(2),
  },
  categoryOption: {
    minHeight: 44,
    borderRadius: 11,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryOptionSelected: {
    backgroundColor: PRIMARY_LIGHT,
  },
  categoryOptionText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },
  categoryOptionTextSelected: {
    color: PRIMARY_DARK,
    fontWeight: "700",
  },
  dateInputShell: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: SURFACE,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(1),
  },
  dateInput: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 9,
  },
  warningCard: {
    backgroundColor: WARNING_LIGHT,
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 18,
  },
  warningText: {
    flex: 1,
    color: WARNING_DARK,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    marginLeft: 9,
  },
  confirmationRow: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#C7CCDA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY,
  },
  confirmationText: {
    flex: 1,
    color: TEXT,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
  },
  uploadButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  uploadButtonText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.58,
  },
});