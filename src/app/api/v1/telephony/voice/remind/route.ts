import { NextRequest, NextResponse } from "next/server";
import { TelephonyService } from "@/modules/telephony/telephony.service";
import { WebhookVerifier } from "@/core/security/webhook-verifier";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const doseId = searchParams.get("doseId");
  const patientId = searchParams.get("patientId");

  if (!doseId || !patientId) {
    return new NextResponse("<Response><Say>Invalid parameters</Say><Hangup/></Response>", {
      status: 400,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const twilioSignature = request.headers.get("x-twilio-signature");
  WebhookVerifier.verifyTwilioSignature(twilioSignature, request.url, {});

  const twiml = await TelephonyService.handleVoiceReminderPrompt(patientId, doseId);

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
