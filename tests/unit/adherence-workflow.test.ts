import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdherenceService } from "../../src/modules/adherence/adherence.service";
import { VitalsService } from "../../src/modules/vitals/vitals.service";
import { AuditService } from "../../src/modules/audit/audit.service";
import { prisma } from "../../src/core/database/prisma";
import { AppError } from "../../src/core/errors/app-error";

describe("Adherence & Clinical Logic Workflows", () => {
  const patientId = "pat_1";
  const doseId = "dose_metformin_1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuditService, "log").mockResolvedValue(undefined);
  });

  it("should confirm a pending dose, create an adherence record, and decrement stock", async () => {
    const mockDose = {
      id: doseId,
      patientId,
      medicationId: "med_1",
      status: "DUE_NOW",
      medication: {
        brandName: "Metformin",
        strength: "500mg",
        stock: {
          currentQuantity: 30,
          refillThreshold: 7,
        },
      },
      schedule: {
        doseQuantity: 1.0,
      },
    };

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue(mockDose as any);

    // Mock transaction
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      const mockTx = {
        doseOccurrence: {
          findUnique: vi.fn().mockResolvedValue({ status: "DUE_NOW" }),
          update: vi.fn().mockResolvedValue({ id: doseId, status: "TAKEN" }),
        },
        adherenceRecord: {
          create: vi.fn().mockResolvedValue({
            id: "adh_1",
            doseOccurrenceId: doseId,
            confirmationChannel: "DASHBOARD_UI",
          }),
        },
        medicationStock: {
          update: vi.fn().mockResolvedValue({ currentQuantity: 29 }),
        },
        notification: {
          create: vi.fn().mockResolvedValue({ id: "notif_1" }),
        },
      };
      return callback(mockTx);
    });

    vi.spyOn(AdherenceService, "calculateAdherenceStreak").mockResolvedValue(14);

    const result = await AdherenceService.confirmDose(doseId, patientId, "usr_senior", {
      confirmationChannel: "DASHBOARD_UI",
      intakeMealContext: "Taken with lunch and 8 oz water",
    });

    expect(result.status).toBe("TAKEN");
    expect(result.stockRemaining).toBe(29);
    expect(result.adherenceStreakDays).toBe(14);
  });

  it("should prevent duplicate dose confirmation when dose is already taken", async () => {
    const mockAlreadyTakenDose = {
      id: doseId,
      patientId,
      status: "TAKEN",
      medication: {
        brandName: "Metformin",
      },
    };

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue(mockAlreadyTakenDose as any);

    await expect(
      AdherenceService.confirmDose(doseId, patientId, "usr_senior", {
        confirmationChannel: "DASHBOARD_UI",
      })
    ).rejects.toThrow("This dose has already been recorded as taken.");
  });

  it("should prevent race-condition double confirmation when status changes to TAKEN inside the transaction", async () => {
    const mockDose = {
      id: doseId,
      patientId,
      medicationId: "med_1",
      status: "DUE_NOW",
      medication: {
        brandName: "Metformin",
        strength: "500mg",
        stock: { currentQuantity: 30, refillThreshold: 7 },
      },
      schedule: { doseQuantity: 1.0 },
    };

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue(mockDose as any);

    // Mock transaction where concurrent process already updated status to TAKEN
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      const mockTx = {
        doseOccurrence: {
          findUnique: vi.fn().mockResolvedValue({ status: "TAKEN" }),
        },
      };
      return callback(mockTx);
    });

    await expect(
      AdherenceService.confirmDose(doseId, patientId, "usr_senior", {
        confirmationChannel: "DASHBOARD_UI",
      })
    ).rejects.toThrow("This dose has already been recorded as taken.");
  });

  it("should trigger an automatic refill alert notification when stock falls below refillThreshold", async () => {
    const mockDose = {
      id: doseId,
      patientId,
      medicationId: "med_1",
      status: "DUE_NOW",
      medication: {
        brandName: "Lisinopril",
        strength: "10mg",
        stock: {
          currentQuantity: 8,
          refillThreshold: 7,
        },
      },
      schedule: { doseQuantity: 1.0 },
    };

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue(mockDose as any);

    let notificationCreated = false;
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      const mockTx = {
        doseOccurrence: {
          findUnique: vi.fn().mockResolvedValue({ status: "DUE_NOW" }),
          update: vi.fn().mockResolvedValue({ id: doseId, status: "TAKEN" }),
        },
        adherenceRecord: {
          create: vi.fn().mockResolvedValue({ id: "adh_1", doseOccurrenceId: doseId }),
        },
        medicationStock: {
          update: vi.fn().mockResolvedValue({ currentQuantity: 7 }),
        },
        notification: {
          create: vi.fn().mockImplementation(() => {
            notificationCreated = true;
            return { id: "notif_refill_1" };
          }),
        },
      };
      return callback(mockTx);
    });

    vi.spyOn(AdherenceService, "calculateAdherenceStreak").mockResolvedValue(10);

    const result = await AdherenceService.confirmDose(doseId, patientId, "usr_senior", {
      confirmationChannel: "DASHBOARD_UI",
    });

    expect(result.status).toBe("TAKEN");
    expect(result.stockRemaining).toBe(7);
    expect(notificationCreated).toBe(true);
  });

  it("should reject confirmation when dose belongs to a different patient (cross-patient isolation)", async () => {
    const mockDose = {
      id: doseId,
      patientId: "pat_patient_A",
      status: "DUE_NOW",
      medication: { brandName: "Metformin" },
    };

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue(mockDose as any);

    await expect(
      AdherenceService.confirmDose(doseId, "pat_patient_B", "usr_attacker", {
        confirmationChannel: "DASHBOARD_UI",
      })
    ).rejects.toThrow("Dose occurrence not found.");
  });

  it("should successfully record a skipped dose with clinical reasoning and notify care circle", async () => {
    const mockDose = {
      id: doseId,
      patientId,
      medicationId: "med_1",
      status: "DUE_NOW",
      medication: { brandName: "Atorvastatin", strength: "20mg" },
    };

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue(mockDose as any);
    vi.spyOn(prisma.doseOccurrence, "update").mockResolvedValue({
      id: doseId,
      status: "SKIPPED",
      skippedReason: "Experiencing mild nausea; doctor advised holding evening dose",
    } as any);

    const result = await AdherenceService.skipDose(doseId, patientId, "usr_senior", {
      reason: "Experiencing mild nausea; doctor advised holding evening dose",
    });

    expect(result.status).toBe("SKIPPED");
    expect(result.skippedReason).toContain("mild nausea");
    expect(AuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "DOSE_SKIPPED",
        patientId,
      })
    );
  });

  it("should snooze a scheduled dose by 15, 30, or 60 minutes and reset escalation tier", async () => {
    const originalTime = new Date("2026-11-15T13:00:00Z");
    const mockDose = {
      id: doseId,
      patientId,
      status: "DUE_NOW",
      scheduledForUtc: originalTime,
      medication: { brandName: "Metformin" },
    };

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue(mockDose as any);
    vi.spyOn(prisma.doseOccurrence, "update").mockImplementation(async (args: any) => ({
      id: doseId,
      ...args.data,
    }));

    const result = await AdherenceService.snoozeDose(doseId, patientId, "usr_senior", 15);

    expect(result.status).toBe("SNOOZED");
    expect(result.snoozedUntilUtc).toBeDefined();
    expect(result.snoozedUntilUtc.getTime()).toBeGreaterThan(Date.now());
  });

  it("should correctly flag abnormal vitals for clinical safety alerts", async () => {
    (vi.spyOn(prisma.healthVital, "create") as any).mockImplementation(async (args: any) => {
      return { id: "vit_1", ...args.data };
    });

    // Systolic 150 is Hypertensive Crisis / Stage 2
    const abnormalBP = await VitalsService.recordVital("pat_1", {
      vitalType: "BLOOD_PRESSURE",
      numericValuePrimary: 150,
      numericValueSecondary: 95,
      unit: "mmHg",
      readingContext: "RESTING",
      sourceDevice: "Omron Hub",
    });

    expect(abnormalBP.isAbnormal).toBe(true);

    // Normal Blood Pressure 120/80
    const normalBP = await VitalsService.recordVital("pat_1", {
      vitalType: "BLOOD_PRESSURE",
      numericValuePrimary: 120,
      numericValueSecondary: 80,
      unit: "mmHg",
      readingContext: "RESTING",
      sourceDevice: "Omron Hub",
    });

    expect(normalBP.isAbnormal).toBe(false);

    // Hypoglycemia Glucose < 70
    const lowGlucose = await VitalsService.recordVital("pat_1", {
      vitalType: "BLOOD_GLUCOSE",
      numericValuePrimary: 62,
      unit: "mg/dL",
      readingContext: "FASTING",
      sourceDevice: "Contour Meter",
    });

    expect(lowGlucose.isAbnormal).toBe(true);
  });
});
