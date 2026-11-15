export interface SendEmailPayload {
  toEmail: string;
  fromEmail?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface EmailResult {
  isSuccessful: boolean;
  provider: string;
  emailId?: string;
  errorMessage?: string;
}

export interface IEmailProvider {
  sendEmail(payload: SendEmailPayload): Promise<EmailResult>;
}
