import { describe, it, expect, beforeEach, vi } from "vitest";
import { verifyPatientAccess } from "../../src/core/middleware/consent-guard";
import { authenticateRequest } from "../../src/core/middleware/auth-guard";
import { AuthService } from "../../src/modules/auth/auth.service";
import { AdherenceService } from "../../src/modules/adherence/adherence.service";
import { WebhookVerifier } from "../../src/core/security/webhook-verifier";
import { checkRateLimit, resetRateLimit } from "../../src/core/security/rate-limiter";
import { AppError, ErrorCode } from "../../src/core/errors/app-error";
import { prisma } from "../../src/core/database/prisma";
import { generateAccessToken } from "../../src/core/security/jwt";
import { NextRequest } from "next/server";

// Mock Prisma
vi.mock("../../src/core/database/prisma", () => {
  return {
    prisma: {
      patient: {
        findUnique: vi.fn(),
      },
      careCircleMembership: {
        findUnique: vi.fn(),
      },
      patientConsent: {
        findFirst: vi.fn(),
      },
      doseOccurrence: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      adherenceRecord: {
        create: vi.fn(),
      },
      medicationStock: {
        update: vi.fn(),
      },
      revokedToken: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

describe("CareNest Security & Authorization Audit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Insecure Direct Object Reference (IDOR) & Patient Access Control", () => {
    it("blocks access when an authenticated user is NOT in the patient's Care Circle", async () => {
      // Mock patient exists, but user is not the patient
      vi.mocked(prisma.patient.findUnique).mockResolvedValue({
        id: "pat_target_123",
        userId: "usr_patient_real",
      } as any);

      // Mock user is NOT a member of the Care Circle
      vi.mocked(prisma.careCircleMembership.findUnique).mockResolvedValue(null);

      const attackerToken = {
        sub: "usr_attacker_999",
        role: "FAMILY_MEMBER",
        type: "user",
      } as any;

      await expect(
        verifyPatientAccess("pat_target_123", attackerToken, "canViewRecords")
      ).rejects.toThrow("You are not an active member of this patient's Care Circle.");
    });

    it("allows the elderly patient to access their own medical records", async () => {
      vi.mocked(prisma.patient.findUnique).mockResolvedValue({
        id: "pat_target_123",
        userId: "usr_margaret_patient",
      } as any);

      const patientToken = {
        sub: "usr_margaret_patient",
        role: "PATIENT",
        type: "user",
      } as any;

      const result = await verifyPatientAccess("pat_target_123", patientToken, "canViewRecords");
      expect(result.isPatientThemselves).toBe(true);
      expect(result.patientId).toBe("pat_target_123");
    });

    it("rejects when an inactive Care Circle member tries to access records", async () => {
      vi.mocked(prisma.patient.findUnique).mockResolvedValue({
        id: "pat_target_123",
        userId: "usr_patient_real",
      } as any);

      vi.mocked(prisma.careCircleMembership.findUnique).mockResolvedValue({
        id: "mem_inactive",
        isActive: false, // Deactivated membership
        circleRole: "CARETAKER",
      } as any);

      const actorToken = {
        sub: "usr_deactivated",
        role: "CARETAKER",
        type: "user",
      } as any;

      await expect(
        verifyPatientAccess("pat_target_123", actorToken, "canViewRecords")
      ).rejects.toThrow("You are not an active member of this patient's Care Circle.");
    });
  });

  describe("2. Caregiver Permission Boundaries (Granular RBAC)", () => {
    it("denies medication changes when caregiver lacks 'canManageMedications' permission", async () => {
      vi.mocked(prisma.patient.findUnique).mockResolvedValue({
        id: "pat_123",
        userId: "usr_patient",
      } as any);

      vi.mocked(prisma.careCircleMembership.findUnique).mockResolvedValue({
        id: "mem_read_only",
        isActive: true,
        circleRole: "CARETAKER",
        canViewRecords: true,
        canManageMedications: false, // No permission to modify medications
      } as any);

      vi.mocked(prisma.patientConsent.findFirst).mockResolvedValue(null);

      const caregiverToken = {
        sub: "usr_caregiver_readonly",
        role: "CARETAKER",
        type: "user",
      } as any;

      await expect(
        verifyPatientAccess("pat_123", caregiverToken, "canManageMedications")
      ).rejects.toThrow("Permission denied. You do not have permission 'canManageMedications' for this patient.");
    });

    it("allows Family Admin master privileges across all permission categories", async () => {
      vi.mocked(prisma.patient.findUnique).mockResolvedValue({
        id: "pat_123",
        userId: "usr_patient",
      } as any);

      vi.mocked(prisma.careCircleMembership.findUnique).mockResolvedValue({
        id: "mem_family_admin",
        isActive: true,
        circleRole: "FAMILY_ADMIN",
      } as any);

      vi.mocked(prisma.patientConsent.findFirst).mockResolvedValue(null);

      const adminToken = {
        sub: "usr_sarah_admin",
        role: "FAMILY_ADMIN",
        type: "user",
      } as any;

      const result = await verifyPatientAccess("pat_123", adminToken, "canManageMedications");
      expect(result.permissions?.canManageMedications).toBe(true);
      expect(result.permissions?.canViewRecords).toBe(true);
    });
  });

  describe("3. Revoked Consent Enforcement", () => {
    it("blocks caregiver immediately if patient status is REVOKED, even if membership is still active", async () => {
      vi.mocked(prisma.patient.findUnique).mockResolvedValue({
        id: "pat_123",
        userId: "usr_patient",
      } as any);

      vi.mocked(prisma.careCircleMembership.findUnique).mockResolvedValue({
        id: "mem_123",
        isActive: true,
        circleRole: "CARETAKER",
      } as any);

      // Consent record shows REVOKED
      vi.mocked(prisma.patientConsent.findFirst).mockResolvedValue({
        id: "consent_revoked",
        status: "REVOKED",
      } as any);

      const caregiverToken = {
        sub: "usr_revoked_caregiver",
        role: "CARETAKER",
        type: "user",
      } as any;

      await expect(
        verifyPatientAccess("pat_123", caregiverToken, "canViewRecords")
      ).rejects.toThrow("Access denied: Patient has revoked consent for this account.");
    });
  });

  describe("4. Session Invalidation & Token Revocation", () => {
    it("rejects requests using revoked JWT tokens after user logout", async () => {
      // Mock that the token hash exists in the revokedToken table
      vi.mocked(prisma.revokedToken.findUnique).mockResolvedValue({
        id: "rev_1",
        tokenHash: "abc",
        revokedAt: new Date(),
      } as any);

      const validToken = await generateAccessToken({
        id: "usr_alice",
        email: "alice@test.com",
        phoneNumber: "+15551234567",
        fullName: "Alice Test",
        systemRole: "FAMILY_MEMBER",
        isActive: true,
      });

      const request = new NextRequest("http://localhost:3000/api/v1/patients", {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      await expect(authenticateRequest(request)).rejects.toThrow(
        "Session has been invalidated. Please log in again."
      );
    });
  });

  describe("5. Telephony & Webhook Signature Verification", () => {
    it("rejects unauthenticated webhook calls when signature header is missing", () => {
      const origEnv = process.env.NODE_ENV;
      const origSid = process.env.TWILIO_ACCOUNT_SID;
      const origToken = process.env.TWILIO_AUTH_TOKEN;
      try {
        (process.env as any).NODE_ENV = "production";
        process.env.TWILIO_ACCOUNT_SID = "AC_mock_test_1234567890abcdef";
        process.env.TWILIO_AUTH_TOKEN = "mock_secret_auth_token_xyz";

        expect(() =>
          WebhookVerifier.verifyTwilioSignature(null, "https://api.carenest.org/webhook", {})
        ).toThrow("Missing Twilio signature header (X-Twilio-Signature).");
      } finally {
        (process.env as any).NODE_ENV = origEnv;
        process.env.TWILIO_ACCOUNT_SID = origSid;
        process.env.TWILIO_AUTH_TOKEN = origToken;
      }
    });
  });

  describe("6. Concurrency & Duplicate Dose Confirmation Guard", () => {
    it("throws DOSE_ALREADY_TAKEN (409) if the dose was already recorded as taken", async () => {
      vi.mocked(prisma.doseOccurrence.findUnique).mockResolvedValue({
        id: "dose_already_taken",
        patientId: "pat_123",
        status: "TAKEN", // Already taken
        medicationId: "med_1",
        medication: { brandName: "Lisinopril" },
        schedule: { doseQuantity: 1 },
      } as any);

      await expect(
        AdherenceService.confirmDose("dose_already_taken", "pat_123", "usr_1", {
          confirmationChannel: "DASHBOARD_UI",
        })
      ).rejects.toThrow("This dose has already been recorded as taken.");
    });
  });

  describe("7. Privilege Escalation Prevention", () => {
    it("rejects public registration attempts specifying SUPER_ADMIN role", async () => {
      await expect(
        AuthService.registerUser({
          phoneNumber: "+15559990000",
          password: "SuperSecurePassword123!",
          fullName: "Malicious Admin",
          systemRole: "SUPER_ADMIN" as any,
        })
      ).rejects.toThrow("Privileged system role 'SUPER_ADMIN' cannot be assigned via public registration.");
    });
  });

  describe("8. Rate Limiting Protection", () => {
    it("triggers 429 RATE_LIMIT_EXCEEDED when request threshold is exceeded", () => {
      const testKey = "test_rate_limit_user";
      resetRateLimit(testKey);

      // Max 3 requests
      checkRateLimit(testKey, { windowMs: 60000, maxRequests: 3 });
      checkRateLimit(testKey, { windowMs: 60000, maxRequests: 3 });
      checkRateLimit(testKey, { windowMs: 60000, maxRequests: 3 });

      // 4th request must throw 429
      expect(() => {
        checkRateLimit(testKey, { windowMs: 60000, maxRequests: 3 });
      }).toThrow(/Too many requests/);

      resetRateLimit(testKey);
    });
  });
});
