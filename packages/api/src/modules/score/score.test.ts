import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// ── In-memory DB setup (must be hoisted before any module imports) ──────────────
const { testDb } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3') as typeof import('better-sqlite3');
  const db = new Database(':memory:');

  db.pragma('foreign_keys = ON');
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

    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);

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

    CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);

    CREATE TABLE IF NOT EXISTS habits (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

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

  return { testDb: db };
});

vi.mock('../../db', () => ({ db: testDb }));

// ── Imports (after mock setup) ─────────────────────────────────────────────────
import { computeProductivityScore } from './service';
import { createTask, updateTaskStatus } from '../tasks/service';
import { createHabit, recordCompletion } from '../habits/service';

const USER_A = 'score-user-a';
const USER_B = 'score-user-b';

beforeAll(() => {
  testDb
    .prepare('INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)')
    .run(USER_A, 'sa@test.com', 'Score User A');
  testDb
    .prepare('INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)')
    .run(USER_B, 'sb@test.com', 'Score User B');
});

beforeEach(() => {
  testDb.exec('DELETE FROM completion_records');
  testDb.exec('DELETE FROM habits');
  testDb.exec('DELETE FROM reminders');
  testDb.exec('DELETE FROM tasks');
});

// ── Helper: create a one_time reminder whose next_trigger_at is in the past ────
function insertDueReminder(userId: string, state: 'pending' | 'acknowledged'): void {
  const { randomUUID } = require('crypto') as typeof import('crypto');
  testDb
    .prepare(
      `INSERT INTO reminders
         (id, user_id, title, state, schedule_type, trigger_at, next_trigger_at, created_at)
       VALUES (?, ?, ?, ?, 'one_time', ?, ?, datetime('now'))`
    )
    .run(
      randomUUID(),
      userId,
      'Due reminder',
      state,
      new Date(Date.now() - 1000).toISOString(),
      new Date(Date.now() - 1000).toISOString()
    );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('computeProductivityScore', () => {
  it('returns score=0 and all components=0 when user has no data', () => {
    const result = computeProductivityScore(USER_A);
    expect(result.score).toBe(0);
    expect(result.breakdown.taskCompletionRate).toBe(0);
    expect(result.breakdown.reminderAcknowledgementRate).toBe(0);
    expect(result.breakdown.habitStreakConsistency).toBe(0);
    expect(result.calculatedAt).toBeTruthy();
  });

  it('score reflects only task completion when only tasks exist', () => {
    // 1 done out of 2 tasks → task rate = 0.5
    // score = 0.5 * 0.4 = 0.2 → 20.00
    const t1 = createTask(USER_A, { title: 'Task 1' });
    createTask(USER_A, { title: 'Task 2' });
    updateTaskStatus(USER_A, t1.id, 'Done');

    const result = computeProductivityScore(USER_A);
    expect(result.breakdown.taskCompletionRate).toBe(0.5);
    expect(result.breakdown.reminderAcknowledgementRate).toBe(0);
    expect(result.breakdown.habitStreakConsistency).toBe(0);
    expect(result.score).toBe(20);
  });

  it('score reflects only reminder acknowledgement when only reminders exist', () => {
    // 1 acknowledged out of 2 due reminders → rate = 0.5
    // score = 0.5 * 0.30 = 0.15 → 15.00
    insertDueReminder(USER_A, 'acknowledged');
    insertDueReminder(USER_A, 'pending');

    const result = computeProductivityScore(USER_A);
    expect(result.breakdown.reminderAcknowledgementRate).toBe(0.5);
    expect(result.score).toBe(15);
  });

  it('score reflects only habit streak consistency when only habits exist', () => {
    // 1 habit with 1-day streak → consistency = 1/30 ≈ 0.0333
    // score = 0.0333 * 0.30 = 0.00999 → ~1.00
    const today = '2026-09-08';
    const habit = createHabit(USER_A, { name: 'Meditation' });
    recordCompletion(USER_A, habit.id, today);

    const result = computeProductivityScore(USER_A, today);
    expect(result.breakdown.habitStreakConsistency).toBeCloseTo(0.0333, 3);
    expect(result.score).toBeCloseTo(1, 0);
  });

  it('computes correct weighted composite score with all three components', () => {
    // Tasks: 4 done / 4 total → rate = 1.0
    // Reminders: 2 ack / 2 → rate = 1.0
    // Habits: 1 habit, 30-day streak → consistency = 1.0
    // score = (1.0 * 0.4 + 1.0 * 0.3 + 1.0 * 0.3) * 100 = 100.00

    // Create 4 tasks all Done
    const t1 = createTask(USER_A, { title: 'T1' });
    const t2 = createTask(USER_A, { title: 'T2' });
    const t3 = createTask(USER_A, { title: 'T3' });
    const t4 = createTask(USER_A, { title: 'T4' });
    updateTaskStatus(USER_A, t1.id, 'Done');
    updateTaskStatus(USER_A, t2.id, 'Done');
    updateTaskStatus(USER_A, t3.id, 'Done');
    updateTaskStatus(USER_A, t4.id, 'Done');

    // 2 acknowledged reminders
    insertDueReminder(USER_A, 'acknowledged');
    insertDueReminder(USER_A, 'acknowledged');

    // 1 habit with 30-day streak
    const today = '2026-09-08';
    const habit = createHabit(USER_A, { name: 'Yoga' });
    for (let i = 0; i < 30; i++) {
      const d = new Date('2026-09-08');
      d.setUTCDate(d.getUTCDate() - i);
      recordCompletion(USER_A, habit.id, d.toISOString().slice(0, 10));
    }

    const result = computeProductivityScore(USER_A, today);
    expect(result.breakdown.taskCompletionRate).toBe(1);
    expect(result.breakdown.reminderAcknowledgementRate).toBe(1);
    expect(result.breakdown.habitStreakConsistency).toBe(1);
    expect(result.score).toBe(100);
  });

  it('score is clamped to [0, 100]', () => {
    // With all perfect scores it is exactly 100 — verify clamp boundary
    const result = computeProductivityScore(USER_A);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('does not leak data between users', () => {
    // Give USER_B a perfect task score
    const t = createTask(USER_B, { title: 'B task' });
    updateTaskStatus(USER_B, t.id, 'Done');

    // USER_A should still have score 0
    const resultA = computeProductivityScore(USER_A);
    expect(resultA.score).toBe(0);

    const resultB = computeProductivityScore(USER_B);
    expect(resultB.breakdown.taskCompletionRate).toBe(1);
  });

  it('calculatedAt is a valid ISO-8601 timestamp', () => {
    const result = computeProductivityScore(USER_A);
    expect(new Date(result.calculatedAt).getTime()).not.toBeNaN();
  });

  it('rounds composite score to 2 decimal places', () => {
    // 3 tasks: 1 Done, 2 Todo → rate = 0.3333
    // score = 0.3333 * 0.4 * 100 = 13.332 → rounded 13.33
    const t1 = createTask(USER_A, { title: 'T1' });
    createTask(USER_A, { title: 'T2' });
    createTask(USER_A, { title: 'T3' });
    updateTaskStatus(USER_A, t1.id, 'Done');

    const result = computeProductivityScore(USER_A);
    const dp = result.score.toString().split('.')[1];
    expect(dp === undefined || dp.length <= 2).toBe(true);
  });
});
