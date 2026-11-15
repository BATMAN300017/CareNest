import twilio from "twilio";
import { config } from "../../../core/config/env";
import { IVoiceCallProvider, InitiateCallPayload, VoiceCallResult } from "../interfaces/voice-call-provider.interface";

export class TwilioVoiceProvider implements IVoiceCallProvider {
  private client: twilio.Twilio | null = null;

  constructor() {
    if (config.twilio.isConfigured()) {
      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    }
  }

  async initiateCall(payload: InitiateCallPayload): Promise<VoiceCallResult> {
    if (!this.client) {
      const mockCallSid = `CA_mock_${Date.now()}`;
      return {
        isSuccessful: true,
        provider: "TWILIO_VOICE_MOCK",
        callSid: mockCallSid,
        status: "queued",
      };
    }

    try {
      const call = await this.client.calls.create({
        to: payload.toPhone,
        from: payload.fromPhone || config.twilio.phoneNumber,
        url: payload.voiceUrl,
        statusCallback: payload.statusCallbackUrl,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST",
      });

      return {
        isSuccessful: true,
        provider: "TWILIO_VOICE",
        callSid: call.sid,
        status: call.status,
      };
    } catch (err: any) {
      return {
        isSuccessful: false,
        provider: "TWILIO_VOICE",
        errorMessage: err.message,
      };
    }
  }
}
