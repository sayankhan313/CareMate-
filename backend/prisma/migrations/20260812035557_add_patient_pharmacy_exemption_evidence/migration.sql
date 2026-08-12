-- CreateTable
CREATE TABLE "PatientPharmacyExemptionEvidence" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "verifiedByPharmacyId" TEXT,
    "chargePreference" "PrescriptionChargePreference" NOT NULL,
    "exemptionType" "PrescriptionExemptionType" NOT NULL,
    "referenceNumber" TEXT,
    "evidenceDocumentUrls" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "status" "ExemptionVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientPharmacyExemptionEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientPharmacyExemptionEvidence_linkId_createdAt_idx" ON "PatientPharmacyExemptionEvidence"("linkId", "createdAt");

-- CreateIndex
CREATE INDEX "PatientPharmacyExemptionEvidence_patientId_pharmacyId_statu_idx" ON "PatientPharmacyExemptionEvidence"("patientId", "pharmacyId", "status");

-- CreateIndex
CREATE INDEX "PatientPharmacyExemptionEvidence_pharmacyId_status_idx" ON "PatientPharmacyExemptionEvidence"("pharmacyId", "status");

-- CreateIndex
CREATE INDEX "PatientPharmacyExemptionEvidence_verifiedByPharmacyId_idx" ON "PatientPharmacyExemptionEvidence"("verifiedByPharmacyId");

-- CreateIndex
CREATE INDEX "PatientPharmacyExemptionEvidence_chargePreference_idx" ON "PatientPharmacyExemptionEvidence"("chargePreference");

-- CreateIndex
CREATE INDEX "PatientPharmacyExemptionEvidence_exemptionType_idx" ON "PatientPharmacyExemptionEvidence"("exemptionType");

-- CreateIndex
CREATE INDEX "PatientPharmacyExemptionEvidence_expiresAt_idx" ON "PatientPharmacyExemptionEvidence"("expiresAt");

-- AddForeignKey
ALTER TABLE "PatientPharmacyExemptionEvidence" ADD CONSTRAINT "PatientPharmacyExemptionEvidence_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "PatientPharmacyLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPharmacyExemptionEvidence" ADD CONSTRAINT "PatientPharmacyExemptionEvidence_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPharmacyExemptionEvidence" ADD CONSTRAINT "PatientPharmacyExemptionEvidence_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPharmacyExemptionEvidence" ADD CONSTRAINT "PatientPharmacyExemptionEvidence_verifiedByPharmacyId_fkey" FOREIGN KEY ("verifiedByPharmacyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
