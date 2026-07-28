-- CreateEnum
CREATE TYPE "PatientReportCategory" AS ENUM ('BLOOD_TEST', 'SCAN_XRAY', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'MEDICAL_LETTER', 'OTHER_MEDICAL_REPORT');

-- CreateEnum
CREATE TYPE "PatientReportStatus" AS ENUM ('PENDING_REVIEW', 'PARTIALLY_REVIEWED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "PatientReportReviewStatus" AS ENUM ('PENDING', 'REVIEWED');

-- CreateEnum
CREATE TYPE "PatientReportContentSafetyStatus" AS ENUM ('NOT_SCANNED', 'CLEAR', 'REVIEW_REQUIRED', 'BLOCKED');

-- CreateTable
CREATE TABLE "PatientReport" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "PatientReportCategory" NOT NULL,
    "description" TEXT,
    "reportDate" TIMESTAMP(3),
    "status" "PatientReportStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "originalFileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "contentSafetyStatus" "PatientReportContentSafetyStatus" NOT NULL DEFAULT 'NOT_SCANNED',
    "contentSafetyMessage" TEXT,
    "contentSafetyCheckedAt" TIMESTAMP(3),
    "isSampleDataConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientReportReview" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "status" "PatientReportReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "patientSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientReportReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientReport_storedFileName_key" ON "PatientReport"("storedFileName");

-- CreateIndex
CREATE INDEX "PatientReport_patientId_status_idx" ON "PatientReport"("patientId", "status");

-- CreateIndex
CREATE INDEX "PatientReport_patientId_createdAt_idx" ON "PatientReport"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "PatientReport_category_idx" ON "PatientReport"("category");

-- CreateIndex
CREATE INDEX "PatientReport_contentSafetyStatus_idx" ON "PatientReport"("contentSafetyStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PatientReport_patientId_fileHash_key" ON "PatientReport"("patientId", "fileHash");

-- CreateIndex
CREATE INDEX "PatientReportReview_doctorId_status_idx" ON "PatientReportReview"("doctorId", "status");

-- CreateIndex
CREATE INDEX "PatientReportReview_reportId_status_idx" ON "PatientReportReview"("reportId", "status");

-- CreateIndex
CREATE INDEX "PatientReportReview_reviewedAt_idx" ON "PatientReportReview"("reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PatientReportReview_reportId_doctorId_key" ON "PatientReportReview"("reportId", "doctorId");

-- AddForeignKey
ALTER TABLE "PatientReport" ADD CONSTRAINT "PatientReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientReportReview" ADD CONSTRAINT "PatientReportReview_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "PatientReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientReportReview" ADD CONSTRAINT "PatientReportReview_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
