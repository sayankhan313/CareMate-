-- CreateEnum
CREATE TYPE "PatientCaregiverRelationshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED');

-- CreateTable
CREATE TABLE "PatientCaregiverRelationship" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "status" "PatientCaregiverRelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientCaregiverRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientCaregiverRelationship_patientId_idx" ON "PatientCaregiverRelationship"("patientId");

-- CreateIndex
CREATE INDEX "PatientCaregiverRelationship_caregiverId_idx" ON "PatientCaregiverRelationship"("caregiverId");

-- CreateIndex
CREATE INDEX "PatientCaregiverRelationship_patientId_status_idx" ON "PatientCaregiverRelationship"("patientId", "status");

-- CreateIndex
CREATE INDEX "PatientCaregiverRelationship_caregiverId_status_idx" ON "PatientCaregiverRelationship"("caregiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PatientCaregiverRelationship_patientId_caregiverId_key" ON "PatientCaregiverRelationship"("patientId", "caregiverId");

-- AddForeignKey
ALTER TABLE "PatientCaregiverRelationship" ADD CONSTRAINT "PatientCaregiverRelationship_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientCaregiverRelationship" ADD CONSTRAINT "PatientCaregiverRelationship_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
