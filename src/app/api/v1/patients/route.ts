import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { CreatePatientProfileSchema } from "@/core/validation/patient.schema";
import { PatientService } from "@/modules/patients/patient.service";

export const POST = handleApiRoute(async (request: NextRequest) => {
  const user = await authenticateRequest(request);
  const body = await request.json();
  const validatedInput = CreatePatientProfileSchema.parse(body);
  return PatientService.createPatientProfile(user.sub, validatedInput);
});
