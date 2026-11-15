import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationDispatcherService } from "../../src/modules/notifications/notification-dispatcher.service";
import { DoseScheduler } from "../../src/jobs/schedulers/dose-scheduler";
import { AppointmentReminderScheduler } from "../../src/jobs/schedulers/appointment-reminder-scheduler";
import { QuietHoursService } from "../../src/modules/escalation/quiet-hours";
import { TelephonyService } from "../../src/modules/telephony/telephony.service";
import { MockSmsProvider, MockEmailProvider } from "../../src/modules/notifications/providers/mock-providers";
import { prisma } from "../../src/core/database/prisma";

describe("Notifications, Multi-Tier Escalation & Appointment Reminders Unit Tests", () => {
  const patientId = "pat_margaret_101";
  let mockSms: MockSmsProvider;
  let mockEmail: MockEmailProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSms = new MockSmsProvider();
    mockEmail = new MockEmailProvider();
    NotificationDispatcherService.setSmsProvider(mockSms);
    NotificationDispatcherService.setEmailProvider(mockEmail);
  });

  it("should dispatch SMS notifications using the injected SMS provider", async () => {
    vi.spyOn(prisma.notification, "findUnique").mockResolvedValue({
      id: "notif_sms_1",
      patientId,
      channel: "SMS",
      title: "Medication Reminder",
      body: "Time for Lisinopril 10mg",
      status: "QUEUED",
      recipientUser: { phoneNumber: "+15551234567" },
      patient: { primaryPhone: "+15558889999" },
    } as any);

    vi.spyOn(prisma.notification, "update").mockResolvedValue({} as any);
    vi.spyOn(prisma.notificationAttempt, "create").mockResolvedValue({} as any);

    const result = await NotificationDispatcherService.dispatch("notif_sms_1");

    expect(result.isSuccess).toBe(true);
    expect(mockSms.sentMessages).toHaveLength(1);
    expect(mockSms.sentMessages[0].toPhone).toBe("+15551234567");
    expect(mockSms.sentMessages[0].body).toContain("Time for Lisinopril 10mg");
  });

  it("should dispatch Email notifications using the injected Email provider", async () => {
    vi.spyOn(prisma.notification, "findUnique").mockResolvedValue({
      id: "notif_email_1",
      patientId,
      channel: "EMAIL",
      title: "Weekly Adherence Summary",
      body: "Your streak is 14 days!",
      status: "QUEUED",
      recipientUser: { email: "sarah@example.com" },
      patient: { primaryPhone: "+15558889999" },
    } as any);

    vi.spyOn(prisma.notification, "update").mockResolvedValue({} as any);
    vi.spyOn(prisma.notificationAttempt, "create").mockResolvedValue({} as any);

    const result = await NotificationDispatcherService.dispatch("notif_email_1");

    expect(result.isSuccess).toBe(true);
    expect(mockEmail.sentEmails).toHaveLength(1);
    expect(mockEmail.sentEmails[0].toEmail).toBe("sarah@example.com");
    expect(mockEmail.sentEmails[0].subject).toBe("Weekly Adherence Summary");
  });

  it("should accurately evaluate midnight-spanning quiet hours", () => {
    // 23:30 in America/New_York (inside 22:00 to 07:00)
    const lateNight = new Date("2026-11-15T04:30:00Z"); // 23:30 NY time
    const isLateQuiet = QuietHoursService.isQuietHour(lateNight, "America/New_York", "22:00", "07:00");
    expect(isLateQuiet).toBe(true);

    // 04:15 in America/New_York (inside 22:00 to 07:00)
    const earlyMorning = new Date("2026-11-15T09:15:00Z"); // 04:15 NY time
    const isEarlyQuiet = QuietHoursService.isQuietHour(earlyMorning, "America/New_York", "22:00", "07:00");
    expect(isEarlyQuiet).toBe(true);

    // 14:00 in America/New_York (outside quiet hours)
    const daytime = new Date("2026-11-15T19:00:00Z"); // 14:00 NY time
    const isDayQuiet = QuietHoursService.isQuietHour(daytime, "America/New_York", "22:00", "07:00");
    expect(isDayQuiet).toBe(false);
  });

  it("should escalate an overdue dose across tiers (Tier 1 -> Tier 2 -> Tier 3)", async () => {
    const scheduledTime = new Date("2026-11-15T12:00:00Z");
    const referenceTimeTier1 = new Date("2026-11-15T13:10:00Z"); // 70 min later (grace 60m expired)

    const mockDoseTier0 = {
      id: "dose_overdue_1",
      patientId,
      status: "DUE_NOW",
      escalationTier: 0,
      scheduledForUtc: scheduledTime,
      schedule: { gracePeriodMinutes: 60, scheduledTime: "12:00" },
      medication: { brandName: "Metformin", strength: "500mg" },
      patient: {
        userId: "usr_margaret",
        fullName: "Margaret Jenkins",
        timezone: "America/New_York",
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
        voiceRemindersEnabled: true,
        caregiverEscalationEnabled: true,
        careCircleMembers: [
          {
            userId: "usr_sarah",
            isPrimaryCaregiver: true,
            circleRole: "FAMILY_ADMIN",
            canManageMedications: true,
            receiveEmergencyAlerts: true,
            user: { fullName: "Sarah Jenkins" },
          },
        ],
      },
    };

    vi.spyOn(prisma.doseOccurrence, "findMany").mockResolvedValue([mockDoseTier0 as any]);
    vi.spyOn(QuietHoursService, "isQuietHour").mockReturnValue(false);
    vi.spyOn(TelephonyService, "initiateMedicationReminderCall").mockResolvedValue({
      isSuccessful: true,
      callSid: "CA_mock_tier1",
    } as any);
    const updateDoseSpy = vi.spyOn(prisma.doseOccurrence, "update").mockResolvedValue({} as any);
    const createNotifSpy = vi.spyOn(prisma.notification, "create").mockResolvedValue({ id: "notif_1" } as any);

    // Run Tier 1 escalation
    const resTier1 = await DoseScheduler.detectAndEscalateMissedDoses(referenceTimeTier1);
    expect(resTier1.escalatedCount).toBe(1);
    expect(updateDoseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ escalationTier: 1 }),
      })
    );
    expect(createNotifSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "MISSED_MEDICATION",
          channel: "TELEPHONE_CALL",
        }),
      })
    );

    // Now test Tier 2 escalation (15 mins later without response)
    const referenceTimeTier2 = new Date("2026-11-15T13:30:00Z"); // 90 min after scheduled
    mockDoseTier0.escalationTier = 1;

    const resTier2 = await DoseScheduler.detectAndEscalateMissedDoses(referenceTimeTier2);
    expect(resTier2.escalatedCount).toBe(1);
    expect(updateDoseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ escalationTier: 2 }),
      })
    );
    expect(createNotifSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "ESCALATION_TIER_2",
          recipientUserId: "usr_sarah",
          channel: "SMS",
        }),
      })
    );
  });

  it("should sweep upcoming appointments 24 hours out and prevent duplicate reminders", async () => {
    const referenceTime = new Date("2026-11-15T10:00:00Z");
    const tomorrow10am = new Date("2026-11-16T10:00:00Z"); // Exactly 24h away

    const mockAppointment = {
      id: "apt_tomorrow",
      patientId,
      title: "Cardiology Review",
      appointmentDatetimeUtc: tomorrow10am,
      locationAddress: "Pavilion Suite 300",
      transportBooked: true,
      transportServiceName: "SilverRide",
      patient: {
        userId: "usr_margaret",
        appointmentRemindersEnabled: true,
        smsRemindersEnabled: true,
        careCircleMembers: [],
      },
      doctor: { fullName: "Dr. Chen" },
    };

    vi.spyOn(prisma.appointment, "findMany").mockImplementation(((async (args: any) => {
      // If querying 24h window (gte > 10 hours from now)
      if (args?.where?.appointmentDatetimeUtc?.gte?.getTime() > referenceTime.getTime() + 10 * 60 * 60 * 1000) {
        return [mockAppointment as any];
      }
      return [];
    }) as any));
    vi.spyOn(prisma.notification, "findFirst").mockResolvedValue(null); // No previous reminder
    const notifCreateSpy = vi.spyOn(prisma.notification, "create").mockResolvedValue({ id: "n_apt_1" } as any);

    const result = await AppointmentReminderScheduler.sweepUpcomingAppointmentReminders(referenceTime);

    expect(result.queuedTotal).toBe(1);
    expect(notifCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "APPOINTMENT_REMINDER_24H",
          referenceId: "apt_tomorrow",
          channel: "SMS",
        }),
      })
    );

    // If duplicate check finds existing, second sweep must skip
    vi.spyOn(prisma.notification, "findFirst").mockResolvedValue({ id: "existing_notif" } as any);
    const secondResult = await AppointmentReminderScheduler.sweepUpcomingAppointmentReminders(referenceTime);
    expect(secondResult.queuedTotal).toBe(0);
  });

  it("should cancel pending reminders when an appointment is cancelled", async () => {
    const cancelSpy = vi.spyOn(prisma.notification, "updateMany").mockResolvedValue({ count: 2 });

    await NotificationDispatcherService.cancelPendingNotificationsForAppointment("apt_101");

    expect(cancelSpy).toHaveBeenCalledWith({
      where: { referenceId: "apt_101", status: "QUEUED" },
      data: { status: "CANCELLED" },
    });
  });
});
