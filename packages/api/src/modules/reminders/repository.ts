import { randomUUID } from 'crypto';
import { db } from '../../db';
import {
  Reminder,
  ReminderRow,
  ReminderState,
  ReminderSchedule,
  CreateReminderInput,
  DayOfWeek,
} from './types';

/**
 * Maps a raw SQLite row to a typed Reminder entity.
 *
 * @param row - The raw database row.
 * @returns Typed Reminder entity.
 */
function rowToReminder(row: ReminderRow): Reminder {
  let schedule: ReminderSchedule;

  if (row.schedule_type === 'one_time') {
    schedule = {
      type: 'one_time',
      triggerAt: row.trigger_at ?? '',
    };
  } else if (row.schedule_type === 'daily') {
    schedule = {
      type: 'daily',
      timeOfDay: row.time_of_day ?? '',
    };
  } else {
    let days: DayOfWeek[] = [];
    if (row.days_of_week) {
      try {
        days = JSON.parse(row.days_of_week) as DayOfWeek[];
      } catch {
        days = [];
      }
    }
    schedule = {
      type: 'weekly',
      daysOfWeek: days,
      timeOfDay: row.time_of_day ?? '',
    };
  }

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    schedule,
    state: row.state as ReminderState,
    nextTriggerAt: row.next_trigger_at,
    lastTriggeredAt: row.last_triggered_at,
    createdAt: row.created_at,
  };
}

/**
 * Inserts a new reminder row into the database.
 *
 * @param userId - The ID of the owning user.
 * @param input - Title and schedule configuration.
 * @param nextTriggerAt - The calculated next trigger timestamp ISO string.
 * @returns The newly created Reminder with state 'pending'.
 */
export function createReminder(
  userId: string,
  input: CreateReminderInput,
  nextTriggerAt: string | null
): Reminder {
  const id = randomUUID();
  const now = new Date().toISOString();
  const scheduleType = input.schedule.type;

  const triggerAt = input.schedule.type === 'one_time' ? input.schedule.triggerAt : null;
  const timeOfDay = input.schedule.type !== 'one_time' ? input.schedule.timeOfDay : null;
  const daysOfWeek =
    input.schedule.type === 'weekly' ? JSON.stringify(input.schedule.daysOfWeek) : null;

  db.prepare(
    `INSERT INTO reminders (
      id, user_id, title, state, schedule_type,
      trigger_at, time_of_day, days_of_week,
      next_trigger_at, last_triggered_at, created_at
    ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, null, ?)`
  ).run(
    id,
    userId,
    input.title,
    scheduleType,
    triggerAt,
    timeOfDay,
    daysOfWeek,
    nextTriggerAt,
    now
  );

  const row = db.prepare<string, ReminderRow>(
    'SELECT * FROM reminders WHERE id = ?'
  ).get(id) as ReminderRow;

  return rowToReminder(row);
}

/**
 * Retrieves a single reminder by ID, scoped to a user.
 *
 * @param userId - The requesting user's ID.
 * @param reminderId - The reminder's UUID.
 * @returns The Reminder if found and owned by the user, otherwise null.
 */
export function getReminderById(userId: string, reminderId: string): Reminder | null {
  const row = db.prepare<[string, string], ReminderRow>(
    'SELECT * FROM reminders WHERE id = ? AND user_id = ?'
  ).get(reminderId, userId);

  return row ? rowToReminder(row) : null;
}

/**
 * Returns all reminders belonging to a user, ordered by creation time ascending.
 *
 * @param userId - The owning user's ID.
 * @returns Array of Reminder entities.
 */
export function getRemindersByUserId(userId: string): Reminder[] {
  const rows = db.prepare<string, ReminderRow>(
    'SELECT * FROM reminders WHERE user_id = ? ORDER BY created_at ASC'
  ).all(userId);

  return rows.map(rowToReminder);
}

/**
 * Updates the state of a reminder owned by the user.
 *
 * @param userId - The owning user's ID.
 * @param reminderId - The reminder's UUID.
 * @param state - The new ReminderState.
 * @returns The updated Reminder, or null if not found / not owned.
 */
export function updateReminderState(
  userId: string,
  reminderId: string,
  state: ReminderState
): Reminder | null {
  const result = db.prepare(
    `UPDATE reminders
        SET state = ?
      WHERE id = ? AND user_id = ?`
  ).run(state, reminderId, userId);

  if (result.changes === 0) return null;

  const row = db.prepare<string, ReminderRow>(
    'SELECT * FROM reminders WHERE id = ?'
  ).get(reminderId) as ReminderRow;

  return rowToReminder(row);
}

/**
 * Counts due and acknowledged reminders for a user.
 * Due reminders are those that have been triggered, acknowledged, or whose next_trigger_at has passed.
 *
 * @param userId - The owning user's ID.
 * @returns An object containing totalDue count and acknowledged count.
 */
export function countDueAndAcknowledged(
  userId: string
): { totalDue: number; acknowledged: number } {
  const now = new Date().toISOString();
  const rows = db.prepare<[string, string], { state: string; count: number }>(
    `SELECT state, COUNT(*) as count
       FROM reminders
      WHERE user_id = ?
        AND (state IN ('triggered', 'acknowledged') OR (next_trigger_at IS NOT NULL AND next_trigger_at <= ?))
      GROUP BY state`
  ).all(userId, now);

  let acknowledged = 0;
  let totalDue = 0;

  for (const row of rows) {
    totalDue += row.count;
    if (row.state === 'acknowledged') {
      acknowledged += row.count;
    }
  }

  return { totalDue, acknowledged };
}
