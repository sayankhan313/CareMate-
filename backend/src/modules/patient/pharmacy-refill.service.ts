import path from "node:path";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";

import type {
  CreatePharmacyRefillInput,
  PharmacyRefillResponse,
} from "./pharmacy-refill.types.js";

const TERMINAL_ORDER_STATUSES = [
  "REJECTED",
  "DELIVERED",
  "COLLECTED",
  "CANCELLED",
] as const;

const getPatientMedicine = async (
  patientId: string,
  medicineId: string,
) => {
  const medicine =
    await prisma.medicine.findFirst({
      where: {
        id: medicineId,
        patientId,
        isActive: true,
      },

      select: {
        id: true,
        name: true,
        dose: true,
        instructions: true,
        source: true,
        prescribedByDoctorId: true,

        prescriptionItem: {
          select: {
            id: true,
            prescriptionId: true,
          },
        },
      },
    });

  if (!medicine) {
    throw new AppError(
      "Medicine not found in your active medicines",
      404,
    );
  }

  return medicine;
};

const getPatient = async (
  patientId: string,
) => {
  const patient =
    await prisma.user.findFirst({
      where: {
        id: patientId,
        role: "PATIENT",
      },

      select: {
        id: true,
        fullName: true,
      },
    });

  if (!patient) {
    throw new AppError(
      "Patient account not found",
      404,
    );
  }

  return patient;
};

const getPrimaryPharmacy = async (
  patientId: string,
) => {
  const link =
    await prisma.patientPharmacyLink
      .findFirst({
        where: {
          patientId,
          isPrimary: true,
        },

        select: {
          id: true,
          pharmacyId: true,
          chargePreference: true,

          pharmacy: {
            select: {
              id: true,
              role: true,
              accountStatus: true,
              isEmailVerified: true,

              pharmacyProfile: {
                select: {
                  pharmacyName: true,
                },
              },
            },
          },
        },
      });

  if (!link) {
    throw new AppError(
      "Please select a primary pharmacy before requesting medicine",
      400,
    );
  }

  const pharmacyAvailable =
    link.pharmacy.role ===
      "PHARMACY" &&
    link.pharmacy
      .isEmailVerified &&
    (
      link.pharmacy
        .accountStatus ===
        "ACTIVE" ||
      link.pharmacy
        .accountStatus ===
        "APPROVED"
    ) &&
    Boolean(
      link.pharmacy
        .pharmacyProfile,
    );

  if (!pharmacyAvailable) {
    throw new AppError(
      "Your primary pharmacy is currently unavailable. Please select another approved pharmacy.",
      409,
    );
  }

  return link;
};

