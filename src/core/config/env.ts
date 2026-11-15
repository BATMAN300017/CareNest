export const config = {
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    env: process.env.NODE_ENV || "development",
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || "+15550001234",
    webhookBaseUrl: process.env.TWILIO_WEBHOOK_URL || (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    isConfigured: () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || "",
    fromEmail: process.env.RESEND_FROM_EMAIL || "CareNest Reminders <reminders@carenest.org>",
    isConfigured: () => Boolean(process.env.RESEND_API_KEY),
  },
};
