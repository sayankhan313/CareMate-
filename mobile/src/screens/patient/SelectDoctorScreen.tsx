import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  Crown,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedTextInput as TextInput } from "../../components/common/LocalizedTextInput";
import { LocalizedAlert as Alert } from "../../utils/localizedAlert";

import {
  doctorAssignmentApi,
  type ApprovedDoctor,
  type AssignedDoctor,
  type DoctorSpecialty,
} from "../../services/doctorAssignmentApi";
import { tokenStorage } from "../../services/tokenStorage";
import type { RootStackParamList } from "../../types/navigation";

type SelectDoctorScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "SelectDoctor"
>;

type DoctorActionType = "ASSIGN" | "PRIMARY" | "REMOVE";

type ActiveDoctorAction = {
  doctorId: string;
  type: DoctorActionType;
} | null;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#3F6FD0";
const PRIMARY_LIGHT = "#EEF4FF";

const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";

const WARNING = "#F6A545";
const WARNING_DARK = "#A45A08";
const WARNING_LIGHT = "#FFF3E2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const ALL_SPECIALTIES = "ALL";

const elevate = (level: 1 | 2 = 1) => ({
  elevation: level === 1 ? 2 : 4,
  shadowColor: "#172033",
  shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
  shadowRadius: level === 1 ? 4 : 8,
  shadowOffset: {
    width: 0,
    height: level === 1 ? 2 : 4,
  },
});

const formatDoctorName = (fullName: string) => {
  if (/^dr\.?\s/i.test(fullName.trim())) {
    return fullName.trim();
  }

  return `Dr. ${fullName.trim()}`;
};

const getExperienceText = (yearsExperience: number | null) => {
  if (yearsExperience === null) {
    return null;
  }

  if (yearsExperience === 1) {
    return "1 year experience";
  }

  return `${yearsExperience} years experience`;
};

const isAuthenticationError = (message: string) => {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("session has expired") ||
    normalizedMessage.includes("authentication required") ||
    normalizedMessage.includes("invalid token") ||
    normalizedMessage.includes("unauthorized")
  );
};

