-- AlterTable
ALTER TABLE "MedicineReminder" ADD COLUMN     "reviewDoctorId" TEXT,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByDoctorId" TEXT;

-- CreateIndex
CREATE INDEX "MedicineReminder_reviewDoctorId_idx" ON "MedicineReminder"("reviewDoctorId");

-- CreateIndex
CREATE INDEX "MedicineReminder_reviewedByDoctorId_idx" ON "MedicineReminder"("reviewedByDoctorId");

-- CreateIndex
CREATE INDEX "MedicineReminder_reviewStatus_idx" ON "MedicineReminder"("reviewStatus");

-- CreateIndex
CREATE INDEX "MedicineReminder_sendToDoctorForReview_idx" ON "MedicineReminder"("sendToDoctorForReview");

-- AddForeignKey
ALTER TABLE "MedicineReminder" ADD CONSTRAINT "MedicineReminder_reviewDoctorId_fkey" FOREIGN KEY ("reviewDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineReminder" ADD CONSTRAINT "MedicineReminder_reviewedByDoctorId_fkey" FOREIGN KEY ("reviewedByDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
