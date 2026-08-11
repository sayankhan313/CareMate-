-- CreateEnum
CREATE TYPE "MedicineReviewRequestType" AS ENUM ('ADD', 'DELETE');

-- CreateEnum
CREATE TYPE "MedicineReviewRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED');

-- CreateTable
CREATE TABLE "MedicineReviewRequest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "reviewedByDoctorId" TEXT,
    "medicineId" TEXT NOT NULL,
    "requestType" "MedicineReviewRequestType" NOT NULL,
    "status" "MedicineReviewRequestStatus" NOT NULL DEFAULT 'PENDING',
    "patientReason" TEXT,
    "doctorNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "patientSeenAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicineReviewRequest_patientId_status_idx" ON "MedicineReviewRequest"("patientId", "status");

-- CreateIndex
CREATE INDEX "MedicineReviewRequest_doctorId_status_idx" ON "MedicineReviewRequest"("doctorId", "status");

-- CreateIndex
CREATE INDEX "MedicineReviewRequest_medicineId_requestType_status_idx" ON "MedicineReviewRequest"("medicineId", "requestType", "status");

-- CreateIndex
CREATE INDEX "MedicineReviewRequest_reviewedByDoctorId_idx" ON "MedicineReviewRequest"("reviewedByDoctorId");

-- CreateIndex
CREATE INDEX "MedicineReviewRequest_createdAt_idx" ON "MedicineReviewRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "MedicineReviewRequest" ADD CONSTRAINT "MedicineReviewRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineReviewRequest" ADD CONSTRAINT "MedicineReviewRequest_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineReviewRequest" ADD CONSTRAINT "MedicineReviewRequest_reviewedByDoctorId_fkey" FOREIGN KEY ("reviewedByDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineReviewRequest" ADD CONSTRAINT "MedicineReviewRequest_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
