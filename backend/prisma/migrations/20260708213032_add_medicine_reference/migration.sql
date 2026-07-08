-- CreateEnum
CREATE TYPE "MedicineSafetyLevel" AS ENUM ('STANDARD', 'DOCTOR_REVIEW_RECOMMENDED');

-- CreateTable
CREATE TABLE "MedicineReference" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "aliases" TEXT[],
    "commonStrengths" TEXT[],
    "form" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "usedFor" TEXT NOT NULL,
    "commonSideEffects" TEXT[],
    "defaultInstructions" TEXT NOT NULL,
    "defaultFrequency" "MedicineFrequency" NOT NULL DEFAULT 'ONCE_DAILY',
    "defaultTimeOfDay" TEXT NOT NULL DEFAULT '08:00',
    "safetyLevel" "MedicineSafetyLevel" NOT NULL DEFAULT 'STANDARD',
    "safetyNote" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicineReference_slug_key" ON "MedicineReference"("slug");

-- CreateIndex
CREATE INDEX "MedicineReference_brandName_idx" ON "MedicineReference"("brandName");

-- CreateIndex
CREATE INDEX "MedicineReference_genericName_idx" ON "MedicineReference"("genericName");

-- CreateIndex
CREATE INDEX "MedicineReference_isActive_idx" ON "MedicineReference"("isActive");
