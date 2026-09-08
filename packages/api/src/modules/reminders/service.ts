import {
  createReminder as repoCreateReminder,
  getReminderById,
  getRemindersByUserId,
  updateReminderState as repoUpdateReminderState,
  countDueAndAcknowledged,
} from './repository';
import {
  Reminder,
  ReminderSchedule,
  CreateReminderInput,
  DayOfWeek,
} from './types';

const VALID_DAYS = new Set<string>([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validates a reminder title (1–200 characters, not whitespace-only).
 */
function validateTitle(title: string): string | null {
  if (!title || title.trim().length === 0) {
    return 'Title must not be empty or whitespace-only';
  }
  const trimmed = title.trim();
  if (trimmed.length > 200) {
    return 'Title must be 200 characters or fewer';
  }
  return null;
}

/**
 * Computes next trigger timestamp for a weekly schedule.
 */
function computeWeeklyNextTrigger(
  daysOfWeek: DayOfWeek[],
  timeOfDay: string,
  now: Date
): string {
  const [targetH, targetM] = timeOfDay.split(':').map(Number);
  const dayMap: Record<DayOfWeek, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const targetDays = new Set(daysOfWeek.map((d) => dayMap[d]));

  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now.getTime());
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(targetH, targetM, 0, 0);

    if (targetDays.has(candidate.getDay()) && candidate.getTime() > now.getTime()) {
      return candidate.toISOString();
    }
  }

  const fallback = new Date(now.getTime());
  fallback.setDate(fallback.getDate() + 7);
  fallback.setHours(targetH, targetM, 0, 0);
  return fallback.toISOString();
}

/**
 * Validates schedule fields and computes the initial next trigger timestamp.
 */
export function validateAndComputeNextTrigger(
  schedule: ReminderSchedule,
  now = new Date()
): string {
  if (!schedule || !schedule.type) {
    throw new Error('Schedule configuration is invalid');
  }

  if (schedule.type === 'one_time') {
    const triggerDate = new Date(schedule.triggerAt);
    if (isNaN(triggerDate.getTime())) {
      throw new Error('triggerAt must be a valid ISO date-time string');
    }
    const leadTimeMs = triggerDate.getTime() - now.getTime();
    if (leadTimeMs <= 0) {
      throw new Error('Date-time must be in the future');
    }
    if (leadTimeMs < 60000) {
      throw new Error('Insufficient lead time: date-time must be at least 1 minute in the future');
    }
    return triggerDate.toISOString();
  }

  if (schedule.type === 'daily') {
    if (!schedule.timeOfDay || !TIME_REGEX.test(schedule.timeOfDay)) {
      throw new Error('timeOfDay must be in HH:MM 24-hour format (00:00–23:59)');
    }
    const [h, m] = schedule.timeOfDay.split(':').map(Number);
    const target = new Date(now.getTime());
    target.setHours(h, m, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target.toISOString();
  }

  if (schedule.type === 'weekly') {
    if (!Array.isArray(schedule.daysOfWeek) || schedule.daysOfWeek.length === 0) {
      throw new Error('At least one day of the week is required');
    }
    for (const d of schedule.daysOfWeek) {
      if (!VALID_DAYS.has(d)) {
        throw new Error(`Invalid day of week: ${d}`);
      }
    }
    if (!schedule.timeOfDay || !TIME_REGEX.test(schedule.timeOfDay)) {
      throw new Error('timeOfDay must be in HH:MM 24-hour format (00:00–23:59)');
    }
    return computeWeeklyNextTrigger(schedule.daysOfWeek, schedule.timeOfDay, now);
  }

  throw new Error('Unknown schedule type');
}

/**
 * Creates a new reminder for the user after validating title and schedule.
 */
export function createReminder(
  userId: string,
  input: CreateReminderInput,
  now = new Date()
): Reminder {
  const titleError = validateTitle(input.title);
  if (titleError) throw new Error(titleError);

  const nextTriggerAt = validateAndComputeNextTrigger(input.schedule, now);

  return repoCreateReminder(
    userId,
    { title: input.title.trim(), schedule: input.schedule },
    nextTriggerAt
  );
}

/**
 * Retrieves a single reminder by ID, enforcing user ownership.
 */
export function getReminder(userId: string, reminderId: string): Reminder {
  const reminder = getReminderById(userId, reminderId);
  if (!reminder) throw new Error('NOT_FOUND');
  return reminder;
}

/**
 * Returns all reminders belonging to a user.
 */
export function getRemindersForUser(userId: string): Reminder[] {
  return getRemindersByUserId(userId);
}

/**
 * Acknowledges a reminder. Idempotent.
 */
export function acknowledgeReminder(userId: string, reminderId: string): Reminder {
  const existing = getReminderById(userId, reminderId);
  if (!existing) throw new Error('NOT_FOUND');
  if (existing.state === 'acknowledged') return existing;

  const updated = repoUpdateReminderState(userId, reminderId, 'acknowledged');
  if (!updated) throw new Error('NOT_FOUND');
  return updated;
}

/**
 * Computes reminder acknowledgement rate in [0, 1] rounded to 4 decimal places.
 */
export function getAcknowledgementRate(userId: string): number {
  const { totalDue, acknowledged } = countDueAndAcknowledged(userId);
  if (totalDue === 0) return 0;
  const rate = Math.round((acknowledged / totalDue) * 10000) / 10000;
  return Math.max(0, Math.min(1, rate));
}
