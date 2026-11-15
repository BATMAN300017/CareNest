import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { CreateMedicationSchema, FilterMedicationSchema } from "@/core/validation/medication.schema";
import { MedicationService } from "@/modules/medications/medication.service";

export const GET = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  await verifyPatientAccess(params.patientId, user, "canViewRecords");

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") || "active";
  const searchParam = searchParams.get("search") || undefined;

  const filter = FilterMedicationSchema.parse({
    status: statusParam,
    search: searchParam,
  });

  return MedicationService.getPatientMedications(params.patientId, filter);
});

export const POST = handleApiRoute(async (request: NextRequest, { params }: { params: { patientId: string } }) => {
  const user = await authenticateRequest(request);
  await verifyPatientAccess(params.patientId, user, "canManageMedications");
  const body = await request.json();
  const validatedInput = CreateMedicationSchema.parse(body);
  return MedicationService.createMedication(params.patientId, validatedInput, user.sub);
});
