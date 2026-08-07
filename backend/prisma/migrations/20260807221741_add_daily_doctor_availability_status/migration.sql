-- CreateEnum
CREATE TYPE "DoctorAvailabilityStatus" AS ENUM ('AVAILABLE', 'OUT_OF_OFFICE', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "DoctorAvailability" ADD COLUMN     "status" "DoctorAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
ALTER COLUMN "startTime" DROP NOT NULL,
ALTER COLUMN "endTime" DROP NOT NULL,
ALTER COLUMN "slotDurationMinutes" DROP NOT NULL,
ALTER COLUMN "slotDurationMinutes" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "DoctorAvailability_doctorId_status_idx" ON "DoctorAvailability"("doctorId", "status");
