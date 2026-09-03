import { prisma } from "../../config/prisma.js";
import { ensureApprovedPharmacy } from "./pharmacy-access.service.js";
import type { PharmacyDashboardResponse } from "./pharmacy-dashboard.types.js";
import { formatPharmacyOrderListItem, pharmacyOrderListInclude } from "./pharmacy-orders.service.js";

export const pharmacyDashboardService = {
  async getDashboard(pharmacyId: string): Promise<PharmacyDashboardResponse> {
    const pharmacy = await ensureApprovedPharmacy(pharmacyId);

    const receivedOrders = await prisma.medicineOrder.findMany({
      where: {
        pharmacyId,
        status: "RECEIVED",
        orderSource: { in: ["DOCTOR_PRESCRIPTION", "REFILL_REQUEST", "MANUAL_REQUEST"] },
      },
      select: { id: true, orderSource: true },
    });

    const receivedOrderIds = receivedOrders.map(order => order.id);
    const doctorOrderIds = receivedOrders.filter(order => order.orderSource === "DOCTOR_PRESCRIPTION").map(order => order.id);
    const refillOrderIds = receivedOrders.filter(order => order.orderSource === "REFILL_REQUEST").map(order => order.id);

    const unreadOrderCount = (orderIds: string[]) => {
      if (orderIds.length === 0) return Promise.resolve(0);

      return prisma.userNotification.count({
        where: {
          userId: pharmacyId,
          type: "NEW_MEDICINE_ORDER",
          entityType: "MEDICINE_ORDER",
          entityId: { in: orderIds },
          isRead: false,
        },
      });
    };

    const [
      unreadNotifications,
      newOrders,
      doctorPrescriptions,
      refillRequests,
      preparing,
      ready,
      completed,
      patientSubmissions,
      paymentPending,
      exemptionPending,
      recentOrders,
    ] = await Promise.all([
      prisma.userNotification.count({ where: { userId: pharmacyId, isRead: false } }),
      unreadOrderCount(receivedOrderIds),
      unreadOrderCount(doctorOrderIds),
      unreadOrderCount(refillOrderIds),
      prisma.medicineOrder.count({ where: { pharmacyId, status: "PREPARING" } }),
      prisma.medicineOrder.count({ where: { pharmacyId, status: "READY" } }),
      prisma.medicineOrder.count({ where: { pharmacyId, status: { in: ["COLLECTED", "DELIVERED"] } } }),
      prisma.medicineOrder.count({ where: { pharmacyId, orderSource: "PATIENT_SUBMISSION" } }),
      prisma.prescriptionPayment.count({ where: { order: { pharmacyId }, status: "PENDING" } }),
      prisma.patientPharmacyExemptionEvidence.count({ where: { pharmacyId, status: "PENDING" } }),
      prisma.medicineOrder.findMany({
        where: { pharmacyId, orderSource: { not: "PATIENT_SUBMISSION" } },
        include: pharmacyOrderListInclude,
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      pharmacy: {
        id: pharmacy.id,
        fullName: pharmacy.fullName,
        pharmacyName: pharmacy.pharmacyProfile.pharmacyName,
        registrationNumber: pharmacy.pharmacyProfile.registrationNumber,
        city: pharmacy.pharmacyProfile.city,
        postcode: pharmacy.pharmacyProfile.postcode,
      },
      counts: {
        unreadNotifications,
        newOrders,
        preparing,
        ready,
        completed,
        doctorPrescriptions,
        refillRequests,
        patientSubmissions,
        paymentPending,
        exemptionPending,
      },
      recentOrders: recentOrders.map(formatPharmacyOrderListItem),
    };
  },
};