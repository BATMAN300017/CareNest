import { prisma } from "../../core/database/prisma";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import { CreateMedicationInput, UpdateMedicationStockInput } from "../../core/validation/medication.schema";
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
          prescribingDoctorId: input.prescribingDoctorId || null,
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
   * Lists all active medications for a patient.
   */
  static async getPatientMedications(patientId: string) {
    return prisma.medication.findMany({
      where: { patientId, isActive: true },
      include: {
        schedules: { where: { isActive: true } },
        stock: true,
        prescribingDoctor: {
          select: { fullName: true, specialty: true, clinicName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
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

      // 3. Remove/Cancel future pending doses
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
