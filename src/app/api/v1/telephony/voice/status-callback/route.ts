import { NextRequest, NextResponse } from "next/server";
import { TelephonyService } from "@/modules/telephony/telephony.service";
import { WebhookVerifier } from "@/core/security/webhook-verifier";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  let callSid = "";
  let callStatus = "";
  let duration = "";
  let bodyParams: Record<string, any> = {};

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    callSid = formData.get("CallSid")?.toString() || "";
    callStatus = formData.get("CallStatus")?.toString() || "";
    duration = formData.get("CallDuration")?.toString() || "";
    formData.forEach((value, key) => {
      bodyParams[key] = value.toString();
    });
  } else {
    const json = await request.json().catch(() => ({}));
    callSid = json.CallSid || json.callSid || "";
    callStatus = json.CallStatus || json.callStatus || "";
    duration = json.CallDuration || json.callDuration || "";
    bodyParams = json;
  }

  const twilioSignature = request.headers.get("x-twilio-signature");
  WebhookVerifier.verifyTwilioSignature(twilioSignature, request.url, bodyParams);

  if (callSid && callStatus) {
    await TelephonyService.processStatusCallback(callSid, callStatus, duration);
  }

  return NextResponse.json({ success: true, processed: true });
}
