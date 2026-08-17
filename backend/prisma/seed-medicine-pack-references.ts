import { prisma } from "../src/config/prisma.js";

type MedicinePackReferenceSeed = {
  medicineSlug: string;
  medicineName: string;
  strength: string;
  form: string;
  packageUnit: string;
  packSize: number;
  contentUnit: string;
};

const medicinePackReferences: MedicinePackReferenceSeed[] = [
  {
    medicineSlug: "tretiva-10mg",
    medicineName: "Tretiva 10mg",
    strength: "10mg",
    form: "Capsule",
    packageUnit: "pack",
    packSize: 10,
    contentUnit: "capsule",
  },

  {
    medicineSlug: "deriva-bpo-gel",
    medicineName: "Deriva BPO Gel",
    strength: "Adapalene + Benzoyl Peroxide",
    form: "Gel",
    packageUnit: "tube",
    packSize: 15,
    contentUnit: "g",
  },

  {
    medicineSlug: "minoz-gel",
    medicineName: "Minoz Gel",
    strength: "Topical gel",
    form: "Gel",
    packageUnit: "tube",
    packSize: 15,
    contentUnit: "g",
  },

  {
    medicineSlug: "limcee-500mg",
    medicineName: "Limcee 500mg",
    strength: "500mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 15,
    contentUnit: "tablet",
  },

  {
    medicineSlug: "providac",
    medicineName: "Providac",
    strength: "1 billion CFU",
    form: "Capsule",
    packageUnit: "pack",
    packSize: 10,
    contentUnit: "capsule",
  },

  {
    medicineSlug: "gudcef-cv-200",
    medicineName: "Gudcef-CV 200",
    strength: "200mg + 125mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 10,
    contentUnit: "tablet",
  },

  {
    medicineSlug: "fluka-150",
    medicineName: "Fluka 150",
    strength: "150mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 1,
    contentUnit: "tablet",
  },

  {
    medicineSlug: "allegra-m",
    medicineName: "Allegra-M",
    strength: "120mg + 10mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 10,
    contentUnit: "tablet",
  },

  {
    medicineSlug: "rapitus-syrup",
    medicineName: "Rapitus Syrup",
    strength: "30mg/5ml",
    form: "Syrup",
    packageUnit: "bottle",
    packSize: 100,
    contentUnit: "ml",
  },

  {
    medicineSlug: "metformin",
    medicineName: "Metformin",
    strength: "500mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "tablet",
  },
  {
    medicineSlug: "metformin",
    medicineName: "Metformin",
    strength: "850mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "tablet",
  },
  {
    medicineSlug: "metformin",
    medicineName: "Metformin",
    strength: "1000mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "tablet",
  },

  {
    medicineSlug: "paracetamol",
    medicineName: "Paracetamol",
    strength: "500mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 32,
    contentUnit: "tablet",
  },
  {
    medicineSlug: "paracetamol",
    medicineName: "Paracetamol",
    strength: "650mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 32,
    contentUnit: "tablet",
  },

  {
    medicineSlug: "ibuprofen",
    medicineName: "Ibuprofen",
    strength: "200mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 16,
    contentUnit: "tablet",
  },
  {
    medicineSlug: "ibuprofen",
    medicineName: "Ibuprofen",
    strength: "400mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 24,
    contentUnit: "tablet",
  },

  {
    medicineSlug: "amoxicillin",
    medicineName: "Amoxicillin",
    strength: "250mg",
    form: "Capsule",
    packageUnit: "pack",
    packSize: 21,
    contentUnit: "capsule",
  },
  {
    medicineSlug: "amoxicillin",
    medicineName: "Amoxicillin",
    strength: "500mg",
    form: "Capsule",
    packageUnit: "pack",
    packSize: 21,
    contentUnit: "capsule",
  },

  {
    medicineSlug: "azithromycin",
    medicineName: "Azithromycin",
    strength: "250mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 6,
    contentUnit: "tablet",
  },
  {
    medicineSlug: "azithromycin",
    medicineName: "Azithromycin",
    strength: "500mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 3,
    contentUnit: "tablet",
  },

  {
    medicineSlug: "omeprazole",
    medicineName: "Omeprazole",
    strength: "10mg",
    form: "Capsule",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "capsule",
  },
  {
    medicineSlug: "omeprazole",
    medicineName: "Omeprazole",
    strength: "20mg",
    form: "Capsule",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "capsule",
  },
  {
    medicineSlug: "omeprazole",
    medicineName: "Omeprazole",
    strength: "40mg",
    form: "Capsule",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "capsule",
  },

  {
    medicineSlug: "pantoprazole",
    medicineName: "Pantoprazole",
    strength: "20mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "tablet",
  },
  {
    medicineSlug: "pantoprazole",
    medicineName: "Pantoprazole",
    strength: "40mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "tablet",
  },

  {
    medicineSlug: "cetirizine",
    medicineName: "Cetirizine",
    strength: "10mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 30,
    contentUnit: "tablet",
  },

  {
    medicineSlug: "levocetirizine",
    medicineName: "Levocetirizine",
    strength: "5mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "tablet",
  },

  {
    medicineSlug: "amlodipine",
    medicineName: "Amlodipine",
    strength: "2.5mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "tablet",
  },
  {
    medicineSlug: "amlodipine",
    medicineName: "Amlodipine",
    strength: "5mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "tablet",
  },
  {
    medicineSlug: "amlodipine",
    medicineName: "Amlodipine",
    strength: "10mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "tablet",
  },

  {
    medicineSlug: "atorvastatin",
    medicineName: "Atorvastatin",
    strength: "10mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "tablet",
  },
  {
    medicineSlug: "atorvastatin",
    medicineName: "Atorvastatin",
    strength: "20mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "tablet",
  },
  {
    medicineSlug: "atorvastatin",
    medicineName: "Atorvastatin",
    strength: "40mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "tablet",
  },
  {
    medicineSlug: "atorvastatin",
    medicineName: "Atorvastatin",
    strength: "80mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 28,
    contentUnit: "tablet",
  },

  {
    medicineSlug: "salbutamol-inhaler",
    medicineName: "Salbutamol Inhaler",
    strength: "100mcg per puff",
    form: "Inhaler",
    packageUnit: "inhaler",
    packSize: 200,
    contentUnit: "puff",
  },

  {
    medicineSlug: "ondansetron",
    medicineName: "Ondansetron",
    strength: "4mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 10,
    contentUnit: "tablet",
  },
  {
    medicineSlug: "ondansetron",
    medicineName: "Ondansetron",
    strength: "8mg",
    form: "Tablet",
    packageUnit: "pack",
    packSize: 10,
    contentUnit: "tablet",
  },
];

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
        isActive: true,
      },
      create: {
        ...item,
        isActive: true,
      },
    });
  }

  console.log(
    `Seeded ${medicinePackReferences.length} medicine pack references.`,
  );
};

seedMedicinePackReferences()
  .catch(error => {
    console.error("Medicine pack reference seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });