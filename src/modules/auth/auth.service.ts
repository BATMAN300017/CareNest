import { prisma } from "../../core/database/prisma";
import { hashPassword, verifyPassword, hashQuickPasscode, verifyQuickPasscode } from "../../core/security/password";
import { generateAccessToken, generateRefreshToken, generateTabletKioskToken, verifyRefreshToken } from "../../core/security/jwt";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import { RegisterUserInput, LoginUserInput, TabletUnlockInput } from "../../core/validation/auth.schema";
import { AuthenticatedUser } from "../../core/types/auth";

export class AuthService {
  /**
   * Registers a new user account.
   */
  static async registerUser(input: RegisterUserInput) {
    // Check if phone number is already registered
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
   * Authenticates user via email/phone and password.
   */
  static async loginUser(input: LoginUserInput) {
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
      throw new AppError("Account is temporarily locked due to failed attempts. Please try again later.", 423, ErrorCode.ACCOUNT_LOCKED);
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      // Increment failed attempts
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: { increment: 1 },
          lockedUntil: user.failedLoginAttempts >= 4 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });
      throw new AppError("Invalid credentials.", 401, ErrorCode.INVALID_CREDENTIALS);
    }

    // Reset failed attempts on success
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

    // Retrieve associated patient profiles (either direct profile or via Care Circle)
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

    // Update last seen
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
