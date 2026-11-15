import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { AdherenceReportQuerySchema } from "@/core/validation/adherence.schema";
import { AdherenceService } from "@/modules/adherence/adherence.service";

export const GET = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canViewRecords");

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const medicationId = searchParams.get("medicationId") || undefined;

    const query = AdherenceReportQuerySchema.parse({
      startDate,
      endDate,
      medicationId,
    });

    return AdherenceService.getAdherenceReport(params.patientId, query);
  }
);
