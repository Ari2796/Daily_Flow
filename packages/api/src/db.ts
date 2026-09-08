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
  `);
}
