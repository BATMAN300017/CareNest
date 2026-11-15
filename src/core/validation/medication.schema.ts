import { z } from "zod";

export const CreateMedicationScheduleSchema = z.object({
  frequencyType: z.enum(["DAILY", "INTERVAL_DAYS", "SPECIFIC_WEEKDAYS", "PRN_AS_NEEDED"]),
  intervalDays: z.number().int().min(1).default(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  timeOfDayCategory: z.enum(["MORNING", "AFTERNOON", "EVENING", "NIGHT"]),
  scheduledTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Scheduled time must be in HH:mm format (e.g. 08:00, 13:00)"),
  mealRelation: z.enum(["BEFORE_MEAL", "WITH_MEAL", "AFTER_MEAL", "EMPTY_STOMACH", "NO_RESTRICTION"]).default("NO_RESTRICTION"),
  doseQuantity: z.number().positive().default(1.0),
  gracePeriodMinutes: z.number().int().min(15).max(240).default(60),
  reminderLeadMinutes: z.number().int().min(0).max(60).default(15),
});

export const CreateMedicationSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  genericName: z.string().min(1, "Generic name is required"),
  rxNormCode: z.string().optional(),
  dosageForm: z.enum(["TABLET", "CAPSULE", "LIQUID", "INHALER", "INJECTION", "PATCH", "DROPS"]),
  strength: z.string().min(1, "Strength is required (e.g. 500mg, 10mg)"),
  route: z.string().default("ORAL"),
  instructions: z.string().min(1, "Instructions are required"),
  pillAppearance: z.string().min(1, "Pill appearance description is required (e.g. White Oval M 500)"),
  pillColor: z.string().optional(),
  pillShape: z.string().optional(),
  indication: z.string().optional(),
  prescribingDoctorId: z.string().uuid().optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start date format (YYYY-MM-DD)",
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end date format (YYYY-MM-DD)",
  }).optional().nullable(),
  initialStockQuantity: z.number().int().nonnegative().default(30),
  refillThreshold: z.number().int().positive().default(7),
  pharmacyName: z.string().optional(),
  pharmacyPhone: z.string().optional(),
  rxNumber: z.string().optional(),
  schedules: z.array(CreateMedicationScheduleSchema).min(1, "At least one intake schedule is required"),
});

export const UpdateMedicationStockSchema = z.object({
  quantityChange: z.number().int(),
  reason: z.enum(["REFILL", "INVENTORY_CORRECTION", "DAMAGE_DISCARD"]),
  newPackageSize: z.number().int().positive().optional(),
  refillThreshold: z.number().int().positive().optional(),
});

export type CreateMedicationInput = z.infer<typeof CreateMedicationSchema>;
export type CreateMedicationScheduleInput = z.infer<typeof CreateMedicationScheduleSchema>;
export type UpdateMedicationStockInput = z.infer<typeof UpdateMedicationStockSchema>;
