import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { medicineReferenceService } from "../patient/medicine-reference.service.js";
import { notificationService } from "../notification/notification.service.js";

import type {
  CreateDoctorPrescriptionInput,
  CreateDoctorPrescriptionResponse,
  DoctorPrescriptionDetailResponse,
  DoctorPrescriptionResponse,
  DoctorPrescriptionsListResponse,
} from "./doctor-prescriptions.types.js";

type PrescriptionImageFile = { filename: string } | null;

type RoutedPharmacyOrder = {
  id: string;
  pharmacyId: string;
  orderNumber: string | null;
} | null;

const prescriptionInclude = {
  patient: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },

  prescribedByDoctor: {
    select: {
      id: true,
      fullName: true,
      email: true,
      doctorProfile: {
        select: {
          specialization: true,
        },
      },
    },
  },

  items: {
    orderBy: {
      createdAt: "asc" as const,
    },
  },
} as const;

const ensureApprovedDoctor = async (doctorId: string) => {
  const doctor = await prisma.user.findUnique({
    where: {
      id: doctorId,
    },

    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      accountStatus: true,
      isEmailVerified: true,
    },
  });

  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }

  if (doctor.role !== "DOCTOR") {
    throw new AppError("Only doctors can create prescriptions", 403);
  }

  if (!doctor.isEmailVerified) {
    throw new AppError("Please verify your email first", 403);
  }

  if (
    doctor.accountStatus !== "ACTIVE" &&
    doctor.accountStatus !== "APPROVED"
  ) {
    throw new AppError("Doctor account is not approved yet", 403);
  }

  return doctor;
};

const ensureAssignedPatient = async (
  doctorId: string,
  patientId: string
) => {
  await ensureApprovedDoctor(doctorId);

  const assignment =
    await prisma.patientDoctorAssignment.findFirst({
      where: {
        doctorId,
        patientId,
        status: "ACTIVE",

        patient: {
          is: {
            role: "PATIENT",
          },
        },
      },

      select: {
        id: true,
        assignmentType: true,

        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },

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
      "You are not actively assigned to this patient",
      403
    );
  }

  return assignment;
};

const parseDateInput = (value: string) => {
  let year: number;
  let month: number;
  let day: number;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const parts = value.split("/");

    day = Number(parts[0]);
    month = Number(parts[1]);
    year = Number(parts[2]);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parts = value.split("-");

    year = Number(parts[0]);
    month = Number(parts[1]);
    day = Number(parts[2]);
  } else {
    throw new AppError(
      "Date must be in DD/MM/YYYY or YYYY-MM-DD format",
      400
    );
  }

  const parsedDate = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  const isInvalid =
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day;

  if (isInvalid) {
    throw new AppError(
      "Please enter a valid prescription date",
      400
    );
  }

  return parsedDate;
};

const getPrescriptionImageUrl = (
  file: PrescriptionImageFile
) => {
  return file
    ? `/uploads/prescriptions/${file.filename}`
    : null;
};

const formatPrescription = (
  prescription: any
): DoctorPrescriptionResponse => ({
  id: prescription.id,
  patientId: prescription.patientId,
  prescribedByDoctorId:
    prescription.prescribedByDoctorId,
  source: prescription.source,
  imageUrl: prescription.imageUrl,
  rawDetectedText:
    prescription.rawDetectedText,
  ocrConfidence:
    prescription.ocrConfidence,
  notes: prescription.notes,
  prescribedAt:
    prescription.prescribedAt,
  createdAt:
    prescription.createdAt,
  updatedAt:
    prescription.updatedAt,

  patient: {
    id: prescription.patient.id,
    fullName:
      prescription.patient.fullName,
    email:
      prescription.patient.email,
  },

  prescribedByDoctor: {
    id: prescription.prescribedByDoctor.id,
    fullName:
      prescription.prescribedByDoctor.fullName,
    email:
      prescription.prescribedByDoctor.email,

    specialization:
      prescription.prescribedByDoctor
        .doctorProfile?.specialization ||
      null,
  },

  items: prescription.items.map(
    (item: any) => ({
      id: item.id,
      prescriptionId:
        item.prescriptionId,
      medicineId:
        item.medicineId,
      name: item.name,
      dose: item.dose,
      instructions:
        item.instructions,
      frequency:
        item.frequency,
      customFrequency:
        item.customFrequency,
      selectedTimes:
        item.selectedTimes,
      startDate:
        item.startDate,
      endDate:
        item.endDate,
      prescriptionPattern:
        item.prescriptionPattern,
      createdAt:
        item.createdAt,
      updatedAt:
        item.updatedAt,
    })
  ),
});

const getPrescriptionById = async (
  prescriptionId: string
) => {
  return prisma.prescription.findUnique({
    where: {
      id: prescriptionId,
    },

    include: prescriptionInclude,
  });
};

