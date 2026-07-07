import AsyncStorage from "@react-native-async-storage/async-storage";

import { healthConnectService } from "./healthConnectService";
import { vitalsApi } from "./vitalsApi";
import type { CreateVitalReadingPayload, VitalReading } from "../types/vitals";

const LAST_HEALTH_CONNECT_SIGNATURE_KEY =
  "@caremate_last_health_connect_signature";

const normaliseValue = (value?: number | null) => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  return null;
};

const toPayloadValue = (value?: number | null) => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  return undefined;
};

const buildHealthConnectSignature = (payload: CreateVitalReadingPayload) => {
  return JSON.stringify({
    source: payload.source,
    deviceSource: payload.deviceSource || null,
    recordedAt: payload.recordedAt || null,
    heartRate: normaliseValue(payload.heartRate),
    spo2: normaliseValue(payload.spo2),
    bpSystolic: normaliseValue(payload.bpSystolic),
    bpDiastolic: normaliseValue(payload.bpDiastolic),
    glucose: normaliseValue(payload.glucose),
    temperature: normaliseValue(payload.temperature),
  });
};

const getTimeValue = (value?: string | null) => {
  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
};

const mergeHealthConnectPayloadWithLastKnownVitals = (
  payload: CreateVitalReadingPayload,
  latestBackendReading: VitalReading | null
): CreateVitalReadingPayload => {
  if (!latestBackendReading) {
    return payload;
  }

  const mergedPayload: CreateVitalReadingPayload = {
    ...payload,

    heartRate:
      payload.heartRate !== undefined
        ? payload.heartRate
        : toPayloadValue(latestBackendReading.heartRate),

    spo2:
      payload.spo2 !== undefined
        ? payload.spo2
        : toPayloadValue(latestBackendReading.spo2),

    bpSystolic:
      payload.bpSystolic !== undefined
        ? payload.bpSystolic
        : toPayloadValue(latestBackendReading.bpSystolic),

    bpDiastolic:
      payload.bpDiastolic !== undefined
        ? payload.bpDiastolic
        : toPayloadValue(latestBackendReading.bpDiastolic),

    glucose:
      payload.glucose !== undefined
        ? payload.glucose
        : toPayloadValue(latestBackendReading.glucose),

    temperature:
      payload.temperature !== undefined
        ? payload.temperature
        : toPayloadValue(latestBackendReading.temperature),

    deviceSource: payload.deviceSource
      ? `${payload.deviceSource} + last known vitals`
      : "Android Health Connect + last known vitals",
  };

  return mergedPayload;
};

export const vitalsSyncService = {
  async syncLatestVitalsFromHealthConnect(): Promise<VitalReading | null> {
    const healthConnectPayload =
      await healthConnectService.readLatestVitalsFromHealthConnect();

    const latestBackendReading = await vitalsApi.getLatestReading();

    const healthConnectTime = getTimeValue(healthConnectPayload.recordedAt);
    const backendLatestTime = getTimeValue(latestBackendReading?.recordedAt);

    if (latestBackendReading && healthConnectTime <= backendLatestTime) {
      console.log(
        "Health Connect sync skipped: Health Connect reading is older than latest backend reading."
      );

      return null;
    }

    const mergedPayload = mergeHealthConnectPayloadWithLastKnownVitals(
      healthConnectPayload,
      latestBackendReading
    );

    const currentSignature = buildHealthConnectSignature(mergedPayload);

    const previousSignature = await AsyncStorage.getItem(
      LAST_HEALTH_CONNECT_SIGNATURE_KEY
    );

    if (previousSignature === currentSignature) {
      console.log(
        "Health Connect sync skipped: latest Health Connect reading is already saved."
      );

      return null;
    }

    const savedReading = await vitalsApi.createReading(mergedPayload);

    await AsyncStorage.setItem(
      LAST_HEALTH_CONNECT_SIGNATURE_KEY,
      currentSignature
    );

    return savedReading;
  },

  async resetHealthConnectSignature() {
    await AsyncStorage.removeItem(LAST_HEALTH_CONNECT_SIGNATURE_KEY);
  },
};
