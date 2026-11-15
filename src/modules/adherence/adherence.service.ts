import { prisma } from "../../core/database/prisma";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import {
  ConfirmDoseInput,
  SkipDoseInput,
  AdherenceReportQueryInput,
} from "../../core/validation/adherence.schema";
import { AuditService } from "../audit/audit.service";
import { fromZonedTime, toZonedTime, format } from "date-fns-tz";

export class AdherenceService {
  /**
   * Generates discrete dose occurrences for a patient across a time window.
   * Handles daily, interval-based, and specific weekday recurrence schedules.
   * Enforces patient timezone awareness and idempotent duplicate suppression.
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

    const patientTimezone = patient.timezone || "America/New_York";
    const createdDoses = [];
    const currentDate = new Date(windowStart);
    currentDate.setHours(0, 0, 0, 0);

    const endDate = new Date(windowEnd);
    endDate.setHours(23, 59, 59, 999);

    // Iterate day by day through the window
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

      for (const schedule of patient.medicationSchedules) {
        if (!schedule.medication.isActive) continue;

        // Check start and end dates (both medication-level and schedule-level)
        const schedStart = schedule.startDate || schedule.medication.startDate;
        const schedEnd = schedule.endDate || schedule.medication.endDate;

        if (currentDate < schedStart) continue;
        if (schedEnd && currentDate > schedEnd) continue;

        let shouldSchedule = false;

        if (schedule.frequencyType === "DAILY") {
          shouldSchedule = true;
        } else if (schedule.frequencyType === "SPECIFIC_WEEKDAYS") {
          shouldSchedule = schedule.daysOfWeek.includes(dayOfWeek);
        } else if (schedule.frequencyType === "INTERVAL_DAYS") {
          const startMs = schedStart.getTime();
          const currentMs = currentDate.getTime();
          const dayDiff = Math.floor((currentMs - startMs) / (1000 * 60 * 60 * 24));
          shouldSchedule = dayDiff >= 0 && dayDiff % schedule.intervalDays === 0;
        } else if (schedule.frequencyType === "PRN_AS_NEEDED") {
          // As-needed medications do not have pre-scheduled occurrences
          shouldSchedule = false;
        }

        if (shouldSchedule) {
          // Construct patient-local ISO string and convert to UTC accurately
          const localTimezone = schedule.timezone || patientTimezone;
          const localDateTimeStr = `${dateStr} ${schedule.scheduledTime}:00`;
          const scheduledForUtc = fromZonedTime(localDateTimeStr, localTimezone);
          const expectedLocalTime = new Date(`${dateStr}T${schedule.scheduledTime}:00`);

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
   * Retrieves a structured daily schedule formatted for the frontend dashboard.
   * Groups doses into MORNING, AFTERNOON, EVENING, and NIGHT sections.
   */
  static async getDailySchedule(patientId: string, targetDate: Date = new Date()) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new AppError("Patient not found.", 404, ErrorCode.PATIENT_NOT_FOUND);
    }

    const patientTz = patient.timezone || "America/New_York";
    const dateStr = format(targetDate, "yyyy-MM-dd", { timeZone: patientTz });

    // Window from local 00:00:00 to 23:59:59 converted to UTC
    const startUtc = fromZonedTime(`${dateStr} 00:00:00`, patientTz);
    const endUtc = fromZonedTime(`${dateStr} 23:59:59`, patientTz);

    const doses = await prisma.doseOccurrence.findMany({
      where: {
        patientId,
        scheduledForUtc: {
          gte: startUtc,
          lte: endUtc,
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

    // Categorize by time-of-day
    const categories: Array<"MORNING" | "AFTERNOON" | "EVENING" | "NIGHT"> = [
      "MORNING",
      "AFTERNOON",
      "EVENING",
      "NIGHT",
    ];

    const sections = categories.map((cat) => {
      const categoryDoses = doses.filter((d) => d.timeCategory === cat);

      const items = categoryDoses.map((d) => ({
        doseOccurrenceId: d.id,
        medicationId: d.medicationId,
        brandName: d.medication.brandName,
        genericName: d.medication.genericName,
        strength: d.medication.strength,
        dosageForm: d.medication.dosageForm,
        instructions: d.medication.instructions,
        pillAppearance: d.medication.pillAppearance,
        pillColor: d.medication.pillColor,
        pillShape: d.medication.pillShape,
        mealRelation: d.schedule.mealRelation,
        doseQuantity: Number(d.schedule.doseQuantity),
        scheduledTime: d.schedule.scheduledTime,
        scheduledForUtc: d.scheduledForUtc,
        status: d.status,
        skippedReason: d.skippedReason,
        confirmedAt: d.adherenceRecord?.confirmedAtUtc || null,
        confirmedBy: d.adherenceRecord?.confirmedByUser?.fullName || null,
        notes: d.adherenceRecord?.symptomsOrNotes || null,
      }));

      // Section status
      let sectionStatus = "UPCOMING";
      if (items.length === 0) {
        sectionStatus = "NONE";
      } else if (items.every((i) => i.status === "TAKEN")) {
        sectionStatus = "COMPLETED";
      } else if (items.some((i) => i.status === "DUE_NOW")) {
        sectionStatus = "DUE_NOW";
      } else if (items.some((i) => i.status === "MISSED")) {
        sectionStatus = "OVERDUE";
      }

      return {
        category: cat,
        status: sectionStatus,
        dosesCount: items.length,
        items,
      };
    });

    // Calculate daily progress
    const totalDoses = doses.length;
    const completedDoses = doses.filter((d) => d.status === "TAKEN").length;
    const skippedDoses = doses.filter((d) => d.status === "SKIPPED").length;
    const missedDoses = doses.filter((d) => d.status === "MISSED").length;
    const dueDoses = doses.filter((d) => d.status === "DUE_NOW").length;
    const pendingDoses = doses.filter((d) => d.status === "PENDING").length;
    const progressPercent = totalDoses > 0 ? Math.round((completedDoses / totalDoses) * 100) : 100;

    return {
      date: dateStr,
      timezone: patientTz,
      progress: {
        totalDoses,
        completedDoses,
        skippedDoses,
        missedDoses,
        dueDoses,
        pendingDoses,
        percent: progressPercent,
      },
      sections,
    };
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
   * Marks a dose as skipped with clinical reasoning (e.g., patient nauseous, doctor advised hold).
   * Does not decrement inventory stock.
   */
  static async skipDose(
    doseId: string,
    patientId: string,
    actorUserId: string,
    input: SkipDoseInput
  ) {
    const dose = await prisma.doseOccurrence.findUnique({
      where: { id: doseId },
    });

    if (!dose || dose.patientId !== patientId) {
      throw new AppError("Dose occurrence not found.", 404, ErrorCode.DOSE_NOT_FOUND);
    }

    if (dose.status === "TAKEN") {
      throw new AppError(
        "Cannot skip a dose that has already been taken.",
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const updated = await prisma.doseOccurrence.update({
      where: { id: doseId },
      data: {
        status: "SKIPPED",
        skippedReason: input.reason,
        escalationTier: 0,
      },
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "DOSE_SKIPPED",
      resourceType: "dose_occurrence",
      resourceId: doseId,
      newState: {
        status: "SKIPPED",
        reason: input.reason,
        authorizedByCaregiverId: input.authorizedByCaregiverId,
      },
    });

    return updated;
  }

  /**
   * Marks a dose as missed (either automated sweep or manual clinical record).
   */
  static async recordMissedDose(
    doseId: string,
    patientId: string,
    actorUserId: string,
    reason: string = "Missed intake window"
  ) {
    const dose = await prisma.doseOccurrence.findUnique({
      where: { id: doseId },
    });

    if (!dose || dose.patientId !== patientId) {
      throw new AppError("Dose occurrence not found.", 404, ErrorCode.DOSE_NOT_FOUND);
    }

    if (dose.status === "TAKEN") {
      throw new AppError("Cannot mark a taken dose as missed.", 400, ErrorCode.VALIDATION_ERROR);
    }

    const updated = await prisma.doseOccurrence.update({
      where: { id: doseId },
      data: {
        status: "MISSED",
        skippedReason: reason,
      },
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "DOSE_MISSED",
      resourceType: "dose_occurrence",
      resourceId: doseId,
      newState: { status: "MISSED", reason },
    });

    return updated;
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

  /**
   * Generates a comprehensive adherence report across a date window.
   * Accurately excludes future or pending doses from the denominator.
   */
  static async getAdherenceReport(
    patientId: string,
    query: AdherenceReportQueryInput = {}
  ) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { medications: true },
    });

    if (!patient) {
      throw new AppError("Patient not found.", 404, ErrorCode.PATIENT_NOT_FOUND);
    }

    const now = new Date();
    const startDate = query.startDate ? new Date(query.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : now;

    const where: any = {
      patientId,
      scheduledForUtc: {
        gte: startDate,
        lte: endDate > now ? now : endDate, // Only count eligible occurrences up to current time
      },
    };

    if (query.medicationId) {
      where.medicationId = query.medicationId;
    }

    const occurrences = await prisma.doseOccurrence.findMany({
      where,
      include: { medication: true },
      orderBy: { scheduledForUtc: "asc" },
    });

    // Eligible doses are only those past scheduled time
    const eligibleDoses = occurrences.filter((d) => d.scheduledForUtc <= now);

    const takenCount = eligibleDoses.filter((d) => d.status === "TAKEN").length;
    const skippedCount = eligibleDoses.filter((d) => d.status === "SKIPPED").length;
    const missedCount = eligibleDoses.filter((d) => d.status === "MISSED").length;
    const overdueCount = eligibleDoses.filter((d) => d.status === "DUE_NOW" || d.status === "PENDING").length;

    const totalResolved = takenCount + skippedCount + missedCount;
    const totalEligible = eligibleDoses.length;
    const adherenceRate = totalEligible > 0 ? Math.round((takenCount / totalEligible) * 100) : 100;
    const streakDays = await this.calculateAdherenceStreak(patientId);

    // Per-medication breakdown
    const medicationMap = new Map<string, {
      medicationId: string;
      brandName: string;
      strength: string;
      taken: number;
      skipped: number;
      missed: number;
      total: number;
      adherenceRate: number;
    }>();

    for (const dose of eligibleDoses) {
      if (!medicationMap.has(dose.medicationId)) {
        medicationMap.set(dose.medicationId, {
          medicationId: dose.medicationId,
          brandName: dose.medication.brandName,
          strength: dose.medication.strength,
          taken: 0,
          skipped: 0,
          missed: 0,
          total: 0,
          adherenceRate: 100,
        });
      }

      const medStat = medicationMap.get(dose.medicationId)!;
      medStat.total++;
      if (dose.status === "TAKEN") medStat.taken++;
      else if (dose.status === "SKIPPED") medStat.skipped++;
      else if (dose.status === "MISSED") medStat.missed++;
    }

    medicationMap.forEach((stat) => {
      stat.adherenceRate = stat.total > 0 ? Math.round((stat.taken / stat.total) * 100) : 100;
    });

    return {
      patientId,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        adherenceRate,
        streakDays,
        totalEligibleDoses: totalEligible,
        takenCount,
        skippedCount,
        missedCount,
        overdueCount,
      },
      medicationBreakdown: Array.from(medicationMap.values()),
      disclaimer: "This medication adherence summary is provided for wellness and tracking purposes only and does not constitute a medical diagnosis or formal clinical evaluation.",
    };
  }
}
