import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as authGuard from "../../src/core/middleware/auth-guard";
import * as consentGuard from "../../src/core/middleware/consent-guard";
import { TelephonyService } from "../../src/modules/telephony/telephony.service";
import { NotificationService } from "../../src/modules/notifications/notification.service";
import { PreferencesService } from "../../src/modules/notifications/preferences.service";
import { WebhookVerifier } from "../../src/core/security/webhook-verifier";

// Route handlers
import { POST as voiceRemindHandler } from "../../src/app/api/v1/telephony/voice/remind/route";
import { POST as handleKeypadHandler } from "../../src/app/api/v1/telephony/voice/handle-keypad/route";
import { POST as statusCallbackHandler } from "../../src/app/api/v1/telephony/voice/status-callback/route";
import { GET as getNotificationsHandler } from "../../src/app/api/v1/patients/[patientId]/notifications/route";
import { PATCH as markNotificationReadHandler } from "../../src/app/api/v1/patients/[patientId]/notifications/[notificationId]/read/route";
import {
  GET as getPreferencesHandler,
  PATCH as updatePreferencesHandler,
} from "../../src/app/api/v1/patients/[patientId]/notification-preferences/route";

describe("Telephony & Notification API Route Handlers Integration", () => {
  const patientId = "pat_margaret_101";
  const doseId = "dose_metformin_101";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authGuard, "authenticateRequest").mockResolvedValue({
      sub: "usr_sarah_admin",
      role: "FAMILY_ADMIN",
      type: "access",
    } as any);

    vi.spyOn(consentGuard, "verifyPatientAccess").mockResolvedValue({
      patientId,
      isPatientThemselves: false,
      circleRole: "FAMILY_ADMIN",
      permissions: {
        canManageMedications: true,
        canViewRecords: true,
      },
    } as any);

    vi.spyOn(WebhookVerifier, "verifyTwilioSignature").mockReturnValue(true);
  });

  it("should return TwiML XML on POST /api/v1/telephony/voice/remind", async () => {
    vi.spyOn(TelephonyService, "handleVoiceReminderPrompt").mockResolvedValue(
      "<Response><Say>Hello Margaret</Say></Response>"
    );

    const req = new NextRequest(
      `http://localhost:3000/api/v1/telephony/voice/remind?doseId=${doseId}&patientId=${patientId}`,
      { method: "POST" }
    );

    const res = await voiceRemindHandler(req);
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/xml");
    expect(xml).toContain("<Response><Say>Hello Margaret</Say></Response>");
  });

  it("should process DTMF keypad response on POST /api/v1/telephony/voice/handle-keypad", async () => {
    vi.spyOn(TelephonyService, "processKeypadInput").mockResolvedValue(
      "<Response><Say>Dose confirmed!</Say><Hangup/></Response>"
    );

    const req = new NextRequest(
      `http://localhost:3000/api/v1/telephony/voice/handle-keypad?doseId=${doseId}&patientId=${patientId}`,
      {
        method: "POST",
        body: JSON.stringify({ Digits: "1", CallSid: "CA_test_123" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const res = await handleKeypadHandler(req);
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/xml");
    expect(xml).toContain("<Say>Dose confirmed!</Say>");
    expect(TelephonyService.processKeypadInput).toHaveBeenCalledWith(
      patientId,
      doseId,
      "CA_test_123",
      "1"
    );
  });

  it("should handle Twilio call status callbacks on POST /api/v1/telephony/voice/status-callback", async () => {
    vi.spyOn(TelephonyService, "processStatusCallback").mockResolvedValue({ found: true } as any);

    const req = new NextRequest(
      "http://localhost:3000/api/v1/telephony/voice/status-callback",
      {
        method: "POST",
        body: JSON.stringify({ CallSid: "CA_test_123", CallStatus: "completed", CallDuration: "45" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const res = await statusCallbackHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.processed).toBe(true);
    expect(TelephonyService.processStatusCallback).toHaveBeenCalledWith("CA_test_123", "completed", "45");
  });

  it("should retrieve patient notifications list on GET /api/v1/patients/:id/notifications", async () => {
    vi.spyOn(NotificationService, "getPatientNotifications").mockResolvedValue([
      { id: "notif_1", channel: "SMS", title: "Time for Meds", status: "DELIVERED" },
    ] as any);

    const req = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/notifications?status=DELIVERED`,
      { headers: { Authorization: "Bearer token" } }
    );

    const res = await getNotificationsHandler(req, { params: { patientId } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].status).toBe("DELIVERED");
  });

  it("should mark in-app notification read on PATCH /api/v1/patients/:id/notifications/:id/read", async () => {
    vi.spyOn(NotificationService, "markAsRead").mockResolvedValue({
      id: "notif_1",
      readAtUtc: new Date(),
    } as any);

    const req = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/notifications/notif_1/read`,
      { method: "PATCH", headers: { Authorization: "Bearer token" } }
    );

    const res = await markNotificationReadHandler(req, {
      params: { patientId, notificationId: "notif_1" },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("should get and update notification preferences via GET/PATCH /api/v1/patients/:id/notification-preferences", async () => {
    vi.spyOn(PreferencesService, "getPreferences").mockResolvedValue({
      id: patientId,
      voiceRemindersEnabled: true,
      smsRemindersEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    } as any);

    vi.spyOn(PreferencesService, "updatePreferences").mockResolvedValue({
      id: patientId,
      voiceRemindersEnabled: false,
      smsRemindersEnabled: true,
    } as any);

    // GET preferences
    const getReq = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/notification-preferences`,
      { headers: { Authorization: "Bearer token" } }
    );
    const getRes = await getPreferencesHandler(getReq, { params: { patientId } });
    const getJson = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getJson.data.voiceRemindersEnabled).toBe(true);

    // PATCH preferences
    const patchReq = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/notification-preferences`,
      {
        method: "PATCH",
        body: JSON.stringify({ voiceRemindersEnabled: false }),
        headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
      }
    );
    const patchRes = await updatePreferencesHandler(patchReq, { params: { patientId } });
    const patchJson = await patchRes.json();
    expect(patchRes.status).toBe(200);
    expect(patchJson.data.voiceRemindersEnabled).toBe(false);
  });
});
