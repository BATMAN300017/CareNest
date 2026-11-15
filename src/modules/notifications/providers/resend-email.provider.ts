import { Resend } from "resend";
import { config } from "../../../core/config/env";
import { IEmailProvider, SendEmailPayload, EmailResult } from "../interfaces/email-provider.interface";

export class ResendEmailProvider implements IEmailProvider {
  private client: Resend | null = null;

  constructor() {
    if (config.resend.isConfigured()) {
      this.client = new Resend(config.resend.apiKey);
    }
  }

  async sendEmail(payload: SendEmailPayload): Promise<EmailResult> {
    if (!this.client) {
      const mockId = `email_mock_${Date.now()}`;
      return {
        isSuccessful: true,
        provider: "RESEND_MOCK",
        emailId: mockId,
      };
    }

    try {
      const response = await this.client.emails.send({
        from: payload.fromEmail || config.resend.fromEmail,
        to: payload.toEmail,
        subject: payload.subject,
        html: payload.htmlBody,
        text: payload.textBody,
      });

      if (response.error) {
        return {
          isSuccessful: false,
          provider: "RESEND",
          errorMessage: response.error.message,
        };
      }

      return {
        isSuccessful: true,
        provider: "RESEND",
        emailId: response.data?.id,
      };
    } catch (err: any) {
      return {
        isSuccessful: false,
        provider: "RESEND",
        errorMessage: err.message,
      };
    }
  }
}
