import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { AppError, ErrorCode } from "@/core/errors/app-error";
import { CreateCareCircleInviteSchema } from "@/core/validation/patient.schema";
import { CareCircleService } from "@/modules/care-circle/care-circle.service";

export const GET = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  const access = await verifyPatientAccess(params.patientId, user);
  if (!access.isPatientThemselves && access.circleRole !== "FAMILY_ADMIN") {
    throw new AppError(
      "Only Family Administrators or the Patient can view pending invitations.",
      403,
      ErrorCode.PERMISSION_DENIED
    );
  }

  return CareCircleService.getPendingInvites(params.patientId);
});

export const POST = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  // Only Family Admin or Patient themselves can issue invitations
  const access = await verifyPatientAccess(params.patientId, user);
  if (!access.isPatientThemselves && access.circleRole !== "FAMILY_ADMIN") {
    throw new AppError(
      "Only Family Administrators or the Patient can invite new Care Circle members.",
      403,
      ErrorCode.PERMISSION_DENIED
    );
  }

  const body = await request.json();
  const validatedInput = CreateCareCircleInviteSchema.parse(body);
  return CareCircleService.createInvite(params.patientId, user.sub, validatedInput);
});
