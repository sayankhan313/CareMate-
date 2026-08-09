import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  useFocusEffect,
  type CompositeScreenProps,
} from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, {
  Circle,
} from "react-native-svg";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Moon,
  Pill,
  Plus,
  RefreshCw,
  Sunrise,
  Sun,
  Trash2,
  X,
} from "lucide-react-native";

import { API_BASE_URL } from "../../constants/api";
import { useLanguage } from "../../context/LanguageContext";
import { patientMedicineReviewsApi } from "../../services/patientMedicineReviewsApi";
import { patientSettingsApi, type ReminderSettings } from "../../services/patientSettingsApi";
import { tokenStorage } from "../../services/tokenStorage";
import type {
  PatientTabParamList,
  RootStackParamList,
} from "../../types/navigation";

type MedicinesScreenProps =
  CompositeScreenProps<
    BottomTabScreenProps<
      PatientTabParamList,
      "Medicines"
    >,
    NativeStackScreenProps<RootStackParamList>
  >;

type MedicineStatus =
  | "PENDING"
  | "TAKEN"
  | "MISSED"
  | "SNOOZED";

type DateTab =
  | "TODAY"
  | "TOMORROW"
  | "WEEK";

type MedicinePeriod =
  | "Morning"
  | "Afternoon"
  | "Evening";

type ActionLoadingType =
  | "TAKEN"
  | "SNOOZE";

type TodayMedicine = {
  medicineId: string;
  reminderId: string;
  name: string;
  dose: string;
  instructions?: string | null;
  source: string;
  frequency: string;
  customFrequency?: string | null;
  timeOfDay: string;
  period: MedicinePeriod;
  scheduledFor?: string | null;
  scheduledDate?: string | null;
  reminderDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  date?: string | null;
  status: MedicineStatus;
  takenAt?: string | null;
  snoozedUntil?: string | null;
  deletionReviewPending?: boolean;
  pendingDeletionRequestId?: string | null;
};

type TodayMedicineSummary = {
  totalCount: number;
  takenCount: number;
  pendingCount: number;
  missedCount: number;
  snoozedCount: number;
  progressPercentage: number;
};

type TodayMedicineResponse = {
  summary: TodayMedicineSummary;
  medicines: TodayMedicine[];
};

type RemovalModalState = {
  medicineId: string;
  medicineName: string;
} | null;

const BACKGROUND = "#F2F3F8";
const SURFACE = "#FFFFFF";
const SURFACE_VARIANT = "#E7E9F2";
const SOFT_PANEL = "#F3F4FA";

const TEXT = "#1B1D2A";
const MUTED = "#5F6270";

const PRIMARY = "#4C6FE0";
const PRIMARY_CONTAINER = "#E1E7FF";
const ON_PRIMARY_CONTAINER = "#0C2A8C";

const SUCCESS = "#3A9D75";
const SUCCESS_CONTAINER = "#DBF3E7";
const ON_SUCCESS_CONTAINER = "#0F5C3C";

const WARNING = "#C77A1F";
const WARNING_CONTAINER = "#FBE7CD";
const ON_WARNING_CONTAINER = "#7A4708";

const DANGER = "#C6404A";
const DANGER_CONTAINER = "#FBDADC";
const ON_DANGER_CONTAINER = "#8C1D24";

const SECONDARY = "#6B59B5";
const SECONDARY_CONTAINER = "#E9E4F8";
const ON_SECONDARY_CONTAINER = "#4C3E87";

const DISABLED_CONTAINER = "#E5E7EC";
const DISABLED_TEXT = "#969AA5";

const SNOOZED_RING = "#A9B8F3";

const PROGRESS_RING_SIZE = 108;
const PROGRESS_RING_STROKE = 10;
const PROGRESS_RING_RADIUS = 43;
const PROGRESS_RING_CENTER =
  PROGRESS_RING_SIZE / 2;
const PROGRESS_RING_CIRCUMFERENCE =
  2 *
  Math.PI *
  PROGRESS_RING_RADIUS;

const elevate = (
  level: number
) => ({
  elevation: level,
  shadowColor: TEXT,
  shadowOpacity:
    Platform.OS === "android"
      ? 0
      : 0.08 + level * 0.01,
  shadowRadius:
    level * 1.6,
  shadowOffset: {
    width: 0,
    height: level * 0.8,
  },
});

const getDateKeyFromOffset = (
  offsetDays: number
) => {
  const date = new Date();

  date.setDate(
    date.getDate() +
      offsetDays
  );

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const normalizeDateKey = (
  dateValue?: string | null
) => {
  if (!dateValue) {
    return "";
  }

  const trimmedValue =
    String(dateValue).trim();

  if (
    /^\d{4}-\d{2}-\d{2}/.test(
      trimmedValue
    )
  ) {
    return trimmedValue.slice(
      0,
      10
    );
  }

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      trimmedValue
    )
  ) {
    const [
      day,
      month,
      year,
    ] =
      trimmedValue.split("/");

    return `${year}-${month}-${day}`;
  }

  const parsedDate =
    new Date(trimmedValue);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "";
  }

  const year =
    parsedDate.getFullYear();

  const month = String(
    parsedDate.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    parsedDate.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMedicineDateKey = (
  medicine: TodayMedicine
) => {
  return (
    normalizeDateKey(
      medicine.scheduledFor
    ) ||
    normalizeDateKey(
      medicine.scheduledDate
    ) ||
    normalizeDateKey(
      medicine.reminderDate
    ) ||
    normalizeDateKey(
      medicine.date
    ) ||
    normalizeDateKey(
      medicine.startDate
    )
  );
};

const getAllowedDateKeys = (
  selectedTab: DateTab
) => {
  if (
    selectedTab === "TODAY"
  ) {
    return [
      getDateKeyFromOffset(0),
    ];
  }

  if (
    selectedTab ===
    "TOMORROW"
  ) {
    return [
      getDateKeyFromOffset(1),
    ];
  }

  return [
    getDateKeyFromOffset(0),
    getDateKeyFromOffset(1),
    getDateKeyFromOffset(2),
    getDateKeyFromOffset(3),
    getDateKeyFromOffset(4),
    getDateKeyFromOffset(5),
    getDateKeyFromOffset(6),
  ];
};

const getTimeMinutes = (
  timeValue?: string | null
) => {
  if (!timeValue) {
    return Number.MAX_SAFE_INTEGER;
  }

  const match =
    /^(\d{1,2}):(\d{2})/.exec(
      timeValue.trim()
    );

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const hour = Number(
    match[1]
  );

  const minute = Number(
    match[2]
  );

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  return hour * 60 + minute;
};

const getDateSortValue = (
  medicine: TodayMedicine
) => {
  const dateKey =
    getMedicineDateKey(
      medicine
    );

  if (!dateKey) {
    return 0;
  }

  const parsedDate =
    new Date(
      `${dateKey}T00:00:00`
    );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return 0;
  }

  return parsedDate.getTime();
};

const sortMedicinesBySchedule = (
  medicines: TodayMedicine[]
) => {
  return medicines
    .map(
      (
        medicine,
        index
      ) => ({
        medicine,
        index,
      })
    )
    .sort(
      (
        first,
        second
      ) => {
        const dateDifference =
          getDateSortValue(
            first.medicine
          ) -
          getDateSortValue(
            second.medicine
          );

        if (
          dateDifference !== 0
        ) {
          return dateDifference;
        }

        const timeDifference =
          getTimeMinutes(
            first.medicine
              .timeOfDay
          ) -
          getTimeMinutes(
            second.medicine
              .timeOfDay
          );

        if (
          timeDifference !== 0
        ) {
          return timeDifference;
        }

        return (
          first.index -
          second.index
        );
      }
    )
    .map(
      (item) =>
        item.medicine
    );
};

