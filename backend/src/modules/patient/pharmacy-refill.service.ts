import path from "node:path";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";
import { patientPrescriptionChargeService } from "./patient-prescription-charge.service.js";
import type { CreatePharmacyRefillInput, PharmacyRefillResponse } from "./pharmacy-refill.types.js";

const TERMINAL_ORDER_STATUSES = ["REJECTED", "DELIVERED", "COLLECTED", "CANCELLED"] as const;
const PACKAGE_UNITS = new Set(["pack", "box", "bottle", "inhaler", "tube", "sachet"]);

const normalizeUnit = (value?: string | null) => {
  const unit = value?.trim().toLowerCase() || "";
  const aliases: Record<string, string> = { packs: "pack", boxes: "box", bottles: "bottle", inhalers: "inhaler", tubes: "tube", sachets: "sachet" };
  return aliases[unit] || unit;
};

const displayUnit = (unit: string, quantity: number) => {
  const value = normalizeUnit(unit);
  if (quantity === 1) return value;
  if (value === "box") return "boxes";
  return value.endsWith("s") ? value : `${value}s`;
};

const normalizeMedicineName = (value: string) =>
  value.normalize("NFKD").toLowerCase().replace(/µg/g, "mcg").replace(/\bug\b/g, "mcg")
    .replace(/\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|l|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|l))?/g, " ")
    .replace(/\b(tablets?|capsules?|caps?|syrup|suspension|solution|gel|cream|ointment|inhaler|spray|drops?|patches?|sachets?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

const normalizeStrength = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.normalize("NFKD").toLowerCase().replace(/µg/g, "mcg").replace(/\bug\b/g, "mcg");
  const matches = normalized.match(/\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|l|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|l))?/g);
  return matches?.length ? matches.join("+").replace(/\s+/g, "") : null;
};

const inferPackageUnit = (medicineName: string, fallback?: string | null) => {
  const fallbackUnit = normalizeUnit(fallback);
  if (PACKAGE_UNITS.has(fallbackUnit)) return fallbackUnit;
  const text = medicineName.toLowerCase();
  if (/\b(syrup|suspension|solution|liquid)\b/.test(text)) return "bottle";
  if (/\b(gel|cream|ointment)\b/.test(text)) return "tube";
  if (/\binhaler\b/.test(text)) return "inhaler";
  if (/\bsachet\b/.test(text)) return "sachet";
  return "pack";
};

const resolveRequestPackageUnit = async (medicineName: string, strength: string, fallback?: string | null) => {
  const references = await prisma.medicinePackReference.findMany({
    where: { isActive: true },
    select: { medicineName: true, strength: true, packageUnit: true },
  });

  const nameKey = normalizeMedicineName(medicineName);
  const strengthKey = normalizeStrength(strength);
  let candidates = references.filter(reference => normalizeMedicineName(reference.medicineName) === nameKey);

  if (strengthKey) {
    const strengthMatches = candidates.filter(reference => normalizeStrength(reference.strength) === strengthKey);
    if (strengthMatches.length === 1) return normalizeUnit(strengthMatches[0].packageUnit);
    if (strengthMatches.length > 0) candidates = strengthMatches;
  }

  const exactNameMatches = candidates.filter(reference => reference.medicineName.trim().toLowerCase() === medicineName.trim().toLowerCase());
  if (exactNameMatches.length === 1) return normalizeUnit(exactNameMatches[0].packageUnit);
  if (candidates.length === 1) return normalizeUnit(candidates[0].packageUnit);
  return inferPackageUnit(medicineName, fallback);
};

const formatRequestedQuantity = (quantity: number, unit: string) => `${quantity} ${displayUnit(unit, quantity)}`;

const formatStoredRequestedQuantity = (quantity?: string | null, unit?: string | null) => {
  const value = quantity?.trim() || "";
  const normalizedUnit = normalizeUnit(unit);
  if (!value) return normalizedUnit ? `1 ${normalizedUnit}` : "1";
  if (!normalizedUnit) return value;

  const unitPattern = new RegExp(`\\b${normalizedUnit === "box" ? "box(?:es)?" : `${normalizedUnit}s?`}\\b`, "i");
  if (unitPattern.test(value)) return value;

  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? `${value} ${displayUnit(normalizedUnit, numeric)}` : value;
};

