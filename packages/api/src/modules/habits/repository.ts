import { randomUUID } from 'crypto';
import { db } from '../../db';
import {
  Habit,
  HabitRow,
  CompletionRecord,
  CompletionRecordRow,
  CreateHabitInput,
} from './types';

/**
 * Maps a raw SQLite row to a typed Habit entity.
 */
function rowToHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

/**
 * Maps a raw SQLite row to a typed CompletionRecord entity.
 */
function rowToCompletion(row: CompletionRecordRow): CompletionRecord {
  return {
    id: row.id,
    habitId: row.habit_id,
    userId: row.user_id,
    date: row.date,
  };
}

/**
 * Inserts a new habit into the database.
 *
 * @param userId - The ID of the owning user.
 * @param input - The habit creation input (name).
 * @returns The newly created Habit entity.
 */
export function createHabit(userId: string, input: CreateHabitInput): Habit {
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO habits (id, user_id, name, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(id, userId, input.name, now);

  const row = db.prepare<string, HabitRow>(
    'SELECT * FROM habits WHERE id = ?'
  ).get(id) as HabitRow;

  return rowToHabit(row);
}

/**
 * Retrieves a single habit by ID, scoped to a user.
 *
 * @param userId - The requesting user's ID.
 * @param habitId - The habit's UUID.
 * @returns The Habit if found and owned by the user, otherwise null.
 */
export function getHabitById(userId: string, habitId: string): Habit | null {
  const row = db.prepare<[string, string], HabitRow>(
    'SELECT * FROM habits WHERE id = ? AND user_id = ?'
  ).get(habitId, userId);

  return row ? rowToHabit(row) : null;
}

/**
 * Retrieves all habits belonging to a user, ordered by creation time ascending.
 *
 * @param userId - The owning user's ID.
 * @returns Array of Habit entities.
 */
export function getHabitsByUserId(userId: string): Habit[] {
  const rows = db.prepare<string, HabitRow>(
    'SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC'
  ).all(userId);

  return rows.map(rowToHabit);
}

/**
 * Records a completion for a habit on a given date (YYYY-MM-DD).
 * Idempotent — will not create duplicates for the same (habit, user, date).
 *
 * @param userId - The owning user's ID.
 * @param habitId - The habit's UUID.
 * @param date - The calendar date formatted as YYYY-MM-DD.
 * @returns The created or existing CompletionRecord.
 */
export function recordCompletion(
  userId: string,
  habitId: string,
  date: string
): CompletionRecord {
  const id = randomUUID();

  db.prepare(
    `INSERT OR IGNORE INTO completion_records (id, habit_id, user_id, date)
     VALUES (?, ?, ?, ?)`
  ).run(id, habitId, userId, date);

  const row = db.prepare<[string, string, string], CompletionRecordRow>(
    'SELECT * FROM completion_records WHERE habit_id = ? AND user_id = ? AND date = ?'
  ).get(habitId, userId, date) as CompletionRecordRow;

  return rowToCompletion(row);
}

/**
 * Fetches all distinct completion dates for a habit, ordered descending (newest first).
 *
 * @param habitId - The habit's UUID.
 * @returns Array of date strings (YYYY-MM-DD).
 */
export function getCompletionDatesForHabit(habitId: string): string[] {
  const rows = db.prepare<string, { date: string }>(
    `SELECT DISTINCT date
       FROM completion_records
      WHERE habit_id = ?
      ORDER BY date DESC`
  ).all(habitId);

  return rows.map((r) => r.date);
}
