import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { AppointmentService } from "@/modules/appointments/appointment.service";

export const GET = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canViewRecords");

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7", 10);

    return AppointmentService.getUpcomingAppointments(params.patientId, days);
  }
);
