import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { AppError, ErrorCode } from "@/core/errors/app-error";
import { CareCircleService } from "@/modules/care-circle/care-circle.service";

export const DELETE = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string; memberId: string } }) => {
    const user = await authenticateRequest(request);
    const access = await verifyPatientAccess(params.patientId, user);
    if (!access.isPatientThemselves && access.circleRole !== "FAMILY_ADMIN") {
      throw new AppError(
        "Only Family Administrators or the Patient can remove Care Circle members.",
        403,
        ErrorCode.PERMISSION_DENIED
      );
    }

    return CareCircleService.revokeMembership(params.patientId, params.memberId, user.sub);
  }
);
