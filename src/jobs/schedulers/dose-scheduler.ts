import { prisma } from "../../core/database/prisma";
import { AdherenceService } from "../../modules/adherence/adherence.service";
import { NotificationDispatcherService } from "../../modules/notifications/notification-dispatcher.service";
import { TelephonyService } from "../../modules/telephony/telephony.service";
import { QuietHoursService } from "../../modules/escalation/quiet-hours";

export class DoseScheduler {
  /**
   * Sweeps for pending doses that have reached their scheduled intake time.
   * Transitions status from PENDING to DUE_NOW and enqueues tablet alert notifications.
   * Runs every 1 minute.
   */
  static async sweepDueDoses(referenceTime: Date = new Date()) {
    // 1. Find all PENDING doses whose scheduled UTC time has arrived
    const dueDoses = await prisma.doseOccurrence.findMany({
      where: {
        status: "PENDING",
        scheduledForUtc: { lte: referenceTime },
      },
      include: {
        medication: true,
        patient: true,
      },
      take: 100,
    });

    const transitioned = [];

    for (const dose of dueDoses) {
      // Transition to DUE_NOW
      const updated = await prisma.doseOccurrence.update({
        where: { id: dose.id },
        data: { status: "DUE_NOW" },
      });

      // Create in-app reminder notification (with duplicate prevention check)
      const existingNotif = await prisma.notification.findFirst({
        where: {
          referenceId: dose.id,
          eventType: "UPCOMING_MEDICATION",
        },
      });

      if (!existingNotif) {
        const notif = await prisma.notification.create({
          data: {
            patientId: dose.patientId,
            recipientUserId: dose.patient.userId || dose.patientId,
            eventType: "UPCOMING_MEDICATION",
            channel: "IN_APP",
            title: `Time for ${dose.medication.brandName}`,
            body: `Please take ${dose.medication.strength} of ${dose.medication.brandName} (${dose.medication.instructions}).`,
            status: "QUEUED",
            referenceId: dose.id,
            scheduledForUtc: dose.scheduledForUtc,
          },
        });

        NotificationDispatcherService.dispatch(notif.id).catch(() => {});
      }
      transitioned.push(updated);
    }

    // 2. Also check SNOOZED doses whose snooze timer has elapsed
    const expiredSnoozes = await prisma.doseOccurrence.findMany({
      where: {
        status: "SNOOZED",
        snoozedUntilUtc: { lte: referenceTime },
      },
      include: {
        medication: true,
        patient: true,
      },
      take: 50,
    });

    for (const dose of expiredSnoozes) {
      const updated = await prisma.doseOccurrence.update({
        where: { id: dose.id },
        data: { status: "DUE_NOW" },
      });
      transitioned.push(updated);
    }

    return {
      dueDosesProcessed: dueDoses.length,
      snoozesWoken: expiredSnoozes.length,
      totalTransitioned: transitioned.length,
    };
  }

