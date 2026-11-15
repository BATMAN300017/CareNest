import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { CreateAppointmentSchema } from "@/core/validation/appointment.schema";
import { AppointmentService } from "@/modules/appointments/appointment.service";

export const GET = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  await verifyPatientAccess(params.patientId, user, "canManageAppointments");
  return AppointmentService.getPatientAppointments(params.patientId);
});

export const POST = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  await verifyPatientAccess(params.patientId, user, "canManageAppointments");

  const body = await request.json();
  const validatedInput = CreateAppointmentSchema.parse(body);
  return AppointmentService.createAppointment(params.patientId, validatedInput, user.sub);
});
