import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { UpdateNotificationPreferencesSchema } from "@/core/validation/notification.schema";
import { PreferencesService } from "@/modules/notifications/preferences.service";

export const GET = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canViewRecords");

    return PreferencesService.getPreferences(params.patientId);
  }
);

export const PATCH = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canManageMedications");

    const body = await request.json();
    const validatedInput = UpdateNotificationPreferencesSchema.parse(body);

    return PreferencesService.updatePreferences(params.patientId, validatedInput, user.sub);
  }
);
