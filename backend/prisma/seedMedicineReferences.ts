import { prisma } from "../src/config/prisma.js";
type MedicineFrequencySeed =
  | "ONCE_DAILY"
  | "TWICE_DAILY"
  | "THREE_TIMES_DAILY"
  | "AS_NEEDED";

type MedicineSafetyLevelSeed =
  | "STANDARD"
  | "DOCTOR_REVIEW_RECOMMENDED";

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
};

const medicineReferences: MedicineReferenceSeed[] = [
  {
    slug: "providac",
    brandName: "Providac",
    genericName: "Bifidobacterium + Lactobacillus acidophilus",
    aliases: [
      "providac",
      "providac capsule",
      "bifidobacterium",
      "lactobacillus",
      "lactobacillus acidophilus",
      "probiotic",
    ],
    commonStrengths: ["1 billion CFU"],
    form: "Capsule",
    category: "Probiotic",
    usedFor: "Supports gut health and helps restore healthy intestinal bacteria.",
    commonSideEffects: ["Bloating", "Gas", "Mild stomach discomfort"],
    defaultInstructions: "Take as advised by your doctor or pharmacist.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "This is supportive information only. Follow your doctor or pharmacist advice.",
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
      "gudcef-cv 200",
      "cefpodoxime",
      "cefpodoxime proxetil",
      "clavulanic acid",
      "clavulanate",
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
  },
  {
    slug: "fluka-150",
    brandName: "Fluka 150",
    genericName: "Fluconazole",
    aliases: ["fluka", "fluka 150", "fluconazole", "fluconazole 150"],
    commonStrengths: ["150mg"],
    form: "Tablet / Capsule",
    category: "Antifungal",
    usedFor:
      "Used for fungal infections when prescribed or recommended by a healthcare professional.",
    commonSideEffects: ["Nausea", "Headache", "Stomach discomfort", "Vomiting"],
    defaultInstructions: "Take as directed by your doctor or pharmacist.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Confirm use with a doctor or pharmacist, especially if you take other medicines.",
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
      "fexofenadine hydrochloride",
    ],
    commonStrengths: ["120mg + 10mg"],
    form: "Tablet",
    category: "Allergy medicine",
    usedFor:
      "Used for allergy symptoms such as sneezing, runny nose, blocked nose, watery eyes, or allergic rhinitis when advised.",
    commonSideEffects: ["Headache", "Drowsiness", "Dizziness", "Nausea"],
    defaultInstructions: "Take as advised by your doctor or pharmacist.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "20:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Use as advised. Montelukast-containing medicines should be taken only when appropriate for the patient.",
  },
  {
    slug: "rapitus-syrup",
    brandName: "Rapitus Syrup",
    genericName: "Levodropropizine",
    aliases: [
      "rapitus",
      "rapitus syrup",
      "levodropropizine",
      "levodropropizine syrup",
    ],
    commonStrengths: ["30mg/5ml"],
    form: "Syrup",
    category: "Cough medicine",
    usedFor: "Used for dry cough when advised by a doctor or pharmacist.",
    commonSideEffects: ["Dizziness", "Sleepiness", "Stomach upset", "Nausea"],
    defaultInstructions: "Take the measured dose as advised.",
    defaultFrequency: "AS_NEEDED",
    defaultTimeOfDay: "20:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Cough syrup dosing depends on age and condition. Confirm dose with a doctor or pharmacist.",
  },
  {
    slug: "metformin",
    brandName: "Metformin",
    genericName: "Metformin",
    aliases: ["metformin", "metformin hydrochloride"],
    commonStrengths: ["500mg", "850mg", "1000mg"],
    form: "Tablet",
    category: "Diabetes medicine",
    usedFor: "Helps manage blood sugar in type 2 diabetes when prescribed.",
    commonSideEffects: ["Nausea", "Stomach upset", "Loss of appetite"],
    defaultInstructions: "Take with or after food as advised.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "Use only as prescribed. Do not change diabetes medicine without medical advice.",
  },
  {
    slug: "paracetamol",
    brandName: "Paracetamol",
    genericName: "Paracetamol / Acetaminophen",
    aliases: ["paracetamol", "acetaminophen", "calpol", "dolo"],
    commonStrengths: ["500mg", "650mg"],
    form: "Tablet",
    category: "Pain relief / Fever medicine",
    usedFor: "Used for pain relief and fever when appropriate.",
    commonSideEffects: ["Nausea", "Rash", "Liver risk if overdosed"],
    defaultInstructions: "Take only within the recommended daily limit.",
    defaultFrequency: "AS_NEEDED",
    defaultTimeOfDay: "08:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "Do not exceed recommended dose. Avoid combining multiple paracetamol-containing medicines.",
  },
  {
    slug: "ibuprofen",
    brandName: "Ibuprofen",
    genericName: "Ibuprofen",
    aliases: ["ibuprofen", "brufen", "nurofen"],
    commonStrengths: ["200mg", "400mg"],
    form: "Tablet",
    category: "Pain relief / Anti-inflammatory",
    usedFor: "Used for pain, fever, and inflammation when appropriate.",
    commonSideEffects: ["Stomach irritation", "Heartburn", "Nausea"],
    defaultInstructions: "Take with food if advised.",
    defaultFrequency: "AS_NEEDED",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Avoid if advised by doctor, especially with stomach ulcer, kidney disease, or blood thinner use.",
  },
  {
    slug: "amoxicillin",
    brandName: "Amoxicillin",
    genericName: "Amoxicillin",
    aliases: ["amoxicillin", "amoxycillin"],
    commonStrengths: ["250mg", "500mg"],
    form: "Capsule / Tablet",
    category: "Antibiotic",
    usedFor: "Used for bacterial infections when prescribed.",
    commonSideEffects: ["Diarrhoea", "Nausea", "Rash"],
    defaultInstructions: "Take exactly as prescribed and complete the course.",
    defaultFrequency: "THREE_TIMES_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Antibiotics should only be used when prescribed by a healthcare professional.",
  },
  {
    slug: "azithromycin",
    brandName: "Azithromycin",
    genericName: "Azithromycin",
    aliases: ["azithromycin", "azee", "zithromax"],
    commonStrengths: ["250mg", "500mg"],
    form: "Tablet",
    category: "Antibiotic",
    usedFor: "Used for bacterial infections when prescribed.",
    commonSideEffects: ["Nausea", "Diarrhoea", "Stomach pain"],
    defaultInstructions: "Take exactly as prescribed.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Do not use antibiotics without a prescription or change the course yourself.",
  },
  {
    slug: "omeprazole",
    brandName: "Omeprazole",
    genericName: "Omeprazole",
    aliases: ["omeprazole", "omez"],
    commonStrengths: ["20mg", "40mg"],
    form: "Capsule / Tablet",
    category: "Acidity medicine",
    usedFor:
      "Used for acid reflux, heartburn, and stomach acid problems when advised.",
    commonSideEffects: ["Headache", "Nausea", "Stomach pain"],
    defaultInstructions: "Usually taken before food if advised.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "STANDARD",
    safetyNote: "Follow medical advice, especially for long-term use.",
  },
  {
    slug: "pantoprazole",
    brandName: "Pantoprazole",
    genericName: "Pantoprazole",
    aliases: ["pantoprazole", "pantocid", "pan"],
    commonStrengths: ["20mg", "40mg"],
    form: "Tablet",
    category: "Acidity medicine",
    usedFor: "Used for acid reflux and stomach acid control when advised.",
    commonSideEffects: ["Headache", "Nausea", "Diarrhoea"],
    defaultInstructions: "Usually taken before food if advised.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "STANDARD",
    safetyNote: "Use as advised by your doctor or pharmacist.",
  },
  {
    slug: "cetirizine",
    brandName: "Cetirizine",
    genericName: "Cetirizine",
    aliases: ["cetirizine", "cetrizine"],
    commonStrengths: ["10mg"],
    form: "Tablet",
    category: "Allergy medicine",
    usedFor:
      "Used for allergy symptoms such as sneezing, itching, and runny nose.",
    commonSideEffects: ["Drowsiness", "Dry mouth", "Headache"],
    defaultInstructions: "Take as advised.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "20:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "May cause drowsiness in some people. Follow package or medical advice.",
  },
  {
    slug: "levocetirizine",
    brandName: "Levocetirizine",
    genericName: "Levocetirizine",
    aliases: ["levocetirizine", "levocetrizine", "xyzal"],
    commonStrengths: ["5mg"],
    form: "Tablet",
    category: "Allergy medicine",
    usedFor: "Used for allergy symptoms when advised.",
    commonSideEffects: ["Sleepiness", "Dry mouth", "Fatigue"],
    defaultInstructions: "Take as advised.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "20:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "May cause sleepiness. Be careful with driving or operating machinery.",
  },
  {
    slug: "amlodipine",
    brandName: "Amlodipine",
    genericName: "Amlodipine",
    aliases: ["amlodipine", "amlopres", "amlong"],
    commonStrengths: ["5mg", "10mg"],
    form: "Tablet",
    category: "Blood pressure medicine",
    usedFor: "Used for high blood pressure or chest pain when prescribed.",
    commonSideEffects: ["Ankle swelling", "Headache", "Flushing"],
    defaultInstructions: "Take at the same time daily as advised.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Do not stop blood pressure medicine suddenly without medical advice.",
  },
  {
    slug: "atorvastatin",
    brandName: "Atorvastatin",
    genericName: "Atorvastatin",
    aliases: ["atorvastatin", "atorva", "lipitor"],
    commonStrengths: ["10mg", "20mg", "40mg"],
    form: "Tablet",
    category: "Cholesterol medicine",
    usedFor:
      "Used to manage cholesterol and reduce cardiovascular risk when prescribed.",
    commonSideEffects: ["Muscle pain", "Headache", "Stomach upset"],
    defaultInstructions: "Take as advised, often once daily.",
    defaultFrequency: "ONCE_DAILY",
    defaultTimeOfDay: "20:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Report unexplained muscle pain or weakness to a healthcare professional.",
  },
  {
    slug: "salbutamol",
    brandName: "Salbutamol",
    genericName: "Salbutamol / Albuterol",
    aliases: ["salbutamol", "albuterol", "ventolin", "asthalin"],
    commonStrengths: ["100mcg"],
    form: "Inhaler",
    category: "Asthma / Breathing medicine",
    usedFor: "Used for wheezing or breathing difficulty when prescribed.",
    commonSideEffects: ["Tremor", "Fast heartbeat", "Headache"],
    defaultInstructions: "Use inhaler as advised by your doctor.",
    defaultFrequency: "AS_NEEDED",
    defaultTimeOfDay: "08:00",
    safetyLevel: "DOCTOR_REVIEW_RECOMMENDED",
    safetyNote:
      "Seek urgent help if breathing difficulty is severe or not improving.",
  },
  {
    slug: "ondansetron",
    brandName: "Ondansetron",
    genericName: "Ondansetron",
    aliases: ["ondansetron", "ondem", "zofer"],
    commonStrengths: ["4mg", "8mg"],
    form: "Tablet",
    category: "Anti-nausea medicine",
    usedFor: "Used for nausea and vomiting when advised.",
    commonSideEffects: ["Headache", "Constipation", "Dizziness"],
    defaultInstructions: "Take as advised.",
    defaultFrequency: "AS_NEEDED",
    defaultTimeOfDay: "08:00",
    safetyLevel: "STANDARD",
    safetyNote:
      "Use as advised, especially if you have heart rhythm problems or take other medicines.",
  },
];

const main = async () => {
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

main()
  .catch((error) => {
    console.error("Unable to seed medicine references", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });