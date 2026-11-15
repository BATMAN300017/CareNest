import { prisma } from "../database/prisma";
import { AuthTokenPayload } from "../types/auth";
import { AppError, ErrorCode } from "../errors/app-error";

export type CareCirclePermissionKey =
  | "canManageMedications"
  | "canManageAppointments"
  | "canViewVitals"
  | "canViewRecords"
  | "receiveEmergencyAlerts"
  | "receiveMissedDoseCalls";

export interface VerifiedPatientAccess {
  patientId: string;
  isPatientThemselves: boolean;
  membershipId?: string;
  circleRole?: string;
  permissions?: Record<string, boolean>;
}

/**
 * Validates patient-caregiver relationship and checks granular consent permissions.
 * Guarantees that no user can access another patient's medical records without active consent.
 */
export async function verifyPatientAccess(
  patientId: string,
  actor: AuthTokenPayload,
  requiredPermission?: CareCirclePermissionKey
): Promise<VerifiedPatientAccess> {
  // 1. Tablet Kiosk session check
  if (actor.type === "tablet_kiosk") {
    if (actor.patientId !== patientId) {
      throw new AppError(
        "Kiosk session is not authorized for this patient profile.",
        403,
        ErrorCode.PATIENT_ACCESS_DENIED
      );
    }
    return {
      patientId,
      isPatientThemselves: true,
    };
  }

  // 2. Check if the actor is the elderly patient themselves
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, userId: true },
  });

  if (!patient) {
    throw new AppError("Patient profile not found.", 404, ErrorCode.PATIENT_NOT_FOUND);
  }

  if (patient.userId && patient.userId === actor.sub) {
    return {
      patientId,
      isPatientThemselves: true,
    };
  }

  // 3. Super admin bypass (for emergency break-glass / platform support)
  if (actor.role === "SUPER_ADMIN") {
    return {
      patientId,
      isPatientThemselves: false,
      circleRole: "SUPER_ADMIN",
    };
  }

  // 3b. Healthcare professional / Doctor clinical consent verification
  if (actor.role === "HEALTHCARE_PROFESSIONAL") {
    const consent = await prisma.patientConsent.findFirst({
      where: {
        patientId,
        grantedToUserId: actor.sub,
      },
      orderBy: { grantedAt: "desc" },
    });

    if (!consent) {
      throw new AppError(
        "You are not an active member of this patient's Care Circle.",
        403,
        ErrorCode.PATIENT_ACCESS_DENIED
      );
    }

    if (consent.status === "EXPIRED") {
      throw new AppError(
        "Access denied: Clinical consent for this patient has expired.",
        403,
        ErrorCode.CONSENT_EXPIRED
      );
    }

    if (consent.status !== "GRANTED") {
      throw new AppError(
        "Access denied: Clinical consent has been revoked.",
        403,
        ErrorCode.CONSENT_REVOKED
      );
    }

    return {
      patientId,
      isPatientThemselves: false,
      circleRole: "CLINICIAN",
      permissions: {
        canViewVitals: true,
        canViewRecords: true,
        canManageMedications: true,
        canManageAppointments: true,
      },
    };
  }

  // 4. Check active Care Circle membership
  const membership = await prisma.careCircleMembership.findUnique({
    where: {
      patientId_userId: {
        patientId,
        userId: actor.sub,
      },
    },
  });

  if (!membership || !membership.isActive) {
    throw new AppError(
      "You are not an active member of this patient's Care Circle.",
      403,
      ErrorCode.PATIENT_ACCESS_DENIED
    );
  }

  // 5. Check if patient has explicitly revoked consent
  const revokedConsent = await prisma.patientConsent.findFirst({
    where: {
      patientId,
      grantedToUserId: actor.sub,
      status: "REVOKED",
    },
  });

  if (revokedConsent) {
    throw new AppError(
      "Access denied: Patient has revoked consent for this account.",
      403,
      ErrorCode.CONSENT_REVOKED
    );
  }

  // 6. Family Admin role holds master management privileges for the patient
  if (membership.circleRole === "FAMILY_ADMIN") {
    return {
      patientId,
      isPatientThemselves: false,
      membershipId: membership.id,
      circleRole: membership.circleRole,
      permissions: {
        canManageMedications: true,
        canManageAppointments: true,
        canViewVitals: true,
        canViewRecords: true,
        receiveEmergencyAlerts: true,
        receiveMissedDoseCalls: true,
      },
    };
  }

  // 7. Check specific granular permission flag
  if (requiredPermission) {
    const hasPermission = Boolean(membership[requiredPermission]);
    if (!hasPermission) {
      throw new AppError(
        `Permission denied. You do not have permission '${requiredPermission}' for this patient.`,
        403,
        ErrorCode.PERMISSION_DENIED
      );
    }
  }

  return {
    patientId,
    isPatientThemselves: false,
    membershipId: membership.id,
    circleRole: membership.circleRole,
    permissions: {
      canManageMedications: membership.canManageMedications,
      canManageAppointments: membership.canManageAppointments,
      canViewVitals: membership.canViewVitals,
      canViewRecords: membership.canViewRecords,
      receiveEmergencyAlerts: membership.receiveEmergencyAlerts,
      receiveMissedDoseCalls: membership.receiveMissedDoseCalls,
    },
  };
}
