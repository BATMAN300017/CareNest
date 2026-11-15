import { prisma } from "../../core/database/prisma";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  CreateDoctorInput,
  FilterAppointmentInput,
} from "../../core/validation/appointment.schema";
import { AuditService } from "../audit/audit.service";

export class AppointmentService {
  /**
   * Registers a doctor / clinician in the directory.
   */
  static async createDoctor(input: CreateDoctorInput) {
    return prisma.doctor.create({
      data: {
        fullName: input.fullName,
        specialty: input.specialty,
        clinicName: input.clinicName,
        phoneNumber: input.phoneNumber || null,
        email: input.email || null,
        address: input.address || {},
      },
    });
  }

  /**
   * Lists all registered doctors.
   */
  static async getDoctors() {
    return prisma.doctor.findMany({
      orderBy: { fullName: "asc" },
    });
  }

  /**
   * Retrieves a doctor by ID.
   */
  static async getDoctorById(doctorId: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new AppError("Doctor not found.", 404, ErrorCode.NOT_FOUND);
    }

    return doctor;
  }

  /**
   * Schedules a doctor appointment with optional transportation escort notes.
   */
  static async createAppointment(
    patientId: string,
    input: CreateAppointmentInput,
    actorUserId: string
  ) {
    let doctor = null;
    if (input.doctorId) {
      doctor = await prisma.doctor.findUnique({
        where: { id: input.doctorId },
      });
      if (!doctor) {
        throw new AppError("Doctor not found.", 404, ErrorCode.NOT_FOUND);
      }
    }

    const appointmentDatetimeUtc = new Date(input.appointmentDatetime);

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId: input.doctorId || null,
        doctorName: input.doctorName || doctor?.fullName || null,
        specialty: input.specialty || doctor?.specialty || null,
        clinicName: input.clinicName || doctor?.clinicName || null,
        contactPhone: input.contactPhone || doctor?.phoneNumber || null,
        title: input.title,
        appointmentDatetimeUtc,
        expectedLocalDatetime: appointmentDatetimeUtc,
        timezone: input.timezone || "UTC",
        durationMinutes: input.durationMinutes,
        locationAddress: input.locationAddress,
        status: "SCHEDULED",
        transportBooked: input.transportBooked,
        transportServiceName: input.transportServiceName || null,
        transportPickupTime: input.transportPickupTime ? new Date(input.transportPickupTime) : null,
        transportNotes: input.transportNotes || null,
        visitNotes: input.visitNotes || null,
        preparationInstructions: input.preparationInstructions || null,
        followUpInstructions: input.followUpInstructions || null,
      },
      include: { doctor: true },
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "APPOINTMENT_SCHEDULED",
      resourceType: "appointment",
      resourceId: appointment.id,
      newState: input,
    });

    return appointment;
  }

  /**
   * Retrieves a single appointment by ID.
   */
  static async getAppointmentById(appointmentId: string, patientId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true },
    });

    if (!appointment || appointment.patientId !== patientId) {
      throw new AppError("Appointment not found.", 404, ErrorCode.NOT_FOUND);
    }

    return appointment;
  }

  /**
   * Retrieves appointments for a patient with status, date-range, and upcoming filtering.
   */
  static async getPatientAppointments(
    patientId: string,
    filter: FilterAppointmentInput = {}
  ) {
    const now = new Date();
    const where: any = { patientId };

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.upcoming === "true") {
      where.appointmentDatetimeUtc = { gte: now };
      if (!filter.status) {
        where.status = { notIn: ["CANCELLED", "COMPLETED"] };
      }
    } else if (filter.upcoming === "false") {
      where.appointmentDatetimeUtc = { lt: now };
    }

    if (filter.startDate || filter.endDate) {
      where.appointmentDatetimeUtc = {
        ...(where.appointmentDatetimeUtc || {}),
        ...(filter.startDate && { gte: new Date(filter.startDate) }),
        ...(filter.endDate && { lte: new Date(filter.endDate) }),
      };
    }

    return prisma.appointment.findMany({
      where,
      include: { doctor: true },
      orderBy: {
        appointmentDatetimeUtc: filter.upcoming === "false" ? "desc" : "asc",
      },
    });
  }

  /**
   * Updates an existing appointment.
   */
  static async updateAppointment(
    appointmentId: string,
    patientId: string,
    input: UpdateAppointmentInput,
    actorUserId: string
  ) {
    const existing = await this.getAppointmentById(appointmentId, patientId);

    const data: any = {};
    if (input.doctorId !== undefined) data.doctorId = input.doctorId;
    if (input.doctorName !== undefined) data.doctorName = input.doctorName;
    if (input.specialty !== undefined) data.specialty = input.specialty;
    if (input.clinicName !== undefined) data.clinicName = input.clinicName;
    if (input.contactPhone !== undefined) data.contactPhone = input.contactPhone;
    if (input.title !== undefined) data.title = input.title;
    if (input.appointmentDatetime !== undefined) {
      const dt = new Date(input.appointmentDatetime);
      data.appointmentDatetimeUtc = dt;
      data.expectedLocalDatetime = dt;
    }
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
    if (input.locationAddress !== undefined) data.locationAddress = input.locationAddress;
    if (input.status !== undefined) data.status = input.status as any;
    if (input.transportBooked !== undefined) data.transportBooked = input.transportBooked;
    if (input.transportServiceName !== undefined) data.transportServiceName = input.transportServiceName;
    if (input.transportPickupTime !== undefined) {
      data.transportPickupTime = input.transportPickupTime ? new Date(input.transportPickupTime) : null;
    }
    if (input.transportNotes !== undefined) data.transportNotes = input.transportNotes;
    if (input.visitNotes !== undefined) data.visitNotes = input.visitNotes;
    if (input.preparationInstructions !== undefined) data.preparationInstructions = input.preparationInstructions;
    if (input.followUpInstructions !== undefined) data.followUpInstructions = input.followUpInstructions;

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data,
      include: { doctor: true },
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "APPOINTMENT_UPDATED",
      resourceType: "appointment",
      resourceId: appointmentId,
      previousState: existing,
      newState: updated,
    });

    return updated;
  }

  /**
   * Cancels an appointment with required cancellation reason.
   */
  static async cancelAppointment(
    appointmentId: string,
    patientId: string,
    reason: string,
    actorUserId: string
  ) {
    await this.getAppointmentById(appointmentId, patientId);

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        cancellationReason: reason,
      },
      include: { doctor: true },
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "APPOINTMENT_CANCELLED",
      resourceType: "appointment",
      resourceId: appointmentId,
      newState: { status: "CANCELLED", reason },
    });

    return updated;
  }

  /**
   * Exposes upcoming appointments formatted for reminder dispatch and frontend display.
   */
  static async getUpcomingAppointments(patientId: string, daysAhead: number = 7) {
    const now = new Date();
    const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        appointmentDatetimeUtc: {
          gte: now,
          lte: horizon,
        },
      },
      include: { doctor: true },
      orderBy: { appointmentDatetimeUtc: "asc" },
    });

    return appointments.map((apt) => {
      const msUntil = apt.appointmentDatetimeUtc.getTime() - now.getTime();
      const hoursUntil = msUntil / (1000 * 60 * 60);

      return {
        ...apt,
        doctorDisplayName: apt.doctorName || apt.doctor?.fullName || "Doctor",
        specialty: apt.specialty || apt.doctor?.specialty || "General Practice",
        clinicName: apt.clinicName || apt.doctor?.clinicName || "Clinic",
        hoursUntil: Math.round(hoursUntil * 10) / 10,
        isWithin24Hours: hoursUntil <= 24,
        isWithin48Hours: hoursUntil <= 48,
        isToday: hoursUntil <= 14 && apt.appointmentDatetimeUtc.getDate() === now.getDate(),
      };
    });
  }
}
