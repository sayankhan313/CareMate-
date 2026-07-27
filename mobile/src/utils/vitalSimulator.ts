import type {
  CreateVitalReadingPayload,
  VitalSimulationMode,
} from "../types/vitals";

export const getSimulatedVitalReading = (
  mode: VitalSimulationMode
): CreateVitalReadingPayload => {
  if (mode === "WARNING") {
    return {
      heartRate: 112,
      spo2: 93,
      bpSystolic: 145,
      bpDiastolic: 92,
      glucose: 185,
      temperature: 38,
      source: "SIMULATED",
      deviceSource: "CareMate Watch Simulator",
      recordedAt: new Date().toISOString(),
    };
  }

  if (mode === "CRITICAL") {
    return {
      heartRate: 135,
      spo2: 88,
      bpSystolic: 180,
      bpDiastolic: 120,
      glucose: 260,
      temperature: 39.2,
      source: "SIMULATED",
      deviceSource: "CareMate Watch Simulator",
      recordedAt: new Date().toISOString(),
    };
  }

  return {
    heartRate: 82,
    spo2: 97,
    bpSystolic: 125,
    bpDiastolic: 82,
    glucose: 145,
    temperature: 36.8,
    source: "SIMULATED",
    deviceSource: "CareMate Watch Simulator",
    recordedAt: new Date().toISOString(),
  };
};