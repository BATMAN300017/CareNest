import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as logoutHandler } from "../../src/app/api/v1/auth/logout/route";
import { POST as forgotPasswordHandler } from "../../src/app/api/v1/auth/forgot-password/route";
import { POST as resetPasswordHandler } from "../../src/app/api/v1/auth/reset-password/route";
import { GET as getProfileHandler, PATCH as updateProfileHandler } from "../../src/app/api/v1/users/me/route";
import { POST as changePasswordHandler } from "../../src/app/api/v1/users/me/change-password/route";
import { GET as getInvitesHandler } from "../../src/app/api/v1/patients/[patientId]/care-circle/invites/route";
import { POST as acceptInviteHandler } from "../../src/app/api/v1/care-circle/invites/[inviteCode]/accept/route";
import { POST as rejectInviteHandler } from "../../src/app/api/v1/care-circle/invites/[inviteCode]/reject/route";
import { GET as getConsentsHandler, POST as grantConsentHandler } from "../../src/app/api/v1/patients/[patientId]/consents/route";
import { AuthService } from "../../src/modules/auth/auth.service";
import { CareCircleService } from "../../src/modules/care-circle/care-circle.service";
import * as authGuard from "../../src/core/middleware/auth-guard";
import * as consentGuard from "../../src/core/middleware/consent-guard";

describe("Authentication & Access Management API Endpoints", () => {
  it("should handle user logout and session invalidation", async () => {
    vi.spyOn(authGuard, "authenticateRequest").mockResolvedValue({
      sub: "usr_100",
      role: "FAMILY_ADMIN",
      type: "access",
    } as any);

    vi.spyOn(AuthService, "logoutUser").mockResolvedValue({
      message: "Successfully logged out. Session invalidated.",
    });

    const req = new NextRequest("http://localhost:3000/api/v1/auth/logout", {
      method: "POST",
      headers: { Authorization: "Bearer token_to_invalidate" },
    });

    const res = await logoutHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.message).toContain("Successfully logged out");
  });

  it("should handle forgot-password request with anti-enumeration response", async () => {
    vi.spyOn(AuthService, "requestPasswordReset").mockResolvedValue({
      success: true,
      message: "If an account matches that email or phone number, recovery instructions have been sent.",
    });

    const req = new NextRequest("http://localhost:3000/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ identifier: "sarah@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await forgotPasswordHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.message).toContain("If an account matches");
  });

  it("should handle reset-password endpoint", async () => {
    vi.spyOn(AuthService, "resetPassword").mockResolvedValue({
      message: "Password has been successfully updated.",
    });

    const req = new NextRequest("http://localhost:3000/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token: "valid_recovery_token",
        newPassword: "BrandNewPassword123!",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await resetPasswordHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("should return own profile on GET /api/v1/users/me", async () => {
    vi.spyOn(authGuard, "authenticateRequest").mockResolvedValue({
      sub: "usr_sarah",
      role: "FAMILY_ADMIN",
      type: "access",
    } as any);

    vi.spyOn(AuthService, "getProfile").mockResolvedValue({
      id: "usr_sarah",
      email: "sarah@example.com",
      fullName: "Sarah Jenkins",
      systemRole: "FAMILY_ADMIN",
      isActive: true,
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/users/me", {
      headers: { Authorization: "Bearer valid_token" },
    });

    const res = await getProfileHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.fullName).toBe("Sarah Jenkins");
    expect(json.data.email).toBe("sarah@example.com");
  });

  it("should accept invitation via POST /api/v1/care-circle/invites/:code/accept", async () => {
    vi.spyOn(authGuard, "authenticateRequest").mockResolvedValue({
      sub: "usr_nurse",
      role: "CARETAKER",
      type: "access",
    } as any);

    vi.spyOn(CareCircleService, "joinCareCircle").mockResolvedValue({
      id: "mem_new",
      patientId: "pat_1",
      userId: "usr_nurse",
      circleRole: "NURSE",
      isActive: true,
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/care-circle/invites/CN-123456/accept", {
      method: "POST",
      headers: { Authorization: "Bearer valid_token" },
    });

    const res = await acceptInviteHandler(req, { params: { inviteCode: "CN-123456" } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.circleRole).toBe("NURSE");
  });

  it("should reject invitation via POST /api/v1/care-circle/invites/:code/reject", async () => {
    vi.spyOn(authGuard, "authenticateRequest").mockResolvedValue({
      sub: "usr_invitee",
      role: "FAMILY_MEMBER",
      type: "access",
    } as any);

    vi.spyOn(CareCircleService, "rejectInvite").mockResolvedValue({
      message: "Invitation declined successfully.",
    });

    const req = new NextRequest("http://localhost:3000/api/v1/care-circle/invites/CN-REJECT/reject", {
      method: "POST",
      headers: { Authorization: "Bearer valid_token" },
    });

    const res = await rejectInviteHandler(req, { params: { inviteCode: "CN-REJECT" } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.message).toContain("declined successfully");
  });

  it("should grant formal consent via POST /api/v1/patients/:id/consents", async () => {
    vi.spyOn(authGuard, "authenticateRequest").mockResolvedValue({
      sub: "usr_margaret",
      role: "PATIENT",
      type: "access",
    } as any);

    vi.spyOn(consentGuard, "verifyPatientAccess").mockResolvedValue({
      patientId: "pat_1",
      isPatientThemselves: true,
    } as any);

    vi.spyOn(CareCircleService, "grantConsent").mockResolvedValue({
      id: "consent_uuid",
      patientId: "pat_1",
      grantedToUserId: "a0000000-0000-0000-0000-000000000000",
      consentType: "FULL_HEALTHCARE_PROXY",
      status: "GRANTED",
    } as any);

    const req = new NextRequest("http://localhost:3000/api/v1/patients/pat_1/consents", {
      method: "POST",
      body: JSON.stringify({
        grantedToUserId: "a0000000-0000-0000-0000-000000000000",
        consentType: "FULL_HEALTHCARE_PROXY",
      }),
      headers: {
        Authorization: "Bearer valid_token",
        "Content-Type": "application/json",
      },
    });

    const res = await grantConsentHandler(req, { params: { patientId: "pat_1" } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.consentType).toBe("FULL_HEALTHCARE_PROXY");
  });
});
