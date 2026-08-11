-- CreateEnum
CREATE TYPE "DoctorOperationalStatus" AS ENUM ('AVAILABLE', 'OUT_OF_OFFICE', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN     "operationalStatus" "DoctorOperationalStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "statusFrom" TIMESTAMP(3),
ADD COLUMN     "statusNote" TEXT,
ADD COLUMN     "statusUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DoctorAvailability" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorAvailability_doctorId_date_idx" ON "DoctorAvailability"("doctorId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorAvailability_doctorId_date_key" ON "DoctorAvailability"("doctorId", "date");

-- CreateIndex
CREATE INDEX "DoctorProfile_operationalStatus_idx" ON "DoctorProfile"("operationalStatus");

-- AddForeignKey
ALTER TABLE "DoctorAvailability" ADD CONSTRAINT "DoctorAvailability_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
