import { NextRequest } from "next/server";
import { verifyAccessToken } from "../security/jwt";
import { AppError, ErrorCode } from "../errors/app-error";
import { AuthTokenPayload } from "../types/auth";

export interface AuthenticatedRequestContext {
  user: AuthTokenPayload;
}

/**
 * Extracts and verifies Bearer token from the incoming Next.js Request.
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

  return verifyAccessToken(token);
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