export const SelectDoctorScreen = ({
  navigation,
}: SelectDoctorScreenProps) => {
  const [specialties, setSpecialties] = useState<DoctorSpecialty[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] =
    useState(ALL_SPECIALTIES);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [doctors, setDoctors] = useState<ApprovedDoctor[]>([]);
  const [assignedDoctors, setAssignedDoctors] = useState<AssignedDoctor[]>([]);
  const [primaryDoctorId, setPrimaryDoctorId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeAction, setActiveAction] =
    useState<ActiveDoctorAction>(null);

  const resetToLogin = useCallback(async () => {
    await tokenStorage.removeToken();

    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  }, [navigation]);

  const handleAuthenticationError = useCallback(
    async (message: string) => {
      if (!isAuthenticationError(message)) {
        return false;
      }

      await resetToLogin();
      return true;
    },
    [resetToLogin]
  );

  const loadScreenData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        setErrorMessage("");

        const specialization =
          selectedSpecialty === ALL_SPECIALTIES
            ? undefined
            : selectedSpecialty;

        const [specialtiesData, assignedData, approvedData] =
          await Promise.all([
            doctorAssignmentApi.getSpecialties(),
            doctorAssignmentApi.getAssignedDoctors(),
            doctorAssignmentApi.getApprovedDoctors({
              specialization,
              search: appliedSearch || undefined,
              limit: 50,
            }),
          ]);

        setSpecialties(specialtiesData.specialties || []);
        setAssignedDoctors(assignedData.doctors || []);
        setPrimaryDoctorId(
          assignedData.primaryDoctorId ||
            approvedData.primaryDoctorId ||
            null
        );
        setDoctors(approvedData.doctors || []);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load approved doctors.";

        const authenticationHandled =
          await handleAuthenticationError(message);

        if (!authenticationHandled) {
          setErrorMessage(message);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [appliedSearch, handleAuthenticationError, selectedSpecialty]
  );

  const reloadAssignmentData = useCallback(async () => {
    const specialization =
      selectedSpecialty === ALL_SPECIALTIES
        ? undefined
        : selectedSpecialty;

    const [assignedData, approvedData] = await Promise.all([
      doctorAssignmentApi.getAssignedDoctors(),
      doctorAssignmentApi.getApprovedDoctors({
        specialization,
        search: appliedSearch || undefined,
        limit: 50,
      }),
    ]);

    setAssignedDoctors(assignedData.doctors || []);
    setPrimaryDoctorId(
      assignedData.primaryDoctorId ||
        approvedData.primaryDoctorId ||
        null
    );
    setDoctors(approvedData.doctors || []);
  }, [appliedSearch, selectedSpecialty]);

  useFocusEffect(
    useCallback(() => {
      void loadScreenData("initial");
    }, [loadScreenData])
  );

  const assignedDoctorIds = useMemo(() => {
    return new Set(
      assignedDoctors.map((assignment) => assignment.doctor.id)
    );
  }, [assignedDoctors]);

  const availableDoctors = useMemo(() => {
    return doctors.filter((doctor) => !assignedDoctorIds.has(doctor.id));
  }, [assignedDoctorIds, doctors]);

  const selectedSpecialtyLabel =
    selectedSpecialty === ALL_SPECIALTIES
      ? "All specialities"
      : selectedSpecialty;

  const availableDoctorText = useMemo(() => {
    if (availableDoctors.length === 1) {
      return "1 available doctor";
    }

    return `${availableDoctors.length} available doctors`;
  }, [availableDoctors.length]);

  const handleSearch = () => {
    setAppliedSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
  };

  const selectSpecialty = (specialty: string) => {
    if (activeAction) {
      return;
    }

    setSelectedSpecialty(specialty);
  };

  const assignDoctor = async (doctor: ApprovedDoctor) => {
    if (activeAction || assignedDoctorIds.has(doctor.id)) {
      return;
    }

    try {
      setActiveAction({
        doctorId: doctor.id,
        type: "ASSIGN",
      });

      const result = await doctorAssignmentApi.assignDoctor(
        doctor.id,
        assignedDoctors.length === 0
      );

      await reloadAssignmentData();

      const assignmentLabel =
        result.assignment.assignmentType === "PRIMARY"
          ? "Primary doctor"
          : "Specialist doctor";

      Alert.alert(
        "Doctor assigned",
        `${formatDoctorName(
          doctor.fullName
        )} has been added as your ${assignmentLabel.toLowerCase()}.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to assign this doctor.";

      const authenticationHandled =
        await handleAuthenticationError(message);

      if (!authenticationHandled) {
        Alert.alert("Unable to assign doctor", message);
      }
    } finally {
      setActiveAction(null);
    }
  };

  const setPrimaryDoctor = async (assignment: AssignedDoctor) => {
    if (activeAction || assignment.assignmentType === "PRIMARY") {
      return;
    }

    try {
      setActiveAction({
        doctorId: assignment.doctor.id,
        type: "PRIMARY",
      });

      await doctorAssignmentApi.setPrimaryDoctor(assignment.doctor.id);
      await reloadAssignmentData();

      Alert.alert(
        "Primary doctor updated",
        `${formatDoctorName(
          assignment.doctor.fullName
        )} is now your primary doctor.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update your primary doctor.";

      const authenticationHandled =
        await handleAuthenticationError(message);

      if (!authenticationHandled) {
        Alert.alert("Unable to update primary doctor", message);
      }
    } finally {
      setActiveAction(null);
    }
  };

  const confirmRemoveDoctor = (assignment: AssignedDoctor) => {
    if (activeAction) {
      return;
    }

    const isPrimary = assignment.assignmentType === "PRIMARY";

    const message = isPrimary
      ? `Remove ${formatDoctorName(
          assignment.doctor.fullName
        )}? Another assigned doctor will automatically become your primary doctor when available.`
      : `Remove ${formatDoctorName(
          assignment.doctor.fullName
        )} from your care team?`;

    Alert.alert("Remove doctor", message, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void removeDoctor(assignment);
        },
      },
    ]);
  };

  const removeDoctor = async (assignment: AssignedDoctor) => {
    try {
      setActiveAction({
        doctorId: assignment.doctor.id,
        type: "REMOVE",
      });

      await doctorAssignmentApi.removeDoctor(assignment.doctor.id);
      await reloadAssignmentData();

      Alert.alert(
        "Doctor removed",
        `${formatDoctorName(
          assignment.doctor.fullName
        )} has been removed from your care team.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to remove this doctor.";

      const authenticationHandled =
        await handleAuthenticationError(message);

      if (!authenticationHandled) {
        Alert.alert("Unable to remove doctor", message);
      }
    } finally {
      setActiveAction(null);
    }
  };

  const renderAssignedDoctor = (assignment: AssignedDoctor) => {
    const doctor = assignment.doctor;
    const isPrimary = assignment.assignmentType === "PRIMARY";

    const isSettingPrimary =
      activeAction?.doctorId === doctor.id &&
      activeAction.type === "PRIMARY";

    const isRemoving =
      activeAction?.doctorId === doctor.id &&
      activeAction.type === "REMOVE";

    const experienceText = getExperienceText(doctor.yearsExperience);

    return (
      <View key={assignment.assignmentId} style={styles.assignedCard}>
        <View style={styles.doctorHeader}>
          <View
            style={[
              styles.doctorIcon,
              isPrimary
                ? styles.primaryDoctorIcon
                : styles.specialistDoctorIcon,
            ]}
          >
            {isPrimary ? (
              <Crown
                size={22}
                color={WARNING_DARK}
                strokeWidth={2.4}
              />
            ) : (
              <Stethoscope
                size={22}
                color={PRIMARY_DARK}
                strokeWidth={2.4}
              />
            )}
          </View>

          <View style={styles.doctorHeading}>
            <Text style={styles.doctorName} numberOfLines={1}>
              {formatDoctorName(doctor.fullName)}
            </Text>

            {doctor.specialization ? (
              <Text
                style={styles.doctorSpecialization}
                numberOfLines={1}
              >
                {doctor.specialization}
              </Text>
            ) : (
              <Text style={styles.missingDetailText}>
                Specialisation not provided
              </Text>
            )}
          </View>

          <View
            style={[
              styles.assignmentBadge,
              isPrimary
                ? styles.primaryBadge
                : styles.specialistBadge,
            ]}
          >
            {isPrimary ? (
              <Crown
                size={13}
                color={WARNING_DARK}
                strokeWidth={2.4}
              />
            ) : (
              <ShieldCheck
                size={13}
                color={PRIMARY_DARK}
                strokeWidth={2.4}
              />
            )}

            <Text
              style={[
                styles.assignmentBadgeText,
                isPrimary
                  ? styles.primaryBadgeText
                  : styles.specialistBadgeText,
              ]}
            >
              {isPrimary ? "Primary" : "Specialist"}
            </Text>
          </View>
        </View>

        <View style={styles.doctorInfoPanel}>
          {doctor.clinicName ? (
            <View style={styles.detailRow}>
              <Building2 size={15} color={MUTED} strokeWidth={2.3} />
              <Text style={styles.detailText} numberOfLines={1}>
                {doctor.clinicName}
              </Text>
            </View>
          ) : null}

          {doctor.clinicAddress ? (
            <View style={styles.detailRow}>
              <MapPin size={15} color={MUTED} strokeWidth={2.3} />
              <Text style={styles.detailText} numberOfLines={2}>
                {doctor.clinicAddress}
              </Text>
            </View>
          ) : null}

          {experienceText ? (
            <View style={styles.detailRow}>
              <BadgeCheck size={15} color={MUTED} strokeWidth={2.3} />
              <Text style={styles.detailText}>{experienceText}</Text>
            </View>
          ) : null}

          {!doctor.clinicName &&
          !doctor.clinicAddress &&
          !experienceText ? (
            <Text style={styles.profileEmptyText}>
              Additional professional details are not available.
            </Text>
          ) : null}
        </View>

        <View style={styles.assignedActions}>
          {!isPrimary ? (
            <TouchableOpacity
              style={styles.primaryActionButton}
              activeOpacity={0.86}
              disabled={Boolean(activeAction)}
              onPress={() => setPrimaryDoctor(assignment)}
            >
              {isSettingPrimary ? (
                <ActivityIndicator size="small" color={PRIMARY_DARK} />
              ) : (
                <>
                  <Crown
                    size={16}
                    color={PRIMARY_DARK}
                    strokeWidth={2.4}
                  />
                  <Text style={styles.primaryActionText}>
                    Set as primary
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.currentPrimaryPanel}>
              <Check
                size={16}
                color={SUCCESS_DARK}
                strokeWidth={2.6}
              />
              <Text style={styles.currentPrimaryText}>
                Current primary doctor
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.removeButton}
            activeOpacity={0.86}
            disabled={Boolean(activeAction)}
            onPress={() => confirmRemoveDoctor(assignment)}
          >
            {isRemoving ? (
              <ActivityIndicator size="small" color={DANGER_DARK} />
            ) : (
              <Trash2
                size={18}
                color={DANGER_DARK}
                strokeWidth={2.3}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAvailableDoctor = (doctor: ApprovedDoctor) => {
    const isAssigning =
      activeAction?.doctorId === doctor.id &&
      activeAction.type === "ASSIGN";

    const experienceText = getExperienceText(doctor.yearsExperience);

    return (
      <View key={doctor.id} style={styles.availableDoctorCard}>
        <View style={styles.doctorHeader}>
          <View style={styles.availableDoctorIcon}>
            <Stethoscope size={22} color={PRIMARY} strokeWidth={2.5} />
          </View>

          <View style={styles.doctorHeading}>
            <Text style={styles.availableDoctorName} numberOfLines={1}>
              {formatDoctorName(doctor.fullName)}
            </Text>

            {doctor.specialization ? (
              <Text
                style={styles.doctorSpecialization}
                numberOfLines={1}
              >
                {doctor.specialization}
              </Text>
            ) : (
              <Text style={styles.missingDetailText}>
                Specialisation not provided
              </Text>
            )}
          </View>

          <View style={styles.verifiedDoctorBadge}>
            <BadgeCheck
              size={13}
              color={SUCCESS_DARK}
              strokeWidth={2.5}
            />
            <Text style={styles.verifiedDoctorText}>Verified</Text>
          </View>
        </View>

        {doctor.clinicName ||
        doctor.clinicAddress ||
        experienceText ? (
          <View style={styles.doctorInfoPanel}>
            {doctor.clinicName ? (
              <View style={styles.detailRow}>
                <Building2 size={15} color={MUTED} strokeWidth={2.2} />
                <Text style={styles.detailText} numberOfLines={1}>
                  {doctor.clinicName}
                </Text>
              </View>
            ) : null}

            {doctor.clinicAddress ? (
              <View style={styles.detailRow}>
                <MapPin size={15} color={MUTED} strokeWidth={2.2} />
                <Text style={styles.detailText} numberOfLines={2}>
                  {doctor.clinicAddress}
                </Text>
              </View>
            ) : null}

            {experienceText ? (
              <View style={styles.detailRow}>
                <BadgeCheck size={15} color={MUTED} strokeWidth={2.2} />
                <Text style={styles.detailText}>{experienceText}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {doctor.bio ? (
          <Text style={styles.doctorBio} numberOfLines={3}>
            {doctor.bio}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.assignButton,
            activeAction ? styles.disabledButton : undefined,
          ]}
          activeOpacity={0.88}
          disabled={Boolean(activeAction)}
          onPress={() => assignDoctor(doctor)}
        >
          {isAssigning ? (
            <ActivityIndicator color={SURFACE} />
          ) : (
            <>
              <UserPlus
                size={17}
                color={SURFACE}
                strokeWidth={2.5}
              />
              <Text style={styles.assignButtonText}>
                Add to my doctors
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >
      <StatusBar
        backgroundColor={BACKGROUND}
        barStyle="dark-content"
      />

      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={21} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>My Doctors</Text>
          <Text style={styles.subtitle}>
            Manage your verified care team
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <UsersRound size={21} color={PRIMARY} strokeWidth={2.5} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadScreenData("refresh")}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={styles.stateText}>
              Loading verified doctors...
            </Text>
          </View>
        ) : null}

        {!isLoading && errorMessage ? (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Stethoscope
                size={24}
                color={DANGER_DARK}
                strokeWidth={2.5}
              />
            </View>

            <Text style={styles.errorTitle}>
              Unable to load doctors
            </Text>

            <Text style={styles.errorText}>{errorMessage}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.86}
              onPress={() => loadScreenData("initial")}
            >
              <RefreshCw
                size={16}
                color={SURFACE}
                strokeWidth={2.5}
              />
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!isLoading && !errorMessage ? (
          <>
            <View style={styles.networkCard}>
              <View style={styles.networkHeader}>
                <View style={styles.networkIcon}>
                  <ShieldCheck
                    size={24}
                    color={PRIMARY_DARK}
                    strokeWidth={2.5}
                  />
                </View>

                <View style={styles.networkTextBlock}>
                  <Text style={styles.networkTitle}>
                    Verified doctor network
                  </Text>
                  <Text style={styles.networkSubtitle}>
                    Every doctor is reviewed and approved before
                    appearing here.
                  </Text>
                </View>
              </View>

              <View style={styles.networkStats}>
                <View style={styles.networkStat}>
                  <Text style={styles.networkStatValue}>
                    {assignedDoctors.length}
                  </Text>
                  <Text style={styles.networkStatLabel}>Assigned</Text>
                </View>

                <View style={styles.networkDivider} />

                <View style={styles.networkStat}>
                  <Text style={styles.networkStatValue}>
                    {availableDoctors.length}
                  </Text>
                  <Text style={styles.networkStatLabel}>Available</Text>
                </View>

                <View style={styles.networkDivider} />

                <View style={styles.networkStat}>
                  <Text style={styles.networkStatValue}>
                    {specialties.length}
                  </Text>
                  <Text style={styles.networkStatLabel}>Specialities</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>My care team</Text>
                <Text style={styles.sectionSubtitle}>
                  One primary doctor and additional specialists
                </Text>
              </View>

              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>
                  {assignedDoctors.length}
                </Text>
              </View>
            </View>

            {assignedDoctors.length === 0 ? (
              <View style={styles.emptyAssignedCard}>
                <View style={styles.emptyAssignedIcon}>
                  <UsersRound
                    size={28}
                    color={PRIMARY}
                    strokeWidth={2.4}
                  />
                </View>

                <Text style={styles.emptyAssignedTitle}>
                  No doctors assigned
                </Text>

                <Text style={styles.emptyAssignedText}>
                  Add a verified doctor below. Your first doctor will
                  automatically become your primary doctor.
                </Text>
              </View>
            ) : (
              assignedDoctors.map(renderAssignedDoctor)
            )}

            <View style={styles.discoveryHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Find verified doctors
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Search by name, clinic or specialisation
                </Text>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchField}>
                <Search size={19} color={MUTED} strokeWidth={2.3} />

                <TextInput
                  value={searchInput}
                  onChangeText={setSearchInput}
                  placeholder="Search verified doctors"
                  placeholderTextColor="#9AA0B2"
                  style={styles.searchInput}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />

                {searchInput.length > 0 ? (
                  <TouchableOpacity
                    style={styles.clearSearchButton}
                    activeOpacity={0.8}
                    onPress={clearSearch}
                  >
                    <X size={17} color={MUTED} strokeWidth={2.5} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.searchButton}
                activeOpacity={0.86}
                onPress={handleSearch}
              >
                <Search
                  size={19}
                  color={SURFACE}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>Specialities</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.specialtyList}
            >
              <TouchableOpacity
                style={[
                  styles.specialtyChip,
                  selectedSpecialty === ALL_SPECIALTIES
                    ? styles.activeSpecialtyChip
                    : undefined,
                ]}
                activeOpacity={0.84}
                onPress={() => selectSpecialty(ALL_SPECIALTIES)}
              >
                <Text
                  style={[
                    styles.specialtyChipText,
                    selectedSpecialty === ALL_SPECIALTIES
                      ? styles.activeSpecialtyChipText
                      : undefined,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              {specialties.map((specialty) => {
                const isSelected =
                  selectedSpecialty === specialty.name;

                return (
                  <TouchableOpacity
                    key={specialty.name}
                    style={[
                      styles.specialtyChip,
                      isSelected
                        ? styles.activeSpecialtyChip
                        : undefined,
                    ]}
                    activeOpacity={0.84}
                    onPress={() => selectSpecialty(specialty.name)}
                  >
                    <Text
                      style={[
                        styles.specialtyChipText,
                        isSelected
                          ? styles.activeSpecialtyChipText
                          : undefined,
                      ]}
                    >
                      {specialty.name}
                    </Text>

                    <View
                      style={[
                        styles.specialtyCount,
                        isSelected
                          ? styles.activeSpecialtyCount
                          : undefined,
                      ]}
                    >
                      <Text
                        style={[
                          styles.specialtyCountText,
                          isSelected
                            ? styles.activeSpecialtyCountText
                            : undefined,
                        ]}
                      >
                        {specialty.doctorCount}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.resultsHeader}>
              <View>
                <Text style={styles.resultsTitle}>
                  {selectedSpecialtyLabel}
                </Text>

                <Text style={styles.resultsText}>
                  {availableDoctorText}
                  {appliedSearch
                    ? ` matching “${appliedSearch}”`
                    : ""}
                </Text>
              </View>

              {selectedSpecialty !== ALL_SPECIALTIES ||
              appliedSearch ? (
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  activeOpacity={0.84}
                  onPress={() => {
                    setSelectedSpecialty(ALL_SPECIALTIES);
                    setSearchInput("");
                    setAppliedSearch("");
                  }}
                >
                  <Text style={styles.clearFiltersText}>
                    Clear filters
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {availableDoctors.length === 0 ? (
              <View style={styles.noResultsCard}>
                <View style={styles.noResultsIcon}>
                  <BadgeCheck
                    size={27}
                    color={PRIMARY}
                    strokeWidth={2.4}
                  />
                </View>

                <Text style={styles.noResultsTitle}>
                  No available doctors
                </Text>

                <Text style={styles.noResultsText}>
                  No additional verified doctors match these filters,
                  or all matching doctors are already assigned.
                </Text>
              </View>
            ) : (
              availableDoctors.map(renderAvailableDoctor)
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  appBar: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
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
    marginRight: 12,
    ...elevate(1),
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 3,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  stateCard: {
    minHeight: 150,
    backgroundColor: SURFACE,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    ...elevate(1),
  },
  stateText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 11,
  },
  errorCard: {
    backgroundColor: DANGER_LIGHT,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  errorIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  errorTitle: {
    color: DANGER_DARK,
    fontSize: 17,
    fontWeight: "700",
  },
  errorText: {
    color: DANGER_DARK,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
  retryButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: DANGER,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  retryButtonText: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 7,
  },
  networkCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...elevate(1),
  },
  networkHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  networkIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  networkTextBlock: {
    flex: 1,
  },
  networkTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
  },
  networkSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 4,
  },
  networkStats: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    marginTop: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  networkStat: {
    flex: 1,
    alignItems: "center",
  },
  networkStatValue: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },
  networkStatLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },
  networkDivider: {
    width: 1,
    height: 34,
    backgroundColor: BORDER,
  },
  sectionHeader: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionCount: {
    minWidth: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  sectionCountText: {
    color: PRIMARY_DARK,
    fontSize: 13,
    fontWeight: "700",
  },
  discoveryHeader: {
    marginTop: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  emptyAssignedCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    marginBottom: 20,
    ...elevate(1),
  },
  emptyAssignedIcon: {
    width: 62,
    height: 62,
    borderRadius: 17,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyAssignedTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },
  emptyAssignedText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
  assignedCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    ...elevate(1),
  },
  availableDoctorCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    ...elevate(1),
  },
  doctorHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  primaryDoctorIcon: {
    backgroundColor: WARNING_LIGHT,
  },
  specialistDoctorIcon: {
    backgroundColor: PRIMARY_LIGHT,
  },
  availableDoctorIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  doctorHeading: {
    flex: 1,
    minWidth: 0,
  },
  doctorName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },
  availableDoctorName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },
  doctorSpecialization: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  missingDetailText: {
    color: "#9AA0B2",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },
  verifiedDoctorBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: SUCCESS_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  verifiedDoctorText: {
    color: SUCCESS_DARK,
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 4,
  },
  assignmentBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  primaryBadge: {
    backgroundColor: WARNING_LIGHT,
  },
  specialistBadge: {
    backgroundColor: PRIMARY_LIGHT,
  },
  assignmentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
  primaryBadgeText: {
    color: WARNING_DARK,
  },
  specialistBadgeText: {
    color: PRIMARY_DARK,
  },
  doctorInfoPanel: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 13,
    padding: 12,
    marginTop: 13,
    paddingBottom: 5,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 7,
  },
  detailText: {
    flex: 1,
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    marginLeft: 7,
  },
  profileEmptyText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
  doctorBio: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 12,
  },
  assignedActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },
  primaryActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  primaryActionText: {
    color: PRIMARY_DARK,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
  },
  currentPrimaryPanel: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: SUCCESS_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  currentPrimaryText: {
    color: SUCCESS_DARK,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
  },
  removeButton: {
    width: 46,
    height: 44,
    borderRadius: 12,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  assignButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },
  assignButtonText: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 7,
  },
  disabledButton: {
    opacity: 0.65,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  searchField: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    backgroundColor: SURFACE,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    ...elevate(1),
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 9,
    paddingVertical: 0,
  },
  clearSearchButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 9,
    ...elevate(1),
  },
  filterLabel: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 9,
  },
  specialtyList: {
    paddingRight: 18,
    paddingBottom: 4,
  },
  specialtyChip: {
    minHeight: 38,
    borderRadius: 11,
    backgroundColor: SURFACE,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  activeSpecialtyChip: {
    backgroundColor: PRIMARY,
  },
  specialtyChipText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },
  activeSpecialtyChipText: {
    color: SURFACE,
  },
  specialtyCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginLeft: 7,
  },
  activeSpecialtyCount: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  specialtyCountText: {
    color: PRIMARY_DARK,
    fontSize: 10,
    fontWeight: "700",
  },
  activeSpecialtyCountText: {
    color: SURFACE,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 17,
    marginBottom: 11,
  },
  resultsTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "700",
  },
  resultsText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },
  clearFiltersButton: {
    borderRadius: 9,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 10,
  },
  clearFiltersText: {
    color: PRIMARY_DARK,
    fontSize: 10,
    fontWeight: "700",
  },
  noResultsCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    ...elevate(1),
  },
  noResultsIcon: {
    width: 60,
    height: 60,
    borderRadius: 17,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  noResultsTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
  },
  noResultsText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
});