  /**
   * Evaluates doses that have exceeded their grace period without confirmation.
   * Advances escalation tier or marks as MISSED.
   * Respects patient quiet hours, maximum retry limits, and caregiver escalation flags.
   * Runs every 5 minutes.
   */
  static async detectAndEscalateMissedDoses(referenceTime: Date = new Date()) {
    const overdueDoses = await prisma.doseOccurrence.findMany({
      where: {
        status: { in: ["DUE_NOW", "SNOOZED"] },
      },
      include: {
        schedule: true,
        medication: true,
        patient: {
          include: {
            careCircleMembers: {
              where: { isActive: true },
              include: { user: true },
            },
          },
        },
      },
      take: 100,
    });

    const escalated = [];

    for (const dose of overdueDoses) {
      const scheduledMs = dose.scheduledForUtc.getTime();
      const gracePeriodMs = (dose.schedule.gracePeriodMinutes || 60) * 60 * 1000;
      const overdueMs = referenceTime.getTime() - (scheduledMs + gracePeriodMs);

      // Only escalate if past the grace period
      if (overdueMs > 0) {
        // Quiet hours check
        const inQuietHours = QuietHoursService.isQuietHour(
          referenceTime,
          dose.patient.timezone,
          dose.patient.quietHoursStart,
          dose.patient.quietHoursEnd
        );

        if (dose.escalationTier === 0) {
          // Tier 1: Automated Phone Call to Senior (if not in quiet hours and voice enabled)
          await prisma.doseOccurrence.update({
            where: { id: dose.id },
            data: {
              escalationTier: 1,
              escalatedAtUtc: referenceTime,
            },
          });

          if (!inQuietHours && dose.patient.voiceRemindersEnabled) {
            await TelephonyService.initiateMedicationReminderCall(dose.patientId, dose.id, 1).catch(() => {});
          }

          const notif = await prisma.notification.create({
            data: {
              patientId: dose.patientId,
              recipientUserId: dose.patient.userId || dose.patientId,
              eventType: "MISSED_MEDICATION",
              channel: "TELEPHONE_CALL",
              title: `Urgent Medication Reminder: ${dose.medication.brandName}`,
              body: `Automated call reminder for ${dose.medication.brandName} scheduled at ${dose.schedule.scheduledTime}`,
              status: "QUEUED",
              referenceId: dose.id,
            },
          });

          NotificationDispatcherService.dispatch(notif.id).catch(() => {});
          escalated.push({ doseId: dose.id, tier: 1 });
        } else if (dose.escalationTier === 1 && overdueMs > 15 * 60 * 1000) {
          // Tier 2: SMS & In-App alert to Primary Caregiver
          await prisma.doseOccurrence.update({
            where: { id: dose.id },
            data: {
              escalationTier: 2,
              escalatedAtUtc: referenceTime,
            },
          });

          if (dose.patient.caregiverEscalationEnabled) {
            const primaryCaregiver = dose.patient.careCircleMembers.find(
              (m) => m.isPrimaryCaregiver || m.circleRole === "FAMILY_ADMIN"
            );

            if (primaryCaregiver) {
              const notif = await prisma.notification.create({
                data: {
                  patientId: dose.patientId,
                  recipientUserId: primaryCaregiver.userId,
                  eventType: "ESCALATION_TIER_2",
                  channel: "SMS",
                  title: `CareNest Alert: Missed Dose for ${dose.patient.fullName}`,
                  body: `${dose.patient.fullName} has not confirmed their ${dose.schedule.scheduledTime} dose of ${dose.medication.brandName} (${dose.medication.strength}). Please check in.`,
                  status: "QUEUED",
                  referenceId: dose.id,
                },
              });

              NotificationDispatcherService.dispatch(notif.id).catch(() => {});
            }
          }

          escalated.push({ doseId: dose.id, tier: 2 });
        } else if (dose.escalationTier === 2 && overdueMs > 45 * 60 * 1000) {
          // Tier 3: Mark permanently MISSED and alert entire Care Circle
          await prisma.doseOccurrence.update({
            where: { id: dose.id },
            data: {
              status: "MISSED",
              escalationTier: 3,
              escalatedAtUtc: referenceTime,
              skippedReason: "Grace period and multi-tier caregiver escalation elapsed without intake confirmation",
            },
          });

          if (dose.patient.caregiverEscalationEnabled) {
            for (const member of dose.patient.careCircleMembers) {
              if (member.canManageMedications || member.receiveEmergencyAlerts) {
                const notif = await prisma.notification.create({
                  data: {
                    patientId: dose.patientId,
                    recipientUserId: member.userId,
                    eventType: "ESCALATION_TIER_3",
                    channel: "EMAIL",
                    title: `Missed Dose Confirmed: ${dose.medication.brandName} for ${dose.patient.fullName}`,
                    body: `The scheduled dose of ${dose.medication.brandName} at ${dose.schedule.scheduledTime} was missed. Status logged in adherence record.`,
                    status: "QUEUED",
                    referenceId: dose.id,
                  },
                });

                NotificationDispatcherService.dispatch(notif.id).catch(() => {});
              }
            }
          }

          escalated.push({ doseId: dose.id, tier: 3, status: "MISSED" });
        }
      }
    }

    return {
      evaluatedCount: overdueDoses.length,
      escalatedCount: escalated.length,
      escalations: escalated,
    };
  }

  /**
   * Daily cron job: Rolls the 30-day occurrence generation horizon forward for all active patients.
   */
  static async rollDailyOccurrences() {
    const activePatients = await prisma.patient.findMany({
      select: { id: true },
    });

    const now = new Date();
    const horizonEnd = new Date();
    horizonEnd.setDate(horizonEnd.getDate() + 30);

    let totalGenerated = 0;
    for (const patient of activePatients) {
      const generated = await AdherenceService.generateOccurrencesForWindow(
        patient.id,
        now,
        horizonEnd
      );
      totalGenerated += generated.length;
    }

    return {
      patientsProcessed: activePatients.length,
      totalOccurrencesGenerated: totalGenerated,
    };
  }
}
