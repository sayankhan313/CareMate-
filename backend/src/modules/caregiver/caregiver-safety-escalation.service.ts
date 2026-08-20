import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { notificationService } from "../notification/notification.service.js";
import { ensureLinkedPatient } from "./caregiver-patients.service.js";

const blockedConsultationStatuses = new Set(["ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

const getEscalatedAlert = async (patientId: string, alertId: string) => {
  const alert = await prisma.safetyAlert.findFirst({
    where: { id: alertId, patientId },
    select: {
      id: true, patientId: true, doctorId: true, status: true, reason: true, vitalReadingId: true, escalatedAt: true, updatedAt: true,
      patient: { select: { id: true, fullName: true } },
      doctor: { select: { id: true, fullName: true } },
      consultation: { select: { id: true, doctorId: true, doctorName: true, status: true, rejectionNote: true, rejectedAt: true } },
    },
  });

  if (!alert) throw new AppError("Safety alert not found for this patient", 404);
  if (alert.status !== "ESCALATED") throw new AppError("Only an unresolved escalated safety alert can be escalated to another doctor", 409);
  if (alert.consultation && blockedConsultationStatuses.has(alert.consultation.status)) throw new AppError("A doctor has already responded or this consultation can no longer be rerouted", 409);

  return alert;
};

export const caregiverSafetyEscalationService = {
  async getEscalationHistory(caregiverId: string, patientId: string, alertId: string) {
    await ensureLinkedPatient(caregiverId, patientId);
    const alert = await getEscalatedAlert(patientId, alertId);

    const escalations = await prisma.safetyAlertDoctorEscalation.findMany({
      where: { safetyAlertId: alert.id },
      orderBy: { sequenceNumber: "asc" },
      select: {
        id: true, source: true, sequenceNumber: true, notifiedAt: true, createdAt: true,
        doctor: { select: { id: true, fullName: true, doctorProfile: { select: { specialization: true, clinicName: true } } } },
        triggeredBy: { select: { id: true, fullName: true, role: true } },
      },
    });

    return {
      alertId: alert.id,
      currentDoctor: alert.doctor,
      escalations,
    };
  },

  async tryAnotherDoctor(caregiverId: string, patientId: string, alertId: string) {
    await ensureLinkedPatient(caregiverId, patientId);

    let result;

    try {
      result = await prisma.$transaction(async tx => {
        const alert = await tx.safetyAlert.findFirst({
          where: { id: alertId, patientId },
          select: {
            id: true, patientId: true, doctorId: true, status: true, reason: true, vitalReadingId: true, escalatedAt: true, updatedAt: true,
            patient: { select: { id: true, fullName: true } },
            doctor: { select: { id: true, fullName: true } },
            consultation: { select: { id: true, doctorId: true, doctorName: true, status: true, rejectionNote: true, rejectedAt: true } },
          },
        });

        if (!alert) throw new AppError("Safety alert not found for this patient", 404);
        if (alert.status !== "ESCALATED") throw new AppError("Only an unresolved escalated safety alert can be escalated to another doctor", 409);
        if (alert.consultation && blockedConsultationStatuses.has(alert.consultation.status)) throw new AppError("A doctor has already responded or this consultation can no longer be rerouted", 409);

        let history = await tx.safetyAlertDoctorEscalation.findMany({
          where: { safetyAlertId: alert.id },
          orderBy: { sequenceNumber: "asc" },
          select: { id: true, doctorId: true, sequenceNumber: true, notifiedAt: true },
        });

        if (alert.doctorId && !history.some(item => item.doctorId === alert.doctorId)) {
          const sequenceNumber = history.length ? Math.max(...history.map(item => item.sequenceNumber)) + 1 : 1;
          const initial = await tx.safetyAlertDoctorEscalation.create({
            data: {
              safetyAlertId: alert.id,
              doctorId: alert.doctorId,
              triggeredByUserId: patientId,
              source: "INITIAL_SAFETY_RESPONSE",
              sequenceNumber,
              notifiedAt: alert.escalatedAt || alert.updatedAt,
            },
            select: { id: true, doctorId: true, sequenceNumber: true, notifiedAt: true },
          });
          history = [...history, initial];
        }

        const assignments = await tx.patientDoctorAssignment.findMany({
          where: {
            patientId,
            status: "ACTIVE",
            doctor: { is: { role: "DOCTOR", isEmailVerified: true, accountStatus: { in: ["ACTIVE", "APPROVED"] } } },
          },
          select: {
            doctorId: true,
            assignmentType: true,
            createdAt: true,
            doctor: {
              select: {
                id: true, fullName: true, email: true,
                doctorProfile: { select: { specialization: true, clinicName: true, operationalStatus: true } },
              },
            },
          },
        });

        const orderedAssignments = [...assignments].sort((a, b) => {
          if (a.assignmentType !== b.assignmentType) return a.assignmentType === "PRIMARY" ? -1 : 1;
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

        const contactedDoctorIds = new Set(history.map(item => item.doctorId).filter((id): id is string => Boolean(id)));
        if (alert.doctorId) contactedDoctorIds.add(alert.doctorId);

        const uncontactedAssignments = orderedAssignments.filter(item => !contactedDoctorIds.has(item.doctorId));
        if (!uncontactedAssignments.length) throw new AppError("All assigned doctors have already been notified.", 409);

        const nextAssignment = uncontactedAssignments.find(item => item.doctor.doctorProfile?.operationalStatus === "AVAILABLE");
        if (!nextAssignment) throw new AppError("No additional assigned doctor is currently available for escalation.", 409);

        const sequenceNumber = history.length ? Math.max(...history.map(item => item.sequenceNumber)) + 1 : 1;

        const escalation = await tx.safetyAlertDoctorEscalation.create({
          data: {
            safetyAlertId: alert.id,
            doctorId: nextAssignment.doctorId,
            triggeredByUserId: caregiverId,
            source: "CAREGIVER_RETRY",
            sequenceNumber,
          },
          select: { id: true, safetyAlertId: true, doctorId: true, source: true, sequenceNumber: true, notifiedAt: true, createdAt: true },
        });

        await tx.safetyAlert.update({ where: { id: alert.id }, data: { doctorId: nextAssignment.doctorId } });

        if (alert.consultation) {
          await tx.consultation.update({
            where: { id: alert.consultation.id },
            data: { doctorId: nextAssignment.doctorId, doctorName: nextAssignment.doctor.fullName, status: "PENDING", rejectionNote: null, rejectedAt: null },
          });
        }

        return {
          alert,
          escalation,
          nextDoctor: {
            id: nextAssignment.doctor.id,
            fullName: nextAssignment.doctor.fullName,
            email: nextAssignment.doctor.email,
            specialization: nextAssignment.doctor.doctorProfile?.specialization || null,
            clinicName: nextAssignment.doctor.doctorProfile?.clinicName || null,
          },
        };
      }, { isolationLevel: "Serializable" });
    } catch (error: any) {
      if (error?.code === "P2034") throw new AppError("Another doctor escalation is being processed. Please try again.", 409);
      throw error;
    }

    const notification = await notificationService.createAndSend({
      userId: result.nextDoctor.id,
      type: "SAFETY_ALERT_ESCALATED",
      title: "Critical Safety Alert",
      body: `${result.alert.patient.fullName}'s unresolved Safety Response has been escalated to you. Immediate review is required.`,
      priority: "CRITICAL",
      entityType: "SAFETY_ALERT_DOCTOR_ESCALATION",
      entityId: result.escalation.id,
      targetScreen: "DoctorAlerts",
      data: {
        source: "CAREGIVER_SEQUENTIAL_SAFETY_ESCALATION",
        alertId: result.alert.id,
        patientId,
        patientName: result.alert.patient.fullName,
        doctorId: result.nextDoctor.id,
        caregiverId,
        escalationId: result.escalation.id,
        sequenceNumber: result.escalation.sequenceNumber,
        consultationId: result.alert.consultation?.id || null,
        vitalReadingId: result.alert.vitalReadingId || null,
      },
    });

    const notifiedAt = new Date();
    await prisma.safetyAlertDoctorEscalation.update({ where: { id: result.escalation.id }, data: { notifiedAt } });

    return {
      alertId: result.alert.id,
      currentDoctor: result.nextDoctor,
      escalation: { ...result.escalation, notifiedAt },
      consultationId: result.alert.consultation?.id || null,
      notification: { id: notification.id, pushStatus: notification.pushStatus },
      message: `${result.nextDoctor.fullName} has been notified.`,
    };
  },
};