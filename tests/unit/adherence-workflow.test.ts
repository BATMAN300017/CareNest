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
