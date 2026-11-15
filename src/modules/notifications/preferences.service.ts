import { prisma } from "../../core/database/prisma";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import { UpdateNotificationPreferencesInput } from "../../core/validation/notification.schema";
import { AuditService } from "../audit/audit.service";

export class PreferencesService {
  /**
   * Retrieves patient communication preferences.
   */
  static async getPreferences(patientId: string) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        primaryPhone: true,
        preferredLanguage: true,
        timezone: true,
        quietHoursStart: true,
        quietHoursEnd: true,
        voiceRemindersEnabled: true,
        smsRemindersEnabled: true,
        emailRemindersEnabled: true,
        voiceSpeed: true,
        maxCallAttempts: true,
        callRetryIntervalMinutes: true,
        caregiverEscalationEnabled: true,
        appointmentRemindersEnabled: true,
      },
    });

    if (!patient) {
      throw new AppError("Patient not found.", 404, ErrorCode.PATIENT_NOT_FOUND);
    }

    return patient;
  }

  /**
   * Updates patient notification and communication settings.
   */
  static async updatePreferences(
    patientId: string,
    input: UpdateNotificationPreferencesInput,
    actorUserId: string
  ) {
    const existing = await this.getPreferences(patientId);

    const data: any = {};
    if (input.voiceRemindersEnabled !== undefined) data.voiceRemindersEnabled = input.voiceRemindersEnabled;
    if (input.smsRemindersEnabled !== undefined) data.smsRemindersEnabled = input.smsRemindersEnabled;
    if (input.emailRemindersEnabled !== undefined) data.emailRemindersEnabled = input.emailRemindersEnabled;
    if (input.voiceSpeed !== undefined) data.voiceSpeed = input.voiceSpeed;
    if (input.maxCallAttempts !== undefined) data.maxCallAttempts = input.maxCallAttempts;
    if (input.callRetryIntervalMinutes !== undefined) data.callRetryIntervalMinutes = input.callRetryIntervalMinutes;
    if (input.quietHoursStart !== undefined) data.quietHoursStart = input.quietHoursStart;
    if (input.quietHoursEnd !== undefined) data.quietHoursEnd = input.quietHoursEnd;
    if (input.preferredLanguage !== undefined) data.preferredLanguage = input.preferredLanguage;
    if (input.caregiverEscalationEnabled !== undefined) data.caregiverEscalationEnabled = input.caregiverEscalationEnabled;
    if (input.appointmentRemindersEnabled !== undefined) data.appointmentRemindersEnabled = input.appointmentRemindersEnabled;

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data,
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "PREFERENCES_UPDATED",
      resourceType: "patient_preferences",
      resourceId: patientId,
      previousState: existing,
      newState: input,
    });

    return this.getPreferences(patientId);
  }
}
