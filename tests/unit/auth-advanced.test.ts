import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "../../src/modules/auth/auth.service";
import { prisma } from "../../src/core/database/prisma";
import { AppError, ErrorCode } from "../../src/core/errors/app-error";
import * as passwordModule from "../../src/core/security/password";
import * as rateLimiterModule from "../../src/core/security/rate-limiter";

describe("Authentication & Account Security Advanced Controls", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should prevent privilege escalation during user registration", async () => {
    await expect(
      AuthService.registerUser({
        phoneNumber: "+15551234567",
        password: "Password123!",
        fullName: "Hacker",
        systemRole: "SUPER_ADMIN" as any,
      })
    ).rejects.toThrow("Privileged system role 'SUPER_ADMIN' cannot be assigned via public registration.");
  });

  it("should enforce brute-force rate limiting and account locking", async () => {
    const mockUser = {
      id: "usr_victim",
      email: "victim@example.com",
      phoneNumber: "+15551112222",
      passwordHash: "real_hash",
      isActive: true,
      failedLoginAttempts: 4,
      lockedUntil: null,
    };

    vi.spyOn(prisma.user, "findFirst").mockResolvedValue(mockUser as any);
    vi.spyOn(passwordModule, "verifyPassword").mockResolvedValue(false); // Wrong password
    const updateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);

    await expect(
      AuthService.loginUser({
        identifier: "victim@example.com",
        password: "WrongPassword!",
      })
    ).rejects.toThrow("Invalid credentials.");

    // Should lock account after 5th failure
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      })
    );
  });

  it("should invalidate sessions on logout by blacklisting token hash", async () => {
    const token = "mock_jwt_token_to_revoke";
    const userId = "usr_100";

    const upsertSpy = vi.spyOn(prisma.revokedToken, "upsert").mockResolvedValue({} as any);

    const result = await AuthService.logoutUser(token, userId);
    expect(result.message).toContain("Successfully logged out");
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId,
          tokenHash: expect.any(String),
        }),
      })
    );
  });

  it("should provide anti-enumeration protection on password recovery requests", async () => {
    // When user does NOT exist
    vi.spyOn(prisma.user, "findFirst").mockResolvedValue(null);

    const result = await AuthService.requestPasswordReset("nonexistent@example.com");
    expect(result.success).toBe(true);
    expect(result.message).toContain("If an account matches that email or phone number");
    expect((result as any).resetToken).toBeUndefined(); // Never leak token
  });

  it("should create time-limited reset token when user exists", async () => {
    const mockUser = {
      id: "usr_existing",
      email: "patient@example.com",
    };

    vi.spyOn(prisma.user, "findFirst").mockResolvedValue(mockUser as any);
    const createTokenSpy = vi.spyOn(prisma.passwordResetToken, "create").mockResolvedValue({} as any);

    const result = await AuthService.requestPasswordReset("patient@example.com");
    expect(result.success).toBe(true);
    expect(createTokenSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockUser.id,
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      })
    );
  });

  it("should reject expired or already-used password reset tokens", async () => {
    // Already used token
    vi.spyOn(prisma.passwordResetToken, "findUnique").mockResolvedValue({
      id: "tok_1",
      userId: "usr_1",
      usedAt: new Date(), // Already used
      expiresAt: new Date(Date.now() + 100000),
    } as any);

    await expect(AuthService.resetPassword("some_token", "NewPassword123!")).rejects.toThrow(
      "Invalid or expired password reset token."
    );
  });

  it("should successfully reset password with valid token and invalidate token", async () => {
    vi.spyOn(prisma.passwordResetToken, "findUnique").mockResolvedValue({
      id: "tok_valid",
      userId: "usr_1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 100000),
    } as any);

    const txSpy = vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      const mockTx = {
        user: { update: vi.fn().mockResolvedValue({}) },
        passwordResetToken: { update: vi.fn().mockResolvedValue({}) },
      };
      return callback(mockTx);
    });

    const result = await AuthService.resetPassword("valid_token", "NewSuperPassword123!");
    expect(result.message).toContain("Password has been successfully updated");
    expect(txSpy).toHaveBeenCalled();
  });
});
