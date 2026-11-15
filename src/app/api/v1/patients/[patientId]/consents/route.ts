import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { AppError, ErrorCode } from "@/core/errors/app-error";
import { GrantConsentSchema } from "@/core/validation/patient.schema";
import { CareCircleService } from "@/modules/care-circle/care-circle.service";

export const GET = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  const access = await verifyPatientAccess(params.patientId, user);
  if (!access.isPatientThemselves && access.circleRole !== "FAMILY_ADMIN") {
    throw new AppError(
      "Only Family Administrators or the Patient can view legal consent records.",
      403,
      ErrorCode.PERMISSION_DENIED
    );
  }

  return CareCircleService.getPatientConsents(params.patientId);
});

export const POST = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  const access = await verifyPatientAccess(params.patientId, user);
  if (!access.isPatientThemselves && access.circleRole !== "FAMILY_ADMIN") {
    throw new AppError(
      "Only Family Administrators or the Patient can grant formal consent.",
      403,
      ErrorCode.PERMISSION_DENIED
    );
  }

  const body = await request.json();
  const validatedInput = GrantConsentSchema.parse(body);
  return CareCircleService.grantConsent(params.patientId, validatedInput, user.sub);
});
