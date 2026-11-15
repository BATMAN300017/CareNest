import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { ChangePasswordSchema } from "@/core/validation/auth.schema";
import { AuthService } from "@/modules/auth/auth.service";

export const POST = handleApiRoute(async (request: NextRequest) => {
  const user = await authenticateRequest(request);
  const body = await request.json();
  const validatedInput = ChangePasswordSchema.parse(body);
  return AuthService.changePassword(user.sub, validatedInput);
});