const getAssignedVerificationDoctor =
  async (
    patientId: string,
    doctorId: string,
  ) => {
    const assignment =
      await prisma
        .patientDoctorAssignment
        .findFirst({
          where: {
            patientId,
            doctorId,
            status: "ACTIVE",

            doctor: {
              is: {
                role: "DOCTOR",
                isEmailVerified:
                  true,

                accountStatus: {
                  in: [
                    "ACTIVE",
                    "APPROVED",
                  ],
                },
              },
            },
          },

          select: {
            id: true,

            doctor: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        });

    if (!assignment) {
      throw new AppError(
        "The selected doctor is not currently assigned to you.",
        403,
      );
    }

    return assignment.doctor;
  };

const findActiveRefillRequest =
  async (
    patientId: string,
    medicineId: string,
  ) => {
    return prisma.medicineOrder
      .findFirst({
        where: {
          patientId,

          orderSource:
            "REFILL_REQUEST",

          status: {
            notIn: [
              ...TERMINAL_ORDER_STATUSES,
            ],
          },

          items: {
            some: {
              medicineId,
            },
          },
        },

        select: {
          id: true,
          orderNumber: true,
          pharmacyId: true,
          status: true,
          createdAt: true,

          pharmacy: {
            select: {
              pharmacyProfile: {
                select: {
                  pharmacyName:
                    true,
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });
  };

const ensureNoActiveRefillRequest =
  async (
    patientId: string,
    medicineId: string,
  ) => {
    const existing =
      await findActiveRefillRequest(
        patientId,
        medicineId,
      );

    if (existing) {
      throw new AppError(
        `A pharmacy request for this medicine is already active${
          existing.orderNumber
            ? ` (${existing.orderNumber})`
            : ""
        }.`,
        409,
      );
    }
  };

const getStoredEvidencePath = (
  filePath: string,
) => {
  return path
    .relative(
      process.cwd(),
      filePath,
    )
    .split(path.sep)
    .join("/");
};

const notifyPharmacy = async ({
  pharmacyId,
  patientId,
  patientName,
  medicineName,
  orderId,
  orderNumber,
  prescriptionConfirmed,
}: {
  pharmacyId: string;
  patientId: string;
  patientName: string;
  medicineName: string;
  orderId: string;
  orderNumber: string | null;
  prescriptionConfirmed: boolean;
}) => {
  try {
    const existing =
      await prisma.userNotification
        .findFirst({
          where: {
            userId: pharmacyId,

            type:
              "NEW_MEDICINE_ORDER",

            entityType:
              "MEDICINE_ORDER",

            entityId:
              orderId,
          },

          select: {
            id: true,
          },
        });

    if (existing) return;

    await notificationService
      .createAndSend({
        userId: pharmacyId,

        type:
          "NEW_MEDICINE_ORDER",

        title:
          "New patient medicine request",

        body:
          `${patientName} requested ${medicineName} from your pharmacy.`,

        priority: "HIGH",

        entityType:
          "MEDICINE_ORDER",

        entityId:
          orderId,

        targetScreen:
          "PharmacyDashboard",

        data: {
          orderId,
          orderNumber,
          patientId,
          patientName,
          medicineName,
          orderSource:
            "REFILL_REQUEST",
          prescriptionConfirmed,
          status: "RECEIVED",
        },
      });
  } catch (error) {
    console.warn(
      `Unable to notify pharmacy about refill order ${orderId}:`,
      error instanceof Error
        ? error.message
        : error,
    );
  }
};

const notifyVerificationDoctor =
  async ({
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
      const existing =
        await prisma.userNotification
          .findFirst({
            where: {
              userId: doctorId,

              type:
                "REFILL_DOCTOR_VERIFICATION_REQUESTED",

              entityType:
                "PATIENT_PRESCRIPTION_SUBMISSION",

              entityId:
                submissionId,
            },

            select: {
              id: true,
            },
          });

      if (existing) return;

      await notificationService
        .createAndSend({
          userId: doctorId,

          type:
            "REFILL_DOCTOR_VERIFICATION_REQUESTED",

          title:
            "Medicine verification request",

          body:
            `${patientName} says you prescribed or recommended ${medicineName}. Please confirm or reject this request.`,

          priority: "HIGH",

          entityType:
            "PATIENT_PRESCRIPTION_SUBMISSION",

          entityId:
            submissionId,

          targetScreen:
            "DoctorDashboard",

          data: {
            submissionId,
            orderId,
            orderNumber,
            patientId,
            patientName,
            medicineName,
            source:
              "REFILL_DOCTOR_VERIFICATION",
            status:
              "PENDING",
          },
        });
    } catch (error) {
      console.warn(
        `Unable to notify doctor about refill verification ${submissionId}:`,
        error instanceof Error
          ? error.message
          : error,
      );
    }
  };

export const pharmacyRefillService = {
  async createRefillRequest(
    patientId: string,
    input: CreatePharmacyRefillInput,
  ): Promise<PharmacyRefillResponse> {
    const [
      patient,
      medicine,
      primaryPharmacy,
    ] = await Promise.all([
      getPatient(patientId),

      getPatientMedicine(
        patientId,
        input.medicineId,
      ),

      getPrimaryPharmacy(
        patientId,
      ),
    ]);

    await ensureNoActiveRefillRequest(
      patientId,
      medicine.id,
    );

    const quantityUnit =
      input.quantityUnit.trim();

    const quantityText =
      `${input.requestedQuantity} ${quantityUnit}`;

    const note =
      input.note?.trim() ||
      null;

    const linkedDoctorPrescription =
      medicine.source ===
        "DOCTOR_PRESCRIBED" &&
      Boolean(
        medicine
          .prescribedByDoctorId,
      ) &&
      Boolean(
        medicine
          .prescriptionItem
          ?.prescriptionId,
      );

    let verificationPath:
      | "CAREMATE_PRESCRIPTION"
      | "ASSIGNED_DOCTOR"
      | "EXTERNAL_EVIDENCE";

    let verificationDoctor:
      | {
          id: string;
          fullName: string;
          email: string;
        }
      | null = null;

    let evidenceType =
      input.evidenceType ||
      null;

    let storedEvidencePath:
      | string
      | null = null;

    if (
      linkedDoctorPrescription
    ) {
      verificationPath =
        "CAREMATE_PRESCRIPTION";

      evidenceType = null;
    } else {
      if (
        !input.verificationPath
      ) {
        throw new AppError(
          "Please choose whether this medicine should be verified by one of your assigned doctors or by supporting evidence.",
          400,
        );
      }

      verificationPath =
        input.verificationPath;

      if (
        verificationPath ===
        "ASSIGNED_DOCTOR"
      ) {
        if (
          !input.verificationDoctorId
        ) {
          throw new AppError(
            "Please select one of your assigned doctors.",
            400,
          );
        }

        verificationDoctor =
          await getAssignedVerificationDoctor(
            patientId,
            input.verificationDoctorId,
          );

        evidenceType = null;
      }

      if (
        verificationPath ===
        "EXTERNAL_EVIDENCE"
      ) {
        if (!evidenceType) {
          throw new AppError(
            "Please select the type of supporting evidence.",
            400,
          );
        }

        if (
          !input.evidenceFilePath
        ) {
          throw new AppError(
            "Please upload prescription or medicine evidence.",
            400,
          );
        }

        storedEvidencePath =
          getStoredEvidencePath(
            input.evidenceFilePath,
          );
      }
    }

    const prescriptionId =
      linkedDoctorPrescription
        ? medicine
            .prescriptionItem!
            .prescriptionId
        : null;

    const prescriptionItemId =
      linkedDoctorPrescription
        ? medicine
            .prescriptionItem!
            .id
        : null;

    const doctorId =
      linkedDoctorPrescription
        ? medicine
            .prescribedByDoctorId
        : null;

    const prescriptionConfirmed =
      linkedDoctorPrescription;

    const fulfilmentAllowed =
      linkedDoctorPrescription;

    const doctorVerificationStatus =
      verificationPath ===
      "ASSIGNED_DOCTOR"
        ? "PENDING"
        : "NOT_REQUIRED";

    const submissionStatus =
      verificationPath ===
      "CAREMATE_PRESCRIPTION"
        ? "VERIFIED"
        : verificationPath ===
            "ASSIGNED_DOCTOR"
          ? "UNDER_REVIEW"
          : "VERIFICATION_REQUIRED";

    const now = new Date();

    const created =
      await prisma.$transaction(
        async tx => {
          const duplicate =
            await tx.medicineOrder
              .findFirst({
                where: {
                  patientId,

                  orderSource:
                    "REFILL_REQUEST",

                  status: {
                    notIn: [
                      ...TERMINAL_ORDER_STATUSES,
                    ],
                  },

                  items: {
                    some: {
                      medicineId:
                        medicine.id,
                    },
                  },
                },

                select: {
                  id: true,
                },
              });

          if (duplicate) {
            throw new AppError(
              "A pharmacy request for this medicine is already active.",
              409,
            );
          }

          const submission =
            await tx
              .patientPrescriptionSubmission
              .create({
                data: {
                  patientId,

                  pharmacyId:
                    primaryPharmacy
                      .pharmacyId,

                  requestType:
                    "REFILL_REQUEST",

                  verificationPath,

                  verificationDoctorId:
                    verificationDoctor
                      ?.id ||
                    null,

                  doctorVerificationStatus,

                  doctorVerificationRequestedAt:
                    verificationPath ===
                    "ASSIGNED_DOCTOR"
                      ? now
                      : null,

                  evidenceType,

                  imageUrl:
                    storedEvidencePath,

                  notes: note,

                  status:
                    submissionStatus,
                },

                select: {
                  id: true,
                  requestType: true,
                  status: true,
                  verificationPath: true,
                  doctorVerificationStatus:
                    true,
                  evidenceType: true,

                  verificationDoctor: {
                    select: {
                      id: true,
                      fullName: true,
                    },
                  },
                },
              });

          const submissionItem =
            await tx
              .patientPrescriptionSubmissionItem
              .create({
                data: {
                  submissionId:
                    submission.id,

                  medicineId:
                    medicine.id,

                  name:
                    medicine.name,

                  dose:
                    medicine.dose,

                  quantity:
                    quantityText,

                  instructions:
                    medicine.instructions,
                },

                select: {
                  id: true,
                },
              });

          const historyNote =
            verificationPath ===
            "CAREMATE_PRESCRIPTION"
              ? "Patient explicitly requested a refill for a CareMate+ doctor-prescribed medicine."
              : verificationPath ===
                  "ASSIGNED_DOCTOR"
                ? "Patient requested medicine and selected an assigned doctor to confirm whether the medicine was prescribed or recommended by them."
                : "Patient requested medicine using external supporting evidence. Pharmacist review is required before fulfilment.";

          const order =
            await tx.medicineOrder
              .create({
                data: {
                  orderNumber:
                    `CMRF-${submission.id}`,

                  patientId,

                  pharmacyId:
                    primaryPharmacy
                      .pharmacyId,

                  doctorId,

                  prescriptionId,

                  patientSubmissionId:
                    submission.id,

                  orderSource:
                    "REFILL_REQUEST",

                  medicineName:
                    medicine.name,

                  dose:
                    medicine.dose,

                  quantity:
                    quantityText,

                  instructions:
                    medicine.instructions,

                  requestedByRole:
                    "PATIENT",

                  requestedByName:
                    patient.fullName,

                  requestNote:
                    note,

                  prescriptionConfirmed,

                  prescriptionConfirmedAt:
                    prescriptionConfirmed
                      ? now
                      : null,

                  fulfilmentAllowed,

                  status:
                    "RECEIVED",

                  items: {
                    create: {
                      medicineId:
                        medicine.id,

                      prescriptionItemId,

                      submissionItemId:
                        submissionItem.id,

                      name:
                        medicine.name,

                      dose:
                        medicine.dose,

                      quantity:
                        quantityText,

                      instructions:
                        medicine.instructions,

                      quantityUnit,
                    },
                  },

                  payment: {
                    create: {
                      chargePreference:
                        primaryPharmacy
                          .chargePreference,

                      chargeableItemCount:
                        1,

                      unitChargePence:
                        0,

                      amountPence:
                        0,

                      currency:
                        "GBP",

                      provider:
                        "STRIPE",

                      testMode:
                        true,

                      status:
                        "PENDING",
                    },
                  },

                  statusHistory: {
                    create: {
                      changedById:
                        patientId,

                      fromStatus:
                        null,

                      toStatus:
                        "RECEIVED",

                      note:
                        historyNote,
                    },
                  },
                },

                select: {
                  id: true,
                  orderNumber: true,
                  status: true,
                  orderSource: true,
                  prescriptionConfirmed:
                    true,
                  fulfilmentAllowed:
                    true,
                },
              });

          return {
            submission,
            order,
          };
        },
      );

    if (
      verificationPath ===
      "ASSIGNED_DOCTOR" &&
      verificationDoctor
    ) {
      await notifyVerificationDoctor({
        doctorId:
          verificationDoctor.id,

        patientId,

        patientName:
          patient.fullName,

        medicineName:
          medicine.name,

        submissionId:
          created.submission.id,

        orderId:
          created.order.id,

        orderNumber:
          created.order
            .orderNumber,
      });
    } else {
      await notifyPharmacy({
        pharmacyId:
          primaryPharmacy
            .pharmacyId,

        patientId,

        patientName:
          patient.fullName,

        medicineName:
          medicine.name,

        orderId:
          created.order.id,

        orderNumber:
          created.order
            .orderNumber,

        prescriptionConfirmed:
          created.order
            .prescriptionConfirmed,
      });
    }

    return {
      submission: {
        id:
          created.submission.id,

        requestType:
          "REFILL_REQUEST",

        status:
          created.submission
            .status,

        medicineId:
          medicine.id,

        verificationPath,

        doctorVerificationStatus:
          created.submission
            .doctorVerificationStatus,

        verificationDoctor:
          created.submission
            .verificationDoctor,

        evidenceType:
          created.submission
            .evidenceType,

        hasEvidence:
          Boolean(
            storedEvidencePath,
          ),
      },

      order: {
        id:
          created.order.id,

        orderNumber:
          created.order
            .orderNumber,

        status:
          created.order.status,

        orderSource:
          "REFILL_REQUEST",

        prescriptionConfirmed:
          created.order
            .prescriptionConfirmed,

        fulfilmentAllowed:
          created.order
            .fulfilmentAllowed,
      },

      pharmacy: {
        id:
          primaryPharmacy
            .pharmacyId,

        pharmacyName:
          primaryPharmacy
            .pharmacy
            .pharmacyProfile
            ?.pharmacyName ||
          "Primary pharmacy",
      },

      medicine: {
        id:
          medicine.id,

        name:
          medicine.name,

        dose:
          medicine.dose,

        source:
          medicine.source,
      },

      requiresDoctorVerification:
        verificationPath ===
        "ASSIGNED_DOCTOR",

      requiresPharmacyVerification:
        verificationPath ===
        "EXTERNAL_EVIDENCE",
    };
  },

  async listActiveRefillRequests(
    patientId: string,
  ) {
    const orders =
      await prisma.medicineOrder
        .findMany({
          where: {
            patientId,

            orderSource:
              "REFILL_REQUEST",

            status: {
              notIn: [
                ...TERMINAL_ORDER_STATUSES,
              ],
            },
          },

          select: {
            id: true,
            orderNumber: true,
            pharmacyId: true,
            status: true,
            createdAt: true,
            prescriptionConfirmed:
              true,
            fulfilmentAllowed:
              true,

            pharmacy: {
              select: {
                pharmacyProfile: {
                  select: {
                    pharmacyName:
                      true,
                  },
                },
              },
            },

            patientSubmission: {
              select: {
                verificationPath:
                  true,

                doctorVerificationStatus:
                  true,

                evidenceType:
                  true,

                verificationDoctor: {
                  select: {
                    id: true,
                    fullName:
                      true,
                  },
                },
              },
            },

            items: {
              select: {
                medicineId:
                  true,
                name: true,
                dose: true,
                quantity: true,
                quantityUnit:
                  true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        });

    const activeRequests =
      orders.flatMap(order =>
        order.items
          .filter(
            (
              item,
            ): item is typeof item & {
              medicineId: string;
            } =>
              Boolean(
                item.medicineId,
              ),
          )
          .map(item => ({
            medicineId:
              item.medicineId,

            medicineName:
              item.name,

            medicineDose:
              item.dose,

            orderId:
              order.id,

            orderNumber:
              order.orderNumber,

            orderStatus:
              order.status,

            pharmacyId:
              order.pharmacyId,

            pharmacyName:
              order.pharmacy
                ?.pharmacyProfile
                ?.pharmacyName ||
              "Primary pharmacy",

            requestedQuantity:
              item.quantity,

            quantityUnit:
              item.quantityUnit,

            prescriptionConfirmed:
              order
                .prescriptionConfirmed,

            fulfilmentAllowed:
              order
                .fulfilmentAllowed,

            verificationPath:
              order
                .patientSubmission
                ?.verificationPath ||
              null,

            doctorVerificationStatus:
              order
                .patientSubmission
                ?.doctorVerificationStatus ||
              "NOT_REQUIRED",

            verificationDoctor:
              order
                .patientSubmission
                ?.verificationDoctor ||
              null,

            evidenceType:
              order
                .patientSubmission
                ?.evidenceType ||
              null,

            requestedAt:
              order.createdAt,
          })),
      );

    return {
      count:
        activeRequests.length,

      activeRequests,
    };
  },
};