const reviewDoctorSelect = { id: true, fullName: true, email: true } as const;

const getPatientMedicine = async (patientId: string, medicineId: string) => {
  const medicine = await prisma.medicine.findFirst({
    where: { id: medicineId, patientId },
    select: {
      id: true,
      name: true,
      dose: true,
      instructions: true,
      source: true,
      isActive: true,
      prescribedByDoctorId: true,
      prescriptionItem: { select: { id: true, prescriptionId: true } },
      reviewRequests: {
        where: { requestType: "ADD" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          routingStatus: true,
          doctorId: true,
          poolDoctorId: true,
          reviewedByDoctorId: true,
          assignedAt: true,
          reviewedAt: true,
          doctorNote: true,
          doctor: { select: reviewDoctorSelect },
          poolDoctor: { select: reviewDoctorSelect },
          reviewedByDoctor: { select: reviewDoctorSelect },
        },
      },
    },
  });

  if (!medicine) throw new AppError("Medicine not found", 404);

  const latestAddReview = medicine.reviewRequests[0] || null;
  if (!medicine.isActive && latestAddReview?.status === "REJECTED") {
    throw new AppError("This medicine was rejected during review and cannot be requested from the pharmacy.", 409);
  }

  return medicine;
};

const getPatient = async (patientId: string) => {
  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: "PATIENT" },
    select: { id: true, fullName: true },
  });

  if (!patient) throw new AppError("Patient account not found", 404);
  return patient;
};

const getRequestPharmacy = async (patientId: string, pharmacyId?: string) => {
  const link = await prisma.patientPharmacyLink.findFirst({
    where: pharmacyId ? { patientId, pharmacyId } : { patientId, isPrimary: true },
    select: {
      id: true,
      pharmacyId: true,
      isPrimary: true,
      pharmacy: {
        select: {
          id: true,
          role: true,
          accountStatus: true,
          isEmailVerified: true,
          pharmacyProfile: { select: { pharmacyName: true } },
        },
      },
    },
  });

  if (!link) {
    if (pharmacyId) throw new AppError("The selected pharmacy is not saved to your CareMate+ account.", 403);
    throw new AppError("Please select a primary pharmacy before requesting medicine.", 400);
  }

  const pharmacyAvailable =
    link.pharmacy.role === "PHARMACY" &&
    link.pharmacy.isEmailVerified &&
    ["ACTIVE", "APPROVED"].includes(link.pharmacy.accountStatus) &&
    Boolean(link.pharmacy.pharmacyProfile);

  if (!pharmacyAvailable) throw new AppError("The selected pharmacy is currently unavailable. Please choose another approved pharmacy.", 409);
  return link;
};

