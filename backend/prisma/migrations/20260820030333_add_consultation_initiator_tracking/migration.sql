-- CreateEnum
CREATE TYPE "ConsultationInitiatorType" AS ENUM ('PATIENT', 'CAREGIVER', 'SAFETY_RESPONSE');

-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "initiatedByUserId" TEXT,
ADD COLUMN     "initiatorType" "ConsultationInitiatorType";

-- CreateIndex
CREATE INDEX "Consultation_initiatedByUserId_idx" ON "Consultation"("initiatedByUserId");

-- CreateIndex
CREATE INDEX "Consultation_initiatorType_idx" ON "Consultation"("initiatorType");

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
