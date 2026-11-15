import { prisma } from "../../core/database/prisma";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import { CreateAppointmentInput, CreateDoctorInput } from "../../core/validation/appointment.schema";
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
   * Lists all doctors.
   */
  static async getDoctors() {
    return prisma.doctor.findMany({
      orderBy: { fullName: "asc" },
    });
  }

  /**
   * Schedules a doctor appointment with optional transportation escort notes.
   */
  static async createAppointment(
    patientId: string,
    input: CreateAppointmentInput,
    actorUserId: string
  ) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: input.doctorId },
    });

    if (!doctor) {
      throw new AppError("Doctor not found.", 404, ErrorCode.NOT_FOUND);
    }

    const appointmentDatetimeUtc = new Date(input.appointmentDatetime);

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId: input.doctorId,
        title: input.title,
        appointmentDatetimeUtc,
        expectedLocalDatetime: appointmentDatetimeUtc,
        durationMinutes: input.durationMinutes,
        locationAddress: input.locationAddress,
        status: "SCHEDULED",
        transportBooked: input.transportBooked,
        transportServiceName: input.transportServiceName || null,
        transportPickupTime: input.transportPickupTime ? new Date(input.transportPickupTime) : null,
        transportNotes: input.transportNotes || null,
        visitNotes: input.visitNotes || null,
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
   * Retrieves all appointments for a patient.
   */
  static async getPatientAppointments(patientId: string) {
    return prisma.appointment.findMany({
      where: { patientId },
      include: { doctor: true },
      orderBy: { appointmentDatetimeUtc: "asc" },
    });
  }
}
