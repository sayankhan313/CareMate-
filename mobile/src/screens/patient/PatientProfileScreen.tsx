import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertCircle, ArrowLeft, Bell, Building2, Calendar, CheckCircle2, ChevronRight, Clock, CreditCard, Crown, Droplet, Hash, HeartPulse, Languages, Lock, LogOut, Mail, MapPin, Pencil, Phone, RefreshCw, ShieldAlert, Stethoscope, UserRound, Users } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "../../context/LanguageContext";
import { doctorAssignmentApi, type AssignedDoctor } from "../../services/doctorAssignmentApi";
import { patientProfileApi, type LinkedCaregiver, type PatientProfileData } from "../../services/patientProfileApi";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PatientProfile">;
type LinkedUsers = { caregiver: LinkedCaregiver | null };

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#3F6FD0";
const PRIMARY_LIGHT = "#EEF4FF";
const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";
const WARNING = "#F6A545";
const WARNING_LIGHT = "#FFF3E2";
const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const elevate = (level: 1 | 2 = 1) => ({ elevation: level === 1 ? 2 : 4, shadowColor: "#172033", shadowOpacity: Platform.OS === "android" ? 0 : 0.08, shadowRadius: level === 1 ? 4 : 8, shadowOffset: { width: 0, height: level === 1 ? 2 : 4 } });
const formatDoctorName = (fullName: string) => /^dr\.?\s/i.test(fullName.trim()) ? fullName.trim() : `Dr. ${fullName.trim()}`;

