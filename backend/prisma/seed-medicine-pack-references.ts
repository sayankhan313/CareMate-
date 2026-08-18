import { prisma } from "../src/config/prisma.js";

type MedicinePackReferenceSeed = {
  medicineSlug: string;
  medicineName: string;
  strength: string;
  form: string;
  packageUnit: string;
  packSize: number;
  contentUnit: string;
  defaultUnitPricePence: number;
};

const medicinePackReferences: MedicinePackReferenceSeed[] = [
  { medicineSlug: "tretiva-10mg", medicineName: "Tretiva 10mg", strength: "10mg", form: "Capsule", packageUnit: "pack", packSize: 10, contentUnit: "capsule", defaultUnitPricePence: 1200 },
  { medicineSlug: "deriva-bpo-gel", medicineName: "Deriva BPO Gel", strength: "Adapalene + Benzoyl Peroxide", form: "Gel", packageUnit: "tube", packSize: 15, contentUnit: "g", defaultUnitPricePence: 850 },
  { medicineSlug: "minoz-gel", medicineName: "Minoz Gel", strength: "Topical gel", form: "Gel", packageUnit: "tube", packSize: 15, contentUnit: "g", defaultUnitPricePence: 700 },
  { medicineSlug: "limcee-500mg", medicineName: "Limcee 500mg", strength: "500mg", form: "Tablet", packageUnit: "pack", packSize: 15, contentUnit: "tablet", defaultUnitPricePence: 250 },
  { medicineSlug: "providac", medicineName: "Providac", strength: "1 billion CFU", form: "Capsule", packageUnit: "pack", packSize: 10, contentUnit: "capsule", defaultUnitPricePence: 400 },
  { medicineSlug: "gudcef-cv-200", medicineName: "Gudcef-CV 200", strength: "200mg + 125mg", form: "Tablet", packageUnit: "pack", packSize: 10, contentUnit: "tablet", defaultUnitPricePence: 900 },
  { medicineSlug: "fluka-150", medicineName: "Fluka 150", strength: "150mg", form: "Tablet", packageUnit: "pack", packSize: 1, contentUnit: "tablet", defaultUnitPricePence: 350 },
  { medicineSlug: "allegra-m", medicineName: "Allegra-M", strength: "120mg + 10mg", form: "Tablet", packageUnit: "pack", packSize: 10, contentUnit: "tablet", defaultUnitPricePence: 600 },
  { medicineSlug: "rapitus-syrup", medicineName: "Rapitus Syrup", strength: "30mg/5ml", form: "Syrup", packageUnit: "bottle", packSize: 100, contentUnit: "ml", defaultUnitPricePence: 550 },
  { medicineSlug: "metformin", medicineName: "Metformin", strength: "500mg", form: "Tablet", packageUnit: "pack", packSize: 28, contentUnit: "tablet", defaultUnitPricePence: 350 },
  { medicineSlug: "metformin", medicineName: "Metformin", strength: "850mg", form: "Tablet", packageUnit: "pack", packSize: 28, contentUnit: "tablet", defaultUnitPricePence: 400 },
  { medicineSlug: "metformin", medicineName: "Metformin", strength: "1000mg", form: "Tablet", packageUnit: "pack", packSize: 28, contentUnit: "tablet", defaultUnitPricePence: 450 },
  { medicineSlug: "paracetamol", medicineName: "Paracetamol", strength: "500mg", form: "Tablet", packageUnit: "pack", packSize: 32, contentUnit: "tablet", defaultUnitPricePence: 250 },
  { medicineSlug: "paracetamol", medicineName: "Paracetamol", strength: "650mg", form: "Tablet", packageUnit: "pack", packSize: 32, contentUnit: "tablet", defaultUnitPricePence: 300 },
  { medicineSlug: "ibuprofen", medicineName: "Ibuprofen", strength: "200mg", form: "Tablet", packageUnit: "pack", packSize: 16, contentUnit: "tablet", defaultUnitPricePence: 275 },
  { medicineSlug: "ibuprofen", medicineName: "Ibuprofen", strength: "400mg", form: "Tablet", packageUnit: "pack", packSize: 24, contentUnit: "tablet", defaultUnitPricePence: 350 },
  { medicineSlug: "amoxicillin", medicineName: "Amoxicillin", strength: "250mg", form: "Capsule", packageUnit: "pack", packSize: 21, contentUnit: "capsule", defaultUnitPricePence: 500 },
  { medicineSlug: "amoxicillin", medicineName: "Amoxicillin", strength: "500mg", form: "Capsule", packageUnit: "pack", packSize: 21, contentUnit: "capsule", defaultUnitPricePence: 650 },
  { medicineSlug: "azithromycin", medicineName: "Azithromycin", strength: "250mg", form: "Tablet", packageUnit: "pack", packSize: 6, contentUnit: "tablet", defaultUnitPricePence: 650 },
  { medicineSlug: "azithromycin", medicineName: "Azithromycin", strength: "500mg", form: "Tablet", packageUnit: "pack", packSize: 3, contentUnit: "tablet", defaultUnitPricePence: 750 },
  { medicineSlug: "omeprazole", medicineName: "Omeprazole", strength: "10mg", form: "Capsule", packageUnit: "pack", packSize: 28, contentUnit: "capsule", defaultUnitPricePence: 300 },
  { medicineSlug: "omeprazole", medicineName: "Omeprazole", strength: "20mg", form: "Capsule", packageUnit: "pack", packSize: 28, contentUnit: "capsule", defaultUnitPricePence: 350 },
  { medicineSlug: "omeprazole", medicineName: "Omeprazole", strength: "40mg", form: "Capsule", packageUnit: "pack", packSize: 28, contentUnit: "capsule", defaultUnitPricePence: 425 },
  { medicineSlug: "pantoprazole", medicineName: "Pantoprazole", strength: "20mg", form: "Tablet", packageUnit: "pack", packSize: 28, contentUnit: "tablet", defaultUnitPricePence: 325 },
  { medicineSlug: "pantoprazole", medicineName: "Pantoprazole", strength: "40mg", form: "Tablet", packageUnit: "pack", packSize: 28, contentUnit: "tablet", defaultUnitPricePence: 375 },
  { medicineSlug: "cetirizine", medicineName: "Cetirizine", strength: "10mg", form: "Tablet", packageUnit: "pack", packSize: 30, contentUnit: "tablet", defaultUnitPricePence: 275 },
  { medicineSlug: "levocetirizine", medicineName: "Levocetirizine", strength: "5mg", form: "Tablet", packageUnit: "pack", packSize: 28, contentUnit: "tablet", defaultUnitPricePence: 325 },
  { medicineSlug: "amlodipine", medicineName: "Amlodipine", strength: "2.5mg", form: "Tablet", packageUnit: "pack", packSize: 28, contentUnit: "tablet", defaultUnitPricePence: 275 },
  { medicineSlug: "amlodipine", medicineName: "Amlodipine", strength: "5mg", form: "Tablet", packageUnit: "pack", packSize: 28, contentUnit: "tablet", defaultUnitPricePence: 300 },
  { medicineSlug: "amlodipine", medicineName: "Amlodipine", strength: "10mg", form: "Tablet", packageUnit: "pack", packSize: 28, contentUnit: "tablet", defaultUnitPricePence: 350 },
  { medicineSlug: "atorvastatin", medicineName: "Atorvastatin", strength: "10mg", form: "Tablet", packageUnit: "pack", packSize: 28, contentUnit: "tablet", defaultUnitPricePence: 300 },
  { medicineSlug: "atorvastatin", medicineName: "Atorvastatin", strength: "20mg", form: "Tablet", packageUnit: "pack", packSize: 28, contentUnit: "tablet", defaultUnitPricePence: 350 },
  { medicineSlug: "atorvastatin", medicineName: "Atorvastatin", strength: "40mg", form: "Tablet", packageUnit: "pack", packSize: 28, contentUnit: "tablet", defaultUnitPricePence: 400 },
  { medicineSlug: "atorvastatin", medicineName: "Atorvastatin", strength: "80mg", form: "Tablet", packageUnit: "pack", packSize: 28, contentUnit: "tablet", defaultUnitPricePence: 450 },
  { medicineSlug: "salbutamol-inhaler", medicineName: "Salbutamol Inhaler", strength: "100mcg per puff", form: "Inhaler", packageUnit: "inhaler", packSize: 200, contentUnit: "puff", defaultUnitPricePence: 850 },
  { medicineSlug: "ondansetron", medicineName: "Ondansetron", strength: "4mg", form: "Tablet", packageUnit: "pack", packSize: 10, contentUnit: "tablet", defaultUnitPricePence: 400 },
  { medicineSlug: "ondansetron", medicineName: "Ondansetron", strength: "8mg", form: "Tablet", packageUnit: "pack", packSize: 10, contentUnit: "tablet", defaultUnitPricePence: 500 },
];