const getDoctorDisplayName = (
  fullName: string
) => {
  const name = fullName.trim();

  return /^dr\.?\s/i.test(name)
    ? name
    : `Dr. ${name}`;
};

const notifyPatientAboutPrescription = async (
  prescription: any
) => {
  try {
    const existingNotification =
      await prisma.userNotification.findFirst({
        where: {
          userId:
            prescription.patientId,
          type: "NEW_PRESCRIPTION",
          entityType: "PRESCRIPTION",
          entityId: prescription.id,
        },

        select: {
          id: true,
        },
      });

    if (existingNotification) {
      return;
    }

    const doctorName =
      getDoctorDisplayName(
        prescription.prescribedByDoctor
          .fullName
      );

    const medicineNames =
      prescription.items.map(
        (item: any) => item.name
      );

    const medicineCount =
      medicineNames.length;

    await notificationService.createAndSend({
      userId:
        prescription.patientId,

      type: "NEW_PRESCRIPTION",

      title:
        "New prescription",

      body:
        medicineCount === 1
          ? `${doctorName} prescribed ${medicineNames[0]} for you.`
          : `${doctorName} prescribed ${medicineCount} medicines for you.`,

      priority: "HIGH",

      entityType:
        "PRESCRIPTION",

      entityId:
        prescription.id,

      targetScreen:
        "PatientMedicines",

      data: {
        prescriptionId:
          prescription.id,

        patientId:
          prescription.patientId,

        patientName:
          prescription.patient.fullName,

        doctorId:
          prescription.prescribedByDoctorId,

        doctorName,

        medicineCount,
        medicineNames,

        prescribedAt:
          prescription.prescribedAt?.toISOString() ||
          prescription.createdAt.toISOString(),

        source:
          "DOCTOR_PRESCRIPTION",
      },
    });
  } catch (error) {
    console.warn(
      `Unable to notify patient about prescription ${prescription.id}:`,
      error instanceof Error
        ? error.message
        : error
    );
  }
};

const notifyPharmacyAboutPrescriptionOrder = async ({
  prescription,
  order,
}: {
  prescription: any;
  order: RoutedPharmacyOrder;
}) => {
  if (!order) {
    return;
  }

  try {
    const existingNotification =
      await prisma.userNotification.findFirst({
        where: {
          userId: order.pharmacyId,
          type: "NEW_MEDICINE_ORDER",
          entityType: "MEDICINE_ORDER",
          entityId: order.id,
        },

        select: {
          id: true,
        },
      });

    if (existingNotification) {
      return;
    }

    const medicineNames =
      prescription.items.map(
        (item: any) => item.name
      );

    const medicineCount =
      medicineNames.length;

    await notificationService.createAndSend({
      userId: order.pharmacyId,

      type:
        "NEW_MEDICINE_ORDER",

      title:
        "New doctor prescription",

      body:
        medicineCount === 1
          ? `A new prescription for ${medicineNames[0]} has been routed to your pharmacy.`
          : `A new prescription containing ${medicineCount} medicines has been routed to your pharmacy.`,

      priority: "HIGH",

      entityType:
        "MEDICINE_ORDER",

      entityId: order.id,

      targetScreen:
        "PharmacyDashboard",

      data: {
        orderId: order.id,
        orderNumber:
          order.orderNumber,

        prescriptionId:
          prescription.id,

        patientId:
          prescription.patientId,

        patientName:
          prescription.patient.fullName,

        doctorId:
          prescription.prescribedByDoctorId,

        doctorName:
          getDoctorDisplayName(
            prescription.prescribedByDoctor
              .fullName
          ),

        medicineCount,
        medicineNames,

        orderSource:
          "DOCTOR_PRESCRIPTION",

        status:
          "RECEIVED",
      },
    });
  } catch (error) {
    console.warn(
      `Unable to notify pharmacy about medicine order ${order.id}:`,
      error instanceof Error
        ? error.message
        : error
    );
  }
};

