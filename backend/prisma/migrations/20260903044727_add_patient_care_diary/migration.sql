-- CreateTable
CREATE TABLE "PatientCareDiaryEntry" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "mood" TEXT,
    "symptoms" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientCareDiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientCareDiaryEntry_patientId_idx" ON "PatientCareDiaryEntry"("patientId");

-- CreateIndex
CREATE INDEX "PatientCareDiaryEntry_patientId_entryDate_idx" ON "PatientCareDiaryEntry"("patientId", "entryDate");

-- CreateIndex
CREATE INDEX "PatientCareDiaryEntry_createdAt_idx" ON "PatientCareDiaryEntry"("createdAt");

-- AddForeignKey
ALTER TABLE "PatientCareDiaryEntry" ADD CONSTRAINT "PatientCareDiaryEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
