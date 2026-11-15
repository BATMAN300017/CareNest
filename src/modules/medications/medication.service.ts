import { prisma } from "../../core/database/prisma";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import {
  CreateMedicationInput,
  UpdateMedicationInput,
  CreateMedicationScheduleInput,
  UpdateMedicationScheduleInput,
  UpdateMedicationStockInput,
  FilterMedicationInput,
} from "../../core/validation/medication.schema";
import { AuditService } from "../audit/audit.service";
import { AdherenceService } from "../adherence/adherence.service";

export class MedicationService {
  /**
   * Registers a new medication prescription, creates recurring schedules,
   * initializes stock inventory, and generates upcoming dose occurrences.
   */
  static async createMedication(
    patientId: string,
    input: CreateMedicationInput,
    actorUserId: string
  ) {
    // 1. Check for duplicate active prescriptions (same brand or generic name)
    const duplicate = await prisma.medication.findFirst({
      where: {
        patientId,
        isActive: true,
        OR: [
          { brandName: { equals: input.brandName, mode: "insensitive" } },
          { genericName: { equals: input.genericName, mode: "insensitive" } },
        ],
      },
    });

    if (duplicate) {
      throw new AppError(
        `Patient already has an active prescription for '${duplicate.brandName}' (${duplicate.genericName}). Discontinue the previous prescription before adding a duplicate.`,
        409,
        ErrorCode.DUPLICATE_PRESCRIPTION
      );
    }

    const startDate = new Date(input.startDate);
    const endDate = input.endDate ? new Date(input.endDate) : null;

    if (endDate && endDate < startDate) {
      throw new AppError("Medication end date cannot be earlier than start date.", 400, ErrorCode.VALIDATION_ERROR);
    }

    // 2. Atomic creation of Medication, Schedules, and Stock
    const medication = await prisma.$transaction(async (tx) => {
      const med = await tx.medication.create({
        data: {
          patientId,
          brandName: input.brandName,
          genericName: input.genericName,
          rxNormCode: input.rxNormCode || null,
          dosageForm: input.dosageForm as any,
          strength: input.strength,
          route: input.route,
          instructions: input.instructions,
          pillAppearance: input.pillAppearance,
          pillColor: input.pillColor || null,
          pillShape: input.pillShape || null,
          indication: input.indication || null,
          specialPrecautions: input.specialPrecautions || null,
          prescribingDoctorId: input.prescribingDoctorId || null,
          prescribingDoctorName: input.prescribingDoctorName || null,
          startDate,
          endDate,
          isActive: true,
        },
      });

      // Create individual schedules (e.g. morning, afternoon, evening)
      for (const sched of input.schedules) {
        await tx.medicationSchedule.create({
          data: {
            medicationId: med.id,
            patientId,
            frequencyType: sched.frequencyType as any,
            intervalDays: sched.intervalDays,
            daysOfWeek: sched.daysOfWeek,
            timeOfDayCategory: sched.timeOfDayCategory as any,
            scheduledTime: sched.scheduledTime,
            mealRelation: sched.mealRelation as any,
            doseQuantity: sched.doseQuantity,
            gracePeriodMinutes: sched.gracePeriodMinutes,
            reminderLeadMinutes: sched.reminderLeadMinutes,
            startDate: sched.startDate ? new Date(sched.startDate) : startDate,
            endDate: sched.endDate ? new Date(sched.endDate) : endDate,
            timezone: sched.timezone || null,
            isActive: true,
          },
        });
      }

      // Initialize stock inventory
      await tx.medicationStock.create({
        data: {
          medicationId: med.id,
          patientId,
          currentQuantity: input.initialStockQuantity,
          packageSize: input.initialStockQuantity,
          refillThreshold: input.refillThreshold,
          pharmacyName: input.pharmacyName || null,
          pharmacyPhone: input.pharmacyPhone || null,
          rxNumber: input.rxNumber || null,
        },
      });

      return med;
    });

    // 3. Generate rolling dose occurrences for the next 30 days
    const horizonEndDate = new Date();
    horizonEndDate.setDate(horizonEndDate.getDate() + 30);
    await AdherenceService.generateOccurrencesForWindow(patientId, new Date(), horizonEndDate);

    await AuditService.log({
      patientId,
      actorUserId,
      action: "MEDICATION_CREATED",
      resourceType: "medication",
      resourceId: medication.id,
      newState: input,
    });

    return this.getMedicationById(medication.id, patientId);
  }

