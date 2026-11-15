import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { AppError, ErrorCode } from "../../src/core/errors/app-error";
import { POST as registerHandler } from "../../src/app/api/v1/auth/register/route";
import { POST as loginHandler } from "../../src/app/api/v1/auth/login/route";
import { POST as tabletUnlockHandler } from "../../src/app/api/v1/auth/tablet-unlock/route";
import { GET as dashboardHandler } from "../../src/app/api/v1/patients/[patientId]/dashboard/route";
import { POST as confirmDoseHandler } from "../../src/app/api/v1/patients/[patientId]/doses/[doseId]/confirm/route";
import { AuthService } from "../../src/modules/auth/auth.service";
import { PatientService } from "../../src/modules/patients/patient.service";
import { AdherenceService } from "../../src/modules/adherence/adherence.service";
import * as authGuard from "../../src/core/middleware/auth-guard";
import * as consentGuard from "../../src/core/middleware/consent-guard";

describe("API Route Handlers: HTTP Contracts & Envelopes", () => {
  it("should return 200 with standard success envelope on successful user registration", async () => {
    vi.spyOn(AuthService, "registerUser").mockResolvedValue({
      user: {
        id: "usr_100",
        email: "sarah@example.com",
        phoneNumber: "+15551234567",
        fullName: "Sarah Jenkins",
        systemRole: "FAMILY_ADMIN",
        isActive: true,
        createdAt: new Date(),
      },
      token: "mock_jwt_access_token",
      refreshToken: "mock_jwt_refresh_token",
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        phoneNumber: "+15551234567",
        email: "sarah@example.com",
        password: "SecurePassword123!",
        fullName: "Sarah Jenkins",
        systemRole: "FAMILY_ADMIN",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await registerHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.user.fullName).toBe("Sarah Jenkins");
    expect(json.data.token).toBe("mock_jwt_access_token");
    expect(json.meta.timestamp).toBeDefined();
  });

  it("should return 400 validation error envelope when input schema fails", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        phoneNumber: "invalid",
        password: "123",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await registerHandler(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(json.error.details)).toBe(true);
  });

  it("should return patient dashboard payload when authorized", async () => {
    vi.spyOn(authGuard, "authenticateRequest").mockResolvedValue({
      sub: "usr_sarah",
      role: "FAMILY_ADMIN",
      type: "access",
    } as any);

    vi.spyOn(consentGuard, "verifyPatientAccess").mockResolvedValue({
      patientId: "pat_1",
      isPatientThemselves: false,
    } as any);

    vi.spyOn(PatientService, "getPatientDashboard").mockResolvedValue({
      patient: { id: "pat_1", fullName: "Margaret Jenkins" },
      progress: { completedDoses: 3, totalDoses: 5, percent: 60 },
      caretakerSync: { connectedNames: ["Sarah"], lastCheckedInMinutesAgo: 3 },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/patients/pat_1/dashboard", {
      headers: { Authorization: "Bearer mock_valid_token" },
    });

    const res = await dashboardHandler(req, { params: { patientId: "pat_1" } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.progress.completedDoses).toBe(3);
  });

  it("should return 403 when access is denied by consent guard", async () => {
    vi.spyOn(authGuard, "authenticateRequest").mockResolvedValue({
      sub: "usr_unauthorized",
      role: "FAMILY_MEMBER",
      type: "access",
    } as any);

    vi.spyOn(consentGuard, "verifyPatientAccess").mockRejectedValue(
      new AppError(
        "You are not an active member of this patient's Care Circle.",
        403,
        ErrorCode.PATIENT_ACCESS_DENIED
      )
    );

    const req = new NextRequest("http://localhost:3000/api/v1/patients/pat_1/dashboard", {
      headers: { Authorization: "Bearer mock_valid_token" },
    });

    const res = await dashboardHandler(req, { params: { patientId: "pat_1" } });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ErrorCode.PATIENT_ACCESS_DENIED);
  });

  it("should handle dose confirmation via POST /doses/:doseId/confirm", async () => {
    vi.spyOn(authGuard, "authenticateRequest").mockResolvedValue({
      sub: "usr_senior",
      role: "PATIENT",
      type: "access",
    } as any);

    vi.spyOn(consentGuard, "verifyPatientAccess").mockResolvedValue({
      patientId: "pat_1",
      isPatientThemselves: true,
    } as any);

    vi.spyOn(AdherenceService, "confirmDose").mockResolvedValue({
      doseOccurrenceId: "dose_1",
      status: "TAKEN",
      confirmedAt: new Date(),
      stockRemaining: 29,
      adherenceStreakDays: 14,
    } as any);

    const req = new NextRequest(
      "http://localhost:3000/api/v1/patients/pat_1/doses/dose_1/confirm",
      {
        method: "POST",
        body: JSON.stringify({
          confirmationChannel: "DASHBOARD_UI",
          intakeMealContext: "With warm lunch",
        }),
        headers: {
          Authorization: "Bearer mock_valid_token",
          "Content-Type": "application/json",
        },
      }
    );

    const res = await confirmDoseHandler(req, {
      params: { patientId: "pat_1", doseId: "dose_1" },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("TAKEN");
    expect(json.data.adherenceStreakDays).toBe(14);
  });
});
