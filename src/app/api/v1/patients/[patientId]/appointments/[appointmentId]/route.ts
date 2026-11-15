import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { UpdateAppointmentSchema, CancelAppointmentSchema } from "@/core/validation/appointment.schema";
import { AppointmentService } from "@/modules/appointments/appointment.service";

export const GET = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string; appointmentId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canViewRecords");
    return AppointmentService.getAppointmentById(params.appointmentId, params.patientId);
  }
);

export const PATCH = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string; appointmentId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canManageAppointments");

    const body = await request.json();
    const validatedInput = UpdateAppointmentSchema.parse(body);
    return AppointmentService.updateAppointment(params.appointmentId, params.patientId, validatedInput, user.sub);
  }
);

export const DELETE = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string; appointmentId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canManageAppointments");

    const { searchParams } = new URL(request.url);
    let reason = searchParams.get("reason") || "Appointment cancelled by user";

    const body = await request.json().catch(() => null);
    if (body?.reason) {
      reason = body.reason;
    }

    const validated = CancelAppointmentSchema.parse({ reason });
    return AppointmentService.cancelAppointment(params.appointmentId, params.patientId, validated.reason, user.sub);
  }
);
