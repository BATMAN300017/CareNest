export enum QueueName {
  SCHEDULE_OCCURRENCES = "carenest-schedule-occurrences",
  REMINDER_DISPATCH = "carenest-reminder-dispatch",
  MISSED_DOSE_ESCALATION = "carenest-missed-dose-escalation",
  NOTIFICATION_DELIVERY = "carenest-notification-delivery",
}

export interface GenerateOccurrencesJobPayload {
  patientId?: string; // Optional: specific patient or all active patients
  daysAhead: number;
}

export interface ReminderJobPayload {
  doseOccurrenceId: string;
  patientId: string;
  reminderType: "UPCOMING" | "DUE_NOW" | "SNOOZE_EXPIRED";
  leadMinutes: number;
}

export interface EscalationJobPayload {
  doseOccurrenceId: string;
  patientId: string;
  targetTier: number; // 1 = Senior Call, 2 = Primary Caregiver SMS, 3 = Full Care Circle
}

export interface NotificationDeliveryJobPayload {
  notificationId: string;
  channel: "IN_APP" | "EMAIL" | "SMS" | "TELEPHONE_CALL";
  recipientId: string;
}
