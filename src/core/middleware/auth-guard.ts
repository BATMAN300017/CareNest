import { NextRequest } from "next/server";
import { verifyAccessToken, hashToken } from "../security/jwt";
import { prisma } from "../database/prisma";
import { AppError, ErrorCode } from "../errors/app-error";
import { AuthTokenPayload } from "../types/auth";

export interface AuthenticatedRequestContext {
  user: AuthTokenPayload;
}

/**
 * Extracts and verifies Bearer token from the incoming Next.js Request.
 * Also checks if the token has been revoked on logout.
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthTokenPayload> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    throw new AppError("Authorization header is missing", 401, ErrorCode.UNAUTHORIZED);
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AppError("Invalid authorization header format (expected 'Bearer <token>')", 401, ErrorCode.UNAUTHORIZED);
  }

  const payload = await verifyAccessToken(token);

  // Check if token has been revoked on logout
  const tokenHash = hashToken(token);
  const isRevoked = await prisma.revokedToken.findUnique({
    where: { tokenHash },
  });

  if (isRevoked) {
    throw new AppError("Session has been invalidated. Please log in again.", 401, ErrorCode.UNAUTHORIZED);
  }

  return payload;
}

/**
 * Validates that the authenticated user possesses one of the required system roles.
 */
export function requireSystemRoles(user: AuthTokenPayload, allowedRoles: string[]) {
  if (!allowedRoles.includes(user.role)) {
    throw new AppError(
      `Access denied. Role '${user.role}' is not authorized for this action.`,
      403,
      ErrorCode.FORBIDDEN
    );
  }
}