const getInitials = (name?: string | null) => {
  if (!name) return "P";
  const parts = name.trim().split(" ").filter(Boolean);
  if (!parts.length) return "P";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const getDisplayValue = (value: string | null | undefined, fallback: string) => value?.trim() || fallback;

const formatMedicalConditions = (conditions: string | string[] | null | undefined, fallback: string) => {
  if (!conditions) return fallback;
  if (Array.isArray(conditions)) return conditions.length ? conditions.join(", ") : fallback;
  return conditions.trim() || fallback;
};

const getPharmacyProfileCopy = (language: string) => {
  if (language === "HINDI") return { title: "मेरी फ़ार्मेसियाँ", value: "सेव और प्राथमिक फ़ार्मेसी प्रबंधित करें" };
  if (language === "GREEK") return { title: "Τα φαρμακεία μου", value: "Διαχείριση αποθηκευμένων και κύριου φαρμακείου" };
  if (language === "HAUSA") return { title: "Pharmacies dina", value: "Sarrafa saved da primary pharmacy" };
  if (language === "GERMAN") return { title: "Meine Apotheken", value: "Gespeicherte und Hauptapotheke verwalten" };
  return { title: "My Pharmacies", value: "Manage saved and primary pharmacy" };
};

const getPrescriptionPaymentCopy = (language: string) => {
  if (language === "HINDI") return { title: "प्रिस्क्रिप्शन भुगतान", value: "शुल्क और छूट प्रमाण प्रबंधित करें" };
  if (language === "GREEK") return { title: "Πληρωμή συνταγών", value: "Διαχείριση χρεώσεων και απαλλαγής" };
  if (language === "HAUSA") return { title: "Biyan prescription", value: "Sarrafa charges da exemption" };
  if (language === "GERMAN") return { title: "Rezeptzahlung", value: "Gebühren und Befreiung verwalten" };
  return { title: "Prescription Payment", value: "Manage charges and exemption evidence" };
};

export const PatientProfileScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const { t, language, palette, scaleFont, screenReaderHintsEnabled } = useLanguage();
  const pharmacyCopy = getPharmacyProfileCopy(language);
  const prescriptionPaymentCopy = getPrescriptionPaymentCopy(language);

  const [profile, setProfile] = useState<PatientProfileData | null>(route.params?.user || null);
  const [linkedUsers, setLinkedUsers] = useState<LinkedUsers>({ caregiver: null });
  const [assignedDoctors, setAssignedDoctors] = useState<AssignedDoctor[]>([]);
  const [isLoading, setIsLoading] = useState(!route.params?.user);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const primaryDoctor = useMemo(() => assignedDoctors.find(assignment => assignment.assignmentType === "PRIMARY"), [assignedDoctors]);
  const specialistCount = useMemo(() => assignedDoctors.filter(assignment => assignment.assignmentType === "SPECIALIST").length, [assignedDoctors]);

  const profileCompletion = useMemo(() => {
    const fields = [profile?.healthRecordNumber, profile?.bloodGroup, profile?.medicalConditions, profile?.allergies, profile?.emergencyContactName || profile?.emergencyContact, profile?.addressLine];
    const completed = fields.filter(value => Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim().length > 0).length;
    return Math.round((completed / fields.length) * 100);
  }, [profile]);

  const loadProfile = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "initial" ? setIsLoading(true) : setIsRefreshing(true);
      setErrorMessage("");

      const token = await tokenStorage.getToken();

      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const [profileResult, assignedDoctorsResult] = await Promise.all([
        patientProfileApi.getProfile(),
        doctorAssignmentApi.getAssignedDoctors(),
      ]);

      setProfile(profileResult.patient);
      setLinkedUsers({ caregiver: profileResult.linkedUsers?.caregiver || null });
      setAssignedDoctors(assignedDoctorsResult.doctors || []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("profile.unavailable"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [navigation, t]);

  useFocusEffect(useCallback(() => {
    void loadProfile("initial");
  }, [loadProfile]));

  const handleLogout = () => {
    Alert.alert(t("profile.logoutTitle"), t("profile.logoutMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logoutConfirm"),
        style: "destructive",
        onPress: async () => {
          await tokenStorage.removeToken();
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        },
      },
    ]);
  };

  const notAdded = t("common.notAdded");
  const fullName = profile?.fullName || route.params?.user?.fullName || profile?.firstName || t("common.patient");
  const email = profile?.email || route.params?.user?.email || notAdded;
  const phone = profile?.phoneNumber || profile?.phone || null;
  const initials = getInitials(fullName);

  const assignedDoctorsText =
    assignedDoctors.length === 0
      ? t("profile.noDoctorsAssigned")
      : assignedDoctors.length === 1
        ? t("profile.oneDoctorAssigned")
        : t("profile.manyDoctorsAssigned", { count: assignedDoctors.length });

  const emergencyName = profile?.emergencyContactName?.trim();
  const emergencyPhone = profile?.emergencyContactPhone?.trim();
  const emergencyContact = emergencyName && emergencyPhone ? `${emergencyName} · ${emergencyPhone}` : emergencyName || emergencyPhone || getDisplayValue(profile?.emergencyContact, notAdded);
  const address = profile?.addressLine?.trim() && profile?.postcode?.trim() ? `${profile.addressLine.trim()}, ${profile.postcode.trim()}` : profile?.addressLine?.trim() || profile?.postcode?.trim() || notAdded;

  const accountStatus =
    profile?.accountStatus === "APPROVED"
      ? t("status.approved")
      : profile?.accountStatus === "PENDING_VERIFICATION"
        ? t("status.pendingVerification")
        : profile?.accountStatus === "REJECTED"
          ? t("status.rejected")
          : profile?.accountStatus === "DISABLED"
            ? t("status.disabled")
            : profile?.accountStatus === "ACTIVE"
              ? t("status.active")
              : t("common.notAvailable");

  const textColor = palette.text;
  const mutedColor = palette.muted;
  const backgroundColor = palette.background;
  const surfaceColor = palette.surface;
  const primaryColor = palette.primary;
  const primaryLightColor = palette.primaryLight;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={["top", "bottom"]}>
      <StatusBar backgroundColor={backgroundColor} barStyle="dark-content" />

      <View style={[styles.screen, { backgroundColor }]}>
        <View style={styles.appBar}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: surfaceColor }]} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={textColor} strokeWidth={2.7} />
          </TouchableOpacity>

          <View style={styles.appBarTextBlock}>
            <Text style={[styles.appBarTitle, { color: textColor, fontSize: scaleFont(26) }]}>{t("profile.title")}</Text>
            <Text style={[styles.appBarSubtitle, { color: mutedColor, fontSize: scaleFont(13) }]}>{t("profile.subtitle")}</Text>
          </View>

          <TouchableOpacity style={[styles.editHeaderButton, { backgroundColor: surfaceColor }]} activeOpacity={0.85} onPress={() => navigation.navigate("EditPatientProfile")} accessibilityLabel={screenReaderHintsEnabled ? t("profile.title") : undefined}>
            <Pencil size={20} color={primaryColor} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(130, insets.bottom + 120) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadProfile("refresh")} tintColor={primaryColor} colors={[primaryColor]} />}
        >
          {isLoading ? (
            <View style={[styles.loadingCard, { backgroundColor: surfaceColor }]}>
              <ActivityIndicator color={primaryColor} />
              <Text style={[styles.loadingText, { color: mutedColor, fontSize: scaleFont(14) }]}>{t("profile.loading")}</Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIconCircle}><AlertCircle size={22} color={DANGER} strokeWidth={2.6} /></View>
              <View style={styles.errorTextBlock}>
                <Text style={[styles.errorTitle, { fontSize: scaleFont(15) }]}>{t("profile.unavailable")}</Text>
                <Text style={[styles.errorText, { fontSize: scaleFont(13) }]}>{errorMessage}</Text>
                <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => void loadProfile("initial")}>
                  <RefreshCw size={16} color={SURFACE} strokeWidth={2.5} />
                  <Text style={[styles.retryButtonText, { fontSize: scaleFont(12) }]}>{t("common.tryAgain")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <View style={[styles.profileCard, { backgroundColor: surfaceColor }]}>
                <View style={[styles.avatarCircle, { backgroundColor: primaryColor }]}><Text style={[styles.avatarText, { fontSize: scaleFont(22) }]}>{initials}</Text></View>

                <View style={styles.profileTextBlock}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.profileName, { color: textColor, fontSize: scaleFont(20) }]} numberOfLines={1}>{fullName}</Text>

                    {profile?.isEmailVerified ? (
                      <View style={styles.verifiedBadge}>
                        <CheckCircle2 size={13} color={SUCCESS_DARK} strokeWidth={2.6} />
                        <Text style={[styles.verifiedText, { fontSize: scaleFont(9) }]}>{t("common.verified")}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[styles.profileRole, { color: primaryColor, fontSize: scaleFont(12) }]}>{t("common.patient")}</Text>

                  <View style={styles.contactRow}>
                    <Mail size={15} color={mutedColor} strokeWidth={2.3} />
                    <Text style={[styles.contactText, { color: mutedColor, fontSize: scaleFont(12) }]} numberOfLines={1}>{email}</Text>
                  </View>

                  <View style={styles.contactRow}>
                    <Phone size={15} color={mutedColor} strokeWidth={2.3} />
                    <Text style={[styles.contactText, { color: mutedColor, fontSize: scaleFont(12) }]} numberOfLines={1}>{getDisplayValue(phone, notAdded)}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.profileStatsCard, { backgroundColor: surfaceColor }]}>
                <ProfileStat value={String(assignedDoctors.length)} label={t("profile.doctors")} textColor={textColor} mutedColor={mutedColor} scaleFont={scaleFont} />
                <View style={[styles.profileStatDivider, { backgroundColor: palette.border }]} />
                <ProfileStat value={String(specialistCount)} label={t("profile.specialists")} textColor={textColor} mutedColor={mutedColor} scaleFont={scaleFont} />
                <View style={[styles.profileStatDivider, { backgroundColor: palette.border }]} />
                <ProfileStat value={`${profileCompletion}%`} label={t("profile.complete")} textColor={textColor} mutedColor={mutedColor} scaleFont={scaleFont} />
              </View>

              <TouchableOpacity style={[styles.completionCard, { backgroundColor: surfaceColor }]} activeOpacity={0.86} onPress={() => navigation.navigate("EditPatientProfile")}>
                <View style={styles.completionHeader}>
                  <View style={[styles.completionIcon, { backgroundColor: primaryLightColor }]}><HeartPulse size={23} color={primaryColor} strokeWidth={2.6} /></View>

                  <View style={styles.completionTextBlock}>
                    <Text style={[styles.completionTitle, { color: textColor, fontSize: scaleFont(15) }]}>
                      {profileCompletion === 100 ? t("profile.healthCompleteTitle") : t("profile.healthIncompleteTitle")}
                    </Text>
                    <Text style={[styles.completionText, { color: mutedColor, fontSize: scaleFont(11) }]}>
                      {profileCompletion === 100 ? t("profile.healthCompleteText") : t("profile.healthIncompleteText")}
                    </Text>
                  </View>

                  <ChevronRight size={20} color={primaryColor} strokeWidth={2.5} />
                </View>

                <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
                  <View style={[styles.progressFill, { width: `${profileCompletion}%`, backgroundColor: primaryColor }]} />
                </View>
              </TouchableOpacity>

              <ProfileSection title="Care & services" surfaceColor={surfaceColor} textColor={textColor} scaleFont={scaleFont}>
                <ProfileRow
                  icon={<Stethoscope size={20} color={primaryColor} strokeWidth={2.5} />}
                  title={t("profile.assignedDoctors")}
                  value={assignedDoctorsText}
                  onPress={() => navigation.navigate("SelectDoctor")}
                  textColor={textColor}
                  mutedColor={mutedColor}
                  borderColor={palette.border}
                  primaryLightColor={primaryLightColor}
                  scaleFont={scaleFont}
                />

                <ProfileRow
                  icon={<Crown size={20} color={WARNING} strokeWidth={2.5} />}
                  title={t("profile.primaryDoctor")}
                  value={primaryDoctor ? formatDoctorName(primaryDoctor.doctor.fullName) : t("common.notAssigned")}
                  onPress={() => navigation.navigate("SelectDoctor")}
                  textColor={textColor}
                  mutedColor={mutedColor}
                  borderColor={palette.border}
                  primaryLightColor={WARNING_LIGHT}
                  scaleFont={scaleFont}
                />

                <ProfileRow
                  icon={<Building2 size={20} color={primaryColor} strokeWidth={2.5} />}
                  title={pharmacyCopy.title}
                  value={pharmacyCopy.value}
                  onPress={() => navigation.navigate("MyPharmacies")}
                  textColor={textColor}
                  mutedColor={mutedColor}
                  borderColor={palette.border}
                  primaryLightColor={primaryLightColor}
                  scaleFont={scaleFont}
                />

                <ProfileRow
                  icon={<Users size={20} color={WARNING} strokeWidth={2.5} />}
                  title={t("profile.caregiver")}
                  value={linkedUsers.caregiver ? linkedUsers.caregiver.fullName : t("common.notLinkedYet")}
                  onPress={() => navigation.navigate("PatientCaregiverAccess")}
                  textColor={textColor}
                  mutedColor={mutedColor}
                  borderColor={palette.border}
                  primaryLightColor={WARNING_LIGHT}
                  scaleFont={scaleFont}
                />

                <ProfileRow
                  icon={<CreditCard size={20} color={primaryColor} strokeWidth={2.5} />}
                  title={prescriptionPaymentCopy.title}
                  value={prescriptionPaymentCopy.value}
                  onPress={() => navigation.navigate("PrescriptionPaymentSettings")}
                  textColor={textColor}
                  mutedColor={mutedColor}
                  borderColor={palette.border}
                  primaryLightColor={primaryLightColor}
                  scaleFont={scaleFont}
                  isLast
                />
              </ProfileSection>

              <View style={styles.accountStatusPanel}>
                <View style={styles.statusIconCircle}><CheckCircle2 size={21} color={SUCCESS} strokeWidth={2.6} /></View>
                <View style={styles.statusTextBlock}>
                  <Text style={[styles.statusTitle, { fontSize: scaleFont(13) }]}>{t("profile.accountStatus")}</Text>
                  <Text style={[styles.statusText, { fontSize: scaleFont(12) }]}>{accountStatus}</Text>
                </View>
              </View>

              <ProfileSection title={t("profile.personalDetails")} surfaceColor={surfaceColor} textColor={textColor} scaleFont={scaleFont}>
                <ProfileRow icon={<Calendar size={20} color={primaryColor} strokeWidth={2.5} />} title={t("profile.dateOfBirth")} value={getDisplayValue(profile?.dateOfBirth, notAdded)} onPress={() => navigation.navigate("EditPatientProfile")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} primaryLightColor={primaryLightColor} scaleFont={scaleFont} />
                <ProfileRow icon={<UserRound size={20} color={primaryColor} strokeWidth={2.5} />} title={t("profile.gender")} value={getDisplayValue(profile?.gender, notAdded)} onPress={() => navigation.navigate("EditPatientProfile")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} primaryLightColor={primaryLightColor} scaleFont={scaleFont} />
                <ProfileRow icon={<Phone size={20} color={primaryColor} strokeWidth={2.5} />} title={t("profile.emergencyContact")} value={emergencyContact} onPress={() => navigation.navigate("EditPatientProfile")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} primaryLightColor={primaryLightColor} scaleFont={scaleFont} isLast />
              </ProfileSection>

              <ProfileSection title={t("profile.healthProfile")} surfaceColor={surfaceColor} textColor={textColor} scaleFont={scaleFont}>
                <ProfileRow icon={<Hash size={20} color={primaryColor} strokeWidth={2.5} />} title={t("profile.healthRecordNumber")} value={getDisplayValue(profile?.healthRecordNumber, notAdded)} onPress={() => navigation.navigate("EditPatientProfile")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} primaryLightColor={primaryLightColor} scaleFont={scaleFont} />
                <ProfileRow icon={<Droplet size={20} color={primaryColor} strokeWidth={2.5} />} title={t("profile.bloodGroup")} value={getDisplayValue(profile?.bloodGroup, notAdded)} onPress={() => navigation.navigate("EditPatientProfile")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} primaryLightColor={primaryLightColor} scaleFont={scaleFont} />
                <ProfileRow icon={<HeartPulse size={20} color={primaryColor} strokeWidth={2.5} />} title={t("profile.medicalConditions")} value={formatMedicalConditions(profile?.medicalConditions, notAdded)} onPress={() => navigation.navigate("EditPatientProfile")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} primaryLightColor={primaryLightColor} scaleFont={scaleFont} />
                <ProfileRow icon={<AlertCircle size={20} color={primaryColor} strokeWidth={2.5} />} title={t("profile.allergies")} value={getDisplayValue(profile?.allergies, notAdded)} onPress={() => navigation.navigate("EditPatientProfile")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} primaryLightColor={primaryLightColor} scaleFont={scaleFont} />
                <ProfileRow icon={<MapPin size={20} color={primaryColor} strokeWidth={2.5} />} title={t("profile.address")} value={address} onPress={() => navigation.navigate("EditPatientProfile")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} primaryLightColor={primaryLightColor} scaleFont={scaleFont} isLast />
              </ProfileSection>

              <ProfileSection title={t("profile.settings")} surfaceColor={surfaceColor} textColor={textColor} scaleFont={scaleFont}>
                <ProfileRow icon={<Bell size={20} color={primaryColor} strokeWidth={2.5} />} title={t("profile.notifications")} value={t("profile.notificationsValue")} onPress={() => navigation.navigate("NotificationPreferences")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} primaryLightColor={primaryLightColor} scaleFont={scaleFont} />
                <ProfileRow icon={<Clock size={20} color={primaryColor} strokeWidth={2.5} />} title={t("profile.reminders")} value={t("profile.remindersValue")} onPress={() => navigation.navigate("ReminderSettings")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} primaryLightColor={primaryLightColor} scaleFont={scaleFont} />
                <ProfileRow icon={<ShieldAlert size={20} color={primaryColor} strokeWidth={2.5} />} title={t("profile.safety")} value={t("profile.safetyValue")} onPress={() => navigation.navigate("SafetyResponseSettings")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} primaryLightColor={primaryLightColor} scaleFont={scaleFont} />
                <ProfileRow icon={<Languages size={20} color={primaryColor} strokeWidth={2.5} />} title={t("profile.language")} value={t("profile.languageValue")} onPress={() => navigation.navigate("LanguageAccessibility")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} primaryLightColor={primaryLightColor} scaleFont={scaleFont} />
                <ProfileRow icon={<Lock size={20} color={primaryColor} strokeWidth={2.5} />} title={t("profile.privacy")} value={t("profile.privacyValue")} onPress={() => navigation.navigate("PrivacySecurity")} textColor={textColor} mutedColor={mutedColor} borderColor={palette.border} primaryLightColor={primaryLightColor} scaleFont={scaleFont} isLast />
              </ProfileSection>

              <TouchableOpacity style={[styles.logoutButton, { backgroundColor: surfaceColor }]} activeOpacity={0.86} onPress={handleLogout}>
                <LogOut size={19} color={DANGER} strokeWidth={2.6} />
                <Text style={[styles.logoutText, { fontSize: scaleFont(15) }]}>{t("common.logout")}</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const ProfileStat = ({ value, label, textColor, mutedColor, scaleFont }: { value: string; label: string; textColor: string; mutedColor: string; scaleFont: (size: number) => number }) => (
  <View style={styles.profileStat}>
    <Text style={[styles.profileStatValue, { color: textColor, fontSize: scaleFont(18) }]}>{value}</Text>
    <Text style={[styles.profileStatLabel, { color: mutedColor, fontSize: scaleFont(10) }]}>{label}</Text>
  </View>
);

