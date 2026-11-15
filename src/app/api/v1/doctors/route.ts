import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { CreateDoctorSchema } from "@/core/validation/appointment.schema";
import { AppointmentService } from "@/modules/appointments/appointment.service";

export const GET = handleApiRoute(async (request: NextRequest) => {
  await authenticateRequest(request);
  return AppointmentService.getDoctors();
});

export const POST = handleApiRoute(async (request: NextRequest) => {
  await authenticateRequest(request);
  const body = await request.json();
  const validatedInput = CreateDoctorSchema.parse(body);
  return AppointmentService.createDoctor(validatedInput);
});
