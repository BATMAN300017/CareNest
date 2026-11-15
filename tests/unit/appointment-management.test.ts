import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppointmentService } from "../../src/modules/appointments/appointment.service";
import { AuditService } from "../../src/modules/audit/audit.service";
import { prisma } from "../../src/core/database/prisma";
import { CreateAppointmentSchema } from "../../src/core/validation/appointment.schema";

describe("Doctor Appointment Management Unit Tests", () => {
  const patientId = "pat_margaret_101";
  const actorId = "usr_sarah_admin";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuditService, "log").mockResolvedValue(undefined);
  });

  it("should create an appointment with doctor details, transport notes, and log audit event", async () => {
    const mockDoctor = {
      id: "doc_chen_1",
      fullName: "Dr. Robert Chen",
      specialty: "Cardiology",
      clinicName: "Metro Heart Institute",
    };

    vi.spyOn(prisma.doctor, "findUnique").mockResolvedValue(mockDoctor as any);
    vi.spyOn(prisma.appointment, "create").mockResolvedValue({
      id: "apt_1",
      patientId,
      doctorId: mockDoctor.id,
      title: "Quarterly Cardiac Review",
      appointmentDatetimeUtc: new Date("2026-11-20T14:00:00Z"),
      locationAddress: "100 Medical Center Blvd, Suite 400",
      status: "SCHEDULED",
      transportBooked: true,
      transportServiceName: "SilverRide Senior Escort",
      doctor: mockDoctor,
    } as any);

    const input = {
      doctorId: mockDoctor.id,
      title: "Quarterly Cardiac Review",
      appointmentDatetime: "2026-11-20T14:00:00Z",
      locationAddress: "100 Medical Center Blvd, Suite 400",
      durationMinutes: 45,
      transportBooked: true,
      transportServiceName: "SilverRide Senior Escort",
      timezone: "America/New_York",
    };

    const result = await AppointmentService.createAppointment(patientId, input, actorId);

    expect(result.id).toBe("apt_1");
    expect(result.title).toBe("Quarterly Cardiac Review");
    expect(result.transportBooked).toBe(true);
    expect(AuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "APPOINTMENT_SCHEDULED",
        resourceId: "apt_1",
        patientId,
      })
    );
  });

  it("should update appointment details and record previous and new states in audit log", async () => {
    const existing = {
      id: "apt_1",
      patientId,
      title: "Routine Checkup",
      durationMinutes: 30,
      locationAddress: "Old Clinic Address",
    };

    vi.spyOn(prisma.appointment, "findUnique").mockResolvedValue(existing as any);
    vi.spyOn(prisma.appointment, "update").mockResolvedValue({
      ...existing,
      locationAddress: "New Hospital Pavilion",
      durationMinutes: 60,
    } as any);

    const updated = await AppointmentService.updateAppointment(
      "apt_1",
      patientId,
      { locationAddress: "New Hospital Pavilion", durationMinutes: 60 },
      actorId
    );

    expect(updated.locationAddress).toBe("New Hospital Pavilion");
    expect(updated.durationMinutes).toBe(60);
    expect(AuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "APPOINTMENT_UPDATED" })
    );
  });

  it("should cancel an appointment with a mandatory cancellation reason", async () => {
    const existing = {
      id: "apt_1",
      patientId,
      status: "SCHEDULED",
    };

    vi.spyOn(prisma.appointment, "findUnique").mockResolvedValue(existing as any);
    vi.spyOn(prisma.appointment, "update").mockResolvedValue({
      ...existing,
      status: "CANCELLED",
      cancellationReason: "Doctor rescheduled due to urgent hospital surgery",
    } as any);

    const cancelled = await AppointmentService.cancelAppointment(
      "apt_1",
      patientId,
      "Doctor rescheduled due to urgent hospital surgery",
      actorId
    );

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancellationReason).toContain("Doctor rescheduled");
    expect(AuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "APPOINTMENT_CANCELLED",
        newState: expect.objectContaining({ status: "CANCELLED" }),
      })
    );
  });

  it("should calculate upcoming appointments with 24-hour and 48-hour reminder alert flags", async () => {
    const now = new Date();
    const in12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const in36Hours = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    const in4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    const mockAppointments = [
      {
        id: "apt_soon",
        patientId,
        title: "Blood Pressure Follow-up",
        appointmentDatetimeUtc: in12Hours,
        doctorName: "Dr. Chen",
        status: "CONFIRMED",
      },
      {
        id: "apt_mid",
        patientId,
        title: "Endocrinology Consult",
        appointmentDatetimeUtc: in36Hours,
        doctorName: "Dr. Patel",
        status: "SCHEDULED",
      },
      {
        id: "apt_later",
        patientId,
        title: "Annual Eye Exam",
        appointmentDatetimeUtc: in4Days,
        doctorName: "Dr. Evans",
        status: "SCHEDULED",
      },
    ];

    vi.spyOn(prisma.appointment, "findMany").mockResolvedValue(mockAppointments as any);

    const upcoming = await AppointmentService.getUpcomingAppointments(patientId, 7);

    expect(upcoming).toHaveLength(3);

    const soon = upcoming[0];
    expect(soon.isWithin24Hours).toBe(true);
    expect(soon.isWithin48Hours).toBe(true);

    const mid = upcoming[1];
    expect(mid.isWithin24Hours).toBe(false);
    expect(mid.isWithin48Hours).toBe(true);

    const later = upcoming[2];
    expect(later.isWithin24Hours).toBe(false);
    expect(later.isWithin48Hours).toBe(false);
  });

  it("should reject appointment creation with invalid datetime format via Zod schema", () => {
    const invalidInput = {
      title: "Dental Cleaning",
      appointmentDatetime: "not-a-valid-date",
      locationAddress: "123 Smile Way",
    };

    expect(() => CreateAppointmentSchema.parse(invalidInput)).toThrow(
      "Invalid appointment ISO datetime format"
    );
  });

  it("should reject appointment creation if doctorId does not exist in registry", async () => {
    vi.spyOn(prisma.doctor, "findUnique").mockResolvedValue(null);

    await expect(
      AppointmentService.createAppointment(
        patientId,
        {
          doctorId: "doc_nonexistent",
          title: "Checkup",
          appointmentDatetime: new Date(Date.now() + 86400000).toISOString(),
          locationAddress: "123 Health Ave",
        },
        actorId
      )
    ).rejects.toThrow("Doctor not found.");
  });

  it("should reject appointment cancellation if appointment belongs to another patient (cross-patient breach)", async () => {
    vi.spyOn(prisma.appointment, "findUnique").mockResolvedValue({
      id: "apt_other",
      patientId: "pat_different_patient",
      title: "Cardiac Review",
    } as any);

    await expect(
      AppointmentService.cancelAppointment("apt_other", patientId, "Patient request", actorId)
    ).rejects.toThrow("Appointment not found.");
  });
});