export const doctorPrescriptionsService = {
  async parsePrescriptionScan({
    doctorId,
    detectedText,
    ocrConfidence,
  }: {
    doctorId: string;
    detectedText: string;
    ocrConfidence: number;
  }) {
    await ensureApprovedDoctor(
      doctorId
    );

    return medicineReferenceService.parsePrescriptionScan({
      detectedText,
      ocrConfidence,
    });
  },

  async createPrescription({
    doctorId,
    patientId,
    input,
    imageFile,
  }: {
    doctorId: string;
    patientId: string;
    input: CreateDoctorPrescriptionInput;
    imageFile: PrescriptionImageFile;
  }): Promise<CreateDoctorPrescriptionResponse> {
    const assignment =
      await ensureAssignedPatient(
        doctorId,
        patientId
      );

    const parsedItems =
      input.items.map(item => {
        const startDate =
          parseDateInput(
            item.startDate
          );

        const endDate =
          item.endDate
            ? parseDateInput(
                item.endDate
              )
            : null;

        if (
          endDate &&
          endDate < startDate
        ) {
          throw new AppError(
            `End date cannot be before start date for ${item.name}`,
            400
          );
        }

        return {
          ...item,
          startDate,
          endDate,

          selectedTimes:
            Array.from(
              new Set(
                item.selectedTimes
              )
            ),
        };
      });

    const imageUrl =
      getPrescriptionImageUrl(
        imageFile
      );

    const transactionResult =
      await prisma.$transaction(
        async tx => {
          const prescription =
            await tx.prescription.create({
              data: {
                patientId,
                prescribedByDoctorId:
                  doctorId,

                source:
                  input.source,

                imageUrl,

                rawDetectedText:
                  input.rawDetectedText
                    ?.trim() ||
                  null,

                ocrConfidence:
                  input.ocrConfidence ??
                  null,

                notes:
                  input.notes?.trim() ||
                  null,
              },

              select: {
                id: true,
              },
            });

          for (
            const item of parsedItems
          ) {
            const medicine =
              await tx.medicine.create({
                data: {
                  patientId,

                  prescribedByDoctorId:
                    doctorId,

                  name:
                    item.name.trim(),

                  dose:
                    item.dose.trim(),

                  instructions:
                    item.instructions
                      ?.trim() ||
                    null,

                  source:
                    "DOCTOR_PRESCRIBED",

                  isActive: true,
                },

                select: {
                  id: true,
                },
              });

            await tx.prescriptionItem.create({
              data: {
                prescriptionId:
                  prescription.id,

                medicineId:
                  medicine.id,

                name:
                  item.name.trim(),

                dose:
                  item.dose.trim(),

                instructions:
                  item.instructions
                    ?.trim() ||
                  null,

                frequency:
                  item.frequency,

                customFrequency:
                  item.customFrequency
                    ?.trim() ||
                  null,

                selectedTimes:
                  item.selectedTimes,

                startDate:
                  item.startDate,

                endDate:
                  item.endDate,

                prescriptionPattern:
                  item.prescriptionPattern
                    ?.trim() ||
                  null,
              },
            });

            await tx.medicineReminder.createMany({
              data:
                item.selectedTimes.map(
                  timeOfDay => ({
                    medicineId:
                      medicine.id,

                    frequency:
                      item.frequency,

                    customFrequency:
                      item.customFrequency
                        ?.trim() ||
                      null,

                    timeOfDay,

                    startDate:
                      item.startDate,

                    endDate:
                      item.endDate,

                    sendToDoctorForReview:
                      false,

                    reviewStatus:
                      "NOT_REQUESTED",

                    reviewDoctorId:
                      null,

                    reviewedByDoctorId:
                      null,

                    reviewedAt:
                      null,

                    reviewNote:
                      null,

                    isActive:
                      true,
                  })
                ),
            });
          }

          const primaryPharmacyLink =
            await tx.patientPharmacyLink.findFirst({
              where: {
                patientId,
                isPrimary: true,
              },

              select: {
                pharmacyId: true,
                chargePreference: true,
              },
            });

          let pharmacyOrder:
            RoutedPharmacyOrder =
            null;

          if (primaryPharmacyLink) {
            const pharmacy =
              await tx.user.findUnique({
                where: {
                  id:
                    primaryPharmacyLink
                      .pharmacyId,
                },

                select: {
                  id: true,
                  role: true,
                  accountStatus: true,
                  isEmailVerified: true,

                  pharmacyProfile: {
                    select: {
                      id: true,
                      pharmacyName: true,
                    },
                  },
                },
              });

            const pharmacyAvailable =
              pharmacy &&
              pharmacy.role ===
                "PHARMACY" &&
              pharmacy.isEmailVerified &&
              (pharmacy.accountStatus ===
                "ACTIVE" ||
                pharmacy.accountStatus ===
                  "APPROVED") &&
              Boolean(
                pharmacy.pharmacyProfile
              );

            if (pharmacyAvailable) {
              const existingOrder =
                await tx.medicineOrder.findFirst({
                  where: {
                    prescriptionId:
                      prescription.id,

                    orderSource:
                      "DOCTOR_PRESCRIPTION",
                  },

                  select: {
                    id: true,
                    pharmacyId: true,
                    orderNumber: true,
                  },
                });

              if (
                existingOrder?.pharmacyId
              ) {
                pharmacyOrder = {
                  id:
                    existingOrder.id,

                  pharmacyId:
                    existingOrder.pharmacyId,

                  orderNumber:
                    existingOrder.orderNumber,
                };
              } else {
                const prescriptionItems =
                  await tx.prescriptionItem.findMany({
                    where: {
                      prescriptionId:
                        prescription.id,
                    },

                    orderBy: {
                      createdAt:
                        "asc",
                    },

                    select: {
                      id: true,
                      medicineId: true,
                      name: true,
                      dose: true,
                      quantity: true,
                      instructions: true,
                    },
                  });

                const firstItem =
                  prescriptionItems[0];

                const medicineName =
                  prescriptionItems.length ===
                  1
                    ? firstItem.name
                    : `${prescriptionItems.length} prescribed medicines`;

                const createdOrder =
                  await tx.medicineOrder.create({
                    data: {
                      orderNumber:
                        `CMRX-${prescription.id}`,

                      patientId,

                      pharmacyId:
                        pharmacy.id,

                      doctorId,

                      prescriptionId:
                        prescription.id,

                      orderSource:
                        "DOCTOR_PRESCRIPTION",

                      medicineName,

                      dose:
                        prescriptionItems.length ===
                        1
                          ? firstItem.dose
                          : null,

                      quantity:
                        prescriptionItems.length ===
                        1
                          ? firstItem.quantity ||
                            "Not specified"
                          : `${prescriptionItems.length} items`,

                      instructions:
                        prescriptionItems.length ===
                        1
                          ? firstItem.instructions
                          : "See prescription items",

                      requestedByRole:
                        "DOCTOR",

                      requestedByName:
                        assignment.doctor
                          .fullName,

                      requestNote:
                        input.notes
                          ?.trim() ||
                        null,

                      prescriptionConfirmed:
                        true,

                      prescriptionConfirmedAt:
                        new Date(),

                      fulfilmentAllowed:
                        true,

                      status:
                        "RECEIVED",

                      items: {
                        create:
                          prescriptionItems.map(
                            item => ({
                              medicineId:
                                item.medicineId,

                              prescriptionItemId:
                                item.id,

                              name:
                                item.name,

                              dose:
                                item.dose,

                              quantity:
                                item.quantity,

                              instructions:
                                item.instructions,
                            })
                          ),
                      },

                      payment: {
                        create: {
                          chargePreference:
                            primaryPharmacyLink
                              .chargePreference,

                          chargeableItemCount:
                            prescriptionItems.length,

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
                            doctorId,

                          fromStatus:
                            null,

                          toStatus:
                            "RECEIVED",

                          note:
                            "Doctor prescription automatically routed to the patient's primary pharmacy.",
                        },
                      },
                    },

                    select: {
                      id: true,
                      pharmacyId: true,
                      orderNumber: true,
                    },
                  });

                if (
                  createdOrder.pharmacyId
                ) {
                  pharmacyOrder = {
                    id:
                      createdOrder.id,

                    pharmacyId:
                      createdOrder.pharmacyId,

                    orderNumber:
                      createdOrder.orderNumber,
                  };
                }
              }
            }
          }

          return {
            prescriptionId:
              prescription.id,

            pharmacyOrder,
          };
        }
      );

    const createdPrescription =
      await getPrescriptionById(
        transactionResult.prescriptionId
      );

    if (!createdPrescription) {
      throw new AppError(
        "Prescription was created but could not be loaded",
        500
      );
    }

    await notifyPatientAboutPrescription(
      createdPrescription
    );

    await notifyPharmacyAboutPrescriptionOrder({
      prescription:
        createdPrescription,

      order:
        transactionResult.pharmacyOrder,
    });

    return {
      prescription:
        formatPrescription(
          createdPrescription
        ),
    };
  },

  async listPatientPrescriptions(
    doctorId: string,
    patientId: string
  ): Promise<DoctorPrescriptionsListResponse> {
    await ensureAssignedPatient(
      doctorId,
      patientId
    );

    const prescriptions =
      await prisma.prescription.findMany({
        where: {
          patientId,
        },

        include:
          prescriptionInclude,

        orderBy: {
          prescribedAt:
            "desc",
        },

        take: 50,
      });

    return {
      prescriptions:
        prescriptions.map(
          formatPrescription
        ),
    };
  },

  async getPrescriptionDetail(
    doctorId: string,
    prescriptionId: string
  ): Promise<DoctorPrescriptionDetailResponse> {
    await ensureApprovedDoctor(
      doctorId
    );

    const prescription =
      await getPrescriptionById(
        prescriptionId
      );

    if (!prescription) {
      throw new AppError(
        "Prescription not found",
        404
      );
    }

    await ensureAssignedPatient(
      doctorId,
      prescription.patientId
    );

    return {
      prescription:
        formatPrescription(
          prescription
        ),
    };
  },
};