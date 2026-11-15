import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { NotificationService } from "@/modules/notifications/notification.service";

export const PATCH = handleApiRoute(
  async (
    request: NextRequest,
    { params }: { params: { patientId: string; notificationId: string } }
  ) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canViewRecords");

    return NotificationService.markAsRead(params.notificationId, params.patientId);
  }
);
