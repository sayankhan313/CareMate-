-- CreateTable
CREATE TABLE "MedicinePackReference" (
    "id" TEXT NOT NULL,
    "medicineSlug" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "packageUnit" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL,
    "contentUnit" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicinePackReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicinePackReference_medicineSlug_idx" ON "MedicinePackReference"("medicineSlug");

-- CreateIndex
CREATE INDEX "MedicinePackReference_medicineName_idx" ON "MedicinePackReference"("medicineName");

-- CreateIndex
CREATE INDEX "MedicinePackReference_strength_idx" ON "MedicinePackReference"("strength");

-- CreateIndex
CREATE INDEX "MedicinePackReference_isActive_idx" ON "MedicinePackReference"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MedicinePackReference_medicineSlug_strength_key" ON "MedicinePackReference"("medicineSlug", "strength");