const ProfileSection = ({ title, children, surfaceColor, textColor, scaleFont }: { title: string; children: ReactNode; surfaceColor: string; textColor: string; scaleFont: (size: number) => number }) => (
  <View style={[styles.sectionCard, { backgroundColor: surfaceColor }]}>
    <Text style={[styles.sectionTitle, { color: textColor, fontSize: scaleFont(16) }]}>{title}</Text>
    {children}
  </View>
);

const ProfileRow = ({ icon, title, value, onPress, isLast, textColor, mutedColor, borderColor, primaryLightColor, scaleFont }: {
  icon: ReactNode;
  title: string;
  value: string;
  onPress: () => void;
  isLast?: boolean;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  primaryLightColor: string;
  scaleFont: (size: number) => number;
}) => (
  <TouchableOpacity style={[styles.profileRow, { borderBottomColor: borderColor }, isLast ? styles.profileRowLast : undefined]} activeOpacity={0.82} onPress={onPress}>
    <View style={[styles.rowIconCircle, { backgroundColor: primaryLightColor }]}>{icon}</View>
    <View style={styles.rowTextBlock}>
      <Text style={[styles.rowTitle, { color: textColor, fontSize: scaleFont(14) }]}>{title}</Text>
      <Text style={[styles.rowValue, { color: mutedColor, fontSize: scaleFont(12) }]} numberOfLines={1}>{value}</Text>
    </View>
    <ChevronRight size={19} color="#B7C1D4" strokeWidth={2.4} />
  </TouchableOpacity>
);

