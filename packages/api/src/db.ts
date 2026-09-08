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

    -- Phase 3: Kiro will generate module tables here based on
    -- .kiro/specs/dailyflow/design.md after you run the scaffold-module skill.
    -- Expected tables: tasks, reminders, habits, habit_completions
  `);
}
