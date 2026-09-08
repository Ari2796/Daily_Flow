import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync } from 'fs';

const DB_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DB_DIR, 'db.sqlite');

mkdirSync(DB_DIR, { recursive: true });

/**
 * Singleton SQLite database instance.
 * Uses better-sqlite3 for synchronous, low-overhead database access.
 */
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Initialises the database schema.
 * Safe to call on every startup — uses IF NOT EXISTS for idempotency.
 * Module tables are added here after the scaffold-module skill runs (Phase 3).
 */
export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 255),
      description TEXT CHECK (description IS NULL OR length(description) <= 2000),
      status      TEXT NOT NULL DEFAULT 'Todo'
                    CHECK (status IN ('Todo', 'In_Progress', 'Done')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_id
      ON tasks(user_id);

    CREATE INDEX IF NOT EXISTS idx_tasks_user_status
      ON tasks(user_id, status);

    CREATE TABLE IF NOT EXISTS reminders (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title             TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
      state             TEXT NOT NULL DEFAULT 'pending'
                          CHECK (state IN ('pending', 'triggered', 'acknowledged')),
      schedule_type     TEXT NOT NULL
                          CHECK (schedule_type IN ('one_time', 'daily', 'weekly')),
      trigger_at        TEXT,
      time_of_day       TEXT,
      days_of_week      TEXT,
      next_trigger_at   TEXT,
      last_triggered_at TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_reminders_user_id
      ON reminders(user_id);

    CREATE INDEX IF NOT EXISTS idx_reminders_next_trigger
      ON reminders(next_trigger_at);

    CREATE TABLE IF NOT EXISTS habits (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_habits_user_id
      ON habits(user_id);

    CREATE TABLE IF NOT EXISTS completion_records (
      id       TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date     TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_completion_habit_user_date
      ON completion_records(habit_id, user_id, date);

    CREATE INDEX IF NOT EXISTS idx_completion_habit_id
      ON completion_records(habit_id);
  `);
}
