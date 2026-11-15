export interface SendSmsPayload {
  toPhone: string;
  fromPhone?: string;
  body: string;
}

export interface SmsResult {
  isSuccessful: boolean;
  provider: string;
  messageSid?: string;
  errorMessage?: string;
}

export interface ISmsProvider {
  sendSms(payload: SendSmsPayload): Promise<SmsResult>;
}
