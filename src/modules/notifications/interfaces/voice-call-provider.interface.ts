export interface InitiateCallPayload {
  toPhone: string;
  fromPhone?: string;
  voiceUrl: string;
  statusCallbackUrl: string;
  patientId: string;
  doseId?: string;
}

export interface VoiceCallResult {
  isSuccessful: boolean;
  provider: string;
  callSid?: string;
  status?: string;
  errorMessage?: string;
}

export interface IVoiceCallProvider {
  initiateCall(payload: InitiateCallPayload): Promise<VoiceCallResult>;
}
