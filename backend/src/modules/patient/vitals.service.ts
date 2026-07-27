import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

import type {
  CreateVitalReadingInput,
  VitalHistoryQueryInput,
  VitalStatus,
} from "./vitals.types.js";

const parseRecordedAt = (recordedAt?: string) => {
  if (!recordedAt) {
    return new Date();
  }

  const parsedDate = new Date(recordedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError("Please provide a valid recordedAt date/time.", 400);
  }

  return parsedDate;
};

const classifyVitalReading = (data: CreateVitalReadingInput): VitalStatus => {
  const isCritical =
    (data.heartRate !== undefined &&
      (data.heartRate < 40 || data.heartRate >= 130)) ||
    (data.spo2 !== undefined && data.spo2 < 90) ||
    (data.bpSystolic !== undefined && data.bpSystolic >= 180) ||
    (data.bpDiastolic !== undefined && data.bpDiastolic >= 120) ||
    (data.temperature !== undefined && data.temperature >= 39) ||
    (data.glucose !== undefined && (data.glucose < 54 || data.glucose >= 250));

  if (isCritical) {
    return "CRITICAL";
  }

  const isWarning =
    (data.heartRate !== undefined &&
      (data.heartRate < 50 || data.heartRate > 110)) ||
    (data.spo2 !== undefined && data.spo2 < 94) ||
    (data.bpSystolic !== undefined && data.bpSystolic >= 140) ||
    (data.bpDiastolic !== undefined && data.bpDiastolic >= 90) ||
    (data.temperature !== undefined && data.temperature >= 37.8) ||
    (data.glucose !== undefined && (data.glucose < 70 || data.glucose >= 180));

  if (isWarning) {
    return "WARNING";
  }

  return "STABLE";
};

const formatVitalReading = (reading: any) => {
  return {
    id: reading.id,
    heartRate: reading.heartRate,
    spo2: reading.spo2,
    bpSystolic: reading.bpSystolic,
    bpDiastolic: reading.bpDiastolic,
    glucose: reading.glucose,
    temperature: reading.temperature,
    status: reading.status,
    source: reading.source,
    deviceSource: reading.deviceSource,
    recordedAt: reading.recordedAt,
    createdAt: reading.createdAt,
  };
};

export const vitalsService = {
  async createReading(patientId: string, data: CreateVitalReadingInput) {
    const status = classifyVitalReading(data);
    const recordedAt = parseRecordedAt(data.recordedAt);

    const reading = await prisma.patientVitalReading.create({
      data: {
        patientId,
        heartRate: data.heartRate ?? null,
        spo2: data.spo2 ?? null,
        bpSystolic: data.bpSystolic ?? null,
        bpDiastolic: data.bpDiastolic ?? null,
        glucose: data.glucose ?? null,
        temperature: data.temperature ?? null,
        status,
        source: data.source,
        deviceSource: data.deviceSource?.trim() || null,
        recordedAt,
      },
    });

    return formatVitalReading(reading);
  },

  async getLatestReading(patientId: string) {
    const reading = await prisma.patientVitalReading.findFirst({
      where: {
        patientId,
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    if (!reading) {
      return null;
    }

    return formatVitalReading(reading);
  },

  async getReadingHistory(patientId: string, query: VitalHistoryQueryInput) {
    const readings = await prisma.patientVitalReading.findMany({
      where: {
        patientId,
      },
      orderBy: {
        recordedAt: "desc",
      },
      take: query.limit,
    });

    return readings.map(formatVitalReading);
  },
};