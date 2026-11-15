import { SignJWT, jwtVerify } from "jose";
import { AuthTokenPayload, AuthenticatedUser } from "../types/auth";
import { AppError, ErrorCode } from "../errors/app-error";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "carenest_super_secret_jwt_signing_key_production_32_bytes_min!"
);

const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "carenest_super_secret_refresh_key_production_32_bytes_min!"
);

const ACCESS_TOKEN_EXPIRATION = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRATION = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Generates an Access Token for authenticated sessions.
 */
export async function generateAccessToken(user: AuthenticatedUser, patientId?: string): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.systemRole,
    type: "access",
    patientId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
    .sign(JWT_SECRET);
}

/**
 * Generates a long-lived Refresh Token.
 */
export async function generateRefreshToken(user: AuthenticatedUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.systemRole,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRATION)
    .sign(JWT_REFRESH_SECRET);
}

/**
 * Generates a scoped Senior Tablet Kiosk token (ephemeral session for tablet interactions).
 */
export async function generateTabletKioskToken(patientId: string, deviceFingerprint: string): Promise<string> {
  return new SignJWT({
    sub: `kiosk:${deviceFingerprint}`,
    type: "tablet_kiosk",
    patientId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

/**
 * Verifies an incoming access token or tablet kiosk token.
 */
export async function verifyAccessToken(token: string): Promise<AuthTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthTokenPayload;
  } catch (err: any) {
    if (err?.code === "ERR_JWT_EXPIRED") {
      throw new AppError("Session token has expired. Please log in again.", 401, ErrorCode.TOKEN_EXPIRED);
    }
    throw new AppError("Invalid authentication token.", 401, ErrorCode.INVALID_TOKEN);
  }
}

/**
 * Verifies a refresh token.
 */
export async function verifyRefreshToken(token: string): Promise<AuthTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    if (payload.type !== "refresh") {
      throw new AppError("Invalid token type for refresh.", 401, ErrorCode.INVALID_TOKEN);
    }
    return payload as unknown as AuthTokenPayload;
  } catch (err: any) {
    if (err?.code === "ERR_JWT_EXPIRED") {
      throw new AppError("Refresh token has expired. Please log in again.", 401, ErrorCode.TOKEN_EXPIRED);
    }
    throw new AppError("Invalid refresh token.", 401, ErrorCode.INVALID_TOKEN);
  }
}
