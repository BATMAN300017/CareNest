import twilio from "twilio";
import { config } from "../../../core/config/env";
import { ISmsProvider, SendSmsPayload, SmsResult } from "../interfaces/sms-provider.interface";

export class TwilioSmsProvider implements ISmsProvider {
  private client: twilio.Twilio | null = null;

  constructor() {
    if (config.twilio.isConfigured()) {
      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    }
  }

  async sendSms(payload: SendSmsPayload): Promise<SmsResult> {
    if (!this.client) {
      // Graceful fallback for local development and testing
      const mockSid = `SM_mock_${Date.now()}`;
      return {
        isSuccessful: true,
        provider: "TWILIO_MOCK",
        messageSid: mockSid,
      };
    }

    try {
      const message = await this.client.messages.create({
        to: payload.toPhone,
        from: payload.fromPhone || config.twilio.phoneNumber,
        body: payload.body,
      });

      return {
        isSuccessful: true,
        provider: "TWILIO",
        messageSid: message.sid,
      };
    } catch (err: any) {
      return {
        isSuccessful: false,
        provider: "TWILIO",
        errorMessage: err.message,
      };
    }
  }
}
