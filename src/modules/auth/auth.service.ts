import crypto from "crypto";
import { prisma } from "../../core/database/prisma";
import { hashPassword, verifyPassword, hashQuickPasscode, verifyQuickPasscode } from "../../core/security/password";
import {
  generateAccessToken,
  generateRefreshToken,
  generateTabletKioskToken,
  verifyRefreshToken,
  hashToken,
} from "../../core/security/jwt";
import { checkRateLimit, resetRateLimit } from "../../core/security/rate-limiter";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import {
  RegisterUserInput,
  LoginUserInput,
  TabletUnlockInput,
  UpdateUserProfileInput,
  ChangePasswordInput,
} from "../../core/validation/auth.schema";
import { AuthenticatedUser } from "../../core/types/auth";
import { AuditService } from "../audit/audit.service";

export class AuthService {
  /**
   * Registers a new user account with privilege escalation protection.
   */
  static async registerUser(input: RegisterUserInput) {
    // 0. Enforce rate limiting on public registration
    const rateLimitKey = `register:${input.phoneNumber}`;
    checkRateLimit(rateLimitKey, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      message: "Too many registration attempts. Please try again after 15 minutes.",
    });

    // 1. Prevent privilege escalation
    if ((input.systemRole as string) === "SUPER_ADMIN") {
      throw new AppError(
        "Privileged system role 'SUPER_ADMIN' cannot be assigned via public registration.",
        403,
        ErrorCode.FORBIDDEN
      );
    }

    // 2. Check if phone number is already registered
    const existingPhone = await prisma.user.findUnique({
      where: { phoneNumber: input.phoneNumber },
    });

    if (existingPhone) {
      throw new AppError("A user with this phone number already exists.", 409, ErrorCode.ALREADY_EXISTS);
    }

