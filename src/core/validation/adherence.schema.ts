import { z } from "zod";

export const ConfirmDoseSchema = z.object({
  confirmationChannel: z.enum([
    "DASHBOARD_UI",
    "VOICE_ASSISTANT_WEB",
    "TELEPHONE_DTMF",
    "TELEPHONE_SPEECH",
    "CAREGIVER_MANUAL",
  ]).default("DASHBOARD_UI"),
  intakeMealContext: z.string().optional(),
  symptomsOrNotes: z.string().optional(),
  telephonyCallSid: z.string().optional(),
});

export const SnoozeDoseSchema = z.object({
  snoozeMinutes: z.number().int().min(5).max(120).default(15),
  reason: z.string().optional(),
});

export const SkipDoseSchema = z.object({
  reason: z.string().min(3, "Reason for skipping medication is required"),
  authorizedByCaregiverId: z.string().uuid().optional(),
});

export const RecordMissedDoseSchema = z.object({
  reason: z.string().optional(),
});

export const AdherenceReportQuerySchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start date format (YYYY-MM-DD)",
  }).optional(),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end date format (YYYY-MM-DD)",
  }).optional(),
  medicationId: z.string().uuid().optional(),
});

export type ConfirmDoseInput = z.infer<typeof ConfirmDoseSchema>;
export type SnoozeDoseInput = z.infer<typeof SnoozeDoseSchema>;
export type SkipDoseInput = z.infer<typeof SkipDoseSchema>;
export type RecordMissedDoseInput = z.infer<typeof RecordMissedDoseSchema>;
export type AdherenceReportQueryInput = z.infer<typeof AdherenceReportQuerySchema>;
