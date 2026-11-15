import { NextRequest, NextResponse } from "next/server";
import { TelephonyService } from "@/modules/telephony/telephony.service";
import { WebhookVerifier } from "@/core/security/webhook-verifier";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  // Parse body (supports both application/x-www-form-urlencoded from Twilio and application/json)
  let digits = "";
  let callSid = "";
  let bodyParams: Record<string, any> = {};

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    digits = formData.get("Digits")?.toString() || "";
    callSid = formData.get("CallSid")?.toString() || "";
    formData.forEach((value, key) => {
      bodyParams[key] = value.toString();
    });
  } else {
    const json = await request.json().catch(() => ({}));
    digits = json.Digits || json.digits || "";
    callSid = json.CallSid || json.callSid || "";
    bodyParams = json;
  }

  const twilioSignature = request.headers.get("x-twilio-signature");
  WebhookVerifier.verifyTwilioSignature(twilioSignature, request.url, bodyParams);

  const twiml = await TelephonyService.processKeypadInput(patientId, doseId, callSid, digits);

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
