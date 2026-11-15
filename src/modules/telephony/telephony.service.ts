import { prisma } from "../../core/database/prisma";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import { config } from "../../core/config/env";
import { IVoiceCallProvider } from "../notifications/interfaces/voice-call-provider.interface";
import { TwilioVoiceProvider } from "../notifications/providers/twilio-voice.provider";
import { TwiMLBuilder } from "./twiml-builder";
import { QuietHoursService } from "../escalation/quiet-hours";
import { AdherenceService } from "../adherence/adherence.service";
import { AuditService } from "../audit/audit.service";

export class TelephonyService {
  private static voiceProvider: IVoiceCallProvider | null = null;

  private static getVoiceProvider(): IVoiceCallProvider {
    if (!this.voiceProvider) {
      this.voiceProvider = new TwilioVoiceProvider();
    }
    return this.voiceProvider;
  }

  /**
   * Allows injecting mock voice provider during automated testing.
   */
  static setVoiceProvider(provider: IVoiceCallProvider) {
    this.voiceProvider = provider;
  }

  /**
   * Initiates an automated medication reminder phone call to the patient.
   */
  static async initiateMedicationReminderCall(
    patientId: string,
    doseId: string,
    attemptNumber: number = 1
  ) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        careCircleMembers: {
          where: { isActive: true },
          include: { user: true },
        },
      },
    });

    if (!patient) {
      throw new AppError("Patient not found.", 404, ErrorCode.PATIENT_NOT_FOUND);
    }

    if (!patient.voiceRemindersEnabled) {
      return { skipped: true, reason: "Voice reminders disabled in patient preferences" };
    }

    const dose = await prisma.doseOccurrence.findUnique({
      where: { id: doseId },
      include: {
        medication: true,
        schedule: true,
      },
    });

    if (!dose || dose.patientId !== patientId) {
      throw new AppError("Dose occurrence not found.", 404, ErrorCode.DOSE_NOT_FOUND);
    }

    // Do not call if already taken or skipped
    if (dose.status === "TAKEN" || dose.status === "SKIPPED") {
      return { skipped: true, reason: `Dose already in terminal status: ${dose.status}` };
    }

    // Quiet hours verification
    const now = new Date();
    const inQuietHours = QuietHoursService.isQuietHour(
      now,
      patient.timezone,
      patient.quietHoursStart,
      patient.quietHoursEnd
    );

    if (inQuietHours) {
      return { skipped: true, reason: "Patient is currently within quiet hours" };
    }

    // Prevent overlapping concurrent active calls for the same dose
    const activeCall = await prisma.voiceCallRecord.findFirst({
      where: {
        doseOccurrenceId: doseId,
        status: { in: ["queued", "initiated", "ringing", "in-progress"] },
      },
    });

    if (activeCall) {
      return { skipped: true, reason: "Call already in progress for this dose", callSid: activeCall.callSid };
    }

    const voiceUrl = `${config.twilio.webhookBaseUrl}/api/v1/telephony/voice/remind?doseId=${doseId}&patientId=${patientId}`;
    const statusCallbackUrl = `${config.twilio.webhookBaseUrl}/api/v1/telephony/voice/status-callback`;

    const result = await this.getVoiceProvider().initiateCall({
      toPhone: patient.primaryPhone,
      voiceUrl,
      statusCallbackUrl,
      patientId,
      doseId,
    });

    if (result.isSuccessful && result.callSid) {
      await prisma.voiceCallRecord.create({
        data: {
          patientId,
          doseOccurrenceId: doseId,
          callSid: result.callSid,
          toPhone: patient.primaryPhone,
          fromPhone: config.twilio.phoneNumber,
          status: result.status || "initiated",
          attemptNumber,
        },
      });

      await AuditService.log({
        patientId,
        actorUserId: patient.userId || undefined,
        action: "CALL_INITIATED",
        resourceType: "voice_call_record",
        resourceId: result.callSid,
        newState: { doseId, attemptNumber },
      });
    }

    return result;
  }

  /**
   * Generates initial TwiML instructions when the call connects.
   */
  static async handleVoiceReminderPrompt(patientId: string, doseId: string): Promise<string> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    const dose = await prisma.doseOccurrence.findUnique({
      where: { id: doseId },
      include: {
        medication: true,
        schedule: true,
      },
    });

    if (!patient || !dose) {
      const response = new (require("twilio").twiml.VoiceResponse)();
      response.say("Sorry, this medication reminder is no longer available.");
      response.hangup();
      return response.toString();
    }

    const actionUrl = `${config.twilio.webhookBaseUrl}/api/v1/telephony/voice/handle-keypad?doseId=${doseId}&patientId=${patientId}`;

    return TwiMLBuilder.buildMedicationReminderPrompt({
      patientName: patient.fullName,
      medicationName: dose.medication.brandName,
      dosage: dose.medication.strength,
      instructions: dose.medication.instructions,
      actionUrl,
      preferredLanguage: patient.preferredLanguage,
      voiceSpeed: patient.voiceSpeed as any,
    });
  }

  /**
   * Processes DTMF keypad response received from the patient.
   */
  static async processKeypadInput(
    patientId: string,
    doseId: string,
    callSid: string,
    digit: string
  ): Promise<string> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        careCircleMembers: {
          where: { isActive: true },
          include: { user: true },
        },
      },
    });

    if (!patient) {
      throw new AppError("Patient not found.", 404, ErrorCode.PATIENT_NOT_FOUND);
    }

    const dose = await prisma.doseOccurrence.findUnique({
      where: { id: doseId },
      include: { medication: true, schedule: true },
    });

    if (!dose) {
      throw new AppError("Dose occurrence not found.", 404, ErrorCode.DOSE_NOT_FOUND);
    }

    // Digit 1: Dose Confirmed Taken
    if (digit === "1") {
      if (dose.status !== "TAKEN") {
        await AdherenceService.confirmDose(doseId, patientId, patient.userId || patientId, {
          confirmationChannel: "TELEPHONE_DTMF",
          intakeMealContext: "Confirmed via automated phone call",
          telephonyCallSid: callSid,
        });
      }

      await prisma.voiceCallRecord.updateMany({
        where: { callSid },
        data: {
          dtmfDigitReceived: "1",
          callOutcome: "DOSE_CONFIRMED",
        },
      });

      // Purge any pending reminders for this dose
      await prisma.notification.updateMany({
        where: {
          referenceId: doseId,
          status: "QUEUED",
        },
        data: { status: "CANCELLED" },
      });

      return TwiMLBuilder.buildDoseConfirmedResponse(patient.fullName);
    }

    // Digit 2: Not Taken Yet
    if (digit === "2") {
      await prisma.voiceCallRecord.updateMany({
        where: { callSid },
        data: {
          dtmfDigitReceived: "2",
          callOutcome: "DOSE_NOT_TAKEN",
        },
      });

      return TwiMLBuilder.buildNotTakenResponse(patient.fullName);
    }

    // Digit 3: Snooze 15 minutes
    if (digit === "3") {
      if (dose.status !== "TAKEN") {
        await AdherenceService.snoozeDose(doseId, patientId, patient.userId || patientId, 15);
      }

      await prisma.voiceCallRecord.updateMany({
        where: { callSid },
        data: {
          dtmfDigitReceived: "3",
          callOutcome: "SNOOZE_REQUESTED",
        },
      });

      return TwiMLBuilder.buildSnoozeResponse(patient.fullName);
    }

    // Digit 4: Transfer to Caregiver
    if (digit === "4") {
      const primaryCaregiver = patient.careCircleMembers.find(
        (m) => m.isPrimaryCaregiver || m.circleRole === "FAMILY_ADMIN"
      );

      const caregiverPhone = primaryCaregiver?.user?.phoneNumber || "+15551234567";
      const caregiverName = primaryCaregiver?.user?.fullName || "Caregiver";

      await prisma.voiceCallRecord.updateMany({
        where: { callSid },
        data: {
          dtmfDigitReceived: "4",
          callOutcome: "TRANSFERRED_TO_CARETAKER",
        },
      });

      // Alert caregiver in-app that patient requested transfer
      if (primaryCaregiver) {
        await prisma.notification.create({
          data: {
            patientId,
            recipientUserId: primaryCaregiver.userId,
            eventType: "CAREGIVER_TRANSFER_REQUESTED",
            channel: "IN_APP",
            title: `Assistance Requested by ${patient.fullName}`,
            body: `${patient.fullName} pressed 4 to connect with a caregiver during their medication call for ${dose.medication.brandName}.`,
            status: "QUEUED",
            referenceId: doseId,
          },
        });
      }

      return TwiMLBuilder.buildCaregiverTransferResponse(caregiverPhone, caregiverName);
    }

    // Invalid Digit
    const actionUrl = `${config.twilio.webhookBaseUrl}/api/v1/telephony/voice/handle-keypad?doseId=${doseId}&patientId=${patientId}`;
    await prisma.voiceCallRecord.updateMany({
      where: { callSid },
      data: {
        dtmfDigitReceived: digit,
        callOutcome: "INVALID_RESPONSE",
      },
    });

    return TwiMLBuilder.buildInvalidDigitResponse(actionUrl);
  }

  /**
   * Tracks call completion, duration, and failure reasons from Twilio status callbacks.
   */
  static async processStatusCallback(
    callSid: string,
    callStatus: string,
    durationSecondsStr?: string
  ) {
    const durationSeconds = durationSecondsStr ? parseInt(durationSecondsStr, 10) : 0;

    const existing = await prisma.voiceCallRecord.findUnique({
      where: { callSid },
    });

    if (!existing) {
      return { found: false };
    }

    const data: any = {
      status: callStatus,
      durationSeconds,
      callEndedAt: new Date(),
    };

    if (["busy", "no-answer", "failed", "canceled"].includes(callStatus)) {
      if (!existing.callOutcome) {
        data.callOutcome = "NO_RESPONSE_ESCALATED";
        data.failureReason = `Call concluded with status: ${callStatus}`;
      }
    }

    const updated = await prisma.voiceCallRecord.update({
      where: { callSid },
      data,
    });

    return { found: true, record: updated };
  }
}