    if (input.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existingEmail) {
        throw new AppError("A user with this email address already exists.", 409, ErrorCode.ALREADY_EXISTS);
      }
    }

    const passwordHash = await hashPassword(input.password);
    const quickPasscodeHash = input.quickPasscode ? hashQuickPasscode(input.quickPasscode) : null;

    const user = await prisma.user.create({
      data: {
        email: input.email || null,
        phoneNumber: input.phoneNumber,
        passwordHash,
        quickPasscodeHash,
        fullName: input.fullName,
        systemRole: input.systemRole as any,
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        fullName: true,
        systemRole: true,
        isActive: true,
        createdAt: true,
      },
    });

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      systemRole: user.systemRole as any,
      isActive: user.isActive,
    };

    const accessToken = await generateAccessToken(authenticatedUser);
    const refreshToken = await generateRefreshToken(authenticatedUser);

    return {
      user,
      token: accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticates user via email/phone and password with brute-force protection.
   */
  static async loginUser(input: LoginUserInput) {
    // 1. Rate limiting: Max 5 failed attempts per 15 minutes per identifier
    const rateLimitKey = `login:${input.identifier.toLowerCase()}`;
    checkRateLimit(rateLimitKey, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      message: "Too many login attempts. Account temporarily throttled. Please try again in 15 minutes.",
    });

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input.identifier },
          { phoneNumber: input.identifier },
        ],
      },
    });

    if (!user) {
      throw new AppError("Invalid credentials.", 401, ErrorCode.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throw new AppError("Your account has been deactivated. Please contact support.", 403, ErrorCode.FORBIDDEN);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      throw new AppError(
        `Account is locked due to repeated failed attempts. Please try again in ${waitMinutes} minutes.`,
        423,
        ErrorCode.ACCOUNT_LOCKED
      );
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      const nextFailures = user.failedLoginAttempts + 1;
      const isLocked = nextFailures >= 5;
      const lockedUntil = isLocked ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: nextFailures,
          lockedUntil,
        },
      });

      throw new AppError("Invalid credentials.", 401, ErrorCode.INVALID_CREDENTIALS);
    }

    // 2. Reset failed attempts & rate limit on successful authentication
    resetRateLimit(rateLimitKey);
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      systemRole: user.systemRole as any,
      isActive: user.isActive,
    };

    const accessToken = await generateAccessToken(authenticatedUser);
    const refreshToken = await generateRefreshToken(authenticatedUser);

    const patientProfile = await prisma.patient.findUnique({
      where: { userId: user.id },
      select: { id: true, fullName: true },
    });

    const careCirclePatients = await prisma.careCircleMembership.findMany({
      where: { userId: user.id, isActive: true },
      include: {
        patient: {
          select: { id: true, fullName: true, timezone: true },
        },
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        systemRole: user.systemRole,
      },
      patientProfile,
      careCirclePatients: careCirclePatients.map((m) => ({
        patientId: m.patient.id,
        patientName: m.patient.fullName,
        role: m.circleRole,
        relationshipLabel: m.relationshipLabel,
      })),
      token: accessToken,
      refreshToken,
    };
  }

  /**
   * Invalidates active session token on logout.
   */
  static async logoutUser(token: string, userId: string) {
    const tokenHashValue = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours retention

    await prisma.revokedToken.upsert({
      where: { tokenHash: tokenHashValue },
      create: {
        tokenHash: tokenHashValue,
        userId,
        expiresAt,
      },
      update: {},
    });

    return { message: "Successfully logged out. Session invalidated." };
  }

  /**
   * Requests a password reset token with anti-enumeration protection.
   */
  static async requestPasswordReset(identifier: string) {
    // Rate limit: Max 3 requests per hour
    const rateLimitKey = `forgot-pwd:${identifier.toLowerCase()}`;
    checkRateLimit(rateLimitKey, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 3,
      message: "Too many password recovery requests. Please wait before requesting again.",
    });

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phoneNumber: identifier },
        ],
      },
    });

    // Anti-enumeration: If user does not exist, return generic success message
    if (!user) {
      return {
        success: true,
        message: "If an account matches that email or phone number, recovery instructions have been sent.",
      };
    }

    // Generate secure random 32-byte hex token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // In a production deployment with email/telephony, send reset link via Resend/Twilio
    // For local development and testing, we return the token in non-production
    return {
      success: true,
      message: "If an account matches that email or phone number, recovery instructions have been sent.",
      ...(process.env.NODE_ENV !== "production" && { resetToken }),
    };
  }

  /**
   * Resets password using a verified, single-use recovery token.
   */
  static async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt < new Date()) {
      throw new AppError(
        "Invalid or expired password reset token. Please request a new recovery link.",
        400,
        ErrorCode.INVALID_TOKEN
      );
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      // Update password and reset failure counters
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash: newPasswordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      // Mark token as used
      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });
    });

    return { message: "Password has been successfully updated. You may now log in with your new password." };
  }

  /**
   * Retrieves profile information for the authenticated user.
   */
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        fullName: true,
        avatarUrl: true,
        systemRole: true,
        isActive: true,
        phoneVerified: true,
        emailVerified: true,
        createdAt: true,
        patientProfile: {
          select: {
            id: true,
            fullName: true,
            timezone: true,
            highContrastPreference: true,
            textScalePreference: true,
            audioReadoutEnabled: true,
          },
        },
        circleMemberships: {
          where: { isActive: true },
          include: {
            patient: {
              select: { id: true, fullName: true, timezone: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError("User profile not found.", 404, ErrorCode.USER_NOT_FOUND);
    }

    return user;
  }

  /**
   * Updates permitted personal profile information.
   */
  static async updateProfile(userId: string, input: UpdateUserProfileInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found.", 404, ErrorCode.USER_NOT_FOUND);
    }

    if (input.phoneNumber && input.phoneNumber !== user.phoneNumber) {
      const existing = await prisma.user.findUnique({
        where: { phoneNumber: input.phoneNumber },
      });
      if (existing) {
        throw new AppError("Phone number is already associated with another account.", 409, ErrorCode.ALREADY_EXISTS);
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.fullName && { fullName: input.fullName }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        ...(input.phoneNumber && { phoneNumber: input.phoneNumber }),
        ...(input.quickPasscode && { quickPasscodeHash: hashQuickPasscode(input.quickPasscode) }),
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        fullName: true,
        avatarUrl: true,
        systemRole: true,
      },
    });

    return updated;
  }

  /**
   * Changes user password after verifying current credentials.
   */
  static async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found.", 404, ErrorCode.USER_NOT_FOUND);
    }

    const isValidCurrent = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!isValidCurrent) {
      throw new AppError("Current password entered is incorrect.", 400, ErrorCode.INVALID_CREDENTIALS);
    }

    const newPasswordHash = await hashPassword(input.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: "Password has been successfully changed." };
  }

  /**
   * Authenticates an elderly user on a bound tablet kiosk using a quick 4-digit PIN.
   */
  static async tabletUnlock(input: TabletUnlockInput) {
    const device = await prisma.deviceRegistration.findUnique({
      where: { deviceFingerprint: input.deviceFingerprint },
      include: {
        user: {
          include: {
            patientProfile: true,
          },
        },
      },
    });

    if (!device || !device.user || !device.user.quickPasscodeHash) {
      throw new AppError("Tablet device is not registered or quick PIN is unconfigured.", 401, ErrorCode.INVALID_PASSCODE);
    }

    const isValidPIN = verifyQuickPasscode(input.passcode, device.user.quickPasscodeHash);
    if (!isValidPIN) {
      throw new AppError("Incorrect PIN.", 401, ErrorCode.INVALID_PASSCODE);
    }

    const patientId = device.user.patientProfile?.id;
    if (!patientId) {
      throw new AppError("No patient profile is associated with this tablet.", 404, ErrorCode.PATIENT_NOT_FOUND);
    }

    await prisma.deviceRegistration.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });

    const token = await generateTabletKioskToken(patientId, input.deviceFingerprint);

    return {
      patientId,
      patientName: device.user.fullName,
      token,
    };
  }

  /**
   * Rotates an expired access token using a valid refresh token.
   */
  static async refreshToken(token: string) {
    const payload = await verifyRefreshToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new AppError("User account not found or deactivated.", 401, ErrorCode.UNAUTHORIZED);
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      systemRole: user.systemRole as any,
      isActive: user.isActive,
    };

    const newAccessToken = await generateAccessToken(authenticatedUser);
    const newRefreshToken = await generateRefreshToken(authenticatedUser);

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}
