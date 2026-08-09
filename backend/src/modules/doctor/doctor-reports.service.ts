import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";

export type DoctorReportQueueStatus = "ALL" | "PENDING" | "REVIEWED";

type ReportQueueInput = { status: DoctorReportQueueStatus };

const reportInclude = (doctorId: string) => ({
  patient: { select: { id: true, fullName: true, email: true } },
  reviews: { where: { doctorId }, orderBy: { createdAt: "asc" as const }, take: 1 },
});

const ensureApprovedDoctor = async (doctorId: string) => {
  const doctor = await prisma.user.findUnique({
    where: { id: doctorId },
    select: { id: true, fullName: true, email: true, role: true, accountStatus: true, isEmailVerified: true },
  });

  if (!doctor) throw new AppError("Doctor not found", 404);
  if (doctor.role !== "DOCTOR") throw new AppError("Only doctors can access this resource", 403);
  if (!doctor.isEmailVerified) throw new AppError("Please verify your email first", 403);
  if (doctor.accountStatus !== "ACTIVE" && doctor.accountStatus !== "APPROVED") {
    throw new AppError("Doctor account is not approved yet", 403);
  }

  return doctor;
};

const canPatientShareReports = async (patientId: string) => {
  const privacy = await prisma.patientPrivacyPreference.findUnique({
    where: { patientId },
    select: { shareReportsWithAssignedDoctors: true },
  });

  return privacy?.shareReportsWithAssignedDoctors ?? true;
};

const ensureReportSharingAllowed = async (patientId: string) => {
  const allowed = await canPatientShareReports(patientId);

  if (!allowed) {
    throw new AppError(
      "This patient has disabled medical report sharing with assigned doctors.",
      403,
    );
  }
};

const getAssignedPatientIds = async (doctorId: string) => {
  const assignments = await prisma.patientDoctorAssignment.findMany({
    where: { doctorId, status: "ACTIVE" },
    select: { patientId: true },
  });

  const patientIds = assignments.map(assignment => assignment.patientId);

  if (patientIds.length === 0) return [];

  const privacyPreferences = await prisma.patientPrivacyPreference.findMany({
    where: { patientId: { in: patientIds } },
    select: {
      patientId: true,
      shareReportsWithAssignedDoctors: true,
    },
  });

  const blockedPatientIds = new Set(
    privacyPreferences
      .filter(preference => !preference.shareReportsWithAssignedDoctors)
      .map(preference => preference.patientId),
  );

  return patientIds.filter(patientId => !blockedPatientIds.has(patientId));
};

const ensureActiveAssignment = async (doctorId: string, patientId: string) => {
  await ensureApprovedDoctor(doctorId);

  const assignment = await prisma.patientDoctorAssignment.findFirst({
    where: { doctorId, patientId, status: "ACTIVE" },
    select: { id: true, patientId: true, doctorId: true, createdAt: true },
  });

  if (!assignment) throw new AppError("You are not assigned to this patient", 403);

  await ensureReportSharingAllowed(patientId);

  return assignment;
};

const ensureReviewRows = async (doctorId: string, reportIds: string[]) => {
  if (reportIds.length === 0) return;

  await prisma.patientReportReview.createMany({
    data: reportIds.map(reportId => ({
      reportId,
      doctorId,
      status: "PENDING" as const,
    })),
    skipDuplicates: true,
  });
};

