import { z } from "zod";

export const RecordHealthVitalSchema = z.object({
  vitalType: z.enum([
    "BLOOD_PRESSURE",
    "BLOOD_GLUCOSE",
    "HEART_RATE",
    "SPO2",
    "TEMPERATURE",
    "WEIGHT",
    "HYDRATION",
  ]),
  recordedAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid ISO timestamp format",
  }).optional(),
  numericValuePrimary: z.number().positive("Primary reading must be a positive number"),
  numericValueSecondary: z.number().positive("Secondary reading must be a positive number").optional(),
  unit: z.string().min(1, "Unit is required (e.g. mmHg, mg/dL, bpm, %, °F, glasses)"),
  readingContext: z.enum([
    "FASTING",
    "POST_PRANDIAL",
    "RESTING",
    "POST_EXERCISE",
    "BEFORE_BED",
    "GENERAL",
  ]).default("GENERAL"),
  sourceDevice: z.string().default("Manual Input"),
});

export const LogHydrationGlassSchema = z.object({
  glassesCount: z.number().int().positive().default(1),
  readingContext: z.string().optional(),
});

export const RecordSymptomSchema = z.object({
  symptomName: z.string().min(2, "Symptom name is required"),
  severity: z.enum(["MILD", "MODERATE", "SEVERE", "CRITICAL"]).default("MILD"),
  notes: z.string().optional(),
});

export type RecordHealthVitalInput = z.infer<typeof RecordHealthVitalSchema>;
export type LogHydrationGlassInput = z.infer<typeof LogHydrationGlassSchema>;
export type RecordSymptomInput = z.infer<typeof RecordSymptomSchema>;
