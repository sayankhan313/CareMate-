export type VitalStatus = "STABLE" | "WARNING" | "CRITICAL" | "NO_DATA";

export type VitalSource = "HEALTH_CONNECT" | "SIMULATED" | "MANUAL";

export type VitalReading = {
  id: string;
  heartRate: number | null;
  spo2: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  glucose: number | null;
  temperature: number | null;
  status: VitalStatus;
  source: VitalSource;
  deviceSource: string | null;
  recordedAt: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateVitalReadingPayload = {
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

export type VitalSimulationMode = "NORMAL" | "WARNING" | "CRITICAL";