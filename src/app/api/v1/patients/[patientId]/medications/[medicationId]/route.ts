import { NextRequest } from "next/server";
import { handleApiRoute } from "@/core/utils/api-handler";
import { authenticateRequest } from "@/core/middleware/auth-guard";
import { verifyPatientAccess } from "@/core/middleware/consent-guard";
import { UpdateMedicationSchema, DiscontinueMedicationSchema } from "@/core/validation/medication.schema";
import { MedicationService } from "@/modules/medications/medication.service";

export const GET = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string; medicationId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canViewRecords");
    return MedicationService.getMedicationById(params.medicationId, params.patientId);
  }
);

export const PATCH = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string; medicationId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canManageMedications");
    const body = await request.json();
    const validatedInput = UpdateMedicationSchema.parse(body);
    return MedicationService.updateMedication(params.medicationId, params.patientId, validatedInput, user.sub);
  }
);

export const DELETE = handleApiRoute(
  async (request: NextRequest, { params }: { params: { patientId: string; medicationId: string } }) => {
    const user = await authenticateRequest(request);
    await verifyPatientAccess(params.patientId, user, "canManageMedications");

    const { searchParams } = new URL(request.url);
    let reason = searchParams.get("reason") || "Prescription discontinued by caregiver/patient";

    const body = await request.json().catch(() => null);
    if (body?.reason) {
      reason = body.reason;
    }

    const validated = DiscontinueMedicationSchema.parse({ reason });
    return MedicationService.discontinueMedication(params.medicationId, params.patientId, validated.reason, user.sub);
  }
);
