import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { RecordHealthVitalSchema, LogHydrationGlassSchema } from "@/core/validation/vitals.schema";
import { VitalsService } from "@/modules/vitals/vitals.service";

export const GET = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  await verifyPatientAccess(params.patientId, user, "canViewVitals");

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || undefined;
  const limit = parseInt(searchParams.get("limit") || "30", 10);

  return VitalsService.getPatientVitals(params.patientId, type, limit);
});

export const POST = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  await verifyPatientAccess(params.patientId, user, "canViewVitals");

  const body = await request.json();

  if (body.vitalType === "HYDRATION" && body.glassesCount) {
    const input = LogHydrationGlassSchema.parse(body);
    return VitalsService.logHydrationGlass(params.patientId, input.glassesCount, user.sub);
  }

  const validatedInput = RecordHealthVitalSchema.parse(body);
  return VitalsService.recordVital(params.patientId, validatedInput, user.sub);
});