const buildSummaryFromMedicines =
  (
    medicines: TodayMedicine[]
  ): TodayMedicineSummary => {
    const totalCount =
      medicines.length;

    const takenCount =
      medicines.filter(
        (medicine) =>
          medicine.status ===
          "TAKEN"
      ).length;

    const pendingCount =
      medicines.filter(
        (medicine) =>
          medicine.status ===
          "PENDING"
      ).length;

    const missedCount =
      medicines.filter(
        (medicine) =>
          medicine.status ===
          "MISSED"
      ).length;

    const snoozedCount =
      medicines.filter(
        (medicine) =>
          medicine.status ===
          "SNOOZED"
      ).length;

    const progressPercentage =
      totalCount === 0
        ? 0
        : Math.round(
            (takenCount /
              totalCount) *
              100
          );

    return {
      totalCount,
      takenCount,
      pendingCount,
      missedCount,
      snoozedCount,
      progressPercentage,
    };
  };

type Translate = ReturnType<typeof useLanguage>["t"];

const getFrequencyLabel = (frequency: string, t: Translate) => {
  if (frequency === "ONCE_DAILY") return t("medicines.onceDaily");
  if (frequency === "TWICE_DAILY") return t("medicines.twiceDaily");
  if (frequency === "THREE_TIMES_DAILY") return t("medicines.threeDaily");
  if (frequency === "FOUR_TIMES_DAILY") return t("medicines.fourDaily");
  if (frequency === "AS_NEEDED") return t("medicines.asNeeded");
  if (frequency === "CUSTOM") return t("medicines.customSchedule");
  return frequency;
};

const getStatusLabel = (status: MedicineStatus, t: Translate) => {
  if (status === "TAKEN") return t("common.taken");
  if (status === "PENDING") return t("common.pending");
  if (status === "MISSED") return t("common.missed");
  if (status === "SNOOZED") return t("common.snoozed");
  return status;
};

const getProgressTitle = (selectedTab: DateTab, t: Translate) => {
  if (selectedTab === "TODAY") return t("medicines.todayProgress");
  if (selectedTab === "TOMORROW") return t("medicines.tomorrowPlan");
  return t("medicines.thisWeek");
};

const getHeaderSubtitle = (selectedTab: DateTab, t: Translate) => {
  if (selectedTab === "TODAY") return t("medicines.trackToday");
  if (selectedTab === "TOMORROW") return t("medicines.planTomorrow");
  return t("medicines.reviewWeek");
};

const getEmptyTitle = (selectedTab: DateTab, t: Translate) => {
  if (selectedTab === "TODAY") return t("medicines.noToday");
  if (selectedTab === "TOMORROW") return t("medicines.noTomorrow");
  return t("medicines.noWeek");
};

const getPeriodLabel = (period: MedicinePeriod, t: Translate) => {
  if (period === "Morning") return t("common.morning");
  if (period === "Afternoon") return t("common.afternoon");
  return t("common.evening");
};

const getCardKey = (
  medicine: TodayMedicine,
  index: number
) => {
  const dateKey =
    getMedicineDateKey(
      medicine
    );

  return `${medicine.medicineId}-${medicine.reminderId}-${dateKey}-${medicine.timeOfDay}-${index}`;
};

const getStatusTone = (
  status: MedicineStatus
) => {
  if (
    status === "TAKEN"
  ) {
    return {
      background:
        SUCCESS_CONTAINER,
      text:
        ON_SUCCESS_CONTAINER,
      dot: SUCCESS,
      iconBackground:
        SUCCESS_CONTAINER,
      iconColor: SUCCESS,
    };
  }

  if (
    status === "PENDING"
  ) {
    return {
      background:
        WARNING_CONTAINER,
      text:
        ON_WARNING_CONTAINER,
      dot: WARNING,
      iconBackground:
        WARNING_CONTAINER,
      iconColor: WARNING,
    };
  }

  if (
    status === "MISSED"
  ) {
    return {
      background:
        DANGER_CONTAINER,
      text:
        ON_DANGER_CONTAINER,
      dot: DANGER,
      iconBackground:
        DANGER_CONTAINER,
      iconColor: DANGER,
    };
  }

  return {
    background:
      PRIMARY_CONTAINER,
    text:
      ON_PRIMARY_CONTAINER,
    dot: PRIMARY,
    iconBackground:
      PRIMARY_CONTAINER,
    iconColor: PRIMARY,
  };
};

const getPeriodTone = (
  period: MedicinePeriod
) => {
  if (
    period === "Morning"
  ) {
    return {
      background:
        WARNING_CONTAINER,
      color: WARNING,
    };
  }

  if (
    period ===
    "Afternoon"
  ) {
    return {
      background:
        PRIMARY_CONTAINER,
      color: PRIMARY,
    };
  }

  return {
    background:
      SECONDARY_CONTAINER,
    color: SECONDARY,
  };
};

const getPeriodIcon = (
  period: MedicinePeriod
) => {
  const tone =
    getPeriodTone(period);

  if (
    period === "Morning"
  ) {
    return (
      <Sunrise
        size={19}
        color={tone.color}
        strokeWidth={2.2}
      />
    );
  }

  if (
    period ===
    "Afternoon"
  ) {
    return (
      <Sun
        size={19}
        color={tone.color}
        strokeWidth={2.2}
      />
    );
  }

  return (
    <Moon
      size={19}
      color={tone.color}
      strokeWidth={2.2}
    />
  );
};

const ProgressRing = ({
  summary,
  progress,
}: {
  summary: TodayMedicineSummary;
  progress: number;
}) => {
  const { t } = useLanguage();
  const total =
    summary.totalCount;

  const segments = [
    {
      key: "taken",
      count:
        summary.takenCount,
      color: SUCCESS,
    },
    {
      key: "pending",
      count:
        summary.pendingCount,
      color: WARNING,
    },
    {
      key: "missed",
      count:
        summary.missedCount,
      color: DANGER,
    },
    {
      key: "snoozed",
      count:
        summary.snoozedCount,
      color: SNOOZED_RING,
    },
  ].filter(
    (segment) =>
      segment.count > 0
  );

  let accumulatedLength = 0;

  return (
    <View
      style={
        styles.progressRingContainer
      }
    >
      <Svg
        width={
          PROGRESS_RING_SIZE
        }
        height={
          PROGRESS_RING_SIZE
        }
        viewBox={`0 0 ${PROGRESS_RING_SIZE} ${PROGRESS_RING_SIZE}`}
      >
        <Circle
          cx={
            PROGRESS_RING_CENTER
          }
          cy={
            PROGRESS_RING_CENTER
          }
          r={
            PROGRESS_RING_RADIUS
          }
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={
            PROGRESS_RING_STROKE
          }
          fill="none"
        />

        {total > 0
          ? segments.map(
              (segment) => {
                const segmentLength =
                  (segment.count /
                    total) *
                  PROGRESS_RING_CIRCUMFERENCE;

                const strokeDashoffset =
                  -accumulatedLength;

                accumulatedLength +=
                  segmentLength;

                return (
                  <Circle
                    key={
                      segment.key
                    }
                    cx={
                      PROGRESS_RING_CENTER
                    }
                    cy={
                      PROGRESS_RING_CENTER
                    }
                    r={
                      PROGRESS_RING_RADIUS
                    }
                    stroke={
                      segment.color
                    }
                    strokeWidth={
                      PROGRESS_RING_STROKE
                    }
                    fill="none"
                    strokeDasharray={`${segmentLength} ${
                      PROGRESS_RING_CIRCUMFERENCE -
                      segmentLength
                    }`}
                    strokeDashoffset={
                      strokeDashoffset
                    }
                    strokeLinecap="round"
                    rotation="-90"
                    originX={
                      PROGRESS_RING_CENTER
                    }
                    originY={
                      PROGRESS_RING_CENTER
                    }
                  />
                );
              }
            )
          : null}
      </Svg>

      <View
        style={
          styles.progressRingCenter
        }
      >
        <Text
          style={
            styles.progressPercentage
          }
        >
          {progress}%
        </Text>

        <Text
          style={
            styles.progressCenterLabel
          }
        >
          {t("medicines.done")}
        </Text>
      </View>
    </View>
  );
};

