import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { AdherenceService } from "@/modules/adherence/adherence.service";

export const GET = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  await verifyPatientAccess(params.patientId, user);

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const targetDate = dateStr ? new Date(dateStr) : new Date();

  return AdherenceService.getDosesForDay(params.patientId, targetDate);
});
