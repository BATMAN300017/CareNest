import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as authGuard from "../../src/core/middleware/auth-guard";
import * as consentGuard from "../../src/core/middleware/consent-guard";
import { MedicationService } from "../../src/modules/medications/medication.service";
import { AdherenceService } from "../../src/modules/adherence/adherence.service";
import { AppointmentService } from "../../src/modules/appointments/appointment.service";
import { AppError, ErrorCode } from "../../src/core/errors/app-error";

// Route handlers
import { GET as getMedicationsHandler } from "../../src/app/api/v1/patients/[patientId]/medications/route";
import {
  GET as getMedicationByIdHandler,
  PATCH as updateMedicationHandler,
  DELETE as deleteMedicationHandler,
} from "../../src/app/api/v1/patients/[patientId]/medications/[medicationId]/route";
import { POST as addScheduleHandler } from "../../src/app/api/v1/patients/[patientId]/medications/[medicationId]/schedules/route";
import { GET as getDailyDosesHandler } from "../../src/app/api/v1/patients/[patientId]/doses/daily/route";
import { POST as skipDoseHandler } from "../../src/app/api/v1/patients/[patientId]/doses/[doseId]/skip/route";
import { GET as getAdherenceReportHandler } from "../../src/app/api/v1/patients/[patientId]/adherence/report/route";
import { GET as getAppointmentsHandler } from "../../src/app/api/v1/patients/[patientId]/appointments/route";
import {
  PATCH as updateAppointmentHandler,
  DELETE as deleteAppointmentHandler,
} from "../../src/app/api/v1/patients/[patientId]/appointments/[appointmentId]/route";
import { GET as getUpcomingAppointmentsHandler } from "../../src/app/api/v1/patients/[patientId]/appointments/upcoming/route";

