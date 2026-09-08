import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

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
  `);

  return { testDb: db };
});

vi.mock('../../db', () => ({ db: testDb }));

import {
  createHabit,
  getHabit,
  getHabitsForUser,
  recordCompletion,
  calculateStreak,
  getStreakConsistency,
} from './service';

const USER_A = 'user-a';
const USER_B = 'user-b';

beforeAll(() => {
  testDb
    .prepare('INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)')
    .run(USER_A, 'a@test.com', 'User A');
  testDb
    .prepare('INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)')
    .run(USER_B, 'b@test.com', 'User B');
});

beforeEach(() => {
  testDb.exec('DELETE FROM completion_records');
  testDb.exec('DELETE FROM habits');
});

describe('createHabit', () => {
  it('creates habit with streak = 0 and valid id', () => {
    const habit = createHabit(USER_A, { name: 'Morning meditation' });
    expect(habit.id).toBeTruthy();
    expect(habit.userId).toBe(USER_A);
    expect(habit.name).toBe('Morning meditation');
    expect(habit.streak).toBe(0);
  });

  it('rejects empty or whitespace-only name', () => {
    expect(() => createHabit(USER_A, { name: '' })).toThrow();
    expect(() => createHabit(USER_A, { name: '   ' })).toThrow();
  });

  it('rejects name exceeding 200 characters', () => {
    expect(() => createHabit(USER_A, { name: 'x'.repeat(201) })).toThrow();
  });
});

describe('getHabit and getHabitsForUser', () => {
  it('enforces user data isolation', () => {
    const habit = createHabit(USER_A, { name: 'Reading' });
    expect(getHabit(USER_A, habit.id).name).toBe('Reading');
    expect(() => getHabit(USER_B, habit.id)).toThrow('NOT_FOUND');
  });

  it('returns only habits belonging to user', () => {
    createHabit(USER_A, { name: 'Habit A' });
    createHabit(USER_B, { name: 'Habit B' });

    const listA = getHabitsForUser(USER_A);
    expect(listA).toHaveLength(1);
    expect(listA[0].name).toBe('Habit A');
  });
});

describe('recordCompletion and calculateStreak', () => {
  it('records completion and calculates consecutive streak', () => {
    const habit = createHabit(USER_A, { name: 'Workout' });
    const today = '2026-09-08';
    const yesterday = '2026-09-07';
    const twoDaysAgo = '2026-09-06';

    recordCompletion(USER_A, habit.id, twoDaysAgo);
    recordCompletion(USER_A, habit.id, yesterday);
    const res = recordCompletion(USER_A, habit.id, today);

    expect(res.habit.streak).toBe(3);
    expect(calculateStreak(habit.id, today)).toBe(3);
  });

  it('is idempotent when completing the same date multiple times', () => {
    const habit = createHabit(USER_A, { name: 'Hydration' });
    const today = '2026-09-08';

    recordCompletion(USER_A, habit.id, today);
    const second = recordCompletion(USER_A, habit.id, today);

    expect(second.habit.streak).toBe(1);
  });

  it('resets streak to 0 if last completion is older than yesterday', () => {
    const habit = createHabit(USER_A, { name: 'Coding' });
    recordCompletion(USER_A, habit.id, '2026-09-01');

    expect(calculateStreak(habit.id, '2026-09-08')).toBe(0);
  });

  it('handles gaps by counting only the most recent streak run', () => {
    const habit = createHabit(USER_A, { name: 'Stretching' });
    recordCompletion(USER_A, habit.id, '2026-09-01');
    recordCompletion(USER_A, habit.id, '2026-09-02');
    // gap between 09-02 and 09-07
    recordCompletion(USER_A, habit.id, '2026-09-07');
    recordCompletion(USER_A, habit.id, '2026-09-08');

    expect(calculateStreak(habit.id, '2026-09-08')).toBe(2);
  });

  it('throws NOT_FOUND when completing non-existent or other user habit', () => {
    expect(() => recordCompletion(USER_A, 'bad-id')).toThrow('NOT_FOUND');
    const habit = createHabit(USER_A, { name: 'Private' });
    expect(() => recordCompletion(USER_B, habit.id)).toThrow('NOT_FOUND');
  });
});

describe('getStreakConsistency', () => {
  it('returns 0 when user has no habits', () => {
    expect(getStreakConsistency(USER_A)).toBe(0);
  });

  it('computes consistency capped at 30 days', () => {
    const h1 = createHabit(USER_A, { name: 'H1' });
    const today = '2026-09-08';
    recordCompletion(USER_A, h1.id, today);
    // 1 streak / 30 = 0.0333
    expect(getStreakConsistency(USER_A, today)).toBe(0.0333);
  });
});
