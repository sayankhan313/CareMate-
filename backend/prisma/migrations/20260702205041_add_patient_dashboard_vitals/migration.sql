-- CreateEnum
CREATE TYPE "VitalStatus" AS ENUM ('STABLE', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "VitalSource" AS ENUM ('HEALTH_CONNECT', 'SIMULATED', 'MANUAL');

-- CreateEnum
CREATE TYPE "MedicineOrderStatus" AS ENUM ('RECEIVED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PatientVitalReading" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "heartRate" INTEGER,
    "spo2" INTEGER,
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "glucose" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "status" "VitalStatus" NOT NULL,
    "source" "VitalSource" NOT NULL,
    "deviceSource" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientVitalReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientDoctorNote" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientDoctorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineOrder" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "MedicineOrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientVitalReading_patientId_idx" ON "PatientVitalReading"("patientId");

-- CreateIndex
CREATE INDEX "PatientVitalReading_recordedAt_idx" ON "PatientVitalReading"("recordedAt");

-- CreateIndex
CREATE INDEX "PatientVitalReading_status_idx" ON "PatientVitalReading"("status");

-- CreateIndex
CREATE INDEX "PatientDoctorNote_patientId_idx" ON "PatientDoctorNote"("patientId");

-- CreateIndex
CREATE INDEX "PatientDoctorNote_createdAt_idx" ON "PatientDoctorNote"("createdAt");

-- CreateIndex
CREATE INDEX "MedicineOrder_patientId_idx" ON "MedicineOrder"("patientId");

-- CreateIndex
CREATE INDEX "MedicineOrder_status_idx" ON "MedicineOrder"("status");

-- AddForeignKey
ALTER TABLE "PatientVitalReading" ADD CONSTRAINT "PatientVitalReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDoctorNote" ADD CONSTRAINT "PatientDoctorNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrder" ADD CONSTRAINT "MedicineOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
