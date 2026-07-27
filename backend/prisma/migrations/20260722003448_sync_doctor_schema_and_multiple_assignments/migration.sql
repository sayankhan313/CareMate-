-- CreateEnum
CREATE TYPE "PatientDoctorAssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DoctorAssignmentType" AS ENUM ('PRIMARY', 'SPECIALIST');

-- AlterTable
ALTER TABLE "PatientDoctorNote" ADD COLUMN     "doctorId" TEXT;

-- CreateTable
CREATE TABLE "PatientDoctorAssignment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "assignmentType" "DoctorAssignmentType" NOT NULL DEFAULT 'SPECIALIST',
    "status" "PatientDoctorAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientDoctorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientDoctorAssignment_patientId_idx" ON "PatientDoctorAssignment"("patientId");

-- CreateIndex
CREATE INDEX "PatientDoctorAssignment_doctorId_idx" ON "PatientDoctorAssignment"("doctorId");

-- CreateIndex
CREATE INDEX "PatientDoctorAssignment_patientId_status_idx" ON "PatientDoctorAssignment"("patientId", "status");

-- CreateIndex
CREATE INDEX "PatientDoctorAssignment_doctorId_status_idx" ON "PatientDoctorAssignment"("doctorId", "status");

-- CreateIndex
CREATE INDEX "PatientDoctorAssignment_patientId_assignmentType_idx" ON "PatientDoctorAssignment"("patientId", "assignmentType");

-- CreateIndex
CREATE UNIQUE INDEX "PatientDoctorAssignment_patientId_doctorId_key" ON "PatientDoctorAssignment"("patientId", "doctorId");

-- AddForeignKey
ALTER TABLE "PatientDoctorAssignment" ADD CONSTRAINT "PatientDoctorAssignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDoctorAssignment" ADD CONSTRAINT "PatientDoctorAssignment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
