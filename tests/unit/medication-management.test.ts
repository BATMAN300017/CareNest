import { describe, it, expect, vi, beforeEach } from "vitest";
import { MedicationService } from "../../src/modules/medications/medication.service";
import { AdherenceService } from "../../src/modules/adherence/adherence.service";
import { AuditService } from "../../src/modules/audit/audit.service";
import { prisma } from "../../src/core/database/prisma";
import { AppError } from "../../src/core/errors/app-error";
import { CreateMedicationInput } from "../../src/core/validation/medication.schema";

describe("Medication Management & Scheduling Unit Tests", () => {
  const patientId = "pat_margaret_101";
  const actorId = "usr_sarah_admin";

  const validMedicationInput: CreateMedicationInput = {
    brandName: "Glucophage",
    genericName: "Metformin",
    dosageForm: "TABLET",
    strength: "500mg",
    route: "ORAL",
    instructions: "1 White Oval Tablet with breakfast and lunch",
    pillAppearance: "White Oval Tablet with M 500 score",
    pillColor: "#FFFFFF",
    pillShape: "OVAL",
    indication: "Type 2 Diabetes Blood Sugar Regulation",
    specialPrecautions: "Take with food to prevent GI upset",
    prescribingDoctorName: "Dr. Robert Chen",
    startDate: "2026-11-01",
    initialStockQuantity: 60,
    refillThreshold: 14,
    pharmacyName: "Walgreens Community Pharmacy",
    pharmacyPhone: "+15553334444",
    schedules: [
      {
        frequencyType: "DAILY",
        intervalDays: 1,
        daysOfWeek: [],
        timeOfDayCategory: "MORNING",
        scheduledTime: "08:00",
        mealRelation: "WITH_MEAL",
        doseQuantity: 1.0,
        gracePeriodMinutes: 60,
        reminderLeadMinutes: 15,
      },
      {
        frequencyType: "DAILY",
        intervalDays: 1,
        daysOfWeek: [],
        timeOfDayCategory: "AFTERNOON",
        scheduledTime: "13:00",
        mealRelation: "WITH_MEAL",
        doseQuantity: 1.0,
        gracePeriodMinutes: 60,
        reminderLeadMinutes: 15,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuditService, "log").mockResolvedValue(undefined);
    vi.spyOn(AdherenceService, "generateOccurrencesForWindow").mockResolvedValue([]);
  });

  it("should create medication with multiple schedules, initialize stock, and trigger occurrence generation", async () => {
    vi.spyOn(prisma.medication, "findFirst").mockResolvedValue(null);

    const mockCreatedMed = {
      id: "med_metformin_1",
      patientId,
      brandName: validMedicationInput.brandName,
      genericName: validMedicationInput.genericName,
      strength: validMedicationInput.strength,
      isActive: true,
      startDate: new Date("2026-11-01"),
      schedules: [
        { id: "sched_1", scheduledTime: "08:00", timeOfDayCategory: "MORNING" },
        { id: "sched_2", scheduledTime: "13:00", timeOfDayCategory: "AFTERNOON" },
      ],
      stock: { id: "stk_1", currentQuantity: 60, refillThreshold: 14 },
    };

    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      const mockTx = {
        medication: {
          create: vi.fn().mockResolvedValue(mockCreatedMed),
        },
        medicationSchedule: {
          create: vi.fn().mockResolvedValue({ id: "sched_new" }),
        },
        medicationStock: {
          create: vi.fn().mockResolvedValue({ id: "stk_new" }),
        },
      };
      return callback(mockTx);
    });

    vi.spyOn(prisma.medication, "findUnique").mockResolvedValue(mockCreatedMed as any);

    const result = await MedicationService.createMedication(patientId, validMedicationInput, actorId);

    expect(result.id).toBe("med_metformin_1");
    expect(result.brandName).toBe("Glucophage");
    expect(AdherenceService.generateOccurrencesForWindow).toHaveBeenCalledWith(
      patientId,
      expect.any(Date),
      expect.any(Date)
    );
    expect(AuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "MEDICATION_CREATED",
        patientId,
      })
    );
  });

  it("should prevent creating duplicate active prescriptions with the same brand or generic name", async () => {
    vi.spyOn(prisma.medication, "findFirst").mockResolvedValue({
      id: "med_existing",
      brandName: "Glucophage",
      genericName: "Metformin",
      isActive: true,
    } as any);

    await expect(
      MedicationService.createMedication(patientId, validMedicationInput, actorId)
    ).rejects.toThrow("Patient already has an active prescription for 'Glucophage'");
  });

  it("should filter medications by status (active, discontinued) and search text", async () => {
    const findManySpy = vi.spyOn(prisma.medication, "findMany").mockResolvedValue([
      {
        id: "med_1",
        brandName: "Glucophage",
        genericName: "Metformin",
        isActive: true,
      } as any,
    ]);

    // Active status filter
    await MedicationService.getPatientMedications(patientId, { status: "active", search: "Metformin" });
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          patientId,
          isActive: true,
          OR: expect.arrayContaining([
            { brandName: { contains: "Metformin", mode: "insensitive" } },
            { genericName: { contains: "Metformin", mode: "insensitive" } },
          ]),
        }),
      })
    );

    // Discontinued status filter
    await MedicationService.getPatientMedications(patientId, { status: "discontinued" });
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          patientId,
          isActive: false,
        }),
      })
    );
  });

  it("should update medication details and record audit log", async () => {
    const existingMed = {
      id: "med_1",
      patientId,
      instructions: "Old instructions",
      strength: "500mg",
    };

    vi.spyOn(prisma.medication, "findUnique").mockResolvedValue(existingMed as any);
    vi.spyOn(prisma.medication, "update").mockResolvedValue({
      ...existingMed,
      instructions: "New instructions with meal",
      strength: "850mg",
    } as any);

    const updated = await MedicationService.updateMedication(
      "med_1",
      patientId,
      { instructions: "New instructions with meal", strength: "850mg" },
      actorId
    );

    expect(updated.instructions).toBe("New instructions with meal");
    expect(updated.strength).toBe("850mg");
    expect(AuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MEDICATION_UPDATED" })
    );
  });

  it("should discontinue medication and remove future pending doses while preserving past history", async () => {
    vi.spyOn(prisma.medication, "findUnique").mockResolvedValue({
      id: "med_1",
      patientId,
      isActive: true,
    } as any);

    let deletedPendingDosesFilter: any = null;

    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      const mockTx = {
        medication: {
          update: vi.fn().mockResolvedValue({ id: "med_1", isActive: false }),
        },
        medicationSchedule: {
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        doseOccurrence: {
          deleteMany: vi.fn().mockImplementation((args: any) => {
            deletedPendingDosesFilter = args.where;
            return { count: 12 };
          }),
        },
      };
      return callback(mockTx);
    });

    await MedicationService.discontinueMedication(
      "med_1",
      patientId,
      "Doctor changed prescription to Januvia",
      actorId
    );

    expect(deletedPendingDosesFilter).toBeDefined();
    expect(deletedPendingDosesFilter.status).toBe("PENDING");
    expect(deletedPendingDosesFilter.medicationId).toBe("med_1");
    expect(AuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "MEDICATION_DISCONTINUED",
        resourceId: "med_1",
      })
    );
  });

  it("should add a schedule to an existing medication and regenerate future doses", async () => {
    vi.spyOn(prisma.medication, "findUnique").mockResolvedValue({
      id: "med_1",
      patientId,
      startDate: new Date("2026-11-01"),
    } as any);

    vi.spyOn(prisma.medicationSchedule, "create").mockResolvedValue({
      id: "sched_bedtime",
      medicationId: "med_1",
      scheduledTime: "22:00",
      timeOfDayCategory: "NIGHT",
    } as any);

    const schedule = await MedicationService.addSchedule(
      "med_1",
      patientId,
      {
        frequencyType: "DAILY",
        intervalDays: 1,
        daysOfWeek: [],
        timeOfDayCategory: "NIGHT",
        scheduledTime: "22:00",
        mealRelation: "NO_RESTRICTION",
        doseQuantity: 1.0,
        gracePeriodMinutes: 60,
        reminderLeadMinutes: 15,
      },
      actorId
    );

    expect(schedule.id).toBe("sched_bedtime");
    expect(AdherenceService.generateOccurrencesForWindow).toHaveBeenCalled();
    expect(AuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SCHEDULE_CREATED" })
    );
  });

  it("should update schedule and clean up future pending doses without altering history", async () => {
    vi.spyOn(prisma.medicationSchedule, "findUnique").mockResolvedValue({
      id: "sched_1",
      medicationId: "med_1",
      patientId,
      scheduledTime: "08:00",
      isActive: true,
    } as any);

    let deleteFilter: any = null;
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      const mockTx = {
        medicationSchedule: {
          update: vi.fn().mockResolvedValue({ id: "sched_1", scheduledTime: "09:00", isActive: true }),
        },
        doseOccurrence: {
          deleteMany: vi.fn().mockImplementation((args: any) => {
            deleteFilter = args.where;
            return { count: 5 };
          }),
        },
      };
      return callback(mockTx);
    });

    const updated = await MedicationService.updateSchedule(
      "sched_1",
      "med_1",
      patientId,
      { scheduledTime: "09:00" },
      actorId
    );

    expect(updated.scheduledTime).toBe("09:00");
    expect(deleteFilter.scheduleId).toBe("sched_1");
    expect(deleteFilter.status).toBe("PENDING");
    expect(AdherenceService.generateOccurrencesForWindow).toHaveBeenCalled();
  });
});
