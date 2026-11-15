import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { CreateMedicationSchema } from "@/core/validation/medication.schema";
import { MedicationService } from "@/modules/medications/medication.service";

export const GET = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  await verifyPatientAccess(params.patientId, user, "canViewRecords");
  return MedicationService.getPatientMedications(params.patientId);
});

export const POST = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  await verifyPatientAccess(params.patientId, user, "canManageMedications");
  const body = await request.json();
  const validatedInput = CreateMedicationSchema.parse(body);
  return MedicationService.createMedication(params.patientId, validatedInput, user.sub);
});
