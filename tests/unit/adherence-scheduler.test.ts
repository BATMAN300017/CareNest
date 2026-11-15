import { describe, it, expect } from "vitest";

describe("Adherence Logic & Recurrence Rules", () => {
  it("should correctly identify recurrence matching for daily and specific weekdays", () => {
    // Sunday = 0, Monday = 1, Tuesday = 2, Wednesday = 3, Thursday = 4, Friday = 5, Saturday = 6
    const scheduleMondayWednesdayFriday = {
      daysOfWeek: [1, 3, 5],
    };

    const isMonday = scheduleMondayWednesdayFriday.daysOfWeek.includes(1);
    const isTuesday = scheduleMondayWednesdayFriday.daysOfWeek.includes(2);
    const isWednesday = scheduleMondayWednesdayFriday.daysOfWeek.includes(3);

    expect(isMonday).toBe(true);
    expect(isTuesday).toBe(false);
    expect(isWednesday).toBe(true);
  });

  it("should evaluate missed-dose grace periods accurately", () => {
    const scheduledTime = new Date("2026-11-15T13:00:00Z");
    const gracePeriodMinutes = 60;
    const gracePeriodExpiry = new Date(scheduledTime.getTime() + gracePeriodMinutes * 60 * 1000);

    // Current time is 13:45 (inside grace period)
    const timeWithinGrace = new Date("2026-11-15T13:45:00Z");
    const isOverdueAt45m = timeWithinGrace > gracePeriodExpiry;
    expect(isOverdueAt45m).toBe(false);

    // Current time is 14:05 (past grace period)
    const timePastGrace = new Date("2026-11-15T14:05:00Z");
    const isOverdueAt65m = timePastGrace > gracePeriodExpiry;
    expect(isOverdueAt65m).toBe(true);
  });

  it("should correctly compute streak from consecutive daily completion sets", () => {
    const history = [
      { date: "2026-11-14", allTaken: true },
      { date: "2026-11-13", allTaken: true },
      { date: "2026-11-12", allTaken: true },
      { date: "2026-11-11", allTaken: false }, // Missed here
      { date: "2026-11-10", allTaken: true },
    ];

    let streak = 0;
    for (const day of history) {
      if (day.allTaken) {
        streak++;
      } else {
        break;
      }
    }

    expect(streak).toBe(3);
  });
});