export default PatientProfileScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, backgroundColor: BACKGROUND },
  appBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  backButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 13, overflow: "hidden", ...elevate(1) },
  appBarTextBlock: { flex: 1 },
  appBarTitle: { color: TEXT, fontSize: 26, fontWeight: "700", letterSpacing: -0.4 },
  appBarSubtitle: { color: MUTED, fontSize: 13, fontWeight: "500", marginTop: 3 },
  editHeaderButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginLeft: 10, overflow: "hidden", ...elevate(1) },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  loadingCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 22, alignItems: "center", marginBottom: 16, ...elevate(1) },
  loadingText: { color: MUTED, fontSize: 14, fontWeight: "600", marginTop: 10 },
  errorCard: { backgroundColor: DANGER_LIGHT, borderRadius: 16, padding: 15, marginBottom: 16, flexDirection: "row", alignItems: "flex-start" },
  errorIconCircle: { width: 42, height: 42, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  errorTextBlock: { flex: 1 },
  errorTitle: { color: DANGER_DARK, fontSize: 15, fontWeight: "700", marginBottom: 5 },
  errorText: { color: DANGER_DARK, fontSize: 13, fontWeight: "500", lineHeight: 19 },
  retryButton: { marginTop: 12, alignSelf: "flex-start", backgroundColor: DANGER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  retryButtonText: { color: SURFACE, fontSize: 12, fontWeight: "700", marginLeft: 6 },
  profileCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 17, flexDirection: "row", alignItems: "center", marginBottom: 12, ...elevate(1) },
  avatarCircle: { width: 68, height: 68, borderRadius: 18, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatarText: { color: SURFACE, fontSize: 22, fontWeight: "700" },
  profileTextBlock: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  profileName: { color: TEXT, fontSize: 20, fontWeight: "700", marginRight: 8, maxWidth: "72%" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", backgroundColor: SUCCESS_LIGHT, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  verifiedText: { color: SUCCESS_DARK, fontSize: 9, fontWeight: "700", marginLeft: 4 },
  profileRole: { color: PRIMARY_DARK, fontSize: 12, fontWeight: "700", marginTop: 3, marginBottom: 8 },
  contactRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  contactText: { color: MUTED, fontSize: 12, fontWeight: "500", marginLeft: 7, flex: 1 },
  profileStatsCard: { backgroundColor: SURFACE, borderRadius: 16, paddingVertical: 13, flexDirection: "row", alignItems: "center", marginBottom: 12, ...elevate(1) },
  profileStat: { flex: 1, alignItems: "center" },
  profileStatValue: { color: TEXT, fontSize: 18, fontWeight: "700" },
  profileStatLabel: { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 3 },
  profileStatDivider: { width: 1, height: 34, backgroundColor: BORDER },
  completionCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 15, marginBottom: 12, overflow: "hidden", ...elevate(1) },
  completionHeader: { flexDirection: "row", alignItems: "center" },
  completionIcon: { width: 47, height: 47, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 11 },
  completionTextBlock: { flex: 1, paddingRight: 8 },
  completionTitle: { color: TEXT, fontSize: 15, fontWeight: "700" },
  completionText: { color: MUTED, fontSize: 11, fontWeight: "500", lineHeight: 17, marginTop: 4 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: BORDER, overflow: "hidden", marginTop: 13 },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: PRIMARY },
  accountStatusPanel: { backgroundColor: SUCCESS_LIGHT, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  statusIconCircle: { width: 40, height: 40, borderRadius: 13, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 11 },
  statusTextBlock: { flex: 1 },
  statusTitle: { color: SUCCESS_DARK, fontSize: 13, fontWeight: "700" },
  statusText: { color: SUCCESS_DARK, fontSize: 12, fontWeight: "500", marginTop: 3 },
  sectionCard: { backgroundColor: SURFACE, borderRadius: 16, paddingTop: 16, paddingHorizontal: 16, marginBottom: 12, ...elevate(1) },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "700", marginBottom: 8 },
  profileRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  profileRowLast: { borderBottomWidth: 0 },
  rowIconCircle: { width: 40, height: 40, borderRadius: 13, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowTextBlock: { flex: 1, paddingRight: 10 },
  rowTitle: { color: TEXT, fontSize: 14, fontWeight: "700", marginBottom: 3 },
  rowValue: { color: MUTED, fontSize: 12, fontWeight: "500" },
  logoutButton: { backgroundColor: SURFACE, borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 2, overflow: "hidden", ...elevate(1) },
  logoutText: { color: DANGER, fontSize: 15, fontWeight: "700", marginLeft: 8 },
});