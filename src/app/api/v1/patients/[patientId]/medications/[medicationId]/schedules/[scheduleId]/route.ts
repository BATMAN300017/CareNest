import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { UpdateMedicationScheduleSchema } from "@/core/validation/medication.schema";
import { MedicationService } from "@/modules/medications/medication.service";

export const PATCH = handleApiRoute(
  async (
    request: NextRequest,
    { params }: { params: { patientId: string; medicationId: string; scheduleId: string } }
  ) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canManageMedications");
    const body = await request.json();
    const validatedInput = UpdateMedicationScheduleSchema.parse(body);
    return MedicationService.updateSchedule(
      params.scheduleId,
      params.medicationId,
      params.patientId,
      validatedInput,
      user.sub
    );
  }
);

export const DELETE = handleApiRoute(
  async (
    request: NextRequest,
    { params }: { params: { patientId: string; medicationId: string; scheduleId: string } }
  ) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canManageMedications");
    return MedicationService.deleteSchedule(
      params.scheduleId,
      params.medicationId,
      params.patientId,
      user.sub
    );
  }
);
