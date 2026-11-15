import { formatInTimeZone } from "date-fns-tz";

export class QuietHoursService {
  /**
   * Checks whether the given date/time falls within the patient's configured quiet hours.
   * Accurately evaluates midnight-spanning ranges (e.g. 22:00 to 07:00) using the patient's timezone.
   */
  static isQuietHour(
    referenceTime: Date,
    patientTimezone: string = "America/New_York",
    quietStart: string = "22:00",
    quietEnd: string = "07:00"
  ): boolean {
    const currentLocalHHmm = formatInTimeZone(referenceTime, patientTimezone, "HH:mm");

    if (quietStart > quietEnd) {
      // Overnight range, e.g. 22:00 to 07:00
      return currentLocalHHmm >= quietStart || currentLocalHHmm < quietEnd;
    } else {
      // Same-day range, e.g. 01:00 to 06:00
      return currentLocalHHmm >= quietStart && currentLocalHHmm < quietEnd;
    }
  }
}
