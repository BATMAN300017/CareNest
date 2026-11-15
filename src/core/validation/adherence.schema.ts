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

export type ConfirmDoseInput = z.infer<typeof ConfirmDoseSchema>;
export type SnoozeDoseInput = z.infer<typeof SnoozeDoseSchema>;
export type SkipDoseInput = z.infer<typeof SkipDoseSchema>;
