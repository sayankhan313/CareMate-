import { prisma } from "../src/config/prisma.js";

type MedicineFrequencySeed =
  | "ONCE_DAILY"
  | "TWICE_DAILY"
  | "THREE_TIMES_DAILY"
  | "FOUR_TIMES_DAILY"
  | "AS_NEEDED"
  | "CUSTOM";

type MedicineSafetyLevelSeed = "STANDARD" | "DOCTOR_REVIEW_RECOMMENDED";

type MedicineReferenceSeed = {
  slug: string;
  brandName: string;
  genericName: string;
  aliases: string[];
  commonStrengths: string[];
  form: string;
  category: string;
  usedFor: string;
  commonSideEffects: string[];
  defaultInstructions: string;
  defaultFrequency: MedicineFrequencySeed;
  defaultTimeOfDay: string;
  safetyLevel: MedicineSafetyLevelSeed;
  safetyNote: string;
  imageUrl?: string | null;
  imageAltText?: string | null;
};

const medicineImage = (fileName: string, imageAltText: string) => ({
  imageUrl: `/uploads/medicine-references/${fileName}`,
  imageAltText,
});

const medicineReferences: MedicineReferenceSeed[] = [
  {
    slug: "tretiva-10mg",
    brandName: "Tretiva 10mg",
    genericName: "Isotretinoin",
    aliases: ["tretiva", "tretiva 10", "tretiva 10mg", "isotretinoin"],
    commonStrengths: ["10mg"],
    form: "Capsule",
    category: "Acne treatment",
    usedFor:
      "Used for severe acne when prescribed by a doctor. Requires medical supervision.",
    commonSideEffects: ["Dry lips", "Dry skin", "Skin sensitivity"],
    defaultInstructions: "Take exactly as prescribed by your doctor.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "20:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "This medicine requires doctor supervision. Do not change dose without medical advice.",
    ...medicineImage("tretiva-10mg.png", "Tretiva 10mg capsule box"),
  },
  {
    slug: "deriva-bpo-gel",
    brandName: "Deriva BPO Gel",
    genericName: "Adapalene + Benzoyl Peroxide",
    aliases: [
      "deriva",
      "deriva bpo",
      "deriva bpo gel",
      "adapalene",
      "benzoyl peroxide",
      "adapalene benzoyl peroxide",
    ],
    commonStrengths: ["Adapalene + Benzoyl Peroxide"],
    form: "Gel",
    category: "Acne treatment",
    usedFor:
      "Used for acne treatment when advised by a doctor or dermatologist.",
    commonSideEffects: ["Dryness", "Redness", "Burning sensation", "Peeling"],
    defaultInstructions:
      "Apply a thin layer as advised. Avoid eyes, lips and broken skin.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "20:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Topical acne treatments can irritate skin. Use only as advised and apply sunscreen during daytime.",
    ...medicineImage("deriva-bpo-gel.png", "Deriva BPO gel tube"),
  },
  {
    slug: "minoz-gel",
    brandName: "Minoz Gel",
    genericName: "Minocycline",
    aliases: ["minoz", "minoz gel", "minocycline", "minocycline gel"],
    commonStrengths: ["Topical gel"],
    form: "Gel",
    category: "Acne treatment",
    usedFor: "Used for acne treatment when prescribed or advised by a doctor.",
    commonSideEffects: ["Dryness", "Skin irritation", "Redness"],
    defaultInstructions:
      "Apply as advised by your doctor. Avoid eyes, lips and broken skin.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "20:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Use this medicine only as prescribed. Confirm application area and frequency with your doctor.",
    ...medicineImage("minoz-gel.png", "Minoz gel tube"),
  },
  {
    slug: "limcee-500mg",
    brandName: "Limcee 500mg",
    genericName: "Vitamin C",
    aliases: ["limcee", "limcee 500", "limcee 500mg", "vitamin c"],
    commonStrengths: ["500mg"],
    form: "Tablet",
    category: "Vitamin supplement",
    usedFor:
      "Used as a vitamin C supplement when advised by a doctor or pharmacist.",
    commonSideEffects: ["Stomach upset", "Nausea", "Acidity"],
    defaultInstructions: "Take as advised by your doctor or pharmacist.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "This is supportive information only. Follow your doctor or pharmacist advice.",
    ...medicineImage("limcee-500mg.png", "Limcee 500mg tablet pack"),
  },
  {
    slug: "providac",
    brandName: "Providac",
    genericName: "Bifidobacterium + Lactobacillus acidophilus",
    aliases: [
      "providac",
      "providac capsule",
      "bifidobacterium",
      "lactobacillus",
      "probiotic",
    ],
    commonStrengths: ["1 billion CFU"],
    form: "Capsule",
    category: "Probiotic",
    usedFor:
      "Supports gut health and helps restore healthy intestinal bacteria.",
    commonSideEffects: ["Bloating", "Gas", "Mild stomach discomfort"],
    defaultInstructions: "Take as advised by your doctor or pharmacist.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "This is supportive information only. Follow your doctor or pharmacist advice.",
    ...medicineImage("providac.png", "Providac capsule pack"),
  },
  {
    slug: "gudcef-cv-200",
    brandName: "Gudcef-CV 200",
    genericName: "Cefpodoxime Proxetil + Clavulanic Acid",
    aliases: [
      "gudcef",
      "gudcef cv",
      "gudcef-cv",
      "gudcef cv 200",
      "cefpodoxime",
      "clavulanic acid",
      "cefpodoxime clavulanic acid",
    ],
    commonStrengths: ["200mg + 125mg"],
    form: "Tablet",
    category: "Antibiotic",
    usedFor:
      "Used for bacterial infections when prescribed by a doctor. It should not be used for viral infections.",
    commonSideEffects: ["Diarrhoea", "Nausea", "Stomach pain", "Vomiting"],
    defaultInstructions:
      "Take exactly as prescribed. Complete the full course if your doctor has advised it.",
    defaultFrequency: "TWICE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Antibiotics should be used only when prescribed. Do not stop early or change dose without medical advice.",
    ...medicineImage("gudcef-cv-200.png", "Gudcef-CV 200 tablet pack"),
  },
  {
    slug: "fluka-150",
    brandName: "Fluka 150",
    genericName: "Fluconazole",
    aliases: ["fluka", "fluka 150", "fluka 150mg", "fluconazole"],
    commonStrengths: ["150mg"],
    form: "Tablet",
    category: "Antifungal",
    usedFor:
      "Used for fungal infections when prescribed or advised by a healthcare professional.",
    commonSideEffects: ["Nausea", "Headache", "Stomach pain", "Dizziness"],
    defaultInstructions: "Take as prescribed by your doctor.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Confirm dose and duration with your doctor or pharmacist before using antifungal medicines.",
    ...medicineImage("fluka-150.png", "Fluka 150 tablet pack"),
  },
  {
    slug: "allegra-m",
    brandName: "Allegra-M",
    genericName: "Fexofenadine + Montelukast",
    aliases: [
      "allegra",
      "allegra m",
      "allegra-m",
      "fexofenadine",
      "montelukast",
      "fexofenadine montelukast",
    ],
    commonStrengths: ["120mg + 10mg"],
    form: "Tablet",
    category: "Allergy medicine",
    usedFor:
      "Used for allergy symptoms when advised by a doctor or pharmacist.",
    commonSideEffects: ["Headache", "Drowsiness", "Dry mouth", "Nausea"],
    defaultInstructions: "Take as advised by your doctor or pharmacist.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "20:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "This information is for support only. Confirm use if symptoms are severe or persistent.",
    ...medicineImage("allegra-m.png", "Allegra-M tablet pack"),
  },
  {
    slug: "rapitus-syrup",
    brandName: "Rapitus Syrup",
    genericName: "Levodropropizine",
    aliases: ["rapitus", "rapitus syrup", "levodropropizine"],
    commonStrengths: ["30mg/5ml"],
    form: "Syrup",
    category: "Cough medicine",
    usedFor: "Used for cough relief when advised by a doctor or pharmacist.",
    commonSideEffects: ["Drowsiness", "Nausea", "Dizziness", "Stomach upset"],
    defaultInstructions:
      "Use a proper measuring spoon or cup. Take as advised by your doctor.",
    defaultFrequency: "THREE_TIMES_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "Cough medicines should be used carefully. Confirm dose especially for children or elderly patients.",
    ...medicineImage("rapitus-syrup.png", "Rapitus syrup bottle"),
  },
  {
    slug: "metformin",
    brandName: "Metformin",
    genericName: "Metformin",
    aliases: ["metformin", "metformin tablet"],
    commonStrengths: ["500mg", "850mg", "1000mg"],
    form: "Tablet",
    category: "Diabetes medicine",
    usedFor: "Used for blood glucose management when prescribed by a doctor.",
    commonSideEffects: [
      "Nausea",
      "Diarrhoea",
      "Stomach upset",
      "Metallic taste",
    ],
    defaultInstructions: "Take as prescribed by your doctor, often with food.",
    defaultFrequency: "TWICE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Diabetes medicines require medical supervision. Do not change dose without doctor advice.",
    ...medicineImage("metformin.png", "Metformin tablet pack"),
  },
  {
    slug: "paracetamol",
    brandName: "Paracetamol",
    genericName: "Paracetamol",
    aliases: ["paracetamol", "acetaminophen", "calpol", "panadol"],
    commonStrengths: ["500mg", "650mg"],
    form: "Tablet",
    category: "Pain relief",
    usedFor:
      "Used for pain relief and fever reduction when suitable for the patient.",
    commonSideEffects: [
      "Nausea",
      "Allergic reaction",
      "Liver risk if overdosed",
    ],
    defaultInstructions:
      "Take only within the recommended dose limit. Avoid taking multiple products containing paracetamol.",
    defaultFrequency: "AS_NEEDED",
    defaultTimeOfDay: "08:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "Do not exceed the recommended daily dose. Seek medical advice if symptoms continue.",
    ...medicineImage("paracetamol.png", "Paracetamol tablet pack"),
  },
  {
    slug: "ibuprofen",
    brandName: "Ibuprofen",
    genericName: "Ibuprofen",
    aliases: ["ibuprofen", "brufen", "nurofen"],
    commonStrengths: ["200mg", "400mg"],
    form: "Tablet",
    category: "Pain relief",
    usedFor:
      "Used for pain, fever and inflammation when suitable for the patient.",
    commonSideEffects: [
      "Stomach irritation",
      "Heartburn",
      "Nausea",
      "Dizziness",
    ],
    defaultInstructions: "Take with food or milk if advised.",
    defaultFrequency: "AS_NEEDED",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Avoid if you have certain stomach, kidney, heart or asthma-related risks unless advised by a doctor.",
    ...medicineImage("ibuprofen.png", "Ibuprofen tablet pack"),
  },
  {
    slug: "amoxicillin",
    brandName: "Amoxicillin",
    genericName: "Amoxicillin",
    aliases: ["amoxicillin", "amoxycillin", "amoxicillin capsule"],
    commonStrengths: ["250mg", "500mg"],
    form: "Capsule",
    category: "Antibiotic",
    usedFor: "Used for bacterial infections when prescribed by a doctor.",
    commonSideEffects: ["Diarrhoea", "Nausea", "Rash", "Stomach discomfort"],
    defaultInstructions:
      "Take exactly as prescribed and complete the full course if advised.",
    defaultFrequency: "THREE_TIMES_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Antibiotics should only be used with medical advice. Check allergy history before use.",
    ...medicineImage("amoxicillin.png", "Amoxicillin capsule pack"),
  },
  {
    slug: "azithromycin",
    brandName: "Azithromycin",
    genericName: "Azithromycin",
    aliases: ["azithromycin", "azee", "azithral", "zithromax"],
    commonStrengths: ["250mg", "500mg"],
    form: "Tablet",
    category: "Antibiotic",
    usedFor: "Used for bacterial infections when prescribed by a doctor.",
    commonSideEffects: ["Nausea", "Diarrhoea", "Stomach pain", "Headache"],
    defaultInstructions: "Take exactly as prescribed by your doctor.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Use antibiotics only when prescribed. Do not change dose or duration without medical advice.",
    ...medicineImage("azithromycin.png", "Azithromycin tablet pack"),
  },
  {
    slug: "omeprazole",
    brandName: "Omeprazole",
    genericName: "Omeprazole",
    aliases: ["omeprazole", "omez", "omeprazole capsule"],
    commonStrengths: ["10mg", "20mg", "40mg"],
    form: "Capsule",
    category: "Acidity medicine",
    usedFor:
      "Used for acid reflux, heartburn or stomach acid-related symptoms when advised.",
    commonSideEffects: ["Headache", "Stomach pain", "Nausea", "Gas"],
    defaultInstructions: "Usually taken before food if advised by a doctor.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "Use as advised. Long-term use should be discussed with a healthcare professional.",
    ...medicineImage("omeprazole.png", "Omeprazole capsule pack"),
  },
  {
    slug: "pantoprazole",
    brandName: "Pantoprazole",
    genericName: "Pantoprazole",
    aliases: ["pantoprazole", "pantocid", "pan 40", "pantoprazole tablet"],
    commonStrengths: ["20mg", "40mg"],
    form: "Tablet",
    category: "Acidity medicine",
    usedFor:
      "Used for acid reflux, heartburn or stomach acid-related symptoms when advised.",
    commonSideEffects: ["Headache", "Diarrhoea", "Nausea", "Stomach pain"],
    defaultInstructions: "Usually taken before food if advised by a doctor.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "Use as advised. Long-term or repeated use should be discussed with a healthcare professional.",
    ...medicineImage("pantoprazole.png", "Pantoprazole tablet pack"),
  },
  {
    slug: "cetirizine",
    brandName: "Cetirizine",
    genericName: "Cetirizine",
    aliases: ["cetirizine", "zyrtec", "cetirizine tablet"],
    commonStrengths: ["10mg"],
    form: "Tablet",
    category: "Allergy medicine",
    usedFor:
      "Used for allergy symptoms such as sneezing, runny nose or itching when suitable.",
    commonSideEffects: ["Drowsiness", "Dry mouth", "Headache"],
    defaultInstructions: "Take as advised by your doctor or pharmacist.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "20:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "May cause drowsiness in some people. Be careful with driving or operating machinery.",
    ...medicineImage("cetirizine.png", "Cetirizine tablet pack"),
  },
  {
    slug: "levocetirizine",
    brandName: "Levocetirizine",
    genericName: "Levocetirizine",
    aliases: ["levocetirizine", "levocet", "xyzal", "levocetirizine tablet"],
    commonStrengths: ["5mg"],
    form: "Tablet",
    category: "Allergy medicine",
    usedFor:
      "Used for allergy symptoms when advised by a doctor or pharmacist.",
    commonSideEffects: ["Drowsiness", "Dry mouth", "Tiredness", "Headache"],
    defaultInstructions: "Take as advised by your doctor or pharmacist.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "20:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "May cause drowsiness. Confirm use if symptoms are severe or persistent.",
    ...medicineImage("levocetirizine.png", "Levocetirizine tablet pack"),
  },
  {
    slug: "amlodipine",
    brandName: "Amlodipine",
    genericName: "Amlodipine",
    aliases: ["amlodipine", "amlodipine tablet"],
    commonStrengths: ["2.5mg", "5mg", "10mg"],
    form: "Tablet",
    category: "Blood pressure medicine",
    usedFor:
      "Used for blood pressure management when prescribed by a doctor.",
    commonSideEffects: ["Ankle swelling", "Dizziness", "Flushing", "Headache"],
    defaultInstructions: "Take as prescribed by your doctor.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Blood pressure medicines require doctor supervision. Do not stop suddenly without medical advice.",
    ...medicineImage("amlodipine.png", "Amlodipine tablet pack"),
  },
  {
    slug: "atorvastatin",
    brandName: "Atorvastatin",
    genericName: "Atorvastatin",
    aliases: ["atorvastatin", "atorva", "lipitor"],
    commonStrengths: ["10mg", "20mg", "40mg", "80mg"],
    form: "Tablet",
    category: "Cholesterol medicine",
    usedFor:
      "Used for cholesterol management and cardiovascular risk reduction when prescribed.",
    commonSideEffects: ["Muscle pain", "Headache", "Nausea", "Stomach upset"],
    defaultInstructions: "Take as prescribed by your doctor.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "20:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Report unexplained muscle pain or weakness to a doctor. Do not change dose without medical advice.",
    ...medicineImage("atorvastatin.png", "Atorvastatin tablet pack"),
  },
  {
    slug: "salbutamol-inhaler",
    brandName: "Salbutamol Inhaler",
    genericName: "Salbutamol",
    aliases: ["salbutamol", "salbutamol inhaler", "albuterol", "ventolin"],
    commonStrengths: ["100mcg per puff"],
    form: "Inhaler",
    category: "Asthma reliever",
    usedFor:
      "Used for relief of wheezing or breathing difficulty when prescribed.",
    commonSideEffects: ["Tremor", "Fast heartbeat", "Headache", "Nervousness"],
    defaultInstructions: "Use as prescribed. Follow inhaler technique guidance.",
    defaultFrequency: "AS_NEEDED",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Seek urgent medical help if breathing difficulty is severe or reliever inhaler is needed frequently.",
    ...medicineImage("salbutamol-inhaler.png", "Salbutamol inhaler"),
  },
  {
    slug: "ondansetron",
    brandName: "Ondansetron",
    genericName: "Ondansetron",
    aliases: ["ondansetron", "ondem", "ondansetron tablet"],
    commonStrengths: ["4mg", "8mg"],
    form: "Tablet",
    category: "Anti-nausea medicine",
    usedFor:
      "Used for nausea and vomiting when prescribed or advised by a healthcare professional.",
    commonSideEffects: ["Headache", "Constipation", "Dizziness", "Tiredness"],
    defaultInstructions: "Take as advised by your doctor or pharmacist.",
    defaultFrequency: "AS_NEEDED",
    defaultTimeOfDay: "08:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "Use as advised. Seek medical advice if vomiting is persistent or severe.",
    ...medicineImage("ondansetron.png", "Ondansetron tablet pack"),
  },
];

const seedMedicineReferences = async () => {
  for (const medicine of medicineReferences) {
    await prisma.medicineReference.upsert({
      where: {
        slug: medicine.slug,
      },
      update: medicine,
      create: medicine,
    });
  }

  console.log(`Seeded ${medicineReferences.length} medicine references.`);
};

seedMedicineReferences()
  .catch((error) => {
    console.error("Medicine reference seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });