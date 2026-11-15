import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { UpdateUserProfileSchema } from "@/core/validation/auth.schema";
import { AuthService } from "@/modules/auth/auth.service";

export const GET = handleApiRoute(async (request: NextRequest) => {
  const user = await authenticateRequest(request);
  return AuthService.getProfile(user.sub);
});

export const PATCH = handleApiRoute(async (request: NextRequest) => {
  const user = await authenticateRequest(request);
  const body = await request.json();
  const validatedInput = UpdateUserProfileSchema.parse(body);
  return AuthService.updateProfile(user.sub, validatedInput);
});
