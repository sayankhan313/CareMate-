import { prisma } from "../../config/prisma.js";
import { ensureApprovedPharmacy } from "./pharmacy-access.service.js";
import type { PharmacyDashboardResponse } from "./pharmacy-dashboard.types.js";
import {
  formatPharmacyOrderListItem,
  pharmacyOrderListInclude,
} from "./pharmacy-orders.service.js";

export const pharmacyDashboardService = {
  async getDashboard(pharmacyId: string): Promise<PharmacyDashboardResponse> {
    const pharmacy = await ensureApprovedPharmacy(pharmacyId);

    const [
      newOrders,
      preparing,
      ready,
      completed,
      doctorPrescriptions,
      refillRequests,
      patientSubmissions,
      paymentPending,
      exemptionPending,
      recentOrders,
    ] = await Promise.all([
      prisma.medicineOrder.count({ where: { pharmacyId, status: "RECEIVED" } }),
      prisma.medicineOrder.count({ where: { pharmacyId, status: "PREPARING" } }),
      prisma.medicineOrder.count({ where: { pharmacyId, status: "READY" } }),
      prisma.medicineOrder.count({
        where: { pharmacyId, status: { in: ["COLLECTED", "DELIVERED"] } },
      }),
      prisma.medicineOrder.count({
        where: { pharmacyId, orderSource: "DOCTOR_PRESCRIPTION" },
      }),
      prisma.medicineOrder.count({
        where: { pharmacyId, orderSource: "REFILL_REQUEST" },
      }),
      prisma.medicineOrder.count({
        where: { pharmacyId, orderSource: "PATIENT_SUBMISSION" },
      }),
      prisma.prescriptionPayment.count({
        where: { order: { pharmacyId }, status: "PENDING" },
      }),
      prisma.patientPharmacyExemptionEvidence.count({
        where: { pharmacyId, status: "PENDING" },
      }),
      prisma.medicineOrder.findMany({
        where: { pharmacyId },
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