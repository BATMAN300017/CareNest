import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { AuthService } from "@/modules/auth/auth.service";

export const POST = handleApiRoute(async (request: NextRequest) => {
  const user = await authenticateRequest(request);
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.split(" ")[1] || "";
  return AuthService.logoutUser(token, user.sub);
});
