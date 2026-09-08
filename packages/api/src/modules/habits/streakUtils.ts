/**
 * Utility functions for habit streak calculation.
 *
 * WORKSHOP NOTE — Phase 6:
 * computeStreak() contains a bug that causes it to always return 0 in
 * non-UTC timezones (including UTC+5:30 IST). Use the Kiro Fix Power
 * in Phase 6 to identify and fix the issue. Do not fix it before Phase 6.
 */

/**
 * Computes the current consecutive-day streak from habit completion timestamps.
 *
 * A streak is the number of consecutive calendar days — ending today or
 * yesterday — on which the habit was completed at least once.
 *
 * @param completionDates - Array of Date objects representing when the habit was completed
 * @returns The length of the current streak in days (0 if no streak)
 */
export function computeStreak(completionDates: Date[]): number {
  if (completionDates.length === 0) return 0;

  // Deduplicate: reduce to one entry per calendar day using UTC date strings.
  const uniqueDays = [
    ...new Set(
      completionDates.map((d) => d.toISOString().split('T')[0])
      // BUG: toISOString() returns the date in UTC.
      // In UTC+5:30 (IST), a completion logged at 01:00 IST is still
      // 19:30 UTC the *previous* day — so the UTC date string is one
      // day behind the user's local calendar date.
    ),
  ]
    .sort()
    .reverse();

  let streak = 0;

  // Anchor: today at local midnight.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < uniqueDays.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    // expected is local midnight, e.g. 2024-01-15T00:00:00+05:30

    const actual = new Date(uniqueDays[i]);
    // BUG: new Date('2024-01-15') parses as 2024-01-15T00:00:00Z (UTC midnight).
    // In UTC+5:30 that equals 2024-01-15T05:30:00+05:30 — 5.5 hours AFTER
    // local midnight. So actual.getTime() !== expected.getTime() on every
    // iteration, and the streak is always 0.

    if (actual.getTime() === expected.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
