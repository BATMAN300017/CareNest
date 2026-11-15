import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { CancelAppointmentSchema } from "@/core/validation/appointment.schema";
import { AppointmentService } from "@/modules/appointments/appointment.service";

export const POST = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string; appointmentId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canManageAppointments");

    const body = await request.json();
    const validatedInput = CancelAppointmentSchema.parse(body);

    return AppointmentService.cancelAppointment(params.appointmentId, params.patientId, validatedInput.reason, user.sub);
  }
);
