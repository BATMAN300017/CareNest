import { describe, it, expect, vi, beforeEach } from "vitest";
import { TelephonyService } from "../../src/modules/telephony/telephony.service";
import { TwiMLBuilder } from "../../src/modules/telephony/twiml-builder";
import { MockVoiceProvider } from "../../src/modules/notifications/providers/mock-providers";
import { QuietHoursService } from "../../src/modules/escalation/quiet-hours";
import { AdherenceService } from "../../src/modules/adherence/adherence.service";
import { AuditService } from "../../src/modules/audit/audit.service";
import { prisma } from "../../src/core/database/prisma";

describe("Automated Telephony & Voice Reminder Workflows Unit Tests", () => {
  const patientId = "pat_margaret_101";
  const doseId = "dose_metformin_101";
  let mockVoice: MockVoiceProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVoice = new MockVoiceProvider();
    TelephonyService.setVoiceProvider(mockVoice);
    vi.spyOn(AuditService, "log").mockResolvedValue(undefined);
  });

  it("should generate accessible TwiML with Amazon Polly voice, speech rate, and Gather keypad options", () => {
    const twiml = TwiMLBuilder.buildMedicationReminderPrompt({
      patientName: "Margaret",
      medicationName: "Metformin",
      dosage: "500mg",
      instructions: "Take with lunch",
      actionUrl: "http://localhost:3000/api/v1/telephony/voice/handle-keypad?doseId=d1&patientId=p1",
      preferredLanguage: "en-US",
      voiceSpeed: "SLOW",
    });

    expect(twiml).toContain("<Response>");
    expect(twiml).toContain('<Gather numDigits="1"');
    expect(twiml).toContain('action="http://localhost:3000/api/v1/telephony/voice/handle-keypad?doseId=d1&amp;patientId=p1"');
    expect(twiml).toContain('voice="Polly.Joanna"');
    expect(twiml).toContain('rate="85%"');
    expect(twiml).toContain("Metformin, 500mg");
    expect(twiml).toContain("Press 1 if you have taken it");
    expect(twiml).toContain("Press 4 to connect with your caregiver");
  });

  it("should initiate telephone reminder call to patient's verified phone number", async () => {
    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      fullName: "Margaret Jenkins",
      primaryPhone: "+15558889999",
      timezone: "America/New_York",
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      voiceRemindersEnabled: true,
      voiceSpeed: "NORMAL",
      careCircleMembers: [],
    } as any);

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue({
      id: doseId,
      patientId,
      status: "DUE_NOW",
      medication: { brandName: "Metformin", strength: "500mg", instructions: "With food" },
      schedule: { scheduledTime: "13:00" },
    } as any);

    vi.spyOn(prisma.voiceCallRecord, "findFirst").mockResolvedValue(null);
    vi.spyOn(prisma.voiceCallRecord, "create").mockResolvedValue({ id: "call_1", callSid: "CA_test" } as any);
    vi.spyOn(QuietHoursService, "isQuietHour").mockReturnValue(false);

    const result = await TelephonyService.initiateMedicationReminderCall(patientId, doseId, 1);

    expect((result as any).isSuccessful).toBe(true);
    expect(mockVoice.initiatedCalls).toHaveLength(1);
    expect(mockVoice.initiatedCalls[0].toPhone).toBe("+15558889999");
    expect(prisma.voiceCallRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId,
          doseOccurrenceId: doseId,
          toPhone: "+15558889999",
        }),
      })
    );
  });

  it("should suppress call initiation if patient is currently in quiet hours", async () => {
    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      voiceRemindersEnabled: true,
      timezone: "America/New_York",
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    } as any);

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue({
      id: doseId,
      patientId,
      status: "DUE_NOW",
    } as any);

    // Mock quiet hours returning true
    vi.spyOn(QuietHoursService, "isQuietHour").mockReturnValue(true);

    const result = await TelephonyService.initiateMedicationReminderCall(patientId, doseId, 1);

    expect(result).toEqual({
      skipped: true,
      reason: "Patient is currently within quiet hours",
    });
    expect(mockVoice.initiatedCalls).toHaveLength(0);
  });

  it("should prevent duplicate overlapping phone calls for the same dose occurrence", async () => {
    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      voiceRemindersEnabled: true,
      timezone: "America/New_York",
    } as any);

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue({
      id: doseId,
      patientId,
      status: "DUE_NOW",
    } as any);

    vi.spyOn(QuietHoursService, "isQuietHour").mockReturnValue(false);

    // Active call already ringing
    vi.spyOn(prisma.voiceCallRecord, "findFirst").mockResolvedValue({
      id: "call_active",
      callSid: "CA_in_progress_123",
      status: "in-progress",
    } as any);

    const result = await TelephonyService.initiateMedicationReminderCall(patientId, doseId, 1);

    expect(result).toEqual({
      skipped: true,
      reason: "Call already in progress for this dose",
      callSid: "CA_in_progress_123",
    });
    expect(mockVoice.initiatedCalls).toHaveLength(0);
  });

  it("should process Digit 1 (Taken): confirm dose via TELEPHONE_DTMF, update call record, and cancel pending notifications", async () => {
    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      userId: "usr_senior",
      fullName: "Margaret Jenkins",
      careCircleMembers: [],
    } as any);

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue({
      id: doseId,
      patientId,
      status: "DUE_NOW",
      medication: { brandName: "Metformin" },
    } as any);

    vi.spyOn(AdherenceService, "confirmDose").mockResolvedValue({
      doseOccurrenceId: doseId,
      status: "TAKEN",
      stockRemaining: 29,
      adherenceStreakDays: 14,
    } as any);

    const updateCallSpy = vi.spyOn(prisma.voiceCallRecord, "updateMany").mockResolvedValue({ count: 1 });
    const cancelNotifsSpy = vi.spyOn(prisma.notification, "updateMany").mockResolvedValue({ count: 2 });

    const twiml = await TelephonyService.processKeypadInput(patientId, doseId, "CA_123", "1");

    expect(AdherenceService.confirmDose).toHaveBeenCalledWith(
      doseId,
      patientId,
      "usr_senior",
      expect.objectContaining({ confirmationChannel: "TELEPHONE_DTMF" })
    );

    expect(updateCallSpy).toHaveBeenCalledWith({
      where: { callSid: "CA_123" },
      data: { dtmfDigitReceived: "1", callOutcome: "DOSE_CONFIRMED" },
    });

    expect(cancelNotifsSpy).toHaveBeenCalledWith({
      where: { referenceId: doseId, status: "QUEUED" },
      data: { status: "CANCELLED" },
    });

    expect(twiml).toContain("We have recorded your medication as taken");
  });

  it("should process Digit 2 (Not Taken): record outcome without marking dose as taken", async () => {
    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      fullName: "Margaret Jenkins",
      careCircleMembers: [],
    } as any);

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue({
      id: doseId,
      patientId,
      status: "DUE_NOW",
      medication: { brandName: "Metformin" },
    } as any);

    const confirmDoseSpy = vi.spyOn(AdherenceService, "confirmDose");
    const updateCallSpy = vi.spyOn(prisma.voiceCallRecord, "updateMany").mockResolvedValue({ count: 1 });

    const twiml = await TelephonyService.processKeypadInput(patientId, doseId, "CA_123", "2");

    expect(confirmDoseSpy).not.toHaveBeenCalled();
    expect(updateCallSpy).toHaveBeenCalledWith({
      where: { callSid: "CA_123" },
      data: { dtmfDigitReceived: "2", callOutcome: "DOSE_NOT_TAKEN" },
    });
    expect(twiml).toContain("Please remember to take your medication with your meal when ready");
  });

  it("should process Digit 3 (Snooze): snooze dose by 15 minutes", async () => {
    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      userId: "usr_senior",
      fullName: "Margaret Jenkins",
      careCircleMembers: [],
    } as any);

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue({
      id: doseId,
      patientId,
      status: "DUE_NOW",
      medication: { brandName: "Metformin" },
    } as any);

    const snoozeSpy = vi.spyOn(AdherenceService, "snoozeDose").mockResolvedValue({} as any);
    const updateCallSpy = vi.spyOn(prisma.voiceCallRecord, "updateMany").mockResolvedValue({ count: 1 });

    const twiml = await TelephonyService.processKeypadInput(patientId, doseId, "CA_123", "3");

    expect(snoozeSpy).toHaveBeenCalledWith(doseId, patientId, "usr_senior", 15);
    expect(updateCallSpy).toHaveBeenCalledWith({
      where: { callSid: "CA_123" },
      data: { dtmfDigitReceived: "3", callOutcome: "SNOOZE_REQUESTED" },
    });
    expect(twiml).toContain("We will snooze this reminder and check back with you in 15 minutes");
  });

  it("should process Digit 4 (Caregiver Transfer): bridge call and create assistance notification", async () => {
    vi.spyOn(prisma.patient, "findUnique").mockResolvedValue({
      id: patientId,
      fullName: "Margaret Jenkins",
      careCircleMembers: [
        {
          isPrimaryCaregiver: true,
          circleRole: "FAMILY_ADMIN",
          userId: "usr_sarah",
          user: { phoneNumber: "+15557654321", fullName: "Sarah Jenkins" },
        },
      ],
    } as any);

    vi.spyOn(prisma.doseOccurrence, "findUnique").mockResolvedValue({
      id: doseId,
      patientId,
      medication: { brandName: "Metformin" },
    } as any);

    const notifCreateSpy = vi.spyOn(prisma.notification, "create").mockResolvedValue({} as any);

    const twiml = await TelephonyService.processKeypadInput(patientId, doseId, "CA_123", "4");

    expect(twiml).toContain("<Dial>+15557654321</Dial>");
    expect(notifCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "CAREGIVER_TRANSFER_REQUESTED",
          recipientUserId: "usr_sarah",
        }),
      })
    );
  });

  it("should process Twilio status callbacks and update duration and failure reasons", async () => {
    vi.spyOn(prisma.voiceCallRecord, "findUnique").mockResolvedValue({
      id: "call_1",
      callSid: "CA_123",
      callOutcome: null,
    } as any);

    const updateSpy = vi.spyOn(prisma.voiceCallRecord, "update").mockResolvedValue({} as any);

    const result = await TelephonyService.processStatusCallback("CA_123", "no-answer", "24");

    expect(result.found).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({
      where: { callSid: "CA_123" },
      data: expect.objectContaining({
        status: "no-answer",
        durationSeconds: 24,
        callOutcome: "NO_RESPONSE_ESCALATED",
        failureReason: "Call concluded with status: no-answer",
      }),
    });
  });
});
