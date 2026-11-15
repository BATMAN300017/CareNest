import twilio from "twilio";
import { config } from "../config/env";
import { AppError, ErrorCode } from "../errors/app-error";

export class WebhookVerifier {
  /**
   * Validates Twilio webhook authenticity using the HMAC-SHA1 signature.
   * Prevents webhook spoofing and unauthorized status/response tampering.
   */
  static verifyTwilioSignature(
    signature: string | null,
    requestUrl: string,
    params: Record<string, any>
  ): boolean {
    // In test environment or when Twilio is unconfigured in development, permit test bypass
    if (process.env.NODE_ENV === "test" || !config.twilio.isConfigured()) {
      return true;
    }

    if (!signature) {
      throw new AppError("Missing Twilio signature header (X-Twilio-Signature).", 401, ErrorCode.UNAUTHORIZED);
    }

    const isValid = twilio.validateRequest(
      config.twilio.authToken,
      signature,
      requestUrl,
      params
    );

    if (!isValid) {
      throw new AppError("Invalid Twilio signature verification failed.", 403, ErrorCode.PERMISSION_DENIED);
    }

    return true;
  }
}
