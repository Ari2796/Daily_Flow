import {
  createTask as repoCreateTask,
  getTaskById,
  getTasksByUserId,
  updateTaskStatus as repoUpdateTaskStatus,
  countTasksByStatus,
} from './repository';
import { Task, TaskBoard, TaskStatus, CreateTaskInput } from './types';

/**
 * Validates a task title: must be 1–255 characters and not whitespace-only.
 *
 * @param title - The candidate title string.
 * @returns An error message string, or null if valid.
 */
function validateTitle(title: string): string | null {
  if (!title || title.trim().length === 0) {
    return 'Title must not be empty or whitespace-only';
  }
  if (title.length > 255) {
    return 'Title must be 255 characters or fewer';
  }
  return null;
}

/**
 * Validates an optional task description: maximum 2000 characters.
 *
 * @param description - The candidate description string (may be undefined).
 * @returns An error message string, or null if valid.
 */
function validateDescription(description: string | undefined): string | null {
  if (description !== undefined && description.length > 2000) {
    return 'Description must be 2000 characters or fewer';
  }
  return null;
}

/**
 * Creates a new task for the given user after validating inputs.
 *
 * @param userId - The ID of the user creating the task.
 * @param input - The task creation payload (title, optional description).
 * @returns The created Task entity with status 'Todo'.
 * @throws Error if title or description validation fails.
 */
export function createTask(userId: string, input: CreateTaskInput): Task {
  const titleError = validateTitle(input.title);
  if (titleError) throw new Error(titleError);

  const descError = validateDescription(input.description);
  if (descError) throw new Error(descError);

  return repoCreateTask(userId, input);
}

/**
 * Retrieves a single task by ID, enforcing user ownership.
 *
 * @param userId - The requesting user's ID.
 * @param taskId - The task UUID to fetch.
 * @returns The Task if found and owned by the user.
 * @throws Error with message 'NOT_FOUND' if no matching task exists.
 */
export function getTask(userId: string, taskId: string): Task {
  const task = getTaskById(userId, taskId);
  if (!task) throw new Error('NOT_FOUND');
  return task;
}

/**
 * Updates the status of a task owned by the given user.
 *
 * @param userId - The owning user's ID.
 * @param taskId - The task UUID to update.
 * @param status - The new TaskStatus value.
 * @returns The updated Task entity.
 * @throws Error with message 'NOT_FOUND' if the task does not exist or is not owned.
 */
export function updateTaskStatus(
  userId: string,
  taskId: string,
  status: TaskStatus
): Task {
  const updated = repoUpdateTaskStatus(userId, taskId, status);
  if (!updated) throw new Error('NOT_FOUND');
  return updated;
}

/**
 * Returns all tasks for a user grouped into the three Kanban columns.
 * All three columns are always present, even when empty (Req 4.3, 4.4).
 *
 * @param userId - The owning user's ID.
 * @returns A TaskBoard with Todo, In_Progress, and Done arrays.
 */
export function getBoardForUser(userId: string): TaskBoard {
  const tasks = getTasksByUserId(userId);

  const board: TaskBoard = { Todo: [], In_Progress: [], Done: [] };

  for (const task of tasks) {
    board[task.status].push(task);
  }

  return board;
}

/**
 * Computes the task completion rate for a user as a value in [0, 1].
 * Returns 0 when the user has no tasks (Req 14.2).
 * Result is rounded to 4 decimal places (Req 14.3).
 *
 * @param userId - The owning user's ID.
 * @returns Completion rate in [0, 1].
 */
export function getCompletionRate(userId: string): number {
  const counts = countTasksByStatus(userId);
  const total = counts.Todo + counts.In_Progress + counts.Done;

  if (total === 0) return 0;

  return Math.round((counts.Done / total) * 10000) / 10000;
}
