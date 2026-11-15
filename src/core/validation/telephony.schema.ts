import { z } from "zod";

export const TwilioVoiceReminderQuerySchema = z.object({
  doseId: z.string().uuid("Invalid dose occurrence ID"),
  patientId: z.string().uuid("Invalid patient ID"),
});

export const TwilioKeypadInputSchema = z.object({
  Digits: z.string().min(1, "Digits is required"),
  CallSid: z.string().min(1, "CallSid is required"),
  From: z.string().optional(),
  To: z.string().optional(),
});

export const TwilioStatusCallbackSchema = z.object({
  CallSid: z.string().min(1, "CallSid is required"),
  CallStatus: z.string().min(1, "CallStatus is required"),
  CallDuration: z.string().optional(),
});

export type TwilioVoiceReminderQueryInput = z.infer<typeof TwilioVoiceReminderQuerySchema>;
export type TwilioKeypadInput = z.infer<typeof TwilioKeypadInputSchema>;
export type TwilioStatusCallbackInput = z.infer<typeof TwilioStatusCallbackSchema>;
