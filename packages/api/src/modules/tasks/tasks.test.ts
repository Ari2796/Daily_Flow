import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// ── In-memory database ────────────────────────────────────────────────────────
// vi.hoisted runs before vi.mock, so `testDb` is available in the factory.

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
  `);

  return { testDb: db };
});

// Redirect all repository calls to the in-memory DB.
vi.mock('../../db', () => ({ db: testDb }));

import {
  createTask,
  getTask,
  updateTaskStatus,
  getBoardForUser,
  getCompletionRate,
} from './service';

// ── Seed helpers ──────────────────────────────────────────────────────────────

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
  testDb.exec('DELETE FROM tasks');
});

// ── createTask ────────────────────────────────────────────────────────────────

describe('createTask', () => {
  it('creates a task with status Todo', () => {
    const task = createTask(USER_A, { title: 'My task' });
    expect(task.status).toBe('Todo');
    expect(task.userId).toBe(USER_A);
    expect(task.title).toBe('My task');
    expect(task.description).toBeNull();
    expect(task.id).toBeTruthy();
  });

  it('stores description when provided', () => {
    const task = createTask(USER_A, { title: 'Task', description: 'Some details' });
    expect(task.description).toBe('Some details');
  });

  it('throws on empty title', () => {
    expect(() => createTask(USER_A, { title: '' })).toThrow();
  });

  it('throws on whitespace-only title', () => {
    expect(() => createTask(USER_A, { title: '   ' })).toThrow();
  });

  it('throws when title exceeds 255 characters', () => {
    expect(() => createTask(USER_A, { title: 'x'.repeat(256) })).toThrow();
  });

  it('throws when description exceeds 2000 characters', () => {
    expect(() =>
      createTask(USER_A, { title: 'Valid', description: 'y'.repeat(2001) })
    ).toThrow();
  });

  it('accepts title of exactly 255 characters', () => {
    const task = createTask(USER_A, { title: 'a'.repeat(255) });
    expect(task.title).toHaveLength(255);
  });

  it('accepts description of exactly 2000 characters', () => {
    const task = createTask(USER_A, {
      title: 'Valid',
      description: 'b'.repeat(2000),
    });
    expect(task.description).toHaveLength(2000);
  });
});

// ── getTask ───────────────────────────────────────────────────────────────────

describe('getTask', () => {
  it('returns the task for the owning user', () => {
    const created = createTask(USER_A, { title: 'Fetch me' });
    const fetched = getTask(USER_A, created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.title).toBe('Fetch me');
  });

  it('throws NOT_FOUND for a non-existent id', () => {
    expect(() => getTask(USER_A, 'no-such-id')).toThrow('NOT_FOUND');
  });

  it('throws NOT_FOUND when task belongs to a different user (data isolation)', () => {
    const task = createTask(USER_A, { title: 'Private' });
    expect(() => getTask(USER_B, task.id)).toThrow('NOT_FOUND');
  });
});

// ── updateTaskStatus ──────────────────────────────────────────────────────────

describe('updateTaskStatus', () => {
  it('transitions status from Todo to In_Progress', () => {
    const task = createTask(USER_A, { title: 'Move me' });
    const updated = updateTaskStatus(USER_A, task.id, 'In_Progress');
    expect(updated.status).toBe('In_Progress');
  });

  it('transitions status from In_Progress to Done', () => {
    const task = createTask(USER_A, { title: 'Finish me' });
    updateTaskStatus(USER_A, task.id, 'In_Progress');
    const done = updateTaskStatus(USER_A, task.id, 'Done');
    expect(done.status).toBe('Done');
  });

  it('is idempotent — applying the same status twice leaves status unchanged', () => {
    const task = createTask(USER_A, { title: 'Idempotent' });
    updateTaskStatus(USER_A, task.id, 'Done');
    const again = updateTaskStatus(USER_A, task.id, 'Done');
    expect(again.status).toBe('Done');
  });

  it('throws NOT_FOUND when task belongs to a different user', () => {
    const task = createTask(USER_A, { title: 'Guarded' });
    expect(() => updateTaskStatus(USER_B, task.id, 'Done')).toThrow('NOT_FOUND');
  });

  it('throws NOT_FOUND for a non-existent task id', () => {
    expect(() => updateTaskStatus(USER_A, 'ghost-id', 'Done')).toThrow('NOT_FOUND');
  });

  it('supports all valid forward and backward transitions', () => {
    const statuses = ['Todo', 'In_Progress', 'Done'] as const;
    for (const src of statuses) {
      for (const dst of statuses) {
        const task = createTask(USER_A, { title: `${src} → ${dst}` });
        if (src !== 'Todo') {
          updateTaskStatus(USER_A, task.id, src);
        }
        const result = updateTaskStatus(USER_A, task.id, dst);
        expect(result.status).toBe(dst);
      }
    }
  });
});

// ── getBoardForUser ───────────────────────────────────────────────────────────

describe('getBoardForUser', () => {
  it('returns an empty board with all three columns when user has no tasks', () => {
    const board = getBoardForUser(USER_A);
    expect(board).toEqual({ Todo: [], In_Progress: [], Done: [] });
  });

  it('places each task in the correct column', () => {
    const t1 = createTask(USER_A, { title: 'Todo task' });
    const t2 = createTask(USER_A, { title: 'WIP task' });
    const t3 = createTask(USER_A, { title: 'Done task' });

    updateTaskStatus(USER_A, t2.id, 'In_Progress');
    updateTaskStatus(USER_A, t3.id, 'In_Progress');
    updateTaskStatus(USER_A, t3.id, 'Done');

    const board = getBoardForUser(USER_A);
    expect(board.Todo).toHaveLength(1);
    expect(board.Todo[0].id).toBe(t1.id);
    expect(board.In_Progress).toHaveLength(1);
    expect(board.In_Progress[0].id).toBe(t2.id);
    expect(board.Done).toHaveLength(1);
    expect(board.Done[0].id).toBe(t3.id);
  });

  it('board total equals total tasks stored for user (completeness)', () => {
    createTask(USER_A, { title: 'A' });
    createTask(USER_A, { title: 'B' });
    const t3 = createTask(USER_A, { title: 'C' });
    updateTaskStatus(USER_A, t3.id, 'Done');

    const board = getBoardForUser(USER_A);
    const total =
      board.Todo.length + board.In_Progress.length + board.Done.length;
    expect(total).toBe(3);
  });

  it('does not include tasks from other users', () => {
    createTask(USER_A, { title: 'A task' });
    createTask(USER_B, { title: 'B task' });

    const boardA = getBoardForUser(USER_A);
    const totalA =
      boardA.Todo.length + boardA.In_Progress.length + boardA.Done.length;
    expect(totalA).toBe(1);
  });
});

// ── getCompletionRate ─────────────────────────────────────────────────────────

describe('getCompletionRate', () => {
  it('returns 0 when user has no tasks', () => {
    expect(getCompletionRate(USER_A)).toBe(0);
  });

  it('returns 0 when no tasks are Done', () => {
    createTask(USER_A, { title: 'T1' });
    createTask(USER_A, { title: 'T2' });
    expect(getCompletionRate(USER_A)).toBe(0);
  });

  it('returns 1 when all tasks are Done', () => {
    const t1 = createTask(USER_A, { title: 'T1' });
    const t2 = createTask(USER_A, { title: 'T2' });
    updateTaskStatus(USER_A, t1.id, 'Done');
    updateTaskStatus(USER_A, t2.id, 'Done');
    expect(getCompletionRate(USER_A)).toBe(1);
  });

  it('returns 0.5 when half the tasks are Done', () => {
    const t1 = createTask(USER_A, { title: 'T1' });
    createTask(USER_A, { title: 'T2' });
    updateTaskStatus(USER_A, t1.id, 'Done');
    expect(getCompletionRate(USER_A)).toBe(0.5);
  });

  it('rounds to at most 4 decimal places', () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      ids.push(createTask(USER_A, { title: `T${i}` }).id);
    }
    updateTaskStatus(USER_A, ids[0], 'Done');
    // 1/3 = 0.3333...
    const rate = getCompletionRate(USER_A);
    expect(rate).toBe(0.3333);
  });

  it('result is always in [0, 1]', () => {
    const t1 = createTask(USER_A, { title: 'T1' });
    updateTaskStatus(USER_A, t1.id, 'Done');
    const rate = getCompletionRate(USER_A);
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(1);
  });
});
