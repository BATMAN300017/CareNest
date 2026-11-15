export interface NotificationPayload {
  patientId: string;
  recipientUserId: string;
  channel: "IN_APP" | "EMAIL" | "SMS" | "TELEPHONE_CALL";
  title: string;
  body: string;
  referenceId?: string;
  scheduledForUtc?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  isSuccessful: boolean;
  provider: string;
  providerMessageId?: string;
  errorMessage?: string;
  rawResponse?: any;
}
