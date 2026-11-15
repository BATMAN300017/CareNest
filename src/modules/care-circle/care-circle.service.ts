import crypto from "crypto";
import { prisma } from "../../core/database/prisma";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import {
  CreateCareCircleInviteInput,
  UpdateMemberPermissionsInput,
  GrantConsentInput,
} from "../../core/validation/patient.schema";
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
   * Retrieves all pending, unexpired invitations for a patient.
   */
  static async getPendingInvites(patientId: string) {
    return prisma.invitation.findMany({
      where: {
        patientId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      include: {
        invitedByUser: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: "desc" },
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
   * Revokes/cancels a pending invitation before it has been accepted.
   */
  static async revokeInvite(patientId: string, inviteId: string, actorUserId: string) {
    const invite = await prisma.invitation.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.patientId !== patientId) {
      throw new AppError("Invitation not found.", 404, ErrorCode.INVITATION_NOT_FOUND);
    }

    if (invite.status !== "PENDING") {
      throw new AppError(`Cannot revoke an invitation that is already ${invite.status.toLowerCase()}.`, 400, ErrorCode.VALIDATION_ERROR);
    }

    const updated = await prisma.invitation.update({
      where: { id: inviteId },
      data: { status: "REVOKED" },
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "CARE_CIRCLE_INVITATION_REVOKED",
      resourceType: "invitation",
      resourceId: inviteId,
    });

    return updated;
  }

  /**
   * Rejects an invitation code by the invited person.
   */
  static async rejectInvite(userId: string, inviteCode: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { inviteCode },
    });

    if (!invitation) {
      throw new AppError("Invalid invitation code.", 404, ErrorCode.INVITATION_NOT_FOUND);
    }

    if (invitation.status !== "PENDING") {
      throw new AppError(`Invitation has already been ${invitation.status.toLowerCase()}.`, 400, ErrorCode.VALIDATION_ERROR);
    }

    const updated = await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "REJECTED" },
    });

    await AuditService.log({
      patientId: invitation.patientId,
      actorUserId: userId,
      action: "CARE_CIRCLE_INVITATION_REJECTED",
      resourceType: "invitation",
      resourceId: invitation.id,
    });

    return { message: "Invitation declined successfully." };
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
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });

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
   * Updates an existing member's role and permission settings.
   */
  static async updateMemberPermissions(
    patientId: string,
    memberId: string,
    input: UpdateMemberPermissionsInput,
    actorUserId: string
  ) {
    const membership = await prisma.careCircleMembership.findUnique({
      where: { id: memberId },
    });

    if (!membership || membership.patientId !== patientId) {
      throw new AppError("Care Circle member not found.", 404, ErrorCode.NOT_FOUND);
    }

    const updated = await prisma.careCircleMembership.update({
      where: { id: memberId },
      data: {
        ...(input.circleRole && { circleRole: input.circleRole as any }),
        ...(input.relationshipLabel && { relationshipLabel: input.relationshipLabel }),
        ...(input.canManageMedications !== undefined && { canManageMedications: input.canManageMedications }),
        ...(input.canManageAppointments !== undefined && { canManageAppointments: input.canManageAppointments }),
        ...(input.canViewVitals !== undefined && { canViewVitals: input.canViewVitals }),
        ...(input.canViewRecords !== undefined && { canViewRecords: input.canViewRecords }),
        ...(input.receiveEmergencyAlerts !== undefined && { receiveEmergencyAlerts: input.receiveEmergencyAlerts }),
        ...(input.receiveMissedDoseCalls !== undefined && { receiveMissedDoseCalls: input.receiveMissedDoseCalls }),
      },
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "MEMBER_PERMISSIONS_UPDATED",
      resourceType: "care_circle_membership",
      resourceId: memberId,
      previousState: membership,
      newState: updated,
    });

    return updated;
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

    if (membership.circleRole === "FAMILY_ADMIN") {
      const adminCount = await prisma.careCircleMembership.count({
        where: { patientId, circleRole: "FAMILY_ADMIN", isActive: true },
      });
      if (adminCount <= 1) {
        throw new AppError("Cannot remove the only Family Administrator.", 400, ErrorCode.VALIDATION_ERROR);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.careCircleMembership.update({
        where: { id: memberId },
        data: { isActive: false },
      });

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
   * Retrieves all consent records for a patient.
   */
  static async getPatientConsents(patientId: string) {
    return prisma.patientConsent.findMany({
      where: { patientId },
      include: {
        grantedToUser: {
          select: { id: true, fullName: true, email: true, phoneNumber: true, systemRole: true },
        },
      },
      orderBy: { grantedAt: "desc" },
    });
  }

  /**
   * Grants an explicit patient consent record.
   */
  static async grantConsent(patientId: string, input: GrantConsentInput, actorUserId: string) {
    const consent = await prisma.patientConsent.create({
      data: {
        patientId,
        grantedToUserId: input.grantedToUserId,
        consentType: input.consentType as any,
        status: "GRANTED",
        digitalSignatureHash: input.digitalSignatureHash || null,
      },
      include: {
        grantedToUser: {
          select: { id: true, fullName: true },
        },
      },
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "PATIENT_CONSENT_GRANTED",
      resourceType: "patient_consent",
      resourceId: consent.id,
      newState: input,
    });

    return consent;
  }

  /**
   * Revokes a specific consent record.
   */
  static async revokeConsent(patientId: string, consentId: string, reason: string, actorUserId: string) {
    const consent = await prisma.patientConsent.findUnique({
      where: { id: consentId },
    });

    if (!consent || consent.patientId !== patientId) {
      throw new AppError("Consent record not found.", 404, ErrorCode.NOT_FOUND);
    }

    const updated = await prisma.patientConsent.update({
      where: { id: consentId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "PATIENT_CONSENT_REVOKED",
      resourceType: "patient_consent",
      resourceId: consentId,
      newState: { status: "REVOKED", reason },
    });

    return updated;
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
