import { SupportedLanguage } from "../../i18n/translations";

export interface FormattedNotification {
  title: string;
  body: string;
}

export class NotificationTemplateService {
  /**
   * Generates bilingual medication reminder notification templates (English & Hindi).
   * Note: Accurately preserves medication brand names and strengths for clinical safety.
   */
  static getMedicationReminder(
    lang: SupportedLanguage | string = "en",
    medName: string,
    strength: string,
    instructions?: string
  ): FormattedNotification {
    const isHindi = lang === "hi" || lang === "hi-IN";

    if (isHindi) {
      return {
        title: `${medName} लेने का समय`,
        body: `कृपया ${medName} (${strength}) लें। ${instructions ? `निर्देश: ${instructions}` : ""}`,
      };
    }

    return {
      title: `Medication Reminder: ${medName} ${strength}`,
      body: `Time for your scheduled dose of ${medName} (${strength}). ${instructions ? `Instructions: ${instructions}` : ""}`,
    };
  }

  /**
   * Generates missed-dose caregiver escalation alert templates.
   */
  static getMissedDoseAlert(
    lang: SupportedLanguage | string = "en",
    patientName: string,
    medName: string,
    strength: string
  ): FormattedNotification {
    const isHindi = lang === "hi" || lang === "hi-IN";

    if (isHindi) {
      return {
        title: `केयरनेस्ट अलर्ट: ${patientName} की दवा छूटी`,
        body: `${patientName} ने अपनी ${medName} (${strength}) की निर्धारित खुराक की पुष्टि नहीं की है। कृपया उनसे संपर्क करें।`,
      };
    }

    return {
      title: `CareNest Alert: Missed Dose for ${patientName}`,
      body: `${patientName} has not confirmed their scheduled dose of ${medName} (${strength}). Please check in with them.`,
    };
  }

  /**
   * Generates doctor appointment reminder templates.
   */
  static getAppointmentReminder(
    lang: SupportedLanguage | string = "en",
    title: string,
    doctorName: string,
    location: string
  ): FormattedNotification {
    const isHindi = lang === "hi" || lang === "hi-IN";

    if (isHindi) {
      return {
        title: `कल डॉक्टर से अपॉइंटमेंट: ${title}`,
        body: `स्मरण: कल ${location} पर ${doctorName} के साथ आपका अपॉइंटमेंट है।`,
      };
    }

    return {
      title: `Appointment Tomorrow: ${title}`,
      body: `Reminder: You have an appointment with ${doctorName} tomorrow at ${location}.`,
    };
  }
}
