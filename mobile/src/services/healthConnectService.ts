import { Platform } from "react-native";
import {
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
} from "react-native-health-connect";

import type { CreateVitalReadingPayload } from "../types/vitals";

const VITALS_PERMISSIONS = [
  {
    accessType: "read",
    recordType: "HeartRate",
  },
  {
    accessType: "read",
    recordType: "OxygenSaturation",
  },
  {
    accessType: "read",
    recordType: "BloodPressure",
  },
  {
    accessType: "read",
    recordType: "BloodGlucose",
  },
  {
    accessType: "read",
    recordType: "BodyTemperature",
  },
] as any[];

const LATEST_VITAL_GROUP_WINDOW_MS = 10 * 60 * 1000;

type HealthConnectValueResult = {
  value?: number;
  recordedAt?: string;
  recordType: string | null;
  sourceName: string;
};

type HealthConnectBloodPressureResult = {
  systolic?: number;
  diastolic?: number;
  recordedAt?: string;
  recordType: string | null;
  sourceName: string;
};

const getRecordsArray = (response: any): any[] => {
  if (Array.isArray(response?.records)) {
    return response.records;
  }

  if (Array.isArray(response?.result)) {
    return response.result;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const getRecordDate = (record: any): string | undefined => {
  if (!record) {
    return undefined;
  }

  return (
    record?.endTime ||
    record?.time ||
    record?.startTime ||
    record?.metadata?.lastModifiedTime
  );
};

const getTimeValue = (date?: string | null): number => {
  if (!date) {
    return 0;
  }

  const time = new Date(date).getTime();

  return Number.isNaN(time) ? 0 : time;
};

const getLatestRecord = (records: any[]): any | undefined => {
  return records
    .filter(Boolean)
    .sort((first: any, second: any) => {
      const firstDate = getTimeValue(getRecordDate(first));
      const secondDate = getTimeValue(getRecordDate(second));

      return secondDate - firstDate;
    })[0];
};

const getLatestRecordTime = (
  ...dates: (string | undefined | null)[]
): string | undefined => {
  const validDates = dates.filter((date): date is string => Boolean(date));

  if (validDates.length === 0) {
    return undefined;
  }

  return validDates.sort((first: string, second: string) => {
    return getTimeValue(second) - getTimeValue(first);
  })[0];
};

const isWithinLatestVitalGroup = (
  vitalRecordedAt: string | undefined,
  latestRecordedAt: string
): boolean => {
  if (!vitalRecordedAt) {
    return false;
  }

  const vitalTime = getTimeValue(vitalRecordedAt);
  const latestTime = getTimeValue(latestRecordedAt);

  if (!vitalTime || !latestTime) {
    return false;
  }

  return latestTime - vitalTime <= LATEST_VITAL_GROUP_WINDOW_MS;
};

const getNumberValue = (...values: any[]): number | undefined => {
  for (const value of values) {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsedValue = Number(value);

      if (!Number.isNaN(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return undefined;
};

const getNumberFromNestedObject = (value: any): number | undefined => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsedValue = Number(value);

    if (!Number.isNaN(parsedValue)) {
      return parsedValue;
    }
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const priorityKeys = [
    "inMillimolesPerLiter",
    "inMillimolesPerLitre",
    "millimolesPerLiter",
    "millimolesPerLitre",
    "mmolPerL",
    "mmolPerLiter",
    "mmolPerLitre",
    "mmoll",

    "inMilligramsPerDeciliter",
    "inMilligramsPerDecilitre",
    "milligramsPerDeciliter",
    "milligramsPerDecilitre",
    "mgPerdL",
    "mgPerDl",
    "mgdl",

    "inMillimetersOfMercury",
    "millimetersOfMercury",
    "mmHg",

    "inCelsius",
    "celsius",
    "degreesCelsius",

    "beatsPerMinute",
    "bpm",
    "value",
  ];

  for (const key of priorityKeys) {
    const nestedValue = value[key];
    const parsedValue = getNumberValue(nestedValue);

    if (parsedValue !== undefined) {
      return parsedValue;
    }
  }

  for (const nestedValue of Object.values(value)) {
    const parsedValue = getNumberFromNestedObject(nestedValue);

    if (parsedValue !== undefined) {
      return parsedValue;
    }
  }

  return undefined;
};

const getDataOriginPackage = (record: any): string => {
  const packageName =
    record?.metadata?.dataOrigin?.packageName ||
    record?.metadata?.dataOrigin ||
    record?.metadata?.clientRecordId ||
    "";

  return typeof packageName === "string" ? packageName : "";
};

const getSourceNameFromPackage = (packageName: string): string => {
  const lowerPackageName = packageName.toLowerCase();

  if (lowerPackageName.includes("toolbox")) {
    return "Health Connect Toolbox";
  }

  if (lowerPackageName.includes("samsung")) {
    return "Samsung Health";
  }

  if (lowerPackageName.includes("google")) {
    return "Google health source";
  }

  if (packageName.trim()) {
    return packageName;
  }

  return "";
};

const getSourceNameFromRecords = (records: any[]): string => {
  const latestRecord = getLatestRecord(records);
  const packageName = getDataOriginPackage(latestRecord);

  return getSourceNameFromPackage(packageName);
};

const readRecordsForType = async (
  recordType: string,
  startTime: string,
  endTime: string
) => {
  const response = await readRecords(recordType as any, {
    timeRangeFilter: {
      operator: "between",
      startTime,
      endTime,
    },
  } as any);

  const records = getRecordsArray(response);

  console.log(`Health Connect ${recordType} records:`, records.length);

  return {
    recordType,
    records,
    sourceName: getSourceNameFromRecords(records),
  };
};

const readRecordsWithFallback = async (
  recordTypes: string[],
  startTime: string,
  endTime: string
) => {
  let lastError: unknown = null;

  for (const recordType of recordTypes) {
    try {
      const result = await readRecordsForType(recordType, startTime, endTime);

      if (result.records.length > 0) {
        return result;
      }
    } catch (error) {
      lastError = error;
      console.log(`Health Connect ${recordType} read error:`, error);
    }
  }

  if (lastError) {
    console.log("Health Connect fallback final error:", lastError);
  }

  return {
    recordType: null,
    records: [],
    sourceName: "",
  };
};

const parseHeartRateRecord = (
  record: any,
  recordType: string | null,
  sourceName: string
): HealthConnectValueResult => {
  const directHeartRate = getNumberValue(
    record?.beatsPerMinute,
    record?.beatsPerMinute?.value,
    record?.bpm,
    record?.bpm?.value,
    record?.heartRate,
    record?.heartRate?.beatsPerMinute,
    record?.heartRate?.bpm,
    record?.heartRate?.value,
    record?.averageBeatsPerMinute,
    record?.beatsPerMinuteAverage,
    record?.averageBpm,
    record?.bpmAverage,
    record?.bpmAvg,
    record?.BPM_AVG,
    record?.avg,
    record?.avg?.beatsPerMinute,
    record?.avg?.bpm,
    record?.value
  );

  if (directHeartRate !== undefined) {
    return {
      value: Math.round(directHeartRate),
      recordedAt: getRecordDate(record),
      recordType,
      sourceName,
    };
  }

  const samples: any[] = Array.isArray(record?.samples) ? record.samples : [];

  const sampleValues: number[] = samples
    .map((sample: any): number | undefined =>
      getNumberValue(
        sample?.beatsPerMinute,
        sample?.beatsPerMinute?.value,
        sample?.bpm,
        sample?.bpm?.value,
        sample?.value
      )
    )
    .filter((value: number | undefined): value is number => {
      return value !== undefined;
    });

  const latestSample = samples
    .filter(Boolean)
    .sort((first: any, second: any) => {
      return getTimeValue(second?.time) - getTimeValue(first?.time);
    })?.[0];

  if (sampleValues.length > 0) {
    const averageHeartRate =
      sampleValues.reduce((total: number, value: number) => {
        return total + value;
      }, 0) / sampleValues.length;

    return {
      value: Math.round(averageHeartRate),
      recordedAt: latestSample?.time || getRecordDate(record),
      recordType,
      sourceName,
    };
  }

  return {
    value: undefined,
    recordedAt: getRecordDate(record),
    recordType,
    sourceName,
  };
};

const readLatestHeartRate = async (
  startTime: string,
  endTime: string
): Promise<HealthConnectValueResult> => {
  const recordTypes = ["HeartRate", "HeartRateSeries", "RestingHeartRate"];
  const parsedResults: HealthConnectValueResult[] = [];

  for (const recordType of recordTypes) {
    try {
      const result = await readRecordsForType(recordType, startTime, endTime);

      if (result.records.length === 0) {
        continue;
      }

      const latestRecord = getLatestRecord(result.records);

      console.log(
        `Latest ${recordType} record:`,
        JSON.stringify(latestRecord, null, 2)
      );

      const parsed = parseHeartRateRecord(
        latestRecord,
        result.recordType,
        result.sourceName
      );

      if (parsed.value !== undefined) {
        parsedResults.push(parsed);
      }
    } catch (error) {
      console.log(`Health Connect ${recordType} read error:`, error);
    }
  }

  const latestParsedHeartRate = parsedResults.sort(
    (first: HealthConnectValueResult, second: HealthConnectValueResult) => {
      return getTimeValue(second.recordedAt) - getTimeValue(first.recordedAt);
    }
  )[0];

  if (latestParsedHeartRate) {
    console.log("Parsed heart rate:", latestParsedHeartRate);

    return latestParsedHeartRate;
  }

  return {
    value: undefined,
    recordedAt: undefined,
    recordType: null,
    sourceName: "",
  };
};

const readLatestSpo2 = async (
  startTime: string,
  endTime: string
): Promise<HealthConnectValueResult> => {
  const result = await readRecordsWithFallback(
    ["OxygenSaturation"],
    startTime,
    endTime
  );

  const latestRecord = getLatestRecord(result.records);

  const rawValue = getNumberValue(
    latestRecord?.percentage,
    latestRecord?.percentage?.value,
    latestRecord?.percentage?.inPercent,
    latestRecord?.percentage?.inPercentage
  );

  if (rawValue === undefined) {
    return {
      value: undefined,
      recordedAt: getRecordDate(latestRecord),
      recordType: result.recordType,
      sourceName: result.sourceName,
    };
  }

  return {
    value: rawValue <= 1 ? Math.round(rawValue * 100) : Math.round(rawValue),
    recordedAt: getRecordDate(latestRecord),
    recordType: result.recordType,
    sourceName: result.sourceName,
  };
};

const readLatestBloodPressure = async (
  startTime: string,
  endTime: string
): Promise<HealthConnectBloodPressureResult> => {
  const result = await readRecordsWithFallback(
    ["BloodPressure"],
    startTime,
    endTime
  );

  const latestRecord = getLatestRecord(result.records);

  const systolic = getNumberFromNestedObject(latestRecord?.systolic);
  const diastolic = getNumberFromNestedObject(latestRecord?.diastolic);

  return {
    systolic: systolic !== undefined ? Math.round(systolic) : undefined,
    diastolic: diastolic !== undefined ? Math.round(diastolic) : undefined,
    recordedAt: getRecordDate(latestRecord),
    recordType: result.recordType,
    sourceName: result.sourceName,
  };
};

const readLatestGlucose = async (
  startTime: string,
  endTime: string
): Promise<HealthConnectValueResult> => {
  const result = await readRecordsWithFallback(
    ["BloodGlucose"],
    startTime,
    endTime
  );

  const latestRecord = getLatestRecord(result.records);

  console.log("BloodGlucose records count:", result.records.length);
  console.log(
    "Latest glucose record full:",
    JSON.stringify(latestRecord, null, 2)
  );
  console.log(
    "Latest glucose level field:",
    JSON.stringify(latestRecord?.level, null, 2)
  );

  const rawLevel =
    getNumberFromNestedObject(latestRecord?.level) ??
    getNumberFromNestedObject(latestRecord?.bloodGlucose) ??
    getNumberFromNestedObject(latestRecord?.glucose) ??
    getNumberFromNestedObject(latestRecord?.concentration) ??
    getNumberValue(
      latestRecord?.level,
      latestRecord?.bloodGlucose,
      latestRecord?.glucose,
      latestRecord?.concentration,
      latestRecord?.value
    );

  if (rawLevel === undefined) {
    console.log(
      "BloodGlucose read found record but glucose value was undefined."
    );

    return {
      value: undefined,
      recordedAt: getRecordDate(latestRecord),
      recordType: result.recordType,
      sourceName: result.sourceName,
    };
  }

  const glucoseMgDl = rawLevel <= 35 ? rawLevel * 18.0182 : rawLevel;

  console.log("Parsed glucose:", {
    rawLevel,
    glucoseMgDl: Math.round(glucoseMgDl),
  });

  return {
    value: Math.round(glucoseMgDl),
    recordedAt: getRecordDate(latestRecord),
    recordType: result.recordType,
    sourceName: result.sourceName,
  };
};

const readLatestTemperature = async (
  startTime: string,
  endTime: string
): Promise<HealthConnectValueResult> => {
  const result = await readRecordsWithFallback(
    ["BodyTemperature", "SkinTemperature", "BasalBodyTemperature"],
    startTime,
    endTime
  );

  const latestRecord = getLatestRecord(result.records);

  const temperature =
    getNumberFromNestedObject(latestRecord?.temperature) ??
    getNumberValue(
      latestRecord?.temperature,
      latestRecord?.temperature?.value,
      latestRecord?.temperature?.inCelsius,
      latestRecord?.temperature?.celsius
    );

  return {
    value:
      temperature !== undefined ? Number(temperature.toFixed(1)) : undefined,
    recordedAt: getRecordDate(latestRecord),
    recordType: result.recordType,
    sourceName: result.sourceName,
  };
};

export const healthConnectService = {
  async initializeHealthConnect() {
    if (Platform.OS !== "android") {
      throw new Error("Health Connect is only available on Android.");
    }

    const isInitialized = await initialize();

    if (!isInitialized) {
      throw new Error("Health Connect is not available on this device.");
    }

    return isInitialized;
  },

  async requestVitalsPermission() {
    await this.initializeHealthConnect();

    const grantedPermissions = await requestPermission(VITALS_PERMISSIONS);

    return grantedPermissions;
  },

  async openSettings() {
    await openHealthConnectSettings();
  },

  async readLatestVitalsFromHealthConnect(): Promise<CreateVitalReadingPayload> {
    await this.requestVitalsPermission();

    const endDate = new Date();
    const startDate = new Date();

    startDate.setDate(startDate.getDate() - 7);
    endDate.setDate(endDate.getDate() + 2);

    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();

    console.log("Health Connect read range:", {
      startTime,
      endTime,
    });

    const [heartRate, spo2, bloodPressure, glucose, temperature] =
      await Promise.all([
        readLatestHeartRate(startTime, endTime).catch((error) => {
          console.log("Heart rate read error:", error);

          return undefined;
        }),
        readLatestSpo2(startTime, endTime).catch((error) => {
          console.log("SpO2 read error:", error);

          return undefined;
        }),
        readLatestBloodPressure(startTime, endTime).catch((error) => {
          console.log("Blood pressure read error:", error);

          return undefined;
        }),
        readLatestGlucose(startTime, endTime).catch((error) => {
          console.log("Glucose read error:", error);

          return undefined;
        }),
        readLatestTemperature(startTime, endTime).catch((error) => {
          console.log("Temperature read error:", error);

          return undefined;
        }),
      ]);

    const healthConnectRecordedAt =
      getLatestRecordTime(
        heartRate?.recordedAt,
        spo2?.recordedAt,
        bloodPressure?.recordedAt,
        glucose?.recordedAt,
        temperature?.recordedAt
      ) || new Date().toISOString();

    const shouldUseHeartRate = isWithinLatestVitalGroup(
      heartRate?.recordedAt,
      healthConnectRecordedAt
    );

    const shouldUseSpo2 = isWithinLatestVitalGroup(
      spo2?.recordedAt,
      healthConnectRecordedAt
    );

    const shouldUseBloodPressure = isWithinLatestVitalGroup(
      bloodPressure?.recordedAt,
      healthConnectRecordedAt
    );

    const shouldUseGlucose = isWithinLatestVitalGroup(
      glucose?.recordedAt,
      healthConnectRecordedAt
    );

    const shouldUseTemperature = isWithinLatestVitalGroup(
      temperature?.recordedAt,
      healthConnectRecordedAt
    );

    const detectedRecordTypes = [
      shouldUseHeartRate ? heartRate?.recordType : null,
      shouldUseSpo2 ? spo2?.recordType : null,
      shouldUseBloodPressure ? bloodPressure?.recordType : null,
      shouldUseGlucose ? glucose?.recordType : null,
      shouldUseTemperature ? temperature?.recordType : null,
    ].filter((recordType): recordType is string => Boolean(recordType));

    const detectedSourceNames = [
      shouldUseHeartRate ? heartRate?.sourceName : null,
      shouldUseSpo2 ? spo2?.sourceName : null,
      shouldUseBloodPressure ? bloodPressure?.sourceName : null,
      shouldUseGlucose ? glucose?.sourceName : null,
      shouldUseTemperature ? temperature?.sourceName : null,
    ].filter((sourceName): sourceName is string => Boolean(sourceName));

    const uniqueSourceNames = Array.from(new Set(detectedSourceNames));

    const getDeviceSource = () => {
      if (uniqueSourceNames.length > 0) {
        return `${uniqueSourceNames.join(", ")} via Android Health Connect`;
      }

      if (detectedRecordTypes.length > 0) {
        return `Android Health Connect (${detectedRecordTypes.join(", ")})`;
      }

      return "Android Health Connect";
    };

    const payload: CreateVitalReadingPayload = {
      source: "HEALTH_CONNECT",
      deviceSource: getDeviceSource(),
      recordedAt: healthConnectRecordedAt,
    };

    if (shouldUseHeartRate && heartRate?.value !== undefined) {
      payload.heartRate = Math.round(heartRate.value);
    }

    if (shouldUseSpo2 && spo2?.value !== undefined) {
      payload.spo2 = Math.round(spo2.value);
    }

    if (
      shouldUseBloodPressure &&
      bloodPressure?.systolic !== undefined &&
      bloodPressure?.diastolic !== undefined
    ) {
      payload.bpSystolic = bloodPressure.systolic;
      payload.bpDiastolic = bloodPressure.diastolic;
    }

    if (shouldUseGlucose && glucose?.value !== undefined) {
      payload.glucose = Math.round(glucose.value);
    }

    if (shouldUseTemperature && temperature?.value !== undefined) {
      payload.temperature = Number(temperature.value.toFixed(1));
    }

    const hasAnyVital =
      payload.heartRate !== undefined ||
      payload.spo2 !== undefined ||
      payload.bpSystolic !== undefined ||
      payload.bpDiastolic !== undefined ||
      payload.glucose !== undefined ||
      payload.temperature !== undefined;

    if (!hasAnyVital) {
      throw new Error(
        "No new vitals found in Health Connect. Add latest demo data using Health Connect Toolbox first."
      );
    }

    console.log("Health Connect grouped times:", {
      healthConnectRecordedAt,
      heartRateRecordedAt: heartRate?.recordedAt,
      spo2RecordedAt: spo2?.recordedAt,
      bloodPressureRecordedAt: bloodPressure?.recordedAt,
      glucoseRecordedAt: glucose?.recordedAt,
      temperatureRecordedAt: temperature?.recordedAt,
      shouldUseHeartRate,
      shouldUseSpo2,
      shouldUseBloodPressure,
      shouldUseGlucose,
      shouldUseTemperature,
    });

    console.log("Health Connect payload:", payload);

    return payload;
  },
};