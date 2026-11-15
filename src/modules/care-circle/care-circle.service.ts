import crypto from "crypto";
import { prisma } from "../../core/database/prisma";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import { CreateCareCircleInviteInput } from "../../core/validation/patient.schema";
import { AuditService } from "../audit/audit.service";

export class CareCircleService {
  /**
   * Retrieves active Care Circle members for a patient.
   */
  static async getMembers(patientId: string) {
    return prisma.careCircleMembership.findMany({
      where: { patientId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  }

  /**
   * Generates a 6-digit alphanumeric invitation code for an invited family member or nurse.
   */
  static async createInvite(
    patientId: string,
    invitedByUserId: string,
    input: CreateCareCircleInviteInput
  ) {
    // Generate secure random alphanumeric invite code (e.g., CN-894215)
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const inviteCode = `CN-${randomHex}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        patientId,
        invitedByUserId,
        inviteeEmail: input.inviteeEmail || null,
        inviteePhone: input.inviteePhone || null,
        inviteCode,
        circleRole: input.circleRole as any,
        permissionsPreset: input.permissions,
        status: "PENDING",
        expiresAt,
      },
    });

    await AuditService.log({
      patientId,
      actorUserId: invitedByUserId,
      action: "CARE_CIRCLE_INVITATION_CREATED",
      resourceType: "invitation",
      resourceId: invitation.id,
      newState: { inviteCode, circleRole: input.circleRole },
    });

    return invitation;
  }

  /**
   * Accepts an invitation code and joins the patient's Care Circle.
   */
  static async joinCareCircle(userId: string, inviteCode: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { inviteCode },
    });

    if (!invitation) {
      throw new AppError("Invalid invitation code.", 404, ErrorCode.INVITATION_NOT_FOUND);
    }

    if (invitation.status !== "PENDING") {
      throw new AppError(`Invitation has already been ${invitation.status.toLowerCase()}.`, 400, ErrorCode.VALIDATION_ERROR);
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      throw new AppError("This invitation code has expired. Please request a new invite.", 410, ErrorCode.INVITATION_EXPIRED);
    }

    // Check if user is already an active member
    const existingMembership = await prisma.careCircleMembership.findUnique({
      where: {
        patientId_userId: {
          patientId: invitation.patientId,
          userId,
        },
      },
    });

    if (existingMembership && existingMembership.isActive) {
      throw new AppError("You are already an active member of this Care Circle.", 409, ErrorCode.ALREADY_EXISTS);
    }

    const permissions = (invitation.permissionsPreset as Record<string, boolean>) || {};

    const result = await prisma.$transaction(async (tx) => {
      // Mark invitation as accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });

      // Upsert membership
      const membership = await tx.careCircleMembership.upsert({
        where: {
          patientId_userId: {
            patientId: invitation.patientId,
            userId,
          },
        },
        create: {
          patientId: invitation.patientId,
          userId,
          circleRole: invitation.circleRole,
          relationshipLabel: invitation.circleRole === "NURSE" ? "Visiting Nurse" : "Caregiver",
          canManageMedications: Boolean(permissions.canManageMedications),
          canManageAppointments: Boolean(permissions.canManageAppointments),
          canViewVitals: Boolean(permissions.canViewVitals ?? true),
          canViewRecords: Boolean(permissions.canViewRecords ?? true),
          receiveEmergencyAlerts: Boolean(permissions.receiveEmergencyAlerts ?? true),
          receiveMissedDoseCalls: Boolean(permissions.receiveMissedDoseCalls),
          isActive: true,
        },
        update: {
          circleRole: invitation.circleRole,
          isActive: true,
          canManageMedications: Boolean(permissions.canManageMedications),
          canManageAppointments: Boolean(permissions.canManageAppointments),
          canViewVitals: Boolean(permissions.canViewVitals ?? true),
          canViewRecords: Boolean(permissions.canViewRecords ?? true),
        },
      });

      // Grant consent record
      await tx.patientConsent.create({
        data: {
          patientId: invitation.patientId,
          grantedToUserId: userId,
          consentType: "MEDICATION_MANAGEMENT",
          status: "GRANTED",
        },
      });

      return membership;
    });

    await AuditService.log({
      patientId: invitation.patientId,
      actorUserId: userId,
      action: "CARE_CIRCLE_MEMBER_JOINED",
      resourceType: "care_circle_membership",
      resourceId: result.id,
      newState: result,
    });

    return result;
  }

  /**
   * Revokes a member's access to the patient profile.
   */
  static async revokeMembership(patientId: string, memberId: string, actorUserId: string) {
    const membership = await prisma.careCircleMembership.findUnique({
      where: { id: memberId },
    });

    if (!membership || membership.patientId !== patientId) {
      throw new AppError("Care Circle member not found.", 404, ErrorCode.NOT_FOUND);
    }

    // Do not allow revoking the primary family administrator if they are the only admin
    if (membership.circleRole === "FAMILY_ADMIN") {
      const adminCount = await prisma.careCircleMembership.count({
        where: { patientId, circleRole: "FAMILY_ADMIN", isActive: true },
      });
      if (adminCount <= 1) {
        throw new AppError("Cannot remove the only Family Administrator.", 400, ErrorCode.VALIDATION_ERROR);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Deactivate membership
      const updated = await tx.careCircleMembership.update({
        where: { id: memberId },
        data: { isActive: false },
      });

      // Mark all consents revoked
      await tx.patientConsent.updateMany({
        where: {
          patientId,
          grantedToUserId: membership.userId,
          status: "GRANTED",
        },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revocationReason: `Access revoked by user ${actorUserId}`,
        },
      });

      return updated;
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "CARE_CIRCLE_MEMBER_REVOKED",
      resourceType: "care_circle_membership",
      resourceId: memberId,
      previousState: membership,
      newState: result,
    });

    return result;
  }

  /**
   * Posts a daily family note to the patient's notice board.
   */
  static async postFamilyNote(patientId: string, authorUserId: string, message: string) {
    const note = await prisma.familyNote.create({
      data: {
        patientId,
        authorUserId,
        message,
        isPinned: true,
      },
      include: {
        authorUser: {
          select: { fullName: true },
        },
      },
    });

    await AuditService.log({
      patientId,
      actorUserId: authorUserId,
      action: "FAMILY_NOTE_POSTED",
      resourceType: "family_note",
      resourceId: note.id,
      newState: { message },
    });

    return note;
  }
}
