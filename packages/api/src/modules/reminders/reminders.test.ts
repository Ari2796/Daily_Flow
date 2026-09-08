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
  `);

  return { testDb: db };
});

vi.mock('../../db', () => ({ db: testDb }));

import {
  createReminder,
  getReminder,
  getRemindersForUser,
  acknowledgeReminder,
  getAcknowledgementRate,
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
  testDb.exec('DELETE FROM reminders');
});

describe('createReminder', () => {
  it('creates a one-time reminder with future time', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const reminder = createReminder(USER_A, {
      title: 'Doctor appointment',
      schedule: { type: 'one_time', triggerAt: future },
    });
    expect(reminder.id).toBeTruthy();
    expect(reminder.state).toBe('pending');
    expect(reminder.userId).toBe(USER_A);
    expect(reminder.title).toBe('Doctor appointment');
  });

  it('creates a daily reminder', () => {
    const reminder = createReminder(USER_A, {
      title: 'Daily standup',
      schedule: { type: 'daily', timeOfDay: '09:30' },
    });
    expect(reminder.schedule.type).toBe('daily');
    expect(reminder.nextTriggerAt).toBeTruthy();
  });

  it('creates a weekly reminder with selected days', () => {
    const reminder = createReminder(USER_A, {
      title: 'Weekly planning',
      schedule: { type: 'weekly', daysOfWeek: ['Monday', 'Friday'], timeOfDay: '10:00' },
    });
    expect(reminder.schedule.type).toBe('weekly');
  });

  it('throws on empty title or whitespace-only title', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    expect(() =>
      createReminder(USER_A, { title: '  ', schedule: { type: 'one_time', triggerAt: future } })
    ).toThrow();
  });

  it('throws when title exceeds 200 characters', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    expect(() =>
      createReminder(USER_A, {
        title: 'x'.repeat(201),
        schedule: { type: 'one_time', triggerAt: future },
      })
    ).toThrow();
  });

  it('throws on past date for one-time reminder', () => {
    const past = new Date(Date.now() - 10000).toISOString();
    expect(() =>
      createReminder(USER_A, { title: 'Past', schedule: { type: 'one_time', triggerAt: past } })
    ).toThrow(/future/i);
  });

  it('throws on insufficient lead time (< 1 minute)', () => {
    const soon = new Date(Date.now() + 30000).toISOString();
    expect(() =>
      createReminder(USER_A, { title: 'Soon', schedule: { type: 'one_time', triggerAt: soon } })
    ).toThrow(/lead time/i);
  });

  it('throws on invalid daily time format', () => {
    expect(() =>
      createReminder(USER_A, { title: 'Invalid', schedule: { type: 'daily', timeOfDay: '25:00' } })
    ).toThrow();
  });

  it('throws on empty days for weekly schedule', () => {
    expect(() =>
      createReminder(USER_A, {
        title: 'Weekly',
        schedule: { type: 'weekly', daysOfWeek: [], timeOfDay: '10:00' },
      })
    ).toThrow();
  });
});

describe('getReminder and getRemindersForUser', () => {
  it('retrieves single reminder and enforces user data isolation', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const rem = createReminder(USER_A, {
      title: 'Private reminder',
      schedule: { type: 'one_time', triggerAt: future },
    });

    const fetched = getReminder(USER_A, rem.id);
    expect(fetched.title).toBe('Private reminder');
    expect(() => getReminder(USER_B, rem.id)).toThrow('NOT_FOUND');
  });

  it('returns only reminders belonging to user', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    createReminder(USER_A, { title: 'A1', schedule: { type: 'one_time', triggerAt: future } });
    createReminder(USER_B, { title: 'B1', schedule: { type: 'one_time', triggerAt: future } });

    const listA = getRemindersForUser(USER_A);
    expect(listA).toHaveLength(1);
    expect(listA[0].title).toBe('A1');
  });
});

describe('acknowledgeReminder and getAcknowledgementRate', () => {
  it('acknowledges reminder and is idempotent', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const rem = createReminder(USER_A, {
      title: 'Ack test',
      schedule: { type: 'one_time', triggerAt: future },
    });

    const acked = acknowledgeReminder(USER_A, rem.id);
    expect(acked.state).toBe('acknowledged');

    const again = acknowledgeReminder(USER_A, rem.id);
    expect(again.state).toBe('acknowledged');
  });

  it('computes acknowledgement rate accurately', () => {
    expect(getAcknowledgementRate(USER_A)).toBe(0);
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const rem = createReminder(USER_A, {
      title: 'Rate test',
      schedule: { type: 'one_time', triggerAt: future },
    });
    acknowledgeReminder(USER_A, rem.id);
    expect(getAcknowledgementRate(USER_A)).toBe(1);
  });
});
