import { Task, TaskBoard, TaskStatus, CreateTaskInput } from './types';

const BASE = '/api/v1/tasks';

/** Standard API envelope returned by every endpoint. */
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Unwraps an API response, throwing if the server returned an error.
 *
 * @param res - The raw fetch Response object.
 * @returns The `data` field of the response envelope.
 * @throws Error with the server's error message on non-OK status.
 */
async function unwrap<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || json.error) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return json.data as T;
}

/**
 * Creates a new task via POST /api/v1/tasks.
 *
 * @param input - Title and optional description for the task.
 * @returns The created Task entity.
 */
export async function apiCreateTask(input: CreateTaskInput): Promise<Task> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return unwrap<Task>(res);
}

/**
 * Fetches the Kanban board (all tasks grouped by status).
 * GET /api/v1/tasks/board
 *
 * @returns A TaskBoard with Todo, In_Progress, and Done arrays.
 */
export async function apiFetchBoard(): Promise<TaskBoard> {
  const res = await fetch(`${BASE}/board`);
  return unwrap<TaskBoard>(res);
}

/**
 * Fetches a single task by ID.
 * GET /api/v1/tasks/:id
 *
 * @param taskId - The UUID of the task to fetch.
 * @returns The Task entity.
 */
export async function apiFetchTask(taskId: string): Promise<Task> {
  const res = await fetch(`${BASE}/${taskId}`);
  return unwrap<Task>(res);
}

/**
 * Updates the status of a task.
 * PATCH /api/v1/tasks/:id/status
 *
 * @param taskId - The UUID of the task to update.
 * @param status - The new TaskStatus value.
 * @returns The updated Task entity.
 */
export async function apiUpdateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<Task> {
  const res = await fetch(`${BASE}/${taskId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return unwrap<Task>(res);
}
