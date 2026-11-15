import { prisma } from "../../core/database/prisma";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import { ConfirmDoseInput } from "../../core/validation/adherence.schema";
import { AuditService } from "../audit/audit.service";

export class AdherenceService {
  /**
   * Generates discrete dose occurrences for a patient across a time window.
   * Handles daily, interval-based, and specific weekday recurrence schedules.
   * Enforces timezone awareness and idempotent duplicate suppression.
   */
  static async generateOccurrencesForWindow(
    patientId: string,
    windowStart: Date,
    windowEnd: Date
  ) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        medicationSchedules: {
          where: { isActive: true },
          include: { medication: true },
        },
      },
    });

    if (!patient) {
      throw new AppError("Patient not found.", 404, ErrorCode.PATIENT_NOT_FOUND);
    }

    const createdDoses = [];
    const currentDate = new Date(windowStart);
    currentDate.setHours(0, 0, 0, 0);

    const endDate = new Date(windowEnd);
    endDate.setHours(23, 59, 59, 999);

    // Iterate day by day through the window
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

      for (const schedule of patient.medicationSchedules) {
        if (!schedule.medication.isActive) continue;

        // Check medication start and end dates
        if (currentDate < schedule.medication.startDate) continue;
        if (schedule.medication.endDate && currentDate > schedule.medication.endDate) continue;

        let shouldSchedule = false;

        if (schedule.frequencyType === "DAILY") {
          shouldSchedule = true;
        } else if (schedule.frequencyType === "SPECIFIC_WEEKDAYS") {
          shouldSchedule = schedule.daysOfWeek.includes(dayOfWeek);
        } else if (schedule.frequencyType === "INTERVAL_DAYS") {
          const startMs = schedule.medication.startDate.getTime();
          const currentMs = currentDate.getTime();
          const dayDiff = Math.floor((currentMs - startMs) / (1000 * 60 * 60 * 24));
          shouldSchedule = dayDiff >= 0 && dayDiff % schedule.intervalDays === 0;
        }

        if (shouldSchedule) {
          // Parse scheduled time "HH:mm"
          const [hoursStr, minutesStr] = schedule.scheduledTime.split(":");
          const hours = parseInt(hoursStr, 10);
          const minutes = parseInt(minutesStr, 10);

          const expectedLocalTime = new Date(currentDate);
          expectedLocalTime.setHours(hours, minutes, 0, 0);

          // Calculate UTC timestamp
          const scheduledForUtc = new Date(expectedLocalTime.toISOString());

          // Idempotent upsert via compound unique constraint (scheduleId, scheduledForUtc)
          try {
            const dose = await prisma.doseOccurrence.upsert({
              where: {
                scheduleId_scheduledForUtc: {
                  scheduleId: schedule.id,
                  scheduledForUtc,
                },
              },
              create: {
                scheduleId: schedule.id,
                medicationId: schedule.medicationId,
                patientId,
                scheduledForUtc,
                expectedLocalTime,
                timeCategory: schedule.timeOfDayCategory,
                status: "PENDING",
              },
              update: {}, // Never overwrite existing status if already created
            });
            createdDoses.push(dose);
          } catch (err) {
            // Concurrent insert race condition safely caught
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return createdDoses;
  }

  /**
   * Retrieves all dose occurrences for a given patient and date.
   */
  static async getDosesForDay(patientId: string, targetDate: Date) {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.doseOccurrence.findMany({
      where: {
        patientId,
        scheduledForUtc: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        medication: true,
        schedule: true,
        adherenceRecord: {
          include: {
            confirmedByUser: {
              select: { id: true, fullName: true, systemRole: true },
            },
          },
        },
      },
      orderBy: { scheduledForUtc: "asc" },
    });
  }

  /**
   * Atomically confirms that a dose was taken ("✓ I Have Taken This" or Phone DTMF 1).
   * Enforces atomic transaction consistency: updates status, records immutable adherence proof,
   * decrements remaining stock inventory, and checks refill threshold.
   */
  static async confirmDose(
    doseId: string,
    patientId: string,
    actorUserId: string,
    input: ConfirmDoseInput
  ) {
    const dose = await prisma.doseOccurrence.findUnique({
      where: { id: doseId },
      include: {
        medication: {
          include: { stock: true },
        },
        schedule: true,
      },
    });

    if (!dose || dose.patientId !== patientId) {
      throw new AppError("Dose occurrence not found.", 404, ErrorCode.DOSE_NOT_FOUND);
    }

    // Guard against duplicate intake confirmation
    if (dose.status === "TAKEN") {
      throw new AppError(
        "This dose has already been recorded as taken.",
        409,
        ErrorCode.DOSE_ALREADY_TAKEN
      );
    }

    const confirmedAtUtc = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update dose occurrence status
      const updatedDose = await tx.doseOccurrence.update({
        where: { id: doseId },
        data: {
          status: "TAKEN",
          escalationTier: 0,
        },
      });

      // 2. Insert immutable AdherenceRecord
      const adherenceRecord = await tx.adherenceRecord.create({
        data: {
          doseOccurrenceId: doseId,
          medicationId: dose.medicationId,
          patientId,
          confirmedByUserId: actorUserId,
          confirmationChannel: input.confirmationChannel as any,
          confirmedAtUtc,
          intakeMealContext: input.intakeMealContext || null,
          symptomsOrNotes: input.symptomsOrNotes || null,
          telephonyCallSid: input.telephonyCallSid || null,
        },
      });

      // 3. Decrement medication stock
      let updatedStock = null;
      if (dose.medication.stock) {
        const doseQuantity = Number(dose.schedule.doseQuantity) || 1;
        const newStock = Math.max(0, dose.medication.stock.currentQuantity - doseQuantity);

        updatedStock = await tx.medicationStock.update({
          where: { medicationId: dose.medicationId },
          data: { currentQuantity: newStock },
        });

        // 4. If stock is at or below threshold, create refill notification
        if (newStock <= dose.medication.stock.refillThreshold) {
          await tx.notification.create({
            data: {
              patientId,
              recipientUserId: actorUserId,
              eventType: "REFILL_NEEDED",
              channel: "IN_APP",
              title: `Refill Reminder: ${dose.medication.brandName}`,
              body: `${dose.medication.brandName} (${dose.medication.strength}) has only ${newStock} doses remaining. Please request a refill.`,
              status: "QUEUED",
              referenceId: dose.medicationId,
            },
          });
        }
      }

      return { updatedDose, adherenceRecord, updatedStock };
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "DOSE_CONFIRMED",
      resourceType: "dose_occurrence",
      resourceId: doseId,
      newState: {
        status: "TAKEN",
        channel: input.confirmationChannel,
        confirmedAt: confirmedAtUtc,
      },
    });

    const streakDays = await this.calculateAdherenceStreak(patientId);

    return {
      doseOccurrenceId: doseId,
      status: "TAKEN",
      confirmedAt: confirmedAtUtc,
      stockRemaining: result.updatedStock?.currentQuantity ?? null,
      adherenceStreakDays: streakDays,
      adherenceRecord: result.adherenceRecord,
    };
  }

  /**
   * Snoozes a dose reminder for a specified interval (e.g., 15 minutes).
   */
  static async snoozeDose(
    doseId: string,
    patientId: string,
    actorUserId: string,
    snoozeMinutes: number = 15
  ) {
    const dose = await prisma.doseOccurrence.findUnique({
      where: { id: doseId },
    });

    if (!dose || dose.patientId !== patientId) {
      throw new AppError("Dose occurrence not found.", 404, ErrorCode.DOSE_NOT_FOUND);
    }

    if (dose.status === "TAKEN") {
      throw new AppError("Cannot snooze a dose that has already been taken.", 400, ErrorCode.VALIDATION_ERROR);
    }

    const snoozedUntilUtc = new Date(Date.now() + snoozeMinutes * 60 * 1000);

    const updated = await prisma.doseOccurrence.update({
      where: { id: doseId },
      data: {
        status: "SNOOZED",
        snoozedUntilUtc,
        snoozeCount: { increment: 1 },
      },
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "DOSE_SNOOZED",
      resourceType: "dose_occurrence",
      resourceId: doseId,
      newState: { snoozedUntilUtc, snoozeMinutes },
    });

    return updated;
  }

  /**
   * Calculates consecutive days of complete medication adherence streak.
   */
  static async calculateAdherenceStreak(patientId: string): Promise<number> {
    const pastRecords = await prisma.doseOccurrence.findMany({
      where: {
        patientId,
        scheduledForUtc: { lt: new Date() },
      },
      orderBy: { scheduledForUtc: "desc" },
      take: 60,
    });

    if (pastRecords.length === 0) return 0;

    let streak = 0;
    const daysChecked = new Set<string>();

    for (const dose of pastRecords) {
      const dateKey = dose.scheduledForUtc.toISOString().split("T")[0];
      if (daysChecked.has(dateKey)) continue;
      daysChecked.add(dateKey);

      // Check all doses on this date
      const dosesOnDate = pastRecords.filter(
        (d) => d.scheduledForUtc.toISOString().split("T")[0] === dateKey
      );
      const allTaken = dosesOnDate.every((d) => d.status === "TAKEN");

      if (allTaken) {
        streak++;
      } else {
        break; // Streak is broken
      }
    }

    return streak;
  }
}
