import { randomUUID } from 'crypto';
import { db } from '../../db';
import { Task, TaskRow, TaskStatus, CreateTaskInput } from './types';

/**
 * Maps a raw SQLite row to a typed Task entity.
 */
function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Inserts a new task row into the database.
 *
 * @param userId - The ID of the owning user.
 * @param input - Title and optional description for the new task.
 * @returns The newly created Task with status 'Todo'.
 */
export function createTask(userId: string, input: CreateTaskInput): Task {
  const id = randomUUID();
  const now = new Date().toISOString();
  const description = input.description ?? null;

  db.prepare(
    `INSERT INTO tasks (id, user_id, title, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'Todo', ?, ?)`
  ).run(id, userId, input.title, description, now, now);

  const row = db.prepare<string, TaskRow>(
    'SELECT * FROM tasks WHERE id = ?'
  ).get(id) as TaskRow;

  return rowToTask(row);
}

/**
 * Retrieves a single task by ID, scoped to a user.
 *
 * @param userId - The requesting user's ID (ownership check).
 * @param taskId - The task's UUID.
 * @returns The Task if found and owned by the user, otherwise null.
 */
export function getTaskById(userId: string, taskId: string): Task | null {
  const row = db.prepare<[string, string], TaskRow>(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
  ).get(taskId, userId);

  return row ? rowToTask(row) : null;
}

/**
 * Returns all tasks belonging to a user, ordered by creation time ascending.
 *
 * @param userId - The owning user's ID.
 * @returns Array of Task entities (may be empty).
 */
export function getTasksByUserId(userId: string): Task[] {
  const rows = db.prepare<string, TaskRow>(
    'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at ASC'
  ).all(userId);

  return rows.map(rowToTask);
}

/**
 * Updates the status of a task, also refreshing updated_at.
 * Only updates if the task belongs to the given user.
 *
 * @param userId - The owning user's ID.
 * @param taskId - The task's UUID.
 * @param status - The new TaskStatus value.
 * @returns The updated Task, or null if not found / not owned.
 */
export function updateTaskStatus(
  userId: string,
  taskId: string,
  status: TaskStatus
): Task | null {
  const now = new Date().toISOString();

  const result = db.prepare(
    `UPDATE tasks
        SET status = ?, updated_at = ?
      WHERE id = ? AND user_id = ?`
  ).run(status, now, taskId, userId);

  if (result.changes === 0) return null;

  const row = db.prepare<string, TaskRow>(
    'SELECT * FROM tasks WHERE id = ?'
  ).get(taskId) as TaskRow;

  return rowToTask(row);
}

/**
 * Counts tasks grouped by status for a user.
 * Used by the service layer to compute the task completion rate.
 *
 * @param userId - The owning user's ID.
 * @returns An object with counts for each status value.
 */
export function countTasksByStatus(
  userId: string
): Record<TaskStatus, number> {
  const rows = db.prepare<
    string,
    { status: string; count: number }
  >(
    `SELECT status, COUNT(*) as count
       FROM tasks
      WHERE user_id = ?
      GROUP BY status`
  ).all(userId);

  const counts: Record<TaskStatus, number> = { Todo: 0, In_Progress: 0, Done: 0 };

  for (const row of rows) {
    counts[row.status as TaskStatus] = row.count;
  }

  return counts;
}