  /**
   * Retrieves a medication by ID including schedules and stock.
   */
  static async getMedicationById(medicationId: string, patientId: string) {
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
      include: {
        schedules: true,
        stock: true,
        prescribingDoctor: true,
      },
    });

    if (!medication || medication.patientId !== patientId) {
      throw new AppError("Medication not found.", 404, ErrorCode.MEDICATION_NOT_FOUND);
    }

    return medication;
  }

  /**
   * Lists medications for a patient with status filtering and text search.
   */
  static async getPatientMedications(
    patientId: string,
    filter: FilterMedicationInput = { status: "active" }
  ) {
    const where: any = { patientId };

    if (filter.status === "active") {
      where.isActive = true;
    } else if (filter.status === "discontinued") {
      where.isActive = false;
    }

    if (filter.search && filter.search.trim().length > 0) {
      const q = filter.search.trim();
      where.OR = [
        { brandName: { contains: q, mode: "insensitive" } },
        { genericName: { contains: q, mode: "insensitive" } },
        { indication: { contains: q, mode: "insensitive" } },
      ];
    }

    return prisma.medication.findMany({
      where,
      include: {
        schedules: { where: { isActive: true } },
        stock: true,
        prescribingDoctor: {
          select: { id: true, fullName: true, specialty: true, clinicName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Updates an existing medication prescription.
   */
  static async updateMedication(
    medicationId: string,
    patientId: string,
    input: UpdateMedicationInput,
    actorUserId: string
  ) {
    const existing = await prisma.medication.findUnique({
      where: { id: medicationId },
    });

    if (!existing || existing.patientId !== patientId) {
      throw new AppError("Medication not found.", 404, ErrorCode.MEDICATION_NOT_FOUND);
    }

    const data: any = {};
    if (input.brandName !== undefined) data.brandName = input.brandName;
    if (input.genericName !== undefined) data.genericName = input.genericName;
    if (input.rxNormCode !== undefined) data.rxNormCode = input.rxNormCode;
    if (input.dosageForm !== undefined) data.dosageForm = input.dosageForm as any;
    if (input.strength !== undefined) data.strength = input.strength;
    if (input.route !== undefined) data.route = input.route;
    if (input.instructions !== undefined) data.instructions = input.instructions;
    if (input.pillAppearance !== undefined) data.pillAppearance = input.pillAppearance;
    if (input.pillColor !== undefined) data.pillColor = input.pillColor;
    if (input.pillShape !== undefined) data.pillShape = input.pillShape;
    if (input.indication !== undefined) data.indication = input.indication;
    if (input.specialPrecautions !== undefined) data.specialPrecautions = input.specialPrecautions;
    if (input.prescribingDoctorId !== undefined) data.prescribingDoctorId = input.prescribingDoctorId;
    if (input.prescribingDoctorName !== undefined) data.prescribingDoctorName = input.prescribingDoctorName;
    if (input.startDate !== undefined) data.startDate = new Date(input.startDate);
    if (input.endDate !== undefined) data.endDate = input.endDate ? new Date(input.endDate) : null;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const updated = await prisma.medication.update({
      where: { id: medicationId },
      data,
      include: {
        schedules: true,
        stock: true,
        prescribingDoctor: true,
      },
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "MEDICATION_UPDATED",
      resourceType: "medication",
      resourceId: medicationId,
      previousState: existing,
      newState: updated,
    });

    return updated;
  }

  /**
   * Adds a new schedule to an existing medication.
   */
  static async addSchedule(
    medicationId: string,
    patientId: string,
    input: CreateMedicationScheduleInput,
    actorUserId: string
  ) {
    const medication = await this.getMedicationById(medicationId, patientId);

    const schedule = await prisma.medicationSchedule.create({
      data: {
        medicationId,
        patientId,
        frequencyType: input.frequencyType as any,
        intervalDays: input.intervalDays,
        daysOfWeek: input.daysOfWeek,
        timeOfDayCategory: input.timeOfDayCategory as any,
        scheduledTime: input.scheduledTime,
        mealRelation: input.mealRelation as any,
        doseQuantity: input.doseQuantity,
        gracePeriodMinutes: input.gracePeriodMinutes,
        reminderLeadMinutes: input.reminderLeadMinutes,
        startDate: input.startDate ? new Date(input.startDate) : medication.startDate,
        endDate: input.endDate ? new Date(input.endDate) : medication.endDate,
        timezone: input.timezone || null,
        isActive: true,
      },
    });

    // Generate upcoming doses for this new schedule
    const horizonEndDate = new Date();
    horizonEndDate.setDate(horizonEndDate.getDate() + 30);
    await AdherenceService.generateOccurrencesForWindow(patientId, new Date(), horizonEndDate);

    await AuditService.log({
      patientId,
      actorUserId,
      action: "SCHEDULE_CREATED",
      resourceType: "medication_schedule",
      resourceId: schedule.id,
      newState: input,
    });

    return schedule;
  }

  /**
   * Lists all schedules for a given medication.
   */
  static async getMedicationSchedules(medicationId: string, patientId: string) {
    await this.getMedicationById(medicationId, patientId);

    return prisma.medicationSchedule.findMany({
      where: { medicationId, patientId },
      orderBy: { scheduledTime: "asc" },
    });
  }

  /**
   * Updates an existing medication schedule.
   * Modifies future PENDING occurrences without altering historical adherence records.
   */
  static async updateSchedule(
    scheduleId: string,
    medicationId: string,
    patientId: string,
    input: UpdateMedicationScheduleInput,
    actorUserId: string
  ) {
    const existing = await prisma.medicationSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing || existing.medicationId !== medicationId || existing.patientId !== patientId) {
      throw new AppError("Medication schedule not found.", 404, ErrorCode.NOT_FOUND);
    }

    const data: any = {};
    if (input.frequencyType !== undefined) data.frequencyType = input.frequencyType as any;
    if (input.intervalDays !== undefined) data.intervalDays = input.intervalDays;
    if (input.daysOfWeek !== undefined) data.daysOfWeek = input.daysOfWeek;
    if (input.timeOfDayCategory !== undefined) data.timeOfDayCategory = input.timeOfDayCategory as any;
    if (input.scheduledTime !== undefined) data.scheduledTime = input.scheduledTime;
    if (input.mealRelation !== undefined) data.mealRelation = input.mealRelation as any;
    if (input.doseQuantity !== undefined) data.doseQuantity = input.doseQuantity;
    if (input.gracePeriodMinutes !== undefined) data.gracePeriodMinutes = input.gracePeriodMinutes;
    if (input.reminderLeadMinutes !== undefined) data.reminderLeadMinutes = input.reminderLeadMinutes;
    if (input.startDate !== undefined) data.startDate = input.startDate ? new Date(input.startDate) : null;
    if (input.endDate !== undefined) data.endDate = input.endDate ? new Date(input.endDate) : null;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const updated = await prisma.$transaction(async (tx) => {
      const sched = await tx.medicationSchedule.update({
        where: { id: scheduleId },
        data,
      });

      // If timing, frequency, or active status changed, remove future pending doses so they regenerate
      if (
        input.scheduledTime !== undefined ||
        input.daysOfWeek !== undefined ||
        input.frequencyType !== undefined ||
        input.intervalDays !== undefined ||
        input.isActive === false
      ) {
        await tx.doseOccurrence.deleteMany({
          where: {
            scheduleId,
            scheduledForUtc: { gte: new Date() },
            status: "PENDING",
          },
        });
      }

      return sched;
    });

    // Regenerate future occurrences if schedule is active
    if (updated.isActive) {
      const horizonEndDate = new Date();
      horizonEndDate.setDate(horizonEndDate.getDate() + 30);
      await AdherenceService.generateOccurrencesForWindow(patientId, new Date(), horizonEndDate);
    }

    await AuditService.log({
      patientId,
      actorUserId,
      action: "SCHEDULE_UPDATED",
      resourceType: "medication_schedule",
      resourceId: scheduleId,
      previousState: existing,
      newState: updated,
    });

    return updated;
  }

  /**
   * Deactivates a schedule (preserving all historical dose records).
   */
  static async deleteSchedule(
    scheduleId: string,
    medicationId: string,
    patientId: string,
    actorUserId: string
  ) {
    const existing = await prisma.medicationSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing || existing.medicationId !== medicationId || existing.patientId !== patientId) {
      throw new AppError("Medication schedule not found.", 404, ErrorCode.NOT_FOUND);
    }

    await prisma.$transaction(async (tx) => {
      await tx.medicationSchedule.update({
        where: { id: scheduleId },
        data: { isActive: false },
      });

      // Clean up future unconfirmed pending doses
      await tx.doseOccurrence.deleteMany({
        where: {
          scheduleId,
          scheduledForUtc: { gte: new Date() },
          status: "PENDING",
        },
      });
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "SCHEDULE_DEACTIVATED",
      resourceType: "medication_schedule",
      resourceId: scheduleId,
    });

    return { message: "Medication schedule deactivated successfully." };
  }

  /**
   * Updates medication stock inventory (refills or manual corrections).
   */
  static async updateMedicationStock(
    medicationId: string,
    patientId: string,
    input: UpdateMedicationStockInput,
    actorUserId: string
  ) {
    const stock = await prisma.medicationStock.findUnique({
      where: { medicationId },
    });

    if (!stock || stock.patientId !== patientId) {
      throw new AppError("Medication stock record not found.", 404, ErrorCode.NOT_FOUND);
    }

    const newQuantity = stock.currentQuantity + input.quantityChange;
    if (newQuantity < 0) {
      throw new AppError("Resulting stock quantity cannot be negative.", 400, ErrorCode.VALIDATION_ERROR);
    }

    const updated = await prisma.medicationStock.update({
      where: { medicationId },
      data: {
        currentQuantity: newQuantity,
        ...(input.newPackageSize && { packageSize: input.newPackageSize }),
        ...(input.refillThreshold && { refillThreshold: input.refillThreshold }),
        ...(input.reason === "REFILL" && { lastRefillDate: new Date() }),
      },
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "STOCK_UPDATED",
      resourceType: "medication_stock",
      resourceId: stock.id,
      previousState: { currentQuantity: stock.currentQuantity },
      newState: { currentQuantity: newQuantity, reason: input.reason },
    });

    return updated;
  }

  /**
   * Discontinues a medication and cancels all future pending dose occurrences.
   * Preserves all historical doses and adherence events.
   */
  static async discontinueMedication(
    medicationId: string,
    patientId: string,
    reason: string,
    actorUserId: string
  ) {
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
    });

    if (!medication || medication.patientId !== patientId) {
      throw new AppError("Medication not found.", 404, ErrorCode.MEDICATION_NOT_FOUND);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Deactivate medication
      const med = await tx.medication.update({
        where: { id: medicationId },
        data: {
          isActive: false,
          discontinuedReason: reason,
          endDate: new Date(),
        },
      });

      // 2. Deactivate schedules
      await tx.medicationSchedule.updateMany({
        where: { medicationId },
        data: { isActive: false },
      });

      // 3. Remove future pending doses (historical ones are preserved!)
      await tx.doseOccurrence.deleteMany({
        where: {
          medicationId,
          scheduledForUtc: { gte: new Date() },
          status: "PENDING",
        },
      });

      return med;
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "MEDICATION_DISCONTINUED",
      resourceType: "medication",
      resourceId: medicationId,
      newState: { discontinuedReason: reason },
    });

    return result;
  }
}