const formatReview = (review: any) => {
  if (!review) return null;

  return {
    id: review.id,
    reportId: review.reportId,
    doctorId: review.doctorId,
    status: review.status,
    reviewNote: review.reviewNote,
    reviewedAt: review.reviewedAt,
    patientSeenAt: review.patientSeenAt,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
};

const formatReport = (report: any) => {
  const review = report.reviews?.[0] || null;

  return {
    id: report.id,
    patientId: report.patientId,
    title: report.title,
    category: report.category,
    description: report.description,
    reportDate: report.reportDate,
    status: report.status,
    originalFileName: report.originalFileName,
    mimeType: report.mimeType,
    fileSize: report.fileSize,
    contentSafetyStatus: report.contentSafetyStatus,
    contentSafetyMessage: report.contentSafetyMessage,
    contentSafetyCheckedAt: report.contentSafetyCheckedAt,
    isSampleDataConfirmed: report.isSampleDataConfirmed,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    patient: report.patient
      ? {
          id: report.patient.id,
          fullName: report.patient.fullName,
          email: report.patient.email,
        }
      : null,
    review: formatReview(review),
  };
};

const calculateSummary = (reports: ReturnType<typeof formatReport>[]) => ({
  total: reports.length,
  pending: reports.filter(report => report.review?.status === "PENDING").length,
  reviewed: reports.filter(report => report.review?.status === "REVIEWED").length,
  blocked: reports.filter(report => report.contentSafetyStatus === "BLOCKED").length,
});

const getReportForDoctor = async (
  doctorId: string,
  patientId: string,
  reportId: string,
) => {
  await ensureActiveAssignment(doctorId, patientId);

  let report = await prisma.patientReport.findFirst({
    where: { id: reportId, patientId },
    include: reportInclude(doctorId),
  });

  if (!report) throw new AppError("Medical report not found", 404);

  if (report.reviews.length === 0) {
    await prisma.patientReportReview.upsert({
      where: {
        reportId_doctorId: {
          reportId,
          doctorId,
        },
      },
      update: {},
      create: {
        reportId,
        doctorId,
        status: "PENDING",
      },
    });

    report = await prisma.patientReport.findFirst({
      where: { id: reportId, patientId },
      include: reportInclude(doctorId),
    });
  }

  if (!report) throw new AppError("Medical report not found", 404);

  return report;
};

const resolveReportFilePath = (storedFileName: string) => {
  const safeFileName = basename(storedFileName);

  if (!safeFileName || safeFileName !== storedFileName) {
    throw new AppError("Invalid stored report filename", 500);
  }

  const candidates = [
    resolve(process.cwd(), "private-uploads", "patient-reports", safeFileName),
    resolve(process.cwd(), "backend", "private-uploads", "patient-reports", safeFileName),
    resolve(process.cwd(), "..", "backend", "private-uploads", "patient-reports", safeFileName),
  ];

  const matchedPath = candidates.find(candidate => existsSync(candidate));

  if (!matchedPath) {
    throw new AppError("Stored medical report file was not found", 404);
  }

  return matchedPath;
};

const getDoctorDisplayName = (fullName: string) => {
  const name = fullName.trim();
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
};

const notifyPatientAboutReportReview = async (
  patientId: string,
  patientName: string,
  doctor: { id: string; fullName: string },
  report: { id: string; title: string; status: string; reviews: any[] },
) => {
  try {
    const review = report.reviews[0];

    if (!review) return;

    const existingNotification = await prisma.userNotification.findFirst({
      where: {
        userId: patientId,
        type: "REPORT_REVIEWED",
        entityType: "PATIENT_REPORT_REVIEW",
        entityId: review.id,
      },
      select: { id: true },
    });

    if (existingNotification) return;

    const doctorName = getDoctorDisplayName(doctor.fullName);

    await notificationService.createAndSend({
      userId: patientId,
      type: "REPORT_REVIEWED",
      title: "Medical report reviewed",
      body: `${doctorName} reviewed your report "${report.title}".`,
      priority: "HIGH",
      entityType: "PATIENT_REPORT_REVIEW",
      entityId: review.id,
      targetScreen: "PatientReports",
      patientPreferenceKey: "reportReviewUpdates",
      data: {
        reportId: report.id,
        reviewId: review.id,
        patientId,
        patientName,
        doctorId: doctor.id,
        doctorName,
        reportTitle: report.title,
        reportStatus: report.status,
        reviewedAt: review.reviewedAt?.toISOString() || new Date().toISOString(),
        source: "DOCTOR_REPORT_REVIEW",
      },
    });
  } catch (error) {
    console.warn(
      `Unable to notify patient about report review ${report.id}:`,
      error instanceof Error ? error.message : error,
    );
  }
};

export const doctorReportsService = {
  async listReportQueue(doctorId: string, input: ReportQueueInput) {
    await ensureApprovedDoctor(doctorId);

    const assignedPatientIds = await getAssignedPatientIds(doctorId);

    if (assignedPatientIds.length === 0) {
      return {
        reports: [],
        summary: {
          total: 0,
          pending: 0,
          reviewed: 0,
          blocked: 0,
        },
      };
    }

    const assignedReports = await prisma.patientReport.findMany({
      where: {
        patientId: {
          in: assignedPatientIds,
        },
      },
      select: {
        id: true,
      },
    });

    await ensureReviewRows(
      doctorId,
      assignedReports.map(report => report.id),
    );

    const reviewFilter =
      input.status === "ALL"
        ? { doctorId }
        : {
            doctorId,
            status: input.status,
          };

    const [reports, allDoctorReports] = await Promise.all([
      prisma.patientReport.findMany({
        where: {
          patientId: {
            in: assignedPatientIds,
          },
          reviews: {
            some: reviewFilter,
          },
        },
        include: reportInclude(doctorId),
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.patientReport.findMany({
        where: {
          patientId: {
            in: assignedPatientIds,
          },
          reviews: {
            some: {
              doctorId,
            },
          },
        },
        include: reportInclude(doctorId),
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const formattedReports = reports.map(formatReport);
    const formattedAllReports = allDoctorReports.map(formatReport);

    return {
      reports: formattedReports,
      summary: calculateSummary(formattedAllReports),
    };
  },

  async listPatientReports(doctorId: string, patientId: string) {
    await ensureActiveAssignment(doctorId, patientId);

    const patientReports = await prisma.patientReport.findMany({
      where: {
        patientId,
      },
      select: {
        id: true,
      },
    });

    await ensureReviewRows(
      doctorId,
      patientReports.map(report => report.id),
    );

    const reports = await prisma.patientReport.findMany({
      where: {
        patientId,
      },
      include: reportInclude(doctorId),
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedReports = reports.map(formatReport);

    return {
      reports: formattedReports,
      summary: calculateSummary(formattedReports),
    };
  },

  async getReportDetail(
    doctorId: string,
    patientId: string,
    reportId: string,
  ) {
    const report = await getReportForDoctor(
      doctorId,
      patientId,
      reportId,
    );

    return formatReport(report);
  },

  async reviewReport(
    doctorId: string,
    patientId: string,
    reportId: string,
    reviewNote: string,
  ) {
    const doctor = await ensureApprovedDoctor(doctorId);

    const report = await getReportForDoctor(
      doctorId,
      patientId,
      reportId,
    );

    if (report.contentSafetyStatus === "BLOCKED") {
      throw new AppError(
        "A blocked report cannot be clinically reviewed",
        403,
      );
    }

    const activeAssignments = await prisma.patientDoctorAssignment.findMany({
      where: {
        patientId,
        status: "ACTIVE",
      },
      select: {
        doctorId: true,
      },
    });

    const activeDoctorIds = activeAssignments.map(
      assignment => assignment.doctorId,
    );

    await prisma.$transaction(async transaction => {
      await transaction.patientReportReview.upsert({
        where: {
          reportId_doctorId: {
            reportId,
            doctorId,
          },
        },
        update: {
          status: "REVIEWED",
          reviewNote,
          reviewedAt: new Date(),
          patientSeenAt: null,
        },
        create: {
          reportId,
          doctorId,
          status: "REVIEWED",
          reviewNote,
          reviewedAt: new Date(),
        },
      });

      const reviewedCount = await transaction.patientReportReview.count({
        where: {
          reportId,
          doctorId: {
            in: activeDoctorIds,
          },
          status: "REVIEWED",
        },
      });

      let reportStatus:
        | "PENDING_REVIEW"
        | "PARTIALLY_REVIEWED"
        | "REVIEWED" = "PENDING_REVIEW";

      if (
        activeDoctorIds.length > 0 &&
        reviewedCount >= activeDoctorIds.length
      ) {
        reportStatus = "REVIEWED";
      } else if (reviewedCount > 0) {
        reportStatus = "PARTIALLY_REVIEWED";
      }

      await transaction.patientReport.update({
        where: {
          id: reportId,
        },
        data: {
          status: reportStatus,
        },
      });
    });

    const updatedReport = await getReportForDoctor(
      doctorId,
      patientId,
      reportId,
    );

    await notifyPatientAboutReportReview(
      patientId,
      updatedReport.patient?.fullName || "Patient",
      doctor,
      updatedReport,
    );

    return formatReport(updatedReport);
  },

  async getReportFile(
    doctorId: string,
    patientId: string,
    reportId: string,
  ) {
    const report = await getReportForDoctor(
      doctorId,
      patientId,
      reportId,
    );

    if (report.contentSafetyStatus === "BLOCKED") {
      throw new AppError(
        "This medical report file has been blocked",
        403,
      );
    }

    return {
      absolutePath: resolveReportFilePath(report.storedFileName),
      originalFileName: report.originalFileName,
      mimeType: report.mimeType,
      fileSize: report.fileSize,
    };
  },
};