import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

const getFirstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || fullName;

export const caregiverDashboardService = {
  async getDashboard(caregiverId: string) {
    const caregiver = await prisma.user.findUnique({
      where: { id: caregiverId },
      select: { id: true, fullName: true, email: true, role: true, accountStatus: true, isEmailVerified: true },
    });

    if (!caregiver || caregiver.role !== "CAREGIVER") throw new AppError("Caregiver account not found", 404);
    if (!caregiver.isEmailVerified) throw new AppError("Please verify your email first", 403);
    if (caregiver.accountStatus !== "ACTIVE" && caregiver.accountStatus !== "APPROVED") throw new AppError("Caregiver account is not active", 403);

    const relationships = await prisma.patientCaregiverRelationship.findMany({
      where: {
        caregiverId,
        status: "ACTIVE",
        patient: { is: { role: "PATIENT", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
      },
      include: { patient: { select: { id: true, fullName: true, email: true } } },
      orderBy: { approvedAt: "desc" },
    });

    const patientIds = relationships.map(item => item.patientId);

    if (!patientIds.length) {
      const [notifications, unreadNotifications] = await Promise.all([
        prisma.userNotification.findMany({
          where: { userId: caregiverId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, type: true, title: true, body: true, priority: true, entityType: true, entityId: true, targetScreen: true, isRead: true, createdAt: true },
        }),
        prisma.userNotification.count({ where: { userId: caregiverId, isRead: false } }),
      ]);

      return {
        caregiver: { id: caregiver.id, fullName: caregiver.fullName, firstName: getFirstName(caregiver.fullName), email: caregiver.email },
        summary: { linkedPatients: 0, missedDosesToday: 0, dosesDueSoon: 0, unresolvedSafetyAlerts: 0, criticalVitals: 0, activeConsultations: 0, lowStockMedicines: 0, unreadNotifications },
        patients: [],
        recentNotifications: notifications,
      };
    }

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    const dueSoonEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const [doseLogs, latestVitals, safetyAlerts, consultations, latestOrders, stockMedicines, notifications, unreadNotifications] = await Promise.all([
      prisma.medicineDoseLog.findMany({
        where: {
          patientId: { in: patientIds },
          OR: [
            { status: "MISSED", scheduledFor: { gte: dayStart, lte: dayEnd } },
            { status: "PENDING", scheduledFor: { gte: now, lte: dueSoonEnd } },
            { status: "SNOOZED", snoozedUntil: { gte: now, lte: dueSoonEnd } },
          ],
        },
        select: { id: true, patientId: true, status: true, scheduledFor: true, snoozedUntil: true },
      }),
      prisma.patientVitalReading.findMany({
        where: { patientId: { in: patientIds } },
        orderBy: { recordedAt: "desc" },
        distinct: ["patientId"],
        select: { id: true, patientId: true, heartRate: true, spo2: true, bpSystolic: true, bpDiastolic: true, glucose: true, temperature: true, status: true, source: true, recordedAt: true },
      }),
      prisma.safetyAlert.findMany({
        where: { patientId: { in: patientIds }, status: { in: ["ACTIVE", "ESCALATED"] } },
        orderBy: { createdAt: "desc" },
        distinct: ["patientId"],
        select: { id: true, patientId: true, status: true, reason: true, createdAt: true, escalatedAt: true, doctor: { select: { id: true, fullName: true } } },
      }),
      prisma.consultation.findMany({
        where: { patientId: { in: patientIds }, status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] } },
        orderBy: { updatedAt: "desc" },
        distinct: ["patientId"],
        select: { id: true, patientId: true, type: true, status: true, preferredAt: true, doctorName: true, createdAt: true, updatedAt: true },
      }),
      prisma.medicineOrder.findMany({
        where: { patientId: { in: patientIds } },
        orderBy: { updatedAt: "desc" },
        distinct: ["patientId"],
        select: { id: true, patientId: true, orderNumber: true, medicineName: true, status: true, updatedAt: true },
      }),
      prisma.medicine.findMany({
        where: { patientId: { in: patientIds }, isActive: true, currentStock: { not: null }, lowStockThreshold: { not: null } },
        select: { id: true, patientId: true, name: true, dose: true, currentStock: true, stockUnit: true, lowStockThreshold: true },
      }),
      prisma.userNotification.findMany({
        where: { userId: caregiverId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, type: true, title: true, body: true, priority: true, entityType: true, entityId: true, targetScreen: true, isRead: true, createdAt: true },
      }),
      prisma.userNotification.count({ where: { userId: caregiverId, isRead: false } }),
    ]);

    const lowStockMedicines = stockMedicines.filter(item => item.currentStock !== null && item.lowStockThreshold !== null && item.currentStock <= item.lowStockThreshold);
    const missedDosesToday = doseLogs.filter(item => item.status === "MISSED");
    const dosesDueSoon = doseLogs.filter(item => item.status === "PENDING" || item.status === "SNOOZED");

    const patients = relationships.map(relationship => {
      const patientId = relationship.patientId;
      const vital = latestVitals.find(item => item.patientId === patientId) || null;
      const safetyAlert = safetyAlerts.find(item => item.patientId === patientId) || null;
      const consultation = consultations.find(item => item.patientId === patientId) || null;
      const pharmacyOrder = latestOrders.find(item => item.patientId === patientId) || null;
      const patientLowStock = lowStockMedicines.filter(item => item.patientId === patientId);

      return {
        relationshipId: relationship.id,
        linkedAt: relationship.approvedAt,
        patient: { id: relationship.patient.id, fullName: relationship.patient.fullName, email: relationship.patient.email },
        adherence: {
          missedToday: missedDosesToday.filter(item => item.patientId === patientId).length,
          dueSoon: dosesDueSoon.filter(item => item.patientId === patientId).length,
        },
        latestVital: vital,
        safetyAlert,
        consultation,
        pharmacyOrder,
        lowStock: { count: patientLowStock.length, medicines: patientLowStock },
      };
    });

    return {
      caregiver: { id: caregiver.id, fullName: caregiver.fullName, firstName: getFirstName(caregiver.fullName), email: caregiver.email },
      summary: {
        linkedPatients: relationships.length,
        missedDosesToday: missedDosesToday.length,
        dosesDueSoon: dosesDueSoon.length,
        unresolvedSafetyAlerts: safetyAlerts.length,
        criticalVitals: latestVitals.filter(item => item.status === "CRITICAL").length,
        activeConsultations: consultations.length,
        lowStockMedicines: lowStockMedicines.length,
        unreadNotifications,
      },
      patients,
      recentNotifications: notifications,
    };
  },
};