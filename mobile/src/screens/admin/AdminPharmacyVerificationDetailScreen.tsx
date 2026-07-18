import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Hash,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserRound,
  XCircle,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  adminApi,
  buildAdminDocumentUrl,
  type AdminPharmacyVerification,
} from "../../services/adminApi";
import type { RootStackParamList } from "../../types/navigation";

type AdminPharmacyVerificationDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "AdminPharmacyVerificationDetail"
>;

type ChecklistKey =
  | "registrationChecked"
  | "licenceReviewed"
  | "addressProofReviewed"
  | "detailsConsistent"
  | "contactReviewed";

const BACKGROUND = "#F2F3F8";
const SURFACE = "#FFFFFF";
const SURFACE_VARIANT = "#E7E9F2";
const TEXT = "#1B1D2A";
const MUTED = "#5F6270";
const SOFT_PANEL = "#F3F4FA";

const ADMIN = "#6750D8";
const ADMIN_CONTAINER = "#EADDFF";

const PHARMACY = "#0F8B6F";
const PHARMACY_CONTAINER = "#DFF5EE";
const ON_PHARMACY_CONTAINER = "#064C3D";

const SUCCESS_CONTAINER = "#DBF3E7";
const ON_SUCCESS_CONTAINER = "#0F5C3C";

const WARNING_CONTAINER = "#FBE7CD";
const ON_WARNING_CONTAINER = "#7A4708";

const DANGER = "#C6404A";
const DANGER_CONTAINER = "#FBDADC";
const ON_DANGER_CONTAINER = "#8C1D24";

const GPHC_PHARMACY_SEARCH_URL =
  "https://inspections.pharmacyregulation.org/search";

const elevate = (level: number) => ({
  elevation: level,
  shadowColor: "#1B1D2A",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08 + level * 0.01,
  shadowRadius: level * 1.6,
  shadowOffset: {
    width: 0,
    height: level * 0.8,
  },
});

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Something went wrong.";
};

const formatValue = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  return String(value);
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Submitted recently";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Submitted recently";
  }

  return parsedDate.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getInitial = (name: string) => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return "P";
  }

  return trimmedName.charAt(0).toUpperCase();
};

const getStatusLabel = (status: string) => {
  return status.replace(/_/g, " ");
};

const getStatusTone = (status?: string) => {
  if (status === "ACTIVE" || status === "APPROVED") {
    return {
      background: SUCCESS_CONTAINER,
      text: ON_SUCCESS_CONTAINER,
      label: "ACTIVE",
    };
  }

  if (status === "REJECTED" || status === "DISABLED") {
    return {
      background: DANGER_CONTAINER,
      text: ON_DANGER_CONTAINER,
      label: status ? getStatusLabel(status) : "REJECTED",
    };
  }

  return {
    background: WARNING_CONTAINER,
    text: ON_WARNING_CONTAINER,
    label: "PENDING VERIFICATION",
  };
};

