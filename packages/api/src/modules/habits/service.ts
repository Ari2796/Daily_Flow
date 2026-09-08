import {
  createHabit as repoCreateHabit,
  getHabitById,
  getHabitsByUserId,
  recordCompletion as repoRecordCompletion,
  getCompletionDatesForHabit,
} from './repository';
import {
  HabitWithStreak,
  CreateHabitInput,
  CompleteHabitResponse,
} from './types';

/**
 * Validates a habit name (1–200 characters, not whitespace-only).
 */
function validateName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Name must not be empty or whitespace-only';
  }
  const trimmed = name.trim();
  if (trimmed.length > 200) {
    return 'Name must be 200 characters or fewer';
  }
  return null;
}

/**
 * Returns the calendar date string (YYYY-MM-DD) for the day before dateStr.
 */
export function getPreviousDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Calculates the current consecutive completion streak for a habit.
 *
 * @param habitId - The habit's UUID.
 * @param asOfDate - Date string (YYYY-MM-DD) representing "today". Defaults to current UTC date.
 * @returns Consecutive streak count (>= 0).
 */
export function calculateStreak(
  habitId: string,
  asOfDate: string = new Date().toISOString().slice(0, 10)
): number {
  const records = getCompletionDatesForHabit(habitId);
  if (records.length === 0) return 0;

  const mostRecentDate = records[0];
  const yesterday = getPreviousDay(asOfDate);

  // Staleness check: if most recent completion is older than yesterday, streak is 0
  if (mostRecentDate < yesterday) {
    return 0;
  }

  let streak = 0;
  let expectedDate = mostRecentDate;

  for (const date of records) {
    if (date === expectedDate) {
      streak += 1;
      expectedDate = getPreviousDay(expectedDate);
    } else if (date < expectedDate) {
      break;
    }
  }

  return streak;
}

/**
 * Creates a new habit for the user after validating inputs.
 * Initial streak is always 0.
 */
export function createHabit(
  userId: string,
  input: CreateHabitInput
): HabitWithStreak {
  const nameError = validateName(input.name);
  if (nameError) throw new Error(nameError);

  const habit = repoCreateHabit(userId, { name: input.name.trim() });
  return { ...habit, streak: 0 };
}

/**
 * Retrieves a single habit with streak by ID, enforcing user ownership.
 */
export function getHabit(userId: string, habitId: string): HabitWithStreak {
  const habit = getHabitById(userId, habitId);
  if (!habit) throw new Error('NOT_FOUND');
  const streak = calculateStreak(habit.id);
  return { ...habit, streak };
}

/**
 * Returns all habits for a user, each with its calculated streak.
 */
export function getHabitsForUser(userId: string): HabitWithStreak[] {
  const habits = getHabitsByUserId(userId);
  return habits.map((h) => ({
    ...h,
    streak: calculateStreak(h.id),
  }));
}

/**
 * Records a daily completion for a habit, returning the updated habit and record.
 */
export function recordCompletion(
  userId: string,
  habitId: string,
  date: string = new Date().toISOString().slice(0, 10)
): CompleteHabitResponse {
  const habit = getHabitById(userId, habitId);
  if (!habit) throw new Error('NOT_FOUND');

  const completionRecord = repoRecordCompletion(userId, habitId, date);
  const streak = calculateStreak(habitId, date);

  return {
    habit: { ...habit, streak },
    completionRecord,
  };
}

/**
 * Calculates the habit streak consistency across all user habits in [0, 1].
 * Normalised by scoring window of 30 days and rounded to 4 decimal places.
 */
export function getStreakConsistency(
  userId: string,
  asOfDate: string = new Date().toISOString().slice(0, 10)
): number {
  const habits = getHabitsByUserId(userId);
  if (habits.length === 0) return 0;

  const SCORING_WINDOW_DAYS = 30;
  let totalCappedStreak = 0;

  for (const habit of habits) {
    const streak = calculateStreak(habit.id, asOfDate);
    const capped = Math.min(streak, SCORING_WINDOW_DAYS);
    totalCappedStreak += capped;
  }

  const meanStreak = totalCappedStreak / habits.length;
  const consistency = meanStreak / SCORING_WINDOW_DAYS;

  return Math.round(consistency * 10000) / 10000;
}
