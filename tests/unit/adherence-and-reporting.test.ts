import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdherenceService } from "../../src/modules/adherence/adherence.service";
import { AuditService } from "../../src/modules/audit/audit.service";
import { prisma } from "../../src/core/database/prisma";

describe("Adherence Tracking, Daily Schedule & Reporting Unit Tests", () => {
  const patientId = "pat_margaret_101";
  const actorId = "usr_sarah_admin";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuditService, "log").mockResolvedValue(undefined);
  });

  it("should generate a structured daily schedule grouped into 4 time categories matching UI design", async () => {
    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      timezone: "America/New_York",
    } as any);

    const mockDoses = [
      {
        id: "dose_m1",
        medicationId: "med_1",
        timeCategory: "MORNING",
        status: "TAKEN",
        scheduledForUtc: new Date("2026-11-15T13:00:00Z"),
        medication: {
          brandName: "Lisinopril",
          genericName: "Lisinopril",
          strength: "10mg",
          dosageForm: "TABLET",
          instructions: "1 Tablet for blood pressure",
          pillAppearance: "Yellow Round Tablet",
        },
        schedule: { scheduledTime: "08:00", mealRelation: "NO_RESTRICTION", doseQuantity: 1.0 },
        adherenceRecord: { confirmedAtUtc: new Date(), confirmedByUser: { fullName: "Margaret Jenkins" } },
      },
      {
        id: "dose_a1",
        medicationId: "med_2",
        timeCategory: "AFTERNOON",
        status: "DUE_NOW",
        scheduledForUtc: new Date("2026-11-15T18:00:00Z"),
        medication: {
          brandName: "Metformin",
          genericName: "Metformin",
          strength: "500mg",
          dosageForm: "TABLET",
          instructions: "1 White Oval Tablet with meal",
          pillAppearance: "White Oval Tablet",
        },
        schedule: { scheduledTime: "13:00", mealRelation: "WITH_MEAL", doseQuantity: 1.0 },
        adherenceRecord: null,
      },
      {
        id: "dose_e1",
        medicationId: "med_3",
        timeCategory: "EVENING",
        status: "PENDING",
        scheduledForUtc: new Date("2026-11-15T23:00:00Z"),
        medication: {
          brandName: "Atorvastatin",
          genericName: "Atorvastatin",
          strength: "20mg",
          dosageForm: "TABLET",
          instructions: "1 Tablet at bedtime",
          pillAppearance: "White Round Tablet",
        },
        schedule: { scheduledTime: "18:00", mealRelation: "NO_RESTRICTION", doseQuantity: 1.0 },
        adherenceRecord: null,
      },
    ];

    vi.spyOn(prisma.doseOccurrence, "findMany").mockResolvedValue(mockDoses as any);

    const daily = await AdherenceService.getDailySchedule(patientId, new Date("2026-11-15T12:00:00Z"));

    expect(daily.date).toBe("2026-11-15");
    expect(daily.timezone).toBe("America/New_York");
    expect(daily.progress.totalDoses).toBe(3);
    expect(daily.progress.completedDoses).toBe(1);
    expect(daily.progress.percent).toBe(33);

    // Verify 4 categories present
    expect(daily.sections).toHaveLength(4);
    const morningSection = daily.sections.find((s) => s.category === "MORNING");
    const afternoonSection = daily.sections.find((s) => s.category === "AFTERNOON");

    expect(morningSection?.status).toBe("COMPLETED");
    expect(morningSection?.items[0].brandName).toBe("Lisinopril");
    expect(afternoonSection?.status).toBe("DUE_NOW");
    expect(afternoonSection?.items[0].brandName).toBe("Metformin");
  });

  it("should mark a dose as skipped with clinical reason without decrementing inventory stock", async () => {
    const mockDose = {
      id: "dose_skip_1",
      patientId,
      status: "DUE_NOW",
    };

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue(mockDose as any);
    const updateSpy = vi.spyOn(prisma.doseOccurrence, "update").mockResolvedValue({
      id: "dose_skip_1",
      status: "SKIPPED",
      skippedReason: "Patient experiencing mild nausea; held per nurse instructions",
    } as any);

    const stockUpdateSpy = vi.spyOn(prisma.medicationStock, "update");

    const result = await AdherenceService.skipDose(
      "dose_skip_1",
      patientId,
      actorId,
      { reason: "Patient experiencing mild nausea; held per nurse instructions" }
    );

    expect(result.status).toBe("SKIPPED");
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SKIPPED",
          skippedReason: "Patient experiencing mild nausea; held per nurse instructions",
        }),
      })
    );
    expect(stockUpdateSpy).not.toHaveBeenCalled();
    expect(AuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "DOSE_SKIPPED" })
    );
  });

  it("should calculate adherence report excluding future doses from denominator", async () => {
    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({ id: patientId } as any);
    vi.spyOn(AdherenceService, "calculateAdherenceStreak").mockResolvedValue(5);

    const now = new Date();
    const pastHour1 = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const pastHour2 = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const pastHour3 = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    const mockOccurrences = [
      {
        id: "d1",
        medicationId: "med_1",
        status: "TAKEN",
        scheduledForUtc: pastHour3,
        medication: { brandName: "Lisinopril", strength: "10mg" },
      },
      {
        id: "d2",
        medicationId: "med_1",
        status: "TAKEN",
        scheduledForUtc: pastHour2,
        medication: { brandName: "Lisinopril", strength: "10mg" },
      },
      {
        id: "d3",
        medicationId: "med_2",
        status: "MISSED",
        scheduledForUtc: pastHour1,
        medication: { brandName: "Metformin", strength: "500mg" },
      },
    ];

    vi.spyOn(prisma.doseOccurrence, "findMany").mockResolvedValue(mockOccurrences as any);

    const report = await AdherenceService.getAdherenceReport(patientId, {});

    // 2 taken out of 3 eligible = 67%
    expect(report.summary.totalEligibleDoses).toBe(3);
    expect(report.summary.takenCount).toBe(2);
    expect(report.summary.missedCount).toBe(1);
    expect(report.summary.adherenceRate).toBe(67);
    expect(report.summary.streakDays).toBe(5);

    // Breakdown
    const lisinoprilStat = report.medicationBreakdown.find((m) => m.brandName === "Lisinopril");
    const metforminStat = report.medicationBreakdown.find((m) => m.brandName === "Metformin");

    expect(lisinoprilStat?.adherenceRate).toBe(100);
    expect(metforminStat?.adherenceRate).toBe(0);

    // Must include medical disclaimer
    expect(report.disclaimer).toContain("does not constitute a medical diagnosis");
  });

  it("should handle custom recurrence (interval days and specific weekdays) accurately", async () => {
    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      timezone: "America/New_York",
      medicationSchedules: [
        {
          id: "sched_mwf",
          medicationId: "med_mwf",
          frequencyType: "SPECIFIC_WEEKDAYS",
          daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
          scheduledTime: "10:00",
          timeOfDayCategory: "MORNING",
          isActive: true,
          medication: {
            isActive: true,
            startDate: new Date("2026-11-01"),
            endDate: null,
          },
        },
      ],
    } as any);

    const upsertSpy = vi.spyOn(prisma.doseOccurrence, "upsert").mockResolvedValue({} as any);

    // Mon Nov 16 to Wed Nov 18, 2026
    const windowStart = new Date("2026-11-16T00:00:00Z"); // Monday
    const windowEnd = new Date("2026-11-18T23:59:59Z"); // Wednesday (Mon, Tue, Wed)

    await AdherenceService.generateOccurrencesForWindow(patientId, windowStart, windowEnd);

    // Monday (1) and Wednesday (3) match; Tuesday (2) does not match
    expect(upsertSpy).toHaveBeenCalledTimes(2);
  });
});
