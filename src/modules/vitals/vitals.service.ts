import { prisma } from "../../core/database/prisma";
import { RecordHealthVitalInput, RecordSymptomInput } from "../../core/validation/vitals.schema";
import { AuditService } from "../audit/audit.service";

export class VitalsService {
  /**
   * Records a health vital telemetry reading (Blood Pressure, Glucose, SpO2, Heart Rate, Temperature, Weight).
   * Automatically evaluates whether the reading falls outside safe clinical thresholds.
   */
  static async recordVital(
    patientId: string,
    input: RecordHealthVitalInput,
    loggedByUserId?: string
  ) {
    const isAbnormal = this.checkIfAbnormal(
      input.vitalType,
      input.numericValuePrimary,
      input.numericValueSecondary
    );

    const vital = await prisma.healthVital.create({
      data: {
        patientId,
        vitalType: input.vitalType as any,
        recordedAtUtc: input.recordedAt ? new Date(input.recordedAt) : new Date(),
        numericValuePrimary: input.numericValuePrimary,
        numericValueSecondary: input.numericValueSecondary || null,
        unit: input.unit,
        readingContext: input.readingContext,
        isAbnormal,
        sourceDevice: input.sourceDevice,
        loggedByUserId: loggedByUserId || null,
      },
    });

    await AuditService.log({
      patientId,
      actorUserId: loggedByUserId,
      action: "VITAL_RECORDED",
      resourceType: "health_vital",
      resourceId: vital.id,
      newState: {
        vitalType: input.vitalType,
        valuePrimary: input.numericValuePrimary,
        valueSecondary: input.numericValueSecondary,
        isAbnormal,
      },
    });

    return vital;
  }

  /**
   * Increments today's hydration water glass counter (matching dashboard UI button "+ Log Glass").
   */
  static async logHydrationGlass(
    patientId: string,
    glassesCount: number = 1,
    loggedByUserId?: string
  ) {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    // Check if hydration was already logged today
    const existing = await prisma.healthVital.findFirst({
      where: {
        patientId,
        vitalType: "HYDRATION",
        recordedAtUtc: { gte: startOfDay },
      },
      orderBy: { recordedAtUtc: "desc" },
    });

    let current = 0;
    if (existing) {
      current = Number(existing.numericValuePrimary);
    }

    const newTotal = current + glassesCount;

    const vital = await prisma.healthVital.create({
      data: {
        patientId,
        vitalType: "HYDRATION",
        recordedAtUtc: new Date(),
        numericValuePrimary: newTotal,
        unit: "glasses",
        readingContext: "DAILY_TOTAL",
        sourceDevice: "CareNest Dashboard UI",
        loggedByUserId: loggedByUserId || null,
      },
    });

    return {
      currentGlasses: newTotal,
      targetGlasses: 6,
      vitalRecordId: vital.id,
    };
  }

  /**
   * Fetches historical vitals for clinical charts and monitoring.
   */
  static async getPatientVitals(
    patientId: string,
    vitalType?: string,
    limit: number = 30
  ) {
    return prisma.healthVital.findMany({
      where: {
        patientId,
        ...(vitalType && { vitalType: vitalType as any }),
      },
      orderBy: { recordedAtUtc: "desc" },
      take: limit,
    });
  }

  /**
   * Records a patient-reported or caregiver-observed symptom.
   */
  static async recordSymptom(
    patientId: string,
    input: RecordSymptomInput,
    loggedByUserId: string
  ) {
    const symptom = await prisma.symptomLog.create({
      data: {
        patientId,
        loggedByUserId,
        symptomName: input.symptomName,
        severity: input.severity as any,
        notes: input.notes || null,
      },
    });

    await AuditService.log({
      patientId,
      actorUserId: loggedByUserId,
      action: "SYMPTOM_LOGGED",
      resourceType: "symptom_log",
      resourceId: symptom.id,
      newState: input,
    });

    return symptom;
  }

  /**
   * Evaluates clinical ranges for geriatric patients.
   */
  private static checkIfAbnormal(
    vitalType: string,
    primary: number,
    secondary?: number
  ): boolean {
    switch (vitalType) {
      case "BLOOD_PRESSURE":
        // Systolic > 140 or < 90, or Diastolic > 90 or < 60
        if (primary > 140 || primary < 90) return true;
        if (secondary && (secondary > 90 || secondary < 60)) return true;
        return false;
      case "BLOOD_GLUCOSE":
        // Fasting: > 140 or < 70
        return primary > 140 || primary < 70;
      case "SPO2":
        // Oxygen saturation < 92% is clinical flag
        return primary < 92;
      case "HEART_RATE":
        // Resting pulse > 100 or < 50
        return primary > 100 || primary < 50;
      case "TEMPERATURE":
        // Fever > 100.4 F or hypothermia < 95 F
        return primary > 100.4 || primary < 95.0;
      default:
        return false;
    }
  }
}
