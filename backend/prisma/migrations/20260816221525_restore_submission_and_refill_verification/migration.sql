-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'REFILL_DOCTOR_VERIFICATION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'REFILL_DOCTOR_VERIFICATION_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'REFILL_DOCTOR_VERIFICATION_REJECTED';

-- AlterTable
ALTER TABLE "PatientPrescriptionSubmission" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "doctorVerificationNote" TEXT,
ADD COLUMN     "doctorVerificationRequestedAt" TIMESTAMP(3),
ADD COLUMN     "doctorVerificationStatus" "PatientRefillDoctorVerificationStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "doctorVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "evidenceType" "PatientMedicineEvidenceType",
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "ocrConfidence" DOUBLE PRECISION,
ADD COLUMN     "rawDetectedText" TEXT,
ADD COLUMN     "requestType" "PatientPharmacyRequestType" NOT NULL DEFAULT 'PRESCRIPTION_UPLOAD',
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "status" "PatientPrescriptionSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "verificationPath" "PatientRefillVerificationPath";

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmission_patientId_status_idx" ON "PatientPrescriptionSubmission"("patientId", "status");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmission_pharmacyId_status_idx" ON "PatientPrescriptionSubmission"("pharmacyId", "status");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmission_reviewedByPharmacyId_idx" ON "PatientPrescriptionSubmission"("reviewedByPharmacyId");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmission_verificationDoctorId_doctorVe_idx" ON "PatientPrescriptionSubmission"("verificationDoctorId", "doctorVerificationStatus");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmission_verificationPath_doctorVerifi_idx" ON "PatientPrescriptionSubmission"("verificationPath", "doctorVerificationStatus");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmission_evidenceType_idx" ON "PatientPrescriptionSubmission"("evidenceType");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmission_requestType_idx" ON "PatientPrescriptionSubmission"("requestType");

-- CreateIndex
CREATE INDEX "PatientPrescriptionSubmission_createdAt_idx" ON "PatientPrescriptionSubmission"("createdAt");
