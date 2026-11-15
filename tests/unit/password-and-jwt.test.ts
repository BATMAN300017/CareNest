import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, hashQuickPasscode, verifyQuickPasscode } from "../../src/core/security/password";
import {
  generateAccessToken,
  generateRefreshToken,
  generateTabletKioskToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../src/core/security/jwt";
import { AuthenticatedUser } from "../../src/core/types/auth";
import { TabletUnlockSchema } from "../../src/core/validation/auth.schema";

describe("Security Primitives: Passwords, Quick PINs, and JWTs", () => {
  it("should securely hash and verify user passwords", async () => {
    const plaintext = "SeniorCare2026!Secure";
    const hash = await hashPassword(plaintext);

    expect(hash).toBeDefined();
    expect(hash).not.toEqual(plaintext);
    expect(hash.startsWith("$2")).toBe(true); // bcrypt prefix

    const isMatch = await verifyPassword(plaintext, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword("WrongPassword!", hash);
    expect(isWrong).toBe(false);
  });

  it("should hash and verify elderly tablet kiosk 4-digit quick PINs", () => {
    const pin = "1948";
    const hashedPin = hashQuickPasscode(pin);

    expect(hashedPin).toBeDefined();
    expect(hashedPin.length).toBe(64); // SHA-256 hex string

    const isCorrect = verifyQuickPasscode(pin, hashedPin);
    expect(isCorrect).toBe(true);

    const isWrong = verifyQuickPasscode("9999", hashedPin);
    expect(isWrong).toBe(false);
  });

  it("should generate and verify JWT access and refresh tokens with correct claims", async () => {
    const mockUser: AuthenticatedUser = {
      id: "usr_12345",
      email: "sarah.jenkins@example.com",
      phoneNumber: "+15551234567",
      fullName: "Sarah Jenkins",
      systemRole: "FAMILY_ADMIN",
      isActive: true,
    };

    const accessToken = await generateAccessToken(mockUser);
    expect(typeof accessToken).toBe("string");

    const decoded = await verifyAccessToken(accessToken);
    expect(decoded.sub).toBe("usr_12345");
    expect(decoded.email).toBe("sarah.jenkins@example.com");
    expect(decoded.role).toBe("FAMILY_ADMIN");
    expect(decoded.type).toBe("access");

    const refreshToken = await generateRefreshToken(mockUser);
    const decodedRefresh = await verifyRefreshToken(refreshToken);
    expect(decodedRefresh.sub).toBe("usr_12345");
    expect(decodedRefresh.type).toBe("refresh");
  });

  it("should generate and verify scoped tablet kiosk tokens", async () => {
    const patientId = "pat_margaret_888";
    const fingerprint = "kiosk_tablet_livingroom";

    const kioskToken = await generateTabletKioskToken(patientId, fingerprint);
    const decoded = await verifyAccessToken(kioskToken);

    expect(decoded.sub).toBe(`kiosk:${fingerprint}`);
    expect(decoded.type).toBe("tablet_kiosk");
    expect(decoded.patientId).toBe(patientId);
  });

  it("should reject tampered or corrupted JWT tokens", async () => {
    const mockUser: AuthenticatedUser = {
      id: "usr_99999",
      email: "patient@example.com",
      phoneNumber: "+15550001111",
      fullName: "Margaret Jenkins",
      systemRole: "PATIENT",
      isActive: true,
    };

    const validToken = await generateAccessToken(mockUser);
    const tamperedToken = validToken.slice(0, -6) + "abcdef";

    await expect(verifyAccessToken(tamperedToken)).rejects.toThrow();
  });

  it("should reject refresh tokens when presented to verifyAccessToken (token type enforcement)", async () => {
    const mockUser: AuthenticatedUser = {
      id: "usr_test_user",
      email: "test@example.com",
      phoneNumber: "+15551112222",
      fullName: "Test User",
      systemRole: "FAMILY_MEMBER",
      isActive: true,
    };

    const refreshToken = await generateRefreshToken(mockUser);

    await expect(verifyAccessToken(refreshToken)).rejects.toThrow("Invalid authentication token.");
  });

  it("should reject access tokens when presented to verifyRefreshToken", async () => {
    const mockUser: AuthenticatedUser = {
      id: "usr_test_user",
      email: "test@example.com",
      phoneNumber: "+15551112222",
      fullName: "Test User",
      systemRole: "FAMILY_MEMBER",
      isActive: true,
    };

    const accessToken = await generateAccessToken(mockUser);

    await expect(verifyRefreshToken(accessToken)).rejects.toThrow("Invalid refresh token.");
  });

  it("should enforce schema validation on tablet unlock passcode formats", () => {
    // Valid 4-digit PIN
    expect(() =>
      TabletUnlockSchema.parse({ deviceFingerprint: "tablet_1", passcode: "1234" })
    ).not.toThrow();

    // Valid 6-digit PIN
    expect(() =>
      TabletUnlockSchema.parse({ deviceFingerprint: "tablet_1", passcode: "123456" })
    ).not.toThrow();

    // Invalid non-numeric
    expect(() =>
      TabletUnlockSchema.parse({ deviceFingerprint: "tablet_1", passcode: "abcd" })
    ).toThrow();

    // Invalid too short (3 digits)
    expect(() =>
      TabletUnlockSchema.parse({ deviceFingerprint: "tablet_1", passcode: "123" })
    ).toThrow();
  });
});
