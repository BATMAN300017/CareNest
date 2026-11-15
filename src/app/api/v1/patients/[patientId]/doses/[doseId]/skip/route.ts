import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { SkipDoseSchema } from "@/core/validation/adherence.schema";
import { AdherenceService } from "@/modules/adherence/adherence.service";

export const POST = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string; doseId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canManageMedications");

    const body = await request.json();
    const validatedInput = SkipDoseSchema.parse(body);

    return AdherenceService.skipDose(params.doseId, params.patientId, user.sub, validatedInput);
  }
);
