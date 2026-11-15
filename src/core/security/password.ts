import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt with high work factor.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hashes a 4-6 digit quick PIN for elderly tablet kiosk access.
 * Uses HMAC-SHA256 with a dedicated server salt to prevent rainbow table attacks on low-entropy PINs.
 */
export function hashQuickPasscode(passcode: string): string {
  const pinSalt = process.env.TABLET_KIOSK_PIN_SALT || "carenest_senior_kiosk_pin_salt_default_2026";
  return crypto.createHmac("sha256", pinSalt).update(passcode).digest("hex");
}

/**
 * Verifies a 4-6 digit quick PIN against a stored hash using constant-time comparison.
 */
export function verifyQuickPasscode(passcode: string, storedHash: string): boolean {
  const computedHash = hashQuickPasscode(passcode);
  const a = Buffer.from(computedHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