const getAssignedVerificationDoctor = async (patientId: string, doctorId: string) => {
  const assignment = await prisma.patientDoctorAssignment.findFirst({
    where: {
      patientId,
      doctorId,
      status: "ACTIVE",
      doctor: { is: { role: "DOCTOR", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
    },
    select: { id: true, doctor: { select: reviewDoctorSelect } },
  });

  if (!assignment) throw new AppError("The selected doctor is not currently assigned to you.", 403);
  return assignment.doctor;
};

const findActiveRefillRequest = async (patientId: string, medicineId: string) =>
  prisma.medicineOrder.findFirst({
    where: {
      patientId,
      orderSource: "REFILL_REQUEST",
      status: { notIn: [...TERMINAL_ORDER_STATUSES] },
      items: { some: { medicineId } },
    },
    select: {
      id: true,
      orderNumber: true,
      pharmacyId: true,
      status: true,
      createdAt: true,
      pharmacy: { select: { pharmacyProfile: { select: { pharmacyName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

const ensureNoActiveRefillRequest = async (patientId: string, medicineId: string) => {
  const existing = await findActiveRefillRequest(patientId, medicineId);
  if (existing) throw new AppError(`A pharmacy request for this medicine is already active${existing.orderNumber ? ` (${existing.orderNumber})` : ""}.`, 409);
};

const getStoredEvidencePath = (filePath: string) => path.relative(process.cwd(), filePath).split(path.sep).join("/");

const notifyPharmacy = async ({
  pharmacyId,
  patientId,
  patientName,
  medicineName,
  orderId,
  orderNumber,
  prescriptionConfirmed,
  waitingForDoctor,
}: {
  pharmacyId: string;
  patientId: string;
  patientName: string;
  medicineName: string;
  orderId: string;
  orderNumber: string | null;
  prescriptionConfirmed: boolean;
  waitingForDoctor: boolean;
}) => {
  try {
    const existing = await prisma.userNotification.findFirst({
      where: { userId: pharmacyId, type: "NEW_MEDICINE_ORDER", entityType: "MEDICINE_ORDER", entityId: orderId },
      select: { id: true },
    });

    if (existing) return;

    await notificationService.createAndSend({
      userId: pharmacyId,
      type: "NEW_MEDICINE_ORDER",
      title: "New patient medicine request",
      body: waitingForDoctor
        ? `${patientName} requested ${medicineName}. The order is visible now but awaits doctor review before fulfilment.`
        : `${patientName} requested ${medicineName} from your pharmacy.`,
      priority: "HIGH",
      entityType: "MEDICINE_ORDER",
      entityId: orderId,
      targetScreen: "PharmacyDashboard",
      data: { orderId, orderNumber, patientId, patientName, medicineName, orderSource: "REFILL_REQUEST", prescriptionConfirmed, waitingForDoctor, status: "RECEIVED" },
    });
  } catch (error) {
    console.warn(`Unable to notify pharmacy about refill order ${orderId}:`, error instanceof Error ? error.message : error);
  }
};

const notifyVerificationDoctor = async ({
  doctorId,
  patientId,
  patientName,
  medicineName,
  submissionId,
  orderId,
  orderNumber,
}: {
  doctorId: string;
  patientId: string;
  patientName: string;
  medicineName: string;
  submissionId: string;
  orderId: string;
  orderNumber: string | null;
}) => {
  try {
    const existing = await prisma.userNotification.findFirst({
      where: { userId: doctorId, type: "REFILL_DOCTOR_VERIFICATION_REQUESTED", entityType: "PATIENT_PRESCRIPTION_SUBMISSION", entityId: submissionId },
      select: { id: true },
    });

    if (existing) return;

    await notificationService.createAndSend({
      userId: doctorId,
      type: "REFILL_DOCTOR_VERIFICATION_REQUESTED",
      title: "Medicine verification request",
      body: `${patientName} says you prescribed or recommended ${medicineName}. Please confirm or reject this request.`,
      priority: "HIGH",
      entityType: "PATIENT_PRESCRIPTION_SUBMISSION",
      entityId: submissionId,
      targetScreen: "DoctorDashboard",
      data: { submissionId, orderId, orderNumber, patientId, patientName, medicineName, source: "REFILL_DOCTOR_VERIFICATION", status: "PENDING" },
    });
  } catch (error) {
    console.warn(`Unable to notify doctor about refill verification ${submissionId}:`, error instanceof Error ? error.message : error);
  }
};

export const pharmacyRefillService = {
  async createRefillRequest(patientId: string, input: CreatePharmacyRefillInput): Promise<PharmacyRefillResponse> {
    const [patient, medicine, requestPharmacy] = await Promise.all([
      getPatient(patientId),
      getPatientMedicine(patientId, input.medicineId),
      getRequestPharmacy(patientId, input.pharmacyId),
    ]);

    await ensureNoActiveRefillRequest(patientId, medicine.id);

    const quantityUnit = await resolveRequestPackageUnit(medicine.name, medicine.dose, input.quantityUnit);
    const quantityText = formatRequestedQuantity(input.requestedQuantity, quantityUnit);
    const note = input.note?.trim() || null;
    const latestMedicineReview = medicine.reviewRequests[0] || null;

    const linkedDoctorPrescription =
      medicine.source === "DOCTOR_PRESCRIBED" &&
      Boolean(medicine.prescribedByDoctorId) &&
      Boolean(medicine.prescriptionItem?.prescriptionId);

    const pendingPatientMedicineReview = !linkedDoctorPrescription && latestMedicineReview?.status === "PENDING";
    const approvedPatientMedicineReview =
      !linkedDoctorPrescription &&
      Boolean(latestMedicineReview) &&
      (latestMedicineReview?.status === "APPROVED" || latestMedicineReview?.status === "APPLIED");

    const linkedReviewDoctor = latestMedicineReview?.reviewedByDoctor || latestMedicineReview?.doctor || latestMedicineReview?.poolDoctor || null;

    let verificationPath: "CAREMATE_PRESCRIPTION" | "ASSIGNED_DOCTOR" | "EXTERNAL_EVIDENCE";
    let verificationDoctor: { id: string; fullName: string; email: string } | null = null;
    let evidenceType = input.evidenceType || null;
    let storedEvidencePath: string | null = null;

    if (linkedDoctorPrescription) {
      verificationPath = "CAREMATE_PRESCRIPTION";
      evidenceType = null;
    } else if (pendingPatientMedicineReview) {
      verificationPath = "ASSIGNED_DOCTOR";
      evidenceType = null;
    } else if (approvedPatientMedicineReview) {
      verificationPath = "ASSIGNED_DOCTOR";
      verificationDoctor = linkedReviewDoctor;
      evidenceType = null;
    } else {
      if (!input.verificationPath) throw new AppError("Please choose whether this medicine should be verified by one of your assigned doctors or by supporting evidence.", 400);
      verificationPath = input.verificationPath;

      if (verificationPath === "ASSIGNED_DOCTOR") {
        if (!input.verificationDoctorId) throw new AppError("Please select one of your assigned doctors.", 400);
        verificationDoctor = await getAssignedVerificationDoctor(patientId, input.verificationDoctorId);
        evidenceType = null;
      }

      if (verificationPath === "EXTERNAL_EVIDENCE") {
        if (!evidenceType) throw new AppError("Please select the type of supporting evidence.", 400);
        if (!input.evidenceFilePath) throw new AppError("Please upload prescription or medicine evidence.", 400);
        storedEvidencePath = getStoredEvidencePath(input.evidenceFilePath);
      }
    }

    const prescriptionId = linkedDoctorPrescription ? medicine.prescriptionItem!.prescriptionId : null;
    const prescriptionItemId = linkedDoctorPrescription ? medicine.prescriptionItem!.id : null;

    const doctorId = linkedDoctorPrescription
      ? medicine.prescribedByDoctorId
      : approvedPatientMedicineReview
        ? linkedReviewDoctor?.id || null
        : null;

    const prescriptionConfirmed = linkedDoctorPrescription || approvedPatientMedicineReview;
    const fulfilmentAllowed = prescriptionConfirmed;

    const doctorVerificationStatus =
      approvedPatientMedicineReview ? "CONFIRMED" : verificationPath === "ASSIGNED_DOCTOR" ? "PENDING" : "NOT_REQUIRED";

    const submissionStatus =
      linkedDoctorPrescription || approvedPatientMedicineReview ? "VERIFIED" : verificationPath === "ASSIGNED_DOCTOR" ? "UNDER_REVIEW" : "VERIFICATION_REQUIRED";

    const standaloneDoctorVerification =
      verificationPath === "ASSIGNED_DOCTOR" &&
      !pendingPatientMedicineReview &&
      !approvedPatientMedicineReview &&
      Boolean(verificationDoctor);

    const waitingForDoctor = doctorVerificationStatus === "PENDING";
    const now = new Date();

    const created = await prisma.$transaction(async tx => {
      const duplicate = await tx.medicineOrder.findFirst({
        where: {
          patientId,
          orderSource: "REFILL_REQUEST",
          status: { notIn: [...TERMINAL_ORDER_STATUSES] },
          items: { some: { medicineId: medicine.id } },
        },
        select: { id: true },
      });

      if (duplicate) throw new AppError("A pharmacy request for this medicine is already active.", 409);

      const submission = await tx.patientPrescriptionSubmission.create({
        data: {
          patientId,
          pharmacyId: requestPharmacy.pharmacyId,
          requestType: "REFILL_REQUEST",
          verificationPath,
          verificationDoctorId: pendingPatientMedicineReview ? null : verificationDoctor?.id || null,
          doctorVerificationStatus,
          doctorVerificationRequestedAt: verificationPath === "ASSIGNED_DOCTOR" ? now : null,
          doctorVerificationNote: approvedPatientMedicineReview ? latestMedicineReview?.doctorNote || null : null,
          doctorVerifiedAt: approvedPatientMedicineReview ? latestMedicineReview?.reviewedAt || now : null,
          evidenceType,
          imageUrl: storedEvidencePath,
          notes: note,
          status: submissionStatus,
          reviewNote: approvedPatientMedicineReview ? latestMedicineReview?.doctorNote || null : null,
          reviewedAt: approvedPatientMedicineReview ? latestMedicineReview?.reviewedAt || now : null,
        },
        select: {
          id: true,
          requestType: true,
          status: true,
          verificationPath: true,
          doctorVerificationStatus: true,
          evidenceType: true,
          verificationDoctor: { select: { id: true, fullName: true } },
        },
      });

      const submissionItem = await tx.patientPrescriptionSubmissionItem.create({
        data: {
          submissionId: submission.id,
          medicineId: medicine.id,
          name: medicine.name,
          dose: medicine.dose,
          quantity: quantityText,
          instructions: medicine.instructions,
        },
        select: { id: true },
      });

      const historyNote =
        linkedDoctorPrescription
          ? "Patient explicitly requested a refill for a CareMate+ doctor-prescribed medicine."
          : pendingPatientMedicineReview
            ? "Patient sent the medicine to the pharmacy while the existing patient medicine review remains pending. Pharmacy fulfilment is locked until that review is approved."
            : approvedPatientMedicineReview
              ? "Patient explicitly requested the medicine after the patient medicine review had already been approved."
              : verificationPath === "ASSIGNED_DOCTOR"
                ? "Patient requested medicine and selected an assigned doctor to confirm whether the medicine was prescribed or recommended by them."
                : "Patient requested medicine using external supporting evidence. Pharmacist review is required before fulfilment.";

      const orderPayment = await patientPrescriptionChargeService.resolveOrderPayment(tx, patientId);

      const order = await tx.medicineOrder.create({
        data: {
          orderNumber: `CMRF-${submission.id}`,
          patientId,
          pharmacyId: requestPharmacy.pharmacyId,
          doctorId,
          prescriptionId,
          patientSubmissionId: submission.id,
          orderSource: "REFILL_REQUEST",
          medicineName: medicine.name,
          dose: medicine.dose,
          quantity: quantityText,
          instructions: medicine.instructions,
          requestedByRole: "PATIENT",
          requestedByName: patient.fullName,
          requestNote: note,
          prescriptionConfirmed,
          prescriptionConfirmedAt: prescriptionConfirmed ? latestMedicineReview?.reviewedAt || now : null,
          fulfilmentAllowed,
          status: "RECEIVED",
          items: {
            create: {
              medicineId: medicine.id,
              prescriptionItemId,
              submissionItemId: submissionItem.id,
              name: medicine.name,
              dose: medicine.dose,
              quantity: String(input.requestedQuantity),
              instructions: medicine.instructions,
              quantityUnit,
            },
          },
          payment: {
            create: {
              chargePreference: orderPayment.chargePreference,
              chargeableItemCount: orderPayment.status === "NOT_REQUIRED" ? 0 : 1,
              unitChargePence: 0,
              amountPence: 0,
              currency: "GBP",
              provider: "STRIPE",
              testMode: true,
              status: orderPayment.status,
            },
          },
          statusHistory: {
            create: {
              changedById: patientId,
              fromStatus: null,
              toStatus: "RECEIVED",
              note: historyNote,
            },
          },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          orderSource: true,
          prescriptionConfirmed: true,
          fulfilmentAllowed: true,
        },
      });

      return { submission, order };
    });

    await notifyPharmacy({
      pharmacyId: requestPharmacy.pharmacyId,
      patientId,
      patientName: patient.fullName,
      medicineName: medicine.name,
      orderId: created.order.id,
      orderNumber: created.order.orderNumber,
      prescriptionConfirmed: created.order.prescriptionConfirmed,
      waitingForDoctor,
    });

    if (standaloneDoctorVerification && verificationDoctor) {
      await notifyVerificationDoctor({
        doctorId: verificationDoctor.id,
        patientId,
        patientName: patient.fullName,
        medicineName: medicine.name,
        submissionId: created.submission.id,
        orderId: created.order.id,
        orderNumber: created.order.orderNumber,
      });
    }

    const responseVerificationDoctor =
      created.submission.verificationDoctor ||
      (pendingPatientMedicineReview && linkedReviewDoctor ? { id: linkedReviewDoctor.id, fullName: linkedReviewDoctor.fullName } : null);

    return {
      submission: {
        id: created.submission.id,
        requestType: "REFILL_REQUEST",
        status: created.submission.status,
        medicineId: medicine.id,
        verificationPath,
        doctorVerificationStatus: created.submission.doctorVerificationStatus,
        verificationDoctor: responseVerificationDoctor,
        evidenceType: created.submission.evidenceType,
        hasEvidence: Boolean(storedEvidencePath),
      },
      order: {
        id: created.order.id,
        orderNumber: created.order.orderNumber,
        status: created.order.status,
        orderSource: "REFILL_REQUEST",
        prescriptionConfirmed: created.order.prescriptionConfirmed,
        fulfilmentAllowed: created.order.fulfilmentAllowed,
      },
      pharmacy: {
        id: requestPharmacy.pharmacyId,
        pharmacyName: requestPharmacy.pharmacy.pharmacyProfile?.pharmacyName || "Selected pharmacy",
      },
      medicine: {
        id: medicine.id,
        name: medicine.name,
        dose: medicine.dose,
        source: medicine.source,
      },
      requiresDoctorVerification: doctorVerificationStatus === "PENDING",
      requiresPharmacyVerification: verificationPath === "EXTERNAL_EVIDENCE",
    };
  },

  async listActiveRefillRequests(patientId: string) {
    const orders = await prisma.medicineOrder.findMany({
      where: { patientId, orderSource: "REFILL_REQUEST", status: { notIn: [...TERMINAL_ORDER_STATUSES] } },
      select: {
        id: true,
        orderNumber: true,
        pharmacyId: true,
        status: true,
        createdAt: true,
        prescriptionConfirmed: true,
        fulfilmentAllowed: true,
        pharmacy: { select: { pharmacyProfile: { select: { pharmacyName: true } } } },
        patientSubmission: {
          select: {
            verificationPath: true,
            doctorVerificationStatus: true,
            evidenceType: true,
            verificationDoctor: { select: { id: true, fullName: true } },
          },
        },
        items: {
          select: {
            medicineId: true,
            name: true,
            dose: true,
            quantity: true,
            quantityUnit: true,
            medicine: {
              select: {
                reviewRequests: {
                  where: { requestType: "ADD" },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: {
                    status: true,
                    doctor: { select: { id: true, fullName: true } },
                    poolDoctor: { select: { id: true, fullName: true } },
                    reviewedByDoctor: { select: { id: true, fullName: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const activeRequests = orders.flatMap(order =>
      order.items
        .filter((item): item is typeof item & { medicineId: string } => Boolean(item.medicineId))
        .map(item => {
          const linkedReview = item.medicine?.reviewRequests?.[0] || null;
          const linkedReviewDoctor = linkedReview?.reviewedByDoctor || linkedReview?.doctor || linkedReview?.poolDoctor || null;

          return {
            medicineId: item.medicineId,
            medicineName: item.name,
            medicineDose: item.dose,
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            pharmacyId: order.pharmacyId,
            pharmacyName: order.pharmacy?.pharmacyProfile?.pharmacyName || "Pharmacy",
            requestedQuantity: formatStoredRequestedQuantity(item.quantity, item.quantityUnit),
            quantityUnit: item.quantityUnit,
            prescriptionConfirmed: order.prescriptionConfirmed,
            fulfilmentAllowed: order.fulfilmentAllowed,
            verificationPath: order.patientSubmission?.verificationPath || null,
            doctorVerificationStatus: order.patientSubmission?.doctorVerificationStatus || "NOT_REQUIRED",
            verificationDoctor: order.patientSubmission?.verificationDoctor || linkedReviewDoctor,
            evidenceType: order.patientSubmission?.evidenceType || null,
            requestedAt: order.createdAt,
          };
        }),
    );

    return { count: activeRequests.length, activeRequests };
  },
};