describe("Medication & Appointment API Route Handlers Integration", () => {
  const patientId = "pat_margaret_101";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authGuard, "authenticateRequest").mockResolvedValue({
      sub: "usr_sarah_admin",
      role: "FAMILY_ADMIN",
      type: "access",
    } as any);

    vi.spyOn(consentGuard, "verifyPatientAccess").mockResolvedValue({
      patientId,
      isPatientThemselves: false,
      circleRole: "FAMILY_ADMIN",
      permissions: {
        canManageMedications: true,
        canManageAppointments: true,
        canViewRecords: true,
      },
    } as any);
  });

  it("should handle GET /patients/:patientId/medications with status query filter", async () => {
    vi.spyOn(MedicationService, "getPatientMedications").mockResolvedValue([
      { id: "med_1", brandName: "Lisinopril", isActive: true },
    ] as any);

    const req = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/medications?status=active`,
      { headers: { Authorization: "Bearer token" } }
    );

    const res = await getMedicationsHandler(req, { params: { patientId } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(MedicationService.getPatientMedications).toHaveBeenCalledWith(
      patientId,
      expect.objectContaining({ status: "active" })
    );
  });

  it("should handle PATCH /patients/:patientId/medications/:medicationId", async () => {
    vi.spyOn(MedicationService, "updateMedication").mockResolvedValue({
      id: "med_1",
      instructions: "Take with breakfast",
    } as any);

    const req = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/medications/med_1`,
      {
        method: "PATCH",
        body: JSON.stringify({ instructions: "Take with breakfast" }),
        headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
      }
    );

    const res = await updateMedicationHandler(req, { params: { patientId, medicationId: "med_1" } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.instructions).toBe("Take with breakfast");
  });

  it("should handle DELETE /patients/:patientId/medications/:medicationId to discontinue prescription", async () => {
    vi.spyOn(MedicationService, "discontinueMedication").mockResolvedValue({
      id: "med_1",
      isActive: false,
      discontinuedReason: "Adverse reaction",
    } as any);

    const req = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/medications/med_1`,
      {
        method: "DELETE",
        body: JSON.stringify({ reason: "Adverse reaction" }),
        headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
      }
    );

    const res = await deleteMedicationHandler(req, { params: { patientId, medicationId: "med_1" } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.isActive).toBe(false);
  });

  it("should handle POST /patients/:patientId/doses/:doseId/skip with clinical reason", async () => {
    vi.spyOn(AdherenceService, "skipDose").mockResolvedValue({
      id: "dose_1",
      status: "SKIPPED",
      skippedReason: "Held due to high blood glucose",
    } as any);

    const req = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/doses/dose_1/skip`,
      {
        method: "POST",
        body: JSON.stringify({ reason: "Held due to high blood glucose" }),
        headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
      }
    );

    const res = await skipDoseHandler(req, { params: { patientId, doseId: "dose_1" } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("SKIPPED");
  });

  it("should handle GET /patients/:patientId/doses/daily for frontend schedule display", async () => {
    vi.spyOn(AdherenceService, "getDailySchedule").mockResolvedValue({
      date: "2026-11-15",
      timezone: "America/New_York",
      progress: { totalDoses: 4, completedDoses: 2, percent: 50 },
      sections: [],
    } as any);

    const req = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/doses/daily`,
      { headers: { Authorization: "Bearer token" } }
    );

    const res = await getDailyDosesHandler(req, { params: { patientId } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.progress.percent).toBe(50);
  });

  it("should handle GET /patients/:patientId/adherence/report", async () => {
    vi.spyOn(AdherenceService, "getAdherenceReport").mockResolvedValue({
      summary: { adherenceRate: 95, streakDays: 14 },
      medicationBreakdown: [],
      disclaimer: "Wellness tracking only.",
    } as any);

    const req = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/adherence/report`,
      { headers: { Authorization: "Bearer token" } }
    );

    const res = await getAdherenceReportHandler(req, { params: { patientId } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.summary.adherenceRate).toBe(95);
  });

  it("should handle appointment routes: GET, PATCH, DELETE, and upcoming", async () => {
    vi.spyOn(AppointmentService, "getPatientAppointments").mockResolvedValue([
      { id: "apt_1", title: "Cardiology Exam" },
    ] as any);

    vi.spyOn(AppointmentService, "updateAppointment").mockResolvedValue({
      id: "apt_1",
      durationMinutes: 60,
    } as any);

    vi.spyOn(AppointmentService, "cancelAppointment").mockResolvedValue({
      id: "apt_1",
      status: "CANCELLED",
      cancellationReason: "Rescheduled by patient",
    } as any);

    vi.spyOn(AppointmentService, "getUpcomingAppointments").mockResolvedValue([
      { id: "apt_1", isWithin24Hours: true },
    ] as any);

    // GET /appointments
    const getReq = new NextRequest(`http://localhost:3000/api/v1/patients/${patientId}/appointments`, {
      headers: { Authorization: "Bearer token" },
    });
    const getRes = await getAppointmentsHandler(getReq, { params: { patientId } });
    expect(getRes.status).toBe(200);

    // PATCH /appointments/:appointmentId
    const patchReq = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/appointments/apt_1`,
      {
        method: "PATCH",
        body: JSON.stringify({ durationMinutes: 60 }),
        headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
      }
    );
    const patchRes = await updateAppointmentHandler(patchReq, {
      params: { patientId, appointmentId: "apt_1" },
    });
    expect(patchRes.status).toBe(200);

    // DELETE /appointments/:appointmentId
    const delReq = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/appointments/apt_1`,
      {
        method: "DELETE",
        body: JSON.stringify({ reason: "Rescheduled by patient" }),
        headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
      }
    );
    const delRes = await deleteAppointmentHandler(delReq, {
      params: { patientId, appointmentId: "apt_1" },
    });
    expect(delRes.status).toBe(200);

    // GET /appointments/upcoming
    const upReq = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/appointments/upcoming?days=7`,
      { headers: { Authorization: "Bearer token" } }
    );
    const upRes = await getUpcomingAppointmentsHandler(upReq, { params: { patientId } });
    expect(upRes.status).toBe(200);
  });

  it("should deny access if caregiver lacks canManageMedications permission", async () => {
    vi.spyOn(consentGuard, "verifyPatientAccess").mockRejectedValue(
      new AppError(
        "Permission denied. You do not have permission 'canManageMedications' for this patient.",
        403,
        ErrorCode.PERMISSION_DENIED
      )
    );

    const req = new NextRequest(
      `http://localhost:3000/api/v1/patients/${patientId}/medications/med_1`,
      {
        method: "PATCH",
        body: JSON.stringify({ strength: "1000mg" }),
        headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
      }
    );

    const res = await updateMedicationHandler(req, { params: { patientId, medicationId: "med_1" } });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ErrorCode.PERMISSION_DENIED);
  });
});
