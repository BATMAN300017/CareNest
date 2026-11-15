import { prisma } from "../../core/database/prisma";
import { NotificationDispatcherService } from "../../modules/notifications/notification-dispatcher.service";

export class AppointmentReminderScheduler {
  /**
   * Sweeps upcoming appointments and queues advance reminders (24 hours and 2 hours out).
   * Runs periodically (e.g. every 15 minutes).
   */
  static async sweepUpcomingAppointmentReminders(referenceTime: Date = new Date()) {
    const now = referenceTime.getTime();

    // 1. 24-Hour Reminder Window (23h to 25h ahead)
    const window24hStart = new Date(now + 23 * 60 * 60 * 1000);
    const window24hEnd = new Date(now + 25 * 60 * 60 * 1000);

    const appointments24h = await prisma.appointment.findMany({
      where: {
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        appointmentDatetimeUtc: {
          gte: window24hStart,
          lte: window24hEnd,
        },
      },
      include: {
        patient: {
          include: {
            careCircleMembers: {
              where: { isActive: true },
              include: { user: true },
            },
          },
        },
        doctor: true,
      },
    });

    const queuedNotifications = [];

    for (const apt of appointments24h) {
      if (!apt.patient.appointmentRemindersEnabled) continue;

      // Duplicate check: ensure 24h reminder not already queued/delivered for this appointment
      const existing = await prisma.notification.findFirst({
        where: {
          referenceId: apt.id,
          eventType: "APPOINTMENT_REMINDER_24H",
        },
      });

      if (!existing) {
        const doctorName = apt.doctorName || apt.doctor?.fullName || "Doctor";
        const clinicName = apt.clinicName || apt.doctor?.clinicName || apt.locationAddress;

        // In-app / SMS to Patient
        const notif = await prisma.notification.create({
          data: {
            patientId: apt.patientId,
            recipientUserId: apt.patient.userId || apt.patientId,
            eventType: "APPOINTMENT_REMINDER_24H",
            channel: apt.patient.smsRemindersEnabled ? "SMS" : "IN_APP",
            title: `Appointment Tomorrow: ${apt.title}`,
            body: `Reminder: You have an appointment with ${doctorName} tomorrow at ${apt.locationAddress}. ${apt.transportBooked ? `Transportation confirmed via ${apt.transportServiceName || "Senior Ride"}.` : ""}`,
            status: "QUEUED",
            referenceId: apt.id,
            scheduledForUtc: apt.appointmentDatetimeUtc,
          },
        });

        NotificationDispatcherService.dispatch(notif.id).catch(() => {});
        queuedNotifications.push(notif);
      }
    }

    // 2. 2-Hour Reminder Window (1h to 2.5h ahead)
    const window2hStart = new Date(now + 1 * 60 * 60 * 1000);
    const window2hEnd = new Date(now + 2.5 * 60 * 60 * 1000);

    const appointments2h = await prisma.appointment.findMany({
      where: {
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        appointmentDatetimeUtc: {
          gte: window2hStart,
          lte: window2hEnd,
        },
      },
      include: {
        patient: {
          include: {
            careCircleMembers: {
              where: { isActive: true },
              include: { user: true },
            },
          },
        },
        doctor: true,
      },
    });

    for (const apt of appointments2h) {
      if (!apt.patient.appointmentRemindersEnabled) continue;

      const existing = await prisma.notification.findFirst({
        where: {
          referenceId: apt.id,
          eventType: "APPOINTMENT_REMINDER_2H",
        },
      });

      if (!existing) {
        const notif = await prisma.notification.create({
          data: {
            patientId: apt.patientId,
            recipientUserId: apt.patient.userId || apt.patientId,
            eventType: "APPOINTMENT_REMINDER_2H",
            channel: "IN_APP",
            title: `Upcoming Appointment in 2 Hours: ${apt.title}`,
            body: `Your appointment is coming up shortly at ${apt.locationAddress}. ${apt.preparationInstructions ? `Preparation note: ${apt.preparationInstructions}` : ""}`,
            status: "QUEUED",
            referenceId: apt.id,
            scheduledForUtc: apt.appointmentDatetimeUtc,
          },
        });

        NotificationDispatcherService.dispatch(notif.id).catch(() => {});
        queuedNotifications.push(notif);
      }
    }

    return {
      remindersEvaluated24h: appointments24h.length,
      remindersEvaluated2h: appointments2h.length,
      queuedTotal: queuedNotifications.length,
    };
  }
}