export const AdminPharmacyVerificationDetailScreen = ({
  navigation,
  route,
}: AdminPharmacyVerificationDetailScreenProps) => {
  const insets = useSafeAreaInsets();
  const pharmacyId = route.params.pharmacyId;

  const [pharmacy, setPharmacy] =
    useState<AdminPharmacyVerification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    "APPROVE" | "REJECT" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>({
    registrationChecked: false,
    licenceReviewed: false,
    addressProofReviewed: false,
    detailsConsistent: false,
    contactReviewed: false,
  });

  const checkedCount = useMemo(() => {
    return Object.values(checklist).filter(Boolean).length;
  }, [checklist]);

  const displayName = pharmacy?.profile?.pharmacyName || pharmacy?.fullName || "";

  const loadPharmacy = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        }

        if (mode === "refresh") {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const result = await adminApi.getPharmacyVerification(pharmacyId);
        setPharmacy(result.pharmacy);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [pharmacyId]
  );

  useFocusEffect(
    useCallback(() => {
      loadPharmacy("initial");
    }, [loadPharmacy])
  );

  const toggleChecklistItem = (key: ChecklistKey) => {
    setChecklist((currentChecklist) => ({
      ...currentChecklist,
      [key]: !currentChecklist[key],
    }));
  };

  const markAllChecklistChecked = () => {
    setChecklist({
      registrationChecked: true,
      licenceReviewed: true,
      addressProofReviewed: true,
      detailsConsistent: true,
      contactReviewed: true,
    });
  };

  const copyText = (label: string, value?: string | null) => {
    if (!value) {
      Alert.alert("Missing value", `${label} is not available.`);
      return;
    }

    Clipboard.setString(value);
    Alert.alert("Copied", `${label} copied to clipboard.`);
  };

  const openGphcSearch = () => {
    navigation.navigate("AdminRegisterWebView", {
      title: "GPhC Pharmacy Search",
      url: GPHC_PHARMACY_SEARCH_URL,
      helperText: `Search registration number: ${
        pharmacy?.profile?.registrationNumber || "Not provided"
      }`,
    });
  };

  const openDocument = async (documentUrl?: string | null) => {
    const fullUrl = buildAdminDocumentUrl(documentUrl);

    if (!fullUrl) {
      Alert.alert("Document unavailable", "This document link is missing.");
      return;
    }

    const canOpen = await Linking.canOpenURL(fullUrl);

    if (!canOpen) {
      Alert.alert("Unable to open", "This document cannot be opened.");
      return;
    }

    await Linking.openURL(fullUrl);
  };

  const getDecisionNotes = (fallbackNotes: string) => {
    const trimmedNotes = adminNotes.trim();

    if (trimmedNotes) {
      return trimmedNotes;
    }

    return fallbackNotes;
  };

  const approvePharmacy = () => {
    if (!pharmacy || actionLoading) {
      return;
    }

    if (checkedCount < 5) {
      Alert.alert(
        "Checklist incomplete",
        "Please complete the manual verification checklist before approval."
      );
      return;
    }

    Alert.alert(
      "Approve pharmacy",
      `Approve ${displayName} and activate this pharmacy account?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Approve",
          onPress: async () => {
            try {
              setActionLoading("APPROVE");

              const result = await adminApi.approvePharmacyVerification(
                pharmacy.id,
                getDecisionNotes("Pharmacy licence and address proof reviewed.")
              );

              setPharmacy(result.pharmacy);

              Alert.alert(
                "Pharmacy approved",
                "The pharmacy account is now active.",
                [
                  {
                    text: "OK",
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              Alert.alert("Approval failed", getErrorMessage(error));
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const rejectPharmacy = () => {
    if (!pharmacy || actionLoading) {
      return;
    }

    Alert.alert(
      "Reject verification",
      `Reject ${displayName}'s verification request?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading("REJECT");

              const result = await adminApi.rejectPharmacyVerification(
                pharmacy.id,
                getDecisionNotes("Pharmacy verification documents are incomplete.")
              );

              setPharmacy(result.pharmacy);

              Alert.alert(
                "Pharmacy rejected",
                "The request has been rejected.",
                [
                  {
                    text: "OK",
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              Alert.alert("Rejection failed", getErrorMessage(error));
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const renderInfoRow = ({
    icon,
    label,
    value,
    isLast,
  }: {
    icon: ReactNode;
    label: string;
    value: string;
    isLast?: boolean;
  }) => {
    return (
      <View style={[styles.infoRow, isLast ? styles.infoRowLast : undefined]}>
        <View style={styles.infoIconBox}>{icon}</View>

        <View style={styles.infoTextBlock}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
    );
  };

  const renderDocumentButton = ({
    title,
    subtitle,
    documentUrl,
    isLast,
  }: {
    title: string;
    subtitle: string;
    documentUrl?: string | null;
    isLast?: boolean;
  }) => {
    return (
      <TouchableOpacity
        style={[
          styles.documentButton,
          isLast ? styles.documentButtonLast : undefined,
        ]}
        activeOpacity={0.86}
        onPress={() => openDocument(documentUrl)}
      >
        <View style={styles.documentIconBox}>
          <FileText
            size={19}
            color={ON_PHARMACY_CONTAINER}
            strokeWidth={2.4}
          />
        </View>

        <View style={styles.documentTextBlock}>
          <Text style={styles.documentTitle}>{title}</Text>
          <Text style={styles.documentSubtitle}>{subtitle}</Text>
        </View>

        <View style={styles.documentOpenBox}>
          <Text style={styles.documentOpenText}>View</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderChecklistItem = ({
    itemKey,
    label,
  }: {
    itemKey: ChecklistKey;
    label: string;
  }) => {
    const isChecked = checklist[itemKey];

    return (
      <TouchableOpacity
        style={styles.checklistRow}
        onPress={() => toggleChecklistItem(itemKey)}
        activeOpacity={0.82}
      >
        <View
          style={[
            styles.checkbox,
            isChecked ? styles.checkboxChecked : undefined,
          ]}
        >
          {isChecked ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
        </View>

        <Text
          style={[
            styles.checklistText,
            isChecked ? styles.checklistTextChecked : undefined,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const isPending = pharmacy?.accountStatus === "PENDING_VERIFICATION";
  const statusTone = getStatusTone(pharmacy?.accountStatus);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor={BACKGROUND} barStyle="dark-content" />

      <View style={styles.screen}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.82}
          >
            <ArrowLeft size={20} color={TEXT} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.topTitleBlock}>
            <Text style={styles.kicker}>Manual pharmacy review</Text>
            <Text style={styles.title}>Pharmacy Review</Text>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => loadPharmacy("initial")}
            activeOpacity={0.82}
          >
            <RefreshCw size={19} color={MUTED} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: isPending
                ? Math.max(insets.bottom + 132, 150)
                : Math.max(insets.bottom + 28, 44),
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadPharmacy("refresh")}
              tintColor={ADMIN}
              colors={[ADMIN]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={ADMIN} />
              <Text style={styles.loadingText}>Loading pharmacy details...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIconBox}>
                <XCircle
                  size={24}
                  color={ON_DANGER_CONTAINER}
                  strokeWidth={2.5}
                />
              </View>

              <Text style={styles.errorTitle}>Unable to load pharmacy</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => loadPharmacy("initial")}
                activeOpacity={0.86}
              >
                <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : pharmacy ? (
            <>
              <View style={styles.warningPanel}>
                <ShieldAlert
                  size={19}
                  color={ON_WARNING_CONTAINER}
                  strokeWidth={2.5}
                />
                <Text style={styles.warningText}>
                  CareMate+ does not automatically verify pharmacy registration.
                  Admin must manually review uploaded licence and address proof
                  before approval.
                </Text>
              </View>

              <View style={styles.profileCard}>
                <View style={styles.avatarBox}>
                  <Text style={styles.avatarText}>{getInitial(displayName)}</Text>
                </View>

                <View style={styles.profileTextBlock}>
                  <Text style={styles.pharmacyName} numberOfLines={1}>
                    {displayName}
                  </Text>

                  <Text style={styles.pharmacyEmail} numberOfLines={1}>
                    {pharmacy.email}
                  </Text>

                  <View
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: statusTone.background,
                      },
                    ]}
                  >
                    <ShieldCheck
                      size={13}
                      color={statusTone.text}
                      strokeWidth={2.5}
                    />
                    <Text
                      style={[
                        styles.statusChipText,
                        {
                          color: statusTone.text,
                        },
                      ]}
                    >
                      {statusTone.label}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.summaryPanel}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Submitted</Text>
                  <Text style={styles.summaryValue}>
                    {formatDate(pharmacy.submittedAt)}
                  </Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Email</Text>
                  <Text style={styles.summaryValue}>
                    {pharmacy.isEmailVerified ? "Verified" : "Not verified"}
                  </Text>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pharmacy details</Text>
                <Text style={styles.sectionMeta}>Profile</Text>
              </View>

              <View style={styles.infoCard}>
                {renderInfoRow({
                  icon: (
                    <Store
                      size={18}
                      color={ON_PHARMACY_CONTAINER}
                      strokeWidth={2.4}
                    />
                  ),
                  label: "Pharmacy name",
                  value: formatValue(pharmacy.profile?.pharmacyName),
                })}

                {renderInfoRow({
                  icon: (
                    <UserRound
                      size={18}
                      color={ON_PHARMACY_CONTAINER}
                      strokeWidth={2.4}
                    />
                  ),
                  label: "Staff name",
                  value: formatValue(pharmacy.profile?.staffName),
                })}

                {renderInfoRow({
                  icon: (
                    <Hash
                      size={18}
                      color={ON_PHARMACY_CONTAINER}
                      strokeWidth={2.4}
                    />
                  ),
                  label: "Registration number",
                  value: formatValue(pharmacy.profile?.registrationNumber),
                })}

                {renderInfoRow({
                  icon: (
                    <BadgeCheck
                      size={18}
                      color={ON_PHARMACY_CONTAINER}
                      strokeWidth={2.4}
                    />
                  ),
                  label: "Licence number",
                  value: formatValue(pharmacy.profile?.licenseNumber),
                })}

                {renderInfoRow({
                  icon: (
                    <Phone
                      size={18}
                      color={ON_PHARMACY_CONTAINER}
                      strokeWidth={2.4}
                    />
                  ),
                  label: "Phone",
                  value: formatValue(pharmacy.profile?.phoneNumber),
                })}

                {renderInfoRow({
                  icon: (
                    <Mail
                      size={18}
                      color={ON_PHARMACY_CONTAINER}
                      strokeWidth={2.4}
                    />
                  ),
                  label: "Profile email",
                  value: formatValue(pharmacy.profile?.email),
                })}

                {renderInfoRow({
                  icon: (
                    <MapPin
                      size={18}
                      color={ON_PHARMACY_CONTAINER}
                      strokeWidth={2.4}
                    />
                  ),
                  label: "Address",
                  value: `${formatValue(pharmacy.profile?.address)}, ${formatValue(
                    pharmacy.profile?.city
                  )}, ${formatValue(pharmacy.profile?.postcode)}`,
                  isLast: true,
                })}
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Registration check</Text>
                <Text style={styles.sectionMeta}>Manual check</Text>
              </View>

              <View style={styles.registrationCard}>
                <View style={styles.registrationRow}>
                  <View>
                    <Text style={styles.registrationLabel}>
                      Registration number
                    </Text>
                    <Text style={styles.registrationValue}>
                      {formatValue(pharmacy.profile?.registrationNumber)}
                    </Text>
                  </View>

                  <Building2
                    size={22}
                    color={ON_PHARMACY_CONTAINER}
                    strokeWidth={2.5}
                  />
                </View>

                <View style={styles.registrationActionsRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() =>
                      copyText(
                        "Registration number",
                        pharmacy.profile?.registrationNumber
                      )
                    }
                    activeOpacity={0.86}
                  >
                    <Copy
                      size={15}
                      color={ON_PHARMACY_CONTAINER}
                      strokeWidth={2.5}
                    />
                    <Text style={styles.secondaryButtonText}>Copy reg no.</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() =>
                      copyText("Licence number", pharmacy.profile?.licenseNumber)
                    }
                    activeOpacity={0.86}
                  >
                    <Copy
                      size={15}
                      color={ON_PHARMACY_CONTAINER}
                      strokeWidth={2.5}
                    />
                    <Text style={styles.secondaryButtonText}>Copy licence</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.primaryRegisterButton}
                  onPress={openGphcSearch}
                  activeOpacity={0.86}
                >
                  <ExternalLink size={15} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.primaryRegisterButtonText}>
                    Open GPhC Search
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.markCheckedButton}
                  onPress={markAllChecklistChecked}
                  activeOpacity={0.86}
                >
                  <CheckCircle2 size={16} color={PHARMACY} strokeWidth={2.5} />
                  <Text style={styles.markCheckedText}>Mark as checked</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Uploaded documents</Text>
                <Text style={styles.sectionMeta}>Tap to open</Text>
              </View>

              <View style={styles.documentsCard}>
                {renderDocumentButton({
                  title: "Pharmacy licence document",
                  subtitle: "Registration or licence proof",
                  documentUrl: pharmacy.documents?.licenseDocumentUrl,
                })}

                {renderDocumentButton({
                  title: "Address proof document",
                  subtitle: "Pharmacy address evidence",
                  documentUrl: pharmacy.documents?.addressProofDocumentUrl,
                  isLast: true,
                })}
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Verification checklist</Text>
                <Text style={styles.sectionMeta}>{checkedCount}/5</Text>
              </View>

              <View style={styles.checklistCard}>
                {renderChecklistItem({
                  itemKey: "registrationChecked",
                  label: "Registration number checked",
                })}

                {renderChecklistItem({
                  itemKey: "licenceReviewed",
                  label: "Licence document reviewed",
                })}

                {renderChecklistItem({
                  itemKey: "addressProofReviewed",
                  label: "Address proof document reviewed",
                })}

                {renderChecklistItem({
                  itemKey: "detailsConsistent",
                  label: "Pharmacy details are consistent",
                })}

                {renderChecklistItem({
                  itemKey: "contactReviewed",
                  label: "Contact details reviewed",
                })}
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Admin notes</Text>
                <Text style={styles.sectionMeta}>Optional</Text>
              </View>

              <View style={styles.notesCard}>
                <TextInput
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  placeholder="Add verification note or rejection reason..."
                  placeholderTextColor="#8E95A7"
                  multiline
                  textAlignVertical="top"
                  style={styles.notesInput}
                />
              </View>

              {!isPending ? (
                <View style={styles.completedPanel}>
                  <View
                    style={[
                      styles.completedIconBox,
                      {
                        backgroundColor: statusTone.background,
                      },
                    ]}
                  >
                    <CheckCircle2
                      size={24}
                      color={statusTone.text}
                      strokeWidth={2.5}
                    />
                  </View>

                  <View style={styles.completedTextBlock}>
                    <Text style={styles.completedTitle}>
                      Review already completed
                    </Text>
                    <Text style={styles.completedText}>
                      This request is currently marked as{" "}
                      {getStatusLabel(pharmacy.accountStatus).toLowerCase()}.
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        {isPending ? (
          <View
            style={[
              styles.bottomActionBar,
              {
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.rejectButton,
                actionLoading ? styles.disabledButton : undefined,
              ]}
              onPress={rejectPharmacy}
              disabled={!!actionLoading}
              activeOpacity={0.86}
            >
              {actionLoading === "REJECT" ? (
                <ActivityIndicator color={DANGER} />
              ) : (
                <>
                  <XCircle size={18} color={DANGER} strokeWidth={2.5} />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.approveButton,
                actionLoading ? styles.disabledButton : undefined,
              ]}
              onPress={approvePharmacy}
              disabled={!!actionLoading}
              activeOpacity={0.86}
            >
              {actionLoading === "APPROVE" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: BACKGROUND,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    ...elevate(2),
  },
  topTitleBlock: {
    flex: 1,
    paddingHorizontal: 12,
  },
  kicker: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  title: {
    color: TEXT,
    fontSize: 21,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  loadingCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    ...elevate(2),
  },
  loadingText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
  },
  errorCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    ...elevate(2),
  },
  errorIconBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: DANGER_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  errorTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  errorText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 14,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ADMIN,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },
  warningPanel: {
    backgroundColor: WARNING_CONTAINER,
    borderRadius: 16,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    ...elevate(1),
  },
  warningText: {
    flex: 1,
    color: ON_WARNING_CONTAINER,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginLeft: 9,
  },
  profileCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    ...elevate(2),
  },
  avatarBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: PHARMACY_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    color: ON_PHARMACY_CONTAINER,
    fontSize: 23,
    fontWeight: "700",
  },
  profileTextBlock: {
    flex: 1,
  },
  pharmacyName: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 3,
  },
  pharmacyEmail: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 9,
  },
  statusChip: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginLeft: 5,
  },
  summaryPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    ...elevate(1),
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 3,
  },
  summaryValue: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    backgroundColor: SURFACE_VARIANT,
    marginHorizontal: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },
  sectionMeta: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 18,
    ...elevate(2),
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE_VARIANT,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PHARMACY_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoValue: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  registrationCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    ...elevate(2),
  },
  registrationRow: {
    backgroundColor: PHARMACY_CONTAINER,
    borderRadius: 13,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  registrationLabel: {
    color: ON_PHARMACY_CONTAINER,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 3,
  },
  registrationValue: {
    color: ON_PHARMACY_CONTAINER,
    fontSize: 15,
    fontWeight: "700",
  },
  registrationActionsRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  secondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginRight: 8,
  },
  secondaryButtonText: {
    color: ON_PHARMACY_CONTAINER,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  primaryRegisterButton: {
    height: 42,
    borderRadius: 12,
    backgroundColor: PHARMACY,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 10,
  },
  primaryRegisterButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
  },
  markCheckedButton: {
    height: 42,
    borderRadius: 12,
    backgroundColor: PHARMACY_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  markCheckedText: {
    color: ON_PHARMACY_CONTAINER,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
  },
  documentsCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
    ...elevate(2),
  },
  documentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    padding: 12,
    marginBottom: 10,
  },
  documentButtonLast: {
    marginBottom: 0,
  },
  documentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PHARMACY_CONTAINER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  documentTextBlock: {
    flex: 1,
  },
  documentTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  documentSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
  },
  documentOpenBox: {
    borderRadius: 8,
    backgroundColor: PHARMACY_CONTAINER,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 10,
  },
  documentOpenText: {
    color: ON_PHARMACY_CONTAINER,
    fontSize: 11,
    fontWeight: "700",
  },
  checklistCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    ...elevate(2),
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: PHARMACY,
  },
  checklistText: {
    flex: 1,
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  checklistTextChecked: {
    color: TEXT,
    fontWeight: "600",
  },
  notesCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
    ...elevate(2),
  },
  notesInput: {
    minHeight: 92,
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: TEXT,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
  },
  completedPanel: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(2),
  },
  completedIconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  completedTextBlock: {
    flex: 1,
  },
  completedTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  completedText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
  bottomActionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SURFACE,
    paddingTop: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(5),
  },
  rejectButton: {
    flex: 1,
    height: 52,
    backgroundColor: DANGER_CONTAINER,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginRight: 10,
  },
  rejectButtonText: {
    color: DANGER,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  approveButton: {
    flex: 1,
    height: 52,
    backgroundColor: PHARMACY,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.65,
  },
});