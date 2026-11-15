import { describe, it, expect, vi, beforeEach } from "vitest";
import { CareCircleService } from "../../src/modules/care-circle/care-circle.service";
import { prisma } from "../../src/core/database/prisma";
import { AuditService } from "../../src/modules/audit/audit.service";

describe("Care Circle Invitations & Patient Consent Management", () => {
  const patientId = "pat_margaret_1";
  const adminId = "usr_sarah_admin";

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuditService, "log").mockResolvedValue(undefined);
  });

  it("should generate secure 6-digit invitation codes with 7-day expiration", async () => {
    (vi.spyOn(prisma.invitation, "create") as any).mockImplementation(async (args: any) => {
      return { id: "inv_1", ...args.data };
    });

    const invite = await CareCircleService.createInvite(patientId, adminId, {
      inviteeEmail: "nurse.elena@example.com",
      circleRole: "NURSE",
      relationshipLabel: "Visiting Nurse",
      permissions: {
        canManageMedications: true,
        canManageAppointments: false,
        canViewVitals: true,
        canViewRecords: true,
        receiveEmergencyAlerts: true,
        receiveMissedDoseCalls: false,
      },
    });

    expect(invite.inviteCode).toMatch(/^CN-[A-F0-9]{6}$/);
    expect(invite.status).toBe("PENDING");
    expect(invite.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
  });

  it("should allow cancelling an unaccepted invitation", async () => {
    vi.spyOn(prisma.invitation, "findUnique").mockResolvedValue({
      id: "inv_pending",
      patientId,
      status: "PENDING",
    } as any);

    const updateSpy = vi.spyOn(prisma.invitation, "update").mockResolvedValue({
      id: "inv_pending",
      status: "REVOKED",
    } as any);

    const result = await CareCircleService.revokeInvite(patientId, "inv_pending", adminId);
    expect(result.status).toBe("REVOKED");
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv_pending" },
        data: { status: "REVOKED" },
      })
    );
  });

  it("should allow an invited person to reject an invitation", async () => {
    vi.spyOn(prisma.invitation, "findUnique").mockResolvedValue({
      id: "inv_to_reject",
      patientId,
      inviteCode: "CN-123456",
      status: "PENDING",
    } as any);

    const updateSpy = vi.spyOn(prisma.invitation, "update").mockResolvedValue({
      id: "inv_to_reject",
      status: "REJECTED",
    } as any);

    const result = await CareCircleService.rejectInvite("usr_invitee", "CN-123456");
    expect(result.message).toContain("declined successfully");
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "REJECTED" },
      })
    );
  });

  it("should reject expired invitation codes during acceptance", async () => {
    vi.spyOn(prisma.invitation, "findUnique").mockResolvedValue({
      id: "inv_expired",
      patientId,
      inviteCode: "CN-EXPIRE",
      status: "PENDING",
      expiresAt: new Date(Date.now() - 10000), // Expired in the past
    } as any);

    vi.spyOn(prisma.invitation, "update").mockResolvedValue({} as any);

    await expect(CareCircleService.joinCareCircle("usr_joiner", "CN-EXPIRE")).rejects.toThrow(
      "This invitation code has expired."
    );
  });

  it("should update member permissions within authorized limits", async () => {
    vi.spyOn(prisma.careCircleMembership, "findUnique").mockResolvedValue({
      id: "mem_elena",
      patientId,
      circleRole: "NURSE",
      canManageMedications: false,
    } as any);

    const updateSpy = vi.spyOn(prisma.careCircleMembership, "update").mockResolvedValue({
      id: "mem_elena",
      patientId,
      canManageMedications: true,
      canManageAppointments: true,
    } as any);

    const result = await CareCircleService.updateMemberPermissions(
      patientId,
      "mem_elena",
      { canManageMedications: true, canManageAppointments: true },
      adminId
    );

    expect(result.canManageMedications).toBe(true);
    expect(updateSpy).toHaveBeenCalled();
  });

  it("should record and revoke formal patient consent", async () => {
    // 1. Grant consent
    vi.spyOn(prisma.patientConsent, "create").mockResolvedValue({
      id: "consent_1",
      patientId,
      grantedToUserId: "usr_nurse",
      consentType: "MEDICATION_MANAGEMENT",
      status: "GRANTED",
    } as any);

    const consent = await CareCircleService.grantConsent(
      patientId,
      {
        grantedToUserId: "usr_nurse",
        consentType: "MEDICATION_MANAGEMENT",
      },
      patientId
    );
    expect(consent.status).toBe("GRANTED");

    // 2. Revoke consent
    vi.spyOn(prisma.patientConsent, "findUnique").mockResolvedValue({
      id: "consent_1",
      patientId,
      status: "GRANTED",
    } as any);

    const revokeSpy = vi.spyOn(prisma.patientConsent, "update").mockResolvedValue({
      id: "consent_1",
      status: "REVOKED",
      revocationReason: "Nurse transferred to another ward",
    } as any);

    const revoked = await CareCircleService.revokeConsent(
      patientId,
      "consent_1",
      "Nurse transferred to another ward",
      patientId
    );

    expect(revoked.status).toBe("REVOKED");
    expect(revokeSpy).toHaveBeenCalled();
  });
});
