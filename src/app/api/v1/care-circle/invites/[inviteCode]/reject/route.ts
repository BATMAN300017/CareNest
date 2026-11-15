import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { CareCircleService } from "@/modules/care-circle/care-circle.service";

export const POST = handleApiRoute(
  async (request: NextRequest, { params }: { params: { inviteCode: string } }) => {
    const user = await authenticateRequest(request);
    return CareCircleService.rejectInvite(user.sub, params.inviteCode);
  }
);
