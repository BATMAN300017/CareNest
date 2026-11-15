import { ISmsProvider, SendSmsPayload, SmsResult } from "../interfaces/sms-provider.interface";
import { IVoiceCallProvider, InitiateCallPayload, VoiceCallResult } from "../interfaces/voice-call-provider.interface";
import { IEmailProvider, SendEmailPayload, EmailResult } from "../interfaces/email-provider.interface";

export class MockSmsProvider implements ISmsProvider {
  public sentMessages: SendSmsPayload[] = [];

  async sendSms(payload: SendSmsPayload): Promise<SmsResult> {
    this.sentMessages.push(payload);
    return {
      isSuccessful: true,
      provider: "MOCK_SMS",
      messageSid: `SM_test_${Date.now()}`,
    };
  }
}

export class MockVoiceProvider implements IVoiceCallProvider {
  public initiatedCalls: InitiateCallPayload[] = [];

  async initiateCall(payload: InitiateCallPayload): Promise<VoiceCallResult> {
    this.initiatedCalls.push(payload);
    return {
      isSuccessful: true,
      provider: "MOCK_VOICE",
      callSid: `CA_test_${Date.now()}`,
      status: "queued",
    };
  }
}

export class MockEmailProvider implements IEmailProvider {
  public sentEmails: SendEmailPayload[] = [];

  async sendEmail(payload: SendEmailPayload): Promise<EmailResult> {
    this.sentEmails.push(payload);
    return {
      isSuccessful: true,
      provider: "MOCK_EMAIL",
      emailId: `email_test_${Date.now()}`,
    };
  }
}
