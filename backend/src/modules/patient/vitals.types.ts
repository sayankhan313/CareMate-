export type VitalStatus = "STABLE" | "WARNING" | "CRITICAL";

export type VitalSource = "HEALTH_CONNECT" | "SIMULATED" | "MANUAL";

export type CreateVitalReadingInput = {
  heartRate?: number;
  spo2?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  glucose?: number;
  temperature?: number;
  source: VitalSource;
  deviceSource?: string;
  recordedAt?: string;
};

export type VitalHistoryQueryInput = {
  limit: number;
};