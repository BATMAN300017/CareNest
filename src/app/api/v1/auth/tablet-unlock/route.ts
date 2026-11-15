import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { TabletUnlockSchema } from "@/core/validation/auth.schema";
import { AuthService } from "@/modules/auth/auth.service";

export const POST = handleApiRoute(async (request: NextRequest) => {
  const body = await request.json();
  const validatedInput = TabletUnlockSchema.parse(body);
  return AuthService.tabletUnlock(validatedInput);
});
