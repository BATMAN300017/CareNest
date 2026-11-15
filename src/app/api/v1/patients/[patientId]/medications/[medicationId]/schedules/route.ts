import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { CreateMedicationScheduleSchema } from "@/core/validation/medication.schema";
import { MedicationService } from "@/modules/medications/medication.service";

export const GET = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string; medicationId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canViewRecords");
    return MedicationService.getMedicationSchedules(params.medicationId, params.patientId);
  }
);

export const POST = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string; medicationId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canManageMedications");
    const body = await request.json();
    const validatedInput = CreateMedicationScheduleSchema.parse(body);
    return MedicationService.addSchedule(params.medicationId, params.patientId, validatedInput, user.sub);
  }
);
