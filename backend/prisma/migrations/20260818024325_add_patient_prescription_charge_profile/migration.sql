-- CreateTable
CREATE TABLE "PatientPrescriptionChargeProfile" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "chargePreference" "PrescriptionChargePreference" NOT NULL DEFAULT 'CHARGEABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientPrescriptionChargeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientPrescriptionChargeProfile_patientId_key" ON "PatientPrescriptionChargeProfile"("patientId");

-- CreateIndex
CREATE INDEX "PatientPrescriptionChargeProfile_chargePreference_idx" ON "PatientPrescriptionChargeProfile"("chargePreference");

-- AddForeignKey
ALTER TABLE "PatientPrescriptionChargeProfile" ADD CONSTRAINT "PatientPrescriptionChargeProfile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
