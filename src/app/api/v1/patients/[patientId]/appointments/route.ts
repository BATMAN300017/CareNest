import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { CreateAppointmentSchema, FilterAppointmentSchema } from "@/core/validation/appointment.schema";
import { AppointmentService } from "@/modules/appointments/appointment.service";

export const GET = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  await verifyPatientAccess(params.patientId, user, "canViewRecords");

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const upcoming = searchParams.get("upcoming") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const filter = FilterAppointmentSchema.parse({
    status: status as any,
    upcoming: upcoming as any,
    startDate,
    endDate,
  });

  return AppointmentService.getPatientAppointments(params.patientId, filter);
});

export const POST = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  await verifyPatientAccess(params.patientId, user, "canManageAppointments");

  const body = await request.json();
  const validatedInput = CreateAppointmentSchema.parse(body);
  return AppointmentService.createAppointment(params.patientId, validatedInput, user.sub);
});
