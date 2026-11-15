import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { NotificationFilterSchema } from "@/core/validation/notification.schema";
import { NotificationService } from "@/modules/notifications/notification.service";

export const GET = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canViewRecords");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const channel = searchParams.get("channel") || undefined;
    const eventType = searchParams.get("eventType") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const filter = NotificationFilterSchema.parse({
      status: status as any,
      channel: channel as any,
      eventType,
      limit,
    });

    return NotificationService.getPatientNotifications(params.patientId, filter);
  }
);