export const MedicinesScreen =
  ({
    navigation,
  }: MedicinesScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();

    const [
      defaultSnoozeMinutes,
      setDefaultSnoozeMinutes,
    ] = useState<
      ReminderSettings["defaultSnoozeMinutes"]
    >(10);

    const [
      selectedTab,
      setSelectedTab,
    ] =
      useState<DateTab>(
        "TODAY"
      );

    const [
      allMedicines,
      setAllMedicines,
    ] = useState<
      TodayMedicine[]
    >([]);

    const [
      isLoading,
      setIsLoading,
    ] = useState(true);

    const [
      isRefreshing,
      setIsRefreshing,
    ] = useState(false);

    const [
      actionLoadingReminderId,
      setActionLoadingReminderId,
    ] =
      useState<
        string | null
      >(null);

    const [
      actionLoadingType,
      setActionLoadingType,
    ] =
      useState<
        ActionLoadingType | null
      >(null);

    const [
      medicineUpdatesUnread,
      setMedicineUpdatesUnread,
    ] = useState(0);

    const [
      removalModal,
      setRemovalModal,
    ] =
      useState<RemovalModalState>(
        null
      );

    const [
      removalReason,
      setRemovalReason,
    ] = useState("");

    const [
      isSubmittingRemoval,
      setIsSubmittingRemoval,
    ] = useState(false);

    const filteredMedicines =
      useMemo(() => {
        const allowedDateKeys =
          getAllowedDateKeys(
            selectedTab
          );

        const dateFilteredMedicines =
          allMedicines.filter(
            (medicine) => {
              const medicineDateKey =
                getMedicineDateKey(
                  medicine
                );

              return allowedDateKeys.includes(
                medicineDateKey
              );
            }
          );

        if (
          selectedTab !==
          "WEEK"
        ) {
          return sortMedicinesBySchedule(
            dateFilteredMedicines
          );
        }

        const uniqueReminderMap =
          new Map<
            string,
            TodayMedicine
          >();

        dateFilteredMedicines.forEach(
          (medicine) => {
            const uniqueKey =
              `${medicine.reminderId}-${medicine.timeOfDay}`;

            if (
              !uniqueReminderMap.has(
                uniqueKey
              )
            ) {
              uniqueReminderMap.set(
                uniqueKey,
                medicine
              );
            }
          }
        );

        return sortMedicinesBySchedule(
          Array.from(
            uniqueReminderMap.values()
          )
        );
      }, [
        allMedicines,
        selectedTab,
      ]);

    const summary =
      useMemo(() => {
        return buildSummaryFromMedicines(
          filteredMedicines
        );
      }, [
        filteredMedicines,
      ]);

    const loadReviewSummary =
      useCallback(
        async () => {
          try {
            const result =
              await patientMedicineReviewsApi.listReviews();

            setMedicineUpdatesUnread(
              result.summary
                ?.unread || 0
            );
          } catch {
            setMedicineUpdatesUnread(
              0
            );
          }
        },
        []
      );

    const loadReminderSettings =
      useCallback(
        async () => {
          try {
            const result =
              await patientSettingsApi.getReminderSettings();

            setDefaultSnoozeMinutes(
              result.settings.defaultSnoozeMinutes
            );
          } catch {
            return;
          }
        },
        []
      );

    const fetchMedicines =
      useCallback(
        async (
          mode:
            | "initial"
            | "refresh"
            | "silent" =
            "initial"
        ) => {
          try {
            if (
              mode ===
              "initial"
            ) {
              setIsLoading(
                true
              );
            }

            if (
              mode ===
              "refresh"
            ) {
              setIsRefreshing(
                true
              );
            }

            const token =
              await tokenStorage.getToken();

            if (!token) {
              Alert.alert(
                t("common.sessionExpired"),
                t("common.pleaseLoginAgain")
              );

              return;
            }

            const response =
              await fetch(
                `${API_BASE_URL}/patient/medicines/today`,
                {
                  method:
                    "GET",
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              );

            let result: any =
              {};

            try {
              result =
                await response.json();
            } catch {
              result = {};
            }

            if (
              !response.ok
            ) {
              Alert.alert(
                t("medicines.unableFetch"),
                result.message ||
                  t("common.pleaseTryAgain")
              );

              return;
            }

            const data:
              TodayMedicineResponse =
              result.data;

            setAllMedicines(
              Array.isArray(
                data?.medicines
              )
                ? data.medicines
                : []
            );
          } catch {
            Alert.alert(
              t("common.networkError"),
              t("common.unableConnect")
            );
          } finally {
            if (
              mode ===
              "initial"
            ) {
              setIsLoading(
                false
              );
            }

            if (
              mode ===
              "refresh"
            ) {
              setIsRefreshing(
                false
              );
            }
          }
        },
        [t]
      );

    useFocusEffect(
      useCallback(() => {
        void fetchMedicines(
          "initial"
        );

        void loadReviewSummary();

        void loadReminderSettings();
      }, [
        fetchMedicines,
        loadReviewSummary,
        loadReminderSettings,
      ])
    );

    const refreshAll =
      useCallback(
        async () => {
          await Promise.all([
            fetchMedicines(
              "refresh"
            ),
            loadReviewSummary(),
            loadReminderSettings(),
          ]);
        },
        [
          fetchMedicines,
          loadReviewSummary,
          loadReminderSettings,
        ]
      );

    const markTaken =
      async (
        reminderId: string
      ) => {
        if (
          actionLoadingReminderId
        ) {
          return;
        }

        try {
          setActionLoadingReminderId(
            reminderId
          );

          setActionLoadingType(
            "TAKEN"
          );

          const token =
            await tokenStorage.getToken();

          if (!token) {
            Alert.alert(
              t("common.sessionExpired"),
              t("common.pleaseLoginAgain")
            );

            return;
          }

          const response =
            await fetch(
              `${API_BASE_URL}/patient/medicine-reminders/${reminderId}/taken`,
              {
                method:
                  "POST",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          let result: any =
            {};

          try {
            result =
              await response.json();
          } catch {
            result = {};
          }

          if (
            !response.ok
          ) {
            Alert.alert(
              t("medicines.unableUpdate"),
              result.message ||
                t("common.pleaseTryAgain")
            );

            return;
          }

          setAllMedicines(
            (
              currentMedicines
            ) =>
              currentMedicines.map(
                (
                  medicine
                ) =>
                  medicine.reminderId ===
                  reminderId
                    ? {
                        ...medicine,
                        status:
                          "TAKEN",
                        takenAt:
                          new Date().toISOString(),
                        snoozedUntil:
                          null,
                      }
                    : medicine
              )
          );

          await fetchMedicines(
            "silent"
          );
        } catch {
          Alert.alert(
            t("common.networkError"),
            t("common.unableConnect")
          );
        } finally {
          setActionLoadingReminderId(
            null
          );

          setActionLoadingType(
            null
          );
        }
      };

    const snoozeReminder =
      async (
        reminderId: string
      ) => {
        if (
          actionLoadingReminderId
        ) {
          return;
        }

        try {
          setActionLoadingReminderId(
            reminderId
          );

          setActionLoadingType(
            "SNOOZE"
          );

          const token =
            await tokenStorage.getToken();

          if (!token) {
            Alert.alert(
              t("common.sessionExpired"),
              t("common.pleaseLoginAgain")
            );

            return;
          }

          const snoozedUntil =
            new Date(
              Date.now() +
                defaultSnoozeMinutes *
                  60 *
                  1000
            ).toISOString();

          const response =
            await fetch(
              `${API_BASE_URL}/patient/medicine-reminders/${reminderId}/snooze`,
              {
                method:
                  "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  Authorization:
                    `Bearer ${token}`,
                },
                body:
                  JSON.stringify(
                    {
                      snoozedUntil,
                    }
                  ),
              }
            );

          let result: any =
            {};

          try {
            result =
              await response.json();
          } catch {
            result = {};
          }

          if (
            !response.ok
          ) {
            Alert.alert(
              t("medicines.unableSnooze"),
              result.message ||
                t("common.pleaseTryAgain")
            );

            return;
          }

          setAllMedicines(
            (
              currentMedicines
            ) =>
              currentMedicines.map(
                (
                  medicine
                ) =>
                  medicine.reminderId ===
                  reminderId
                    ? {
                        ...medicine,
                        status:
                          "SNOOZED",
                        snoozedUntil,
                      }
                    : medicine
              )
          );

          await fetchMedicines(
            "silent"
          );
        } catch {
          Alert.alert(
            t("common.networkError"),
            t("common.unableConnect")
          );
        } finally {
          setActionLoadingReminderId(
            null
          );

          setActionLoadingType(
            null
          );
        }
      };

    const openRemovalModal =
      (
        medicine: TodayMedicine
      ) => {
        if (
          medicine.deletionReviewPending
        ) {
          navigation.navigate(
            "MedicineUpdates"
          );

          return;
        }

        setRemovalModal({
          medicineId:
            medicine.medicineId,
          medicineName:
            medicine.name,
        });

        setRemovalReason("");
      };

    const closeRemovalModal =
      () => {
        if (
          isSubmittingRemoval
        ) {
          return;
        }

        setRemovalModal(
          null
        );

        setRemovalReason("");
      };

    const submitRemovalRequest =
      async () => {
        if (
          !removalModal ||
          isSubmittingRemoval
        ) {
          return;
        }

        const reason =
          removalReason.trim();

        if (
          reason.length < 3
        ) {
          Alert.alert(
            t("medicines.reasonRequired"),
            t("medicines.reasonRequiredText")
          );

          return;
        }

        try {
          setIsSubmittingRemoval(
            true
          );

          const result =
            await patientMedicineReviewsApi.requestDeletion(
              removalModal.medicineId,
              reason
            );

          const requestId =
            result.request?.id ||
            null;

          setAllMedicines(
            (
              currentMedicines
            ) =>
              currentMedicines.map(
                (
                  medicine
                ) =>
                  medicine.medicineId ===
                  removalModal.medicineId
                    ? {
                        ...medicine,
                        deletionReviewPending:
                          true,
                        pendingDeletionRequestId:
                          requestId,
                      }
                    : medicine
              )
          );

          const medicineName =
            removalModal.medicineName;

          setRemovalModal(
            null
          );

          setRemovalReason("");

          await Promise.all([
            fetchMedicines(
              "silent"
            ),
            loadReviewSummary(),
          ]);

          Alert.alert(
            t("medicines.removalSentTitle"),
            t("medicines.removalSentText", { medicine: medicineName }),
            [
              {
                text:
                  t("medicines.viewUpdates"),
                onPress:
                  () => {
                    navigation.navigate(
                      "MedicineUpdates"
                    );
                  },
              },
              {
                text: t("common.ok"),
              },
            ]
          );
        } catch (error) {
          Alert.alert(
            t("medicines.unableRequestRemoval"),
            error instanceof Error
              ? error.message
              : t("medicines.removalRequestFailed")
          );
        } finally {
          setIsSubmittingRemoval(
            false
          );
        }
      };

    const getMedicinesByPeriod =
      (
        period: MedicinePeriod
      ) => {
        return filteredMedicines.filter(
          (medicine) =>
            medicine.period ===
            period
        );
      };

    const getMedicineMetaText =
      (
        medicine: TodayMedicine
      ) => {
        const instructionOrFrequency =
          medicine.instructions?.trim() ||
          (medicine.frequency ===
            "CUSTOM"
            ? medicine.customFrequency ||
              t("medicines.customSchedule")
            : getFrequencyLabel(medicine.frequency, t));

        const dateKey =
          getMedicineDateKey(
            medicine
          );

        if (
          selectedTab ===
            "WEEK" &&
          dateKey
        ) {
          return `${dateKey} · ${medicine.timeOfDay} · ${instructionOrFrequency}`;
        }

        return `${medicine.timeOfDay} · ${instructionOrFrequency}`;
      };

    const renderDateTab =
      (
        tab: DateTab,
        label: string
      ) => {
        const isSelected =
          selectedTab === tab;

        return (
          <TouchableOpacity
            key={tab}
            style={[
              styles.dateTab,
              isSelected
                ? styles.activeDateTab
                : undefined,
            ]}
            onPress={() =>
              setSelectedTab(
                tab
              )
            }
            activeOpacity={
              0.82
            }
          >
            <Text
              style={[
                styles.dateTabText,
                isSelected
                  ? styles.activeDateTabText
                  : undefined,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      };

    const renderProgressCard =
      () => {
        const progress =
          Number.isFinite(
            summary.progressPercentage
          )
            ? summary.progressPercentage
            : 0;

        return (
          <View
            style={
              styles.progressCard
            }
          >
            <View
              style={
                styles.progressTopRow
              }
            >
              <View
                style={
                  styles.progressTextBlock
                }
              >
                <Text
                  style={
                    styles.progressKicker
                  }
                >
                  {t("medicines.medicationPlan")}
                </Text>

                <Text
                  style={
                    styles.progressTitle
                  }
                >
                  {getProgressTitle(selectedTab, t)}
                </Text>

                <Text
                  style={
                    styles.progressSubtitle
                  }
                >
                  {summary.totalCount === 0
                    ? t("medicines.noReminders")
                    : t("medicines.dosesCompleted", { taken: summary.takenCount, total: summary.totalCount })}
                </Text>
              </View>

              <ProgressRing
                summary={
                  summary
                }
                progress={
                  progress
                }
              />
            </View>

            <View
              style={
                styles.summaryPanel
              }
            >
              <SummaryMetric
                label={t("common.taken")}
                value={
                  summary.takenCount
                }
                color={
                  SUCCESS
                }
              />

              <View
                style={
                  styles.summaryDivider
                }
              />

              <SummaryMetric
                label={t("common.pending")}
                value={
                  summary.pendingCount
                }
                color={
                  WARNING
                }
              />

              <View
                style={
                  styles.summaryDivider
                }
              />

              <SummaryMetric
                label={t("common.missed")}
                value={
                  summary.missedCount
                }
                color={
                  DANGER
                }
              />

              <View
                style={
                  styles.summaryDivider
                }
              />

              <SummaryMetric
                label={t("common.snoozed")}
                value={
                  summary.snoozedCount
                }
                color={
                  SNOOZED_RING
                }
              />
            </View>
          </View>
        );
      };

    const renderStatusBadge =
      (
        status: MedicineStatus
      ) => {
        const tone =
          getStatusTone(status);

        return (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  tone.background,
              },
            ]}
          >
            <View
              style={[
                styles.statusBadgeDot,
                {
                  backgroundColor:
                    tone.dot,
                },
              ]}
            />

            <Text
              style={[
                styles.statusBadgeText,
                {
                  color:
                    tone.text,
                },
              ]}
            >
              {getStatusLabel(status, t)}
            </Text>
          </View>
        );
      };

    const renderMedicineRow =
      (
        medicine: TodayMedicine,
        index: number,
        isLast: boolean
      ) => {
        const isMissed =
          medicine.status ===
          "MISSED";

        const isSnoozed =
          medicine.status ===
          "SNOOZED";

        const tone =
          getStatusTone(
            medicine.status
          );

        const shouldShowDoseActions =
          selectedTab ===
            "TODAY" &&
          (medicine.status ===
            "PENDING" ||
            medicine.status ===
              "SNOOZED" ||
            medicine.status ===
              "MISSED");

        const isCurrentMedicineActionLoading =
          actionLoadingReminderId ===
          medicine.reminderId;

        const isTakingThisMedicine =
          isCurrentMedicineActionLoading &&
          actionLoadingType ===
            "TAKEN";

        const isSnoozingThisMedicine =
          isCurrentMedicineActionLoading &&
          actionLoadingType ===
            "SNOOZE";

        const isTakenButtonDisabled =
          isCurrentMedicineActionLoading ||
          isMissed;

        const isSnoozeButtonDisabled =
          isCurrentMedicineActionLoading ||
          isMissed ||
          isSnoozed;

        return (
          <View
            key={getCardKey(
              medicine,
              index
            )}
            style={[
              styles.medicineRow,
              isLast
                ? styles.lastMedicineRow
                : undefined,
            ]}
          >
            <View
              style={
                styles.timeColumn
              }
            >
              <View
                style={
                  styles.timeBox
                }
              >
                <Text
                  style={
                    styles.medicineTime
                  }
                  numberOfLines={
                    1
                  }
                >
                  {
                    medicine.timeOfDay
                  }
                </Text>

                <Text
                  style={
                    styles.timeLabel
                  }
                >
                  {t("common.due")}
                </Text>
              </View>
            </View>

            <View
              style={
                styles.medicineContent
              }
            >
              <View
                style={
                  styles.medicineTopRow
                }
              >
                <View
                  style={[
                    styles.medicineIconBox,
                    {
                      backgroundColor:
                        tone.iconBackground,
                    },
                  ]}
                >
                  <Pill
                    size={20}
                    color={
                      tone.iconColor
                    }
                    strokeWidth={
                      2.2
                    }
                  />
                </View>

                <View
                  style={
                    styles.medicineTextBlock
                  }
                >
                  <Text
                    style={
                      styles.medicineName
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {
                      medicine.name
                    }
                  </Text>

                  <Text
                    style={
                      styles.medicineDose
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {
                      medicine.dose
                    }
                  </Text>
                </View>

                {renderStatusBadge(
                  medicine.status
                )}
              </View>

              <Text
                style={
                  styles.medicineMeta
                }
                numberOfLines={
                  2
                }
              >
                {getMedicineMetaText(
                  medicine
                )}
              </Text>

              {medicine.deletionReviewPending ? (
                <TouchableOpacity
                  style={
                    styles.removalPendingPanel
                  }
                  activeOpacity={
                    0.84
                  }
                  onPress={() =>
                    navigation.navigate(
                      "MedicineUpdates"
                    )
                  }
                >
                  <View
                    style={
                      styles.removalPendingIcon
                    }
                  >
                    <Clock3
                      size={17}
                      color={
                        ON_WARNING_CONTAINER
                      }
                      strokeWidth={
                        2.5
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.removalPendingTextBlock
                    }
                  >
                    <Text
                      style={
                        styles.removalPendingTitle
                      }
                    >
                      {t("medicines.removalPendingTitle")}
                    </Text>

                    <Text
                      style={
                        styles.removalPendingText
                      }
                    >
                      {t("medicines.removalPendingText")}
                    </Text>
                  </View>

                  <FileCheck2
                    size={18}
                    color={
                      ON_WARNING_CONTAINER
                    }
                    strokeWidth={
                      2.5
                    }
                  />
                </TouchableOpacity>
              ) : null}

              {shouldShowDoseActions ? (
                <View
                  style={
                    styles.actionsRow
                  }
                >
                  <TouchableOpacity
                    style={[
                      styles.takenButton,
                      isTakingThisMedicine
                        ? styles.disabledButton
                        : undefined,
                      isMissed
                        ? styles.disabledActionButton
                        : undefined,
                    ]}
                    disabled={
                      isTakenButtonDisabled
                    }
                    onPress={() =>
                      void markTaken(
                        medicine.reminderId
                      )
                    }
                    activeOpacity={
                      0.82
                    }
                  >
                    {isTakingThisMedicine ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          SURFACE
                        }
                      />
                    ) : (
                      <>
                        <CheckCircle2
                          size={
                            17
                          }
                          color={
                            isMissed
                              ? DISABLED_TEXT
                              : SURFACE
                          }
                          strokeWidth={
                            2.2
                          }
                        />

                        <Text
                          style={[
                            styles.takenButtonText,
                            isMissed
                              ? styles.disabledActionText
                              : undefined,
                          ]}
                        >
                          {t("common.taken")}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.snoozeButton,
                      isSnoozingThisMedicine
                        ? styles.disabledButton
                        : undefined,
                      isMissed ||
                      isSnoozed
                        ? styles.disabledActionButton
                        : undefined,
                    ]}
                    disabled={
                      isSnoozeButtonDisabled
                    }
                    onPress={() =>
                      void snoozeReminder(
                        medicine.reminderId
                      )
                    }
                    activeOpacity={
                      0.82
                    }
                  >
                    {isSnoozingThisMedicine ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          ON_PRIMARY_CONTAINER
                        }
                      />
                    ) : (
                      <>
                        <Clock3
                          size={
                            17
                          }
                          color={
                            isMissed ||
                            isSnoozed
                              ? DISABLED_TEXT
                              : ON_PRIMARY_CONTAINER
                          }
                          strokeWidth={
                            2.2
                          }
                        />

                        <Text
                          style={[
                            styles.snoozeButtonText,
                            isMissed ||
                            isSnoozed
                              ? styles.disabledActionText
                              : undefined,
                          ]}
                        >
                          {t("common.snooze")}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}

              {!medicine.deletionReviewPending ? (
                <TouchableOpacity
                  style={
                    styles.removeMedicineButton
                  }
                  activeOpacity={
                    0.84
                  }
                  onPress={() =>
                    openRemovalModal(
                      medicine
                    )
                  }
                  disabled={
                    isCurrentMedicineActionLoading
                  }
                >
                  <Trash2
                    size={16}
                    color={
                      ON_DANGER_CONTAINER
                    }
                    strokeWidth={
                      2.4
                    }
                  />

                  <Text
                    style={
                      styles.removeMedicineButtonText
                    }
                  >
                    {t("medicines.requestRemoval")}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {isMissed ? (
                <View
                  style={
                    styles.missedHelpPanel
                  }
                >
                  <Text
                    style={
                      styles.missedHelpText
                    }
                  >
                    {t("medicines.missedHelp")}
                  </Text>
                </View>
              ) : null}

              {isSnoozed ? (
                <View
                  style={
                    styles.snoozedHelpPanel
                  }
                >
                  <Text
                    style={
                      styles.snoozedHelpText
                    }
                  >
                    {t("medicines.snoozedHelp")}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      };

    const renderPeriodSection =
      (
        period: MedicinePeriod
      ) => {
        const periodMedicines =
          getMedicinesByPeriod(
            period
          );

        if (
          periodMedicines.length ===
          0
        ) {
          return null;
        }

        const periodTone =
          getPeriodTone(
            period
          );

        return (
          <View
            key={period}
            style={
              styles.periodSection
            }
          >
            <View
              style={
                styles.periodHeader
              }
            >
              <View
                style={
                  styles.periodHeaderLeft
                }
              >
                <View
                  style={[
                    styles.periodIconBox,
                    {
                      backgroundColor:
                        periodTone.background,
                    },
                  ]}
                >
                  {getPeriodIcon(
                    period
                  )}
                </View>

                <Text
                  style={
                    styles.periodTitle
                  }
                >
                  {getPeriodLabel(period, t)}
                </Text>
              </View>

              <View
                style={
                  styles.periodCountBadge
                }
              >
                <Text
                  style={
                    styles.periodCountText
                  }
                >
                  {
                    periodMedicines.length
                  }
                </Text>
              </View>
            </View>

            <View
              style={
                styles.periodPanel
              }
            >
              {periodMedicines.map(
                (
                  medicine,
                  index
                ) => {
                  return renderMedicineRow(
                    medicine,
                    index,
                    index ===
                      periodMedicines.length -
                        1
                  );
                }
              )}
            </View>
          </View>
        );
      };

    if (isLoading) {
      return (
        <SafeAreaView
          style={
            styles.loadingContainer
          }
          edges={[
            "top",
            "bottom",
          ]}
        >
          <StatusBar
            backgroundColor={
              BACKGROUND
            }
            barStyle="dark-content"
          />

          <View
            style={
              styles.loadingPanel
            }
          >
            <ActivityIndicator
              size="large"
              color={PRIMARY}
            />

            <Text
              style={
                styles.loadingTitle
              }
            >
              {t("medicines.loadingTitle")}
            </Text>

            <Text
              style={
                styles.loadingText
              }
            >
              {t("medicines.loadingText")}
            </Text>
          </View>
        </SafeAreaView>
      );
    }

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

        <View
          style={styles.screen}
        >
          <View
            style={styles.header}
          >
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
                {t("medicines.title")}
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                {getHeaderSubtitle(selectedTab, t)}
              </Text>
            </View>

            <View
              style={
                styles.headerActions
              }
            >
              <TouchableOpacity
                style={
                  styles.updatesButton
                }
                onPress={() =>
                  navigation.navigate(
                    "MedicineUpdates"
                  )
                }
                activeOpacity={
                  0.82
                }
              >
                <FileCheck2
                  size={21}
                  color={PRIMARY}
                  strokeWidth={
                    2.4
                  }
                />

                {medicineUpdatesUnread >
                0 ? (
                  <View
                    style={
                      styles.updatesBadge
                    }
                  >
                    <Text
                      style={
                        styles.updatesBadgeText
                      }
                    >
                      {medicineUpdatesUnread >
                      9
                        ? "9+"
                        : medicineUpdatesUnread}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.addButton
                }
                onPress={() =>
                  navigation.navigate(
                    "AddMedicine"
                  )
                }
                activeOpacity={
                  0.82
                }
              >
                <Plus
                  size={23}
                  color={
                    SURFACE
                  }
                  strokeWidth={
                    2.3
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={
              styles.content
            }
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom:
                  Math.max(
                    36,
                    insets.bottom +
                      112
                  ),
              },
            ]}
            showsVerticalScrollIndicator={
              false
            }
            refreshControl={
              <RefreshControl
                refreshing={
                  isRefreshing
                }
                onRefresh={() =>
                  void refreshAll()
                }
                tintColor={
                  PRIMARY
                }
                colors={[
                  PRIMARY,
                ]}
              />
            }
          >
            {renderProgressCard()}

            <TouchableOpacity
              style={
                styles.updatesPanel
              }
              activeOpacity={
                0.84
              }
              onPress={() =>
                navigation.navigate(
                  "MedicineUpdates"
                )
              }
            >
              <View
                style={
                  styles.updatesPanelIcon
                }
              >
                <FileCheck2
                  size={22}
                  color={
                    PRIMARY
                  }
                  strokeWidth={
                    2.5
                  }
                />
              </View>

              <View
                style={
                  styles.updatesPanelTextBlock
                }
              >
                <Text
                  style={
                    styles.updatesPanelTitle
                  }
                >
                  {t("medicines.updatesTitle")}
                </Text>

                <Text
                  style={
                    styles.updatesPanelText
                  }
                >
                  {t("medicines.updatesText")}
                </Text>
              </View>

              {medicineUpdatesUnread >
              0 ? (
                <View
                  style={
                    styles.unreadCountBadge
                  }
                >
                  <Text
                    style={
                      styles.unreadCountText
                    }
                  >
                    {
                      medicineUpdatesUnread
                    }
                  </Text>
                </View>
              ) : (
                <RefreshCw
                  size={18}
                  color={MUTED}
                  strokeWidth={
                    2.3
                  }
                />
              )}
            </TouchableOpacity>

            <View
              style={
                styles.dateTabs
              }
            >
              {renderDateTab("TODAY", t("common.today"))}

              {renderDateTab("TOMORROW", t("common.tomorrow"))}

              {renderDateTab("WEEK", t("common.week"))}
            </View>

            {filteredMedicines.length ===
            0 ? (
              <View
                style={
                  styles.emptyPanel
                }
              >
                <View
                  style={
                    styles.emptyIconBox
                  }
                >
                  <Pill
                    size={32}
                    color={PRIMARY}
                    strokeWidth={
                      2.2
                    }
                  />
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  {getEmptyTitle(selectedTab, t)}
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  {t("medicines.addReminderText")}
                </Text>

                <TouchableOpacity
                  style={
                    styles.emptyButton
                  }
                  onPress={() =>
                    navigation.navigate(
                      "AddMedicine"
                    )
                  }
                  activeOpacity={
                    0.82
                  }
                >
                  <Plus
                    size={18}
                    color={
                      SURFACE
                    }
                    strokeWidth={
                      2.2
                    }
                  />

                  <Text
                    style={
                      styles.emptyButtonText
                    }
                  >
                    {t("medicines.addMedicine")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View
                  style={
                    styles.scheduleHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      {t("medicines.schedule")}
                    </Text>

                    <Text
                      style={
                        styles.sectionSubtitle
                      }
                    >
                      {filteredMedicines.length === 1
                        ? t("medicines.oneReminderFound")
                        : t("medicines.manyRemindersFound", { count: filteredMedicines.length })}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.scheduleIconBox
                    }
                  >
                    <CalendarDays
                      size={21}
                      color={
                        PRIMARY
                      }
                      strokeWidth={
                        2.2
                      }
                    />
                  </View>
                </View>

                {renderPeriodSection(
                  "Morning"
                )}

                {renderPeriodSection(
                  "Afternoon"
                )}

                {renderPeriodSection(
                  "Evening"
                )}
              </>
            )}
          </ScrollView>
        </View>

        <Modal
          visible={Boolean(
            removalModal
          )}
          transparent
          animationType="fade"
          onRequestClose={
            closeRemovalModal
          }
        >
          <KeyboardAvoidingView
            style={
              styles.modalBackdrop
            }
            behavior={
              Platform.OS ===
              "ios"
                ? "padding"
                : undefined
            }
          >
            <View
              style={
                styles.modalCard
              }
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <View
                  style={
                    styles.modalHeaderText
                  }
                >
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    {t("medicines.modalTitle")}
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    {removalModal?.medicineName ||
                      ""}
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.modalCloseButton
                  }
                  onPress={
                    closeRemovalModal
                  }
                  disabled={
                    isSubmittingRemoval
                  }
                  activeOpacity={
                    0.84
                  }
                >
                  <X
                    size={20}
                    color={TEXT}
                    strokeWidth={
                      2.5
                    }
                  />
                </TouchableOpacity>
              </View>

              <View
                style={
                  styles.modalWarningPanel
                }
              >
                <AlertCircle
                  size={20}
                  color={
                    ON_WARNING_CONTAINER
                  }
                  strokeWidth={
                    2.5
                  }
                />

                <Text
                  style={
                    styles.modalWarningText
                  }
                >
                  {t("medicines.modalWarning")}
                </Text>
              </View>

              <Text
                style={
                  styles.modalInputLabel
                }
              >
                {t("medicines.modalQuestion")}
              </Text>

              <TextInput
                style={
                  styles.removalReasonInput
                }
                value={
                  removalReason
                }
                onChangeText={
                  setRemovalReason
                }
                placeholder={t("medicines.modalPlaceholder")}
                placeholderTextColor={
                  MUTED
                }
                multiline
                textAlignVertical="top"
                maxLength={500}
                editable={
                  !isSubmittingRemoval
                }
              />

              <Text
                style={
                  styles.characterCount
                }
              >
                {
                  removalReason.length
                }
                /500
              </Text>

              <View
                style={
                  styles.modalActions
                }
              >
                <TouchableOpacity
                  style={
                    styles.modalCancelButton
                  }
                  onPress={
                    closeRemovalModal
                  }
                  disabled={
                    isSubmittingRemoval
                  }
                  activeOpacity={
                    0.84
                  }
                >
                  <Text
                    style={
                      styles.modalCancelText
                    }
                  >
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSubmitButton,
                    isSubmittingRemoval
                      ? styles.disabledButton
                      : undefined,
                  ]}
                  onPress={() =>
                    void submitRemovalRequest()
                  }
                  disabled={
                    isSubmittingRemoval
                  }
                  activeOpacity={
                    0.84
                  }
                >
                  {isSubmittingRemoval ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        SURFACE
                      }
                    />
                  ) : (
                    <>
                      <Trash2
                        size={
                          17
                        }
                        color={
                          SURFACE
                        }
                        strokeWidth={
                          2.5
                        }
                      />

                      <Text
                        style={
                          styles.modalSubmitText
                        }
                      >
                        {t("common.sendRequest")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  };

const SummaryMetric = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => {
  return (
    <View
      style={
        styles.summaryMetric
      }
    >
      <View
        style={[
          styles.summaryDot,
          {
            backgroundColor:
              color,
          },
        ]}
      />

      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>
    </View>
  );
};

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

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        BACKGROUND,
      paddingHorizontal: 20,
    },

    loadingPanel: {
      width: "100%",
      maxWidth: 420,
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      paddingHorizontal: 24,
      paddingVertical: 28,
      alignItems: "center",
      ...elevate(1),
    },

    loadingTitle: {
      color: TEXT,
      fontSize: 17,
      fontWeight: "700",
      marginTop: 14,
    },

    loadingText: {
      color: MUTED,
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 19,
      marginTop: 5,
      textAlign: "center",
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      backgroundColor:
        BACKGROUND,
    },

    headerTextBlock: {
      flex: 1,
      paddingRight: 12,
    },

    headerTitle: {
      color: TEXT,
      fontSize: 26,
      fontWeight: "700",
      letterSpacing: -0.3,
    },

    headerSubtitle: {
      color: MUTED,
      fontSize: 13,
      fontWeight: "500",
      marginTop: 3,
    },

    headerActions: {
      flexDirection: "row",
      alignItems: "center",
    },

    updatesButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        SURFACE,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 9,
      overflow: "hidden",
      ...elevate(1),
    },

    updatesBadge: {
      position: "absolute",
      top: 3,
      right: 3,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor:
        DANGER,
      alignItems: "center",
      justifyContent:
        "center",
      borderWidth: 2,
      borderColor: SURFACE,
    },

    updatesBadgeText: {
      color: SURFACE,
      fontSize: 8,
      fontWeight: "700",
    },

    addButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
      overflow: "hidden",
      ...elevate(2),
    },

    content: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 4,
    },

    progressCard: {
      backgroundColor:
        PRIMARY,
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      overflow: "hidden",
      ...elevate(2),
    },

    progressTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    progressTextBlock: {
      flex: 1,
      paddingRight: 12,
    },

    progressKicker: {
      color: "#E4EAFF",
      fontSize: 11,
      fontWeight: "600",
      textTransform:
        "uppercase",
      letterSpacing: 0.6,
      marginBottom: 7,
    },

    progressTitle: {
      color: SURFACE,
      fontSize: 25,
      fontWeight: "700",
      letterSpacing: -0.3,
      lineHeight: 31,
    },

    progressSubtitle: {
      color: "#E4EAFF",
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 19,
      marginTop: 7,
    },

    progressRingContainer: {
      width:
        PROGRESS_RING_SIZE,
      height:
        PROGRESS_RING_SIZE,
      alignItems: "center",
      justifyContent:
        "center",
      position: "relative",
    },

    progressRingCenter: {
      position: "absolute",
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor:
        "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent:
        "center",
    },

    progressPercentage: {
      color: SURFACE,
      fontSize: 20,
      fontWeight: "700",
      lineHeight: 24,
    },

    progressCenterLabel: {
      color: "#E4EAFF",
      fontSize: 10,
      fontWeight: "600",
      textTransform:
        "uppercase",
      marginTop: 1,
    },

    summaryPanel: {
      flexDirection: "row",
      alignItems: "stretch",
      backgroundColor:
        "rgba(255,255,255,0.14)",
      borderRadius: 14,
      paddingVertical: 11,
      paddingHorizontal: 6,
      marginTop: 17,
    },

    summaryMetric: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
    },

    summaryDivider: {
      width:
        StyleSheet.hairlineWidth,
      backgroundColor:
        "rgba(255,255,255,0.28)",
    },

    summaryDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginBottom: 5,
    },

    summaryValue: {
      color: SURFACE,
      fontSize: 15,
      fontWeight: "700",
    },

    summaryLabel: {
      color: "#E4EAFF",
      fontSize: 10,
      fontWeight: "600",
      marginTop: 2,
    },

    updatesPanel: {
      backgroundColor:
        SURFACE,
      borderRadius: 15,
      padding: 13,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
      ...elevate(1),
    },

    updatesPanelIcon: {
      width: 45,
      height: 45,
      borderRadius: 13,
      backgroundColor:
        PRIMARY_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
    },

    updatesPanelTextBlock: {
      flex: 1,
      paddingRight: 10,
    },

    updatesPanelTitle: {
      color: TEXT,
      fontSize: 14,
      fontWeight: "700",
    },

    updatesPanelText: {
      color: MUTED,
      fontSize: 11,
      fontWeight: "500",
      lineHeight: 16,
      marginTop: 3,
    },

    unreadCountBadge: {
      minWidth: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor:
        DANGER_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 7,
    },

    unreadCountText: {
      color:
        ON_DANGER_CONTAINER,
      fontSize: 12,
      fontWeight: "700",
    },

    dateTabs: {
      flexDirection: "row",
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      padding: 5,
      marginBottom: 20,
      ...elevate(1),
    },

    dateTab: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent:
        "center",
      overflow: "hidden",
    },

    activeDateTab: {
      backgroundColor:
        PRIMARY_CONTAINER,
    },

    dateTabText: {
      color: MUTED,
      fontSize: 13,
      fontWeight: "600",
    },

    activeDateTabText: {
      color:
        ON_PRIMARY_CONTAINER,
      fontWeight: "700",
    },

    emptyPanel: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      paddingHorizontal: 24,
      paddingVertical: 27,
      alignItems: "center",
      ...elevate(1),
    },

    emptyIconBox: {
      width: 68,
      height: 68,
      borderRadius: 16,
      backgroundColor:
        PRIMARY_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 15,
    },

    emptyTitle: {
      color: TEXT,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 8,
      textAlign: "center",
    },

    emptyText: {
      color: MUTED,
      fontSize: 14,
      fontWeight: "500",
      textAlign: "center",
      lineHeight: 21,
    },

    emptyButton: {
      marginTop: 18,
      backgroundColor:
        PRIMARY,
      borderRadius: 13,
      paddingHorizontal: 18,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      overflow: "hidden",
      ...elevate(1),
    },

    emptyButtonText: {
      color: SURFACE,
      fontSize: 14,
      fontWeight: "700",
      marginLeft: 7,
    },

    scheduleHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 12,
    },

    sectionTitle: {
      color: TEXT,
      fontSize: 19,
      fontWeight: "700",
      letterSpacing: -0.2,
    },

    sectionSubtitle: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "500",
      marginTop: 3,
    },

    scheduleIconBox: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        PRIMARY_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
    },

    periodSection: {
      marginBottom: 18,
    },

    periodHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 9,
    },

    periodHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
    },

    periodIconBox: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    periodTitle: {
      color: TEXT,
      fontSize: 17,
      fontWeight: "700",
    },

    periodCountBadge: {
      minWidth: 30,
      height: 28,
      borderRadius: 8,
      paddingHorizontal: 9,
      backgroundColor:
        SURFACE_VARIANT,
      alignItems: "center",
      justifyContent:
        "center",
    },

    periodCountText: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "700",
    },

    periodPanel: {
      backgroundColor:
        SURFACE,
      borderRadius: 16,
      paddingHorizontal: 14,
      overflow: "hidden",
      ...elevate(1),
    },

    medicineRow: {
      flexDirection: "row",
      paddingVertical: 14,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        SURFACE_VARIANT,
    },

    lastMedicineRow: {
      borderBottomWidth: 0,
    },

    timeColumn: {
      width: 68,
      paddingRight: 10,
    },

    timeBox: {
      minHeight: 52,
      borderRadius: 12,
      backgroundColor:
        PRIMARY_CONTAINER,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 5,
      paddingVertical: 7,
    },

    medicineTime: {
      color:
        ON_PRIMARY_CONTAINER,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
    },

    timeLabel: {
      color:
        ON_PRIMARY_CONTAINER,
      fontSize: 9,
      fontWeight: "600",
      textTransform:
        "uppercase",
      marginTop: 2,
    },

    medicineContent: {
      flex: 1,
    },

    medicineTopRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    medicineIconBox: {
      width: 44,
      height: 44,
      borderRadius: 13,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    medicineTextBlock: {
      flex: 1,
      paddingRight: 7,
    },

    medicineName: {
      color: TEXT,
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 3,
    },

    medicineDose: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "500",
    },

    medicineMeta: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "500",
      lineHeight: 18,
      marginTop: 9,
    },

    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },

    statusBadgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 5,
    },

    statusBadgeText: {
      fontSize: 10,
      fontWeight: "700",
    },

    actionsRow: {
      flexDirection: "row",
      marginTop: 12,
    },

    takenButton: {
      flex: 1,
      backgroundColor:
        SUCCESS,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 9,
      flexDirection: "row",
      overflow: "hidden",
      ...elevate(1),
    },

    takenButtonText: {
      color: SURFACE,
      fontSize: 14,
      fontWeight: "700",
      marginLeft: 6,
    },

    snoozeButton: {
      flex: 1,
      backgroundColor:
        PRIMARY_CONTAINER,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent:
        "center",
      flexDirection: "row",
      overflow: "hidden",
    },

    snoozeButtonText: {
      color:
        ON_PRIMARY_CONTAINER,
      fontSize: 14,
      fontWeight: "700",
      marginLeft: 6,
    },

    removeMedicineButton: {
      minHeight: 40,
      borderRadius: 11,
      backgroundColor:
        DANGER_CONTAINER,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      marginTop: 10,
      paddingHorizontal: 10,
    },

    removeMedicineButtonText: {
      color:
        ON_DANGER_CONTAINER,
      fontSize: 11,
      fontWeight: "700",
      marginLeft: 6,
    },

    removalPendingPanel: {
      backgroundColor:
        WARNING_CONTAINER,
      borderRadius: 12,
      padding: 10,
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
    },

    removalPendingIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor:
        SURFACE,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 9,
    },

    removalPendingTextBlock: {
      flex: 1,
      paddingRight: 8,
    },

    removalPendingTitle: {
      color:
        ON_WARNING_CONTAINER,
      fontSize: 11,
      fontWeight: "700",
    },

    removalPendingText: {
      color:
        ON_WARNING_CONTAINER,
      fontSize: 10,
      fontWeight: "500",
      lineHeight: 15,
      marginTop: 2,
    },

    disabledButton: {
      opacity: 0.55,
    },

    disabledActionButton: {
      backgroundColor:
        DISABLED_CONTAINER,
      elevation: 0,
      shadowOpacity: 0,
    },

    disabledActionText: {
      color: DISABLED_TEXT,
    },

    missedHelpPanel: {
      backgroundColor:
        DANGER_CONTAINER,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 10,
    },

    missedHelpText: {
      color:
        ON_DANGER_CONTAINER,
      fontSize: 11,
      fontWeight: "500",
      lineHeight: 17,
    },

    snoozedHelpPanel: {
      backgroundColor:
        PRIMARY_CONTAINER,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 10,
    },

    snoozedHelpText: {
      color:
        ON_PRIMARY_CONTAINER,
      fontSize: 11,
      fontWeight: "500",
      lineHeight: 17,
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor:
        "rgba(17,25,54,0.48)",
      justifyContent:
        "center",
      paddingHorizontal: 20,
    },

    modalCard: {
      backgroundColor:
        SURFACE,
      borderRadius: 18,
      padding: 17,
      ...elevate(3),
    },

    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    modalHeaderText: {
      flex: 1,
      paddingRight: 12,
    },

    modalTitle: {
      color: TEXT,
      fontSize: 19,
      fontWeight: "700",
    },

    modalSubtitle: {
      color: MUTED,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 3,
    },

    modalCloseButton: {
      width: 39,
      height: 39,
      borderRadius: 12,
      backgroundColor:
        SOFT_PANEL,
      alignItems: "center",
      justifyContent:
        "center",
    },

    modalWarningPanel: {
      backgroundColor:
        WARNING_CONTAINER,
      borderRadius: 12,
      padding: 11,
      marginTop: 15,
      flexDirection: "row",
      alignItems:
        "flex-start",
    },

    modalWarningText: {
      flex: 1,
      color:
        ON_WARNING_CONTAINER,
      fontSize: 11,
      fontWeight: "500",
      lineHeight: 17,
      marginLeft: 8,
    },

    modalInputLabel: {
      color: TEXT,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 17,
      marginBottom: 7,
    },

    removalReasonInput: {
      minHeight: 125,
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        SURFACE_VARIANT,
      backgroundColor:
        SOFT_PANEL,
      color: TEXT,
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 19,
      padding: 12,
    },

    characterCount: {
      color: MUTED,
      fontSize: 10,
      fontWeight: "600",
      textAlign: "right",
      marginTop: 5,
    },

    modalActions: {
      flexDirection: "row",
      marginTop: 15,
    },

    modalCancelButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 12,
      backgroundColor:
        SOFT_PANEL,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 7,
    },

    modalCancelText: {
      color: TEXT,
      fontSize: 13,
      fontWeight: "700",
    },

    modalSubmitButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 12,
      backgroundColor:
        DANGER,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 7,
    },

    modalSubmitText: {
      color: SURFACE,
      fontSize: 13,
      fontWeight: "700",
      marginLeft: 6,
    },
  });

export default MedicinesScreen;