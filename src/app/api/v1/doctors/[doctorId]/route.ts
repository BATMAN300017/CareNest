import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { AppointmentService } from "@/modules/appointments/appointment.service";

export const GET = handleApiRoute(
  async (request: NextRequest, { params }: { params: { doctorId: string } }) => {
    await authenticateRequest(request);
    return AppointmentService.getDoctorById(params.doctorId);
  }
);
