import { z } from "zod";

export const UpdateNotificationPreferencesSchema = z.object({
  voiceRemindersEnabled: z.boolean().optional(),
  smsRemindersEnabled: z.boolean().optional(),
  emailRemindersEnabled: z.boolean().optional(),
  voiceSpeed: z.enum(["NORMAL", "SLOW"]).optional(),
  maxCallAttempts: z.number().int().min(1).max(5).optional(),
  callRetryIntervalMinutes: z.number().int().min(5).max(60).optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format must be HH:mm").optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format must be HH:mm").optional(),
  preferredLanguage: z.string().min(2).max(10).optional(),
  caregiverEscalationEnabled: z.boolean().optional(),
  appointmentRemindersEnabled: z.boolean().optional(),
});

export const NotificationFilterSchema = z.object({
  status: z.enum(["QUEUED", "DISPATCHED", "DELIVERED", "FAILED", "CANCELLED"]).optional(),
  channel: z.enum(["IN_APP", "EMAIL", "SMS", "TELEPHONE_CALL"]).optional(),
  eventType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type UpdateNotificationPreferencesInput = z.infer<typeof UpdateNotificationPreferencesSchema>;
export type NotificationFilterInput = z.infer<typeof NotificationFilterSchema>;
