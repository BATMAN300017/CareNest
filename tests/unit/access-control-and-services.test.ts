import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyPatientAccess } from "../../src/core/middleware/consent-guard";
import { AuthTokenPayload } from "../../src/core/types/auth";
import { prisma } from "../../src/core/database/prisma";
import { AppError, ErrorCode } from "../../src/core/errors/app-error";

describe("Access Control & Patient Consent Guardrails", () => {
  const patientId = "pat_margaret_101";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should grant access when requesting user is the patient themselves", async () => {
    const mockActor: AuthTokenPayload = {
      sub: "usr_margaret",
      email: "margaret@example.com",
      phoneNumber: "+15551234567",
      role: "PATIENT",
      type: "access",
    };

    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      userId: "usr_margaret",
    } as any);

    const access = await verifyPatientAccess(patientId, mockActor);
    expect(access.isPatientThemselves).toBe(true);
    expect(access.patientId).toBe(patientId);
  });

  it("should grant access to Family Admin with all permissions enabled", async () => {
    const mockAdmin: AuthTokenPayload = {
      sub: "usr_sarah_admin",
      email: "sarah@example.com",
      phoneNumber: "+15559876543",
      role: "FAMILY_ADMIN",
      type: "access",
    };

    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      userId: "usr_margaret",
    } as any);

    vi.spyOn(prisma.careCircleMembership, "findUnique").mockResolvedValue({
      id: "mem_1",
      patientId,
      userId: mockAdmin.sub,
      circleRole: "FAMILY_ADMIN",
      isActive: true,
      canManageMedications: true,
      canManageAppointments: true,
      canViewVitals: true,
      canViewRecords: true,
    } as any);

    vi.spyOn(prisma.patientConsent, "findFirst").mockResolvedValue(null);

    const access = await verifyPatientAccess(patientId, mockAdmin, "canManageMedications");
    expect(access.isPatientThemselves).toBe(false);
    expect(access.circleRole).toBe("FAMILY_ADMIN");
    expect(access.permissions?.canManageMedications).toBe(true);
  });

  it("should reject access if user is not in the patient Care Circle", async () => {
    const mockStranger: AuthTokenPayload = {
      sub: "usr_stranger_999",
      email: "stranger@example.com",
      phoneNumber: "+15550000000",
      role: "FAMILY_MEMBER",
      type: "access",
    };

    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      userId: "usr_margaret",
    } as any);

    vi.spyOn(prisma.careCircleMembership, "findUnique").mockResolvedValue(null);

    await expect(verifyPatientAccess(patientId, mockStranger)).rejects.toThrow(
      "You are not an active member of this patient's Care Circle."
    );
  });

  it("should reject access when caregiver membership is deactivated (isActive: false)", async () => {
    const mockFormerCaregiver: AuthTokenPayload = {
      sub: "usr_former_nurse",
      email: "former@example.com",
      phoneNumber: "+15552223333",
      role: "CARETAKER",
      type: "access",
    };

    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      userId: "usr_margaret",
    } as any);

    vi.spyOn(prisma.careCircleMembership, "findUnique").mockResolvedValue({
      id: "mem_deactivated",
      patientId,
      userId: mockFormerCaregiver.sub,
      circleRole: "CAREGIVER",
      isActive: false, // Inactive
    } as any);

    await expect(verifyPatientAccess(patientId, mockFormerCaregiver)).rejects.toThrow(
      "You are not an active member of this patient's Care Circle."
    );
  });

  it("should immediately deny access if patient has revoked consent", async () => {
    const mockCaregiver: AuthTokenPayload = {
      sub: "usr_nurse_elena",
      email: "elena@example.com",
      phoneNumber: "+15551112222",
      role: "CARETAKER",
      type: "access",
    };

    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      userId: "usr_margaret",
    } as any);

    vi.spyOn(prisma.careCircleMembership, "findUnique").mockResolvedValue({
      id: "mem_2",
      patientId,
      userId: mockCaregiver.sub,
      circleRole: "NURSE",
      isActive: true,
    } as any);

    vi.spyOn(prisma.patientConsent, "findFirst").mockResolvedValue({
      id: "consent_revoked",
      status: "REVOKED",
    } as any);

    await expect(verifyPatientAccess(patientId, mockCaregiver)).rejects.toThrow(
      "Access denied: Patient has revoked consent for this account."
    );
  });

  it("should deny specific action if member lacks granular permission", async () => {
    const mockFamilyMember: AuthTokenPayload = {
      sub: "usr_cousin_bob",
      email: "bob@example.com",
      phoneNumber: "+15553334444",
      role: "FAMILY_MEMBER",
      type: "access",
    };

    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      userId: "usr_margaret",
    } as any);

    vi.spyOn(prisma.careCircleMembership, "findUnique").mockResolvedValue({
      id: "mem_3",
      patientId,
      userId: mockFamilyMember.sub,
      circleRole: "FAMILY_MEMBER",
      isActive: true,
      canViewVitals: true,
      canManageMedications: false, // Disallowed
    } as any);

    vi.spyOn(prisma.patientConsent, "findFirst").mockResolvedValue(null);

    await expect(
      verifyPatientAccess(patientId, mockFamilyMember, "canManageMedications")
    ).rejects.toThrow(
      "Permission denied. You do not have permission 'canManageMedications' for this patient."
    );
  });

  it("should grant access to authorized Doctor with active non-expired clinical consent", async () => {
    const mockDoctor: AuthTokenPayload = {
      sub: "usr_dr_chen",
      email: "dr.chen@metroheart.com",
      phoneNumber: "+15554321098",
      role: "HEALTHCARE_PROFESSIONAL",
      type: "access",
    };

    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      userId: "usr_margaret",
    } as any);

    vi.spyOn(prisma.careCircleMembership, "findUnique").mockResolvedValue(null);

    vi.spyOn(prisma.patientConsent, "findFirst").mockResolvedValue({
      id: "consent_chen",
      status: "GRANTED",
      grantedToUserId: "usr_dr_chen",
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Valid for 60 days
      permissions: {
        canManageMedications: true,
        canManageAppointments: true,
        canViewVitals: true,
        canViewRecords: true,
      },
    } as any);

    const access = await verifyPatientAccess(patientId, mockDoctor, "canViewVitals");
    expect(access.isPatientThemselves).toBe(false);
    expect(access.patientId).toBe(patientId);
  });

  it("should reject Doctor when clinical consent has expired", async () => {
    const mockDoctor: AuthTokenPayload = {
      sub: "usr_dr_chen",
      email: "dr.chen@metroheart.com",
      phoneNumber: "+15554321098",
      role: "HEALTHCARE_PROFESSIONAL",
      type: "access",
    };

    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      userId: "usr_margaret",
    } as any);

    vi.spyOn(prisma.careCircleMembership, "findUnique").mockResolvedValue(null);

    vi.spyOn(prisma.patientConsent, "findFirst").mockResolvedValue({
      id: "consent_expired",
      status: "EXPIRED",
      grantedToUserId: "usr_dr_chen",
    } as any);

    await expect(verifyPatientAccess(patientId, mockDoctor, "canViewVitals")).rejects.toThrow(
      "Access denied: Clinical consent for this patient has expired."
    );
  });

  it("should grant emergency bypass access for SUPER_ADMIN role with platform audit log", async () => {
    const mockSuperAdmin: AuthTokenPayload = {
      sub: "usr_sec_admin",
      email: "security@carenest.app",
      phoneNumber: "+15559990000",
      role: "SUPER_ADMIN",
      type: "access",
    };

    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      userId: "usr_margaret",
    } as any);

    const access = await verifyPatientAccess(patientId, mockSuperAdmin, "canManageMedications");
    expect(access.circleRole).toBe("SUPER_ADMIN");
    expect(access.isPatientThemselves).toBe(false);
  });
});