const normalizeStrength = (value?: string | null) =>
  value?.normalize("NFKD").toLowerCase().replace(/µg/g, "mcg").replace(/\bug\b/g, "mcg").replace(/\s+/g, "").trim() || null;

const normalizeName = (value: string) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/µg/g, "mcg")
    .replace(/\bug\b/g, "mcg")
    .replace(/\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|l|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|l))?/g, " ")
    .replace(/\b(tablets?|capsules?|caps?|syrup|gel|cream|ointment|inhaler|spray|drops?|patches?|sachets?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const findSeedReference = (medicineName: string, strength?: string | null) => {
  const nameKey = normalizeName(medicineName);
  const strengthKey = normalizeStrength(strength);

  let candidates = medicinePackReferences.filter(item => normalizeName(item.medicineName) === nameKey);

  if (strengthKey) {
    const strengthMatches = candidates.filter(item => normalizeStrength(item.strength) === strengthKey);
    if (strengthMatches.length === 1) return strengthMatches[0];
    if (strengthMatches.length > 0) candidates = strengthMatches;
  }

  const exactNameMatches = candidates.filter(item => item.medicineName.trim().toLowerCase() === medicineName.trim().toLowerCase());
  if (exactNameMatches.length === 1) return exactNameMatches[0];

  return candidates.length === 1 ? candidates[0] : null;
};

const seedMedicinePackReferences = async () => {
  for (const item of medicinePackReferences) {
    await prisma.medicinePackReference.upsert({
      where: {
        medicineSlug_strength: {
          medicineSlug: item.medicineSlug,
          strength: item.strength,
        },
      },
      update: {
        medicineName: item.medicineName,
        form: item.form,
        packageUnit: item.packageUnit,
        packSize: item.packSize,
        contentUnit: item.contentUnit,
        defaultUnitPricePence: item.defaultUnitPricePence,
        isActive: true,
      },
      create: { ...item, isActive: true },
    });
  }

  console.log(`Seeded ${medicinePackReferences.length} medicine pack references.`);
};

const backfillInventoryPrices = async () => {
  const zeroPriceItems = await prisma.pharmacyInventoryItem.findMany({
    where: { unitPricePence: { lte: 0 } },
    select: {
      id: true,
      medicineName: true,
      strength: true,
      unitPricePence: true,
    },
  });

  let updatedCount = 0;
  let unmatchedCount = 0;

  for (const inventoryItem of zeroPriceItems) {
    const reference = findSeedReference(inventoryItem.medicineName, inventoryItem.strength);

    if (!reference) {
      unmatchedCount += 1;
      console.log(`No unique reference price for inventory item: ${inventoryItem.medicineName}${inventoryItem.strength ? ` ${inventoryItem.strength}` : ""}`);
      continue;
    }

    await prisma.pharmacyInventoryItem.updateMany({
      where: {
        id: inventoryItem.id,
        unitPricePence: { lte: 0 },
      },
      data: {
        unitPricePence: reference.defaultUnitPricePence,
      },
    });

    updatedCount += 1;
    console.log(
      `Backfilled ${inventoryItem.medicineName}${inventoryItem.strength ? ` ${inventoryItem.strength}` : ""} -> £${(reference.defaultUnitPricePence / 100).toFixed(2)}`,
    );
  }

  console.log(`Inventory price backfill complete. Updated: ${updatedCount}, unmatched/manual price required: ${unmatchedCount}.`);
};

const main = async () => {
  await seedMedicinePackReferences();
  await backfillInventoryPrices();
};

main()
  .catch(error => {
    console.error("Medicine pack reference seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });