import crypto from "node:crypto";
import fs from "node:fs";

import { prisma } from "../../config/prisma.js";
import {
  removeUploadedReportFile,
  resolvePatientReportFilePath,
} from "../../middleware/report-upload.middleware.js";
import { AppError } from "../../utils/AppError.js";

import type {
  CreatePatientReportInput,
  PatientReportResponse,
  PatientReportsListResponse,
  UploadedPatientReportFile,
} from "./report.types.js";

const MAX_UPLOADS_PER_DAY = 10;
const MAX_FILE_SIZE =
  8 * 1024 * 1024;

const reportInclude = {
  reviews: {
    include: {
      doctor: {
        select: {
          id: true,
          fullName: true,

          doctorProfile: {
            select: {
              specialization: true,
            },
          },
        },
      },
    },

    orderBy: {
      createdAt:
        "asc" as const,
    },
  },
};

const formatReport = (
  report: any
): PatientReportResponse => {
  const reviewed =
    report.reviews.filter(
      (review: any) => {
        return (
          review.status ===
          "REVIEWED"
        );
      }
    ).length;

  const pending =
    report.reviews.filter(
      (review: any) => {
        return (
          review.status ===
          "PENDING"
        );
      }
    ).length;

  const unread =
    report.reviews.filter(
      (review: any) => {
        return (
          review.status ===
            "REVIEWED" &&
          !review.patientSeenAt
        );
      }
    ).length;

  return {
    id: report.id,
    title: report.title,
    category:
      report.category,
    description:
      report.description,
    reportDate:
      report.reportDate,
    status: report.status,

    originalFileName:
      report.originalFileName,

    mimeType:
      report.mimeType,

    fileSize:
      report.fileSize,

    contentSafetyStatus:
      report.contentSafetyStatus,

    contentSafetyMessage:
      report.contentSafetyMessage,

    contentSafetyCheckedAt:
      report.contentSafetyCheckedAt,

    createdAt:
      report.createdAt,

    updatedAt:
      report.updatedAt,

    isUnread:
      unread > 0,

    reviewSummary: {
      total:
        report.reviews.length,
      pending,
      reviewed,
      unread,
    },

    reviews:
      report.reviews.map(
        (review: any) => {
          return {
            id: review.id,

            doctorId:
              review.doctorId,

            status:
              review.status,

            reviewNote:
              review.reviewNote,

            reviewedAt:
              review.reviewedAt,

            patientSeenAt:
              review.patientSeenAt,

            doctor: {
              id:
                review.doctor.id,

              fullName:
                review.doctor
                  .fullName,

              specialization:
                review.doctor
                  .doctorProfile
                  ?.specialization ||
                null,
            },
          };
        }
      ),
  };
};

const isPdf = (
  buffer: Buffer
) => {
  return (
    buffer
      .subarray(0, 5)
      .toString("ascii") ===
    "%PDF-"
  );
};

const isJpeg = (
  buffer: Buffer
) => {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff &&
    buffer[
      buffer.length - 2
    ] === 0xff &&
    buffer[
      buffer.length - 1
    ] === 0xd9
  );
};

const isPng = (
  buffer: Buffer
) => {
  const pngHeader =
    Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
    ]);

  const pngEnd =
    Buffer.from([
      0x00,
      0x00,
      0x00,
      0x00,
      0x49,
      0x45,
      0x4e,
      0x44,
      0xae,
      0x42,
      0x60,
      0x82,
    ]);

  return (
    buffer.length >= 20 &&
    buffer
      .subarray(0, 8)
      .equals(pngHeader) &&
    buffer
      .subarray(
        buffer.length - 12
      )
      .equals(pngEnd)
  );
};

const isWebp = (
  buffer: Buffer
) => {
  return (
    buffer.length >= 12 &&
    buffer
      .subarray(0, 4)
      .toString("ascii") ===
      "RIFF" &&
    buffer
      .subarray(8, 12)
      .toString("ascii") ===
      "WEBP"
  );
};

const validatePdfSafety = (
  buffer: Buffer
) => {
  const endingSection =
    buffer
      .subarray(
        Math.max(
          0,
          buffer.length - 8192
        )
      )
      .toString("latin1");

  if (
    !endingSection.includes(
      "%%EOF"
    )
  ) {
    throw new AppError(
      "The selected PDF appears to be incomplete or corrupted.",
      400
    );
  }

  const pdfContent =
    buffer.toString(
      "latin1"
    );

  const blockedPdfPatterns =
    [
      /\/JavaScript\b/i,
      /\/Launch\b/i,
      /\/EmbeddedFile\b/i,
      /\/OpenAction\b/i,
      /\/RichMedia\b/i,
    ];

  const containsBlockedContent =
    blockedPdfPatterns.some(
      (pattern) => {
        return pattern.test(
          pdfContent
        );
      }
    );

  if (
    containsBlockedContent
  ) {
    throw new AppError(
      "The selected PDF contains unsupported active or embedded content.",
      400
    );
  }
};

const validateFileSignature = (
  mimeType: string,
  buffer: Buffer
) => {
  if (
    mimeType ===
    "application/pdf"
  ) {
    if (!isPdf(buffer)) {
      throw new AppError(
        "The selected file is not a valid PDF.",
        400
      );
    }

    validatePdfSafety(
      buffer
    );

    return;
  }

  if (
    mimeType ===
      "image/jpeg" ||
    mimeType ===
      "image/jpg"
  ) {
    if (!isJpeg(buffer)) {
      throw new AppError(
        "The selected file is not a valid JPEG image.",
        400
      );
    }

    return;
  }

  if (
    mimeType ===
    "image/png"
  ) {
    if (!isPng(buffer)) {
      throw new AppError(
        "The selected file is not a valid PNG image.",
        400
      );
    }

    return;
  }

  if (
    mimeType ===
    "image/webp"
  ) {
    if (!isWebp(buffer)) {
      throw new AppError(
        "The selected file is not a valid WEBP image.",
        400
      );
    }

    return;
  }

  throw new AppError(
    "Unsupported medical report file type.",
    400
  );
};

const createFileHash = (
  buffer: Buffer
) => {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
};

const parseReportDate = (
  value?: string
) => {
  if (!value) {
    return null;
  }

  return new Date(
    `${value}T00:00:00.000Z`
  );
};

const getOwnedReport = async (
  patientId: string,
  reportId: string
) => {
  const report =
    await prisma.patientReport.findFirst({
      where: {
        id: reportId,
        patientId,
      },

      include:
        reportInclude,
    });

  if (!report) {
    throw new AppError(
      "Medical report not found.",
      404
    );
  }

  return report;
};

const isPrismaUniqueError = (
  error: unknown
) => {
  return Boolean(
    error &&
      typeof error ===
        "object" &&
      "code" in error &&
      error.code === "P2002"
  );
};

export const reportService = {
  async createReport(
    patientId: string,
    data:
      CreatePatientReportInput,
    file:
      UploadedPatientReportFile
  ): Promise<PatientReportResponse> {
    try {
      const uploadWindowStart =
        new Date(
          Date.now() -
            24 *
              60 *
              60 *
              1000
        );

      const [
        recentUploadCount,
        assignments,
      ] = await Promise.all([
        prisma.patientReport.count({
          where: {
            patientId,

            createdAt: {
              gte:
                uploadWindowStart,
            },
          },
        }),

        prisma.patientDoctorAssignment.findMany({
          where: {
            patientId,
            status: "ACTIVE",

            doctor: {
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

          select: {
            doctorId: true,
          },
        }),
      ]);

      if (
        recentUploadCount >=
        MAX_UPLOADS_PER_DAY
      ) {
        throw new AppError(
          "You can upload a maximum of 10 medical reports within 24 hours.",
          429
        );
      }

      if (
        assignments.length === 0
      ) {
        throw new AppError(
          "Assign an approved doctor before uploading a report for review.",
          400
        );
      }

      const fileBuffer =
        await fs.promises.readFile(
          file.path
        );

      if (
        fileBuffer.length === 0
      ) {
        throw new AppError(
          "The selected medical report file is empty.",
          400
        );
      }

      if (
        fileBuffer.length >
        MAX_FILE_SIZE
      ) {
        throw new AppError(
          "Medical report file cannot exceed 8 MB.",
          400
        );
      }

      validateFileSignature(
        file.mimetype,
        fileBuffer
      );

      const fileHash =
        createFileHash(
          fileBuffer
        );

      const duplicateReport =
        await prisma.patientReport.findFirst({
          where: {
            patientId,
            fileHash,
          },

          select: {
            id: true,
          },
        });

      if (duplicateReport) {
        throw new AppError(
          "This medical report file has already been uploaded.",
          409
        );
      }

      const uniqueDoctorIds =
        Array.from(
          new Set(
            assignments.map(
              (assignment) => {
                return assignment.doctorId;
              }
            )
          )
        );

      const report =
        await prisma.patientReport.create({
          data: {
            patientId,

            title:
              data.title.trim(),

            category:
              data.category,

            description:
              data.description?.trim() ||
              null,

            reportDate:
              parseReportDate(
                data.reportDate
              ),

            status:
              "PENDING_REVIEW",

            originalFileName:
              file.originalname,

            storedFileName:
              file.filename,

            mimeType:
              file.mimetype,

            fileSize:
              fileBuffer.length,

            fileHash,

            contentSafetyStatus:
              "REVIEW_REQUIRED",

            contentSafetyMessage:
              "File type, signature and active-content checks passed. The report still requires manual doctor review.",

            contentSafetyCheckedAt:
              new Date(),

            isSampleDataConfirmed:
              true,

            reviews: {
              create:
                uniqueDoctorIds.map(
                  (doctorId) => {
                    return {
                      doctorId,
                      status:
                        "PENDING" as const,
                    };
                  }
                ),
            },
          },

          include:
            reportInclude,
        });

      return formatReport(
        report
      );
    } catch (error) {
      await removeUploadedReportFile(
        file.path
      );

      if (
        isPrismaUniqueError(
          error
        )
      ) {
        throw new AppError(
          "This medical report file has already been uploaded.",
          409
        );
      }

      throw error;
    }
  },

  async listReports(
    patientId: string
  ): Promise<PatientReportsListResponse> {
    const reports =
      await prisma.patientReport.findMany({
        where: {
          patientId,
        },

        include:
          reportInclude,

        orderBy: {
          createdAt: "desc",
        },
      });

    const formattedReports =
      reports.map(
        formatReport
      );

    return {
      reports:
        formattedReports,

      summary: {
        total:
          formattedReports.length,

        pending:
          formattedReports.filter(
            (report) => {
              return (
                report.status ===
                "PENDING_REVIEW"
              );
            }
          ).length,

        partiallyReviewed:
          formattedReports.filter(
            (report) => {
              return (
                report.status ===
                "PARTIALLY_REVIEWED"
              );
            }
          ).length,

        reviewed:
          formattedReports.filter(
            (report) => {
              return (
                report.status ===
                "REVIEWED"
              );
            }
          ).length,

        unreadReviews:
          formattedReports.reduce(
            (
              total,
              report
            ) => {
              return (
                total +
                report
                  .reviewSummary
                  .unread
              );
            },
            0
          ),
      },
    };
  },

  async getReportDetail(
    patientId: string,
    reportId: string
  ): Promise<PatientReportResponse> {
    const report =
      await getOwnedReport(
        patientId,
        reportId
      );

    return formatReport(
      report
    );
  },

  async getReportFile(
    patientId: string,
    reportId: string
  ) {
    const report =
      await prisma.patientReport.findFirst({
        where: {
          id: reportId,
          patientId,
        },

        select: {
          originalFileName:
            true,

          storedFileName:
            true,

          mimeType: true,

          contentSafetyStatus:
            true,
        },
      });

    if (!report) {
      throw new AppError(
        "Medical report not found.",
        404
      );
    }

    if (
      report.contentSafetyStatus ===
      "BLOCKED"
    ) {
      throw new AppError(
        "This medical report file has been blocked.",
        403
      );
    }

    const absolutePath =
      resolvePatientReportFilePath(
        report.storedFileName
      );

    try {
      await fs.promises.access(
        absolutePath,
        fs.constants.R_OK
      );
    } catch {
      throw new AppError(
        "Medical report file is unavailable.",
        404
      );
    }

    return {
      absolutePath,

      originalFileName:
        report.originalFileName,

      mimeType:
        report.mimeType,
    };
  },

  async markReportReviewsSeen(
    patientId: string,
    reportId: string
  ): Promise<PatientReportResponse> {
    await getOwnedReport(
      patientId,
      reportId
    );

    await prisma.patientReportReview.updateMany({
      where: {
        reportId,
        status: "REVIEWED",
        patientSeenAt: null,
      },

      data: {
        patientSeenAt:
          new Date(),
      },
    });

    const updatedReport =
      await getOwnedReport(
        patientId,
        reportId
      );

    return formatReport(
      updatedReport
    );
  },
};