import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { CareCircleService } from "@/modules/care-circle/care-circle.service";

export const GET = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  await verifyPatientAccess(params.patientId, user);
  return CareCircleService.getMembers(params.patientId);
});
